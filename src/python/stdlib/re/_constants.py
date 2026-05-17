#
# Secret Labs' Regular Expression Engine
#
# various symbols used by the regular expression engine.
# run this script to update the _sre include files!
#
# Copyright (c) 1998-2001 by Secret Labs AB.  All rights reserved.
#
# See the __init__.py file for information on usage and redistribution.
#

"""Internal support module for sre"""

# update when constants are added or removed

MAGIC = 20230612

from _sre import MAXREPEAT, MAXGROUPS  # noqa: F401

# SRE standard exception (access as sre.error)
# should this really be here?

class PatternError(Exception):
    """Exception raised for invalid regular expressions.

    Attributes:

        msg: The unformatted error message
        pattern: The regular expression pattern
        pos: The index in the pattern where compilation failed (may be None)
        lineno: The line corresponding to pos (may be None)
        colno: The column corresponding to pos (may be None)
    """

    __module__ = 're'

    def __init__(self, msg, pattern=None, pos=None):
        self.msg = msg
        self.pattern = pattern
        self.pos = pos
        # GRAIL: lifted `self.lineno = self.colno = None` (chained, branch-only)
        # out of the if/else so Grail's codegen sees a single definition site.
        self.lineno = None
        self.colno = None
        if pattern is not None and pos is not None:
            msg = '%s at position %d' % (msg, pos)
            if isinstance(pattern, str):
                newline = '\n'
            else:
                newline = b'\n'
            self.lineno = pattern.count(newline, 0, pos) + 1
            self.colno = pos - pattern.rfind(newline, 0, pos)
            if newline in pattern:
                msg = '%s (line %d, column %d)' % (msg, self.lineno, self.colno)
        super().__init__(msg)


# Backward compatibility after renaming in 3.13
error = PatternError

# GRAIL: CPython's source uses `_NamedIntConstant(int)` for opcodes (so
# repr() shows the name) and `_makecodes(*names) + globals().update()` to
# inject the names dynamically. Grail's codegen rejects forward references
# to module names that don't exist until module-init runs, and SmallInteger
# can't carry the .name inst var either. So we declare each constant
# explicitly (plain int) and build the OPCODES/ATCODES/CHCODES lists from
# the names afterwards. .name on opcodes is lost (debug repr only).

# opcodes
FAILURE = 0
SUCCESS = 1
ANY = 2
ANY_ALL = 3
ASSERT = 4
ASSERT_NOT = 5
AT = 6
BRANCH = 7
CATEGORY = 8
CHARSET = 9
BIGCHARSET = 10
GROUPREF = 11
GROUPREF_EXISTS = 12
IN = 13
INFO = 14
JUMP = 15
LITERAL = 16
MARK = 17
MAX_UNTIL = 18
MIN_UNTIL = 19
NOT_LITERAL = 20
NEGATE = 21
RANGE = 22
REPEAT = 23
REPEAT_ONE = 24
SUBPATTERN = 25
MIN_REPEAT_ONE = 26
ATOMIC_GROUP = 27
POSSESSIVE_REPEAT = 28
POSSESSIVE_REPEAT_ONE = 29
GROUPREF_IGNORE = 30
IN_IGNORE = 31
LITERAL_IGNORE = 32
NOT_LITERAL_IGNORE = 33
GROUPREF_LOC_IGNORE = 34
IN_LOC_IGNORE = 35
LITERAL_LOC_IGNORE = 36
NOT_LITERAL_LOC_IGNORE = 37
GROUPREF_UNI_IGNORE = 38
IN_UNI_IGNORE = 39
LITERAL_UNI_IGNORE = 40
NOT_LITERAL_UNI_IGNORE = 41
RANGE_UNI_IGNORE = 42
# MIN_REPEAT/MAX_REPEAT appear in the parser tree but not the compiled
# bytecode.  Excluded from OPCODES below but still exposed as names —
# re/_parser.py references them.
MIN_REPEAT = 43
MAX_REPEAT = 44

OPCODES = [
    FAILURE, SUCCESS,
    ANY, ANY_ALL,
    ASSERT, ASSERT_NOT,
    AT,
    BRANCH,
    CATEGORY,
    CHARSET, BIGCHARSET,
    GROUPREF, GROUPREF_EXISTS,
    IN,
    INFO,
    JUMP,
    LITERAL,
    MARK,
    MAX_UNTIL,
    MIN_UNTIL,
    NOT_LITERAL,
    NEGATE,
    RANGE,
    REPEAT,
    REPEAT_ONE,
    SUBPATTERN,
    MIN_REPEAT_ONE,
    ATOMIC_GROUP,
    POSSESSIVE_REPEAT,
    POSSESSIVE_REPEAT_ONE,
    GROUPREF_IGNORE,
    IN_IGNORE,
    LITERAL_IGNORE,
    NOT_LITERAL_IGNORE,
    GROUPREF_LOC_IGNORE,
    IN_LOC_IGNORE,
    LITERAL_LOC_IGNORE,
    NOT_LITERAL_LOC_IGNORE,
    GROUPREF_UNI_IGNORE,
    IN_UNI_IGNORE,
    LITERAL_UNI_IGNORE,
    NOT_LITERAL_UNI_IGNORE,
    RANGE_UNI_IGNORE,
]

# positions
AT_BEGINNING = 0
AT_BEGINNING_LINE = 1
AT_BEGINNING_STRING = 2
AT_BOUNDARY = 3
AT_NON_BOUNDARY = 4
AT_END = 5
AT_END_LINE = 6
AT_END_STRING = 7
AT_LOC_BOUNDARY = 8
AT_LOC_NON_BOUNDARY = 9
AT_UNI_BOUNDARY = 10
AT_UNI_NON_BOUNDARY = 11

