"""int.to_bytes / int.from_bytes on integers at GemStone's size ceiling.

GemStone's LargeInteger holds at most ~130144 bits.  to_bytes and from_bytes
checked their range, and applied two's complement, by building 2**(8 * length)
-- one bit PAST the value -- so a value AT the ceiling died on the kernel's
uncatchable NumericError (error 2503) instead of answering:
``random.randbytes(16268)'' is ``getrandbits(130144).to_bytes(16268, ...)''
and ended the process.  The range is now read from the value's bit length,
and an integer that really would exceed the ceiling (a from_bytes of more
bytes than it can hold) is the catchable OverflowError Grail raises for that
elsewhere.

Rows past the ceiling are not here: CPython answers them, Grail cannot.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import hashlib
import random

r = {}

BITS = 130144                 # GemStone's ceiling, which CPython does not have
NBYTES = BITS // 8            # 16268
TOP = 1 << (BITS - 1)         # the largest power of two Grail can hold
ALL_ONES = (TOP - 1) | TOP    # BITS one-bits, built without crossing BITS


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def digest(b):
    return (len(b), hashlib.sha256(b).hexdigest()[:16])


# to_bytes at the ceiling.
t('to_bytes_unsigned_full', lambda: digest(ALL_ONES.to_bytes(NBYTES, 'little')))
t('to_bytes_unsigned_wider', lambda: digest(ALL_ONES.to_bytes(NBYTES + 10, 'big')))
t('to_bytes_unsigned_one_short', lambda: ALL_ONES.to_bytes(NBYTES - 1, 'little'))
t('to_bytes_signed_top_too_big', lambda: TOP.to_bytes(NBYTES, 'big', signed=True))
t('to_bytes_signed_min', lambda: digest((-TOP).to_bytes(NBYTES, 'little', signed=True)))
t('to_bytes_signed_minus_one', lambda: digest((-1).to_bytes(NBYTES, 'big', signed=True)))
t('to_bytes_signed_minus_one_wide', lambda: digest((-1).to_bytes(20000, 'little', signed=True)))
t('to_bytes_signed_below_min', lambda: (-TOP - 1).to_bytes(NBYTES, 'big', signed=True))

# from_bytes at the ceiling.
t('from_bytes_unsigned_full',
  lambda: int.from_bytes(b'\xff' * NBYTES, 'big') == ALL_ONES)
t('from_bytes_signed_minus_one',
  lambda: int.from_bytes(b'\xff' * NBYTES, 'little', signed=True))
t('from_bytes_signed_min',
  lambda: int.from_bytes(b'\x00' * (NBYTES - 1) + b'\x80', 'little', signed=True) == -TOP)
t('from_bytes_signed_max',
  lambda: int.from_bytes(b'\x7f' + b'\xff' * (NBYTES - 1), 'big', signed=True) == TOP - 1)
t('round_trip_signed',
  lambda: int.from_bytes((-TOP + 12345).to_bytes(NBYTES, 'big', signed=True),
                         'big', signed=True) == -TOP + 12345)


# randbytes is getrandbits(8n).to_bytes(n, 'little').
def randbytes_at_ceiling():
    g = random.Random(1234567)
    return digest(g.randbytes(NBYTES))


t('randbytes_at_ceiling', randbytes_at_ceiling)

# Small values: the ordinary cases the rewrite must not move.
t('small_little', lambda: (42).to_bytes(2, 'little'))
t('small_signed_negative', lambda: (-129).to_bytes(2, 'big', signed=True))
t('small_signed_too_big', lambda: (128).to_bytes(1, 'big', signed=True))
t('small_signed_too_small', lambda: (-129).to_bytes(1, 'little', signed=True))
t('small_unsigned_negative', lambda: (-1).to_bytes(1, 'big'))
t('zero_length_zero', lambda: (0).to_bytes(0, 'big'))
t('zero_length_signed_minus_one', lambda: (-1).to_bytes(0, 'big', signed=True))
t('from_small_signed', lambda: int.from_bytes(b'\x80', 'big', signed=True))
t('from_small_signed_two', lambda: int.from_bytes(b'\x7f\xff', 'little', signed=True))
t('from_empty_signed', lambda: int.from_bytes(b'', 'big', signed=True))


def grail_past_ceiling():
    """NOT a CPython row -- CPython answers both of these.  An integer this
    wide cannot exist in Grail, and the answer must be a catchable
    OverflowError rather than the kernel's NumericError, which ended the
    process.  Asserted by IntBytesAtCeilingTestCase, not by EXPECTED."""
    out = []
    for thunk in (lambda: int.from_bytes(b'\xff' * (NBYTES + 1), 'big'),
                  lambda: int.from_bytes(b'\x00' * NBYTES + b'\x80', 'little', signed=True)):
        try:
            thunk()
            out.append('answered')
        except OverflowError as e:
            out.append(str(e))
    return out


EXPECTED = {
    'from_bytes_signed_max': 'True',
    'from_bytes_signed_min': 'True',
    'from_bytes_signed_minus_one': '-1',
    'from_bytes_unsigned_full': 'True',
    'from_empty_signed': '0',
    'from_small_signed': '-128',
    'from_small_signed_two': '-129',
    'randbytes_at_ceiling': "(16268, 'd36ce324b0dab144')",
    'round_trip_signed': 'True',
    'small_little': "b'*\\x00'",
    'small_signed_negative': "b'\\xff\\x7f'",
    'small_signed_too_big': 'OverflowError: int too big to convert',
    'small_signed_too_small': 'OverflowError: int too big to convert',
    'small_unsigned_negative': "OverflowError: can't convert negative int to unsigned",
    'to_bytes_signed_below_min': 'OverflowError: int too big to convert',
    'to_bytes_signed_min': "(16268, '4480847d387bb05e')",
    'to_bytes_signed_minus_one': "(16268, 'ce7ad80a11dc1a29')",
    'to_bytes_signed_minus_one_wide': "(20000, '435f6e92bf8e5479')",
    'to_bytes_signed_top_too_big': 'OverflowError: int too big to convert',
    'to_bytes_unsigned_full': "(16268, 'ce7ad80a11dc1a29')",
    'to_bytes_unsigned_one_short': 'OverflowError: int too big to convert',
    'to_bytes_unsigned_wider': "(16278, '89f060abea5f66b2')",
    'zero_length_signed_minus_one': 'OverflowError: int too big to convert',
    'zero_length_zero': "b''",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
