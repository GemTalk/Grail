"""Fixtures for ``Ellipsis'' as a real singleton of a real ``ellipsis'' type.

Driven by PythonTests>>EllipsisSingletonTestCase.  Each check answers True when
Grail agrees with CPython.

WHAT WAS WRONG.  Grail modelled ``Ellipsis'' as the interned SYMBOL #'...'.
That made ``... is Ellipsis'' true and stopped there; everything else about the
value was wrong, and wrong in the way that reads as plausible:

    type(...)              Symbol      CPython: <class 'ellipsis'>
    repr(...)              "'...'"     CPython: 'Ellipsis'
    isinstance(..., str)   True        CPython: False
    ... == '...'           True        CPython: False

The str-ness is the damaging one.  Any code that sifts a heterogeneous sequence
with ``isinstance(x, str)'' keeps the ellipsis and treats it as a name --
including CPython's own traceback.py, which does exactly that to a ``__dir__''
result before offering a "Did you mean" suggestion.  That is how this was found:
a suggestion test whose custom ``__dir__'' returns ``[..., "bluch"]''.

WHAT IT IS NOW.  A one-instance class named ``ellipsis'' (lowercase, because
``type(...).__name__'' must answer that), whose singleton is bound to the
``Ellipsis'' global and which a ``...'' literal compiles to.

Run this file under CPython (``python3 tests/python/ellipsis_singleton.py'') to
see what it produces -- that is where the expectations come from.
"""

import copy
import pickle
import types


class CustomDir:
    """The shape that found the defect: a ``__dir__'' mixing ... with names."""

    def __dir__(self):
        return [..., "bluch"]


# --- identity and type ---------------------------------------------------

def the_literal_is_the_ellipsis_singleton():
    return (...) is Ellipsis


def its_type_is_named_ellipsis():
    return type(...).__name__ == 'ellipsis'


def types_ellipsistype_is_that_type():
    """``types.EllipsisType'' is a spelling of the type, not a separate class."""
    return types.EllipsisType is type(...)


def it_is_an_instance_of_ellipsistype():
    return isinstance(..., types.EllipsisType)


def calling_the_type_answers_the_same_object():
    """A second instance of a singleton type would make ``is'' silently wrong."""
    return type(...)() is Ellipsis


# --- what it is NOT ------------------------------------------------------

def it_is_not_a_string():
    return isinstance(..., str) is False


def it_does_not_equal_its_own_spelling():
    return (... == '...') is False


def a_dir_result_filters_it_out_as_a_non_string():
    """The exact operation CPython's suggestion machinery performs."""
    return sorted(x for x in CustomDir().__dir__() if isinstance(x, str)) == ['bluch']


# --- representation ------------------------------------------------------

def repr_is_the_capitalised_name():
    return repr(...) == 'Ellipsis'


def str_falls_through_to_repr():
    return str(...) == 'Ellipsis'


def format_falls_through_too():
    return format(...) == 'Ellipsis'


# --- protocol ------------------------------------------------------------

def it_is_truthy():
    return bool(...) is True


def it_is_hashable_and_usable_as_a_key():
    return {...: 'v'}[...] == 'v'


def ordering_it_raises_typeerror():
    try:
        ... < ...
    except TypeError as e:
        return 'ellipsis' in str(e)
    return False


# --- round trips ---------------------------------------------------------

def reduce_answers_the_name_to_save_it_under():
    return (...).__reduce__() == 'Ellipsis'


def copy_preserves_identity():
    return copy.copy(...) is Ellipsis and copy.deepcopy(...) is Ellipsis


def pickle_round_trips_to_the_same_object():
    """Depends on the STRING form of __reduce__ reaching save_global with its
    name -- the singleton has no __name__ of its own to fall back on."""
    return pickle.loads(pickle.dumps(...)) is Ellipsis


# --- a documented divergence --------------------------------------------

def dir_does_not_raise_on_an_unsortable_dir():
    """CPython's ``dir()'' SORTS its result and so raises TypeError when a custom
    ``__dir__'' mixes ... in with strings (gh-131001, gh-139933 -- upstream
    worked around it in traceback.py rather than fixing dir()).  Grail's dir()
    does not raise.  Kept as a check so the difference is recorded rather than
    discovered again; matching it would mean making a working call start
    raising, for a behaviour upstream itself treats as a wart."""
    return "bluch" in dir(CustomDir())


if __name__ == '__main__':
    checks = [
        the_literal_is_the_ellipsis_singleton,
        its_type_is_named_ellipsis,
        types_ellipsistype_is_that_type,
        it_is_an_instance_of_ellipsistype,
        calling_the_type_answers_the_same_object,
        it_is_not_a_string,
        it_does_not_equal_its_own_spelling,
        a_dir_result_filters_it_out_as_a_non_string,
        repr_is_the_capitalised_name,
        str_falls_through_to_repr,
        format_falls_through_too,
        it_is_truthy,
        it_is_hashable_and_usable_as_a_key,
        ordering_it_raises_typeerror,
        reduce_answers_the_name_to_save_it_under,
        copy_preserves_identity,
        pickle_round_trips_to_the_same_object,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    # CPython's dir() raises here; Grail's does not.  See the docstring.
    print('--- documented divergence: CPython dir() raises, Grail does not ---')
    try:
        answer = dir_does_not_raise_on_an_unsortable_dir()
    except TypeError:
        answer = False
    print('%-5s %s' % ('XPASS' if answer is True else 'XFAIL',
                       'dir_does_not_raise_on_an_unsortable_dir'))
