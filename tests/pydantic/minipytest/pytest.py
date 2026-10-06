"""A small stand-in for pytest, enough to run a slice of pydantic's own tests
under Grail (docs/Support_Pydantic.md, Phase 6).

Real pytest does not import in Grail yet (it reaches importlib.machinery's
PathFinder for assertion rewriting).  This module provides the surface
pydantic's tests use -- raises, warns, mark.parametrize / skip / skipif /
xfail, param, fixture, approx, skip, fail, importorskip -- and nothing else.
tests/pydantic/run_pydantic_tests.py collects and runs tests with it, and is
run under CPython too, so the two sides are compared like for like.
"""

import math
import re
import warnings as _warnings

__version__ = '0-grail-minipytest'


class Skipped(Exception):
    pass


class Failed(AssertionError):
    pass


class XFailed(Exception):
    pass


def skip(reason='', allow_module_level=False):
    raise Skipped(reason)


def fail(reason='', pytrace=True):
    raise Failed(reason)


def xfail(reason=''):
    raise XFailed(reason)


def importorskip(modname, minversion=None, reason=None):
    try:
        return __import__(modname, fromlist=['_'])
    except ImportError:
        raise Skipped(reason or f'could not import {modname!r}')


# -- raises / warns -------------------------------------------------------------

class ExceptionInfo:
    def __init__(self):
        self.type = None
        self.value = None
        self.tb = None

    def match(self, regexp):
        assert re.search(regexp, str(self.value)), f'{regexp!r} not found in {str(self.value)!r}'
        return True

    def errisinstance(self, exc):
        return isinstance(self.value, exc)


class _Raises:
    def __init__(self, expected, match=None):
        self.expected = expected
        self.match_expr = match
        self.info = ExceptionInfo()

    def __enter__(self):
        return self.info

    def __exit__(self, et, ev, tb):
        if et is None:
            raise Failed(f'DID NOT RAISE {self.expected}')
        if not issubclass(et, self.expected):
            return False
        self.info.type, self.info.value, self.info.tb = et, ev, tb
        if self.match_expr is not None and not re.search(self.match_expr, str(ev)):
            raise Failed(f'Regex pattern {self.match_expr!r} did not match {str(ev)!r}')
        return True


def raises(expected, *args, match=None, **kwargs):
    if args:
        func, *rest = args
        ctx = _Raises(expected, match)
        with ctx:
            func(*rest, **kwargs)
        return ctx.info
    return _Raises(expected, match)


class WarningsRecorder(list):
    def pop(self, cls=Warning):
        for i, w in enumerate(self):
            if issubclass(w.category, cls):
                return list.pop(self, i)
        raise AssertionError(f'{cls!r} not found in warning list')


class _Warns:
    def __init__(self, expected, match=None):
        self.expected = expected
        self.match_expr = match
        self.record = WarningsRecorder()

    def __enter__(self):
        self._cm = _warnings.catch_warnings(record=True)
        self._log = self._cm.__enter__()
        _warnings.simplefilter('always')
        return self.record

    def __exit__(self, et, ev, tb):
        self._cm.__exit__(et, ev, tb)
        self.record.extend(self._log)
        if et is not None:
            return False
        if self.expected is None:
            return False
        hits = [w for w in self.record if issubclass(w.category, self.expected)
                and (self.match_expr is None or re.search(self.match_expr, str(w.message)))]
        if not hits:
            raise Failed(f'DID NOT WARN {self.expected} matching {self.match_expr!r}; got '
                         f'{[str(w.message) for w in self.record]}')
        return False


def warns(expected=Warning, *args, match=None, **kwargs):
    if args:
        func, *rest = args
        with _Warns(expected, match):
            return func(*rest, **kwargs)
    return _Warns(expected, match)


def deprecated_call(func=None, *args, **kwargs):
    return warns((DeprecationWarning, PendingDeprecationWarning), func, *args, **kwargs) if func \
        else warns((DeprecationWarning, PendingDeprecationWarning))


# -- approx -----------------------------------------------------------------------

