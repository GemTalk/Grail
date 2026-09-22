# Two rules that each existed twice, and only one copy of each was maintained.
#
# --- repr of a string holding a lone surrogate --------------------------------
#
# Grail switches a string to a different CLASS (PyStrSurrogate) the moment it
# holds a lone surrogate, and that class had its own repr, written separately.
# It emitted every non-surrogate code point VERBATIM, so
#
#     repr("'\0\"\n\r\t abcd\x85\xe9\U00012fff\ud800\U0001d121xxx.")
#
# came back with a real NUL, a real newline and a real tab in it -- while the
# same string WITHOUT the surrogate escaped all three, because that one took
# CharacterCollection's repr.  It also always used a single quote and escaped
# it, where CPython switches to double quotes when that avoids the escape.
#
# The per-code-point rule is now one method both call.
#
# --- vars(m) and dir(m) must agree --------------------------------------------
#
# CPython's vars(obj) IS obj.__dict__, and dir(m) is derived from it, so the
# two agree by construction.  Grail computed them from different filters over
# the module class's methods: dir() EXCLUDED two artifact categories, while the
# globals() name list REQUIRED the category Python-defined modules compile
# into.  Modules written in Smalltalk -- sys among them -- have their functions
# in hand-written categories, so 32 of sys's 82 names were reported by dir() and
# by getattr and NOT by vars() / sys.__dict__ / globals().
#
# Worse than missing: the live module view answers ``in'' from the attribute
# chain rather than from that list, so ``'exit' in vars(sys)'' was True while
# ``'exit' in set(vars(sys))'' was False -- a membership test and an
# enumeration of the same mapping disagreeing.
#
# And vars(obj) ignored a type that supplies its own __dict__, so a class whose
# __dict__ is a property answered {} from vars() while obj.__dict__ answered
# the property's value.
#
# test_builtin's test_ascii and test_vars.

import sys

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- repr / ascii of strings with surrogates ---------------------------------
#
# Recorded as repr() STRINGS: the values themselves contain the control
# characters this is about, and a table of them would be unreadable and
# fragile.

_COMBINED = "'\0\"\n\r\t abcd\x85\xe9\U00012fff\ud800\U0001d121xxx."

r['combined_repr'] = repr(_COMBINED)
r['combined_ascii'] = ascii(_COMBINED)
# A surrogate alongside EACH escape class, one at a time, so a partial fix is
# visible rather than averaged away.
for _s, _label in ((
        '\ud800\0', 'nul'), ('\ud800\n', 'newline'), ('\ud800\r', 'cr'),
        ('\ud800\t', 'tab'), ('\ud800\\', 'backslash'), ('\ud800\x85', 'x85'),
        ('\ud800῿', 'u1fff'), ('\ud800\U00012fff', 'astral'),
        ('\ud800é', 'printable_nonascii')):
    r['surrogate_with_' + _label] = repr(_s)

# The DELIMITER rule: single quotes unless the string holds a single quote and
# no double quote.  The surrogate repr always used a single quote and escaped
# it.
r['surrogate_quote_single'] = repr("\ud800'")
r['surrogate_quote_double'] = repr('\ud800"')
r['surrogate_quote_both'] = repr('\ud800\'"')

# ascii(s) == repr(s) for every string with no printable non-ASCII -- the
# property test_ascii checks one string at a time.
r['ascii_equals_repr'] = sorted(
    label for _s, label in (("'", 'squote'), ('"', 'dquote'), ('"\'', 'both'),
                            ('\0', 'nul'), ('\r\n\t .', 'ws'), ('\x85', 'x85'),
                            ('῿', 'u1fff'), ('\U00012fff', 'astral'),
                            ('\ud800', 'lone_high'), ('\udfff', 'lone_low'))
    if ascii(_s) == repr(_s))

