"""Fixture: a function assigned as an attribute hook after the class exists is called.

Assigning a function to a class's __setattr__, __delattr__, __set__ or
__delete__ after it is created re-derives the type's slot from the new
attribute (Objects/typeobject.c:6231, type_setattro's update_slot), and
the slot calls the function with the instance first.  A lambda, a nested
def and a top-level def are all the same function object to CPython.

Grail reached the hook through a forwarder compiled on the class, and
compiled one only for a lambda or nested def, and only on a class no module
had registered yet.  So ``C.__setattr__ = refuse'' with a top-level def left
every store going straight through, a class whose __set__ was assigned one
was not a data descriptor, and on a class of an imported module -- this
module, when the suite imports it -- not even a lambda was reached.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}
log = []


def logging_setattr(self, name, value):
    log.append(('set', name))
    object.__setattr__(self, name, value)


def logging_delattr(self, name):
    log.append(('del', name))
    object.__delattr__(self, name)


def descriptor_set(self, instance, value):
    log.append(('__set__', value))


def descriptor_delete(self, instance):
    log.append(('__delete__',))


class Hooked:
    pass


Hooked.__setattr__ = logging_setattr
Hooked.__delattr__ = logging_delattr

hooked = Hooked()
hooked.a = 1
del hooked.a
r['setattr_and_delattr_hooks'] = log[:]
r['the_hook_still_stores'] = (hooked.__dict__, getattr(hooked, 'a', 'gone'))


class Refusing:
    pass


def refuse(self, name, value):
    raise AttributeError('refused %s' % name)


Refusing.__setattr__ = refuse
try:
    Refusing().b = 2
    r['a_refusing_hook'] = 'stored'
except AttributeError as e:
    r['a_refusing_hook'] = str(e)


class Descriptor:
    pass


Descriptor.__set__ = descriptor_set
Descriptor.__delete__ = descriptor_delete


class Owner:
    field = Descriptor()


del log[:]
owner = Owner()
owner.field = 5
del owner.field
r['a_data_descriptor_by_assignment'] = (log[:], 'field' in owner.__dict__)


class LambdaHooked:
    pass


LambdaHooked.__setattr__ = lambda self, name, value: log.append(('lambda', name))
del log[:]
LambdaHooked().d = 4
r['a_lambda_hook'] = log[:]


class Subclass(Hooked):
    pass


del log[:]
Subclass().c = 3
r['a_subclass_inherits_the_hook'] = log[:]

EXPECTED = {
    'setattr_and_delattr_hooks': [('set', 'a'), ('del', 'a')],
    'the_hook_still_stores': ({}, 'gone'),
    'a_refusing_hook': 'refused b',
    'a_data_descriptor_by_assignment': ([('__set__', 5), ('__delete__',)], False),
    'a_subclass_inherits_the_hook': [('set', 'c')],
    'a_lambda_hook': [('lambda', 'd')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
