"""Fixture: a METHOD-LOCAL class that declares its own ``__slots__''.

A ``class'' statement inside a def is rebuilt on every call of that def, so
Grail carries it as a compiled helper and (under IR codegen) builds each method
ONCE, sharing the finished IR into whichever class the helper makes this time.
A ``__slots__'' entry is the one thing in such a method that names the class it
runs on: Grail declares each slot as a mangled named instance variable
(``___slot_x___'') and a slot read is resolved BY OFFSET, so the offset has to
come from the class the method is installed on -- which, for a method-local
class, does not exist when the body is built.

The shapes below pin the cases where that offset can differ between two classes
grown from the SAME def:

  * a base with its own slots, so the subclass's offsets sit above the base's;
  * a base chosen at run time, so two calls of one def produce classes whose
    slot offsets differ;
  * a slot name mangled by the class's own name (``__x'' in ``class C'' is
    ``_C__x''), which a shared build must mangle per class, not once;
  * a slot written then read, augmented, and read while still unset, since an
    unset slot is nil and must fall through to __getattr__ / AttributeError
    rather than answering nil.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def make_point(x, y):
    class Point:
        __slots__ = ('x', 'y')

        def __init__(self, a, b):
            self.x = a
            self.y = b

        def total(self):
            return self.x + self.y

        def bump(self, n):
            self.x += n
            return self.x

    p = Point(x, y)
    p.bump(10)
    return p.total(), p.x, p.y


r['a_method_local_class_with_slots'] = make_point(1, 2)


def make_over_base():
    class Base:
        __slots__ = ('a', 'b')

        def __init__(self):
            self.a = 1
            self.b = 2

    class Derived(Base):
        __slots__ = ('c',)

        def __init__(self):
            Base.__init__(self)
            self.c = 3

        def all_three(self):
            return self.a, self.b, self.c

    return Derived().all_three()


r['slots_over_a_slotted_base'] = make_over_base()


class SlottedOne:
    __slots__ = ('p',)

    def __init__(self):
        self.p = 'one'


class SlottedTwo:
    __slots__ = ('q', 'rr')

    def __init__(self):
        self.q = 'q'
        self.rr = 'rr'


def make_with_base(base):
    class Child(base):
        __slots__ = ('own',)

        def __init__(self):
            base.__init__(self)
            self.own = 'own'

        def read_own(self):
            return self.own

    return Child().read_own()


r['a_runtime_base_one'] = make_with_base(SlottedOne)
r['a_runtime_base_two'] = make_with_base(SlottedTwo)


def make_mangled():
    class Mang:
        __slots__ = ('__hidden',)

        def __init__(self, v):
            self.__hidden = v

        def read(self):
            return self.__hidden

    return Mang('secret').read(), Mang.__slots__


r['a_name_mangled_slot'] = make_mangled()


def make_unset():
    class Lazy:
        __slots__ = ('maybe',)

        def read(self):
            try:
                return self.maybe
            except AttributeError:
                return 'unset'

        def set_then_read(self):
            self.maybe = 'set'
            return self.maybe

    a = Lazy()
    first = a.read()
    second = a.set_then_read()
    return first, second, a.read()


r['an_unset_slot_raises_then_reads'] = make_unset()


def make_no_dict():
    class Strict:
        __slots__ = ('only',)

        def __init__(self):
            self.only = 1

        def try_other(self):
            try:
                self.other = 2
                return 'assigned'
            except AttributeError:
                return 'AttributeError'

    return Strict().try_other()


r['a_non_slot_assignment_raises'] = make_no_dict()


def make_two_instances():
    class Counter:
        __slots__ = ('n',)

        def __init__(self, n):
            self.n = n

        def add(self, other):
            return self.n + other.n

    return Counter(3).add(Counter(4))


r['two_instances_of_one_method_local_class'] = make_two_instances()


def make_classmethod():
    class Fact:
        __slots__ = ('v',)

        def __init__(self, v):
            self.v = v

        @classmethod
        def of(cls, v):
            return cls(v)

        def read(self):
            return self.v

    return Fact.of(9).read()


r['a_classmethod_on_a_slotted_local_class'] = make_classmethod()


def make_twice():
    def inner(v):
        class Cell:
            __slots__ = ('held',)

            def __init__(self, h):
                self.held = h

            def get(self):
                return self.held

        return Cell(v).get()

    return inner('first'), inner('second')


r['the_same_def_called_twice'] = make_twice()


EXPECTED = {
    'a_method_local_class_with_slots': (13, 11, 2),
    'slots_over_a_slotted_base': (1, 2, 3),
    'a_runtime_base_one': 'own',
    'a_runtime_base_two': 'own',
    'a_name_mangled_slot': ('secret', ('__hidden',)),
    'an_unset_slot_raises_then_reads': ('unset', 'set', 'set'),
    'a_non_slot_assignment_raises': 'AttributeError',
    'two_instances_of_one_method_local_class': 7,
    'a_classmethod_on_a_slotted_local_class': 9,
    'the_same_def_called_twice': ('first', 'second'),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-44s is not in EXPECTED' % ('FAIL', extra))
