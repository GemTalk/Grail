"""typing.NamedTuple: both spellings must build a REAL tuple subclass.

CPython supports two, and both are in wide use:

    class Foo(NamedTuple):                          # the class statement
        a: int
        b: str = "x"

    Foo = NamedTuple("Foo", [("a", int), ("b", str)])    # functional form

and the functional form is also used AS A BASE -- urllib3's Url is

    class Url(typing.NamedTuple("Url", [("scheme", ...), ...])):
        def __new__(cls, scheme=None, ...): ...

which is what forced this work.  Grail's NamedTuple used to be a plain class,
so the functional call built an INSTANCE and inheriting from it raised
``TypeError: cannot subclass a non-class base (NamedTuple)`` -- the first
error ``import urllib3`` hit.

What has to hold for the result to be a namedtuple and not a lookalike:
isinstance(x, tuple), equality and ordering AGAINST PLAIN TUPLES, hashing that
agrees with the equal tuple, iteration/unpacking, _fields, _field_defaults,
_replace, _asdict, _make.

Every expectation below was checked against CPython 3.14 (scripts/
check_python_fixtures.sh runs this file under CPython on every PR).
"""

import typing
from typing import NamedTuple

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- the class statement

class Point(NamedTuple):
    x: int
    y: str = 'origin'


p = Point(1)

check('class_form_is_a_tuple', lambda: isinstance(p, tuple), True)
check('class_form_fields', lambda: Point._fields, ('x', 'y'))
check('class_form_defaults', lambda: Point._field_defaults, {'y': 'origin'})
check('class_form_default_applied', lambda: p.y, 'origin')
check('class_form_positional', lambda: p.x, 1)
check('class_form_len', lambda: len(p), 2)
check('class_form_iteration', lambda: list(p), [1, 'origin'])
check('class_form_indexing', lambda: (p[0], p[-1]), (1, 'origin'))
check('class_form_equals_plain_tuple', lambda: p == (1, 'origin'), True)
check('class_form_orders_against_tuple', lambda: p < (2, 'a'), True)
check('class_form_hash_matches_tuple',
      lambda: hash(p) == hash((1, 'origin')), True)
check('class_form_repr', lambda: repr(p), "Point(x=1, y='origin')")
check('class_form_asdict', lambda: p._asdict(), {'x': 1, 'y': 'origin'})
check('class_form_replace', lambda: Point(1)._replace(y='z'), Point(1, 'z'))
check('class_form_make', lambda: Point._make([5, 'q']), Point(5, 'q'))
check('class_form_keywords', lambda: Point(x=7, y='k'), Point(7, 'k'))
check('class_form_unpacks', lambda: (lambda a, b: (a, b))(*p), (1, 'origin'))
check('class_form_match_args', lambda: Point.__match_args__, ('x', 'y'))
check('class_form_dict_key', lambda: {p: 'v'}[(1, 'origin')], 'v')
check('class_form_concat_gives_tuple',
      lambda: p + ('extra',), (1, 'origin', 'extra'))
check('class_form_sortable',
      lambda: sorted([Point(2, 'a'), Point(1, 'b')]),
      [Point(1, 'b'), Point(2, 'a')])


def _missing_required():
    try:
        Point()
    except TypeError:
        return 'TypeError'
    return 'no error'


check('class_form_missing_required_raises', _missing_required, 'TypeError')


def _field_is_readonly():
    try:
        p.x = 99
    except AttributeError:
        return 'AttributeError'
    return 'no error'


check('class_form_field_is_readonly', _field_is_readonly, 'AttributeError')


# A class with NO defaults at all -- the shape urllib3's own class-statement
# NamedTuples use (ProxyConfig, PoolKey, RequestHistory).

class Bare(NamedTuple):
    a: int
    b: int
    c: int


check('bare_fields', lambda: Bare._fields, ('a', 'b', 'c'))
check('bare_no_defaults', lambda: Bare._field_defaults, {})
check('bare_values', lambda: tuple(Bare(1, 2, 3)), (1, 2, 3))
check('bare_named_reads', lambda: (Bare(1, 2, 3).a, Bare(1, 2, 3).c), (1, 3))


# Subclassing a NamedTuple class adds behaviour, never fields: CPython keeps
# the parent's layout and ignores anything new the body annotates.

class WithHelper(Point):
    def doubled(self):
        return self.x * 2


check('subclass_keeps_parent_fields', lambda: WithHelper._fields, ('x', 'y'))
check('subclass_keeps_parent_defaults',
      lambda: WithHelper(3).y, 'origin')
check('subclass_helper_runs', lambda: WithHelper(3).doubled(), 6)
check('subclass_is_a_tuple', lambda: isinstance(WithHelper(3), tuple), True)


