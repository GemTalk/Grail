# typing.List is NOT list -- it is a deprecated alias OF it, and the difference
# is observable:
#
#     repr(typing.List)         'typing.List'          not "<class 'list'>"
#     repr(typing.List[int])    'typing.List[int]'     not 'list[int]'
#     typing.List[int] == list[int]                    False
#
# Grail had these names bound to the builtin itself.  That was an improvement on
# what came before (bare name-carrying stubs, which were not types at all, so
# isinstance and `|` both failed), but it conflated two objects CPython keeps
# apart -- and test_enum's test_enum_of_generic_aliases is precisely a test that
# they ARE apart: it puts both in one enum and requires two distinct members,
# which only holds if they are unequal and hash apart.
#
# So typing.List is a _SpecialGenericAlias wrapping list as its __origin__, and
# type checks DELEGATE to that origin -- which is what keeps everything aliasing
# bought.  The half that needed Smalltalk is the delegation itself: CPython's
# PyObject_IsInstance looks __instancecheck__ up on TYPE(cls) without first
# requiring cls to be a type, and typing.List is an INSTANCE, not a type, so
# Grail had no path to the hook at all.
#
# test_enum test_enum_of_generic_aliases; test_isinstance test_subclass_normal /
# test_isinstance_with_or_union (which must keep passing).

import typing


def the_alias_prints_as_itself():
    return repr(typing.List) == 'typing.List' and repr(typing.Dict) == 'typing.Dict'


def a_subscripted_alias_prints_as_itself():
    return (repr(typing.List[int]) == 'typing.List[int]'
            and repr(typing.Dict[str, int]) == 'typing.Dict[str, int]')


def the_builtin_generic_still_prints_as_itself():
    return repr(list[int]) == 'list[int]'


def the_two_are_distinct():
    """What test_enum_of_generic_aliases turns on: an enum holding both must
    end up with two members, so they must be unequal AND hash apart."""
    return (typing.List[int] != list[int]
            and typing.List[int] == typing.List[int]
            and hash(typing.List[int]) != hash(list[int]))


def an_enum_can_hold_both():
    """The test_enum case itself."""
    from enum import Enum

    class E(Enum):
        a = typing.List[int]
        b = list[int]

    return (E.a.value == typing.List[int]
            and E.b.value == list[int]
            and repr(E.a) == '<E.a: typing.List[int]>'
            and repr(E.b) == '<E.b: list[int]>')


def isinstance_delegates_to_the_origin():
    """typing.List is an INSTANCE, not a type, so this reaches list only
    through __instancecheck__ on its own class."""
    return isinstance([], typing.List) is True and isinstance(2, typing.List) is False


def issubclass_delegates_to_the_origin():
    return issubclass(list, typing.List) is True and issubclass(int, typing.List) is False


def a_union_of_aliases_works():
    """`|` on two alias objects cannot make a types.UnionType, so it makes a
    typing one -- which has to answer type checks the same way."""
    u = typing.List | typing.Tuple
    return (repr(u) == 'typing.List | typing.Tuple'
            and isinstance([], u) is True
            and isinstance(2, typing.List | int) is True
            and isinstance(2, u) is False)


def issubclass_through_a_union_works():
    """Note the FIRST argument is not a type either -- CPython never validates
    it before asking the second one's hook."""
    u = typing.List | typing.Tuple
    return issubclass(typing.List, u) is True and issubclass(int, u) is False


def a_deprecated_alias_is_not_a_constructor():
    """Built with inst=False upstream: it points at the builtin instead."""
    try:
        typing.List()
    except TypeError as e:
        return 'cannot be instantiated' in str(e)
    return False


def ordinary_type_checks_are_unaffected():
    """Guard rail.  isinstance is the hottest builtin there is, and the new
    lookup only fires for a non-class second argument."""
    return (isinstance([], list) is True
            and isinstance(2, int) is True
            and isinstance(2, str) is False
            and issubclass(bool, int) is True
            and isinstance(2, (str, int)) is True)



# ---------------------------------------------------------------------------
# The ABC ALIASES -- typing.Mapping and friends.
#
# These are a different object from typing.List above: there is no builtin to
# wrap, so they stand for a class in collections.abc and resolve it lazily.
# PR #726 gave them __mro_entries__, which made them work as a BASE CLASS.  It
# did not make them work as a TYPE-CHECK TARGET, and urllib3's
# HTTPHeaderDict.extend is one line of each:
#
#     class HTTPHeaderDict(typing.MutableMapping[str, str]):   # PR #726
#         def extend(self, *args, **kwargs):
#             if isinstance(val, typing.Mapping):              # this
#
# so the class was buildable and its method raised
# ``TypeError: isinstance() arg 2 must be a type ...''.  The answer is the one
# typing.List already uses -- delegate to the class the name stands for -- so
# the two spellings cannot drift apart.
# ---------------------------------------------------------------------------

