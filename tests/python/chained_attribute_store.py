"""A chained assignment whose targets include an attribute of ``self`` or
``cls``: ``x = cls.attr = value``.

The single-target store goes through ``__setattr__``.  The chained one still
wrote the receiver's dynamic instVars directly -- a shape the single target
left behind -- so:

* in a classmethod, where ``cls`` is self and self is a CLASS (which has no
  dynamic instVars), it died with an uncatchable ImproperOperation 2484.
  CPython's own string.Template does exactly this:
  ``pat = cls.pattern = re.compile(...)``;
* ``x = self.p = v`` skipped a @property setter, and a ``__setattr__``
  override.

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def a_classmethod_stores_on_its_class():
    class C:
        flags = None

        @classmethod
        def set(cls):
            x = cls.flags = 3
            a = b = cls.other = 'o'
            return x, a, b

    class D(C):
        pass

    got = D.set()
    return got, D.flags, D.other, C.flags, 'other' in C.__dict__


def an_instance_stores_through_setattr():
    log = []

    class P:
        @property
        def p(self):
            return self._p

        @p.setter
        def p(self, v):
            log.append(('setter', v))
            self._p = v * 2

        def __setattr__(self, name, value):
            log.append(('setattr', name))
            super().__setattr__(name, value)

        def run(self):
            x = self.p = 5
            y = self.q = 6
            return x, y, self.p, self.q

    return P().run(), log


def a_slotted_instance_still_works():
    class S:
        __slots__ = ('a',)

        def run(self):
            x = self.a = 1
            return x, self.a

    return S().run()


def the_other_receivers_are_unchanged():
    class K:
        pass

    def f(k):
        w = k.attr = 6
        return w, k.attr

    z = K.direct = 5
    return z, K.direct, f(K), f(K())


CHECKS = [
    a_classmethod_stores_on_its_class,
    an_instance_stores_through_setattr,
    a_slotted_instance_still_works,
    the_other_receivers_are_unchanged,
]

EXPECTED = {
    'a_classmethod_stores_on_its_class': ((3, 'o', 'o'), 3, 'o', None, False),
    'an_instance_stores_through_setattr': ((5, 6, 10, 6), [('setattr', 'p'), ('setter', 5), ('setattr', '_p'), ('setattr', 'q')]),
    'a_slotted_instance_still_works': (1, 1),
    'the_other_receivers_are_unchanged': (5, 5, (6, 6), (6, 6)),
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
