# GRAIL mock - the commonly used core of unittest.mock as a top-level
# module: Mock with call recording / return_value / side_effect /
# auto-created child attributes and the assert_called* family, patch /
# patch.object as context managers, sentinel, call, and DEFAULT.
# Registered under "unittest.mock" too, so both `import mock` and
# `import unittest.mock` work.  Deviations from CPython, kept
# deliberately small for V1:
#   * a magic method CAN be configured on any mock
#     (``m.__mul__ = Mock(return_value=15)``): Grail resolves dunders through
#     the CLASS - as CPython does - so the assignment installs a forwarder on
#     a class private to that one mock.  MagicMock additionally answers
#     CPython's defaults for the ones left unconfigured (iter(m) is empty,
#     len(m) is 0, m + 1 is a child MagicMock, ...), and it is what patch()
#     substitutes.  Reading ``m.__iter__`` gives the method, not CPython's
#     child mock, so configure a magic by assignment, not through
#     ``m.__iter__.return_value``;
#   * patch works as a context manager only (method @-decorators are
#     dropped by Grail), and there is no spec; ``autospec=True`` is honoured
#     for a FUNCTION target only (a real function forwarding to the mock),
#     without CPython's signature check;
#   * ``wraps`` IS supported -- on Mock and through patch/patch.object's
#     trailing keywords -- for the call-through case: the mock records the
#     call and returns what the wrapped callable returns, and an
#     auto-created child wraps the corresponding attribute of the wrapped
#     object.  An explicitly configured return_value still wins, as in
#     CPython;
#   * call sites that Grail compiled as DIRECT module sends
#     (mod.attr(...) with mod+attr statically known) bypass a patched
#     module attribute - read the attribute dynamically (getattr) or
#     patch objects whose attributes dispatch dynamically;
#   * call objects compare by exact (args, kwargs) equality.

import builtins
import importlib
import sys

__all__ = ["Mock", "MagicMock", "NonCallableMock", "patch", "sentinel", "mock_open",
           "call", "DEFAULT", "ANY"]


class _SentinelObject:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return "sentinel." + self.name


class _Sentinel:
    def __init__(self):
        self._registry = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        registry = self._registry
        if name not in registry:
            registry[name] = _SentinelObject(name)
        return registry[name]


sentinel = _Sentinel()
DEFAULT = sentinel.DEFAULT


class _Any:
    def __eq__(self, other):
        return True

    def __ne__(self, other):
        return False

    def __repr__(self):
        return "<ANY>"


ANY = _Any()


class _Call:
    def __init__(self, args, kwargs):
        self.args = args
        self.kwargs = kwargs

    def __eq__(self, other):
        return (self.args == other.args) and (self.kwargs == other.kwargs)

    def __ne__(self, other):
        return not (self == other)

    def __repr__(self):
        parts = []
        for a in self.args:
            parts.append(repr(a))
        for k in self.kwargs:
            parts.append(k + "=" + repr(self.kwargs[k]))
        return "call(" + ", ".join(parts) + ")"


def call(*args, **kw):
    return _Call(args, kw)


# --- configurable magic methods ---------------------------------------------
#
# CPython lets a magic method be configured on a mock (``m.__mul__ =
# Mock(return_value=15)``) and dispatch honours it.  Grail resolves dunders
# through the CLASS, exactly as CPython does -- an instance attribute named
# ``__mul__`` is ignored by ``*`` in both -- so the assignment has to reach a
# class.
#
# CPython gives every mock its own subclass and installs the magic there; so does
# this.  Isolation is the whole point: installing on the shared Mock class would
# make one test's ``__mul__`` visible to every mock in the image.
#
# The class is built in __new__ rather than lazily on first magic assignment,
# because ``__class__`` assignment cannot retrofit one -- Grail requires identical
# object layout and refuses a freshly built subclass ("object layout differs from
# 'Mock'").
#
# The installed method is a FORWARDER, not the configured value: it looks the
# value up on the instance at call time, so re-assigning takes effect and the
# configured mock records its own calls -- which is what ``m.__hash__.call_count``
# asserts.

