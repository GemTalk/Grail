#!/usr/bin/env python3
"""Regenerate CharacterCollection's Unicode case data (src/Grail-Kernel/
CharacterCollection.extension.st): the properties and full mappings behind
str.lower, upper, casefold, swapcase, capitalize and title, and behind
islower, isupper and istitle.

WHY THIS EXISTS.  Grail cased strings with the kernel's Character >>
asLowercase and asUppercase -- one character to one, from an older Unicode --
plus a hand-kept table of the multi-character SpecialCasing expansions, and
judged islower/isupper by isLetter and isLowercase.  CPython does more, from
its own Unicode database (Objects/unicodeobject.c, Objects/unicodectype.c):

* casefold folds fully, which is not lowercasing: 'ß' -> 'ss', 'ﬁ' -> 'fi',
  'µ' -> 'μ', and the Cherokee small letters fold UP;
* title and capitalize use the TITLECASE mapping, which is not uppercase for
  the digraphs and ligatures: 'ǆ' -> 'ǅ', 'ﬁ' -> 'Fi';
* lowercasing a capital sigma answers final 'ς' where it ends a word, by the
  Final_Sigma context, which needs the Cased and Case_Ignorable properties;
* islower, isupper and istitle read the Lowercase, Uppercase and Titlecase
  properties, and Cased: 'ⅷ' (U+2177) is lowercase and no letter, and a
  letter with no case (most of them) is neither.

WHAT IS GENERATED, all read from CPython's OWN str methods on every code
point, so they are its definitions by construction:

* inclusive (first last) range tables for Lowercase (chr(c).islower()),
  Uppercase (chr(c).isupper()), Titlecase (general category Lt), Cased (the
  three together) and Case_Ignorable (from the Final_Sigma behaviour, below);
* full lower, upper, title and casefold mappings: a flat array of code point,
  count, and that many code points, for every code point a mapping changes.

Case_Ignorable is not exposed to Python, so it is read off the one rule that
uses it (handle_capital_sigma): a capital sigma ends a word after a cased
letter unless a cased letter follows past any case-ignorable ones.  For c not
cased, c is case-ignorable when 'AΣ' + c + 'A' keeps the sigma medial; for c
cased, when c + 'Σ' does not make it final.

VERIFIED BEFORE WRITING.  The range tables are expanded and compared with
CPython on every code point, the mappings are applied and compared on every
code point, and the six string methods are run over CPython's own test
strings and a sample of mixed ones with the tables, the way Grail runs them,
and compared with CPython; any difference stops the script with nothing
written.

Run with the CPython version Grail vendors (3.14.x):
    python3.14 scripts/generate_unicode_case_data.py
"""
import os
import random
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from tonel_methods import Method, set_methods  # noqa: E402

OUT = os.path.join(ROOT, 'src', 'Grail-Kernel', 'CharacterCollection.extension.st')
GRAIL_UNICODEDATA = os.path.join(ROOT, 'src', 'python', 'stdlib', 'unicodedata.py')
CAPITAL_SIGMA, SMALL_SIGMA, FINAL_SIGMA = 0x3A3, 0x3C3, 0x3C2
ALL = range(0x110000)


def grail_unidata_version():
    with open(GRAIL_UNICODEDATA) as f:
        m = re.search(r"^unidata_version = '([^']+)'", f.read(), re.M)
    if not m:
        sys.exit('cannot find unidata_version in %s' % GRAIL_UNICODEDATA)
    return m.group(1)


def is_lowercase(cp):
    return chr(cp).islower()


def is_uppercase(cp):
    return chr(cp).isupper()


def is_titlecase(cp):
    return unicodedata.category(chr(cp)) == 'Lt'


def is_cased(cp):
    return is_lowercase(cp) or is_uppercase(cp) or is_titlecase(cp)


def is_case_ignorable(cp):
    if is_cased(cp):
        return (chr(cp) + 'Σ').lower()[-1] == chr(SMALL_SIGMA)
    return ('AΣ' + chr(cp) + 'A').lower()[1] == chr(SMALL_SIGMA)


