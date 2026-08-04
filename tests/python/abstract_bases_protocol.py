"""The old-style ``__bases__`` protocol for isinstance() / issubclass().

CPython does not require a real type. `recursive_issubclass` falls back to
`abstract_issubclass`, which walks the candidate's ``__bases__`` graph by
identity; `recursive_isinstance` does the same starting from the instance's
``__class__``. An object that merely exposes a tuple ``__bases__`` therefore
participates in subclass checks without being a type at all — the pattern
`test_isinstance` uses throughout, and the one `abc`-era code relied on.

Grail rejected both outright with ``issubclass() arg must be a type``, which was
16 of test_isinstance's 20 failures.

TWO LIMITS ARE DELIBERATE AND ASSERTED HERE:

* A cyclic ``__bases__`` graph raises Python's **RecursionError** rather than
  spinning. Grail's guard is an explicit step count, because the walk consumes no
  Smalltalk stack of its own — CPython gets its RecursionError from the C stack
  that the repeated getter calls consume.
* The ceiling is low (20). CPython's default limit is 1000, but its own tests for
  these shapes wrap them in ``support.infinite_recursion(25)``, and Grail cannot
  afford even that: a getter that manufactures classes per level overflows the
  Smalltalk stack before a larger counter would fire. Real ``__bases__`` graphs
  are shallow.

WHAT IS STILL BROKEN, and why these tests use the decorator form: ``__bases__ =
property(getbases)`` — property as a CALL in a class body — does not produce a
descriptor in Grail; the read answers a BoundMethod. Only the ``@property``
DECORATOR form works. That is a separate root (it also accounts for much of
test_property), and it is why the remaining `issubclass() arg N must be a class`
failures in test_isinstance persist.
"""

RESULTS = {}


def _catch(fn, *args, **kw):
    try:
        return fn(*args, **kw)
    except BaseException as exc:                     # noqa: BLE001
        return type(exc).__name__


class _Old:
    """An old-style 'class': not a type, but exposes a tuple __bases__."""

    def __init__(self, bases=()):
        self._bases = bases

    @property
    def __bases__(self):
        return self._bases


_SUPER = _Old()
_MID = _Old(bases=(_SUPER,))
_CHILD = _Old(bases=(_MID,))


class _OldInstance:
    def __init__(self, klass):
        self._klass = klass

    @property
    def __class__(self):
        return self._klass


# ------------------------------------------------- 1. issubclass via __bases__

def issubclass_walks_the_bases_graph():
    return [
        issubclass(_CHILD, _CHILD),      # identity
        issubclass(_CHILD, _MID),        # one hop
        issubclass(_CHILD, _SUPER),      # two hops (the linear-chain walk)
        issubclass(_SUPER, _CHILD),      # wrong direction
        issubclass(_MID, _Old()),        # unrelated
    ] == [True, True, True, False, False]


def issubclass_walks_multiple_bases():
    """A node with several bases recurses into each; a single base iterates, so a
    long linear chain costs no depth."""
    a, b = _Old(), _Old()
    multi = _Old(bases=(a, b))
    deeper = _Old(bases=(multi,))
    return [issubclass(multi, a), issubclass(multi, b),
            issubclass(deeper, b), issubclass(a, b)] == [True, True, True, False]


def empty_bases_is_not_a_subclass():
    """An empty ``__bases__`` terminates the walk with False — it does not mean
    'matches anything'."""
    return issubclass(_Old(bases=()), _MID) is False


# -------------------------------------------------- 2. isinstance via __class__

def isinstance_uses_the_instances_class():
    inst = _OldInstance(_CHILD)
    return [isinstance(inst, _CHILD), isinstance(inst, _SUPER),
            isinstance(_OldInstance(_SUPER), _CHILD)] == [True, True, False]


# ------------------------------------------- 3. non-classes still raise TypeError

def a_plain_non_class_still_raises_typeerror():
    """Something with no ``__bases__`` at all is still an error — and a
    CATCHABLE Python TypeError, not the AttributeError that leaked out when the
    guard caught the wrong exception class."""
    return [_catch(issubclass, 1, 2), _catch(isinstance, 1, 2),
            _catch(issubclass, _CHILD, 5)] == ['TypeError'] * 3


def a_non_tuple_bases_does_not_qualify():
    """``__bases__`` must be a TUPLE; anything else means 'not a class'."""
    class Bad:
        @property
        def __bases__(self):
            return 'not a tuple'
    return _catch(issubclass, Bad(), _MID) == 'TypeError'


# ---------------------------------------------------------- 4. the depth guard

def a_cyclic_bases_graph_raises_recursionerror():
    """Self-referential ``__bases__`` used to spin forever in the single-base
    walk — which took the whole module down rather than failing one test."""
    class Cycle:
        @property
        def __bases__(self):
            return (self,)
    return _catch(issubclass, Cycle(), int) == 'RecursionError'


def a_mutually_cyclic_graph_raises_recursionerror():
    left = _Old()
    right = _Old(bases=(left,))
    left._bases = (right,)
    return _catch(issubclass, left, _MID) == 'RecursionError'


# ------------------------------------------- 5. real types are unaffected

class _RealBase:
    pass


class _RealSub(_RealBase):
    pass


def real_types_are_unaffected():
    """The fast path must not change: both arguments being real types never
    reaches the __bases__ walk.  Module-level classes deliberately — a
    method-local class has separate constraints in Grail."""
    A, B = _RealBase, _RealSub
    return [issubclass(B, A), issubclass(A, B), issubclass(bool, int),
            isinstance('a', str), isinstance(1, int), isinstance(1, str),
            issubclass(B, (str, A)), isinstance(1, (str, int))] == \
        [True, False, True, True, True, False, True, True]


RESULTS = {
    'issubclass_graph': issubclass_walks_the_bases_graph(),
    'issubclass_multi': issubclass_walks_multiple_bases(),
    'empty_bases': empty_bases_is_not_a_subclass(),
    'isinstance_class': isinstance_uses_the_instances_class(),
    'non_class_typeerror': a_plain_non_class_still_raises_typeerror(),
    'non_tuple_bases': a_non_tuple_bases_does_not_qualify(),
    'cyclic_recursionerror': a_cyclic_bases_graph_raises_recursionerror(),
    'mutual_cycle': a_mutually_cyclic_graph_raises_recursionerror(),
    'real_types': real_types_are_unaffected(),
}
