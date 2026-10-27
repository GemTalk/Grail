"""Fixture: an f-string decodes escapes as text, never as structure, and in its format spec too.

CPython's lexer (PEP 701) treats only a brace written as itself as opening a
replacement field: ``f'\x7b1+1}}'`` is the text ``{1+1}``, however the
brace was spelled.  And a format spec is string data like the text between
fields, so a non-raw f-string decodes its escapes -- ``f'{x:\n}'`` hands
__format__ a newline -- while a raw one keeps them.  Grail decoded a brace
escape before finding the fields, so it evaluated ``1+1``, and kept every
escape in a format spec verbatim.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Unchanged:
    def __format__(self, spec):
        return spec


r['brace_escapes'] = [f'\x7b1+1}}', f'\x7b1+1', f'\u007b1+1',
                      f'\N{LEFT CURLY BRACKET}1+1\N{RIGHT CURLY BRACKET}', f'\173x\175\175']
r['spec_escapes'] = [f'{Unchanged():\n}', f'{Unchanged():\u2603}', f"{Unchanged():\xFF}",
                     f'{Unchanged():\t>}']
r['raw_spec'] = [rf"{Unchanged():\xFF}", rf'{Unchanged():\n}']
r['nested_spec_literals'] = [rf"{Unchanged():{'\xFF'}}", f"{Unchanged():{r'\xFF'}}"]
r['literal_text'] = [f'a\tb{1}\n', rf'a\tb{1}', f'{{{1}}}\x41']

EXPECTED = {
    'brace_escapes': ['{1+1}', '{1+1', '{1+1', '{1+1}', '{x}}'],
    'spec_escapes': ['\n', '\u2603', '\xff', '\t>'],
    'raw_spec': ['\\xFF', '\\n'],
    'nested_spec_literals': ['\xff', '\\xFF'],
    'literal_text': ['a\tb1\n', 'a\\tb1', '{1}A'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-22s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