_MAGIC_NAMES = frozenset([
    "__add__", "__radd__", "__sub__", "__rsub__", "__mul__", "__rmul__",
    "__truediv__", "__rtruediv__", "__floordiv__", "__rfloordiv__",
    "__mod__", "__rmod__", "__divmod__", "__rdivmod__",
    "__pow__", "__rpow__", "__matmul__", "__rmatmul__",
    "__lshift__", "__rlshift__", "__rshift__", "__rrshift__",
    "__and__", "__rand__", "__or__", "__ror__", "__xor__", "__rxor__",
    "__neg__", "__pos__", "__abs__", "__invert__",
    "__int__", "__float__", "__index__", "__round__", "__trunc__",
    "__lt__", "__le__", "__gt__", "__ge__",
    "__len__", "__contains__", "__getitem__", "__setitem__", "__delitem__",
    "__iter__", "__next__", "__hash__", "__bool__", "__str__",
    "__enter__", "__exit__",
])


def _make_magic_forwarder(name):
    """A class-level method deferring to whatever the instance configured under
    ``name``.  Raises TypeError when nothing is, which is what an unsupported
    operand reports anyway."""

    def magic(self, *args):
        impl = self.__dict__.get(name)
        if impl is None:
            raise TypeError("%s has no %s configured"
                            % (type(self).__name__, name))
        return impl(*args)
    return magic


class Mock:
    def __new__(cls, *args, **kw):
        """Give every mock its own class, so a configured magic method reaches
        only that mock.  See the note above for why this cannot be lazy."""
        return object.__new__(type(cls.__name__, (cls,), {}))

    def __init__(self, return_value=DEFAULT, side_effect=None, name=None,
                 wraps=None):
        self._mock_name = name
        self.side_effect = side_effect
        # ``wraps`` -- the object calls pass THROUGH to once they have been
        # recorded.  Kept beside side_effect rather than folded into it: CPython
        # consults them in order (side_effect first, and only its DEFAULT return
        # falls through), and a caller can set both.
        self._mock_wraps = wraps
        # Whether return_value was configured EXPLICITLY, which is what decides
        # against ``wraps``.  It cannot be inferred from the attribute's
        # presence: __getattr__ materialises a child mock into the same slot on
        # first read, so by call time every mock has one.
        self._mock_return_set = False
        self._mock_children = {}
        self.call_args_list = []
        self.call_count = 0
        self.called = False
        self.call_args = None
        if return_value is not DEFAULT:
            self.return_value = return_value

    def __setattr__(self, name, value):
        """Assigning a magic method installs a forwarder on this mock's own
        class; every other name is an ordinary attribute."""
        if name in _MAGIC_NAMES:
            setattr(type(self), name, _make_magic_forwarder(name))
        if name == "return_value":
            object.__setattr__(self, "_mock_return_set", True)
        object.__setattr__(self, name, value)

    def __getattr__(self, name):
        if name.startswith("_") or name == "side_effect":
            raise AttributeError(name)
        if name == "return_value":
            # Implicit return value: a child Mock, created lazily and
            # stored as a real attribute so user assignment
            # (m.return_value = x) and this default share one slot.
            rv = self._mock_new_child(name=self._mock_label() + "()")
            # object.__setattr__, NOT self.return_value = rv: going through
            # __setattr__ would mark this IMPLICIT default as an explicit
            # configuration and so suppress ``wraps'' on the very first call.
            object.__setattr__(self, "return_value", rv)
            return rv
        children = self._mock_children
        if name not in children:
            child_name = name
            if self._mock_name is not None:
                child_name = self._mock_name + "." + name
            # A child of a WRAPPING mock wraps the matching attribute of the
            # wrapped object, as CPython's does -- otherwise ``m.method()'' on a
            # wrapped mock would answer a bare child mock while ``m()'' called
            # through.  Absent on the wrapped object means a plain child: the
            # mock is still allowed to invent attributes the original lacks.
            wrapped = None
            if self._mock_wraps is not None:
                try:
                    wrapped = getattr(self._mock_wraps, name)
                except AttributeError:
                    wrapped = None
            children[name] = self._mock_new_child(name=child_name, wraps=wrapped)
        return children[name]

    def _mock_label(self):
        if self._mock_name is None:
            return "mock"
        return self._mock_name

    def _mock_new_child(self, **kw):
        """The kind of mock this one hands out as a child or a return value:
        its own, as in CPython, so a MagicMock's children are MagicMocks."""
        return Mock(**kw)

    def __call__(self, *args, **kw):
        record = _Call(args, kw)
        self.call_count = self.call_count + 1
        self.called = True
        self.call_args = record
        self.call_args_list.append(record)
        effect = self.side_effect
        if effect is not None:
            if _is_exception(effect):
                raise effect
            result = effect(*args, **kw)
            if result is not DEFAULT:
                return result
        # CPython's order: side_effect, then wraps, then return_value -- but an
        # EXPLICIT return_value outranks wraps, which is why _mock_return_set
        # exists.
        if self._mock_wraps is not None and not self._mock_return_set:
            return self._mock_wraps(*args, **kw)
        return self.return_value

    def __repr__(self):
        # type(self) is this mock's private subclass, named after the class it
        # was made from -- so a MagicMock says so, as CPython's repr does.
        return ("<" + type(self).__name__ + " name=" + repr(self._mock_label())
                + " id=" + str(id(self)) + ">")

    def reset_mock(self):
        self.call_count = 0
        self.called = False
        self.call_args = None
        del self.call_args_list[:]
        for name in self._mock_children:
            self._mock_children[name].reset_mock()

    # -- assertions --

    def assert_called(self):
        if not self.called:
            raise AssertionError("Expected '" + self._mock_label()
                                 + "' to have been called.")

    def assert_not_called(self):
        if self.called:
            raise AssertionError("Expected '" + self._mock_label()
                                 + "' to not have been called. Called "
                                 + str(self.call_count) + " times.")

    def assert_called_once(self):
        if self.call_count != 1:
            raise AssertionError("Expected '" + self._mock_label()
                                 + "' to have been called once. Called "
                                 + str(self.call_count) + " times.")

    def assert_called_with(self, *args, **kw):
        expected = _Call(args, kw)
        if self.call_args is None:
            raise AssertionError("Expected call: " + repr(expected)
                                 + "\nNot called")
        if not (self.call_args == expected):
            raise AssertionError("Expected call: " + repr(expected)
                                 + "\nActual call: " + repr(self.call_args))

    def assert_called_once_with(self, *args, **kw):
        self.assert_called_once()
        self.assert_called_with(*args, **kw)

    def assert_any_call(self, *args, **kw):
        expected = _Call(args, kw)
        for recorded in self.call_args_list:
            if recorded == expected:
                return None
        raise AssertionError(repr(expected) + " call not found")


