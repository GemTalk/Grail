# What the ``enum`` module says its API is.
#
# Three separate faults met here, all of them visible through the one question
# "what does enum export?":
#
#   1. ``type(Color).__module__`` raised a raw Smalltalk MessageNotUnderstood.
#      A metaclass is a Behavior, but its own metaclass chain runs to Metaclass3
#      rather than to ``object class``, so the builtin-type probe the class-side
#      __module__ read performs was not inherited -- and the resulting error was
#      not even catchable from Python.
#   2. enum's own classes reported no __module__ at all, where CPython says
#      'enum'.
#   3. ``enum.__all__`` did not exist, so ``from enum import *`` imported
#      NOTHING, and ``dir(enum)`` reported the Smalltalk setup method
#      ``initialize`` as public while hiding ``verify`` behind Grail's varargs
#      spelling ``_verify``.
#
# test_enum MiscTestCase.test__all__.

import enum
from enum import Enum, Flag

r = {}


class Colour(Enum):
    RED = 1
    GREEN = 2


# --- 1. the metaclass read no longer explodes ------------------------------------
# ``enum.EnumType`` is Grail's ``Enum class``, a Smalltalk metaclass.  Reading
# its __module__ is ordinary introspection -- repr helpers, pickle and inspect
# all do it -- and it used to raise a MessageNotUnderstood that ``except
# Exception`` could not even catch: the whole script died.  Verified by
# reverting the fix, not by assuming.

try:
    r['metaclass_module'] = repr(enum.EnumType.__module__)
except Exception as e:
    r['metaclass_module'] = 'RAISED %s' % type(e).__name__

# --- 2. enum's own types belong to enum -------------------------------------------

r['Enum_module'] = enum.Enum.__module__
r['Flag_module'] = enum.Flag.__module__
r['EnumType_module'] = enum.EnumType.__module__
r['EnumDict_module'] = enum.EnumDict.__module__

# A USER enum keeps its own module -- it is not defined in enum.
r['user_enum_module'] = repr(Colour.__module__)

# --- 3. __all__ and dir() ----------------------------------------------------------

r['has_all'] = repr(hasattr(enum, '__all__'))
r['all_has_Enum'] = repr('Enum' in enum.__all__)
r['all_has_verify'] = repr('verify' in enum.__all__)

# ``show_flag_values`` is defined but deliberately NOT exported, exactly as
# upstream -- test_enum's own check names it as not_exported.
r['show_flag_values_defined'] = repr(hasattr(enum, 'show_flag_values'))
r['show_flag_values_exported'] = repr('show_flag_values' in enum.__all__)

names = dir(enum)
# ``verify`` is a module-level ``def verify(*args, **kwargs)``, which Grail
# compiles to the varargs selector ``_verify:kw:``.  That one prefix underscore
# is an encoding, not part of the Python name, and reporting it verbatim made a
# public function look private to every dir()-walking consumer.
r['dir_has_verify'] = repr('verify' in names)
r['dir_has_underscore_verify'] = repr('_verify' in names)
r['verify_callable'] = repr(callable(enum.verify))

# ``initialize`` is Grail's Smalltalk setup hook for a module written in
# Smalltalk.  It is not a Python attribute and CPython's enum has no such name.
r['dir_has_initialize'] = repr('initialize' in names)

# Nothing public in dir() is missing from __all__, which is the property
# test.support.check__all__ checks.
public = [n for n in names if not n.startswith('_') and n != 'show_flag_values']
r['dir_matches_all'] = repr(sorted(public) == sorted(enum.__all__))

# --- KNOWN GAPS, recorded rather than endorsed ------------------------------------
# ``from enum import *`` does NOT consult __all__.  Grail's star-import walks the
# module's own dict entries and dynamic instVars, so it already imported most of
# these before __all__ existed -- and it still misses the three names that are
# METHODS rather than stored entries.  Declaring __all__ does not change that;
# teaching the star-import to read it is a change in the import machinery.
# Pinned here so the declaration above is not mistaken for a fix to this.

from enum import *          # noqa: F403  (deliberate: this is what is measured)

# Membership AFTER the import, not a before/after delta.  A delta is wrong here:
# this fixture is re-executed into the same module namespace on every reload, so
# the second run sees the first run's bindings already present and every delta
# comes out empty.  Asking what is bound now is stable either way, because none
# of these names is imported anywhere else in this file.
_bound = set(globals())

# ``IntEnum`` is a fair witness that the star-import does bring something.
r['star_import_brings_IntEnum'] = repr('IntEnum' in _bound)

# ``unique`` is declared in __all__ and still does not arrive, because it is a
# METHOD on the module rather than a stored dict entry.
#
# Only ``unique`` is named, deliberately.  WHICH names are missed is session
# state, not a property of the module: a name becomes a stored entry the first
# time something puts it there, so ``global_enum`` is missed in a fresh session
# and present once an earlier test in the same worker has used it.  Pinning the
# whole list made this fixture pass alone and fail in the suite.
r['star_import_misses_unique_a_known_gap'] = repr('unique' not in _bound)
r['unique_is_declared'] = repr('unique' in enum.__all__)

# ``enum.property`` is a class of its own in CPython, defined in enum, so
# upstream it reports __module__ == 'enum'.  It does here too now.
#
# It used to report nothing at all -- a plain read raised AttributeError -- on
# the reasoning that the same PropertyDescriptor backed the builtin
# ``property``, so claiming 'enum' would relabel the builtin.  That reasoning
# stopped applying once enum.property became its own class, and the gap was not
# cosmetic: __module__ is how pickle saves a class BY REFERENCE, and without it
# pickle falls back to SCANNING sys.modules for a module exposing the object
# under its __qualname__.  ``types`` exposes this one (as
# DynamicClassAttribute), so pickling enum.property depended on whether an
# earlier test had imported types -- see tests/python/enum_pickle_by_name.py.
r['enum_property_module'] = repr(
    getattr(enum.property, '__module__', '<no __module__>'))

# FlagBoundary and EnumCheck are real StrEnums, as upstream.  They used to be
# absent entirely -- Grail modelled only their MEMBERS, as opaque symbols, and
# never built the enclosing enum -- so the classes could not be looked at and a
# "member" had no name, value or repr.
r['boundary_class_present'] = repr(hasattr(enum, 'FlagBoundary'))
r['check_class_present'] = repr(hasattr(enum, 'EnumCheck'))
r['boundary_members_resolve'] = repr(
    all(hasattr(enum, n) for n in ('STRICT', 'CONFORM', 'EJECT', 'KEEP')))
r['boundary_members_are_members'] = repr(
    [enum.STRICT.name, enum.STRICT.value, enum.STRICT == 'strict'])
r['boundary_member_order'] = repr([m.name for m in enum.FlagBoundary])
r['check_member_order'] = repr([m.name for m in enum.EnumCheck])
r['members_are_the_classes_own'] = repr(
    enum.STRICT is enum.FlagBoundary.STRICT and enum.UNIQUE is enum.EnumCheck.UNIQUE)
