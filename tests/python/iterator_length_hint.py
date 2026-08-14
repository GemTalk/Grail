"""Iterator length transparency — regressions for the test.test_iterlen round.

The invariant every one of these protects is CPython's:

    len(it) == len(list(it))

i.e. ``operator.length_hint`` on an ITERATOR reports how many items it has
LEFT, and that count decreases as the iterator is consumed.  A container's
``len()`` is a different number — it is static — so answering a container where
CPython answers an iterator silently breaks the invariant.

Each function returns a value the SUnit side asserts; RESULTS at the bottom is
the whole set, computed once at import.  Anything that raises is recorded as a
short string rather than propagating, since a Smalltalk error escaping module
load would lose every later result.
"""

from operator import length_hint
from collections import deque

N = 10


def _catch(fn, *args):
    """Run fn(*args), reporting an exception as 'ExcName' instead of raising.

    The maker is passed as an ARGUMENT rather than captured with the usual
    ``lambda m=make:`` late-binding trick, because a lambda with a default
    argument is a documented Grail gap (LambdaAst>>printSmalltalkOn: emits an
    unconditional ``positional at: i``) and calling one raises an uncatchable
    Smalltalk OffsetError.
    """
    try:
        return fn(*args)
    except BaseException as exc:                     # noqa: BLE001
        return type(exc).__name__


# ---------------------------------------------------------------- 1. the hint
# exists at all, and DECREASES, on every built-in iterator flavour

def _hint_decreases(make):
    """length_hint over a full walk of make(): [N, N-1, ..., 1, 0] then still 0
    once StopIteration has been seen."""
    it = make()
    seen = []
    for _ in range(N):
        seen.append(length_hint(it))
        next(it)
    seen.append(length_hint(it))
    try:
        next(it)
        seen.append('no StopIteration')
    except StopIteration:
        seen.append(length_hint(it))
    return seen


_EXPECTED_WALK = list(range(N, 0, -1)) + [0, 0]


def hint_decreases_over_every_iterator():
    """The eight iterator types test.test_iterlen walks.  range_iterator,
    tuple_iterator and the three dict iterators reported 0 for every step
    (no __length_hint__ at all, so operator.length_hint used its default);
    reversed(range(N)) reported a static N (it answered a range, not an
    iterator)."""
    makers = {
        'range_iterator':      lambda: iter(range(N)),
        'tuple_iterator':      lambda: iter(tuple(range(N))),
        'str_iterator':        lambda: iter('a' * N),
        'list_iterator':       lambda: iter(list(range(N))),
        'list_reverseiterator': lambda: reversed(list(range(N))),
        'range_reversed':      lambda: reversed(range(N)),
        'dict_keyiterator':    lambda: iter(dict.fromkeys(range(N))),
        'dict_itemiterator':   lambda: iter(dict.fromkeys(range(N)).items()),
        'dict_valueiterator':  lambda: iter(dict.fromkeys(range(N)).values()),
        'set_iterator':        lambda: iter(set(range(N))),
        'deque_iterator':      lambda: iter(deque(range(N))),
        'deque_reverse':       lambda: reversed(deque(range(N))),
    }
    bad = []
    for name, make in makers.items():
        got = _catch(_hint_decreases, make)
        if got != _EXPECTED_WALK:
            bad.append('%s: %s' % (name, got))
    return bad or True


# --------------------------------------------- 2. reversed(range(n)) is an
# ITERATOR, not a range

def reversed_range_is_an_iterator():
    it = reversed(range(4))
    return (type(it).__name__ == 'range_iterator'
            and next(it) == 3
            and list(it) == [2, 1, 0]
            # ... and the range arithmetic behind it is still right
            and list(reversed(range(1, 10, 3))) == [7, 4, 1]
            and list(reversed(range(0))) == [])


# ------------------------------------------- 3. temporarily-immutable types:
# mutating mid-iteration raises RuntimeError AND latches the hint to zero

def _mutation_is_detected(make_pair):
    """CPython's TestTemporarilyImmutable shape: hint N, consume one, hint N-1,
    mutate, next() raises RuntimeError, hint is 0 from then on."""
    it, mutate = make_pair()
    first = length_hint(it)
    next(it)
    second = length_hint(it)
    mutate()
    try:
        next(it)
        raised = 'no RuntimeError'
    except RuntimeError:
        raised = 'RuntimeError'
    return [first, second, raised, length_hint(it)]


_EXPECTED_MUTATION = [N, N - 1, 'RuntimeError', 0]


def mutation_during_iteration_is_detected():
    """deque iteration used to hand out a list_iterator over the deque's
    private list, so a mutation was invisible: no RuntimeError, and the hint
    kept counting down.  dict/set already raised but kept reporting a count."""
    def _deque():
        d = deque(range(N))
        return iter(d), d.pop

    def _deque_reversed():
        d = deque(range(N))
        return reversed(d), d.pop

    def _dict_keys():
        d = dict.fromkeys(range(N))
        return iter(d), d.popitem

    def _dict_items():
        d = dict.fromkeys(range(N))
        return iter(d.items()), d.popitem

    def _dict_values():
        d = dict.fromkeys(range(N))
        return iter(d.values()), d.popitem

    def _set():
        s = set(range(N))
        return iter(s), s.pop

    pairs = {'deque': _deque, 'deque_reversed': _deque_reversed,
             'dict_keys': _dict_keys, 'dict_items': _dict_items,
             'dict_values': _dict_values, 'set': _set}
    bad = []
    for name, make in pairs.items():
        got = _catch(_mutation_is_detected, make)
        if got != _EXPECTED_MUTATION:
            bad.append('%s: %s' % (name, got))
    return bad or True


