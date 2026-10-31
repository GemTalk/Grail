"""Fixture: PEP 695 annotation scopes written in a class body see the class.

CPython gives a generic class's type parameters, a TypeVar's bound and a type
alias's value each an annotation scope, and one in a class body sees the
class namespace (Python/symtable.c:1251-1258, 2866-2876).  A name the class
binds is an implicit global there -- the class namespace first, then the
globals, never an enclosing function -- and one the class declares ``global``
reads the globals only (Python/symtable.c:731-751).  Grail had:

  * a generic class nested in a class body keeping only its parameter names,
    so it had no ``Generic`` base and its methods could not see T;
  * a ``type X = V`` in a class body evaluating V as a class-body expression
    at the alias's position, so a class binding made later or a ``global``
    declaration was missed and the enclosing function's binding read instead;
  * a class nested in a class-body ``if``, whose methods could not reach the
    enclosing function's locals (NameError: cannot access free variable).

A comprehension or a generator expression in such a scope is a scope of its
own and does not see the class.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from typing import Generic

x = 'global'
T = 'module T'
r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def make_base(arg):
    class Base:
        __arg__ = arg
    return Base


class Outer[A]:
    class Base: ...

    class Inner[C](Base):
        @staticmethod
        def params(): return A, C


r['nested_generic_bases'] = Outer.Inner.__bases__ == (Outer.Base, Generic)
r['nested_generic_reads_outer'] = Outer.Inner.params() == (Outer.__type_params__[0],
                                                            Outer.Inner.__type_params__[0])


class Bounds:
    Base = int

    class D[U: Base]: ...


r['nested_bound_reads_class'] = Bounds.D.__type_params__[0].__bound__ is int


class Shadow:
    T = 'class'

    class D[T](make_base(T)): ...


r['type_param_shadows_class'] = Shadow.D.__bases__[0].__arg__ is Shadow.D.__type_params__[0]


def class_binds_later(read_early):
    x = 'nonlocal'

    class Cls:
        type Alias = x
        if read_early:
            seen = Alias.__value__
        x = 'class'
    return Cls


# Two classes: __value__ is computed once, so the early read fixes it.
r['alias_class_binding'] = [class_binds_later(True).seen, class_binds_later(False).Alias.__value__]


def class_declares_global():
    x = 'nonlocal'

    class Cls:
        global x
        type Alias = x
    Cls.x = 'class'
    return Cls


r['alias_global_declaration'] = class_declares_global().Alias.__value__


def class_does_not_bind():
    x = 'nonlocal'

    class Cls:
        type Alias = x
    return Cls


r['alias_free_name'] = class_does_not_bind().Alias.__value__


class Modified:
    T = int
    type Alias = T


Modified.T = float
r['alias_reads_live_class'] = Modified.Alias.__value__ is float


class Comprehension:
    T = 'class'
    type Alias = list(T for _ in (1,))


r['alias_genexp_own_scope'] = Comprehension.Alias.__value__


class RaisingNamespace(dict):
    def __missing__(self, key):
        if key == 'Missing':
            raise RuntimeError('looked up Missing')
        raise KeyError(key)


class Meta(type):
    def __prepare__(name, bases):
        return RaisingNamespace()


def build_with_raising_namespace():
    class Host(metaclass=Meta):
        class Inner[U](Missing): ...


r['namespace_lookup_raises'] = outcome(build_with_raising_namespace)


def conditional_class():
    y = 'enclosing'
    n = 0

    class C:
        if True:
            class D:
                def read(self): return y

                def bump(self):
                    nonlocal n
                    n += 1
                    return n

                @staticmethod
                def static(): return y
    return C


r['conditional_class_cells'] = [conditional_class().D().read(), conditional_class().D().bump(),
                                conditional_class().D.static()]

namespace = {}
exec("""
def outer():
    class Cls:
        global late
        type Alias = late
    return Cls
""", namespace)
namespace['late'] = 'bound after exec'
r['exec_global_after_exec'] = namespace['outer']().Alias.__value__

EXPECTED = {
    'nested_generic_bases': True,
    'nested_generic_reads_outer': True,
    'nested_bound_reads_class': True,
    'type_param_shadows_class': True,
    'alias_class_binding': ['global', 'class'],
    'alias_global_declaration': 'global',
    'alias_free_name': 'nonlocal',
    'alias_reads_live_class': True,
    'alias_genexp_own_scope': ['module T'],
    'namespace_lookup_raises': 'RuntimeError: looked up Missing',
    'conditional_class_cells': ['enclosing', 1, 'enclosing'],
    'exec_global_after_exec': 'bound after exec',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
