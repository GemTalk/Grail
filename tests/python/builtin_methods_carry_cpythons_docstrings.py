"""Fixture: a builtin type's method carries CPython's docstring.

``str.split.__doc__'' starts ``Return a list of the substrings in the string''
in CPython.  In Grail every method of every builtin type -- str, bytes, int,
list, dict, the exceptions' add_note -- answered None, bound or unbound,
because a docstring is captured from a class statement and these types have
none.  help(), pydoc and inspect read it.  A program's own subclass inherits
the docstring of a method it does not override, and an undocumented override
answers None.  Every check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def first_line(method):
    doc = method.__doc__
    return doc.splitlines()[0] if isinstance(doc, str) else doc


class Text(str):
    pass


class Overriding(str):
    def split(self):
        return []

    def upper(self):
        """Mine."""
        return self


ACCENTED = 'caf' + chr(0xE9)
r['unbound_methods'] = [first_line(str.split), first_line(int.bit_length), first_line(list.append),
                        first_line(dict.get), first_line(bytes.hex), first_line(float.hex), first_line(set.add),
                        first_line(tuple.count), first_line(memoryview.tobytes), first_line(complex.conjugate)]
r['bound_methods'] = [first_line('a'.split), first_line(ACCENTED.upper), first_line((2 ** 70).bit_length),
                      first_line([].append), first_line({}.get), first_line(range(3).index)]
r['class_and_static_methods'] = [first_line(dict.fromkeys), first_line(bytes.fromhex), first_line(int.from_bytes),
                                 first_line(str.maketrans)]
r['an_exception_inherits_add_note'] = [first_line(ValueError('x').add_note), first_line(KeyError.with_traceback)]
r['the_descriptors'] = [first_line(property.getter), first_line(slice.indices)]
r['a_subclass_inherits_them'] = [Text.upper.__doc__ == str.upper.__doc__, Text('a').split.__doc__ == str.split.__doc__]
r['an_override_keeps_its_own'] = [Overriding.split.__doc__, Overriding('a').split.__doc__, Overriding.upper.__doc__]
r['a_method_docstring_is_the_same_bound_or_not'] = ['a'.split.__doc__ == str.split.__doc__, [].pop.__doc__ == list.pop.__doc__]

EXPECTED = {
    'unbound_methods': ['Return a list of the substrings in the string, using sep as the separator string.',
                        'Number of bits necessary to represent self in binary.', 'Append object to the end of the list.',
                        'Return the value for key if key is in the dictionary, else default.',
                        'Create a string of hexadecimal numbers from a bytes object.',
                        'Return a hexadecimal representation of a floating-point number.', 'Add an element to a set.',
                        'Return number of occurrences of value.', 'Return the data in the buffer as a byte string.',
                        'Return the complex conjugate of its argument. (3-4j).conjugate() == 3+4j.'],
    'bound_methods': ['Return a list of the substrings in the string, using sep as the separator string.',
                      'Return a copy of the string converted to uppercase.',
                      'Number of bits necessary to represent self in binary.', 'Append object to the end of the list.',
                      'Return the value for key if key is in the dictionary, else default.',
                      'rangeobject.index(value) -> integer -- return index of value.'],
    'class_and_static_methods': ['Create a new dictionary with keys from iterable and values set to value.',
                                 'Create a bytes object from a string of hexadecimal numbers.',
                                 'Return the integer represented by the given array of bytes.',
                                 'Return a translation table usable for str.translate().'],
    'an_exception_inherits_add_note': ['Add a note to the exception', 'Set self.__traceback__ to tb and return self.'],
    'the_descriptors': ['Descriptor to obtain a copy of the property with a different getter.',
                        'S.indices(len) -> (start, stop, stride)'],
    'a_subclass_inherits_them': [True, True],
    'an_override_keeps_its_own': [None, None, 'Mine.'],
    'a_method_docstring_is_the_same_bound_or_not': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)[:150]))
    print(SUMMARY)
