"""Fixture: id() is unique among live objects, as in CPython.

Grail's id() was the kernel's identityHash.  For an ordinary object that is
its OOP shifted right 8 bits, but for a SPECIAL object -- an int, a float,
True, False -- it is the value itself or close to it: id(1333) was 1333,
id(True) 258, id(-1) -1.  So a live int could share its id with a live tuple,
and an id-keyed memo mixed the two up: pickle's ``_Pickler.save'' looks an
object up in ``self.memo'' by id() before it dispatches, so pickling the int
1333 after the tuple whose id was 1333 wrote a GET of the tuple
(test_pickle's test_multiple_unpicklings_*).  Whether that struck depended on
where the gem's OOPs were being handed out from; here each check builds the
collision directly, from an int EQUAL to another object's id, so it does not
depend on luck.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import io
import pickle

r = {}

objs = [object() for _ in range(50)] + [[i] for i in range(50)] + [(i, str(i)) for i in range(50)]
specials = [None, True, False, Ellipsis, NotImplemented, 0, 1, -1, 257, 1.5, -2.25, 2 ** 59, -(2 ** 59)]
# The ints EQUAL to those objects' ids, kept alive beside them: before the fix
# each was the very id it equals.
their_ids = [id(o) for o in objs + specials]
pool = objs + specials + their_ids
r['every_live_object_has_its_own_id'] = len({id(o) for o in pool}) == len(pool)

r['an_id_is_a_non_negative_int'] = all(type(id(o)) is int and id(o) >= 0 for o in pool)

o = object()
r['an_id_is_stable'] = id(o) == id(o) and id(None) == id(None) and id(-1) == id(-1)

# What test_pickle's test_multiple_unpicklings_* reduces to: an int equal to
# a list's id, pickled after that list.
lists = [[i] for i in range(100)]
data = [(x, id(x)) for x in lists]
round_trips = []
for proto in range(0, pickle.HIGHEST_PROTOCOL + 1):
    f = io.BytesIO()
    pickle._Pickler(f, protocol=proto).dump(data)
    round_trips.append(pickle._Unpickler(io.BytesIO(f.getvalue())).load() == data)
r['pickle_memo_keeps_an_int_equal_to_an_id'] = round_trips == [True] * (pickle.HIGHEST_PROTOCOL + 1)

# copy.deepcopy returns an int (an atomic type) before it consults its memo,
# so it was never hit; checked so that it stays that way.
r['deepcopy_memo_keeps_an_int_equal_to_an_id'] = copy.deepcopy(data) == data



# The default repr prints the same id, in hex, for an ordinary object and for
# a special one it names.
def make_cell(v):
    def f():
        return v
    return f.__closure__[0]


cell = make_cell(5)
r['a_repr_address_is_the_id'] = [
    ('0x%x' % id(o)) in repr(o),
    ('0x%x' % id(5)) in repr(cell),
    ('0x%x' % id(5)) in repr((5).__add__),
]

EXPECTED = {
    'every_live_object_has_its_own_id': True,
    'an_id_is_a_non_negative_int': True,
    'an_id_is_stable': True,
    'pickle_memo_keeps_an_int_equal_to_an_id': True,
    'deepcopy_memo_keeps_an_int_equal_to_an_id': True,
    'a_repr_address_is_the_id': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
