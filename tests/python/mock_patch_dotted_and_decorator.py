"""``patch`` with a dotted CLASS target, and ``@patch(...)`` as a decorator.

Grail's patch split the target at the LAST dot and treated everything before
it as a module path, so any target naming an attribute of a CLASS raised
ModuleNotFoundError -- ``patch("_markupbase.ParserBase.reset")`` tried to
import a module called ``_markupbase.ParserBase``.  And the decorator form was
not implemented at all; its docstring said so.

Neither failure announced itself where it mattered.  ``@patch(...)`` on a test
method is a CLASS-BODY decorator, and Grail drops a class-body decorator whose
application raises, so the test ran with nothing patched rather than
reporting the error.  test_htmlparser's TestInheritance does exactly this.

``_markupbase.ParserBase`` is the target on purpose: a real stdlib class, so
the fixture measures the same thing under CPython.
"""

import unittest
from unittest.mock import patch

import _markupbase


def a_dotted_class_target_resolves():
    """The import failure: everything before the last dot is not a module."""
    original = _markupbase.ParserBase.reset
    with patch("_markupbase.ParserBase.reset") as mock_reset:
        if _markupbase.ParserBase.reset is original:
            return False
        if _markupbase.ParserBase.reset is not mock_reset:
            return False
    return _markupbase.ParserBase.reset is original


def the_decorator_form_passes_the_mock():
    """@patch(...) on a function hands the mock over as an extra argument."""
    seen = []

    @patch("_markupbase.ParserBase.reset")
    def probe(mock_reset):
        seen.append(mock_reset is _markupbase.ParserBase.reset)

    probe()
    return seen == [True]


def stacked_decorators_pass_mocks_bottom_up():
    """CPython's documented order: decorators apply bottom-up and the mocks
    arrive in that same order, so the BOTTOM one is the first argument.

    Getting this wrong is invisible when both mocks are interchangeable, which
    is why it is asserted against the patched attributes rather than by count.
    """
    seen = []

    @patch("_markupbase.ParserBase.getpos")
    @patch("_markupbase.ParserBase.reset")
    def probe(first, second):
        seen.append(first is _markupbase.ParserBase.reset)
        seen.append(second is _markupbase.ParserBase.getpos)

    probe()
    return seen == [True, True]


def the_decorator_restores_afterwards():
    original = _markupbase.ParserBase.reset

    @patch("_markupbase.ParserBase.reset")
    def probe(mock_reset):
        pass

    probe()
    return _markupbase.ParserBase.reset is original


def the_decorated_function_can_be_called_twice():
    """A fresh patcher per call.  One patcher instance keeps a single slot for
    the original, so reuse would restore the wrong value the second time."""
    original = _markupbase.ParserBase.reset
    mocks = []

    @patch("_markupbase.ParserBase.reset")
    def probe(mock_reset):
        mocks.append(mock_reset)

    probe()
    probe()
    return (len(mocks) == 2 and mocks[0] is not mocks[1]
            and _markupbase.ParserBase.reset is original)


def an_explicit_new_passes_no_extra_argument():
    """``patch(target, new)`` replaces with a given object, and CPython then
    hands the function NO extra argument."""
    sentinel_value = object()
    seen = []

    @patch("_markupbase.ParserBase.reset", sentinel_value)
    def probe():
        seen.append(_markupbase.ParserBase.reset is sentinel_value)

    probe()
    return seen == [True]


def the_context_manager_form_still_works():
    """The context-manager shape, which must survive the rewrite.

    NOT a pure control: it uses a dotted CLASS target too, so it fails without
    the fix for the same reason the decorator checks do.  The pure control is
    a_dotted_module_target_still_works below.
    """
    original = _markupbase.ParserBase.reset
    with patch("_markupbase.ParserBase.reset"):
        changed = _markupbase.ParserBase.reset is not original
    return changed and _markupbase.ParserBase.reset is original


def a_dotted_module_target_still_works():
    """The CONTROL, and the only one: a plain ``module.attr`` target is what
    the old last-dot split handled correctly, so this must keep passing both
    before and after."""
    original = _markupbase.ParserBase
    with patch("_markupbase.ParserBase"):
        changed = _markupbase.ParserBase is not original
    return changed and _markupbase.ParserBase is original


CHECKS = [
    a_dotted_class_target_resolves,
    the_decorator_form_passes_the_mock,
    stacked_decorators_pass_mocks_bottom_up,
    the_decorator_restores_afterwards,
    the_decorated_function_can_be_called_twice,
    an_explicit_new_passes_no_extra_argument,
    the_context_manager_form_still_works,
    a_dotted_module_target_still_works,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
