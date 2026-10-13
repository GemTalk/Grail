"""``\\N{NAME}`` and ``unicodedata``, against a generated UCD table.

Grail resolved ``\\N{NAME}`` against a HAND-CURATED table of 33 names, in
TWO places: ``PythonTokenizer >> ___unicodeNameToCodePoint___:`` for
string literals, and ``unicodedata.py``'s own ``_name_to_codepoint`` for
``unicodedata.lookup()`` and the ``\\N`` escape in regexes.  Both said
"extend as needed", and each carried a comment asking the next person to
keep it in sync with the other.

An unknown name was a hard SyntaxError rather than a fallback, so the
cost was not a wrong answer, it was a whole module: CPython's
``test/pickletester.py`` is 5300 lines and contains exactly one named
escape, ``"\\N{EMPTY SET}"``, which neither list happened to hold.

Both tables are gone.  ``src/smalltalk/Python/unicode_names.gs`` is
generated from the UCD by ``scripts/generate_unicode_names.py``: 34202
names stored, and the 114716 Hangul syllables and hex-suffixed ideographs
COMPUTED rather than stored, exactly as CPython splits them.

Everything here is asserted against CPython's own ``unicodedata``, so
under the fixture gate it is checking the real UCD.

Every expectation was checked against CPython 3.14 first.
"""

import unicodedata

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except Exception as exc:
        return (type(exc).__name__, str(exc))


# ------------------------------------------------- the literal that blocked

EMPTY_SET = "\N{EMPTY SET}"


def _the_escape_that_cost_a_module():
    return ord(EMPTY_SET)


check('the_escape_that_cost_a_module', _the_escape_that_cost_a_module(), 0x2205)


# --------------------------------------------- escapes, all four families

STORED = "\N{SNOWMAN}"
HANGUL = "\N{HANGUL SYLLABLE GGWAELS}"
IDEOGRAPH = "\N{CJK UNIFIED IDEOGRAPH-4E2D}"
HIEROGLYPH = "\N{EGYPTIAN HIEROGLYPH-13460}"
ALIAS = "\N{NULL}"
LOWERCASE = "\N{latin small letter a}"


def _escapes():
    return tuple(ord(s) for s in
                 (STORED, HANGUL, IDEOGRAPH, HIEROGLYPH, ALIAS, LOWERCASE))


check('escapes', _escapes(),
      (0x2603, 0xAF70, 0x4E2D, 0x13460, 0x0000, 0x0061))


# ------------------------------------------------------ lookup(), by family

def _lookup_stored():
    return ord(unicodedata.lookup('EMPTY SET'))


def _lookup_hangul_all_three_parts():
    """Lead, vowel and trail all non-empty, and each of the degenerate ones."""
    return tuple(ord(unicodedata.lookup(n)) for n in (
        'HANGUL SYLLABLE GA',        # trail empty
        'HANGUL SYLLABLE GGWAELS',   # all three present
        'HANGUL SYLLABLE A',         # lead empty
        'HANGUL SYLLABLE HIH',       # the last syllable
    ))


def _lookup_algorithmic():
    return tuple(ord(unicodedata.lookup(n)) for n in (
        'CJK UNIFIED IDEOGRAPH-4E2D',
        'CJK COMPATIBILITY IDEOGRAPH-F900',
        'EGYPTIAN HIEROGLYPH-13460',
        'NUSHU CHARACTER-1B170',
        'KHITAN SMALL SCRIPT CHARACTER-18B00',
    ))


def _lookup_control_aliases():
    """A control has no name of its own; the alias is the only way in."""
    return tuple(ord(unicodedata.lookup(n)) for n in (
        'NULL', 'LINE FEED', 'ESCAPE', 'DELETE',
        'APPLICATION PROGRAM COMMAND',
    ))


def _lookup_is_case_insensitive():
    return (unicodedata.lookup('snowman') == unicodedata.lookup('SNOWMAN')
            == unicodedata.lookup('SnOwMaN'))


