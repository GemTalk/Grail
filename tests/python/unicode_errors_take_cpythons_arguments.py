"""Fixture: UnicodeEncodeError, UnicodeDecodeError and UnicodeTranslateError take CPython's arguments.

CPython parses their arguments in tp_init with PyArg_ParseTuple: "UUnnU" for
UnicodeEncodeError, "UOnnU" and then a buffer for UnicodeDecodeError, "UnnU"
for UnicodeTranslateError (Objects/exceptions.c).  So a call with the wrong
count or the wrong type is a TypeError, whether the class is called, a
subclass without an __init__ of its own is, or __init__ is called
explicitly.  An explicit __new__ takes anything, as BaseException_new does.

Grail took any arguments at all, and built an exception whose str() then
failed.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

E, D, T = UnicodeEncodeError, UnicodeDecodeError, UnicodeTranslateError


def described(error):
    try:
        return '%s: %s' % (type(error).__name__, error)
    except Exception as failure:
        return '%s whose str() raised %s' % (type(error).__name__, type(failure).__name__)


def outcome(call):
    try:
        return call()
    except Exception as e:
        return described(e)


class Inherited(UnicodeEncodeError):
    pass


class TakesNothing(UnicodeEncodeError):
    def __init__(self):
        UnicodeEncodeError.__init__(self, 'ascii', 'x', 0, 1, 'own')


def raising():
    raise UnicodeEncodeError('ascii', 1, 0, 1, 'r')


r['the_count_is_exact'] = [outcome(call) for call in (
    lambda: E(), lambda: E('a'), lambda: E('a', 'b', 0, 1), lambda: E('a', 'b', 0, 1, 'r', 'x'),
    lambda: D('a', b'b', 0, 1), lambda: T('a', 0, 1), lambda: T('a', 0, 1, 'r', 'x'))]
r['a_str_argument_must_be_a_str'] = [outcome(call) for call in (
    lambda: E(1, 'b', 0, 1, 'r'), lambda: E(None, 'b', 0, 1, 'r'), lambda: E('a', b'b', 0, 1, 'r'),
    lambda: E('a', 'b', 0, 1, 1.0), lambda: D(b'a', b'b', 0, 1, 'r'), lambda: T(b'a', 0, 1, 'r'),
    lambda: T('a', 0, 1, None))]
r['a_position_must_be_an_index_in_range'] = [outcome(call) for call in (
    lambda: E('a', 'b', 'x', 1, 'r'), lambda: E('a', 'b', 0, 1.5, 'r'), lambda: D('a', b'b', None, 1, 'r'),
    lambda: T('a', 0, 2 ** 70, 'r'))]
r['a_decode_error_takes_a_buffer_as_bytes'] = [
    outcome(lambda: D('a', 'b', 0, 1, 'r')), outcome(lambda: D('a', 1, 0, 1, 'r')),
    outcome(lambda: D('a', bytearray(b'xy'), 0, 1, 'r').object),
    outcome(lambda: D('a', memoryview(b'xy'), 0, 1, 'r').object)]
r['keywords_are_refused_first'] = outcome(lambda: E('a', 'b', 0, 1, reason='r'))
r['a_subclass_without_an_init_is_checked'] = outcome(lambda: Inherited('a'))
r['a_subclass_with_its_own_init_is_not'] = outcome(lambda: TakesNothing().args)
r['an_explicit_init_is_checked'] = outcome(lambda: E.__init__(E('a', 'b', 0, 1, 'r'), 1, 2))
r['an_explicit_new_takes_anything'] = [
    outcome(lambda: E.__new__(E, 1, 2).args), outcome(lambda: str(E.__new__(E))),
    outcome(lambda: str(D.__new__(D))), outcome(lambda: str(T.__new__(T)))]
r['a_raise_is_checked'] = outcome(raising)
r['unicode_error_itself_takes_anything'] = outcome(lambda: UnicodeError(1, 2, 3).args)
r['the_right_arguments_still_build_one'] = [
    outcome(lambda: str(E('ascii', 'g\xfcrk', 1, 2, 'ouch'))),
    outcome(lambda: str(D('ascii', bytearray(b'g\xfcrk'), 1, 2, 'ouch'))),
    outcome(lambda: str(T('g\xfcrk', 1, 2, 'ouch'))),
    outcome(lambda: str(Inherited('ascii', 'g\xfcrk', 1, 2, 'ouch')))]

FIVE = 'TypeError: function takes exactly 5 arguments (%d given)'

EXPECTED = {
    'the_count_is_exact': [
        FIVE % 0, FIVE % 1, FIVE % 4, FIVE % 6, FIVE % 4,
        'TypeError: function takes exactly 4 arguments (3 given)',
        'TypeError: function takes exactly 4 arguments (5 given)'],
    'a_str_argument_must_be_a_str': [
        'TypeError: argument 1 must be str, not int', 'TypeError: argument 1 must be str, not None',
        'TypeError: argument 2 must be str, not bytes', 'TypeError: argument 5 must be str, not float',
        'TypeError: argument 1 must be str, not bytes', 'TypeError: argument 1 must be str, not bytes',
        'TypeError: argument 4 must be str, not None'],
    'a_position_must_be_an_index_in_range': [
        "TypeError: 'str' object cannot be interpreted as an integer",
        "TypeError: 'float' object cannot be interpreted as an integer",
        "TypeError: 'NoneType' object cannot be interpreted as an integer",
        'OverflowError: Python int too large to convert to C ssize_t'],
    'a_decode_error_takes_a_buffer_as_bytes': [
        "TypeError: a bytes-like object is required, not 'str'",
        "TypeError: a bytes-like object is required, not 'int'", b'xy', b'xy'],
    'keywords_are_refused_first': 'TypeError: UnicodeEncodeError() takes no keyword arguments',
    'a_subclass_without_an_init_is_checked': FIVE % 1,
    'a_subclass_with_its_own_init_is_not': ('ascii', 'x', 0, 1, 'own'),
    'an_explicit_init_is_checked': FIVE % 2,
    'an_explicit_new_takes_anything': [(1, 2), '', '', ''],
    'a_raise_is_checked': 'TypeError: argument 2 must be str, not int',
    'unicode_error_itself_takes_anything': (1, 2, 3),
    'the_right_arguments_still_build_one': [
        "'ascii' codec can't encode character '\\xfc' in position 1: ouch",
        "'ascii' codec can't decode byte 0xfc in position 1: ouch",
        "can't translate character '\\xfc' in position 1: ouch",
        "'ascii' codec can't encode character '\\xfc' in position 1: ouch"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
