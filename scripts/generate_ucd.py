#!/usr/bin/env python3
"""Regenerate src/python/stdlib/_ucd_3_2_0.py from the Unicode 3.2.0 tables
the running CPython carries (``unicodedata.ucd_3_2_0``).

WHY THIS EXISTS.  ``stringprep`` and ``encodings.idna`` are specified against
Unicode 3.2.0 -- RFC 3454 and RFC 3490 freeze it -- and reach it as
``unicodedata.ucd_3_2_0``.  Grail's unicodedata was a stub whose normalize()
returned its argument unchanged, so there was no IDNA codec at all: ``'xn--'``
labels, nameprep, and every IDNA test in test_codecs.

WHAT IS GENERATED.  Exactly what those two modules query: category,
bidirectional class, canonical combining class and decomposition, stored as
run-length ranges or sparse entries; the FULL NFD and NFKD expansion of each
code point that has one, read from CPython's normalize (for 3.2.0 these are
not what decomposition() reports -- CPython applies the Unicode normalization
corrections); and the canonical COMPOSITION pairs.
The pairs are derived rather than read: a canonical two-character
decomposition is a primary composite only if CPython's own NFC rebuilds it,
which folds the composition exclusions in without a separate table.  Hangul
is algorithmic in _ucd.py, as it is in CPython.

VERIFIED BEFORE WRITING.  The generated tables are loaded into _ucd.py -- the
runtime Grail uses -- and compared with CPython on every code point for the
four property queries, on every code point that decomposes, combines or
composes (and a sample of the rest) in all four normalization forms, and on
random mixed strings.  Any disagreement stops the script with nothing
written.

Run with the CPython version Grail vendors (3.14.x):
    python3.14 scripts/generate_ucd.py
"""
import os
import random
import sys
import types
import unicodedata

import importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'python', 'stdlib', '_ucd_3_2_0.py')

# Loaded BY PATH, never via sys.path: Grail's stdlib has its own
# unicodedata.py, and a comparison against it would be vacuous.  The check
# below refuses to run unless unicodedata is CPython's C module.
_spec = importlib.util.spec_from_file_location(
    '_ucd', os.path.join(HERE, '..', 'src', 'python', 'stdlib', '_ucd.py'))
_ucd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_ucd)
if not getattr(unicodedata, '__file__', '').endswith('.so'):
    sys.exit('unicodedata is not CPython\'s C module (%r)' % getattr(unicodedata, '__file__', None))

UCD = unicodedata.ucd_3_2_0
MAX = 0x110000


def runs(func):
    """Run-length ``start:value;`` over the whole code space."""
    out, last = [], object()
    for point in range(MAX):
        value = func(chr(point))
        if value != last:
            out.append('%X:%s' % (point, value))
            last = value
    return ';'.join(out)


def generate():
    category = runs(UCD.category)
    bidi = runs(UCD.bidirectional)
    combining = runs(UCD.combining)
    # CPython's 3.2.0 NORMALIZATION reads combining classes from the CURRENT
    # database record, even for a character unassigned in 3.2.0 (whose
    # ucd_3_2_0.combining() is 0): U+A9C0 reorders like the class-9 mark it
    # became later.  Stored separately so combining() can still report 3.2.0.
    norm_combining = runs(unicodedata.combining)
    decomp_items = []
    pairs = []
    nfd, nfkd = [], []
    for point in range(MAX):
        ch = chr(point)
        text = UCD.decomposition(ch)
        if not text:
            continue
        decomp_items.append('%X:%s' % (point, text))
        # The FULL expansions normalization uses, read from CPython's own
        # normalize rather than rebuilt from decomposition(): for 3.2.0 they
        # DIFFER, because CPython applies the Unicode normalization
        # corrections (U+2F868 decomposes to U+36FC but normalizes to
        # U+2136A) while decomposition() reports the table as published.
        # Hangul syllables are algorithmic and not stored.
        if not 0xAC00 <= point <= 0xD7A3:
            for form, sink in (('NFD', nfd), ('NFKD', nfkd)):
                full = UCD.normalize(form, ch)
                if full != ch:
                    sink.append('%X:%s' % (point, ' '.join('%X' % ord(c) for c in full)))
    # Composition pairs, from the canonical two-character decompositions of
    # BOTH databases -- CPython composes with the current tables too -- kept
    # only where CPython's 3.2.0 NFC actually rebuilds the composite.
    seen = set()
    for db in (UCD, unicodedata):
        for point in range(MAX):
            parts = db.decomposition(chr(point)).split(' ')
            if len(parts) != 2 or parts[0].startswith('<'):
                continue
            first, second = int(parts[0], 16), int(parts[1], 16)
            if (first, second) in seen:
                continue
            if UCD.normalize('NFC', chr(first) + chr(second)) == chr(point):
                seen.add((first, second))
                pairs.append('%X %X %X' % (first, second, point))
    return {
        'VERSION': UCD.unidata_version,
        'CATEGORY': category,
        'BIDI': bidi,
        'COMBINING': combining,
        'NORM_COMBINING': norm_combining,
        'DECOMPOSITION': ';'.join(decomp_items),
        'NFD': ';'.join(nfd),
        'NFKD': ';'.join(nfkd),
        'COMPOSITION': ';'.join(pairs),
    }


