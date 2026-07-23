# GRAIL stub for CPython's test-only `_testlimitedcapi` C extension.
#
# CPython builds `_testlimitedcapi` (Modules/_testlimitedcapi/) as part of its
# test suite to exercise the Limited API.  Grail has no such extension, so
# test.test_bytes -- whose ByteArrayTest class body does
# `_testlimitedcapi = import_helper.import_module('_testlimitedcapi')` -- would
# otherwise SkipTest the ENTIRE module at import time.
#
# Only test_bytes references it (verified: grep across the vendored suite), and
# only these three thin wrappers over the abstract sequence protocol
# (PySequence_GetItem / SetItem / DelItem).  Pure-Python equivalents suffice.

__all__ = ['sequence_getitem', 'sequence_setitem', 'sequence_delitem']


def sequence_getitem(obj, i):
    "PySequence_GetItem(obj, i)"
    return obj[i]


def sequence_setitem(obj, i, value):
    "PySequence_SetItem(obj, i, value)"
    obj[i] = value


def sequence_delitem(obj, i):
    "PySequence_DelItem(obj, i)"
    del obj[i]
