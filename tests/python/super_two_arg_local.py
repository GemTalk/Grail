"""Fixture: the two-argument ``super(Cls, obj)`` form.

The zero-arg ``super()`` already resolved a METHOD-LOCAL class through its
closure cell.  The two-arg form did not -- it always went through the module
instance's class accessor, which answers nil for a class that is not a module
attribute.  Every Super consumer then walked ``nil superClass``, an env-0
MessageNotUnderstood that Python cannot catch, so one bad call took down the
whole module run instead of failing by itself.
"""


class ModBase:
    def __init__(self):
        self.trail = ['ModBase']

    def who(self):
        return 'ModBase'


class ModSub(ModBase):
    def __init__(self):
        super(ModSub, self).__init__()
        self.trail.append('ModSub')

    def who(self):
        return 'ModSub->' + super(ModSub, self).who()


def local_two_arg():
    """A class defined inside a function, naming ITSELF in super()."""
    class Base:
        def __init__(self):
            self.trail = ['Base']

        def who(self):
            return 'Base'

    class Sub(Base):
        def __init__(self):
            super(Sub, self).__init__()
            self.trail.append('Sub')

        def who(self):
            return 'Sub->' + super(Sub, self).who()

    s = Sub()
    return [s.trail, s.who()]


def local_zero_arg():
    """The form that already worked -- kept as a guard."""
    class Base:
        def who(self):
            return 'Base'

    class Sub(Base):
        def who(self):
            return 'Sub->' + super().who()
    return Sub().who()


def local_two_arg_from_subclass():
    """super(Sub, self) resolved from an instance of a SUBCLASS of Sub.

    The cell key is name-specific, so it must still answer Sub -- not the
    receiver's own class, which would recurse forever.
    """
    class Base:
        def who(self):
            return 'Base'

    class Sub(Base):
        def who(self):
            return 'Sub->' + super(Sub, self).who()

    class SubSub(Sub):
        pass

    return SubSub().who()


def local_two_arg_classmethod():
    """The metaclass/classmethod shape: second argument is the class."""
    class Base:
        @classmethod
        def make(cls):
            return 'Base.make'

    class Sub(Base):
        @classmethod
        def make(cls):
            return 'Sub->' + super(Sub, cls).make()

    return Sub.make()

# ---------------------------------------------------------------------------
# The bare name ``__class__'' reads the same defining class the zero-arg
# ``super()'' does.  CPython gives every method an implicit closure cell
# holding it; Grail had no such name, so the read fell through to the
# fast-path builtin wrap and answered a BoundMethod for ``builtins.__class__''
# -- the same object for every class, so ``__class__ is X'' was false
# everywhere and nothing errored to say so.
# ---------------------------------------------------------------------------


def class_name_in_instance_method():
    """__class__ in an instance method is the defining class."""
    class X:
        def f(self):
            return __class__
    return X().f() is X


def class_name_in_classmethod_and_staticmethod():
    """...and in a classmethod and a staticmethod."""
    class X:
        @classmethod
        def cm(cls):
            return __class__
        @staticmethod
        def sm():
            return __class__
    return (X.cm() is X, X.sm() is X)


def class_name_is_defining_class_not_type_of_self():
    """It is the class the method was DEFINED in, not type(self) -- the
    distinction the name-specific cell key exists for."""
    class Base:
        def who(self):
            return __class__
    class Sub(Base):
        pass
    inst = Sub()
    return (inst.who() is Base, type(inst) is Sub)


def class_name_alongside_zero_arg_super():
    """__class__ and zero-arg super() agree in the same method."""
    class B:
        def f(self):
            return 'B'
    class D(B):
        def f(self):
            return super().f() + '+' + __class__.__name__
    return D().f()


def class_name_local_declaration_still_wins():
    """An explicit ``nonlocal __class__'' local still shadows the cell read
    -- the branch stands down when an enclosing function declares the name."""
    class T:
        def repair(self):
            nonlocal __class__
            __class__ = 'shadowed'
            return __class__
    return T().repair()


def report():
    return {
        'module_two_arg_init': ModSub().trail,
        'module_two_arg_method': ModSub().who(),
        'local_two_arg': local_two_arg(),
        'local_zero_arg': local_zero_arg(),
        'local_two_arg_from_subclass': local_two_arg_from_subclass(),
        'local_two_arg_classmethod': local_two_arg_classmethod(),
        'class_name_instance': class_name_in_instance_method(),
        'class_name_cm_sm': class_name_in_classmethod_and_staticmethod(),
        'class_name_defining': class_name_is_defining_class_not_type_of_self(),
        'class_name_with_super': class_name_alongside_zero_arg_super(),
        'class_name_local_wins': class_name_local_declaration_still_wins(),
    }
