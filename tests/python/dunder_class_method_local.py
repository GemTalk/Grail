"""Fixture: ``__class__'' inside a method of a METHOD-LOCAL class.

CPython gives every method that mentions ``__class__'' (or calls zero-argument
``super()'') an implicit closure cell holding the class.  For a class defined at
module scope Grail reads it back as a module attribute; for one defined inside a
function there is no module attribute to read, so the class is recovered from
the injected cell instead -- one send, ``self ___dunderClassCell___:
#'___cell_<Cls>___'''.

The checks pin what a wrong recovery would get wrong WITHOUT raising:

  * ``__class__'' is the DEFINING class, not ``type(self)'' -- the two differ
    exactly when the method runs on a subclass instance, which is the whole
    reason CPython uses a cell rather than the receiver;
  * two classes defined in the same function each get their own;
  * two CALLS of the enclosing function produce two distinct classes, so a
    binding shared across calls would be visible here;
  * ``__class__'' still resolves inside a nested function of the method, and
    inside a comprehension, where the frame is not the method's own.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def simple():
    class C:
        def who(self):
            return __class__
    return C().who() is C


r['it_is_the_defining_class'] = simple()


def on_a_subclass():
    """__class__ is the class the method was DEFINED in, not type(self)."""
    class Base:
        def defining(self):
            return __class__

        def runtime(self):
            return type(self)

    class Derived(Base):
        pass

    d = Derived()
    return d.defining() is Base, d.runtime() is Derived


r['defining_class_not_receiver_class'] = on_a_subclass()


def two_classes_one_call():
    class A:
        def me(self):
            return __class__

    class B:
        def me(self):
            return __class__
    return A().me() is A, B().me() is B, A().me() is B


r['each_class_gets_its_own'] = two_classes_one_call()


def make():
    class C:
        def me(self):
            return __class__
    return C


def two_calls_two_classes():
    first = make()
    second = make()
    return (first().me() is first,
            second().me() is second,
            first is second)


r['separate_calls_make_separate_classes'] = two_calls_two_classes()


def inside_a_nested_function():
    class C:
        def who(self):
            def inner():
                return __class__
            return inner()
    return C().who() is C


r['resolves_from_a_nested_function'] = inside_a_nested_function()


def inside_a_comprehension():
    class C:
        def who(self):
            return [__class__ for _ in range(2)]
    got = C().who()
    return len(got), got[0] is C, got[1] is C


r['resolves_inside_a_comprehension'] = inside_a_comprehension()


def alongside_super():
    """A method using zero-arg super() needs the same cell."""
    class Base:
        def greet(self):
            return 'base'

    class Child(Base):
        def greet(self):
            return super().greet() + '+' + __class__.__name__
    return Child().greet()


r['works_alongside_zero_arg_super'] = alongside_super()


def its_name_reads_back():
    class Named:
        def n(self):
            return __class__.__name__
    return Named().n()


r['the_class_name_reads_back'] = its_name_reads_back()


EXPECTED = {
    'it_is_the_defining_class': True,
    'defining_class_not_receiver_class': (True, True),
    'each_class_gets_its_own': (True, True, False),
    'separate_calls_make_separate_classes': (True, True, False),
    'resolves_from_a_nested_function': True,
    'resolves_inside_a_comprehension': (2, True, True),
    'works_alongside_zero_arg_super': 'base+Child',
    'the_class_name_reads_back': 'Named',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-40s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-40s is not in EXPECTED' % ('FAIL', extra))
