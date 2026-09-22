# Two things test_builtin's test_all_any_tuple_optimization checks, and Grail
# got both wrong in opposite directions.
#
# co_consts HELD NOTHING.  CPython puts one code object in a function's
# co_consts for each nested scope that gets one, and code counts them: the test
# asserts a genexp leaves EXACTLY ONE, as its way of checking the comprehension
# was not duplicated.  Grail keeps no constant pool at all -- it compiles Python
# to Smalltalk methods -- so co_consts was an empty tuple and the count was
# always zero.
#
# Which scopes get one changed in 3.12, and getting that wrong would be worse
# than the zero: list, set and dict comprehensions were INLINED and no longer
# appear, so counting every comprehension would answer three where CPython
# answers none.  A GENERATOR expression still gets one, and so does a nested def
# or lambda.  Measured on 3.14.6, which is what the rows below record.
#
# A SHADOWED BUILT-IN TYPE WAS NOT SHADOWED.  CPython's LOAD_GLOBAL reads the
# module's own globals before builtins, so ``tuple = lambda x: 'tuple''' at
# module level shadows the type for every call in that module.  Grail's
# fixed-arity and varargs builtin call paths already probe the module globals
# for exactly that; the CLASS-call fast path did not.  So of ``all(...)'',
# ``any(...)'' and ``tuple(...)'' the first two honoured the shadow and the
# third quietly built a real tuple -- which is only visible because the test
# overrides all three together and compares the three answers.
#
# test_builtin's test_all_any_tuple_optimization.

import builtins
import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _code_objects(f):
    return [c for c in f.__code__.co_consts if isinstance(c, types.CodeType)]


def has_genexp():
    return all(x for x in [1])


def has_listcomp():
    return [x for x in [1]]


def has_setcomp():
    return {x for x in [1]}


def has_dictcomp():
    return {x: x for x in [1]}


def has_two_genexps():
    return (x for x in [1]), (y for y in [2])


def has_nested_def():
    def inner():
        pass
    return inner


def has_lambda():
    return lambda: 1


def has_nothing():
    return 1


# --- which scopes get a code object ------------------------------------------

r['genexp'] = outcome(lambda: len(_code_objects(has_genexp)))
r['listcomp'] = outcome(lambda: len(_code_objects(has_listcomp)))
r['setcomp'] = outcome(lambda: len(_code_objects(has_setcomp)))
r['dictcomp'] = outcome(lambda: len(_code_objects(has_dictcomp)))
r['two_genexps'] = outcome(lambda: len(_code_objects(has_two_genexps)))
r['nested_def'] = outcome(lambda: len(_code_objects(has_nested_def)))
r['lambda'] = outcome(lambda: len(_code_objects(has_lambda)))
r['nothing'] = outcome(lambda: len(_code_objects(has_nothing)))

# --- and what they look like ---------------------------------------------------

r['consts_is_a_tuple'] = outcome(lambda: type(has_genexp.__code__.co_consts).__name__)
r['genexp_name'] = outcome(lambda: [c.co_name for c in _code_objects(has_genexp)])
r['nested_def_name'] = outcome(lambda: [c.co_name for c in _code_objects(has_nested_def)])
r['lambda_name'] = outcome(lambda: [c.co_name for c in _code_objects(has_lambda)])

# --- a shadowed built-in type ------------------------------------------------------

_f_all = lambda: all(x - 2 for x in [1, 2, 3])
_f_any = lambda: any(x - 1 for x in [1, 2, 3])
_f_tuple = lambda: tuple(2 * x for x in [1, 2, 3])


def _with_module_shadow():
    global all, any, tuple
    saved = all, any, tuple
    try:
        all = lambda x: "all"
        any = lambda x: "any"
        tuple = lambda x: "tuple"
        return [_f_all(), _f_any(), _f_tuple()]
    finally:
        all, any, tuple = saved


def _with_builtins_shadow():
    global all, any, tuple
    saved = all, any, tuple
    try:
        builtins.all = all = lambda x: "all"
        builtins.any = any = lambda x: "any"
        builtins.tuple = tuple = lambda x: "tuple"
        return [_f_all(), _f_any(), _f_tuple()]
    finally:
        all, any, tuple = saved
        builtins.all, builtins.any, builtins.tuple = saved


r['module_shadow'] = outcome(_with_module_shadow)
r['builtins_shadow'] = outcome(_with_builtins_shadow)

# --- controls --------------------------------------------------------------------------
#
# The shadow probe must not disturb an UNSHADOWED class call, and the restored
# builtins must still be the real ones.

r['unshadowed_tuple'] = outcome(lambda: tuple(x for x in [1, 2]))
r['unshadowed_all'] = outcome(lambda: all(x for x in [1, 2]))
r['tuple_is_a_type'] = outcome(lambda: isinstance(tuple(), tuple))
r['str_call'] = outcome(lambda: str(12))
r['int_call'] = outcome(lambda: int('12'))
r['genexp_still_runs'] = outcome(lambda: has_genexp())


EXPECTED = {
    'builtins_shadow': "ok -> ['all', 'any', 'tuple']",
    'consts_is_a_tuple': "ok -> 'tuple'",
    'dictcomp': 'ok -> 0',
    'genexp': 'ok -> 1',
    'genexp_name': "ok -> ['<genexpr>']",
    'genexp_still_runs': 'ok -> True',
    'int_call': 'ok -> 12',
    'lambda': 'ok -> 1',
    'lambda_name': "ok -> ['<lambda>']",
    'listcomp': 'ok -> 0',
    'module_shadow': "ok -> ['all', 'any', 'tuple']",
    'nested_def': 'ok -> 1',
    'nested_def_name': "ok -> ['inner']",
    'nothing': 'ok -> 0',
    'setcomp': 'ok -> 0',
    'str_call': "ok -> '12'",
    'tuple_is_a_type': 'ok -> True',
    'two_genexps': 'ok -> 2',
    'unshadowed_all': 'ok -> True',
    'unshadowed_tuple': 'ok -> (1, 2)',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-22s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
