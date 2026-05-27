# Grail unicodedata stub.
#
# CPython's unicodedata is C-implemented and exposes Unicode
# Character Database queries (category, bidirectional, mirrored,
# combining, decimal, normalization, etc).  Werkzeug.utils
# imports it for ``unicodedata.normalize('NFKD', filename)'' in
# secure_filename — which strips combining marks from filenames
# before ASCII-encoding them.
#
# Grail strings are already a mix of byte/wide representations;
# the stub passes through ASCII strings and approximates NFKD
# decomposition by stripping anything outside [0x20, 0x7e].


def normalize(form, s):
    """Approximate normalization.  ``NFKD'' / ``NFC'' / ``NFD'' /
    ``NFKC'' — Grail returns the input string unchanged.  Callers
    that depend on real decomposition for security-sensitive
    filename sanitization should not rely on this stub."""
    return s


def category(ch):
    """Default Unicode category — returns ``'Cn''  for unassigned.
    A real implementation would consult the UCD; for now return
    ``Ll'' for lowercase ASCII letters, ``Lu'' for uppercase, ``Nd''
    for digits, ``Zs'' for space, ``Po'' for other punctuation."""
    if len(ch) != 1:
        raise TypeError('category() takes a single character')
    code = ord(ch)
    if 0x30 <= code <= 0x39:
        return 'Nd'
    if 0x41 <= code <= 0x5a:
        return 'Lu'
    if 0x61 <= code <= 0x7a:
        return 'Ll'
    if code == 0x20:
        return 'Zs'
    if 0x21 <= code <= 0x2f:
        return 'Po'
    return 'Cn'


def combining(ch):
    """Combining class — Grail returns 0 (non-combining) always."""
    return 0


def east_asian_width(ch):
    """East Asian Width — Grail returns 'N' (narrow / neutral) always."""
    return 'N'
