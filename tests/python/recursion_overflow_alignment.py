"""A RecursionError must be catchable wherever the stack happens to run out.

Grail's recursion limit is physical stack exhaustion.  The VM trips a guard page,
signals AlmostOutOfStackError, and Grail turns that into a RecursionError.  The
old conversion -- BaseException class>>___recursionGuard___'s #resignalAs: --
trimmed the stack back to the overflow before signalling the RecursionError, and
the VM re-protects the guard page on that unwind with no margin.  When the trip
fell where the trim left the stack pointer just above the page, the
RecursionError's own handler search tripped again and escaped every ``except''
between the recursion and the guard, ``except BaseException'' included
(test_pickle's test_bad_getattr, at one stack-depth setting in three).

Where the trip lands depends on how many frames sit under the recursion, so the
checks sweep a base PADDING across more than one recursion cycle: every phase of
the cycle is exercised whatever GEM_MAX_SMALLTALK_STACK_DEPTH the gem runs with.
The remaining checks pin what a handler sees when it meets the overflow before
anything has unwound: ``finally'' runs before an outer handler, a ``with''
statement's __exit__ is told about a RecursionError, a bare ``raise'' keeps the
object's identity and runs the inner handler once.

Self-running under CPython (whose limit is a counter) as well as Grail.
"""

PADDINGS = range(16)


class _BadGetattr:
    def __getattr__(self, key):
        self.foo


def _function_recursion():
    return _function_recursion()


def _pad(k, fn):
    if k == 0:
        return fn()
    return _pad(k - 1, fn)


def _caught_at(k, fn):
    try:
        _pad(k, fn)
    except RecursionError:
        return True
    except BaseException as e:  # noqa: BLE001 -- report what arrived instead
        return 'raised %s instead' % type(e).__name__
    return 'no exception'


def _sweep(fn):
    bad = [(k, r) for k in PADDINGS for r in [_caught_at(k, fn)] if r is not True]
    return True if not bad else bad


def getattr_recursion_is_caught_at_every_alignment():
    return _sweep(lambda: _BadGetattr().x)


def function_recursion_is_caught_at_every_alignment():
    return _sweep(_function_recursion)


def finally_runs_before_the_outer_handler():
    log = []

    def g():
        try:
            _function_recursion()
        finally:
            log.append('finally')
    try:
        g()
    except RecursionError:
        log.append('outer')
    return log == ['finally', 'outer'] or log


def with_exit_is_told_about_a_recursion_error():
    seen = []

    class CM:
        def __enter__(self):
            return self

        def __exit__(self, t, v, tb):
            seen.append((t, type(v)))
            return False
    try:
        with CM():
            _function_recursion()
    except RecursionError:
        seen.append('outer')
    return seen == [(RecursionError, RecursionError), 'outer'] or seen


def with_exit_can_suppress_a_recursion_error():
    class Suppress:
        def __enter__(self):
            return self

        def __exit__(self, t, v, tb):
            return t is RecursionError
    with Suppress():
        _function_recursion()
    return True


def bare_raise_keeps_identity_and_runs_the_handler_once():
    inner = []

    def h():
        try:
            _function_recursion()
        except RecursionError as e:
            inner.append(e)
            raise
    try:
        h()
    except RecursionError as e:
        return (len(inner) == 1 and e is inner[0]) or (len(inner), e is inner[0])
    return 'not re-raised'


def except_exception_catches_it_as_a_runtime_error():
    try:
        _function_recursion()
    except Exception as e:
        return isinstance(e, RuntimeError) and type(e) is RecursionError
    return 'not caught'


def a_bare_except_catches_it():
    try:
        _function_recursion()
    except:  # noqa: E722 -- the bare form is the point
        return True
    return 'not caught'


CHECKS = [
    getattr_recursion_is_caught_at_every_alignment,
    function_recursion_is_caught_at_every_alignment,
    finally_runs_before_the_outer_handler,
    with_exit_is_told_about_a_recursion_error,
    with_exit_can_suppress_a_recursion_error,
    bare_raise_keeps_identity_and_runs_the_handler_once,
    except_exception_catches_it_as_a_runtime_error,
    a_bare_except_catches_it,
]


def run_all():
    failed = []
    for fn in CHECKS:
        try:
            r = fn()
        except BaseException as e:  # noqa: BLE001 -- report, do not hide
            r = type(e).__name__ + ': ' + str(e)
        if r is not True:
            failed.append(fn.__name__ + ' -> ' + repr(r))
    return failed


check_count = len(CHECKS)
failures = '; '.join(run_all())


if __name__ == '__main__':
    for fn in CHECKS:
        r = fn()
        print('%-4s %s' % ('OK' if r is True else 'FAIL', fn.__name__))
