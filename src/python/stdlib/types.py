# Minimal `types` stub for Grail.  CPython's `types` exposes the
# concrete type objects for things like functions, methods, code
# objects, generators, modules, etc., for isinstance dispatch.
#
# Grail has its own internal representations for most of these and
# no public class object matching CPython's exactly.  Stub each
# name as an empty class so ``isinstance(obj, types.X)`` returns
# False (no real instance ever inherits from a stub), which matches
# the conservative branch downstream code (Jinja2 sandbox / utils,
# Werkzeug attribute filters) takes when introspection can't
# classify a value.  Expand individual types to real Grail classes
# as call sites need them.
#
# TracebackType, CodeType, CellType and ModuleType are expanded (below), and
# MethodType is real because it is CALLED rather than isinstance-tested.  The
# rest are still stubs, and the
# distinction is deliberate rather than alphabetical: a name is worth
# converting when Grail HAS the object and only the name was missing, so that
# `isinstance` stops lying about something real.  Converting one that has no
# Grail counterpart would replace a False that is honest with an error.


class _FunctionTypeMeta(type):
    """isinstance support for FunctionType against Grail's own callables.

    CPython's FunctionType covers module-level defs, nested defs, lambdas --
    and a plain method READ THROUGH ITS CLASS (``B.m``), which is just a
    function in Python 3.  Grail spells those as three different things, so
    the check enumerates them rather than pretending one class covers it:

      * a module-level def is a BoundMethod whose ``__self__`` IS the module
        (Grail binds functions to their module; CPython does not bind them at
        all, which is why the module test carries the decision);
      * a nested def or a lambda is an ExecBlock;
      * ``B.m`` is an UnboundMethod.

    Everything else is excluded the way CPython excludes it: classes,
    partials, classmethod/staticmethod wrappers, and anything bound to a
    non-module (those are methods, not functions)."""

    def __instancecheck__(cls, obj):
        if type(obj) is cls:
            return True
        if isinstance(obj, type):
            return False
        if not callable(obj):
            return False
        if hasattr(obj, '__self__'):
            return isinstance(obj.__self__, ModuleType)
        return type(obj).__name__ in ('ExecBlock', 'UnboundMethod')


class FunctionType(metaclass=_FunctionTypeMeta):
    pass


# CPython's LambdaType IS FunctionType -- the same object under two names, a
# lambda being nothing but an anonymous function.  A separate stub here made
# ``isinstance(lam, types.LambdaType)`` disagree with
# ``isinstance(lam, types.FunctionType)``, which no CPython program can
# observe.
LambdaType = FunctionType


class _MethodTypeMeta(type):
    """isinstance support for MethodType against Grail's BoundMethods.

    CPython's line is implementation language: a METHOD object (Python-level,
    carries ``__func__``) is a MethodType; a BUILTIN bound to something
    carries ``__self__`` but no ``__func__`` and is not.  Grail's BoundMethod
    carries both for everything it binds, so the same line has to be drawn
    from what the binding is FOR:

      * bound to a MODULE: that is Grail's spelling of a plain function --
        CPython does not bind those at all.  Not a method;
      * ``__func__`` owned by the Smalltalk kernel (qualname beginning
        'Object class.'): Grail's spelling of a C builtin --
        ``object.__init_subclass__`` read through any class is the case in
        play.  CPython classifies those builtin_function_or_method, so: not
        a method;
      * anything else carrying both attributes is a real bound method --
        an instance method read off an instance, a classmethod read off its
        class, or an implicit classmethod like a class-defined
        __init_subclass__.

    PEP 702's @deprecated branches on exactly this check to decide whether a
    class's existing __init_subclass__ is a Python-level hook (unwrap
    __func__, reinstall as classmethod) or object's builtin (wrap as a plain
    function taking no arguments), and both of its branches only work when
    the answer here matches CPython's."""

    def __instancecheck__(cls, obj):
        if type(obj) is cls:
            return True
        func = getattr(obj, '__func__', None)
        if func is None or not hasattr(obj, '__self__'):
            return False
        if isinstance(obj.__self__, ModuleType):
            return False
        if getattr(func, '__qualname__', '').startswith('Object class.'):
            return False
        return True


