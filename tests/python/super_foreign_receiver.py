"""Fixture: a method reached through its CLASS and called with a foreign object.

``X.meth(obj)`` is ordinary Python: the function is fetched off the class and
called with whatever you pass.  ``__class__`` inside it is still X -- the
compiler closed the function over a cell holding X, and that cell has nothing to
do with the object the call supplies.  Zero-argument ``super()`` then applies
CPython's "supercheck" and raises TypeError when the object is not an instance
of X, at CONSTRUCTION time:

    super(type, obj): obj (instance of cell) is not an instance or subtype of
    type (X).

Grail reaches a method's class through the RECEIVER -- the class carries the
cell and the method reads it back through the receiver's class chain -- so a
foreign receiver found nothing and raised

    NameError: free variable 'X' referenced before assignment in enclosing scope

which is neither the right exception nor the right diagnosis: the name is not
unbound, the receiver is simply not an X.  That is test_super's
test_cell_as_self, and it is the shape ``cell_as_self`` below reproduces.

HOW THE CLASS IS RECOVERED, since it is not obvious that it CAN be.  GemStone
has no ``thisContext`` in environment 1, so a compiled method cannot ask which
class it belongs to.  Grail's traceback machinery already solved that problem
for ``sys._getframe``: the VM's raise-time capture fills a stack of (method, ip,
receiver) triples, and a method object knows its defining class.  So the class
comes off the CALL STACK -- but only when the ordinary lookup has already
missed, because it costs a raise (~250 ns against ~0) and zero-argument super()
is the hottest path Grail generates.

``cooperative_chain`` and ``metaclass_super`` are the guards, not decoration.
The supercheck was deliberately NOT applied to the compiled zero-argument path
before this, because an MRO-only version of it rejected cooperative mixins.  It
now accepts the MRO *or* the inheritance chain *or* a recorded metaclass -- the
last because Grail records a class's metaclass rather than making the class an
instance of it, so ``isinstance(A, M)`` is true in CPython and structurally
false in Grail.  Each of the three shapes below fails a check that drops one of
those.
"""


def cell_as_self():
    class X:
        def meth(self):
            super()

    def f():
        k = X()

        def g():
            return k
        return g

    c = f().__closure__[0]
    try:
        X.meth(c)
        return 'NOT RAISED'
    except TypeError as exc:
        return 'TypeError: ' + str(exc)


def dunder_class_with_foreign_receiver():
    # The BARE read, which CPython answers rather than raising: __class__ is
    # closed over by the function, so the object passed in is irrelevant.
    class X:
        def meth(self):
            return __class__

    return X.meth(object()) is X


def cooperative_chain():
    # A mixin reached through the C3 linearization, NOT as a plain superclass.
    # An MRO-only supercheck rejects this, which is why the check was kept off
    # the compiled path until it consulted both.
    class Base:
        def f(self):
            return 'Base'

    class Mixin:
        def f(self):
            return 'Mixin+' + super().f()

    class Derived(Mixin, Base):
        def f(self):
            return 'Derived+' + super().f()

    return Derived().f()


def metaclass_super():
    # A metaclass method whose receiver is a CLASS that names it as metaclass.
    # isinstance(A, M) is true in CPython; Grail records the metaclass instead,
    # so a check that only knows instances and subclasses rejects it.
    class M(type):
        def describe(cls):
            return 'M:' + super().__repr__()[:0] + cls.__name__

    class A(metaclass=M):
        pass

    return A.describe()


r = {
    'cell_as_self': cell_as_self(),
    'dunder_class_with_foreign_receiver': dunder_class_with_foreign_receiver(),
    'cooperative_chain': cooperative_chain(),
    'metaclass_super': metaclass_super(),
}


EXPECTED = {
    'cell_as_self':
        'TypeError: super(type, obj): obj (instance of cell) is not an '
        'instance or subtype of type (X).',
    'dunder_class_with_foreign_receiver': True,
    'cooperative_chain': 'Derived+Mixin+Base',
    'metaclass_super': 'M:A',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
