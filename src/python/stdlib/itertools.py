# GRAIL itertools -- CPython's version implements every one of these as a
# C type (eager argument validation in tp_new, introspectable state, etc.);
# this is a pure-Python port aiming for the same OBSERVABLE behavior.
#
# Design note: nearly everything here is a class (not a generator function).
# A generator function's body doesn't run AT ALL until the first next() call
# -- so a plain `def chain(*its): ... yield ...` can't validate its
# arguments eagerly (CPython raises TypeError the moment you CALL
# `compress(None, x)`, before ever iterating it).  Classes give us an
# __init__ that runs immediately at call time, matching that eagerness.
#
# Design note 2: a generator function NESTED inside another function (a
# closure over the enclosing function's locals) does not compile under
# Grail's codegen today -- confirmed by trying `def gen(my_deque): ... yield
# ...` inside `tee()`.  A generator METHOD defined directly on a class
# (referencing `self`, not a closure) compiles fine and is used freely below
# (e.g. groupby._grouper) -- it's specifically the nested-closure shape that
# doesn't work.
#
# Design note 3: real CPython marks several parameters keyword-only via a
# bare `*` in the signature (`def f(a, *, b=1)`); Grail's def-codegen
# mis-binds that (confirmed: `def f(a, *, b=1)` called as `f(1, b=2)` raises
# UnboundLocalError for `b`).  Where a test depends on this (batched's
# `strict`, accumulate's `initial`), the enforcement is done manually via
# `*args`/`**kwargs` instead of the `*` marker.  `*iterables, kwonly=default`
# (no separate positional param before the bare star) is a DIFFERENT shape
# that Grail handles fine and is used directly (product, zip_longest).

from collections import deque


def _iter(x):
    """Like the builtin iter(), but genuinely raises TypeError immediately
    for a non-iterable Python-INSTANCE argument.  Plain iter(x) doesn't:
    PythonInstance compiles a catchable-TypeError FALLBACK for
    __iter__/__next__/__getitem__ onto every instance (so legacy protocol
    probes raise catchably instead of MessageNotUnderstood), which makes
    iter(x) "succeed" even for a genuinely non-iterable user object -- the
    TypeError only shows up later, when the fallback's __next__ is
    actually called.  ___hasProtocolForCall___ tests method OWNERSHIP,
    below that fallback level, so it can tell the difference -- and,
    unlike ___hasProtocol___ (used by collections.abc's structural
    isinstance checks), answers for a CLASS argument whether calling the
    name on THAT CLASS ITSELF works (via its metaclass), not whether
    instances of it would: an Enum class like test_enum's MainEnum is
    itself iterable (EnumMeta defines __iter__), even though its members
    are not, so _iter(MainEnum) must succeed.  Kernel-backed
    non-iterables (None, an int, ...) don't have this problem -- bare
    iter() already raises immediately for those -- so this only matters
    for arbitrary user-defined objects (test_itertools.
    TestVariousIteratorArgs, whose X/N helper classes are exactly this
    case).

    Also matches CPython's PyObject_GetIter: when __iter__ is present,
    real CPython additionally verifies the object __iter__() RETURNS is
    itself an iterator (has __next__), raising "iter() returned
    non-iterator of type '...'" immediately when it isn't -- this is what
    catches N, whose __iter__ returns self but self has no __next__."""
    if ___hasProtocolForCall___(x, '__getitem__'):
        return iter(x)
    if ___hasProtocolForCall___(x, '__iter__'):
        result = iter(x)
        if not ___hasProtocolForCall___(result, '__next__'):
            raise TypeError(
                "iter() returned non-iterator of type '" + type(result).__name__ + "'")
        return result
    raise TypeError("'" + type(x).__name__ + "' object is not iterable")


def _tuple(x):
    """Like the builtin tuple(), but with _iter's eager non-iterable check."""
    return tuple(_iter(x))


