#!/usr/bin/env python3
"""Count the tests in the P1-P4 plan WITHOUT importing anything.

The scoreboard can only count what Grail can import: a module that fails at
import scores IMPORTERROR and reports ``tests=0'', which is indistinguishable
from a module with no tests in it.  A burn-down chart needs the denominator --
how many tests exist in the 255 modules of the plan -- and that has to come from
reading the source.

WHAT THIS DOES

Parses each module's source with ``ast`` and models what unittest's default
loader would collect:

  * a class is a TEST CLASS if it descends (transitively, within the file) from
    something named ``TestCase`` / ``*TestCase`` / ``IsolatedAsyncioTestCase``;
  * its tests are every ``def test*'' it defines PLUS every ``def test*'' its
    in-file ancestors define, deduplicated by name, because that is what
    inheritance gives the loader.  A mixin reused by three concrete classes
    therefore counts three times, which is how often its tests actually run.

WHAT IT CANNOT SEE, and therefore how to read the number

  * CROSS-FILE BASES.  ``class X(mapping_tests.BasicTestMappingProtocol)'' has
    its tests in another file; they are invisible here.  UNDERCOUNT.
  * TESTS BUILT AT RUNTIME -- ``setattr(cls, 'test_' + name, ...)'' loops,
    ``load_tests'', doctest suites, subTest-parameterised bodies.  UNDERCOUNT
    (a subTest body is one test to unittest, so that one is not an error).
  * SKIPS.  A ``@unittest.skipUnless'' test is counted; whether it runs depends
    on the platform.

Both blind spots push the same way, so the figure is a FLOOR, not an estimate
that could be high.  ``--calibrate'' quantifies it: for every module the
scoreboard has a real ``tests'' count for, it prints static vs dynamic side by
side, so the size of the gap is measured rather than asserted.

USAGE

  scripts/count_cpython_tests.py                  # burn-down summary
  scripts/count_cpython_tests.py --per-module     # every module, one row
  scripts/count_cpython_tests.py --calibrate      # static vs measured
  scripts/count_cpython_tests.py --json           # machine-readable
  scripts/count_cpython_tests.py --source DIR     # a different CPython test tree

SOURCE OF TRUTH

Modules come from the P1-P4 tables in docs/Grail_CPython_Scope.md; sources come
from an installed CPython's ``test'' package (default: whatever ``python3.14''
on PATH reports), which the vendored copies under src/python/stdlib/test are
byte-identical to.
"""

import argparse
import ast
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCOPE_DOC = os.path.join(ROOT, 'docs', 'Grail_CPython_Scope.md')
SCOREBOARD = os.path.join(ROOT, 'docs', 'CPython_Suite_Scoreboard.md')

TIER_HEADING = re.compile(r'^### (P[1-4]) — ')
OTHER_HEADING = re.compile(r'^#{2,3} ')
TABLE_ROW = re.compile(r'^\|\s*(.*?)\s*\|\s*`([^`]+)`\s*\|')
SCORE_ROW = re.compile(
    r'^\|\s*([\w.]+)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|'
    r'\s*(\d+)\s*\|\s*(\d+)\s*\|')

# Base-class names that mean "unittest will collect this".
TESTCASE_BASES = {'TestCase', 'IsolatedAsyncioTestCase', 'FunctionTestCase'}


# --- the plan ---------------------------------------------------------------

def read_plan(path=SCOPE_DOC):
    """[(tier, status, module)] for the P1-P4 tables, in document order."""
    rows = []
    tier = None
    with open(path, encoding='utf-8') as f:
        for line in f:
            m = TIER_HEADING.match(line)
            if m:
                tier = m.group(1)
                continue
            if tier and OTHER_HEADING.match(line) and not TIER_HEADING.match(line):
                tier = None
                continue
            if not tier:
                continue
            m = TABLE_ROW.match(line)
            if m and m.group(2).startswith('test'):
                rows.append((tier, m.group(1).strip(), m.group(2)))
    return rows


