"""type.__prepare__: the default class namespace, and the super() call to it.

CPython's ``type.__prepare__(name, bases, **kwds)`` answers a new, empty dict and
ignores its arguments.  Its point is the idiom a metaclass writes to START from
the default and then seed or wrap it:

    @classmethod
    def __prepare__(mcls, name, bases, **kwds):
        ns = super().__prepare__(name, bases, **kwds)
        ...

Grail's ``type`` had no __prepare__, so the super() read raised AttributeError
and the class statement failed.  The controls at the end are the other half: a
metaclass that defines no __prepare__ -- ABCMeta, a bare ``class N(type)'' -- now
inherits type's, and must behave exactly as before.
"""

import abc

r = {}

# --- type.__prepare__ itself ---------------------------------------------------

_ns = type.__prepare__('Z', ())
r['returns_an_empty_dict'] = [type(_ns).__name__, _ns]
r['ignores_its_arguments'] = [type.__prepare__(), type.__prepare__('Z', (), a=1),
                              type.__prepare__(1, 2, 3)]
r['fresh_dict_each_call'] = type.__prepare__() is not type.__prepare__()


class Bare(type):
    pass


# Inherited by every metaclass, and callable through the class.
r['inherited_by_a_metaclass'] = [Bare.__prepare__('Q', ()),
                                 abc.ABCMeta.__prepare__('Q', ())]

# --- the super() idiom ---------------------------------------------------------

_SEEN = []


class Seeding(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        ns = super().__prepare__(name, bases, **kw)
        _SEEN.append((name, [b.__name__ for b in bases], sorted(kw.items()),
                      type(ns).__name__))
        ns['seeded'] = 'by ' + mcls.__name__
        return ns

    def __new__(mcls, name, bases, ns, **kw):
        return super().__new__(mcls, name, bases, ns)


class Base:
    pass


class Seeded(Base, metaclass=Seeding, flag=True):
    own = 1


r['super_prepare_is_reached'] = _SEEN[-1]
r['seeded_name_reaches_the_class'] = [Seeded.seeded, Seeded.own]


class SeededChild(Seeded):
    pass


# The metaclass is inherited, so its __prepare__ -- and the super() in it -- run
# for the subclass too.
r['super_prepare_for_a_subclass'] = [_SEEN[-1][:3], SeededChild.seeded]


class DeeperSeeding(Seeding):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        ns = super().__prepare__(name, bases, **kw)
        ns['deeper'] = True
        return ns


class Deep(metaclass=DeeperSeeding):
    pass


# Two levels of super(): DeeperSeeding -> Seeding -> type.
r['super_prepare_through_two_metaclasses'] = [Deep.seeded, Deep.deeper]

# --- controls: a metaclass with no __prepare__ is unchanged --------------------


class Shape(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def area(self):
        pass


class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side * self.side


try:
    Shape()
    _abstract = 'instantiated'
except TypeError:
    _abstract = 'TypeError'
r['abc_still_refuses_an_abstract_class'] = [_abstract, Square(3).area()]


class Plain(metaclass=Bare):
    x = 1

    def m(self):
        return 'm'


r['bare_metaclass_class_still_works'] = [Plain.x, Plain().m(), type(Plain).__name__]

# Receivers for the paired TestCase, which asks the namespace machinery directly
# whether a metaclass with no __prepare__ of its own allocates one.  Asking
# records the metaclass on the receiver, so these exist only to be asked.


class ScratchForAbc:
    pass


class ScratchForBare:
    pass


class ScratchForSeeding:
    pass


EXPECTED = {
    'returns_an_empty_dict': ['dict', {}],
    'ignores_its_arguments': [{}, {}, {}],
    'fresh_dict_each_call': True,
    'inherited_by_a_metaclass': [{}, {}],
    'super_prepare_is_reached': ('Seeded', ['Base'], [('flag', True)], 'dict'),
    'seeded_name_reaches_the_class': ['by Seeding', 1],
    'super_prepare_for_a_subclass': [('SeededChild', ['Seeded'], []), 'by Seeding'],
    'super_prepare_through_two_metaclasses': ['by DeeperSeeding', True],
    'abc_still_refuses_an_abstract_class': ['TypeError', 9],
    'bare_metaclass_class_still_works': [1, 'm', 'Bare'],
}

XFAIL = set()

_disagreeing = sorted(
    k for k, v in EXPECTED.items() if k not in XFAIL and r.get(k) != v)

SUMMARY = '%d checks, %d xfail, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(XFAIL), len(_disagreeing), _disagreeing,
    sorted(r) == sorted(EXPECTED))

if __name__ == '__main__':
    for key in sorted(EXPECTED):
        got = r.get(key)
        want = EXPECTED[key]
        if key in XFAIL:
            status = 'XFAIL' if got == want else 'FAIL'
        else:
            status = 'OK' if got == want else 'FAIL'
        print('%-40s %-5s got=%r want=%r' % (key, status, got, want))
    print(SUMMARY)
