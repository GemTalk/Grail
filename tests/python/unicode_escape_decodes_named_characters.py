"""Fixture: the unicode-escape codec decodes \\N{NAME} and refuses a bad one.

CPython's unicode_escape decoder (Objects/unicodeobject.c:6809-6836) reads
``\\N{NAME}'' through the Unicode database, case-insensitively.  Without an
opening brace, a closing brace or a name it is "malformed \\N character
escape"; a name the database does not have is "unknown Unicode character
name", the error spanning the escape so an error handler can drop or
replace exactly it.

Grail's decoder had no \\N escape: it kept the text, so
``b'\\\\N{foo}xx'.decode('unicode-escape', 'ignore')'' answered '\\\\N{foo}xx'
where CPython answers 'xx' (test_str's test_codecs_errors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def decoded(raw, errors='strict'):
    try:
        return ascii(raw.decode('unicode-escape', errors))
    except UnicodeDecodeError as e:
        return (e.start, e.end, e.reason)


r['a_name'] = [decoded(b'\\N{LATIN SMALL LETTER A}x'), decoded(b'\\N{latin small letter a}'),
               decoded(b'\\N{EMPTY SET}')]
r['an_unknown_name'] = [decoded(b'\\N{foo}xx'), decoded(b'a\\N{foo}')]
r['malformed'] = [decoded(b'\\Nxx'), decoded(b'\\N'), decoded(b'\\N{}x'), decoded(b'\\N{foo')]
r['error_handlers'] = [decoded(b'\\N{foo}xx', 'ignore'), decoded(b'\\N{foo}xx', 'replace'),
                       decoded(b'a\\Nb', 'replace')]
r['other_escapes_unchanged'] = decoded(b'\\x41\\u00e9\\n')

EXPECTED = {
    'a_name': ["'ax'", "'a'", "'\\u2205'"],
    'an_unknown_name': [(0, 7, 'unknown Unicode character name'), (1, 8, 'unknown Unicode character name')],
    'malformed': [(0, 2, 'malformed \\N character escape'), (0, 2, 'malformed \\N character escape'),
                  (0, 3, 'malformed \\N character escape'), (0, 6, 'malformed \\N character escape')],
    'error_handlers': ["'xx'", "'\\ufffdxx'", "'a\\ufffdb'"],
    'other_escapes_unchanged': "'A\\xe9\\n'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
