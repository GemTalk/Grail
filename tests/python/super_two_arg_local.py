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


def report():
    return {
        'module_two_arg_init': ModSub().trail,
        'module_two_arg_method': ModSub().who(),
        'local_two_arg': local_two_arg(),
        'local_zero_arg': local_zero_arg(),
        'local_two_arg_from_subclass': local_two_arg_from_subclass(),
        'local_two_arg_classmethod': local_two_arg_classmethod(),
    }