PROPERTIES = (
    ('___pyLowercaseRanges___', 'Lowercase', is_lowercase),
    ('___pyUppercaseRanges___', 'Uppercase', is_uppercase),
    ('___pyTitlecaseRanges___', 'Titlecase (general category Lt)', is_titlecase),
    ('___pyCasedRanges___', 'Cased', is_cased),
    ('___pyCaseIgnorableRanges___', 'Case_Ignorable', is_case_ignorable),
)

MAPPINGS = (
    ('___pyLowerMappings___', 'full lowercase', str.lower),
    ('___pyUpperMappings___', 'full uppercase', str.upper),
    ('___pyTitleMappings___', 'full titlecase', str.title),
    ('___pyCasefoldMappings___', 'full case folding', str.casefold),
)


def ranges_for(predicate):
    out = []
    for cp in ALL:
        if predicate(cp):
            if out and out[-1][1] == cp - 1:
                out[-1][1] = cp
            else:
                out.append([cp, cp])
    return out


def contains(ranges, cp):
    lo, hi = 0, len(ranges) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        first, last = ranges[mid]
        if cp < first:
            hi = mid - 1
        elif cp > last:
            lo = mid + 1
        else:
            return True
    return False


def mapping_for(method):
    table = {}
    for cp in ALL:
        mapped = method(chr(cp))
        if mapped != chr(cp):
            table[cp] = [ord(c) for c in mapped]
    return table


class Tables:
    """The generated data, applied the way Grail applies it."""

    def __init__(self, ranges, mappings):
        self.ranges = ranges
        self.mappings = mappings

    def has(self, selector, cp):
        return contains(self.ranges[selector], cp)

    def mapped(self, selector, cp):
        return self.mappings[selector].get(cp, [cp])

    def lower_at(self, text, i):
        cp = ord(text[i])
        if cp == CAPITAL_SIGMA:
            return [self.sigma_at(text, i)]
        return self.mapped('___pyLowerMappings___', cp)

    def sigma_at(self, text, i):
        j = i - 1
        while j >= 0 and self.has('___pyCaseIgnorableRanges___', ord(text[j])):
            j -= 1
        final = j >= 0 and self.has('___pyCasedRanges___', ord(text[j]))
        if final:
            j = i + 1
            while j < len(text) and self.has('___pyCaseIgnorableRanges___', ord(text[j])):
                j += 1
            final = j == len(text) or not self.has('___pyCasedRanges___', ord(text[j]))
        return FINAL_SIGMA if final else SMALL_SIGMA

    def lower(self, text):
        return self.join(self.lower_at(text, i) for i in range(len(text)))

    def upper(self, text):
        return self.join(self.mapped('___pyUpperMappings___', ord(c)) for c in text)

    def casefold(self, text):
        return self.join(self.mapped('___pyCasefoldMappings___', ord(c)) for c in text)

    def swapcase(self, text):
        out = []
        for i, c in enumerate(text):
            if self.has('___pyUppercaseRanges___', ord(c)):
                out.append(self.lower_at(text, i))
            elif self.has('___pyLowercaseRanges___', ord(c)):
                out.append(self.mapped('___pyUpperMappings___', ord(c)))
            else:
                out.append([ord(c)])
        return self.join(out)

    def capitalize(self, text):
        if not text:
            return text
        head = self.mapped('___pyTitleMappings___', ord(text[0]))
        return self.join([head] + [self.lower_at(text, i) for i in range(1, len(text))])

    def title(self, text):
        out, previous_is_cased = [], False
        for i, c in enumerate(text):
            out.append(self.lower_at(text, i) if previous_is_cased
                       else self.mapped('___pyTitleMappings___', ord(c)))
            previous_is_cased = self.has('___pyCasedRanges___', ord(c))
        return self.join(out)

    @staticmethod
    def join(parts):
        return ''.join(chr(cp) for part in parts for cp in part)


