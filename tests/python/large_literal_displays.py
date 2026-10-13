"""Fixture: a list or tuple display of thousands of elements (#1423).

Grail emitted a display as one Smalltalk brace array, and GemStone's
compiler refuses one of about 1,800 elements: ``CompileError 1001,
expression nesting too deep''.  It was UNCATCHABLE -- the session ended --
so a module with a big generated table could not even be imported: nine
pygments lexer builtin tables (_cocoa_builtins, _lilypond_builtins,
_openedge_builtins, ...), pygments' lisp and matlab lexers, and
idna.uts46data, which pip vendors (8,372 elements).

Grail now emits a big display as chunks of at most 256 elements joined
with ``,'' (and chunks of chunks past 32,768).  The displays here are built
as source text and exec'd, so this file stays small; the sizes straddle the
chunk boundaries, and the elements carry side effects so the ORDER of
evaluation across chunks is checked, not just the result.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def build(n, kind, elt='{i}'):
    items = ', '.join(elt.format(i=i) for i in range(n))
    if kind == 'list':
        return '[' + items + ']'
    if kind == 'tuple':
        return '(' + items + ',)'
    if kind == 'set':
        return '{' + items + '}'
    return '{' + ', '.join('{i}: {i}'.format(i=i) for i in range(n)) + '}'


def module_value(src):
    ns = {}
    exec('X = ' + src, ns)
    return ns['X']


def function_value(src):
    ns = {}
    exec('def f():\n    return ' + src + '\n', ns)
    return ns['f']()


def ordered(n, kind):
    # Each element calls nxt(), so the result is 1..n only if the elements
    # ran left to right, chunk after chunk.
    ns = {}
    exec('c = [0]\ndef nxt():\n    c[0] += 1\n    return c[0]\n'
         'def f():\n    return ' + build(n, kind, 'nxt()') + '\n', ns)
    v = ns['f']()
    return (type(v).__name__, list(v) == list(range(1, n + 1)))


r['sizes_around_the_chunk'] = [
    len(module_value(build(n, kind)))
    for kind in ('list', 'tuple') for n in (255, 256, 257, 512, 513)]
r['two_thousand'] = [(type(module_value(build(2000, k))).__name__,
                      module_value(build(2000, k)) == (list if k == 'list' else tuple)(range(2000)))
                     for k in ('list', 'tuple')]
r['strings'] = module_value(build(3000, 'tuple', "'s{i}'"))[2999]
r['idna_shaped_pairs'] = module_value(build(9000, 'tuple', "({i}, 'V')"))[8999]
r['inside_a_function'] = sum(function_value(build(5000, 'list')))
r['three_levels'] = len(module_value(build(40000, 'tuple')))
r['evaluated_in_order'] = [ordered(n, k) for k in ('list', 'tuple')
                           for n in (300, 5000)]
r['sets_and_dicts_too'] = (len(module_value(build(3000, 'set'))),
                           len(module_value(build(3000, 'dict'))))
r['small_unchanged'] = (module_value('[1, *[2, 3], 4]'), module_value('()'),
                        module_value('[]'), module_value('(1,)'))


EXPECTED = {
    'sizes_around_the_chunk': [255, 256, 257, 512, 513] * 2,
    'two_thousand': [('list', True), ('tuple', True)],
    'strings': 's2999',
    'idna_shaped_pairs': (8999, 'V'),
    'inside_a_function': sum(range(5000)),
    'three_levels': 40000,
    'evaluated_in_order': [('list', True), ('list', True),
                           ('tuple', True), ('tuple', True)],
    'sets_and_dicts_too': (3000, 3000),
    'small_unchanged': ([1, 2, 3, 4], (), [], (1,)),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-24s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)[:200]))
    print(SUMMARY)
