"""Lone-surrogate strings are first-class in the ``str`` protocol.

CPython's ``str`` is a sequence of CODE POINTS, which includes the surrogate
block D800..DFFF; GemStone's ``Character`` is a Unicode SCALAR VALUE, which
excludes it.  Grail therefore represents such a string as ``PyStrSurrogate``
rather than as a ``CharacterCollection`` -- see that class's comment for why a
class rather than a rejection.

To Python it IS a str (``type(s).__name__ == 'str'``, ``isinstance(s, str)``),
but ``str.gs`` used to gate every operation on ``isKindOf:
CharacterCollection``, which such a string fails.  That made it second-class
across the WHOLE protocol, not in one operation: ``s in 'abc'`` raised
TypeError where CPython answers False, ``'abc' < s`` raised where CPython
answers True, and ``'abc'.find(s)`` raised an UNCATCHABLE Smalltalk
ArgumentTypeError that no Python ``except`` could see.

Every check below is measured against CPython first -- this file is
self-running so ``scripts/check_python_fixtures.sh`` keeps it that way.  The
assertions are all on ``repr`` or on booleans, never on printing the character
itself: writing a lone surrogate to a UTF-8 stream raises in CPython too.

KNOWN GAPS, deliberately not asserted here because Grail does not yet do them
and asserting the CPython answer would just fail: ``'%s' % s`` (the printf
engine works in CharacterCollections), and the case/whitespace methods on a
surrogate receiver (``s.upper()``, ``s.strip()``).  Both raise a catchable
NotImplementedError in Grail rather than answering wrongly.
"""

S = '\ud800'            # a lone high surrogate
T = 'a\udc80b'          # PEP 383 surrogateescape smuggling one byte


# --- identity -------------------------------------------------------------

def is_a_str():
    return isinstance(S, str)


def type_name_is_str():
    return type(S).__name__ == 'str'


def length_is_one():
    return len(S) == 1


def repr_is_escaped():
    return repr(S) == "'\\ud800'"


# --- containment (the operation the whole protocol was blocked on) --------

def surrogate_not_in_plain():
    return (S in 'abc') is False


def plain_not_in_surrogate():
    return ('abc' in S) is False


def plain_in_surrogate_bearing():
    return ('a' in T) is True


def empty_in_surrogate():
    return ('' in T) is True


# --- equality -------------------------------------------------------------

def eq_plain_is_false():
    return (S == 'abc') is False


def reflected_eq_is_false():
    return ('abc' == S) is False


def ne_plain_is_true():
    return ('abc' != S) is True


def eq_itself():
    return (S == '\ud800') is True


# --- ordering (was: no route at all -- str punted to a dunder that was
# --- not there, so the reflected send raised instead of answering) --------

def plain_sorts_before_surrogate():
    return ('abc' < S) is True


def surrogate_sorts_after_plain():
    return (S > 'abc') is True


def surrogate_not_less_than_plain():
    return (S < 'abc') is False


def le_and_ge_agree():
    return ('abc' <= S) is True and ('abc' >= S) is False


def sorted_puts_surrogate_last():
    return [repr(x) for x in sorted([S, 'abc'])] == ["'abc'", "'\\ud800'"]


# --- concatenation --------------------------------------------------------

def plain_plus_surrogate():
    return repr('abc' + S) == "'abc\\ud800'"


def surrogate_plus_plain():
    return repr(S + 'abc') == "'\\ud800abc'"


def repetition():
    return repr(S * 2) == "'\\ud800\\ud800'"


# --- prefix / suffix ------------------------------------------------------

def plain_startswith_surrogate():
    return 'abc'.startswith(S) is False


def plain_endswith_surrogate():
    return 'abc'.endswith(S) is False


def surrogate_startswith_plain():
    return T.startswith('a') is True


def surrogate_endswith_plain():
    return T.endswith('b') is True


def surrogate_startswith_tuple():
    return T.startswith(('z', 'a')) is True


def removeprefix_leaves_string():
    return 'abc'.removeprefix(S) == 'abc'


def removesuffix_leaves_string():
    return 'abc'.removesuffix(S) == 'abc'


# --- substring search (was: an uncatchable Smalltalk ArgumentTypeError) ---

def find_reports_absent():
    return 'abc'.find(S) == -1


def rfind_reports_absent():
    return 'abc'.rfind(S) == -1


