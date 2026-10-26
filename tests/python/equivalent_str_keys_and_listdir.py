"""Canonically equivalent str keys, and the names os.listdir answers.

Two defects behind test_unicode_file_functions, which fails on Linux only
because macOS skips the two tests that reach them:

* Deleting one of two CANONICALLY EQUIVALENT str keys ('\\xa8\\u0301' and its
  NFC form '\\u0385') from a dict or set removed the right key from the
  table but the wrong one from the insertion order, because that list was
  searched with the kernel's ``='' -- ICU collation in Unicode comparison
  mode, under which the two are equal.  The dict then listed the deleted key
  and lost the live one, and a pop() died on an uncatchable LookupError.
  test_normalize's ``others -= files'' kept a name it had removed.

* os.listdir(str) answered the raw UTF-8 bytes of each name as characters,
  so every non-ASCII name came back as mojibake, and os.listdir(bytes)
  answered str.  CPython decodes with surrogateescape, as os.fsdecode does
  -- which Grail's did not either.

The directory holds no two equivalent names: macOS would refuse the second.
EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test
case asserts is empty.
"""

import os
import shutil
import tempfile
from unicodedata import normalize

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def keys(c):
    return [ascii(k) for k in c]


NFD = '\xa8́'      # NFD-shaped
NFC = '΅'          # NFC of it: equal under ICU collation, not in Python
PAIRS = [
    ('acute', NFD, NFC),
    ('umlaut', 'ü', '\xfc'),
    ('em_quad', ' ', ' '),    # NFC(' ') == ' '
]


def dict_del(first, second, probe):
    d = {first: 1, second: 2}
    del d[probe]
    return keys(d), list(d.values())


def dict_pop_then_add(first, second, probe):
    d = {first: 1, second: 2}
    v = d.pop(probe)
    d['z'] = 3
    return v, keys(d.items())


def set_op(first, second, probe, op):
    s = {first, second}
    if op == 'isub':
        s -= {probe}
    elif op == 'discard':
        s.discard(probe)
    elif op == 'remove':
        s.remove(probe)
    elif op == 'difference_update':
        s.difference_update([probe])
    return keys(s), probe in s, len(s)


for name, a, b in PAIRS:
    t('%s_equal' % name, lambda: (a == b, hash(a) == hash(b), len({a, b})))
    for order, (x, y) in (('stored_first', (a, b)), ('stored_second', (b, a))):
        # delete ``a'', stored first or second
        t('%s_dict_del_%s' % (name, order), lambda: dict_del(x, y, a))
        t('%s_dict_pop_%s' % (name, order), lambda: dict_pop_then_add(x, y, a))
        for op in ('isub', 'discard', 'remove', 'difference_update'):
            t('%s_set_%s_%s' % (name, op, order), lambda: set_op(x, y, a, op))


def normalize_difference():
    # test_normalize's own shape
    files = {'d/12_\xa8́ϓϔ', 'd/3_Gr\xfc\xdf'}
    others = set()
    for nf in ('NFC', 'NFD', 'NFKC', 'NFKD'):
        others |= set(normalize(nf, f) for f in files)
    others -= files
    return sorted(ascii(o) for o in others), bool(others & files)


t('normalize_difference', normalize_difference)

NAMES = ['1_abc', '3_Gr\xfc\xdf', '6_にぽん', '12_\xa8́ϒ',
         '16_ A', '15_΅´𣏕']


def listing():
    d = tempfile.mkdtemp()
    try:
        for n in NAMES:
            with open(os.path.join(d, n), 'wb') as f:
                f.write(b'x')
        as_str = os.listdir(d)
        as_bytes = os.listdir(os.fsencode(d))
        r['listdir_str'] = repr(sorted(ascii(n) for n in as_str))
        r['listdir_str_types'] = repr(sorted({type(n).__name__ for n in as_str}))
        r['listdir_bytes'] = repr(sorted(as_bytes))
        r['listdir_bytes_types'] = repr(sorted({type(n).__name__ for n in as_bytes}))
        r['listdir_names_reopen'] = repr(all(os.path.isfile(os.path.join(d, n)) for n in as_str))
        r['listdir_matches_written'] = repr(sorted(as_str) == sorted(NAMES))
        r['listdir_bytes_decode'] = repr(sorted(os.fsdecode(n) for n in as_bytes) == sorted(NAMES))
        with os.scandir(d) as it:
            r['scandir_str'] = repr(sorted(ascii(e.name) for e in it))
        with os.scandir(os.fsencode(d)) as it:
            r['scandir_bytes'] = repr(sorted(e.name for e in it))
    finally:
        shutil.rmtree(d)


t('listing', listing)

t('fsdecode_surrogateescape', lambda: ascii(os.fsdecode(b'a\xff\xc3\xbc')))
t('fsencode_surrogateescape', lambda: os.fsencode('a\udcff\xfc'))
t('fs_round_trip', lambda: os.fsencode(os.fsdecode(b'\x80\xfe\xe2\x80\x81')))
t('fsdecode_str_passes', lambda: ascii(os.fsdecode('Gr\xfc')))
t('fsencode_bytes_passes', lambda: os.fsencode(b'Gr\xc3\xbc'))