def deque_same_size_mutation_is_detected():
    """A deque tracks a mutation COUNTER, not just its length, so a
    net-size-preserving change is caught too (CPython's deque->state).  A
    length comparison alone would miss both of these."""
    d = deque(range(N))
    it = iter(d)
    next(it)
    d.pop()
    d.append(99)                      # same length as when `it' was made
    popped = _catch(lambda: next(it))

    d2 = deque(range(N))
    it2 = iter(d2)
    next(it2)
    d2.rotate(3)                      # no length change at all
    rotated = _catch(lambda: next(it2))
    return popped == 'RuntimeError' and rotated == 'RuntimeError'


# --------------------------------------- 4. a reverse iterator over a list
# that SHRINKS underneath it

def reverse_iterator_over_shrunken_list():
    """CPython's listreviter yields only while its index is still inside the
    (shared) list.  Grail reported a stale count here and then indexed the
    shrunken list, which raised a Smalltalk OffsetError that no Python
    ``except'' could catch."""
    d = list(range(N))
    it = reversed(d)
    next(it)
    next(it)
    after_two = length_hint(it)       # 8
    d.append(N)
    after_append = length_hint(it)    # still 8 -- an append past the position
                                      # is ignored, unlike a forward iterator
    d[1:] = []                        # now len(d) == 1, index is past the end
    after_shrink = length_hint(it)     # 0
    drained = list(it)                 # [] -- and NOT an OffsetError
    d.extend(range(20))
    after_regrow = length_hint(it)     # still 0: exhaustion is latched
    got = [after_two, after_append, after_shrink, drained, after_regrow]
    return got == [8, 8, 0, [], 0] or got


def forward_iterator_follows_a_growing_list():
    """The forward case is the complement and must NOT change: a list_iterator
    does follow an append (CPython listiter_len is size - index)."""
    d = list(range(N))
    it = iter(d)
    next(it)
    next(it)
    after_two = length_hint(it)       # 8
    d.append(N)
    after_append = length_hint(it)    # 9 -- grows with the list
    d[1:] = []
    after_shrink = length_hint(it)    # 0
    got = [after_two, after_append, after_shrink, list(it)]
    return got == [8, 9, 0, []] or got


# ------------------------------- 5. exceptions from __len__/__length_hint__
# reach the caller of list() / extend()

class BadLen:
    def __iter__(self):
        return iter(range(N))

    def __len__(self):
        raise RuntimeError('hello')


class BadLengthHint:
    def __iter__(self):
        return iter(range(N))

    def __length_hint__(self):
        raise RuntimeError('hello')


class NoneLengthHint:
    def __iter__(self):
        return iter(range(N))

    def __length_hint__(self):
        return NotImplemented


def presize_hint_exceptions_are_not_suppressed():
    """CPython asks an iterable for a length hint BEFORE consuming it, to
    presize the result.  Grail has nothing to presize, but skipping the call
    made a raising __len__/__length_hint__ invisible: list(BadLen()) quietly
    returned [0..9]."""
    results = [
        _catch(lambda: list(BadLen())),
        _catch(lambda: list(BadLengthHint())),
        _catch(lambda: [].extend(BadLen())),
        _catch(lambda: [].extend(BadLengthHint())),
        _catch(lambda: bytearray(range(N)).extend(BadLen())),
        _catch(lambda: bytearray(range(N)).extend(BadLengthHint())),
    ]
    return all(r == 'RuntimeError' for r in results) or results


def unusable_hint_does_not_break_the_build():
    """The other half of the contract: a __length_hint__ answering
    NotImplemented means ``no estimate'', not an error -- list() must still
    build the whole thing from the iterator."""
    return (list(NoneLengthHint()) == list(range(N))
            and length_hint(NoneLengthHint(), 42) == 42)


RESULTS = {
    'hint_decreases': hint_decreases_over_every_iterator(),
    'reversed_range_is_iterator': reversed_range_is_an_iterator(),
    'mutation_detected': mutation_during_iteration_is_detected(),
    'deque_same_size_mutation': deque_same_size_mutation_is_detected(),
    'reverse_over_shrunken': reverse_iterator_over_shrunken_list(),
    'forward_over_growing': forward_iterator_follows_a_growing_list(),
    'presize_exceptions': presize_hint_exceptions_are_not_suppressed(),
    'unusable_hint': unusable_hint_does_not_break_the_build(),
}


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        hint_decreases_over_every_iterator,
        reversed_range_is_an_iterator,
        mutation_during_iteration_is_detected,
        deque_same_size_mutation_is_detected,
        reverse_iterator_over_shrunken_list,
        forward_iterator_follows_a_growing_list,
        presize_hint_exceptions_are_not_suppressed,
        unusable_hint_does_not_break_the_build,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
