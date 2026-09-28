# unicodedata's module-level queries against CPython's current Unicode database.
#
# They were stubs: normalize() returned its argument unchanged, category()
# knew ASCII only, combining() answered 0 and decomposition() did not exist.
# That silently disabled urllib.parse's NFKC netloc check (bpo-36742) and
# failed test_urlparse.  They now read _ucd_current.py, which
# scripts/generate_ucd.py generates from CPython's own database and verifies
# against it on every code point before writing.  This fixture is the
# independent check that the WIRING reaches it, in both roles.
#
# EXPECTED values below were measured under CPython 3.14.6 and written by
# script, as ascii() literals (combining marks do not survive being pasted).

import unicodedata
import urllib.parse

FORMS = ('NFC', 'NFD', 'NFKC', 'NFKD')

# ch -> (category, bidirectional, combining, decomposition)
PROPS = {
    'a': ('Ll', 'L', 0, ''),
    'A': ('Lu', 'L', 0, ''),
    '5': ('Nd', 'EN', 0, ''),
    '\xe9': ('Ll', 'L', 0, '0065 0301'),
    '\u0301': ('Mn', 'NSM', 230, ''),
    '\u2100': ('So', 'ON', 0, '<compat> 0061 002F 0063'),
    '\uff03': ('Po', 'ET', 0, '<wide> 0023'),
    '\xbd': ('No', 'ON', 0, '<fraction> 0031 2044 0032'),
    '\uac00': ('Lo', 'L', 0, '1100 1161'),
    '\ud55c': ('Lo', 'L', 0, '1112 1161 11AB'),
    '\u1e9b': ('Ll', 'L', 0, '017F 0307'),
    '\ufb01': ('Ll', 'L', 0, '<compat> 0066 0069'),
    '\u212b': ('Lu', 'L', 0, '00C5'),
    '\u0e3f': ('Sc', 'ET', 0, ''),
    '\u05d0': ('Lo', 'R', 0, ''),
    '\U0001f600': ('So', 'ON', 0, ''),
    '\ue000': ('Co', 'L', 0, ''),
    '\u0378': ('Cn', '', 0, ''),
    '\u3000': ('Zs', 'WS', 0, '<wide> 0020'),
    '\u30d5': ('Lo', 'L', 0, ''),
}

# text -> (NFC, NFD, NFKC, NFKD)
NORMALIZED = {
    'caf\xe9': ('caf\xe9', 'cafe\u0301', 'caf\xe9', 'cafe\u0301'),
    'cafe\u0301': ('caf\xe9', 'cafe\u0301', 'caf\xe9', 'cafe\u0301'),
    '\u1e9b\u0323': ('\u1e9b\u0323', '\u017f\u0323\u0307', '\u1e69', 's\u0323\u0307'),
    '\u212b\u2126': ('\xc5\u03a9', 'A\u030a\u03a9', '\xc5\u03a9', 'A\u030a\u03a9'),
    '\u1100\u1161\u11a8': ('\uac01', '\u1100\u1161\u11a8', '\uac01', '\u1100\u1161\u11a8'),
    '\ud55c\uae00': ('\ud55c\uae00', '\u1112\u1161\u11ab\u1100\u1173\u11af', '\ud55c\uae00', '\u1112\u1161\u11ab\u1100\u1173\u11af'),
    '\ufb01ne \u2460 \xbd': ('\ufb01ne \u2460 \xbd', '\ufb01ne \u2460 \xbd', 'fine 1 1\u20442', 'fine 1 1\u20442'),
    'q\u0307\u0323': ('q\u0323\u0307', 'q\u0323\u0307', 'q\u0323\u0307', 'q\u0323\u0307'),
    '\xc5\u0328': ('\u0104\u030a', 'A\u0328\u030a', '\u0104\u030a', 'A\u0328\u030a'),
    'x\u0301\u0327\u0308': ('x\u0327\u0301\u0308', 'x\u0327\u0301\u0308', 'x\u0327\u0301\u0308', 'x\u0327\u0301\u0308'),
    '\u30d5\u309a': ('\u30d7', '\u30d5\u309a', '\u30d7', '\u30d5\u309a'),
    'A\u030a\u0301': ('\u01fa', 'A\u030a\u0301', '\u01fa', 'A\u030a\u0301'),
}

# text -> is_normalized in (NFC, NFD, NFKC, NFKD)
IS_NORMALIZED = {
    'caf\xe9': (True, False, True, False),
    'cafe\u0301': (False, True, False, True),
    '\u1e9b\u0323': (True, False, False, False),
    '\u212b\u2126': (False, False, False, False),
    '\u1100\u1161\u11a8': (False, True, False, True),
    '\ud55c\uae00': (True, False, True, False),
    '\ufb01ne \u2460 \xbd': (True, True, False, False),
    'q\u0307\u0323': (False, False, False, False),
    '\xc5\u0328': (False, False, False, False),
    'x\u0301\u0327\u0308': (False, False, False, False),
    '\u30d5\u309a': (False, True, False, True),
    'A\u030a\u0301': (False, True, False, True),
}

# netlocs with a character that NFKC-normalizes to one of '/?#@:'
REJECTED_URLS = ['http://netloc\u2100false.netloc/path', 'http://n\uff03user@netloc/path', 'http://\u30d5\u309a\ufe1380']

# ... and ones that must still parse
ACCEPTED_URLS = ['http://\u30d5\u309a:80', 'http://caf\xe9.example/p']


def properties_match():
    return all((unicodedata.category(c), unicodedata.bidirectional(c),
                unicodedata.combining(c), unicodedata.decomposition(c)) == want
               for c, want in PROPS.items())


def normalize_all_four_forms():
    return all(tuple(unicodedata.normalize(f, s) for f in FORMS) == want
               for s, want in NORMALIZED.items())


def is_normalized_all_four_forms():
    return all(tuple(unicodedata.is_normalized(f, s) for f in FORMS) == want
               for s, want in IS_NORMALIZED.items())


def normalize_rejects_an_unknown_form():
    try:
        unicodedata.normalize('NFX', 'a')
    except ValueError:
        return True
    return False


def unidata_version_is_the_tables():
    import _ucd_current
    return unicodedata.unidata_version == _ucd_current.VERSION == '16.0.0'


def urlsplit_rejects_nfkc_netloc_separators():
    for url in REJECTED_URLS:
        try:
            urllib.parse.urlsplit(url)
        except ValueError:
            continue
        return False
    return True


def urlsplit_accepts_ordinary_non_ascii_netlocs():
    for url in ACCEPTED_URLS:
        urllib.parse.urlsplit(url)
    return True


CHECKS = [
    properties_match,
    normalize_all_four_forms,
    is_normalized_all_four_forms,
    normalize_rejects_an_unknown_form,
    unidata_version_is_the_tables,
    urlsplit_rejects_nfkc_netloc_separators,
    urlsplit_accepts_ordinary_non_ascii_netlocs,
]


if __name__ == '__main__':
    import os, sys
    # Appended, not prepended: only _ucd_current is wanted from Grail's
    # stdlib, and CPython's own modules must still win every other import.
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 '..', '..', 'src', 'python', 'stdlib'))
    for fn in CHECKS:
        try:
            ok = fn() is True
        except Exception as e:
            ok = False
            print('     %s raised %s: %s' % (fn.__name__, type(e).__name__, e))
        print('%-4s %s' % ('OK' if ok else 'FAIL', fn.__name__))
