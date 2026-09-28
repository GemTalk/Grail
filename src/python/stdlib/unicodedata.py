# Grail unicodedata.
#
# CPython's unicodedata is C-implemented and exposes Unicode Character
# Database queries.  Here:
#
#   * REAL, over tables generated from CPython's own database by
#     scripts/generate_ucd.py and verified against it on every code point
#     (_ucd_current.py, read by _ucd.Database): category, bidirectional,
#     combining, decomposition, normalize and is_normalized, and
#     unidata_version.  Likewise ``ucd_3_2_0'' below, for stringprep/IDNA.
#   * REAL, from the generated name tables: lookup and name.
#   * STILL STUBS: east_asian_width (always 'N'); mirrored, decimal, digit
#     and numeric are absent.
#
# normalize used to return its argument unchanged.  That silently disabled
# urllib.parse's _checknetloc (bpo-36742: a netloc character that NFKC-
# normalizes to one of '/?#@:' must raise), and it made Werkzeug's
# secure_filename keep combining marks.
#
# The table module is imported INSIDE _current(), for the deploy reason in
# the note further down.


# A literal, not _ucd_current.VERSION: no module-level import (NOTE below).
# tests/python/unicodedata_current.py pins the two equal.
unidata_version = '16.0.0'


def _current():
    import _ucd
    import _ucd_current
    return _ucd.database(_ucd_current)


def normalize(form, unistr):
    return _current().normalize(form, unistr)


def is_normalized(form, unistr):
    return _current().is_normalized(form, unistr)


def category(ch):
    return _current().category(ch)


def bidirectional(ch):
    return _current().bidirectional(ch)


def combining(ch):
    return _current().combining(ch)


def decomposition(ch):
    return _current().decomposition(ch)


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


# ``unicodedata.ucd_3_2_0'': the Unicode 3.2.0 database, which stringprep and
# encodings.idna are specified against (RFC 3454 / RFC 3490 freeze it).  Unlike
# the stubs above it is REAL -- category, bidirectional, combining,
# decomposition and all four normalization forms, over tables generated from
# CPython's own ucd_3_2_0 by scripts/generate_ucd.py and verified against it.
#
# Its helpers are imported inside each method, for the deploy reason in the
# note above: a module-level import here would be bound once at deploy time.


class _UCD_3_2_0:
    unidata_version = '3.2.0'

    def _db(self):
        import _ucd
        import _ucd_3_2_0
        return _ucd.database(_ucd_3_2_0)

    def category(self, ch):
        return self._db().category(ch)

    def bidirectional(self, ch):
        return self._db().bidirectional(ch)

    def combining(self, ch):
        return self._db().combining(ch)

    def decomposition(self, ch):
        return self._db().decomposition(ch)

    def normalize(self, form, unistr):
        return self._db().normalize(form, unistr)

    def is_normalized(self, form, unistr):
        return self._db().is_normalized(form, unistr)


ucd_3_2_0 = _UCD_3_2_0()
