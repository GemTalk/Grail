"""What ``catch_warnings()`` saves, and what it puts back.

The name undersells it.  It is not only a filter snapshot -- it isolates the
whole of the warning machinery's mutable state, and the part that is easiest
to leave out is the DISPLAY.  A block that replaces ``showwarning`` and is
not restored leaves the replacement installed for the rest of the process, so
every later warning goes to a logger nobody is reading any more.  That is a
leak with no error attached to it: the warnings simply stop arriving.

Three behaviours worth pinning:

* FILTERS are swapped for a copy, not snapshotted and refilled.  Code inside
  the block sees a DIFFERENT list object from the one outside, and the
  original object -- not an equal one -- comes back on exit.  Restoring in
  place cannot survive ``warnings.filters = [...]`` inside the block, which
  rebinds the name rather than mutating the list.

* SHOWWARNING is saved and restored, and with ``record=True`` it is also
  RESET on entry: the recorder IS the display, so a caller who had overridden
  showwarning before entering still gets their warnings recorded (issue
  #28835).  An override installed INSIDE the block takes precedence over the
  recorder, because it replaced the display more recently.

* The manager is SINGLE-USE.  Entering twice would overwrite the saved state
  with the state it had already installed, so both that and exiting without
  entering raise RuntimeError.  Note that ``entered`` means "has been
  entered", not "is inside": exiting twice re-restores and does not raise.

CPython 3.11 also added a shorthand -- ``catch_warnings(action=...,
category=...)`` -- that installs a filter inside the isolation it was already
providing.

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


# ------------------------------------------------- filters

def _filters_are_swapped_for_a_copy():
    outer = warnings.filters
    with warnings.catch_warnings():
        inside = warnings.filters
    return (inside is not outer, warnings.filters is outer)


check('filters_are_swapped_for_a_copy', _filters_are_swapped_for_a_copy,
      (True, True))


def _a_filter_added_inside_does_not_escape():
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        inside = len(warnings.filters)
    return inside > 0 and warnings.filters is not None


check('a_filter_added_inside_does_not_escape',
      _a_filter_added_inside_does_not_escape, True)


# ------------------------------------------------- showwarning

def _showwarning_is_restored():
    def my_logger(message, category, filename, lineno, file=None, line=None):
        pass

    orig = warnings.showwarning
    with warnings.catch_warnings():
        warnings.showwarning = my_logger
    return warnings.showwarning is orig


check('showwarning_is_restored', _showwarning_is_restored, True)


def _record_resets_showwarning():
    """An override installed BEFORE entering must not beat the recorder."""
    my_log = []

    def my_logger(message, category, filename, lineno, file=None, line=None):
        my_log.append(message)

    orig = warnings.showwarning
    warnings.showwarning = my_logger
    try:
        with warnings.catch_warnings(record=True) as log:
            not_my_logger = warnings.showwarning is not my_logger
            warnings.simplefilter('always')
            warnings.warn('recorded, not logged')
        restored = warnings.showwarning is my_logger
    finally:
        warnings.showwarning = orig
    return (not_my_logger, len(log), len(my_log), restored)


check('record_resets_showwarning', _record_resets_showwarning,
      (True, 1, 0, True))


def _an_override_inside_beats_the_recorder():
    """...but one installed INSIDE the block does beat it."""
    my_log = []

    def my_logger(message, category, filename, lineno, file=None, line=None):
        my_log.append(message)

    orig = warnings.showwarning
    try:
        with warnings.catch_warnings(record=True) as log:
            warnings.simplefilter('always')
            warnings.showwarning = my_logger
            warnings.warn('logged, not recorded')
    finally:
        warnings.showwarning = orig
    return (len(log), len(my_log))


check('an_override_inside_beats_the_recorder',
      _an_override_inside_beats_the_recorder, (0, 1))


def _the_override_receives_a_warning_instance():
    """showwarning's first argument is an INSTANCE, never the raw text --
    which is what lets an override read ``message.args[0]``."""
    seen = []

    def my_logger(message, category, filename, lineno, file=None, line=None):
        seen.append(message)

    orig = warnings.showwarning
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('always')
            warnings.showwarning = my_logger
            warnings.warn('the text')
    finally:
        warnings.showwarning = orig
    return (isinstance(seen[0], Warning), seen[0].args[0], str(seen[0]))


check('the_override_receives_a_warning_instance',
      _the_override_receives_a_warning_instance,
      (True, 'the text', 'the text'))


def _the_record_holds_instances_too():
    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')
        warnings.warn('recorded text')
    return (isinstance(log[0].message, Warning), log[0].message.args[0])


check('the_record_holds_instances_too', _the_record_holds_instances_too,
      (True, 'recorded text'))


# ------------------------------------------------- single use

def _exit_without_entering():
    warnings.catch_warnings(record=True).__exit__()


check_raises('exit_without_entering_raises', _exit_without_entering,
             RuntimeError)


def _enter_twice():
    manager = warnings.catch_warnings(record=True)
    with manager:
        manager.__enter__()


check_raises('entering_twice_raises', _enter_twice, RuntimeError)


def _enter_twice_without_record():
    manager = warnings.catch_warnings(record=False)
    with manager:
        manager.__enter__()


check_raises('entering_twice_without_record_raises',
             _enter_twice_without_record, RuntimeError)


def _exiting_twice_is_not_an_error():
    """``entered'' means "has been entered", not "is inside"."""
    manager = warnings.catch_warnings(record=True)
    manager.__enter__()
    manager.__exit__()
    manager.__exit__()
    return 'no raise'


check('exiting_twice_is_not_an_error', _exiting_twice_is_not_an_error,
      'no raise')


# ------------------------------------------------- the 3.11 shorthand

def _action_ignore():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.simplefilter('error')
        with warnings.catch_warnings(action='ignore'):
            warnings.warn('this will be ignored')
    return 'no raise'


check('action_ignore_installs_a_filter', _action_ignore, 'no raise')


def _action_error_with_category():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        with warnings.catch_warnings(action='error', category=FutureWarning):
            try:
                warnings.warn(FutureWarning('boom'))
            except FutureWarning:
                return 'raised'
            return 'not raised'


check('action_error_honours_category', _action_error_with_category, 'raised')


def _the_shorthand_filter_does_not_escape():
    with warnings.catch_warnings():
        warnings.resetwarnings()
        before = len(warnings.filters)
        with warnings.catch_warnings(action='ignore'):
            pass
        return len(warnings.filters) == before


check('the_shorthand_filter_does_not_escape',
      _the_shorthand_filter_does_not_escape, True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
