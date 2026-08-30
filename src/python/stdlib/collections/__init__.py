# GRAIL collections - subset matching the Werkzeug / Flask / blinker
# touchpoints: defaultdict (kept from the prior stub), OrderedDict,
# deque, namedtuple, Counter, ChainMap.
#
# Grail's regular dict already preserves insertion order (it inherits
# from KeyValueDictionary, which itself uses ordered insertion), so
# OrderedDict is a thin dict subclass adding the few unique methods
# (move_to_end, popitem(last=False)).  Counter is a dict-with-counts
# subclass.  ChainMap is a wrapper around a list of dicts.

from .abc import Mapping, MutableMapping


class defaultdict(dict):
    """Minimal defaultdict: dict that auto-creates missing keys
    by calling default_factory().
    """

    def __init__(self, default_factory=None, *args, **kwargs):
        super().__init__()
        self.default_factory = default_factory
        if args:
            self.update(args[0])
        if kwargs:
            self.update(kwargs)

    def __missing__(self, key):
        if self.default_factory is None:
            raise KeyError(key)
        value = self.default_factory()
        self[key] = value
        return value

    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        return self.__missing__(key)


class OrderedDict(dict):
    """OrderedDict - dict that preserves insertion order plus a few
    ordering-aware operations.  Grail's underlying dict (KeyValueDict)
    doesn't keep insertion order on its own, so we track key order in
    a parallel list and override the order-sensitive ops."""

    def __init__(self, *args, **kwargs):
        super().__init__()
        self._order = []
        if args:
            seed = args[0]
            if hasattr(seed, 'items'):
                for k, v in seed.items():
                    self[k] = v
            else:
                for k, v in seed:
                    self[k] = v
        if kwargs:
            for k in kwargs:
                self[k] = kwargs[k]

    def __setitem__(self, key, value):
        if key not in self:
            self._order.append(key)
        super().__setitem__(key, value)

    def __delitem__(self, key):
        super().__delitem__(key)
        self._order.remove(key)

    def __iter__(self):
        # `list(self._order)` so callers iterating while mutating don't
        # see torn state.
        return iter(list(self._order))

    def keys(self):
        return list(self._order)

    def values(self):
        return [self[k] for k in self._order]

    def items(self):
        return [(k, self[k]) for k in self._order]

    def clear(self):
        super().clear()
        self._order = []

    def move_to_end(self, key, last=True):
        if key not in self:
            raise KeyError(key)
        self._order.remove(key)
        if last:
            self._order.append(key)
        else:
            self._order.insert(0, key)

    def popitem(self, last=True):
        if not self._order:
            raise KeyError("dictionary is empty")
        key = self._order[-1] if last else self._order[0]
        value = self[key]
        del self[key]
        return (key, value)


class _deque_iterator:
    """Iterator over a deque.

    A deque is TEMPORARILY IMMUTABLE while it is being iterated: CPython's
    dequeiter compares the deque's mutation counter against the one it
    snapshotted, raises RuntimeError('deque mutated during iteration') on the
    next __next__ after any structural change, and latches its remaining count
    to zero at that moment (dequeiter_next / dequeiter_len in _collectionsmodule.c).

    Grail's deque used to hand out ``iter(self._items)`` -- a plain
    list_iterator, which happily kept going after a mutation and kept reporting
    a remaining count, so test_iterlen's TestDeque/TestDequeReversed
    test_immutable_during_iteration saw no RuntimeError at all.

    The counter (rather than a simple length comparison) is what catches a
    same-size mutation such as ``d.pop(); d.append(x)`` or ``d.rotate()``.
    """

    def __init__(self, dq, reverse=False):
        self._deque = dq
        self._state = dq._state
        self._reverse = reverse
        self._counter = len(dq)
        self._index = self._counter - 1 if reverse else 0

    def __iter__(self):
        return self

    def __next__(self):
        if self._deque._state != self._state:
            # Latched: the iteration can never be completed, so the length hint
            # must read 0 from here on (the len(it) == len(list(it)) invariant).
            self._counter = 0
            raise RuntimeError("deque mutated during iteration")
        if self._counter <= 0:
            raise StopIteration
        item = self._deque._items[self._index]
        self._index = self._index - 1 if self._reverse else self._index + 1
        self._counter -= 1
        return item

    def __length_hint__(self):
        return self._counter


class _deque_reverse_iterator(_deque_iterator):
    """The type of ``reversed(deque)`` -- a distinct class from the forward
    iterator so ``type(reversed(d))(d)`` reconstructs a REVERSE iterator, as
    CPython's _deque_reverse_iterator does (test_deque test_reversed_new)."""

    def __init__(self, dq, reverse=True):
        super().__init__(dq, reverse)


