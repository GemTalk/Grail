# Fixture for ImportTypeIntrospectionTestCase.  Exercises the
# language/import fixes that unblock importing real packages like NumPy:
#   - isinstance(x, type) / issubclass(c, type)  (type as a class)
#   - cls.__base__ / cls.__bases__               (class introspection)
#   - single-element tuple unpack `x, = seq`
#   - `from MODULE import missing` raises a catchable ImportError


class Base:
    pass


class Sub(Base):
    pass


def afunc():
    return 1


# isinstance(x, type): True for classes, False for non-classes.
sub_is_type = isinstance(Sub, type)
func_is_type = isinstance(afunc, type)
int_inst_is_type = isinstance(5, type)
inst_is_type = isinstance(Sub(), type)

# issubclass with normal bases and with `type`.
sub_of_base = issubclass(Sub, Base)
sub_of_type = issubclass(Sub, type)

# __base__ / __bases__.
sub_base_name = Sub.__base__.__name__
sub_bases_len = len(Sub.__bases__)

# single-element tuple unpack (numpy's `arr, = conv.as_arrays(...)`).
only, = [99]
unpacked = only

# from MODULE import <missing> must raise ImportError (numpy's optional
# `try: from . import _distributor_init_local except ImportError` hook).
import_miss_caught = False
try:
    from os import _grail_nonexistent_attr_xyz  # noqa: F401
except ImportError:
    import_miss_caught = True


# os.PathLike: isinstance is true only for objects defining __fspath__
# (numpy does isinstance(filename, os.PathLike)).  str/bytes/ints are not.
import os


class _HasFspath:
    def __fspath__(self):
        return "/tmp/x"


pathlike_obj = isinstance(_HasFspath(), os.PathLike)
pathlike_str = isinstance("a string", os.PathLike)
pathlike_int = isinstance(5, os.PathLike)


# sys.flags is a real object with attribute access (numpy reads it).
import sys

flags_optimize = sys.flags.optimize
flags_debug = sys.flags.debug
flags_has_optimize = hasattr(sys.flags, "optimize")
