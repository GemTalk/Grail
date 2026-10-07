"""reversed() over a dict and its views, with the dict changed underneath.

CPython's reverse dict iterator holds a POSITION in the dict's entries array,
where a deleted key leaves an empty slot, plus a count of the items it still
expects.  Grail's reversed(d) used to reverse a snapshot of the keys, so it
never saw a change at all.  Now a PyDict keeps a nil where a key was deleted
and a port of dictreviter_iternext walks those positions, so:

- a size change raises "dictionary changed size during iteration", and keeps
  raising;
- an entry found once the count is spent raises "dictionary keys changed
  during iteration" (3.14.8, gh-158254);
- running off the start ends the iteration quietly, even with items still
  expected -- what clear() and a refill under a live iterator does.

popitem() and copy() follow CPython's entry list too.

Every EXPECTED value was produced by running this file under CPython 3.14.8
(``--emit``), not written by hand.
"""

import pickle
import sys


def _kinds(d):
    return (reversed(d), reversed(d.keys()), reversed(d.values()),
            reversed(d.items()))


def _drain(it):
    try:
        return list(it)
    except RuntimeError as e:
        return 'RuntimeError: %s' % e


def _keys_changed():
    d = dict.fromkeys(range(10))
    for i in range(7):
        del d[i]
    its = _kinds(d)
    for it in its:
        next(it)
    d.clear()
    d.update(dict.fromkeys(range(10)))
    for i in range(3, 10):
        del d[i]
    return [(_drain(it), _drain(it)) for it in its]


def _clear_and_restore():
    d = {'k%d' % i: i for i in range(1000)}
    for i in range(1, 1000):
        del d['k%d' % i]
    its = _kinds(d)
    d.clear()
    d['k0'] = 0
    return [list(it) for it in its]


def _size_changed():
    d = {1: 1, 2: 2}
    it = reversed(d)
    d[3] = 3
    return [_drain(it), _drain(it), it.__length_hint__()]


def _pickled():
    out = []
    for proto in range(pickle.HIGHEST_PROTOCOL + 1):
        data = {1: 'a', 2: 'b', 3: 'c'}
        it = reversed(data.items())
        next(it)
        out.append(dict(pickle.loads(pickle.dumps(it, proto))))
    return out[0] if all(o == out[0] for o in out) else out


def _churn():
    d = {}
    for i in range(2000):
        d[i] = i
        if i % 3 and (i - 1) in d:
            del d[i - 1]
    return (len(d), list(d)[:4], list(reversed(d))[:4], sum(d))


def _popitem_and_copy():
    d = {i: i for i in range(6)}
    del d[5]
    del d[4]
    popped = d.popitem()
    d[9] = 9
    c = {i: i for i in range(6)}
    del c[2]
    return (popped, list(reversed(d)), list(reversed(c.copy())), d.clear(), d)


def _results():
    d = {i: str(i) for i in range(4)}
    it = reversed(d)
    next(it)
    return {
        'types': [type(it).__name__ for it in _kinds({1: 2})],
        'plain': [list(it) for it in _kinds(d)],
        'length_hint': it.__length_hint__(),
        'keys_changed': _keys_changed(),
        'clear_and_restore': _clear_and_restore(),
        'size_changed': _size_changed(),
        'pickled': _pickled(),
        'churn': _churn(),
        'popitem_and_copy': _popitem_and_copy(),
    }


EXPECTED = {
    'types': ['dict_reversekeyiterator', 'dict_reversekeyiterator', 'dict_reversevalueiterator', 'dict_reverseitemiterator'],
    'plain': [[3, 2, 1, 0], [3, 2, 1, 0], ['3', '2', '1', '0'], [(3, '3'), (2, '2'), (1, '1'), (0, '0')]],
    'length_hint': 3,
    'keys_changed': [('RuntimeError: dictionary keys changed during iteration', []), ('RuntimeError: dictionary keys changed during iteration', []), ('RuntimeError: dictionary keys changed during iteration', []), ('RuntimeError: dictionary keys changed during iteration', [])],
    'clear_and_restore': [[], [], [], []],
    'size_changed': ['RuntimeError: dictionary changed size during iteration', 'RuntimeError: dictionary changed size during iteration', 0],
    'pickled': {2: 'b', 1: 'a'},
    'churn': (667, [2, 5, 8, 11], [1999, 1997, 1994, 1991], 667666),
    'popitem_and_copy': ((3, 3), [9, 2, 1, 0], [5, 4, 3, 1, 0], None, {}),
}

RESULTS = {k: (v == EXPECTED.get(k)) or 'got: %r' % (v,)
           for k, v in _results().items()}


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for k, v in _results().items():
            print('    %r: %r,' % (k, v))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
