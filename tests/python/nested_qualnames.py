"""Fixtures for ``__qualname__'' on nested classes, functions, and methods.

Driven by PythonTests>>NestedQualnameTestCase.  Each check answers True when
Grail reports the same string CPython does, so a failure names the exact
nesting that is wrong.

WHAT A QUALNAME IS.  CPython names every enclosing scope, outermost first, and
inserts ``<locals>'' after any scope that is a FUNCTION.  A class body is not a
function scope, which is the whole reason the two nestings differ:

    class A:
        class B: ...        # A.B
    def f():
        class B: ...        # f.<locals>.B

WHY THESE WERE WRONG.  Grail's emission context held ONE ``class being
compiled'' and ONE ``function being compiled''.  Two separate failures came out
of that:

  * a chain deeper than one level was TRUNCATED -- ``def a(): def b(): def c()''
    reported ``b.<locals>.c'';
  * a CLASS could not read its own nesting at all, because ClassDefAst sets the
    class slot to ITSELF before emitting the body, so the obvious fix produced
    ``InFunc.fn.<locals>.InFunc'' and regressed every top-level class to
    ``Outer.Outer''.

Both are now read off a STACK of enclosing scopes (CallAst >> ___scopeStack___)
whose frames carry node identity, so a node stops at its own frame instead of
trusting the top of the stack to belong to somebody else.

Run this file under CPython (``python3 tests/python/nested_qualnames.py'') to
see what it produces -- that is where the expected strings come from.  Every
check answers identically under CPython and Grail.
"""


def _fn():
    class InFunc:
        def m(self):
            pass

    def inner():
        pass

    return InFunc, inner


class Outer:
    class Inner:
        class Deep:
            pass

    def meth(self):
        class InMeth:
            pass

        def m_inner():
            pass

        return InMeth, m_inner


class Top:
    pass


def _three_deep():
    def b():
        def c():
            pass

        class D:
            pass

        return c, D

    return b()


def _under_if():
    if True:
        class Cond:
            pass
    return Cond


_InFunc, _inner = _fn()
_InMeth, _m_inner = Outer().meth()
_c, _D = _three_deep()


# --- functions -----------------------------------------------------------

def a_def_in_a_function_is_locals_qualified():
    return _inner.__qualname__ == '_fn.<locals>.inner'


def a_def_in_a_method_names_the_class_too():
    return _m_inner.__qualname__ == 'Outer.meth.<locals>.m_inner'


def a_def_three_scopes_deep_keeps_every_link():
    """The single-slot context reported ``b.<locals>.c'' here."""
    return _c.__qualname__ == '_three_deep.<locals>.b.<locals>.c'


# --- classes -------------------------------------------------------------

def a_top_level_class_is_its_bare_name():
    """The regression guard: the obvious fix made this ``Top.Top''."""
    return Top.__qualname__ == 'Top'


def a_class_in_a_function_is_locals_qualified():
    return _InFunc.__qualname__ == '_fn.<locals>.InFunc'


def a_class_in_a_method_names_the_enclosing_class():
    return _InMeth.__qualname__ == 'Outer.meth.<locals>.InMeth'


def a_class_in_a_class_has_no_locals():
    return Outer.Inner.__qualname__ == 'Outer.Inner'


def a_class_three_classes_deep_keeps_every_link():
    return Outer.Inner.Deep.__qualname__ == 'Outer.Inner.Deep'


def a_class_three_scopes_deep_keeps_every_link():
    return _D.__qualname__ == '_three_deep.<locals>.b.<locals>.D'


def a_class_under_an_if_is_still_function_scoped():
    """An ``if'' is not a scope, so the enclosing FUNCTION is still the prefix."""
    return _under_if().__qualname__ == '_under_if.<locals>.Cond'


# --- methods, which are built from their class's qualname ----------------

def a_method_of_a_nested_class_inherits_the_nesting():
    """Reached off the CLASS -- an UnboundMethod in Grail, a function in CPython."""
    return _InFunc.m.__qualname__ == '_fn.<locals>.InFunc.m'


def a_method_of_a_top_level_class_is_unchanged():
    return Outer.meth.__qualname__ == 'Outer.meth'


def a_bound_method_of_a_nested_class_inherits_the_nesting():
    return _InFunc().m.__qualname__ == '_fn.<locals>.InFunc.m'


if __name__ == '__main__':
    checks = [
        a_def_in_a_function_is_locals_qualified,
        a_def_in_a_method_names_the_class_too,
        a_def_three_scopes_deep_keeps_every_link,
        a_top_level_class_is_its_bare_name,
        a_class_in_a_function_is_locals_qualified,
        a_class_in_a_method_names_the_enclosing_class,
        a_class_in_a_class_has_no_locals,
        a_class_three_classes_deep_keeps_every_link,
        a_class_three_scopes_deep_keeps_every_link,
        a_class_under_an_if_is_still_function_scoped,
        a_method_of_a_nested_class_inherits_the_nesting,
        a_method_of_a_top_level_class_is_unchanged,
        a_bound_method_of_a_nested_class_inherits_the_nesting,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
