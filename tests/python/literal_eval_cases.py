"""Fixture: ast.literal_eval answers and refuses as CPython's does.

Grail's literal_eval was a hand-written reader from when ast was a stub.  It
read ``'\\u00e9'`` as 'u00e9' -- six escapes known, the rest dropped to their
letter -- answered ``unknown name f`` for ``f'x'`` where CPython says
``malformed node or string``, refused ``...`` and ``-(1)`` with a float() or
int() conversion error, and took no AST node.  It is CPython's now, over the
real tree ast.parse builds; the reader remains only as a fast path for the
plain literals it reads exactly.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import ast

r = {}


def outcome(source):
    try:
        return ('value', ast.literal_eval(source))
    except (ValueError, SyntaxError, TypeError) as e:
        return (type(e).__name__, str(e).split(':')[0])


r['numbers'] = [outcome(s) for s in ('1', '-1', '+1.5', '1+2j', '-1-2j', '0x10', '1_000', '1e3', '-(1)')]
r['strings'] = [outcome(s) for s in ("'a'", "b'x'", "'a' 'b'", "'\\u00e9'", "r'\\n'", "'\\x41\\t'")]
r['containers'] = [outcome(s) for s in ('(1, 2)', '1, 2', '[1, [2]]', "{1: 'a'}", '{1, 2}', 'set()', '()', '{}')]
r['singletons'] = [outcome(s) for s in ('True', 'None', '...', '  7', '\t8', '\n9')]
r['refused'] = [outcome(s) for s in ("f'x'", 'x', '1 + 1', 'set([1])', '{**{}}', '[*[1]]', "-'a'", '--1',
                                     '1 if 1 else 2')]
r['syntax_errors'] = [outcome(s)[0] for s in ('(1,', "'unterminated")]
r['nodes'] = [outcome(ast.Constant(5)), outcome(ast.parse('[1]', mode='eval')), outcome(5)]

EXPECTED = {
    'numbers': [('value', 1), ('value', -1), ('value', 1.5), ('value', 1 + 2j), ('value', -1 - 2j),
                ('value', 16), ('value', 1000), ('value', 1000.0), ('value', -1)],
    'strings': [('value', 'a'), ('value', b'x'), ('value', 'ab'), ('value', 'é'), ('value', '\\n'),
                ('value', 'A\t')],
    'containers': [('value', (1, 2)), ('value', (1, 2)), ('value', [1, [2]]), ('value', {1: 'a'}),
                   ('value', {1, 2}), ('value', set()), ('value', ()), ('value', {})],
    'singletons': [('value', True), ('value', None), ('value', Ellipsis), ('value', 7), ('value', 8),
                   ('value', 9)],
    # {**{}}: its key is None, a node with no line to report.
    'refused': 4 * [('ValueError', 'malformed node or string on line 1')]
               + [('ValueError', 'malformed node or string')]
               + 4 * [('ValueError', 'malformed node or string on line 1')],
    'syntax_errors': ['SyntaxError', 'SyntaxError'],
    'nodes': [('value', 5), ('value', [1]), ('ValueError', 'malformed node or string')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
