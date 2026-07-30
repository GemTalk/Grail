# Fixture for IteratorTestCase>>testIterHonorsIterNoneSentinel.
#
# CPython data model: setting `__iter__ = None` on a class marks it
# explicitly NON-iterable, so `iter(x)` raises TypeError even when the
# class defines `__getitem__` (the legacy sequence protocol is NOT tried).
#
# Regression for the test_iter CRASH: without builtins>>iter:'s
# `__iter__ = None` sentinel check, Grail fell through to the EAGER
# `__getitem__(0..n)` sequence protocol and materialised an UNBOUNDED
# `__getitem__` into an uncatchable VM OutOfMemory (topaz died mid-suite,
# scored CRASH).  This is test_iter.py's NoIterClass, minimised.
#
# Loaded as a module (not eval:) because a class with __getitem__/__iter__
# cannot be instantiated in eval: scope (#new DNU).


class NoIterButGetItem:
    # __getitem__ returns a value for EVERY index and never raises
    # IndexError -- the old-style sequence protocol would iterate forever.
    def __getitem__(self, i):
        return i
    __iter__ = None


class BoundedGetItem:
    # Only a BOUNDED __getitem__, no __iter__ at all: still iterable via
    # the legacy sequence protocol.  The fix must NOT break this.
    def __getitem__(self, i):
        if i < 3:
            return i
        raise IndexError


def _iter_none_raises_typeerror():
    try:
        iter(NoIterButGetItem())   # pre-fix: OOMs the session; post-fix: TypeError
        return False
    except TypeError:
        return True
    except Exception:
        return False


def _bounded_getitem_still_iterates():
    return list(BoundedGetItem()) == [0, 1, 2]


RESULTS = {
    'iter_none_raises_typeerror': _iter_none_raises_typeerror(),
    'bounded_getitem_still_iterates': _bounded_getitem_still_iterates(),
}
