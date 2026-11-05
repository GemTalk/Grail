# GRAIL: stub `gc` module.
#
# GemStone manages its own object memory; Python-level gc control is a
# no-op here.  This exists so `import gc` succeeds (unblocking test_dict,
# test_set, test_tuple, test_functools, test_itertools and many others)
# and so gc.collect()/gc.disable() calls in test setup/teardown do not
# raise.  It enumerates nothing of the GemStone heap; is_tracked answers
# by CPython's documented rule (see there).

garbage = []
callbacks = []

# Flags accepted by set_debug (values mirror CPython for API parity).
DEBUG_STATS = 1
DEBUG_COLLECTABLE = 2
DEBUG_UNCOLLECTABLE = 4
DEBUG_SAVEALL = 32
DEBUG_LEAK = DEBUG_COLLECTABLE | DEBUG_UNCOLLECTABLE | DEBUG_SAVEALL

_enabled = True
_debug = 0


def enable():
    global _enabled
    _enabled = True


def disable():
    global _enabled
    _enabled = False


def isenabled():
    return _enabled


def collect(generation=2):
    # GemStone has no CPython-style cyclic collector to drive, but it does
    # have real weak references (ephemerons).  Code calling gc.collect() is
    # almost always about to check that something is observably gone -- a
    # weakref returning None, a finalizer having run -- so drive the collector
    # Grail actually has: weakref._collect() forces an in-memory collection
    # and drains the ephemeron finalization queue.  As a no-op this left every
    # such check looking like a leak (test_functools
    # test_lru_cache_weakrefable).
    #
    # Imported lazily: weakref imports _weakref, and a module-level import
    # here would put gc in that cycle.
    #
    # Still returns 0.  The return value is a count of unreachable CYCLIC
    # objects, which GemStone does not report, and inventing a number would be
    # worse than admitting we cannot count them.
    try:
        import weakref
    except ImportError:
        return 0
    collect_fn = getattr(weakref, '_collect', None)
    if collect_fn is not None:
        collect_fn()
    return 0


def get_count():
    return (0, 0, 0)


def get_threshold():
    return (700, 10, 10)


def set_threshold(threshold0, *args):
    return None


def set_debug(flags):
    global _debug
    _debug = flags


def get_debug():
    return _debug


def get_objects(generation=None):
    return []


def get_referrers(*objs):
    return []


def get_referents(*objs):
    return []


# GRAIL: CPython's answer is whether its cycle collector tracks the object, and
# its documented rule (Doc/library/gc.rst:189-207) is that instances of atomic
# types are not tracked while containers and user-defined objects are.  Grail
# has no such collector -- GemStone reclaims everything -- so the rule IS the
# answer.  It used to be False for every object, and test_structseq's
# test_replace_gc_tracked asserts a struct_time holding a list is tracked.
# EXACT types: an instance of a user subclass of int has a __dict__ and is
# tracked in CPython.  The empty tuple is a static singleton there, untracked.
# Where CPython untracks a container as an optimisation -- a tuple of atoms
# after a collection, a struct_time C code built -- this still says True.
_ATOMIC_TYPES = (int, bool, float, complex, str, bytes, bytearray, range,
                 type(None), type(Ellipsis), type(NotImplemented))


def is_tracked(obj):
    if type(obj) is tuple and not obj:
        return False
    return type(obj) not in _ATOMIC_TYPES


def freeze():
    return None


def unfreeze():
    return None


def get_stats():
    return []


def get_count_deprecated():
    return (0, 0, 0)
