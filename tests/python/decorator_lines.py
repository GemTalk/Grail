"""Fixture: a decorator runs at its OWN line, and a decorated def's code
object starts at the first decorator (#1406).

CPython reports the line of the decorator being made or called -- in a
traceback through it, and as the caller's f_lineno inside it -- and gives a
decorated def ``co_firstlineno`` = its first decorator's line, which is where
inspect.getsource() starts.  Grail used the def (or class) line for all of
it, and inside a class body the CLASS line.

Every check is verified against CPython by running the file directly.  Line
numbers are taken relative to a marker line so the checks survive edits.
"""

import sys
import traceback

r = {}
seen = []


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = 'unexpected %s: %s' % (type(exc).__name__, exc)


def where(x):
    seen.append(sys._getframe(1).f_lineno)
    return x


def quiet(x):
    return x


def boom(x):
    raise ValueError('boom')


def make_boom():
    raise ValueError('making the decorator')


def tb_lines(exc):
    return [fs.lineno for fs in traceback.extract_tb(exc.__traceback__)]


BASE = sys._getframe().f_lineno


@where                                   # BASE + 3
def module_def(): pass


@where                                   # BASE + 7
@where                                   # BASE + 8
def stacked(): pass


@where                                   # BASE + 12
@where                                   # BASE + 13
class StackedClass:
    @where                               # BASE + 15
    def method(self): pass

    @staticmethod
    @where                               # BASE + 19
    def static(): pass

    @where                               # BASE + 22
    @classmethod
    def klass(cls): pass

    @property
    @where                               # BASE + 27
    def prop(self): return 1


def in_function():
    @where                               # BASE + 32
    def inner(): pass

    # A class inside a function: its decorators run in a compiled helper
    # whose frame reports no usable line on the IR arm (on main as well),
    # so only its code object's first line is checked here.
    @quiet                               # BASE + 38
    class Local:
        @quiet                           # BASE + 40
        def m(self): pass
    return inner, Local


_inner, _Local = in_function()


def raising_decorator_call():
    try:
        @boom                            # BASE + 47
        def g(): pass
    except ValueError as e:
        return tb_lines(e)


def raising_decorator_expression():
    try:
        @make_boom()                     # BASE + 55
        def g(): pass
    except ValueError as e:
        return tb_lines(e)


# At module level, so the class is built in the module body on both arms
# (inside a function the IR arm builds it in a helper, as above).
try:
    class K:
        @boom                            # BASE + 64
        def m(self): pass
except ValueError as _e:
    _class_body_lines = tb_lines(_e)


def rel(lines):
    return [n - BASE if isinstance(n, int) else n for n in lines]


r['decorator_call_lines'] = rel(seen)
record('module_def_firstlineno', lambda: module_def.__code__.co_firstlineno - BASE)
record('stacked_firstlineno', lambda: stacked.__code__.co_firstlineno - BASE)
record('method_firstlineno',
       lambda: StackedClass.method.__code__.co_firstlineno - BASE)
record('nested_firstlineno', lambda: _inner.__code__.co_firstlineno - BASE)
record('local_class_method_firstlineno',
       lambda: _Local.m.__code__.co_firstlineno - BASE)
record('undecorated_firstlineno',
       lambda: tb_lines.__code__.co_firstlineno - BASE)
record('raising_decorator_call', lambda: rel(raising_decorator_call()))
record('raising_decorator_expression',
       lambda: rel(raising_decorator_expression()))
# Only the innermost two lines: CPython also has a frame for the class body
# itself, which Grail does not (the body runs in its enclosing frame).
record('raising_class_body_decorator', lambda: rel(_class_body_lines)[-2:])
record('decorated_objects_still_work', lambda: (
    StackedClass.static(), StackedClass.klass() is None, StackedClass().prop,
    type(StackedClass.__dict__['klass']).__name__))

EXPECTED = {'decorated_objects_still_work': (None, True, 1, 'classmethod'),
 'decorator_call_lines': [3, 8, 7, 15, 19, 22, 27, 13, 12, 32],
 'local_class_method_firstlineno': 40,
 'method_firstlineno': 15,
 'module_def_firstlineno': 3,
 'nested_firstlineno': 32,
 'raising_class_body_decorator': [68, -11],
 'raising_decorator_call': [50, -11],
 'raising_decorator_expression': [58, -7],
 'stacked_firstlineno': 7,
 'undecorated_firstlineno': -4}

KEYS = sorted(r)

if __name__ == '__main__':
    for key in KEYS:
        ok = EXPECTED is not None and r[key] == EXPECTED.get(key)
        print('%-5s %-38s -> %r' % ('OK' if ok else 'FAIL', key, r[key]))
