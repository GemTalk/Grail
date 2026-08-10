# Two defects, one root: a class body that binds the same name twice.
#
# Grail materializes each class attribute as a classInstVar plus an accessor
# pair, and built the declaration list with ONE ENTRY PER ASSIGNMENT TARGET.
# So a body that rebinds a name declared the slot twice, and GemStone rejected
# the duplicate (rtErrAddDupInstvar).  Class.gs's retry then reported the
# catch-all ``Grail cannot subclass sealed kernel class 'PythonInstance''' --
# the class failed to build AT ALL, for ordinary Python:
#
#     class C:
#         x = 1
#         x = x + 1
#
# Separately, CPython's _EnumDict.__setitem__ makes rebinding an ENUM class
# body's name an error, however the two bindings are spelled.  Grail's stores
# just overwrite, so by the time the metaclass hook runs a single value is left
# and nothing records there were two; codegen now reports the repeats.
#
# The two interact: until the declaration bug was fixed, the assignment/
# assignment case never even reached the enum check.

from enum import Enum
import enum

r = {}

# --- ordinary Python: rebinding is legal and must build ------------------------

class Plain:
    x = 1
    x = x + 1
    y = 'a'
    y = y + 'b'


r['plain_x'] = Plain.x
r['plain_y'] = Plain.y


class Rebound:
    vals = [1, 2]
    vals = vals + [3]
    n = len(vals)


r['rebound'] = '%r/%d' % (Rebound.vals, Rebound.n)

# A rebinding subclass still gets its own per-class value.


class Base:
    tag = 'base'


class Sub(Base):
    tag = 'sub'
    tag = tag.upper()


r['per_class'] = '%s/%s' % (Base.tag, Sub.tag)

# --- enum: every spelling of a duplicate is a TypeError ------------------------


def _err(fn):
    try:
        fn()
        return 'no error'
    except TypeError as e:
        return str(e)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _assign_assign():
    class Color(Enum):
        red = 1
        green = 2
        blue = 3
        red = 4


def _assign_def():
    class Color(Enum):
        red = 1
        green = 2
        blue = 3

        def red(self):
            return 'red'


def _property_assign():
    class Color(Enum):
        @enum.property
        def red(self):
            return 'redder'
        red = 1
        green = 2
        blue = 3


r['dup_assign_assign'] = _err(_assign_assign)
r['dup_assign_def'] = _err(_assign_def)
r['dup_property_assign'] = _err(_property_assign)

# --- and an ordinary enum is untouched ----------------------------------------


class Ok(Enum):
    a = 1
    b = 2
    c = 3


r['ordinary'] = ','.join('%s=%d' % (m.name, m.value) for m in Ok)

# An ALIAS is not a duplicate: two names, one value.


class Aliased(Enum):
    a = 1
    b = 2
    dupe = 1


r['alias'] = '%s/%s' % (','.join(m.name for m in Aliased), Aliased.dupe.name)