class _Approx:
    def __init__(self, expected, rel=None, abs=None):
        self.expected, self.rel, self.abs = expected, rel, abs

    def _close(self, a, b):
        rel = 1e-6 if self.rel is None else self.rel
        ab = 1e-12 if self.abs is None else self.abs
        return a == b or math.isclose(a, b, rel_tol=rel, abs_tol=ab)

    def __eq__(self, other):
        e = self.expected
        if isinstance(e, (list, tuple)):
            return len(e) == len(other) and all(self._close(x, y) for x, y in zip(other, e))
        if isinstance(e, dict):
            return e.keys() == other.keys() and all(self._close(other[k], e[k]) for k in e)
        return self._close(other, e)

    def __repr__(self):
        return f'approx({self.expected!r})'


def approx(expected, rel=None, abs=None, nan_ok=False):
    return _Approx(expected, rel, abs)


# -- marks, param, fixture ------------------------------------------------------------

def _attach(target, m):
    marks = list(getattr(target, 'pytestmark', []) or [])
    marks.append(m)
    target.pytestmark = marks
    return target


class Mark:
    """``pytest.mark.<name>``.  Bare and applied to a function or class, it
    decorates; called with arguments it answers a BOUND mark that decorates."""

    def __init__(self, name, args=(), kwargs=None, bound=False):
        self.name, self.args, self.kwargs, self.bound = name, args, kwargs or {}, bound

    def __call__(self, *args, **kwargs):
        if self.bound:
            return _attach(args[0], self)
        if len(args) == 1 and not kwargs and (isinstance(args[0], type) or callable(args[0])) \
                and not isinstance(args[0], str):
            return _attach(args[0], Mark(self.name, (), {}, True))
        return Mark(self.name, args, kwargs, True)

    def __repr__(self):
        return f'Mark({self.name!r}, {self.args!r}, {self.kwargs!r})'


class _MarkGenerator:
    def __getattr__(self, name):
        if name.startswith('__'):
            raise AttributeError(name)
        return Mark(name)


mark = _MarkGenerator()


class ParameterSet:
    def __init__(self, values, marks=(), id=None):
        self.values, self.marks, self.id = values, marks, id


def param(*values, marks=(), id=None):
    if isinstance(marks, Mark):
        marks = (marks,)
    return ParameterSet(values, tuple(marks), id)


class FixtureDef:
    def __init__(self, func, scope='function', autouse=False, params=None, name=None):
        self.func, self.scope, self.autouse, self.params = func, scope, autouse, params
        self.name = name or func.__name__


def fixture(func=None, *, scope='function', autouse=False, params=None, name=None, ids=None):
    def wrap(f):
        f.__grail_fixture__ = FixtureDef(f, scope, autouse, params, name)
        return f
    return wrap(func) if func is not None else wrap


class MonkeyPatch:
    def __init__(self):
        self._undo = []

    def setattr(self, target, name, value=None, raising=True):
        if value is None and isinstance(target, str):
            mod, _, attr = target.rpartition('.')
            target, name, value = __import__(mod, fromlist=['_']), attr, name
        old = getattr(target, name, _MISSING)
        self._undo.append((target, name, old))
        setattr(target, name, value)

    def delattr(self, target, name, raising=True):
        old = getattr(target, name, _MISSING)
        if old is _MISSING:
            if raising:
                raise AttributeError(name)
            return
        self._undo.append((target, name, old))
        delattr(target, name)

    def setitem(self, d, key, value):
        self._undo.append((d, key, d.get(key, _MISSING), 'item'))
        d[key] = value

    def setenv(self, name, value, prepend=None):
        import os
        self.setitem(os.environ, name, str(value))

    def delenv(self, name, raising=True):
        import os
        if name in os.environ:
            self._undo.append((os.environ, name, os.environ[name], 'item'))
            del os.environ[name]

    def undo(self):
        for entry in reversed(self._undo):
            if len(entry) == 4:
                d, key, old, _ = entry
                if old is _MISSING:
                    d.pop(key, None)
                else:
                    d[key] = old
            else:
                target, name, old = entry
                if old is _MISSING:
                    try:
                        delattr(target, name)
                    except AttributeError:
                        pass
                else:
                    setattr(target, name, old)
        self._undo.clear()


_MISSING = object()


class FixtureRequest:
    def __init__(self, node_name, param=None):
        self.node = _Node(node_name)
        self.param = param
        self.config = None


class _Node:
    def __init__(self, name):
        self.name = name

    def get_closest_marker(self, name):
        return None


Parser = object
