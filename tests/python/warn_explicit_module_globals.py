"""``warn_explicit(module_globals=...)`` -- how a warning finds its loader.

``module_globals`` exists so the warning machinery can fetch the SOURCE LINE
to display, which means finding the module's loader and asking it for the
source.  Finding the loader is the whole of what is tested here, because
CPython grew a compatibility tangle around it: ``__loader__`` was the original
home, ``__spec__.loader`` replaced it, and the transition (gh-86298, gh-97850)
has to cope with globals carrying either, both, or a disagreeing pair.

The rules do NOT live in ``_warnings``.  They live in
``importlib._bootstrap_external._bless_my_loader``, which ``_warnings.c`` calls
-- visible in the DeprecationWarning's filename, which points at
``<frozen importlib._bootstrap_external>`` rather than at the caller.  The pure
Python ``warnings.py`` skips the whole thing, which is why test_warnings runs
these cases only against the accelerated module and lets the Py variant
degrade to "one warning, no complaints".

Three outcomes, and which one you get depends on whether ``__loader__`` is
usable:

* ``__loader__`` is a real object -- it wins, and any disagreement with
  ``__spec__.loader`` is announced with a DeprecationWarning.
* ``__loader__`` is absent or None -- ``__spec__.loader`` must supply one, and
  failing to is an ERROR: AttributeError when the attribute is missing,
  ValueError when it is present but None.  The asymmetry looks arbitrary and
  is load-bearing; test_warnings pins both.
* Neither is present at all -- silence.  Empty globals are legal and must not
  raise.

Two quirks below are worth the reading, because a reimplementation gets them
wrong by writing the OBVIOUS thing:

* the sentinel test is ``spec_loader in (missing, None)``, and ``in`` compares
  with ``==``.  A loader whose ``__eq__`` answers True to everything therefore
  looks like the sentinel and takes the "missing" branch.
* the disagreement test is ``loader != spec_loader``, not ``is not``.  One
  object stored in both places still disagrees with itself if its ``__eq__``
  says so.

Every expectation below was checked against CPython 3.14.
"""

import types
import warnings

RESULTS = {}

MISSING_MSG = 'Module globals is missing a __spec__.loader'
DISAGREE_MSG = 'Module globals; __loader__ != __spec__.loader'


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def emit(module_globals, filt='always'):
    """Return the recorded (category name, message) pairs, or the raise.

    A raise is returned as a string rather than propagating so that a single
    ``check`` can pin either outcome; the error cases are as much the point
    here as the warning ones.
    """
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter(filt)
        try:
            warnings.warn_explicit('eggs', UserWarning, 'bar', 1,
                                   module_globals=module_globals)
        except BaseException as exc:
            return '%s: %s' % (type(exc).__name__, exc)
        return [(rec.category.__name__, str(rec.message)) for rec in w]


PLAIN = [('UserWarning', 'eggs')]
MISSING = [('DeprecationWarning', MISSING_MSG)] + PLAIN
DISAGREE = [('DeprecationWarning', DISAGREE_MSG)] + PLAIN


def ns(**kwargs):
    return types.SimpleNamespace(**kwargs)


# ------------------------------------------------- module_globals itself

# bpo-33509: None means "not supplied" and must not crash.
check('none_is_not_a_crash', lambda: emit(None), PLAIN)
# Anything that is not a dict is rejected before the lookup starts.  True is
# the shape test_warnings uses -- a bool, not an obviously wrong type.
check('true_is_rejected', lambda: emit(True),
      "TypeError: module_globals must be a dict, not 'bool'")
check('a_list_is_rejected', lambda: emit([1, 2, 3]),
      "TypeError: module_globals must be a dict, not 'list'")
# An empty dict is legal: nothing to find, nothing to complain about.
check('empty_dict_is_silent', lambda: emit({}), PLAIN)


# ------------------------------------------------- neither is usable

check('no_loader_no_spec_is_silent',
      lambda: emit({'__name__': 'bar'}), PLAIN)
check('loader_none_no_spec_is_silent',
      lambda: emit({'__name__': 'bar', '__loader__': None}), PLAIN)


# ------------------------------------------------- __loader__ absent: errors

# A __spec__ that is present but None cannot supply a loader, and with no
# __loader__ to fall back on that is a ValueError.
check('spec_none_without_loader_raises_value_error',
      lambda: emit({'__name__': 'bar', '__spec__': None}),
      'ValueError: ' + MISSING_MSG)
check('loader_none_spec_none_raises_value_error',
      lambda: emit({'__name__': 'bar', '__loader__': None, '__spec__': None}),
      'ValueError: ' + MISSING_MSG)