# ------------------------------------------------- the functional form

Url = typing.NamedTuple('Url', [('scheme', str), ('host', str)])

check('functional_is_a_class', lambda: isinstance(Url, type), True)
check('functional_fields', lambda: Url._fields, ('scheme', 'host'))
check('functional_instance_is_a_tuple',
      lambda: isinstance(Url('http', 'h'), tuple), True)
check('functional_named_reads', lambda: Url('http', 'h').scheme, 'http')
check('functional_equals_tuple', lambda: Url('a', 'b') == ('a', 'b'), True)
check('functional_name', lambda: Url.__name__, 'Url')

def _keyword_form_fields():
    # Deprecated in 3.13 and going away in 3.15; still the spelling some
    # released packages use, so it has to keep working.  The warning is
    # silenced rather than printed -- this gate reads the output.
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        KwUrl = typing.NamedTuple('KwUrl', scheme=str, host=str)
    return KwUrl._fields


check('functional_keyword_fields', _keyword_form_fields, ('scheme', 'host'))


def _both_forms_rejected():
    try:
        typing.NamedTuple('X', [('a', int)], b=str)
    except TypeError:
        return 'TypeError'
    return 'no error'


check('functional_rejects_fields_and_keywords', _both_forms_rejected,
      'TypeError')


# ---------------------------- the functional form USED AS A BASE (urllib3)
#
# ``super().__new__(cls, scheme, host)'' -- urllib3.util.url.Url's own spelling.
# It used to be written as ``tuple.__new__(cls, (scheme, host))'' here, because
# super() mis-bound the receiver and reached the parent as ``(cls, cls, a, b)''
# -- a general defect, reproducible with two plain classes and nothing to do
# with namedtuples.  That is fixed; see tests/python/super_new_binding.py, which
# pins both directions of it.  Spelled the urllib3 way now that the urllib3 way
# works.

class NormalisingUrl(typing.NamedTuple('NormalisingUrl',
                                       [('scheme', str), ('host', str)])):
    """A namedtuple base with a __new__ that normalises its arguments --
    exactly urllib3.util.url.Url's shape."""

    def __new__(cls, scheme=None, host=None):
        if scheme is not None:
            scheme = scheme.lower()
        return super().__new__(cls, scheme, host)

    def pretty(self):
        return '%s://%s' % (self.scheme, self.host)


u = NormalisingUrl('HTTP', 'example.com')

check('derived_new_runs', lambda: u.scheme, 'http')
check('derived_is_a_tuple', lambda: isinstance(u, tuple), True)
check('derived_values', lambda: tuple(u), ('http', 'example.com'))
check('derived_method_runs', lambda: u.pretty(), 'http://example.com')
check('derived_fields', lambda: NormalisingUrl._fields, ('scheme', 'host'))
# _replace goes through _make, which builds the tuple directly rather than
# re-running the subclass __new__ -- so an already-normalised value is not
# normalised twice.
check('derived_replace_keeps_class',
      lambda: type(u._replace(host='other')).__name__, 'NormalisingUrl')
check('derived_replace_values',
      lambda: tuple(u._replace(host='other')), ('http', 'other'))


# ------------------------------------------------- collections.namedtuple
#
# The same object underneath, and the property that used to be missing.

def _collections_tupleness():
    import collections
    NT = collections.namedtuple('NT', 'a b')
    return isinstance(NT(1, 2), tuple)


check('collections_namedtuple_is_a_tuple', _collections_tupleness, True)


def _collections_defaults():
    import collections
    NT = collections.namedtuple('NT', 'a b c', defaults=(30,))
    return (NT(1, 2), NT._field_defaults)


check('collections_namedtuple_defaults', _collections_defaults,
      ((1, 2, 30), {'c': 30}))


# A field may be named ``index`` or ``count``, and then it is the FIELD that
# the name means -- tuple's method of that name is shadowed, as it is by any
# other field.  Being a real tuple is what makes this a question at all.

def _field_named_index():
    import collections
    T = collections.namedtuple('T', 'index desc')
    return T(3, 'music').index


check('field_may_shadow_tuple_index', _field_named_index, 3)


def _field_named_count():
    import collections
    T = collections.namedtuple('T', 'count other')
    return T(9, 2).count


check('field_may_shadow_tuple_count', _field_named_count, 9)


def _methods_survive_when_not_fields():
    import collections
    T = collections.namedtuple('T', 'a b')
    t = T(1, 1)
    return (t.index(1), t.count(1))


check('tuple_methods_survive_when_not_fields',
      _methods_survive_when_not_fields, (0, 2))


class IndexField(NamedTuple):
    index: int
    desc: str


check('class_form_field_may_shadow_tuple_index',
      lambda: IndexField(3, 'music').index, 3)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