_ABC_NAMES = ('Mapping', 'MutableMapping', 'Sequence', 'Iterable', 'Callable')


def an_abc_alias_is_an_isinstance_target():
    """The urllib3 line.  Answers whatever collections.abc answers, because it
    ASKS collections.abc rather than reimplementing the question."""
    return (isinstance({}, typing.Mapping) is True
            and isinstance({}, typing.MutableMapping) is True
            and isinstance([], typing.Sequence) is True
            and isinstance('s', typing.Sequence) is True
            and isinstance([], typing.Iterable) is True
            and isinstance(len, typing.Callable) is True)


def an_abc_alias_is_an_issubclass_target():
    return (issubclass(dict, typing.Mapping) is True
            and issubclass(dict, typing.MutableMapping) is True
            and issubclass(list, typing.Sequence) is True
            and issubclass(dict, typing.Iterable) is True)


def the_delegation_can_answer_false():
    """NEGATIVE CONTROL.  A ``__instancecheck__'' that returned True
    unconditionally would pass every check above and be worthless; these are
    the cases where the origin says NO, so only real delegation passes both.

    Note ``isinstance({}, typing.Sequence)'': a dict is Iterable and Mapping
    but not a Sequence, which is exactly the distinction urllib3's extend()
    branches on."""
    return (isinstance([], typing.Mapping) is False
            and isinstance({}, typing.Sequence) is False
            and isinstance(1, typing.Iterable) is False
            and isinstance({}, typing.Callable) is False
            and issubclass(list, typing.Mapping) is False
            and issubclass(dict, typing.Callable) is False)


def every_abc_alias_agrees_with_its_origin():
    """The whole surface at once, against the module it stands for -- so a new
    name added to the alias list is covered without a new check."""
    import collections.abc
    samples = ({}, [], 's', len, 1, (), set())
    for name in _ABC_NAMES:
        alias = getattr(typing, name)
        origin = getattr(collections.abc, name)
        for obj in samples:
            if isinstance(obj, alias) is not isinstance(obj, origin):
                return False
        for cls in (dict, list, str, int, tuple, set):
            if issubclass(cls, alias) is not issubclass(cls, origin):
                return False
    return True


def a_subscripted_abc_alias_is_refused():
    """CPython refuses a SUBSCRIPTED generic in a type check, and says so in
    those words.  Grail used to refuse it too, but only by accident -- the
    alias was not a type at all -- so delegating had to keep the refusal
    deliberately rather than let it fall out of the delegation."""
    sub = typing.Mapping[str, str]
    try:
        isinstance({}, sub)
        return False
    except TypeError as e:
        if 'Subscripted generics cannot be used' not in str(e):
            return False
    try:
        issubclass(dict, sub)
        return False
    except TypeError as e:
        return 'Subscripted generics cannot be used' in str(e)


def a_subscripted_callable_alias_is_refused_too():
    try:
        isinstance(len, typing.Callable[[int], int])
        return False
    except TypeError as e:
        return 'Subscripted generics cannot be used' in str(e)


def an_abc_alias_is_still_a_base_class():
    """Guard rail for PR #726.  Subscripting no longer answers the alias
    itself, so both spellings have to be checked: the subscripted one is what
    urllib3 writes."""

    class Subscripted(typing.MutableMapping[str, str]):
        pass

    class Bare(typing.MutableMapping):
        pass

    names = [b.__name__ for b in Subscripted.__mro__]
    bare_names = [b.__name__ for b in Bare.__mro__]
    return ('MutableMapping' in names and 'Mapping' in names
            and 'MutableMapping' in bare_names and 'Mapping' in bare_names)


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        the_alias_prints_as_itself,
        a_subscripted_alias_prints_as_itself,
        the_builtin_generic_still_prints_as_itself,
        the_two_are_distinct,
        an_enum_can_hold_both,
        isinstance_delegates_to_the_origin,
        issubclass_delegates_to_the_origin,
        a_union_of_aliases_works,
        issubclass_through_a_union_works,
        a_deprecated_alias_is_not_a_constructor,
        ordinary_type_checks_are_unaffected,
        an_abc_alias_is_an_isinstance_target,
        an_abc_alias_is_an_issubclass_target,
        the_delegation_can_answer_false,
        every_abc_alias_agrees_with_its_origin,
        a_subscripted_abc_alias_is_refused,
        a_subscripted_callable_alias_is_refused_too,
        an_abc_alias_is_still_a_base_class,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
