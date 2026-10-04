"""A property on a subclass wins over the one it overrides.

An instance read of a name with a getter/setter pair performs the getter it
finds, and that getter can be an ANCESTOR's property while a nearer class has
rebound the name.  CPython takes the first class in the MRO that has the name.
Three shapes read the ancestor instead:

* ``Sub.p = property(...)`` set after the class existed -- Base's value;
* ``@Base.p.deleter def p(self)`` -- the DELETER's body ran as the getter;
* ``@to_property def p(self)`` -- the undecorated body ran.

A plain class value must still not outrank an instance attribute.

Every expectation was measured against CPython 3.14.6.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


class Base:
    def __init__(self):
        self.slot = 'instance'

    @property
    def p(self):
        return 'base-get'


class SetLater(Base):
    pass


SetLater.p = property(lambda self: 'set-later')


class DeleterOnly(Base):
    @Base.p.deleter
    def p(self):
        self.deleted = True


class SetterOnly(Base):
    @Base.p.setter
    def p(self, value):
        self.stored = value


class GetterOnly(Base):
    @Base.p.getter
    def p(self):
        return 'getter-only'


def to_property(f):
    return property(lambda self: 'decorated')


class Decorated(Base):
    @to_property
    def p(self):
        return 'raw body'


class ClassValue(Base):
    slot = 'class'


def _delete(obj):
    del obj.p
    return obj.deleted


def _set(obj):
    obj.p = 5
    return obj.stored


check('property_set_on_the_subclass_later', attempt(lambda: SetLater().p), ('ok', 'set-later'))
check('deleter_only_reads_the_inherited_getter', attempt(lambda: DeleterOnly().p),
      ('ok', 'base-get'))
check('deleter_only_deletes', attempt(lambda: _delete(DeleterOnly())), ('ok', True))
check('setter_only_reads_the_inherited_getter', attempt(lambda: SetterOnly().p),
      ('ok', 'base-get'))
check('setter_only_sets', attempt(lambda: _set(SetterOnly())), ('ok', 5))
check('getter_only_reads_its_own_getter', attempt(lambda: GetterOnly().p), ('ok', 'getter-only'))
check('decorator_returning_a_property', attempt(lambda: Decorated().p), ('ok', 'decorated'))
check('getattr_agrees', attempt(lambda: getattr(DeleterOnly(), 'p')), ('ok', 'base-get'))
check('class_value_does_not_outrank_the_instance', ClassValue().slot, 'instance')
check('base_is_unchanged', Base().p, 'base-get')

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
