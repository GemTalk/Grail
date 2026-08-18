"""The internal surface CPython's warnings publishes, and the filter tuple.

CPython 3.14 splits warnings into ``_py_warnings`` (pure Python) and a
``_warnings`` accelerator, and its helpers read every global off ``_wm``, the
module ``_set_module`` points at.  test.test_warnings drives BOTH
implementations through that surface, so a Grail warnings missing it fails on
the plumbing before reaching any behaviour.

Three things are pinned here.

THE FILTER TUPLE IS ``(action, message, category, module, lineno)``.  Grail
built the same five fields with the category second and the message third.
That is invisible while nothing outside warnings.gs reads the list, and wrong
the moment something does -- _py_warnings' ``_add_filter`` and test_warnings
both index these positions directly, so the ORDER is the interop contract.

CALLING THROUGH A VARIABLE.  ``self.module.resetwarnings()`` is how
test_warnings reaches every implementation under test, and a call through a
variable compiles to attribute-load-then-call rather than a direct send.  A
Grail module method that is unary AUTO-INVOKES on the load, so the load
answered None and the call landed on it.  Every public entry needs the varargs
form for this to work; resetwarnings was the last one without.

THE INTERNAL NAMES exist and are of the right kind -- callables callable,
values readable.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------------ the filter tuple

def _pat(x):
    """The pattern TEXT of a filter's message/module slot.

    CPython compiles both to regex objects; Grail keeps the string and matches
    it as a substring (message) or a prefix (module), a deviation documented at
    warnings.gs>>_actionFor:.  The slot's POSITION is what this file pins, so
    read through whichever the implementation stores.
    """
    return getattr(x, 'pattern', x)


def _filter_shape():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.filterwarnings('error', message='msg', category=UserWarning,
                                module='mod', lineno=7)
        f = warnings.filters[0]
        return (f[0], _pat(f[1]), f[2] is UserWarning, _pat(f[3]), f[4])


check('filter_tuple_is_cpython_order', _filter_shape,
      ('error', 'msg', True, 'mod', 7))


def _simplefilter_shape():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('ignore', DeprecationWarning)
        f = warnings.filters[0]
        return (f[0], f[2] is DeprecationWarning, len(f))


check('simplefilter_builds_the_same_shape', _simplefilter_shape,
      ('ignore', True, 5))


def _append_goes_last():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.filterwarnings('error', message='first')
        warnings.filterwarnings('ignore', message='second', append=True)
        return (_pat(warnings.filters[0][1]), _pat(warnings.filters[-1][1]))


check('append_puts_it_last', _append_goes_last, ('first', 'second'))


# -------------------------------------------- calling through a variable

def _via_variable():
    """Exactly how test_warnings reaches the module under test."""
    module = warnings
    with module.catch_warnings(record=True) as w:
        module.resetwarnings()
        module.simplefilter('always')
        module.warn('through a variable')
        return len(w)


check('resetwarnings_through_a_variable', _via_variable, 1)


def _get_filters_via_variable():
    module = warnings
    with module.catch_warnings():
        module.resetwarnings()
        module.simplefilter('ignore')
        return len(module._get_filters())


check('get_filters_through_a_variable', _get_filters_via_variable, 1)


# _get_filters must answer the LIVE list, not a copy: CPython's helpers mutate
# it in place through this accessor.
def _get_filters_is_live():
    module = warnings
    with module.catch_warnings():
        module.resetwarnings()
        module.simplefilter('ignore')
        return module._get_filters() is module.filters


check('get_filters_answers_the_live_list', _get_filters_is_live, True)


# -------------------------------------------------- the internal names

CALLABLES = ['_get_filters', '_filters_mutated', '_filters_mutated_lock_held',
             '_acquire_lock', '_release_lock', '_add_filter', '_getcategory',
             '_getaction', '_setoption', '_showwarnmsg', '_showwarnmsg_impl',
             '_formatwarnmsg', '_formatwarnmsg_impl', 'resetwarnings',
             'simplefilter', 'filterwarnings', 'warn', 'warn_explicit',
             'catch_warnings', 'showwarning', 'formatwarning']

VALUES = ['filters', 'defaultaction', 'onceregistry', '_filters_version',
          '_use_context']

CLASSES = ['WarningMessage', '_OptionError']


def _all_present(names):
    return [n for n in names if not hasattr(warnings, n)]


check('every_callable_present', lambda: _all_present(CALLABLES), [])
check('every_value_present', lambda: _all_present(VALUES), [])
check('every_class_present', lambda: _all_present(CLASSES), [])
check('callables_are_callable',
      lambda: [n for n in CALLABLES if not callable(getattr(warnings, n))], [])


check('defaultaction_default', lambda: warnings.defaultaction, 'default')
check('filters_version_is_an_int',
      lambda: isinstance(warnings._filters_version, int), True)


def _mutation_is_announceable():
    """_filters_mutated() is callable and never moves the version backwards.

    NOT "it increments": with the C accelerator in play CPython keeps the
    version in the extension and the Python-visible _filters_version does not
    move, so asserting a bump would pin Grail's behaviour rather than
    CPython's.
    """
    before = warnings._filters_version
    warnings._filters_mutated()
    return warnings._filters_version >= before


check('filters_mutated_is_callable', _mutation_is_announceable, True)


# _getcategory / _getaction are pure lookups over the -W option vocabulary.
check('getcategory_resolves_a_name',
      lambda: warnings._getcategory('UserWarning') is UserWarning, True)
check('getaction_expands_an_abbreviation',
      lambda: warnings._getaction('err'), 'error')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
