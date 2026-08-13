# Calling the enum class from inside a class-body __init__ -- ``cls(value)'' --
# has to look a member up, not build one:
#
#     class UniqueEnum(Enum):
#         def __init__(self, *args):
#             cls = self.__class__
#             if any(self.value == e.value for e in cls):
#                 raise ValueError('aliases not allowed in UniqueEnum:  %r --> %r'
#                                  % (self.name, cls(self.value).name))
#
# In CPython _value2member_map_ is live throughout construction -- EnumType
# .__new__ fills it member by member -- so cls(value) answers the member built
# earlier.  Grail published its equivalent (the registry record) before the
# member loop too, but the ClassDefAst-emitted generic instantiation was only
# removed from the metaclass AFTER the loop, so during it cls(value) still
# SHADOWED the lookup: it built a fresh instance and ran __init__ on that, and
# an __init__ that calls cls(...) recursed until RecursionError.
#
# The class-call fixup now runs before the loop.  Nothing in the loop wants the
# generic -- member construction calls the DATA TYPE's constructor, never the
# enum's.

from enum import Enum

r = {}


class UniqueEnum(Enum):
    def __init__(self, *args):
        cls = self.__class__
        if any(self.value == e.value for e in cls):
            raise ValueError('aliases not allowed in UniqueEnum:  %r --> %r'
                             % (self.name, cls(self.value).name))


class Color(UniqueEnum):
    red = 1
    green = 2
    blue = 3


r['clean'] = ';'.join(repr(m) for m in Color)

try:
    class Dupes(UniqueEnum):
        red = 1
        green = 2
        grene = 2
    r['message'] = 'NOT RAISED'
except ValueError as e:
    # The whole point: the message names the member cls(value) found.  It used
    # to be unreachable -- the lookup recursed instead.
    r['message'] = str(e)

# --- what each member sees while it is being built -------------------------------


seen = []


class Watch(Enum):
    def __init__(self, *args):
        cls = self.__class__
        try:
            # The member being built is NOT registered yet, so its own value
            # does not resolve -- CPython adds it to _value2member_map_ after
            # __init__ returns.
            own = repr(cls(self.value))
        except ValueError as e:
            own = 'ValueError'
        except TypeError as e:
            # CPython's wording for a lookup on an enum with no members yet,
            # which is what the FIRST member sees.
            own = 'TypeError:has-no-members' if 'has no members' in str(e) else 'TypeError:?'
        earlier = [m.name for m in cls]
        seen.append('%s(%s) own=%s earlier=%s' % (self.name, self.value, own, earlier))


class Three(Watch):
    a = 1
    b = 2
    c = 3


r['progressive'] = ';'.join(seen)

# Looking up an EARLIER member by value works from inside __init__.

found = []


class Back(Enum):
    def __init__(self, *args):
        cls = self.__class__
        found.append(repr(cls(1)) if any(e.value == 1 for e in cls) else 'none-yet')


class BackEnum(Back):
    one = 1
    two = 2
    three = 3


r['backwards'] = ';'.join(found)

# --- the ordinary path is unchanged ----------------------------------------------

r['after_lookup'] = repr(Color(2))
r['after_by_name'] = repr(Color['blue'])
r['after_identity'] = Color(1) is Color.red

try:
    Color(99)
    r['after_bad'] = 'NOT RAISED'
except ValueError as e:
    r['after_bad'] = str(e)
