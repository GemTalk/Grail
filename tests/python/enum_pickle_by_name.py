# ``enum.pickle_by_enum_name`` and ``enum.pickle_by_global_name`` -- CPython's
# two public replacement reductions, for a member whose ordinary value-based one
# cannot work.
#
#     NEI.__reduce_ex__ = enum.pickle_by_enum_name
#
# The default reduction is ``(cls, (value,))``, which rebuilds the VALUE.  When
# the member type's __new__ demands more than the value -- ``class
# NEI(NamedInt, Enum)`` where NamedInt wants a name too -- that call raises, and
# going by NAME sidesteps the member type's constructor entirely.
#
# Neither name existed in Grail.
#
# test_enum TestSpecial.test_subclasses_without_direct_pickle_support.

import enum
import pickle

r = {}

r['has_by_enum_name'] = repr(hasattr(enum, 'pickle_by_enum_name'))
r['has_by_global_name'] = repr(hasattr(enum, 'pickle_by_global_name'))
r['both_declared'] = repr(
    all(n in enum.__all__ for n in ('pickle_by_enum_name', 'pickle_by_global_name')))


class Colour(enum.Enum):
    RED = 1
    GREEN = 2


# The reduction itself: (getattr, (cls, name)).  ``getattr`` has to be the
# BUILTIN -- the object Python code sees, which pickle names as
# builtins.getattr.  Reading it from the builtins CLASS instead of the module
# INSTANCE yields an UnboundMethod, which pickle cannot name at all.
_func, _args = enum.pickle_by_enum_name(Colour.GREEN, 2)
r['reduction_func'] = _func.__name__
r['reduction_args'] = '%s,%s' % (_args[0].__name__, _args[1])
r['func_is_builtin_getattr'] = repr(_func is getattr)

# --- the case it exists for -------------------------------------------------------
# A member type whose __new__ needs more than the value.  Built inside a
# function because this MUTATES the class (__reduce_ex__), and a module-level
# class is canonical -- the registry hands the same object back on reload, so
# the assignment would leak into the next test.


def _make():
    class NamedInt(int):
        def __new__(cls, *args):
            name, *rest = args
            if len(rest) == 0:
                raise TypeError("name and value must be specified")
            self = int.__new__(cls, *rest)
            self._intname = name
            return self

    class NEI(NamedInt, enum.Enum):
        x = ('the-x', 1)
        y = ('the-y', 2)

    return NamedInt, NEI


# BOTH are bound at module level, as test_enum binds both into globals(): the
# member's VALUE is a NamedInt, so pickle has to be able to name that class too.
# Without it the failure below is an unreachable-class PicklingError rather than
# the constructor TypeError this is about.
NamedInt, NEI = _make()

# Without the replacement, the default reduction cannot rebuild the value.
try:
    pickle.loads(pickle.dumps(NEI.y))
    r['default_reduction'] = 'NO ERROR'
except TypeError as e:
    r['default_reduction'] = 'TypeError: %s' % e
except Exception as e:
    r['default_reduction'] = type(e).__name__

# With it, the member travels by name and comes back as the same object.
NEI.__reduce_ex__ = enum.pickle_by_enum_name
r['by_name_member'] = repr(pickle.loads(pickle.dumps(NEI.y)) is NEI.y)

# --- a raising __module__ no longer looks like a local-variable bug ---------------
# pickle reads obj.__module__ with a defaulted getattr, which is not enough
# under Grail: some objects RAISE from that read instead of answering the
# default.  The exception left ``modname`` unbound, so the failure surfaced as
# ``UnboundLocalError: cannot access local variable 'modname'``, naming nothing
# to do with pickling.  It is now treated as "no __module__", which is what the
# whichmodule fallback is for.
#
# A property INSTANCE is the subject, and it raises in CPython too -- the value
# lives on the type, not the instance.  enum.property (the CLASS) used to be the
# subject and no longer raises: it now reports 'enum', as upstream does.

def _g(self):
    return 1


r['instance_module_raises'] = 'no'
try:
    property(_g).__module__
except AttributeError:
    r['instance_module_raises'] = 'yes'

# --- and a class carries the identity pickle saves it by --------------------------
# __module__ is how a class is pickled BY REFERENCE.  Without it pickle falls
# back to whichmodule(), which SCANS sys.modules for a module exposing the
# object under its __qualname__ -- an order-dependent test by construction.
# enum.property's __qualname__ was 'DynamicClassAttribute' and ``types`` exposes
# it under exactly that name, so this answered PicklingError in a fresh session
# and 'ok' once anything had imported types.  That is why this fixture's test
# passed ALONE and failed in a whole-suite run.

r['enum_property_module'] = repr(getattr(enum.property, '__module__', None))

try:
    pickle.dumps(enum.property)
    r['pickling_it'] = 'ok'
except Exception as e:
    r['pickling_it'] = type(e).__name__

# The same, with types imported first: the answer must not depend on it.
import types as _types  # noqa: F401
try:
    pickle.dumps(enum.property)
    r['pickling_it_after_types'] = 'ok'
except Exception as e:
    r['pickling_it_after_types'] = type(e).__name__
