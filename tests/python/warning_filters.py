"""The filter list: what goes in it, and what it matches.

A filter is a five-tuple ``(action, message, category, module, lineno)`` and
the list is walked in order, first match wins.  Two things about it are easy
to get subtly wrong, and both change which warnings a program sees.

WHAT MATCHES.  ``message`` and ``module`` are REGEXES, compiled at
filterwarnings() time, and they are applied with ``match`` -- anchored at the
start, not searched for anywhere in the string.  Both halves of that matter in
opposite directions: ``"match"`` does NOT apply to ``"suffix match"``, because
it is anchored; and ``"hex*"`` DOES apply to ``"hex/oct"``, because it is a
regex rather than a literal.  A substring test gets each of those backwards.
The message pattern is case-INSENSITIVE and the module pattern is not.

WHAT GOES IN.  ``simplefilter`` and ``filterwarnings`` insert at the FRONT,
they do not clear -- resetwarnings() is the call that clears.  Re-adding an
equal filter PROMOTES it: the old copy is removed first, so it does not sit
further down the list waiting to be found by a later walk.  With
``append=True`` the rule inverts -- the filter goes at the END, and if an
equal one already exists nothing happens at all, because appending would put
it in the wrong place.

The ``module`` pattern is matched against the module NAME, which
warn_explicit derives from the filename when the caller does not supply one:
the filename with a trailing ``.py`` stripped.  So one pattern covers both
``package.module`` and ``/path/to/package/module.py``.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def check_raises(name, fn, exc_type):
    try:
        fn()
        RESULTS[name] = 'did not raise'
    except BaseException as exc:
        RESULTS[name] = isinstance(exc, exc_type)


def errors_on(message, pattern, category=UserWarning):
    """Does a filter with this message pattern claim this warning?

    Phrased as "does it become an error", which is the least ambiguous way to
    observe a filter: no recording, no output, just raised or not.
    """
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore')
        warnings.filterwarnings('error', pattern, category)
        try:
            warnings.warn(message, category)
        except Warning:
            return True
        return False


# ------------------------------------------------- message matching

check('an_exact_message_matches', lambda: errors_on('match', 'match'), True)
# ...anchored at the START, so a prefix counts and a suffix does not.
check('a_prefix_matches', lambda: errors_on('match prefix', 'match'), True)
check('a_suffix_does_not_match',
      lambda: errors_on('suffix match', 'match'), False)
check('an_unrelated_message_does_not_match',
      lambda: errors_on('something else', 'match'), False)
# It is a REGEX, not a literal: hex* is "he" then any number of "x".
check('the_pattern_is_a_regex', lambda: errors_on('hex/oct', 'hex*'), True)
check('the_pattern_is_not_a_literal',
      lambda: errors_on('nonmatching text', 'hex*'), False)
# Case-insensitive, which the module pattern is not.
check('the_message_pattern_ignores_case',
      lambda: errors_on('MATCH', 'match'), True)
# The empty pattern means "no constraint", not "only the empty string".
check('the_empty_pattern_matches_everything',
      lambda: errors_on('anything at all', ''), True)


# ------------------------------------------------- category matching

def _subclass_matches():
    class Custom(UserWarning):
        pass
    return errors_on('x', '', Custom)


check('a_subclass_matches_its_base', _subclass_matches, True)


def _unrelated_category_does_not_match():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore')
        warnings.filterwarnings('error', '', FutureWarning)
        try:
            warnings.warn('x', UserWarning)
        except Warning:
            return True
        return False


check('an_unrelated_category_does_not_match',
      _unrelated_category_does_not_match, False)


# ------------------------------------------------- the list itself

def _simplefilter_does_not_clear():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('error', UserWarning)
        warnings.simplefilter('ignore', FutureWarning)
        return len(warnings._get_filters())


check('simplefilter_does_not_clear_the_list',
      _simplefilter_does_not_clear, 2)


def _resetwarnings_clears():
    with warnings.catch_warnings():
        warnings.simplefilter('error')
        warnings.resetwarnings()
        return len(warnings._get_filters())


check('resetwarnings_clears_the_list', _resetwarnings_clears, 0)


def _duplicates_are_promoted_not_repeated():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('error', UserWarning)
        one = len(warnings._get_filters())
        warnings.simplefilter('ignore', UserWarning)
        warnings.simplefilter('error', UserWarning)
        return (one, len(warnings._get_filters()),
                warnings._get_filters()[0][0])


# Two distinct filters, the re-added one back at the FRONT -- not three, and
# not left where it was.
check('duplicates_are_promoted_not_repeated',
      _duplicates_are_promoted_not_repeated, (1, 2, 'error'))


def _filterwarnings_promotes_too():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.filterwarnings('error', category=UserWarning)
        warnings.filterwarnings('ignore', category=UserWarning)
        warnings.filterwarnings('error', category=UserWarning)
        return (len(warnings._get_filters()),
                warnings._get_filters()[0][0])


check('filterwarnings_promotes_too', _filterwarnings_promotes_too,
      (2, 'error'))


def _append_goes_last_and_never_duplicates():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore')
        warnings.simplefilter('error', append=True)
        # An equal filter already exists, so this one is dropped rather than
        # appended -- appending would put it in the wrong place.
        warnings.simplefilter('ignore', append=True)
        return (len(warnings._get_filters()),
                warnings._get_filters()[0][0],
                warnings._get_filters()[-1][0])


check('append_goes_last_and_never_duplicates',
      _append_goes_last_and_never_duplicates, (2, 'ignore', 'error'))


def _an_appended_filter_does_not_win():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore')
        warnings.simplefilter('error', append=True)
        try:
            warnings.warn('quiet', UserWarning)
        except Warning:
            return 'raised'
        return 'ignored'


check('an_appended_filter_does_not_win', _an_appended_filter_does_not_win,
      'ignored')


# ------------------------------------------------- module matching

def _module_filter(pattern, filename, module=None):
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('error')
        warnings.filterwarnings('always', module=pattern)
        try:
            if module is None:
                # OMITTED, not passed as None.  In CPython those are different
                # calls: the derivation from the filename happens only when the
                # argument is absent, and passing None explicitly suppresses
                # the warning entirely.  Not a behaviour worth copying, but
                # worth not tripping over.
                warnings.warn_explicit('msg', UserWarning, filename, 42)
            else:
                warnings.warn_explicit('msg', UserWarning, filename, 42,
                                       module=module)
        except Warning:
            return 'error'
        return 'always'


# An explicitly named module matches the pattern...
check('an_explicit_module_matches',
      lambda: _module_filter(r'package\.module\z', 'filename',
                             'package.module'), 'always')
# ...and one that does not falls through to the simplefilter('error').
check('a_different_module_does_not_match',
      lambda: _module_filter(r'package\.module\z', 'filename',
                             'other.package.module'), 'error')
# With no module given it is derived from the FILENAME, minus a .py suffix --
# so the same pattern covers the file form.
check('the_module_is_derived_from_the_filename',
      lambda: _module_filter(r'/path/to/package/module\z',
                             '/path/to/package/module.py'), 'always')
check('the_derived_module_keeps_the_rest_of_the_path',
      lambda: _module_filter(r'/path/to/package/module\z',
                             '/path/to/otherpackage/module.py'), 'error')
# The module pattern is anchored at the start like the message one.
check('the_module_pattern_is_anchored',
      lambda: _module_filter('package', 'filename', 'package.module'),
      'always')
check('the_module_pattern_is_not_searched',
      lambda: _module_filter('package', 'filename', 'other.package.module'),
      'error')


# ------------------------------------------------- argument validation

check_raises('an_invalid_action_is_a_value_error',
             lambda: warnings.filterwarnings(action='foo'), ValueError)
check_raises('a_non_string_message_is_a_type_error',
             lambda: warnings.filterwarnings('ignore', message=0), TypeError)
check_raises('a_non_class_category_is_a_type_error',
             lambda: warnings.filterwarnings('ignore', category=0), TypeError)
check_raises('a_non_warning_category_is_a_type_error',
             lambda: warnings.filterwarnings('ignore', category=int), TypeError)
check_raises('a_non_string_module_is_a_type_error',
             lambda: warnings.filterwarnings('ignore', module=0), TypeError)
check_raises('a_non_int_lineno_is_a_type_error',
             lambda: warnings.filterwarnings('ignore', lineno=int), TypeError)
check_raises('a_negative_lineno_is_a_value_error',
             lambda: warnings.filterwarnings('ignore', lineno=-1), ValueError)
check_raises('simplefilter_validates_the_action',
             lambda: warnings.simplefilter(action='foo'), ValueError)
check_raises('simplefilter_validates_the_lineno_type',
             lambda: warnings.simplefilter('ignore', lineno=int), TypeError)
check_raises('simplefilter_validates_the_lineno_sign',
             lambda: warnings.simplefilter('ignore', lineno=-1), ValueError)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
