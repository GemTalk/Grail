"""Fixture: a type alias's runtime behaviour, as CPython's typevarobject.c has it.

  * TypeAliasType refuses type parameters with a default followed by one
    without (typealias_check_type_params) -- Grail accepted them;
  * it, TypeVar, ParamSpec, TypeVarTuple and the ParamSpec args and kwargs are
    immutable types (Py_TPFLAGS_IMMUTABLETYPE) -- Grail stored the attribute;
  * an alias iterates to Unpack of itself (its tp_iter is unpack_iter), so
    ``*Alias`` works -- Grail had no __iter__ and raised TypeError;
  * an alias's value is evaluated in a scope of its own: a name it reads from
    the enclosing function while still unbound is a free variable, and a name
    it reads from an exec's globals is read from that mapping, __missing__ and
    all, when the value is computed -- Grail said ``local variable`` for one and
    NameError for the other.  A module's globals() view is no such mapping for a
    name it does not hold.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from typing import ParamSpec, TypeAliasType, TypeVar, TypeVarTuple, Unpack
import typing

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


T = TypeVar('T')
WithDefault = TypeVar('WithDefault', default=int)
r['default_order'] = [outcome(lambda: TypeAliasType('A', int, type_params=(T, WithDefault)).__name__),
                      outcome(lambda: TypeAliasType('A', int, type_params=(WithDefault, T)))]


def store_on(cls):
    def run():
        cls.whatever = 'x'
        return 'stored'
    return run


r['immutable_types'] = [outcome(store_on(cls)) for cls in (
    TypeAliasType, TypeVar, ParamSpec, TypeVarTuple, typing.ParamSpecArgs, typing.ParamSpecKwargs)]
r['generic_is_mutable'] = outcome(store_on(typing.Generic))

type Pair = tuple[int, int]


class Variadic[*Ts]:
    pass


r['unpack'] = [(*Pair,)[0] == Unpack[Pair], Variadic[str, *Pair].__args__ == (str, Unpack[Pair])]


def later_binding():
    type Missing = list[_Later]
    first = outcome(lambda: Missing.__value__)
    _Later = int
    return [first, Missing.__value__ == list[int]]


r['free_variable'] = later_binding()


class AnswersEveryName(dict):
    def __missing__(self, key):
        return key


module_level = AnswersEveryName()
exec(compile("type Alias = undefined", "test", "exec"), module_level)
class_level = AnswersEveryName()
exec(compile("class A: type Alias = undefined", "test", "exec"), class_level)
r['exec_globals_mapping'] = [module_level['Alias'].__value__, class_level['A'].Alias.__value__]


def module_globals_exec():
    # The module's globals() view answers a module ATTRIBUTE for some names
    # it does not hold; an exec'd body must not read __class__ from it.
    try:
        exec("class X:\n    __class__", globals(), {})
    except NameError as e:
        return type(e).__name__
    return 'no error'


r['exec_reads_module_globals_view'] = module_globals_exec()

EXPECTED = {
    'default_order': ['A', "TypeError: non-default type parameter '~T' follows default type parameter"],
    'immutable_types': [
        "TypeError: cannot set 'whatever' attribute of immutable type 'typing.%s'" % name
        for name in ('TypeAliasType', 'TypeVar', 'ParamSpec', 'TypeVarTuple', 'ParamSpecArgs', 'ParamSpecKwargs')],
    'generic_is_mutable': 'stored',
    'unpack': [True, True],
    'free_variable': ["NameError: cannot access free variable '_Later' where it is not associated with a value"
                      " in enclosing scope", True],
    'exec_globals_mapping': ['undefined', 'undefined'],
    'exec_reads_module_globals_view': 'NameError',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
