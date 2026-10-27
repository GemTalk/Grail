"""The namespaced application's own module, for tests/scripts/run_grail_upgrade_test.sh.

upgrade_ns_main.py, the namespace's top file, imports it after
gemdb.use_namespace(), so it is deployed in that namespace -- its file is not
one of Grail's -- and not in the default one, where upgrade_app.py is. build()
is what the top file commits through gemdb.root; describe() is what both phases
compare, as in upgrade_app.py.
"""
import collections
import dataclasses
import datetime
import decimal
import enum
import fractions


class Ledger:
    def __init__(self, owner, entries):
        self.owner = owner
        self.entries = entries

    def total(self):
        return sum(self.entries)


class Bucket(dict):
    def weight(self):
        return sum(len(v) for v in self.values())


class LedgerError(Exception):
    def __init__(self, message, ledger):
        super().__init__(message)
        self.ledger = ledger


@dataclasses.dataclass
class Item:
    sku: str
    qty: int = 1

    def label(self):
        return '%s x%d' % (self.sku, self.qty)


@dataclasses.dataclass(frozen=True)
class Sku:
    code: str


class Status(enum.Enum):
    OPEN = 'open'
    SHUT = 'shut'


def build():
    ledger = Ledger('bob', [3, 4, 5])
    return {
        'ledger': ledger,
        'bucket': Bucket(a='xy', b='z'),
        'error': LedgerError('overdrawn', ledger),
        'item': Item('w-1', 3),
        'status': Status.SHUT,
        'by_sku': {Sku('a'): 1, Sku('b'): 2},
        'decimal': decimal.Decimal('2.50'),
        'fraction': fractions.Fraction(2, 9),
        'when': datetime.datetime(2025, 7, 1, 8, 30),
        'ordered': collections.OrderedDict([('y', 1), ('x', 2)]),
        'text': 'namespaced ☃',
    }


def expected_types():
    return {
        'ledger': Ledger, 'bucket': Bucket, 'error': LedgerError, 'item': Item,
        'status': Status, 'decimal': decimal.Decimal, 'fraction': fractions.Fraction,
        'when': datetime.datetime, 'ordered': collections.OrderedDict, 'text': str,
    }


def describe(s):
    return {
        'ledger': [s['ledger'].owner, list(s['ledger'].entries), s['ledger'].total()],
        'bucket': [sorted(s['bucket'].items()), s['bucket'].weight()],
        'error': [str(s['error']), s['error'].ledger is s['ledger']],
        'item': [s['item'].sku, s['item'].qty, s['item'].label()],
        'status': [s['status'].name, s['status'].value],
        'by_sku': [s['by_sku'].get(Sku('a')), s['by_sku'].get(Sku('b'))],
        'decimal': str(s['decimal']),
        'fraction': [s['fraction'].numerator, s['fraction'].denominator],
        'when': s['when'].isoformat(),
        'ordered': list(s['ordered'].items()),
        'text': s['text'],
    }