def read_scoreboard(path=SCOREBOARD):
    """{module: {status, tests, fail, err, skip}} from the committed board."""
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, encoding='utf-8') as f:
        for line in f:
            m = SCORE_ROW.match(line)
            if not m:
                continue
            name = m.group(1)
            if not name.startswith('test.'):
                continue
            out[name.split('.', 1)[1]] = {
                'status': m.group(2),
                'tests': int(m.group(3)),
                'fail': int(m.group(4)),
                'err': int(m.group(5)),
                'skip': int(m.group(6)),
            }
    return out


# --- locating sources -------------------------------------------------------

def default_source_dir():
    """The ``test'' package of the CPython whose sources we count against."""
    for exe in ('python3.14', 'python3'):
        try:
            out = subprocess.run(
                [exe, '-c', 'import test, os; print(os.path.dirname(test.__file__))'],
                capture_output=True, text=True, timeout=30)
        except (OSError, subprocess.SubprocessError):
            continue
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    return None


def module_files(source_dir, module):
    """Every .py file that makes up ``module'' -- one for a plain module, the
    whole directory for a package (test_asyncio, test_email, ...)."""
    plain = os.path.join(source_dir, module + '.py')
    if os.path.isfile(plain):
        return [plain]
    pkg = os.path.join(source_dir, module)
    if os.path.isdir(pkg):
        found = []
        for dirpath, _dirnames, filenames in os.walk(pkg):
            for fn in sorted(filenames):
                if fn.endswith('.py'):
                    found.append(os.path.join(dirpath, fn))
        return found
    return []


# --- counting ---------------------------------------------------------------

def dotted(node):
    """The dotted spelling of a base-class expression, or None.

    ``unittest.TestCase'' -> 'unittest.TestCase', ``Mixin'' -> 'Mixin',
    ``a[b]'' -> None (a generic alias, never a TestCase)."""
    parts = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if not isinstance(node, ast.Name):
        return None
    parts.append(node.id)
    return '.'.join(reversed(parts))


def is_testcase_name(name):
    if name is None:
        return False
    tail = name.rsplit('.', 1)[-1]
    return tail in TESTCASE_BASES or tail.endswith('TestCase')


