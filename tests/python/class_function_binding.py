# Fixture for ClassFunctionBindingTestCase.
#
# Python's descriptor protocol: when a function is stored as an
# attribute of a CLASS (via assignment after the class body, e.g.
# ``Cls.method = some_func''), reading the attribute through an
# INSTANCE returns a bound method that prepends the instance as the
# first call argument.  Reading through the CLASS returns the function
# unchanged.  Storing on the INSTANCE bypasses the descriptor protocol
# entirely.
#
# This is the binding gap that blocks @dataclass from synthesizing
# __init__ as ``cls.__init__ = generated_init''.  Grail's
# ___pyAttrLoad___ today returns the stored callable raw without the
# bind, so ``cls(*args)'' invokes generated_init(*args) with no self.


class Box:
    def __init__(self, x):
        self.x = x


def greet(self, name):
    return self.x, name


# --- Case 1: function assigned to class, called via instance ---
Box.greet = greet


def call_greet_via_instance():
    b = Box(7)
    return b.greet('hi')


# --- Case 2: function assigned to class, called via class with explicit instance ---
def call_greet_via_class():
    b = Box(9)
    return Box.greet(b, 'hey')


# --- Case 3: function assigned to instance (NOT bound) ---
def call_function_on_instance_unbound():
    """When stored on the instance itself (not the class), Python does
    NOT apply the descriptor protocol.  ``b.adhoc(2)'' calls
    ``adhoc(2)'' with no self prepended — TypeError because adhoc
    expects (self, n)."""
    b = Box(11)

    def adhoc(self, n):
        return self.x + n

    b.adhoc = adhoc
    try:
        return b.adhoc(2)
    except TypeError:
        return 'caught'


# --- Case 4: multiple assignments, last write wins ---
def first(self):
    return 'first'


def second(self):
    return 'second'


Box.method = first
Box.method = second


def call_last_assignment():
    b = Box(0)
    return b.method()


# --- Case 5: lambda assigned to class binds the same way ---
Box.doubled = lambda self: self.x * 2


def call_lambda_on_instance():
    return Box(8).doubled()


# --- Case 6: reading from class returns the raw function ---
def class_read_returns_function():
    """Box.greet (not via instance) returns the function itself, NOT
    a bound method.  Calling it requires the explicit instance arg."""
    f = Box.greet
    b = Box(3)
    return f(b, 'direct')


# --- Case 7: instance method via in-class def still works (no regression) ---
class WithMethod:
    def __init__(self, n):
        self.n = n

    def doubled(self):
        return self.n * 2


def in_class_method_still_works():
    return WithMethod(6).doubled()
