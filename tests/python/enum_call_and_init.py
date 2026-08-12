# Two rules from EnumType, both about what happens when an enum class is CALLED
# or when its members are built.
#
# (1) An enum that already HAS members is final, so calling it is ALWAYS a value
#     lookup -- ``Color('Foo', ('pink', 'black'))'' raises ValueError.  Grail
#     asked instead whether the arguments LOOKED like the functional API, and a
#     string first argument sent the call to Enum('Name', names), which happily
#     built ``<enum 'Foo'>'' (test_extending).  Membership is the whole test now,
#     as in CPython; a MEMBER-LESS class still routes to the functional API.
#
#     The message that goes with it is built with %r, and Smalltalk's printString
#     diverges from Python's repr for anything but ints and strings -- a tuple
#     read ``atuple( 'Foo', atuple( 'pink', 'black'))''.
#
# (2) A user __init__ INHERITED from an enum base was never run.  Grail excluded
#     any provider that was "an enum class", which is true of a user subclass of
#     Enum too, so a base written to initialise its subclasses' members did
#     nothing.  And it has to run BEFORE the member joins the class: CPython
#     calls it from _proto_member.__set_name__, before adding to _member_map_,
#     so an __init__ that inspects its own class must not see itself.

from enum import Enum

r = {}


class Color(Enum):
    red = 1
    green = 2
    blue = 3


# --- (1) a member-bearing class is never the functional API -------------------

try:
    Color('Foo', ('pink', 'black'))
    r['final'] = 'NOT RAISED'
except ValueError as e:
    r['final'] = str(e)
except BaseException as e:
    r['final'] = 'OTHER %s' % (type(e).__name__,)

try:
    Color('Foo', 'pink black')
    r['final_names_string'] = 'NOT RAISED'
except ValueError as e:
    r['final_names_string'] = str(e)
except BaseException as e:
    r['final_names_string'] = 'OTHER %s' % (type(e).__name__,)

# A single unknown value is unchanged, and still renders with repr().
try:
    Color('nope')
    r['single'] = 'NOT RAISED'
except ValueError as e:
    r['single'] = str(e)

# --- the functional API on a member-LESS class is untouched -------------------

Made = Enum('Made', 'a b c')
r['functional'] = ','.join(m.name for m in Made)
MadeDict = Enum('MadeDict', {'p': 1, 'q': 2})
r['functional_dict'] = ','.join('%s=%d' % (m.name, m.value) for m in MadeDict)


class Empty(Enum):
    pass


Sub = Empty('Sub', 'x y')
r['functional_subclass'] = ','.join(m.name for m in Sub)

# --- multi-value lookup still works -------------------------------------------


class Cardinal(Enum):
    RIGHT = (1, 0)
    UP = (0, 1)


r['multi_value'] = Cardinal(1, 0) is Cardinal.RIGHT

# --- (2) a user __init__ inherited from an ENUM base ---------------------------

seen = []


class Watching(Enum):
    def __init__(self, *args):
        seen.append('%s:%s' % (self.name, ','.join(m.name for m in self.__class__)))


class Watched(Watching):
    red = 1
    green = 2
    blue = 3


# Each member sees only the members defined BEFORE it -- never itself.
r['init_order'] = ';'.join(seen)

# The classic use: a base that rejects aliases.


class UniqueEnum(Enum):
    def __init__(self, *args):
        if any(self.value == e.value for e in self.__class__):
            raise ValueError('aliases not allowed')


try:
    class Fine(UniqueEnum):
        red = 1
        green = 2
    r['unique_ok'] = ','.join(m.name for m in Fine)
except ValueError as e:
    r['unique_ok'] = 'RAISED %s' % (e,)

# --- an __init__ on the class ITSELF is unchanged ------------------------------


class Planet(Enum):
    MERCURY = (3.303e+23, 2.4397e6)
    VENUS = (4.869e+24, 6.0518e6)

    def __init__(self, mass, radius):
        self.mass = mass
        self.radius = radius


r['own_init'] = '%g/%g' % (Planet.VENUS.mass, Planet.VENUS.radius)

# --- and one that raises still aborts the class definition ---------------------


class Exploding(Enum):
    def __init__(self, *args):
        raise TypeError('no members here')


try:
    class Boom(Exploding):
        a = 1
    r['raising_init'] = 'NOT RAISED'
except TypeError as e:
    r['raising_init'] = 'TypeError: %s' % (e,)

# --- KNOWN GAP, recorded rather than endorsed ----------------------------------
# CPython builds a THROWAWAY member for an alias and initialises that, so
# UniqueEnum above rejects ``grene = 2''.  Grail reuses the canonical member and
# does not initialise it, so the alias is accepted.  Asserted as it behaves so
# that whoever fixes it sees this change rather than the gap going unnoticed.

try:
    class Dupes(UniqueEnum):
        red = 1
        green = 2
        grene = 2
    r['alias_init_gap'] = 'accepted:%s' % (Dupes.grene is Dupes.green,)
except ValueError as e:
    r['alias_init_gap'] = 'ValueError'
