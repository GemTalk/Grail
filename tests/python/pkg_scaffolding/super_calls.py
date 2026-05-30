# Exercises Grail's ``super()`` support:
#   * 1-arg parent __init__ via ``super().__init__(x)``
#   * 0-arg parent __init__ via ``super().__init__()`` (collections.defaultdict
#     pattern — invokes object.__init__ through performMethod:).
#   * explicit ``super(Cls, self)`` form on __init__ and on a regular method.


class Base:
    def __init__(self, x):
        self.x = x


class Derived(Base):
    def __init__(self, x, y):
        super().__init__(x)
        self.y = y


class ZeroArgSuper:
    """Calls super().__init__() with no args — exercises the
    ``performMethod:`` 0-arg dispatch path on Object.__init__."""

    def __init__(self):
        super().__init__()
        self.flag = True


class ExplicitDerived(Base):
    """Explicit ``super(Cls, self)`` form (not the zero-arg sugar)."""

    def __init__(self, x, y):
        super(ExplicitDerived, self).__init__(x)
        self.y = y


class GreetBase:
    def greet(self):
        return 'base'


class GreetChild(GreetBase):
    def greet(self):
        # explicit super on a non-__init__ method
        return 'child+' + super(GreetChild, self).greet()


def make_derived(x, y):
    return Derived(x, y)


def make_zero():
    return ZeroArgSuper()


def make_explicit_derived(x, y):
    return ExplicitDerived(x, y)


def explicit_super_method_call():
    return GreetChild().greet()
