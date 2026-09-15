"""``tb_frame.f_locals'' -- and so ``TracebackException(capture_locals=True)''
-- must report the frame the way CPython does.

Grail has no live frames: a traceback frame's locals are read off the still-live
Smalltalk stack while the exception is being built and stored on the frame, and
several Smalltalk frames are merged into one Python frame.  Three things that
walk got wrong, all of them visible in a ``capture_locals=True'' rendering:

  * a raise INSIDE a ``try:'' body landed the raise-time snapshot on the try
    block's frame, which owns no temporaries, so f_locals was a real but EMPTY
    dict -- and the later sweep, which reads every merged frame and would have
    found them, skipped the frame for having an answer already.  Every
    raise-and-catch-in-one-function traceback reported ``{}'';
  * a METHOD's ``self'' is Grail's Smalltalk RECEIVER, not a temporary, so it
    was absent from every frame the sweep filled;
  * a method compiles to ``_m: positional kw: kwargs'', and ``positional'' --
    the call's argument Array -- was reported as if the program had a variable
    of that name.

The ``except ... as e'' target is the fourth, and it is a TIMING difference
rather than a missing read: CPython's f_locals is live, so the target is there
while the handler runs and gone afterwards (PEP 3110 deletes it on the way
out).  Grail's snapshot is taken before the handler starts, so the name is
handed to the frame by codegen at handler entry and removed again in the
handler's ``ensure:''.  Both halves are asserted below.

STILL NOT ASSERTED, and still a real difference: a value the handler assigns
AFTER the exception was captured.  CPython's live read shows it; Grail's
snapshot cannot.
"""

import traceback


def _names(exc, depth):
    tb = exc.__traceback__
    for _ in range(depth):
        tb = tb.tb_next
    return sorted(getattr(tb.tb_frame, 'f_locals', None) or {})


class Widget:
    def resize(self, width, height=3):
        area = width * height
        try:
            1 / 0
        except ZeroDivisionError as exc:
            return _names(exc, 0)

    def scale(self, factor):
        product = factor * 2
        return product / 0


def a_method_frame_reports_its_receiver():
    return 'self' in Widget().resize(2)


def a_method_frame_reports_its_parameters():
    got = Widget().resize(2)
    return 'width' in got and 'height' in got


def a_method_frame_reports_a_local_bound_before_the_raise():
    return 'area' in Widget().resize(2)


def a_method_frame_hides_the_calling_convention_arguments():
    got = Widget().resize(2)
    return 'positional' not in got and 'kwargs' not in got


def plain(arg):
    before = 'bound'
    try:
        raise ValueError('v')
    except ValueError as exc:
        return _names(exc, 0)


def a_frame_that_catches_its_own_raise_still_reports_locals():
    got = plain(11)
    return 'arg' in got and 'before' in got


def _deep():
    innermost = 'i'
    1 / 0


def _caller():
    outermost = 'o'
    try:
        _deep()
    except ZeroDivisionError as exc:
        return (_names(exc, 0), _names(exc, 1))


def each_frame_of_a_chain_reports_its_own_locals():
    outer, inner = _caller()
    return 'outermost' in outer and inner == ['innermost']


def the_except_target_is_bound_while_the_handler_runs():
    try:
        raise ValueError('v')
    except ValueError as caught:
        return 'caught' in _names(caught, 0)
    return False


def the_except_target_is_gone_once_the_handler_ends():
    holder = []
    try:
        raise ValueError('v')
    except ValueError as caught:
        holder.append(caught)
    return 'caught' not in _names(holder[0], 0)


def _names_of_callee_frame(fn):
    """The names fn's OWN frame reports to an exception raised after fn's
    ``except ... as'' handler has already ended.  Depth 1: depth 0 is this
    function's frame, depth 1 is fn's."""
    try:
        fn()
    except RuntimeError as later:
        return _names(later, 1)
    return []


def _module_level_handler():
    seen = []
    try:
        1 / 0
    except ZeroDivisionError as gone:
        seen.append(gone)
    raise RuntimeError('after %d' % len(seen))


class _LaterRaiser:
    def method(self):
        seen = []
        try:
            1 / 0
        except ZeroDivisionError as gone:
            seen.append(gone)
        raise RuntimeError('after %d' % len(seen))


def a_later_exception_does_not_report_a_finished_target_module_level():
    names = _names_of_callee_frame(_module_level_handler)
    return 'seen' in names and 'gone' not in names


def a_later_exception_does_not_report_a_finished_target_nested():
    def nested():
        seen = []
        try:
            1 / 0
        except ZeroDivisionError as gone:
            seen.append(gone)
        raise RuntimeError('after %d' % len(seen))

    names = _names_of_callee_frame(nested)
    return 'seen' in names and 'gone' not in names


def a_later_exception_does_not_report_a_finished_target_method():
    names = _names_of_callee_frame(_LaterRaiser().method)
    return 'seen' in names and 'gone' not in names


def capture_locals_renders_the_receiver():
    try:
        Widget().scale(2)
    except ZeroDivisionError as exc:
        te = traceback.TracebackException.from_exception(exc, capture_locals=True)
        rendered = ''.join(te.format())
        return 'self = ' in rendered and 'positional = ' not in rendered
    return False


CHECKS = [
    a_method_frame_reports_its_receiver,
    a_method_frame_reports_its_parameters,
    a_method_frame_reports_a_local_bound_before_the_raise,
    a_method_frame_hides_the_calling_convention_arguments,
    a_frame_that_catches_its_own_raise_still_reports_locals,
    each_frame_of_a_chain_reports_its_own_locals,
    the_except_target_is_bound_while_the_handler_runs,
    the_except_target_is_gone_once_the_handler_ends,
    capture_locals_renders_the_receiver,
    a_later_exception_does_not_report_a_finished_target_module_level,
    a_later_exception_does_not_report_a_finished_target_nested,
    a_later_exception_does_not_report_a_finished_target_method,
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
