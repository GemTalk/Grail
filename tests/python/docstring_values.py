"""Docstrings reach __doc__ as CPython 3.13+ stores them.

Two defects.  A module-level def compiles to a method of the module class,
and its docstring had nowhere to go: BoundMethod>>__doc__ looks for a
___methodDocTable___ on the class, which a class body has and a module never
did, so every module-level function answered None -- and numpy.ma, which
rewrites np.fromfunction's docstring as it imports
(``f.__doc__ = f.__doc__.replace(...)''), failed.  And no docstring was
cleaned: CPython 3.13's compiler expands tabs and removes the common
indentation (_PyCompile_CleanDoc), and Grail kept it.  A def that redefines
a name without a docstring also kept the first def's.
"""


def ident(f):
    return f


def set_module(name):
    def decorate(f):
        f.__module__ = name
        return f
    return decorate


def finalize(f):
    """numpy's finalize_array_function_like, cut down."""
    f.__doc__ = f.__doc__.replace('${LIKE}', 'like : array_like')
    return f


def plain():
    """Plain doc."""


def undocumented():
    return 1


@ident
def decorated():
    """Decorated doc."""


@finalize
@set_module('numpy')
def fromfunction(function, shape, *, dtype=float, like=None, **kwargs):
    """
    Construct an array.

    ${LIKE}
    """


async def coroutine_function():
    """Async doc."""


def redefined():
    """First."""


def redefined():
    return 2


def assigned():
    """Before."""


assigned.__doc__ = 'After.'


class Documented:
    """
    Class doc.
      indented
    """

    def method(self):
        """
        Method doc.
        """

    def redefined(self):
        """First."""

    def redefined(self):
        return 2


def tabbed():
	"""Tabbed.
	second"""


def one_line():
    """   Leading spaces stay off."""


def outer():
    def inner():
        """
        Nested.
        """
    return inner


def a_module_function_has_its_docstring():
    return plain.__doc__ == 'Plain doc.'


def a_function_without_one_answers_none():
    return undocumented.__doc__ is None


def a_decorated_function_keeps_it():
    return decorated.__doc__ == 'Decorated doc.'


def a_decorator_can_rewrite_it():
    # 3.13+ dedents a docstring when it compiles it.
    return fromfunction.__doc__ == '\nConstruct an array.\n\nlike : array_like\n'


def an_async_function_has_its_docstring():
    return coroutine_function.__doc__ == 'Async doc.'


def a_later_def_replaces_it():
    return redefined.__doc__ is None


def an_assignment_wins():
    return assigned.__doc__ == 'After.'


def a_method_docstring_is_cleaned():
    return Documented.method.__doc__ == '\nMethod doc.\n'


def a_class_docstring_is_cleaned():
    return Documented.__doc__ == '\nClass doc.\n  indented\n'


def a_nested_docstring_is_cleaned():
    return outer().__doc__ == '\nNested.\n'


def tabs_are_expanded_first():
    return tabbed.__doc__ == 'Tabbed.\nsecond'


def a_first_line_loses_its_leading_spaces():
    return one_line.__doc__ == 'Leading spaces stay off.'


def a_redefined_method_has_the_later_docstring():
    return Documented.redefined.__doc__ is None


class WithProperty:
    @property
    def value(self):
        """the getter's docstring"""
        return 1

    @value.setter
    def value(self, v):
        pass

    @value.deleter
    def value(self):
        pass


class PropertySubclass(WithProperty):
    @WithProperty.value.getter
    def value(self):
        """the subclass getter's docstring"""
        return 2

    @value.setter
    def value(self, v):
        pass


def a_property_setter_keeps_the_getter_docstring():
    return WithProperty.value.__doc__ == "the getter's docstring"


def a_subclass_property_keeps_its_getter_docstring():
    return PropertySubclass.value.__doc__ == "the subclass getter's docstring"


CHECKS = [
    a_module_function_has_its_docstring,
    a_function_without_one_answers_none,
    a_decorated_function_keeps_it,
    a_decorator_can_rewrite_it,
    an_async_function_has_its_docstring,
    a_later_def_replaces_it,
    an_assignment_wins,
    a_method_docstring_is_cleaned,
    a_class_docstring_is_cleaned,
    a_nested_docstring_is_cleaned,
    tabs_are_expanded_first,
    a_first_line_loses_its_leading_spaces,
    a_redefined_method_has_the_later_docstring,
    a_property_setter_keeps_the_getter_docstring,
    a_subclass_property_keeps_its_getter_docstring,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
