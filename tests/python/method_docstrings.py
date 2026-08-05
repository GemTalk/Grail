"""Fixture for MethodDocstringTestCase.

A class-body ``def`` compiles to a Smalltalk METHOD, not a block, so it cannot
carry the def-time ``___pyNamed___:doc:`` stamp that gives a nested def its
``__doc__``.  Before ClassDefAst emitted a ___methodDocTable___, the read fell
through to Object's own __doc__ and EVERY method claimed to be documented as
"The base class of the class hierarchy...".
"""


class Documented:
    """class docstring"""

    def meth(self):
        """method docstring"""
        return 1

    def undocumented(self):
        return 1

    @property
    def prop(self):
        """property docstring"""
        return 2

    @staticmethod
    def stat():
        """static docstring"""

    @classmethod
    def cls_m(cls):
        """classmethod docstring"""


class Undocumented:
    def meth(self):
        return 1


class Sub(Documented):
    pass


class Override(Documented):
    def meth(self):
        """overridden docstring"""
        return 3


def method_docstrings():
    """Every shape of class-body def reports its own docstring."""
    return [Documented.meth.__doc__,
            Documented.prop.__doc__,
            Documented.stat.__doc__,
            Documented.cls_m.__doc__]


def bound_matches_unbound():
    """A bound access reports the same docstring as the unbound one."""
    d = Documented()
    return [d.meth.__doc__ == Documented.meth.__doc__,
            d.meth.__doc__]


def undocumented_is_none():
    """None, not Object's docstring -- the whole point.  Also for a class
    that has no ___methodDocTable___ at all, since the table is only emitted
    for classes with at least one documented method."""
    return [Documented.undocumented.__doc__ is None,
            Undocumented.meth.__doc__ is None,
            Undocumented().meth.__doc__ is None]


def class_docstrings_still_work():
    return [Documented.__doc__, Undocumented.__doc__ is None]


def inherited_reports_defining_class():
    """The walk climbs to where the method was defined, and an override
    reports its own."""
    return [Sub.meth.__doc__, Override.meth.__doc__]


def nested_def_unaffected():
    """A nested def carries the def-time stamp and always worked."""
    def inner():
        """inner docstring"""
    def bare():
        pass
    return [inner.__doc__, bare.__doc__ is None]


# --- builtins, whose docstrings come from a hand-declared table -------------


def builtin_docstrings():
    """CPython's own text, not a paraphrase.  A Grail builtin is a Smalltalk
    method, so no FunctionDefAst ran for it and there is nothing for
    ClassDefAst's table to capture; builtins_docstrings.gs declares the table
    for the builtins module by hand."""
    return [max.__doc__.startswith('max('),
            len.__doc__ == 'Return the number of items in a container.',
            abs.__doc__ == 'Return the absolute value of the argument.']


def builtin_without_docstring_is_none():
    """CPython gives exit/quit no docstring either, so the answer is None --
    the point being that it is not Object's docstring."""
    return exit.__doc__ is None


def update_wrapper_copies_builtin_doc():
    """The reason this matters: functools.update_wrapper copies __doc__, so a
    missing builtin docstring propagated onto every wrapper around a builtin.
    This is test_functools TestUpdateWrapper/TestWraps.test_builtin_update."""
    import functools

    def wrapper():
        pass
    functools.update_wrapper(wrapper, max)
    return [wrapper.__name__, wrapper.__doc__.startswith('max(')]
