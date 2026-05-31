# Fixture for CachedPropertyTestCase.
#
# @cached_property is realized via the same getter+setter pairing as
# @property: a bare ``instance.attr'' read invokes the getter and
# returns its value (rather than returning a BoundMethod).  This is the
# mechanism werkzeug's Request.args / .headers / .cookies rely on.
#
# Uses werkzeug.utils.cached_property — the actual shim being unblocked.

from werkzeug.utils import cached_property


class Counter:
    def __init__(self):
        self.calls = 0

    @cached_property
    def value(self):
        self.calls += 1
        return 'computed'

    def plain_method(self):
        return 'method'


def reads_cached_property():
    """``c.value'' invokes the getter and returns the computed value,
    not a BoundMethod."""
    c = Counter()
    return c.value == 'computed'


def cached_property_is_not_boundmethod():
    c = Counter()
    return isinstance(c.value, str)


def getter_actually_runs():
    """The getter body executes (side effect observed)."""
    c = Counter()
    _ = c.value
    return c.calls >= 1


def plain_method_still_callable():
    """A regular (undecorated) method is unaffected — still a callable
    that returns its value when invoked."""
    return Counter().plain_method() == 'method'


def set_then_read_overrides_getter():
    """Assigning to a @cached_property writes the instance attribute,
    which shadows the getter on the next read (CPython non-data
    descriptor semantics).  The getter never runs, so ``calls'' stays 0.
    flask's create_url_adapter sets ``request.host = ...'' this way."""
    c = Counter()
    c.value = 'override'
    return [c.value, c.calls]
