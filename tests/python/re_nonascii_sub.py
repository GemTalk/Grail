# Regression fixture: re.sub()/subn() must preserve non-ASCII characters.
#
# The shim's PyUnicode_AsUTF8 used to hand back a GemStone string's RAW
# bytes -- UTF-16 code units for a wide string -- so PyUnicode_Join's
# strlen() truncated at the first 0x00 high byte and re.sub() silently
# dropped everything from the first non-ASCII character onward:
#
#     re.sub('zzz', 'Q', 'abࠀc')  ==  'a'      # nothing even matched
#
# Once that was encoding properly, PyUnicode_FromString still widened the
# UTF-8 bytes one-for-one (latin-1), turning the same call into mojibake
# ('ab\xe0\xa0\x80c').  Both directions are covered here.
#
# Deliberately NOT covered by the vendored test_re.py, which is all-ASCII
# for sub() -- test_re passed throughout both bugs.

import re

W = 'ࠀ'          # 3 UTF-8 bytes
E = '\U0001F600'      # 4 UTF-8 bytes (astral)
A = 'é'          # 2 UTF-8 bytes

RESULTS = {}

# No match at all: sub() must return the subject unchanged.
RESULTS['no_match_unchanged'] = (re.sub('zzz', 'Q', 'ab' + W + 'c') == 'ab' + W + 'c')

# The non-ASCII character may sit anywhere, including first and last.
RESULTS['nonascii_first'] = (re.sub('zzz', 'Q', W + 'abc') == W + 'abc')
RESULTS['nonascii_last'] = (re.sub('zzz', 'Q', 'abc' + W) == 'abc' + W)

# Every UTF-8 width, including 4-byte astral.
RESULTS['width2'] = (re.sub('x', 'Y', 'a' + A + 'x') == 'a' + A + 'Y')
RESULTS['width3'] = (re.sub('x', 'Y', 'a' + W + 'x') == 'a' + W + 'Y')
RESULTS['width4_astral'] = (re.sub('x', 'Y', 'a' + E + 'x') == 'a' + E + 'Y')

# Non-ASCII as the pattern, and as the replacement.
RESULTS['nonascii_pattern'] = (re.sub(W, '-', 'a' + W + 'b' + W + 'c') == 'a-b-c')
RESULTS['nonascii_repl'] = (re.sub('b', W, 'abc') == 'a' + W + 'c')

# Real substitutions must keep surrounding non-ASCII intact.
RESULTS['keeps_context'] = (re.sub('b', 'X', 'a' + W + 'bc' + W) == 'a' + W + 'Xc' + W)

# subn reports the right count and the right string.
RESULTS['subn'] = (re.subn(W, '-', 'a' + W + 'b' + W + 'c') == ('a-b-c', 2))

# count= and the non-literal (template / callable) replacement paths.
RESULTS['count_limit'] = (re.sub(W, '-', 'a' + W + 'b' + W + 'c', count=1) == 'a-b' + W + 'c')
RESULTS['backref'] = (re.sub(r'(a)(' + W + ')', r'\2\1', 'a' + W) == W + 'a')
RESULTS['callable_repl'] = (re.sub('.', lambda m: m.group(0) * 2, 'a' + W) == 'aa' + W + W)

# Length is in CODE POINTS, not bytes -- a byte-length leak would show here.
RESULTS['result_len_is_codepoints'] = (len(re.sub('zzz', 'Q', 'a' + W + E + 'b')) == 4)

# Matching itself was always correct; assert it still is.
RESULTS['split_unaffected'] = (re.split(W, 'a' + W + 'b') == ['a', 'b'])
RESULTS['findall_unaffected'] = (re.findall('.', 'a' + W + E) == ['a', W, E])

# The concrete downstream breakage this bug caused: _strptime builds its
# regex with re.sub, so any format holding a non-ASCII literal failed with
# "stray %% in format" (bpo-34482 cases in datetimetester).
from datetime import datetime
_parsed = datetime.strptime('2004-12-01' + W + '13:02:47.197',
                            '%Y-%m-%d' + W + '%H:%M:%S.%f')
RESULTS['strptime_nonascii_separator'] = (_parsed == datetime(2004, 12, 1, 13, 2, 47, 197000))