class SourceIndex:
    """Parsed classes across a whole CPython source tree, so a base class in
    ANOTHER file can be followed.

    This is the difference between counting test_list as 0 and as 68: its one
    class is ``class ListTest(list_tests.CommonTest)'' and every test it runs
    lives in test/list_tests.py.  Six of the plan's modules are shaped that way
    and several more inherit part of their suite, so resolving imports is not a
    refinement -- without it the denominator is wrong by hundreds.
    """

    def __init__(self, lib_dir):
        self.lib_dir = lib_dir
        self._files = {}      # path -> {'classes': {...}, 'imports': {...}}
        self._modpath = {}    # dotted module -> path or None

    # -- module resolution --

    def path_of(self, module):
        if module in self._modpath:
            return self._modpath[module]
        rel = module.replace('.', os.sep)
        cand = os.path.join(self.lib_dir, rel + '.py')
        if not os.path.isfile(cand):
            pkg = os.path.join(self.lib_dir, rel, '__init__.py')
            cand = pkg if os.path.isfile(pkg) else None
        self._modpath[module] = cand
        return cand

    # -- file parsing --

    def parse(self, path):
        if path in self._files:
            return self._files[path]
        entry = {'classes': {}, 'imports': {}, 'package': ''}
        self._files[path] = entry
        try:
            with open(path, encoding='utf-8', errors='replace') as f:
                tree = ast.parse(f.read(), filename=path)
        except (SyntaxError, ValueError, OSError):
            return entry

        rel = os.path.relpath(path, self.lib_dir)
        parts = rel[:-3].split(os.sep)
        if parts and parts[-1] == '__init__':
            parts.pop()
        entry['package'] = '.'.join(parts[:-1]) if parts else ''

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                entry['classes'].setdefault(node.name, node)
            elif isinstance(node, ast.Import):
                for a in node.names:
                    entry['imports'][a.asname or a.name.split('.')[0]] = (
                        (a.name, None))
            elif isinstance(node, ast.ImportFrom):
                if node.level:      # relative import
                    base = entry['package']
                    mod = (base + '.' + node.module) if node.module else base
                else:
                    mod = node.module or ''
                for a in node.names:
                    entry['imports'][a.asname or a.name] = (mod, a.name)
        return entry

    # -- resolving one base expression to (path, classname) --

    def resolve(self, path, expr):
        """Where the base class ``expr'' seen in ``path'' is defined."""
        entry = self.parse(path)
        head, _, rest = expr.partition('.')
        if not rest:
            if expr in entry['classes']:
                return path, expr
            target = entry['imports'].get(expr)
            if not target:
                return None
            mod, name = target
            if name is None:          # ``import x'' -- a module, not a class
                return None
            p = self.path_of(mod)
            return (p, name) if p else None
        # dotted: either an imported MODULE alias, or a dotted module path
        alias = entry['imports'].get(head)
        if alias:
            mod, name = alias
            if name is None:
                p = self.path_of(mod + '.' + rest.rsplit('.', 1)[0]
                                 if '.' in rest else mod)
                if p is None:
                    p = self.path_of(mod)
                return (p, rest.rsplit('.', 1)[-1]) if p else None
            # ``from pkg import mod'' then ``mod.Class''
            p = self.path_of(mod + '.' + name)
            return (p, rest.rsplit('.', 1)[-1]) if p else None
        p = self.path_of(expr.rsplit('.', 1)[0])
        return (p, expr.rsplit('.', 1)[-1]) if p else None

    # -- the walk --

    def own_tests(self, path, name):
        node = self.parse(path)['classes'].get(name)
        if node is None:
            return set()
        return {b.name for b in node.body
                if isinstance(b, (ast.FunctionDef, ast.AsyncFunctionDef))
                and b.name.startswith('test')}

    def collect(self, path, name, seen=None):
        """(test method names, saw_a_TestCase_root, unresolved base exprs) for
        one class, following bases through files."""
        if seen is None:
            seen = set()
        key = (path, name)
        if key in seen:
            return set(), False, []
        seen.add(key)
        node = self.parse(path)['classes'].get(name)
        if node is None:
            return set(), False, []
        tests = self.own_tests(path, name)
        rooted = False
        unresolved = []
        for b in node.bases:
            expr = dotted(b)
            if expr is None:
                continue
            if is_testcase_name(expr):
                rooted = True
            target = self.resolve(path, expr)
            if target is None or target[0] is None:
                if not is_testcase_name(expr):
                    unresolved.append(expr)
                continue
            sub, sub_rooted, sub_unres = self.collect(target[0], target[1], seen)
            tests |= sub
            rooted = rooted or sub_rooted
            unresolved.extend(sub_unres)
        return tests, rooted, unresolved


def count_file(index, path):
    """(tests, classes, unresolved_bases) for one source file."""
    entry = index.parse(path)
    total = n_classes = 0
    unresolved = []
    for name in entry['classes']:
        tests, rooted, unres = index.collect(path, name)
        if not rooted:
            continue
        unresolved.extend(unres)
        if tests:
            n_classes += 1
            total += len(tests)
    return total, n_classes, unresolved


def count_module(index, source_dir, module):
    files = module_files(source_dir, module)
    if not files:
        return {'found': False, 'tests': 0, 'classes': 0,
                'files': 0, 'unresolved': []}
    tests = classes = 0
    unresolved = []
    for path in files:
        t, c, u = count_file(index, path)
        tests += t
        classes += c
        unresolved.extend(u)
    return {'found': True, 'tests': tests, 'classes': classes,
            'files': len(files), 'unresolved': unresolved}


# --- reporting --------------------------------------------------------------

# --- exact counts, from CPython's own loader --------------------------------

