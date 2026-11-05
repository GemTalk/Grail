"""Fixture: binding stores the IR path used to refuse -- a ``global''-bound
from-import alias, a ``global'' except target, ``except ():'', a type change
through every store form (``o.__class__'' as a with / for / unpack / chained
target, and ``self.__class__ = X''), the chain temp's name taken by a user
local, a walrus through a method-local class's cell, and ``del ()''.

Corpus: ast.unparse, random.Random.seed and test_types'
SubinterpreterTests.setUpClass (``global n; from m import x as n'', census
``shape:ImportFromAst''); test_descr's A.__del__ (``self.__class__ = O'',
``AssignAst:target-AttributeAst''); test_grammar's test_del_stmt (``del ()'',
``DeleteAst:target'').  Each def holding one fell back to the text path.

Four of these were ALSO wrong on the text path, and are fixed on both:

* ``except ():'' did not compile at all -- the empty tuple printed as ``()''
  and the whole module failed with a Smalltalk CompileError.
* a ``global'' except target stayed bound in the module after the handler;
  PEP 3110's implicit ``del'' removes it (``'eg' in globals()'' is False).
* ``o.__class__'' as a with / for / unpack / chained target went through
  __setattr__, so ``o.__class__'' read the new class while ``type(o)'' stayed
  the old one.
* a walrus binding a ``nonlocal'' through a method-local class's cell named an
  undeclared temp, so the method never compiled.

Everything here is verified against real CPython by running the file directly;
NameBindingStoresTestCase holds Grail to it on both codegen paths, and checks
that the IR arm compiled every def here rather than falling back.  KNOWN_GRAIL
lists the checks Grail still gets wrong on both paths, which the SUnit class
pins as expected failures.
"""

import contextlib

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (exc.__class__.__name__, exc)


class O:
    pass


class P:
    pass


class Q:
    pass


# --- from-import bound to a global ------------------------------------------

def import_from_global_alias():
    global _sep_alias
    from os import sep as _sep_alias
    return _sep_alias, globals()['_sep_alias'] is _sep_alias


def import_from_global_two_names():
    global _join_g, _split_g
    from os.path import join as _join_g, split as _split_g
    return _join_g('a', 'b'), _split_g('a/b'), 'local' if '_join_g' in locals() else 'global'


def import_from_global_and_local():
    global _basename_g
    from os.path import basename as _basename_g, dirname as dn
    return _basename_g('/x/y'), dn('/x/y')


class Seeded:
    def seed(self):
        # random.Random.seed's shape: a class-body method binding a global.
        global _sha_name_g
        from os import name as _sha_name_g
        return _sha_name_g == globals()['_sha_name_g']


# --- except targets -----------------------------------------------------------

def except_global_target():
    global eg
    try:
        1 / 0
    except ZeroDivisionError as eg:
        inside = eg.__class__.__name__, globals()['eg'] is eg
    return inside, 'eg' in globals()


class Catcher:
    def run(self):
        global ek
        try:
            raise KeyError('k')
        except KeyError as ek:
            inside = ek.args
        return inside, 'ek' in globals()


def except_global_target_read_after():
    global er
    try:
        raise ValueError('v')
    except ValueError as er:
        pass
    try:
        return er
    except NameError as exc:
        return 'NameError', str(exc)


def except_empty_tuple_catches_nothing():
    try:
        try:
            raise KeyError(1)
        except ():
            return 'caught by ()'
    except KeyError as exc:
        return 'propagated', exc.args


def except_empty_tuple_no_raise():
    try:
        x = 'body'
    except ():
        x = 'handler'
    else:
        x = x + '+else'
    return x


def except_empty_tuple_then_another_clause():
    try:
        raise IndexError(2)
    except ():
        return 'first'
    except IndexError:
        return 'second'


# --- the type change through every store form ----------------------------------

def with_class_target():
    o = O()
    with contextlib.nullcontext(P) as o.__class__:
        inside = type(o).__name__
    return inside, type(o).__name__, o.__class__.__name__


