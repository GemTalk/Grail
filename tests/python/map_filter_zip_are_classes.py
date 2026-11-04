"""Fixture: map, filter and zip are classes, as CPython's are.

CPython defines all three as types whose tp_new builds the iterator
(Python/bltinmodule.c:1366-1420 map_new, 502-531 filter_new, 3094-3158
zip_new), so ``isinstance(x, map)'' asks of a map object and ``class
M(map)'' subclasses it.  Grail's builtins were functions answering
map_iterator, filter_iterator and zip_iterator objects: isinstance raised
TypeError ("arg 2 must be a type"), the type read 'map_iterator', and none
could be subclassed.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import pickle

r = {}


def outcome(call):
    try:
        call()
        return 'no error'
    except TypeError as error:
        return 'TypeError: %s' % error


class M(map):
    pass


class F(filter):
    pass


class Z(zip):
    pass


mapped = map(str, [1, 2])
kept = filter(None, [0, 1, 2])
zipped = zip([1, 2], 'ab')
r['they_are_types'] = [isinstance(each, type) for each in (map, filter, zip)]
r['their_objects_are_instances'] = [isinstance(mapped, map), isinstance(kept, filter),
                                    isinstance(zipped, zip)]
r['the_type_is_the_class'] = [type(mapped) is map, type(kept) is filter, type(zipped) is zip]
r['named_as_cpython_names_them'] = [(each.__name__, each.__qualname__, each.__module__)
                                    for each in (map, filter, zip)]
r['the_repr_names_them'] = [repr(each).split(' ')[0] for each in (mapped, kept, zipped)]
r['still_lazy_iterators'] = [list(mapped), list(kept), list(zipped)]
r['a_subclass_builds_itself'] = [(type(M(str, [3])).__name__, list(M(str, [3]))),
                                 (type(F(None, [0, 4])).__name__, list(F(None, [0, 4]))),
                                 (type(Z([5], [6])).__name__, list(Z([5], [6])))]
r['subclass_objects_are_instances'] = [isinstance(M(str, []), map), issubclass(F, filter),
                                       issubclass(Z, zip)]
called = [map, filter, zip]
r['calling_the_class_value_builds_one'] = [list(called[0](abs, [-1])), list(called[1](None, [0, 7])),
                                           list(called[2]([8], [9], strict=True))]
r['the_refusals_are_cpythons'] = [outcome(lambda: map(str)), outcome(lambda: map(str, [1], k=1)),
                                  outcome(lambda: filter(None)),
                                  outcome(lambda: filter(None, [1], k=1)),
                                  outcome(lambda: zip(k=1)), outcome(lambda: map(str, 5))]
r['a_pickled_one_resumes'] = [list(pickle.loads(pickle.dumps(map(str, [1, 2])))),
                              list(pickle.loads(pickle.dumps(filter(None, [0, 3])))),
                              list(pickle.loads(pickle.dumps(zip([1], [2]))))]
r['the_class_pickles_by_name'] = pickle.loads(pickle.dumps(map)) is map

EXPECTED = {
    'they_are_types': [True, True, True],
    'their_objects_are_instances': [True, True, True],
    'the_type_is_the_class': [True, True, True],
    'named_as_cpython_names_them': [('map', 'map', 'builtins'), ('filter', 'filter', 'builtins'),
                                    ('zip', 'zip', 'builtins')],
    'the_repr_names_them': ['<map', '<filter', '<zip'],
    'still_lazy_iterators': [['1', '2'], [1, 2], [(1, 'a'), (2, 'b')]],
    'a_subclass_builds_itself': [('M', ['3']), ('F', [4]), ('Z', [(5, 6)])],
    'subclass_objects_are_instances': [True, True, True],
    'calling_the_class_value_builds_one': [[1], [7], [(8, 9)]],
    'the_refusals_are_cpythons': [
        'TypeError: map() must have at least two arguments.',
        "TypeError: map() got an unexpected keyword argument 'k'",
        'TypeError: filter expected 2 arguments, got 1',
        'TypeError: filter() takes no keyword arguments',
        "TypeError: zip() got an unexpected keyword argument 'k'",
        "TypeError: 'int' object is not iterable"],
    'a_pickled_one_resumes': [['1', '2'], [3], [(1, 2)]],
    'the_class_pickles_by_name': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
