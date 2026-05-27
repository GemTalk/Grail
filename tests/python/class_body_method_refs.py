# Regression for class-body references to sibling methods.
#
# Pre-fix, a class body like:
#
#   class Box:
#       def first(self): ...
#       def second(self): ...
#       pair = (first, second)
#
# raised ``NameError: name 'first' is not defined'' at class-init
# time — the class-attribute value emit ran with the class compile
# context popped, and NameAst had no class-scope resolution path
# for sibling method references.
#
# This pattern is heavily used by werkzeug.wrappers (e.g.
# ``data = property(get_data, set_data)'') and Python descriptor
# protocol usage in general.


class Box:
    def first(self):
        return 1

    def second(self):
        return 2

    pair = (first, second)


def pair_resolves():
    """Class body resolves bare sibling method names."""
    return len(Box.pair) == 2


def pair_callable_with_instance():
    """The bare-name reference is callable with an instance as the
    first positional arg (CPython's unbound-function semantics)."""
    b = Box()
    return Box.pair[0](b) == 1 and Box.pair[1](b) == 2


class PropBox:
    def get_x(self):
        return self._x

    def set_x(self, value):
        self._x = value

    x = property(get_x, set_x)

    def __init__(self):
        self._x = 'default'


def property_descriptor_uses_methods():
    """property(get, set) takes the class-body method refs and
    constructs a working descriptor."""
    pb = PropBox()
    pb.x = 'updated'
    return pb.x == 'updated'
