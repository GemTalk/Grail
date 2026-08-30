"""A namedtuple field is a DESCRIPTOR on the class, not just a read on the
instance.

``NT = namedtuple('DefragResult', 'url fragment')`` gave Grail a class on
which ``NT('u', 'f').url`` worked and ``NT.url`` raised

    AttributeError: type object '_NT' has no attribute 'url'

because fields were read through an instance ``__getattr__`` fallback and
nothing of that name was ever bound to the CLASS.  CPython binds each field
to a ``_tuplegetter(index, doc)``, which answers the descriptor itself for a
class-level read and the tuple slot for an instance one.

Real code depends on the class attribute existing.  bleach's vendored
urllib.parse (``bleach/_vendor/parse.py``) does, at module scope:

    _DefragResultBase = namedtuple('DefragResult', 'url fragment')
    _DefragResultBase.url.__doc__ = "The URL with no fragment identifier."

so the missing descriptor stopped the module importing at all.

Every expectation below was checked against CPython 3.14
(scripts/check_python_fixtures.sh runs this file under CPython on every PR).
Deliberately NOT asserted here, because Grail and CPython genuinely differ:

* the class's ``__name__`` (Grail names every namedtuple's underlying class
  ``_NT``; a separate, documented cosmetic gap), and
* the MESSAGE of the AttributeError raised by assigning to a field on an
  instance -- only the exception type is checked.
"""

import typing
from collections import namedtuple
from typing import NamedTuple

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --------------------------------------------- the class attribute exists

Defrag = namedtuple('DefragResult', 'url fragment')

check('class_attribute_exists', lambda: hasattr(Defrag, 'url'), True)
check('class_attribute_repr', lambda: repr(Defrag.url),
      "_tuplegetter(0, 'Alias for field number 0')")
check('class_attribute_repr_second_field', lambda: repr(Defrag.fragment),
      "_tuplegetter(1, 'Alias for field number 1')")
check('class_attribute_type_name', lambda: type(Defrag.url).__name__,
      '_tuplegetter')
check('class_attribute_doc', lambda: Defrag.url.__doc__,
      'Alias for field number 0')


# ------------------------------------------------- the bleach parse.py shape

Split = namedtuple('SplitResult', 'scheme netloc path query fragment')
Split.scheme.__doc__ = 'Specifies URL scheme for the request.'
Split.netloc.__doc__ = 'Network location where the request is made to.'


def _docs_are_writable_per_field():
    return (Split.scheme.__doc__, Split.netloc.__doc__, Split.path.__doc__)


check('field_docs_are_writable_per_field', _docs_are_writable_per_field,
      ('Specifies URL scheme for the request.',
       'Network location where the request is made to.',
       'Alias for field number 2'))

# Mutating one class's field doc must not reach another class's.
check('field_doc_mutation_is_local', lambda: Defrag.fragment.__doc__,
      'Alias for field number 1')

# CPython interns the generated docstring so equal-arity fields share one
# string object (test_collections.TestNamedTuple.test_field_doc_reuse).
_P = namedtuple('P', ['m', 'n'])
_Q = namedtuple('Q', ['o', 'p'])
check('generated_docs_are_shared',
      lambda: (_P.m.__doc__ is _Q.o.__doc__, _P.n.__doc__ is _Q.p.__doc__),
      (True, True))


# ------------------------------------------- reads still go to the instance

d = Defrag('u', 'f')

check('instance_read_first_field', lambda: d.url, 'u')
check('instance_read_second_field', lambda: d.fragment, 'f')
check('descriptor_get_on_instance', lambda: Defrag.url.__get__(d), 'u')
check('descriptor_get_on_class_is_itself',
      lambda: Defrag.url.__get__(None, Defrag) is Defrag.url, True)


def _instance_field_is_readonly():
    try:
        d.url = 'nope'
    except AttributeError:
        return 'AttributeError'
    return 'no raise, url is now ' + repr(d.url)


check('instance_field_is_readonly', _instance_field_is_readonly,
      'AttributeError')


def _descriptor_set_raises():
    try:
        Defrag.url.__set__(d, 'nope')
    except AttributeError:
        return 'AttributeError'
    return 'no raise'


check('descriptor_set_raises', _descriptor_set_raises, 'AttributeError')


