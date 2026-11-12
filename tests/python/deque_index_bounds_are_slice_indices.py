"""Fixture: deque.index's start and stop are slice indices, as list.index's are.

CPython converts them with _PyEval_SliceIndexNotNone (Python/ceval.c:3098):
an int or an object with __index__, and anything else -- None included, since
stop defaults to sys.maxsize rather than to None -- raises ``slice indices must
be integers or have an __index__ method''.  Grail's deque, which is Python
code, compared the raw bounds, so a str start raised ``'<' not supported
between instances of 'str' and 'int''', a float start searched from it, and
None was accepted as the stop.  Every check holds under CPython 3.14, which is
what makes it evidence.
"""

import collections

REQUIRED = 'TypeError: slice indices must be integers or have an __index__ method'
d = collections.deque([1, 2, 3, 1])
r = {}


class Index:
    def __init__(self, value):
        self.value = value

    def __index__(self):
        return self.value


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as error:
        return '%s: %s' % (type(error).__name__, error)


r['a_str_or_float_bound_is_refused'] = [outcome(lambda: d.index(1, 'x')), outcome(lambda: d.index(1, 1.0)),
                                        outcome(lambda: d.index(1, 0, 'x'))]
r['none_is_refused_as_either_bound'] = [outcome(lambda: d.index(1, None)), outcome(lambda: d.index(1, 0, None))]
r['index_objects_and_bools_are_bounds'] = [outcome(lambda: d.index(1, Index(1))),
                                           outcome(lambda: d.index(1, 0, Index(1))), outcome(lambda: d.index(1, True))]
r['bounds_clamp_as_list_index_does'] = [outcome(lambda: d.index(1, -2, 10 ** 30)), outcome(lambda: d.index(3, -10, -1)),
                                        outcome(lambda: d.index(2, 5)),
                                        outcome(lambda: d.index(1, 2, 1))]
r['the_default_stop_is_the_end'] = [outcome(lambda: d.index(1, 1)), outcome(lambda: d.index(3))]
r['a_bad_index_result_is_refused'] = outcome(lambda: d.index(1, Index('x')))

EXPECTED = {
    'a_str_or_float_bound_is_refused': [REQUIRED] * 3,
    'none_is_refused_as_either_bound': [REQUIRED] * 2,
    'index_objects_and_bools_are_bounds': [3, 0, 3],
    'bounds_clamp_as_list_index_does': [3, 2, 'ValueError: deque.index(x): x not in deque',
                                        'ValueError: deque.index(x): x not in deque'],
    'the_default_stop_is_the_end': [3, 2],
    'a_bad_index_result_is_refused': 'TypeError: __index__ returned non-int (type str)',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
