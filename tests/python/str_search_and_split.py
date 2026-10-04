"""str's search and split family, as CPython's ``string_tests`` drives it.

Grail's ``collections.UserString`` was a seven-method stub, so CPython's
``test_userstring`` -- which runs the whole of ``string_tests`` through a
UserString that delegates every method to ``str`` -- scored 1 failure and
59 errors without ever reaching str.  Porting CPython's UserString exposed
what the stub had been hiding, all of it in str itself:

* ``str.find`` was the kernel's naive scan, O(len(haystack) * len(needle))
  in the worst case.  ``test_adaptive_find`` builds exactly that case at a
  million characters and the module TIMED OUT.  A search whose worst case
  is unbounded now takes the linear two-way search CPython itself uses.
* A non-str argument to find/rfind/index/rindex/count/partition/replace/
  removeprefix/join reached a kernel primitive and raised a Smalltalk error
  no ``except`` can catch, ending the program instead of raising TypeError.
* ``split(None, n)`` / ``rsplit(None, n)`` split fully and re-joined the
  tail with single spaces; ``rsplit(sep)`` matched left to right; a
  positional None separator was read as the string 'None'.
* An empty needle: ``'aaa'.count('')`` was 0, ``'abc'.rfind('')`` -1,
  ``'A'.replace('', '*')`` 'A'.
* ``''.startswith('', 1, 0)`` and ``''.istitle()`` were True; partition
  accepted an empty separator; ``'%((foo))s'`` and ``'%*s' % ('foo', 'x')``
  were refused or crashed.

Every EXPECTED value was produced by running these functions under CPython
3.14, not written by hand.
"""

import sys
from collections import UserString
from collections.abc import Sequence


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def _kind(fn):
    return _outcome(fn)[0]


# ------------------------------------------------------------- split

def split_whitespace_with_maxsplit():
    """The remainder after maxsplit is kept VERBATIM."""
    return ('  a    b   c   '.split(None, 1), 'a b c d'.split(None, 2),
            '  a  b '.split(None, 0), ('\x1c a' + chr(0x3000) + 'b ').split(),
            'a b c d'.split(maxsplit=1), '   '.split())


def rsplit_whitespace_keeps_the_head():
    return ('  a    b   c   '.rsplit(None, 1), ' a b c '.rsplit(None, 0),
            '   '.rsplit(), 'arf\tbarf'.rsplit(None))


def rsplit_matches_from_the_right():
    return ('abbbc'.rsplit('bb'), 'bbobbbobbA'.rsplit('bbobb'),
            'a|b|c'.rsplit('|', 1), 'a|b|c'.split('|', 1))


def a_zero_maxsplit_does_not_split():
    return ('aaa'.split('aaa', 0), 'aaa'.rsplit('aaa', 0),
            'a b'.split(None, 0), 'a b'.rsplit(None, 0))


def split_refusals():
    return (_outcome(lambda: 'hello'.split(42)),
            _outcome(lambda: 'hello'.split('')),
            _outcome(lambda: 'hello'.rsplit('', 1)),
            _kind(lambda: 'hello'.split(42, 42, 42)),
            _kind(lambda: 'hello'.rsplit(42, 42, 42)))


# ----------------------------------------------------- the find family

def find_family_refuses_a_non_str():
    return tuple(_outcome(lambda m=m: getattr('hello', m)(42))
                 for m in ('find', 'rfind', 'index', 'rindex', 'count'))


def the_empty_needle():
    return ('aaa'.count(''), 'aaa'.count('', 1), 'aaa'.count('', 4),
            'aaa'.count('', 10), 'abc'.rfind(''), 'abc'.rfind('', 1, 2),
            'abc'.rfind('', 4), 'abc'.find('', 3), 'abc'.find('', 4),
            'abc'.index(''), 'abc'.rindex(''))


def too_many_arguments():
    return (_outcome(lambda: 'hello'.find('x', None, None, None)),
            _outcome(lambda: 'hello'.rfind('x', None, None, None)),
            _outcome(lambda: 'hello'.rindex('x', None, None, None)),
            _outcome(lambda: 'hello'.count('x', None, None, None)),
            _kind(lambda: 'hello'.index('x', None, None, None)))


