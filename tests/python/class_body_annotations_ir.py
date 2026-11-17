"""Fixture: class-body ANNOTATIONS and ``__slots__`` of method-local classes
(plan P3.3b).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.3b that helper is built
through IR for a body with annotated names (``x: T``, ``x: T = v``) and with a
``__slots__`` declaration, not only for one of plain values.  An annotation is
PEP 649's: the class gets an ``__annotate__`` function, built in the class
body, that evaluates the annotations only when they are asked for -- after the
whole body ran, so it sees every name the body binds, then the module and the
builtins.  Every expectation is CPython 3.14's, verified by running this file
directly; the IR helper, the text helper (``GRAIL_IR_CLASS_HELPER=0``) and the
text arm (``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``basic``: a bare annotation binds nothing, an annotated value is stored,
  and ``__annotations__`` lists both in source order.
* ``class_scope``: an annotation reads a prior attribute, a name the body
  binds only AFTER the annotation (evaluated lazily, so it is bound by then),
  a builtin that a bare annotation of the same name does not shadow, a
  generic alias and a union, and a string.
* ``lazy``: nothing is evaluated when the class is built; the first
  ``__annotations__`` read evaluates each annotation once and caches the
  dict; ``__annotate__(VALUE)`` evaluates them again.
* ``late_module_name``: an annotation names a module global bound after the
  class statement ran.
* ``name_error``: an annotation naming nothing builds the class anyway, and
  raises NameError when read.
* ``formats``: annotationlib's STRING and FORWARDREF formats.
* ``slots_tuple`` / ``slots_list`` / ``slots_dict`` / ``slots_empty``: the
  literal ``__slots__`` forms the build reads statically.
* ``slots_conflict``: a slot named like a class variable is type()'s
  ValueError; a BARE annotation of a slot name is not a class variable.
* ``slots_with_dict``: ``'__dict__'`` among the slots gives instances a dict.
* ``slots_annotated``: ``__slots__: T = (...)`` declares slots too.
* ``dataclass`` / ``named_tuple``: the class-body annotations the standard
  library reads to build fields.
"""

import annotationlib
import dataclasses
import typing

r = {}

calls = []


def note(v):
    calls.append(v)
    return v


def basic():
    class C:
        x: int
        y: str = 'why'
        z: list[int]
    return ('x' in C.__dict__, C.y, C.__annotations__,
            list(C.__annotations__))


def class_scope():
    class C:
        T = int
        a: T
        b: U
        U = str
        bytes: int
        c: bytes
        d: list[T] | None = None
        e: 'C'
    return C.__annotations__, C.d


def lazy():
    del calls[:]

    class C:
        x: note('x')
        y: note('y') = 2
    before = list(calls)
    first = C.__annotations__
    after_first = list(calls)
    again = C.__annotations__
    fresh = C.__annotate__(annotationlib.Format.VALUE)
    return (before, after_first, first is again, fresh, list(calls), C.y)


def late_module_name():
    class C:
        x: LATE
    globals()['LATE'] = float
    return C.__annotations__


def name_error():
    class C:
        x: no_such_name
        ok = 1
    try:
        C.__annotations__
    except NameError as e:
        return C.ok, str(e)
    return C.ok, 'no error'


def formats():
    class C:
        a: list[undefined_name]
        b: int = 3
    s = annotationlib.get_annotations(C, format=annotationlib.Format.STRING)
    f = annotationlib.get_annotations(C, format=annotationlib.Format.FORWARDREF)
    return (s, type(f['a']).__name__, type(f['a'].__args__[0]).__name__,
            f['a'].__args__[0].__forward_arg__, f['b'])


def slots_tuple():
    class S:
        __slots__ = ('a', 'b')
    s = S()
    s.a = 1
    try:
        s.c = 2
        stored = True
    except AttributeError:
        stored = False
    return (S.__slots__, s.a, stored, hasattr(s, '__dict__'),
            type(S.__dict__['a']).__name__)


