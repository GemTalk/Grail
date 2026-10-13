"""Fixture: ``n * seq'' asks a sequence subclass's __rmul__ (#1552).

CPython's int.__mul__ answers NotImplemented for a sequence, so ``3 * x''
goes on to x's reflected multiplication: a subclass's own __rmul__ when it
defines one, else the sequence's repeat.  Grail's int.__mul__ repeated the
sequence itself, through the sequence's __mul__, so ``3 * S('b')'' never
reached S.__rmul__ -- and ``3 * M('b')'' for an M that overrides only __mul__
called M.__mul__, which CPython never does (nor does ``True * M('b')'', which
reached it through str's own __rmul__).  An __rmul__ that declines is a
TypeError: CPython does not fall back to the repeat.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


class S(str):
    def __rmul__(self, other): return 'S.rmul'


class M(str):
    def __mul__(self, other): return 'M.mul'


class N(str):
    def __rmul__(self, other): return NotImplemented


class Plain(str):
    pass


class L(list):
    def __rmul__(self, other): return 'L.rmul'


class LM(list):
    def __mul__(self, other): return 'LM.mul'


class T(tuple):
    def __rmul__(self, other): return 'T.rmul'


class B(bytes):
    def __rmul__(self, other): return 'B.rmul'


class BA(bytearray):
    def __rmul__(self, other): return 'BA.rmul'


r['str_subclass_rmul'] = (3 * S('b'), True * S('b'), S('b') * 3)
r['mul_override_is_not_reflected'] = (3 * M('b'), M('b') * 3, 3 * LM([1]))
r['bool_left'] = (True * S('b'), True * M('b'), False * M('b'), True * L([1]))
r['declining_rmul_is_a_type_error'] = _err(lambda: 3 * N('b'))
r['plain_subclass_repeats'] = (3 * Plain('ab'), type(3 * Plain('ab')).__name__)
r['list_tuple_rmul'] = (3 * L([1]), 3 * T((1,)))
r['bytes_rmul'] = (3 * B(b'x'), 3 * BA(b'x'))
r['builtins_unchanged'] = (3 * 'ab', 2 * [1, 2], 2 * (1,), 2 * b'xy',
                           2 * bytearray(b'z'), 0 * 'a', -1 * [1], True * 'q')
r['non_sequences_unchanged'] = (_err(lambda: 3 * object())[:9], 3 * 2.5, 2 * 3)


EXPECTED = {
    'str_subclass_rmul': ('S.rmul', 'S.rmul', 'bbb'),
    'mul_override_is_not_reflected': ('bbb', 'M.mul', [1, 1, 1]),
    'bool_left': ('S.rmul', 'b', '', 'L.rmul'),
    'declining_rmul_is_a_type_error':
        "TypeError: unsupported operand type(s) for *: 'int' and 'N'",
    'plain_subclass_repeats': ('ababab', 'str'),
    'list_tuple_rmul': ('L.rmul', 'T.rmul'),
    'bytes_rmul': ('B.rmul', 'BA.rmul'),
    'builtins_unchanged': ('ababab', [1, 2, 1, 2], (1, 1), b'xyxy',
                           bytearray(b'zz'), '', [], 'q'),
    'non_sequences_unchanged': ('TypeError', 7.5, 6),
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-32s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
