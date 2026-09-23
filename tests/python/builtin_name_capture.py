"""Fixture: a Python name that is ALSO a name Grail's generated code relies on.

Grail compiles Python to Smalltalk, and the generated code used to refer to
runtime classes and builtins BY NAME -- ``tuple'' for every tuple display,
``set'' for a set display, ``slice'' for a slice, ``object'' / ``importlib'' in
class-definition code, ``str'' / ``repr'' / ``format'' for every f-string field.
A Python local, parameter or global of the same name became a Smalltalk
variable of that name and captured the reference: ``def f(tuple): return
(1, 2)'' died uncatchably, and ``format = ...'' at module level broke every
formatted f-string field in the module.

Also here, because they sit on the same paths: a rebound ``self'' (including
beside a parameter called ``_self''), star targets binding a list, a star over
a str, f-string conversion + spec semantics, and eval()'s name lookup through a
live locals mapping.

Every EXPECTED value was measured by RUNNING CPython 3.14.6 on this file.
"""

import collections
from dataclasses import dataclass


r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- locals named like the runtime classes the codegen names ------------------

def tuple_param(tuple):
    return (1, 2), (), (*'ab',), tuple

def varargs_beside_tuple(tuple, *args):
    return args

def set_param(set):
    return sorted({1, 2}), sorted({x for x in 'ba'}), set

def slice_param(slice):
    xs = [1, 2, 3]
    for a, *b in [(1, 2, 3)]:
        pass
    return xs[0:2], xs[::2], b, slice

def object_param(object):
    class C:
        attr = 1
    C.attr = 2
    return type(C()).__name__, C.attr, object

def list_param(list):
    a, *b = (1, 2, 3)
    return b, [*b], list

def complex_param(complex):
    return 2j, complex

def importlib_local():
    import importlib
    class C:
        pass
    return C.__name__, importlib.__name__

def dataclass_beside_tuple(tuple):
    @dataclass
    class P:
        x: int
    return repr(P(1)), tuple

r['tuple_param'] = outcome(lambda: tuple_param(5))
r['varargs_beside_tuple'] = outcome(lambda: varargs_beside_tuple(5, 1, 2))
r['lambda_varargs_beside_tuple'] = outcome(lambda: (lambda tuple, *a: a)(5, 1, 2))
r['set_param'] = outcome(lambda: set_param(5))
r['slice_param'] = outcome(lambda: slice_param(5))
r['object_param'] = outcome(lambda: object_param(5))
r['list_param'] = outcome(lambda: list_param(5))
r['complex_param'] = outcome(lambda: complex_param(5))
r['importlib_local'] = outcome(importlib_local)
r['dataclass_beside_tuple'] = outcome(lambda: dataclass_beside_tuple(5))
r['eval_tuple_global'] = outcome(lambda: eval('(1, 2)', {'tuple': 5}))
r['eval_set_global'] = outcome(lambda: sorted(eval('{1, 2}', {'set': 5})))


# --- f-strings: no name lookup, and CPython's conversion/spec semantics -------

class Fmt:
    def __format__(self, spec):
        return 'fmt[' + spec + ']'
    def __str__(self):
        return 'str'
    def __repr__(self):
        return 'repr'

def fstring_params(format, str, repr, ascii):
    return f'{1:>3}|{"a"!r:>5}|{2}|{"\xe9"!a}'

r['fstring_params_named_like_builtins'] = outcome(lambda: fstring_params(1, 2, 3, 4))
format = 'a module global'
r['fstring_module_global_format'] = outcome(lambda: f'{1:>3}|{2:x}')
del format
r['fstring_no_spec_uses_format'] = outcome(lambda: f'{Fmt()}')
r['fstring_conversions'] = outcome(lambda: (f'{Fmt()!s}', f'{Fmt()!r}', f'{Fmt():x}'))
r['fstring_conversion_with_spec'] = outcome(lambda: (f'{"a"!r:>5}|', f'{Fmt()!s:>5}|'))
w = 6
r['fstring_nested_spec'] = outcome(lambda: f'{3.14159:>{w}.2f}|{Fmt():{w}}')
r['fstring_plain_values'] = outcome(lambda: f'{3.5} {True} {None} {[1, "a"]} {-0.0}')


