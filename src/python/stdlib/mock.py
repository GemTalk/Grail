# GRAIL mock - the commonly used core of unittest.mock as a top-level
# module: Mock with call recording / return_value / side_effect /
# auto-created child attributes and the assert_called* family, patch /
# patch.object as context managers, sentinel, call, and DEFAULT.
# Registered under "unittest.mock" too, so both `import mock` and
# `import unittest.mock` work.  Deviations from CPython, kept
# deliberately small for V1:
#   * MagicMock is an alias of Mock - no dunder magic (Grail dispatches
#     dunders through the class, not instance attributes);
#   * patch works as a context manager only (method @-decorators are
#     dropped by Grail), and there is no spec/autospec/wraps;
#   * call sites that Grail compiled as DIRECT module sends
#     (mod.attr(...) with mod+attr statically known) bypass a patched
#     module attribute - read the attribute dynamically (getattr) or
#     patch objects whose attributes dispatch dynamically;
#   * call objects compare by exact (args, kwargs) equality.

import importlib

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


class Mock:
    def __init__(self, return_value=DEFAULT, side_effect=None, name=None):
        self._mock_name = name
        self.side_effect = side_effect
        self._mock_children = {}
        self.call_args_list = []
        self.call_count = 0
        self.called = False
        self.call_args = None
        if return_value is not DEFAULT:
            self.return_value = return_value

    def __getattr__(self, name):
        if name.startswith("_") or name == "side_effect":
            raise AttributeError(name)
        if name == "return_value":
            # Implicit return value: a child Mock, created lazily and
            # stored as a real attribute so user assignment
            # (m.return_value = x) and this default share one slot.
            rv = Mock(name=self._mock_label() + "()")
            self.return_value = rv
            return rv
        children = self._mock_children
        if name not in children:
            child_name = name
            if self._mock_name is not None:
                child_name = self._mock_name + "." + name
            children[name] = Mock(name=child_name)
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


class _Patcher:
    def __init__(self, target_obj, attribute, new):
        self._target_obj = target_obj
        self._attribute = attribute
        self._new = new
        self._old = None

    def __enter__(self):
        self._old = getattr(self._target_obj, self._attribute)
        replacement = self._new
        if replacement is DEFAULT:
            replacement = Mock(name=self._attribute)
        setattr(self._target_obj, self._attribute, replacement)
        return replacement

    def __exit__(self, exc_type, exc_value, tb):
        setattr(self._target_obj, self._attribute, self._old)
        return False

    def start(self):
        return self.__enter__()

    def stop(self):
        return self.__exit__(None, None, None)


def patch(target, new=DEFAULT):
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
    return _Patcher(module, attribute, new)


def patch_object(target_obj, attribute, new=DEFAULT):
    """patch.object(obj, "attr") equivalent."""
    return _Patcher(target_obj, attribute, new)


patch.object = patch_object


def _register_as_unittest_mock():
    try:
        import sys
        mods = sys.modules
        mods["unittest.mock"] = mods["mock"]
    except Exception:
        pass


_register_as_unittest_mock()
