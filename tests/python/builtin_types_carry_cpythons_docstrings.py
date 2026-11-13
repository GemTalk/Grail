"""Fixture: a builtin type's __doc__ is CPython's, not object's (#1724).

``int.__doc__'' is ``int([x]) -> integer ...'' in CPython.  In Grail 94 of the
97 types the builtins module binds -- int, str, list, dict, the exceptions --
answered object's docstring, ``The base class of the class hierarchy'', because
they have no class statement to capture one.  help(), pydoc and
inspect.getdoc() all read it.  A class the program defines keeps its own
docstring or None.  Every check holds under CPython 3.14, which is what makes
it evidence.
"""

import builtins
import inspect

r = {}
OBJECT_DOC = object.__doc__


def first_line(cls):
    doc = cls.__doc__
    return doc.splitlines()[0] if isinstance(doc, str) else doc


def builtin_types():
    return sorted(name for name in dir(builtins)
                  if isinstance(getattr(builtins, name), type) and not name.startswith('_'))


class MyInt(int):
    pass


class Documented(ValueError):
    """Mine."""


class MyList(list):
    pass


r['the_numbers'] = [first_line(int), first_line(float), first_line(complex), first_line(bool)]
r['the_containers'] = [first_line(list), first_line(tuple), first_line(dict), first_line(set), first_line(frozenset),
                       first_line(range), first_line(slice), first_line(memoryview)]
r['str_and_the_iterators'] = [first_line(str), first_line(enumerate), first_line(zip), first_line(map),
                              first_line(filter), first_line(reversed)]
r['the_descriptors'] = [first_line(property), first_line(staticmethod), first_line(classmethod), first_line(super)]
r['exceptions'] = [ValueError.__doc__, KeyError.__doc__, StopIteration.__doc__, BaseException.__doc__,
                   FileNotFoundError.__doc__, UnicodeDecodeError.__doc__]
r['exception_group_has_none'] = ExceptionGroup.__doc__
r['no_builtin_type_answers_objects_docstring'] = [name for name in builtin_types()
                                                   if name != 'object' and getattr(builtins, name).__doc__ == OBJECT_DOC]
r['an_instance_reads_its_types'] = [(5).__doc__ == int.__doc__, (1.5).__doc__ == float.__doc__,
                                    True.__doc__ == bool.__doc__, ''.__doc__ == str.__doc__,
                                    b''.__doc__ == bytes.__doc__, range(1).__doc__ == range.__doc__,
                                    [].__doc__ == list.__doc__, ValueError('x').__doc__ == ValueError.__doc__]
r['a_subclass_instance_reads_its_class'] = [MyList().__doc__, MyInt(3).__doc__]
r['inspect_getdoc_finds_it'] = inspect.getdoc(KeyError)
r['a_programs_classes_keep_their_own'] = [MyInt.__doc__, Documented.__doc__, object.__doc__ == OBJECT_DOC]

EXPECTED = {
    'the_numbers': ['int([x]) -> integer', 'Convert a string or number to a floating-point number, if possible.',
                    'Create a complex number from a string or numbers.', 'Returns True when the argument is true, False otherwise.'],
    'the_containers': ['Built-in mutable sequence.', 'Built-in immutable sequence.', 'dict() -> new empty dictionary',
                       'Build an unordered collection of unique elements.',
                       'Build an immutable unordered collection of unique elements.',
                       'range(stop) -> range object', 'slice(stop)', 'Create a new memoryview object which references the given object.'],
    'str_and_the_iterators': ["str(object='') -> str", 'Return an enumerate object.',
                              'The zip object yields n-length tuples, where n is the number of',
                              'Make an iterator that computes the function using arguments from',
                              'Return an iterator yielding those items of iterable for which',
                              'Return a reverse iterator over the values of the given sequence.'],
    'the_descriptors': ['Property attribute.', 'Convert a function to be a static method.',
                        'Convert a function to be a class method.', 'super() -> same as super(__class__, <first argument>)'],
    'exceptions': ['Inappropriate argument value (of correct type).', 'Mapping key not found.',
                   'Signal the end from iterator.__next__().', 'Common base class for all exceptions',
                   'File not found.', 'Unicode decoding error.'],
    'exception_group_has_none': None,
    'no_builtin_type_answers_objects_docstring': [],
    'an_instance_reads_its_types': [True] * 8,
    'a_subclass_instance_reads_its_class': [None, None],
    'inspect_getdoc_finds_it': 'Mapping key not found.',
    'a_programs_classes_keep_their_own': [None, 'Mine.', True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)[:150]))
    print(SUMMARY)
