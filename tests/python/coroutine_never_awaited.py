"""A coroutine that dies never having been started warns, as CPython's does.

CPython's ``RuntimeWarning: coroutine 'f' was never awaited`` fires from the
coroutine's destructor.  Grail had no such warning -- a dropped coroutine was
silent -- and none of the machinery around it: sys.set_coroutine_origin_
tracking_depth and cr_origin, warnings._warn_unawaited_coroutine, the
unraisable report when that function (or an ``error'' filter) raises, and
frame.clear() on a coroutine's frame finalizing it.  Seven of test_coroutines'
eight failures were this.

Grail's destructor runs when the collector reclaims the object, so every check
that drops a coroutine collects afterwards with test.support.gc_collect(), as
CPython's own tests do -- the warning's TIMING is the collector's, not the
drop's.  frame.clear() is the exception: it finalizes on the spot in both.

Every expectation was measured against CPython 3.14.
"""

import gc
import inspect
import sys
import types
import warnings
from test.support import catch_unraisable_exception, gc_collect

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


async def orphan():
    return 1


def _warnings_from(action):
    # Collect FIRST: a coroutine dropped before this check -- by an earlier
    # check, or by whatever imported this module -- would otherwise report
    # inside the capture, since its destructor runs at a collection.
    gc_collect()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        action()
        gc_collect()
    return [(w.category.__name__, str(w.message)) for w in caught
            if issubclass(w.category, RuntimeWarning)]


# ----------------------------------------------------------- the warning

check('a_dropped_coroutine_warns_when_collected',
      _warnings_from(lambda: orphan()),
      [('RuntimeWarning', "coroutine 'orphan' was never awaited")])


def _closed():
    orphan().close()


def _awaited():
    c = orphan()
    try:
        c.send(None)
    except StopIteration:
        pass


def _thrown():
    try:
        orphan().throw(ValueError)
    except ValueError:
        pass


check('a_closed_awaited_or_thrown_coroutine_is_quiet',
      (_warnings_from(_closed), _warnings_from(_awaited), _warnings_from(_thrown)),
      ([], [], []))


def _under_error_filter():
    gc_collect()
    with warnings.catch_warnings(), catch_unraisable_exception() as cm:
        warnings.filterwarnings('error')
        c = orphan()
        text = repr(c)
        c = None
        gc_collect()
        u = cm.unraisable
        return (u.err_msg == 'Exception ignored while finalizing coroutine ' + text,
                type(u.exc_value).__name__, str(u.exc_value))


check('an_error_filter_reports_the_warning_as_unraisable', _under_error_filter(),
      (True, 'RuntimeWarning', "coroutine 'orphan' was never awaited"))


def _broken_hook():
    saved = warnings._warn_unawaited_coroutine
    gc_collect()
    warnings._warn_unawaited_coroutine = lambda coro: 1 / 0
    try:
        with catch_unraisable_exception() as cm, \
                warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            c = orphan()
            text = repr(c)
            del c
            gc_collect()
            return (cm.unraisable.err_msg
                    == 'Exception ignored while finalizing coroutine ' + text,
                    cm.unraisable.exc_type.__name__,
                    [str(w.message) for w in caught])
    finally:
        warnings._warn_unawaited_coroutine = saved


check('a_broken_hook_is_reported_and_the_plain_warning_still_issued',
      _broken_hook(),
      (True, 'ZeroDivisionError', ["coroutine 'orphan' was never awaited"]))

# ----------------------------------------------------------- inside a capture
# No gc_collect() in these two, on purpose.  CPython warns at the drop; Grail
# warns as the capture closes, having collected only because a coroutine made
# inside it was still undriven -- so the capture sees the warning either way.

def _dropped_inside_a_capture():
    gc_collect()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        orphan().cr_frame
    return [str(w.message) for w in caught]


check('a_capture_sees_a_coroutine_dropped_inside_it', _dropped_inside_a_capture(),
      ["coroutine 'orphan' was never awaited"])


def _kept_across_a_capture():
    gc_collect()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        kept = orphan()
    messages = [str(w.message) for w in caught]
    kept.close()
    return messages


check('a_coroutine_kept_across_a_capture_is_not_reported', _kept_across_a_capture(),
      [])

# ----------------------------------------------------------- origin tracking

def _make_orphan():
    return orphan()


def _origin(depth):
    saved = sys.get_coroutine_origin_tracking_depth()
    sys.set_coroutine_origin_tracking_depth(depth)
    try:
        c = _make_orphan()
        try:
            origin = c.cr_origin
        finally:
            c.close()
    finally:
        sys.set_coroutine_origin_tracking_depth(saved)
    return None if origin is None else [
        (len(entry), entry[2], type(entry[1]).__name__) for entry in origin]


check('cr_origin_is_none_without_tracking', _origin(0), None)
check('cr_origin_records_the_creating_frames_innermost_first', _origin(2),
      [(3, '_make_orphan', 'int'), (3, '_origin', 'int')])


def _refuses_negative():
    saved = sys.get_coroutine_origin_tracking_depth()
    try:
        sys.set_coroutine_origin_tracking_depth(-1)
    except ValueError as exc:
        return str(exc), sys.get_coroutine_origin_tracking_depth() == saved
    return 'no error'


check('a_negative_depth_is_refused_and_leaves_it_unchanged', _refuses_negative(),
      ('depth must be >= 0', True))

# ----------------------------------------------------------- frame.clear()

def _clear_unstarted():
    gc_collect()
    c = orphan()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        c.cr_frame.clear()
    # CPython only WARNS here: the coroutine stays unstarted, still has its
    # frame, and would warn again when destroyed -- so close it.
    still_has_frame = c.cr_frame is not None
    c.close()
    return [str(w.message) for w in caught], still_has_frame


check('clearing_an_unstarted_coroutines_frame_warns_on_the_spot', _clear_unstarted(),
      (["coroutine 'orphan' was never awaited"], True))


def _clear_suspended():
    def gen():
        yield 1
    g = gen()
    next(g)
    try:
        g.gi_frame.clear()
    except RuntimeError as exc:
        return str(exc)
    finally:
        g.close()
    return 'no error'


check('a_suspended_generators_frame_refuses_to_clear', _clear_suspended(),
      'cannot clear a suspended frame')

# ----------------------------------------------------------- neighbours

def _frameinfo():
    info = inspect.getframeinfo(inspect.currentframe())
    return type(info).__name__, info.function, info.filename == __file__, \
        info.code_context is None or 'getframeinfo' in info.code_context[0]


check('getframeinfo_names_the_frame', _frameinfo(),
      ('Traceback', '_frameinfo', True, True))
check('the_coroutine_type_documents_itself_as_a_coroutine',
      ('into coroutine' in types.CoroutineType.send.__doc__,
       'inside coroutine' in types.CoroutineType.close.__doc__,
       'in coroutine' in types.CoroutineType.throw.__doc__,
       types.CoroutineType.__dict__['__name__'].__doc__,
       types.CoroutineType.__dict__['__qualname__'].__doc__,
       'into generator' in types.GeneratorType.send.__doc__,
       types.CoroutineType.__name__),
      (True, True, True, 'name of the coroutine', 'qualified name of the coroutine',
       True, 'coroutine'))

gc.collect()


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
