# Regression fixture: the runtime gaps test.test_xml_etree exercised.
#
# Almost none of these are in xml.etree.  ElementTree is pure Python, and its
# test suite happens to probe object-model edges most code never reaches:
# a bound method stored in a class, a slice whose __index__ empties the list,
# an __eq__ that clears the list being searched, deepcopy of an object whose
# child mutates the original, an MI class built on an exception, a generator
# closed before it ever ran.  Each check below is what CPython answers.

import copy
import sys
from urllib.parse import urljoin

RESULTS = {}


# --- a bound method in a class dict is not re-bound -------------------------

def _gen():
    yield 1
    yield 2


_g = _gen()


class _BoundNext:
    __next__ = _g.__next__

    def __iter__(self):
        return self


RESULTS['bound_method_class_attr_not_rebound'] = (next(_BoundNext()) == 1)
_lst = []


class _BoundAppend:
    add = _lst.append


_BoundAppend().add(5)
RESULTS['bound_builtin_method_class_attr'] = (_lst == [5])


# --- slices: __index__ runs before the length is read -----------------------

class _Evil:
    def __init__(self, target, i=0):
        self.target, self.i = target, i

    def __index__(self):
        self.target[:] = []
        return self.i


def _mutating_slices_survive():
    for op in ('get', 'set', 'del'):
        for s in (lambda t: slice(_Evil(t), None), lambda t: slice(None, _Evil(t, 2)),
                  lambda t: slice(0, None, _Evil(t, 1))):
            t = list(range(10))
            sl = s(t)
            if op == 'get':
                if t[sl] != []:
                    return False
            elif op == 'set':
                t[sl] = []
            else:
                del t[sl]
            if t != []:
                return False
    return True


RESULTS['mutating_slice_index'] = _mutating_slices_survive()


class _ClearingEq:
    def __init__(self, target):
        self.target = target

    def __eq__(self, other):
        self.target.clear()
        return True


_t = [1, 2]
_t[0] = _ClearingEq(_t)
_t.remove(object())
RESULTS['list_remove_shrunk_by_eq'] = (_t == [])


# --- a subclass's slice is its builtin's type -------------------------------

class _L(list):
    pass


class _S(str):
    pass


class _B(bytes):
    pass


RESULTS['subclass_slice_types'] = (
    type(_L([1, 2, 3])[1:]) is list and type(_S('abc')[1:]) is str
    and type(_B(b'abc')[::2]) is bytes and type(_S('abc')[0]) is str)


# --- explicit object.__eq__ does not re-dispatch ----------------------------

class _Plain:
    pass


_orig_eq = _Plain.__eq__
_Plain.__eq__ = lambda self, other: _orig_eq(self, other)
_p = _Plain()
RESULTS['explicit_object_eq'] = (_p == _p) and (_p != _Plain())
del _Plain.__eq__


# --- an instance __dict__ is live -------------------------------------------

class _Bag:
    pass


_bag = _Bag()
_bag.a = 1
try:
    for _k in _bag.__dict__:
        _bag.z = 2
    RESULTS['instance_dict_iteration_detects_growth'] = False
except RuntimeError:
    RESULTS['instance_dict_iteration_detects_growth'] = True
RESULTS['instance_dict_views'] = (
    type(_bag.__dict__.keys()).__name__ == 'dict_keys'
    and sorted(_bag.__dict__.items()) == [('a', 1), ('z', 2)])
RESULTS['getstate_is_the_dict'] = (_bag.__getstate__() == {'a': 1, 'z': 2})


class _Root:
    def __init__(self):
        self.children = []


class _Evil2:
    def __deepcopy__(self, memo):
        _root.added = True
        return self


_root = _Root()
_root.children.append(_Evil2())
try:
    copy.deepcopy(_root)
    RESULTS['deepcopy_sees_mutation'] = False
except RuntimeError:
    RESULTS['deepcopy_sees_mutation'] = True
RESULTS['module_dir_is_a_list'] = (type(dir()) is list and dir() == sorted(dir()))


# --- MI onto an exception base keeps a secondary base's methods --------------

class _Tagged:
    def __init__(self, tag, attrib=None):
        self.tag = tag
        self.attrib = attrib

    def rename(self, tag):
        return tag.upper()

    def __len__(self):
        return 2

    def __getitem__(self, i):
        if i >= 2:
            raise IndexError(i)
        return i * 10


class _TaggedError(_Tagged, ValueError):
    pass


_te = _TaggedError('t', {})
RESULTS['mi_exception_base_method_copy'] = (
    _te.tag == 't' and _te.rename('x') == 'X' and isinstance(_te, ValueError))
RESULTS['mi_exception_base_sequence_iter'] = (list(_te) == [0, 10])


# --- a generator closed before it started never runs ------------------------

_ran = []


def _gen2():
    _ran.append(1)
    yield 1


_g2 = _gen2()
_g2.close()
try:
    next(_g2)
    RESULTS['closed_unstarted_generator'] = False
except StopIteration:
    RESULTS['closed_unstarted_generator'] = (_ran == [])


# --- urljoin is RFC 3986 ----------------------------------------------------

RESULTS['urljoin_rfc3986'] = (
    urljoin('Recursive2.xml', 'Recursive3.xml') == 'Recursive3.xml'
    and urljoin('http://a/b/c/d;p?q', '../g') == 'http://a/b/g'
    and urljoin('http://a/b/c/d;p?q', '?y') == 'http://a/b/c/d;p?y'
    and urljoin('http://a/b/c/d;p?q', '.') == 'http://a/b/c/')


if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
