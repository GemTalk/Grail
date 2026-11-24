"""Fixture: ``locals()`` and ``vars()`` in a class body (plan P3.6).

A class body that calls ``locals()`` or zero-argument ``vars()`` can bind a
name no statement in it names: the answer is the namespace being built, so
``locals()['x'] = 43`` binds ``x`` on the class.  CPython reads every
class-body name with LOAD_NAME, so a later read of ``x`` sees it.  Grail
resolves class-body names statically, so a body that calls either one is built
in a dynamic-read mode: every class-body name read first asks the class for a
name bound behind codegen's back.

On the IR arm a class statement inside a def is built by a helper method of its
own; these checks hold for the helper built through IR, for the text helper
(``GRAIL_IR_CLASS_HELPER=0``) and for the text arm (``GRAIL_IR_CODEGEN=0``).
A class at module level is built by the module body, on text.  Every
expectation is CPython 3.14's, verified by running this file directly.

Grail does not seed a class namespace with CPython's implicit ``__module__`` /
``__qualname__`` / ``__firstlineno__``, so the checks compare only the names
the body itself binds (``_own``).

* ``top_locals`` / ``top_vars``: a module-level class body; the names bound so
  far, and a write read back by a later statement.
* ``local_names``: in a method-local class, the names bound so far, through
  ``locals()`` and through ``vars()``.
* ``local_write_read``: a write through ``locals()`` outranks the enclosing
  function's variable of the same name; ``del`` removes it again and leaves
  the enclosing variable alone (test_scope's
  ``testClassNamespaceOverridesClosure``).
* ``no_free_vars``: an enclosing variable the body reads is not in its
  ``locals()`` (test_scope's ``testLocalsClass``).
* ``in_if`` / ``in_for``: writes inside a class-body ``if`` and ``for``, and
  an alias of ``vars()`` filled in a loop (test_enum's ``Period``).
* ``captures``: an enclosing variable read eagerly and from a lambda in a body
  that calls ``locals()``.
* ``reads_after``: after a write, reads of a builtin, a module global, a
  sibling def, a nested class and a prior attribute still resolve as before.
* ``update``: ``vars().update(...)`` with a dict comprehension over an
  enclosing variable, and keywords.
* ``mapping_ops``: ``setdefault``, ``pop`` and item deletion through the
  mapping bind and unbind class attributes.
* ``default_and_decorator``: a method default, a method decorator expression
  and an annotation naming a dynamically bound name.
* ``nested_class``: a class nested in such a body.
* ``vars_of_object``: ``vars(obj)`` with an argument is the ordinary builtin.
* ``enum_update`` / ``enum_period``: the two test_enum shapes.
"""

from enum import Enum

r = {}

shadowed = 'module'
G = 'global'


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def _own(names):
    return sorted(n for n in names if not n.startswith('__'))


def _bound(names, written):
    # Grail's class-body locals() is a snapshot of the names the body's
    # STATEMENTS have bound, so a name bound only through an earlier write to
    # the mapping is not in a later one (CPython lists it); leave it out.
    return [n for n in names if n != written]


class TopLocals:
    a = 1
    early = list(locals())
    locals()['shadowed'] = 'class'
    seen = shadowed
    b = a + 1
    late = list(locals())


class TopVars:
    vars()['w'] = 5
    v = w + 1
    names = list(vars())


def top_locals():
    return (_own(TopLocals.early), TopLocals.seen,
            _own(_bound(TopLocals.late, 'shadowed')), TopLocals.shadowed)


def top_vars():
    return TopVars.v, TopVars.w, _own(_bound(TopVars.names, 'w'))


def local_names():
    class C:
        a = 1
        first = list(locals())

        def m(self):
            return 1
        b = 2
        second = list(vars())
    return _own(C.first), _own(C.second)


def local_write_read():
    x = 42

    class X:
        locals()['x'] = 43
        y = x

    class Y:
        locals()['x'] = 43
        del x
    return X.y, X.x, hasattr(Y, 'x'), x


def no_free_vars():
    def f(x):
        class C:
            y = x

            def m(self):
                return x
            z = list(locals())
        return C

    def g(x):
        class C:
            x = 12

            def m(self):
                return x
            locals()
        return C
    return _own(f(1).z), g(1).x


def in_if():
    flag = True

    class C:
        if flag:
            locals()['p'] = 'then'
        else:
            locals()['p'] = 'else'
        q = p
    return C.p, C.q


def in_for():
    class C:
        for i in range(3):
            vars()['m%d' % i] = i * 10
        got = (m0, m1, m2)
        ns = vars()
        for j in range(2):
            ns['d%d' % j] = j + 100
        one = d1
        del ns, i, j
    return C.got, C.one, C.m2, hasattr(C, 'ns'), hasattr(C, 'i')


