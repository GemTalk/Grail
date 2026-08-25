"""inspect's async-function predicates: CPython's mask, Grail's shapes.

``iscoroutinefunction`` / ``isgeneratorfunction`` / ``isasyncgenfunction``
are one rule in CPython: unwrap a method to its function and a partial to
its target, then mask the code object's ``co_flags``.  Grail's flags word is
real (an ``async def`` carries CO_COROUTINE, a yielding def CO_GENERATOR, an
async generator CO_ASYNC_GENERATOR), so the predicates are that same rule.

They were deliberate stubs for a recorded reason: the honest mask once hung
``import django.http.response`` indefinitely -- asgiref looped when told the
truth.  Unstubbed only after re-measuring: the import completes and
test___all__ holds its usual time, the loop having been fixed from
underneath by the callable-classification work.  docs/Issues.md keeps the
history; this fixture keeps the truth table that must not regress.

The explicit ``markcoroutinefunction`` marker still wins independently of
the flags -- asgiref's SyncToAsync marks itself, and Django's async
adaptation keys off it.

Every expectation below was checked against CPython 3.14.
"""

import functools
import inspect

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


async def coro_fn(x):
    return x


def plain_fn():
    pass


def gen_fn():
    yield 1


async def agen_fn():
    yield 1


class C:
    async def m(self):
        pass

    def g(self):
        yield 1


_c = C()


def _trio(obj):
    return (inspect.iscoroutinefunction(obj),
            inspect.isgeneratorfunction(obj),
            inspect.isasyncgenfunction(obj))


# ------------------------------------------------- the truth table

check('an_async_def_is_a_coroutine_function', lambda: _trio(coro_fn),
      (True, False, False))
check('a_plain_def_is_none_of_them', lambda: _trio(plain_fn),
      (False, False, False))
check('a_yielding_def_is_a_generator_function', lambda: _trio(gen_fn),
      (False, True, False))
check('an_async_yielding_def_is_an_async_generator_function',
      lambda: _trio(agen_fn), (False, False, True))
check('an_async_method_read_via_the_class', lambda: _trio(C.m),
      (True, False, False))
check('an_async_method_bound_to_an_instance', lambda: _trio(_c.m),
      (True, False, False))
check('a_generator_method_bound_to_an_instance', lambda: _trio(_c.g),
      (False, True, False))
check('a_partial_is_unwrapped_to_its_target',
      lambda: _trio(functools.partial(coro_fn, 1)), (True, False, False))
check('the_explicit_marker_still_wins',
      lambda: inspect.iscoroutinefunction(
          inspect.markcoroutinefunction(lambda: None)), True)
check('a_non_callable_is_quietly_false', lambda: _trio(42),
      (False, False, False))


# ------------------------------------------------- objects still classify

def _objects():
    c = coro_fn(1)
    g = gen_fn()
    a = agen_fn()
    got = (inspect.iscoroutine(c), inspect.isgenerator(g),
           inspect.isasyncgen(a))
    c.close()
    g.close()
    return got


check('the_object_predicates_agree', _objects, (True, True, True))


# ------------------------------------------------- the recorded landmine

def _the_landmine_is_defused():
    # Vacuous under a bare CPython, which has no django installed -- the
    # check's teeth are under Grail, which vendors it.  What it must never
    # do under Grail is HANG, which is what the recorded failure mode was.
    try:
        import django.http.response  # noqa: F401
    except ModuleNotFoundError:
        return 'imported'
    return 'imported'


check('django_http_response_imports_with_honest_predicates',
      _the_landmine_is_defused, 'imported')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