# ------------------------------- the rest of the namedtuple protocol is intact

check('fields', lambda: Defrag._fields, ('url', 'fragment'))
check('is_a_tuple', lambda: isinstance(d, tuple), True)
check('equals_plain_tuple', lambda: d == ('u', 'f'), True)
check('hashes_as_the_tuple', lambda: hash(d) == hash(('u', 'f')), True)
check('unpacks', lambda: [x for x in [list(d)]][0], ['u', 'f'])
check('indexes', lambda: (d[0], d[-1]), ('u', 'f'))
check('asdict', lambda: d._asdict(), {'url': 'u', 'fragment': 'f'})
check('replace', lambda: tuple(d._replace(url='z')), ('z', 'f'))
check('make', lambda: tuple(Defrag._make(['q', 'r'])), ('q', 'r'))
check('repr_of_instance', lambda: repr(d), "DefragResult(url='u', fragment='f')")


def _unpacking_statement():
    a, b = d
    return (a, b)


check('unpacking_statement', _unpacking_statement, ('u', 'f'))


# ---------------------------------------- one class's fields are its own only

A = namedtuple('A', 'a b')
B = namedtuple('B', 'c d')

check('fields_do_not_leak_between_classes',
      lambda: (hasattr(A, 'c'), hasattr(B, 'a')), (False, False))
check('separate_classes_read_their_own',
      lambda: (A(1, 2).a, B(3, 4).d), (1, 4))


# ------------------------------------------------ every construction route

check('route_list_spec', lambda: repr(namedtuple('L', ['e', 'f']).e),
      "_tuplegetter(0, 'Alias for field number 0')")
check('route_defaults',
      lambda: repr(namedtuple('D', 'g h', defaults=[9]).h),
      "_tuplegetter(1, 'Alias for field number 1')")

_R = namedtuple('R', ('efg', 'g%hi'), rename=True)
check('route_rename_fields', lambda: _R._fields, ('efg', '_1'))
check('route_rename_class_attribute', lambda: repr(_R._1),
      "_tuplegetter(1, 'Alias for field number 1')")


class Point(NamedTuple):
    x: int
    y: str = 'origin'


check('route_typing_class_statement', lambda: repr(Point.x),
      "_tuplegetter(0, 'Alias for field number 0')")
check('route_typing_class_statement_default', lambda: Point(1).y, 'origin')

_U = NamedTuple('U', [('scheme', str), ('host', str)])
check('route_typing_functional', lambda: repr(_U.scheme),
      "_tuplegetter(0, 'Alias for field number 0')")
check('route_typing_functional_instance', lambda: _U('h', 'g').host, 'g')

_K = NamedTuple('K', a=int, b=str)
check('route_typing_keywords',
      lambda: (_K._fields, repr(_K.b)),
      (('a', 'b'), "_tuplegetter(1, 'Alias for field number 1')"))


class Sub(A):
    def helper(self):
        return 'h'


check('route_subclass_inherits_descriptor', lambda: repr(Sub.a),
      "_tuplegetter(0, 'Alias for field number 0')")
check('route_subclass_instance', lambda: (Sub(1, 2).a, Sub(1, 2).helper()),
      (1, 'h'))


class PointSub(Point):
    def helper(self):
        return 'h2'


check('route_typing_subclass',
      lambda: (PointSub._fields, repr(PointSub.x), PointSub(5).x),
      (('x', 'y'), "_tuplegetter(0, 'Alias for field number 0')", 5))


# ---------------------------------- a field that shadows a tuple method wins

_T = namedtuple('T', 'index desc')
check('field_named_index_shadows_the_method', lambda: repr(_T.index),
      "_tuplegetter(0, 'Alias for field number 0')")
check('field_named_index_reads_the_slot', lambda: _T(3, 'music').index, 3)

_C = namedtuple('C', 'count other')
check('field_named_count_reads_the_slot', lambda: _C(9, 2).count, 9)

_N = namedtuple('N', 'a b')
check('tuple_methods_survive_when_not_fields',
      lambda: (_N(1, 1).index(1), _N(1, 1).count(1)), (0, 2))


# ------------------------------------------------- an empty namedtuple is fine

_E = namedtuple('E', '')
check('empty_namedtuple', lambda: (_E._fields, _E() == ()), ((), True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
