#!/usr/bin/env python3
"""Regenerate src/smalltalk/Python/unicode_names.gs from the Unicode
Character Database that the running CPython carries.

WHY THIS EXISTS.  Grail resolved ``\\N{NAME}`` against a HAND-CURATED table
of 33 names, in TWO places -- PythonTokenizer >> ___unicodeNameToCodePoint___:
for string literals, and stdlib/unicodedata.py's ``_name_to_codepoint`` for
unicodedata.lookup() and the ``\\N`` escape in regexes.  Both said "extend as
needed", and keeping two curated lists in sync by hand is a promise nobody
keeps.  A 5300-line CPython test module (test/pickletester.py) was blocked on
``"\\N{EMPTY SET}"``, a name neither list happened to contain.

WHAT IS GENERATED AND WHAT IS NOT.  The UCD names 148853 code points, but
only 34137 of them have a name that must be STORED.  The other 114716 are
ALGORITHMIC -- a fixed prefix plus the code point in hex (CJK ideographs,
Egyptian hieroglyphs, ...), or a Hangul syllable composed from jamo -- and
CPython computes those rather than storing them too.  So does the generated
module: this script emits the explicit table plus the RANGES of each
algorithmic family, read out of the UCD rather than written down here, and
unicode_names.gs does the arithmetic.

ENCODING.  Unicode names use only ``A-Z``, ``0-9``, space and hyphen, so a
chunk is one Smalltalk string literal of ``NAME=HEX;NAME=HEX;...`` needing no
escaping at all, split across methods to keep any single literal modest.  The
module parses them once, lazily, into a dictionary cached in a class variable
-- most sessions never resolve a name, and the ones that do pay for it once.

Run with the SAME CPython version Grail vendors (3.14.x):
    python3.14 scripts/generate_unicode_names.py
"""
import io
import itertools
import re
import sys
import unicodedata

GS = 'src/smalltalk/Python/unicode_names.gs'
CHUNK = 1000

# A name ending in "-<hex of this code point>" is algorithmic.  Matched
# against the code point itself so that a name merely ENDING in hex digits
# (there are none today, but the UCD is not frozen) is not mistaken for one.
ALGO = re.compile(r'^(.*)-([0-9A-F]{4,6})$')

HANGUL_BASE, HANGUL_LAST = 0xAC00, 0xD7A3

