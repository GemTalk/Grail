"""Fixture: a comprehension target that shadows a method's receiver parameter.

Grail compiles a def in a class body to a Smalltalk METHOD whose first Python
parameter IS the receiver, ``self``.  PEP 709 inlines a comprehension into the
enclosing function, so a comprehension whose target is spelled like that
parameter binds an ordinary local of its own -- and every read of the name
inside the comprehension, directly or from a lambda that closes over it, is
that local, not the argument.  Only the FIRST clause's iterable is evaluated in
the enclosing scope, so ``range(x)`` and any read after the comprehension
still see the argument.

The IR build used to read the receiver for every one of those inner reads
(#2256): ``[lambda: x for x in range(x)]`` answered the argument from each
lambda, and even ``[x for x in range(x)]`` repeated it.  The text build was
already right.  class_body_def_as_plain_function.py pins the first shape too,
but calls it with an int from inside the class body, where a special receiver
takes the text twin -- so the IR method never ran there.

Here every call passes an ordinary HEAP receiver (an int subclass instance,
or the class itself for a classmethod), so the method runs exactly as it was
built.  ClassBodyDefAsPlainFunctionTestCase loads this file on each arm.
"""


class I(int):
    """An int that is an ordinary heap object, not a SmallInteger."""


R = I(7)
r = {}


class Shadow:
    # --- the issue's shape, and the plain read -------------------------------
    def lambda_capture(x):
        return [f() for f in [lambda: x for x in range(x)]], int(x)

    def direct_read(x):
        return [x for x in range(4)], int(x)

    def first_iterable_reads_the_argument(x):
        return [x for x in range(x) if x > 4], int(x)

    def filter_reads_the_target(x):
        return [x for x in range(4) if x != 1], int(x)

    # --- every comprehension kind ------------------------------------------
    def set_comp(x):
        return sorted(f() for f in {lambda: x for x in range(3)}), int(x)

    def dict_comp(x):
        return [f() for f in {x: (lambda: x) for x in range(3)}.values()], int(x)

    def dict_comp_key_and_value(x):
        return {x: x * 2 for x in range(2)}, int(x)

    def generator_exp(x):
        return [f() for f in (lambda: x for x in range(3))], int(x)

    def generator_exp_consumed_later(x):
        g = (lambda: x for x in range(3))
        return [f() for f in g], int(x)

    # --- nested scopes inside the comprehension ----------------------------
    def comprehension_in_a_nested_def(x):
        def g():
            return [h() for h in [lambda: x for x in range(4)]]
        return g(), int(x)

    def comprehension_in_a_lambda(x):
        return [f() for f in (lambda: [lambda: x for x in range(4)])()], int(x)

    def lambda_default_reads_the_target(x):
        return [f() for f in [lambda x=x: x for x in range(3)]], int(x)

    def lambda_parameter_of_the_same_name(x):
        return [f(5) for f in [lambda x: x for x in range(2)]], int(x)

    # --- nested comprehensions ---------------------------------------------
    def outer_target_read_from_an_inner_comprehension(x):
        rows = [[lambda: x for _ in range(1)] for x in range(3)]
        return [[f() for f in row] for row in rows], int(x)

    def inner_target(x):
        rows = [[lambda: x for x in range(4)] for _ in range(1)]
        return [[f() for f in row] for row in rows], int(x)

    def inner_iterable_reads_the_outer_target(x):
        return [[x for _ in range(1)] for x in range(3)], int(x)

    def other_target_reads_the_argument(x):
        return [f() for f in [lambda: x for y in range(2)]], int(x)

    # --- walrus and other binders ------------------------------------------
    def walrus_in_the_comprehension_rebinds_the_argument(x):
        fs = [lambda: x for i in range(2) if (x := i + 100) is not None]
        return [f() for f in fs], x

    def walrus_reads_the_target(x):
        return [(y := x) for x in range(2)], y, int(x)

    def tuple_target(x):
        return [lambda: x for x, _ in [(1, 2), (3, 4)]][0](), int(x)

    # --- the receiver read inside AND outside the closure ------------------
    def both_sides_of_the_closure(x):
        fs = [lambda: x for x in range(3)]
        g = lambda: x
        return [f() for f in fs], int(g()), int(x)

    def argument_and_target_in_one_lambda(x):
        fs = [lambda: (x, int(y)) for y in [x] for x in range(2)]
        return [f() for f in fs], int(x)

    # --- spelled ``self``: attribute loads, sends, calls -------------------
    def attribute_of_the_target(self):
        return [self.real for self in [3, 4]], int(self)

    def method_of_the_target(self):
        return [self.bit_length() for self in [3, 4]], int(self)

    def attribute_from_a_lambda(self):
        return [f() for f in [lambda: self.real for self in [3, 4]]], int(self)

    def call_the_target(self):
        return [self() for self in [int, str]], int(self)

    def subscript_the_target(self):
        return [self[0] for self in ['ab', 'cd']], int(self)

    # --- a classmethod's ``cls`` -------------------------------------------
    @classmethod
    def classmethod_cls(cls):
        return [f() for f in [lambda: cls for cls in range(3)]], cls.__name__

    @classmethod
    def classmethod_cls_not_shadowed(cls):
        return [f().__name__ for f in [lambda: cls for _ in range(2)]], cls.__name__