# THE CONTROL: ordinary strings must be untouched by sharing the rule.
r['plain_reprs'] = [repr('hello'), repr("it's"), repr('a\nb'), repr('q"w'),
                    repr('tab\there'), repr('é'), repr('\x85'), repr('𝄡'),
                    repr(''), repr('\\')]
r['nested_reprs'] = [repr(['a\nb', "c'd"]), repr({'k\ty': 1}), repr(('\x00',))]


# --- vars / dir agreement ------------------------------------------------------

r['vars_matches_dir_for_sys'] = set(vars(sys)) == set(dir(sys))
# The membership/enumeration disagreement, asserted directly: a name that ``in''
# finds must also be enumerated.
r['membership_agrees_with_enumeration'] = sorted(
    n for n in ('exit', 'exc_info', 'modules', 'path', 'version')
    if (n in vars(sys)) != (n in set(vars(sys))))
r['sys_functions_enumerated'] = sorted(
    n for n in ('exit', 'exc_info', '_getframe', 'getdefaultencoding')
    if n in set(vars(sys)))

r['vars_too_many_args'] = outcome(lambda: vars(42, 42))
r['vars_non_object'] = outcome(lambda: vars(42))


class OwnDict:
    def getDict(self):
        return {'a': 2}
    __dict__ = property(fget=getDict)


class PlainAttrs:
    def __init__(self):
        self.a = 2


r['vars_honours_own_dict'] = vars(OwnDict())
r['vars_plain_instance'] = vars(PlainAttrs())
r['vars_is_dict_attribute'] = vars(OwnDict()) == OwnDict().__dict__


def _f0():
    return vars()


def _f2():
    a = 1
    b = 2
    return vars()


r['vars_empty_frame'] = _f0()
r['vars_frame_locals'] = _f2()

EXPECTED = {
    'ascii_equals_repr': ['astral', 'both', 'dquote', 'lone_high', 'lone_low', 'nul', 'squote', 'u1fff', 'ws', 'x85'],
    'combined_ascii': '\'\\\'\\x00"\\n\\r\\t abcd\\x85\\xe9\\U00012fff\\ud800\\U0001d121xxx.\'',
    'combined_repr': '\'\\\'\\x00"\\n\\r\\t abcd\\x85é\\U00012fff\\ud800𝄡xxx.\'',
    'membership_agrees_with_enumeration': [],
    'nested_reprs': ['[\'a\\nb\', "c\'d"]', "{'k\\ty': 1}", "('\\x00',)"],
    'plain_reprs': ["'hello'", '"it\'s"', "'a\\nb'", '\'q"w\'', "'tab\\there'", "'é'", "'\\x85'", "'𝄡'", "''", "'\\\\'"],
    'surrogate_quote_both': '\'\\ud800\\\'"\'',
    'surrogate_quote_double': '\'\\ud800"\'',
    'surrogate_quote_single': '"\\ud800\'"',
    'surrogate_with_astral': "'\\ud800\\U00012fff'",
    'surrogate_with_backslash': "'\\ud800\\\\'",
    'surrogate_with_cr': "'\\ud800\\r'",
    'surrogate_with_newline': "'\\ud800\\n'",
    'surrogate_with_nul': "'\\ud800\\x00'",
    'surrogate_with_printable_nonascii': "'\\ud800é'",
    'surrogate_with_tab': "'\\ud800\\t'",
    'surrogate_with_u1fff': "'\\ud800\\u1fff'",
    'surrogate_with_x85': "'\\ud800\\x85'",
    'sys_functions_enumerated': ['_getframe', 'exc_info', 'exit', 'getdefaultencoding'],
    'vars_empty_frame': {},
    'vars_frame_locals': {'a': 1, 'b': 2},
    'vars_honours_own_dict': {'a': 2},
    'vars_is_dict_attribute': True,
    'vars_matches_dir_for_sys': True,
    'vars_non_object': 'TypeError: vars() argument must have __dict__ attribute',
    'vars_plain_instance': {'a': 2},
    'vars_too_many_args': 'TypeError: vars expected at most 1 argument, got 2',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-36s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
