"""Fixture: the exception being handled is per thread, as CPython's is.

CPython keeps the exc_info stack on the thread state.  A thread sitting in
an ``except'' block is invisible to every other thread: their
sys.exception() and sys.exc_info() answer their own, a bare ``raise'' finds
nothing to re-raise, and an exception they raise takes no __context__ from
it.  A new thread starts with nothing being handled, and a generator body
sees the handled exception of whichever thread resumed it.

Grail kept all of that in one session-wide slot, so while a worker waited
inside ``except ValueError'' the main thread's sys.exception() answered the
worker's ValueError (test_sys test_current_exceptions).

Thread switches are forced with Events, so each check's interleaving is the
same on every run and under both runtimes.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import threading

r = {}


def with_worker_in_handler(main_side):
    """Run main_side() on this thread while a worker waits inside
    ``except ValueError'', and answer what each side saw."""
    inside, leave = threading.Event(), threading.Event()
    worker_saw = []

    def worker():
        try:
            raise ValueError('worker only')
        except ValueError:
            inside.set()
            leave.wait()
            worker_saw.append(repr(sys.exception()))

    t = threading.Thread(target=worker)
    t.start()
    inside.wait()
    try:
        main_saw = main_side()
    finally:
        leave.set()
        t.join()
    return [main_saw, worker_saw]


def bare_raise():
    try:
        raise
    except RuntimeError as e:
        return 'RuntimeError: %s' % e


def raise_and_read_context():
    try:
        raise TypeError('main')
    except TypeError as e:
        return repr(e.__context__)


def a_new_thread_starts_with_nothing_handled():
    seen = []
    t = threading.Thread(target=lambda: seen.append(repr(sys.exception())))
    try:
        raise KeyError('main')
    except KeyError:
        t.start()
        t.join()
        seen.append(repr(sys.exception()))
    return seen


def gen_reporting_handled():
    while True:
        yield repr(sys.exception())


def a_generator_sees_its_resumers_thread():
    gen = gen_reporting_handled()
    seen = []
    done = threading.Event()

    def worker():
        try:
            raise ValueError('in worker')
        except ValueError:
            seen.append(next(gen))
        done.set()

    try:
        raise KeyError('in main')
    except KeyError:
        seen.append(next(gen))
        t = threading.Thread(target=worker)
        t.start()
        done.wait()
        seen.append(next(gen))
    t.join()
    seen.append(next(gen))
    return seen


def a_generator_first_started_in_a_thread():
    """The body's first run happens on the worker, inside its handler; the next
    resume comes from the main thread, outside any."""
    gen = gen_reporting_handled()
    seen = []

    def worker():
        try:
            raise ValueError('first in worker')
        except ValueError:
            seen.append(next(gen))

    t = threading.Thread(target=worker)
    t.start()
    t.join()
    seen.append(next(gen))
    return seen


def interleaved_handlers_keep_their_own_clauses():
    """A enters a handler, B enters one, A leaves first while B is still
    inside, and then B's nested two-clause try must still catch with its own
    second clause -- and A's later two-clause try with its own."""
    a_in, b_in, a_out = threading.Event(), threading.Event(), threading.Event()
    seen = {}

    def a():
        try:
            raise KeyError('a')
        except KeyError:
            a_in.set()
            b_in.wait()
        a_out.set()
        try:
            raise ValueError('a again')
        except KeyError:
            seen['a'] = 'wrong clause'
        except ValueError:
            seen['a'] = ['caught', repr(sys.exception())]
        seen['a after'] = repr(sys.exception())

    def b():
        a_in.wait()
        try:
            raise KeyError('b')
        except KeyError:
            b_in.set()
            a_out.wait()
            try:
                raise ValueError('b nested')
            except KeyError:
                seen['b'] = 'wrong clause'
            except ValueError:
                seen['b'] = ['caught', repr(sys.exception())]
            seen['b back in outer handler'] = repr(sys.exception())

    threads = [threading.Thread(target=a), threading.Thread(target=b)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return [seen.get(k) for k in ('a', 'a after', 'b', 'b back in outer handler')]


r['another_threads_handler_is_invisible'] = with_worker_in_handler(
    lambda: [repr(sys.exception()), sys.exc_info() == (None, None, None)])
r['a_bare_raise_finds_nothing_from_another_thread'] = with_worker_in_handler(bare_raise)
r['implicit_context_is_not_another_threads'] = with_worker_in_handler(raise_and_read_context)
r['a_new_thread_starts_with_nothing_handled'] = a_new_thread_starts_with_nothing_handled()
r['a_generator_sees_its_resumers_thread'] = a_generator_sees_its_resumers_thread()
r['a_generator_first_started_in_a_thread'] = a_generator_first_started_in_a_thread()
r['interleaved_handlers_keep_their_own_clauses'] = interleaved_handlers_keep_their_own_clauses()

WORKER = ["ValueError('worker only')"]
EXPECTED = {
    'another_threads_handler_is_invisible': [['None', True], WORKER],
    'a_bare_raise_finds_nothing_from_another_thread': [
        'RuntimeError: No active exception to reraise', WORKER],
    'implicit_context_is_not_another_threads': ['None', WORKER],
    'a_new_thread_starts_with_nothing_handled': ['None', "KeyError('main')"],
    'a_generator_sees_its_resumers_thread': [
        "KeyError('in main')", "ValueError('in worker')", "KeyError('in main')", 'None'],
    'a_generator_first_started_in_a_thread': ["ValueError('first in worker')", 'None'],
    'interleaved_handlers_keep_their_own_clauses': [
        ['caught', "ValueError('a again')"], 'None',
        ['caught', "ValueError('b nested')"], "KeyError('b')"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key in r:
            print('    %r: %r,' % (key, r[key]))
        sys.exit()
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
