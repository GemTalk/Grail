"""Fixture: a ``def`` in a class body is a PLAIN FUNCTION, receiver or not.

CPython's class body is an ordinary namespace, so a ``def`` in it is a function
like any other: calling it binds the first parameter to the first argument and
checks nothing about it.  Grail compiles such a def to a Smalltalk METHOD whose
first Python parameter IS the receiver, and routes a plain call through
UnboundMethod, which substitutes the first argument as that receiver and runs
the method non-virtually.  Same semantics, different mechanism -- and the
mechanism used to leak in two places, both of them visible only when the
argument was an int (or another GemStone "special": a bool, a float, None):

  * ``performMethod:`` refuses a special receiver for a method compiled against
    a non-special class, with GemStone error 2156 -- whose text says what to do
    about it: "Self is not a ram oop, METHOD NEEDS RECOMPILE".  Compiling the
    same source against the receiver's own class produces a method the
    primitive accepts.  Grail used to raise CPython's ``descriptor ... doesn't
    apply to'' TypeError here instead, which is right for a BUILTIN type's
    method (see ``builtin_descriptor_still_refuses`` below) and wrong for a
    plain function.

  * a comprehension whose iteration variable SHADOWS that first parameter.
    PEP 709 inlines the comprehension into the enclosing scope, so the target
    is an ordinary local -- but for the receiver parameter "ordinary local"
    meant Smalltalk ``self``, and the generated store read ``self := ...``,
    which does not compile.  The def's body was replaced by a raising stub, so
    calling it answered "Grail could not compile this method (codegen gap)".

Both are fixed.  Note what ``shadowing_comprehension`` pins: CPython restores
the parameter after the inlined comprehension, so the FIRST clause's iterable
and the trailing read both see the argument (2) while the comprehension's own
target -- and the lambdas that close over it -- see the loop variable.

Over three arguments after ``self`` Grail resolves the packed ``_name:kw:``
wrapper instead of a fixed-arity selector, and that wrapper only re-dispatches
virtually, so a special receiver still cannot run it: ``wide_signature``
records that as a divergence rather than pretending it works.
"""

r = {}


# --- the plain-function call, from inside the class body -------------------
class InBody:
    def helper(n):
        return n * 10

    tenfold = helper(3)
    from_bool = helper(True)
    from_float = helper(1.5)

r['in_body'] = (InBody.tenfold, InBody.from_bool, InBody.from_float)


# --- the same call from OUTSIDE, through the class -------------------------
class Outside:
    def one(self):
        return self + 1

    def two(self, a):
        return (self, a)

    def three(self, a, b):
        return (self, a, b)

    def four(self, a, b, c):
        return (self, a, b, c)

r['outside'] = (Outside.one(5), Outside.two(5, 'x'),
                Outside.three(5, 'x', 'y'), Outside.four(5, 'x', 'y', 'z'))
r['outside_none'] = Outside.two(None, 1)
r['outside_char'] = Outside.two('c', 1)


# --- a comprehension target shadowing the receiver parameter --------------
class Shadow:
    def f(x):
        return [lambda: x for x in range(x)], x

    fns, kept = f(2)
    ys = [fn() for fn in fns]

r['shadowing_comprehension'] = (Shadow.ys, Shadow.kept)


# --- a builtin type's method is a DESCRIPTOR and must still refuse --------
def builtin_descriptor_still_refuses():
    out = []
    for call in (lambda: bytes.hex(1), lambda: str.upper(1),
                 lambda: list.append(1, 2)):
        try:
            call()
        except TypeError:
            out.append('TypeError')
        else:
            out.append('no error')
    return out

r['builtin_descriptor_still_refuses'] = builtin_descriptor_still_refuses()


# --- an int receiver still reaches the body's own TypeError ---------------
def body_errors_are_the_body_s():
    try:
        Outside.one(None)
    except TypeError:
        return 'TypeError'
    return 'no error'

r['body_errors_are_the_body_s'] = body_errors_are_the_body_s()


# --- KNOWN DIVERGENCE: more than three arguments after self ---------------
def wide_signature():
    class Wide:
        def five(self, a, b, c, d):
            return (self, a, b, c, d)
    try:
        return Wide.five(1, 2, 3, 4, 5)
    except TypeError:
        # Grail: the packed wrapper is the only form that resolves at this
        # arity, and it re-dispatches virtually.
        return 'TypeError'

r['wide_signature'] = wide_signature()


EXPECTED = {
    'in_body': (30, 10, 15.0),
    'outside': (6, (5, 'x'), (5, 'x', 'y'), (5, 'x', 'y', 'z')),
    'outside_none': (None, 1),
    'outside_char': ('c', 1),
    'shadowing_comprehension': ([1, 1], 2),
    'builtin_descriptor_still_refuses': ['TypeError', 'TypeError', 'TypeError'],
    'body_errors_are_the_body_s': 'TypeError',
}

KNOWN_DIVERGENCES = {
    # CPython answers (1, 2, 3, 4, 5); Grail raises TypeError.
    'wide_signature': (1, 2, 3, 4, 5),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(KNOWN_DIVERGENCES)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
