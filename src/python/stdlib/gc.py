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
    # No cyclic collector to drive; report zero unreachable objects.
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
