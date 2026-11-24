"""Fixture: class-body statements a method-local class body runs and binds
names with -- imports, ``match``, ``except*``, unpacking, a parenthesised
annotation target, Grail's persistence declarations, and defs and classes in
an ``if``, a loop, a ``try`` or a ``with`` (plan P3.7a).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Until P3.7a each of these shapes kept
the helper compiled from text; now the helper is built through IR.  Every
expectation is CPython 3.14's, verified by running this file directly; the IR
helper, the text helper (``GRAIL_IR_CLASS_HELPER=0``) and the text arm
(``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``import_body``: ``import a.b as x`` and ``from m import n`` bind class
  attributes, and a later attribute reads one.
* ``import_if`` / ``import_try``: the same in a class-body ``if`` and in a
  ``try`` with an ``except ImportError`` fallback (test_socket's shape).
* ``import_nested``: an import in a nested class's body.
* ``match_capture``: ``match`` binds its captures on the class; a guard reads
  a class-body name.
* ``except_star``: ``except*`` in the body, its ``as`` name read in the
  handler.  (Whether it stays bound afterwards is #2305, not checked here.)
* ``loop_chain``: a chained assignment inside a ``for``.
* ``unpack``: plain and nested unpacking, and an unpack reading a class-body
  name.
* ``paren_annotation``: ``(x): int = 1`` binds x and records no annotation.
* ``loop_annotation``: an annotated name inside a ``for`` and a ``try``.
* ``persistence_names``: non-constant ``__transient__`` and ``__renamed__``.
* ``if_slots``: ``__slots__`` assigned in a class-body ``if``.
* ``if_staticmethod`` / ``if_classmethod``: re-classed defs in a branch.
* ``if_property_setter``: ``@x.setter def x`` in a branch reads the property
  before the def rebinds the name.
* ``if_class``: a class in a branch, its header reading a class-body name.
* ``if_def_header``: defs in a branch whose defaults, and whose decorator,
  read class-body names (the class namespace, as CPython evaluates them
  there).  A BARE class-body name as the decorator is right on the IR helper
  only; the text paths raise NameError for it, so it is not checked here.
* ``loop_def`` / ``try_def`` / ``with_def``: a def in a loop (defaults bound per
  pass), a ``try`` and a ``with``, decorated with a class-body name.
* ``try_staticmethod``: a re-classed def in a ``try``.
* ``try_class`` / ``loop_class``: a class in a ``try`` and in a ``for``.
* ``del_def``: ``del`` of a def name after aliasing it (Grail keeps the def
  bound -- the Flask NullSession decision -- so only the alias is checked).
"""

import contextlib

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def import_body():
    class C:
        import os.path as osp
        from os import sep
        name = osp.__name__
    return C.name, C.sep


def import_if(flag):
    class C:
        if flag:
            import json
        else:
            json = None
    return C.json.__name__ if C.json else None


def import_try():
    class C:
        try:
            import no_such_module_p37
        except ImportError:
            no_such_module_p37 = 'fallback'
        try:
            from os import sep as separator
        except ImportError:
            separator = None
    return C.no_such_module_p37, C.separator


def import_nested():
    class Outer:
        class Inner:
            import os.path as osp
    return Outer.Inner.osp.__name__


def match_capture(value):
    class C:
        limit = 2
        match value:
            case [first, *rest] if len(rest) < limit:
                kind = 'short'
            case [first, *rest]:
                kind = 'long'
            case {'k': first}:
                rest = None
                kind = 'map'
            case _:
                first = rest = None
                kind = 'other'
    return C.kind, C.first, C.rest


def except_star():
    class C:
        try:
            raise ExceptionGroup('g', [ValueError('v'), TypeError('t')])
        except* ValueError as eg:
            values = [str(e) for e in eg.exceptions]
            grouped = isinstance(eg, ExceptionGroup)
        except* TypeError:
            types = True
    return C.values, C.types, C.grouped


def loop_chain():
    class C:
        for i in range(3):
            a = b = i * 10
    return C.a, C.b, C.i


def unpack():
    class C:
        a, b = 1, 2
        (c, d), e = (3, 4), 5
        pair = ('x', 'y')
        p, q = pair
        [s, t] = 'st'
    return C.a, C.b, C.c, C.d, C.e, C.p, C.q, C.s, C.t


def paren_annotation():
    class C:
        (x): int = 1
        y: str = 'y'
    return C.x, C.y, C.__annotations__


def loop_annotation():
    class C:
        for i in range(2):
            x: int = i
        try:
            z: str = 'z'
        except Exception:
            pass
    return C.x, C.z, C.__annotations__


def persistence_names():
    names = ('cache',)

    class C:
        __transient__ = names + ('scratch',)
        __renamed__ = {'old': 'new'}
    return C.__transient__, C.__renamed__


def if_slots(flag):
    class C:
        if flag:
            __slots__ = ('a',)
        else:
            __slots__ = ('b',)
    return C.__slots__


def if_staticmethod(flag):
    class C:
        if flag:
            @staticmethod
            def s(x):
                return 'static:' + x
        else:
            @staticmethod
            def s(x):
                return 'other:' + x
    return C.s('a'), C().s('b')


def if_classmethod(flag):
    class C:
        tag = 'C'
        if flag:
            @classmethod
            def k(cls):
                return cls.tag
    class D(C):
        tag = 'D'
    return C.k(), D.k()


