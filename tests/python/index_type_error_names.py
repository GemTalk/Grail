"""A wrong-typed subscript names the PYTHON type, not the GemStone class.

`[1, 2]['a']` raises `TypeError: list indices must be integers or slices, not
str`. Grail said `not Unicode7` -- the GemStone class backing a str -- and
likewise `not SmallDouble` for a float and `not ByteArray` for bytes. The name
is part of the message a Python programmer reads, so a kernel class name in it
is a defect in its own right, and a confusing one: `Unicode7` appears nowhere
in Python.

`Bytes.gs` and `Bytearray.gs` already resolved the name properly, which is why
`b'ab'['a']` was right while `[1, 2]['a']` was wrong -- the same message, two
implementations, one of them leaking. The fix routes the remaining four sites
(list getitem and setitem, the shared SequenceableCollection path, str, range)
through the same `___pyTypeNameForError___` the binary-operator errors already
use.

The cross product below is deliberate: the defect was per-KEY-TYPE, so testing
one key type against many containers would have missed it, and vice versa.

Every expectation here was measured against CPython 3.14.
"""


class MyKey:
    pass


RESULTS = {}

L = [1, 2]
T = (1, 2)
S = 'ab'
B = b'ab'
BA = bytearray(b'ab')
R = range(3)

CONTAINERS = [('list', L), ('tuple', T), ('str', S), ('bytes', B),
              ('bytearray', BA), ('range', R)]

# The key types whose Python name and GemStone class name differ are the ones
# that mattered: str/Unicode7, float/SmallDouble, bytes/ByteArray.  NoneType
# and a user class are here as controls that were already correct.
KEYS = [('str', 'a'), ('bytes', b'a'), ('float', 1.5), ('NoneType', None),
        ('tuple', (1,)), ('MyKey', MyKey())]


def message_for(container, key):
    try:
        container[key]
    except TypeError as exc:
        return str(exc)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return 'no raise'


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


# Each container reports its own name and the KEY's Python type name.  The
# expected strings are written out rather than generated, so the test cannot
# agree with a bug by construction.
EXPECTED = {
    'list': 'list indices must be integers or slices, not %s',
    'tuple': 'tuple indices must be integers or slices, not %s',
    'str': 'string indices must be integers, not %r',
    'bytes': 'byte indices must be integers or slices, not %s',
    'bytearray': 'bytearray indices must be integers or slices, not %s',
    'range': 'range indices must be integers or slices, not %s',
}

for _cname, _c in CONTAINERS:
    for _kname, _k in KEYS:
        _want = EXPECTED[_cname] % _kname
        check('%s_subscript_by_%s' % (_cname, _kname), message_for(_c, _k), _want)


# The SETITEM path carries the same message and had the same defect.
def setitem_message(key):
    try:
        [1, 2][key] = 1
    except TypeError as exc:
        return str(exc)
    return 'no raise'


check('list_setitem_by_str', setitem_message('a'),
      'list indices must be integers or slices, not str')

check('list_setitem_by_float', setitem_message(1.5),
      'list indices must be integers or slices, not float')


# A key that IS acceptable must still work -- the guard has to reject on type,
# not merely produce a nicer message when it rejects.
check('an_integer_key_still_indexes', (L[0], T[1], S[0], B[0], R[2]),
      (1, 2, 'a', 97, 2))


check('a_slice_still_works', (L[0:1], S[0:1], R[0:2]), ([1], 'a', range(0, 2)))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
