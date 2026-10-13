"""A slice written in source passes None for an omitted bound to __getitem__.

``x[1:3]'' compiles to a slice that stores Smalltalk nil for the missing step,
and the Python view of that nil was wrong: ``key.step'' answered the slice's
own accessor as a bound method (the attribute load treated nil as absent and
fell through to the method), repr printed ``slice(1, 3, <UndefinedObject
...>)'', and ``x[1:3] == slice(1, 3)'' was False, as were the hashes.  pytest's
Source.__getitem__ -- ``if key.step not in (None, 1): raise IndexError'' --
failed every failure report with "cannot slice a Source with a step".

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


class Echo:
    def __getitem__(self, key):
        return key


e = Echo()


def parts(k):
    return (k.start, k.stop, k.step)


check('step_omitted', parts(e[1:3]), (1, 3, None))
check('stop_and_step_omitted', parts(e[1:]), (1, None, None))
check('start_and_step_omitted', parts(e[:2]), (None, 2, None))
check('everything_omitted', parts(e[:]), (None, None, None))
check('only_step', parts(e[::2]), (None, None, 2))
check('all_three_given', parts(e[1:3:1]), (1, 3, 1))
check('step_is_none_not_a_method', e[1:3].step is None, True)
check('repr', [repr(e[1:3]), repr(e[:]), repr(e[::-1])],
      ['slice(1, 3, None)', 'slice(None, None, None)', 'slice(None, None, -1)'])
check('equal_to_the_constructed_slice',
      [e[1:3] == slice(1, 3), e[:] == slice(None), e[::2] == slice(None, None, 2)],
      [True, True, True])
check('hash_agrees_with_the_constructed_slice',
      hash(e[1:3]) == hash(slice(1, 3)) and hash(e[:]) == hash(slice(None)), True)
check('usable_as_a_dict_key', {slice(1, 3): 'k'}.get(e[1:3]), 'k')
check('indices', e[1:].indices(5), (1, 5, 1))
lo, hi = 1, 3
check('bounds_from_names', parts(e[lo:hi]), (1, 3, None))


# pytest's _pytest._code.source.Source.__getitem__, reduced.
class Source:
    def __init__(self, lines):
        self.lines = lines

    def __getitem__(self, key):
        if isinstance(key, int):
            return self.lines[key]
        if key.step not in (None, 1):
            raise IndexError('cannot slice a Source with a step')
        return self.lines[key.start:key.stop]


def _pytest_shape():
    try:
        return Source(['a', 'b', 'c', 'd'])[1:3]
    except IndexError as exc:
        return str(exc)


check('pytest_source_slice', _pytest_shape(), ['b', 'c'])

# The built-in sequences, which take the same slices, are unaffected.
check('builtin_sequences',
      ([1, 2, 3, 4][1:3], (1, 2, 3)[::-1], 'abcd'[1:], b'abcd'[:2],
       memoryview(b'abcd')[1:3].tobytes(), range(10)[2:8]),
      ([2, 3], (3, 2, 1), 'bcd', b'ab', b'bc', range(2, 8)))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
