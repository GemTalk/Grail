# A class body runs TOP TO BOTTOM, once.  Grail compiles one STRUCTURALLY --
# it scans for the names the body binds and emits one store per name -- and the
# statements that bind no name it can see (a ``for``, a ``while``, a ``try``, a
# ``with``, an ``if``, a bare expression, an augmented assignment) were emitted
# in a pass AFTER all of those stores.
#
# That is invisible until a loop DEFINES a name and a later attribute READS it:
#
#     class Period(timedelta, Enum):
#         Period = vars()
#         for i in range(32):
#             Period['day_%d' % i] = i, 'day'
#         OneDay = day_1              # NameError: name 'day_1' is not defined
#
# The dynamic read was already in place and correct; the write had already run
# by the time CPython reached ``OneDay``, and under Grail it had not.  So the
# ordering is not a refinement here, it is the algorithm -- these statements now
# emit at their own source position, alongside the ``global``/subscript/``del``
# statements that were already positional for the same reason.
#
# test_enum TestSpecial.test_ignore.

r = {}


# --- a loop that defines what a later attribute reads -------------------------------


class Loop:
    ns = vars()
    for i in range(4):
        ns['sq_%d' % i] = i * i
    last = sq_3
    total = sq_1 + sq_2


r['loop_defines_then_read'] = repr((Loop.last, Loop.total))

# --- the same for each remaining compound statement ---------------------------------
# ``while`` and ``try`` and ``with`` all bound their names in the trailing pass,
# so every one of these reads used to miss.


class While:
    n = 0
    while n < 3:
        n = n + 1
    doubled = n * 2


r['while_then_read'] = repr((While.n, While.doubled))


class Try:
    try:
        from_try = 'try'
    except Exception:
        from_try = 'except'
    finally:
        from_finally = 'finally'
    seen = from_try + '/' + from_finally


r['try_then_read'] = repr(Try.seen)


class Ctx:
    def __init__(self):
        pass

    def __enter__(self):
        return 'entered'

    def __exit__(self, *a):
        return False


class With:
    with Ctx() as c:
        from_with = c
    seen = from_with


r['with_then_read'] = repr(With.seen)


class If:
    flag = True
    if flag:
        chosen = 'yes'
    else:
        chosen = 'no'
    seen = chosen


r['if_then_read'] = repr(If.seen)


class AugAssign:
    x = 1
    x += 41
    doubled = x * 2


r['augassign_then_read'] = repr((AugAssign.x, AugAssign.doubled))


class BareExpr:
    ns = vars()
    ns.update({'injected': 7})
    seen = injected


r['bare_expr_then_read'] = repr(BareExpr.seen)

# --- order is order, both ways ------------------------------------------------------
# A statement AFTER the attribute must not be pulled forward either.  This one
# is the check that the fix is an interleave rather than a blanket move: the
# loop runs after ``before`` is bound and before ``after`` is read.


class Interleaved:
    order = []
    order.append('first')
    for _ in range(1):
        order.append('loop')
    order.append('last')
    trace = tuple(order)


r['interleaved_order'] = repr(Interleaved.trace)

# A later loop OVERWRITES what an earlier attribute bound, exactly as a later
# assignment would -- the value the class ends up with is the last one written.


class Overwrite:
    value = 'from-attribute'
    for _ in range(1):
        value = 'from-loop'


r['loop_overwrites_attribute'] = repr(Overwrite.value)

# ...and an attribute after the loop wins over what the loop left.


class OverwrittenBy:
    for _ in range(1):
        value = 'from-loop'
    value = 'from-attribute'


r['attribute_overwrites_loop'] = repr(OverwrittenBy.value)


# What CPython 3.14 answers for each of the above, measured rather than
# assumed.  Grail is expected to match every one.
EXPECTED = {
    'attribute_overwrites_loop': "'from-attribute'",
    'augassign_then_read': '(42, 84)',
    'bare_expr_then_read': '7',
    'if_then_read': "'yes'",
    'interleaved_order': "('first', 'loop', 'last')",
    'loop_defines_then_read': '(9, 5)',
    'loop_overwrites_attribute': "'from-loop'",
    'try_then_read': "'try/finally'",
    'while_then_read': '(3, 6)',
    'with_then_read': "'entered'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