def windows_and_misses():
    return ('abcabc'.rfind('c', None, 4), 'abcdefghiabc'.rfind('abc', 1),
            'abc'.find('c', None, None), 'rrarrrrrrrrra'.index('a', 4, None),
            _outcome(lambda: 'hello'.rindex('x')),
            _outcome(lambda: 'abcdefghi'.index('ghi', -1)))


def adaptive_find_is_linear():
    """CPython's test_adaptive_find shape, and a periodic needle that is
    found.  Both are past the worst-case bound (2**35 comparisons) at which
    str.find leaves the kernel's naive scan for the two-way search -- the
    naive cost here is ~10**11 -- while staying small enough for a default
    gem's temporary object space (the million-character original is not)."""
    n = 200000
    a, b = 'a' * n, 'b' * n
    haystack = a + a + b + a + a
    needle = a + b + b + a
    m = 150000
    periodic = 'ab' * m
    prefix = ('ab' * (m - 1) + 'b') * 2
    return (haystack.find(needle), haystack.count(needle),
            (haystack + needle).find(needle), (haystack + needle).count(needle),
            (prefix + periodic).find(periodic) == len(prefix),
            (prefix + periodic + 'x').find(periodic, len(prefix) + 1))


# ------------------------------------------------- partition and friends

def partition_refusals():
    return (_outcome(lambda: 'hello'.partition('')),
            _outcome(lambda: 'hello'.rpartition('')),
            _outcome(lambda: 'hello'.partition(42)),
            _outcome(lambda: 'hello'.rpartition(42)),
            'a.b.c'.rpartition('.'), 'abc'.rpartition('abcd'))


def replace_with_an_empty_old():
    return ('A'.replace('', '*'), 'A'.replace('', '*', 1),
            'abc'.replace('', '-', 2), ''.replace('', 'A'),
            ''.replace('', 'A', 0), 'aaa'.replace('a', 'b', 2))


def replace_refusals():
    return (_outcome(lambda: 'hello'.replace(42, 'h')),
            _outcome(lambda: 'hello'.replace('h', 42)))


def removeprefix_refuses_a_non_str():
    return (_outcome(lambda: 'hello'.removeprefix(42)),
            _outcome(lambda: 'hello'.removesuffix(42)))


def join_refuses_a_non_str_item():
    return _outcome(lambda: ' '.join(['a', 1]))


def an_inverted_window_matches_nothing():
    return (''.startswith('', 1, 0), ''.endswith('', 1, 0),
            'abc'.startswith('', 3), 'abc'.startswith('', 4),
            'abc'.endswith('', 2, 1), 'hello'.startswith('he', 0, 2))


def istitle_needs_a_cased_character():
    return (''.istitle(), '\n'.istitle(), 'A'.istitle(),
            'A Title'.istitle(), 'A title'.istitle(), '123 Abc'.istitle())


# ------------------------------------------------------ % formatting

def percent_mapping_keys_nest():
    return ('%((foo))s' % {'(foo)': 'bar'},
            _outcome(lambda: '%(foo' % {}))


def percent_star_wants_an_int():
    return (_outcome(lambda: '%*s' % ('foo', 'bar')),
            _outcome(lambda: '%.*f' % ('foo', 42.0)),
            '%*s|' % (True, 'x'),
            _kind(lambda: '%*s' % (sys.maxsize + 1, '')),
            _kind(lambda: '%%%df' % (2 ** 64) % 3.2),
            _kind(lambda: '%%.%df' % (2 ** 64) % 3.2))


# --------------------------------------------------------- UserString

def userstring_is_complete():
    u = UserString('Hello World')
    return (str(u.lower()), u.split(), u.rfind('o'), u.count('l'),
            str(u * 2), str('>' + u), str(UserString('%s!') % 'hi'),
            isinstance(u, Sequence), hash(u) == hash('Hello World'),
            u < 'Z', u.startswith('He'), int(UserString('42')),
            type(u.upper()).__name__, u.partition(' '))


