"""A class built by type(name, bases, ns) overrides its builtin base (#1526).

``type('T', (datetime.tzinfo,), {'utcoffset': f})`` -- or the same class built
by six.add_metaclass, which calls the metaclass with the class's namespace --
must answer ``f`` wherever the base's method would have run.  Grail found it
for an attribute read (``t.utcoffset(None)``) but not when its own builtin
implementation called the method: ``datetime.isoformat()`` ran tzinfo's
default and raised ``tzinfo subclass must override utcoffset()``.  Every
python-dateutil tz class is built that way.

A class statement compiles each def to a method and installs a forwarder for
any callable it ASSIGNS; type() stores the whole namespace as attributes and
installed none.  The rows check the dateutil case both ways, protocol
overrides on tuple, list and dict bases, namedtuple (the commonest type()
user) as a guard, and the class statement as the control.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import collections
import datetime

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


ONE_HOUR = datetime.timedelta(hours=1)
STAMP = datetime.datetime(2026, 10, 12, 12, 0)


def _utcoffset(self, dt):
    return ONE_HOUR


def _tzname(self, dt):
    return 'ONE'


def _dst(self, dt):
    return datetime.timedelta(0)


TypeBuilt = type('TypeBuilt', (datetime.tzinfo,),
                 {'utcoffset': _utcoffset, 'tzname': _tzname, 'dst': _dst})


def add_metaclass(metaclass):
    def wrapper(cls):
        ns = cls.__dict__.copy()
        ns.pop('__dict__', None)
        ns.pop('__weakref__', None)
        return metaclass(cls.__name__, cls.__bases__, ns)
    return wrapper


class Singleton(type):
    pass


@add_metaclass(Singleton)
class SixBuilt(datetime.tzinfo):
    def utcoffset(self, dt):
        return ONE_HOUR

    def tzname(self, dt):
        return 'SIX'

    def dst(self, dt):
        return datetime.timedelta(0)


class Statement(datetime.tzinfo):
    def utcoffset(self, dt):
        return ONE_HOUR

    def tzname(self, dt):
        return 'STMT'

    def dst(self, dt):
        return datetime.timedelta(0)


ReprTuple = type('ReprTuple', (tuple,), {'__repr__': lambda self: 'ReprTuple!'})
LenList = type('LenList', (list,), {'__len__': lambda self: 42})
MissingDict = type('MissingDict', (dict,), {'__missing__': lambda self, k: k * 2})
Plain = type('Plain', (tuple,), {})
Point = collections.namedtuple('Point', 'x y')

t('type(): the attribute route', lambda: TypeBuilt().utcoffset(None))
t('type(): isoformat uses the override', lambda: STAMP.replace(tzinfo=TypeBuilt()).isoformat())
t('type(): utcoffset() uses the override', lambda: STAMP.replace(tzinfo=TypeBuilt()).utcoffset())
t('type(): tzname() uses the override', lambda: STAMP.replace(tzinfo=TypeBuilt()).tzname())
t('six-built: isoformat uses the override', lambda: STAMP.replace(tzinfo=SixBuilt()).isoformat())
t('six-built: tzname() uses the override', lambda: STAMP.replace(tzinfo=SixBuilt()).tzname())
t('six-built: astimezone converts', lambda: STAMP.replace(tzinfo=SixBuilt()).astimezone(datetime.timezone.utc).isoformat())
t('class statement (control)', lambda: STAMP.replace(tzinfo=Statement()).isoformat())
t('tuple base: repr()', lambda: repr(ReprTuple((1, 2))))
t('list base: len()', lambda: len(LenList([1])))
t('dict base: __missing__', lambda: MissingDict()['ab'])
t('no override: the base still answers', lambda: repr(Plain((1, 2))))
t('namedtuple: repr', lambda: repr(Point(1, 2)))
t('namedtuple: _replace and _asdict', lambda: (Point(1, 2)._replace(x=3), Point(1, 2)._asdict()))


EXPECTED = {
    'type(): the attribute route': 'datetime.timedelta(seconds=3600)',
    'type(): isoformat uses the override': "'2026-10-12T12:00:00+01:00'",
    'type(): utcoffset() uses the override': 'datetime.timedelta(seconds=3600)',
    'type(): tzname() uses the override': "'ONE'",
    'six-built: isoformat uses the override': "'2026-10-12T12:00:00+01:00'",
    'six-built: tzname() uses the override': "'SIX'",
    'six-built: astimezone converts': "'2026-10-12T11:00:00+00:00'",
    'class statement (control)': "'2026-10-12T12:00:00+01:00'",
    'tuple base: repr()': "'ReprTuple!'",
    'list base: len()': '42',
    'dict base: __missing__': "'abab'",
    'no override: the base still answers': "'(1, 2)'",
    'namedtuple: repr': "'Point(x=1, y=2)'",
    'namedtuple: _replace and _asdict': "(Point(x=3, y=2), {'x': 1, 'y': 2})",
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