def _is_exception(obj):
    # Exception classes carry __mro__; instances are detected via
    # isinstance.  (isinstance(obj, type) raises in Grail, so probe
    # __mro__ instead.)
    if isinstance(obj, BaseException):
        return True
    mro = getattr(obj, "__mro__", None)
    if mro is None:
        return False
    return issubclass(obj, BaseException)


NonCallableMock = Mock


# --- MagicMock ---------------------------------------------------------------
#
# A Mock whose magic methods work before anyone configures them, answering what
# CPython's MagicMock answers (unittest.mock._return_values and friends,
# measured on 3.14): the fixed values below, an EMPTY iterator for __iter__ --
# which is what ``for x in patched_function(...)`` needs, test_gettext's
# FindTestCase -- and a child MagicMock for everything else.  The comparisons
# stay unsupported (CPython answers NotImplemented, so ``m < 1`` is a
# TypeError), and __hash__ / __str__ / __eq__ keep Mock's identity behaviour.
#
# The magic methods are written out as ordinary ``def``s, deliberately, and
# not installed by a loop of setattr(MagicMock, name, fn) -- which is shorter
# and does not work: a dunder that reaches the class DYNAMICALLY (setattr, or
# an entry in type()'s dict) is found by the binary operators and ``with``,
# but not by iter(), len(), bool(), ``in``, ``[]`` or int(), which resolve to
# object's compiled defaults first (see docs/Issues.md, "A dunder set on a
# class at runtime ...").  Compiled methods are found by every path.
#
# Each one makes its default child the first time it is used; making them
# eagerly would not terminate, since the children are MagicMocks too.  A magic
# the user ASSIGNS still wins: Mock's __setattr__ stores it in the instance's
# __dict__, which _mock_magic consults first -- and for a MagicMock that is
# what makes configuring __iter__ or __len__ work at all, where on a plain
# Mock those assignments reach only the dynamic forwarder.

