"""Fixture: a SyntaxError in a source with CRLF or CR line ends is located as CPython locates it.

CPython reads source with universal newlines -- a CRLF or a lone CR is one
LF -- before it scans a token, so lines and columns count the translated text
(Parser/tokenizer, translate_newlines).  Grail's tokenizer translated too, but
the parser and the compiler located errors in the RAW text, so every error
after a CRLF was one column early per CR before it, and after a lone CR on the
wrong line.  Every check here holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


r['after_a_crlf'] = outcome('x=1\r\ny=1 +')
r['across_a_crlf'] = outcome('x=1\r\ny=(1 +\r\n)')
r['missing_comma'] = outcome('y=(1,\r\n 2 3)')
r['after_a_lone_cr'] = outcome('x=1\ry=1 +')
r['compiler_errors'] = [outcome('x=1\r\nreturn 5'), outcome('x = 1\r\n\r\nyield 2')]
r['in_an_fstring_field'] = [outcome("a=1\r\nb=2\r\nc=f'{a +}'"), outcome("x=1\r\ny=f'''{\r\n!a}'''")]
r['indentation'] = outcome('def f():\r\n    x = 1\r\n  y = 2')
r['still_compiles'] = [outcome('x = 1\r\ny = (2,\r\n     3)\r\n'), outcome('s = """a\r\nb"""\r\n')]
ns = {}
exec('s = """a\r\nb"""\r\nt = """c\rd"""\r\n', ns)
r['literals_hold_lf'] = (ns['s'], ns['t'])

EXPECTED = {
    'after_a_crlf': ('invalid syntax', 2, 6, 2, 7),
    'across_a_crlf': ('invalid syntax', 3, 1, 3, 2),
    'missing_comma': ('invalid syntax. Perhaps you forgot a comma?', 2, 2, 2, 5),
    'after_a_lone_cr': ('invalid syntax', 2, 6, 2, 7),
    'compiler_errors': [("'return' outside function", 2, 1, 2, 9), ("'yield' outside function", 3, 1, 3, 8)],
    'in_an_fstring_field': [("f-string: expecting '=', or '!', or ':', or '}'", 3, 8, 3, 9),
                            ("f-string: valid expression required before '!'", 3, 1, 3, 2)],
    'indentation': ('unindent does not match any outer indentation level', 3, 8, 3, -1),
    'still_compiles': ['ok', 'ok'],
    'literals_hold_lf': ('a\nb', 'c\nd'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-22s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
