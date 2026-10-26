"""Refuse a Grail change that the Rowan users have cannot apply as an upgrade.

    python3 scripts/check_rowan_floor.py <base-ref>

Compares the Tonel in src/ at <base-ref> -- the previous release, or the PR's
base -- with the working tree, and lists every METHOD the change removes, by the
kind of change it is for Rowan (rowan/components/Grail.ston says which packages
are environment 1 and which load as session methods):

  env1_removal      a method removed from a methodEnv-1 package
  session_removal   a method removed from a session-method package (Grail-Kernel*)

A removal of a kind listed in rowan/needs-newer-rowan.txt fails the check: an
existing install cannot be upgraded past it. A method that goes with its class --
the class itself is removed -- is not counted; Rowan removes the class.

Exit 0 when nothing listed is removed, 1 when something is (with the list).
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from tonel_methods import _BLOCK_START, selector_of  # noqa: E402


def package_kinds():
    """package name -> 'env1_removal' / 'session_removal' / None, from the component."""
    ston = open(os.path.join(ROOT, 'rowan', 'components', 'Grail.ston'), encoding='utf-8').read()
    kinds = {}
    for m in re.finditer(r"'(Grail-[A-Za-z-]+)' : \{([^}]*)\}", ston):
        props = m.group(2)
        if "'useSessionMethodsForExtensions' : true" in props:
            kinds[m.group(1)] = 'session_removal'
        elif "'methodEnv' : 1" in props:
            kinds[m.group(1)] = 'env1_removal'
        else:
            kinds[m.group(1)] = None
    return kinds


def methods(text):
    """{(side, selector)} of a Tonel class or extension file."""
    found = set()
    for m in _BLOCK_START.finditer(text):
        decl_start = m.end()
        bracket = text.index(' [', decl_start)
        found.add(('class' if m.group(2) else 'instance', selector_of(text[decl_start:bracket] + '\n')))
    return found


def git(*args):
    return subprocess.run(['git', '-C', ROOT] + list(args), check=True,
                          capture_output=True, text=True).stdout


def main():
    base = sys.argv[1]
    needs = {line.strip() for line in open(os.path.join(ROOT, 'rowan', 'needs-newer-rowan.txt'))
             if line.strip() and not line.startswith('#')}
    kinds = package_kinds()
    # classes defined anywhere now, so a removed class's methods are not counted
    current_classes = set()
    for dirpath, _, files in os.walk(os.path.join(ROOT, 'src')):
        current_classes.update(f[:-len('.class.st')] for f in files if f.endswith('.class.st'))
    removed = []
    for path in git('ls-tree', '-r', '--name-only', base, 'src/').split():
        parts = path.split('/')
        if len(parts) != 3 or not path.endswith('.st') or parts[2] == 'package.st':
            continue
        kind = kinds.get(parts[1])
        if kind is None:
            continue
        cls = parts[2].rsplit('.', 2)[0]
        if cls not in current_classes and not os.path.exists(os.path.join(ROOT, path)):
            continue            # the class went, and its methods with it
        before = methods(git('show', '%s:%s' % (base, path)))
        full = os.path.join(ROOT, path)
        after = methods(open(full, encoding='utf-8').read()) if os.path.exists(full) else set()
        for side, sel in sorted(before - after):
            removed.append((kind, parts[1], cls, side, sel))
    blocking = [r for r in removed if r[0] in needs]
    for kind, pkg, cls, side, sel in removed:
        mark = 'BLOCKED' if kind in needs else 'ok     '
        print('%s %-16s %s %s%s >> %s' % (mark, kind, pkg, cls, ' class' if side == 'class' else '', sel))
    print('check_rowan_floor: %d removed method(s), %d of a kind the installed Rowan cannot apply (%s)'
          % (len(removed), len(blocking), ', '.join(sorted(needs)) or 'none'))
    return 1 if blocking else 0


if __name__ == '__main__':
    sys.exit(main())
