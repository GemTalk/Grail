"""Fixture: method-local classes whose helper is BUILT THROUGH IR (plan P3.2).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.2 that helper is built through
IR (ClassBuildIREmitter) for a declarative body, and the class's decorators,
bases and keywords are evaluated by the CALLER, in the enclosing frame, in
CPython's ``__build_class__`` order.  Each check here is one observable
consequence of that, and every expectation is CPython 3.14's, verified by
running this file directly.

* ``header_order``: decorators are evaluated first, top to bottom, then the
  bases, then the keywords; then the metaclass runs, then the decorators are
  applied bottom-up.  Grail's text evaluated each decorator just before
  applying it, after the body and the metaclass.
* ``decorator_call_lines``: inside a class decorator, the caller's f_lineno is
  the decorator's own line (#1518) -- including the OUTER of two stacked
  decorators.
* ``build_error_frames``: an error raised while the class is BUILT (here, an
  int as a base) is reported against the enclosing def's ``class`` line only;
  the class body has no frame there, in CPython or in Grail.
* ``init_subclass_caller``: the same holds for the live stack.  Inside an
  ``__init_subclass__`` run by a method-local class statement, the caller's
  caller is the def holding the statement.  The IR helper used to show up there
  as a frame with no filename (warnings.warn blamed it: test_warnings
  DeprecatedTests).
* the rest: ordinary declarative bodies -- bases from the enclosing scope,
  captured parameters, a docstring, constant attributes and defaults,
  ``__slots__``, a starred base, ``__init_subclass__`` keywords -- answer as
  CPython does.
"""

import sys
import traceback

r = {}
order = []
lines = []


def note(tag, value):
    order.append(tag)
    return value


def deco(tag):
    order.append('make ' + tag)

    def apply(cls):
        order.append('apply %s %s' % (tag, cls.__name__))
        cls.tag = tag
        return cls
    return apply


def where(cls):
    lines.append(sys._getframe(1).f_lineno)
    return cls


class Meta(type):
    def __new__(mcls, name, bases, ns, **kw):
        order.append('meta %s %s' % (name, sorted(kw)))
        return super().__new__(mcls, name, bases, ns)


def header_order():
    @deco('outer')
    @deco('inner')
    class C(note('base', object), metaclass=note('metaclass', Meta),
            flag=note('flag', True)):
        def m(self):
            return 'm'
    return C.tag, C().m(), type(C).__name__, list(order)


BASE = sys._getframe().f_lineno


def decorator_lines():
    @where                               # BASE + 4
    @where                               # BASE + 5
    class D:
        def m(self):
            return 1
    return [n - BASE for n in lines]


def build_error_frames():
    try:
        class G(1):
            pass
    except TypeError as e:
        return [(fs.name, fs.line) for fs in traceback.extract_tb(e.__traceback__)]
    return 'no raise'


def _caller_of_caller():
    f = sys._getframe(2)
    return f.f_code.co_name, f.f_lineno - BASE


class _Watched:
    def __init_subclass__(cls, **kw):
        _Watched.seen = _caller_of_caller()


def init_subclass_caller():
    class Sub(_Watched):                 # BASE + 32
        pass
    return _Watched.seen


def plain_body(b):
    class B(b):
        "doc of B"
        x = 1
        y = 'two'

        def m(self, k=3, *, kw=None):
            return (self.x, self.y, k, kw)
    return B.__qualname__, B.__doc__, B().m(), B().m(4, kw=5), B.__mro__[1].__name__


def captures(n):
    class E:
        def get(self):
            return n

        def me(self):
            return E
    return E().get(), E().me() is E


def exception_class():
    class Boom(Exception):
        pass
    try:
        raise Boom('x')
    except Boom as e:
        return repr(e), Boom.__qualname__


def slots():
    class S:
        __slots__ = 'a'

        def __init__(self):
            self.a = 5
    return S().a, S.__slots__


def starred_base(bases):
    class Star(*bases):
        pass
    return [c.__name__ for c in Star.__mro__]


def init_subclass_keywords():
    seen = []

    class K:
        def __init_subclass__(cls, **kw):
            seen.append((cls.__name__, kw))

    class K2(K, color='red'):
        pass
    return seen


class Host:
    def meth(self):
        class H:
            def who(self):
                return 'H'
        return H().who(), H.__qualname__


r['header_order'] = header_order()
r['decorator_call_lines'] = decorator_lines()
r['build_error_frames'] = build_error_frames()
r['init_subclass_caller'] = init_subclass_caller()
r['plain_body'] = plain_body(object)
r['captures'] = captures(7)
r['exception_class'] = exception_class()
r['slots'] = slots()
r['starred_base'] = starred_base((int,))
r['init_subclass_keywords'] = init_subclass_keywords()
r['class_in_a_method'] = Host().meth()


EXPECTED = {
    'header_order': ('outer', 'm', 'Meta',
                     ['make outer', 'make inner', 'base', 'metaclass', 'flag',
                      "meta C ['flag']", 'apply inner C', 'apply outer C']),
    'decorator_call_lines': [5, 4],
    'build_error_frames': [('build_error_frames', 'class G(1):')],
    'init_subclass_caller': ('init_subclass_caller', 32),
    'plain_body': ('plain_body.<locals>.B', 'doc of B', (1, 'two', 3, None),
                   (1, 'two', 4, 5), 'object'),
    'captures': (7, True),
    'exception_class': ("Boom('x')", 'exception_class.<locals>.Boom'),
    'slots': (5, 'a'),
    'starred_base': ['Star', 'int', 'object'],
    'init_subclass_keywords': [('K2', {'color': 'red'})],
    'class_in_a_method': ('H', 'Host.meth.<locals>.H'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
