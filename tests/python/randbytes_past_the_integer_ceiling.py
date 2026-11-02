"""Fixture: random.randbytes(n) for an n past what one Grail integer holds.

CPython's randbytes is ``getrandbits(n * 8).to_bytes(n, 'little')`` (Lib/random.py:287),
and a GemStone integer holds about 130144 bits, so in Grail it raised
OverflowError past ~16 KB: test_zlib draws 17 KB and 10 MB of random data
that way.  Grail now draws whole 32-bit words in chunks, which yields the
same bytes, and leaves the generator in the same state, as CPython's single
draw -- each check below compares a seeded draw's digest and the next draw
with CPython's.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import hashlib
import random

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def seeded_draw(n):
    generator = random.Random(2026)
    drawn = generator.randbytes(n)
    return [len(drawn), hashlib.sha256(drawn).hexdigest()[:16], generator.getrandbits(32)]


r['one_chunk'] = seeded_draw(8192)
r['one_byte_past_a_chunk'] = seeded_draw(8193)
r['seventeen_kilobytes'] = seeded_draw(17 * 1024)
r['an_odd_length'] = seeded_draw(100003)
r['ten_megabytes'] = len(random.randbytes(10 * 1024 * 1024))
r['nothing'] = random.Random(1).randbytes(0)
r['a_negative_length'] = outcome(lambda: random.Random(1).randbytes(-1))
r['refused_lengths'] = [outcome(lambda: random.Random(1).randbytes(n)).split(':')[0]
                        for n in (1 << 1000, -1 << 1000, 1.0, 9000.0)]

EXPECTED = {
    'one_chunk': [8192, '1ebee95170236176', 3375386501],
    'one_byte_past_a_chunk': [8193, 'c9df835d7167d032', 439523031],
    'seventeen_kilobytes': [17408, 'abec8e66e5aae344', 2633736874],
    'an_odd_length': [100003, '0aae86293a3edadf', 2930336125],
    'ten_megabytes': 10 * 1024 * 1024,
    'nothing': b'',
    'a_negative_length': 'ValueError: Cannot convert negative int',
    'refused_lengths': ['OverflowError', 'ValueError', 'TypeError', 'TypeError'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