check('lookup_stored', _lookup_stored(), 0x2205)
check('lookup_hangul_all_three_parts', _lookup_hangul_all_three_parts(),
      (0xAC00, 0xAF70, 0xC544, 0xD7A3))
check('lookup_algorithmic', _lookup_algorithmic(),
      (0x4E2D, 0xF900, 0x13460, 0x1B170, 0x18B00))
check('lookup_control_aliases', _lookup_control_aliases(),
      (0x00, 0x0A, 0x1B, 0x7F, 0x9F))
check('lookup_is_case_insensitive', _lookup_is_case_insensitive(), True)


# ---------------------------------------------------------- what must NOT hit

def _unknown_name_raises():
    return _outcome(lambda: unicodedata.lookup('NO SUCH NAME AT ALL'))[0]


def _hex_suffix_outside_its_range():
    """The suffix IS the code point, not an index -- so this is not a name."""
    return _outcome(lambda: unicodedata.lookup('CJK UNIFIED IDEOGRAPH-0041'))[0]


def _wrong_prefix_for_a_real_code_point():
    return _outcome(lambda: unicodedata.lookup('NUSHU CHARACTER-4E2D'))[0]


def _not_a_hangul_syllable():
    return _outcome(lambda: unicodedata.lookup('HANGUL SYLLABLE ZZZ'))[0]


check('unknown_name_raises', _unknown_name_raises(), 'KeyError')
check('hex_suffix_outside_its_range', _hex_suffix_outside_its_range(),
      'KeyError')
check('wrong_prefix_for_a_real_code_point',
      _wrong_prefix_for_a_real_code_point(), 'KeyError')
check('not_a_hangul_syllable', _not_a_hangul_syllable(), 'KeyError')


# ----------------------------------------------------------------- name()

def _name_stored():
    return unicodedata.name('∅')


def _name_hangul():
    return tuple(unicodedata.name(chr(cp)) for cp in (0xAC00, 0xAF70, 0xD7A3))


def _name_algorithmic():
    return tuple(unicodedata.name(chr(cp)) for cp in (0x4E2D, 0xF900, 0x13460))


def _name_of_a_control_raises():
    """An ALIAS is not a name: lookup('NULL') works, name(chr(0)) does not."""
    return _outcome(lambda: unicodedata.name('\x00'))[0]


def _name_takes_a_default():
    return unicodedata.name('\x00', 'fallback')


def _name_round_trips():
    return all(unicodedata.lookup(unicodedata.name(chr(cp))) == chr(cp)
               for cp in (0x2205, 0x2603, 0xAC00, 0xAF70, 0xD7A3, 0x4E2D,
                          0xF900, 0x13460, 0x41, 0x1B170))


check('name_stored', _name_stored(), 'EMPTY SET')
check('name_hangul', _name_hangul(),
      ('HANGUL SYLLABLE GA', 'HANGUL SYLLABLE GGWAELS',
       'HANGUL SYLLABLE HIH'))
check('name_algorithmic', _name_algorithmic(),
      ('CJK UNIFIED IDEOGRAPH-4E2D', 'CJK COMPATIBILITY IDEOGRAPH-F900',
       'EGYPTIAN HIEROGLYPH-13460'))
check('name_of_a_control_raises', _name_of_a_control_raises(), 'ValueError')
check('name_takes_a_default', _name_takes_a_default(), 'fallback')
check('name_round_trips', _name_round_trips(), True)


# ------------------------------------------- the boundaries of each range

def _hangul_boundaries():
    """One inside each end, one just outside each end."""
    return (unicodedata.name(chr(0xAC00)),
            unicodedata.name(chr(0xD7A3)),
            _outcome(lambda: unicodedata.name(chr(0xABFF)))[0],
            _outcome(lambda: unicodedata.name(chr(0xD7A4)))[0])


check('hangul_boundaries', _hangul_boundaries(),
      ('HANGUL SYLLABLE GA', 'HANGUL SYLLABLE HIH', 'ValueError',
       'ValueError'))


