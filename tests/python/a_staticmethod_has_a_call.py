"""Fixture: a staticmethod object has __call__, as CPython's has since 3.10.

CPython gives staticmethod a tp_call that calls the wrapped function
(Objects/funcobject.c:1839-1843, sm_call), so ``staticmethod(f)(x)'' works and
the object has a __call__, which type's __dict__ and dir() list.  Grail's was
callable but had no __call__ to read; and dir() dropped a dunder that only a
varargs transport defines, ``___call__:kw:'', taking its spelling for an
internal selector's.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def echo(*args, **kwargs):
    return args, kwargs


class Holder:
    held = staticmethod(echo)


wrapped = staticmethod(echo)
r['it_has_a_call'] = [wrapped.__call__(1, x=2), hasattr(wrapped, '__call__')]
r['listed'] = ['__call__' in dir(wrapped), '__call__' in vars(staticmethod)]
r['calling_it_still_works'] = [wrapped(3), Holder.held(4), Holder.__dict__['held'].__call__(5)]

EXPECTED = {
    'it_has_a_call': [((1,), {'x': 2}), True],
    'listed': [True, True],
    'calling_it_still_works': [((3,), {}), ((4,), {}), ((5,), {})],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