EXPECTED = {
    'acute_dict_del_stored_first': '(["\'\\\\u0385\'"], [2])',
    'acute_dict_del_stored_second': '(["\'\\\\u0385\'"], [1])',
    'acute_dict_pop_stored_first': '(1, ["(\'\\\\u0385\', 2)", "(\'z\', 3)"])',
    'acute_dict_pop_stored_second': '(2, ["(\'\\\\u0385\', 1)", "(\'z\', 3)"])',
    'acute_equal': '(False, False, 2)',
    'acute_set_difference_update_stored_first': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_difference_update_stored_second': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_discard_stored_first': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_discard_stored_second': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_isub_stored_first': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_isub_stored_second': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_remove_stored_first': '(["\'\\\\u0385\'"], False, 1)',
    'acute_set_remove_stored_second': '(["\'\\\\u0385\'"], False, 1)',
    'em_quad_dict_del_stored_first': '(["\'\\\\u2003\'"], [2])',
    'em_quad_dict_del_stored_second': '(["\'\\\\u2003\'"], [1])',
    'em_quad_dict_pop_stored_first': '(1, ["(\'\\\\u2003\', 2)", "(\'z\', 3)"])',
    'em_quad_dict_pop_stored_second': '(2, ["(\'\\\\u2003\', 1)", "(\'z\', 3)"])',
    'em_quad_equal': '(False, False, 2)',
    'em_quad_set_difference_update_stored_first': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_difference_update_stored_second': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_discard_stored_first': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_discard_stored_second': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_isub_stored_first': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_isub_stored_second': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_remove_stored_first': '(["\'\\\\u2003\'"], False, 1)',
    'em_quad_set_remove_stored_second': '(["\'\\\\u2003\'"], False, 1)',
    'fs_round_trip': "b'\\x80\\xfe\\xe2\\x80\\x81'",
    'fsdecode_str_passes': '"\'Gr\\\\xfc\'"',
    'fsdecode_surrogateescape': '"\'a\\\\udcff\\\\xfc\'"',
    'fsencode_bytes_passes': "b'Gr\\xc3\\xbc'",
    'fsencode_surrogateescape': "b'a\\xff\\xc3\\xbc'",
    'listdir_bytes': "[b'12_\\xc2\\xa8\\xcc\\x81\\xcf\\x92', b'15_\\xe1\\xbf\\xae\\xe1\\xbf\\xbd\\xef\\xab\\x91', b'16_\\xe2\\x80\\x80A', b'1_abc', b'3_Gr\\xc3\\xbc\\xc3\\x9f', b'6_\\xe3\\x81\\xab\\xe3\\x81\\xbd\\xe3\\x82\\x93']",
    'listdir_bytes_decode': 'True',
    'listdir_bytes_types': "['bytes']",
    'listdir_matches_written': 'True',
    'listdir_names_reopen': 'True',
    'listdir_str': '["\'12_\\\\xa8\\\\u0301\\\\u03d2\'", "\'15_\\\\u1fee\\\\u1ffd\\\\ufad1\'", "\'16_\\\\u2000A\'", "\'1_abc\'", "\'3_Gr\\\\xfc\\\\xdf\'", "\'6_\\\\u306b\\\\u307d\\\\u3093\'"]',
    'listdir_str_types': "['str']",
    'listing': 'None',
    'normalize_difference': '(["\'d/12_ \\\\u0308\\\\u0301\\\\u038e\\\\u03ab\'", "\'d/12_ \\\\u0308\\\\u0301\\\\u03a5\\\\u0301\\\\u03a5\\\\u0308\'", "\'d/12_\\\\u0385\\\\u03d3\\\\u03d4\'", "\'d/3_Gru\\\\u0308\\\\xdf\'"], False)',
    'scandir_bytes': "[b'12_\\xc2\\xa8\\xcc\\x81\\xcf\\x92', b'15_\\xe1\\xbf\\xae\\xe1\\xbf\\xbd\\xef\\xab\\x91', b'16_\\xe2\\x80\\x80A', b'1_abc', b'3_Gr\\xc3\\xbc\\xc3\\x9f', b'6_\\xe3\\x81\\xab\\xe3\\x81\\xbd\\xe3\\x82\\x93']",
    'scandir_str': '["\'12_\\\\xa8\\\\u0301\\\\u03d2\'", "\'15_\\\\u1fee\\\\u1ffd\\\\ufad1\'", "\'16_\\\\u2000A\'", "\'1_abc\'", "\'3_Gr\\\\xfc\\\\xdf\'", "\'6_\\\\u306b\\\\u307d\\\\u3093\'"]',
    'umlaut_dict_del_stored_first': '(["\'\\\\xfc\'"], [2])',
    'umlaut_dict_del_stored_second': '(["\'\\\\xfc\'"], [1])',
    'umlaut_dict_pop_stored_first': '(1, ["(\'\\\\xfc\', 2)", "(\'z\', 3)"])',
    'umlaut_dict_pop_stored_second': '(2, ["(\'\\\\xfc\', 1)", "(\'z\', 3)"])',
    'umlaut_equal': '(False, False, 2)',
    'umlaut_set_difference_update_stored_first': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_difference_update_stored_second': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_discard_stored_first': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_discard_stored_second': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_isub_stored_first': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_isub_stored_second': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_remove_stored_first': '(["\'\\\\xfc\'"], False, 1)',
    'umlaut_set_remove_stored_second': '(["\'\\\\xfc\'"], False, 1)',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