class deque:
    """Double-ended queue backed by a list.  O(n) for arbitrary
    indexing, O(1) amortized for append/appendleft/pop/popleft."""

    # Bumped by every structural mutation so a live _deque_iterator can detect
    # one (CPython's deque->state).  Also a class-level default, so an instance
    # that somehow skipped __init__ still reads a value rather than raising.
    _state = 0

    # ids of deques whose __repr__ is currently on the stack, so a
    # self-referential deque (``d.append(d)``) renders the recursive slot as
    # ``[...]`` instead of recursing forever (CPython's Py_ReprEnter).
    _repr_running = set()

    # deque is unhashable (it is mutable): defining __eq__ below without a
    # __hash__ already makes instances unhashable (Grail applies Python's
    # __eq__-without-__hash__ rule), so an explicit ``__hash__ = None`` is both
    # redundant AND harmful -- it makes hash(deque) (the CLASS) return None,
    # which breaks pickle's ``type(obj) in _ITER_TYPES`` lookup.

    def __init__(self, iterable=None, maxlen=None):
        if maxlen is not None:
            maxlen = maxlen.__index__() if hasattr(maxlen, '__index__') else maxlen
            if maxlen < 0:
                raise ValueError("maxlen must be non-negative")
        self._items = []
        self._maxlen = maxlen
        self._state = 0
        if iterable is not None:
            for item in iterable:
                self.append(item)

    @property
    def maxlen(self):
        """Maximum size of the deque, or None if unbounded.  Read-only, as in
        CPython (``d.maxlen = ...`` raises AttributeError)."""
        return self._maxlen

    def append(self, item):
        self._state += 1
        self._items.append(item)
        if self.maxlen is not None:
            while len(self._items) > self.maxlen:
                self._items.pop(0)

    def appendleft(self, item):
        self._state += 1
        self._items.insert(0, item)
        if self.maxlen is not None:
            while len(self._items) > self.maxlen:
                self._items.pop()

    def pop(self):
        if not self._items:
            raise IndexError("pop from an empty deque")
        self._state += 1
        return self._items.pop()

    def popleft(self):
        if not self._items:
            raise IndexError("pop from an empty deque")
        self._state += 1
        return self._items.pop(0)

    def extend(self, iterable):
        # ``d.extend(d)`` snapshots first, exactly as CPython's deque_extend
        # does (``if (deque == iterable) ... PySequence_List``).  Without the
        # snapshot the append would trip the mutation guard the iterator now
        # enforces and raise RuntimeError; CPython doubles the deque instead.
        if iterable is self:
            iterable = list(self._items)
        for item in iterable:
            self.append(item)

    def extendleft(self, iterable):
        if iterable is self:
            iterable = list(self._items)
        for item in iterable:
            self.appendleft(item)

    def clear(self):
        self._state += 1
        self._items = []

    def remove(self, value):
        """Remove the first occurrence of value.  Raises ValueError
        if absent — matches CPython's list / deque ``remove`` semantics."""
        # ``x is value or x == value'': every element search in CPython goes
        # through PyObject_RichCompareBool, which short-circuits on IDENTITY
        # before calling __eq__.  Without it a value that is not equal to
        # itself is unfindable in a container that holds it -- nan being the
        # standard case (test_contains: nan must be found in deque([nan])).
        for i, x in enumerate(self._items):
            if x is value or x == value:
                self._state += 1
                del self._items[i]
                return
        raise ValueError("deque.remove(x): x not in deque")

    def count(self, value):
        # Comparison may mutate the deque (an element's __eq__ that clears it),
        # which CPython reports as ``RuntimeError: deque mutated during
        # iteration`` -- so re-check the mutation counter each step (a
        # comparison that itself raises, e.g. BadCompare, just propagates).
        state = self._state
        n = len(self._items)
        c = 0
        i = 0
        while i < n:
            if self._state != state:
                raise RuntimeError("deque mutated during iteration")
            # identity before __eq__ -- see the note in remove()
            if self._items[i] is value or self._items[i] == value:
                c += 1
            i += 1
        if self._state != state:
            raise RuntimeError("deque mutated during iteration")
        return c

    def index(self, value, start=0, stop=None):
        # Normalise start/stop like list.index: negatives count from the end and
        # both clamp into [0, len] (so ``d.index(x, 0, 4)`` on a length-3 deque
        # searches 0..2 and raises ValueError, not IndexError -- bug 24913).
        n = len(self._items)
        if stop is None:
            stop = n
        if start < 0:
            start = max(n + start, 0)
        elif start > n:
            start = n
        if stop < 0:
            stop = max(n + stop, 0)
        elif stop > n:
            stop = n
        state = self._state
        i = start
        while i < stop:
            if self._state != state:
                raise RuntimeError("deque mutated during iteration")
            # identity before __eq__ -- see the note in remove()
            if self._items[i] is value or self._items[i] == value:
                return i
            i += 1
        if self._state != state:
            raise RuntimeError("deque mutated during iteration")
        # CPython's wording, which names the method (deque_index in
        # _collectionsmodule.c) rather than repr'ing the value.
        raise ValueError("deque.index(x): x not in deque")

    def insert(self, i, value):
        self._state += 1
        self._items.insert(i, value)
        if self.maxlen is not None and len(self._items) > self.maxlen:
            raise IndexError("deque already at its maximum size")

    # Deque internals kept out of the copy/pickle state (they are reconstructed
    # from the elements + maxlen, not restored as attributes).
    _INTERNAL_ATTRS = ('_items', '_maxlen', '_state')

    def __getstate__(self):
        # Subclass instance attributes to carry through copy/pickle: __dict__
        # entries plus any set __slots__ values (test_deque
        # TestSubclass.test_copy_pickle sets d.x -- a slot -- and d.z -- a
        # __dict__ entry).  None when there is nothing extra.
        state = {}
        d = getattr(self, '__dict__', None)
        if d:
            for k, v in d.items():
                if k not in deque._INTERNAL_ATTRS:
                    state[k] = v
        for klass in type(self).__mro__:
            for name in getattr(klass, '__slots__', ()):
                if name in ('__dict__', '__weakref__') or name in deque._INTERNAL_ATTRS:
                    continue
                try:
                    state[name] = getattr(self, name)
                except AttributeError:
                    pass
        return state or None

    def __setstate__(self, state):
        # setattr (not __dict__.update) so a value belonging to a __slots__
        # descriptor lands in the slot, not a shadowed __dict__ entry.
        if state:
            for k, v in state.items():
                setattr(self, k, v)

    def copy(self):
        return self.__copy__()

    def __copy__(self):
        new = self.__class__(self._items, self._maxlen)
        new.__setstate__(self.__getstate__())
        return new

    def __deepcopy__(self, memo):
        import copy as _copy
        new = self.__class__(maxlen=self._maxlen)
        memo[id(self)] = new
        for item in self._items:
            new.append(_copy.deepcopy(item, memo))
        st = self.__getstate__()
        if st:
            new.__setstate__({k: _copy.deepcopy(v, memo) for k, v in st.items()})
        return new

    def __reduce__(self):
        # Pickle support (CPython deque_reduce): reconstruct an EMPTY deque of
        # the right maxlen, then supply the elements as the reduce tuple's
        # ``listitems`` iterator (4th slot) so pickle memoizes the deque BEFORE
        # appending -- a self-referential deque (``d.append(d)``) then resolves
        # its own element through the memo instead of recursing forever
        # (test_pickle_recursive).  Subclass instance attributes ride along as
        # BUILD state.
        state = self.__getstate__()
        # Iterate via the deque's own __iter__ (as CPython's deque_reduce does),
        # so a subclass with a broken __iter__ raises during pickling
        # (test_pickle_recursive's DequeWithBadIter) rather than silently
        # pickling the raw items.
        items = iter(self)
        if self._maxlen is None:
            return (self.__class__, (), state, items)
        return (self.__class__, ((), self._maxlen), state, items)

    def rotate(self, n=1):
        if not self._items:
            return
        k = self._items
        size = len(k)
        n = n % size
        if n != 0:
            self._state += 1
            self._items = k[-n:] + k[:-n]

    def __len__(self):
        return len(self._items)

    def __iter__(self):
        return _deque_iterator(self)

    def __reversed__(self):
        return _deque_reverse_iterator(self)

    def reverse(self):
        """Reverse the elements in place.  Returns None (like list.reverse)."""
        self._items.reverse()

    def __getitem__(self, i):
        return self._items[i]

    def __setitem__(self, i, value):
        # Item assignment does not invalidate iterators in CPython, so no
        # _state bump.  Negative / out-of-range handled by the backing list.
        self._items[i] = value

    def __delitem__(self, i):
        del self._items[i]
        self._state += 1

    def __contains__(self, item):
        # Membership compares each element, and a comparison may mutate the
        # deque (MutateCmp), which CPython reports as RuntimeError.
        state = self._state
        n = len(self._items)
        i = 0
        while i < n:
            if self._state != state:
                raise RuntimeError("deque mutated during iteration")
            # identity before __eq__ -- see the note in remove()
            if self._items[i] is item or self._items[i] == item:
                return True
            i += 1
        if self._state != state:
            raise RuntimeError("deque mutated during iteration")
        return False

    def __add__(self, other):
        # CPython deque supports ``deque + deque`` only (result carries self's
        # maxlen); other operand types are a TypeError via NotImplemented.
        if isinstance(other, deque):
            return deque(self._items + other._items, self._maxlen)
        return NotImplemented

    def __iadd__(self, other):
        self.extend(other)
        return self

    def __mul__(self, n):
        if not isinstance(n, int):
            return NotImplemented
        return deque(self._items * n, self._maxlen)

    def __rmul__(self, n):
        return self.__mul__(n)

    def __imul__(self, n):
        if not isinstance(n, int):
            return NotImplemented
        self._state += 1
        newitems = self._items * n
        if self._maxlen is not None and len(newitems) > self._maxlen:
            newitems = newitems[len(newitems) - self._maxlen:]
        self._items = newitems
        return self

    def __lt__(self, other):
        if isinstance(other, deque):
            return self._items < other._items
        return NotImplemented

    def __le__(self, other):
        if isinstance(other, deque):
            return self._items <= other._items
        return NotImplemented

    def __gt__(self, other):
        if isinstance(other, deque):
            return self._items > other._items
        return NotImplemented

    def __ge__(self, other):
        if isinstance(other, deque):
            return self._items >= other._items
        return NotImplemented

    def __eq__(self, other):
        # Element-wise equality between two deques (CPython compares deques
        # like sequences).  Delegating to list == gives Python's identity-
        # before-equality element comparison for free, so a deque containing
        # a non-reflexive element (float('nan'), test.support.NEVER_EQ) still
        # equals a deque built from the same objects (test_contains
        # test_nonreflexive).  Any non-deque operand is NotImplemented so the
        # reflected comparison / identity fallback runs.
        if isinstance(other, deque):
            return self._items == other._items
        return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __bool__(self):
        return len(self._items) > 0

    def __repr__(self):
        # Self-referential deque (``d.append(d)``) renders the recursive slot as
        # ``[...]`` (CPython Py_ReprEnter), and the maxlen is shown when bounded.
        if id(self) in deque._repr_running:
            return '[...]'
        deque._repr_running.add(id(self))
        try:
            name = type(self).__name__
            if self._maxlen is not None:
                return "%s(%r, maxlen=%d)" % (name, self._items, self._maxlen)
            return "%s(%r)" % (name, self._items)
        finally:
            deque._repr_running.discard(id(self))


