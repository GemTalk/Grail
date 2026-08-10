# A method compiled into a class can RUN during class construction, not only
# afterwards -- Enum's metaclass hook calls each member's __init__/__new__ while
# it builds the members.
#
# ClassDefAst stored the class's closure cells AFTER the hook (deliberately: the
# self-name cell has to hold the FINAL, decorated class).  So a method that ran
# during construction read a cell that did not exist yet:
#
#     def outer():
#         limit = 255
#         class E(Enum):
#             A = 1
#             def __init__(self, v): self.lim = limit
#
# raised ``free variable 'limit' referenced before assignment in enclosing
# scope''.  The cells are now stored BEFORE the hook as well as after.
#
# Not enum-specific in nature -- any free variable of the enclosing function is
# affected, a plain value as much as a class -- but the enum metaclass is what
# makes a method run early enough to notice.

from enum import Enum

r = {}


# --- read an enclosing local during member construction -----------------------

def _enclosing_value():
    limit = 255

    class E(Enum):
        A = 1

        def __init__(self, v):
            self.lim = limit

    return E.A.lim


r['enclosing_value'] = _enclosing_value()


# --- raise an enclosing CLASS during member construction ----------------------

def _enclosing_class():
    class MyErr(ValueError):
        pass

    try:
        class RgbColor(Enum):
            RED = (255, 0, 0)
            INVALID = (256, 0, 0)

            def __init__(self, red, green, blue):
                if red > 255:
                    raise MyErr('bad')
        return 'no error'
    except MyErr:
        return 'MyErr raised'
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


r['enclosing_class'] = _enclosing_class()


# --- the same through __new__, which also runs during construction ------------

def _enclosing_via_new():
    offset = 100

    class N(int, Enum):
        A = 1

        def __new__(cls, value):
            obj = int.__new__(cls, value + offset)
            obj._value_ = value + offset
            return obj

    return N.A.value


r['enclosing_via_new'] = _enclosing_via_new()


# --- cells still work AFTER construction, the long-standing case --------------

def _after_construction():
    tag = 'first'

    class C:
        def read(self):
            return tag

    got_first = C().read()
    # Captured BY REFERENCE: a later rebinding is visible.
    tag = 'second'
    return '%s/%s' % (got_first, C().read())


r['after_construction'] = _after_construction()


# --- a decorated class: the self-name cell must hold the DECORATED object -----
# This is why the stores are repeated after the decorator loop.

def _decorated():
    def wrap(cls):
        cls.wrapped = True
        return cls

    @wrap
    class D:
        def me(self):
            return D

    inst = D()
    return '%s/%s' % (inst.me() is D, D.wrapped)


r['decorated'] = _decorated()


# --- nonlocal write cells still reach the enclosing scope ---------------------

def _writer():
    count = 0

    class W:
        def bump(self):
            nonlocal count
            count += 1

    W().bump()
    W().bump()
    return count


r['writer'] = _writer()
