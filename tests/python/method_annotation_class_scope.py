"""Fixture: a method's annotations see its class body's namespace.

PEP 649 evaluates a method's annotations lazily, in an annotation scope that
CPython lets see the class namespace (``__classdict__``): a free name is
looked up there first, then in the enclosing function or the module
(Python/codegen.c, LOAD_FROM_DICT_OR_GLOBALS and LOAD_FROM_DICT_OR_DEREF).
Grail skipped the class, so

  * a nested class defined after the method was a NameError;
  * a nested class named like a builtin (``class format``) read the builtin;
  * a class attribute shadowing an enclosing function's local read the local.

A name the class body binds is an implicit global of the annotation scope
(Python/symtable.c:731-751): when the class has not bound it yet, the read
goes to the module, never to an enclosing function's binding of it.

The namespace is the one of the class that DEFINES the method, so a subclass
reading an inherited method's annotations still sees its base's names.  A
lambda or a comprehension inside an annotation is a scope of its own and does
not see the class (method_annotation_comprehension.py has more of those).

The annotation scope is a function of its own for any def, so an enclosing
local it reads while still unbound is a FREE variable: NameError, ``cannot
access free variable'', where Grail raised UnboundLocalError.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

Later = 'module Later'
Shadowed = 'module Shadowed'
Bare = 'module Bare'
r = {}


def outcome(thunk):
    try:
        return thunk()
    except NameError as e:
        return 'NameError: %s' % (e,)


class Outer:
    def meth(self, x: Nested) -> Later: ...
    class Nested: ...
    Later = int


r['nested_after'] = Outer.meth.__annotations__ == {'x': Outer.Nested, 'return': int}
r['nested_after_bound'] = Outer().meth.__annotations__ == {'x': Outer.Nested, 'return': int}


class Shadows:
    class format: pass

    def meth(self, x: format): ...


r['shadows_builtin'] = Shadows.meth.__annotations__['x'] is Shadows.format


class Siblings:
    def helper(self): ...

    def meth(self, x: helper): ...


r['sibling_def'] = Siblings.meth.__annotations__['x'] is Siblings.helper


class Sub(Outer):
    Nested = str
    Later = bytes


r['inherited'] = Sub.meth.__annotations__ == {'x': Outer.Nested, 'return': int}
r['inherited_bound'] = Sub().meth.__annotations__ == {'x': Outer.Nested, 'return': int}


def enclosing():
    T = 'enclosing T'
    U = 'enclosing U'

    class C:
        T = 'class T'

        def meth(self, a: T, b: U, c: (lambda: T)()): ...

    return C


r['class_before_enclosing'] = enclosing().meth.__annotations__


def binds_later():
    Shadowed = 'enclosing Shadowed'

    class C:
        def meth(self, a: Shadowed): ...

        SEEN = meth.__annotations__['a']
        Shadowed = 'class Shadowed'

    return C


# __annotate__ itself for the second read: the first one cached __annotations__.
r['class_binding_skips_enclosing'] = [binds_later().SEEN, binds_later().meth.__annotate__(1)['a']]


class Kinds:
    Bare: int

    if len:
        Cond = 'conditional'

    @classmethod
    def side(cls, x: Cond, y: Bare): ...

    def lam(self, x: (lambda: Cond)()): ...


r['classmethod'] = Kinds.side.__annotations__
r['lambda'] = outcome(lambda: Kinds.lam.__annotations__)


class Private:
    class __Hidden: ...

    def meth(self, x: __Hidden): ...


r['mangled'] = Private.meth.__annotations__['x'] is Private._Private__Hidden


class Running:
    class Early: ...

    def meth(self, x: Early, y: Late): ...

    try:
        SEEN = meth.__annotations__
    except NameError as e:
        SEEN = 'NameError: %s' % (e,)
    Late = 'late'


r['while_running'] = [Running.SEEN, Running.meth.__annotations__ == {'x': Running.Early, 'y': 'late'}]


def unbound_enclosing():
    def f(x: format): pass
    if False:
        class format: pass
    return f


try:
    unbound_enclosing().__annotations__
except NameError as e:
    r['unbound_enclosing'] = '%s: %s' % (type(e).__name__, e)

EXPECTED = {
    'nested_after': True,
    'nested_after_bound': True,
    'shadows_builtin': True,
    'sibling_def': True,
    'inherited': True,
    'inherited_bound': True,
    'class_before_enclosing': {'a': 'class T', 'b': 'enclosing U', 'c': 'enclosing T'},
    'class_binding_skips_enclosing': ['module Shadowed', 'class Shadowed'],
    'classmethod': {'x': 'conditional', 'y': 'module Bare'},
    'lambda': "NameError: name 'Cond' is not defined",
    'mangled': True,
    'while_running': ["NameError: name 'Late' is not defined", True],
    'unbound_enclosing': "NameError: cannot access free variable 'format' where it is not"
                         " associated with a value in enclosing scope",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