import keyword as _keyword


class _NtFieldOrTupleMethod:
    """Bound to the two names a namedtuple field can collide with.

    A namedtuple IS a tuple, so ``tuple.index`` and ``tuple.count`` are real
    compiled methods on it -- and ordinary attribute lookup finds a method
    before it reaches the ``__getattr__`` fields are otherwise read through.
    So ``T = namedtuple('T', 'index desc'); T(3, 'x').index`` answered the
    METHOD, not 3.  CPython has no such problem: it binds every field to a
    ``_tuplegetter`` class attribute, which shadows the method by construction.

    Grail cannot synthesise one class attribute per field from inside a class
    STATEMENT -- the names are only known at factory-call time -- so instead
    the two names that CAN collide are bound unconditionally, and this decides
    per class which of the two things the name means.  ``count`` and ``index``
    are the whole list: tuple has no other public method, and every other name
    on it starts with an underscore, which namedtuple already refuses as a
    field name."""

    def __init__(self, name):
        self._name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        fields = type(obj)._fields
        if self._name in fields:
            return tuple.__getitem__(obj, tuple.index(fields, self._name))
        if self._name == 'index':
            return obj._nt_tuple_index
        return obj._nt_tuple_count

    def __repr__(self):
        return '<namedtuple field-or-method ' + self._name + '>'