# ---------------------------------------------------------------------------
# CONTROL ALIASES.  The only names written down in this file, and not for
# convenience: a C0/C1 control has NO name at all -- unicodedata.name(chr(0))
# raises -- so unless its alias is stored the code point is unreachable by
# name entirely, and \N{NULL} is a spelling CPython accepts that Grail's old
# curated table already had.  Every OTHER alias category (corrections,
# abbreviations, figments) names a code point that is reachable under its
# formal name, so omitting those costs a spelling, not a character.
#
# The list is fixed by the Unicode standard and will not grow.  Nothing in it
# is TRUSTED, though: verified_control_aliases() looks every one up in
# CPython, keeps only what resolves to the code point claimed, and refuses to
# generate at all if a name is wrong or if any C0/C1 code point has no alias.
CONTROL_ALIASES = [
    (0x00, 'NULL'), (0x01, 'START OF HEADING'), (0x02, 'START OF TEXT'),
    (0x03, 'END OF TEXT'), (0x04, 'END OF TRANSMISSION'), (0x05, 'ENQUIRY'),
    (0x06, 'ACKNOWLEDGE'), (0x07, 'ALERT'), (0x08, 'BACKSPACE'),
    (0x09, 'CHARACTER TABULATION'), (0x0A, 'LINE FEED'),
    (0x0B, 'LINE TABULATION'), (0x0C, 'FORM FEED'),
    (0x0D, 'CARRIAGE RETURN'), (0x0E, 'SHIFT OUT'), (0x0F, 'SHIFT IN'),
    (0x10, 'DATA LINK ESCAPE'), (0x11, 'DEVICE CONTROL ONE'),
    (0x12, 'DEVICE CONTROL TWO'), (0x13, 'DEVICE CONTROL THREE'),
    (0x14, 'DEVICE CONTROL FOUR'), (0x15, 'NEGATIVE ACKNOWLEDGE'),
    (0x16, 'SYNCHRONOUS IDLE'), (0x17, 'END OF TRANSMISSION BLOCK'),
    (0x18, 'CANCEL'), (0x19, 'END OF MEDIUM'), (0x1A, 'SUBSTITUTE'),
    (0x1B, 'ESCAPE'), (0x1C, 'INFORMATION SEPARATOR FOUR'),
    (0x1D, 'INFORMATION SEPARATOR THREE'),
    (0x1E, 'INFORMATION SEPARATOR TWO'),
    (0x1F, 'INFORMATION SEPARATOR ONE'), (0x7F, 'DELETE'),
    (0x80, 'PADDING CHARACTER'), (0x81, 'HIGH OCTET PRESET'),
    (0x82, 'BREAK PERMITTED HERE'), (0x83, 'NO BREAK HERE'), (0x84, 'INDEX'),
    (0x85, 'NEXT LINE'), (0x86, 'START OF SELECTED AREA'),
    (0x87, 'END OF SELECTED AREA'), (0x88, 'CHARACTER TABULATION SET'),
    (0x89, 'CHARACTER TABULATION WITH JUSTIFICATION'),
    (0x8A, 'LINE TABULATION SET'), (0x8B, 'PARTIAL LINE FORWARD'),
    (0x8C, 'PARTIAL LINE BACKWARD'), (0x8D, 'REVERSE LINE FEED'),
    (0x8E, 'SINGLE SHIFT TWO'), (0x8F, 'SINGLE SHIFT THREE'),
    (0x90, 'DEVICE CONTROL STRING'), (0x91, 'PRIVATE USE ONE'),
    (0x92, 'PRIVATE USE TWO'), (0x93, 'SET TRANSMIT STATE'),
    (0x94, 'CANCEL CHARACTER'), (0x95, 'MESSAGE WAITING'),
    (0x96, 'START OF GUARDED AREA'), (0x97, 'END OF GUARDED AREA'),
    (0x98, 'START OF STRING'),
    (0x99, 'SINGLE GRAPHIC CHARACTER INTRODUCER'),
    (0x9A, 'SINGLE CHARACTER INTRODUCER'),
    (0x9B, 'CONTROL SEQUENCE INTRODUCER'), (0x9C, 'STRING TERMINATOR'),
    (0x9D, 'OPERATING SYSTEM COMMAND'), (0x9E, 'PRIVACY MESSAGE'),
    (0x9F, 'APPLICATION PROGRAM COMMAND'),
]


def verified_control_aliases():
    """Only the aliases CPython itself confirms, and all of them."""
    good = []
    for cp, alias in CONTROL_ALIASES:
        try:
            got = ord(unicodedata.lookup(alias))
        except KeyError:
            raise SystemExit('alias %r does not resolve in CPython UCD %s'
                             % (alias, unicodedata.unidata_version))
        if got != cp:
            raise SystemExit('alias %r resolves to U+%04X, not U+%04X'
                             % (alias, got, cp))
        good.append((alias, cp))
    covered = set(cp for cp, _ in CONTROL_ALIASES)
    missing = [cp for cp in list(range(0x20)) + list(range(0x7F, 0xA0))
               if cp not in covered]
    if missing:
        raise SystemExit('C0/C1 code points with no alias: %s'
                         % ' '.join('U+%04X' % c for c in missing))
    return good



def collect():
    """Split every named code point into explicit, algorithmic and Hangul."""
    explicit, algo = [], {}
    hangul = 0
    for cp in range(0x110000):
        try:
            name = unicodedata.name(chr(cp))
        except ValueError:
            continue
        if HANGUL_BASE <= cp <= HANGUL_LAST:
            assert name.startswith('HANGUL SYLLABLE '), name
            hangul += 1
            continue
        m = ALGO.match(name)
        if m and int(m.group(2), 16) == cp:
            algo.setdefault(m.group(1), []).append(cp)
            continue
        explicit.append((name, cp))
    assert hangul == HANGUL_LAST - HANGUL_BASE + 1, hangul
    return explicit, algo


def ranges(cps):
    out = []
    for _, group in itertools.groupby(enumerate(cps), lambda t: t[1] - t[0]):
        g = list(group)
        out.append((g[0][1], g[-1][1]))
    return out


