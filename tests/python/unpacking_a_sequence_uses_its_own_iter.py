"""Fixture: unpacking a list or tuple subclass with its own __iter__ iterates it.

CPython reads only an exact list or tuple by size when it unpacks
(Python/ceval.c, UNPACK_SEQUENCE's specializations); every other value,
a list or tuple subclass included, goes through unpack_iterable, which takes
its values from iter().  So a subclass that defines __iter__ unpacks to what
that yields -- platform's uname_result, a tuple of five, iterates six, and
platform.platform() unpacks all six.  Grail read every sequence by size:
``a, b, c = T((9, 9))'' was "not enough values to unpack (expected 3, got
2)" while list(), star unpacking and a for loop already iterated.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from collections import namedtuple

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Three(tuple):
    def __iter__(self):
        yield from (1, 2, 3)


class Pair(list):
    def __iter__(self):
        yield from ('x', 'y')


class Endless(tuple):
    yielded = 0

    def __iter__(self):
        while True:
            Endless.yielded += 1
            yield Endless.yielded


class Plain(tuple):
    pass


Point = namedtuple('Point', 'x y')


def unpack_three(value):
    a, b, c = value
    return [a, b, c]


def unpack_two(value):
    a, b = value
    return [a, b]


def endless():
    try:
        a, b = Endless(())
    except ValueError as e:
        return [str(e), Endless.yielded]


r['a_tuple_subclass_unpacks_what_it_iterates'] = outcome(lambda: unpack_three(Three((9, 9))))
r['a_list_subclass_unpacks_what_it_iterates'] = outcome(lambda: unpack_two(Pair([7])))
r['too_many_or_too_few_are_counted_by_iterating'] = [
    outcome(lambda: unpack_two(Three(()))), outcome(lambda: unpack_three(Pair([1, 2, 3])))]
r['one_value_too_many_is_taken_and_no_more'] = outcome(endless)
r['a_for_target_unpacks_it_too'] = outcome(lambda: [[a, b, c] for a, b, c in [Three(())]])
r['a_subclass_without_its_own_iter_unpacks_its_items'] = outcome(lambda: unpack_two(Plain((5, 6))))
r['a_namedtuple_still_unpacks_its_fields'] = outcome(lambda: unpack_two(Point(1, 2)))

EXPECTED = {
    'a_tuple_subclass_unpacks_what_it_iterates': [1, 2, 3],
    'a_list_subclass_unpacks_what_it_iterates': ['x', 'y'],
    'too_many_or_too_few_are_counted_by_iterating': [
        'ValueError: too many values to unpack (expected 2)',
        'ValueError: not enough values to unpack (expected 3, got 2)'],
    'one_value_too_many_is_taken_and_no_more': ['too many values to unpack (expected 2)', 3],
    'a_for_target_unpacks_it_too': [[1, 2, 3]],
    'a_subclass_without_its_own_iter_unpacks_its_items': [5, 6],
    'a_namedtuple_still_unpacks_its_fields': [1, 2],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
