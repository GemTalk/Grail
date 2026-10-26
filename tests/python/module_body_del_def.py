"""Fixture: ``del name'' in a module body removes a top-level def.

A module can define a helper, use it while the body runs, and delete it, so
it is not part of the module's namespace -- pickletools does exactly that
with ``assure_pickle_consistency'', and test_pickletools' test__all__ checks
the name is gone.

Grail compiles a top-level def into a METHOD of the module's class, which the
def statement never stores anywhere, so ``del'' found nothing to remove: the
name stayed in globals() and dir(), and still called the function.  The name
is now tombstoned, and the method kept: a function handle is the module plus
a selector, so a handle taken before the del (typing registers one with
copyreg) has to go on working, as CPython's function object outlives its
name.  What Grail still does differently is pinned in KNOWN_DIVERGENCES.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import sys

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def helper(a, b=2):
    return a + b


computed_before = helper(1)
handle_before = helper
del helper


def nullary():
    return 'nullary'


del nullary


def abs(x):
    return 'shadow'


shadowed_while_defined = abs(-2)
del abs


def redefined():
    return 'first'


del redefined


def redefined():
    return 'second'


def _calls_helper():
    return helper(1)


def _calls_nullary():
    return nullary()


def _calls_abs():
    return abs(-3)


def _reads_helper():
    return helper


r['the value computed before the del'] = _try(lambda: computed_before)
r['not in globals()'] = _try(lambda: [n in globals() for n in ('helper', 'nullary')])
r['not in dir()'] = _try(lambda: [n in dir() for n in ('helper', 'nullary')])
r['a call raises NameError'] = _try(_calls_helper)
r['a call with no arguments raises NameError'] = _try(_calls_nullary)
r['a read raises NameError'] = _try(_reads_helper)
r['a deleted def that shadowed a builtin'] = _try(
    lambda: (shadowed_while_defined, _calls_abs()))
r['a def after the del rebinds the name'] = _try(redefined)
r['the module object has no attribute'] = _try(
    lambda: hasattr(sys.modules[__name__], 'helper'))
r['a handle taken before the del still works'] = _try(lambda: handle_before(5))


EXPECTED = {
    'the value computed before the del': ('ok', 3),
    'not in globals()': ('ok', [False, False]),
    'not in dir()': ('ok', [False, False]),
    'a read raises NameError': ('NameError', "name 'helper' is not defined"),
    'a def after the del rebinds the name': ('ok', 'second'),
    'the module object has no attribute': ('ok', False),
    'a handle taken before the del still works': ('ok', 7),
}

KNOWN_DIVERGENCES = {
    # CPython: NameError, name 'helper' / 'nullary' is not defined; and
    # ('shadow', 3), builtins.abs once the module's abs is deleted.  A
    # compiled bare CALL of a module function is a send of the def's
    # selector to the module -- the same send a handle makes -- so it still
    # reaches the method the del left in place.  Reads, globals(), dir() and
    # attribute access all see the name gone.
    'a call raises NameError': ('ok', 3),
    'a call with no arguments raises NameError': ('ok', 'nullary'),
    'a deleted def that shadowed a builtin': ('ok', ('shadow', 'shadow')),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