class chain:
    """Iterator chaining.  A class (as in CPython) so the
    ``chain.from_iterable`` classmethod exists."""

    def __init__(self, *iterables):
        self._iterables = iterables
        self._outer = iter(iterables)
        self._current = iter(())

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            try:
                return next(self._current)
            except StopIteration:
                self._current = iter(next(self._outer))

    @classmethod
    def from_iterable(cls, iterables):
        obj = cls()
        obj._outer = iter(iterables)
        return obj


def _is_number(x):
    # int/float/complex, or duck-types as one (Decimal, Fraction, ...).
    # NOT just "supports +" -- two strings support + (concatenation) but
    # aren't numbers, so count('a', 'b') must still raise TypeError.
    return (isinstance(x, (int, float, complex))
            or hasattr(x, '__float__') or hasattr(x, '__index__'))


class count:
    def __init__(self, start=0, step=1):
        if not (_is_number(start) and _is_number(step)):
            raise TypeError('a number is required')
        self._current = start
        self._step = step

    def __iter__(self):
        return self

    def __next__(self):
        result = self._current
        self._current = self._current + self._step
        return result

    def __repr__(self):
        # repr() directly, not '%r' string formatting -- %r on a complex
        # number gave a generic Smalltalk-ish description ('acomplex')
        # instead of calling Python's repr() (test_itertools.TestBasicOps.
        # test_repeat hit the same thing formatting a repeat(1+0j)).
        if type(self._step) is int and self._step == 1:
            return 'count(' + repr(self._current) + ')'
        return 'count(' + repr(self._current) + ', ' + repr(self._step) + ')'


class cycle:
    def __init__(self, iterable):
        self._it = _iter(iterable)
        self._saved = []
        self._i = 0
        self._exhausted = False

    def __iter__(self):
        return self

    def __next__(self):
        if not self._exhausted:
            try:
                value = next(self._it)
                self._saved.append(value)
                return value
            except StopIteration:
                self._exhausted = True
        if not self._saved:
            raise StopIteration
        value = self._saved[self._i]
        self._i = (self._i + 1) % len(self._saved)
        return value


class repeat:
    def __init__(self, object, times=None):
        self._object = object
        if times is not None:
            if not isinstance(times, int):
                raise TypeError('an integer is required')
            if times < 0:
                times = 0
        self._times = times

    def __iter__(self):
        return self

    def __next__(self):
        if self._times is not None:
            if self._times <= 0:
                raise StopIteration
            self._times -= 1
        return self._object

    def __length_hint__(self):
        if self._times is None:
            raise TypeError('len() of unsized object')
        return self._times

    def __repr__(self):
        # repr() directly, not '%r' -- see count.__repr__'s comment above.
        if self._times is None:
            return 'repeat(' + repr(self._object) + ')'
        return 'repeat(' + repr(self._object) + ', ' + repr(self._times) + ')'


_sentinel = object()


class groupby:
    """Faithful port of the pure-Python equivalent in the itertools docs.
    ``_grouper`` is a plain generator METHOD (not a nested closure), which
    is why this compiles under Grail (see the module docstring)."""

    def __init__(self, iterable, key=None):
        if key is None:
            def key(x):
                return x
        self.keyfunc = key
        self.it = _iter(iterable)
        self.tgtkey = self.currkey = self.currvalue = _sentinel
        self.id = None

    def __iter__(self):
        return self

    def __next__(self):
        self.id = object()
        while self.currkey == self.tgtkey:
            self.currvalue = next(self.it)
            self.currkey = self.keyfunc(self.currvalue)
        self.tgtkey = self.currkey
        return (self.currkey, self._grouper(self.tgtkey, self.id))

    def _grouper(self, tgtkey, id):
        while self.id is id and self.currkey == tgtkey:
            yield self.currvalue
            try:
                self.currvalue = next(self.it)
            except StopIteration:
                return
            self.currkey = self.keyfunc(self.currvalue)


class starmap:
    def __init__(self, function, iterable):
        self._function = function
        self._it = _iter(iterable)

    def __iter__(self):
        return self

    def __next__(self):
        args = next(self._it)
        return self._function(*args)


