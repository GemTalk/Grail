"""Five unrelated gaps in ``struct``, which is what test_struct's eight
remaining failures decompose into.

They are grouped because they are all struct and each is small, not
because they share a cause:

  * ``P``, ``F`` and ``D`` were not format characters at all.  ``F`` and
    ``D`` are COMPLEX, new in CPython 3.14; ``P`` is a void pointer and
    is native-only, like ``n``/``N``.
  * a repeat count large enough to overflow the total size was computed
    rather than refused.
  * ``pack_into`` could not write through a memoryview of an
    ``array.array`` -- "cannot modify read-only memory" -- though it
    handles a bytearray and a memoryview of one.
  * ``iter_unpack`` answered a plain list_iterator, so there was no type
    to refuse instantiation of.
  * ``_struct`` did not exist.  CPython's ``struct`` is a thin wrapper
    over it and code that wants the accelerator imports it directly.

Every expectation was checked against CPython 3.14 first.
"""

import array
import struct
import sys

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return fn()
    except Exception as exc:
        return (type(exc).__name__, str(exc))


# -- the complex codes, new in 3.14 -------------------------------------

def _complex_sizes():
    return tuple(struct.calcsize(f)
                 for f in ('F', 'D', '<F', '>D', '=F', '!F', '2F', 'FD'))


def _complex_round_trip():
    return (struct.unpack('F', struct.pack('F', 1 + 2j)),
            struct.unpack('D', struct.pack('D', 1 + 2j)),
            struct.unpack('<D', struct.pack('<D', 3 - 4j)),
            struct.unpack('>D', struct.pack('>D', 3 - 4j)))


check('complex_sizes', _complex_sizes(), (8, 16, 8, 16, 8, 8, 16, 24))
check('complex_round_trip', _complex_round_trip(),
      (((1 + 2j),), ((1 + 2j),), ((3 - 4j),), ((3 - 4j),)))


# -- and a negative zero keeps its sign bit ----------------------------
#
# Not a complex problem: ``struct.pack('<d', -0.0)`` dropped the 0x80.
# _doubleToBits returned early on ``aFloat = 0.0``, which is TRUE for a
# negative zero, so the sign never reached the output.  The 4- and 2-byte
# paths share _floatToBits:, which has always tested for it -- 1.0
# divided by a negative zero is minus infinity -- so only the 8-byte path
# was wrong, and only for this one value.  The complex round trip is
# where it surfaced, because -0.0 is what a complex's halves so often are.

import math


def _signed_zero():
    def sgn(x):
        return math.copysign(1.0, x)
    return (struct.pack('<d', -0.0),
            sgn(struct.unpack('<d', struct.pack('<d', -0.0))[0]),
            sgn(struct.unpack('<f', struct.pack('<f', -0.0))[0]),
            sgn(struct.unpack('<e', struct.pack('<e', -0.0))[0]),
            sgn(struct.unpack('<d', struct.pack('<d', 0.0))[0]))


def _signed_zero_in_a_complex():
    def sgn(x):
        return math.copysign(1.0, x)
    got = struct.unpack('F', struct.pack('F', complex(-0.0, 0.0)))[0]
    return (sgn(got.real), sgn(got.imag))


check('signed_zero', _signed_zero(),
      (b'\x00\x00\x00\x00\x00\x00\x00\x80', -1.0, -1.0, -1.0, 1.0))
check('signed_zero_in_a_complex', _signed_zero_in_a_complex(), (-1.0, 1.0))


# -- P is a void pointer, and NATIVE ONLY -------------------------------
#
# Like n and N: a byte-order prefix makes it meaningless, so CPython
# refuses the combination rather than picking a width.

def _pointer_native_only():
    return (struct.calcsize('P'),
            _outcome(lambda: struct.calcsize('<P'))[0],
            _outcome(lambda: struct.calcsize('>P'))[0],
            _outcome(lambda: struct.calcsize('!P'))[0],
            _outcome(lambda: struct.calcsize('=P'))[0])


def _pointer_round_trip():
    return struct.unpack('P', struct.pack('P', 0))


check('pointer_native_only', _pointer_native_only(),
      (8, 'error', 'error', 'error', 'error'))
check('pointer_round_trip', _pointer_round_trip(), (0,))


# -- a total size that overflows is refused -----------------------------
#
# The COUNT itself is fine -- '9999999999i' is a perfectly good format
# and calcsize answers 39999999996.  What is refused is a TOTAL that no
# buffer could ever hold.

HUGE = ['{}b'.format(sys.maxsize + 1),
        '{}b{}H'.format(sys.maxsize // 2, sys.maxsize // 2),
        '{}i{}q'.format(sys.maxsize // 4, sys.maxsize // 8),
        '{}?s'.format(sys.maxsize)]


def _overflow_is_refused():
    return [_outcome(lambda f=f: struct.calcsize(f)) for f in HUGE]


check('overflow_is_refused', _overflow_is_refused(),
      [('error', 'total struct size too long')] * 4)
check('a_large_but_valid_count_is_fine', struct.calcsize('9999999999i'),
      39999999996)


# -- NOT PINNED HERE: three roots that remain -------------------------
#
# The module's eight failures were five unrelated roots.  Three are
# fixed above; these are the other two-and-a-half, left because each
# needs its own design rather than a value corrected:
#
#   * pack_into cannot write through a memoryview of an array.array
#     ("cannot modify read-only memory").  memoryview treats every
#     non-bytearray source as read-only, and reads an array source by
#     copying it with tobytes() -- so making the view writable means
#     giving it a write-through path to the array, not relaxing a flag.
#
#   * iter_unpack answers a plain list_iterator, so there is no
#     ``unpack_iterator`` type to refuse instantiation of.  Grail's is
#     also EAGER where CPython's is lazy; a named class should fix both
#     at once rather than wrap the eager list.
#
#   * a half-initialised Struct -- ``Struct.__new__(Struct)`` with no
#     __init__ -- must raise RuntimeError from every operation.  Grail
#     reaches format parsing with an unset format and raises struct.error
#     about a bad char instead.
#
# See docs/Issues.md.


# -- the regression half ------------------------------------------------

def _the_ordinary_codes():
    return (struct.calcsize('bBhHiIlLqQfd?'),
            struct.pack('>i', 7), struct.unpack('>i', b'\x00\x00\x00\x07'),
            struct.pack('<h', -2), struct.unpack('<h', b'\xfe\xff'),
            struct.pack('3s', b'ab'), struct.calcsize('10x'),
            struct.Struct('>IB').size)


check('the_ordinary_codes', _the_ordinary_codes(),
      (65, b'\x00\x00\x00\x07', (7,), b'\xfe\xff', (-2,), b'ab\x00', 10, 5))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