def slots_list():
    class S:
        __slots__ = ['x']
        kind = 'list'
    s = S()
    s.x = 'ex'
    return S.__slots__, s.x, S.kind, hasattr(s, '__dict__')


def slots_dict():
    class S:
        __slots__ = {'a': 'the a', 'b': 'the b'}
    s = S()
    s.b = 2
    return sorted(S.__slots__), s.b, hasattr(s, '__dict__')


def slots_empty():
    class S:
        __slots__ = ()
    s = S()
    try:
        s.anything = 1
        stored = True
    except AttributeError:
        stored = False
    return S.__slots__, stored


def slots_conflict():
    try:
        class S:
            __slots__ = ('a',)
            a: int = 1
        bad = 'built'
    except ValueError as e:
        bad = str(e)

    class T:
        __slots__ = ('a',)
        a: int
    t = T()
    t.a = 5
    return bad, t.a, T.__annotations__


def slots_with_dict():
    class S:
        __slots__ = ['x', '__dict__']
        y: int
    s = S()
    s.x = 1
    s.z = 3
    return s.x, s.z, S.__annotations__


def slots_annotated():
    class S:
        __slots__: tuple = ('p',)
    s = S()
    s.p = 'pee'
    try:
        s.q = 1
        stored = True
    except AttributeError:
        stored = False
    return S.__slots__, s.p, stored, S.__annotations__


def dataclass():
    @dataclasses.dataclass
    class P:
        x: int
        y: int = 2
        tags: list = dataclasses.field(default_factory=list)
    p = P(1)
    return (repr(p).split('.')[-1], [f.name for f in dataclasses.fields(P)],
            P(1) == P(1, 2, []))


def named_tuple():
    class NT(typing.NamedTuple):
        a: int
        b: str = 'bee'
    nt = NT(1)
    return tuple(nt), NT._fields, NT.__annotations__


r['basic'] = basic()
r['class_scope'] = class_scope()
r['lazy'] = lazy()
r['late_module_name'] = late_module_name()
r['name_error'] = name_error()
r['formats'] = formats()
r['slots_tuple'] = slots_tuple()
r['slots_list'] = slots_list()
r['slots_dict'] = slots_dict()
r['slots_empty'] = slots_empty()
r['slots_conflict'] = slots_conflict()
r['slots_with_dict'] = slots_with_dict()
r['slots_annotated'] = slots_annotated()
r['dataclass'] = dataclass()
r['named_tuple'] = named_tuple()


EXPECTED = {
    'basic': (False, 'why', {'x': int, 'y': str, 'z': list[int]},
              ['x', 'y', 'z']),
    'class_scope': ({'a': int, 'b': str, 'bytes': int, 'c': bytes,
                     'd': list[int] | None, 'e': 'C'}, None),
    'lazy': ([], ['x', 'y'], True, {'x': 'x', 'y': 'y'},
             ['x', 'y', 'x', 'y'], 2),
    'late_module_name': {'x': float},
    'name_error': (1, "name 'no_such_name' is not defined"),
    'formats': ({'a': 'list[undefined_name]', 'b': 'int'}, 'GenericAlias',
                'ForwardRef', 'undefined_name', int),
    'slots_tuple': (('a', 'b'), 1, False, False, 'member_descriptor'),
    'slots_list': (['x'], 'ex', 'list', False),
    'slots_dict': (['a', 'b'], 2, False),
    'slots_empty': ((), False),
    'slots_conflict': ("'a' in __slots__ conflicts with class variable", 5,
                       {'a': int}),
    'slots_with_dict': (1, 3, {'y': int}),
    'slots_annotated': (('p',), 'pee', False, {'__slots__': tuple}),
    'dataclass': ('P(x=1, y=2, tags=[])', ['x', 'y', 'tags'], True),
    'named_tuple': ((1, 'bee'), ('a', 'b'), {'a': int, 'b': str}),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