class zip_longest:
    def __init__(self, *iterables, fillvalue=None):
        self._iterators = [_iter(it) for it in iterables]
        self._fillvalue = fillvalue
        self._exhausted = [False] * len(self._iterators)
        self._active = len(self._iterators)

    def __iter__(self):
        return self

    def __next__(self):
        if self._active == 0:
            raise StopIteration
        values = []
        exhausted_now = False
        for i, it in enumerate(self._iterators):
            if self._exhausted[i]:
                values.append(self._fillvalue)
                continue
            try:
                v = next(it)
            except StopIteration:
                self._exhausted[i] = True
                self._active -= 1
                if self._active == 0:
                    exhausted_now = True
                v = self._fillvalue
            values.append(v)
        # Raise OUTSIDE the except block, not from within it -- a bare
        # ``raise StopIteration`` inside ``except StopIteration:`` didn't
        # actually abort __next__ under Grail (it fell through to the
        # ``return`` below instead), producing one spurious extra result
        # with the just-exhausted slots missing entirely
        # (test_itertools.TestBasicOps.test_ziplongest).
        if exhausted_now:
            raise StopIteration
        return tuple(values)


class takewhile:
    def __init__(self, predicate, iterable):
        self._predicate = predicate
        self._it = _iter(iterable)
        self._stopped = False

    def __iter__(self):
        return self

    def __next__(self):
        if self._stopped:
            raise StopIteration
        x = next(self._it)
        if self._predicate(x):
            return x
        self._stopped = True
        raise StopIteration


class dropwhile:
    def __init__(self, predicate, iterable):
        self._predicate = predicate
        self._it = _iter(iterable)
        self._dropping = True

    def __iter__(self):
        return self

    def __next__(self):
        if self._dropping:
            for x in self._it:
                if not self._predicate(x):
                    self._dropping = False
                    return x
            raise StopIteration
        return next(self._it)


class filterfalse:
    def __init__(self, predicate, iterable):
        self._predicate = predicate
        self._it = _iter(iterable)

    def __iter__(self):
        return self

    def __next__(self):
        pred = self._predicate
        while True:
            x = next(self._it)
            if pred is None:
                if not x:
                    return x
            elif not pred(x):
                return x


class accumulate:
    def __init__(self, iterable, *args, **kwargs):
        if len(args) > 1:
            raise TypeError(
                'accumulate expected at most 2 arguments, got ' + str(len(args) + 1))
        func = args[0] if args else kwargs.pop('func', None)
        initial = kwargs.pop('initial', None)
        if kwargs:
            raise TypeError('accumulate() got unexpected keyword argument')
        self._it = _iter(iterable)
        self._func = func
        self._initial = initial
        self._has_initial = initial is not None
        self._total = _sentinel

    def __iter__(self):
        return self

    def __next__(self):
        if self._total is _sentinel:
            if self._has_initial:
                self._total = self._initial
            else:
                self._total = next(self._it)
            return self._total
        value = next(self._it)
        if self._func is None:
            self._total = self._total + value
        else:
            self._total = self._func(self._total, value)
        return self._total


class product:
    def __init__(self, *iterables, repeat=1):
        if not isinstance(repeat, int):
            raise TypeError('repeat argument cannot be interpreted as an integer')
        if repeat < 0:
            raise ValueError('repeat argument cannot be negative')
        self._pools = [_tuple(pool) for pool in iterables] * repeat
        self._n = len(self._pools)
        self._indices = [0] * self._n
        self._started = False
        self._done = any(len(pool) == 0 for pool in self._pools)

    def __iter__(self):
        return self

    def __next__(self):
        if self._done:
            raise StopIteration
        pools = self._pools
        indices = self._indices
        if not self._started:
            self._started = True
            return tuple(pool[i] for pool, i in zip(pools, indices))
        n = self._n
        for i in reversed(range(n)):
            if indices[i] == len(pools[i]) - 1:
                continue
            indices[i] += 1
            for j in range(i + 1, n):
                indices[j] = 0
            return tuple(pool[i] for pool, i in zip(pools, indices))
        self._done = True
        raise StopIteration