def namedtuple(typename, field_names, rename=False, defaults=None, module=None):
    """Lightweight namedtuple factory.  Returns a REAL ``tuple`` subclass
    with named fields, ``_fields``, ``_field_defaults``, ``_make``,
    ``_asdict()`` and ``_replace(**kwargs)`` -- so ``isinstance(nt,
    tuple)`` holds, and equality, ordering and hashing are tuple's own
    rather than hand-written imitations of them.

    ``rename``/``defaults``/``module`` are keyword-only in real CPython
    (a bare ``*`` in the signature) -- Grail's def-codegen doesn't support
    the keyword-only marker (confirmed: ``def f(a, *, b=1)`` mis-binds
    ``b``), so they're ordinary keyword-or-positional parameters here;
    ``namedtuple('NT', fields, True)`` (rename passed positionally) does
    NOT raise TypeError as it does upstream
    (test_collections.TestNamedTuple.test_keyword_only_arguments).

    field_names may be a string ('x y' or 'x,y') or a sequence."""

    if isinstance(field_names, str):
        if ',' in field_names:
            fields = [f.strip() for f in field_names.split(',')]
        else:
            fields = field_names.split()
    else:
        fields = [str(f) for f in field_names]

    typename = str(typename)

    if rename:
        seen = set()
        for index in range(len(fields)):
            name = fields[index]
            if (not name.isidentifier()
                    or _keyword.iskeyword(name)
                    or name.startswith('_')
                    or name in seen):
                fields[index] = '_' + str(index)
            seen.add(name)

    for name in [typename] + fields:
        if not isinstance(name, str):
            raise TypeError('Type names and field names must be strings')
        if not name.isidentifier():
            raise ValueError(
                'Type names and field names must be valid identifiers: '
                + repr(name))
        if _keyword.iskeyword(name):
            raise ValueError(
                'Type names and field names cannot be a keyword: '
                + repr(name))

    seen = set()
    for name in fields:
        if name.startswith('_') and not rename:
            raise ValueError(
                'Field names cannot start with an underscore: '
                + repr(name))
        if name in seen:
            raise ValueError('Encountered duplicate field name: ' + repr(name))
        seen.add(name)

    fields = tuple(fields)

    if defaults is None:
        default_values = ()
    else:
        default_values = tuple(defaults)
    if len(default_values) > len(fields):
        raise TypeError('Got more default values than field names')
    field_defaults = {}
    for i in range(len(default_values)):
        field_defaults[fields[len(fields) - len(default_values) + i]] = default_values[i]

    class _NT(tuple):
        """The instance IS the tuple of its values, exactly as CPython's is.

        It was not always: values used to live in a ``_values`` instVar with
        the sequence protocol spelled out in front of them, because Grail
        could not pipe constructor arguments through to tuple storage when a
        class overrode ``__new__``.  It can now, and the workaround cost
        real conformance -- ``isinstance(nt, tuple)`` was False, which is
        the one thing every consumer of a namedtuple assumes, and it forced
        hand-written ``__eq__``/``__lt__``/``__hash__`` that had to
        re-implement tuple's own rules.  Those are all gone: the base
        supplies them, and supplies them right.
        """

        _fields = fields
        _typename = typename
        _field_defaults = field_defaults
        __match_args__ = fields

        def __new__(cls, *args, **kwargs):
            nfields = len(cls._fields)
            tname = cls._typename
            if len(args) > nfields:
                raise TypeError(
                    tname + '() takes ' + str(nfields)
                    + ' positional arguments but ' + str(len(args))
                    + ' were given')
            values = list(args)
            for i in range(len(args), nfields):
                name = cls._fields[i]
                if name in kwargs:
                    values.append(kwargs.pop(name))
                elif name in cls._field_defaults:
                    values.append(cls._field_defaults[name])
                else:
                    raise TypeError(
                        tname + '() missing required argument: '
                        + repr(name))
            for name in kwargs:
                if name not in cls._fields:
                    raise TypeError(
                        tname
                        + '() got an unexpected keyword argument: '
                        + repr(name))
                idx = cls._fields.index(name)
                if idx < len(args):
                    raise TypeError(
                        tname
                        + '() got multiple values for argument: '
                        + repr(name))
            return tuple.__new__(cls, values)

        # ``index`` / ``count`` name a FIELD on some namedtuples and tuple's
        # own method on the rest; _NtFieldOrTupleMethod decides which, and
        # falls back to these when the name is not a field.  They are spelled
        # out rather than delegating to ``tuple.index(self, ...)`` only
        # because the descriptor has to hand back something already bound.
        def _nt_tuple_index(self, value, start=0, stop=None):
            size = len(self)
            if stop is None or stop > size:
                stop = size
            for i in range(start, stop):
                if tuple.__getitem__(self, i) == value:
                    return i
            raise ValueError('tuple.index(x): x not in tuple')

        def _nt_tuple_count(self, value):
            found = 0
            for i in range(len(self)):
                if tuple.__getitem__(self, i) == value:
                    found = found + 1
            return found

        index = _NtFieldOrTupleMethod('index')
        count = _NtFieldOrTupleMethod('count')

        def __getattr__(self, name):
            """Field access.  CPython uses a per-field ``_tuplegetter``
            descriptor; Grail has no way to synthesise one class attribute
            per field from inside a class STATEMENT, so the lookup is done
            here instead.  __getattr__ only runs after ordinary lookup has
            missed, so a method or a class attribute still wins."""
            fields = type(self)._fields
            if name in fields:
                return tuple.__getitem__(self, fields.index(name))
            raise AttributeError(
                type(self).__name__ + ' object has no attribute '
                + repr(name))

        def __setattr__(self, name, value):
            if name in type(self)._fields:
                raise AttributeError("can't set attribute " + repr(name))
            object.__setattr__(self, name, value)

        def __delattr__(self, name):
            if name in type(self)._fields:
                raise AttributeError("can't delete attribute " + repr(name))
            object.__delattr__(self, name)

        def _asdict(self):
            result = {}
            for i in range(len(self._fields)):
                result[self._fields[i]] = tuple.__getitem__(self, i)
            return result

        def __getnewargs__(self):
            return tuple(self)

        @classmethod
        def _make(cls, iterable):
            """Build a new instance from any iterable of the right length.

            Goes STRAIGHT to tuple storage rather than through ``cls(...)``,
            as CPython's ``_make`` does (it is ``cls._tuple_new(cls,
            iterable)``).  That is what lets ``_replace`` work on a subclass
            whose ``__new__`` takes a different signature -- urllib3's
            ``Url.__new__(cls, scheme=None, auth=None, ...)`` normalises its
            arguments, and re-running it on already-normalised values is
            both wasteful and, for a subclass that validates, wrong."""
            values = list(iterable)
            if len(values) != len(cls._fields):
                raise TypeError(
                    cls._typename + '._make expected ' + str(len(cls._fields))
                    + ' values, got ' + str(len(values))
                )
            return tuple.__new__(cls, values)

        def _replace(self, **kwargs):
            extra = [k for k in kwargs if k not in self._fields]
            if extra:
                raise TypeError('Got unexpected field names: ' + repr(extra))
            values = list(self)
            for k in kwargs:
                values[self._fields.index(k)] = kwargs[k]
            return type(self)._make(values)

        # Python 3.13's copy.replace() protocol; _replace is its older name
        # and the two are documented to be the same operation.
        def __replace__(self, **kwargs):
            return self._replace(**kwargs)

        def __repr__(self):
            # The class now carries the typename as its own __name__, so a
            # direct namedtuple and a REAL subclass (``class B(A): pass'')
            # are both answered by asking the class.
            parts = []
            for i in range(len(self._fields)):
                parts.append(
                    self._fields[i] + '=' + repr(tuple.__getitem__(self, i)))
            return type(self).__name__ + '(' + ', '.join(parts) + ')'

    # The class the factory built is named after the typename it was asked
    # for, exactly as CPython's does.  The class STATEMENT above can only be
    # spelled one way, so every namedtuple was called ``_NT'' -- which showed
    # up in repr of subclasses and in error messages, and made the result
    # impossible to pickle, since pickle saves a class by looking its name back
    # up and ``collections._NT'' is not where it lives.
    _NT.__name__ = typename
    _NT.__qualname__ = typename

    # CPython defaults __module__ to the CALLER's module
    # (``_sys._getframe(1).f_globals['__name__']``) and, when it cannot work
    # that out, deliberately leaves __module__ alone rather than guessing.
    # Grail has no caller-frame access at all -- there is no sys._getframe, and
    # GemStone refuses frame inspection on the running process -- so the second
    # branch is the only one available here.
    #
    # Leaving it alone would mean inheriting ``collections'' from the class
    # statement above, which is never right and is worse than nothing: pickle
    # trusts a string __module__ and would look for ``collections.T''.  Clearing
    # it instead hands the question to pickle's own documented fallback,
    # whichmodule(), which scans sys.modules for where the class is actually
    # bound -- so a namedtuple built at module scope pickles, which none did
    # before.  An explicit ``module='' argument still wins, as upstream.
    _NT.__module__ = module
    return _NT


