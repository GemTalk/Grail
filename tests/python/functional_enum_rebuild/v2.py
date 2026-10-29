"""Revision 2 of tests/python/functional_enum_rebuild/v1.py: Color gains a
member, and VERSION is 2."""
import enum

Color = enum.Enum('Color', 'RED GREEN BLUE PURPLE')
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


VERSION = 2