_MAGIC_RETURN_DEFAULTS = {
    "__int__": 1, "__contains__": False, "__len__": 0, "__exit__": False,
    "__complex__": 1j, "__float__": 1.0, "__bool__": True, "__index__": 1,
}


def _magic_iter_default(child):
    """__iter__'s default side effect, CPython's: iterate the configured
    return value, or nothing."""

    def side_effect(*args):
        if child._mock_return_set:
            return iter(child.return_value)
        return iter([])
    return side_effect


class MagicMock(Mock):
    def _mock_new_child(self, **kw):
        return MagicMock(**kw)

    def _mock_magic(self, name):
        impl = self.__dict__.get(name)
        if impl is None:
            impl = MagicMock(name=self._mock_label() + "." + name)
            if name == "__iter__":
                impl.side_effect = _magic_iter_default(impl)
            elif name in _MAGIC_RETURN_DEFAULTS:
                impl.return_value = _MAGIC_RETURN_DEFAULTS[name]
            object.__setattr__(self, name, impl)
        return impl

    def __neg__(self):
        return self._mock_magic('__neg__')()

    def __pos__(self):
        return self._mock_magic('__pos__')()

    def __abs__(self):
        return self._mock_magic('__abs__')()

    def __invert__(self):
        return self._mock_magic('__invert__')()

    def __int__(self):
        return self._mock_magic('__int__')()

    def __float__(self):
        return self._mock_magic('__float__')()

    def __index__(self):
        return self._mock_magic('__index__')()

    def __complex__(self):
        return self._mock_magic('__complex__')()

    def __trunc__(self):
        return self._mock_magic('__trunc__')()

    def __len__(self):
        return self._mock_magic('__len__')()

    def __iter__(self):
        return self._mock_magic('__iter__')()

    def __next__(self):
        return self._mock_magic('__next__')()

    def __bool__(self):
        return self._mock_magic('__bool__')()

    def __enter__(self):
        return self._mock_magic('__enter__')()

    def __add__(self, other):
        return self._mock_magic('__add__')(other)

    def __radd__(self, other):
        return self._mock_magic('__radd__')(other)

    def __sub__(self, other):
        return self._mock_magic('__sub__')(other)

    def __rsub__(self, other):
        return self._mock_magic('__rsub__')(other)

    def __mul__(self, other):
        return self._mock_magic('__mul__')(other)

    def __rmul__(self, other):
        return self._mock_magic('__rmul__')(other)

    def __truediv__(self, other):
        return self._mock_magic('__truediv__')(other)

    def __rtruediv__(self, other):
        return self._mock_magic('__rtruediv__')(other)

    def __floordiv__(self, other):
        return self._mock_magic('__floordiv__')(other)

    def __rfloordiv__(self, other):
        return self._mock_magic('__rfloordiv__')(other)

    def __mod__(self, other):
        return self._mock_magic('__mod__')(other)

    def __rmod__(self, other):
        return self._mock_magic('__rmod__')(other)

    def __divmod__(self, other):
        return self._mock_magic('__divmod__')(other)

    def __rdivmod__(self, other):
        return self._mock_magic('__rdivmod__')(other)

    def __rpow__(self, other):
        return self._mock_magic('__rpow__')(other)

    def __matmul__(self, other):
        return self._mock_magic('__matmul__')(other)

    def __rmatmul__(self, other):
        return self._mock_magic('__rmatmul__')(other)

    def __lshift__(self, other):
        return self._mock_magic('__lshift__')(other)

    def __rlshift__(self, other):
        return self._mock_magic('__rlshift__')(other)

    def __rshift__(self, other):
        return self._mock_magic('__rshift__')(other)

    def __rrshift__(self, other):
        return self._mock_magic('__rrshift__')(other)

    def __and__(self, other):
        return self._mock_magic('__and__')(other)

    def __rand__(self, other):
        return self._mock_magic('__rand__')(other)

    def __or__(self, other):
        return self._mock_magic('__or__')(other)

    def __ror__(self, other):
        return self._mock_magic('__ror__')(other)

    def __xor__(self, other):
        return self._mock_magic('__xor__')(other)

    def __rxor__(self, other):
        return self._mock_magic('__rxor__')(other)

    def __contains__(self, other):
        return self._mock_magic('__contains__')(other)

    def __getitem__(self, other):
        return self._mock_magic('__getitem__')(other)

    def __delitem__(self, other):
        return self._mock_magic('__delitem__')(other)

    def __setitem__(self, key, value):
        return self._mock_magic('__setitem__')(key, value)

    def __pow__(self, other, modulo=None):
        if modulo is None:
            return self._mock_magic('__pow__')(other)
        return self._mock_magic('__pow__')(other, modulo)

    def __round__(self, ndigits=None):
        if ndigits is None:
            return self._mock_magic('__round__')()
        return self._mock_magic('__round__')(ndigits)

    def __exit__(self, exc_type, exc, tb):
        return self._mock_magic('__exit__')(exc_type, exc, tb)