def hangul_jamo():
    """The three jamo name tables, DERIVED from the UCD rather than copied.

    The syllable name is 'HANGUL SYLLABLE ' + L + V + T, where the three
    parts are indexed by the standard decomposition
    (cp - 0xAC00) -> (l, v, t) with 21*28 and 28 as the strides.  Reading
    them off real syllables means the tables cannot disagree with the
    database this script is generating from.
    """
    def part(cp):
        return unicodedata.name(chr(cp))[len('HANGUL SYLLABLE '):]

    def common_prefix(strings):
        first = strings[0]
        for i in range(len(first), -1, -1):
            if all(s.startswith(first[:i]) for s in strings):
                return first[:i]
        return ''

    def common_suffix(strings):
        first = strings[0]
        for i in range(len(first), -1, -1):
            if all(s.endswith(first[len(first) - i:]) for s in strings):
                return first[len(first) - i:]
        return ''

    # Every name is lead + vowel + trail concatenated with no separator, so
    # the split has to be found rather than assumed.  Hold two of the three
    # indices at zero and the varying part is isolated by what the others
    # SHARE: across all 21 vowels the lead is the common prefix, and across
    # all 19 leads the vowel is the common suffix.  (Naively reading
    # lead[0] off syllable AC00 answers 'GA' -- lead AND vowel -- which is
    # the circularity this avoids.)
    v_zero_t_zero = [part(HANGUL_BASE + l * 21 * 28) for l in range(19)]
    l_zero_t_zero = [part(HANGUL_BASE + v * 28) for v in range(21)]
    lead0 = common_prefix(l_zero_t_zero)
    vowel0 = common_suffix(v_zero_t_zero)

    lead = [s[:len(s) - len(vowel0)] for s in v_zero_t_zero]
    vowel = [s[len(lead0):] for s in l_zero_t_zero]
    trail = [part(HANGUL_BASE + t)[len(lead0) + len(vowel0):]
             for t in range(28)]
    return lead, vowel, trail