class MethodType(metaclass=_MethodTypeMeta):
    """A bound method: ``MethodType(func, obj)`` calls ``func(obj, ...)``.

    NOT a stub, and NOT for isinstance.  Every other name in this file is a
    stub because Grail has no public class object matching CPython's, and a
    stub is the honest answer for a name that only ever appears in an
    ``isinstance`` test.  This one is different: ``types.MethodType`` is CALLED,
    to bind a function to an object after the fact --

        self.fi.id = types.MethodType(id, self.fi)
        self.fi.id()                       # -> id(self.fi)

    -- and a stub answered the class itself, so the call site got an object
    that was not callable.  The failure surfaced as a raw Smalltalk
    MessageNotUnderstood escaping into the caller rather than as any Python
    error, which is the worst shape available: it is uncatchable by Python code
    and, in the conformance harness, voids the scoring of every test that
    follows it in the module.

    Grail's own bound methods are BoundMethod, not this; nothing here claims
    otherwise.  What this provides is the CONSTRUCTOR, which Grail had no
    spelling for at all.

    ``__slots__`` rather than a plain body, because CPython's method type has
    no attribute storage: setting or deleting any other name is an
    AttributeError, and test_funcattrs checks both directions.
    """

    __slots__ = ('__func__', '__self__')

    def __init__(self, func, obj):
        self.__func__ = func
        self.__self__ = obj

    def __call__(self, *args, **kwargs):
        return self.__func__(self.__self__, *args, **kwargs)

    def __repr__(self):
        return '<bound method of %r>' % (self.__self__,)


class BuiltinFunctionType:
    pass


class BuiltinMethodType:
    pass


class WrapperDescriptorType:
    pass


class MethodWrapperType:
    pass


class MethodDescriptorType:
    pass


class ClassMethodDescriptorType:
    pass


def _derive_module_type():
    """The REAL base class every Grail module shares, taken from a real module.

    Derived rather than stubbed, for the same reason TracebackType below is:
    Grail HAS the thing, it just has no Python-visible binding for it.  A module
    is a Smalltalk class instance and each one is an instance of its OWN
    generated class, so ``type(sys)`` is ``sys`` -- not a single ``module`` type
    the way CPython has one.  But every one of those classes descends from
    Grail's ``module``, so that is the class ``isinstance(x, ModuleType)`` should
    name, and asking a live module for it is the only way to reach it.

    The stub this replaces documented the gap and accepted it ("the check
    returns False; downstream code generally has a hasattr-based fallback").
    inspect.ismodule has no such fallback -- it IS the isinstance check -- so
    every module in the system answered False to it, and pydoc, whose first act
    is to ask whether the thing it was handed is a module, could not work at all.

    ``type(sys)`` is used rather than a walk of sys.modules: it is the one module
    guaranteed to be imported here.
    """
    import sys as _sys
    t = type(_sys)
    for cls in getattr(t, '__mro__', ()):
        if getattr(cls, '__name__', None) == 'module':
            return cls
    return t


ModuleType = _derive_module_type()

if ModuleType is None:
    # Unreachable in practice -- type(sys) always has an mro -- but a name that
    # quietly became None would be worse than one that is merely inert.
    class ModuleType:
        pass

del _derive_module_type


def _derive_traceback_type():
    """The REAL traceback class, taken from a real traceback.

    Grail has a genuine traceback object -- ``e.__traceback__`` is a linked
    list of nodes with tb_frame / tb_lineno / tb_next -- so the stub this
    replaces stood in for a missing NAME, not a missing feature.  The
    cost of the name being wrong was that ``isinstance(tb, TracebackType)``
    answered False about an object that was one, which is the check every
    traceback-handling library leads with.

    Derived rather than imported because the class lives in Grail's Smalltalk
    dictionary and has no Python-visible binding of its own; raising is how you
    ask for one.  The CALL form of the raise is deliberate: it is the path that
    arms the VM's stack capture, so this works even as the session's first
    raise.
    """
    try:
        raise ValueError()
    except ValueError as e:
        tb = e.__traceback__
        if tb is not None:
            return type(tb)
    return None


TracebackType = _derive_traceback_type()

if TracebackType is None:
    # No traceback was available at import time -- keep the old inert stub so
    # ``isinstance(x, TracebackType)`` is False rather than an error.  Nothing
    # is known to reach this, and a name that quietly became NoneType would be
    # far worse than one that is merely unhelpful.
    class TracebackType:
        pass

del _derive_traceback_type


class FrameType:
    pass


