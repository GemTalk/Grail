"""Fixture: a slice bound that is not an integer raises CPython's TypeError.

CPython converts every slice bound with one function, _PyEval_SliceIndex
(Python/ceval.c:3076): a subscript's start, stop and step, slice.indices, and
the start and end of str and bytes's find, count, index, startswith and
endswith.  An int or an object with __index__ is accepted; anything else
raises ``slice indices must be integers or None or have an __index__
method''.  list, tuple and memoryview's index use its sibling
_PyEval_SliceIndexNotNone (line 3098), which refuses None as well, in words
that leave None out.

Grail converted these bounds as operator.index does, so they raised
``'str' object cannot be interpreted as an integer''.  Three paths did not
convert at all and stopped the program with an error no Python code can
catch: bytearray's find and index given a str bound, bytearray.find given an
__index__ object (which CPython accepts), and a memoryview subscript given a
str bound.  Every check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


class Index:
    def __init__(self, value):
        self.value = value

    def __index__(self):
        return self.value


def outcome(call):
    try:
        return call()
    except TypeError as error:
        return 'TypeError: %s' % error


SLICE = 'TypeError: slice indices must be integers or None or have an __index__ method'
REQUIRED = 'TypeError: slice indices must be integers or have an __index__ method'

s = 'abcabc'
b = b'abcabc'


def bytearray_bounds():
    a = bytearray(b)
    return [outcome(lambda: a.find(b'a', 'x')), outcome(lambda: a.index(b'a', 'x')),
            outcome(lambda: a.rfind(b'a', 'x')), outcome(lambda: a.count(b'a', 'x')),
            outcome(lambda: a.startswith(b'a', 'x')), outcome(lambda: a.endswith(b'a', 0, 'x'))]


def slice_stores():
    def delete():
        items = [1, 2, 3]
        del items['x':]

    def assign():
        items = [1, 2, 3]
        items[:'x'] = [9]

    def assign_bytes():
        a = bytearray(b'abc')
        a['x':] = b'z'

    return [outcome(delete), outcome(assign), outcome(assign_bytes)]


r['str_methods_refuse_a_str_start'] = [
    outcome(lambda: s.find('a', 'x')), outcome(lambda: s.rfind('a', 'x')), outcome(lambda: s.index('a', 'x')),
    outcome(lambda: s.rindex('a', 'x')), outcome(lambda: s.count('a', 'x')),
    outcome(lambda: s.startswith('a', 'x')), outcome(lambda: s.endswith('a', 'x'))]
r['str_methods_refuse_a_float_or_str_end'] = [outcome(lambda: s.find('a', 0, 'x')), outcome(lambda: s.find('a', 1.0)),
                                              outcome(lambda: s.count('a', 0, 2.5))]
r['bytes_methods_refuse_a_str_start'] = [
    outcome(lambda: b.find(b'a', 'x')), outcome(lambda: b.rfind(b'a', 'x')), outcome(lambda: b.index(b'a', 'x')),
    outcome(lambda: b.rindex(b'a', 'x')), outcome(lambda: b.count(b'a', 'x')),
    outcome(lambda: b.startswith(b'a', 'x')), outcome(lambda: b.endswith(b'a', 0, 'x'))]
r['bytearray_methods_refuse_a_str_bound'] = bytearray_bounds()
r['bytearray_find_takes_an_index_object'] = [bytearray(b).find(b'c', Index(1)), bytearray(b).find(b'a', Index(1), Index(4)),
                                             bytearray(b).index(b'b', Index(2))]
r['subscripts_refuse_a_str_or_float_bound'] = [
    outcome(lambda: s['x':]), outcome(lambda: [1, 2][:'x']), outcome(lambda: (1, 2)[1.0:]),
    outcome(lambda: b[None:'x']), outcome(lambda: range(5)['x':]), outcome(lambda: memoryview(b)['x':])]
r['subscripts_refuse_a_str_or_float_step'] = [
    outcome(lambda: s[::'x']), outcome(lambda: [1, 2][::1.5]), outcome(lambda: (1, 2)[::'x']),
    outcome(lambda: range(5)[::'x']), outcome(lambda: memoryview(b)[::'x'])]
r['slice_stores_refuse_a_str_bound'] = slice_stores()
r['slice_indices_refuses_a_str_bound'] = [outcome(lambda: slice('x').indices(3)),
                                          outcome(lambda: slice('x', None).indices(3)),
                                          outcome(lambda: slice(None, None, 1.0).indices(3))]
r['slice_indices_length_keeps_its_own_message'] = outcome(lambda: slice(1).indices('x'))
r['index_methods_refuse_none_too'] = [
    outcome(lambda: [1].index(1, 'x')), outcome(lambda: [1].index(1, None)), outcome(lambda: (1,).index(1, 0, 0.0)),
    outcome(lambda: memoryview(b).index(97, 'x')), outcome(lambda: memoryview(b).index(97, 0, None))]
r['index_objects_and_bools_are_bounds'] = [
    s.find('b', Index(2)), b.count(b'a', Index(1)), s.startswith('b', True), [1, 2, 3][Index(1):],
    (1, 2, 3)[::Index(2)], [5, 6, 5].index(5, Index(1)), memoryview(b)[Index(4):].tobytes(),
    memoryview(b)[::Index(3)].tobytes(), slice(Index(1), None, Index(2)).indices(5), range(10)[Index(8):]]
r['none_is_still_the_default_bound'] = [s.find('a', None, None), b.rfind(b'a', None), s[None:None:None],
                                        memoryview(b)[None:2].tobytes(), slice(None).indices(2)]
r['huge_bounds_still_clamp'] = [s.find('a', 10 ** 30), s.find('a', -10 ** 30), [1].index(1, -10 ** 30, 10 ** 30),
                                b.count(b'a', -10 ** 30)]

EXPECTED = {
    'str_methods_refuse_a_str_start': [SLICE] * 7,
    'str_methods_refuse_a_float_or_str_end': [SLICE] * 3,
    'bytes_methods_refuse_a_str_start': [SLICE] * 7,
    'bytearray_methods_refuse_a_str_bound': [SLICE] * 6,
    'bytearray_find_takes_an_index_object': [2, 3, 4],
    'subscripts_refuse_a_str_or_float_bound': [SLICE] * 6,
    'subscripts_refuse_a_str_or_float_step': [SLICE] * 5,
    'slice_stores_refuse_a_str_bound': [SLICE] * 3,
    'slice_indices_refuses_a_str_bound': [SLICE] * 3,
    'slice_indices_length_keeps_its_own_message': "TypeError: 'str' object cannot be interpreted as an integer",
    'index_methods_refuse_none_too': [REQUIRED] * 5,
    'index_objects_and_bools_are_bounds': [4, 1, True, [2, 3], (1, 3), 2, b'bc', b'aa', (1, 5, 2), range(8, 10)],
    'none_is_still_the_default_bound': [0, 3, 'abcabc', b'ab', (0, 2, 1)],
    'huge_bounds_still_clamp': [-1, 0, 0, 2],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
