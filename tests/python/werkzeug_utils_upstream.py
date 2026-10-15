"""Werkzeug's own utils.py, and super().__init__ in a property subclass (#1447).

Grail's werkzeug/utils.py was a hand-written stub whose header_property and
environ_property defined neither __get__ nor __set__.  Every header-backed
property of Werkzeug's Request and Response read back as the stub object, and
an assignment such as ``response.location = '/next'`` went to the instance
__dict__ and never became a header.  The stub is now upstream 3.1.5's file.

That exposed a Grail bug of its own.  Upstream's cached_property subclasses
property and calls ``super().__init__(fget)``.  super() searched each MRO
class's OWN methods, and property's __init__ lives on a hidden Smalltalk
superclass that the MRO does not list, so the call reached object's no-op
__init__ and fget stayed None.  The rows below pin that, and guard super()
through other built-ins and cooperative multiple inheritance.

EXPECTED is CPython 3.14's output and the fixture gate checks it.
werkzeug_rows() needs Werkzeug, which the gate's CPython lacks.  Its expected
answers, WERKZEUG_EXPECTED, were measured with Werkzeug 3.1.5 under CPython
3.14.8, and the Smalltalk test case asserts them.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def g(self):
    return 'value'


class NoInit(property):
    pass


class SuperPositional(property):
    def __init__(self, fget):
        super().__init__(fget)


class SuperKeyword(property):
    def __init__(self, fget, doc=None):
        super().__init__(fget, doc=doc)


class ExplicitBase(property):
    def __init__(self, fget):
        property.__init__(self, fget)


class CachedLike(property):
    """Upstream werkzeug.utils.cached_property's shape."""

    def __init__(self, fget, name=None, doc=None):
        super().__init__(fget, doc=doc)
        self.__name__ = name or fget.__name__

    def __get__(self, obj, type=None):
        if obj is None:
            return self
        value = obj.__dict__.get(self.__name__, None)
        if value is None:
            value = self.fget(obj)
            obj.__dict__[self.__name__] = value
        return value


def property_row(cls):
    p = cls(g)

    class Holder:
        x = p
    return (p.fget is g, Holder().x)


def cached_like():
    calls = []

    class C:
        @CachedLike
        def p(self):
            calls.append(1)
            return object()
    c = C()
    return (c.p is c.p, len(calls), 'p' in vars(c))


class D(dict):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)


class L(list):
    def __init__(self, it):
        super().__init__(it)


class E(ValueError):
    def __init__(self, msg):
        super().__init__('E: ' + msg)


class N(int):
    def __add__(self, o):
        return ('N', super().__add__(o))


class Base:
    def __init__(self):
        self.order = ['Base']


class Mixin:
    def __init__(self):
        super().__init__()
        self.order.append('Mixin')


class Both(Mixin, Base):
    def __init__(self):
        super().__init__()
        self.order.append('Both')


for cls in (NoInit, SuperPositional, SuperKeyword, ExplicitBase):
    t('property subclass: %s' % cls.__name__, lambda cls=cls: property_row(cls))
t('cached_property shape caches', cached_like)
t('guard: dict subclass super().__init__', lambda: D(a=1))
t('guard: list subclass super().__init__', lambda: L((1, 2)))
t('guard: exception subclass super().__init__', lambda: E('x').args)
t('guard: int subclass super().__add__', lambda: N(2) + 3)
t('guard: cooperative mixin order', lambda: Both().order)


def werkzeug_rows():
    """Grail-only here: Werkzeug's Request and Response properties."""
    import datetime as dt
    from werkzeug.test import EnvironBuilder
    from werkzeug.utils import cached_property, header_property, import_string
    from werkzeug.utils import redirect, secure_filename
    from werkzeug.wrappers import Request, Response

    out = {}
    env = EnvironBuilder(method='POST', data='a=1',
                         content_type='application/x-www-form-urlencoded',
                         headers={'Referer': 'http://x/', 'Origin': 'http://o'},
                         environ_base={'REMOTE_USER': 'bob'}).get_environ()
    q = Request(env)
    out['request headers'] = repr((q.content_type, q.referrer, q.origin, q.remote_user))
    bare = Request(EnvironBuilder().get_environ())
    out['request headers unset'] = repr((bare.referrer, bare.origin, bare.remote_user))
    out['request form'] = repr((q.form['a'], q.mimetype, q.content_length))
    resp = Response('hi', mimetype='text/html')
    out['response before'] = repr((resp.location, resp.content_type, resp.content_length))
    resp.location = '/next'
    resp.content_type = 'application/json'
    out['response headers after assignment'] = repr(list(resp.headers.items()))
    out['assignment did not go to __dict__'] = repr('location' in vars(resp))
    r2 = Response('x')
    r2.expires = dt.datetime(2026, 10, 5, 12, tzinfo=dt.timezone.utc)
    out['datetime header'] = repr(r2.headers.get('Expires'))
    del r2.expires
    out['deleted header'] = repr(r2.headers.get('Expires'))
    out['secure_filename'] = repr(secure_filename('../../etc/pass wd.txt'))
    out['redirect'] = repr((redirect('/x').status_code, redirect('/x').headers['Location']))
    out['import_string'] = repr(import_string('os.path').__name__)

    class C:
        @cached_property
        def p(self):
            return object()
    c = C()
    out['cached_property caches'] = repr((c.p is c.p, 'p' in vars(c)))
    out['header_property mro'] = repr([k.__name__ for k in header_property.__mro__])
    return out


WERKZEUG_EXPECTED = {
    'request headers': "('application/x-www-form-urlencoded', 'http://x/', 'http://o', 'bob')",
    'request headers unset': '(None, None, None)',
    'request form': "('1', 'application/x-www-form-urlencoded', 3)",
    'response before': "(None, 'text/html; charset=utf-8', 2)",
    'response headers after assignment': "[('Content-Type', 'application/json'), ('Content-Length', '2'), ('Location', '/next')]",
    'assignment did not go to __dict__': 'False',
    'datetime header': "'Mon, 05 Oct 2026 12:00:00 GMT'",
    'deleted header': 'None',
    'secure_filename': "'etc_pass_wd.txt'",
    'redirect': "(302, '/x')",
    'import_string': "'posixpath'",
    'cached_property caches': '(True, True)',
    'header_property mro': "['header_property', '_DictAccessorProperty', 'Generic', 'object']",
}


EXPECTED = {
    'property subclass: NoInit': "(True, 'value')",
    'property subclass: SuperPositional': "(True, 'value')",
    'property subclass: SuperKeyword': "(True, 'value')",
    'property subclass: ExplicitBase': "(True, 'value')",
    'cached_property shape caches': '(True, 1, True)',
    'guard: dict subclass super().__init__': "{'a': 1}",
    'guard: list subclass super().__init__': '[1, 2]',
    'guard: exception subclass super().__init__': "('E: x',)",
    'guard: int subclass super().__add__': "('N', 5)",
    'guard: cooperative mixin order': "['Base', 'Mixin', 'Both']",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


def werkzeug_mismatches():
    got = werkzeug_rows()
    return ['%s: got %s, Werkzeug 3.1.5 %s' % (k, got.get(k), v)
            for k, v in WERKZEUG_EXPECTED.items() if got.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
