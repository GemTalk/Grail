"""struct skips whitespace between format codes, as CPython does.

CPython's format parser skips whitespace (space, tab, newline, return,
vertical tab, form feed) before each code; Grail rejected it as ``bad char
in struct format``, so pytz -- which reads its zone files with
``'>4s c 15x 6l'`` -- failed to load any time zone.

The rows cover calcsize, pack, unpack and Struct with spaces, tabs and the
other whitespace characters, after the byte-order prefix, and an all-space
format.  The guards: whitespace BEFORE the byte-order prefix and between a
repeat count and its code are still errors, and Struct.format keeps the
format as given.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import struct

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


TZ_HEAD = '>4s c 15x 6l'

t('pytz header calcsize', lambda: struct.calcsize(TZ_HEAD))
t('pytz header pack', lambda: struct.pack(TZ_HEAD, b'TZif', b'2', 1, 2, 3, 4, 5, 6))
t('pytz header unpack', lambda: struct.unpack(TZ_HEAD, struct.pack(TZ_HEAD, b'TZif', b'2', 1, 2, 3, 4, 5, 6)))
t('leading space', lambda: struct.calcsize(' i'))
t('tab and newline', lambda: struct.calcsize('\ti\n'))
t('after the byte-order prefix', lambda: struct.calcsize('< i'))
t('between counted codes', lambda: struct.calcsize('2i 3h'))
t('vertical tab and form feed', lambda: struct.calcsize('i\x0bh\x0c'))
t('only spaces', lambda: struct.calcsize('  '))
t('native alignment across a space', lambda: struct.calcsize('b i'))
t('Struct size and format', lambda: (struct.Struct(' i h ').size, struct.Struct(' i h ').format))
t('bytes format', lambda: struct.calcsize(b'> h h'))
t('iter_unpack', lambda: list(struct.iter_unpack('< h', b'\x01\x00\x02\x00')))
t('guard: space before the prefix', lambda: struct.calcsize(' <i'))
t('guard: space inside a repeat count', lambda: struct.calcsize('4 s'))
t('guard: no whitespace', lambda: struct.calcsize('>4sc15x6l'))


EXPECTED = {
    'pytz header calcsize': '44',
    'pytz header pack': "b'TZif2\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x01\\x00\\x00\\x00\\x02\\x00\\x00\\x00\\x03\\x00\\x00\\x00\\x04\\x00\\x00\\x00\\x05\\x00\\x00\\x00\\x06'",
    'pytz header unpack': "(b'TZif', b'2', 1, 2, 3, 4, 5, 6)",
    'leading space': '4',
    'tab and newline': '4',
    'after the byte-order prefix': '4',
    'between counted codes': '14',
    'vertical tab and form feed': '6',
    'only spaces': '0',
    'native alignment across a space': '8',
    'Struct size and format': "(6, ' i h ')",
    'bytes format': '4',
    'iter_unpack': '[(1,), (2,)]',
    'guard: space before the prefix': 'error: bad char in struct format',
    'guard: space inside a repeat count': 'error: bad char in struct format',
    'guard: no whitespace': '44',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
