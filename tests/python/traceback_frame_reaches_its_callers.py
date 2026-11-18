"""Fixture: a traceback's frames reach their callers, as CPython's do.

CPython's tb_frame IS the frame, so ``traceback.extract_stack(tb.tb_frame)``
walks from the function that caught the exception out through everything that
called it, and an inner frame's f_back is the frame of the traceback entry
outside it.  Grail built every traceback frame with ``f_back = None``, so that
walk stopped at the catcher -- which is what test_sys's
test_current_exceptions tripped over, reading another thread's handled
exception and looking for that thread's callers.

Also here: sys._current_frames(), which reads a blocked thread's stack, and a
handler in the same function as its ``raise'': that handler runs on top of the
try body that raised, and when the try body captured nothing the frame walk
reported the raise's line instead of the handler's.

Lines are compared as source text or as offsets from co_firstlineno, so the
fixture can move without its expectations changing.

Not checked, because Grail differs: a catching frame's f_back first read
after its function has RETURNED.  CPython still has the frame and its caller;
Grail finds the activation gone and answers None.  Read while the handler
runs -- every reader below -- it is the caller, and it stays that once read.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import threading
import traceback

r = {}


def names_until(frame, stop):
    out = []
    while frame is not None:
        out.append(frame.f_code.co_name)
        if frame.f_code.co_name == stop:
            break
        frame = frame.f_back
    return out


def leaf():
    raise ValueError('leaf')


def mid():
    leaf()


def catcher(seen):
    try:
        mid()
    except ValueError as e:
        tb = e.__traceback__
        frame = tb.tb_frame
        seen['catcher chain'] = names_until(frame, 'outer')
        seen['catcher line'] = frame.f_lineno - frame.f_code.co_firstlineno
        seen['leaf chain'] = names_until(tb.tb_next.tb_next.tb_frame, 'outer')
        seen['inner f_back is the entry outside'] = (
            tb.tb_next.tb_frame.f_back is frame)


def outer():
    seen = {}
    catcher(seen)
    return seen


def handler_in_the_raising_function():
    try:
        raise ValueError('here')
    except ValueError:
        return [fs.line for fs in traceback.extract_stack()][-1]


def with_blocked_worker(in_handler, main_side):
    """Run main_side(worker_ident) while a worker, called as f123 -> g456,
    waits either inside ``except ValueError'' or in plain code."""
    entered, leave = threading.Event(), threading.Event()
    ident = []

    def f123():
        g456()

    def g456():
        ident.append(threading.get_ident())
        if in_handler:
            try:
                raise ValueError('oops')
            except ValueError:
                entered.set()
                leave.wait()
        else:
            entered.set()
            leave.wait()

    t = threading.Thread(target=f123)
    t.start()
    entered.wait()
    try:
        return main_side(ident[0])
    finally:
        leave.set()
        t.join()


def f123_and_below(stack):
    """The (name, source line) entries from f123 inward, as test_sys reads
    them, up to the worker's own blocking call."""
    names = [fs.name for fs in stack]
    if 'f123' not in names:
        return ['no f123 in', names]
    i = names.index('f123')
    return [(fs.name, fs.line) for fs in stack[i:i + 2]]


def another_threads_exception_reaches_its_callers(worker):
    exc = sys._current_exceptions()[worker]
    return f123_and_below(traceback.extract_stack(exc.__traceback__.tb_frame))


def another_threads_frames(worker):
    d = sys._current_frames()
    main = threading.get_ident()
    return [main in d, worker in d,
            all(isinstance(k, int) and k > 0 for k in d),
            d[main] == sys._getframe(),
            f123_and_below(traceback.extract_stack(d[worker]))]


r['the_catching_frame_reaches_its_callers'] = outer()
r['a_handler_reports_its_own_line'] = handler_in_the_raising_function()
r['another_threads_exception_reaches_its_callers'] = with_blocked_worker(
    True, another_threads_exception_reaches_its_callers)
r['current_frames_reads_a_blocked_thread'] = with_blocked_worker(
    False, another_threads_frames)

EXPECTED = {
    'the_catching_frame_reaches_its_callers': {
        'catcher chain': ['catcher', 'outer'],
        'catcher line': 7,
        'leaf chain': ['leaf', 'mid', 'catcher', 'outer'],
        'inner f_back is the entry outside': True,
    },
    'a_handler_reports_its_own_line': (
        'return [fs.line for fs in traceback.extract_stack()][-1]'),
    'another_threads_exception_reaches_its_callers': [
        ('f123', 'g456()'), ('g456', 'leave.wait()')],
    'current_frames_reads_a_blocked_thread': [
        True, True, True, True, [('f123', 'g456()'), ('g456', 'leave.wait()')]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for name in sorted(EXPECTED):
        actual = r.get(name, '<missing>')
        ok = actual == EXPECTED[name]
        print('%-4s %s' % ('OK' if ok else 'FAIL', name))
        if not ok:
            print('     expected %r' % (EXPECTED[name],))
            print('     actual   %r' % (actual,))
    print(SUMMARY)
