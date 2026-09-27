# GRAIL _struct: the name CPython's C accelerator module goes by.
#
# CPython's struct.py is ``from _struct import *'' over a C module.  Grail's
# struct is the NATIVE one (src/smalltalk/Python/struct.gs), so the direction is
# reversed: this file re-exports it under the private name.  Nothing in Grail
# imports _struct itself; it exists because code written against CPython does --
# test.test_struct's test__struct_reference_cycle_cleaned_up imports a FRESH
# _struct through import_helper.import_fresh_module, calls calcsize on it, and
# checks the module is collected once dropped.  Without this file that import
# answered None and the test failed on ``None.calcsize''.
#
# A plain Python module, deliberately: import_fresh_module needs an instance it
# can create anew and let go of, which a module holding only references into
# struct gives it.

from struct import (Struct, _clearcache, calcsize, error, iter_unpack, pack,
                    pack_into, unpack, unpack_from)

__all__ = ['Struct', 'calcsize', 'error', 'iter_unpack', 'pack', 'pack_into',
           'unpack', 'unpack_from']
