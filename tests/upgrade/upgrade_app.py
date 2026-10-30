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
# A stdlib module whose class hierarchy changed between Grail releases: Grail
# c8cbc92 shipped its own email.message, with EmailMessage(Message); later
# releases ship CPython's, with Message <- MIMEPart <- EmailMessage. A database
# that imported it under the old Grail holds the old registration; importing it
# under the new one is a base change, with no stored instances (GemDB's web app
# imports it through flask).
import email.message
import enum
import fractions
import typing

# werkzeug.routing builds dataclasses with field(default_factory=...) at import
# (matcher.State): its rebuild, by an install's redeploy, failed with
# ``cannot specify both default and default_factory'' (GemTalk/Grail#1884).
import werkzeug.routing

# The app's own modules: one that sorts after this one (upgrade_wire.py), and
# one that sorts before dataclasses (app_fields.py).
import upgrade_wire
import app_fields


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


@dataclasses.dataclass
class Bag:
    """A field(default_factory=...): a rebuild of this module, or of dataclasses,
    must leave field() able to tell a default_factory from a default
    (GemTalk/Grail#1884, werkzeug.routing.matcher's State)."""
    items: list = dataclasses.field(default_factory=list)
    label: str = 'bag'


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


class Mode(str, enum.Enum):
    """A str mixin: its members are byte-format objects (a CharacterCollection
    subclass), so a rebuild cannot keep them by copying instance variables."""
    READ = 'r'
    WRITE = 'w'


class Level(enum.StrEnum):
    LOW = 'low'
    HIGH = 'high'


class Price(float):
    """A float subclass: Grail roots it at a storage class, not at float (#1863)."""
    def cents(self):
        return round(self * 100)


class Count(int):
    """An int subclass, rooted at a storage class as Price is (#1863)."""
    def doubled(self):
        return self * 2


class Size(float, enum.Enum):
    """A float mixin: its members are instances of a float subclass (#1863)."""
    SMALL = 1.5
    LARGE = 3.0


class Rank(int, enum.Enum):
    """An int mixin (#1863)."""
    LOW = 1
    HIGH = 2


# Enums built by the FUNCTIONAL API, not a class statement (#1950): one plain,
# one with an int mixin given by ``type=''.  Weight's values are not Rank's: an
# int-mixin member equals its value, so equal values would be one dict key.
Shape = enum.Enum('Shape', 'CIRCLE SQUARE')
Weight = enum.Enum('Weight', [('LIGHT', 10), ('HEAVY', 20)], type=int)


Pair = collections.namedtuple('Pair', 'left right')


class Span(collections.namedtuple('Span', 'lo hi')):
    """A class statement over a namedtuple built in its own header: its base is a
    new class whenever namedtuple's is, and then so is it."""
    def width(self):
        return self.hi - self.lo


def _built_kind(self):
    return 'built:' + self.label


# A class built by CALLING type() at module scope, not by a class statement.
Built = type('Built', (object,), {'kind': _built_kind})


def module_func(x):
    return x * 2 + 1


_registry = {}


def _registered(func):
    """typing's _tp_cache shape: the wrapper looks its function up, by the
    function, in a module-level dict -- which a rebuild of this module replaces."""
    _registry[func] = func

    def wrapper(*args):
        return _registry[func](*args)
    return wrapper


@_registered
def doubled(x):
    return 2 * x


def tagged_func():
    return 'tf'


tagged_func.tag = 'func-attr'


class TypedPair(typing.NamedTuple):
    """typing.NamedTuple is a function whose __mro_entries__ is set on it in
    typing's body; the class statement needs that attribute."""
    first: int
    second: str = 'b'


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
        'bag': Bag([1, 2]),
        'tagged': Tagged('v'),
        'color': Color.GREEN,
        'mode': Mode.WRITE,
        'level': Level.HIGH,
        'price': Price(2.5),
        'count': Count(7),
        'size': Size.LARGE,
        'rank': Rank.HIGH,
        'shape': Shape.SQUARE,
        'weight': Weight.HEAVY,
        'enum_keyed_dict': {Color.GREEN: 'color', Mode.WRITE: 'mode', Level.HIGH: 'level',
                            Size.LARGE: 'size', Rank.HIGH: 'rank', Shape.SQUARE: 'shape',
                            Weight.HEAVY: 'weight'},
        'enum_keyed_set': {Color.GREEN, Mode.WRITE, Level.HIGH, Size.LARGE, Rank.HIGH,
                           Shape.SQUARE, Weight.HEAVY},
        'pair': Pair(1, 2),
        'span': Span(3, 8),
        'typed_pair_obj': TypedPair(5, 'x'),
        'built': _make_built('b1'),
        'func': module_func,
        'closure': make_scaler(3),
        'bound': acct.describe,
        'keyed_dict': keyed,
        'keyed_set': set(k for k, _ in key_values()),
    }


def _make_built(label):
    b = Built()
    b.label = label
    return b


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
        'registry': Registry, 'point': Point, 'bag': Bag, 'tagged': Tagged, 'color': Color,
        'mode': Mode, 'level': Level,
        'price': Price, 'count': Count, 'size': Size, 'rank': Rank,
        'shape': Shape, 'weight': Weight,
        'pair': Pair, 'span': Span, 'typed_pair_obj': TypedPair, 'built': Built,
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
        'bag': [s['bag'].items, s['bag'].label, Bag().items, Bag().label],
        'wired': upgrade_wire.wired(3),
        'app_fields': app_fields.note_tags(),
        'tagged': [s['tagged'].value, s['tagged'].tag],
        'color': [s['color'].name, s['color'].value],
        'mode': [s['mode'].name, s['mode'].value, str(s['mode']), len(s['mode'])],
        'level': [s['level'].name, s['level'].value, str(s['level']), len(s['level'])],
        'price': [float(s['price']), s['price'].cents()],
        'count': [int(s['count']), s['count'].doubled()],
        'size': [s['size'].name, s['size'].value, float(s['size'])],
        'rank': [s['rank'].name, s['rank'].value, int(s['rank'])],
        'shape': [s['shape'].name, s['shape'].value],
        'weight': [s['weight'].name, s['weight'].value, int(s['weight'])],
        'enum_members': [[m.name for m in Color], [m.name for m in Mode], [m.name for m in Level],
                         [m.name for m in Size], [m.name for m in Rank],
                         [m.name for m in Shape], [m.name for m in Weight]],
        'pair': [s['pair'].left, s['pair'].right],
        'span': [s['span'].lo, s['span'].hi, s['span'].width()],
        'typed_pair_obj': [s['typed_pair_obj'].first, s['typed_pair_obj'].second],
        'built': s['built'].kind(),
        'func': s['func'](5),
        'closure': s['closure'](5),
        'bound': s['bound'](),
        'decorated': doubled(21),
        'func_attr': getattr(tagged_func, 'tag', '<missing>'),
        'typed_pair': list(TypedPair(1)),
        'keyed_dict': sorted(s['keyed_dict'].values()),
        'keyed_set': len(s['keyed_set']),
    }