COUNT_SNIPPET = """
import importlib, sys, unittest
try:
    m = importlib.import_module('test.' + sys.argv[1])
    print(unittest.defaultTestLoader.loadTestsFromModule(m).countTestCases())
except BaseException as e:
    print('ERR %s: %s' % (type(e).__name__, e))
"""


def exact_counts(modules, python=None, jobs=8, timeout=120):
    """The TRUE number of tests unittest collects, per module, by asking
    CPython -- one subprocess each, so a module that hangs or dies takes only
    its own row down.

    This is not the same activity as the static walk, and it is worth being
    clear which is which.  Importing under CPYTHON is safe (they are CPython's
    own tests, and loadTestsFromModule enumerates without running them), and it
    is exact: ``load_tests'' hooks, doctest suites and classes built in a loop
    at import time are all counted, and those are precisely what reading the
    source cannot see.  What it cannot do is cover a module CPython itself
    declines to import on this platform -- and that is what the static walk is
    for.
    """
    import concurrent.futures

    python = python or ('python3.14' if _has(('python3.14',)) else sys.executable)
    out = {}

    def one(mod):
        try:
            p = subprocess.run([python, '-c', COUNT_SNIPPET, mod],
                               capture_output=True, text=True, timeout=timeout)
        except subprocess.SubprocessError:
            return mod, None, 'timeout'
        text = (p.stdout or '').strip().splitlines()
        last = text[-1] if text else ''
        if last.isdigit():
            return mod, int(last), None
        if last.startswith('ERR '):
            return mod, None, last[4:]
        return mod, None, (p.stderr or 'no output').strip().splitlines()[-1:] and \
            (p.stderr or 'no output').strip().splitlines()[-1] or 'no output'

    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        for mod, n, err in pool.map(one, modules):
            out[mod] = {'count': n, 'error': err}
    return out


def _has(names):
    for n in names:
        try:
            if subprocess.run([n, '-c', 'pass'], capture_output=True,
                              timeout=30).returncode == 0:
                return True
        except (OSError, subprocess.SubprocessError):
            pass
    return False


def build(source_dir):
    plan = read_plan()
    board = read_scoreboard()
    # The library root, so ``from test import list_tests'' and
    # ``import unittest'' both resolve: source_dir is <lib>/test.
    index = SourceIndex(os.path.dirname(source_dir))
    rows = []
    for tier, status, module in plan:
        info = count_module(index, source_dir, module)
        measured = board.get(module)
        rows.append({
            'tier': tier,
            'status': status or '',
            'module': module,
            'static_tests': info['tests'],
            'static_classes': info['classes'],
            'found': info['found'],
            'unresolved': sorted(set(info['unresolved'])),
            'measured': measured,
        })
    return rows


def passing_of(measured):
    """Tests a module actually PASSES: run, minus failed, errored and skipped.
    A skip is not a pass -- it is a test still to be earned."""
    if not measured:
        return 0
    return max(0, measured['tests'] - measured['fail']
               - measured['err'] - measured['skip'])