def _is_module(obj):
    """True when obj is a module.

    CPython's mock asks ``isinstance(target, ModuleType)``, which does not work
    here: every Grail module is its OWN class (type(os) is the `os` class,
    deriving from `module`), and `types.ModuleType` is a separate stub class
    that no real module inherits from -- so the isinstance test answers False
    for every module there is.

    Ask sys.modules instead, which is exact and needs no type machinery: a
    module is the object registered under its own __name__.  A class also has
    __name__, but no class is in sys.modules under it, so this does not widen
    to non-modules."""

    name = getattr(obj, "__name__", None)
    if name is None:
        return False
    return sys.modules.get(name) is obj


_AUTOSPEC_API = ("assert_called", "assert_not_called", "assert_called_once",
                 "assert_called_with", "assert_called_once_with",
                 "assert_any_call", "reset_mock")


def _autospec_function(mock):
    """``autospec=True`` over a FUNCTION: what CPython's create_autospec
    answers for one -- a real function, so it binds ``self`` exactly as the
    attribute it replaces did (``patch.object(cls, "__eq__", autospec=True,
    wraps=eq)'' in test_xml_etree's equal_wrapper), carrying the mock's
    assertion API and call record.  The mock does the work; ``wraps`` passes
    each call through.

    Not reproduced: CPython also checks each call against the original's
    signature, raising TypeError for a call the real function would refuse.
    """
    def autospecced(*args, **kw):
        try:
            return mock(*args, **kw)
        finally:
            autospecced.called = mock.called
            autospecced.call_count = mock.call_count
            autospecced.call_args = mock.call_args
            autospecced.call_args_list = mock.call_args_list

    for name in _AUTOSPEC_API:
        setattr(autospecced, name, getattr(mock, name))
    autospecced.mock = mock
    autospecced.called = False
    autospecced.call_count = 0
    autospecced.call_args = None
    autospecced.call_args_list = []
    return autospecced


