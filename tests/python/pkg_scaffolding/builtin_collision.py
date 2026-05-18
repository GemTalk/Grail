# Verifies that Python user classes whose names happen to
# collide with GemStone built-ins (Symbol, Set, …) don't clobber
# the built-in.  ClassDefAst emits
# ``Object subclass: 'Symbol' inDictionary: nil`` — the nil
# dictionary keeps the class anonymous (no SymbolList entry),
# so built-ins keep working and the Python class is reachable
# only through the module's instVar.


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
