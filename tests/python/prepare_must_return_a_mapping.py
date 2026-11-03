"""Fixture: a metaclass's __prepare__ must answer a mapping.

__build_class__ refuses a namespace that PyMapping_Check does not admit:
"BadMeta.__prepare__() must return a mapping, not NoneType", naming a
metaclass that is no class ``<metaclass>'' (Python/bltinmodule.c:197-202).
Anything subscriptable by key is accepted -- a dict, a dict subclass, an
object whose class defines __getitem__.

Grail read a None as ``no namespace'' and built the class
(test_types ClassCreationTests.test_bad___prepare__).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def build(meta):
    try:
        class Built(metaclass=meta):
            x = 1
        return 'built'
    except TypeError as e:
        return 'TypeError: %s' % e


def meta_answering(namespace_factory):
    class Meta(type):
        @classmethod
        def __prepare__(metacls, name, bases, **kwds):
            return namespace_factory()
    return Meta


class NotAType:
    @classmethod
    def __prepare__(cls, *args):
        return None

    def __call__(self, name, bases, namespace):
        return type(name, bases, {key: namespace[key] for key in namespace.keys()})


class KeyedNamespace(dict):
    pass


class MappingWithADefaultedGetitem:
    def __init__(self):
        self.data = {}

    def __getitem__(self, key, default=None):
        return self.data[key]

    def __setitem__(self, key, value):
        self.data[key] = value

    def keys(self):
        return self.data.keys()

    def __iter__(self):
        return iter(self.data)


class CallableMeta:
    @classmethod
    def __prepare__(cls, *args):
        return MappingWithADefaultedGetitem()

    def __call__(self, name, bases, namespace):
        return type(name, bases, {key: namespace[key] for key in namespace.keys()})


r['none'] = build(meta_answering(lambda: None))
r['an_int'] = build(meta_answering(lambda: 42))
r['not_a_type'] = build(NotAType())
r['a_dict'] = build(meta_answering(dict))
r['a_dict_subclass'] = build(meta_answering(KeyedNamespace))
r['a_mapping_with_a_defaulted_getitem'] = build(CallableMeta())

EXPECTED = {
    'none': 'TypeError: Meta.__prepare__() must return a mapping, not NoneType',
    'an_int': 'TypeError: Meta.__prepare__() must return a mapping, not int',
    'not_a_type': 'TypeError: <metaclass>.__prepare__() must return a mapping, not NoneType',
    'a_dict': 'built',
    'a_dict_subclass': 'built',
    'a_mapping_with_a_defaulted_getitem': 'built',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
