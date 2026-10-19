"""The application under upgrade, for tests/scripts/run_grail_upgrade_test.sh.

An ordinary app's module: its own classes, plus the stdlib values an app keeps.
write_phase.py builds STORED from it under Grail n and commits it; verify_phase.py
reads it back under Grail m. describe() is what both phases compare: what an app
would observe about each value, as JSON-able data.
"""
import collections
import dataclasses
import datetime
import decimal
import enum
import fractions


class Account:
    def __init__(self, name, balance):
        self.name = name
        self.balance = balance

    def describe(self):
        return '%s:%s' % (self.name, self.balance)


class Slotted:
    __slots__ = ('x', 'y')

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def total(self):
        return self.x + self.y


class AppError(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code


class Registry(dict):
    def total(self):
        return sum(self.values())


@dataclasses.dataclass
class Point:
    x: int
    y: int = 0

    def norm1(self):
        return abs(self.x) + abs(self.y)


@dataclasses.dataclass(frozen=True)
class FrozenPoint:
    x: int
    y: int


class TagMeta(type):
    def __new__(mcls, name, bases, ns):
        ns.setdefault('tag', name.lower())
        return super().__new__(mcls, name, bases, ns)


class Tagged(metaclass=TagMeta):
    def __init__(self, value):
        self.value = value


class Color(enum.Enum):
    RED = 1
    GREEN = 2


Pair = collections.namedtuple('Pair', 'left right')


def module_func(x):
    return x * 2 + 1


def make_scaler(k):
    def scale(x):
        return x * k
    return scale


def build():
    """The graph the write phase commits. Each entry is a value an app would keep."""
    acct = Account('alice', 100)
    keyed = {}
    for k, v in key_values():
        keyed[k] = v
    return {
        'int_small': 42,
        'int_big': 2 ** 100 + 7,
        'float': 1.25,
        'complex': complex(1.5, -2.0),
        'str_ascii': 'hello',
        'str_unicode': 'héllo ☃ \U0001F600',
        'bytes': b'\x00\x01\xffabc',
        'bytearray': bytearray(b'xyz'),
        'none_true': (None, True, False),
        'tuple': (1, 'two', 3.0),
        'list': [1, [2, 3], {'k': 'v'}],
        'dict': {'a': 1, 'b': [2]},
        'set': {1, 2, 3},
        'frozenset': frozenset({'p', 'q'}),
        'decimal': decimal.Decimal('3.14159'),
        'fraction': fractions.Fraction(3, 7),
        'date': datetime.date(2024, 2, 29),
        'datetime': datetime.datetime(2024, 2, 29, 13, 45, 6, 789),
        'timedelta': datetime.timedelta(days=3, seconds=5),
        'ordereddict': collections.OrderedDict([('z', 1), ('a', 2)]),
        'counter': collections.Counter('abracadabra'),
        'deque': collections.deque([1, 2, 3]),
        'account': acct,
        'slotted': Slotted(3, 4),
        'error': AppError('boom', 17),
        'registry': Registry(a=1, b=2),
        'point': Point(3, -4),
        'tagged': Tagged('v'),
        'color': Color.GREEN,
        'pair': Pair(1, 2),
        'func': module_func,
        'closure': make_scaler(3),
        'bound': acct.describe,
        'keyed_dict': keyed,
        'keyed_set': set(k for k, _ in key_values()),
    }


def key_values():
    """Hashable keys of every kind, each built fresh on every call -- equal, never
    identical -- so a lookup with them tests the stored hashes, not identity."""
    return [
        (''.join(['ab', 'c']), 'str'),
        ('hé' + 'llo', 'unicode'),
        (10 ** 20 + 1, 'bigint'),
        (7, 'smallint'),
        (2.5, 'float'),
        (complex(1, 2), 'complex'),
        (b'by' + b'tes', 'bytes'),
        ((1, 'a', (2,)), 'tuple'),
        (frozenset([1, 2]), 'frozenset'),
        (decimal.Decimal('1.10'), 'decimal'),
        (fractions.Fraction(1, 3), 'fraction'),
        (datetime.date(2020, 1, 2), 'date'),
        (Color.RED, 'enum'),
        (FrozenPoint(1, 2), 'frozen_dataclass'),
        (Pair('l', 'r'), 'namedtuple'),
        (None, 'none'),
    ]


def expected_types():
    """name -> the type a stored value must be an instance OF, exactly, under the
    current Grail and the current app module."""
    return {
        'int_small': int, 'int_big': int, 'float': float, 'complex': complex,
        'str_ascii': str, 'str_unicode': str, 'bytes': bytes, 'bytearray': bytearray,
        'tuple': tuple, 'list': list, 'dict': dict, 'set': set, 'frozenset': frozenset,
        'decimal': decimal.Decimal, 'fraction': fractions.Fraction,
        'date': datetime.date, 'datetime': datetime.datetime,
        'timedelta': datetime.timedelta, 'ordereddict': collections.OrderedDict,
        'counter': collections.Counter, 'deque': collections.deque,
        'account': Account, 'slotted': Slotted, 'error': AppError,
        'registry': Registry, 'point': Point, 'tagged': Tagged, 'color': Color,
        'pair': Pair,
    }


def describe(stored):
    """What an app observes about each stored value, as JSON-able data."""
    s = stored
    return {
        'int_small': s['int_small'],
        'int_big': str(s['int_big']),
        'float': repr(s['float']),
        'complex': [s['complex'].real, s['complex'].imag],
        'str_ascii': s['str_ascii'],
        'str_unicode': s['str_unicode'],
        'bytes': list(s['bytes']),
        'bytearray': list(s['bytearray']),
        'none_true': [s['none_true'][0] is None, s['none_true'][1] is True,
                      s['none_true'][2] is False],
        'tuple': repr(s['tuple']),
        'list': repr(s['list']),
        'dict': sorted(s['dict'].items()),
        'set': sorted(s['set']),
        'frozenset': sorted(s['frozenset']),
        'decimal': str(s['decimal']),
        'fraction': [s['fraction'].numerator, s['fraction'].denominator],
        'date': s['date'].isoformat(),
        'datetime': s['datetime'].isoformat(),
        'timedelta': s['timedelta'].total_seconds(),
        'ordereddict': list(s['ordereddict'].items()),
        'counter': sorted(s['counter'].items()),
        'deque': list(s['deque']),
        'account': [s['account'].name, s['account'].balance, s['account'].describe()],
        'slotted': [s['slotted'].x, s['slotted'].y, s['slotted'].total()],
        'error': [str(s['error']), s['error'].code, list(s['error'].args)],
        'registry': [sorted(s['registry'].items()), s['registry'].total()],
        'point': [s['point'].x, s['point'].y, s['point'].norm1()],
        'tagged': [s['tagged'].value, s['tagged'].tag],
        'color': [s['color'].name, s['color'].value],
        'pair': [s['pair'].left, s['pair'].right],
        'func': s['func'](5),
        'closure': s['closure'](5),
        'bound': s['bound'](),
        'keyed_dict': sorted(s['keyed_dict'].values()),
        'keyed_set': len(s['keyed_set']),
    }
