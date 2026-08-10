# ``enum.member(x)`` is nonmember's mirror: it FORCES x to be a member even
# where the ordinary rules would skip the name -- a nested class, or a
# descriptor that CPython's _EnumDict would leave a plain class attribute.
#
# Grail bound ``member`` to PropertyDescriptor, so ``@member class Inner``
# produced a PropertyDescriptor rather than a marker.  And because the nested
# class's ``__qualname__'' store was emitted AFTER the class's decorators, it
# ran against whatever the decorator returned -- for a marker, that reached
# ___classHolderAttrStore___ and raised a raw Smalltalk doesNotUnderstand
# (#dynInstVars) that escaped as an ST error rather than any Python exception.

from enum import Enum, member, nonmember

r = {}


class Outer(Enum):
    a = 1
    b = 2

    @member
    class Inner(Enum):
        foo = 10
        bar = 11


r['outer_members'] = ','.join(m.name for m in Outer)
r['inner_is_member'] = isinstance(Outer.Inner, Outer)
r['inner_value_foo'] = Outer.Inner.value.foo.value
r['inner_value_members'] = ','.join(m.name for m in Outer.Inner.value)
r['a_value'] = Outer.a.value


class Outer2(Enum):
    a = 1

    @nonmember
    class Inner2:
        x = 5


r['outer2_members'] = ','.join(m.name for m in Outer2)
r['inner2_is_class'] = isinstance(Outer2.Inner2, type)
r['inner2_x'] = Outer2.Inner2.x


# The call form, and member() forcing a value the descriptor rule would skip.
class Forced(Enum):
    plain = 1
    forced = member(property(lambda self: 'nope'))


r['forced_members'] = ','.join(m.name for m in Forced)

# member() must not disturb an ordinary value.
class Ordinary(Enum):
    a = member(7)


r['ordinary_value'] = Ordinary.a.value
