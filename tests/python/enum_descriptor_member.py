# CPython's _EnumDict.__setitem__ rule: a class-body / members-dict name whose
# value is a DESCRIPTOR is never an enum member.  It stays an ordinary class
# attribute, and an enum that got only descriptors stays MEMBER-LESS -- which is
# what makes it legal to subclass.  A member in the subclass that shadows the
# name then answers the MEMBER off the class and the DESCRIPTOR off a member
# instance (CPython's _proto_member.__set_name__ redirect).
#
# Applying ``@enum.property`` at all also depends on a class being callable
# through Grail's INDIRECT call protocol -- a decorator is applied that way --
# so the two are exercised together here.

import enum
from enum import Enum, auto

r = {}

# --- class syntax: a descriptor value is not a member -------------------------

class ClassBody(Enum):
    x = property(lambda self: 'x-prop')
    A = 1
    B = 2

r['classbody_members'] = ','.join(m.name for m in ClassBody)

# --- functional API: a descriptor in the members dict is not a member ---------


@enum.property
def first(self):
    return '%s is first!' % self.name


BaseEnum = Enum('BaseEnum', {'first': first})
r['base_members'] = ','.join(m.name for m in BaseEnum)

# A member-less base is still extendable (it would not be if the descriptor had
# been counted as a member -- CPython forbids extending an enum that HAS one).
MainEnum = BaseEnum('MainEnum', dict(first=auto(), second=auto(), third=auto()))
r['main_members'] = ','.join(m.name for m in MainEnum)
r['main_values'] = ','.join(str(m.value) for m in MainEnum)

# Class access -> the member; instance access -> the shadowed descriptor.
r['main_first_repr'] = repr(MainEnum.first)
r['member_first'] = ','.join(m.first for m in MainEnum)

# --- a class is callable through the indirect (decorator) protocol ------------


class Wrap:
    def __init__(self, fn):
        self.fn = fn


@Wrap
def module_level(self):
    pass


r['module_decorator'] = type(module_level).__name__


class Holder:
    @Wrap
    def m(self):
        pass


r['classbody_decorator'] = type(Holder.__dict__['m']).__name__


def outer():
    @Wrap
    def inner(self):
        pass
    return inner


r['function_decorator'] = type(outer()).__name__

# The non-callable case still raises, rather than silently constructing.
try:
    not_callable = 21
    not_callable(5)
    r['non_callable'] = 'no error'
except TypeError:
    r['non_callable'] = 'TypeError'
