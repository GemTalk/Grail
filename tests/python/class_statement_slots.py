"""A class statement checks __slots__ as type() does, and the __dict__ it asks for (#1658).

Three gaps:

* a ``class`` statement validated nothing: items that are not strings or
  not identifiers, a name the body also binds, and a ``__dict__`` /
  ``__weakref__`` a base already supplies were all accepted;
* ``'__dict__'`` in ``__slots__`` over a base with empty ``__slots__`` gave
  the instances no ``__dict__`` -- they inherited the base's strictness, and
  so did a ``type()`` class with no ``__slots__`` at all over such a base;
* ``dir()`` of a ``type()``-built class missed what only its ``__dict__``
  holds (its ``__weakref__`` descriptor, its ``__slots__``), because such a
  class over a Python base did not count as a Python class.

What the check must NOT refuse is pinned too, because the corpus found each
one: a bare annotation beside a slot of the same name binds nothing
(werkzeug's LocalProxy); a dict ``__slots__`` names its keys, not its
docstring values (statistics' NormalDist); and ``collections.deque`` has no
instance ``__dict__``, so a subclass may ask for one (test_deque).

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import textwrap
import weakref

r = {}


def t(label, src, read='out'):
    # The source runs inside a try IN the exec, so the exec itself returns
    # normally: Grail's exec drops every binding when the code raises (#1695).
    # Whether a refused class leaves its name unbound is checked at module
    # scope below, not here: under exec Grail binds the name early (#1696).
    code = ('try:\n' + textwrap.indent(src, '    ')
            + '\nexcept Exception as e:\n    _err = "%s: %s" % (type(e).__name__, e)\n')
    g = {'weakref': weakref}
    exec(code, g)
    r[label] = g['_err'] if '_err' in g else repr(eval(read, g))


# refusals
t('item_not_a_string', 'class K:\n    __slots__ = (1,)')
t('item_not_an_identifier', 'class K:\n    __slots__ = ("x y",)')
t('conflicts_with_variable', 'class K:\n    x = 1\n    __slots__ = ("x",)')
t('conflicts_with_method', 'class K:\n    __slots__ = ("m",)\n    def m(self): pass')
t('conflicts_with_nested_class', 'class K:\n    __slots__ = ("N",)\n    class N: pass')
t('weakref_over_dictful_base', 'class Dictful: pass\nclass K(Dictful):\n    __slots__ = ("__weakref__",)')
t('weakref_over_weakref_base',
  'class HasWR:\n    __slots__ = ("__weakref__",)\nclass K(HasWR):\n    __slots__ = ("__weakref__",)')
t('dict_over_dictful_grandparent',
  'class G: pass\nclass P(G):\n    __slots__ = ()\nclass K(P):\n    __slots__ = ("__dict__",)')
t('dict_twice', 'class K:\n    __slots__ = ("__dict__", "__dict__")')
t('not_iterable', 'class K:\n    __slots__ = 5')
t('slot_over_int', 'class K(int):\n    __slots__ = ("a",)')
t('slot_over_tuple', 'class K(tuple):\n    __slots__ = ("a",)')

# accepted
t('string_is_one_slot', 'class K:\n    __slots__ = "abc"\nk = K(); k.abc = 1\nout = (K.__slots__, "abc" in K.__dict__, k.abc)')
t('plain_slots', 'class K:\n    __slots__ = ("a", "b")\n    c = 1\nk = K(); k.a = 1\nout = (k.a, K.c)')
t('weakref_over_object', 'class K:\n    __slots__ = ("__weakref__",)\nout = weakref.ref(K()) is not None')
t('slot_over_list', 'class K(list):\n    __slots__ = ("a",)\nk = K([1]); k.a = 2\nout = (list(k), k.a)')
t('empty_slots_over_int', 'class K(int):\n    __slots__ = ()\nout = K(3) + 1')
# a bare annotation binds nothing, so it is no class variable (werkzeug's LocalProxy)
t('annotation_beside_slot',
  'class K:\n    __slots__ = ("f",)\n    f: int\nk = K(); k.f = 3\nout = (k.f, K.__annotations__)')
t('annotated_value_conflicts', 'class K:\n    __slots__ = ("f",)\n    f: int = 1')
# a dict __slots__ names its keys; the values are docstrings (statistics' NormalDist)
t('dict_slots_are_its_keys',
  'class K:\n    __slots__ = {"a": "doc of a", "b": "doc of b"}\nk = K(); k.a = 1\nout = (k.a, sorted(K.__slots__))')  # K.a itself: #1694
t('dict_slots_key_not_identifier', 'class K:\n    __slots__ = {"a b": "doc"}')

# collections.deque has no instance __dict__, so a subclass may ask for one
t('deque_has_no_dict',
  'import collections\nd = collections.deque()\ntry:\n    d.zz = 1\n    out = "stored"\nexcept AttributeError:\n    out = "refused"')
t('deque_subclass_dict_slot',
  'import collections\nclass K(collections.deque):\n    __slots__ = ("x", "__dict__")\n'
  'k = K([1, 2]); k.x = 3; k.zz = 4\nout = (list(k), k.x, k.zz, weakref.ref(k)() is k)')

# __dict__ over a base with empty __slots__
EMPTY = 'class Empty:\n    __slots__ = ()\n'
t('dict_slot_over_empty_base',
  EMPTY + 'class K(Empty):\n    __slots__ = ("__dict__",)\no = K(); o.zz = 1\nout = (hasattr(K(), "__dict__"), o.zz)')
t('dict_string_over_empty_base',
  EMPTY + 'class K(Empty):\n    __slots__ = "__dict__"\no = K(); o.zz = 1\nout = o.zz')
t('type_dict_slot_over_empty_base',
  EMPTY + 'K = type("K", (Empty,), {"__slots__": ("__dict__",)})\no = K(); o.zz = 1\nout = o.zz')
t('type_no_slots_over_empty_base',
  EMPTY + 'K = type("K", (Empty,), {})\no = K(); o.zz = 1\nout = o.zz')
t('slots_over_empty_base_stay_strict',
  EMPTY + 'class K(Empty):\n    __slots__ = ("a",)\no = K()\ntry:\n    o.zz = 1\n    out = "stored"\nexcept AttributeError:\n    out = "refused"')

# a refused class statement leaves its name unbound
try:
    class Refused:
        __slots__ = (1,)
except TypeError:
    pass
r['module_name_unbound'] = repr('Refused' in globals())


# dir() of a type()-built class
t('dir_type_weakref',
  'T = type("T", (object,), {"__slots__": ("__weakref__",)})\nout = ("__weakref__" in T.__dict__, "__weakref__" in dir(T))')
t('dir_type_over_python_base',
  'class B: pass\nT = type("T", (B,), {"__slots__": ("a",), "q": 1})\n'
  'out = sorted(n for n in ("__slots__", "a", "q") if n in dir(T))')


EXPECTED = {
    'annotated_value_conflicts': "ValueError: 'f' in __slots__ conflicts with class variable",
    'annotation_beside_slot': "(3, {'f': <class 'int'>})",
    'conflicts_with_method': "ValueError: 'm' in __slots__ conflicts with class variable",
    'conflicts_with_nested_class': "ValueError: 'N' in __slots__ conflicts with class variable",
    'conflicts_with_variable': "ValueError: 'x' in __slots__ conflicts with class variable",
    'deque_has_no_dict': "'refused'",
    'deque_subclass_dict_slot': '([1, 2], 3, 4, True)',
    'dict_over_dictful_grandparent': 'TypeError: __dict__ slot disallowed: we already got one',
    'dict_slot_over_empty_base': '(True, 1)',
    'dict_slots_are_its_keys': "(1, ['a', 'b'])",
    'dict_slots_key_not_identifier': 'TypeError: __slots__ must be identifiers',
    'dict_string_over_empty_base': '1',
    'dict_twice': 'TypeError: __dict__ slot disallowed: we already got one',
    'dir_type_over_python_base': "['__slots__', 'a', 'q']",
    'dir_type_weakref': '(True, True)',
    'empty_slots_over_int': '4',
    'item_not_a_string': "TypeError: __slots__ items must be strings, not 'int'",
    'item_not_an_identifier': 'TypeError: __slots__ must be identifiers',
    'module_name_unbound': 'False',
    'not_iterable': "TypeError: 'int' object is not iterable",
    'plain_slots': '(1, 1)',
    'slot_over_int': "TypeError: nonempty __slots__ not supported for subtype of 'int'",
    'slot_over_list': '([1], 2)',
    'slot_over_tuple': "TypeError: nonempty __slots__ not supported for subtype of 'tuple'",
    'slots_over_empty_base_stay_strict': "'refused'",
    'string_is_one_slot': "('abc', True, 1)",
    'type_dict_slot_over_empty_base': '1',
    'type_no_slots_over_empty_base': '1',
    'weakref_over_dictful_base': 'TypeError: __weakref__ slot disallowed: we already got one',
    'weakref_over_object': 'True',
    'weakref_over_weakref_base': 'TypeError: __weakref__ slot disallowed: we already got one',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
