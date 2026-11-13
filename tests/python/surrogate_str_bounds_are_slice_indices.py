"""Fixture: a surrogate str's startswith/endswith bounds are slice indices.

A str holding a lone surrogate -- what surrogateescape makes of a filename that
is not UTF-8 -- answers startswith and endswith with Grail's own code.  Its
start and end are slice indices, as a plain str's are: an int or an __index__
object, and anything else is ``slice indices must be integers or None or have
an __index__ method''.  Grail raised operator.index's ``'str' object cannot be
interpreted as an integer'' there.  Every check holds under CPython 3.14, which
is what makes it evidence.
"""

SLICE = 'TypeError: slice indices must be integers or None or have an __index__ method'
LOW = chr(0xDC80)
text = 'ab' + LOW + 'cab'
r = {}


class Index:
    def __index__(self):
        return 1


def outcome(call):
    try:
        return call()
    except TypeError as error:
        return 'TypeError: %s' % error


r['a_str_or_float_start_is_refused'] = [outcome(lambda: text.startswith('a', 'x')),
                                        outcome(lambda: text.endswith('b', 1.5))]
r['a_str_or_float_end_is_refused'] = [outcome(lambda: text.startswith('a', 0, 'x')),
                                      outcome(lambda: text.endswith('b', 0, 2.5))]
r['the_tuple_form_refuses_them_too'] = outcome(lambda: text.startswith(('a', 'b'), 'x'))
r['a_plain_str_says_the_same'] = [outcome(lambda: 'abc'.startswith('a', 'x')) == outcome(lambda: text.startswith('a', 'x'))]
r['ints_none_and_index_objects_are_bounds'] = [text.startswith('b', 1), text.startswith('b', Index()),
                                               text.endswith('b', None, None), text.startswith(LOW, 2, True + 2)]

EXPECTED = {
    'a_str_or_float_start_is_refused': [SLICE, SLICE],
    'a_str_or_float_end_is_refused': [SLICE, SLICE],
    'the_tuple_form_refuses_them_too': SLICE,
    'a_plain_str_says_the_same': [True],
    'ints_none_and_index_objects_are_bounds': [True, True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)[:150]))
    print(SUMMARY)