# ------------------------------------------------- name aliases (#1412)
#
# CPython's \N{} and lookup() accept every category of Unicode's
# NameAliases.txt.  Only the CONTROL aliases were stored, and iniconfig 2.3.1
# writes "\N{BYTE ORDER MARK}" -- an alternate -- so it stopped importing,
# and pytest with it.

def _aliases_of_every_category():
    return [ord(unicodedata.lookup(n)) for n in (
        'NULL',                         # control
        'LATIN CAPITAL LETTER GHA',     # correction
        'BOM',                          # abbreviation
        'BYTE ORDER MARK',              # alternate
        'PADDING CHARACTER',            # figment
        'nbsp')]                        # and case-insensitively


check('aliases_of_every_category', _aliases_of_every_category(),
      [0x0, 0x1A2, 0xFEFF, 0xFEFF, 0x80, 0xA0])
check('alias_escapes', "\N{BYTE ORDER MARK}\N{NBSP}\N{ZWJ}", '\ufeff\xa0\u200d')
check('an_alias_is_not_a_name',
      (unicodedata.name('\ufeff'), unicodedata.name('\u01a2')),
      ('ZERO WIDTH NO-BREAK SPACE', 'LATIN CAPITAL LETTER OI'))


# A \N{} that cannot be decoded is CPython's codec error, located at the
# literal.  It was a bare SyntaxError: compile() carried the message and no
# line, eval() and an import not even the message.

def _bad_escape(how, src, end=False):
    try:
        if how == 'eval':
            eval(src)
        else:
            compile(src, 'f.py', 'exec')
    except SyntaxError as exc:
        if end:
            return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)
        return (exc.msg, exc.lineno, exc.offset)
    return 'no error'


check('an_unknown_name_is_located', [
    _bad_escape('compile', 'x = 1\ny = "ab\\N{NO SUCH NAME}"\n'),
    _bad_escape('eval', '"\\N{NO SUCH NAME}"')],
    [("(unicode error) 'unicodeescape' codec can't decode bytes in position "
      "2-17: unknown Unicode character name", 2, 5),
     ("(unicode error) 'unicodeescape' codec can't decode bytes in position "
      "0-15: unknown Unicode character name", 1, 1)])
check('a_malformed_escape_is_located', _bad_escape('compile', 'y = "\\N{BOM"\n'),
      ("(unicode error) 'unicodeescape' codec can't decode bytes in position "
       "0-5: malformed \\N character escape", 1, 5))


# The literal's other decoding errors had the same bare SyntaxError, and the
# span is CPython's: over the token, prefix to closing quote, and counted in
# the RAW body, where a non-ASCII character counts ten -- CPython rewrites it
# as a \\UXXXXXXXX escape before decoding.
_CODEC = "(unicode error) 'unicodeescape' codec can't decode bytes in position "
check('every_literal_decoding_error_is_located', [
    _bad_escape('compile', 'y = "\\t\\x4"\n', end=True),
    _bad_escape('eval', '"\\u12"', end=True),
    _bad_escape('compile', 'y = "\u00e9\\N{X}"\n', end=True),
    _bad_escape('compile', 'y = u"\\N{X}"\n', end=True),
    _bad_escape('compile', 'y = b"a\\x4"\n', end=True),
    _bad_escape('eval', 'b"\u00e9"', end=True)],
    [(_CODEC + '2-4: truncated \\xXX escape', 1, 5, 1, 12),
     (_CODEC + '0-3: truncated \\uXXXX escape', 1, 1, 1, 7),
     (_CODEC + '10-14: unknown Unicode character name', 1, 5, 1, 13),
     (_CODEC + '0-4: unknown Unicode character name', 1, 5, 1, 13),
     ('(value error) invalid \\x escape at position 1', 1, 5, 1, 12),
     ('bytes can only contain ASCII literal characters', 1, 1, 1, 5)])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
