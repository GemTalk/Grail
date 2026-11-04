"""Fixture: object.__reduce__ and __reduce_ex__ answer CPython's reduction.

For an instance of a Python class, CPython's object.__reduce_ex__(proto)
answers copyreg._reduce_ex's ``(copyreg._reconstructor, (cls, object, None),
state)'' below protocol 2 and ``(copyreg.__newobj__, (cls, *args), state,
listitems, dictitems)'' from protocol 2 on -- ``__newobj_ex__'' when
__getnewargs_ex__ gives keywords -- and object.__reduce__() the protocol-0
form; an overridden __reduce__ is what __reduce_ex__ answers; the protocol
is an int (Objects/typeobject.c, object___reduce_ex___impl).

Grail's object answered NotImplemented to both, and computed the reduction
inside pickle and copy only (test_descr PicklingTests test_object_reduce,
test_special_method_lookup).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import copyreg
import pickle

r = {}


class Plain:
    pass


class WithArgs:
    def __getnewargs__(self):
        return (1, 'two')


class WithKeywords:
    def __getnewargs_ex__(self):
        return ((1,), {'b': 2})


class Listing(list):
    pass


class Mapping(dict):
    pass


class OwnReduce:
    def __reduce__(self):
        return (OwnReduce, ())


def shape(reduction):
    """A reduction with its functions named and its iterators listed."""
    out = []
    for item in reduction:
        if callable(item) and hasattr(item, '__name__'):
            out.append(item.__name__)
        elif hasattr(item, '__next__'):
            out.append(list(item))
        elif isinstance(item, tuple):
            out.append(tuple(element.__name__ if isinstance(element, type) else element for element in item))
        else:
            out.append(item)
    return tuple(out)


def outcome(call):
    try:
        return call()
    except TypeError as e:
        return 'TypeError: %s' % e


plain = Plain()
plain.a = 1

r['below_protocol_2_it_is_the_reconstructor'] = [
    shape(plain.__reduce_ex__(0)), shape(plain.__reduce_ex__(1)), shape(plain.__reduce__())]
r['from_protocol_2_it_is_newobj'] = [shape(plain.__reduce_ex__(2)), shape(object.__reduce_ex__(plain, 4))]
r['newobj_takes_the_new_args'] = [shape(WithArgs().__reduce_ex__(2)), shape(WithKeywords().__reduce_ex__(2))]
r['a_list_or_dict_subclass_carries_its_items'] = [
    shape(Listing([1, 2]).__reduce_ex__(0)), shape(Listing([1, 2]).__reduce_ex__(2)),
    shape(Mapping(k=3).__reduce_ex__(2))]
r['an_overridden_reduce_is_what_reduce_ex_answers'] = [
    shape(OwnReduce().__reduce_ex__(2)), shape(OwnReduce().__reduce_ex__(0))]
r['the_protocol_is_an_int'] = outcome(lambda: plain.__reduce_ex__(None))
r['pickling_and_copying_still_round_trip'] = [
    [pickle.loads(pickle.dumps(plain, protocol)).a for protocol in range(pickle.HIGHEST_PROTOCOL + 1)],
    copy.copy(plain).a, copy.deepcopy(Listing([1, [2]])) == [1, [2]]]

EXPECTED = {
    'below_protocol_2_it_is_the_reconstructor': [
        ('_reconstructor', ('Plain', 'object', None), {'a': 1})] * 3,
    'from_protocol_2_it_is_newobj': [('__newobj__', ('Plain',), {'a': 1}, None, None)] * 2,
    'newobj_takes_the_new_args': [
        ('__newobj__', ('WithArgs', 1, 'two'), None, None, None),
        ('__newobj_ex__', ('WithKeywords', (1,), {'b': 2}), None, None, None)],
    'a_list_or_dict_subclass_carries_its_items': [
        ('_reconstructor', ('Listing', 'list', [1, 2])),
        ('__newobj__', ('Listing',), None, [1, 2], None),
        ('__newobj__', ('Mapping',), None, None, [('k', 3)])],
    'an_overridden_reduce_is_what_reduce_ex_answers': [('OwnReduce', ())] * 2,
    'the_protocol_is_an_int': "TypeError: 'NoneType' object cannot be interpreted as an integer",
    'pickling_and_copying_still_round_trip': [[1] * (pickle.HIGHEST_PROTOCOL + 1), 1, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
