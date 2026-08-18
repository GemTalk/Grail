"""Fixture: ``__class__'' when the metaclass did not return a class.

A method's ``__class__'' is a CELL, not a name.  The compiler injects
``__classcell__'' into the class namespace and ``type.__new__'' fills it with
the class it builds, so the method reads whatever ended up in that cell -- which
is not necessarily whatever the class NAME ended up bound to.

A metaclass is entitled to make the two disagree:

    class Meta(type):
        def __new__(cls, name, bases, ns):
            return None            # so ``A is None'' afterwards

    class A(metaclass=Meta):
        @staticmethod
        def f(): return __class__

    B = type('B', (), ns)          # fills the SAME cell with B
    B.f() is B                     # True

``A is None'' is correct -- the metaclass said so.  The cell is a different
thing: it was still empty when Meta declined to build anything, and the
three-argument ``type()'' that later consumed the namespace filled it with B.
That is test_super's test___class___delayed.

GRAIL HELD TWO CELLS AND READ THE WRONG ONE.  ``___cell_<Name>___'' holds the
name BINDING -- a zero-argument block closing over the Smalltalk temp, so that a
value bound after the classdef is visible -- while ``___grailClassCell___'' is
the injected ``__classcell__''.  For an ordinary class the two agree and reading
the cheaper one is right; here the binding is None and the cell holds B, and
Grail answered None.

The read now falls back to the injected cell only when the binding turned out
NOT to be a class, so nothing is added to the path every ``__class__'' and
zero-argument ``super()'' in the corpus takes.  It also had to be a SEPARATE
entry point from the captured-local read, which shares the same lookup and whose
values are routinely not classes -- an int, a string, None -- where consulting a
class cell would be wrong rather than merely wasteful.  ``captured_local'' below
is that guard.

The second half was reachability: the injected cell was recorded only in a
session table that is dropped when the class statement ends, and the store that
normally leaves it ON the class is skipped when the metaclass answers a
non-class.  So a method running later had no route to it at all.
"""


def delayed_class():
    holder = []

    class Meta(type):
        def __new__(cls, name, bases, namespace):
            holder.append(namespace)
            return None

    class A(metaclass=Meta):
        @staticmethod
        def f():
            return __class__

    namespace = holder[0]
    B = type("B", (), namespace)
    return [A is None,
            "__classcell__" in namespace,
            B.f() is B]


def cell_is_empty_until_type_fills_it():
    holder = []

    class Meta(type):
        def __new__(cls, name, bases, namespace):
            holder.append(namespace)
            return None

    class A(metaclass=Meta):
        @staticmethod
        def f():
            return __class__

    namespace = holder[0]
    cell = namespace["__classcell__"]
    before = 'ValueError'
    try:
        cell.cell_contents
        before = 'no raise'
    except ValueError:
        pass
    B = type("B", (), namespace)
    return [before, cell.cell_contents is B]


def ordinary_class_is_unaffected():
    # The control: a class whose metaclass DOES build it, and one with no
    # metaclass at all.  Both must still answer themselves, by the lexical
    # route -- the fallback must not fire here.
    class Meta(type):
        def __new__(cls, name, bases, namespace):
            return super().__new__(cls, name, bases, namespace)

    class WithMeta(metaclass=Meta):
        def f(self):
            return __class__

    class Plain:
        def f(self):
            return __class__

    class Sub(Plain):
        pass

    return [WithMeta().f() is WithMeta,
            Plain().f() is Plain,
            Sub().f() is Plain]


def captured_local():
    # THE GUARD on keeping this a separate entry point.  A method reading an
    # enclosing function's local goes through the same closure-cell lookup, and
    # such a value is routinely not a class.  Recovering a "class" for these
    # would be wrong, not merely wasteful.
    number = 42
    text = "text"
    nothing = None

    class C:
        def f(self):
            return (number, text, nothing)

    return list(C().f())


def zero_arg_super_still_works():
    # ``super()'' reads the same cell through its own entry point, so the
    # fallback must not disturb it.
    class Base:
        def f(self):
            return 'Base'

    class Derived(Base):
        def f(self):
            return 'Derived+' + super().f()

    return Derived().f()


r = {
    'delayed_class': delayed_class(),
    'cell_is_empty_until_type_fills_it': cell_is_empty_until_type_fills_it(),
    'ordinary_class_is_unaffected': ordinary_class_is_unaffected(),
    'captured_local': captured_local(),
    'zero_arg_super_still_works': zero_arg_super_still_works(),
}


EXPECTED = {
    'delayed_class': [True, True, True],
    'cell_is_empty_until_type_fills_it': ['ValueError', True],
    'ordinary_class_is_unaffected': [True, True, True],
    'captured_local': [42, 'text', None],
    'zero_arg_super_still_works': 'Derived+Base',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-34s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-34s is not in EXPECTED' % ('FAIL', extra))
