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
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
