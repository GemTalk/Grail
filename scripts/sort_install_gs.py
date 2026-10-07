#!/usr/bin/env python3
"""Keep src/smalltalk/install.gs's order-free lists sorted.

Why: a list kept in insertion order makes every concurrent PR add its line at
the SAME place -- the end, or wherever the last author put theirs -- and so
every pair of open PRs that each add a file conflicts the moment one merges.
Sorted, new entries scatter by name and those add/add conflicts mostly
disappear.  The lists were sorted once (86933fd2) and drifted back, because
nothing said so; this script is the "something".

Two kinds of list are sorted, both ones whose order is NOT load-bearing:

* every forward-reference block in Step 2 -- the lines
      at: #'Name' put: nil;
  between ``objectNamed: #'Dict')'' and ``yourself.''.  They only declare
  names, so their order cannot matter.  Sorted by name.

* the test-class inputs of Step 6, between the two marker comments
      ! >>> SORTED TEST INPUTS ...
      ! <<< END SORTED TEST INPUTS
  Sorted by FILE NAME (not path), so src/weakref/WeakReferenceTestCase.gs
  sits among the W's.  Only ``input'' lines may appear between the markers.
  A test class whose superclass is another test class is a real dependency
  and belongs ABOVE the markers (as GrailTestResult, PythonTestCase and the
  CPythonTestCase family are), never inside them.

The order is case-insensitive (str.casefold), ties broken by the exact text.

The Python/ and PythonAst/ inputs are NOT sorted: they are filed in
dependency order (superclasses first, singletons such as None bound before
any file that mentions them), and their comments say which constraint each
position serves.

Usage:
    python3 scripts/sort_install_gs.py           # --check (default)
    python3 scripts/sort_install_gs.py --check   # exit 1 if anything is out of order
    python3 scripts/sort_install_gs.py --fix     # rewrite in place
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSTALL_GS = os.path.join(ROOT, 'src', 'smalltalk', 'install.gs')

FWD_HEAD = re.compile(r"^\(System myUserProfile symbolList objectNamed: #'(\w+)'\)$")
FWD_LINE = re.compile(r"^\tat: #'(\w+)' put: nil;$")
FWD_TAIL = '\tyourself.'
TESTS_BEGIN = '! >>> SORTED TEST INPUTS'
TESTS_END = '! <<< END SORTED TEST INPUTS'
INPUT_LINE = re.compile(r'^input (\S+)$')


def fwd_key(line):
    name = FWD_LINE.match(line).group(1)
    return (name.casefold(), name)


def input_key(line):
    path = INPUT_LINE.match(line).group(1)
    base = os.path.basename(path)
    return (base.casefold(), path)


def find_regions(lines):
    """Yield (label, start, end, key) for each sortable slice lines[start:end]."""
    errors = []
    regions = []
    i = 0
    while i < len(lines):
        m = FWD_HEAD.match(lines[i])
        if m and i + 1 < len(lines) and FWD_LINE.match(lines[i + 1]):
            start = i + 1
            j = start
            while j < len(lines) and FWD_LINE.match(lines[j]):
                j += 1
            if j >= len(lines) or lines[j] != FWD_TAIL:
                errors.append('line %d: forward references for %s are not one '
                              'unbroken run of "at: #\'X\' put: nil;" lines ending '
                              'in "yourself." (line %d is %r)'
                              % (i + 1, m.group(1), j + 1, lines[j] if j < len(lines) else ''))
            regions.append(('forward references for ' + m.group(1), start, j, fwd_key))
            i = j
            continue
        if lines[i].startswith(TESTS_BEGIN):
            start = i + 1
            j = start
            while j < len(lines) and not lines[j].startswith(TESTS_END):
                if not INPUT_LINE.match(lines[j]):
                    errors.append('line %d: only "input" lines may sit between the '
                                  'sorted-test markers, found %r' % (j + 1, lines[j]))
                j += 1
            if j >= len(lines):
                errors.append('line %d: %r has no closing %r' % (i + 1, TESTS_BEGIN, TESTS_END))
            regions.append(('test-class inputs', start, j, input_key))
            i = j
            continue
        i += 1
    if not any(label == 'test-class inputs' for label, *_ in regions):
        errors.append('no %r marker found' % TESTS_BEGIN)
    return regions, errors


def main(argv):
    fix = '--fix' in argv
    with open(INSTALL_GS, encoding='utf-8') as f:
        text = f.read()
    lines = text.split('\n')
    regions, errors = find_regions(lines)

    unsorted = []
    for label, start, end, key in regions:
        block = [l for l in lines[start:end] if key is not input_key or INPUT_LINE.match(l)]
        if len(block) != end - start:
            continue    # already reported as an error
        names = [key(l) for l in block]
        dups = sorted({n[1] for n in names if names.count(n) > 1})
        if dups:
            errors.append('%s: duplicate entries %s' % (label, ', '.join(dups)))
        want = sorted(block, key=key)
        if block != want:
            first = next(k for k in range(len(block)) if block[k] != want[k])
            unsorted.append('%s (lines %d-%d): first out of place at line %d, %s'
                            % (label, start + 1, end, start + first + 1, block[first].strip()))
            lines[start:end] = want

    for e in errors:
        print('install.gs: ' + e, file=sys.stderr)
    if errors:
        return 2
    if not unsorted:
        print('install.gs: %d sorted lists in order' % len(regions))
        return 0
    if fix:
        with open(INSTALL_GS, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        for u in unsorted:
            print('sorted ' + u)
        return 0
    for u in unsorted:
        print('install.gs: NOT SORTED -- ' + u, file=sys.stderr)
    print('Run: python3 scripts/sort_install_gs.py --fix', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
