#!/usr/bin/env python3
"""Generate PythonTokenizer's identifier tables, in src/Grail-PythonAst/PythonTokenizer.class.st.

Python identifiers are XID_Start followed by XID_Continue characters (PEP
3131).  GemStone's own Unicode tables are older than CPython's -- measured on
2026-10-12, 26,879 code points have a different general category, almost all
characters assigned since, which GemStone reports as unassigned -- so a rule
built on Character>>unicodeCategory would refuse ~24,000 identifiers CPython
accepts.  The tables are therefore taken from the CPython that runs this
script, as ranges of code points, and the tokenizer and str.isidentifier
binary-search them.

Run it with the CPython Grail targets, and commit the output:

    python3.14 scripts/gen_identifier_tables.py

The answer is CPython's own, ``c.isidentifier()'' for a start character and
``('a' + c).isidentifier()'' for a continuation, so the tables agree with
CPython by construction -- including its exceptions to the general-category
rule (Other_ID_Start, Other_ID_Continue, and the NFKC closure that makes
XID differ from ID).

A third table lists the identifier characters that can make a name change
under NFKC, which CPython applies to every non-ASCII identifier (PEP 3131,
#1502).  A name with none of them is already in NFKC form, so the tokenizer
calls unicodedata.normalize only for a name that has one.  A character is
listed when it is not NFKC on its own (U+00B5, U+1D518), when it has a
nonzero combining class (canonical reordering can move it), or when it is
the second character of a canonical pair (it can compose with the one
before it: U+0301 after ``e'', a Hangul vowel or final jamo).  That is the
Unicode quick-check NFKC_QC=No or Maybe, plus the combining-class test the
quick-check algorithm makes.
"""

import os
import sys
import unicodedata

if sys.version_info[:2] != (3, 14):
    sys.exit('gen_identifier_tables: run this with CPython 3.14, not %s'
             % sys.version.split()[0])

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tonel_methods import Method, set_methods  # noqa: E402

OUT = os.path.join(HERE, '..', 'src', 'Grail-PythonAst', 'PythonTokenizer.class.st')


def ranges(pred):
    out, start = [], None
    for cp in range(0x110001):
        ok = (cp < 0x110000 and not 0xD800 <= cp <= 0xDFFF
              and pred(chr(cp)))
        if ok and start is None:
            start = cp
        if not ok and start is not None:
            out.append((start, cp - 1))
            start = None
    return out


def literal(pairs):
    flat = [str(n) for pair in pairs for n in pair]
    lines, line = [], '\t\t'
    for item in flat:
        if len(line) + len(item) + 1 > 78:
            lines.append(line.rstrip())
            line = '\t\t'
        line += item + ' '
    lines.append(line.rstrip())
    return '#(\n' + '\n'.join(lines) + ')'


def method(selector, comment, pairs):
    """A class-side method of PythonTokenizer answering the flattened first/last pairs.
    The tables come from the CPython that runs this script (see the docstring) -- do not edit
    them by hand: re-run the script."""
    return Method(meta=True, category='Grail-Identifiers',
                  source=('%s\n'
                          '\t"%s"\n\n'
                          '\t^ %s\n') % (selector, comment, literal(pairs)))


def composes_second():
    """Every code point that is the second of a canonical pair, plus the
    Hangul vowel and final jamo (composed algorithmically, not by table)."""
    seconds = set(range(0x1161, 0x1176)) | set(range(0x11A8, 0x11C3))
    for cp in range(0x110000):
        d = unicodedata.decomposition(chr(cp))
        if d and not d.startswith('<') and len(d.split()) == 2:
            seconds.add(int(d.split()[1], 16))
    return seconds


SECONDS = composes_second()


def nfkc_unstable(c):
    return (('a' + c).isidentifier()
            and (unicodedata.normalize('NFKC', c) != c
                 or unicodedata.combining(c) != 0
                 or ord(c) in SECONDS))


start = ranges(lambda c: c.isidentifier() or c == '_')
cont = ranges(lambda c: ('a' + c).isidentifier())
unstable = ranges(nfkc_unstable)

set_methods(OUT, 'PythonTokenizer', [
    method('___xidStartRanges___',
           'XID_Start plus underscore: %d ranges.' % len(start), start),
    method('___xidContinueRanges___',
           'XID_Continue: %d ranges.' % len(cont), cont),
    method('___nfkcUnstableRanges___',
           'Identifier characters NFKC can change: %d ranges.' % len(unstable), unstable)])
print('wrote %s: %d start ranges, %d continue ranges, %d NFKC-unstable ranges'
      % (os.path.relpath(OUT), len(start), len(cont), len(unstable)))
