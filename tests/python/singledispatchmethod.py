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


class StaticScope:
    """@singledispatchmethod over a @staticmethod.  Grail consumes the inner
    decorator at parse time and compiles the def onto the METACLASS, so the
    outer decorator's base has to be a class-side handle -- an instance-side
    one names nothing.  Neither access path binds an instance, exactly as
    CPython's staticmethod descriptor does not."""
    @functools.singledispatchmethod
    @staticmethod
    def t(arg):
        return "base"
    @t.register(int)
    @staticmethod
    def _(arg):
        return "int"
    @t.register(str)
    @staticmethod
    def _(arg):
        return "str"


class ClassScope:
    """@singledispatchmethod over a @classmethod.  ``cls'' is the Smalltalk
    receiver of the class-side method, so the class-side handle supplies it
    implicitly and the dispatch argument is the first one passed."""
    @functools.singledispatchmethod
    @classmethod
    def t(cls, arg):
        return "base"
    @t.register(int)
    @classmethod
    def _(cls, arg):
        return "int"
    @t.register(str)
    @classmethod
    def _(cls, arg):
        return "str"


def static_via_class():
    return [StaticScope.t(0), StaticScope.t(''), StaticScope.t(0.0)]


def static_via_instance():
    """A staticmethod reached through an INSTANCE takes the same arguments as
    through the class -- nothing is prepended."""
    s = StaticScope()
    return [s.t(0), s.t(''), s.t(0.0)]


def classmethod_via_class():
    return [ClassScope.t(0), ClassScope.t(''), ClassScope.t(0.0)]


def classmethod_via_instance():
    c = ClassScope()
    return [c.t(0), c.t(''), c.t(0.0)]


def classmethod_annotation_on_slots():
    """The annotation form over a @classmethod, on a __slots__ class -- the
    shape CPython's test_classmethod_slotted_class uses.  Reading the
    annotation off a class-side method needs it in the class's annotation
    table, which used to list instance methods only."""
    class Slot:
        __slots__ = ('a', 'b')
        @functools.singledispatchmethod
        @classmethod
        def go(cls, item, arg):
            return None
        @go.register
        @classmethod
        def _(cls, item: int, arg):
            return item + arg
    return [Slot().go(1, 1), Slot.go(1, 1)]


def static_annotation_registration():
    class A:
        @functools.singledispatchmethod
        @staticmethod
        def t(arg):
            return "base"
        @t.register
        @staticmethod
        def _(arg: int):
            return "int"
        @t.register
        @staticmethod
        def _(arg: str):
            return "str"
    return [A.t(0), A.t(''), A.t(0.0)]


def classmethod_descriptor_repr():
    """The descriptor names itself Cls.meth.  A class-side handle answers only
    the bare selector, so the qualification has to come from the class it is
    bound to."""
    return repr(ClassScope.t)


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
