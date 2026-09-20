"""Fixture: class-body defs that declare NO parameter at all.

``def m(*args)'' inside a class body has no name for the receiver, but CPython
still passes it -- as ``args[0]''.  ``C().m(1)'' sees ``(c, 1)'' and ``C().m()''
sees ``(c,)''.  That is how the corpus spells a hook wanting the raw argument
tuple: test_compare writes ``def __eq__(*args)'', test_genericclass writes
``def __class_getitem__(*args, **kwargs)'' and then asserts ``args[0] is C''.

Grail's text generator strips a method's FIRST DECLARED parameter and carries it
as the Smalltalk receiver.  With nothing declared there is nothing to strip, so
the receiver has to be put back at the front of the ``*args'' tuple rather than
dropped -- the text does that, and this fixture pins that the direct-to-IR path
does the same.  The distinguishing check is simply ``args[0]``: an emit that
forgot the receiver returns a tuple one element short, with every later element
shifted, which is a silently wrong VALUE rather than an error.

Also pinned here: that ``**kwargs`` still binds independently of the receiver.

A SECOND SHAPE IS NOT ASSERTED, for the same reason.  ``def m()'' -- declaring
nothing AND taking no ``*args'' -- is a TypeError in CPython when called as
``C().m()``, because the receiver counts as one argument to a zero-argument
function.  Grail runs it and returns normally.  Verified on BOTH codegen paths
before this fixture was written, so it is a pre-existing gap in the arity check
rather than anything the direct-to-IR path does differently; ``takes_nothing''
stays in the class so the shape is still compiled, but nothing calls it.

``super()'' is pinned here too, as the shape that must NOT be admitted: with
nothing declared there is no argument 0 to take the receiver from, so CPython
answers ``RuntimeError: super(): no arguments'' rather than a working super.

ONE SHAPE IS DELIBERATELY NOT ASSERTED.  A ``def m(*args)'' whose body also
names ``self'' -- only possible for a method-local class capturing the enclosing
method's receiver -- is left out: Grail compiles a captured receiver to bare
Smalltalk ``self'', which is the INNER instance rather than the enclosing one,
and that divergence is on the text path already.  It stays refused rather than
being settled here.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


# --- a module-level class ---------------------------------------------------

class Plain:
    def takes_args(*args):
        return args

    def takes_args_kw(*args, **kwargs):
        return args, kwargs

    def takes_nothing():
        # Never called: see the module docstring.  Present so the
        # declare-nothing-and-no-vararg shape is still compiled.
        return 'never called'

    @classmethod
    def cls_takes_args(*args):
        return args


p = Plain()

r['receiver_is_args_zero'] = Plain.takes_args(p) == (p,)
r['no_arguments_still_passes_receiver'] = p.takes_args() == (p,)
r['one_argument_follows_the_receiver'] = p.takes_args(1) == (p, 1)
r['several_arguments_keep_their_order'] = p.takes_args(1, 2, 3) == (p, 1, 2, 3)

r['kwargs_bind_separately'] = p.takes_args_kw(1, a=2) == ((p, 1), {'a': 2})
r['kwargs_alone_still_carry_the_receiver'] = p.takes_args_kw(b=3) == ((p,), {'b': 3})


# A @classmethod spelled the same way: CPython binds the CLASS as args[0].
r['classmethod_receiver_is_the_class'] = Plain.cls_takes_args() == (Plain,)
r['classmethod_receiver_precedes_the_arguments'] = \
    Plain.cls_takes_args(7) == (Plain, 7)


# --- the corpus shapes ------------------------------------------------------

def compare_shape():
    """test_compare's ``def __eq__(*args)'' -- a dunder with no parameters."""
    calls = []

    class Left:
        def __eq__(*args):
            calls.append(len(args))
            return NotImplemented

    class Right:
        def __eq__(*args):
            calls.append(len(args))
            return True

    result = Left() == Right()
    return result, calls


r['dunder_eq_with_no_parameters'] = compare_shape()


def class_getitem_shape():
    """test_genericclass's hook: args[0] must be the class itself."""
    seen = []

    class C:
        def __class_getitem__(*args, **kwargs):
            seen.append((args, kwargs))
            return None

    C[int, str]
    return seen[0][0][0] is C, seen[0][0][1], seen[0][1]


r['class_getitem_sees_the_class_first'] = class_getitem_shape()


# --- a method-local class, the shape the census rows actually name ----------

def method_local():
    """The same def, but in a class defined inside a function."""
    class Inner:
        def grab(*args):
            return args

    i = Inner()
    return i.grab() == (i,), i.grab('x') == (i, 'x')


r['method_local_class_keeps_the_receiver'] = method_local()


# --- super() with nothing declared is the RuntimeError arm -------------------

def zero_parameter_super():
    """CPython's check is on co_argcount, so there is no argument 0 to take
    the receiver from and ``super()'' raises rather than working."""
    class Z:
        def f():
            super()

    try:
        Z.f()
    except RuntimeError as exc:
        return 'RuntimeError: %s' % exc
    return 'no error'


r['super_with_no_declared_parameter_raises'] = zero_parameter_super()


# --- a subclass still binds its own receiver --------------------------------

class Sub(Plain):
    pass


s = Sub()
r['subclass_receiver_is_the_subclass_instance'] = s.takes_args(9) == (s, 9)


EXPECTED = {
    'receiver_is_args_zero': True,
    'no_arguments_still_passes_receiver': True,
    'one_argument_follows_the_receiver': True,
    'several_arguments_keep_their_order': True,
    'kwargs_bind_separately': True,
    'kwargs_alone_still_carry_the_receiver': True,
    'classmethod_receiver_is_the_class': True,
    'classmethod_receiver_precedes_the_arguments': True,
    # (self, other) -- the reflected call runs too, so two frames of two.
    'dunder_eq_with_no_parameters': (True, [2, 2]),
    'class_getitem_sees_the_class_first': (True, (int, str), {}),
    'method_local_class_keeps_the_receiver': (True, True),
    'super_with_no_declared_parameter_raises':
        'RuntimeError: super(): no arguments',
    'subclass_receiver_is_the_subclass_instance': True,
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-52s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-52s is not in EXPECTED' % ('FAIL', extra))
