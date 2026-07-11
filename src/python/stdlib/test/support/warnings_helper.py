# GRAIL: trimmed test.support.warnings_helper.
#
# Class-based context managers over the native `warnings` shim (NO
# @contextmanager -- it is a no-op in Grail).  The ignore_* decorators
# are passthroughs (Grail drops method decorators anyway).

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


class check_warnings:
    """Approximates test.support.check_warnings: enters a
    warnings.catch_warnings() recording context."""

    def __init__(self, *filters, **kwargs):
        self.filters = filters
        self.quiet = kwargs.get("quiet", None)
        self._cm = None
        self.warnings = []

    def __enter__(self):
        # Dunder lookups go through the TYPE: a Grail instance
        # attribute read of a zero-arg dunder auto-invokes it, so
        # self._cm.__enter__() would call the RESULT of __enter__.
        self._cm = warnings.catch_warnings(record=True)
        cls = type(self._cm)
        self.warnings = getattr(cls, '__enter__')(self._cm)
        warnings.simplefilter("always")
        return self

    def __exit__(self, *exc):
        if self._cm is not None:
            cls = type(self._cm)
            getattr(cls, '__exit__')(self._cm, None, None, None)
        return False

    def reset(self):
        self.warnings = []


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
