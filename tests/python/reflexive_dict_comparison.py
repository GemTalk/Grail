"""Comparing two REFLEXIVE dicts must raise a CATCHABLE RecursionError -- for
``=='' and for ``!='' alike.

CPython guarantees this: dict comparison compares values, identity-first, so
``x == y'' where x['self'] is x and y['self'] is y recurses until
Py_EnterRecursiveCall trips and raises RecursionError.  test_copy's
test_deepcopy_reflexive_dict depends on exactly this shape.

Under Grail the limit is physical Smalltalk stack exhaustion: the VM signals
AlmostOutOfStackError and the conversion to RecursionError happens in Smalltalk.
That makes the CATCHABILITY of the result -- not just its type -- the thing worth
asserting, because the two have come apart in practice.  dict>>__eq__: carries an
``on: Error'' handler (written for a NaN key's failed hash lookup) which used to
merely RE-PASS the overflow, leaving conversion to the far-out boundary guard;
the guard's #resignalAs: restarts the handler search from the original signal
point, and whether the user's ``except RecursionError:'' is still part of that
restarted search turned out to depend on how many frames sat in between.  So
``x == y'' was catchable while ``y != x'' -- one extra layer, via the generic
object>>__ne__: -- raised a genuine RecursionError that ``except RecursionError''
did not match, and only the outer ``except Exception'' saw it.

Hence the third check: catching the ne case must not be what makes it work, and
the eq case must still be catchable AFTER the ne case has run in the same
activation.  Each check answers True, or a string naming what happened instead.
"""


def _probe(fn):
    try:
        fn()
    except RecursionError:
        return True
    except BaseException as e:
        return 'raised %s instead: %s' % (type(e).__name__, e)
    return 'no exception at all'


def _reflexive_pair():
    """Two DISTINCT self-referential dicts.

    Distinct matters: ``x == x'' short-circuits on identity and never recurses,
    so a single dict would make every check below pass vacuously.
    """

    x = {}
    x['self'] = x
    y = {}
    y['self'] = y
    return x, y


def eq_on_reflexive_dicts():
    x, y = _reflexive_pair()
    return _probe(lambda: x == y)


def ne_on_reflexive_dicts():
    x, y = _reflexive_pair()
    return _probe(lambda: y != x)


def eq_is_still_catchable_after_ne():
    """Both spellings, in that order, inside ONE activation."""

    x, y = _reflexive_pair()
    first = _probe(lambda: y != x)
    if first is not True:
        return 'the ne case failed here too: %s' % (first,)
    return _probe(lambda: x == y)


def the_pair_is_not_identical():
    """A control: without this the checks above could pass vacuously."""

    x, y = _reflexive_pair()
    if x is y:
        return '_reflexive_pair answered the same dict twice'
    if x['self'] is not x or y['self'] is not y:
        return 'the dicts are not reflexive'
    return True


# Driven from PythonTests>>RecursionErrorTestCase.
GRAIL_CHECKS = [
    the_pair_is_not_identical,
    eq_on_reflexive_dicts,
    ne_on_reflexive_dicts,
    eq_is_still_catchable_after_ne,
]

# ``y != x'' used to be uncatchable inside SUnit (measured on gs40, 2026-08-28):
#
#     reflexive-dict comparison check failed: ne_on_reflexive_dicts
#       -- 'raised RecursionError instead: maximum recursion depth exceeded'
#
# The overflow was converted far out by BaseException class>>___recursionGuard___,
# whose #resignalAs: TRIMS the stack back to the overflow before signalling.  The
# VM re-protects the yellow guard page on that unwind with no margin, so when the
# trip fell where the trim left the stack pointer just above the page, the
# RecursionError's own handler search tripped again -- and that second overflow
# skipped the inner ``except RecursionError'' and reached the outer
# ``except BaseException''.  Which spelling hit it depended only on frames per
# recursion level (``!='' goes through object>>__ne__:'s probes), i.e. on where
# in the cycle the trip landed.  A raw overflow is now a RecursionError to
# Python in the FIRST handler search (BaseException class >> handles:), with no
# trim, so both spellings are driven under Grail.
CHECKS = GRAIL_CHECKS


if __name__ == '__main__':
    import sys
    for fn in CHECKS:
        got = fn()
        print('%-6s %s%s' % ('OK' if got is True else 'DIFF', fn.__name__,
                             '' if got is True else '  -- %s' % (got,)))
        if got is not True:
            sys.exit(1)
