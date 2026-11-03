"""Fixture: joining one exact str, or repeating it once, answers the same str.

CPython returns its operand unchanged in both places: str.join of a
one-item sequence whose item is an exact str (_PyUnicode_JoinArray,
Objects/unicodeobject.c:10305-10311), whatever the separator, and
``s * 1'' or ``1 * s'' (unicode_repeat, :12831-12832).  An instance of a str
subclass gets a new exact str instead.  test_str's test_bug1001011 and
test_repeat_id_preserving check exactly that.

Grail built a new string every time.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

s = '123abc1@'


class SubStr(str):
    pass


sub = SubStr('qwerty()')

r['join_one_exact_str'] = [''.join([s]) is s, '-'.join([s]) is s, ''.join((s,)) is s,
                           ''.join(iter([s])) is s]
r['join_one_subclass_instance'] = [''.join([sub]) is sub, type(''.join([sub])).__name__]
r['join_two_is_new'] = [''.join([s, '']) is s, ''.join([s, '']) == s]
r['repeat_once'] = [s * 1 is s, 1 * s is s]
r['repeat_otherwise_is_new'] = [s * 2 is s, s * 0 is s, s * -4 is s]
r['repeat_a_subclass_instance'] = [sub * 1 is sub, 1 * sub is sub, type(sub * 1).__name__]

EXPECTED = {
    'join_one_exact_str': [True, True, True, True],
    'join_one_subclass_instance': [False, 'str'],
    'join_two_is_new': [False, True],
    'repeat_once': [True, True],
    'repeat_otherwise_is_new': [False, False, False],
    'repeat_a_subclass_instance': [False, False, 'str'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