class Counter(dict):
    """Dict subclass for counting hashable objects.  Missing keys
    return 0 instead of raising KeyError."""

    def __init__(self, *args, **kwargs):
        super().__init__()
        if len(args) > 1:
            raise TypeError(
                'expected at most 1 arguments, got ' + str(len(args)))
        if args:
            iterable = args[0]
            if iterable is not None:
                self.update(iterable)
        if kwargs:
            self.update(kwargs)

    def __missing__(self, key):
        return 0

    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        return 0

    def __delitem__(self, key):
        """Like dict.__delitem__ but does not raise KeyError for a
        missing key (test_basics: ``del c['c']`` twice in a row)."""
        if key in self:
            super().__delitem__(key)

    def update(self, *args, **kwargs):
        # Real CPython's ``iterable`` parameter is positional-only (``/``),
        # letting ``update(iterable=42)`` land the literal key 'iterable'
        # in **kwds instead of binding the parameter -- Grail's codegen
        # doesn't support ``/``, so this takes the count via *args instead.
        if len(args) > 1:
            raise TypeError(
                'expected at most 1 arguments, got ' + str(len(args)))
        if args:
            iterable = args[0]
            if iterable is not None:
                if isinstance(iterable, dict):
                    if self:
                        for k in iterable:
                            self[k] = self[k] + iterable[k]
                    else:
                        # Fast path when self is empty: a direct set (no
                        # addition) so e.g. Counter(iterable=None) sets the
                        # count to None rather than computing 0 + None.
                        # NOT ``dict.update(self, iterable)`` -- Grail's
                        # dict primitives assume the receiver's own kernel
                        # representation, which a Python-level dict
                        # subclass (Counter) doesn't share, and crash
                        # (MessageNotUnderstood: #associationAt:).
                        for k in iterable:
                            self[k] = iterable[k]
                else:
                    for item in iterable:
                        self[item] = self[item] + 1
        if kwargs:
            self.update(kwargs)

    def subtract(self, *args, **kwargs):
        """Subtract counts from an iterable / mapping.  Both inputs and
        outputs may be zero or negative — unlike ``__sub__`` which
        drops non-positive counts."""
        if len(args) > 1:
            raise TypeError(
                'expected at most 1 arguments, got ' + str(len(args)))
        if args:
            iterable = args[0]
            if iterable is not None:
                if isinstance(iterable, dict):
                    for k in iterable:
                        self[k] = self[k] - iterable[k]
                else:
                    for item in iterable:
                        self[item] = self[item] - 1
        if kwargs:
            self.subtract(kwargs)

    def copy(self):
        """dict.copy() always returns a plain dict, dropping subclass-ness
        (test_copy_subclass expects type(d.copy()) == type(c))."""
        return self.__class__(self)

    __copy__ = copy

    @classmethod
    def fromkeys(cls, iterable, v=None):
        # No equivalent method for counters -- semantics would be ambiguous
        # (Counter.fromkeys('aaabbc', v=2)?).  Zero is already the default
        # lookup value; use Counter(set(iterable)) for all-ones.
        raise NotImplementedError(
            'Counter.fromkeys() is undefined.  Use Counter(iterable) instead.')

    def most_common(self, n=None):
        # list.sort(key=...) varargs is missing in Grail; do a simple
        # selection-sort on count descending (fine for the small Counter
        # sizes Werkzeug / itsdangerous see).  Tuple-swap with subscript
        # targets isn't supported in codegen either, so swap via a temp.
        pairs = list(self.items())
        size = len(pairs)
        for i in range(size):
            best = i
            for j in range(i + 1, size):
                if pairs[j][1] > pairs[best][1]:
                    best = j
            if best != i:
                tmp = pairs[i]
                pairs[i] = pairs[best]
                pairs[best] = tmp
        if n is None:
            return pairs
        return pairs[:n]

    def total(self):
        result = 0
        for v in self.values():
            result = result + v
        return result

    def elements(self):
        result = []
        for k in self:
            for _ in range(self[k]):
                result.append(k)
        return result

    # Arithmetic operators — Counter algebra per CPython.  ``+'' / ``-''
    # drop zero and negative counts from the result; ``&'' / ``|'' do
    # not (they produce element-wise min / max regardless of sign).

    def __add__(self, other):
        result = Counter()
        for k in self:
            v = self[k] + other[k]
            if v > 0:
                result[k] = v
        for k in other:
            if k not in self:
                v = other[k]
                if v > 0:
                    result[k] = v
        return result

    def __sub__(self, other):
        result = Counter()
        for k in self:
            v = self[k] - other[k]
            if v > 0:
                result[k] = v
        for k in other:
            if k not in self:
                v = other[k]
                if v < 0:
                    result[k] = 0 - v
        return result

    def __and__(self, other):
        # element-wise min, drop zero/negative
        result = Counter()
        for k in self:
            if k in other:
                a = self[k]
                b = other[k]
                v = a if a < b else b
                if v > 0:
                    result[k] = v
        return result

    def __or__(self, other):
        # element-wise max, drop zero/negative
        result = Counter()
        for k in self:
            a = self[k]
            b = other[k]
            v = a if a > b else b
            if v > 0:
                result[k] = v
        for k in other:
            if k not in self:
                v = other[k]
                if v > 0:
                    result[k] = v
        return result

    def __pos__(self):
        """Adds an empty counter, stripping negative and zero counts."""
        return self + Counter()

    def __neg__(self):
        """Subtracts from an empty counter, stripping positive and zero
        counts and flipping the sign on negative counts."""
        return Counter() - self

    def _keep_positive(self):
        nonpositive = [k for k in self if not self[k] > 0]
        for k in nonpositive:
            del self[k]
        return self

    def __iadd__(self, other):
        for k in other:
            self[k] = self[k] + other[k]
        return self._keep_positive()

    def __isub__(self, other):
        for k in other:
            self[k] = self[k] - other[k]
        return self._keep_positive()

    def __ior__(self, other):
        for k in other:
            other_count = other[k]
            if other_count > self[k]:
                self[k] = other_count
        return self._keep_positive()

    def __iand__(self, other):
        for k in list(self):
            other_count = other[k]
            if other_count < self[k]:
                self[k] = other_count
        return self._keep_positive()

    # Multiset comparisons — every element's count in ``self`` compares to
    # its count in ``other`` (missing keys read as 0 via __getitem__), per
    # CPython's Counter.  NOT the same as dict equality: zero/absent counts
    # compare equal, so Counter(a=1, b=0) == Counter(a=1).
    def __eq__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        for k in self:
            if self[k] != other[k]:
                return False
        for k in other:
            if self[k] != other[k]:
                return False
        return True

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __le__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        for k in self:
            if self[k] > other[k]:
                return False
        for k in other:
            if self[k] > other[k]:
                return False
        return True

    def __lt__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        return self.__le__(other) and self != other

    def __ge__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        for k in self:
            if self[k] < other[k]:
                return False
        for k in other:
            if self[k] < other[k]:
                return False
        return True

    def __gt__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        return self.__ge__(other) and self != other

    def __repr__(self):
        if not self:
            return self.__class__.__name__ + '()'
        try:
            items = self.most_common()
        except TypeError:
            items = list(self.items())
        return self.__class__.__name__ + '(' + repr(dict(items)) + ')'