CHECKS = [
    split_whitespace_with_maxsplit, rsplit_whitespace_keeps_the_head,
    rsplit_matches_from_the_right, a_zero_maxsplit_does_not_split,
    split_refusals, find_family_refuses_a_non_str, the_empty_needle,
    too_many_arguments, windows_and_misses, adaptive_find_is_linear,
    partition_refusals, replace_with_an_empty_old, replace_refusals,
    removeprefix_refuses_a_non_str, join_refuses_a_non_str_item,
    an_inverted_window_matches_nothing, istitle_needs_a_cased_character,
    percent_mapping_keys_nest, percent_star_wants_an_int,
    userstring_is_complete,
]

EXPECTED = {
    'split_whitespace_with_maxsplit': (['a', 'b   c   '], ['a', 'b', 'c d'], ['a  b '], ['a', 'b'], ['a', 'b c d'], []),
    'rsplit_whitespace_keeps_the_head': (['  a    b', 'c'], [' a b c'], [], ['arf', 'barf']),
    'rsplit_matches_from_the_right': (['ab', 'c'], ['bbob', 'A'], ['a|b', 'c'], ['a', 'b|c']),
    'a_zero_maxsplit_does_not_split': (['aaa'], ['aaa'], ['a b'], ['a b']),
    'split_refusals': (('TypeError', 'must be str or None, not int'), ('ValueError', 'empty separator'), ('ValueError', 'empty separator'), 'TypeError', 'TypeError'),
    'find_family_refuses_a_non_str': (('TypeError', 'find() argument 1 must be str, not int'), ('TypeError', 'rfind() argument 1 must be str, not int'), ('TypeError', 'index() argument 1 must be str, not int'), ('TypeError', 'rindex() argument 1 must be str, not int'), ('TypeError', 'count() argument 1 must be str, not int')),
    'the_empty_needle': (4, 3, 0, 0, 3, 2, -1, 3, -1, 0, 3),
    'too_many_arguments': (('TypeError', 'find expected at most 3 arguments, got 4'), ('TypeError', 'rfind expected at most 3 arguments, got 4'), ('TypeError', 'rindex expected at most 3 arguments, got 4'), ('TypeError', 'count expected at most 3 arguments, got 4'), 'TypeError'),
    'windows_and_misses': (2, 9, 2, 12, ('ValueError', 'substring not found'), ('ValueError', 'substring not found')),
    'adaptive_find_is_linear': (-1, 0, 1000000, 1, True, -1),
    'partition_refusals': (('ValueError', 'empty separator'), ('ValueError', 'empty separator'), ('TypeError', 'must be str, not int'), ('TypeError', 'must be str, not int'), ('a.b', '.', 'c'), ('', '', 'abc')),
    'replace_with_an_empty_old': ('*A*', '*A', '-a-bc', 'A', '', 'bba'),
    'replace_refusals': (('TypeError', 'replace() argument 1 must be str, not int'), ('TypeError', 'replace() argument 2 must be str, not int')),
    'removeprefix_refuses_a_non_str': (('TypeError', 'removeprefix() argument must be str, not int'), ('TypeError', 'removesuffix() argument must be str, not int')),
    'join_refuses_a_non_str_item': ('TypeError', 'sequence item 1: expected str instance, int found'),
    'an_inverted_window_matches_nothing': (False, False, True, False, False, True),
    'istitle_needs_a_cased_character': (False, False, True, True, False, True),
    'percent_mapping_keys_nest': ('bar', ('ValueError', 'incomplete format key')),
    'percent_star_wants_an_int': (('TypeError', '* wants int'), ('TypeError', '* wants int'), 'x|', 'OverflowError', 'ValueError', 'ValueError'),
    'userstring_is_complete': ('hello world', ['Hello', 'World'], 7, 3, 'Hello WorldHello World', '>Hello World', 'hi!', True, True, True, True, 42, 'UserString', ('Hello', ' ', 'World')),
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