def verify(lead, vowel, trail):
    """Every Hangul syllable must round-trip through the emitted tables."""
    for cp in range(HANGUL_BASE, HANGUL_LAST + 1):
        i = cp - HANGUL_BASE
        built = ('HANGUL SYLLABLE ' + lead[i // (21 * 28)]
                 + vowel[i // 28 % 21] + trail[i % 28])
        if built != unicodedata.name(chr(cp)):
            raise SystemExit('hangul mismatch at %04X: %r != %r'
                             % (cp, built, unicodedata.name(chr(cp))))


def literal(s):
    return "'" + s + "'"


def main():
    explicit, algo = collect()
    explicit.sort()
    aliases = verified_control_aliases()
    lead, vowel, trail = hangul_jamo()
    verify(lead, vowel, trail)

    chunks = [explicit[i:i + CHUNK] for i in range(0, len(explicit), CHUNK)]
    out = io.StringIO()
    w = out.write

    w("! ------------------- Superclass check\n"
      "run\n"
      "module ifNil: [self error: 'module is not defined. Check file ordering.'].\n"
      "%\n\n")
    w("! ------- unicode_names (GENERATED -- see scripts/generate_unicode_names.py)\n"
      "expectvalue /Class\n"
      "doit\n"
      "module subclass: 'unicode_names'\n"
      "  instVarNames: #()\n"
      "  classVars: #( NameToCp CpToName )\n"
      "  classInstVars: #()\n"
      "  poolDictionaries: #()\n"
      "  inDictionary: Python\n"
      "  options: #()\n%\n\n")
    w("expectvalue /Class\ndoit\nunicode_names comment:\n'")
    w("Unicode character names, GENERATED from the UCD.\n\n"
      "DO NOT EDIT: regenerate with scripts/generate_unicode_names.py, which\n"
      "documents why this exists.  In short, ``\\N{NAME}'''' used to resolve\n"
      "against a hand-curated table of 33 names kept in TWO places, and a name\n"
      "outside it was a SyntaxError -- so one unremarkable literal,\n"
      "``\"\\N{EMPTY SET}\"'''', cost a whole 5300-line test module.\n\n"
      "%d names are stored here, plus %d control ALIASES kept apart: a C0/C1\n"
      "control has no name of its own, so without its alias it cannot be\n"
      "reached by name at all.  The other %d that the UCD names are\n"
      "ALGORITHMIC and computed instead: %d Hangul syllables composed from\n"
      "jamo, and %d code points whose name is a fixed prefix plus their own\n"
      "hex.  CPython does exactly this split, for the same reason -- storing\n"
      "them would quadruple the table to say nothing new.\n\n"
      "Unicode version: %s.'\n%%\n\n"
      % (len(explicit), len(CONTROL_ALIASES),
         sum(len(v) for v in algo.values()) + (HANGUL_LAST - HANGUL_BASE + 1),
         HANGUL_LAST - HANGUL_BASE + 1,
         sum(len(v) for v in algo.values()),
         unicodedata.unidata_version))
    w("expectvalue /Class\ndoit\nunicode_names category: 'Grail-Modules'\n%\n\n")
    w("expectvalue /Metaclass3\ndoit\n"
      "unicode_names removeAllMethods: 0.\n"
      "unicode_names class removeAllMethods: 0.\n%\n\n")
    w("set compile_env: 0\n\n")

    # ---- the explicit table, one literal per chunk ----------------------
    for i, chunk in enumerate(chunks, 1):
        body = ';'.join('%s=%X' % (n, cp) for n, cp in chunk)
        w("category: 'Grail-Generated Data'\nclassmethod: unicode_names\n")
        w("___nameChunk%d\n\t\"%d entries, %s .. %s.\"\n\n\t^ %s\n%%\n\n"
          % (i, len(chunk), chunk[0][0], chunk[-1][0], literal(body)))

    # Aliases live APART from the names, because they are lookup-only.
    # unicodedata.name(chr(0)) raises in CPython even though
    # unicodedata.lookup('NULL') answers -- an alias names a code point
    # that HAS no name -- so only the forward map may see these.
    w("category: 'Grail-Generated Data'\nclassmethod: unicode_names\n")
    w("___aliasData\n"
      "\t\"%d control aliases.  LOOKUP-ONLY: they are merged into the\n"
      "\tname-to-code-point map and deliberately NOT into its inverse, because\n"
      "\ta C0/C1 control has no name -- unicodedata.name(chr(0)) raises in\n"
      "\tCPython, while unicodedata.lookup('NULL') answers 0.\"\n\n\t^ %s\n%%\n\n"
      % (len(aliases), literal(';'.join('%s=%X' % (n, cp) for n, cp in aliases))))

    w("category: 'Grail-Generated Data'\nclassmethod: unicode_names\n")
    w("___chunkCount\n\t\"Number of ___nameChunkN methods above.\"\n\n\t^ %d\n%%\n\n"
      % len(chunks))

    # ---- algorithmic families ------------------------------------------
    parts = []
    for prefix in sorted(algo):
        for lo, hi in ranges(algo[prefix]):
            parts.append("\t\t{ '%s'. 16r%X. 16r%X }." % (prefix, lo, hi))
    w("category: 'Grail-Generated Data'\nclassmethod: unicode_names\n")
    w("___algorithmicRanges\n"
      "\t\"Families whose name is PREFIX-<own hex>.  Read out of the UCD by the\n"
      "\tgenerator, so a new range in a later Unicode version arrives by\n"
      "\tregenerating rather than by editing code.\"\n\n\t^ {\n%s\n\t}\n%%\n\n"
      % '\n'.join(parts))

    for nm, tbl in (('Lead', lead), ('Vowel', vowel), ('Trail', trail)):
        w("category: 'Grail-Generated Data'\nclassmethod: unicode_names\n")
        w("___hangul%s\n\t\"Jamo name parts, derived from real syllables.\"\n\n\t^ #( %s )\n%%\n\n"
          % (nm, ' '.join("'%s'" % p for p in tbl)))

    io.open(GS, 'w', encoding='utf-8').write(out.getvalue())
    print('%s: %d explicit names in %d chunks, %d algorithmic ranges'
          % (GS, len(explicit), len(chunks), len(parts)))
    print('Unicode %s; file is %.2f MB'
          % (unicodedata.unidata_version,
             len(out.getvalue().encode('utf-8')) / 1048576))


if __name__ == '__main__':
    sys.exit(main())
