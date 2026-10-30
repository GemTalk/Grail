"""Fixture for FunctionalEnumRebuildTestCase (#1950): revision 1 of a module
whose enums are built with the FUNCTIONAL API -- ``Enum('Color', 'RED GREEN')''
-- rather than by a class statement: plain, IntEnum, Flag, a ``type='' mixin
over int and float, a call on a mixin base declared by a class statement, and
a StrEnum, whose members are strings.  ``Fruit'' is the control: a class
statement enum, which already kept its class and members across a rebuild.

The test loads this, keeps a member of each enum, rewrites the file to v2.py
and loads it again: a rebuild of the same module, which must hand back the
same enum classes -- and the same member objects -- so what was stored before
it is still what the module names after it.
"""
import enum

Color = enum.Enum('Color', 'RED GREEN BLUE')
Level = enum.IntEnum('Level', 'LOW HIGH')
Perm = enum.Flag('Perm', 'R W X')
# Int-mixin values are distinct across enums: equal members are one dict key.
Rank = enum.Enum('Rank', [('LOW', 10), ('HIGH', 20)], type=int)
Shade = enum.Enum('Shade', [('DARK', 1.5), ('LIGHT', 3.0)], type=float)


class IntBase(int, enum.Enum):
    pass


Grade = IntBase('Grade', [('PASS', 30), ('FAIL', 40)])
Tone = enum.StrEnum('Tone', 'SOFT LOUD')


class Fruit(enum.Enum):
    APPLE = 1
    PEAR = 2


VERSION = 1
