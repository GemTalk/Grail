"""Fixture: unittest.mock.patch.multiple.

patch.multiple(target, name=value, ...) patches several attributes of one
object together.  Grail's mock had no ``multiple'', so every use was
``AttributeError: 'function' object has no attribute 'multiple''' -- 10 of
test_uuid's 14 errors.  As a context manager it answers a dict of the mocks
it CREATED (the names given DEFAULT); as a decorator it passes them as
keyword arguments; a string target is imported as a dotted path.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import sys
import types
from unittest import mock

r = {}

_m = types.ModuleType('mock_patch_multiple_target')
_m.a = 1
_m.b = 2
sys.modules['mock_patch_multiple_target'] = _m


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


def _context():
    with mock.patch.multiple(_m, a=10, b=20) as created:
        inside = (_m.a, _m.b, created)
    return inside, (_m.a, _m.b)


def _default_creates_mocks():
    with mock.patch.multiple(_m, a=mock.DEFAULT, b=5) as created:
        return (sorted(created), isinstance(created['a'], mock.MagicMock),
                created['a'] is _m.a, _m.b)


def _string_target():
    with mock.patch.multiple('mock_patch_multiple_target', a='x'):
        inside = _m.a
    return inside, _m.a


@mock.patch.multiple(_m, a=mock.DEFAULT, b=7)
def _decorated(a):
    return isinstance(a, mock.MagicMock), a is _m.a, _m.b


def _restored_after_raise():
    try:
        with mock.patch.multiple(_m, a=100):
            raise KeyError('boom')
    except KeyError:
        pass
    return _m.a


def _start_stop():
    p = mock.patch.multiple(_m, b=99)
    p.start()
    inside = _m.b
    p.stop()
    return inside, _m.b


r['context'] = _context()
r['default_creates_mocks'] = _default_creates_mocks()
r['string_target'] = _string_target()
r['decorator'] = (_decorated(), (_m.a, _m.b))
r['restored_after_raise'] = _restored_after_raise()
r['start_stop'] = _start_stop()
r['needs_keywords'] = _err(lambda: mock.patch.multiple(_m))

EXPECTED = {
    'context': ((10, 20, {}), (1, 2)),
    'default_creates_mocks': (['a'], True, True, 5),
    'string_target': ('x', 1),
    'decorator': ((True, True, 7), (1, 2)),
    'restored_after_raise': 1,
    'start_stop': (99, 2),
    'needs_keywords': 'ValueError: Must supply at least one keyword argument with patch.multiple',
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
        print('%-5s %-24s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
