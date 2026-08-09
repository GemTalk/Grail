# Fixture for TracebackTestCase>>testMethodCodeFirstlineno -- the Phase 2a
# follow-up: a def that compiles to a real Smalltalk METHOD (a class-body def
# or a module top-level def) now carries func.__code__ too, not just a nested
# def's ExecBlock.  Line numbers below are load-bearing -- do not reflow.
#
# The def of `module_level` is on line 10; `Later.m` on line 27;
# `Base.inherited` on line 38.


def module_level(a, b=1, *, k=2):
    return a


# The shape that blocked test.test_traceback at import: a CLASS BODY reading a
# sibling def's __code__ while the body is still executing.  This is why the
# code table is emitted before the class-attribute statements.
class ClassBodyReader:
    def get_exception(self):
        return None

    callable_line = get_exception.__code__.co_firstlineno + 2   # 18 + 2


class Later:
    X = 1

    def m(self, a, b=2, *, k=3):
        return a

    LINE = m.__code__.co_firstlineno        # 25
    NAME = m.__code__.co_name               # 'm'
    QUAL = m.__code__.co_qualname           # 'Later.m'
    ARGC = m.__code__.co_argcount           # self, a, b -> 3
    KWONLY = m.__code__.co_kwonlyargcount   # k -> 1


class Base:
    def inherited(self):
        return None


class Derived(Base):
    pass


RESULTS = {
    # module top-level def, reached as a plain name
    'mod_firstlineno': module_level.__code__.co_firstlineno,      # 10
    'mod_name': module_level.__code__.co_name,                    # 'module_level'
    'mod_argcount': module_level.__code__.co_argcount,            # a, b -> 2
    'mod_kwonlyargcount': module_level.__code__.co_kwonlyargcount,  # k -> 1

    # class-body read of a sibling def (the test_traceback blocker shape)
    'classbody_callable_line': ClassBodyReader.callable_line,     # 18 + 2 = 20
    'classbody_line': Later.LINE,
    'classbody_name': Later.NAME,
    'classbody_qualname': Later.QUAL,
    'classbody_argcount': Later.ARGC,
    'classbody_kwonlyargcount': Later.KWONLY,

    # bound (instance.m) and unbound (Cls.m) access agree
    'bound_firstlineno': Later().m.__code__.co_firstlineno,       # 27
    'unbound_firstlineno': Later.m.__code__.co_firstlineno,       # 27

    # an inherited method reports the code object from where it was DEFINED
    'inherited_firstlineno': Derived().inherited.__code__.co_firstlineno,  # 38
    'inherited_qualname': Derived().inherited.__code__.co_qualname,        # 'Base.inherited'

    # __code__ must be absent (AttributeError), not a value, on a non-function:
    # hasattr(x, '__code__') is the standard is-this-a-function probe.
    'int_has_code': hasattr(42, '__code__'),
    'builtin_method_has_code': hasattr('s'.upper, '__code__'),
    'function_has_code': hasattr(module_level, '__code__'),
}
