"""Fixture: a classmethod object is not callable, as in CPython.

CPython made staticmethod callable in 3.10 and left classmethod without a
tp_call (Objects/funcobject.c:1699), so ``callable(classmethod(f))'' is False
and calling one raises ``'classmethod' object is not callable''.  Grail's
classmethod refuses the call with that TypeError, but callable() asks who
OWNS the call protocol, found classmethod's refusing methods, and answered
True.  A class method bound through its class stays callable.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def echo(*args):
    return args


class Holder:
    @classmethod
    def build(cls, value):
        return cls.__name__, value


wrapped = classmethod(echo)
r['not_callable'] = [callable(wrapped), callable(Holder.__dict__['build'])]
try:
    wrapped(1)
    r['calling_it_refuses'] = 'no error'
except TypeError as refusal:
    r['calling_it_refuses'] = str(refusal)
r['bound_ones_stay_callable'] = [callable(Holder.build), Holder.build(2), Holder().build(3)]
r['staticmethod_and_functions_stay_callable'] = [callable(staticmethod(echo)), callable(echo)]

EXPECTED = {
    'not_callable': [False, False],
    'calling_it_refuses': "'classmethod' object is not callable",
    'bound_ones_stay_callable': [True, ('Holder', 2), ('Holder', 3)],
    'staticmethod_and_functions_stay_callable': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
