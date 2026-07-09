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
        self._cm = warnings.catch_warnings(record=True)
        self.warnings = self._cm.__enter__()
        warnings.simplefilter("always")
        return self

    def __exit__(self, *exc):
        if self._cm is not None:
            self._cm.__exit__(*exc)
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
