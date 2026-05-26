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
#
# Module-level no-arg defs auto-invoke on attribute access in Grail
# (legacy behavior), so each test exposes its result as a module-
# level variable rather than a callable getter.


class Box:
    def __init__(self, x):
        self.x = x


def greet(self, name):
    return self.x, name


# --- Case 1: function assigned to class, called via instance ---
Box.greet = greet

_b1 = Box(7)
greet_via_instance = _b1.greet('hi')


# --- Case 2: function assigned to class, called via class with explicit instance ---
_b2 = Box(9)
greet_via_class = Box.greet(_b2, 'hey')


# --- Case 3: function assigned to instance (NOT bound) ---
# A function stored on the INSTANCE bypasses descriptor binding.
# ``_b3.adhoc(99)'' calls _adhoc(99) with no self prepend.
_b3 = Box(11)


def _adhoc(x):
    return 'got:' + str(x)


_b3.adhoc = _adhoc
function_on_instance_outcome = _b3.adhoc(99)


# --- Case 4: multiple assignments, last write wins ---
def first(self):
    return 'first'


def second(self):
    return 'second'


Box.method = first
Box.method = second

_b4 = Box(0)
last_assignment_result = _b4.method()


# --- Case 5: lambda assigned to class binds the same way ---
Box.doubled = lambda self: self.x * 2

lambda_on_instance = Box(8).doubled()


# --- Case 6: reading from class returns the raw function ---
_b6 = Box(3)
_f = Box.greet
class_read_returns_function_result = _f(_b6, 'direct')


# --- Case 7: instance method via in-class def still works (no regression) ---
class WithMethod:
    def __init__(self, n):
        self.n = n

    def doubled(self):
        return self.n * 2


in_class_method_result = WithMethod(6).doubled()
