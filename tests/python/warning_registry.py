"""The registry: how a warning remembers it has already been shown.

Deciding to show a warning is the filters' job.  Deciding whether it has
ALREADY been shown is a separate mechanism, and it is what makes the actions
differ from one another at all -- ``default'', ``module'' and ``once'' name
the same decision at three different scopes:

* ``default'' -- once per CALL SITE.  The registry key carries the line
  number, so the same message from two different lines warns twice.
* ``module''  -- once per REGISTRY, which is to say per module.  The key is
  rewritten with line 0, so the line stops mattering.
* ``once''    -- once per PROCESS.  This one does not use the caller's
  registry at all; it uses a module-level ``onceregistry'' keyed by (text,
  category), with no filename and no line, so the same message from a
  different file is still suppressed.
* ``always''/``all'' -- never remembered; every occurrence shows.

The registry is a plain dict the caller can supply.  It carries a ``version''
stamped from the filter state, and it is CLEARED when that no longer matches
-- otherwise a warning suppressed under one set of filters would stay
suppressed under new filters that would have shown it.  The stamp happens
before the filters are consulted, which is why even a warning that ends up
IGNORED leaves the registry holding exactly ``version''.

Both ``onceregistry'' and ``defaultaction'' are documented module attributes
that can be reassigned and deleted, and deleting either has to leave the
module working.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- once is per process

def _once_ignores_line_and_file():
    message = UserWarning('registry test: once')
    with warnings.catch_warnings(record=True) as log:
        warnings.resetwarnings()
        # onceregistry outlives catch_warnings -- that is the whole point of
        # "once per process" -- so a check about it has to start from a known
        # state rather than from whatever ran before.
        warnings.onceregistry = {}
        warnings.filterwarnings('once', category=UserWarning)
        warnings.warn_explicit(message, UserWarning, '__init__.py', 42)
        first = len(log)
        del log[:]
        # A different LINE in the same file: still suppressed.
        warnings.warn_explicit(message, UserWarning, '__init__.py', 13)
        # A different FILE entirely: still suppressed.
        warnings.warn_explicit(message, UserWarning, 'other.py', 42)
        return (first, len(log))


check('once_is_once_per_process', _once_ignores_line_and_file, (1, 0))


# ------------------------------------------------- default is per call site

def _default_is_per_line():
    with warnings.catch_warnings(record=True) as log:
        warnings.resetwarnings()
        warnings.filterwarnings('default', category=UserWarning)
        registry = {}
        warnings.warn_explicit('same text', UserWarning, 'f.py', 1,
                               registry=registry)
        warnings.warn_explicit('same text', UserWarning, 'f.py', 1,
                               registry=registry)
        after_same_line = len(log)
        warnings.warn_explicit('same text', UserWarning, 'f.py', 2,
                               registry=registry)
        return (after_same_line, len(log))


check('default_is_once_per_line', _default_is_per_line, (1, 2))


def _module_ignores_the_line():
    with warnings.catch_warnings(record=True) as log:
        warnings.resetwarnings()
        warnings.filterwarnings('module', category=UserWarning)
        registry = {}
        warnings.warn_explicit('same text', UserWarning, 'f.py', 1,
                               registry=registry)
        warnings.warn_explicit('same text', UserWarning, 'f.py', 2,
                               registry=registry)
        return len(log)


check('module_is_once_per_registry', _module_ignores_the_line, 1)


def _always_never_dedupes():
    with warnings.catch_warnings(record=True) as log:
        warnings.resetwarnings()
        warnings.filterwarnings('always', category=UserWarning)
        registry = {}
        for _ in range(3):
            warnings.warn_explicit('same text', UserWarning, 'f.py', 1,
                                   registry=registry)
        return (len(log), len(registry))


# Three warnings, and nothing remembered but the version stamp.
check('always_never_dedupes', _always_never_dedupes, (3, 1))


# ------------------------------------------------- the registry itself

def _the_registry_is_stamped():
    with warnings.catch_warnings(record=True):
        warnings.resetwarnings()
        warnings.filterwarnings('default', category=UserWarning)
        registry = {}
        warnings.warn_explicit('text', UserWarning, 'f.py', 1,
                               registry=registry)
        # One real key plus the version.
        return (len(registry), 'version' in registry)


check('the_registry_is_stamped', _the_registry_is_stamped, (2, True))


def _an_ignored_warning_still_stamps():
    """The stamp happens before the filters, so even nothing leaves a mark."""
    with warnings.catch_warnings(record=True) as log:
        warnings.resetwarnings()
        warnings.filterwarnings('ignore', category=UserWarning)
        registry = {}
        warnings.warn_explicit('text', UserWarning, 'f.py', 1,
                               registry=registry)
        return (len(log), list(registry))


check('an_ignored_warning_still_stamps', _an_ignored_warning_still_stamps,
      (0, ['version']))


def _changing_the_filters_clears_the_registry():
    with warnings.catch_warnings(record=True) as log:
        warnings.resetwarnings()
        warnings.filterwarnings('default', category=UserWarning)
        registry = {}
        warnings.warn_explicit('text', UserWarning, 'f.py', 1,
                               registry=registry)
        warnings.warn_explicit('text', UserWarning, 'f.py', 1,
                               registry=registry)
        suppressed = len(log)
        # A new filter invalidates what the registry remembered.
        warnings.filterwarnings('default', category=UserWarning, lineno=99)
        warnings.warn_explicit('text', UserWarning, 'f.py', 1,
                               registry=registry)
        return (suppressed, len(log))


check('changing_the_filters_clears_the_registry',
      _changing_the_filters_clears_the_registry, (1, 2))


# ------------------------------------------------- the module attributes

def _onceregistry_can_be_replaced():
    message = UserWarning('registry test: replaceable')
    original = warnings.onceregistry
    try:
        with warnings.catch_warnings(record=True) as log:
            warnings.resetwarnings()
            warnings.onceregistry = {}
            warnings.filterwarnings('once', category=UserWarning)
            warnings.warn_explicit(message, UserWarning, 'file', 42)
            warnings.warn_explicit(message, UserWarning, 'file', 42)
            after_once = len(log)
            # Resetting it makes the same warning show again.
            warnings.onceregistry = {}
            warnings.warn_explicit(message, UserWarning, 'file', 42)
            return (after_once, len(log))
    finally:
        warnings.onceregistry = original


check('onceregistry_can_be_replaced', _onceregistry_can_be_replaced, (1, 2))


def _defaultaction_can_be_replaced():
    original = warnings.defaultaction
    try:
        with warnings.catch_warnings(record=True) as log:
            warnings.resetwarnings()
            # No filter matches, so defaultaction decides.
            warnings.defaultaction = 'ignore'
            warnings.warn_explicit('text', UserWarning, 'f.py', 1)
            ignored = len(log)
            warnings.defaultaction = 'always'
            warnings.warn_explicit('text', UserWarning, 'f.py', 1)
            return (ignored, len(log))
    finally:
        warnings.defaultaction = original


check('defaultaction_can_be_replaced', _defaultaction_can_be_replaced, (0, 1))


def _defaultaction_can_be_deleted():
    """Deleting it has to leave the module working, not break warn()."""
    original = warnings.defaultaction
    try:
        with warnings.catch_warnings(record=True) as log:
            warnings.resetwarnings()
            del warnings.defaultaction
            warnings.warn_explicit('text', UserWarning, 'f.py', 1)
            return len(log)
    finally:
        warnings.defaultaction = original


check('defaultaction_can_be_deleted', _defaultaction_can_be_deleted, 1)


def _filters_can_be_deleted():
    """So does deleting ``filters'' -- the filtering keeps working."""
    with warnings.catch_warnings():
        warnings.filterwarnings('error', '', Warning, '', 0)
        try:
            warnings.warn('convert to error')
        except UserWarning:
            before = 'raised'
        else:
            before = 'not raised'
        del warnings.filters
        try:
            warnings.warn('convert to error')
        except UserWarning:
            return (before, 'raised')
        return (before, 'not raised')


check('filters_can_be_deleted', _filters_can_be_deleted,
      ('raised', 'raised'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
