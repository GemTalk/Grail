"""test.support's context managers are usable as DECORATORS.

Upstream writes each of these as ``@contextlib.contextmanager``, and the
_GeneratorContextManager it returns inherits ContextDecorator -- so every one
of them works as ``@name(...)`` as well as in a with-statement.  Grail writes
them as plain classes (the shim's header explains why), which gave them
__enter__ and __exit__ and no __call__, so the decorator form raised
AttributeError.

That raise was invisible.  ``@support.infinite_recursion(25)`` on a test method
is a CLASS-BODY decorator, and Grail drops a class-body decorator whose
application fails -- so the guard silently never ran.  test_richcmp uses
exactly that shape.

``catch_unraisable_exception`` is deliberately NOT in the list: upstream keeps
it a plain class, so it is a context manager only, and Grail should match.
"""

from test import support


def _decorates(cm):
    """True when cm can wrap a function and the wrapper still runs it."""
    ran = []

    @cm
    def probe():
        ran.append(True)
        return 'value'

    return probe() == 'value' and ran == [True]


def infinite_recursion_decorates():
    """The measured failure: test_richcmp's @support.infinite_recursion(25)."""
    return _decorates(support.infinite_recursion(25))


def set_recursion_limit_is_callable_as_a_decorator():
    """Asserted by SHAPE rather than by running it.

    Grail's set_recursion_limit is deliberately not a no-op -- sys.setrecursion
    limit raises NotImplementedError here, because the recursion limit is
    physical stack exhaustion and not a counter -- so entering it raises by
    design.  Exercising it would be testing that decision, not this change.
    hasattr is true under CPython too, so the fixture still agrees.
    """
    return hasattr(support.set_recursion_limit(200), '__call__')


def adjust_int_max_str_digits_decorates():
    return _decorates(support.adjust_int_max_str_digits(5000))


def swap_attr_decorates():
    class Holder:
        value = 'original'
    return _decorates(support.swap_attr(Holder, 'value', 'swapped'))


def swap_item_decorates():
    holder = {'key': 'original'}
    return _decorates(support.swap_item(holder, 'key', 'swapped'))


def captured_stdout_decorates():
    return _decorates(support.captured_stdout())


def captured_stderr_decorates():
    return _decorates(support.captured_stderr())


def captured_output_decorates():
    return _decorates(support.captured_output('stdout'))


def the_context_manager_form_still_works():
    """The CONTROL: the with-statement shape is what these were written for and
    must be untouched by giving them a __call__."""
    holder = {'key': 'original'}
    with support.swap_item(holder, 'key', 'swapped'):
        swapped = holder['key'] == 'swapped'
    return swapped and holder['key'] == 'original'


def swap_attr_still_restores_through_the_decorator():
    """A decorator that wraps a STATEFUL context manager still has to restore.
    Checked separately because _decorates only proves the body ran."""
    class Holder:
        value = 'original'

    seen = []

    @support.swap_attr(Holder, 'value', 'swapped')
    def probe():
        seen.append(Holder.value)

    probe()
    return seen == ['swapped'] and Holder.value == 'original'


def catch_unraisable_exception_is_not_a_decorator():
    """The other CONTROL, and the reason this change is a list rather than a
    sweep: upstream keeps this one a plain class, so it is a context manager
    only.  Giving it __call__ would be a divergence, not a fix."""
    return not hasattr(support.catch_unraisable_exception(), '__call__')


CHECKS = [
    infinite_recursion_decorates,
    set_recursion_limit_is_callable_as_a_decorator,
    adjust_int_max_str_digits_decorates,
    swap_attr_decorates,
    swap_item_decorates,
    captured_stdout_decorates,
    captured_stderr_decorates,
    captured_output_decorates,
    the_context_manager_form_still_works,
    swap_attr_still_restores_through_the_decorator,
    catch_unraisable_exception_is_not_a_decorator,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)
