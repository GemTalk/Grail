# GRAIL mock - the commonly used core of unittest.mock as a top-level
# module: Mock with call recording / return_value / side_effect /
# auto-created child attributes and the assert_called* family, patch /
# patch.object as context managers, sentinel, call, and DEFAULT.
# Registered under "unittest.mock" too, so both `import mock` and
# `import unittest.mock` work.  Deviations from CPython, kept
# deliberately small for V1:
#   * MagicMock is an alias of Mock, but a magic method CAN be configured
#     (``m.__mul__ = Mock(return_value=15)``): Grail resolves dunders through
#     the CLASS - as CPython does - so the assignment installs a forwarder on
#     a class private to that one mock.  See _install_magic;
#   * patch works as a context manager only (method @-decorators are
#     dropped by Grail), and there is no spec/autospec;
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

__all__ = ["Mock", "MagicMock", "NonCallableMock", "patch", "sentinel",
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
            rv = Mock(name=self._mock_label() + "()")
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
            children[name] = Mock(name=child_name, wraps=wrapped)
        return children[name]

    def _mock_label(self):
        if self._mock_name is None:
            return "mock"
        return self._mock_name

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
        return "<Mock name=" + repr(self._mock_label()) + " id=" + str(id(self)) + ">"

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
MagicMock = Mock


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
        if replacement is DEFAULT:
            replacement = Mock(name=self._attribute, **self._kwargs)
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


def patch(target, new=DEFAULT, **kwargs):
    """patch("pkg.module.attr") - context manager replacing the
    attribute for the duration of the with-block (decorator form is
    not supported in Grail)."""
    idx = target.rfind(".")
    if idx < 0:
        raise TypeError("Need a valid target to patch. You supplied: "
                        + repr(target))
    module_path = target[:idx]
    attribute = target[idx + 1:]
    module = importlib.import_module(module_path)
    return _Patcher(module, attribute, new, kwargs)


def patch_object(target_obj, attribute, new=DEFAULT, **kwargs):
    """patch.object(obj, "attr") equivalent."""
    return _Patcher(target_obj, attribute, new, kwargs)


patch.object = patch_object


def _register_as_unittest_mock():
    try:
        import sys
        mods = sys.modules
        mods["unittest.mock"] = mods["mock"]
    except Exception:
        pass


_register_as_unittest_mock()