class permutations:
    def __init__(self, iterable, r=None):
        self._pool = _tuple(iterable)
        n = len(self._pool)
        if r is None:
            r = n
        elif not isinstance(r, int):
            raise TypeError('r must be an integer or None')
        if r < 0:
            raise ValueError('r must be non-negative')
        self._r = r
        self._n = n
        self._indices = list(range(n))
        self._cycles = list(range(n, n - r, -1))
        self._started = False
        self._done = r > n

    def __iter__(self):
        return self

    def __next__(self):
        if self._done:
            raise StopIteration
        r = self._r
        n = self._n
        if not self._started:
            self._started = True
            return tuple(self._pool[i] for i in self._indices[:r])
        if n == 0:
            self._done = True
            raise StopIteration
        indices = self._indices
        cycles = self._cycles
        for i in reversed(range(r)):
            cycles[i] -= 1
            if cycles[i] == 0:
                indices[i:] = indices[i + 1:] + indices[i:i + 1]
                cycles[i] = n - i
            else:
                j = cycles[i]
                indices[i], indices[-j] = indices[-j], indices[i]
                return tuple(self._pool[k] for k in indices[:r])
        self._done = True
        raise StopIteration


class combinations:
    def __init__(self, iterable, r):
        self._pool = _tuple(iterable)
        n = len(self._pool)
        if not isinstance(r, int):
            raise TypeError('r must be an integer')
        if r < 0:
            raise ValueError('r must be non-negative')
        self._r = r
        self._n = n
        self._indices = list(range(r))
        self._started = False
        self._done = r > n

    def __iter__(self):
        return self

    def __next__(self):
        if self._done:
            raise StopIteration
        r = self._r
        n = self._n
        if not self._started:
            self._started = True
            return tuple(self._pool[i] for i in self._indices)
        indices = self._indices
        for i in reversed(range(r)):
            if indices[i] != i + n - r:
                break
        else:
            self._done = True
            raise StopIteration
        indices[i] += 1
        for j in range(i + 1, r):
            indices[j] = indices[j - 1] + 1
        return tuple(self._pool[k] for k in indices)


class combinations_with_replacement:
    def __init__(self, iterable, r):
        self._pool = _tuple(iterable)
        n = len(self._pool)
        if not isinstance(r, int):
            raise TypeError('r must be an integer')
        if r < 0:
            raise ValueError('r must be non-negative')
        self._r = r
        self._n = n
        self._indices = [0] * r
        self._started = False
        self._done = n == 0 and r > 0

    def __iter__(self):
        return self

    def __next__(self):
        if self._done:
            raise StopIteration
        r = self._r
        n = self._n
        if not self._started:
            self._started = True
            return tuple(self._pool[i] for i in self._indices)
        indices = self._indices
        for i in reversed(range(r)):
            if indices[i] != n - 1:
                break
        else:
            self._done = True
            raise StopIteration
        indices[i:] = [indices[i] + 1] * (r - i)
        return tuple(self._pool[k] for k in indices)


class compress:
    def __init__(self, data, selectors):
        self._data = _iter(data)
        self._selectors = _iter(selectors)

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            datum = next(self._data)
            selector = next(self._selectors)
            if selector:
                return datum


class batched:
    def __init__(self, iterable, n, *args, **kwargs):
        if len(args) > 0:
            raise TypeError(
                'batched expected at most 2 positional arguments, got ' + str(len(args) + 2))
        strict = kwargs.pop('strict', False)
        if kwargs:
            raise TypeError('batched() got unexpected keyword argument')
        if not isinstance(n, int):
            raise TypeError('n must be an integer')
        if n < 1:
            raise ValueError('n must be at least one')
        self._it = _iter(iterable)
        self._n = n
        self._strict = strict

    def __iter__(self):
        return self

    def __next__(self):
        it = self._it
        n = self._n
        batch = []
        for _ in range(n):
            try:
                batch.append(next(it))
            except StopIteration:
                break
        if not batch:
            raise StopIteration
        if self._strict and len(batch) != n:
            raise ValueError('batched(): incomplete batch')
        return tuple(batch)


