# ``bytearray.join'' refuses a separator the iterable MUTATES.
#
# CPython's buffer protocol is what makes this work: join holds a buffer view
# of the separator while it consumes the iterable, and resizing an object with
# a live export raises BufferError.  Grail has no buffer protocol, so it simply
# used whatever the separator had become AFTER the iterable ran:
#
#     array = bytearray(b',')
#     def it():
#         array.clear()
#         yield b'A'; yield b'B'
#     array.join(it())      -- bytearray(b'AB'), the separator gone
#
# A wrong answer rather than an error, and a silent one: the separator vanishes
# and the join looks like it worked.
#
# The export is held only across the MATERIALISATION of the iterable, which is
# the one window in which the iterable's own code runs; everything after that
# reads a list already built.  Reads and in-place byte writes are unaffected,
# which is what the buffer protocol allows -- only a RESIZE is refused.
#
# test_builtin's test_bytearray_join_with_misbehaving_iterator, and its
# neighbour test_bytearray_join_with_custom_iterator, which is the control.

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- a separator the iterable clears ------------------------------------------

def _mutating_join():
    array = bytearray(b',')

    def it():
        array.clear()
        yield b'A'
        yield b'B'
    return array.join(it())


r['clearing_separator'] = outcome(_mutating_join)


# --- other resizes of the separator, mid-iteration ---------------------------
#
# The rule is about RESIZING, not about clear() -- so the sibling operations
# have to refuse too, or the guard is a special case for one method.

def _resizing_join(mutate):
    array = bytearray(b',')

    def it():
        mutate(array)
        yield b'A'
        yield b'B'
    return array.join(it())


r['extending_separator'] = outcome(
    lambda: _resizing_join(lambda a: a.extend(b'xx')))
r['appending_separator'] = outcome(
    lambda: _resizing_join(lambda a: a.append(65)))
r['popping_separator'] = outcome(lambda: _resizing_join(lambda a: a.pop()))


# --- an IN-PLACE byte write is allowed ----------------------------------------
#
# The buffer protocol permits it: the export is a view of storage that has not
# moved.  This is the row that says the guard is on the size and not on any
# mutation at all.

def _overwriting_join():
    array = bytearray(b',')

    def it():
        array[0] = ord(';')
        yield b'A'
        yield b'B'
    return array.join(it())


r['overwriting_separator'] = outcome(_overwriting_join)


# --- controls: ordinary joins and ordinary resizes ---------------------------

def _wellbehaved_join():
    array = bytearray(b',')

    def it():
        yield b'A'
        yield b'B'
    return array.join(it())


r['wellbehaved_generator'] = outcome(_wellbehaved_join)
r['list_join'] = outcome(lambda: bytearray(b',').join([b'A', b'B']))
r['tuple_join'] = outcome(lambda: bytearray(b',').join((b'A', b'B')))
r['empty_join'] = outcome(lambda: bytearray(b',').join([]))
r['bytes_join'] = outcome(lambda: b','.join([b'A', b'B']))


def _resizes_outside_a_join():
    b = bytearray(b'xy')
    b.clear()
    b.extend(b'abc')
    b.append(68)
    b.pop()
    del b[0]
    return bytes(b)


r['resizes_outside_a_join'] = outcome(_resizes_outside_a_join)

# A join nested inside another join's iterable: the inner one releases its own
# export without releasing the outer's, which a flag rather than a count would
# get wrong.


def _nested_join():
    outer = bytearray(b'-')

    def it():
        yield bytearray(b',').join([b'A', b'B'])
        yield b'C'
    return outer.join(it())


r['nested_join'] = outcome(_nested_join)


EXPECTED = {
    'appending_separator': 'BufferError: Existing exports of data: object cannot be re-sized',
    'bytes_join': "ok -> b'A,B'",
    'clearing_separator': 'BufferError: Existing exports of data: object cannot be re-sized',
    'empty_join': "ok -> bytearray(b'')",
    'extending_separator': 'BufferError: Existing exports of data: object cannot be re-sized',
    'list_join': "ok -> bytearray(b'A,B')",
    'nested_join': "ok -> bytearray(b'A,B-C')",
    'overwriting_separator': "ok -> bytearray(b'A;B')",
    'popping_separator': 'BufferError: Existing exports of data: object cannot be re-sized',
    'resizes_outside_a_join': "ok -> b'bc'",
    'tuple_join': "ok -> bytearray(b'A,B')",
    'wellbehaved_generator': "ok -> bytearray(b'A,B')",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
