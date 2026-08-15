"""copy / deepcopy over the reduction protocol, and classes as hash keys.

Grail's copy module was a hand-written stub that dispatched by container
type and knew nothing of the reduction protocol -- which is most of what
test_copy exercises.  This covers the vendored CPython module and the two
Grail bugs it uncovered.

The recurring hazard, and the reason so many cases are here: CPython's
atomic sets and deepcopy dispatch are keyed by exact TYPE, and a Grail
builtin is often not the class its Python name resolves to.  A miss is not
a wrong answer but an unbounded recursion -- the value falls through to the
reduction path, __getnewargs__ hands it straight back, and _reconstruct
copies it again.

Every expectation below was checked against CPython 3.14.
"""

import copy
import functools
import re
import weakref
from collections import UserDict, namedtuple
from dataclasses import dataclass

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except Exception as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------------- atomic values

def _atomic(v):
    return lambda: (copy.copy(v) is v, copy.deepcopy(v) is v)


check('atomic_int', _atomic(42), (True, True))
check('atomic_float', _atomic(1.5), (True, True))
check('atomic_bytes', _atomic(b'world'), (True, True))
check('atomic_none', _atomic(None), (True, True))
check('atomic_notimplemented', _atomic(NotImplemented), (True, True))
check('atomic_ellipsis', _atomic(Ellipsis), (True, True))
# str spans several classes here; all of them must be atomic.
check('atomic_str_ascii', _atomic('hello'), (True, True))
check('atomic_str_latin1', _atomic('caf\xe9'), (True, True))
check('atomic_str_astral', _atomic('\U0001D11E'), (True, True))
check('atomic_str_derived', _atomic('AB'.lower()), (True, True))


class _Holder:
    pass


_holder = _Holder()
_holder.attr = 1
# The key of an instance __dict__ is a str of yet another class -- this is
# the one that recursed, because a reconstructed __dict__ copies its keys.
check('atomic_instance_dict_key',
      lambda: (lambda k: copy.deepcopy(k) is k)(list(_holder.__dict__)[0]),
      True)

check('atomic_weakref',
      lambda: (lambda r: copy.copy(r) is r)(weakref.ref(_holder)), True)
check('atomic_function', lambda: copy.copy(check) is check, True)
check('atomic_class', lambda: copy.copy(_Holder) is _Holder, True)

# CPython keeps TWO atomic sets: these are shallow-atomic but deepcopy must
# copy their members.
check('tuple_shallow_is_same',
      lambda: (lambda t: copy.copy(t) is t)(([1], [2])), True)
check('tuple_deep_copies_members',
      lambda: (lambda t: copy.deepcopy(t)[0] is t[0])(([1], [2])), False)
check('frozenset_shallow_is_same',
      lambda: (lambda f: copy.copy(f) is f)(frozenset([1, 2])), True)
check('slice_deep_copies_members',
      lambda: (lambda s: copy.deepcopy(s).start is s.start)(slice([1], [2])),
      False)


# --------------------------------------- containers keep their contents

class MySet(set):
    pass


class MyFrozen(frozenset):
    pass


class MyBytes(bytes):
    pass


class MyByteArray(bytearray):
    pass


class MyList(list):
    pass


check('set_subclass_keeps_elements',
      lambda: sorted(copy.copy(MySet([1, 2, 3]))), [1, 2, 3])
check('set_subclass_deep_keeps_elements',
      lambda: sorted(copy.deepcopy(MySet([1, 2, 3]))), [1, 2, 3])
check('frozenset_subclass_keeps_elements',
      lambda: sorted(copy.deepcopy(MyFrozen([1, 2]))), [1, 2])
check('bytes_subclass_keeps_content',
      lambda: bytes(copy.deepcopy(MyBytes(b'abcd'))), b'abcd')
check('bytearray_subclass_keeps_content',
      lambda: bytes(copy.deepcopy(MyByteArray(b'abcd'))), b'abcd')


def _list_subclass_attrs():
    x = MyList([1, 2])
    x.foo = [9]
    y = copy.deepcopy(x)
    return (list(y), y.foo, y.foo is x.foo)


check('list_subclass_keeps_items_and_attrs', _list_subclass_attrs,
      ([1, 2], [9], False))


