"""Fixture: exec() stores the annotate function of the code it runs in that code's namespace.

PEP 649: module-level code that annotates names gets an ``__annotate__``
function in its namespace.  exec() runs module-level code, so CPython binds
``__annotate__`` there -- in the LOCALS mapping when exec is given one -- and,
under ``from __future__ import annotations``, the ``__annotations__`` dict of
source strings instead.  Grail's exec bound neither, so annotations made by
exec'd code could not be read back at all (test_grammar
test_var_annot_simple_exec: ``KeyError: '__annotate__'``).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

gns = {}
lns = {}
exec("'docstring'\nx: int = 5\n", gns, lns)
r['separate_locals'] = ['__annotate__' in gns, '__annotate__' in lns, lns['x']]
gns.update(lns)
r['annotate_value'] = lns['__annotate__'](1)

ns = {}
exec("y: str = 'a'\nz: list[int]\n", ns)
r['one_namespace'] = [ns['__annotate__'](1), 'z' in ns, '__annotations__' in ns]

future = {}
exec("from __future__ import annotations\nw: dict[str, int] = {}\n", future)
r['future_import'] = [future.get('__annotations__'), future.get('__annotate__', 'absent')]

plain = {}
exec("v = 1\n", plain)
r['no_annotations'] = '__annotate__' in plain

lazy = {}
exec("q: Undefined = 1\n", lazy)
try:
    lazy['__annotate__'](1)
    r['lazy'] = 'evaluated'
except NameError:
    r['lazy'] = 'NameError on read, not at exec'

EXPECTED = {
    'separate_locals': [False, True, 5],
    'annotate_value': {'x': int},
    'one_namespace': [{'y': str, 'z': list[int]}, False, False],
    'future_import': [{'w': 'dict[str, int]'}, 'absent'],
    'no_annotations': False,
    'lazy': 'NameError on read, not at exec',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-16s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
