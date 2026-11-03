"""Fixture: str() refuses its arguments in Argument Clinic's words and order.

str(object='', encoding='utf-8', errors='strict') is bound by Argument
Clinic (_PyArg_UnpackKeywords, Python/getargs.c): more than three
arguments in all, keywords counted, is "takes at most 3 arguments" --
"keyword arguments" when none is positional -- and that is checked before
the keyword names; a parameter given both by position and by name is
"given by name (...) and position (N)", for each of the three.

Grail counted the positionals alone, so a fourth argument given by name was
ignored, and checked only ``object'' for a duplicate, so
``str(b'x', 'utf-8', encoding='ascii')'' used the positional encoding.
test_str's test_str_invalid_call.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(thunk):
    try:
        thunk()
        return 'accepted'
    except TypeError as e:
        return str(e)


r['three_positional_and_a_keyword'] = [
    refusal(lambda: str(b'x', 'utf-8', 'ignore', encoding='ascii')),
    refusal(lambda: str(b'x', 'utf-8', 'strict', errors='ignore'))]
r['two_positional_and_two_keywords'] = refusal(lambda: str(b'x', 'utf-8', errors='ignore', encoding='ascii'))
r['four_keywords'] = refusal(lambda: str(object=b'x', encoding='ascii', errors='strict', extra=1))
r['the_count_comes_before_the_name'] = refusal(lambda: str(b'x', 'utf-8', 'strict', unknown=1))
r['an_unknown_name_otherwise'] = refusal(lambda: str(b'x', unknown=1))
r['given_twice'] = [refusal(lambda: str(b'x', object=b'y')),
                    refusal(lambda: str(b'x', 'utf-8', encoding='ascii')),
                    refusal(lambda: str(b'x', 'utf-8', 'strict', errors='ignore'))]
r['all_three_by_name'] = refusal(lambda: str(object=b'x', encoding='ascii', errors='strict'))

AT_MOST = 'str() takes at most 3 arguments (4 given)'

EXPECTED = {
    'three_positional_and_a_keyword': [AT_MOST, AT_MOST],
    'two_positional_and_two_keywords': AT_MOST,
    'four_keywords': 'str() takes at most 3 keyword arguments (4 given)',
    'the_count_comes_before_the_name': AT_MOST,
    'an_unknown_name_otherwise': "str() got an unexpected keyword argument 'unknown'",
    'given_twice': ["argument for str() given by name ('object') and position (1)",
                    "argument for str() given by name ('encoding') and position (2)",
                    AT_MOST],
    'all_three_by_name': 'accepted',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
