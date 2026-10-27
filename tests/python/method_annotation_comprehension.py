"""Fixture: a method's annotation may hold a comprehension or a generator expression.

PEP 649 evaluates a method's annotations lazily, in an annotation scope, and
a comprehension or a generator expression is an ordinary expression there.
Grail compiled a class whose method annotation held one into a Smalltalk
MessageNotUnderstood (``AppendStream does not understand #increaseIndent'')
that no Python handler could catch, so the class -- and every module defining
one -- could not be built.  A nested function scope does not see the class
body's names, so ``T`` below is the module's, as CPython has it.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

T = 'module'
r = {}


class C:
    T = 'class'

    def gen(x: (T for _ in (1,))): pass

    def displays(x: [T for _ in (1,)], y: {k for k in 'ab'}, z: {k: T for k in 'a'}): pass

    @classmethod
    def class_side(cls, x: [n * 2 for n in range(3)]) -> (s for s in 'xy'): pass

    def nested(x: [[a, b] for a in 'ab' for b in (1, 2) if b > 1]): pass


r['generator'] = list(C.gen.__annotations__['x'])
displays = C.displays.__annotations__
r['displays'] = [displays['x'], sorted(displays['y']), displays['z']]
r['class_side'] = [C.class_side.__annotations__['x'], list(C.class_side.__annotations__['return'])]
r['nested'] = C.nested.__annotations__['x']

EXPECTED = {
    'generator': ['module'],
    'displays': [['module'], ['a', 'b'], {'a': 'module'}],
    'class_side': [[0, 2, 4], ['x', 'y']],
    'nested': [['a', 2], ['b', 2]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-12s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
