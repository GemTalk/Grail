# PEP 634 structural pattern matching.  Grail's parser had no ``match''
# statement at all -- core syntax since 3.10 -- so every one of these was a
# SyntaxError before, not a wrong answer.
#
# Two rules here are silently-wrong hazards rather than errors if an
# implementation gets them subtly wrong, and both have their own checks below:
#
#   1. A BARE name captures; a DOTTED name compares.  ``case RED:'' always
#      matches and rebinds RED.  Only ``case Colour.RED:'' tests the constant.
#   2. A sequence pattern must NOT match str/bytes/bytearray, or
#      ``case [a, b]:'' quietly destructures the two-character string 'ab' into
#      two bindings.  Mappings and sets are excluded too -- dict answers both
#      __len__ and __getitem__, so a duck-typed gate matched a two-entry dict
#      and then indexed it with 0.
#
# test_global's test_match / test_match_as / test_match_seq / test_match_map /
# test_match_attr are the CPython tests this feeds.

r = {}


class Colour:
    RED = 1
    BLUE = 2


class Point:
    __match_args__ = ('x', 'y')

    def __init__(self, x, y):
        self.x = x
        self.y = y


class Bare:
    """No __match_args__, so it accepts NO positional sub-patterns."""


def kinds(v):
    match v:
        case 0:
            return 'literal-zero'
        case 1 | 2 | 3:
            return 'or'
        case str() as s if len(s) > 2:
            return 'guarded-str:' + s
        case [x, y]:
            return 'pair:%r,%r' % (x, y)
        case [a, *rest]:
            return 'star:%r,%r' % (a, rest)
        case {'k': kv, **others}:
            return 'map:%r,%r' % (kv, others)
        case None:
            return 'singleton-none'
        case _:
            return 'wildcard'


r['kinds'] = [kinds(v) for v in
              (0, 2, 'abcd', 'ab', [7, 8], [1, 2, 3],
               {'k': 9, 'z': 1}, None, 3.5)]


# --- rule 1: bare name captures, dotted name compares -----------------------

def dotted(v):
    match v:
        case Colour.RED:
            return 'red'
        case Colour.BLUE:
            return 'blue'
        case _:
            return 'other'


r['dotted_compares'] = [dotted(v) for v in (1, 2, 3)]


def bare_captures(v):
    match v:
        case RED:          # NOT a comparison -- this binds and always matches
            return RED
    return 'unreachable'


r['bare_captures'] = [bare_captures(v) for v in (1, 99)]


# --- rule 2: a sequence pattern is not a string pattern ---------------------

def seqlike(v):
    match v:
        case [a, b]:
            return 'seq:%r,%r' % (a, b)
        case _:
            return 'not-a-seq'


r['str_is_not_a_sequence'] = seqlike('ab')
r['bytes_is_not_a_sequence'] = seqlike(b'ab')
r['dict_is_not_a_sequence'] = seqlike({'a': 1, 'b': 2})
r['set_is_not_a_sequence'] = seqlike({1, 2})
r['list_is_a_sequence'] = seqlike([1, 2])
r['tuple_is_a_sequence'] = seqlike((1, 2))


# --- singletons compare by identity, not == ---------------------------------

def singleton(v):
    match v:
        case True:
            return 'True'
        case False:
            return 'False'
        case None:
            return 'None'
        case _:
            return 'other'


# 1 == True and 0 == False, so an ``=='' implementation answers wrongly here.
r['singleton_identity'] = [singleton(v) for v in (True, False, None, 1, 0)]


# --- class patterns ---------------------------------------------------------

def classpat(v):
    match v:
        case Point(0, 0):
            return 'origin'
        case Point(x=0, y=yy):
            return 'on-y:%r' % yy
        case Point(px, py):
            return 'pt:%r,%r' % (px, py)
        case _:
            return 'other'


r['class_patterns'] = [classpat(v) for v in
                       (Point(0, 0), Point(0, 5), Point(3, 4), 7)]


def no_match_args(v):
    match v:
        case Bare(_):
            return 'matched'
        case _:
            return 'other'


# A positional sub-pattern against a class with no __match_args__ is a
# TypeError at match time -- a bug in the PATTERN, not a subject that failed
# to match, so it must say so rather than quietly answering 'other'.
try:
    no_match_args(Bare())
    r['no_match_args'] = 'no error'
except TypeError:
    r['no_match_args'] = 'TypeError'


# --- nesting, guards, and evaluation order ----------------------------------

def nested(v):
    match v:
        case [[1, a], {'k': b}]:
            return 'nested:%r,%r' % (a, b)
        case (p, q, s):
            return 'triple:%r' % ((p, q, s),)
        case []:
            return 'empty'
        case _:
            return 'other'


r['nested'] = [nested(v) for v in
               ([[1, 9], {'k': 8}], (1, 2, 3), [], 'x')]


def guard_sees_bindings(v):
    match v:
        case [g, h] if g < h:
            return 'ascending'
        case [g, h]:
            return 'not-ascending'
        case _:
            return 'other'


# The guard runs AFTER the pattern binds, and can read what it bound.
r['guard_sees_bindings'] = [guard_sees_bindings(v) for v in
                            ([1, 2], [2, 1])]


_calls = []


def counted():
    _calls.append(1)
    return 99


def subject_evaluated_once(v):
    match v:
        case 0:
            return 'zero'
        case 1:
            return 'one'
        case _:
            return 'other'


subject_evaluated_once(counted())
# The subject is evaluated ONCE however many cases are tried.  Re-emitting the
# expression per case would make ``match next(it):'' consume the iterator on
# every failed case.
r['subject_evaluated_once'] = len(_calls)


# --- match and case are SOFT keywords ---------------------------------------

match = 5
r['ident_assign'] = match

match = {}
match['a'] = 1
r['ident_subscript'] = match

match, zed = 7, 8
r['ident_tuple_target'] = match

case = 11
r['ident_case'] = case


def match_fn(x):
    return x * 2


r['ident_call'] = match_fn(3)


EXPECTED = {
    'kinds': "['literal-zero', 'or', 'guarded-str:abcd', 'wildcard', "
             "'pair:7,8', 'star:1,[2, 3]', \"map:9,{'z': 1}\", "
             "'singleton-none', 'wildcard']",
    'dotted_compares': "['red', 'blue', 'other']",
    'bare_captures': '[1, 99]',
    'str_is_not_a_sequence': "'not-a-seq'",
    'bytes_is_not_a_sequence': "'not-a-seq'",
    'dict_is_not_a_sequence': "'not-a-seq'",
    'set_is_not_a_sequence': "'not-a-seq'",
    'list_is_a_sequence': "'seq:1,2'",
    'tuple_is_a_sequence': "'seq:1,2'",
    'singleton_identity': "['True', 'False', 'None', 'other', 'other']",
    'class_patterns': "['origin', 'on-y:5', 'pt:3,4', 'other']",
    'no_match_args': "'TypeError'",
    'nested': "['nested:9,8', 'triple:(1, 2, 3)', 'empty', 'other']",
    'guard_sees_bindings': "['ascending', 'not-ascending']",
    'subject_evaluated_once': '1',
    'ident_assign': '5',
    'ident_subscript': "{'a': 1}",
    'ident_tuple_target': '7',
    'ident_case': '11',
    'ident_call': '6',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
