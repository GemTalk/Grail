"""Fixture: a store on an instance is decided by the NEAREST class in the MRO
that has the name (#1407).

A ``@property`` declared in a class body compiles, in Grail, to a getter and
setter METHOD pair.  A property that is STORED -- defined under an ``if`` in
a class body, or assigned at runtime with ``Sub.p = property(...)`` -- lives
as a class attribute instead.  Reads already honoured the nearer one; stores
ran the inherited compiled setter whatever a subclass had stored, so a
subclass's setter never ran and a read-only subclass property did not raise.

CPython's rule, which every check here follows: walk the MRO, stop at the
first class whose dict has the name.  A data descriptor there takes the store;
a plain value or a non-data descriptor there sends it to the instance dict.

Everything here is verified against real CPython by running the file
directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class Base:
    @property
    def version(self):
        return 'base'

    @version.setter
    def version(self, v):
        self.stored = ('base-set', v)


class UnderIf(Base):
    if True:
        @property
        def version(self):
            return ('wrapped', super().version)

        @version.setter
        def version(self, v):
            self.stored = ('sub-set', v)

    def set_from_inside(self, v):
        self.version = v
        return self.stored


class Runtime(Base):
    pass


Runtime.version = property(lambda self: 'runtime',
                           lambda self, v: setattr(self, 'stored', ('rt-set', v)))


class ReadOnly(Base):
    pass


ReadOnly.version = property(lambda self: 'read-only')


class Declared(Base):
    @property
    def version(self):
        return 'declared'

    @version.setter
    def version(self, v):
        self.stored = ('declared-set', v)


class FartherStored:
    pass


FartherStored.version = property(lambda self: 'farther',
                                 lambda self, v: setattr(self, 'stored', ('farther-set', v)))


class PairNearer(FartherStored):
    @property
    def version(self):
        return 'pair'

    @version.setter
    def version(self, v):
        self.stored = ('pair-set', v)


class InstanceOfPairNearer(PairNearer):
    pass


class SameClass:
    @property
    def version(self):
        return 'methods'

    @version.setter
    def version(self, v):
        self.stored = ('methods-set', v)


SameClass.version = property(lambda self: 'replaced',
                             lambda self, v: setattr(self, 'stored', ('replaced-set', v)))


class PlainValue(Base):
    pass


PlainValue.version = 'plain class value'


class NonData:
    def __get__(self, obj, owner=None):
        return 'non-data'


class NonDataNearer(Base):
    pass


NonDataNearer.version = NonData()


def _store(cls, how='attr'):
    o = cls()
    if how == 'attr':
        o.version = 1
    elif how == 'setattr':
        setattr(o, 'version', 1)
    else:
        object.__setattr__(o, 'version', 1)
    return (o.version, o.__dict__.get('stored'), 'version' in o.__dict__)


record('base_itself', lambda: _store(Base))
record('subclass_property_under_if', lambda: _store(UnderIf))
record('self_store_inside_a_method', lambda: UnderIf().set_from_inside(7))
record('runtime_property_on_subclass', lambda: _store(Runtime))
record('runtime_property_via_setattr', lambda: _store(Runtime, 'setattr'))
record('runtime_property_via_object_setattr', lambda: _store(Runtime, 'object'))
record('read_only_runtime_property_raises', lambda: _store(ReadOnly))
record('declared_subclass_property', lambda: _store(Declared))
record('nearer_pair_beats_farther_stored', lambda: _store(InstanceOfPairNearer))
record('stored_over_methods_on_same_class', lambda: _store(SameClass))
record('nearer_plain_value_goes_to_instance_dict', lambda: _store(PlainValue))
record('nearer_non_data_descriptor_goes_to_instance_dict',
       lambda: _store(NonDataNearer))


EXPECTED = {
    'base_itself': ('base', ('base-set', 1), False),
    'subclass_property_under_if': (('wrapped', 'base'), ('sub-set', 1), False),
    'self_store_inside_a_method': ('sub-set', 7),
    'runtime_property_on_subclass': ('runtime', ('rt-set', 1), False),
    'runtime_property_via_setattr': ('runtime', ('rt-set', 1), False),
    'runtime_property_via_object_setattr': ('runtime', ('rt-set', 1), False),
    'read_only_runtime_property_raises':
        "AttributeError: property '<lambda>' of 'ReadOnly' object has no setter",
    'declared_subclass_property': ('declared', ('declared-set', 1), False),
    'nearer_pair_beats_farther_stored': ('pair', ('pair-set', 1), False),
    'stored_over_methods_on_same_class': ('replaced', ('replaced-set', 1), False),
    'nearer_plain_value_goes_to_instance_dict': (1, None, True),
    'nearer_non_data_descriptor_goes_to_instance_dict': (1, None, True),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-48s is not in EXPECTED' % ('FAIL', extra))
