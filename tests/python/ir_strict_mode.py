"""Fixture: the shapes IR strict mode found falling back to text.

Plan item P1.4 makes a fallback RAISE under strict mode (GRAIL_IR_STRICT):
a def the IR eligibility check admits but whose IR build fails, or one refused
for a broken internal invariant.  The census of the CPython test corpus found
these shapes falling back on main, so each is fixed here -- built through IR,
or refused under a label that names the phase owning it.  IRStrictModeTestCase
imports this file with the IR seam forced on and strict mode on, and asserts
that nothing falls back and that the EXPECTED values agree with CPython 3.14
(run this file directly).

Every shape sits in a top-level function or a method, because a module body is
still text and would prove nothing.
"""

from typing import TypeVarTuple, get_type_hints

r = {}


def record(key, fn):
    try:
        r[key] = repr(fn())
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


# --- a starred ``*args'' annotation on a nested def (#2234) --------------------
# PEP 646's ``*args: *Ts`` evaluates as ``(*Ts,)[0]``, Unpack[Ts].  The IR
# annotate block had no emit for a starred value, so the enclosing def's build
# raised ``StarredAst is not an emittable value'' and fell back to text
# (test_typing's test_get_type_hints_on_unpack_args, test_expressions).

def starred_vararg_annotation():
    Ts = TypeVarTuple('Ts')

    def func1(*args: *Ts):
        pass
    return get_type_hints(func1)


class StarredHolder:
    def m(self):
        Ts = TypeVarTuple('Ts')

        def func1(*args: *Ts):
            pass
        return func1.__annotations__['args'], get_type_hints(func1)['args']


def starred_vararg_annotation_in_method():
    return StarredHolder().m()


# --- a walrus in a class header inside a def (#2170) ---------------------------
# A walrus in a decorator, base or class keyword binds a local of the ENCLOSING
# def.  The class statement travels as a compiled-text helper whose frame has
# no such temp, so the build failed with ``undefined symbol''.  In a method the
# method fell back to text; in a MODULE-LEVEL def the whole module failed to
# compile, so this file did not import at all under IR before the fix
# (test_grammar's test_classdef: ``@d := class_decorator``).
# Since P3.2 a class whose body the IR backend admits (these all are) builds
# its helper through IR and evaluates the header in the enclosing method; a
# class still on the text helper is refused as ``classDef:headerWalrus``.

def header_walrus_decorator():
    def deco(c):
        return c

    @d := deco
    class J:
        pass
    return d is deco, J.__name__


def header_walrus_keyword():
    class M(type):
        pass

    class K(metaclass=(mk := M)):
        pass
    return mk is M, type(K) is M


def header_walrus_base():
    class Base:
        pass

    class K((b := Base)):
        pass
    return b is Base, K.__bases__ == (Base,)


class HeaderWalrusHolder:
    def m(self):
        def deco(c):
            return c

        @d := deco
        class I:
            pass
        return d is deco, I.__name__


def header_walrus_in_method():
    return HeaderWalrusHolder().m()


# --- a __slots__ name that is not an identifier, inside a def ------------------
# CPython raises ``TypeError: __slots__ must be identifiers'' when the class
# statement runs.  Grail turned every literal slot name into an instVar of the
# generated class definition, and one holding a NUL is an illegal character
# there: the def compiled to a codegen-gap stub on BOTH arms, and under IR its
# build fell back first (test_descr's test_slots).

def slots_name_with_nul():
    try:
        class C(object):
            __slots__ = ["foo\0bar"]
    except TypeError as e:
        return 'TypeError: %s' % e
    return 'no error'


def slots_name_with_space():
    try:
        class C(object):
            __slots__ = ("ok", "foo bar")
    except TypeError as e:
        return 'TypeError: %s' % e
    return 'no error'


class SlotsHolder:
    def m(self):
        try:
            class C(object):
                __slots__ = ["foo\0bar"]
        except TypeError as e:
            return 'TypeError: %s' % e
        return 'no error'


def slots_name_with_nul_in_method():
    return SlotsHolder().m()


def slots_valid_names_still_slots():
    class C(object):
        __slots__ = ("a", "b_2")
    c = C()
    c.a = 1
    c.b_2 = 2
    try:
        c.z = 3
    except AttributeError:
        return c.a + c.b_2, hasattr(c, '__dict__')
    return 'no error'


record('starred_vararg_annotation', starred_vararg_annotation)
record('starred_vararg_annotation_in_method', starred_vararg_annotation_in_method)
record('header_walrus_decorator', header_walrus_decorator)
record('header_walrus_keyword', header_walrus_keyword)
record('header_walrus_base', header_walrus_base)
record('header_walrus_in_method', header_walrus_in_method)
record('slots_name_with_nul', slots_name_with_nul)
record('slots_name_with_space', slots_name_with_space)
record('slots_name_with_nul_in_method', slots_name_with_nul_in_method)
record('slots_valid_names_still_slots', slots_valid_names_still_slots)

EXPECTED = {
    'starred_vararg_annotation': "{'args': typing.Unpack[Ts]}",
    'starred_vararg_annotation_in_method': '(typing.Unpack[Ts], typing.Unpack[Ts])',
    'header_walrus_decorator': "(True, 'J')",
    'header_walrus_keyword': '(True, True)',
    'header_walrus_base': '(True, True)',
    'header_walrus_in_method': "(True, 'I')",
    'slots_name_with_nul': "'TypeError: __slots__ must be identifiers'",
    'slots_name_with_space': "'TypeError: __slots__ must be identifiers'",
    'slots_name_with_nul_in_method': "'TypeError: __slots__ must be identifiers'",
    'slots_valid_names_still_slots': '(3, False)',
}

if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is in neither table' % ('FAIL', extra))
