# PEP 487's ``__init_subclass__``: a class is told when someone subclasses it,
# which is how a base registers, validates or configures its subclasses without
# anyone having to write a metaclass.
#
#     class Base:
#         def __init_subclass__(cls, **kwds):
#             super().__init_subclass__(**kwds)
#             registry.append(cls)
#
# Grail never called it.  The hook now fires from the class statement at
# CPython's moment -- inside type.__new__, so after the metaclass hook and
# before the decorators.
#
# The subtlety the protocol turns on is WHERE the lookup starts: CPython calls
# ``super(cls, cls).__init_subclass__(**kwds)``, so a class's own definition
# never runs for itself, only for its subclasses.  Starting at the class
# instead would also recurse forever, since the first act of an ordinary
# implementation is to delegate upwards.
#
# test_enum OldTestFlag.test_init_subclass.

from enum import Flag

r = {}

# --- who gets told, and by whom -------------------------------------------------

seen = []


class Base:
    def __init_subclass__(cls, **kwds):
        super().__init_subclass__(**kwds)
        seen.append('Base saw ' + cls.__name__)
        cls._test1 = 'Base'


class Mid(Base):
    def __init_subclass__(cls, **kwds):
        super(Mid, cls).__init_subclass__(**kwds)
        seen.append('Mid saw ' + cls.__name__)
        cls._test2 = 'Mid'


class Quiet(Mid):
    # Breaks the chain deliberately: no super() call, so nothing above runs.
    def __init_subclass__(cls, **kwds):
        pass


class Leaf(Quiet):
    pass


r['seen'] = ';'.join(seen)

# Base's hook ran for Mid, not for Base itself.
r['base_own'] = Base.__dict__.get('_test1', 'ABSENT')
r['mid_test1'] = Mid.__dict__['_test1']

# Quiet got both, because Mid cooperates.
r['quiet_test1'] = Quiet.__dict__['_test1']
r['quiet_test2'] = Quiet.__dict__['_test2']

# Leaf got neither, because Quiet does not.
r['leaf_test1'] = Leaf.__dict__.get('_test1', 'ABSENT')
r['leaf_test2'] = Leaf.__dict__.get('_test2', 'ABSENT')

# --- both spellings ---------------------------------------------------------------
# CPython makes __init_subclass__ an implicit classmethod, so the explicit
# decorator is redundant -- but it is legal, and written often enough that the
# lookup has to find it.  The two spellings land in different places in Grail: a
# plain def compiles instance-side, a decorated one class-side.


class Decorated:
    @classmethod
    def __init_subclass__(cls, **kwds):
        super().__init_subclass__(**kwds)
        cls.decorated = 'yes'


class DecoratedSub(Decorated):
    pass


r['explicit_classmethod'] = DecoratedSub.__dict__['decorated']
r['explicit_own'] = Decorated.__dict__.get('decorated', 'ABSENT')

# --- class keywords travel with it ----------------------------------------------
# This is what the protocol is mostly used FOR: the class header carries
# configuration and the base consumes it.

built = []


class Plugin:
    def __init_subclass__(cls, name=None, **kwds):
        super().__init_subclass__(**kwds)
        cls.plugin_name = name
        built.append(name)


class Alpha(Plugin, name='alpha'):
    pass


class Beta(Plugin, name='beta'):
    pass


r['plugin_names'] = repr(built)
r['alpha_name'] = Alpha.plugin_name
r['beta_name'] = Beta.plugin_name

# A keyword nobody in the chain accepted is an error, not a silent drop --
# object.__init_subclass__ is where the complaint comes from.
try:
    class Typo(Plugin, nmae='alpha'):
        pass
    r['unconsumed'] = 'NOT RAISED'
except TypeError as e:
    r['unconsumed'] = str(e)


class NoHook:
    pass


try:
    class NoHookSub(NoHook, tag=1):
        pass
    r['unconsumed_no_hook'] = 'NOT RAISED'
except TypeError as e:
    r['unconsumed_no_hook'] = str(e)

# ``metaclass=`` is consumed by the class machinery and is NOT forwarded, so it
# does not trip the complaint above.


class Meta(type):
    pass


class WithMeta(Plugin, metaclass=Meta, name='meta'):
    pass


r['with_meta'] = WithMeta.plugin_name

# --- the enum case: test_enum's shape -------------------------------------------
# An enum class is built by a metaclass hook, which must not be able to swallow
# the protocol -- CPython puts the call in type.__new__ precisely so every
# metaclass reaches it through super().__new__.


class MyFlag(Flag):
    def __init_subclass__(cls, **kwds):
        super().__init_subclass__(**kwds)
        cls._tag = 'MyFlag'


class TheirFlag(MyFlag):
    pass


class Colours(TheirFlag):
    RED = 1
    GREEN = 2


r['their_tag'] = TheirFlag.__dict__['_tag']
r['colours_tag'] = Colours.__dict__['_tag']
# The members still built: the hook runs alongside the metaclass, not instead.
r['colours_members'] = repr([m.name for m in Colours])

# ``boundary=`` is the other withheld keyword: EnumType.__new__ declares it as a
# parameter, so it never reaches __init_subclass__ and never trips the
# leftover-keyword complaint.
from enum import CONFORM


class Bounded(MyFlag, boundary=CONFORM):
    A = 1
    B = 2


r['bounded_tag'] = Bounded.__dict__['_tag']
# Identity, not str(): Grail models the FlagBoundary constants as opaque
# symbols, so their spelling is its own business -- what matters here is that
# the keyword still reached the enum machinery instead of being forwarded.
r['bounded_boundary_kept'] = repr(Bounded._boundary_ is CONFORM)

# --- ordering: the hook sees a fully-populated class ----------------------------
# CPython fires it after the namespace is installed, so the subclass's own
# attributes and methods are already there.

order = []


class Watcher:
    def __init_subclass__(cls, **kwds):
        super().__init_subclass__(**kwds)
        order.append('hook sees flavour=%r' % cls.__dict__.get('flavour', 'ABSENT'))
        order.append('hook sees method=%s' % hasattr(cls, 'shout'))


def mark(cls):
    order.append('decorator')
    return cls


@mark
class Watched(Watcher):
    flavour = 'vanilla'

    def shout(self):
        return 'hi'


r['order'] = ';'.join(order)
