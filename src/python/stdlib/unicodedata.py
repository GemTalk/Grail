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


# Names come from ``unicode_names'' (src/smalltalk/Python/unicode_names.gs),
# GENERATED from the Unicode Character Database by
# scripts/generate_unicode_names.py.
#
# This module used to carry a hand-curated table of ~33 names, and
# PythonTokenizer.gs carried a SECOND curated copy for the ``\N{NAME}''
# escape in string literals -- two lists of the same data, with a comment on
# each asking the next person to keep them in sync.  Both are gone.  A name
# outside those lists was a hard failure rather than a fallback, so one
# ordinary literal (``"\N{EMPTY SET}"'' in test/pickletester.py) cost a whole
# 5300-line test module.
#
# 34137 names are stored, plus 65 C0/C1 control aliases; the 114716 Hangul
# syllables and hex-suffixed ideographs are computed instead of stored,
# exactly as CPython does.
#
# NOTE for anyone adding an import here: ``unicode_names'' is imported INSIDE
# each function, not at module level, and that is not a style choice.
# unicodedata is a DEPLOYED module, so a module-level import is bound once at
# DEPLOY time and a later session's globals do not have the name -- every
# reader then dies with ``NameError: name 'unicode_names' is not defined''
# from inside a nested import, which is where this was first seen (four
# DjangoTestCase errors, django reaching unicodedata through
# secure_filename).  contextlib.py carries the same warning for the same
# reason.


def lookup(name):
    """Character for a Unicode name, KeyError if there is none.

    Matches case-insensitively, as the real UCD lookup does, and accepts
    the control ALIASES (``NULL'', ``LINE FEED'') that CPython accepts --
    those code points have no formal name, so an alias is the only way to
    name them at all.

    Named SEQUENCES (e.g. ``KEYCAP NUMBER SIGN'') remain absent, which is
    CPython's behaviour for this function too: they resolve to more than
    one code point, and the escape rejects them too.
    """
    import unicode_names
    cp = unicode_names.codepoint_for_name(name)
    if cp is None:
        raise KeyError("undefined character name '" + name + "'")
    return chr(cp)


def name(chr_, default=None):
    """Name of a character, ValueError if it has none.

    Unassigned code points and control characters have no name -- their
    ALIASES are not names, so ``name(chr(0))'' raises here exactly as it
    does in CPython even though ``lookup('NULL')'' succeeds.
    """
    if len(chr_) != 1:
        raise TypeError('name() argument 1 must be a unicode character, '
                        'not str')
    import unicode_names
    found = unicode_names.name_for_codepoint(ord(chr_))
    if found is None:
        if default is not None:
            return default
        raise ValueError('no such name')
    return found