def for_class_target():
    o = O()
    seen = []
    for o.__class__ in [P, Q]:
        seen.append(type(o).__name__)
    return seen, type(o).__name__


def unpack_class_leaf():
    o = O()
    a, o.__class__ = 1, P
    return a, type(o).__name__


def nested_unpack_class_leaf():
    o = O()
    (a, (o.__class__, b)) = 1, (Q, 2)
    return a, b, type(o).__name__


def chained_class_target():
    o = O()
    a = o.__class__ = P
    return a.__name__, type(o).__name__


def chained_class_target_middle():
    o = O()
    k = O()
    a = o.__class__ = k.__class__ = Q
    return a.__name__, type(o).__name__, type(k).__name__


class Swapper:
    def swap(self):
        self.__class__ = Swapped
        return self.__class__.__name__

    def swap_chained(self):
        a = self.__class__ = Swapped
        return a.__name__, self.__class__.__name__

    def swap_then_type(self):
        self.__class__ = Swapped
        return type(self).__name__


class Swapped(Swapper):
    pass


# --- the chain temp's name taken by a user local --------------------------------

def chained_holder_local():
    ___chain___ = 'mine'
    a = b = [1]
    return a is b, a, ___chain___


def chained_holder_is_a_target():
    ___chain___ = 'old'
    a = ___chain___ = 'new'
    return a, ___chain___


def chained_holder_value_first_store():
    ___chain___ = 'mine'
    log = []

    class Rec:
        def __setattr__(self, name, value):
            log.append(('set', name, value))

    def obj():
        log.append('obj')
        return Rec()

    def val():
        log.append('val')
        return 7

    obj().x = val()
    return log, ___chain___


# --- a walrus through a method-local class's cell -------------------------------

def walrus_class_cell():
    x = 0

    class C:
        def m(self):
            nonlocal x
            return (x := 5) + 1
    return C().m(), x


def walrus_class_cell_in_comprehension():
    last = None

    class C:
        def m(self):
            nonlocal last
            return [(last := i * 2) for i in range(3)]
    return C().m(), last


# A walrus in a class statement's decorator or keywords evaluates in the scope
# enclosing the class statement, so inside a method it binds the method's own
# local -- not a cell, even though a class is being compiled
# (test_grammar's test_classdef: ``@d := class_decorator'').
class HeaderWalrus:
    def m(self):
        def deco(c):
            return c

        class Meta(type):
            pass

        @d := deco
        class I:
            pass

        class K(metaclass=(mk := Meta)):
            pass
        return d is deco, I.__name__, mk is Meta, type(K) is Meta


def walrus_in_class_header():
    return HeaderWalrus().m()


# --- del of an empty target list, and of mixed shapes ---------------------------

def del_empty_tuple():
    del ()
    return 'ok'


def del_empty_list():
    del []
    return 'ok'


def del_mixed_targets():
    a, b, c = 1, 2, 3
    d = {'k': 1, 'j': 2}

    class B:
        pass
    o = B()
    o.attr = 1
    del (a, [b]), d['k'], o.attr
    return 'a' in locals(), 'b' in locals(), c, d, hasattr(o, 'attr')


# --- a nonlocal except target in a nested def -----------------------------------

def except_nonlocal_target():
    en = 'unset'

    def inner():
        nonlocal en
        try:
            1 / 0
        except ZeroDivisionError as en:
            pass
    inner()
    try:
        return en
    except NameError:
        return 'NameError'


record('import_from_global_alias', import_from_global_alias)
record('import_from_global_two_names', import_from_global_two_names)
record('import_from_global_and_local', import_from_global_and_local)
record('import_from_global_in_method', lambda: Seeded().seed())
record('except_global_target', except_global_target)
record('except_global_target_in_method', lambda: Catcher().run())
record('except_global_target_read_after', except_global_target_read_after)
record('except_empty_tuple_catches_nothing', except_empty_tuple_catches_nothing)
record('except_empty_tuple_no_raise', except_empty_tuple_no_raise)
record('except_empty_tuple_then_another_clause',
       except_empty_tuple_then_another_clause)