INSTANCE_CHECKS = [
    'lambda_capture', 'direct_read', 'first_iterable_reads_the_argument',
    'filter_reads_the_target', 'set_comp', 'dict_comp',
    'dict_comp_key_and_value', 'generator_exp', 'generator_exp_consumed_later',
    'comprehension_in_a_nested_def', 'comprehension_in_a_lambda',
    'lambda_default_reads_the_target', 'lambda_parameter_of_the_same_name',
    'outer_target_read_from_an_inner_comprehension', 'inner_target',
    'inner_iterable_reads_the_outer_target', 'other_target_reads_the_argument',
    'walrus_in_the_comprehension_rebinds_the_argument',
    'walrus_reads_the_target', 'tuple_target', 'both_sides_of_the_closure',
    'argument_and_target_in_one_lambda', 'attribute_of_the_target',
    'method_of_the_target', 'attribute_from_a_lambda', 'call_the_target',
    'subscript_the_target',
]
CLASS_CHECKS = ['classmethod_cls', 'classmethod_cls_not_shadowed']


def _run(call):
    try:
        return call()
    except Exception as e:
        return 'raised %s: %s' % (type(e).__name__, e)


for _name in INSTANCE_CHECKS:
    r[_name] = _run(lambda: getattr(Shadow, _name)(R))
for _name in CLASS_CHECKS:
    r[_name] = _run(getattr(Shadow, _name))


EXPECTED = {
    'lambda_capture': ([6, 6, 6, 6, 6, 6, 6], 7),
    'direct_read': ([0, 1, 2, 3], 7),
    'first_iterable_reads_the_argument': ([5, 6], 7),
    'filter_reads_the_target': ([0, 2, 3], 7),
    'set_comp': ([2, 2, 2], 7),
    'dict_comp': ([2, 2, 2], 7),
    'dict_comp_key_and_value': ({0: 0, 1: 2}, 7),
    'generator_exp': ([0, 1, 2], 7),
    'generator_exp_consumed_later': ([0, 1, 2], 7),
    'comprehension_in_a_nested_def': ([3, 3, 3, 3], 7),
    'comprehension_in_a_lambda': ([3, 3, 3, 3], 7),
    'lambda_default_reads_the_target': ([0, 1, 2], 7),
    'lambda_parameter_of_the_same_name': ([5, 5], 7),
    'outer_target_read_from_an_inner_comprehension': ([[2], [2], [2]], 7),
    'inner_target': ([[3, 3, 3, 3]], 7),
    'inner_iterable_reads_the_outer_target': ([[0], [1], [2]], 7),
    'other_target_reads_the_argument': ([7, 7], 7),
    'walrus_in_the_comprehension_rebinds_the_argument': ([101, 101], 101),
    'walrus_reads_the_target': ([0, 1], 1, 7),
    'tuple_target': (3, 7),
    'both_sides_of_the_closure': ([2, 2, 2], 7, 7),
    'argument_and_target_in_one_lambda': ([(1, 7), (1, 7)], 7),
    'attribute_of_the_target': ([3, 4], 7),
    'method_of_the_target': ([2, 3], 7),
    'attribute_from_a_lambda': ([4, 4], 7),
    'call_the_target': ([0, ''], 7),
    'subscript_the_target': (['a', 'c'], 7),
    'classmethod_cls': ([2, 2, 2], 'Shadow'),
    'classmethod_cls_not_shadowed': (['Shadow', 'Shadow'], 'Shadow'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-4s %-50s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL',
                                    key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