# --- a rebound self ------------------------------------------------------------

class Rebinds:
    def swap(self, format=None, *, _self=None):
        # test_annotationlib's shape: a parameter spelled like the old
        # transport name of a rebound self.
        if _self is not None:
            self, format = _self, self
        return self, type(format).__name__

    def from_param(self, _self=None):
        self = _self
        return self

    def loop(self):
        for self in (1, 2):
            pass
        return self

def plain_def_rebinds_self(self):
    self = self * 7
    return self

def plain_def_self_and__self(self, _self):
    return self, _self

def plain_def_rebinds_nil(nil, x):
    nil = nil + x
    return nil

r['rebind_self_beside__self'] = outcome(lambda: Rebinds().swap(1, _self=2))
r['rebind_self_from__self_param'] = outcome(lambda: Rebinds().from_param(4))
r['for_loop_rebinds_self'] = outcome(lambda: Rebinds().loop())
r['plain_def_rebinds_self'] = outcome(lambda: plain_def_rebinds_self(3))
r['plain_def_self_and__self'] = outcome(lambda: plain_def_self_and__self(1, 2))
r['plain_def_rebinds_nil'] = outcome(lambda: plain_def_rebinds_nil(1, 2))


# --- star targets bind a list; a star over a str yields strs ------------------

def star_targets():
    a, *b = (1, 2, 3)
    c, *d = 'xyz'
    *e, g = range(4)
    h, *i, j = [1, 2, 3, 4]
    k, *l = iter((5, 6))
    for m, *n in [(1, 2, 3)]:
        pass
    return b, d, e, i, l, n

r['star_targets_bind_lists'] = outcome(star_targets)
r['star_over_str'] = outcome(lambda: ((*'ab',), [*'ab'], sorted({*'ab'}), (*'hi', *[1])))
r['star_over_bytes'] = outcome(lambda: (*b'ab',))
r['star_too_few'] = outcome(lambda: exec('a, *b = (1,)\nx, y, *z = (1,)'))


# --- eval(): a live locals mapping, and no implementation names ---------------

class Missing(dict):
    def __missing__(self, key):
        return 'D:' + key

r['eval_implementation_names'] = outcome(lambda: [outcome(lambda n=n: eval(n, {}))
    for n in ('module', 'json', 'PyDict', 'Array', 'Object')])
r['exec_module_name'] = outcome(lambda: exec('json', {}))
r['eval_locals_mapping_before_builtins'] = outcome(lambda: eval('len', {}, Missing()))
r['eval_locals_mapping_call'] = outcome(lambda: eval('len(x)', {}, Missing(x=[1, 2])))
r['eval_locals_mapping_before_globals'] = outcome(lambda: eval('a', {'a': 1}, Missing(a=2)))
r['eval_locals_mapping_missing'] = outcome(lambda: eval('a', {'a': 1}, Missing()))
r['eval_globals_mapping'] = outcome(lambda: (eval('zz', Missing()), eval('len', Missing())))
r['eval_lambda_reads_globals'] = outcome(lambda: eval('(lambda: len)()', {}, Missing()) is len)
r['eval_genexp_reads_globals'] = outcome(lambda: eval('[f() for f in [lambda: 1]]', {}, Missing()))
r['eval_inlined_comprehension'] = outcome(lambda: (
    eval('[len for _ in (1,)]', {}, Missing()),
    eval('[x for x in (1, 2)]', {}, Missing())))
r['eval_walrus'] = outcome(lambda: eval('(y := 5) + y', {}, Missing()))
r['eval_plain_mappings'] = outcome(lambda: (eval('a + b', {'a': 1}, {'b': 2}),
    eval('a', {}, collections.ChainMap({'a': 3}))))
