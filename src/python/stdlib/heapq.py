# GRAIL heapq - binary min-heap over plain lists, same algorithm and
# API as CPython's pure-Python heapq.  Deviations from CPython, kept
# deliberately small:
#   * merge() is not lazy - it materializes its inputs and sorts
#     (identical output for finite iterables).
#   * The C-accelerated underscore variants (_heapify_max etc.) are
#     not provided.

__all__ = ["heappush", "heappop", "heapify", "heapreplace", "heappushpop",
           "nlargest", "nsmallest", "merge"]


def heappush(heap, item):
    """Push item onto heap, maintaining the heap invariant."""
    heap.append(item)
    _siftdown(heap, 0, len(heap) - 1)


def heappop(heap):
    """Pop the smallest item off the heap, maintaining the heap invariant."""
    lastelt = heap.pop()
    if heap:
        returnitem = heap[0]
        heap[0] = lastelt
        _siftup(heap, 0)
        return returnitem
    return lastelt


def heapreplace(heap, item):
    """Pop and return the current smallest value, and add the new item."""
    returnitem = heap[0]
    heap[0] = item
    _siftup(heap, 0)
    return returnitem


def heappushpop(heap, item):
    """Fast version of a heappush followed by a heappop."""
    if heap and heap[0] < item:
        smallest = heap[0]
        heap[0] = item
        _siftup(heap, 0)
        return smallest
    return item


def heapify(x):
    """Transform list into a heap, in-place, in O(len(x)) time."""
    n = len(x)
    for i in range(n // 2 - 1, -1, -1):
        _siftup(x, i)


def _siftdown(heap, startpos, pos):
    newitem = heap[pos]
    while pos > startpos:
        parentpos = (pos - 1) >> 1
        parent = heap[parentpos]
        if newitem < parent:
            heap[pos] = parent
            pos = parentpos
            continue
        break
    heap[pos] = newitem


def _siftup(heap, pos):
    endpos = len(heap)
    startpos = pos
    newitem = heap[pos]
    childpos = 2 * pos + 1
    while childpos < endpos:
        rightpos = childpos + 1
        if rightpos < endpos and not heap[childpos] < heap[rightpos]:
            childpos = rightpos
        heap[pos] = heap[childpos]
        pos = childpos
        childpos = 2 * pos + 1
    heap[pos] = newitem
    _siftdown(heap, startpos, pos)


def nsmallest(n, iterable, key=None):
    """Return a list with the n smallest elements from the dataset."""
    if n <= 0:
        return []
    if key is None:
        result = sorted(iterable)
    else:
        result = sorted(iterable, key=key)
    return result[:n]


def nlargest(n, iterable, key=None):
    """Return a list with the n largest elements from the dataset."""
    if n <= 0:
        return []
    if key is None:
        result = sorted(iterable)
    else:
        result = sorted(iterable, key=key)
    result = list(reversed(result))
    return result[:n]


def merge(*iterables, key=None, reverse=False):
    """Merge sorted inputs into a single sorted output (non-lazy in Grail)."""
    out = []
    for it in iterables:
        for item in it:
            out.append(item)
    if key is None:
        out = sorted(out)
    else:
        out = sorted(out, key=key)
    if reverse:
        out = list(reversed(out))
    return iter(out)


# ---- Max-heap API (Python 3.13+/3.14) -------------------------------------
# CPython grew a public *_max family; test_heapq exercises it heavily.
# Pure-Python mirrors of the min-heap implementations with the
# comparison direction flipped.


def _siftdown_max(heap, startpos, pos):
    newitem = heap[pos]
    while pos > startpos:
        parentpos = (pos - 1) >> 1
        parent = heap[parentpos]
        if parent < newitem:
            heap[pos] = parent
            pos = parentpos
            continue
        break
    heap[pos] = newitem


def _siftup_max(heap, pos):
    endpos = len(heap)
    startpos = pos
    newitem = heap[pos]
    childpos = 2 * pos + 1
    while childpos < endpos:
        rightpos = childpos + 1
        if rightpos < endpos and not heap[rightpos] < heap[childpos]:
            childpos = rightpos
        heap[pos] = heap[childpos]
        pos = childpos
        childpos = 2 * pos + 1
    heap[pos] = newitem
    _siftdown_max(heap, startpos, pos)


def heapify_max(x):
    """Transform list into a maxheap, in-place, in O(len(x)) time."""
    n = len(x)
    for i in reversed(range(n // 2)):
        _siftup_max(x, i)


def heappush_max(heap, item):
    """Push item onto maxheap, maintaining the heap invariant."""
    heap.append(item)
    _siftdown_max(heap, 0, len(heap) - 1)


def heappop_max(heap):
    """Maxheap version of heappop."""
    lastelt = heap.pop()
    if heap:
        returnitem = heap[0]
        heap[0] = lastelt
        _siftup_max(heap, 0)
        return returnitem
    return lastelt


def heapreplace_max(heap, item):
    """Maxheap version of heapreplace."""
    returnitem = heap[0]
    heap[0] = item
    _siftup_max(heap, 0)
    return returnitem


def heappushpop_max(heap, item):
    """Maxheap version of heappushpop."""
    if heap and item < heap[0]:
        item, heap[0] = heap[0], item
        _siftup_max(heap, 0)
    return item