class _Patcher:
    def __init__(self, target_obj, attribute, new, kwargs=None):
        self._target_obj = target_obj
        self._attribute = attribute
        self._new = new
        # Trailing keywords configure the Mock that stands in when ``new`` was
        # not given (``patch.object(s, 'f', wraps=s.f)``).  CPython rejects them
        # alongside an explicit ``new``, since there would be nothing to
        # configure; so does this, at __enter__ time where the error is
        # attributable to the with-statement.
        self._kwargs = kwargs or {}
        self._old = None
        self._created = False

    def __enter__(self):
        try:
            self._old = getattr(self._target_obj, self._attribute)
        except AttributeError:
            # A BUILTIN name on a MODULE is patchable even though the module
            # does not define it -- CPython's _patch.get_original sets
            # create=True for exactly this case (`if name in _builtins and
            # isinstance(target, ModuleType)`), because shadowing a builtin per
            # module is a real thing to want to test.  test_super's
            # test_shadowed_dynamic patches `<module>.super`, which no module
            # binds; without this, `patch` raised AttributeError before the
            # test could run at all.
            #
            # Anything else missing stays an error: patching a name that is
            # neither defined nor a builtin is a typo, and CPython reports it.
            if not (_is_module(self._target_obj)
                    and hasattr(builtins, self._attribute)):
                raise
            self._created = True
        replacement = self._new
        kwargs = dict(self._kwargs)
        autospec = kwargs.pop("autospec", None)
        if replacement is DEFAULT:
            replacement = MagicMock(name=self._attribute, **kwargs)
            if autospec:
                spec = self._old if autospec is True else autospec
                if callable(spec) and not isinstance(spec, type):
                    replacement = _autospec_function(replacement)
        elif self._kwargs:
            raise TypeError(
                "Cannot use 'new' and configuration keywords together")
        setattr(self._target_obj, self._attribute, replacement)
        return replacement

    def __exit__(self, exc_type, exc_value, tb):
        # A name we CREATED has to be removed again, not set back to None:
        # leaving `super = None` on the module would shadow the builtin for
        # every later test in the file.
        if self._created:
            try:
                delattr(self._target_obj, self._attribute)
            except AttributeError:
                pass
        else:
            setattr(self._target_obj, self._attribute, self._old)
        return False

    def start(self):
        return self.__enter__()

    def stop(self):
        return self.__exit__(None, None, None)

    def __call__(self, func):
        """``@patch(...)`` as a DECORATOR.

        Previously unsupported, and the way it failed was silent: applied to a
        method in a class body, Grail drops a decorator whose application
        raises, so the test ran with nothing patched instead of reporting it.

        Stacking APPENDS to one wrapper rather than nesting wrappers, which is
        what CPython does and is the only way to get the documented argument
        order.  Decorators apply bottom-up, and the mocks arrive in that same
        order, so

            @patch("m.a")
            @patch("m.b")
            def test(self, mock_b, mock_a): ...

        Nesting a wrapper per decorator would hand them over top-down instead.

        A FRESH patcher per call: the decorated function may be called more
        than once (a subTest loop, a retry), and one patcher instance keeps a
        single ``_old'' slot, so reuse would restore the wrong value.
        """
        if isinstance(func, type):
            raise TypeError(
                "patch() as a class decorator is not supported in Grail; "
                "decorate the individual test methods")
        if hasattr(func, "patchings"):
            func.patchings.append(self)
            return func

        def wrapper(*args, **kwargs):
            extra = []
            entered = []
            try:
                for p in wrapper.patchings:
                    fresh = _Patcher(p._target_obj, p._attribute, p._new,
                                     p._kwargs)
                    mocked = fresh.__enter__()
                    entered.append(fresh)
                    if p._new is DEFAULT:
                        extra.append(mocked)
                return func(*(tuple(args) + tuple(extra)), **kwargs)
            finally:
                for fresh in reversed(entered):
                    fresh.__exit__(None, None, None)

        wrapper.patchings = [self]
        wrapper.__name__ = getattr(func, "__name__", "wrapper")
        wrapper.__doc__ = getattr(func, "__doc__", None)
        wrapper.__wrapped__ = func
        return wrapper


def _resolve_patch_target(target):
    """Split ``pkg.mod.Class.attr`` into (owning object, attribute name).

    Everything before the last dot used to be treated as a MODULE path and
    handed straight to import_module, so any target naming an attribute OF A
    CLASS failed -- ``patch("_markupbase.ParserBase.reset")`` tried to import a
    module called ``_markupbase.ParserBase`` and raised ModuleNotFoundError.

    CPython imports what it can and walks the rest with getattr.  This takes
    the LONGEST IMPORTABLE PREFIX and then walks, which agrees with it on every
    shape that resolves at all and is simpler than replaying the interleaved
    import/getattr loop.
    """
    idx = target.rfind(".")
    if idx < 0:
        raise TypeError("Need a valid target to patch. You supplied: "
                        + repr(target))
    prefix, attribute = target[:idx], target[idx + 1:]
    parts = prefix.split(".")
    obj = None
    n = len(parts)
    while n > 0:
        try:
            obj = importlib.import_module(".".join(parts[:n]))
            break
        except ImportError:
            n -= 1
    if obj is None:
        raise TypeError("Need a valid target to patch. You supplied: "
                        + repr(target))
    for comp in parts[n:]:
        obj = getattr(obj, comp)
    return obj, attribute