class ChainMap(MutableMapping):
    """View over a sequence of mappings; reads consult them in order,
    writes target the first mapping."""

    def __init__(self, *maps):
        if not maps:
            self.maps = [{}]
        else:
            self.maps = list(maps)

    def __getitem__(self, key):
        for m in self.maps:
            if key in m:
                return m[key]
        return self.__missing__(key)

    def __missing__(self, key):
        raise KeyError(key)

    def __repr__(self):
        return (self.__class__.__name__ + '('
                + ', '.join([repr(m) for m in self.maps]) + ')')

    def __setitem__(self, key, value):
        self.maps[0][key] = value

    def __delitem__(self, key):
        if key not in self.maps[0]:
            raise KeyError(key)
        del self.maps[0][key]

    def __contains__(self, key):
        for m in self.maps:
            if key in m:
                return True
        return False

    def __len__(self):
        keys = set()
        for m in self.maps:
            for k in m:
                keys.add(k)
        return len(keys)

    def __iter__(self):
        # Combined order matches a series of dict updates from LAST map to
        # FIRST (not first-map-first) -- build a plain dict by updating
        # with each map in reverse, so an earlier map's keys/positions win
        # (dict.update reordering rules), matching CPython's actual
        # ChainMap.__iter__ (test_collections.TestChainMap.test_ordering /
        # test_order_preservation).
        d = {}
        for m in reversed(self.maps):
            d.update(dict.fromkeys(m))
        return iter(d)

    def get(self, key, default=None):
        for m in self.maps:
            if key in m:
                return m[key]
        return default

    def keys(self):
        return list(iter(self))

    def values(self):
        return [self[k] for k in self]

    def items(self):
        return [(k, self[k]) for k in self]

    def new_child(self, m=None, **kwargs):
        if m is None:
            m = kwargs
        elif kwargs:
            m.update(kwargs)
        child = self.__class__()
        # Replace the auto-created empty dict with our prepended view.
        child.maps = [m]
        for old in self.maps:
            child.maps.append(old)
        return child

    def copy(self):
        """New ChainMap or subclass with a new copy of maps[0] and
        refs to maps[1:]."""
        return self.__class__(self.maps[0].copy(), *self.maps[1:])

    __copy__ = copy

    def __or__(self, other):
        if not isinstance(other, Mapping):
            return NotImplemented
        m = self.copy()
        m.maps[0].update(other)
        return m

    def __ror__(self, other):
        if not isinstance(other, Mapping):
            return NotImplemented
        m = dict(other)
        for mapping in reversed(self.maps):
            m.update(mapping)
        return self.__class__(m)

    def __ior__(self, other):
        self.maps[0].update(other)
        return self

    # CPython exposes ``parents'' as a property; Grail's property
    # codegen on a class-body method is incomplete, so expose it as a
    # plain unary method.  Returns a fresh ChainMap over self.maps[1:]
    # (drops the first / writable map).
    def parents(self):
        result = ChainMap()
        result.maps = list(self.maps[1:])
        if not result.maps:
            result.maps = [{}]
        return result

    def pop(self, key, *args):
        """Pop from the first map; KeyError if absent.  Optional default
        suppresses the KeyError."""
        if key in self.maps[0]:
            v = self.maps[0][key]
            del self.maps[0][key]
            return v
        if args:
            return args[0]
        raise KeyError(key)

    def popitem(self):
        """Pop an arbitrary (key, value) pair from the first map.
        Raises KeyError if the first map is empty."""
        if not self.maps[0]:
            raise KeyError('No keys found in the first mapping.')
        # dict.popitem returns the last-inserted pair (LIFO since 3.7);
        # rely on the first map's own popitem.
        return self.maps[0].popitem()

    def clear(self):
        """Clear only the first map — other maps in the chain are
        untouched, mirroring CPython semantics."""
        self.maps[0].clear()


