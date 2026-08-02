"""Fixture for functools.singledispatchmethod, for the class-body decorator
naming a SIBLING def, and for repeated ``def _'' in one scope.

A module fixture rather than an eval: string because every case defines a
class, and eval-path class statements are a known Grail limitation.

The three nesting contexts are all here on purpose.  A class body compiles
differently at module scope, inside a plain function, and inside a method, and
the sibling-name resolution has to hold in all three -- an earlier cut worked
at module scope and silently dropped every registration in the other two.
"""

import functools


class ModuleScope:
    @functools.singledispatchmethod
    def t(self, arg):
        return "base"
    @t.register(int)
    def _(self, arg):
        return "int"
    @t.register(str)
    def _(self, arg):
        return "str"


class Annotated:
    @functools.singledispatchmethod
    def t(self, arg):
        return "base"
    @t.register
    def _(self, arg: int):
        return "int"
    @t.register
    def _(self, arg: str):
        return "str"


def _dispatch_three(cls):
    inst = cls()
    return [inst.t(0), inst.t(''), inst.t(0.0)]


def module_scope_explicit():
    """@t.register(int) -- the explicit-type form."""
    return _dispatch_three(ModuleScope)


def module_scope_annotation():
    """@t.register -- the form that infers the type from the first parameter's
    annotation.  Reaches the implementation as an UnboundMethod, so it needs
    __annotations__ on that handle."""
    return _dispatch_three(Annotated)


def in_function():
    class A:
        @functools.singledispatchmethod
        def t(self, arg):
            return "base"
        @t.register(int)
        def _(self, arg):
            return "int"
        @t.register(str)
        def _(self, arg):
            return "str"
    return _dispatch_three(A)


class Host:
    def build(self):
        class A:
            @functools.singledispatchmethod
            def t(self, arg):
                return "base"
            @t.register(int)
            def _(self, arg):
                return "int"
            @t.register(str)
            def _(self, arg):
                return "str"
        return A


def in_method():
    return _dispatch_three(Host().build())


def arity_error():
    """CPython names the FUNCTION, and the receiver does not count towards the
    one required positional argument."""
    class A:
        @functools.singledispatchmethod
        def t(self, *args, **kwargs):
            pass
    out = []
    for kind in ('none', 'kw'):
        try:
            A().t() if kind == 'none' else A().t(a=1)
            out.append('no error')
        except TypeError as e:
            out.append(str(e))
    return out


def descriptor_repr():
    return repr(ModuleScope.t)


def descriptor_name():
    return ModuleScope.t.__name__


_captured = []


def capture(fn):
    """A decorator that keeps the function it is handed -- the plainest way to
    observe each definition separately, the way @t.register does."""
    _captured.append(fn)
    return fn


class TwoUnderscoreDefs:
    """Two ``def _'' in one class body.  ``_'' is not a valid Smalltalk
    identifier, so it is renamed at parse time; renaming both to the SAME name
    made the second method overwrite the first, and the first simply never ran.
    Nothing reported it."""
    @capture
    def _(self):
        return "first"
    @capture
    def _(self):
        return "second"


def two_underscore_defs_are_distinct():
    """Both bodies survive as separate functions."""
    inst = TwoUnderscoreDefs()
    return [fn(inst) for fn in _captured]


def underscore_name_reads_the_last_binding():
    """Giving each definition its own name must not change what the NAME
    means: a read of ``_'' is still the most recent definition."""
    def _():
        return "first"
    def _():
        return "second"
    return _()


def underscore_assignment_rebinds_the_name():
    """...and a plain assignment to ``_'' after a ``def _'' rebinds it, rather
    than leaving the read pointing at the def."""
    def _():
        return "def"
    _ = "assigned"
    return _
