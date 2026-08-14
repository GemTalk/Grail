"""Rich comparison: the None block, subclass priority, and the exact call count.

Three rules that CPython's do_richcompare / slot_tp_richcompare implement and
Grail did not:

  * ``__eq__ = None`` in a class body BLOCKS the comparison.  The lookup
    succeeds and yields None, which is then called, so the result is a
    TypeError -- NOT a fall-back to the other operand.  A fall-back would
    hand back the very answer the block exists to refuse.
  * Subclass priority applies to ORDERING, not only to ==/!=: when the right
    operand's class is a proper subclass that overrides the reflected
    operator, it is tried first.
  * A forward dunder that returns NotImplemented leads to exactly ONE
    reflected call.  A plain ``def __eq__(self, other)`` compiles to both a
    fixed-arity and a varargs selector in Grail, and trying both ran the
    reflected method twice.

Every expectation below was checked against CPython 3.13.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except Exception as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def raises_typeerror(fn):
    def run():
        try:
            fn()
        except TypeError:
            return 'TypeError'
        return 'no error'
    return run


# ------------------------------------------------------------ the None block

class SupEq(object):
    def __eq__(self, other):
        return True


class S(SupEq):
    __eq__ = None            # a subclass refusing an inherited comparison


class F(object):
    pass


class X(object):
    __eq__ = None


class SN(SupEq):
    __ne__ = None


class XN:
    def __eq__(self, other):
        return True
    __ne__ = None


e, f, s, x, sn, xn = SupEq(), F(), S(), X(), SN(), XN()

check('block_is_visible_as_None', lambda: X.__eq__ is None, True)
check('plain_eq_still_works', lambda: e == e, True)
check('eq_against_plain_object', lambda: e == f, True)
check('eq_reflected_against_plain', lambda: f == e, True)
# The LEFT operand is consulted first, so a live __eq__ answers before the
# blocked one is ever reached.
check('left_operand_wins_over_block', lambda: e == x, True)
# ...but a blocked LEFT operand raises instead of deferring to the right.
check('blocked_forward_raises', raises_typeerror(lambda: x == e), 'TypeError')
# A blocked SUBCLASS is reached through subclass priority, so it raises even
# though it is on the right.
check('blocked_subclass_raises', raises_typeerror(lambda: e == s), 'TypeError')
check('blocked_subclass_forward_raises',
      raises_typeerror(lambda: s == e), 'TypeError')

check('ne_plain', lambda: e != e, False)
check('ne_blocked_subclass', raises_typeerror(lambda: e != sn), 'TypeError')
check('ne_blocked_subclass_forward',
      raises_typeerror(lambda: sn != e), 'TypeError')
# XN blocks __ne__ but not __eq__, and the LEFT operand settles this one.
check('ne_unblocked_left_wins', lambda: e != xn, False)
check('ne_blocked_forward', raises_typeerror(lambda: xn != e), 'TypeError')

# The classic member of the same family, which Grail already honoured.
class NoHash:
    __hash__ = None


check('hash_block_still_raises', raises_typeerror(lambda: hash(NoHash())),
      'TypeError')

# A real ``def`` on a MORE DERIVED class outranks an inherited None.
class Unblocked(X):
    def __eq__(self, other):
        return 'unblocked'


check('derived_def_outranks_inherited_none',
      lambda: Unblocked() == e, 'unblocked')


# -------------------------------------------- call order and reflected count

LOG = []


class OpLog:
    """Every comparison declines, so the full protocol runs and is recorded."""

    def __init__(self, tag):
        self.tag = tag

    def _log(self, op):
        LOG.append('%s.%s' % (self.tag, op))
        return NotImplemented

    def __eq__(self, other):
        return self._log('__eq__')

    def __le__(self, other):
        return self._log('__le__')

    def __ge__(self, other):
        return self._log('__ge__')


class OpLogSub(OpLog):
    """A proper subclass that OVERRIDES the reflected operators."""

    def __eq__(self, other):
        return self._log('sub__eq__')

    def __le__(self, other):
        return self._log('sub__le__')

    def __ge__(self, other):
        return self._log('sub__ge__')


def sequence(fn):
    del LOG[:]
    try:
        fn()
    except TypeError:
        pass
    return list(LOG)


# Exactly two calls: forward, then reflected.  Three meant the reflected
# method ran twice, once per compiled selector form.
check('eq_calls_reflected_once',
      lambda: sequence(lambda: OpLog('a') == OpLog('b')),
      ['a.__eq__', 'b.__eq__'])
check('ne_calls_reflected_once',
      lambda: sequence(lambda: OpLog('a') != OpLog('b')),
      ['a.__eq__', 'b.__eq__'])
check('le_forward_then_reflected',
      lambda: sequence(lambda: OpLog('a') <= OpLog('b')),
      ['a.__le__', 'b.__ge__'])

# SUBCLASS PRIORITY.  The subclass's reflected operator goes FIRST.
check('eq_subclass_priority',
      lambda: sequence(lambda: OpLog('b') == OpLogSub('c')),
      ['c.sub__eq__', 'b.__eq__'])
check('le_subclass_priority',
      lambda: sequence(lambda: OpLog('b') <= OpLogSub('c')),
      ['c.sub__ge__', 'b.__le__'])
check('ge_subclass_priority',
      lambda: sequence(lambda: OpLog('b') >= OpLogSub('c')),
      ['c.sub__le__', 'b.__ge__'])
# Subclass on the LEFT: ordinary forward-then-reflected order.
check('le_subclass_on_left',
      lambda: sequence(lambda: OpLogSub('c') <= OpLog('b')),
      ['c.sub__le__', 'b.__ge__'])

# An ordering pair that nobody can settle still ends in TypeError, and the
# reflected operator is not retried on the way there.
check('unorderable_pair_raises',
      raises_typeerror(lambda: OpLog('a') <= OpLogSub('c')), 'TypeError')