__all__ = [
    'defaultdict', 'OrderedDict', 'deque', 'namedtuple',
    'Counter', 'ChainMap',
]


class UserList:
    """List wrapper with .data — subclassed by django.utils.datastructures
    and forms.utils.ErrorList."""

    def __init__(self, initlist=None):
        self.data = []
        if initlist is not None:
            if isinstance(initlist, UserList):
                self.data[:] = initlist.data[:]
            else:
                self.data[:] = list(initlist)

    def __repr__(self):
        return repr(self.data)

    def __contains__(self, item):
        return item in self.data

    def __len__(self):
        return len(self.data)

    def __getitem__(self, i):
        if isinstance(i, slice):
            result = self.__class__()
            result.data = self.data[i]
            return result
        return self.data[i]

    def __setitem__(self, i, item):
        self.data[i] = item

    def __delitem__(self, i):
        del self.data[i]

    def __iter__(self):
        # Iterate THROUGH __getitem__ (like CPython's Sequence mixin, which
        # UserList inherits) rather than over self.data directly, so a
        # subclass overriding __getitem__ is honoured by iteration
        # (test_userlist test_getitemoverwriteiter).
        i = 0
        try:
            while True:
                v = self[i]
                yield v
                i += 1
        except IndexError:
            return

    def __reversed__(self):
        # Grail's reversed() builtin prefers __reversed__ and otherwise falls
        # back to the env-0 #reverseDo:, which a UserList does not understand.
        return reversed(self.data)

    def __eq__(self, other):
        return self.data == self.__cast(other)

    def __lt__(self, other):
        return self.data < self.__cast(other)

    def __le__(self, other):
        return self.data <= self.__cast(other)

    def __gt__(self, other):
        return self.data > self.__cast(other)

    def __ge__(self, other):
        return self.data >= self.__cast(other)

    def __cast(self, other):
        return other.data if isinstance(other, UserList) else other

    def __add__(self, other):
        result = self.__class__()
        if isinstance(other, UserList):
            result.data = self.data + other.data
        else:
            result.data = self.data + list(other)
        return result

    def __radd__(self, other):
        # Reached when ``other + self`` and other (list/str/tuple/an iterator)
        # does not know how to add a UserList, so Python tries the reflected
        # form here (test_userlist test_mixed_add).
        result = self.__class__()
        if isinstance(other, UserList):
            result.data = other.data + self.data
        else:
            result.data = list(other) + self.data
        return result

    def __iadd__(self, other):
        # In place: keep object identity (``u += x; u is u2``) — test_iadd /
        # test_mixed_iadd assert the augmented target is the same object.
        if isinstance(other, UserList):
            self.data += other.data
        else:
            self.data += list(other)
        return self

    def __mul__(self, n):
        result = self.__class__()
        result.data = self.data * n
        return result

    def __rmul__(self, n):
        return self.__mul__(n)

    def __imul__(self, n):
        """``ul *= n`` mutates IN PLACE and answers self, as CPython's UserList
        does.  Without it, ``*=`` fell back to __mul__ and rebound the name to a
        new object, so ``id(ul)`` changed -- which list_tests' test_imul asserts
        it must not.  That test passed only by luck, when the discarded object's
        recycled identityHash happened to match the new one."""
        self.data *= n
        return self

    def append(self, item):
        self.data.append(item)

    def insert(self, i, item):
        self.data.insert(i, item)

    def pop(self, i=-1):
        return self.data.pop(i)

    def remove(self, item):
        self.data.remove(item)

    def clear(self):
        self.data.clear()

    def copy(self):
        result = self.__class__()
        result.data = list(self.data)
        return result

    def __copy__(self):
        # Unlike ``.copy()'' above, ``copy.copy()'' must carry over ANY
        # instance attribute the caller added (test_collections'
        # TestUserObjects._copy_test sets ``obj.test`` and expects the
        # copy to keep it), not just ``.data''.
        inst = self.__class__()
        inst.__dict__.update(self.__dict__)
        inst.data = list(self.data)
        return inst

    def count(self, item):
        return self.data.count(item)

    def index(self, item, *args):
        return self.data.index(item, *args)

    def reverse(self):
        self.data.reverse()

    def sort(self, *args, **kwds):
        self.data.sort(*args, **kwds)

    def extend(self, other):
        if isinstance(other, UserList):
            self.data.extend(other.data)
        else:
            self.data.extend(other)


