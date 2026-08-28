"""A method written ``def m(*args)`` binds the receiver as args[0].

CPython gives a method with NO named parameter its receiver through
*args: ``c.m(1)`` is ``(c, 1)`` and ``c.m()`` is ``(c,)``.  Grail's class
instance-method generator strips the FIRST declared parameter and binds
the Smalltalk receiver to it -- so with nothing declared there was
nothing to strip and the receiver was simply dropped: ``(1,)`` and
``()``.  Only this spelling was affected; ``def m(self, *args)`` names a
parameter to strip and was always right.

The class side shares that generator and wants the same treatment, which
falls out for free: CPython gives ``@classmethod def m(*args)`` the class
as args[0], and on a class-side Smalltalk method the receiver IS the
class.  @staticmethod must NOT get one, and does not: ClassDefAst
compiles those with the MODULE generator, since a static method has no
receiver to contribute.

This is what test_genericclass's test_class_getitem needs -- its hook is
written ``def __class_getitem__(*args, **kwargs)`` and has to see the
class as args[0].

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


class C:
    def only_varargs(*args):
        return args

    def varargs_and_kwargs(*args, **kw):
        return (args, kw)

    def named_self(self, *args):
        return (self, args)

    def named_self_and_more(self, a, *args):
        return (self, a, args)

    @staticmethod
    def static_varargs(*args):
        return args

    @classmethod
    def class_varargs(cls, *args):
        return (cls, args)

    @classmethod
    def class_only_varargs(*args):
        return args


_c = C()

check('receiver_is_first_arg', _c.only_varargs(1, 2), (_c, 1, 2))
check('receiver_alone_when_no_args', _c.only_varargs(), (_c,))
check('receiver_with_kwargs',
      _c.varargs_and_kwargs(1, x=2), ((_c, 1), {'x': 2}))

# Reached through the class, the receiver is passed explicitly and must
# still arrive exactly once.
check('unbound_call_keeps_both', C.only_varargs(_c, 5), (_c, 5))

# A named self is stripped as before -- this spelling never lost anything.
check('named_self_unaffected', _c.named_self(1), (_c, (1,)))
check('named_self_with_positional',
      _c.named_self_and_more(1, 2, 3), (_c, 1, (2, 3)))

# A staticmethod has no receiver to contribute.
check('staticmethod_gets_no_receiver', C.static_varargs(1, 2), (1, 2))

# A classmethod's receiver is the CLASS, named or not.
check('classmethod_named_cls', C.class_varargs(1), (C, (1,)))
check('classmethod_unnamed_cls', C.class_only_varargs(1), (C, 1))


# The shape the corpus actually needs: __class_getitem__ written with
# bare *args must see the class.

class Subscriptable:
    seen = None

    def __class_getitem__(*args, **kwargs):
        Subscriptable.seen = args
        return None


Subscriptable[int, str]
check('class_getitem_sees_the_class',
      Subscriptable.seen, (Subscriptable, (int, str)))


# Inheritance: the receiver is the SUBCLASS, as for any implicit
# classmethod.

class SubSubscriptable(Subscriptable):
    pass


SubSubscriptable[int]
check('class_getitem_sees_the_subclass',
      Subscriptable.seen, (SubSubscriptable, int))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
