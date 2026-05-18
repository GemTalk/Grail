# Exercises Grail's zero-arg ``super()`` support:
#   * 1-arg parent __init__ via ``super().__init__(x)``
#   * 0-arg parent __init__ via ``super().__init__()`` (collections.defaultdict
#     pattern — invokes object.__init__ through performMethod:).


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


def make_derived(x, y):
    return Derived(x, y)


def make_zero():
    return ZeroArgSuper()