# ------------------------------------------- custom reduction protocols

class WithReduce:
    def __reduce__(self):
        return (WithReduce, (), self.__dict__)

    def __eq__(self, other):
        return self.__dict__ == other.__dict__


def _reduce_roundtrip():
    x = WithReduce()
    x.foo = [42]
    shallow = copy.copy(x)
    deep = copy.deepcopy(x)
    return (shallow == x, deep == x, deep.foo is x.foo)


check('custom_reduce_roundtrip', _reduce_roundtrip, (True, True, False))


class WithGetNewArgs:
    def __new__(cls, foo=0):
        self = object.__new__(cls)
        self.foo = foo
        return self

    def __getnewargs__(self):
        return (self.foo,)


check('getnewargs_used', lambda: copy.copy(WithGetNewArgs(7)).foo, 7)


# NOT covered: a class that hides its reductors behind __getattribute__ is
# supposed to raise copy.Error, and copy.py does raise it -- but Grail does
# not route getattr through a user __getattribute__, so the reductors stay
# visible and no Error is raised.  That is a gap in the attribute protocol,
# not in copy; test_copy's test_copy_cant / test_deepcopy_cant still fail on
# it and the board reports them.


# ------------------------------------------------ types with __copy__

def _pattern_identity():
    p = re.compile(r'(\d+)')
    m = p.match('12')
    return (copy.copy(p) is p, copy.deepcopy(p) is p,
            copy.copy(m) is m, copy.deepcopy(m) is m)


check('regex_pattern_and_match_are_atomic', _pattern_identity,
      (True, True, True, True))


def _userdict_copy():
    u = UserDict()
    u[123] = 'abc'
    u.test = [1234]
    c = copy.copy(u)
    return (c.data == u.data, c.data is not u.data, c.test is u.test)


check('userdict_copy', _userdict_copy, (True, True, True))


# -------------------------------- a shallow copy shares what it should

def _partial_copy():
    f = functools.partial(max, ['asdf'], key=len)
    f.attr = []
    g = copy.copy(f)
    return (g.func is f.func, g.args is f.args,
            g.keywords is f.keywords, g.attr is f.attr)


check('partial_shallow_copy_shares', _partial_copy,
      (True, True, True, True))


def _partial_deepcopy():
    f = functools.partial(max, ['asdf'])
    f.attr = []
    g = copy.deepcopy(f)
    return (g.func is f.func, g.args is not f.args, g.attr is not f.attr)


check('partial_deep_copy_copies', _partial_deepcopy, (True, True, True))


# --------------------------------------------------- copy.replace()

Point = namedtuple('Point', 'x y')


@dataclass
class DPoint:
    x: int
    y: int


check('replace_namedtuple', lambda: copy.replace(Point(1, 2), y=5),
      Point(1, 5))
check('replace_dataclass', lambda: copy.replace(DPoint(1, 2), y=5),
      DPoint(1, 5))


def _replace_unsupported():
    try:
        copy.replace(_Holder())
    except TypeError:
        return 'TypeError'
    return 'no error'


check('replace_rejects_plain_object', _replace_unsupported, 'TypeError')


# ------------------------------------ a class hashes even when its
#                                       INSTANCES are unhashable

check('hash_of_unhashable_instance_type',
      lambda: isinstance(hash(UserDict), int), True)
check('unhashable_type_as_dict_key',
      lambda: {UserDict: 'v'}[UserDict], 'v')
check('unhashable_type_as_set_member',
      lambda: UserDict in {UserDict}, True)
# The class attribute itself is unchanged: it describes the INSTANCES.
check('userdict_instances_stay_unhashable',
      lambda: UserDict.__hash__ is None, True)


class EqOnly:
    def __eq__(self, other):
        return True


check('hash_of_type_defining_eq',
      lambda: isinstance(hash(EqOnly), int), True)
check('eq_only_instances_unhashable', lambda: EqOnly.__hash__ is None, True)


# ------------------------------------------------------- module surface

check('module_exports', lambda: sorted(copy.__all__),
      ['Error', 'copy', 'deepcopy', 'replace'])
check('error_alias', lambda: copy.error is copy.Error, True)
