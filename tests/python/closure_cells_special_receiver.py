"""Fixture: a class-body def reaches the enclosing function's variables when
it is called through the class with an int, a bool, None or a str first.

``Cls.f(x)`` binds f's first parameter to x, whatever x is.  Grail runs f
with x as the receiver, and finds a variable of the function the class is
defined in through the receiver's class -- or, for a receiver that is not an
instance, through the running frame's class.  For an int, a bool, a float or
None, Grail first recompiles f against the receiver's own class (a method of
an ordinary class cannot run on them), so that frame's class was SmallInteger
and the variable was not found: a NameError, "cannot access free variable",
reading it and "has no enclosing binding to assign" writing it.  That is how
annotationlib calls a class body's ``def __annotate__(format)``: with 1.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import annotationlib


def outcome(thunk):
    try:
        return thunk()
    except NameError as e:
        return 'NameError: %s' % (e,)


def build():
    seen = 'seen'
    calls = []

    class Holder:
        def reads(first):
            return (first, seen)

        def writes(first):
            nonlocal seen
            seen = 'written by %r' % (first,)
            return seen

        def appends(first):
            calls.append(first)
            return len(calls)

    return Holder, calls


Holder, calls = build()
r = {}
r['reads'] = [outcome(lambda: Holder.reads(arg)) for arg in (1, True, None, 2.5, 'x', [])]
r['writes'] = [outcome(lambda: Holder.writes(1)), outcome(lambda: Holder.reads('after'))]
r['appends'] = [outcome(lambda: Holder.appends(arg)) for arg in (1, None)] + [calls]


def annotated():
    called = []

    class A:
        x: int

        def __annotate__(format):
            called.append(format)
            return {'x': format}

    return A, called


A, called = annotated()
r['annotate_reads_enclosing'] = [A.__annotate__(annotationlib.Format.VALUE), called]

EXPECTED = {
    'reads': [(1, 'seen'), (True, 'seen'), (None, 'seen'), (2.5, 'seen'), ('x', 'seen'), ([], 'seen')],
    'writes': ['written by 1', ('after', 'written by 1')],
    'appends': [1, 2, [1, None]],
    'annotate_reads_enclosing': [{'x': 1}, [1]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r.get(key, '<missing>') == EXPECTED[key]
        print('%-26s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r.get(key, '<missing>'),))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
