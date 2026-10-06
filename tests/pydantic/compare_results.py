"""Compare run_pydantic_tests.py output from Grail against CPython, test by
test, and group Grail's divergences by their error so walls show up as
clusters (docs/Support_Pydantic.md, Phase 6).

    python compare_results.py <grail.out> <cpython.out> [--list]
"""

import collections
import re
import sys


def load(path):
    out = {}
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if line.startswith('RESULT|'):
                parts = line.rstrip('\n').split('|', 3)
                if len(parts) < 3:
                    continue   # an older run's id that held a newline
                _, nodeid, outcome, msg = (parts + [''])[:4]
                out[nodeid] = (outcome, msg)
    return out


def signature(msg):
    """The error with the volatile parts (reprs, numbers, addresses) blurred."""
    msg = re.sub(r'@\S+$', '', msg)
    msg = re.sub(r"'[^']*'", "'…'", msg)
    msg = re.sub(r'0x[0-9a-f]+|\d+', 'N', msg)
    return msg[:110]


def main():
    grail, cpy = load(sys.argv[1]), load(sys.argv[2])
    listing = '--list' in sys.argv
    same = collections.Counter()
    diverge = []
    for nodeid, (c_out, _) in cpy.items():
        g_out, g_msg = grail.get(nodeid, ('missing', 'not run under Grail'))
        if g_out == c_out:
            same[c_out] += 1
        else:
            diverge.append((nodeid, c_out, g_out, g_msg))
    print(f'tests: {len(cpy)}  same outcome: {sum(same.values())} {dict(same)}  diverge: {len(diverge)}')
    by_kind = collections.Counter((c, g) for _, c, g, _ in diverge)
    for (c, g), n in by_kind.most_common():
        print(f'  CPython {c:8s} -> Grail {g:8s}: {n}')
    clusters = collections.Counter(signature(m) for _, _, _, m in diverge)
    print('clusters:')
    for sig, n in clusters.most_common(25):
        print(f'  {n:4d}  {sig}')
    if listing:
        for nodeid, c, g, m in diverge:
            print(f'{c} -> {g}  {nodeid}  {m[:160]}')


if __name__ == '__main__':
    main()
