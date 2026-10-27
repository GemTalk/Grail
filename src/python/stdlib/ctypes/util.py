"""ctypes.util for Grail.

find_library answers None -- what CPython answers for a library it cannot
find -- because Grail's ctypes cannot load one anyway (see ctypes/__init__.py).
Callers already handle None: it is the ordinary answer on a system without
the library.
"""


def find_library(name):
    return None
