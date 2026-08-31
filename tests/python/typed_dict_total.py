"""``typing.TypedDict`` and the ``total`` CLASS KEYWORD.

``class Options(TypedDict, total=False)`` is the shape that made
``object.__init_subclass__() takes no keyword arguments`` the third-ranked gap
in docs/Package_Census.md -- it blocked pip's ``filelock`` and ``pyjwt``
outright, and three more packages behind the ``typing`` gap.

The message misdirects, which is why this fixture lives here rather than with
the object-model ones.  PEP 487 sends a class header's leftover keywords to
``__init_subclass__``, and ``object``'s terminal hook rejects any that nobody
consumed.  ``total`` is consumed in CPython by ``_TypedDictMeta.__new__``,
which DECLARES it as a named parameter; a ``TypedDict`` that is a bare class
declares nothing, so ``total`` survives to the end of the chain and is
reported as an object-model defect.  Nothing about ``__init_subclass__`` was
wrong.

Everything below was measured against CPython 3.14.6.  Two known and
deliberate divergences are NOT asserted here, and are recorded in
docs/Issues.md instead: a TypedDict class is a real ``dict`` subclass under
Grail, so calling it answers an instance of that subclass where CPython
answers a plain ``dict``, and ``__mro__`` carries one extra link.
"""

from typing import TypedDict, NotRequired, Required

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


class Movie(TypedDict):
    name: str
    year: int


class Partial(TypedDict, total=False):
    a: int
    b: str


class Mixed(Partial, total=True):
    c: float


class Qualified(TypedDict):
    always: int
    sometimes: NotRequired[str]


class QualifiedPartial(TypedDict, total=False):
    maybe: int
    insisted: Required[str]


check('total_defaults_true', lambda: Movie.__total__, True)
check('total_false_is_honoured', lambda: Partial.__total__, False)
check('total_is_per_class_not_inherited', lambda: Mixed.__total__, True)

check('required_keys_when_total',
      lambda: sorted(Movie.__required_keys__), ['name', 'year'])
check('optional_keys_when_total',
      lambda: sorted(Movie.__optional_keys__), [])
check('required_keys_when_not_total',
      lambda: sorted(Partial.__required_keys__), [])
check('optional_keys_when_not_total',
      lambda: sorted(Partial.__optional_keys__), ['a', 'b'])

check('a_subclass_keeps_the_bases_optional_keys',
      lambda: sorted(Mixed.__optional_keys__), ['a', 'b'])
check('a_subclass_adds_its_own_required_keys',
      lambda: sorted(Mixed.__required_keys__), ['c'])
check('annotations_include_the_inherited_keys',
      lambda: sorted(Mixed.__annotations__), ['a', 'b', 'c'])

check('not_required_overrides_total',
      lambda: sorted(Qualified.__optional_keys__), ['sometimes'])
check('not_required_leaves_the_rest_required',
      lambda: sorted(Qualified.__required_keys__), ['always'])
check('required_overrides_total_false',
      lambda: sorted(QualifiedPartial.__required_keys__), ['insisted'])
check('required_leaves_the_rest_optional',
      lambda: sorted(QualifiedPartial.__optional_keys__), ['maybe'])


def _a_typed_dict_is_a_dict():
    return issubclass(Movie, dict)


check('a_typed_dict_is_a_dict', _a_typed_dict_is_a_dict, True)


def _an_instance_equals_the_plain_dict():
    return Movie(name='Blade Runner', year=1982) == {
        'name': 'Blade Runner', 'year': 1982}


check('an_instance_equals_the_plain_dict',
      _an_instance_equals_the_plain_dict, True)


def _instance_checks_are_refused():
    try:
        isinstance({}, Movie)
    except TypeError as exc:
        return str(exc)
    return 'NOT RAISED'


check('instance_checks_are_refused', _instance_checks_are_refused,
      'TypedDict does not support instance and class checks')


def _the_functional_form_works():
    Point = TypedDict('Point', {'x': int, 'y': int})
    return sorted(Point.__required_keys__)


check('the_functional_form_works', _the_functional_form_works, ['x', 'y'])


def _the_functional_form_takes_total():
    Point = TypedDict('Point', {'x': int, 'y': int}, total=False)
    return (sorted(Point.__optional_keys__), sorted(Point.__required_keys__))


check('the_functional_form_takes_total', _the_functional_form_takes_total,
      (['x', 'y'], []))


def _an_unrelated_class_keyword_is_still_rejected():
    """``total'' is consumed; a typo next to it is not, and must still be the
    TypeError PEP 487 promises -- otherwise the metaclass would be swallowing
    every keyword rather than the one it declares."""
    try:
        class Oops(TypedDict, total=False, tootal=True):
            z: int
    except TypeError as exc:
        return type(exc).__name__
    return 'NOT RAISED'


check('an_unrelated_class_keyword_is_still_rejected',
      _an_unrelated_class_keyword_is_still_rejected, 'TypeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