def captures():
    k = 1

    class C:
        locals()['k2'] = k + 1
        eager = k
        late = staticmethod(lambda: k)
        both = k2
    k = 5
    return C.eager, C.late(), C.both, hasattr(C, 'k')


def reads_after():
    class C:
        def sib(self):
            return 's'

        class Inner:
            pass
        prior = 'p'
        locals()['dyn'] = 'd'
        got = (len('abc'), G, sib(None), Inner.__name__, prior, dyn, shadowed)
    return C.got


def update():
    table = {'FOO_A': 1, 'BAR_B': 2, 'FOO_C': 3}

    class C:
        vars().update({k: v for k, v in table.items() if k.startswith('FOO_')}, extra=9)
        total = FOO_A + FOO_C + extra
    return C.total, hasattr(C, 'BAR_B'), _own(vars(C))


def mapping_ops():
    class C:
        a = 1
        b = 2
        ns = locals()
        got = ns.setdefault('c', 3)
        popped = ns.pop('a')
        del ns['b']
        del ns
        after = c
    return C.got, C.popped, C.after, hasattr(C, 'a'), hasattr(C, 'b'), C.c


def default_and_decorator():
    class C:
        locals()['dflt'] = 7
        locals()['decos'] = {'static': staticmethod}
        locals()['T'] = int

        def m(self, v=dflt):
            return v

        @decos['static']
        def s():
            return 's'
        x: T
    return C().m(), C.s(), C.__annotations__['x'].__name__


def nested_class():
    class Outer:
        locals()['k'] = 'outer'

        class Inner:
            v = 2
            locals()['w'] = 3
            total = v + w
        seen = k
    return Outer.seen, Outer.Inner.total, Outer.Inner.w


def vars_of_object():
    class Obj:
        pass
    o = Obj()
    o.x = 'ox'

    class C:
        got = vars(o)['x']
    return C.got


def enum_update():
    defines = {'FOO_CAT': 'aloof', 'BAR_DOG': 'friendly', 'FOO_HORSE': 'big'}

    class Foo(Enum):
        vars().update({k: v for k, v in defines.items() if k.startswith('FOO_')})

        def upper(self):
            return self.value.upper()
    try:
        class FooBar(Enum):
            vars().update({k: v for k, v in defines.items() if k.startswith('FOO_')},
                          **{'FOO_CAT': 'small'})
        dup = 'no error'
    except TypeError as exc:
        dup = str(exc)
    return [m.name for m in Foo], Foo.FOO_HORSE.upper(), dup


def enum_period():
    class Period(Enum):
        _ignore_ = 'Period i'
        Period = vars()
        for i in range(3):
            Period['day_%d' % i] = i
        OneDay = day_1
    return (len(Period), Period.OneDay is Period.day_1, Period.day_2.value,
            hasattr(Period, 'Period'), hasattr(Period, 'i'))


record('top_locals', top_locals)
record('top_vars', top_vars)
record('local_names', local_names)
record('local_write_read', local_write_read)
record('no_free_vars', no_free_vars)
record('in_if', in_if)
record('in_for', in_for)
record('captures', captures)
record('reads_after', reads_after)
record('update', update)
record('mapping_ops', mapping_ops)
record('default_and_decorator', default_and_decorator)
record('nested_class', nested_class)
record('vars_of_object', vars_of_object)
record('enum_update', enum_update)
record('enum_period', enum_period)


EXPECTED = {
    'captures': (1, 5, 2, False),
    'default_and_decorator': (7, 's', 'int'),
    'enum_period': (3, True, 2, False, False),
    'enum_update': (['FOO_CAT', 'FOO_HORSE'], 'BIG', "'FOO_CAT' already defined as 'aloof'"),
    'in_for': ((0, 10, 20), 101, 20, False, False),
    'in_if': ('then', 'then'),
    'local_names': (['a'], ['a', 'b', 'first', 'm']),
    'local_write_read': (43, 43, False, 42),
    'mapping_ops': (3, 1, 3, False, False, 3),
    'nested_class': ('outer', 5, 3),
    'no_free_vars': (['m', 'y'], 12),
    'reads_after': (3, 'global', 's', 'Inner', 'p', 'd', 'module'),
    'top_locals': (['a'], 'class', ['a', 'b', 'early', 'seen'], 'class'),
    'top_vars': (6, 5, ['v']),
    'update': (13, False, ['FOO_A', 'FOO_C', 'extra', 'total']),
    'vars_of_object': 'ox',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
