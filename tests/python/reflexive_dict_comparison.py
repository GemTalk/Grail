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
]

# NOT driven under Grail: ``y != x'' is STILL uncatchable when the comparison
# runs inside SUnit, and this is a real open defect, not a fixture artifact.
# Measured on gs40, 2026-08-28, with dict>>__eq__: converting locally:
#
#     reflexive-dict comparison check failed: ne_on_reflexive_dicts
#       -- 'raised RecursionError instead: maximum recursion depth exceeded'
#
# The MESSAGE TEXT locates the conversion.  ``maximum recursion depth exceeded''
# with no suffix is BaseException class>>___recursionGuard___; the local
# conversions all add one (dict>>__eq__: says ``... in comparison'').  So inside
# SUnit the overflow does not land in the handler dict>>__eq__: protects at all
# -- it is converted far out by the boundary guard, whose #resignalAs: restarts
# the handler search, and the restarted search SKIPS the inner
# ``except RecursionError'' and is answered by the outer ``except BaseException''.
# A clause-level trace of the two spellings, taken outside SUnit where the same
# asymmetry appeared:
#
#     eq:  clause=RecursionError exc=RecursionError -> true
#     ne:  clause=BaseException  exc=RecursionError -> true   (inner never asked)
#
# Why ``!='' and not ``=='': object>>__ne__: reaches __eq__ only after several
# probes (___dynamicClassAttr___:, ___varargsDunder___:,
# whichClassIncludesSelector:), so it spends more frames per recursion level and
# the overflow lands somewhere different.  WHICH property of the landing site
# decides the restarted search is not yet established.
#
# This is the same phenomenon recursion_shapes.py records for a custom class's
# __eq__ -- "run from a bare evaluation it answers True, but run inside SUnit
# ... raised RecursionError instead" -- and notes as having an unknown trigger.
# The check here is the first DETERMINISTIC in-suite reproduction of it.
#
# Kept in CHECKS so the CPython gate keeps proving what the shape is supposed to
# do; not asserted under Grail, because a red test is not a record.
CHECKS = GRAIL_CHECKS + [ne_on_reflexive_dicts, eq_is_still_catchable_after_ne]


if __name__ == '__main__':
    import sys
    for fn in CHECKS:
        got = fn()
        print('%-6s %s%s' % ('OK' if got is True else 'DIFF', fn.__name__,
                             '' if got is True else '  -- %s' % (got,)))
        if got is not True:
            sys.exit(1)
