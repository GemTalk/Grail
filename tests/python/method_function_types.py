"""``types.MethodType`` and ``types.FunctionType`` as isinstance targets.

CPython's line between the two is implementation language.  A METHOD object
is Python-level and carries ``__func__``; a BUILTIN bound to something
carries ``__self__`` but no ``__func__``; a plain function carries neither.
Four reads that look alike come out classified differently:

    A.__init_subclass__     builtin   (inherited from object -- C code)
    B.__init_subclass__     method    (class-defined -- PEP 487 makes the
                                       hook an implicit classmethod, so the
                                       read binds to the class)
    b.m                     method    (instance-bound)
    B.m                     function  (a method read through its CLASS is
                                       just a function in Python 3)

This is not taxonomy for its own sake.  PEP 702's ``@deprecated`` branches on
``isinstance(hook, MethodType)`` to decide whether a class's existing
``__init_subclass__`` is a Python-level hook -- unwrap ``__func__``,
reinstall as a classmethod -- or object's builtin, wrapped as a plain
function taking no arguments.  Each branch only works when the answer
matches CPython's: the wrong branch forwards a class to a hook that takes
none, or nothing to a hook that needs the class.

``LambdaType`` IS ``FunctionType`` -- the same object under two names, a
lambda being nothing but an anonymous function.

Every expectation below was checked against CPython 3.14.
"""

import functools
import types
import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


class Plain:
    pass


class Hooked:
    def __init_subclass__(cls, **kw):
        pass

    @classmethod
    def cm(cls):
        pass

    def m(self):
        pass


hooked = Hooked()


def module_fn():
    pass


def _outer():
    def inner():
        pass
    return inner


nested_fn = _outer()


def _mt(x):
    return isinstance(x, types.MethodType)


def _ft(x):
    return isinstance(x, types.FunctionType)


# ------------------------------------------------- MethodType

# The four __init_subclass__/method reads, CPython's way round.
check('objects_builtin_is_not_a_method',
      lambda: _mt(Plain.__init_subclass__), False)
check('a_defined_hook_is_a_method',
      lambda: _mt(Hooked.__init_subclass__), True)
check('a_classmethod_read_is_a_method', lambda: _mt(Hooked.cm), True)
check('an_instance_bound_read_is_a_method', lambda: _mt(hooked.m), True)
# ...and the things that are NOT methods.
check('a_class_read_of_a_plain_method_is_not',
      lambda: _mt(Hooked.m), False)
check('a_module_function_is_not_a_method', lambda: _mt(module_fn), False)
check('a_nested_function_is_not_a_method', lambda: _mt(nested_fn), False)
check('a_partial_is_not_a_method',
      lambda: _mt(functools.partial(module_fn)), False)
check('a_constructed_methodtype_is_one',
      lambda: _mt(types.MethodType(module_fn, hooked)), True)

# The defined hook binds to ITS class: __self__ is the class, and __func__
# is the underlying function, callable with the class made explicit.
check('the_defined_hook_binds_to_the_class',
      lambda: Hooked.__init_subclass__.__self__ is Hooked, True)
check('the_hooks_func_takes_the_class_explicitly',
      lambda: Hooked.__init_subclass__.__func__(Plain), None)


# ------------------------------------------------- FunctionType

check('a_module_function_is_a_function', lambda: _ft(module_fn), True)
check('a_nested_function_is_a_function', lambda: _ft(nested_fn), True)
check('a_lambda_is_a_function', lambda: _ft(lambda: None), True)
check('a_class_read_of_a_plain_method_is_a_function',
      lambda: _ft(Hooked.m), True)
check('a_bound_method_is_not_a_function', lambda: _ft(hooked.m), False)
check('a_class_is_not_a_function', lambda: _ft(Plain), False)
check('a_classmethod_object_is_not_a_function',
      lambda: _ft(classmethod(module_fn)), False)
check('lambdatype_is_functiontype',
      lambda: types.LambdaType is types.FunctionType, True)


# ------------------------------------------------- what it is all for

def _deprecated_class_with_its_own_hook():
    """@deprecated's MethodType branch, end to end: the hook still runs, its
    class marker lands on the subclass, and the warning is emitted."""
    @warnings.deprecated('C will go away soon')
    class C:
        def __init_subclass__(cls):
            cls.inited = True

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class D(C):
            pass

    return (getattr(D, 'inited', '<not set>'),
            [w.category.__name__ for w in log])


check('deprecated_forwards_to_an_existing_hook',
      _deprecated_class_with_its_own_hook, (True, ['DeprecationWarning']))


def _the_hook_sees_the_new_class():
    saw = []

    @warnings.deprecated('Base will go away soon')
    class Base:
        def __init_subclass__(cls):
            saw.append(cls)

    before = list(saw)
    with warnings.catch_warnings(record=True):
        warnings.simplefilter('always')

        class C(Base):
            pass

    return (before, saw[-1] is C)


check('the_hook_sees_the_new_class', _the_hook_sees_the_new_class,
      ([], True))


def _a_deprecated_function_is_still_a_function():
    """test_dunder_deprecated's shape: the wrapper @deprecated answers for a
    function must itself classify as a function."""
    @warnings.deprecated('b will go away soon')
    def b():
        pass

    return (b.__deprecated__, isinstance(b, types.FunctionType))


check('a_deprecated_function_is_still_a_function',
      _a_deprecated_function_is_still_a_function,
      ('b will go away soon', True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
