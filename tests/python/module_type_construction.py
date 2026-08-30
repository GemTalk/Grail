"""Fixtures for constructing a module object, driven by
PythonTests>>ModuleTypeConstructionTestCase.

``types.ModuleType`` is Grail's ``module`` class, and until this landed it
could not be CALLED.  ``module`` is a SymbolDictionary subclass, so it
inherited KeyValueDictionary's dict-style construction, which reads its
argument as an iterable of (key, value) PAIRS.  A module's argument is its
NAME, so:

  * ``types.ModuleType('probe')`` raised ValueError ("dictionary update
    sequence element #0 has length 1; 2 is required"); and
  * a subclass reaching the base through ``super().__init__(name)`` hit the
    UNCATCHABLE Smalltalk OffsetError "object does not have varying
    instVars" -- it iterated the name's characters and then indexed into a
    Character.  Uncatchable means no Python code could work around it.

The second shape is the one ``six`` uses (``class _LazyModule(
types.ModuleType)``), which is why this sits on the Kaggle dependency chain.

Run under CPython (``python3 tests/python/module_type_construction.py'') to
see what it produces -- that is where the expectations come from.
"""

import types


def a_module_can_be_constructed_by_name():
    return types.ModuleType('probe').__name__ == 'probe'


def a_fresh_modules_doc_is_none():
    return types.ModuleType('probe').__doc__ is None


def the_two_argument_form_sets_the_docstring():
    m = types.ModuleType('probe2', 'a docstring')
    return m.__name__ == 'probe2' and m.__doc__ == 'a docstring'


def a_constructed_module_has_the_module_type():
    m = types.ModuleType('probe')
    return type(m) is types.ModuleType and isinstance(m, types.ModuleType)


def a_constructed_module_holds_attributes():
    """It is a namespace object -- that is the whole point of making one."""
    m = types.ModuleType('probe')
    m.answer = 42
    return getattr(m, 'answer', None) == 42


def a_constructed_module_has_a_dict():
    return hasattr(types.ModuleType('probe'), '__dict__')


def a_subclass_can_construct_through_super():
    """six's shape: class _LazyModule(types.ModuleType) with an __init__
    that calls super().__init__(name).  This raised an UNCATCHABLE
    Smalltalk error, so it could not even be caught and reported."""
    class M(types.ModuleType):
        def __init__(self, name):
            super(M, self).__init__(name)
    return M('probe').__name__ == 'probe'


def a_subclass_keeps_its_own_attributes():
    class M(types.ModuleType):
        def __init__(self, name):
            super(M, self).__init__(name)
            self.marker = 'set-by-subclass'
    m = M('probe')
    return m.marker == 'set-by-subclass' and m.__name__ == 'probe'


def two_constructed_modules_are_independent():
    """Guards the singleton trap: ``module class >> instance'' registers a
    per-class singleton, and building these through it would make every
    types.ModuleType('x') hand back -- and overwrite -- one shared object."""
    a = types.ModuleType('alpha')
    b = types.ModuleType('beta')
    a.tag = 1
    b.tag = 2
    return (a is not b and a.__name__ == 'alpha' and b.__name__ == 'beta'
            and a.tag == 1 and b.tag == 2)


def constructing_a_module_does_not_disturb_a_real_one():
    """A real imported module must not be displaced by a same-named
    construction -- the singleton registry is keyed by CLASS, so this is
    the check that the new path stays out of it."""
    import sys as real_sys
    types.ModuleType('sys')
    return real_sys.__name__ == 'sys' and hasattr(real_sys, 'path')


def the_name_can_be_passed_by_keyword():
    return types.ModuleType(name='probe').__name__ == 'probe'


def the_doc_can_be_passed_by_keyword():
    return types.ModuleType('probe', doc='d').__doc__ == 'd'


def three_positionals_raise_typeerror():
    """CPython: "module() takes at most 2 arguments (3 given)"."""
    try:
        types.ModuleType('a', 'b', 'c')
    except TypeError:
        return True
    return False


def no_arguments_raises_typeerror():
    """CPython: "module() missing required argument 'name' (pos 1)"."""
    try:
        types.ModuleType()
    except TypeError:
        return True
    return False


def a_subclass_without_its_own_init_still_gets_the_name():
    """The route a subclass takes when it does NOT override __init__ --
    six's Module_six_moves_urllib is exactly this shape, and it reaches a
    different Grail entry point than the super().__init__ path above."""
    class M(types.ModuleType):
        pass
    return M('probe').__name__ == 'probe'


CHECKS = [
    a_module_can_be_constructed_by_name,
    a_fresh_modules_doc_is_none,
    the_two_argument_form_sets_the_docstring,
    a_constructed_module_has_the_module_type,
    a_constructed_module_holds_attributes,
    a_constructed_module_has_a_dict,
    a_subclass_can_construct_through_super,
    a_subclass_keeps_its_own_attributes,
    two_constructed_modules_are_independent,
    constructing_a_module_does_not_disturb_a_real_one,
    the_name_can_be_passed_by_keyword,
    the_doc_can_be_passed_by_keyword,
    three_positionals_raise_typeerror,
    no_arguments_raises_typeerror,
    a_subclass_without_its_own_init_still_gets_the_name,
]


def all_checks():
    return [(fn.__name__, fn() is True) for fn in CHECKS]


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