def count_is_zero():
    return 'abc'.count(S) == 0


def index_raises_value_error():
    try:
        'abc'.index(S)
    except ValueError:
        return True
    return False


def replace_is_a_no_op():
    return 'abc'.replace(S, 'x') == 'abc'


def replace_can_insert_a_surrogate():
    return repr('abc'.replace('b', S)) == "'a\\ud800c'"


def replace_honours_count():
    return repr('bbb'.replace('b', S, 2)) == "'\\ud800\\ud800b'"


def split_finds_no_separator():
    return 'abc'.split(S) == ['abc']


def partition_finds_no_separator():
    return 'abc'.partition(S) == ('abc', '', '')


# --- join / format --------------------------------------------------------

def join_carries_the_surrogate():
    return repr('-'.join(['a', S])) == "'a-\\ud800'"


def join_of_plain_pieces_is_plain():
    return '-'.join(['a', 'b']) == 'a-b'


def format_braces():
    return repr('{}'.format(S)) == "'\\ud800'"


def str_of_surrogate_is_itself():
    return repr(str(S)) == "'\\ud800'"


# --- maketrans (keys and values are CODE POINTS) --------------------------

def maketrans_accepts_a_surrogate():
    return str.maketrans(S, 'x') == {0xD800: ord('x')}


def maketrans_dict_key():
    return str.maketrans({S: 'x'}) == {0xD800: 'x'}


# --- container membership uses str.__eq__, so it moved too ----------------

def not_in_a_list_of_plain():
    return (S in ['abc']) is False


def not_in_a_set_of_plain():
    return (S in {'abc'}) is False


def usable_as_a_dict_key():
    return {S: 1}[S] == 1


# --- str(x, encoding) rejects a surrogate str the way it rejects any str --

def decoding_a_str_is_refused():
    try:
        str(S, 'utf-8')
    except TypeError:
        return True
    return False


# --- encode: strict refuses, surrogatepass emits WTF-8 (CPython agrees) ---

def strict_encode_raises():
    try:
        S.encode('utf-8')
    except UnicodeEncodeError:
        return True
    return False


def surrogatepass_encode():
    return T.encode('utf-8', 'surrogatepass') == b'a\xed\xb2\x80b'


CHECKS = [
    is_a_str, type_name_is_str, length_is_one, repr_is_escaped,
    surrogate_not_in_plain, plain_not_in_surrogate, plain_in_surrogate_bearing,
    empty_in_surrogate,
    eq_plain_is_false, reflected_eq_is_false, ne_plain_is_true, eq_itself,
    plain_sorts_before_surrogate, surrogate_sorts_after_plain,
    surrogate_not_less_than_plain, le_and_ge_agree,
    sorted_puts_surrogate_last,
    plain_plus_surrogate, surrogate_plus_plain, repetition,
    plain_startswith_surrogate, plain_endswith_surrogate,
    surrogate_startswith_plain, surrogate_endswith_plain,
    surrogate_startswith_tuple,
    removeprefix_leaves_string, removesuffix_leaves_string,
    find_reports_absent, rfind_reports_absent, count_is_zero,
    index_raises_value_error, replace_is_a_no_op,
    replace_can_insert_a_surrogate, replace_honours_count,
    split_finds_no_separator, partition_finds_no_separator,
    join_carries_the_surrogate, join_of_plain_pieces_is_plain,
    format_braces, str_of_surrogate_is_itself,
    maketrans_accepts_a_surrogate, maketrans_dict_key,
    not_in_a_list_of_plain, not_in_a_set_of_plain, usable_as_a_dict_key,
    decoding_a_str_is_refused,
    strict_encode_raises, surrogatepass_encode,
]


def run():
    """Every check by name, mapping to True / False / the error text.

    Each is run in its own try/except so one failure reports as one failing
    name rather than taking down the module -- the Smalltalk peer asserts on
    the dict, and a dict that never got built says nothing about which
    operation broke."""
    out = {}
    for fn in CHECKS:
        try:
            out[fn.__name__] = fn() is True
        except BaseException as exc:
            out[fn.__name__] = '%s: %s' % (type(exc).__name__, exc)
    return out


RESULTS = run()


if __name__ == '__main__':
    for name in sorted(RESULTS):
        print('%-4s %s' % ('OK' if RESULTS[name] is True else 'FAIL', name))
