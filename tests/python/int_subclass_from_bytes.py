"""``int.from_bytes`` is inherited by int subclasses and builds one.

CPython's ``int_from_bytes_impl`` (Objects/longobject.c) computes the int and,
for a subclass, calls the class with it -- so ``MyInt.from_bytes(...)`` is a
MyInt, a subclass's own ``__new__`` runs, and an IntFlag answers its member.
In Grail an int subclass is rooted at AbstractPyInt rather than at the kernel
Integer, so it never saw int's class side: ``MyInt.from_bytes`` was an
AttributeError (test_long test_from_bytes).  And both ``from_bytes`` and
``to_bytes`` took any byteorder other than 'big' as little-endian, where
CPython raises ValueError; and ``int.from_bytes`` ignored an object's own
``__bytes__``, which PyObject_Bytes tries first (Objects/object.c).

Self-running: ``python3 int_subclass_from_bytes.py`` prints one line per check
against what CPython 3.14 answers.
"""

import enum


class MyInt(int):
    pass


class SubStr(str):
    pass


class ValidBytes:
    def __bytes__(self):
        return b'\x01'


class InvalidBytes:
    def __bytes__(self):
        return 'abc'


class BytearrayBytes:
    def __bytes__(self):
        return bytearray(b'\x01')


class MissingBytes:
    pass


class RaisingBytes:
    def __bytes__(self):
        1 / 0


class Tenfold(int):
    def __new__(cls, value):
        return super().__new__(cls, value * 10)


class Perm(enum.IntFlag):
    R = 4
    W = 2


def _outcome(action):
    try:
        result = action()
        return "ok -> %r %s" % (result, type(result).__name__)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


r = {
    "two_arguments": _outcome(lambda: MyInt.from_bytes(b'\x01\x00', 'big')),
    "one_argument": _outcome(lambda: MyInt.from_bytes(b'\x01\x00')),
    "signed": _outcome(lambda: MyInt.from_bytes(b'\xff', 'big', signed=True)),
    "keywords": _outcome(lambda: MyInt.from_bytes(bytes=b'\x01\x00', byteorder='little', signed=False)),
    "through_an_instance": _outcome(lambda: MyInt(5).from_bytes(b'\x02', 'big')),
    "the_subclass_new_runs": _outcome(lambda: Tenfold.from_bytes(b'\x01', 'big')),
    "an_intflag_answers_its_member": _outcome(lambda: Perm.from_bytes(b'\x04', 'big')),
    "visible_to_hasattr_and_dir": (hasattr(MyInt, 'from_bytes'), 'from_bytes' in dir(MyInt)),
    "a_bad_byteorder": _outcome(lambda: MyInt.from_bytes(b'\x01', 'middle')),
    "a_byteorder_with_a_nul": (_outcome(lambda: int.from_bytes([0], 'big\x00')),
                               _outcome(lambda: (1).to_bytes(1, 'little\x00')),
                               _outcome(lambda: int.from_bytes(b'\x01', SubStr('little')))),
    "to_bytes_checks_byteorder_too": (_outcome(lambda: (1).to_bytes(1, 'middle')), (1).to_bytes(2, 'little')),
    "a_str_argument": _outcome(lambda: MyInt.from_bytes('', 'big')),
    "an_object_with_dunder_bytes": (_outcome(lambda: int.from_bytes(ValidBytes())),
                                    _outcome(lambda: MyInt.from_bytes(ValidBytes(), 'little')),
                                    _outcome(lambda: int.from_bytes(InvalidBytes())),
                                    _outcome(lambda: int.from_bytes(BytearrayBytes())),
                                    _outcome(lambda: int.from_bytes(MissingBytes())),
                                    _outcome(lambda: int.from_bytes(RaisingBytes()))),
    "plain_int_unchanged": _outcome(lambda: int.from_bytes(b'\x01\x00', 'little')),
}

EXPECTED = {
    'a_bad_byteorder': "ValueError: byteorder must be either 'little' or 'big'",
    'a_byteorder_with_a_nul': ("ValueError: byteorder must be either 'little' or 'big'",
                               "ValueError: byteorder must be either 'little' or 'big'",
                               'ok -> 1 int'),
    'a_str_argument': "TypeError: cannot convert 'str' object to bytes",
    'an_object_with_dunder_bytes': ('ok -> 1 int', 'ok -> 1 MyInt',
                                    'TypeError: __bytes__ returned non-bytes (type str)',
                                    'TypeError: __bytes__ returned non-bytes (type bytearray)',
                                    "TypeError: cannot convert 'MissingBytes' object to bytes",
                                    'ZeroDivisionError: division by zero'),
    'an_intflag_answers_its_member': 'ok -> <Perm.R: 4> Perm',
    'keywords': 'ok -> 1 MyInt',
    'one_argument': 'ok -> 256 MyInt',
    'plain_int_unchanged': 'ok -> 1 int',
    'signed': 'ok -> -1 MyInt',
    'the_subclass_new_runs': 'ok -> 10 Tenfold',
    'through_an_instance': 'ok -> 2 MyInt',
    'to_bytes_checks_byteorder_too': ("ValueError: byteorder must be either 'little' or 'big'", b'\x01\x00'),
    'two_arguments': 'ok -> 256 MyInt',
    'visible_to_hasattr_and_dir': (True, True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