class GetSetDescriptorType:
    pass


class MemberDescriptorType:
    pass


def _derive_code_type():
    """The REAL code class, taken from a real function's __code__.

    Grail has a genuine code object -- ``f.__code__`` answers a PyCode carrying
    co_name / co_filename / co_varnames -- so the stub this replaces stood in
    for a missing NAME, not a missing feature.  The cost of the name being wrong
    was that ``isinstance(c, types.CodeType)`` answered False about an object
    that was one, and ``type(f.__code__)`` printed ``<class 'PyCode'>``
    (test_funcattrs' test___code__ compares those two directly).

    Derived rather than imported for the same reason TracebackType is: the class
    lives in Grail's Smalltalk dictionary with no Python-visible binding of its
    own, so the way to ask for it is to hold one.
    """
    def _probe():
        pass
    code = getattr(_probe, '__code__', None)
    if code is not None:
        return type(code)
    return None


CodeType = _derive_code_type()

if CodeType is None:
    class CodeType:
        pass

del _derive_code_type


def _derive_cell_type():
    """The REAL closure-cell class, taken from a real closure.

    Grail's PyCell is a genuine cell -- it reads and writes the enclosing
    binding through a reader/writer pair, which is why closures observed through
    ``cell_contents`` track later assignments.  It already reports
    ``type(c).__name__ == 'cell'``; what was missing was the NAME
    ``types.CellType`` pointing at it, so ``isinstance(c, types.CellType)`` was
    False about a cell and ``types.CellType(1)`` built an inert stub instance
    with no cell_contents at all.
    """
    def _outer():
        _captured = None

        def _inner():
            return _captured
        return _inner
    closure = getattr(_outer(), '__closure__', None)
    if closure:
        return type(closure[0])
    return None


CellType = _derive_cell_type()

if CellType is None:
    class CellType:
        pass

del _derive_cell_type


def _derive_generator_type():
    """The real generator class, taken from a live generator.

    Same reasoning as _derive_cell_type above, and the same failure it
    repairs: Grail HAS generators (PythonGenerator, forked body and all), so
    the class existed -- what was missing was the NAME ``types.GeneratorType''
    pointing at it.  A bare ``class GeneratorType: pass'' placeholder makes
    ``isinstance(g, types.GeneratorType)'' False about a real generator and
    ``type(g) is types.GeneratorType'' False as well, which is how library
    code and CPython's own tests ask the question.
    """
    def _g():
        yield None
    return type(_g())


GeneratorType = _derive_generator_type()

if GeneratorType is None:
    class GeneratorType:
        pass


def _derive_coroutine_type():
    """The real coroutine class, taken from a live coroutine.

    THE HIGHEST-LEVERAGE NAME IN THIS FILE.  CPython's test_coroutines drives
    every one of its ~99 tests through

        def run_async(coro):
            assert coro.__class__ in {types.GeneratorType, types.CoroutineType}

    so a placeholder here failed that assert before any test body ran, and the
    whole module reported a bare ``AssertionError:'' with no message -- a
    result that looks like ninety separate bugs and is one.

    The coroutine is closed rather than left to be collected: creating one and
    never awaiting it is exactly the "coroutine was never awaited" mistake, and
    a module-import-time warning would be noise nobody can act on.
    """
    async def _c():
        pass
    c = _c()
    try:
        return type(c)
    finally:
        c.close()


CoroutineType = _derive_coroutine_type()

if CoroutineType is None:
    class CoroutineType:
        pass


class AsyncGeneratorType:
    """DELIBERATELY STILL A PLACEHOLDER, unlike the two above.

    Grail does not model async generators: an ``async def'' containing
    ``yield'' answers a COROUTINE (FunctionDefAst >> ___lazyWrapperClass___),
    not a separate async-generator object.  So deriving this the same way would
    make ``AsyncGeneratorType is CoroutineType'' true, and every
    ``isinstance(x, types.AsyncGeneratorType)'' would then answer yes about an
    ordinary coroutine -- turning a missing feature into a wrong answer, which
    is worse.  A distinct class keeps the discrimination honest until async
    generators exist.
    """


del _derive_generator_type
del _derive_coroutine_type


