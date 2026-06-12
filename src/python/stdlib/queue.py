# GRAIL queue - FIFO/LIFO/priority queues for the cooperative
# threading model.  Grail's threading has no Condition, so blocking
# put()/get() poll under a short time.sleep() — GemStone Delay yields
# to other GsProcesses, so producers run while a consumer waits.
# Deviation: SimpleQueue is just an unbounded Queue.

import time
import threading
import heapq

__all__ = ["Empty", "Full", "Queue", "LifoQueue", "PriorityQueue",
           "SimpleQueue"]

_POLL_SECONDS = 0.005


class Empty(Exception):
    pass


class Full(Exception):
    pass


class Queue:
    """FIFO queue.  maxsize <= 0 means unbounded."""

    def __init__(self, maxsize=0):
        self.maxsize = maxsize
        self._mutex = threading.Lock()
        self._unfinished = 0
        self._init(maxsize)

    # Hook methods, overridden by LifoQueue / PriorityQueue (same
    # extension points as CPython).
    def _init(self, maxsize):
        self._items = []

    def _qsize(self):
        return len(self._items)

    def _put(self, item):
        self._items.append(item)

    def _get(self):
        return self._items.pop(0)

    def qsize(self):
        return self._qsize()

    def empty(self):
        return self._qsize() == 0

    def full(self):
        if self.maxsize <= 0:
            return False
        return self._qsize() >= self.maxsize

    def put(self, item, block=True, timeout=None):
        deadline = None
        if timeout is not None:
            deadline = time.monotonic() + timeout
        while True:
            self._mutex.acquire()
            if self.maxsize <= 0 or self._qsize() < self.maxsize:
                self._put(item)
                self._unfinished = self._unfinished + 1
                self._mutex.release()
                return None
            self._mutex.release()
            if not block:
                raise Full("queue is full")
            if deadline is not None and time.monotonic() >= deadline:
                raise Full("queue is full")
            time.sleep(_POLL_SECONDS)

    def put_nowait(self, item):
        return self.put(item, False)

    def get(self, block=True, timeout=None):
        deadline = None
        if timeout is not None:
            deadline = time.monotonic() + timeout
        while True:
            self._mutex.acquire()
            if self._qsize() > 0:
                item = self._get()
                self._mutex.release()
                return item
            self._mutex.release()
            if not block:
                raise Empty("queue is empty")
            if deadline is not None and time.monotonic() >= deadline:
                raise Empty("queue is empty")
            time.sleep(_POLL_SECONDS)

    def get_nowait(self):
        return self.get(False)

    def task_done(self):
        if self._unfinished <= 0:
            raise ValueError("task_done() called too many times")
        self._unfinished = self._unfinished - 1

    def join(self):
        while self._unfinished > 0:
            time.sleep(_POLL_SECONDS)


class LifoQueue(Queue):
    def _get(self):
        return self._items.pop()


class PriorityQueue(Queue):
    def _init(self, maxsize):
        self._items = []

    def _put(self, item):
        heapq.heappush(self._items, item)

    def _get(self):
        return heapq.heappop(self._items)


class SimpleQueue(Queue):
    def __init__(self):
        super().__init__(0)