class pairwise:
    def __init__(self, *args):
        if len(args) != 1:
            raise TypeError(
                'pairwise expected 1 argument, got ' + str(len(args)))
        self._it = _iter(args[0])
        self._prev = _sentinel

    def __iter__(self):
        return self

    def __next__(self):
        if self._prev is _sentinel:
            self._prev = next(self._it)
        # Snapshot into a local BEFORE the next() call below -- that call
        # can reenter this same __next__ (test_pairwise_reenter: the
        # underlying iterator's own __next__ calls next(it) on this
        # pairwise), which mutates self._prev as a side effect.  Building
        # the result from a freshly re-read self._prev afterward would
        # pick up the reentrant call's value instead of this call's own.
        prev = self._prev
        nextval = next(self._it)
        result = (prev, nextval)
        self._prev = nextval
        return result


class islice:
    def __init__(self, iterable, *args):
        self._it = _iter(iterable)
        if len(args) == 0:
            raise TypeError('islice expected at least 2 arguments, got 1')
        elif len(args) == 1:
            start, stop, step = 0, args[0], 1
        elif len(args) == 2:
            start, stop, step = args[0], args[1], 1
        elif len(args) == 3:
            start, stop, step = args
        else:
            raise TypeError(
                'islice expected at most 4 arguments, got ' + str(len(args) + 1))
        start = self._coerce(start)
        stop = self._coerce(stop)
        step = self._coerce(step)
        if start is None:
            start = 0
        if step is None:
            step = 1
        if start < 0 or (stop is not None and stop < 0) or step <= 0:
            raise ValueError(
                'Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.')
        self._start = start
        self._stop = stop
        self._step = step
        self._i = 0

    @staticmethod
    def _coerce(x):
        if x is None:
            return None
        if hasattr(x, '__index__'):
            return x.__index__()
        raise ValueError(
            'Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.')

    def __iter__(self):
        return self

    def __next__(self):
        it = self._it
        i = self._i
        stop = self._stop
        start = self._start
        step = self._step
        while True:
            if stop is not None and i >= stop:
                self._i = i
                raise StopIteration
            x = next(it)
            if i >= start and (i - start) % step == 0:
                self._i = i + 1
                return x
            i += 1


class _tee_iterator:
    """A shared, lazy, lagged-buffer tee branch (the pure-Python equivalent
    from the itertools docs, restructured as a class rather than a nested
    closure -- see the module docstring)."""

    def __init__(self, iterable):
        if isinstance(iterable, _tee_iterator):
            self._it = iterable._it
            self._deques = iterable._deques
            self._running = iterable._running
            newdeque = deque(iterable._mydeque)
            self._deques.append(newdeque)
            self._mydeque = newdeque
        else:
            self._it = _iter(iterable)
            self._deques = [deque()]
            self._running = [False]
            self._mydeque = self._deques[0]

    def __iter__(self):
        return self

    def __next__(self):
        mydeque = self._mydeque
        if not mydeque:
            if self._running[0]:
                raise RuntimeError('cannot re-enter the tee iterator')
            self._running[0] = True
            try:
                newval = next(self._it)
            finally:
                self._running[0] = False
            for d in self._deques:
                d.append(newval)
        return mydeque.popleft()

    def __copy__(self):
        return _tee_iterator(self)


def tee(iterable, n=2):
    if not isinstance(n, int):
        raise TypeError('n must be an integer')
    if n < 0:
        raise ValueError('n must be >= 0')
    if n == 0:
        return ()
    # ALWAYS construct a fresh _tee_iterator for the first slot too -- even
    # when ``iterable`` is already a _tee_iterator (re-teeing an existing
    # tee).  Reusing ``iterable`` itself as result[0] (as an earlier version
    # of this did) made tee(a) return (a, new_branch) instead of two
    # genuinely new, independent branches -- test_itertools.TestBasicOps.
    # test_tee's "tee objects are independent" check (a, b, c, d, e, f must
    # be 6 distinct objects) failed because c ended up literally being a.
    first = _tee_iterator(iterable)
    result = [first]
    for _ in range(n - 1):
        result.append(_tee_iterator(first))
    return tuple(result)
