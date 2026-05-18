# Exercises ClassDefAst's `pyc_` prefix.
#
# Without the prefix, `class Symbol:` would try to subclass-into
# GemStone's built-in Symbol class.  With it, the class is created
# as `pyc_Symbol` in Globals and the module-level name `Symbol`
# is bound to it via the module instance's instVar.


class Symbol:
    """Name deliberately chosen to collide with GemStone's
    built-in Symbol class."""

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return self.name


class Set:
    """Same collision pattern with built-in Set."""

    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)


# Top-level construction — confirms the prefixed class is callable
# and the module-level name resolves to it.
make_a = Symbol('a')
make_b = Symbol('b')
both = Set()
both.add(make_a)
both.add(make_b)
