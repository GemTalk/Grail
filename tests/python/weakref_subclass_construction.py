"""Fixture: a Python subclass of weakref.ref refers to the object it is built on.

CPython's weakref_new builds whatever subtype it is handed from the referent
and an optional callback, so ``class TaggedRef(weakref.ref): pass`` makes
working references, with or without an __init__ of the subclass's own.
Grail allocated the subclass instance bare: ``TaggedRef(obj)()`` answered
None and the callback never ran.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import gc
import weakref

r = {}


class Target:
    pass


class TaggedRef(weakref.ref):
    pass


class WithInit(weakref.ref):
    def __init__(self, ob, callback=None):
        super().__init__(ob, callback)
        self.tag = 'init ran'


target = Target()
r['plain_subclass'] = [TaggedRef(target)() is target, type(TaggedRef(target)).__name__,
                       isinstance(TaggedRef(target), weakref.ref)]
with_init = WithInit(target)
r['with_init'] = [with_init() is target, with_init.tag]

calls = []
mortal = Target()
kept = TaggedRef(mortal, lambda ref: calls.append(type(ref).__name__))
del mortal
gc.collect()
r['callback'] = [kept(), calls]


def refusal(*args, **kwargs):
    try:
        TaggedRef(*args, **kwargs)
        return 'no error'
    except TypeError as e:
        return str(e)


r['refusals'] = [refusal(), refusal(target, None, 1)]

EXPECTED = {
    'plain_subclass': [True, 'TaggedRef', True],
    'with_init': [True, 'init ran'],
    'callback': [None, ['TaggedRef']],
    'refusals': ['__new__ expected at least 1 argument, got 0',
                 '__new__ expected at most 2 arguments, got 3'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-16s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