SAMPLE_STRINGS = [
    'hello', 'hELlo', 'ß', 'ﬁ', 'ﬁnnish', 'Σ', 'AͅΣ', 'AͅΣa',
    'AΣͅ', 'Σͅ ', 'ͅΣ', 'hİ', 'ῒİ',
    '\U00010427\U0001044F', 'X\U00010427x\U0001044F', 'ǆemal ǅ ǄEMAL', 'ΣΑΣ ΣΑΣ.',
    "they're bill's friends from the UK", 'ΌΣΟΣ', 'aΣ́b', 'ﬃ ﬄ ﬅ', 'ⅷⅧ',
]


def verify(tables):
    for selector, _, predicate in PROPERTIES:
        for cp in ALL:
            if tables.has(selector, cp) != predicate(cp):
                sys.exit('%s disagrees at U+%04X; nothing written' % (selector, cp))
    for selector, _, method in MAPPINGS:
        for cp in ALL:
            if cp != CAPITAL_SIGMA and tables.join([tables.mapped(selector, cp)]) != method(chr(cp)):
                sys.exit('%s disagrees at U+%04X; nothing written' % (selector, cp))
    rng = random.Random(3148)
    cased = [cp for cp in ALL if is_cased(cp) or is_case_ignorable(cp)]
    samples = list(SAMPLE_STRINGS)
    for _ in range(20000):
        samples.append(''.join(chr(rng.choice(cased)) if rng.random() < 0.7 else rng.choice(' Σ.ab')
                               for _ in range(rng.randint(1, 8))))
    for text in samples:
        for name in ('lower', 'upper', 'casefold', 'swapcase', 'capitalize', 'title'):
            if getattr(tables, name)(text) != getattr(text, name)():
                sys.exit('%s(%r) disagrees; nothing written' % (name, text))


def range_literal(ranges):
    return literal_lines('%d %d' % (a, b) for a, b in ranges)


def mapping_literal(table):
    return literal_lines(' '.join(str(n) for n in [cp, len(table[cp])] + table[cp])
                         for cp in sorted(table))


def literal_lines(words):
    lines, line = [], '\t^ #('
    for w in words:
        if len(line) + 1 + len(w) > 76:
            lines.append(line)
            line = '\t\t' + w
        else:
            line = line + ' ' + w
    lines.append(line + ' )')
    return '\n'.join(lines)


def main():
    version = grail_unidata_version()
    if unicodedata.unidata_version != version:
        sys.exit('CPython has Unicode %s but Grail\'s unicodedata reports %s; '
                 'run with the CPython Grail vendors'
                 % (unicodedata.unidata_version, version))
    ranges = {selector: ranges_for(predicate) for selector, _, predicate in PROPERTIES}
    mappings = {selector: mapping_for(method) for selector, _, method in MAPPINGS}
    verify(Tables(ranges, mappings))

    # GENERATED from CPython's Unicode database -- do not edit the tables; rerun the script.
    methods = []
    for selector, meaning, _ in PROPERTIES:
        table = ranges[selector]
        count = sum(b - a + 1 for a, b in table)
        methods.append(Method(meta=True, category='Grail-Unicode Data', source='\n'.join([
            selector,
            '\t"%s, Unicode %s -- %d code points in %d inclusive (first last)'
            % (meaning, version, count, len(table)),
            '\tranges, sorted.  Generated by scripts/generate_unicode_case_data.py."',
            '',
            range_literal(table),
        ]) + '\n'))
    for selector, meaning, _ in MAPPINGS:
        table = mappings[selector]
        methods.append(Method(meta=True, category='Grail-Unicode Data', source='\n'.join([
            selector,
            '\t"The %s mapping, Unicode %s, of the %d code points it changes:'
            % (meaning, version, len(table)),
            '\teach is its code point, a count, and that many code points.  Generated',
            '\tby scripts/generate_unicode_case_data.py."',
            '',
            mapping_literal(table),
        ]) + '\n'))
    set_methods(OUT, 'CharacterCollection', methods)
    for selector, _, _ in PROPERTIES:
        table = ranges[selector]
        print('%-30s %6d code points, %4d ranges'
              % (selector, sum(b - a + 1 for a, b in table), len(table)))
    for selector, _, _ in MAPPINGS:
        print('%-30s %6d code points' % (selector, len(mappings[selector])))
    print('wrote', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
