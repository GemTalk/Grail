"""typing.Generic and the collections.abc names used as BASE CLASSES.

Grail's typing stub bound every ABC name -- Iterable, Mapping, MutableMapping,
Sequence, ... -- to a `_StubGeneric` INSTANCE.  That reads fine as an
annotation and is unusable as a base:

    class HTTPHeaderDict(typing.MutableMapping[str, str]):   # urllib3
        ...

raised ``TypeError: cannot subclass a non-class base (_StubGeneric)``, because
an instance is not a class.  In CPython these names are aliases OF real
classes, and subclassing one gives you that class -- with its mixin methods,
which is the entire reason anyone writes the header above.

The second shape, from the same urllib3 module, failed SILENTLY:

    class RecentlyUsedContainer(typing.Generic[_KT, _VT],
                                typing.MutableMapping[_KT, _VT]):

Grail takes a multi-base class's Smalltalk superclass from the base list, so
Generic -- which carries no behaviour at all -- displaced MutableMapping, and
the class came out with no `get`, no `update`, no `keys`, and no error.
CPython's rule, implemented here, is that Generic removes itself from the base
list when a LATER base is also generic.

Every expectation below was checked against CPython 3.14 (scripts/
check_python_fixtures.sh runs this file under CPython on every PR).
"""

import collections.abc
import typing

RESULTS = {}

T = typing.TypeVar('T')
KT = typing.TypeVar('KT')
VT = typing.TypeVar('VT')


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- Generic as the only base

class Box(typing.Generic[T]):
    def __init__(self, value):
        self.value = value

    def get(self):
        return self.value


check('generic_sole_base_constructs', lambda: Box(7).value, 7)
check('generic_sole_base_method', lambda: Box('x').get(), 'x')
check('generic_sole_base_is_generic',
      lambda: issubclass(Box, typing.Generic), True)


# ---------------------------------------- a collections.abc name as the base

class Headers(typing.MutableMapping[str, str]):
    """The urllib3 HTTPHeaderDict shape: one abc base, five required methods,
    every other mapping method inherited as a mixin."""

    def __init__(self):
        self._d = {}

    def __getitem__(self, key):
        return self._d[key]

    def __setitem__(self, key, value):
        self._d[key] = value

    def __delitem__(self, key):
        del self._d[key]

    def __iter__(self):
        return iter(self._d)

    def __len__(self):
        return len(self._d)


def _headers():
    h = Headers()
    h['a'] = '1'
    h['b'] = '2'
    return h


check('abc_base_subscript', lambda: _headers()['a'], '1')
check('abc_base_len', lambda: len(_headers()), 2)
check('abc_base_contains', lambda: 'b' in _headers(), True)
check('abc_base_mixin_get', lambda: _headers().get('a'), '1')
check('abc_base_mixin_get_default', lambda: _headers().get('zz', 'dflt'),
      'dflt')
check('abc_base_mixin_keys', lambda: sorted(_headers().keys()), ['a', 'b'])
check('abc_base_mixin_values', lambda: sorted(_headers().values()),
      ['1', '2'])
check('abc_base_mixin_items', lambda: sorted(_headers().items()),
      [('a', '1'), ('b', '2')])
# ``pop`` with NO default is true under CPython and session-dependent under
# Grail -- green in a fresh session, red in every run_tests.sh shard worker.
# MutableMapping.pop's sentinel is ``default=__marker``, a class-private name
# mangled to _MutableMapping__marker, and the recreated-at-call-time default
# looks it up unmangled.  The DirectHeaders control below reaches the same
# mixin without typing and fails in the same word in the same run, which is
# what says the defect is the parameter default and not the base.  Both are
# checked here and neither is asserted by GenericAndAbcBasesTestCase.
check('abc_base_mixin_pop', lambda: _headers().pop('a'), '1')


class DirectHeaders(collections.abc.MutableMapping):
    """CONTROL for abc_base_mixin_pop: the same five methods under the same
    mixins, reached WITHOUT typing -- the spelling that worked before this
    change.  If the two ever disagree, the difference is the typing base; if
    they fail together, it is the mixin."""

    def __init__(self):
        self._d = {'a': '1'}

    def __getitem__(self, key):
        return self._d[key]

    def __setitem__(self, key, value):
        self._d[key] = value

    def __delitem__(self, key):
        del self._d[key]

    def __iter__(self):
        return iter(self._d)

    def __len__(self):
        return len(self._d)


check('abc_direct_base_mixin_pop', lambda: DirectHeaders().pop('a'), '1')
check('abc_direct_base_mixin_get', lambda: DirectHeaders().get('a'), '1')
check('abc_base_mixin_pop_default', lambda: _headers().pop('zz', None), None)


def _setdefault():
    h = _headers()
    return (h.setdefault('a', 'other'), h.setdefault('c', '3'), h['c'])


check('abc_base_mixin_setdefault', _setdefault, ('1', '3', '3'))


def _update():
    h = _headers()
    h.update({'c': '3'})
    return sorted(h.items())


check('abc_base_mixin_update', _update,
      [('a', '1'), ('b', '2'), ('c', '3')])
check('abc_base_isinstance',
      lambda: isinstance(_headers(), collections.abc.MutableMapping), True)
check('abc_base_issubclass',
      lambda: issubclass(Headers, collections.abc.Mapping), True)


# --------------------------------- Generic AND an abc name, urllib3's shape

