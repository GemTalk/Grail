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