def patch(target, new=DEFAULT, **kwargs):
    """patch("pkg.module.attr") - usable as a context manager OR as a
    decorator, as in CPython."""
    target_obj, attribute = _resolve_patch_target(target)
    return _Patcher(target_obj, attribute, new, kwargs)


def patch_object(target_obj, attribute, new=DEFAULT, **kwargs):
    """patch.object(obj, "attr") equivalent."""
    return _Patcher(target_obj, attribute, new, kwargs)


patch.object = patch_object


def _to_stream(read_data):
    if isinstance(read_data, bytes):
        import io
        return io.BytesIO(read_data)
    import io
    return io.StringIO(read_data)


def mock_open(mock=None, read_data=''):
    """A mock to replace ``open``, as CPython's ``unittest.mock.mock_open``.

    Calling the result answers a file-handle mock whose ``read``,
    ``readline``, ``readlines``, iteration and ``with`` block serve
    ``read_data``, and which records every call -- ``write``, ``close`` --
    for the assertions afterwards.  Each call of the open mock rewinds the
    data, as upstream's does.

    Adapted to this module's Mock rather than transcribed: a side_effect here
    must be CALLABLE (upstream also takes an iterator), and a magic method is
    configured by assigning a callable to it (upstream reads
    ``handle.__enter__.return_value``), so both are spelled that way.  The
    behaviour -- what each read answers, and that the data is shared between
    them and reset per open() -- is upstream's.

    ITERATING the handle does not work yet, and not because of this
    function: a magic method configured on a Mock here does not reach
    ``iter()`` or ``len()`` at all (``len(m)`` answers the configured
    function rather than calling it).  ``__iter__`` is configured anyway, so
    ``for line in handle`` starts working when Mock's magic methods do."""
    state = {'data': _to_stream(read_data)}

    def _read(*args, **kwargs):
        return state['data'].read(*args, **kwargs)

    def _readline(*args, **kwargs):
        return state['data'].readline(*args, **kwargs)

    def _readlines(*args, **kwargs):
        return state['data'].readlines(*args, **kwargs)

    def _iter(*args):
        return iter(state['data'].readline, state['data'].read(0))

    def _next(*args):
        line = state['data'].readline()
        if not line:
            raise StopIteration
        return line

    if mock is None:
        mock = MagicMock(name='open')
    handle = MagicMock(name='open()')
    handle.__enter__ = Mock(return_value=handle)
    handle.__exit__ = Mock(return_value=False)
    handle.__iter__ = Mock(side_effect=_iter)
    handle.__next__ = Mock(side_effect=_next)
    handle.write.return_value = None
    handle.read.side_effect = _read
    handle.readline.side_effect = _readline
    handle.readlines.side_effect = _readlines

    def reset_data(*args, **kwargs):
        state['data'] = _to_stream(read_data)
        return DEFAULT

    mock.side_effect = reset_data
    mock.return_value = handle
    return mock


def _register_as_unittest_mock():
    """Make this module ``unittest.mock`` as well, both ways the name is
    reached: the sys.modules entry, and -- when unittest is already imported
    -- the package's ``mock`` attribute, which is what an import of the
    submodule would have set.  Without the attribute, ``import unittest;
    import mock; from unittest import mock`` raised ``'unittest' object has
    no attribute 'mock'``: CPython's from-import falls back to
    sys.modules['unittest.mock'] for exactly this case, and Grail's does not.
    Order-dependent, so it surfaced only in a SUnit shard that had imported
    unittest first."""
    try:
        import sys
        mods = sys.modules
        mods["unittest.mock"] = mods["mock"]
        package = mods.get("unittest")
        if package is not None:
            setattr(package, "mock", mods["mock"])
    except Exception:
        pass


_register_as_unittest_mock()
