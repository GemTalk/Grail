"""Fixture: dict() reads a source with a ``keys`` attribute as a mapping, however it got one.

CPython's dict constructor treats its argument as a mapping when
``hasattr(arg, 'keys')``, and otherwise as an iterable of pairs
(Objects/dictobject.c:3735-3748).  Grail sent ``keys`` to the source, which
a ``keys`` assigned to the class at run time does not answer, so
``Mapping.keys = lambda self: ...`` was read as pairs and failed in
__getitem__(0).  Its messages also differ: two arguments are ``dict
expected at most 1 argument, got 2``, and an element that is not iterable
is ``object is not iterable`` (:3823) (test_descr test_dict_constructors).
Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(compute):
    try:
        return compute()
    except Exception as exc:
        return (type(exc).__name__, str(exc), getattr(exc, '__notes__', None))


class Mapping:
    dict = {1: 2, 3: 4, 'a': 1j}


r['incomplete_mapping'] = outcome(lambda: dict(Mapping()))
Mapping.keys = lambda self: list(self.dict.keys())
Mapping.__getitem__ = lambda self, i: self.dict[i]
r['keys_assigned_at_run_time'] = outcome(lambda: dict(Mapping()))


class Declared:
    def keys(self):
        return ['k']

    def __getitem__(self, key):
        return key.upper()


class AddressBookEntry:
    def __init__(self, first, last):
        self.first = first
        self.last = last

    def __iter__(self):
        return iter([self.first, self.last])


class Sub(dict):
    pass


r['keys_in_the_class_body'] = outcome(lambda: dict(Declared()))
r['pairs'] = [outcome(lambda: dict([AddressBookEntry('Tim', 'Warsaw'), AddressBookEntry('Barry', 'Peters')])),
              outcome(lambda: dict(zip(range(2), 'ab')))]
r['refusals'] = [outcome(lambda: dict({}, {})), outcome(lambda: dict([0])), outcome(lambda: dict((0,))),
                 outcome(lambda: dict(0)), outcome(lambda: dict([('tooshort',)])), outcome(lambda: Sub([0])),
                 outcome(lambda: Sub({}, {}))]

NOTE = ['Cannot convert dictionary update sequence element #0 to a sequence']
EXPECTED = {
    'incomplete_mapping': ('TypeError', "'Mapping' object is not iterable", None),
    'keys_assigned_at_run_time': {1: 2, 3: 4, 'a': 1j},
    'keys_in_the_class_body': {'k': 'K'},
    'pairs': [{'Tim': 'Warsaw', 'Barry': 'Peters'}, {0: 'a', 1: 'b'}],
    'refusals': [('TypeError', 'dict expected at most 1 argument, got 2', None),
                 ('TypeError', 'object is not iterable', NOTE),
                 ('TypeError', 'object is not iterable', NOTE),
                 ('TypeError', "'int' object is not iterable", None),
                 ('ValueError', 'dictionary update sequence element #0 has length 1; 2 is required', None),
                 ('TypeError', 'object is not iterable', NOTE),
                 ('TypeError', 'dict expected at most 1 argument, got 2', None)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-26s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