def if_property_setter(flag):
    class C:
        @property
        def x(self):
            return self._x
        if flag:
            @x.setter
            def x(self, v):
                self._x = v * 2
    o = C()
    o.x = 4
    return o.x, type(C.__dict__['x']).__name__


def if_class(flag):
    class C:
        base = dict
        if flag:
            class Inner(base):
                v = 1
        else:
            class Inner:
                v = 2
    return C.Inner.v, C.Inner.__bases__[0].__name__, C.Inner.__qualname__


def tag(t):
    def deco(f):
        f.tag = t
        return f
    return deco


def if_def_header():
    class C:
        k = 3
        if True:
            def f(self, k=k, *, j=k + 1):
                return k, j

    class D:
        def mark(t):
            def deco(fn):
                fn.tag = t
                return fn
            return deco
        if True:
            @mark('called')
            def g(self):
                return 'g'
    return C().f(), D().g(), D.g.tag


def loop_def():
    class C:
        for i in range(2):
            def f(self, i=i):
                return i
        mark = tag
        while True:
            @mark('w')
            def g(self):
                return 'g'
            break
    return C().f(), C.i, C().g(), C.g.tag


def try_def():
    class C:
        mark = tag
        try:
            @mark('t')
            def f(self):
                return 'f'
        except Exception:
            def f(self):
                return 'except'
        else:
            def h(self):
                return 'h'
        finally:
            def k(self):
                return 'k'
    return C().f(), C.f.tag, C().h(), C().k(), C.f.__qualname__


def with_def():
    class C:
        with contextlib.nullcontext('cm') as cm:
            def f(self):
                return 'f'
            async def af(self):
                return 'af'
    return C().f(), C.cm, C.af.__name__


def try_staticmethod():
    class C:
        try:
            @staticmethod
            def s():
                return 's'
            @classmethod
            def k(cls):
                return cls.__name__
        except Exception:
            pass
    return C.s(), C.k()


def try_class():
    class C:
        try:
            class Inner:
                v = 2
                def m(self):
                    return 'm'
        except Exception:
            pass
    return C.Inner.v, C.Inner().m(), C.Inner.__qualname__


def loop_class():
    class C:
        made = []
        for n in ('a', 'b'):
            class K:
                pass
            made.append(K)
    return C.made[0] is not C.made[1], C.K is C.made[1], C.n


def del_def():
    class C:
        def _f(self):
            return 'f'
        g = _f
        del _f
    return C().g()


record('import_body', import_body)
record('import_if_true', lambda: import_if(True))
record('import_if_false', lambda: import_if(False))
record('import_try', import_try)
record('import_nested', import_nested)
record('match_short', lambda: match_capture([1, 2]))
record('match_long', lambda: match_capture([1, 2, 3, 4]))
record('match_map', lambda: match_capture({'k': 'v'}))
record('match_other', lambda: match_capture(7))
record('except_star', except_star)
record('loop_chain', loop_chain)
record('unpack', unpack)
record('paren_annotation', paren_annotation)
record('loop_annotation', loop_annotation)
record('persistence_names', persistence_names)
record('if_slots_true', lambda: if_slots(True))
record('if_slots_false', lambda: if_slots(False))
record('if_staticmethod', lambda: if_staticmethod(True))
record('if_classmethod', lambda: if_classmethod(True))
record('if_property_setter', lambda: if_property_setter(True))
record('if_class_true', lambda: if_class(True))
record('if_class_false', lambda: if_class(False))
record('if_def_header', if_def_header)
record('loop_def', loop_def)
record('try_def', try_def)
record('with_def', with_def)
record('try_staticmethod', try_staticmethod)
record('try_class', try_class)
record('loop_class', loop_class)
record('del_def', del_def)


EXPECTED = {
    'import_body': ('posixpath', '/'),
    'import_if_true': 'json',
    'import_if_false': None,
    'import_try': ('fallback', '/'),
    'import_nested': 'posixpath',
    'match_short': ('short', 1, [2]),
    'match_long': ('long', 1, [2, 3, 4]),
    'match_map': ('map', 'v', None),
    'match_other': ('other', None, None),
    'except_star': (['v'], True, True),
    'loop_chain': (20, 20, 2),
    'unpack': (1, 2, 3, 4, 5, 'x', 'y', 's', 't'),
    'paren_annotation': (1, 'y', {'y': str}),
    'loop_annotation': (1, 'z', {'x': int, 'z': str}),
    'persistence_names': (('cache', 'scratch'), {'old': 'new'}),
    'if_slots_true': ('a',),
    'if_slots_false': ('b',),
    'if_staticmethod': ('static:a', 'static:b'),
    'if_classmethod': ('C', 'D'),
    'if_property_setter': (8, 'property'),
    'if_class_true': (1, 'dict', 'if_class.<locals>.C.Inner'),
    'if_class_false': (2, 'object', 'if_class.<locals>.C.Inner'),
    'if_def_header': ((3, 4), 'g', 'called'),
    'loop_def': (1, 1, 'g', 'w'),
    'try_def': ('f', 't', 'h', 'k', 'try_def.<locals>.C.f'),
    'with_def': ('f', 'cm', 'af'),
    'try_staticmethod': ('s', 'C'),
    'try_class': (2, 'm', 'try_class.<locals>.C.Inner'),
    'loop_class': (True, True, 'b'),
    'del_def': 'f',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
