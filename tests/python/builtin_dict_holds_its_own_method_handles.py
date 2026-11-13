"""Fixture: a builtin type's __dict__ holds its own method objects.

In CPython ``vars(bytearray)['count'] is bytearray.count'', and bytearray's
entries are bytearray's, not bytes'.  Grail implements bytearray on the class
behind bytes, and its __dict__ listed the inherited methods as bytes' own
objects: ``vars(bytearray)['hex'] is vars(bytes)['hex']'', with bytes as
__objclass__.  doctest's finder, which skips an object it has already seen,
therefore never examined bytearray's methods.  Every check holds under
CPython 3.14, which is what makes it evidence.
"""

r = {}


class Mapping(dict):
    pass


r['an_entry_is_what_the_class_read_answers'] = [vars(bytearray)['count'] is bytearray.count,
                                               vars(bytearray)['hex'] is bytearray.hex,
                                               vars(str)['split'] is str.split, vars(dict)['get'] is dict.get,
                                               vars(list)['append'] is list.append]
r['bytearray_and_bytes_hold_different_objects'] = [vars(bytearray)['hex'] is vars(bytes)['hex'],
                                                   vars(bytearray)['decode'] is vars(bytes)['decode'],
                                                   id(vars(bytearray)['count']) == id(vars(bytes)['count'])]
r['each_names_its_own_class'] = [vars(bytearray)['hex'].__objclass__ is bytearray,
                                 vars(bytes)['hex'].__objclass__ is bytes,
                                 vars(bytearray)['split'].__objclass__ is bytearray]
r['a_python_subclass_lists_only_its_own'] = ['get' in vars(Mapping), 'keys' in vars(Mapping)]

EXPECTED = {
    'an_entry_is_what_the_class_read_answers': [True, True, True, True, True],
    'bytearray_and_bytes_hold_different_objects': [False, False, False],
    'each_names_its_own_class': [True, True, True],
    'a_python_subclass_lists_only_its_own': [False, False],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
