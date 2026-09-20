"""Fixture: ``super'' inside a NESTED def or lambda.

A ZERO-ARGUMENT ``super()'' is a rewrite: CPython fills in the class and the
instance from the innermost function's ``__class__'' cell and its argument 0,
and a def with no enclosing class raises ``super(): no arguments'' instead.
Grail's text path spells those arms; the IR path does not, so a bare super()
inside a closure stays on the text path.

``super(C, obj)'' IS NOT THAT.  It names its class and its object outright, so
it consults no frame, asks no def for an argument 0, and is an ordinary
two-argument call.  The IR path refused it anyway, because the test was on the
NAME rather than on the shape -- the same over-wide refusal that ``super'' in a
method had, and the same correction.

WHAT THE CORPUS ACTUALLY HOLDS, which is why the distinction is worth making:
of the four refusing sites, THREE are explicit two-argument calls --
``super(arg, cls).__init_subclass__(...)'' in ``_py_warnings''' @deprecated,
``super(decorated_class, cls).setUpClass()'' in test.support.hashlib_helper,
and ``super(MyType, type(mytype)).__setattr__(...)'' in test_super. Only
test_obscure_super_errors, whose whole subject is the RuntimeError arms, is the
bare spelling.

The bare shapes are here too, so that narrowing the refusal cannot quietly
start compiling them: both must still raise CPython's RuntimeError.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class Base:
    def greet(self):
        return 'base'

    @classmethod
    def cm(cls):
        return 'base-cm'


class Child(Base):
    def greet(self):
        return 'child'


def two_arg_super_in_a_nested_def():
    """_py_warnings' @deprecated and hashlib_helper's shape."""
    target = Child

    def inner(obj):
        return super(target, obj).greet()

    return inner(Child())


record('two_arg_super_in_a_nested_def', two_arg_super_in_a_nested_def)


def two_arg_super_on_a_type():
    """test_super.test_unusual_getattro's shape: super(T, type(x))."""
    def inner():
        return super(Child, Child).cm()

    return inner()


record('two_arg_super_on_a_type', two_arg_super_on_a_type)


class Holder(Base):
    def method_with_a_nested_two_arg_super(self):
        me = self

        def inner():
            return super(Holder, me).greet()

        return inner()

    def method_with_a_nested_bare_super(self):
        def inner():
            return super()

        try:
            inner()
            return 'no raise'
        except RuntimeError as exc:
            return 'RuntimeError: %s' % exc


record('a_method_with_a_nested_two_arg_super',
       Holder().method_with_a_nested_two_arg_super)
record('a_method_with_a_nested_bare_super',
       Holder().method_with_a_nested_bare_super)


def a_bare_super_in_a_plain_nested_def():
    """test_super.test_obscure_super_errors: the RuntimeError arm, which must
    keep working -- narrowing the refusal must not start compiling this."""
    def inner():
        super()

    try:
        inner()
        return 'no raise'
    except RuntimeError as exc:
        return 'RuntimeError: %s' % exc


record('a_bare_super_in_a_plain_nested_def', a_bare_super_in_a_plain_nested_def)


def super_named_but_not_called():
    """The NAME alone, with no call -- the blanket test refused this too."""
    def inner():
        return callable(super)

    return inner()


record('super_named_but_not_called', super_named_but_not_called)


class NestedBareSuperPreconditions:
    """The three ways a bare ``super()'' in a NESTED def can land, which is what
    the def-level refusal was standing in front of.

    The emit has had the arg[0] guard since the nested-def cut; what refused was
    FunctionDefAst, one level up, for any nested bare super at all.  These pin
    that each of the three reaches the arm CPython reaches."""

    def nested_arg_deleted(self):
        # Precondition 2: argument 0 exists and has been deleted.  The guard
        # reads the INNER def's temp while the proxy would bind the OUTER
        # receiver -- which looks inconsistent and is what CPython does.
        def inner(x):
            del x
            super()
        try:
            inner(None)
            return 'no error'
        except RuntimeError as e:
            return str(e)

    def nested_no_args(self):
        # Precondition 1, from inside a method rather than at module scope.
        def inner():
            super()
        try:
            inner()
            return 'no error'
        except RuntimeError as e:
            return str(e)

    def nested_arg_present(self):
        # NOT an error arm: the nested def closes over the METHOD's class cell,
        # so super() is built from (Holder, arg[0]) and the supercheck is what
        # rejects it.  The message names both, which is the cheapest proof that
        # the outer class and the inner argument are the two things being
        # paired.
        def inner(x):
            return super()
        try:
            return type(inner(1)).__name__
        except BaseException as e:
            return type(e).__name__


_nbsp = NestedBareSuperPreconditions()
record('nested_super_arg_deleted', _nbsp.nested_arg_deleted)
record('nested_super_no_args', _nbsp.nested_no_args)
record('nested_super_arg_present', _nbsp.nested_arg_present)


def a_lambda_with_a_two_arg_super():
    obj = Child()
    return (lambda: super(Child, obj).greet())()


record('a_lambda_with_a_two_arg_super', a_lambda_with_a_two_arg_super)


EXPECTED = {
    'nested_super_arg_deleted': 'super(): arg[0] deleted',
    'nested_super_no_args': 'super(): no arguments',
    'nested_super_arg_present': 'TypeError',
    'two_arg_super_in_a_nested_def': 'base',
    'two_arg_super_on_a_type': 'base-cm',
    'a_method_with_a_nested_two_arg_super': 'base',
    'a_method_with_a_nested_bare_super': 'RuntimeError: super(): no arguments',
    'a_bare_super_in_a_plain_nested_def': 'RuntimeError: super(): no arguments',
    'super_named_but_not_called': True,
    'a_lambda_with_a_two_arg_super': 'base',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
