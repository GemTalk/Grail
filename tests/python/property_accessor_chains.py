"""Fixture: @x.getter / @x.setter / @x.deleter build the property CPython builds.

Each accessor decorator is ``x = x.setter(f)`` at the def: a NEW property,
copied from whatever ``x`` is there.  Grail compiles a ``@property def x`` as
an accessor pair, and read every accessor form as one of its halves.  Over a
property that came from anywhere else that was wrong:
  * ``x = property(doc='hello')`` then @x.getter/@x.setter/@x.deleter: the
    accessors were dropped, and the class kept the bare property;
  * a getter and a deleter share one unary signature, so the deleter's body
    replaced the getter's;
  * a deleter with a default compiled under the plain name and was never
    found;
  * a subclass's ``@Base.x.deleter`` was read as a getter, and ``del obj.x``
    ran the BASE class's deleter.
(test_descr test_properties_plus.)  Every check here holds under CPython
3.14, which is what makes it evidence.
"""

r = {}


class Assigned:
    foo = property(doc="hello")

    @foo.getter
    def foo(self):
        return self._foo

    @foo.setter
    def foo(self, value):
        self._foo = abs(value)

    @foo.deleter
    def foo(self):
        del self._foo


class Tolerant(Assigned):
    @Assigned.foo.deleter
    def foo(self):
        try:
            del self._foo
        except AttributeError:
            pass


class Decorated:
    @property
    def foo(self):
        return self._foo

    @foo.setter
    def foo(self, value):
        raise RuntimeError

    @foo.setter
    def foo(self, value):
        self._foo = abs(value)

    @foo.deleter
    def foo(self, value=None):
        del self._foo


class Clamped(Decorated):
    @Decorated.foo.deleter
    def foo(self):
        del self._foo

    @foo.setter
    def foo(self, value):
        self._foo = max(0, value)


class FromFunctions:
    def get_x(self):
        return self._x

    x = property(get_x)

    @x.setter
    def x(self, value):
        self._x = value * 2


def outcome(thunk):
    try:
        return thunk()
    except AttributeError as exc:
        return 'AttributeError: %s' % (exc,)


def cycle(obj, value):
    obj.foo = value
    got = obj.foo
    del obj.foo
    return [got, hasattr(obj, '_foo')]


assigned = Assigned.__dict__['foo']
r['assigned_chain'] = [Assigned.foo.__doc__, cycle(Assigned(), -42),
                       [assigned.fget is not None, assigned.fset is not None, assigned.fdel is not None]]


def delete_twice(obj):
    obj.foo = 24
    del obj.foo
    del obj.foo
    return hasattr(obj, '_foo')


r['subclass_deleter'] = outcome(lambda: delete_twice(Tolerant()))
r['decorated_varargs_deleter'] = cycle(Decorated(), -42)
r['subclass_deleter_then_setter'] = cycle(Clamped(), -10)
from_functions = FromFunctions()
from_functions.x = 5
r['setter_over_assigned_getter'] = from_functions.x

EXPECTED = {
    'assigned_chain': ['hello', [42, False], [True, True, True]],
    'subclass_deleter': False,
    'decorated_varargs_deleter': [42, False],
    'subclass_deleter_then_setter': [0, False],
    'setter_over_assigned_getter': 10,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-29s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