r['exec_locals_mapping'] = outcome(lambda: (lambda ns: (exec('r = len', {}, ns), ns['r'])[1])(Missing()))
r['not_callable_names_python_type'] = outcome(lambda: eval('x()', {'x': 'abc'}))

EXPECTED = {
    'complex_param': 'ok -> (2j, 5)',
    'dataclass_beside_tuple': "ok -> ('dataclass_beside_tuple.<locals>.P(x=1)', 5)",
    'eval_genexp_reads_globals': 'ok -> [1]',
    'eval_globals_mapping': "ok -> ('D:zz', 'D:len')",
    'eval_implementation_names': 'ok -> ["NameError: name \'module\' is not defined", "NameError: name \'json\' is not defined", "NameError: name \'PyDict\' is not defined", "NameError: name \'Array\' is not defined", "NameError: name \'Object\' is not defined"]',
    'eval_inlined_comprehension': "ok -> (['D:len'], [1, 2])",
    'eval_lambda_reads_globals': 'ok -> True',
    'eval_locals_mapping_before_builtins': "ok -> 'D:len'",
    'eval_locals_mapping_before_globals': 'ok -> 2',
    'eval_locals_mapping_call': "TypeError: 'str' object is not callable",
    'eval_locals_mapping_missing': "ok -> 'D:a'",
    'eval_plain_mappings': 'ok -> (3, 3)',
    'eval_set_global': 'ok -> [1, 2]',
    'eval_tuple_global': 'ok -> (1, 2)',
    'eval_walrus': 'ok -> 10',
    'exec_locals_mapping': "ok -> 'D:len'",
    'exec_module_name': "NameError: name 'json' is not defined",
    'for_loop_rebinds_self': 'ok -> 2',
    'fstring_conversion_with_spec': 'ok -> ("  \'a\'|", \'  str|\')',
    'fstring_conversions': "ok -> ('str', 'repr', 'fmt[x]')",
    'fstring_module_global_format': "ok -> '  1|2'",
    'fstring_nested_spec': "ok -> '  3.14|fmt[6]'",
    'fstring_no_spec_uses_format': "ok -> 'fmt[]'",
    'fstring_params_named_like_builtins': 'ok -> "  1|  \'a\'|2|\'\\\\xe9\'"',
    'fstring_plain_values': 'ok -> "3.5 True None [1, \'a\'] -0.0"',
    'importlib_local': "ok -> ('C', 'importlib')",
    'lambda_varargs_beside_tuple': 'ok -> (1, 2)',
    'list_param': 'ok -> ([2, 3], [2, 3], 5)',
    'not_callable_names_python_type': "TypeError: 'str' object is not callable",
    'object_param': "ok -> ('C', 2, 5)",
    'plain_def_rebinds_nil': 'ok -> 3',
    'plain_def_rebinds_self': 'ok -> 21',
    'plain_def_self_and__self': 'ok -> (1, 2)',
    'rebind_self_beside__self': "ok -> (2, 'Rebinds')",
    'rebind_self_from__self_param': 'ok -> 4',
    'set_param': "ok -> ([1, 2], ['a', 'b'], 5)",
    'slice_param': 'ok -> ([1, 2], [1, 3], [2, 3], 5)',
    'star_over_bytes': 'ok -> (97, 98)',
    'star_over_str': "ok -> (('a', 'b'), ['a', 'b'], ['a', 'b'], ('h', 'i', 1))",
    'star_targets_bind_lists': "ok -> ([2, 3], ['y', 'z'], [0, 1, 2], [2, 3], [6], [2, 3])",
    'star_too_few': 'ValueError: not enough values to unpack (expected at least 2, got 1)',
    'tuple_param': "ok -> ((1, 2), (), ('a', 'b'), 5)",
    'varargs_beside_tuple': 'ok -> (1, 2)',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-40s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-40s %s is not in EXPECTED' % (extra, 'DIFF'))