def verify(tables):
    data = types.SimpleNamespace(**{k: (tuple(chunks(v)) if k != 'VERSION' else v)
                                    for k, v in tables.items()})
    db = _ucd.Database(data)
    interesting = []
    for point in range(MAX):
        ch = chr(point)
        for name in ('category', 'bidirectional', 'combining', 'decomposition'):
            want = getattr(UCD, name)(ch)
            got = getattr(db, name)(ch)
            if want != got:
                sys.exit('MISMATCH %s(U+%04X): CPython %r, generated %r'
                         % (name, point, want, got))
        if (UCD.decomposition(ch) or UCD.combining(ch)
                or unicodedata.combining(ch) or point % 97 == 0):
            interesting.append(point)
    # Everything that appears in a composition, whether as first or second.
    for item in tables['COMPOSITION'].split(';'):
        for part in item.split(' '):
            interesting.append(int(part, 16))
    interesting.extend(range(0x1100, 0x1200))      # Hangul jamo
    interesting.extend(range(0xAC00, 0xAC00 + 11172, 7))
    interesting = sorted(set(interesting))
    forms = ('NFC', 'NFD', 'NFKC', 'NFKD')
    for point in interesting:
        ch = chr(point)
        if 0xD800 <= point <= 0xDFFF:
            continue
        for form in forms:
            want = UCD.normalize(form, ch)
            got = db.normalize(form, ch)
            if want != got:
                sys.exit('MISMATCH normalize(%s, U+%04X): CPython %r, generated %r'
                         % (form, point, want, got))
    rng = random.Random(3490)
    pool = [p for p in interesting if not 0xD800 <= p <= 0xDFFF]
    marks = [p for p in pool if unicodedata.combining(chr(p))]
    for _ in range(20000):
        text = ''.join(chr(rng.choice(marks if rng.random() < 0.4 else pool))
                       for _ in range(rng.randint(1, 8)))
        for form in forms:
            want = UCD.normalize(form, text)
            got = db.normalize(form, text)
            if want != got:
                sys.exit('MISMATCH normalize(%s, %r): CPython %r, generated %r'
                         % (form, text, want, got))
    return len(interesting)


HEADER = '''\
# GENERATED by scripts/generate_ucd.py from CPython %(py)s's
# unicodedata.ucd_3_2_0 -- do not edit.  Read by _ucd.Database, which is what
# ``unicodedata.ucd_3_2_0`` is; see both files for what is stored and why.
#
# Verified against CPython before writing: every code point for category,
# bidirectional, combining and decomposition, and %(checked)d code points plus
# 20000 random strings in all four normalization forms.

'''


# Grail compiles a Python string literal into a Smalltalk one, and a literal
# somewhere past 70KB fails to compile ("missing end of literal mark"; 70KB
# measured fine, 131KB not).  DECOMPOSITION alone is over 300KB, so each table
# is written as a TUPLE of chunks, split on entry boundaries, that
# _ucd.Database joins -- separate elements, not adjacent literals, which a
# parser may fold back into one.
CHUNK = 30000


def chunks(text):
    out, start = [], 0
    while len(text) - start > CHUNK:
        cut = text.rindex(';', start, start + CHUNK) + 1
        out.append(text[start:cut])
        start = cut
    out.append(text[start:])
    return out


def write(tables, checked):
    with open(OUT, 'w') as f:
        f.write(HEADER % {'py': sys.version.split()[0], 'checked': checked})
        f.write('VERSION = %r\n' % tables['VERSION'])
        for key in ('CATEGORY', 'BIDI', 'COMBINING', 'NORM_COMBINING',
                    'DECOMPOSITION', 'NFD', 'NFKD', 'COMPOSITION'):
            f.write('%s = (\n' % key)
            for part in chunks(tables[key]):
                f.write('    %r,\n' % part)
            f.write(')\n')


def main():
    if UCD.unidata_version != '3.2.0':
        sys.exit('unexpected ucd_3_2_0 version %r' % UCD.unidata_version)
    tables = generate()
    checked = verify(tables)
    write(tables, checked)
    print('wrote %s: %d bytes; verified %d code points in 4 forms'
          % (os.path.relpath(OUT), os.path.getsize(OUT), checked))


if __name__ == '__main__':
    main()
