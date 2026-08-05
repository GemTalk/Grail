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


class deque:
    """Double-ended queue backed by a list.  O(n) for arbitrary
    indexing, O(1) amortized for append/appendleft/pop/popleft."""

    # Bumped by every structural mutation so a live _deque_iterator can detect
    # one (CPython's deque->state).  Also a class-level default, so an instance
    # that somehow skipped __init__ still reads a value rather than raising.
    _state = 0

    def __init__(self, iterable=None, maxlen=None):
        self._items = []
        self.maxlen = maxlen
        self._state = 0
        if iterable is not None:
            for item in iterable:
                self.append(item)

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
        for i, x in enumerate(self._items):
            if x == value:
                self._state += 1
                del self._items[i]
                return
        raise ValueError("deque.remove(x): x not in deque")

    def count(self, value):
        return sum(1 for x in self._items if x == value)

    def index(self, value, start=0, stop=None):
        if stop is None:
            stop = len(self._items)
        for i in range(start, stop):
            if self._items[i] == value:
                return i
        raise ValueError("deque.index(x): x not in deque")

    def insert(self, i, value):
        self._state += 1
        self._items.insert(i, value)
        if self.maxlen is not None and len(self._items) > self.maxlen:
            raise IndexError("deque already at its maximum size")

    def copy(self):
        new = deque(self._items, self.maxlen)
        return new

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
        return _deque_iterator(self, True)

    def __getitem__(self, i):
        return self._items[i]

    def __contains__(self, item):
        return item in self._items

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
        return "deque(" + repr(self._items) + ")"


import keyword as _keyword


def namedtuple(typename, field_names, rename=False, defaults=None, module=None):
    """Lightweight namedtuple factory.  Returns a sequence-like class
    that supports indexed access, iteration, len(), ``_fields``,
    ``_asdict()``, and ``_replace(**kwargs)``.

    Subclassing the built-in `tuple` would carry the per-element data
    automatically, but Grail's class-call protocol doesn't pipe
    constructor arguments through to the underlying tuple storage when
    the class overrides `__new__`.  Storing values in an instVar and
    fronting them with the sequence protocol is the workaround -- so
    ``isinstance(nt, tuple)`` does NOT hold here (a documented gap;
    see test_collections.TestNamedTuple.test_tupleness).

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

    class _NT:
        _fields = fields
        _typename = typename
        _field_defaults = field_defaults
        __match_args__ = fields

        def __init__(self, *args, **kwargs):
            nfields = len(self._fields)
            typename = self._typename
            if len(args) > nfields:
                raise TypeError(
                    typename + '() takes ' + str(nfields)
                    + ' positional arguments but ' + str(len(args))
                    + ' were given')
            values = list(args)
            for i in range(len(args), nfields):
                name = self._fields[i]
                if name in kwargs:
                    values.append(kwargs.pop(name))
                elif name in self._field_defaults:
                    values.append(self._field_defaults[name])
                else:
                    raise TypeError(
                        typename + '() missing required argument: '
                        + repr(name))
            for name in kwargs:
                if name not in self._fields:
                    raise TypeError(
                        typename
                        + '() got an unexpected keyword argument: '
                        + repr(name))
                idx = self._fields.index(name)
                if idx < len(args):
                    raise TypeError(
                        typename
                        + '() got multiple values for argument: '
                        + repr(name))
            object.__setattr__(self, '_values', values)

        def __getattr__(self, name):
            fields = self._fields
            if name in fields:
                return self._values[fields.index(name)]
            raise AttributeError(
                type(self).__name__ + ' object has no attribute '
                + repr(name))

        def __setattr__(self, name, value):
            if name in self._fields:
                raise AttributeError("can't set attribute " + repr(name))
            object.__setattr__(self, name, value)

        def __delattr__(self, name):
            if name in self._fields:
                raise AttributeError("can't delete attribute " + repr(name))
            object.__delattr__(self, name)

        def __getitem__(self, i):
            return self._values[i]

        def __len__(self):
            return len(self._values)

        def __iter__(self):
            return iter(self._values)

        def __hash__(self):
            return hash(tuple(self._values))

        def __eq__(self, other):
            if hasattr(other, '_values'):
                return self._values == other._values
            return self._values == list(other)

        def _asdict(self):
            result = {}
            for i in range(len(self._fields)):
                result[self._fields[i]] = self._values[i]
            return result

        def __getnewargs__(self):
            return tuple(self._values)

        @classmethod
        def _make(cls, iterable):
            """Build a new instance from any iterable of the right
            length.  CPython's namedtuple exposes this as a class
            method that takes a sequence.  Splats the values back
            through __init__ so we don't have to round-trip through
            the unbound ``cls.__new__(cls)'' descriptor read."""
            values = list(iterable)
            if len(values) != len(cls._fields):
                raise TypeError(
                    cls._typename + '._make expected ' + str(len(cls._fields))
                    + ' values, got ' + str(len(values))
                )
            return cls(*values)

        def _replace(self, **kwargs):
            extra = [k for k in kwargs if k not in self._fields]
            if extra:
                raise TypeError('Got unexpected field names: ' + repr(extra))
            values = list(self._values)
            for k in kwargs:
                values[self._fields.index(k)] = kwargs[k]
            # Re-instantiate via the regular constructor (splats the
            # updated values back through __init__).  Using ``cls(*values)''
            # rather than ``cls.__new__(cls)'' avoids the unbound
            # descriptor-read path that Grail handles differently for
            # cls.__new__ on a Python user class.
            cls = type(self)
            return cls(*values)

        def __repr__(self):
            # ``self._typename`` is fixed at factory-call time (the
            # underlying Smalltalk class is always literally ``_NT'',
            # so it can't carry a per-call name) -- a REAL subclass
            # (``class B(A): pass'') has its own genuine class name, so
            # prefer that when this instance isn't a direct ``_NT''.
            cls = type(self)
            name = cls.__name__ if cls is not _NT else self._typename
            parts = []
            for i in range(len(self._fields)):
                parts.append(self._fields[i] + '=' + repr(self._values[i]))
            return name + '(' + ', '.join(parts) + ')'

    if module is not None:
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
