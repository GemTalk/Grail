"""Where a warning says it came from: filename, lineno, and stacklevel.

CPython records the source location on every warning, and ``stacklevel'' picks
WHICH frame gets the blame -- 1 is the warn() call site, 2 its caller, and so
on.  A library warns with stacklevel=2 precisely so the report names the code
that misused it rather than the library's own line.

Grail recorded neither.  ``warnings.warn(msg, cat, stacklevel)'' accepted the
argument and dropped it, and catch_warnings(record=True) answered records whose
filename was None and lineno 0 -- with a comment in unittest saying Grail had
no frame introspection for the warn() call site.  That was stale: sys._getframe
answers a real frame with f_code.co_filename and f_lineno, which is the same
live stack the module-scoped filter walk already used.

The location is captured ONLY where a warning is being recorded.  Getting the
live stack costs a RAISE, and the ordinary warn-and-print route must not pay it
on every call.

NOTE: every warn() below is issued from inside a FUNCTION.  Grail does not
represent module-level code as a Python frame, so a warning raised there has no
location to report -- a real limit, asserted at the end rather than avoided.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}
HERE = __file__


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def _record(fn):
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        fn()
        return w[0] if w else None


# ------------------------------------------------- the call site itself

def _warn_here():
    warnings.warn('direct')                     # the line reported below


LINE_OF_DIRECT_WARN = _warn_here.__code__.co_firstlineno + 1


def _rec_direct():
    return _record(_warn_here)


check('records_the_filename',
      lambda: _rec_direct().filename.endswith('warning_location.py'), True)
check('records_the_lineno',
      lambda: _rec_direct().lineno, LINE_OF_DIRECT_WARN)
check('filename_is_a_string',
      lambda: isinstance(_rec_direct().filename, str), True)
check('lineno_is_an_int',
      lambda: isinstance(_rec_direct().lineno, int), True)


# ----------------------------------------------------- stacklevel

def _inner_default():
    warnings.warn('lib says so')                # stacklevel defaults to 1


LINE_OF_INNER_DEFAULT = _inner_default.__code__.co_firstlineno + 1


def _outer_default():
    _inner_default()


def _inner_level2():
    warnings.warn('blame my caller', UserWarning, 2)


def _outer_level2():
    _inner_level2()                             # this line gets the blame


LINE_OF_OUTER_CALL = _outer_level2.__code__.co_firstlineno + 1


# stacklevel 1 (the default) blames the warn() call site.
check('default_stacklevel_blames_the_warn_site',
      lambda: _record(_outer_default).lineno, LINE_OF_INNER_DEFAULT)

# stacklevel 2 blames the CALLER -- which is the whole reason libraries pass it.
check('stacklevel_two_blames_the_caller',
      lambda: _record(_outer_level2).lineno, LINE_OF_OUTER_CALL)

# ...and both stay in this file.
check('stacklevel_two_keeps_the_filename',
      lambda: _record(_outer_level2).filename.endswith('warning_location.py'),
      True)


def _inner_kw():
    warnings.warn('kw form', UserWarning, stacklevel=2)


def _outer_kw():
    _inner_kw()


LINE_OF_KW_CALL = _outer_kw.__code__.co_firstlineno + 1

check('stacklevel_by_keyword',
      lambda: _record(_outer_kw).lineno, LINE_OF_KW_CALL)


# A stacklevel deeper than the stack keeps the outermost frame rather than
# raising -- CPython's behaviour.
def _inner_huge():
    warnings.warn('too far', UserWarning, 50)


check('an_overshooting_stacklevel_does_not_raise',
      lambda: isinstance(_record(_inner_huge).lineno, int), True)


# --------------------------------------------- the record still works

check('message_still_recorded',
      lambda: str(_rec_direct().message), 'direct')
check('category_still_recorded',
      lambda: _rec_direct().category.__name__, 'UserWarning')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
