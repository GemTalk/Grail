"""Fixtures for ExecClassMethodScopeTestCase -- a class defined inside exec(),
whose methods read names from the exec'd source.

Those methods compile at RUNTIME, through ___compileMethod:category:, against the
user profile's symbol list -- which the doit's SymbolDictionary is not on.  So a
method could not see a name from the very source it was written in, and failed
to COMPILE:

    exec('''x = 12
    class C:
        def get(self): return x
    got = C().get()''')

The classdef survived only because Grail installs a raising stub for a method it
cannot compile, which is why this surfaced as a NameError about a codegen gap
rather than as a missing name.

Every expectation was checked against CPython 3.14.
"""


def _exec_get(src, keys):
    ns = {}
    exec(src, ns)
    return tuple(ns[k] for k in keys)


SRC_VARIABLE = """if 1:
    x = 12
    class C:
        def get(self):
            return x
    got = C().get()
"""

SRC_FUNCTION = """if 1:
    def helper(n):
        return n * 3
    class C:
        def get(self):
            return helper(4)
    got = C().get()
"""

SRC_SIBLING_CLASS = """if 1:
    class Other:
        VALUE = 7
    class C:
        def get(self):
            return Other.VALUE
    got = C().get()
"""

SRC_REBOUND = """if 1:
    x = 1
    class C:
        def get(self):
            return x
    c = C()
    first = c.get()
    x = 2
    second = c.get()
"""

SRC_MISSING = """if 1:
    class C:
        def get(self):
            return never_defined_anywhere
    try:
        C().get()
        got = 'NO ERROR'
    except NameError:
        got = 'NameError'
"""

SRC_CLASS_ATTR_STILL_WORKS = """if 1:
    x = 5
    class C:
        attr = x + 1
        def get(self):
            return self.attr
    got = C().get()
"""


def method_reads_an_exec_level_variable():
    """THE BUG, at its smallest."""
    return _exec_get(SRC_VARIABLE, ['got'])


def method_calls_an_exec_level_function():
    """A function bound by the same source is the same kind of name."""
    return _exec_get(SRC_FUNCTION, ['got'])


def method_reads_a_sibling_class():
    """...as is a class defined beside it."""
    return _exec_get(SRC_SIBLING_CLASS, ['got'])


def the_read_is_live_not_captured():
    """The method reads the SLOT, so rebinding the exec-level name afterwards
    changes what a later call sees -- a value captured at compile time would
    answer 1 twice."""
    return _exec_get(SRC_REBOUND, ['first', 'second'])


def a_missing_name_still_raises_name_error():
    """Putting the scope on the symbol list must not turn an unbound name into
    a compile failure or a silent nil: it is still a Python NameError, raised
    when the method runs."""
    return _exec_get(SRC_MISSING, ['got'])


def a_class_body_value_reading_the_scope_still_works():
    """The class BODY could always read exec-level names -- it is emitted
    inline, not compiled as a method.  Pins that the change did not disturb
    it."""
    return _exec_get(SRC_CLASS_ATTR_STILL_WORKS, ['got'])