def print_summary(rows):
    tiers = {}
    for r in rows:
        t = tiers.setdefault(r['tier'], {
            'modules': 0, 'missing': 0, 'tests': 0,
            'wired': 0, 'passing': 0, 'measured_tests': 0})
        t['modules'] += 1
        t['tests'] += r['static_tests']
        if not r['found']:
            t['missing'] += 1
        if r['measured']:
            t['wired'] += 1
            t['passing'] += passing_of(r['measured'])
            t['measured_tests'] += r['measured']['tests']

    print('CPython suite burn-down -- static test counts for the P1-P4 plan')
    print()
    hdr = ('%-5s %8s %8s %10s %8s %10s %9s'
           % ('tier', 'modules', 'wired', 'tests', 'passing', 'remaining', 'done'))
    print(hdr)
    print('-' * len(hdr))
    tot = {'modules': 0, 'wired': 0, 'tests': 0, 'passing': 0, 'missing': 0}
    for tier in sorted(tiers):
        t = tiers[tier]
        remaining = t['tests'] - t['passing']
        pct = (100.0 * t['passing'] / t['tests']) if t['tests'] else 0.0
        print('%-5s %8d %8d %10d %8d %10d %8.1f%%'
              % (tier, t['modules'], t['wired'], t['tests'],
                 t['passing'], remaining, pct))
        for k in ('modules', 'wired', 'tests', 'passing', 'missing'):
            tot[k] += t[k]
    print('-' * len(hdr))
    remaining = tot['tests'] - tot['passing']
    pct = (100.0 * tot['passing'] / tot['tests']) if tot['tests'] else 0.0
    print('%-5s %8d %8d %10d %8d %10d %8.1f%%'
          % ('all', tot['modules'], tot['wired'], tot['tests'],
             tot['passing'], remaining, pct))
    print()
    print('modules   : %d in the plan, %d wired into the manifest, %d not yet'
          % (tot['modules'], tot['wired'], tot['modules'] - tot['wired']))
    if tot['missing']:
        print('NOT FOUND : %d module(s) absent from the source tree (counted as 0)'
              % tot['missing'])
        for r in rows:
            if not r['found']:
                print('            %s (%s)' % (r['module'], r['tier']))
    unresolved = sum(1 for r in rows if r['unresolved'])
    print('floor     : %d module(s) inherit tests from another file, so their'
          % unresolved)
    print('            counts are low; runtime-generated tests are missed too.')
    print('            Run with --calibrate to measure the gap.')


def print_per_module(rows):
    hdr = '%-6s %-4s %-34s %7s %7s %9s %8s' % (
        'tier', 'st', 'module', 'tests', 'src', 'collected', 'passing')
    print(hdr)
    print('-' * len(hdr))
    for r in rows:
        collected = '-' if not r['measured'] else str(r['measured']['tests'])
        flag = r['status'] if r['status'] else ('?' if r['found'] else 'X')
        print('%-6s %-4s %-34s %7d %7s %9s %8s'
              % (r['tier'], flag, r['module'], r['total'], r['source'],
                 collected, r['passing'] if r['measured'] else '-'))


def print_calibration(rows):
    """Static walk vs what GRAIL's harness actually collected, for the wired
    modules -- the check that says how far the source-reading estimate can be
    trusted where there is something to check it against.

    A row where Grail collected FEWER is a module whose tests it cannot all
    reach; one where it collected more is a place the static walk is blind."""
    have = [r for r in rows if r['measured'] and r['measured']['tests'] > 0]
    hdr = '%-34s %7s %8s %8s' % ('module', 'static', 'measured', 'delta')
    print(hdr)
    print('-' * len(hdr))
    s_tot = m_tot = 0
    for r in sorted(have, key=lambda r: r['measured']['tests'] - r['static_tests']):
        s, m = r['static_tests'], r['measured']['tests']
        s_tot += s
        m_tot += m
        if s != m:
            print('%-34s %7d %8d %+8d' % (r['module'], s, m, m - s))
    print('-' * len(hdr))
    print('%-34s %7d %8d %+8d' % ('total (%d modules)' % len(have),
                                  s_tot, m_tot, m_tot - s_tot))
    if s_tot:
        print()
        print('static / measured = %.3f  -- the static walk sees %.1f%% of what'
              % (s_tot / m_tot if m_tot else 0,
                 100.0 * s_tot / m_tot if m_tot else 0))
        print('unittest actually collected in these modules.')


