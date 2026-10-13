"""Fixture: exec() and eval() insert __builtins__ into the globals they get.

CPython inserts a reference to the builtins module's dict into a globals dict
that has no ``__builtins__'' key, so after ``ns = {}; exec(src, ns)'' the key
is there and ``del ns['__builtins__']'' -- a common way to keep only the names
the source defined -- works.  Grail left the dict untouched, and that del
raised KeyError (#1507).  A key the caller supplied is kept, whatever it
holds: ``{'__builtins__': {}}'' still runs source with no builtins at all.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import builtins

r = {}

ns = {}
exec('x = 1', ns)
r['exec_inserts_the_builtins_dict'] = ns.get('__builtins__') is builtins.__dict__

ns = {}
eval('1', ns)
r['eval_inserts_the_builtins_dict'] = ns.get('__builtins__') is builtins.__dict__

ns = {}
exec('def f(): return 1\nclass C: pass\nn = 3', ns)
del ns['__builtins__']
r['del_leaves_what_the_source_defined'] = sorted(ns)

ns = {}
exec('seen = __builtins__ is B', {'B': builtins.__dict__}, ns)
g = {'B': builtins.__dict__}
exec('seen = __builtins__ is B', g)
r['the_source_sees_its_builtins'] = g['seen']

ns = {}
exec('n = len([1, 2, 3]) + abs(-4)', ns)
r['builtins_still_resolve'] = ns['n']

custom = {'len': lambda s: 99}
ns = {'__builtins__': custom}
exec('n = len("ab")', ns)
r['a_supplied_builtins_is_kept'] = (ns['__builtins__'] is custom, ns['n'])

try:
    exec('len("ab")', {'__builtins__': {}})
    r['empty_builtins_restricts'] = 'no error'
except NameError as e:
    r['empty_builtins_restricts'] = str(e)


class D(dict):
    def __setitem__(self, key, value):
        raise RuntimeError('__setitem__ called')


d = D()
exec('pass', d)
r['a_dict_subclass_gets_it_without_setitem'] = '__builtins__' in d

outer = {}
exec('inner = {}\nexec("y = 2", inner)\nhas = "__builtins__" in inner', outer)
r['nested_exec'] = (outer['has'], '__builtins__' in outer)

before = set(globals())
exec('pass')
r['no_globals_argument_adds_nothing'] = sorted(set(globals()) - before)


EXPECTED = {
    'exec_inserts_the_builtins_dict': True,
    'eval_inserts_the_builtins_dict': True,
    'del_leaves_what_the_source_defined': ['C', 'f', 'n'],
    'the_source_sees_its_builtins': True,
    'builtins_still_resolve': 7,
    'a_supplied_builtins_is_kept': (True, 99),
    'empty_builtins_restricts': "name 'len' is not defined",
    'a_dict_subclass_gets_it_without_setitem': True,
    'nested_exec': (True, True),
    'no_globals_argument_adds_nothing': ['before'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