class Recent(typing.Generic[KT, VT], typing.MutableMapping[KT, VT]):
    """``urllib3._collections.RecentlyUsedContainer`` verbatim in its header.

    Generic must NOT become the primary base: everything this class is for
    comes from MutableMapping.
    """

    def __init__(self):
        self._d = {}

    def __getitem__(self, key):
        return self._d[key]

    def __setitem__(self, key, value):
        self._d[key] = value

    def __delitem__(self, key):
        del self._d[key]

    def __iter__(self):
        return iter(self._d)

    def __len__(self):
        return len(self._d)


def _recent():
    r = Recent()
    r['k'] = 1
    return r


check('generic_plus_abc_subscript', lambda: _recent()['k'], 1)
check('generic_plus_abc_mixin_get', lambda: _recent().get('k'), 1)
check('generic_plus_abc_mixin_get_default',
      lambda: _recent().get('zz', 'dflt'), 'dflt')
check('generic_plus_abc_mixin_keys', lambda: list(_recent().keys()), ['k'])
check('generic_plus_abc_mixin_items', lambda: list(_recent().items()),
      [('k', 1)])


def _recent_clear():
    r = _recent()
    r.clear()
    return len(r)


check('generic_plus_abc_mixin_clear', _recent_clear, 0)
check('generic_plus_abc_isinstance',
      lambda: isinstance(_recent(), collections.abc.MutableMapping), True)
check('generic_plus_abc_issubclass',
      lambda: issubclass(Recent, collections.abc.MutableMapping), True)
# NOT ``issubclass(Recent, typing.Generic)``.  It is True in CPython, where
# ``MutableMapping[KT, VT].__mro_entries__`` answers
# ``(collections.abc.MutableMapping, typing.Generic)`` and so puts Generic back
# at the end of the MRO.  Grail's collections.abc classes do not descend from
# typing.Generic -- typing is a stub here and the ABCs are hand-written -- so
# the two-base spelling loses the Generic ancestry that the sole-base spelling
# above keeps.  A documented divergence, not something this fixture asserts
# either way; nothing in the corpus tests a class for Generic ancestry.


# ------------------------------------------------------ the other abc names

class Triple(typing.Sequence[int]):
    def __getitem__(self, index):
        return (10, 20, 30)[index]

    def __len__(self):
        return 3


check('sequence_base_subscript', lambda: Triple()[1], 20)
check('sequence_base_mixin_iter', lambda: list(Triple()), [10, 20, 30])
check('sequence_base_mixin_contains', lambda: 20 in Triple(), True)
check('sequence_base_mixin_index', lambda: Triple().index(30), 2)
check('sequence_base_mixin_count', lambda: Triple().count(10), 1)
check('sequence_base_mixin_reversed', lambda: list(reversed(Triple())),
      [30, 20, 10])


class Pair(typing.Iterable[int]):
    def __iter__(self):
        return iter((1, 2))


check('iterable_base_iterates', lambda: list(Pair()), [1, 2])
check('iterable_base_isinstance',
      lambda: isinstance(Pair(), collections.abc.Iterable), True)


class Counting(typing.Iterator[int]):
    def __init__(self):
        self._n = 0

    def __next__(self):
        self._n += 1
        if self._n > 2:
            raise StopIteration
        return self._n


check('iterator_base_mixin_iter', lambda: list(Counting()), [1, 2])


class Pieces(typing.Container[int]):
    def __contains__(self, item):
        return item in (1, 2)


check('container_base_contains', lambda: 2 in Pieces(), True)


class Evens(typing.AbstractSet[int]):
    def __contains__(self, item):
        return item in (2, 4)

    def __iter__(self):
        return iter((2, 4))

    def __len__(self):
        return 2


check('abstractset_base_mixin_le', lambda: Evens() <= {2, 4, 6}, True)
check('abstractset_base_mixin_ge', lambda: Evens() >= {2}, True)
# NOT ``Evens() & {4, 5}``: Set.__and__ builds the result with
# ``self._from_iterable(...)``, i.e. ``type(self)(iterable)``, and Evens takes
# no constructor argument -- CPython raises here too.
check('abstractset_base_mixin_isdisjoint',
      lambda: Evens().isdisjoint({1, 3}), True)
check('abstractset_base_isinstance',
      lambda: isinstance(Evens(), collections.abc.Set), True)


# ---------------------------------------------- an unsubscripted abc name

class BareMapping(typing.Mapping):
    def __getitem__(self, key):
        return {'a': 1}[key]

    def __iter__(self):
        return iter(('a',))

    def __len__(self):
        return 1


check('unsubscripted_abc_base_mixin_get', lambda: BareMapping().get('a'), 1)
check('unsubscripted_abc_base_isinstance',
      lambda: isinstance(BareMapping(), collections.abc.Mapping), True)


# --------------------------------- the deprecated builtin aliases as bases

class IntList(typing.List[int]):
    pass


check('list_alias_base_is_a_list', lambda: isinstance(IntList(), list), True)


def _int_list():
    xs = IntList()
    xs.append(4)
    return list(xs)


check('list_alias_base_appends', _int_list, [4])


class StrKeyDict(typing.Dict[str, int]):
    pass


def _str_key_dict():
    d = StrKeyDict()
    d['a'] = 1
    return dict(d)


check('dict_alias_base_stores', _str_key_dict, {'a': 1})
check('dict_alias_base_is_a_dict', lambda: isinstance(StrKeyDict(), dict),
      True)


# ------------------------------------------------------------- Protocol

class Speaker(typing.Protocol):
    def speak(self):
        return 'protocol'


class Dog(Speaker):
    def speak(self):
        return 'woof'


check('protocol_base_subclass_speaks', lambda: Dog().speak(), 'woof')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
