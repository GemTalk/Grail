# GRAIL: stub `gc` module.
#
# GemStone manages its own object memory; Python-level gc control is a
# no-op here.  This exists so `import gc` succeeds (unblocking test_dict,
# test_set, test_tuple, test_functools, test_itertools and many others)
# and so gc.collect()/gc.disable() calls in test setup/teardown do not
# raise.  It intentionally reports "nothing tracked" rather than trying
# to enumerate the GemStone heap.

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


def is_tracked(obj):
    return False


def freeze():
    return None


def unfreeze():
    return None


def get_stats():
    return []


def get_count_deprecated():
    return (0, 0, 0)
