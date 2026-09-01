"""A generator expression is LAZY, and Grail materialised it into a list.

``(f(x) for x in src)`` runs nothing until the first ``next``.  Grail built
the whole sequence at construction and answered an OrderedCollection, which
is right for any consumer that drains it -- ``sum``, ``list``, ``for`` --
and wrong for every consumer that does not.

Generator FUNCTIONS were already lazy here: ``def gf(): yield x`` emits
``PythonGenerator withBlock:``.  Only the expression form materialised, and
GeneratorExpAst said so in its own comment -- the ASYNC form was given a
real PythonAsyncGenerator when async iteration became real, and the
synchronous form was deliberately left alone as "its own change".

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


class Guard:
    """An iterator that reports how far it has been consumed."""

    def __init__(self, limit):
        self.limit = limit
        self.n = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.n >= self.limit:
            raise StopIteration
        self.n += 1
        return self.n


# -- nothing runs until the first next() --------------------------------

def _construction_runs_nothing():
    log = []
    g = (log.append(x) or x for x in [1, 2, 3])
    before = list(log)
    first = next(g)
    return (before, first, list(log))


def _consumes_the_source_one_at_a_time():
    src = Guard(5)
    g = (v for v in src)
    at_construction = src.n
    next(g)
    after_one = src.n
    return (at_construction, after_one)


check('construction_runs_nothing', _construction_runs_nothing(),
      ([], 1, [1]))
check('consumes_the_source_one_at_a_time',
      _consumes_the_source_one_at_a_time(), (0, 1))


# -- so a short-circuiting consumer stops early -------------------------

def _any_short_circuits():
    seen = []
    found = any((seen.append(n) or n) == 1 for n in [1, 2, 3])
    return (found, seen)


def _all_short_circuits():
    seen = []
    ok = all((seen.append(n) or n) < 1 for n in [1, 2, 3])
    return (ok, seen)


def _next_with_a_default():
    g = (x for x in [])
    return next(g, 'empty')


check('any_short_circuits', _any_short_circuits(), (True, [1]))
check('all_short_circuits', _all_short_circuits(), (False, [1]))
check('next_with_a_default', _next_with_a_default(), 'empty')


# -- and an unbounded source is fine ------------------------------------

def _counter():
    n = 0
    while True:
        n += 1
        yield n


def _unbounded_source():
    g = (v * 2 for v in _counter())
    return [next(g), next(g), next(g)]


def _unbounded_with_a_filter():
    g = (v for v in _counter() if v % 7 == 0)
    return [next(g), next(g)]


check('unbounded_source', _unbounded_source(), [2, 4, 6])
check('unbounded_with_a_filter', _unbounded_with_a_filter(), [7, 14])


# -- it is a generator, with a generator's identity and protocol --------

def _type_name():
    return type((x for x in [1, 2])).__name__


def _is_its_own_iterator():
    g = (x for x in [1, 2])
    return iter(g) is g


def _exhausts_once():
    g = (x for x in [1, 2])
    first = list(g)
    second = list(g)
    return (first, second)


def _has_generator_protocol():
    g = (x for x in [1, 2, 3])
    return (hasattr(g, 'send'), hasattr(g, 'throw'), hasattr(g, 'close'))


def _close_stops_it():
    g = (x for x in [1, 2, 3])
    first = next(g)
    g.close()
    return (first, next(g, 'closed'))


check('type_name', _type_name(), 'generator')
check('is_its_own_iterator', _is_its_own_iterator(), True)
check('exhausts_once', _exhausts_once(), ([1, 2], []))
check('has_generator_protocol', _has_generator_protocol(),
      (True, True, True))
check('close_stops_it', _close_stops_it(), (1, 'closed'))


# -- the OUTERMOST iterable is evaluated at construction ----------------
#
# CPython's rule for every comprehension kind, and the one part that is
# NOT lazy: the outer source is bound when the generator is made, so a
# later rebinding of the name does not change what it iterates.

def _outer_iterable_is_bound_eagerly():
    src = [1, 2, 3]
    g = (x for x in src)
    src = [9, 9, 9]
    return list(g)


def _outer_iterable_errors_at_construction():
    try:
        (x for x in None)
    except TypeError as exc:
        return 'TypeError'
    return 'no error'


def _inner_iterable_is_not():
    outer = [[1], [2]]
    g = (y for xs in outer for y in xs)
    outer.append([3])
    return list(g)


check('outer_iterable_is_bound_eagerly',
      _outer_iterable_is_bound_eagerly(), [1, 2, 3])
check('outer_iterable_errors_at_construction',
      _outer_iterable_errors_at_construction(), 'TypeError')
check('inner_iterable_is_not', _inner_iterable_is_not(), [1, 2, 3])


# -- a walrus in a genexp binds only as the genexp is consumed ----------
#
# test_named_expressions scope_03 and scope_in_genexp are both this: the
# binding is in the ENCLOSING scope, but it does not happen until the
# element that performs it is produced.

def _walrus_binds_as_it_goes():
    found = any((lastNum := num) == 1 for num in [1, 2, 3])
    return (found, lastNum)


def _walrus_not_bound_before_iteration():
    a = 1
    b = [1, 2, 3, 4]
    genexp = (c := i + a for i in b)
    before = 'c' in locals()
    drained = list(genexp)
    return (before, drained, c)


check('walrus_binds_as_it_goes', _walrus_binds_as_it_goes(), (True, 1))
check('walrus_not_bound_before_iteration',
      _walrus_not_bound_before_iteration(),
      (False, [2, 3, 4, 5], 5))


# -- the consumers that always worked must keep working -----------------

def _drained_by_sum():
    return sum(x * 2 for x in [1, 2, 3])


def _drained_by_list():
    return list(x for x in [1, 2, 3] if x != 2)


def _drained_by_a_for_loop():
    seen = []
    for v in (x + 1 for x in [1, 2]):
        seen.append(v)
    return seen


def _nested_genexps():
    return list(sum(y for y in row) for row in [[1, 2], [3, 4]])


def _as_a_sole_call_argument():
    return max(x % 5 for x in [7, 12, 3])


check('drained_by_sum', _drained_by_sum(), 12)
check('drained_by_list', _drained_by_list(), [1, 3])
check('drained_by_a_for_loop', _drained_by_a_for_loop(), [2, 3])
check('nested_genexps', _nested_genexps(), [3, 7])
check('as_a_sole_call_argument', _as_a_sole_call_argument(), 3)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
