"""Fixture: adjacent string literals of kinds that cannot be concatenated.

CPython's grammar reads adjacent string literals as one run whatever their
kinds, then refuses bytes beside a str or an f-string -- at the token after
them, where its parser stands when it notices (Parser/action_helpers.c:
1894-1899) -- and a t-string beside any other literal, over the two that meet
(Grammar/python.gram:1554-1558).  The bytes check comes first.  Grail ended
the literal at the first change of kind, so the next one was ``invalid
syntax`` (test_fstring test_compile_time_concat_errors).  Every check here
holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

BYTES = 'cannot mix bytes and nonbytes literals'
TSTRING = 'cannot mix t-string literals with string or bytes literals'


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


r['bytes_then_str'] = [outcome(each) for each in ("b'a' 'b'", "b'' f''", "b'a' f'{1}'")]
r['str_then_bytes'] = [outcome(each) for each in ("'a' b'b'", "f'' b''", "f'{1}' b'a' 'c'")]
r['later_in_the_run'] = outcome("x = 'a' 'b' b'c' 'd'")
r['across_lines'] = outcome("x = (b'a'\n  'b')")
r['before_a_t_string'] = [outcome(each) for each in ("b'' f'' t''", "'a' b'b' t'c'")]
r['t_string_after_others'] = [outcome(each) for each in ("b'' t''", "'a' t'b'", "'a' 'b' t'c'")]
r['others_after_a_t_string'] = [outcome(each) for each in ("t'' b''", "t'a' 'b' b'c'", "t'a' t'b' 'c'")]
r['legal'] = [b'a' b'b', 'a' f'{1}' 'b', type(t'a' t'b').__name__, (b'a'
                                                                   b'b')]

EXPECTED = {
    'bytes_then_str': [(BYTES, 1, 9, 1, 10), (BYTES, 1, 8, 1, 9), (BYTES, 1, 12, 1, 13)],
    'str_then_bytes': [(BYTES, 1, 9, 1, 10), (BYTES, 1, 8, 1, 9), (BYTES, 1, 16, 1, 17)],
    'later_in_the_run': (BYTES, 1, 21, 1, 22),
    'across_lines': (BYTES, 2, 6, 2, 7),
    'before_a_t_string': [(BYTES, 1, 9, 1, 11), (BYTES, 1, 10, 1, 12)],
    't_string_after_others': [(TSTRING, 1, 1, 1, 8), (TSTRING, 1, 1, 1, 9), (TSTRING, 1, 5, 1, 13)],
    'others_after_a_t_string': [(TSTRING, 1, 1, 1, 8), (TSTRING, 1, 1, 1, 9), (TSTRING, 1, 6, 1, 14)],
    'legal': [b'ab', 'a1b', 'Template', b'ab'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-24s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
