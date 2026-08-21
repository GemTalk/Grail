"""``__init_subclass__`` with declared parameters -- the fixed-arity hook.

PEP 487's hook receives the keywords from the class header: ``class C(Base,
x=42)`` calls ``Base.__init_subclass__(cls=C, x=42)``.  A hook written with a
REQUIRED parameter -- ``def __init_subclass__(cls, x)`` -- is the shape the
protocol documentation itself uses, and it exercises a corner an
implementation can miss: the keyword has to bind to a positional parameter,
and the hook has to run against a CLASS receiver even though it was written
as an ordinary instance-side def (the implicit-classmethod convention).

In Grail that corner was an UNCATCHABLE Smalltalk error, not a failure: the
generated keyword-binding forwarder re-dispatched to the fixed-arity method
with a virtual self-send, and with self a class the lookup ran the METACLASS
chain -- ``a Metaclass3 does not understand #__init_subclass__:`` at every
``class C(Base, x=1)`` whose hook declares a parameter, killing the module
mid-import.

Every expectation below was checked against CPython 3.14.
"""

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


def check_raises(name, fn, exc_type):
    try:
        fn()
        RESULTS[name] = 'did not raise'
    except BaseException as exc:
        RESULTS[name] = isinstance(exc, exc_type)


class Base:
    def __init_subclass__(cls, x):
        cls.inited = x


# ------------------------------------------------- the header keyword binds

def _keyword_binds_to_the_parameter():
    class C(Base, x=42):
        pass
    return C.inited


check('the_header_keyword_binds_to_the_parameter',
      _keyword_binds_to_the_parameter, 42)


def _each_subclass_gets_its_own_value():
    class C(Base, x=1):
        pass

    class D(C, x=3):
        pass

    return (C.inited, D.inited)


check('each_subclass_gets_its_own_value',
      _each_subclass_gets_its_own_value, (1, 3))


def _a_default_fills_an_omitted_keyword():
    class WithDefault:
        def __init_subclass__(cls, flavour='plain'):
            cls.flavour = flavour

    class S(WithDefault):
        pass

    class T(WithDefault, flavour='vanilla'):
        pass

    return (S.flavour, T.flavour)


check('a_default_fills_an_omitted_keyword',
      _a_default_fills_an_omitted_keyword, ('plain', 'vanilla'))


def _a_missing_required_keyword_raises():
    class C(Base):
        pass


check_raises('a_missing_required_keyword_raises',
             _a_missing_required_keyword_raises, TypeError)


# ------------------------------------------------- through __func__

def _func_forwarding_with_an_explicit_class():
    """The shape @deprecated's wrapper forwards through: __func__ called with
    the class made explicit."""
    class Sub(Base, x=1):
        pass

    fn = Base.__init_subclass__.__func__
    fn(Sub, x=7)
    return Sub.inited


check('func_forwarding_with_an_explicit_class',
      _func_forwarding_with_an_explicit_class, 7)


# ------------------------------------------------- through @deprecated

def _deprecated_class_with_a_fixed_arity_base_hook():
    """test_existing_init_subclass_in_base's flow, end to end."""
    @warnings.deprecated('C will go away soon')
    class C(Base, x=42):
        pass

    at_decoration = C.inited
    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class D(C, x=3):
            pass

    return (at_decoration, D.inited, [w.category.__name__ for w in log])


check('deprecated_with_a_fixed_arity_base_hook',
      _deprecated_class_with_a_fixed_arity_base_hook,
      (42, 3, ['DeprecationWarning']))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
