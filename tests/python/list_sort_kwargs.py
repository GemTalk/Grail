# Fixture for ListSortKwargsTestCase.
#
# list.sort(*, key=None, reverse=False) — the in-place sort with its
# keyword-only ``key`` / ``reverse`` arguments (the varargs ``_sort:kw:``
# selector).  flask's routing sorts its rule list with a key at request
# time; previously OrderedCollection only had the 0-arg ``sort``.


def sort_by_key():
    xs = [{"p": 3}, {"p": 1}, {"p": 2}]
    xs.sort(key=lambda d: d["p"])
    return [d["p"] for d in xs]


def sort_reverse():
    xs = [1, 3, 2]
    xs.sort(reverse=True)
    return xs


def sort_key_and_reverse():
    xs = ["bb", "a", "ccc"]
    xs.sort(key=len, reverse=True)
    return xs


def sort_returns_none():
    # list.sort() is in-place and returns None.
    xs = [2, 1]
    rv = xs.sort()
    return [rv is None, xs]
