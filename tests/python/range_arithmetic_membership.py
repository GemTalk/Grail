"""Fixture: range answers ``in'', count and index arithmetically for an int.

CPython's range decides membership of an exact int (or a bool) by arithmetic:
the value lies between start and stop on the step's side, and (value - start)
is a multiple of step.  Anything else -- a float, an int subclass, an object
with its own __eq__ -- is searched element by element with ==.

Grail used Smalltalk ``includes:'' for all of it (#1380).  That walked the
range for any step but 1, so ``range(1, 2**100, 2).count(2**87)'' never
returned and test_range timed out; and it compared by Smalltalk ``='', so an
object whose __eq__ always answers True was never found.  index's misses also
read differently from CPython's two messages.

The huge ranges below return at once only when the answer is arithmetic, so
a regression shows as a hang rather than a wrong value.

range_iterator.__setstate__ was missing too, which is how pickle restores an
iterator's position: the state was dropped, so an unpickled iterator over a
range starting at -2**65 walked from the start instead (test_range's
test_iterator_unpickle_compat).  It skips RELATIVE to the current position,
clipped to what is left.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(fn):
    try:
        return fn()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class AlwaysEq:
    def __eq__(self, other):
        return True

    __hash__ = None


class MyInt(int):
    pass


big = range(1, 2**100, 2)
down = range(10, -10, -3)        # 10, 7, 4, 1, -2, -5, -8

# --- the headline: huge ranges with a step other than 1 ------------------------

r['huge_count_miss'] = big.count(2**87)
r['huge_count_hit'] = big.count(2**87 + 1)
r['huge_index'] = big.index(2**87 + 1)
r['huge_in'] = [2**99 + 1 in big, 2**99 in big, 2**100 + 1 in big, -1 in big]

# --- arithmetic edges ------------------------------------------------------------

r['negative_step_in'] = [v in down for v in (10, 7, -8, -10, 9, 11, -11)]
r['negative_step_index'] = [down.index(10), down.index(-8)]
r['stop_is_excluded'] = [10 in range(0, 10, 2), 8 in range(0, 10, 2), 9 in range(0, 10, 4)]
r['empty_ranges'] = [0 in range(0), 5 in range(10, 0, 3), 5 in range(0, 10, -1)]
r['bools'] = [True in range(2), range(3).index(True), range(1, 3).count(False)]

# --- everything else is searched with == --------------------------------------------

r['always_eq_count'] = range(10).count(AlwaysEq())
r['always_eq_in'] = AlwaysEq() in range(3)
r['always_eq_index'] = range(5, 10).index(AlwaysEq())
r['float_members'] = [1.0 in range(3), range(3).count(2.0), range(3).index(2.0)]
r['int_subclass'] = [MyInt(4) in range(0, 10, 2), range(0, 10, 2).index(MyInt(4))]

# --- misses ---------------------------------------------------------------------------

r['index_miss_int'] = outcome(lambda: range(10).index(11))
r['index_miss_step'] = outcome(lambda: range(0, 10, 3).index(4))
r['index_miss_float'] = outcome(lambda: range(10).index(1.5))
r['count_miss_float'] = range(10).count(1.5)

# --- range_iterator.__setstate__ -------------------------------------------------------


def _after(it, *states, advance=0):
    for _ in range(advance):
        next(it)
    for s in states:
        it.__setstate__(s)
    return list(it)


r['setstate'] = [
    _after(iter(range(10, 20, 2)), 2),
    _after(iter(range(10, 20, 2)), 2, advance=1),
    _after(iter(range(10, 20, 2)), 2, 1),
    _after(iter(range(10, 20, 2)), -5),
    _after(iter(range(10, 20, 2)), 99),
    _after(iter(range(10, 20, 2)), True),
    _after(reversed(range(10, 20, 2)), 2),
    _after(iter(range(-2**65, 20, 2)), 2**64 + 7),
]
r['setstate_answers_none'] = iter(range(3)).__setstate__(1)
r['setstate_rejects_non_index'] = [
    outcome(lambda: iter(range(5)).__setstate__(1.5)),
    outcome(lambda: iter(range(5)).__setstate__('1')),
]


def _unpickled():
    import pickle
    # Two of test_range's test_iterator_unpickle_compat cases: protocol 4, a
    # small range and one starting at -2**65.
    small = (b'\x80\x04\x951\x00\x00\x00\x00\x00\x00\x00\x8c\x08builtins'
             b'\x8c\x04iter\x93\x8c\x08builtins\x8c\x05range\x93K\nK\x14K'
             b'\x02\x87R\x85RK\x02b.')
    huge = (b'\x80\x04\x95C\x00\x00\x00\x00\x00\x00\x00\x8c\x08builtins'
            b'\x8c\x04iter\x93\x8c\x08builtins\x8c\x05range\x93\x8a\t\x00'
            b'\x00\x00\x00\x00\x00\x00\x00\xfeK\x14K\x02\x87R\x85R\x8a\t'
            b'\x07\x00\x00\x00\x00\x00\x00\x00\x01b.')
    return [list(pickle.loads(small)), list(pickle.loads(huge))]


r['unpickled_iterators_resume'] = _unpickled()


EXPECTED = {
    'huge_count_miss': 0,
    'huge_count_hit': 1,
    'huge_index': 77371252455336267181195264,
    'huge_in': [True, False, False, False],
    'negative_step_in': [True, True, True, False, False, False, False],
    'negative_step_index': [0, 6],
    'stop_is_excluded': [False, True, False],
    'empty_ranges': [False, False, False],
    'bools': [True, 1, 0],
    'always_eq_count': 10,
    'always_eq_in': True,
    'always_eq_index': 0,
    'float_members': [True, 1, 2],
    'int_subclass': [True, 2],
    'index_miss_int': 'ValueError: range.index(x): x not in range',
    'index_miss_step': 'ValueError: range.index(x): x not in range',
    'index_miss_float': 'ValueError: sequence.index(x): x not in sequence',
    'count_miss_float': 0,
    'setstate': [[14, 16, 18], [16, 18], [16, 18], [10, 12, 14, 16, 18], [],
                 [12, 14, 16, 18], [14, 12, 10], [14, 16, 18]],
    'setstate_answers_none': None,
    'setstate_rejects_non_index': [
        "TypeError: 'float' object cannot be interpreted as an integer",
        "TypeError: 'str' object cannot be interpreted as an integer",
    ],
    'unpickled_iterators_resume': [[14, 16, 18], [14, 16, 18]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