def coroutine(func):
    """Convert a regular generator function into an awaitable one.

    CPython does this by flipping a CODE FLAG -- it ORs CO_ITERABLE_COROUTINE
    (0x100) into ``func.__code__.co_flags`` -- and the flag's only job is to
    make ``await gen()`` legal, because a bare generator is otherwise rejected
    by GET_AWAITABLE.

    Grail has no code flags to flip, and does not need one: ``await'' is
    routed through PythonGenerator >> ___grailAwait___:, whose first branch
    delegates to ANY generator-shaped operand.  So the property this decorator
    exists to grant already holds, and the honest implementation is to hand the
    function back -- an identity that is a real implementation of the contract
    here rather than a stub that ignores it.

    Two consequences worth being explicit about, since the difference from
    CPython is observable:

      * CPython DISTINGUISHES a decorated generator function from an
        undecorated one, and rejects ``await'' on the latter.  Grail accepts
        both, so the decorator is not load-bearing and forgetting it is not an
        error here.  That is the same permissiveness ___grailAwait___: already
        documents for a plain value.
      * The wrapping branch CPython keeps for Cython-style objects that merely
        LOOK generator-shaped is not reproduced.  Nothing in the tree produces
        one, and _GeneratorWrapper exists to add send/throw/close to something
        that lacks them -- whereas anything Grail would delegate to already has
        them, since that is what ___yieldFrom___: forwards through.

    The callable check is kept because it is the one part of CPython's
    behaviour a caller can actually observe going wrong: ``types.coroutine(42)``
    raises TypeError rather than silently answering 42.
    """
    if not callable(func):
        raise TypeError('types.coroutine() expects a callable')
    return func


class MappingProxyType:
    """``MappingProxyType(d)`` returns a read-only view of dict d.
    Stubbed to just return the dict — Grail's dispatch doesn't
    distinguish a read-only mapping from a regular one."""

    def __new__(cls, mapping):
        return mapping


class SimpleNamespace:
    """``SimpleNamespace(**kwargs)`` — attribute-bag CPython types
    helper.  Used by Werkzeug / Flask in a few places."""

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    def __repr__(self):
        keys = sorted(self.__dict__)
        items = ("{}={!r}".format(k, self.__dict__[k]) for k in keys)
        return "{}({})".format(type(self).__name__, ", ".join(items))

    def __eq__(self, other):
        if isinstance(other, SimpleNamespace):
            return self.__dict__ == other.__dict__
        return NotImplemented


def new_class(name, bases=(), kwds=None, exec_body=None):
    """``types.new_class`` — dynamic class creation.  Returns the
    metaclass-default ``type(name, bases, ns)`` shape with no kwargs
    handling; Jinja2 / Flask rarely use this."""
    ns = {}
    if exec_body is not None:
        exec_body(ns)
    return type(name, bases, ns)


def prepare_class(name, bases=(), kwds=None):
    return (type, {}, kwds or {})


def resolve_bases(bases):
    return bases


# type(None) — Grail's None is a real singleton whose class the type()
# builtin reports; downstream isinstance(x, NoneType) then behaves
# exactly like ``x is None``.
NoneType = type(None)


class GenericAlias:
    """Stub — Grail evaluates ``list[int]`` via class-side
    __getitem__ returning the origin class, so no real GenericAlias
    instances exist; isinstance against this is always False."""
    pass


class UnionType:
    """Stub — ``int | str`` unions aren't materialised in Grail."""
    pass


# ``types.EllipsisType is type(...)'' in CPython -- it is the public spelling of
# a type with no builtin name, not a separate class.  A stub class here made
# ``isinstance(..., types.EllipsisType)'' False, which is the one thing callers
# use it for.
EllipsisType = type(...)


# As with EllipsisType: ``types.NotImplementedType is type(NotImplemented)'' in
# CPython, and a stub class made ``isinstance(NotImplemented, ...)'' False.
NotImplementedType = type(NotImplemented)


# ``types.DynamicClassAttribute`` is the descriptor CPython's enum builds its
# member ``property`` on -- routing attribute access on a class to the
# metaclass __getattr__ while giving instances the computed value.  Grail's
# ``enum.property`` is exactly that descriptor (DynamicClassAttribute), and the
# enum machinery already treats it as a member-shadowing property, so alias it
# here rather than re-implementing.  Lets ``from types import
# DynamicClassAttribute`` resolve (test_enum test_subclass_duplicate_name_dynamic;
# django.db.models.enums imports it as ``enum_property``).
from enum import property as DynamicClassAttribute
