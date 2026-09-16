#!/usr/bin/env python3
"""Rebuild the cut-log index in experiments/ir/MIGRATION.md from migration/*.md.

The log is one file per cut so that two cuts in flight add two different paths
and cannot conflict.  The index below is the one shared line per cut that
remains, so it is GENERATED rather than hand-edited: if two cuts do collide on
it, the resolution is to re-run this script, never to hand-merge.

    python3 scripts/regen_migration_index.py [--check]

--check exits non-zero if the committed index is stale, for CI.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'experiments/ir/MIGRATION.md')
DIR = os.path.join(ROOT, 'experiments/ir/migration')
BEGIN = '<!-- BEGIN GENERATED CUT LOG -->'
END = '<!-- END GENERATED CUT LOG -->'


def title_of(path):
    """The section's own level-2 heading, which each file preserves verbatim."""
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.startswith('## '):
                return line[3:].strip()
    raise SystemExit(f'{path}: no level-2 heading')


def build():
    rows = []
    for path in sorted(glob.glob(os.path.join(DIR, '*.md'))):
        rows.append(f'* [{title_of(path)}](migration/{os.path.basename(path)})')
    return '\n'.join([BEGIN] + rows + [END])


def main():
    text = open(SRC, encoding='utf-8').read()
    if BEGIN not in text or END not in text:
        raise SystemExit(f'{SRC}: generated-block markers are missing')
    new = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda m: build(),
                 text, flags=re.S)
    if '--check' in sys.argv:
        if new != text:
            print('MIGRATION.md cut-log index is stale; run '
                  'python3 scripts/regen_migration_index.py', file=sys.stderr)
            return 1
        print('cut-log index is up to date')
        return 0
    open(SRC, 'w', encoding='utf-8').write(new)
    print(f'index rebuilt: {len(glob.glob(os.path.join(DIR, "*.md")))} cuts')
    return 0


if __name__ == '__main__':
    sys.exit(main())
