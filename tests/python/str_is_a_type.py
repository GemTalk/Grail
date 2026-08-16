"""``str`` is a TYPE, and the bare name must evaluate to it.

Driven by PythonTests>>StrIsATypeTestCase.

Grail published a ``str:`` fast-path method on builtins, and NameAst treats any
name builtins publishes a method for as a fast-path builtin -- so the bare name
``str`` evaluated to a BoundMethod WRAPPER rather than the string class.  The
wrapper was well camouflaged: ``isinstance(x, str)``, ``str('x')``,
``str.__name__``, ``issubclass(str, object)`` and even ``class S(str)`` all
worked, which is why it survived so long.  What gave it away was ``dir(str)``,
which described a function object -- 53 of str's names missing -- and
``type('a') is str``, which was False.

Every check below is ordinary CPython behaviour; none is Grail-specific.  Run it
directly (``python3 tests/python/str_is_a_type.py``) and every line is OK there.

The identity checks are the point.  The constructor checks are here because
removing the fast path moved str()'s semantics into str.__new__, and those are
the cases that semantics has to keep getting right -- a str subclass coercing
DOWN to a plain str, and a wide string surviving without being narrowed.
"""


class FooStr(str):
    pass


class StrEnumLike(str):
    def __str__(self):
        return 'overridden'


def the_name_str_is_the_string_type():
    return type('a') is str


def str_is_a_type_not_a_function():
    return isinstance(str, type)


def dir_str_lists_its_methods():
    d = dir(str)
    return all(n in d for n in
               ('capitalize', 'upper', 'find', 'encode', '__add__', '__len__'))


def str_of_no_arguments_is_empty():
    return str() == ''


def str_of_a_string_is_that_string():
    return str('x') == 'x'


def str_of_a_number_is_its_text():
    return str(42) == '42' and str(1.5) == '1.5'


def str_of_none_is_the_word_none():
    return str(None) == 'None'


def str_of_a_list_is_its_repr():
    return str([1, 2]) == '[1, 2]'


def str_of_a_subclass_is_a_plain_str():
    """CPython's str(subclass_instance) is exactly str, never the subclass.
    Without the coercion, FooStr.__float__ calling str(self) gets another
    FooStr back and recurses forever."""
    r = str(FooStr('abc'))
    return r == 'abc' and type(r) is str


def str_honours_an_overriding_dunder_str():
    """A subclass that overrides __str__ is honoured -- the character content is
    NOT what str() answers.  This is the shape a str-mixin enum member has."""
    return str(StrEnumLike('raw')) == 'overridden'


def a_wide_string_survives_str():
    """Characters outside Latin-1 must not be narrowed on the way through."""
    w = 'café 中文'
    r = str(w)
    return r == w and len(r) == 7


def isinstance_still_works():
    return isinstance('a', str) and not isinstance(1, str)


def subclassing_still_works():
    return FooStr('a') == 'a' and isinstance(FooStr('a'), str)


def str_is_reachable_as_a_builtin_attribute():
    import builtins
    return builtins.str is str


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        the_name_str_is_the_string_type,
        str_is_a_type_not_a_function,
        dir_str_lists_its_methods,
        str_of_no_arguments_is_empty,
        str_of_a_string_is_that_string,
        str_of_a_number_is_its_text,
        str_of_none_is_the_word_none,
        str_of_a_list_is_its_repr,
        str_of_a_subclass_is_a_plain_str,
        str_honours_an_overriding_dunder_str,
        a_wide_string_survives_str,
        isinstance_still_works,
        subclassing_still_works,
        str_is_reachable_as_a_builtin_attribute,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
