"""Fixture: types.MappingProxyType wraps any mapping and reads through its own methods.

CPython's mappingproxy (Objects/descrobject.c) accepts anything with a
__getitem__ but a list or a tuple, and answers every read by asking the
wrapped mapping: ``in`` through its __contains__, len() through its __len__,
iteration and reversed() through its __iter__ and __reversed__, str() through
its str.  It has no item assignment or deletion, and refuses ``|=``.  Grail
accepted dicts only, read a dict subclass's storage past its overrides, had
no __reversed__ (reversed() indexed the proxy by position), no ``|=`` refusal
and no ``MappingProxyType[int]``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections
import types

r = {}


def made(argument):
    try:
        types.MappingProxyType(argument)
        return 'ok'
    except TypeError as e:
        return str(e)


r['accepts'] = [made(a) for a in (
    collections.ChainMap({'x': 1}), collections.UserDict(), 'abc', range(3),
    10, (1,), [1])]


class Custom(dict):
    def __contains__(self, key):
        return key == 'magic' or dict.__contains__(self, key)

    def __iter__(self):
        return iter(('iter',))

    def __len__(self):
        return 500

    def get(self, key, default=None):
        return 'get=%s' % dict.get(self, key, default)


view = types.MappingProxyType(Custom({'key': 'value'}))
r['reads_through_overrides'] = ['magic' in view, 'key' in view, 'xxx' in view,
                                tuple(view), len(view), view.get('key')]
chain = types.MappingProxyType(collections.ChainMap({'x': 1}, {'y': 2}))
r['chainmap'] = ['y' in chain, chain['x'], sorted(chain), len(chain)]
d = {'a': 1, 'b': 2, 'foo': 0, 'c': 3}
proxy = types.MappingProxyType(d)
del d['foo']
r['reversed'] = list(reversed(proxy))


def refused(operation):
    try:
        operation()
        return 'no error'
    except TypeError as e:
        return str(e)


def ior():
    global proxy
    proxy |= {}


def setitem():
    proxy['x'] = 1


def delitem():
    del proxy['a']


r['refusals'] = [refused(ior), refused(setitem), refused(delitem)]
r['str_and_repr'] = (str(types.MappingProxyType({'a': 1})), repr(types.MappingProxyType({'a': 1})))
r['class_getitem'] = repr(types.MappingProxyType[int])

EXPECTED = {
    'accepts': ['ok', 'ok', 'ok', 'ok',
                'mappingproxy() argument must be a mapping, not int',
                'mappingproxy() argument must be a mapping, not tuple',
                'mappingproxy() argument must be a mapping, not list'],
    'reads_through_overrides': [True, True, False, ('iter',), 500, 'get=value'],
    'chainmap': [True, 1, ['x', 'y'], 2],
    'reversed': ['c', 'b', 'a'],
    'refusals': ["'|=' is not supported by mappingproxy; use '|' instead",
                 "'mappingproxy' object does not support item assignment",
                 "'mappingproxy' object does not support item deletion"],
    'str_and_repr': ("{'a': 1}", "mappingproxy({'a': 1})"),
    'class_getitem': 'mappingproxy[int]',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
