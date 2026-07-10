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


# Curated single-code-point name table for lookup() -- Grail has no
# Unicode Character Database.  re._parser resolves \N{NAME} pattern
# escapes through this, so the names CPython's test_re exercises are
# here alongside the tokenizer's table (PythonTokenizer.gs
# ___unicodeNameToCodePoint___:, which handles \N in ordinary string
# literals -- keep the two in sync when extending).  Named SEQUENCES
# (e.g. KEYCAP NUMBER SIGN) are deliberately absent: CPython's \N
# escape rejects them too.
_name_to_codepoint = {
    "NULL": 0x0,
    "NO-BREAK SPACE": 0xA0,
    "NARROW NO-BREAK SPACE": 0x202F,
    "ZERO WIDTH SPACE": 0x200B,
    "ZERO WIDTH NO-BREAK SPACE": 0xFEFF,
    "EN SPACE": 0x2002,
    "EM SPACE": 0x2003,
    "THIN SPACE": 0x2009,
    "HAIR SPACE": 0x200A,
    "EN DASH": 0x2013,
    "EM DASH": 0x2014,
    "HORIZONTAL ELLIPSIS": 0x2026,
    "BULLET": 0x2022,
    "LINE SEPARATOR": 0x2028,
    "PARAGRAPH SEPARATOR": 0x2029,
    "LEFT SINGLE QUOTATION MARK": 0x2018,
    "RIGHT SINGLE QUOTATION MARK": 0x2019,
    "LEFT DOUBLE QUOTATION MARK": 0x201C,
    "RIGHT DOUBLE QUOTATION MARK": 0x201D,
    "DEGREE SIGN": 0xB0,
    "MICRO SIGN": 0xB5,
    "MULTIPLICATION SIGN": 0xD7,
    "LESS-THAN SIGN": 0x3C,
    "GREATER-THAN SIGN": 0x3E,
    "DIGIT SEVEN": 0x37,
    "SUBSCRIPT TWO": 0x2082,
    "ROMAN NUMERAL SIX": 0x2165,
    "CIRCLED NUMBER THIRTY NINE": 0x32B4,
    "FULLWIDTH DIGIT ZERO": 0xFF10,
    "HANGZHOU NUMERAL TWENTY": 0x3039,
    "THAI DIGIT SIX": 0xE56,
    "LATIN CAPITAL LETTER A WITH DIAERESIS": 0xC4,
    "LATIN CAPITAL LETTER O WITH DIAERESIS": 0xD6,
    "LATIN CAPITAL LETTER U WITH DIAERESIS": 0xDC,
    "LATIN SMALL LETTER A WITH DIAERESIS": 0xE4,
    "LATIN SMALL LETTER O WITH DIAERESIS": 0xF6,
    "LATIN SMALL LETTER U WITH DIAERESIS": 0xFC,
    "LATIN SMALL LETTER SHARP S": 0xDF,
    "GREEK SMALL LETTER ALPHA": 0x3B1,
    "GREEK SMALL LETTER PI": 0x3C0,
    "REPLACEMENT CHARACTER": 0xFFFD,
    "SNOWMAN": 0x2603,
    "SNAKE": 0x1F40D,
}


def lookup(name):
    """Character for a Unicode name (curated subset; KeyError on an
    unknown name, matching CPython).  Names match case-insensitively,
    as in the real UCD lookup."""
    key = name.upper()
    if key in _name_to_codepoint:
        return chr(_name_to_codepoint[key])
    raise KeyError("undefined character name '" + name + "'")
