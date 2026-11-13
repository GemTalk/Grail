"""Fixture: a str holding lone surrogates takes startswith/endswith's bounds.

A str with a code point in U+D800..U+DFFF -- what surrogateescape makes of a
filename or a header that is not UTF-8 -- is a PyStrSurrogate in Grail, which
implements the str surface itself.  Its startswith and endswith took only the
affix: ``name.startswith('/tmp', 1)'' or ``line.endswith('\\n', 0, -1)'' raised
``TypeError: startswith() takes a different number of arguments''.

Every arity now goes through one implementation of CPython's tailmatch, so the
bounds clamp as CPython's do, a start past the end fails even for '', and a
wrong affix raises CPython's TypeError.  Every check holds under CPython 3.14,
which is what makes it evidence.
"""

LOW = chr(0xDCC2)
NEL_BYTE = chr(0xDC85)
s = 'ab ' + LOW + 'cd ab' + NEL_BYTE + '\n'
r = {}


def outcome(call):
    try:
        return call()
    except TypeError as error:
        return 'TypeError: %s' % error


r['startswith_from_a_start'] = [s.startswith('ab', 0), s.startswith('ab', 1), s.startswith('cd', 4),
                                s.startswith(LOW + 'cd', 3)]
r['startswith_within_bounds'] = [s.startswith('cd', 4, 6), s.startswith('cd', 4, 5), s.startswith('ab', 7, 99)]
r['endswith_within_bounds'] = [s.endswith('\n', 0), s.endswith(NEL_BYTE, 0, -1), s.endswith('cd', 0, 6),
                               s.endswith('ab', 2, 9)]
r['negative_bounds_count_from_the_end'] = [s.startswith('ab', -4), s.endswith('ab', -5, -2),
                                           s.startswith('a', -99), s.endswith('a', 0, -99)]
r['none_is_the_default_bound'] = [s.startswith('ab', None), s.startswith('ab', None, None), s.endswith('\n', None)]
r['empty_affix_past_the_end_fails'] = [s.startswith('', len(s)), s.startswith('', len(s) + 1),
                                       s.endswith('', len(s) + 1), s.endswith('', 3, 2)]
r['a_tuple_with_bounds'] = [s.startswith(('x', 'cd'), 4), s.endswith(('q', LOW), 0, 4),
                            s.startswith((), 0), s.endswith(('zz',), 1, 3)]
r['one_argument_forms_unchanged'] = [s.startswith('ab'), s.endswith(('q', '\n')), s.startswith(LOW),
                                     s.endswith('')]
r['wrong_affixes_raise_cpythons_type_error'] = [outcome(lambda: s.startswith(1, 0)),
                                                outcome(lambda: s.endswith(('a', 2), 0)),
                                                outcome(lambda: s.startswith(b'ab'))]

EXPECTED = {
    'startswith_from_a_start': [True, False, True, True],
    'startswith_within_bounds': [True, False, True],
    'endswith_within_bounds': [True, True, True, True],
    'negative_bounds_count_from_the_end': [True, True, True, False],
    'none_is_the_default_bound': [True, True, True],
    'empty_affix_past_the_end_fails': [True, False, False, False],
    'a_tuple_with_bounds': [True, True, False, False],
    'one_argument_forms_unchanged': [True, True, False, True],
    'wrong_affixes_raise_cpythons_type_error': [
        'TypeError: startswith first arg must be str or a tuple of str, not int',
        'TypeError: tuple for endswith must only contain str, not int',
        'TypeError: startswith first arg must be str or a tuple of str, not bytes'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