class UserDict:
    """Dict wrapper with .data."""

    # Upstream's UserDict subclasses MutableMapping and inherits this marker
    # from Mapping; Grail's is standalone, so it has to say so itself.  ``None''
    # means "not reversible" -- without it reversed(UserDict(...)) fell through
    # to the SEQUENCE protocol, which __len__ and __getitem__ make it look like,
    # and asked for key 1: ``KeyError: 1'' where CPython raises ``TypeError:
    # 'UserDict' object is not reversible''.
    __reversed__ = None

    def __init__(self, dict=None, /, **kwargs):
        # ``/`` makes self and dict POSITIONAL-ONLY, as upstream.  Without it,
        # UserDict(dict=42) and UserDict(self=42) bound the parameters instead
        # of becoming data keys -- so ``UserDict(dict=[('one', 1)])`` built
        # {'one': 1} rather than {'dict': [('one', 1)]}, and UserDict(self=42)
        # silently produced an empty mapping (test_userdict test_init /
        # test_update / test_all).  Any name is a legal dict key, which is
        # exactly why upstream fences the parameters off.
        self.data = {}
        if dict is not None:
            self.update(dict)
        if kwargs:
            self.update(kwargs)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, key):
        if key in self.data:
            return self.data[key]
        if hasattr(self.__class__, "__missing__"):
            return self.__class__.__missing__(self, key)
        raise KeyError(key)

    def __setitem__(self, key, item):
        self.data[key] = item

    def __delitem__(self, key):
        del self.data[key]

    def __iter__(self):
        return iter(self.data)

    def __contains__(self, key):
        return key in self.data

    def __repr__(self):
        return repr(self.data)

    def __eq__(self, other):
        # CPython's UserDict inherits Mapping.__eq__
        # (``isinstance(other, Mapping) and dict(self) == dict(other)``); this
        # simplified stand-in has no ABC base, so compare .data directly.  A
        # UserDict compares equal to a plain dict with the same items
        # (test_dict test_fromkeys: mydict.__new__ returns a UserDict).
        if isinstance(other, UserDict):
            return self.data == other.data
        return self.data == other

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    __hash__ = None  # mappings are unhashable, as in CPython

    def get(self, key, default=None):
        if key in self.data:
            return self.data[key]
        return default

    def keys(self):
        return self.data.keys()

    def values(self):
        return self.data.values()

    def items(self):
        return self.data.items()

    def update(self, other=None, /, **kwargs):
        # ``/`` for the same reason as __init__: upstream's MutableMapping.update
        # is ``update(self, other=(), /, **kwds)'', so d.update(self=42) and
        # d.update(other=42) set DATA keys (test_userdict test_update).
        if other is not None:
            if hasattr(other, "keys"):
                for k in other.keys():
                    self.data[k] = other[k]
            else:
                for k, v in other:
                    self.data[k] = v
        for k, v in kwargs.items():
            self.data[k] = v

    def setdefault(self, key, default=None):
        if key in self.data:
            return self.data[key]
        self.data[key] = default
        return default

    # PEP 584 dict union.  ``|`` builds a NEW mapping of the LEFT operand's
    # class (so UserDict | UserDictSubclass is a UserDict), while ``|=`` updates
    # in place and returns self.  NotImplemented for anything that is neither a
    # UserDict nor a dict, which is what lets the reflected __ror__ run and keeps
    # ``dict | UserDict`` answering a UserDict (test_userdict test_mixed_or /
    # test_mixed_ior).
    def __or__(self, other):
        if isinstance(other, UserDict):
            return self.__class__(self.data | other.data)
        if isinstance(other, dict):
            return self.__class__(self.data | other)
        return NotImplemented

    def __ror__(self, other):
        if isinstance(other, UserDict):
            return self.__class__(other.data | self.data)
        if isinstance(other, dict):
            return self.__class__(other | self.data)
        return NotImplemented

    def __ior__(self, other):
        if isinstance(other, UserDict):
            self.data |= other.data
        else:
            self.data |= other
        return self

    def pop(self, key, *args):
        return self.data.pop(key, *args)

    def popitem(self):
        return self.data.popitem()

    def clear(self):
        self.data.clear()

    def copy(self):
        result = self.__class__()
        result.data = dict(self.data)
        return result

    def __copy__(self):
        # See UserList.__copy__: must carry over ad-hoc instance attrs too.
        inst = self.__class__()
        inst.__dict__.update(self.__dict__)
        inst.data = dict(self.data)
        return inst

    @classmethod
    def fromkeys(cls, iterable, value=None):
        d = cls()
        for key in iterable:
            d[key] = value
        return d


class UserString:
    """String wrapper with .data — rarely subclassed; minimal."""

    def __init__(self, seq):
        if isinstance(seq, str):
            self.data = seq
        elif isinstance(seq, UserString):
            self.data = seq.data[:]
        else:
            self.data = str(seq)

    def __str__(self):
        return str(self.data)

    def __repr__(self):
        return repr(self.data)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        return self.__class__(self.data[index])

    def __eq__(self, string):
        if isinstance(string, UserString):
            return self.data == string.data
        return self.data == string

    def __add__(self, other):
        if isinstance(other, UserString):
            return self.__class__(self.data + other.data)
        return self.__class__(self.data + str(other))

    def __contains__(self, char):
        if isinstance(char, UserString):
            char = char.data
        return char in self.data


def _count_elements(mapping, iterable):
    # CPython's C-accelerated Counter helper; pure-Python equivalent.
    for elem in iterable:
        mapping[elem] = mapping.get(elem, 0) + 1
