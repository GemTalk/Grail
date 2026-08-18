"""Fixtures for ``NotImplemented'' as a real singleton of ``NotImplementedType''.

Driven by PythonTests>>NotImplementedSingletonTestCase.  Each check answers True
when Grail agrees with CPython.

WHAT IT IS FOR.  A binary dunder returns ``NotImplemented'' to say "I decline
this operand", and the operator layer then reflects to the other side and, if
that also declines, raises TypeError.  It is a control-flow marker, never a
value.

WHAT WAS WRONG.  Grail modelled it as the SYMBOL #'___NotImplemented___'.  The
identity test worked and nothing else did:

    type(NotImplemented)             Symbol   CPython: NotImplementedType
    repr(NotImplemented)   "'___NotImplemented___'"   CPython: 'NotImplemented'
    isinstance(NotImplemented, str)  True     CPython: False
    bool(NotImplemented)             True     CPython: TypeError

The last line is the dangerous one, and unlike the ellipsis case it had already
drawn blood twice.  A Symbol is TRUTHY, so a marker that reached a boolean
context took the wrong branch in silence -- and where a GemStone primitive
wanted a real Boolean it died with an uncatchable ``Expected
#'___NotImplemented___' to be a Boolean'' instead of any Python exception.  Two
files still carry workarounds written for exactly that.  CPython raises TypeError
here precisely so the mistake cannot be silent (GH-79893, a TypeError since
3.12); so does Grail now.

Run this file under CPython (``python3 tests/python/notimplemented_singleton.py'')
to see what it produces.
"""

import copy
import pickle
import types


class DeclinesEverything:
    """Answers NotImplemented from __eq__, as a class comparing to a foreign
    type should."""

    def __eq__(self, other):
        return NotImplemented

    __hash__ = None


# --- identity and type ---------------------------------------------------

def its_type_is_named_notimplementedtype():
    return type(NotImplemented).__name__ == 'NotImplementedType'


def types_notimplementedtype_is_that_type():
    return types.NotImplementedType is type(NotImplemented)


def calling_the_type_answers_the_same_object():
    return type(NotImplemented)() is NotImplemented


# --- what it is NOT ------------------------------------------------------

def it_is_not_a_string():
    return isinstance(NotImplemented, str) is False


def it_does_not_equal_the_old_sentinel_spelling():
    return (NotImplemented == '___NotImplemented___') is False


# --- the boolean context, which is the point ----------------------------

def bool_of_it_raises_typeerror():
    try:
        bool(NotImplemented)
    except TypeError as e:
        return 'boolean context' in str(e)
    return False


def using_it_in_an_if_raises_typeerror():
    try:
        if NotImplemented:
            pass
    except TypeError as e:
        return 'boolean context' in str(e)
    return False


def negating_it_raises_typeerror():
    try:
        not NotImplemented
    except TypeError:
        return True
    return False


# --- representation ------------------------------------------------------

def repr_is_the_bare_name():
    return repr(NotImplemented) == 'NotImplemented'


def str_falls_through_to_repr():
    return str(NotImplemented) == 'NotImplemented'


# --- it still works as the decline marker -------------------------------

def a_declining_eq_still_compares_false():
    """The marker must be CONSUMED by the operator layer, never surface as the
    result of ``=='' -- both sides decline, so the answer is identity: False."""
    return (DeclinesEverything() == 1) is False


def a_declining_eq_returns_it_when_called_directly():
    return DeclinesEverything().__eq__(1) is NotImplemented


def a_builtin_dunder_declines_the_same_way():
    """None.__ne__ against a non-None operand punts rather than answering True."""
    return None.__ne__(0) is NotImplemented


def declining_both_ways_raises_typeerror_not_a_bogus_bool():
    """``min(3j, 1j)'' is the case that used to die with an UNCATCHABLE Smalltalk
    error -- complex declines ``<'' both ways, and the marker reached a primitive
    that wanted a Boolean."""
    try:
        min(3j, 1j)
    except TypeError as e:
        return 'not supported between instances' in str(e)
    return False


def sorting_incomparables_raises_typeerror():
    try:
        sorted([3j, 1j])
    except TypeError as e:
        return 'not supported between instances' in str(e)
    return False


# --- round trips ---------------------------------------------------------

def reduce_answers_the_name_to_save_it_under():
    return NotImplemented.__reduce__() == 'NotImplemented'


def copy_preserves_identity():
    return (copy.copy(NotImplemented) is NotImplemented
            and copy.deepcopy(NotImplemented) is NotImplemented)


def pickle_round_trips_to_the_same_object():
    return pickle.loads(pickle.dumps(NotImplemented)) is NotImplemented


if __name__ == '__main__':
    checks = [
        its_type_is_named_notimplementedtype,
        types_notimplementedtype_is_that_type,
        calling_the_type_answers_the_same_object,
        it_is_not_a_string,
        it_does_not_equal_the_old_sentinel_spelling,
        bool_of_it_raises_typeerror,
        using_it_in_an_if_raises_typeerror,
        negating_it_raises_typeerror,
        repr_is_the_bare_name,
        str_falls_through_to_repr,
        a_declining_eq_still_compares_false,
        a_declining_eq_returns_it_when_called_directly,
        a_builtin_dunder_declines_the_same_way,
        declining_both_ways_raises_typeerror_not_a_bogus_bool,
        sorting_incomparables_raises_typeerror,
        reduce_answers_the_name_to_save_it_under,
        copy_preserves_identity,
        pickle_round_trips_to_the_same_object,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
