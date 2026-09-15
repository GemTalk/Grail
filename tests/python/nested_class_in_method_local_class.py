"""Fixture: a class defined inside a METHOD of a method-local class.

    def outer():
        class Outer:                 # method-local: defined in a function
            def make(self, v):
                class Inner:         # ... and this one is inside its METHOD
                    def get(self):
                        return v
                return Inner()

Two levels of the same transport: ``Outer'' travels as a compiled-text helper
because it is defined in a function body, and ``Inner'' has to do the same thing
one level further in, from inside a method that is itself being built.

The checks pin what a broken inner transport gets wrong, and most of those are
wrong VALUES rather than errors:

  * the inner class captures the METHOD's parameter and its own locals, so a
    transport that dropped a capture would read nil rather than raise;
  * each call of the enclosing method builds a FRESH inner class, so two calls
    must not share -- a hoisted class would silently alias them;
  * the inner class sees the outer instance's attributes only through what it
    captured, which is CPython's rule and not an accident of the transport;
  * ``__class__'' and zero-argument ``super()'' inside the inner class resolve
    to the INNER class, not the outer one;
  * three levels deep still works, because nothing about the shape is special
    to exactly two.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def basic():
    class Outer:
        def make(self, v):
            class Inner:
                def get(self):
                    return v * 2
            return Inner().get()
    return Outer().make(21)


r['the_inner_class_captures_the_parameter'] = basic()


def captures_a_method_local():
    class Outer:
        def make(self, n):
            step = n + 1

            class Inner:
                def get(self):
                    return (n, step)
            return Inner().get()
    return Outer().make(10)


r['it_captures_a_method_local_too'] = captures_a_method_local()


def fresh_per_call():
    class Outer:
        def make(self, tag):
            class Inner:
                def tag(self):
                    return tag
            return Inner
    o = Outer()
    first = o.make('a')
    second = o.make('b')
    return first().tag(), second().tag(), first is second


r['each_call_builds_a_fresh_class'] = fresh_per_call()


def inner_sees_only_what_it_captured():
    class Outer:
        def __init__(self):
            self.attr = 'outer-attr'

        def make(self):
            captured = self.attr

            class Inner:
                def get(self):
                    return captured
            return Inner().get()
    return Outer().make()


r['it_reads_the_outer_attribute_through_a_capture'] = inner_sees_only_what_it_captured()


def dunder_class_is_the_inner_one():
    class Outer:
        def make(self):
            class Inner:
                def who(self):
                    return __class__
            return Inner, Inner().who()
    cls, got = Outer().make()
    return got is cls, cls.__name__


r['dunder_class_is_the_inner_class'] = dunder_class_is_the_inner_one()


def zero_arg_super_in_the_inner_class():
    class Outer:
        def make(self):
            class Base:
                def greet(self):
                    return 'base'

            class Child(Base):
                def greet(self):
                    return super().greet() + '+child'
            return Child().greet()
    return Outer().make()


r['zero_arg_super_resolves_in_the_inner_class'] = zero_arg_super_in_the_inner_class()


def three_levels():
    class L1:
        def make(self, a):
            class L2:
                def make(self, b):
                    class L3:
                        def get(self):
                            return (a, b)
                    return L3().get()
            return L2().make(2)
    return L1().make(1)


r['three_levels_deep'] = three_levels()


def the_inner_class_has_several_methods():
    class Outer:
        def make(self, base):
            class Inner:
                def lo(self):
                    return base - 1

                def hi(self):
                    return base + 1

                def both(self):
                    return (self.lo(), self.hi())
            return Inner().both()
    return Outer().make(5)


r['several_methods_share_the_capture'] = the_inner_class_has_several_methods()


def inner_class_with_a_base_expression():
    class Outer:
        def make(self, marker):
            class Base:
                def kind(self):
                    return 'base'

            class Inner(Base):
                def kind(self):
                    return super().kind() + ':' + marker
            return Inner().kind()
    return Outer().make('m')


r['a_base_expression_still_resolves'] = inner_class_with_a_base_expression()


EXPECTED = {
    'the_inner_class_captures_the_parameter': 42,
    'it_captures_a_method_local_too': (10, 11),
    'each_call_builds_a_fresh_class': ('a', 'b', False),
    'it_reads_the_outer_attribute_through_a_capture': 'outer-attr',
    'dunder_class_is_the_inner_class': (True, 'Inner'),
    'zero_arg_super_resolves_in_the_inner_class': 'base+child',
    'three_levels_deep': (1, 2),
    'several_methods_share_the_capture': (4, 6),
    'a_base_expression_still_resolves': 'base:m',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-48s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-48s is not in EXPECTED' % ('FAIL', extra))
