"""Which frame a warning BLAMES: overrun, imports, and skip_file_prefixes.

``stacklevel`` names a frame counted outward from the warn() call, and three
of its corners each broke differently:

RUNNING OFF THE TOP IS ``<sys>``.  ``warn(..., stacklevel=9999)`` exhausts
the stack; CPython's walk catches its own ValueError and reports the warning
against ``<sys>`` line 0.  Grail kept the OUTERMOST frame instead, blaming
an arbitrary caller -- and its no-frame-at-all case reported a private
``<unknown>``/0 spelling of the same idea.

A MODULE BODY IS A FRAME.  ``warnings.warn(..., stacklevel=2)`` at module
level during an import must blame the IMPORTER (issue #24305) -- one hop up
from the module body's own ``<module>`` frame.  Grail's module-init codegen
emits no position markers, so the generated-Python probe honestly said "not
Python" and the walk dropped the frame entirely: the hop then started from
the importer and blamed the importer's CALLER.  The walk now recognises a
module init by what it is (a module instance's #initialize) rather than by
the marker it lacks, and calls it ``<module>`` as CPython does.  Its line is
0 -- with no markers none is derivable -- which the walkers only need to be
an int.

A LIBRARY CAN REFUSE THE BLAME.  ``skip_file_prefixes`` (3.12) makes every
hop land on the next frame whose filename does NOT start with one of the
prefixes, and forces stacklevel to at least 2 -- the caller passed prefixes
precisely because its own frame is the thing to skip.  One subtlety the
first cut got wrong: CPython takes the starting frame AS IT COMES and lets
the first hop advance past it; skipping it separately double-counts and
lands one frame too far out.

Also here: ``_deprecated``'s ``_version`` keyword.  test.test_warnings
drives every branch of the removal rule with synthetic versions, and
ignoring the keyword judged them all against the real interpreter.  The
rule, exactly: RuntimeError when ``_version[:2] > remove``, or when they are
EQUAL and the release level is past ``alpha``.

Every expectation below was checked against CPython 3.14.
"""

import os
import sys
import warnings

RESULTS = {}

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


def check_raises(name, fn, exc_type):
    try:
        fn()
        RESULTS[name] = 'did not raise'
    except BaseException as exc:
        RESULTS[name] = isinstance(exc, exc_type)


# ------------------------------------------------- overrun is <sys>

def _overrun_reports_sys():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        warnings.warn('too deep', stacklevel=9999)
        return (w[0].filename, w[0].lineno)


# Line 0, MEASURED -- the first cut assumed 1 and CPython 3.14 disagreed.
check('overrun_reports_sys_line_0', _overrun_reports_sys, ('<sys>', 0))


# ------------------------------------------------- the module body is a frame

def _import_blames_the_importer():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        import stacklevel_helpers.mod_warns  # noqa: F401
        return (len(w), os.path.basename(w[0].filename))


check('a_module_level_warning_blames_the_importer',
      _import_blames_the_importer,
      (1, os.path.basename(__file__)))


def _the_module_frame_exists():
    import stacklevel_helpers.chain_probe as cp
    return '<module>' in cp.CHAIN


check('the_module_body_has_a_frame', _the_module_frame_exists, True)


# ------------------------------------------------- skip_file_prefixes

def _library_refuses_the_blame():
    from stacklevel_helpers.skip_pkg import api
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        api.outer_api('skip probe')
        return os.path.basename(w[0].filename)


check('skip_file_prefixes_blames_the_caller', _library_refuses_the_blame,
      os.path.basename(__file__))


def _low_stacklevel_is_forced_to_two():
    from stacklevel_helpers.skip_pkg import api
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        api.outer_api('forced', stacklevel=0)
        return os.path.basename(w[0].filename)


check('a_low_stacklevel_is_forced_to_two', _low_stacklevel_is_forced_to_two,
      os.path.basename(__file__))


def _prefixes_must_be_a_tuple_of_str():
    try:
        warnings.warn('x', skip_file_prefixes=['not', 'a', 'tuple'])
        return 'did not raise'
    except TypeError:
        return 'TypeError'


check('prefixes_must_be_a_tuple_of_str', _prefixes_must_be_a_tuple_of_str,
      'TypeError')


# ------------------------------------------------- _deprecated's _version

_FINAL = (3, 11, 0, 'final', 0)
_ALPHA = (3, 11, 0, 'alpha', 0)


def _dep(remove, version):
    with warnings.catch_warnings():
        warnings.simplefilter('error')
        try:
            warnings._deprecated('attribution test', remove=remove,
                                 _version=version)
            return 'no warning'
        except DeprecationWarning:
            return 'warned'


check('a_future_removal_warns', lambda: _dep((3, 12), _FINAL), 'warned')
check('a_far_future_removal_warns', lambda: _dep((4, 0), _FINAL), 'warned')
check_raises('a_past_removal_raises',
             lambda: _dep((3, 10), _FINAL), RuntimeError)
check_raises('the_same_final_version_raises',
             lambda: _dep((3, 11), _FINAL), RuntimeError)
check('the_same_alpha_version_still_warns',
      lambda: _dep((3, 11), _ALPHA), 'warned')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
