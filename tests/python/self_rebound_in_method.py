"""Fixture: a method that REBINDS its own ``self'' parameter.

CPython treats the self/cls parameter as an ordinary rebindable local.  Two
idioms in the wild depend on it:

    def close(self):
        ...
        self = None          # drop the reference so the cycle can be collected

    def __new__(cls, v):
        self = object.__new__(cls)
        self.v = v
        return self

Grail normally compiles the receiver to Smalltalk ``self'', which cannot be
assigned.  A method that rebinds it therefore carries the receiver in a TEMP
instead, and every receiver fast path -- the instVar read and store, the
fixed-arity self-send -- has to stand down for the whole body, because after the
rebinding ``self'' is just a local that happens to start out holding the
receiver.

The checks pin that BOTH halves hold: reads before the rebinding still see the
instance, and reads after it see the new value rather than the instance.  A
transport that kept a fast path alive would answer the INSTANCE after the
rebinding -- a wrong value, not an error, and one that looks right in every test
that does not rebind.

ONE SHAPE IS DELIBERATELY ABSENT.  ``del self'' is legal Python and CPython
runs it, but Grail cannot compile it on EITHER path -- measured on the text
path, which answers ``Grail could not compile this method (codegen gap)''.  It
stays refused rather than being quietly supported by the IR path alone, which
would leave the flag-off build failing on source the flag-on build accepts.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


class Cycle:
    def __init__(self):
        self.tag = 'kept'

    def drop(self):
        before = self.tag
        me = self
        self = None
        return before, me.tag, self is None


r['reads_before_and_after_the_rebinding'] = Cycle().drop()


class Attr:
    def __init__(self, v):
        self.v = v

    def take(self):
        got = self.v
        self = None
        return got

    def store_then_drop(self):
        self.v = 'stored'
        got = self.v
        self = None
        return got


a = Attr(7)
r['an_instvar_read_before_the_rebinding'] = a.take()
r['an_instvar_store_before_the_rebinding'] = Attr(0).store_then_drop()


class Made:
    def __new__(cls, v):
        self = object.__new__(cls)
        self.doubled = v * 2
        return self


r['the_dunder_new_idiom'] = Made(4).doubled


class SelfSend:
    def helper(self):
        return 'helped'

    def go(self):
        first = self.helper()
        self = None
        return first, self is None


r['a_self_send_before_the_rebinding'] = SelfSend().go()


class Rebind:
    def __init__(self, n):
        self.n = n

    def to_another(self, other):
        self = other
        return self.n


r['rebound_to_another_instance'] = Rebind(1).to_another(Rebind(99))


class Conditional:
    def __init__(self):
        self.tag = 'orig'

    def maybe(self, flag):
        if flag:
            self = None
            return 'dropped'
        return self.tag


c = Conditional()
r['rebound_on_one_branch_only'] = (c.maybe(True), c.maybe(False))


class Named:
    """A receiver parameter that is not spelled ``self''."""

    def __init__(self):
        self.k = 'named'

    def go(__self):
        got = __self.k
        __self = None
        return got, __self is None


r['a_receiver_not_spelled_self'] = Named().go()


class Loop:
    def __init__(self):
        self.items = [1, 2, 3]

    def total(self):
        acc = 0
        for i in self.items:
            acc += i
        self = None
        return acc, self is None


r['a_loop_over_an_instvar_then_rebind'] = Loop().total()


EXPECTED = {
    'reads_before_and_after_the_rebinding': ('kept', 'kept', True),
    'an_instvar_read_before_the_rebinding': 7,
    'an_instvar_store_before_the_rebinding': 'stored',
    'the_dunder_new_idiom': 8,
    'a_self_send_before_the_rebinding': ('helped', True),
    'rebound_to_another_instance': 99,
    'rebound_on_one_branch_only': ('dropped', 'orig'),
    'a_receiver_not_spelled_self': ('named', True),
    'a_loop_over_an_instvar_then_rebind': (6, True),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-44s is not in EXPECTED' % ('FAIL', extra))
