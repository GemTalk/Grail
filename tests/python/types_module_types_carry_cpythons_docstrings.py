"""Fixture: the types the types module names carry CPython's docstrings.

``types.CodeType.__doc__'' is ``Create a code object.  Not for the faint of
heart.'' in CPython, and GeneratorType's is None.  These are the C types of
code, cells, frames, generators, modules and None, which builtins does not
bind; Grail implements most of them in Smalltalk, and they answered object's
docstring.  FunctionType answered None and MethodType a note of Grail's own.
An instance reads its type's docstring, and a class a program writes under
one of these names keeps its own.  Every check holds under CPython 3.14, which
is what makes it evidence.
"""

import sys
import types

r = {}


def first_line(cls):
    doc = cls.__doc__
    return doc.splitlines()[0] if isinstance(doc, str) else doc


def generator():
    yield 1


class code:
    pass


r['the_code_and_frame_types'] = [first_line(types.CodeType), first_line(types.CellType), first_line(types.FrameType),
                                 first_line(types.TracebackType)]
r['the_generator_types_have_none'] = [types.GeneratorType.__doc__, types.CoroutineType.__doc__,
                                      types.AsyncGeneratorType.__doc__]
r['the_singletons_types'] = [first_line(types.NoneType), first_line(types.NotImplementedType),
                             first_line(types.EllipsisType)]
r['the_function_and_method_types'] = [first_line(types.FunctionType), first_line(types.LambdaType),
                                      first_line(types.MethodType)]
r['the_function_types_whole_text'] = (types.FunctionType.__doc__ or '').count('\n')
r['the_module_and_mapping_types'] = [first_line(types.ModuleType), first_line(types.MappingProxyType)]
r['the_generic_and_union_types'] = [first_line(types.GenericAlias), first_line(types.UnionType)]
r['an_instance_reads_its_types'] = [first_line(type(None)) == None.__doc__.splitlines()[0],
                                    (lambda: 0).__code__.__doc__ == types.CodeType.__doc__,
                                    type(sys).__doc__ == types.ModuleType.__doc__, generator().__doc__,
                                    type(lambda: 0).__doc__ == types.FunctionType.__doc__]
r['a_programs_class_named_code_keeps_its_own'] = code.__doc__

EXPECTED = {
    'the_code_and_frame_types': ['Create a code object.  Not for the faint of heart.', 'Create a new cell object.', None,
                                 'Create a new traceback object.'],
    'the_generator_types_have_none': [None, None, None],
    'the_singletons_types': ['The type of the None singleton.', 'The type of the NotImplemented singleton.',
                             'The type of the Ellipsis singleton.'],
    'the_function_and_method_types': ['Create a function object.', 'Create a function object.',
                                      'Create a bound instance method object.'],
    'the_function_types_whole_text': 13,
    'the_module_and_mapping_types': ['Create a module object.', 'Read-only proxy of a mapping.'],
    'the_generic_and_union_types': ['Represent a PEP 585 generic type', 'Represent a union type'],
    'an_instance_reads_its_types': [True, True, True, None, True],
    'a_programs_class_named_code_keeps_its_own': None,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)[:150]))
    print(SUMMARY)
