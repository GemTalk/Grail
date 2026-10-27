"""A generator's ``gi_frame.f_locals`` reads and writes its variables (PEP 667).

Before the first next an unstarted generator's f_locals was empty and a write
to it was kept by the mapping alone, so test_generators'
test_modify_f_locals, which replaces a generator's iterable before it starts,
got the original range back.  The variables are the ones the body block
captured; they are read and written there, and on the generator's process
once the body is parked at a yield.  A generator expression's outermost
iterator is CPython's ``.0'', and a non-iterator written there raises from the
loop as CPython's FOR_ITER does.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def gen(it):
    for x in it:
        yield x


def nested_gen():
    def inner(it):
        for x in it:
            yield x
    return inner(range(10))


def top(a, b=2):
    c = a + b
    yield c
    yield (a, b, c)


class K:
    k = 3

    def m(self, n):
        for i in range(n):
            yield i * self.k


def replaced(g, name, value):
    g.gi_frame.f_locals[name] = value
    return g


def genexpr():
    return (x for x in range(10))


def unstarted_keys(g):
    return sorted(g.gi_frame.f_locals)


def suspended_rewrite():
    g = top(1)
    fl = g.gi_frame.f_locals
    first = next(g)
    seen = sorted(fl.items())
    fl['c'] = 99
    fl['b'] = len
    return first, seen, next(g)


def suspended_genexpr_rewrite():
    g = (x for x in range(3))
    next(g)
    g.gi_frame.f_locals['x'] = 'w'
    return g.gi_frame.f_locals['x'], list(g)


t('unstarted: arguments are the locals', lambda: sorted(top(1).gi_frame.f_locals.items()))
t('unstarted: nested def', lambda: unstarted_keys(nested_gen()))
t('unstarted: genexpr has .0', lambda: (unstarted_keys(genexpr()),
                                       type(genexpr().gi_frame.f_locals['.0']).__name__))
t('unstarted: write an argument', lambda: list(replaced(gen(range(10)), 'it', [1, 2, 3])))
t('unstarted: write a nested def argument', lambda: list(replaced(nested_gen(), 'it', (4, 5))))
t('unstarted: write a default', lambda: list(replaced(top(1), 'b', 10)))
t('unstarted: write a non-iterable argument', lambda: list(replaced(gen(range(10)), 'it', 42)))
t('unstarted: write .0 an iterator', lambda: list(replaced(genexpr(), '.0', iter('ab'))))
t('unstarted: write .0 a list', lambda: list(replaced(genexpr(), '.0', [1, 2])))
t('unstarted: write .0 an int', lambda: list(replaced(genexpr(), '.0', 42)))
t('unstarted: method argument', lambda: ('n' in K().m(2).gi_frame.f_locals,
                                          list(replaced(K().m(2), 'n', 4))))
t('suspended: read, then write a local and an argument', suspended_rewrite)
t('suspended: write a genexpr target', suspended_genexpr_rewrite)


EXPECTED = {
    'unstarted: arguments are the locals': "[('a', 1), ('b', 2)]",
    'unstarted: nested def': "['it']",
    'unstarted: genexpr has .0': "(['.0'], 'range_iterator')",
    'unstarted: write an argument': '[1, 2, 3]',
    'unstarted: write a nested def argument': '[4, 5]',
    'unstarted: write a default': '[11, (1, 10, 11)]',
    'unstarted: write a non-iterable argument': "TypeError: 'int' object is not iterable",
    'unstarted: write .0 an iterator': "['a', 'b']",
    'unstarted: write .0 a list': "TypeError: 'list' object is not an iterator",
    'unstarted: write .0 an int': "TypeError: 'int' object is not an iterator",
    'unstarted: method argument': '(True, [0, 3, 6, 9])',
    'suspended: read, then write a local and an argument': "(3, [('a', 1), ('b', 2), ('c', 3)], (1, <built-in function len>, 99))",
    'suspended: write a genexpr target': "('w', [1, 2])",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
