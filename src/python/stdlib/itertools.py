# Minimal `itertools` stub for Grail.  The CPython module is large
# (lots of C-implemented iterators); only the names Jinja2 / Werkzeug
# / Flask reach for at import time are exposed.  Implementations
# defer to Python iteration; the surface stays small enough to read
# but expand on demand when call sites need more.


def _chain_gen(iterables):
    for it in iterables:
        for x in it:
            yield x


class chain:
    """Iterator chaining.  A class (as in CPython) so the
    ``chain.from_iterable`` classmethod exists — django's Media and
    query machinery use it."""

    def __init__(self, *iterables):
        self._gen = _chain_gen(iterables)

    def __iter__(self):
        return self._gen

    def __next__(self):
        return next(self._gen)

    @classmethod
    def from_iterable(cls, iterables):
        obj = cls()
        obj._gen = _chain_gen(iterables)
        return obj


def islice(iterable, *args):
    """islice(iterable, stop) / (iterable, start, stop[, step])."""
    if len(args) == 1:
        start = 0
        stop = args[0]
        step = 1
    elif len(args) == 2:
        start, stop = args
        step = 1
    else:
        start, stop, step = args
    if start is None:
        start = 0
    if step is None:
        step = 1
    i = 0
    for x in iterable:
        if stop is not None and i >= stop:
            break
        if i >= start and (i - start) % step == 0:
            yield x
        i += 1


def count(start=0, step=1):
    n = start
    while True:
        yield n
        n += step


def cycle(iterable):
    saved = []
    for x in iterable:
        yield x
        saved.append(x)
    while saved:
        for x in saved:
            yield x


def repeat(obj, times=None):
    if times is None:
        while True:
            yield obj
    else:
        for _ in range(times):
            yield obj


def groupby(iterable, key=None):
    """groupby(iterable[, key]) — yields (key, group) pairs.  Minimal
    implementation that buffers the current key's elements before
    yielding the next group."""
    if key is None:
        def key(x):
            return x
    current_key = None
    current_group = []
    first = True
    for x in iterable:
        k = key(x)
        if first:
            current_key = k
            current_group = [x]
            first = False
        elif k == current_key:
            current_group.append(x)
        else:
            yield (current_key, iter(current_group))
            current_key = k
            current_group = [x]
    if not first:
        yield (current_key, iter(current_group))


def starmap(function, iterable):
    for args in iterable:
        yield function(*args)


def zip_longest(*iterables, fillvalue=None):
    iterators = [iter(it) for it in iterables]
    if not iterators:
        return
    active = len(iterators)
    while active:
        values = []
        for i, it in enumerate(iterators):
            try:
                v = next(it)
            except StopIteration:
                active -= 1
                if active == 0:
                    return
                iterators[i] = repeat(fillvalue)
                v = fillvalue
            values.append(v)
        yield tuple(values)


def takewhile(predicate, iterable):
    for x in iterable:
        if predicate(x):
            yield x
        else:
            break


def dropwhile(predicate, iterable):
    iterator = iter(iterable)
    for x in iterator:
        if not predicate(x):
            yield x
            break
    for x in iterator:
        yield x


def filterfalse(predicate, iterable):
    if predicate is None:
        def predicate(x):
            return x
    for x in iterable:
        if not predicate(x):
            yield x


def accumulate(iterable, func=None, *, initial=None):
    it = iter(iterable)
    total = initial
    if total is None:
        try:
            total = next(it)
        except StopIteration:
            return
    yield total
    for x in it:
        if func is None:
            total = total + x
        else:
            total = func(total, x)
        yield total


def product(*iterables, repeat=1):
    """Cartesian product — minimal implementation."""
    pools = [tuple(pool) for pool in iterables] * repeat
    result = [[]]
    for pool in pools:
        result = [x + [y] for x in result for y in pool]
    for prod in result:
        yield tuple(prod)


def permutations(iterable, r=None):
    pool = tuple(iterable)
    n = len(pool)
    if r is None:
        r = n
    if r > n:
        return
    indices = list(range(n))
    cycles = list(range(n, n - r, -1))
    yield tuple(pool[i] for i in indices[:r])
    while n:
        for i in reversed(range(r)):
            cycles[i] -= 1
            if cycles[i] == 0:
                indices[i:] = indices[i + 1:] + indices[i: i + 1]
                cycles[i] = n - i
            else:
                j = cycles[i]
                indices[i], indices[-j] = indices[-j], indices[i]
                yield tuple(pool[k] for k in indices[:r])
                break
        else:
            return


def combinations(iterable, r):
    pool = tuple(iterable)
    n = len(pool)
    if r > n:
        return
    indices = list(range(r))
    yield tuple(pool[i] for i in indices)
    while True:
        for i in reversed(range(r)):
            if indices[i] != i + n - r:
                break
        else:
            return
        indices[i] += 1
        for j in range(i + 1, r):
            indices[j] = indices[j - 1] + 1
        yield tuple(pool[k] for k in indices)


def tee(iterable, n=2):
    """Return n independent iterators from a single iterable.

    GRAIL: a nested ``def gen(my_deque):`` containing ``yield``
    doesn't compile under Grail's closure codegen today (the
    PythonGenerator wrap only fires for top-level / class-side
    defs).  Materialize the iterable into a list and hand out n
    independent fresh iterators over it — works for finite
    iterables, which is all the Jinja2 / Flask call sites need."""
    items = list(iterable)
    return tuple(iter(items) for _ in range(n))
