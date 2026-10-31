"""Fixture: object.__setattr__ and object.__delattr__ answer None.

CPython's slot wrappers return None once the store or delete is done
(Objects/typeobject.c:9592-9625, wrap_setattr and wrap_delattr).  Grail's
answered the stored value and the object itself, so ``r = obj.__setattr__(n,
v)`` read back the value and ``obj.__delattr__(n)`` the object.  A chained
assignment through a class's own __setattr__ still assigns the value, and
setattr() and delattr() answer None as before.  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

r = {}


class Plain:
    pass


class Logged:
    def __init__(self):
        self.__dict__['log'] = []

    def __setattr__(self, name, value):
        self.log.append(name)
        return super().__setattr__(name, value)

    def __delattr__(self, name):
        self.log.append('del ' + name)
        return super().__delattr__(name)


plain = Plain()
r['bound'] = [plain.__setattr__('a', 1), plain.__delattr__('a')]
r['through_object'] = [object.__setattr__(plain, 'b', 2), object.__delattr__(plain, 'b')]
r['builtins'] = [setattr(plain, 'c', 3), delattr(plain, 'c')]
logged = Logged()
r['through_super'] = [logged.__setattr__('d', 4), logged.d, logged.__delattr__('d'), logged.log]
chained = Logged()
first = chained.e = 5
r['chained_assignment'] = [first, chained.e]

EXPECTED = {
    'bound': [None, None],
    'through_object': [None, None],
    'builtins': [None, None],
    'through_super': [None, 4, None, ['d', 'del d']],
    'chained_assignment': [5, 5],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-20s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