check('loader_none_spec_loader_none_raises_value_error',
      lambda: emit({'__name__': 'bar', '__loader__': None,
                    '__spec__': ns(loader=None)}),
      'ValueError: ' + MISSING_MSG)
# ...but a __spec__ with no ``loader`` ATTRIBUTE at all is an AttributeError.
# Same message, different type: the distinction is whether the attribute was
# missing or merely None.
check('spec_without_loader_attr_raises_attribute_error',
      lambda: emit({'__name__': 'bar', '__spec__': ns()}),
      'AttributeError: ' + MISSING_MSG)
# A usable __spec__.loader needs no __loader__ beside it.
check('spec_loader_alone_is_silent',
      lambda: emit({'__name__': 'bar', '__spec__': ns(loader=object())}),
      PLAIN)


# ------------------------------------------------- __loader__ present

# A real __loader__ turns every "missing" case from an error into a
# DeprecationWarning: the old attribute still works, it is just on notice.
check('loader_without_spec_deprecates',
      lambda: emit({'__name__': 'bar', '__loader__': object()}), MISSING)
check('loader_with_spec_none_deprecates',
      lambda: emit({'__name__': 'bar', '__loader__': object(),
                    '__spec__': None}), MISSING)
check('loader_with_spec_lacking_loader_deprecates',
      lambda: emit({'__name__': 'bar', '__loader__': object(),
                    '__spec__': ns()}), MISSING)
check('loader_with_spec_loader_none_deprecates',
      lambda: emit({'__name__': 'bar', '__loader__': object(),
                    '__spec__': ns(loader=None)}), MISSING)
# Two different loaders is the OTHER message -- the transition's real hazard.
check('two_different_loaders_disagree',
      lambda: emit({'__name__': 'bar', '__loader__': object(),
                    '__spec__': ns(loader=object())}), DISAGREE)


def _same_object_in_both():
    loader = object()
    return emit({'__name__': 'bar', '__loader__': loader,
                 '__spec__': ns(loader=loader)})


check('one_loader_in_both_places_is_silent', _same_object_in_both, PLAIN)


# ------------------------------------------------- the two comparison quirks

class EqAlways:
    """Equal to everything -- including the missing-loader sentinel."""

    def __eq__(self, other):
        return True


class EqNever:
    """Equal to nothing -- including itself."""

    def __eq__(self, other):
        return False


def _eq_always_looks_missing():
    # The sentinel test is ``spec_loader in (missing, None)``, and ``in``
    # compares with ==.  So a spec loader equal to everything IS the sentinel
    # as far as that test can tell, and the "missing" branch fires even though
    # a perfectly good object is sitting there.
    return emit({'__name__': 'bar', '__loader__': EqAlways(),
                 '__spec__': ns(loader=EqAlways())})


check('eq_always_takes_the_missing_branch', _eq_always_looks_missing, MISSING)


def _eq_never_disagrees_with_itself():
    # The disagreement test is ``loader != spec_loader``, not ``is not``.  One
    # object stored in both places therefore still disagrees.
    loader = EqNever()
    return emit({'__name__': 'bar', '__loader__': loader,
                 '__spec__': ns(loader=loader)})


check('eq_never_disagrees_with_itself', _eq_never_disagrees_with_itself,
      DISAGREE)


# ------------------------------------------------- how it composes

# The DeprecationWarning arrives BEFORE the warning that was actually asked
# for -- it is emitted while the loader is being resolved, which happens
# first.
check('the_deprecation_comes_first',
      lambda: emit({'__name__': 'bar', '__loader__': object()})[0][0],
      'DeprecationWarning')
# An error case emits NOTHING: the raise happens before the requested warning
# is ever shown.
check('an_error_suppresses_the_warning',
      lambda: emit({'__name__': 'bar', '__spec__': None}).startswith('ValueError'),
      True)


def _deprecation_obeys_filters():
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter('always')
        warnings.filterwarnings('ignore', category=DeprecationWarning)
        warnings.warn_explicit('eggs', UserWarning, 'bar', 1,
                               module_globals={'__name__': 'bar',
                                               '__loader__': object()})
        return [(rec.category.__name__, str(rec.message)) for rec in w]


# It is an ordinary warning, not a diagnostic: silencing DeprecationWarning
# silences it and leaves the requested warning alone.
check('the_deprecation_obeys_filters', _deprecation_obeys_filters, PLAIN)

# __name__ is only needed to ASK the loader for source; the loader checks run
# without it.
check('name_is_not_required_for_the_checks',
      lambda: emit({'__loader__': object(), '__spec__': ns(loader=object())}),
      DISAGREE)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
