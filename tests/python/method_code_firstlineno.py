# Fixture for TracebackTestCase>>testMethodCodeFirstlineno (Phase 2a of the
# traceback design): a def that compiles to a REAL Smalltalk method -- module
# level, class body, @classmethod, @staticmethod -- now carries __code__ too,
# not just a nested-def closure.  Line numbers below are load-bearing -- do not
# reflow.  The `def` lines are 8, 13, 16, 19, 23 and 27.


def module_level(a, b):
    return a + b


class Sample:
    def meth(self, x):
        return x

    def meth3(self, a, b=1, c=2):
        return a

    def varargs(self, *args, **kw):
        return args

    @classmethod
    def cm(cls, y):
        return y

    @staticmethod
    def sm(z):
        return z

    # Class-body references to sibling defs.  This is the shape that blocked
    # test.test_traceback at import: it mints a RECEIVER-LESS handle, so the
    # defining class has to be recorded separately for __code__ to find the def.
    sibling_meth_line = meth.__code__.co_firstlineno
    sibling_meth3_line = meth3.__code__.co_firstlineno
    sibling_varargs_line = varargs.__code__.co_firstlineno
    sibling_sm_line = sm.__code__.co_firstlineno


class Derived(Sample):
    """Inherits meth without redefining it."""


def _builtin_has_no_code():
    # CPython raises AttributeError for a method_descriptor's __code__, so a
    # handle on a kernel/builtin method must keep doing the same.
    try:
        'abc'.upper.__code__
        return False
    except AttributeError:
        return True


RESULTS = {
    # module-level def
    'module_level_line': module_level.__code__.co_firstlineno,        # 8
    # class-body sibling references, evaluated while the class was built
    'sibling_meth_line': Sample.sibling_meth_line,                    # 13
    'sibling_meth3_line': Sample.sibling_meth3_line,                  # 16
    'sibling_varargs_line': Sample.sibling_varargs_line,              # 19
    'sibling_sm_line': Sample.sibling_sm_line,                        # 27
    # read off the class, and off an instance
    'class_meth_line': Sample.meth.__code__.co_firstlineno,           # 13
    'inst_meth_line': Sample().meth.__code__.co_firstlineno,          # 13
    # @classmethod / @staticmethod compile class-side
    'cm_line': Sample.cm.__code__.co_firstlineno,                     # 23
    'sm_line': Sample.sm.__code__.co_firstlineno,                     # 27
    # an inherited method reports where it was DEFINED (superclass walk)
    'inherited_line': Derived.meth.__code__.co_firstlineno,           # 13
    # metadata shape
    'co_name': Sample().meth.__code__.co_name,                        # 'meth'
    'co_qualname': Sample.meth.__code__.co_qualname,                  # 'Sample.meth'
    'line_is_int': isinstance(Sample.meth.__code__.co_firstlineno, int),
    'builtin_has_no_code': _builtin_has_no_code(),
}
