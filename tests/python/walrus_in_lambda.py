"""PEP 572: a lambda is a SCOPE, and a walrus in its body binds there.

``lambda: (n := 1) + n`` is legal Python and the binding is the lambda's
own.  Grail's parser knew that -- ``parseLambda`` pushes a scope and the
walrus target was registered into it -- and then threw the set away at
``popScope``, which cost both halves of the name:

  * the WRITE had no temp to write to.  ``LambdaAst >> printSmalltalkOn:``
    declares locals for parameters only, so the emitted block was
    ``[:p :k | (n := 1) ___binOpAdd___: (self ___moduleAttrLoad___: #n)]``
    with no ``| n |`` -- a Smalltalk CompileError, which Python code
    cannot catch and which takes the whole enclosing method down.

  * the READ did not see a local either.  The LEGB walk asks each
    enclosing scope whether it binds the name by looking for a BlockAst
    body with a ``writes`` set; a lambda's body is an EXPRESSION, so the
    lambda answered "no" and the walk carried on outwards.

The second is the worse failure, because it COMPILES.  Where an enclosing
function happened to have a same-named local, the lambda wrote the outer
one:

    def f():
        n = 99
        fn = lambda: (n := 1) + n
        return (fn(), n)        # CPython (2, 99);  Grail said (2, 1)

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- the binding is the lambda's own ------------------------------------

def _plain():
    fn = lambda: (n := 1) + n
    return fn()


def _does_not_reach_the_enclosing_local():
    n = 99
    fn = lambda: (n := 1) + n
    return (fn(), n)


def _fresh_every_call():
    fn = lambda: (n := 1)
    return (fn(), fn())


check('plain', _plain(), 2)
check('does_not_reach_the_enclosing_local',
      _does_not_reach_the_enclosing_local(), (2, 99))
check('fresh_every_call', _fresh_every_call(), (1, 1))


# -- ``global'' in the enclosing def does not reach into the lambda ------

GLOBAL_SEEN = 0


def _enclosing_global():
    global GLOBAL_SEEN
    fn = lambda: (GLOBAL_SEEN := 5) + GLOBAL_SEEN
    return (fn(), GLOBAL_SEEN)


check('enclosing_global_stays_put', _enclosing_global(), (10, 0))


# -- parameters, defaults, *args, and the display the body may hold -----

def _with_a_parameter():
    fn = lambda a: [(y := a * 2), y + 1]
    return fn(3)


def _rebinds_its_own_parameter():
    fn = lambda n: (n := n + 1)
    return fn(4)


def _in_a_default():
    y = 'outer'
    fn = lambda x=(y := 'default'): (x, y)
    return (fn(), y)


def _varargs():
    fn = lambda *a, **k: [(t := len(a)), t + len(k)]
    return fn(1, 2, z=3)


check('with_a_parameter', _with_a_parameter(), [6, 7])
check('rebinds_its_own_parameter', _rebinds_its_own_parameter(), 5)
check('in_a_default', _in_a_default(), (('default', 'default'), 'default'))
check('varargs', _varargs(), [2, 3])


# -- nested scopes ------------------------------------------------------

def _comprehension_in_a_lambda():
    fn = lambda: [(y := i) for i in range(3)]
    return fn()


def _lambda_in_a_lambda():
    fn = lambda: (lambda: (k := 7) + k)()
    return fn()


def _inner_lambda_closes_over_it():
    fn = lambda: ((n := 3), (lambda: n)())
    return fn()


def _late_bound_in_a_comprehension():
    fns = [lambda i=i: (m := i * 10) + m for i in range(3)]
    return [f() for f in fns]


check('comprehension_in_a_lambda', _comprehension_in_a_lambda(), [0, 1, 2])
check('lambda_in_a_lambda', _lambda_in_a_lambda(), 14)
check('inner_lambda_closes_over_it', _inner_lambda_closes_over_it(), (3, 3))
check('late_bound_in_a_comprehension',
      _late_bound_in_a_comprehension(), [0, 20, 40])


# -- the same lambda in the other two places one can be written ---------

MODULE_LEVEL = lambda: (mv := 4) + mv


class InAClassBody:
    # Called where it stands rather than kept as a method: a class-body
    # ``m = lambda self: ...'' does not get receiver binding in Grail at
    # all -- ``C().m()'' raises "missing 1 required positional argument"
    # for a lambda with no walrus in sight.  Separate gap, docs/Issues.md.
    computed = (lambda: (c := 5) + c)()


check('module_level', MODULE_LEVEL(), 8)
check('class_body', InAClassBody.computed, 10)


# -- a target that shadows a builtin is still just a lambda local -------

def _shadows_a_builtin():
    fn = lambda: [(list := 9)]
    return (fn(), list)


check('shadows_a_builtin', _shadows_a_builtin(), ([9], list))


# -- and the body is ``expression'', so a bare walrus is refused --------
#
# A lambda body is not a namedexpr position: ``lambda: x := 1`` is a
# SyntaxError, and CPython names the lambda rather than saying "invalid
# syntax".  Grail parsed the body PERMITTED, so the walrus was accepted
# and then failed to compile -- the placement gate was one site too
# generous, which is exactly what it exists to prevent.


def refuses(code, fragment):
    try:
        compile(code, '<test>', 'exec')
        return 'compiled'
    except SyntaxError as exc:
        return (fragment in str(exc)) or 'msg: %s' % exc


check('body_refuses_a_bare_walrus',
      refuses('(lambda: x := 1)',
              'cannot use assignment expressions with lambda'), True)
check('body_refuses_it_as_a_statement',
      refuses('lambda: x := 1',
              'cannot use assignment expressions with lambda'), True)
check('body_refuses_it_in_a_display',
      refuses('[lambda: x := 1]',
              'cannot use assignment expressions with lambda'), True)

# But as the VALUE of a walrus the objection is no longer the lambda:
# the outer ``:=`` has already claimed its right-hand side, so CPython
# says plain "invalid syntax".  These two are CPython's own
# test_named_expressions invalid_14 and invalid_15.
check('as_a_walrus_value_it_is_plain_invalid_syntax',
      refuses('(x := lambda: y := 1)', 'invalid syntax'), True)

# Parenthesised it is legal, and that is the whole point of the gate:
# the body may hold a walrus, it may just not BE one.
check('parenthesised_in_the_body',
      (lambda: (w := 1) + w)(), 2)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
