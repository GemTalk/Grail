# Fixture for FunctionRebindingTestCase.
#
# Module-level rebinding of a name that was originally a top-level def
# must respect the rebinding for subsequent calls.  Pre-fix, CallAst's
# bare-call self-send shortcut emitted `self foo: x` based on parser-
# time knowledge (`def foo`) and bypassed any later dynamic-instVar
# write that rebound the name.

# --- Case 1: rebind def to a non-callable ---
def doubler(x):
    return 2 * x

doubler_before = doubler(5)    # = 10, original function still callable
doubler = 21                    # rebind to int

# Reading the attribute should yield the int, not the function.
doubler_value_after = doubler

# Calling should TypeError ('int' object is not callable).
try:
    rebind_call_result = doubler(5)
    rebind_typeerror = False
except TypeError:
    rebind_typeerror = True


# --- Case 2: rebind def to another callable ---
def tripler(x):
    return 3 * x

def quintupler(x):
    return 5 * x

tripler_before = tripler(4)    # = 12
tripler = quintupler            # alias

# After aliasing, calls should reach the aliased function.
tripler_after = tripler(4)      # = 20


# --- Case 3: function-as-first-class-value (round-trip) ---
def cuber(x):
    return x * x * x

f = cuber                       # f is a reference to cuber
f_call_result = f(3)            # = 27 (callable as a value)
cuber_call_result = cuber(3)    # = 27 (direct call still works)


# --- Case 4: rebind to non-function value ---
def stomper(x):
    return x

stomper = "stomped"             # rebind to a string
stomper_value = stomper         # should be 'stomped', not the function
stomper_is_str = isinstance(stomper, str)