record('with_class_target', with_class_target)
record('for_class_target', for_class_target)
record('unpack_class_leaf', unpack_class_leaf)
record('nested_unpack_class_leaf', nested_unpack_class_leaf)
record('chained_class_target', chained_class_target)
record('chained_class_target_middle', chained_class_target_middle)
record('self_class_assign', lambda: Swapper().swap())
record('self_class_chained', lambda: Swapper().swap_chained())
record('self_class_then_type', lambda: Swapper().swap_then_type())
record('chained_holder_local', chained_holder_local)
record('chained_holder_is_a_target', chained_holder_is_a_target)
record('chained_holder_value_first_store', chained_holder_value_first_store)
record('walrus_class_cell', walrus_class_cell)
record('walrus_class_cell_in_comprehension', walrus_class_cell_in_comprehension)
record('walrus_in_class_header', walrus_in_class_header)
record('del_empty_tuple', del_empty_tuple)
record('del_empty_list', del_empty_list)
record('del_mixed_targets', del_mixed_targets)
record('except_nonlocal_target', except_nonlocal_target)


EXPECTED = {
    'import_from_global_alias': ('/', True),
    'import_from_global_two_names': ('a/b', ('a', 'b'), 'global'),
    'import_from_global_and_local': ('y', '/x'),
    'import_from_global_in_method': True,
    # PEP 3110: the target is deleted when the handler ends -- from the MODULE,
    # when it is a global.
    'except_global_target': (('ZeroDivisionError', True), False),
    'except_global_target_in_method': (('k',), False),
    'except_global_target_read_after': ('NameError', "name 'er' is not defined"),
    'except_empty_tuple_catches_nothing': ('propagated', (1,)),
    'except_empty_tuple_no_raise': 'body+else',
    'except_empty_tuple_then_another_clause': 'second',
    'with_class_target': ('P', 'P', 'P'),
    'for_class_target': (['P', 'Q'], 'Q'),
    'unpack_class_leaf': (1, 'P'),
    'nested_unpack_class_leaf': (1, 2, 'Q'),
    'chained_class_target': ('P', 'P'),
    'chained_class_target_middle': ('Q', 'Q', 'Q'),
    'self_class_assign': 'Swapped',
    'self_class_chained': ('Swapped', 'Swapped'),
    'self_class_then_type': 'Swapped',
    'chained_holder_local': (True, [1], 'mine'),
    'chained_holder_is_a_target': ('new', 'new'),
    # The value is evaluated first, then the target's object, then the store.
    'chained_holder_value_first_store': (['val', 'obj', ('set', 'x', 7)], 'mine'),
    'walrus_class_cell': (6, 5),
    'walrus_class_cell_in_comprehension': ([0, 2, 4], 4),
    'walrus_in_class_header': (True, 'I', True, True),
    'del_empty_tuple': 'ok',
    'del_empty_list': 'ok',
    'del_mixed_targets': (False, False, 3, {'j': 2}, False),
    'except_nonlocal_target': 'NameError',
}


# Checks Grail still gets wrong on BOTH paths -- not refusals, and not this
# change's to fix.  NameBindingStoresTestCase pins each as an expected failure,
# so a fix shows up as a failing pin to delete rather than going unnoticed.
#
# * self_class_then_type: ``self.__class__ = X'' cannot change the class of the
#   receiver on the stack (GemStone refuses), so it takes __setattr__ and
#   ``type(self)'' keeps the old class while ``self.__class__'' reads the new.
# * except_nonlocal_target: an ``except ... as en'' under ``nonlocal en'' in a
#   nested def binds a temp of the nested def, not the enclosing local, so the
#   enclosing function never sees the store or the PEP 3110 unbind.
KNOWN_GRAIL = ('self_class_then_type', 'except_nonlocal_target')


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-42s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-42s is not in EXPECTED' % ('FAIL', extra))
