"""A bare ``@cached_property`` caches, as ``@functools.cached_property`` does.

Grail recognised the bare name at parse time and compiled the method as a
property getter paired with a storing setter.  Nothing ever stored on a READ,
so the method ran on every read (#1444): Flask's ``app.jinja_env`` built a new
Jinja Environment, with an empty template cache, on every request.  The bare
name is now an ordinary decorator applied at run time, so whichever
cached_property it names -- functools', Werkzeug's or Django's -- does what it
does in CPython.  ``super().p'' over a parent's cached_property asks the
descriptor too; it answered a bound method around it.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.  flask_rows() is Grail-only (CPython here has no Flask) and
is asserted separately.
"""

import functools
from functools import cached_property

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = type(e).__name__


calls = []


class A:
    @cached_property
    def p(self):
        calls.append('A.p')
        return object()

    def via_self(self):
        return self.p


class Dotted:
    @functools.cached_property
    def p(self):
        return object()


class Base:
    @cached_property
    def p(self):
        return object()


class SubDotted(Base):
    @functools.cached_property
    def p(self):
        return object()


class BaseDotted:
    @functools.cached_property
    def p(self):
        return object()


class SubBare(BaseDotted):
    @cached_property
    def p(self):
        return object()


class SuperChain(Base):
    @cached_property
    def p(self):
        return ('sub', type(super().p).__name__)


def fresh_count():
    del calls[:]
    a = A()
    first = a.p
    second = a.p
    return (first is second, len(calls), 'p' in vars(a))


def assign_then_delete():
    a = A()
    a.p = 5
    got = a.p
    del a.p
    again = a.p
    return (got, type(again).__name__, again is a.p)


def dict_write_first():
    a = A()
    a.__dict__['p'] = 'preset'
    return a.p


t('bare: same object twice, one call, stored', fresh_count)
t('bare: read through self', lambda: (lambda a: a.via_self() is a.p)(A()))
t('bare: class dict holds the descriptor', lambda: type(A.__dict__['p']).__name__)
t('bare: class read answers the descriptor', lambda: (type(A.p).__name__, A.p.attrname, A.p.func.__name__))
t('bare: assignment shadows, del recomputes', assign_then_delete)
t('bare: instance dict written first wins', dict_write_first)
t('dotted: same object twice', lambda: (lambda d: (d.p is d.p, 'p' in vars(d)))(Dotted()))
t('bare base, dotted override', lambda: (lambda s: (s.p is s.p, 'p' in vars(s)))(SubDotted()))
t('dotted base, bare override', lambda: (lambda s: (s.p is s.p, 'p' in vars(s)))(SubBare()))
t('bare override calls super().p', lambda: (lambda s: (s.p, s.p is s.p))(SuperChain()))
t('hasattr does not error', lambda: hasattr(A(), 'p'))
t('getattr with default', lambda: type(getattr(A(), 'p', None)).__name__)


def flask_rows():
    """Grail-only: Werkzeug's and Flask's bare uses of the decorator."""
    import flask
    from werkzeug.utils import cached_property as wcp

    class W:
        @wcp
        def p(self):
            return object()

    w = W()
    app = flask.Flask('bare_cached_property_caches')
    # Registered on one Environment and rendered by another, these were lost.
    app.jinja_env.filters['shout'] = lambda s: s.upper() + '!'
    app.jinja_env.globals['site'] = 'Grail'
    with app.app_context():
        page = flask.render_template_string('{{ "hi"|shout }} {{ site }}')
    return {
        'werkzeug cached_property caches': w.p is w.p,
        'app.jinja_env is app.jinja_env': app.jinja_env is app.jinja_env,
        'app.logger is app.logger': app.logger is app.logger,
        'a filter and a global set on app.jinja_env render': page == 'HI! Grail',
    }


EXPECTED = {
    'bare: same object twice, one call, stored': '(True, 1, True)',
    'bare: read through self': 'True',
    'bare: class dict holds the descriptor': "'cached_property'",
    'bare: class read answers the descriptor': "('cached_property', 'p', 'p')",
    'bare: assignment shadows, del recomputes': "(5, 'object', True)",
    'bare: instance dict written first wins': "'preset'",
    'dotted: same object twice': '(True, True)',
    'bare base, dotted override': '(True, True)',
    'dotted base, bare override': '(True, True)',
    'bare override calls super().p': "(('sub', 'object'), True)",
    'hasattr does not error': 'True',
    'getattr with default': "'object'",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
