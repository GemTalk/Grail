"""A unary operator on a type with no such dunder raises a catchable TypeError.

Three defects met in one message, found while writing the fixture for the
varargs-dispatch fix and left for this change so that one very hot method
changed one behaviour at a time.

1. UNCATCHABLE.  For a user-defined class, `-obj` raised a Smalltalk
   MessageNotUnderstood, which Python code cannot catch: `try: -obj
   except TypeError:` did not handle it, it ABORTED the enclosing module.
   `object >> doesNotUnderstand:args:envId:` did have the right TypeError,
   but it was gated `(self isKindOf: PythonInstance) ifFalse:` -- firing
   for None and the built-ins and skipped for exactly the user classes
   that needed it.  An error a program cannot catch is worse than a wrong
   message, so this is the half that matters.

2. EMPTY MESSAGE.  `abs()` raised a bare `TypeError signal` -- right
   class, no message at all -- for EVERY receiver kind.

3. LEAKED SMALLTALK CLASS NAMES.  The message was built from `self class
   name asString`, so it named the class backing the built-in rather than
   the Python type:

       -'ab'   ->  bad operand type for unary -: 'Unicode7'
       -[1]    ->  bad operand type for unary -: 'OrderedCollection'
       -{}     ->  bad operand type for unary -: 'PyDict'
       -object()   bad operand type for unary -: 'Object'

   That is the exact bug `___pyDnuTypeName___` exists to prevent, in a
   message that had never been converted to use it.

Nine receiver kinds x four operators.  Nine of the thirty-six matched
CPython before; all thirty-six do now.  The grid is the point: each of the
three defects hit a DIFFERENT part of it, and only a shape that varies
both axes shows that.

Note the two wordings -- three operators name the GLYPH and abs() names
the FUNCTION -- which is CPython's distinction, not a tidy-up.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


class NoUnary:
    pass


class WithSlots:
    __slots__ = ()


SUBJECTS = [
    ('NoUnary', lambda: NoUnary()),
    ('WithSlots', lambda: WithSlots()),
    ('NoneType', lambda: None),
    ('str', lambda: 'ab'),
    ('list', lambda: [1]),
    ('dict', lambda: {}),
    ('tuple', lambda: (1,)),
    ('set', lambda: {1}),
    ('object', lambda: object()),
]

OPS = [
    ('-', lambda x: -x),
    ('+', lambda x: +x),
    ('~', lambda x: ~x),
    ('abs()', lambda x: abs(x)),
]


def _message_for(make, op):
    try:
        op(make())
    except TypeError as exc:
        return str(exc)
    except BaseException as exc:
        return 'NOT-A-TypeError: %s' % type(exc).__name__
    return 'NO-ERROR'


def _the_whole_grid():
    """Every receiver kind against every unary operator, message and all.

    Catching TypeError specifically -- not BaseException -- is deliberate:
    it is the assertion that the error is CATCHABLE AS A TypeError, which
    is precisely what a Smalltalk MessageNotUnderstood was not."""
    out = {}
    for tname, make in SUBJECTS:
        for glyph, op in OPS:
            want = ('bad operand type for abs(): %r' % tname
                    if glyph == 'abs()'
                    else 'bad operand type for unary %s: %r' % (glyph, tname))
            got = _message_for(make, op)
            out['%s %s' % (glyph, tname)] = (got == want) or got
    return {k: v for k, v in out.items() if v is not True}


def _it_is_catchable_as_a_python_exception():
    """Stated on its own because it is the defect, not a detail of it: the
    program must be able to HANDLE this, not just receive it."""
    got = []
    for _, make in SUBJECTS:
        try:
            -make()
            got.append('no-error')
        except TypeError:
            got.append('caught')
    return got


def _a_bare_except_also_catches_it():
    try:
        -NoUnary()
    except Exception:
        return 'caught'
    return 'not-caught'


def _the_type_name_is_the_python_one():
    """The leak, isolated: these four named a Smalltalk class."""
    return tuple(_message_for(make, OPS[0][1]).rsplit(': ', 1)[1]
                 for tname, make in SUBJECTS
                 if tname in ('str', 'list', 'dict', 'object'))


def _abs_has_a_message_at_all():
    return tuple(_message_for(make, OPS[3][1]) != ''
                 for _, make in SUBJECTS)


check('the_whole_grid', _the_whole_grid(), {})
check('it_is_catchable_as_a_python_exception',
      _it_is_catchable_as_a_python_exception(), ['caught'] * 9)
check('a_bare_except_also_catches_it', _a_bare_except_also_catches_it(),
      'caught')
check('the_type_name_is_the_python_one', _the_type_name_is_the_python_one(),
      ("'str'", "'list'", "'dict'", "'object'"))
check('abs_has_a_message_at_all', _abs_has_a_message_at_all(),
      (True,) * 9)


# ------------------------- what must NOT change: operators that WORK

class Negatable:
    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        return isinstance(other, Negatable) and self.v == other.v

    def __repr__(self):
        return 'N(%r)' % self.v

    def __neg__(self):
        return Negatable(-self.v)

    def __abs__(self):
        return Negatable(abs(self.v))


class NegatableDefaulted:
    """The varargs shape, so the refusal added here cannot shadow it."""

    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        return isinstance(other, NegatableDefaulted) and self.v == other.v

    def __repr__(self):
        return 'D(%r)' % self.v

    def __neg__(self, context=None):
        return NegatableDefaulted(-self.v)

    def __abs__(self, context=None):
        return NegatableDefaulted(abs(self.v))


def _defined_unary_operators_still_work():
    return (-Negatable(3), abs(Negatable(-3)),
            -NegatableDefaulted(3), abs(NegatableDefaulted(-3)))


def _builtin_unary_operators_still_work():
    return (-5, +5, ~5, abs(-5), -2.5, abs(-2.5), -(2 + 3j) == (-2 - 3j))


def _partial_support_is_respected():
    """A class with __neg__ but no __invert__ must still be refused for ~,
    and refused by TYPE NAME -- the refusal is per-operator, not per-class."""
    try:
        ~Negatable(1)
    except TypeError as exc:
        return str(exc)
    return 'NO-ERROR'


check('defined_unary_operators_still_work',
      _defined_unary_operators_still_work(),
      (Negatable(-3), Negatable(3), NegatableDefaulted(-3),
       NegatableDefaulted(3)))
check('builtin_unary_operators_still_work',
      _builtin_unary_operators_still_work(),
      (-5, 5, -6, 5, -2.5, 2.5, True))
check('partial_support_is_respected', _partial_support_is_respected(),
      "bad operand type for unary ~: 'Negatable'")


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
