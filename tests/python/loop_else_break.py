"""Fixture: ``break'' in a loop's ``else'' clause leaves the ENCLOSING loop.

A loop's else clause is not part of the loop: it runs when the loop ended
without a break, and a ``break'' or ``continue'' written in it belongs to
the loop around it.  Grail ran the else clause inside the loop's own break
handler, so a break there was caught by the loop that had already ended,
and the enclosing loop went on.  graphlib's TopologicalSorter._find_cycle
ends its ``while True'' that way, so prepare() never returned and
test_graphlib timed out.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.  Each loop that could run away is bounded, so a regression fails
rather than hangs.
"""

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def while_else_break():
    log, n = [], 0
    while True:
        n += 1
        if n > 3:
            return ('runaway', log)
        while False:
            pass
        else:
            log.append('else')
            break
    return log


def for_else_break():
    log, n = [], 0
    while True:
        n += 1
        if n > 3:
            return ('runaway', log)
        for _ in ():
            pass
        else:
            log.append('else')
            break
    return log


def for_in_for_else_break():
    log = []
    for i in range(3):
        for j in range(2):
            log.append((i, j))
        else:
            break
    return log


def else_continue():
    log = []
    for i in range(3):
        for _ in ():
            pass
        else:
            log.append(i)
            continue
        log.append('unreached')
    return log


def break_still_skips_else():
    log = []
    for i in range(3):
        if i == 1:
            break
        log.append(i)
    else:
        log.append('else')
    n = 0
    while n < 3:
        n += 1
        if n == 2:
            break
    else:
        log.append('while-else')
    return log


def else_runs_after_a_drain():
    log = []
    for i in range(2):
        log.append(i)
    else:
        log.append('for-else')
    n = 0
    while n < 2:
        n += 1
    else:
        log.append('while-else')
    return log


def else_returns():
    for _ in ():
        pass
    else:
        return 'returned from else'
    return 'fell through'


r['a break in while-else leaves the enclosing loop'] = _try(while_else_break)
r['a break in for-else leaves the enclosing loop'] = _try(for_else_break)
r['a break in a nested for-else leaves the outer for'] = _try(for_in_for_else_break)
r['a continue in for-else continues the enclosing loop'] = _try(else_continue)
r['a break in the body still skips the else clause'] = _try(break_still_skips_else)
r['the else clause runs after the loop drains'] = _try(else_runs_after_a_drain)
r['a return in the else clause returns'] = _try(else_returns)


EXPECTED = {
    'a break in while-else leaves the enclosing loop': ('ok', ['else']),
    'a break in for-else leaves the enclosing loop': ('ok', ['else']),
    'a break in a nested for-else leaves the outer for': ('ok', [(0, 0), (0, 1)]),
    'a continue in for-else continues the enclosing loop': ('ok', [0, 1, 2]),
    'a break in the body still skips the else clause': ('ok', [0]),
    'the else clause runs after the loop drains': ('ok', [0, 1, 'for-else', 'while-else']),
    'a return in the else clause returns': ('ok', 'returned from else'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-52s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
