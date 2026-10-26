"""Fixture: a def in a class body reads the enclosing function's locals when
the body itself calls it, and so does a lambda it returns, called later.

A method reaches an enclosing function's local through a cell stored on its
class.  Two shapes missed it:

  * the body CALLS the def (``f = mk()''), and the cells were stored only
    after the body ran -- CPython answers the local, Grail raised ``cannot
    access free variable'';
  * the def returns a lambda that runs after the def returned.  The def is
    receiverless, so the cell is found through the stack, and a block's
    frame carries the block, not its self, in the receiver slot.

PEP 695 needs both: ``class P[A]: type T[B] = dict[A, B]'' is a scope
function the body calls, whose lazily evaluated value reads A.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def body_call():
    A = 'a'

    class C:
        def mk():
            return A
        f = mk()
    return C.f


def escaped_lambda():
    A = 'a'

    class C:
        def mk():
            return lambda: A
        f = mk()
    return C.f()


def escaped_lambda_after_del():
    A = 'a'

    class C:
        def mk():
            return lambda: A
        f = mk()
        del mk
    return C.f()


def escaped_lambda_two_levels():
    A = 'a'

    class C:
        def mk():
            B = 'b'
            return lambda: (A, B)
        f = staticmethod(mk())
    return C.f()


def bound_after_the_class():
    class C:
        def mk():
            return lambda: A
        f = mk()
    A = 'late'
    return C.f()


def body_call_writes_nonlocal():
    A = 'a'

    class C:
        def mk():
            nonlocal A
            A = 'b'
        mk()
    return A


def method_called_later():
    A = 'a'

    class C:
        def m(self):
            return A
    return C().m()


r['a body-time call reads the enclosing local'] = _try(body_call)
r['an escaped lambda reads it after the def returned'] = _try(escaped_lambda)
r['the lambda still reads it once the def is deleted'] = _try(escaped_lambda_after_del)
r['a lambda reads both the def local and the outer local'] = _try(escaped_lambda_two_levels)
r['a local bound after the class is read by reference'] = _try(bound_after_the_class)
r['a body-time call writes a nonlocal'] = _try(body_call_writes_nonlocal)
r['a method called later still reads it'] = _try(method_called_later)


EXPECTED = {
    'a body-time call reads the enclosing local': ('ok', 'a'),
    'an escaped lambda reads it after the def returned': ('ok', 'a'),
    'the lambda still reads it once the def is deleted': ('ok', 'a'),
    'a lambda reads both the def local and the outer local': ('ok', ('a', 'b')),
    'a local bound after the class is read by reference': ('ok', 'late'),
    'a body-time call writes a nonlocal': ('ok', 'b'),
    'a method called later still reads it': ('ok', 'a'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-54s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
