"""Revision 2 of tests/python/strenum_rebuild/v1.py: Mode gains a member, and
VERSION is 2."""
import enum


class Mode(enum.StrEnum):
    READ = 'r'
    WRITE = 'w'
    APPEND = 'a'


class Step(enum.StrEnum):
    FIRST = enum.auto()
    SECOND = enum.auto()


Tone = enum.StrEnum('Tone', 'SOFT LOUD')
Hue = enum.StrEnum('Hue', [('WARM', 'warm'), ('COOL', 'cool')])


class Mix(str, enum.Enum):
    A = 'a'
    B = 'b'


Letter = enum.Enum('Letter', [('P', 'p'), ('Q', 'q')], type=str)


class Raw(bytes, enum.Enum):
    A = b'a'
    B = b'b'


Octet = enum.Enum('Octet', [('P', b'p'), ('Q', b'q')], type=bytes)


class Buf(bytearray, enum.Enum):
    A = b'aa'
    B = b'bb'


Shape = enum.Enum('Shape', 'CIRCLE SQUARE')


class Color(enum.Enum):
    RED = 1
    GREEN = 2


VERSION = 2
