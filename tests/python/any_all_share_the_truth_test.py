"""any() and all() ask the same question `if` does.

Both did their own truth test -- ``item.__bool__()``, with a
MessageNotUnderstood handler answering True -- rather than the shared protocol.
str, list, dict and every other container define no `__bool__`; CPython reaches
`__len__` for them, and so does Grail's `bool()`, but that private probe missed
and every empty container came back TRUE:

    all(['x', ''])                     was True,  CPython False
    any(f.strip() for f in ['', ' '])  was True,  CPython False

Nothing raised and the answer looked plausible, which is how it lasted: it was
found in a Flask roster importer whose blank-row check never saw a blank row
(#1234).

Two smaller consequences came from the same private test.  A
MessageNotUnderstood raised INSIDE a user's `__bool__` was swallowed and read as
true, and a `__bool__` returning a non-bool raised an UNCATCHABLE Smalltalk
ImproperOperation -- `except BaseException` did not catch it and the process
exited 1 -- where `bool()` raises the TypeError CPython's `any` does.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


class LengthZero:
    """No __bool__; CPython falls back to __len__, and so must any/all."""

    def __len__(self):
        return 0


class LengthTwo:
    def __len__(self):
        return 2


class BoolReturnsNonBool:
    def __bool__(self):
        return 1


class BoolRaises:
    def __bool__(self):
        raise ValueError('from __bool__')


class BoolMissesAMessage:
    """__bool__ raises AttributeError; the old handler read that as True."""

    def __bool__(self):
        return self.does_not_exist


EMPTIES = [('str', ''), ('bytes', b''), ('list', []), ('tuple', ()),
           ('dict', {}), ('set', set()), ('frozenset', frozenset()),
           ('bytearray', bytearray()), ('len_zero', LengthZero())]


def _error(fn):
    try:
        return fn()
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ----------------------------------------------------------- the defect

check('any_of_a_lone_empty_is_false',
      {name: any([value]) for name, value in EMPTIES},
      {name: False for name, _ in EMPTIES})
check('all_of_a_lone_empty_is_false',
      {name: all([value]) for name, value in EMPTIES},
      {name: False for name, _ in EMPTIES})
check('they_agree_with_bool_on_every_one',
      [any([v]) == bool(v) and all([v]) == bool(v) for _, v in EMPTIES],
      [True] * len(EMPTIES))
check('the_blank_row_check_that_found_it',
      any(field.strip() for field in ['', ' ', '\t']), False)
check('a_mixed_sequence',
      (all(['x', '']), any(['', []]), all([[1], {}])), (False, False, False))
check('a_generator_not_just_a_list',
      (any(x for x in ['', [], {}]), all(x for x in ['x', ''])),
      (False, False))

# ----------------------------------------------------------- the raising paths

check('a_non_bool_dunder_raises_the_catchable_type_error',
      _error(lambda: any([BoolReturnsNonBool()])),
      ('TypeError', '__bool__ should return bool, returned int'))
check('and_it_matches_what_bool_itself_raises',
      _error(lambda: any([BoolReturnsNonBool()]))
      == _error(lambda: bool(BoolReturnsNonBool())), True)
check('an_exception_from_inside_dunder_bool_propagates',
      (_error(lambda: any([BoolRaises()])),
       _error(lambda: all([BoolRaises()]))),
      (('ValueError', 'from __bool__'), ('ValueError', 'from __bool__')))
check('an_attribute_error_inside_dunder_bool_is_not_read_as_true',
      _error(lambda: any([BoolMissesAMessage()]))[0], 'AttributeError')

# ----------------------------------------------------------- unchanged

# The falsey values that already worked, and the truthy ones, so the repair is
# not just "everything is False now".
check('the_falsey_values_that_already_worked',
      (any([0]), any([0.0]), any([None]), any([False]), any([range(0)])),
      (False, False, False, False, False))
check('truthy_values_are_still_true',
      (any(['x']), all(['x', 'y']), any([[1]]), all([{1: 2}]),
       any([LengthTwo()]), all([1, 2.5, True])),
      (True, True, True, True, True, True))
check('the_empty_iterable_conventions',
      (any([]), all([]), any(()), all(())), (False, True, False, True))


def visited_by_any():
    """any() must stop at the first true element, not drain the generator."""
    seen = []

    def values():
        for x in [1, 2, 3]:
            seen.append(x)
            yield x

    return (any(values()), seen)


def visited_by_all():
    """all() must stop at the first false element."""
    seen = []

    def values():
        for x in ['', 'b', 'c']:
            seen.append(x)
            yield x

    return (all(values()), seen)


check('any_stops_at_the_first_true_element', visited_by_any(), (True, [1]))
check('all_stops_at_the_first_false_element', visited_by_all(), (False, ['']))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