def print_exact(rows):
    """The burn-down on EXACT counts, with the static walk beside it.

    Two columns rather than one, because they disagree in ways worth seeing:
    where static is lower, the module builds tests at import time; where CPython
    could not import at all, static is the only figure there is."""
    tiers, failures, diffs = {}, [], []
    for r in rows:
        ex = r.get('exact') or {}
        if ex.get('count') is None:
            failures.append((r['module'], ex.get('error') or 'unknown'))
        elif ex['count'] != r['static_tests']:
            diffs.append((r['module'], r['static_tests'], ex['count']))
        t = tiers.setdefault(r['tier'], {'modules': 0, 'wired': 0,
                                         'total': 0, 'passing': 0})
        t['modules'] += 1
        t['total'] += r['total']
        if r['measured']:
            t['wired'] += 1
            t['passing'] += r['passing']

    hdr = ('%-5s %8s %8s %10s %8s %10s %9s'
           % ('tier', 'modules', 'wired', 'tests', 'passing', 'remaining', 'done'))
    print(hdr)
    print('-' * len(hdr))
    tot = {'modules': 0, 'wired': 0, 'total': 0, 'passing': 0}
    for tier in sorted(tiers):
        t = tiers[tier]
        pct = (100.0 * t['passing'] / t['total']) if t['total'] else 0.0
        print('%-5s %8d %8d %10d %8d %10d %8.1f%%'
              % (tier, t['modules'], t['wired'], t['total'], t['passing'],
                 t['total'] - t['passing'], pct))
        for k in tot:
            tot[k] += t[k]
    print('-' * len(hdr))
    pct = (100.0 * tot['passing'] / tot['total']) if tot['total'] else 0.0
    print('%-5s %8d %8d %10d %8d %10d %8.1f%%'
          % ('all', tot['modules'], tot['wired'], tot['total'], tot['passing'],
             tot['total'] - tot['passing'], pct))
    print()
    print('counts    : %d module(s) exact (CPython\'s loader), %d from the static'
          % (sum(1 for r in rows if r.get('source') == 'exact'), len(failures)))
    print('            walk because CPython declined to import them here.')
    if failures:
        print()
        print('not importable under CPython on this platform:')
        for mod, err in failures:
            print('  %-32s %s' % (mod, err[:80]))
    if diffs:
        biggest = sorted(diffs, key=lambda d: abs(d[2] - d[1]), reverse=True)[:12]
        print()
        print('largest static-vs-exact gaps (tests built at import time):')
        for mod, s, e in biggest:
            print('  %-32s static %6d   exact %6d   %+d' % (mod, s, e, e - s))
    print()
    print('READ THE DENOMINATOR AS CPYTHON\'S, NOT AS GRAIL\'S CEILING.  Some of')
    print('these tests exist to check a SECOND implementation of the same thing:')
    print('test_datetime runs its whole suite twice (pure-Python and the C')
    print('accelerator) for 3608 of the total, and test_xpickle\'s 3016 cross-')
    print('version pickle round-trips need other CPython builds installed.  A')
    print('burn-down against this number will therefore asymptote below 100%,')
    print('and that is a property of the target rather than of the progress.')


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--source', help="CPython's test package directory")
    ap.add_argument('--per-module', action='store_true')
    ap.add_argument('--calibrate', action='store_true')
    ap.add_argument('--exact', action='store_true',
                    help="ask CPython's own loader for the true counts")
    ap.add_argument('--json', action='store_true')
    args = ap.parse_args()

    source_dir = args.source or default_source_dir()
    if not source_dir or not os.path.isdir(source_dir):
        print("could not locate CPython's test package; pass --source DIR",
              file=sys.stderr)
        return 2

    rows = build(source_dir)
    if args.exact:
        counts = exact_counts([r['module'] for r in rows])
        for r in rows:
            r['exact'] = counts.get(r['module'], {})
    for r in rows:
        n = (r.get('exact') or {}).get('count')
        r['source'] = 'exact' if n is not None else 'static'
        r['total'] = r['static_tests'] if n is None else n
        r['passing'] = passing_of(r['measured'])

    if args.json:
        json.dump({'source': source_dir,
                   'counts': 'exact' if args.exact else 'static',
                   'total': sum(r['total'] for r in rows),
                   'passing': sum(r['passing'] for r in rows),
                   'modules': rows}, sys.stdout, indent=2)
        print()
        return 0
    if args.per_module:
        print_per_module(rows)
        return 0
    if args.calibrate:
        print_calibration(rows)
        return 0
    if args.exact:
        print_exact(rows)
        return 0
    print('source    : %s' % source_dir)
    print()
    print_summary(rows)
    return 0


if __name__ == '__main__':
    sys.exit(main())
