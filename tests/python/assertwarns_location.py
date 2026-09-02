"""``assertWarns`` reports where the warning came from.

Its context object carries ``filename`` and ``lineno``, and CPython's own
test suite checks them -- test_gettext asserts both for every plural-form
warning, which is thirteen tests.

Grail's context stamped the filename from the test's module and left the
lineno at 0, because ``warnings`` could not say.  It can now: a warning
RECORD carries both, and the recording context has carried them for some
time.  The change had been tried once and reverted with the note

    +4 in test_gettext, -5 in test_re

and re-measuring it on 2026-09-02 gives +4 and -0 -- the test_re half
having been fixed by the frame and traceback work that landed in between.
A stale measurement is worse than none: it had made the right change look
wrong for as long as nobody re-ran it.

WHAT STILL CANNOT BE REPORTED, and why the code takes both fields or
neither: a warning raised inside a function built by ``exec`` blames the
generated code.  Grail derives a frame's globals from its code object's
filename, an exec-built function has none, so ``f_globals`` is None --
and a ``stacklevel`` walk that reads f_globals to decide how far to climb
stops there.  gettext's c2py plural functions are exactly that, which is
why nine of the thirteen still fail.  See docs/Issues.md.

Every expectation was checked against CPython 3.14 first.
"""

import unittest
import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _tail(path):
    return path.split('/')[-1] if path else path


class _Case(unittest.TestCase):
    def runTest(self):
        pass


CASE = _Case()


# -- a warning raised in the with-block ---------------------------------

def _direct():
    with CASE.assertWarns(UserWarning) as cm:
        warnings.warn('boom', UserWarning)
    return (_tail(cm.filename), cm.lineno, str(cm.warning))


DIRECT_LINE = _direct.__code__.co_firstlineno + 2


check('direct', _direct(),
      ('assertwarns_location.py', DIRECT_LINE, 'boom'))


# -- and one raised a call away, via stacklevel -------------------------
#
# stacklevel=2 attributes the warning to the CALLER, which is the whole
# reason a library uses it: the user wants their own line, not the
# library's.

def _emit():
    warnings.warn('from a helper', UserWarning, stacklevel=2)


def _via_stacklevel():
    with CASE.assertWarns(UserWarning) as cm:
        _emit()
    return (_tail(cm.filename), cm.lineno)


STACKLEVEL_LINE = _via_stacklevel.__code__.co_firstlineno + 2


check('via_stacklevel', _via_stacklevel(),
      ('assertwarns_location.py', STACKLEVEL_LINE))


# -- inside a method, and one call deeper -------------------------------

class Holder:
    def warn_here(self):
        with CASE.assertWarns(UserWarning) as cm:
            warnings.warn('in a method', UserWarning)
        return (_tail(cm.filename), cm.lineno)

    def warn_deeper(self):
        with CASE.assertWarns(UserWarning) as cm:
            self._inner()
        return (_tail(cm.filename), cm.lineno)

    def _inner(self):
        warnings.warn('deeper', UserWarning, stacklevel=2)


METHOD_LINE = Holder.warn_here.__code__.co_firstlineno + 2
DEEPER_LINE = Holder.warn_deeper.__code__.co_firstlineno + 2


check('in_a_method', Holder().warn_here(),
      ('assertwarns_location.py', METHOD_LINE))
check('one_call_deeper', Holder().warn_deeper(),
      ('assertwarns_location.py', DEEPER_LINE))


# -- assertWarnsRegex carries them too ----------------------------------

def _with_regex():
    with CASE.assertWarnsRegex(UserWarning, 'ma.ch') as cm:
        warnings.warn('matches', UserWarning)
    return (_tail(cm.filename), cm.lineno)


REGEX_LINE = _with_regex.__code__.co_firstlineno + 2


check('assert_warns_regex', _with_regex(),
      ('assertwarns_location.py', REGEX_LINE))


# -- the category and message still work --------------------------------
#
# The regression half: this context is what every assertWarns in the
# corpus runs through, so the parts that already worked must keep working.

def _still_selects_by_category():
    with CASE.assertWarns(DeprecationWarning) as cm:
        warnings.warn('not this one', UserWarning)
        warnings.warn('this one', DeprecationWarning)
    return (str(cm.warning), cm.warning.__class__.__name__)


def _refuses_when_absent():
    try:
        with CASE.assertWarns(DeprecationWarning):
            warnings.warn('wrong category', UserWarning)
        return 'no raise'
    except AssertionError as exc:
        return str(exc)


def _regex_that_does_not_match():
    try:
        with CASE.assertWarnsRegex(UserWarning, 'zzz'):
            warnings.warn('nope', UserWarning)
        return 'no raise'
    except AssertionError as exc:
        return 'AssertionError'


def _the_block_keeps_running():
    seen = []
    with CASE.assertWarns(UserWarning):
        warnings.warn('one', UserWarning)
        seen.append('after the warn')
    return seen


check('still_selects_by_category', _still_selects_by_category(),
      ('this one', 'DeprecationWarning'))
check('refuses_when_absent', _refuses_when_absent(),
      'DeprecationWarning not triggered')
check('regex_that_does_not_match', _regex_that_does_not_match(),
      'AssertionError')
check('the_block_keeps_running', _the_block_keeps_running(),
      ['after the warn'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
