# Fixtures for ThreadingModuleTestCase — threading.Thread over GsProcess and
# Semaphore-backed locks.  Threads are cooperative green threads (one gem, one
# OS thread), so these exercise concurrency, not parallelism.


class _Probe:
    def __init__(self):
        self.calls = 0

    def hit(self):
        self.calls += 1


def make_probe():
    return _Probe()


def empty_tuple():
    return ()


def thread_roundtrip():
    """A worker thread mutates shared state; join() waits for it."""
    import threading

    out = []

    def worker(a, b):
        out.append(a + b)

    t = threading.Thread(target=worker, args=(40, 2))
    started_alive = t.is_alive()
    t.start()
    t.join()
    return [out, started_alive, t.is_alive(), t.ident is not None]


def lock_roundtrip():
    import threading

    lock = threading.Lock()
    a = lock.acquire()
    held = lock.locked()
    lock.release()
    freed = lock.locked()
    return [a, held, freed]


def rlock_reentrant():
    import threading

    rl = threading.RLock()
    r1 = rl.acquire()
    r2 = rl.acquire()  # same thread: must not deadlock
    rl.release()
    rl.release()
    return [r1, r2]


def threaded_counter(n):
    """Spawn n worker threads, each appending its index; join all.  Proves
    multiple concurrent green threads run and complete."""
    import threading

    out = []

    def make(i):
        def work():
            out.append(i)
        return work

    threads = [threading.Thread(target=make(i)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return [len(out), sorted(out)]


# --- Barrier: a real rendezvous, built on the blocking locks ----------------


def barrier_releases_all_parties():
    """Every party blocks until the last arrives, then all proceed.  The order
    proves the waiting is genuine: no waiter may record 'past' before the final
    party has arrived."""
    import threading
    events = []
    b = threading.Barrier(3)

    def party(tag):
        events.append('at-' + tag)
        b.wait()
        events.append('past-' + tag)

    threads = [threading.Thread(target=party, args=[t]) for t in ('a', 'b')]
    for t in threads:
        t.start()
    events.append('main-arriving')
    b.wait()
    events.append('past-main')
    for t in threads:
        t.join()
    first_past = min(i for i, e in enumerate(events) if e.startswith('past-'))
    last_at = max(i for i, e in enumerate(events) if e.startswith('at-'))
    return [sorted(events) == sorted(
                ['at-a', 'at-b', 'main-arriving', 'past-a', 'past-b', 'past-main']),
            first_past > last_at]


def barrier_wait_returns_arrival_index():
    """CPython answers the arrival index so exactly one waiter can be singled
    out; the indices across parties are a permutation of range(parties)."""
    import threading
    b = threading.Barrier(3)
    seen = []

    def party():
        seen.append(b.wait())

    threads = [threading.Thread(target=party) for _ in range(2)]
    for t in threads:
        t.start()
    seen.append(b.wait())
    for t in threads:
        t.join()
    return sorted(seen)


def barrier_reset_clears_the_count():
    """reset() on an idle barrier returns it to empty so it can be reused."""
    import threading
    b = threading.Barrier(2)
    b.reset()
    n_before = b.n_waiting
    done = []

    def party():
        b.wait()
        done.append('through')

    t = threading.Thread(target=party)
    t.start()
    b.wait()
    t.join()
    return [n_before, b.parties, done]


def switch_interval_round_trips():
    """test.support saves, lowers and restores the switch interval; answering
    nothing at all made that an AttributeError before the test under it ran."""
    import sys
    original = sys.getswitchinterval()
    sys.setswitchinterval(1e-06)
    lowered = sys.getswitchinterval()
    sys.setswitchinterval(original)
    restored = sys.getswitchinterval()
    rejected = False
    try:
        sys.setswitchinterval(0)
    except ValueError:
        rejected = True
    return [original == 0.005, lowered == 1e-06, restored == original, rejected]