ATCODES = [
    AT_BEGINNING, AT_BEGINNING_LINE, AT_BEGINNING_STRING,
    AT_BOUNDARY, AT_NON_BOUNDARY,
    AT_END, AT_END_LINE, AT_END_STRING,
    AT_LOC_BOUNDARY, AT_LOC_NON_BOUNDARY,
    AT_UNI_BOUNDARY, AT_UNI_NON_BOUNDARY,
]

# categories
CATEGORY_DIGIT = 0
CATEGORY_NOT_DIGIT = 1
CATEGORY_SPACE = 2
CATEGORY_NOT_SPACE = 3
CATEGORY_WORD = 4
CATEGORY_NOT_WORD = 5
CATEGORY_LINEBREAK = 6
CATEGORY_NOT_LINEBREAK = 7
CATEGORY_LOC_WORD = 8
CATEGORY_LOC_NOT_WORD = 9
CATEGORY_UNI_DIGIT = 10
CATEGORY_UNI_NOT_DIGIT = 11
CATEGORY_UNI_SPACE = 12
CATEGORY_UNI_NOT_SPACE = 13
CATEGORY_UNI_WORD = 14
CATEGORY_UNI_NOT_WORD = 15
CATEGORY_UNI_LINEBREAK = 16
CATEGORY_UNI_NOT_LINEBREAK = 17

CHCODES = [
    CATEGORY_DIGIT, CATEGORY_NOT_DIGIT,
    CATEGORY_SPACE, CATEGORY_NOT_SPACE,
    CATEGORY_WORD, CATEGORY_NOT_WORD,
    CATEGORY_LINEBREAK, CATEGORY_NOT_LINEBREAK,
    CATEGORY_LOC_WORD, CATEGORY_LOC_NOT_WORD,
    CATEGORY_UNI_DIGIT, CATEGORY_UNI_NOT_DIGIT,
    CATEGORY_UNI_SPACE, CATEGORY_UNI_NOT_SPACE,
    CATEGORY_UNI_WORD, CATEGORY_UNI_NOT_WORD,
    CATEGORY_UNI_LINEBREAK, CATEGORY_UNI_NOT_LINEBREAK,
]


# replacement operations for "ignore case" mode
OP_IGNORE = {
    LITERAL: LITERAL_IGNORE,
    NOT_LITERAL: NOT_LITERAL_IGNORE,
}

OP_LOCALE_IGNORE = {
    LITERAL: LITERAL_LOC_IGNORE,
    NOT_LITERAL: NOT_LITERAL_LOC_IGNORE,
}

OP_UNICODE_IGNORE = {
    LITERAL: LITERAL_UNI_IGNORE,
    NOT_LITERAL: NOT_LITERAL_UNI_IGNORE,
}

AT_MULTILINE = {
    AT_BEGINNING: AT_BEGINNING_LINE,
    AT_END: AT_END_LINE
}

AT_LOCALE = {
    AT_BOUNDARY: AT_LOC_BOUNDARY,
    AT_NON_BOUNDARY: AT_LOC_NON_BOUNDARY
}

AT_UNICODE = {
    AT_BOUNDARY: AT_UNI_BOUNDARY,
    AT_NON_BOUNDARY: AT_UNI_NON_BOUNDARY
}

CH_LOCALE = {
    CATEGORY_DIGIT: CATEGORY_DIGIT,
    CATEGORY_NOT_DIGIT: CATEGORY_NOT_DIGIT,
    CATEGORY_SPACE: CATEGORY_SPACE,
    CATEGORY_NOT_SPACE: CATEGORY_NOT_SPACE,
    CATEGORY_WORD: CATEGORY_LOC_WORD,
    CATEGORY_NOT_WORD: CATEGORY_LOC_NOT_WORD,
    CATEGORY_LINEBREAK: CATEGORY_LINEBREAK,
    CATEGORY_NOT_LINEBREAK: CATEGORY_NOT_LINEBREAK
}

CH_UNICODE = {
    CATEGORY_DIGIT: CATEGORY_UNI_DIGIT,
    CATEGORY_NOT_DIGIT: CATEGORY_UNI_NOT_DIGIT,
    CATEGORY_SPACE: CATEGORY_UNI_SPACE,
    CATEGORY_NOT_SPACE: CATEGORY_UNI_NOT_SPACE,
    CATEGORY_WORD: CATEGORY_UNI_WORD,
    CATEGORY_NOT_WORD: CATEGORY_UNI_NOT_WORD,
    CATEGORY_LINEBREAK: CATEGORY_UNI_LINEBREAK,
    CATEGORY_NOT_LINEBREAK: CATEGORY_UNI_NOT_LINEBREAK
}

CH_NEGATE = dict(zip(CHCODES[::2] + CHCODES[1::2], CHCODES[1::2] + CHCODES[::2]))

# flags
SRE_FLAG_IGNORECASE = 2 # case insensitive
SRE_FLAG_LOCALE = 4 # honour system locale
SRE_FLAG_MULTILINE = 8 # treat target as multiline string
SRE_FLAG_DOTALL = 16 # treat target as a single string
SRE_FLAG_UNICODE = 32 # use unicode "locale"
SRE_FLAG_VERBOSE = 64 # ignore whitespace and comments
SRE_FLAG_DEBUG = 128 # debugging
SRE_FLAG_ASCII = 256 # use ascii "locale"

# flags for INFO primitive
SRE_INFO_PREFIX = 1 # has prefix
SRE_INFO_LITERAL = 2 # entire pattern is literal (given by prefix)
SRE_INFO_CHARSET = 4 # pattern starts with character from given set
