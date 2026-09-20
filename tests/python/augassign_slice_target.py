"""Fixture: ``x[1:2] *= 2`` -- an augmented assignment whose target is a SLICE.

An augmented assignment to a subscript is a read and a write of the same
subscript: ``obj[i] op= v`` is ``obj.__setitem__(i, obj.__getitem__(i).__op__(v))``.
Grail's IR path emitted that for a plain INDEX and stood down for a slice, on
the reasoning that "the text's SliceAst spelling is SubscriptAst's own".

That is true of a subscript LOAD and false here.  ``xs[i:j]`` as a value
compiles to the env-0 sequence fast path, ``slice ___newStart: lo stop: hi
step: st``, with nil for an omitted bound -- SubscriptAst's own spelling,
which SliceAst never produces.  But the augmented assignment never prints its
TARGET (the target's ctx is Store, and printing it would emit a load); it
prints ``target slice`` directly, and that is SliceAst's own ``slice.__new__``
form with None for an omitted bound.  So the slice reaching both dunders is an
ordinary Python slice object, which is what the IR emitter already builds.

WHAT THE SHAPES PIN, beyond "it compiles":

  * the slice object really carries start / stop / step through to BOTH
    dunders -- ``custom_slice'' records what a Python-level __getitem__ and
    __setitem__ are handed, so a mis-built slice cannot pass by accident;
  * an omitted bound is None, not nil and not 0 (``full_slice'', ``open_ended'');
  * the operation is IN PLACE on the original object, so an alias sees it
    (``add_slice'' answers the aliased list and ``x is y'');
  * the extended-slice arm RAISES, and the message is part of the contract
    (``step_slice'');
  * it is not list-specific (``bytearray_slice'').

The corpus site is test_augassign's testSequences, which does ``x[1:2] *= 2''
and ``y[1:2] += [1]'' over an alias and then asserts both the value and
``x is y''.

Every value here was produced by RUNNING CPython 3.14.6, not predicted.
"""

r = {}

x = [1, 2, 3]
x[1:2] *= 2
r['mul_slice'] = x

x = [1, 2, 3]
y = x
y[1:2] += [7]
r['add_slice'] = (x, x is y)

x = [1, 2]
x[:] += [3]
r['full_slice'] = x

x = [1, 2, 3]
x[1:] += [9]
r['open_ended'] = x

x = [1, 2, 3, 4]
try:
    x[::2] *= 2
    r['step_slice'] = x
except BaseException as e:
    r['step_slice'] = type(e).__name__ + ': ' + str(e)[:50]

b = bytearray(b'ab')
try:
    b[0:1] += b'z'
    r['bytearray_slice'] = bytes(b)
except BaseException as e:
    r['bytearray_slice'] = type(e).__name__ + ': ' + str(e)[:50]


class Rec:
    """Records the slice object each dunder is handed."""

    def __init__(self):
        self.seen = []

    def __getitem__(self, k):
        self.seen.append(('get', k.start, k.stop, k.step))
        return [0]

    def __setitem__(self, k, v):
        self.seen.append(('set', k.start, k.stop, k.step, v))


rec = Rec()
rec[1:5:2] += [4]
r['custom_slice'] = rec.seen


class Holder:
    """The same statement from inside a METHOD, which is where the census row
    is: the refusal was measured on test_augassign's testSequences."""

    def bump(self):
        v = [1, 2, 3]
        v[1:2] *= 2
        return v


r['method_slice'] = Holder().bump()


EXPECTED = {
    'add_slice': ([1, 2, 7, 3], True),
    'bytearray_slice': b'azb',
    'custom_slice': [('get', 1, 5, 2), ('set', 1, 5, 2, [0, 4])],
    'full_slice': [1, 2, 3],
    'method_slice': [1, 2, 2, 3],
    'mul_slice': [1, 2, 2, 3],
    'open_ended': [1, 2, 3, 9],
    'step_slice': 'ValueError: attempt to assign sequence of size 4 to extended s',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-20s is not in EXPECTED' % ('FAIL', extra))
