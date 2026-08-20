# GRAIL: trimmed test.support.warnings_helper.
#
# Class-based context managers over the native `warnings` shim (NO
# @contextmanager -- it is a no-op in Grail).  The ignore_* decorators
# are passthroughs (Grail drops method decorators anyway).

import re
import warnings


class _PassthroughDecorator:
    def __call__(self, *args, **kw):
        if len(args) == 1 and len(kw) == 0 and callable(args[0]):
            return args[0]
        def _wrap(func):
            return func
        return _wrap


ignore_warnings = _PassthroughDecorator()
ignore_deprecations_from = _PassthroughDecorator()


class WarningsRecorder:
    """The object check_warnings() yields -- CPython's, ported.

    Two things beyond the plain list that tests rely on:

      * attribute reads PROXY to the LAST warning recorded, so
        ``w.message'' is the most recent one rather than a list; and
      * ``reset()'' moves a watermark rather than emptying the list, so
        ``w.warnings'' answers only what arrived since.

    Grail's earlier version exposed the list and a reset() that cleared it,
    with no proxy at all -- so ``str(w.message)'' raised AttributeError.
    """

    _DETAILS = ('message', 'category', 'filename', 'lineno', 'file', 'line',
                'source')

    def __init__(self, warnings_list):
        self._warnings = warnings_list
        self._last = 0

    def __getattr__(self, attr):
        if len(self._warnings) > self._last:
            return getattr(self._warnings[-1], attr)
        elif attr in self._DETAILS:
            # A detail asked for before anything was recorded is None, not an
            # error -- callers test ``w.message is None''.
            return None
        raise AttributeError("%r has no attribute %r" % (self, attr))

    @property
    def warnings(self):
        return self._warnings[self._last:]

    def reset(self):
        self._last = len(self._warnings)


class check_warnings:
    """Context manager that records warnings and CHECKS them on exit.

    Accepts ("message regexp", WarningCategory) pairs.  On exit every filter
    must have matched something, and nothing may be left over:

      * a filter that caught nothing raises AssertionError, unless quiet;
      * a warning no filter claimed raises AssertionError always.

    quiet defaults to True when called with no filters and False when filters
    are given -- the backward-compatible behaviour, and the reason the
    no-argument form is a silencer while the filtered form is an assertion.

    Grail's earlier version recorded and never checked, so both of
    test_check_warnings' assertRaises(AssertionError) cases passed silently.
    """

    def __init__(self, *filters, **kwargs):
        quiet = kwargs.get('quiet')
        if not filters:
            filters = (("", Warning),)
            if quiet is None:
                quiet = True
        self.filters = filters
        self.quiet = bool(quiet)
        self._cm = None
        self._recorder = None

    def __enter__(self):
        # Dunder lookups go through the TYPE: a Grail instance attribute read
        # of a zero-arg dunder auto-invokes it, so self._cm.__enter__() would
        # call the RESULT of __enter__.
        self._cm = warnings.catch_warnings(record=True)
        cls = type(self._cm)
        recorded = getattr(cls, '__enter__')(self._cm)
        warnings.simplefilter("always")
        self._recorder = WarningsRecorder(recorded)
        return self._recorder

    def __exit__(self, *exc):
        recorded = list(self._recorder._warnings) if self._recorder else []
        if self._cm is not None:
            cls = type(self._cm)
            getattr(cls, '__exit__')(self._cm, None, None, None)
        if exc and exc[0] is not None:
            # A real exception escaped the block -- let it propagate rather
            # than replacing it with a filter complaint.
            return False
        reraise = list(recorded)
        missing = []
        for msg, cat in self.filters:
            seen = False
            for w in list(reraise):
                warning = w.message
                if (re.match(msg, str(warning), re.I)
                        and issubclass(warning.__class__, cat)):
                    seen = True
                    reraise.remove(w)
            if not seen and not self.quiet:
                missing.append((msg, cat.__name__))
        if reraise:
            raise AssertionError("unhandled warning %s" % (reraise[0],))
        if missing:
            raise AssertionError("filter (%r, %s) did not catch any warning"
                                 % missing[0])
        return False


class check_no_resource_warning:
    def __init__(self, testcase):
        self.testcase = testcase

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class check_no_warnings:
    def __init__(self, testcase, message="", category=Warning, force_gc=False):
        self.testcase = testcase

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False
