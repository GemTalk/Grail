"""Fixture for StrEnumRebuildTestCase (#1974): revision 1 of a module whose
enums have members that are strings or bytes -- a StrEnum by a class statement
and by the functional API, a ``str'' mixin and a ``bytes'' and ``bytearray''
mixin, each by a class statement and (but bytearray) by ``type=''.  ``Shape''
is a plain functional enum, and ``Color'' a plain class statement enum: the
controls.

The test loads this, keeps a member of each enum, rewrites the file to v2.py
and rebuilds the module -- by loading it again, as an install does, or by
``importlib.reload'' -- and checks that each member it kept is still the
member the module names.
"""
import enum


class Mode(enum.StrEnum):
    READ = 'r'
    WRITE = 'w'


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


VERSION = 1
