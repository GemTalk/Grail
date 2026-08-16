"""Fixtures for ClassBodyNonlocalTestCase -- ``nonlocal'' inside a class body.

A class body may declare a name nonlocal and assign it.  That assignment binds
the ENCLOSING FUNCTION's variable, so it must not become a class attribute, and
the enclosing scope must see the new value.  Grail dropped the statement whole
for an augmented assignment, and for a plain assignment bound a class attribute
instead of writing the outer binding.

Every expectation was checked against CPython 3.14.
"""


def augmented_assignment_reaches_enclosing():
    """``nonlocal x; x += 1'' -- the test_scope testNonLocalClass shape."""
    def f(x):
        class c:
            nonlocal x
            x += 1
            def get(self):
                return x
        return c()
    inst = f(0)
    return [inst.get(), 'x' in inst.__class__.__dict__]


def plain_assignment_reaches_enclosing():
    """``nonlocal z; z = 42'' binds the outer z, NOT a class attribute."""
    def g(z):
        class E:
            nonlocal z
            z = 42
            def get(self):
                return z
        return E()
    e = g(0)
    return [e.get(), 'z' in e.__class__.__dict__]


def enclosing_function_sees_the_write():
    """The write is visible to the enclosing function itself, after the
    class statement -- not only through a method."""
    def f(n):
        class C:
            nonlocal n
            n += 10
        return n
    return f(5)


def several_nonlocal_names():
    """More than one declared name, both written."""
    def f(a, b):
        class C:
            nonlocal a, b
            a += 1
            b = b * 2
        return [a, b]
    return f(1, 3)


def same_name_elsewhere_still_binds_a_class_attribute():
    """The exclusion is scoped to the body that DECLARED the name nonlocal --
    another class body binding the same name still gets a class attribute."""
    def f(v):
        class Outer:
            nonlocal v
            v += 1
        class Other:
            v = 99
        return [v, Other.v, 'v' in Outer.__dict__, 'v' in Other.__dict__]
    return f(0)


def nonlocal_value_is_readable_by_a_method_after_later_writes():
    """The method reads the binding, not a copy taken at class-definition
    time, so a write made AFTER the class statement is visible."""
    def f(x):
        class C:
            nonlocal x
            x += 1
            def get(self):
                return x
        inst = C()
        first = inst.get()
        x += 100
        return [first, inst.get()]
    return f(0)


def unassignable_nonlocal_target_still_compiles():
    """``nonlocal __class__'' inside a class body in a METHOD.

    CPython gives every method an implicit ``__class__'' closure cell, so this
    is legal there -- and Grail has no Smalltalk temp of that name, which makes
    an unconditional enclosing-scope write a CompileError that takes the whole
    method down (it did exactly that to test_super's
    test_various___class___pathologies).  The write is skipped instead, so what
    is asserted here is the part both agree on: the module compiles, the method
    runs, and ``__class__'' is not a class attribute.
    """
    class Holder:
        def make(self):
            class X:
                nonlocal __class__
                __class__ = 42
            return '__class__' in X.__dict__
    return Holder().make()


# ---------------------------------------------------------------------------
# ``nonlocal __class__'' in a METHOD.  CPython exempts this one name from the
# rule that a nonlocal must have an enclosing binding: a class body supplies
# __class__ to its methods as an implicit closure cell (the same cell zero-arg
# super() uses).  Grail stripped every nonlocal name from the method's local
# set, so the assignment had no declared target, the method failed to compile,
# and Class.gs installed a raising stub in its place -- which is how
# test_super's TestSuper.tearDown turned one uncompilable method into an error
# on nine tests, since tearDown runs after every one of them.
# ---------------------------------------------------------------------------


def nonlocal_class_in_method_compiles():
    """The method compiles and runs; the assignment is readable within it."""
    class T:
        def repair(self):
            nonlocal __class__
            __class__ = T
            return __class__.__name__
    return T().repair()


def nonlocal_class_does_not_break_siblings():
    """A sibling method of the same class is unaffected -- in particular
    zero-arg super() still resolves."""
    class Base:
        def f(self):
            return 'base'
    class Derived(Base):
        def repair(self):
            nonlocal __class__
            __class__ = Derived
            return 'repaired'
        def f(self):
            return super().f() + '+derived'
    d = Derived()
    return (d.repair(), d.f())


def nonlocal_with_enclosing_binding_still_writes_through():
    """The ordinary case is untouched: a nonlocal that DOES have an enclosing
    binding still writes through to it rather than binding a local."""
    def outer():
        count = 0
        def bump():
            nonlocal count
            count += 1
        bump()
        bump()
        return count
    return outer()


def nonlocal_in_nested_function_still_writes_through():
    """...including through two levels."""
    def outer():
        value = 'outer'
        def middle():
            def inner():
                nonlocal value
                value = 'set by inner'
            inner()
        middle()
        return value
    return outer()
