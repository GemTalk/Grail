# Fixture for AttributeProtocolTestCase.
#
# Verifies the user-overridable Python attribute protocol:
#   __setattr__(self, name, value)  — intercepts ALL attribute writes
#   __getattr__(self, name)         — called on FALLBACK (load miss)
#
# Use case: Thermometer stores Celsius internally but lets callers
# read/write Fahrenheit too.  __setattr__ converts F→C on store;
# __getattr__ converts C→F on read (since 'fahrenheit' is never
# actually stored as an attribute, it's always computed).
#
# To avoid infinite recursion __setattr__ must use the default
# object.__setattr__(self, name, value) for the underlying store —
# the user-level intercept calls the lower-level primitive
# explicitly to bypass its own override.


class Thermometer:
    """Internal storage: celsius (one slot).  External interface:
    .celsius and .fahrenheit both readable; .celsius and .fahrenheit
    both writable; setting one updates the other (since they
    represent the same physical temperature)."""

    def __init__(self, celsius=0):
        # Goes through self.__setattr__ — name='celsius', falls into
        # the else branch and uses the default object store.
        self.celsius = celsius

    def __setattr__(self, name, value):
        if name == 'fahrenheit':
            # Convert F → C and store celsius via super().__setattr__
            # — bypasses our own override to avoid infinite recursion.
            super().__setattr__('celsius', (value - 32) * 5 / 9)
        else:
            super().__setattr__(name, value)

    def __getattr__(self, name):
        # Only called when normal lookup misses (i.e. when 'name' is
        # not in self.__dict__ AND not a class method/attribute).
        if name == 'fahrenheit':
            return self.celsius * 9 / 5 + 32
        raise AttributeError(name)


# --- Basic round-trip ---
t1 = Thermometer(100)
celsius_init = t1.celsius          # 100 (set via __init__ → __setattr__ → object.__setattr__)
fahrenheit_read = t1.fahrenheit    # 212.0 (computed by __getattr__)


# --- __setattr__ converts on write ---
t2 = Thermometer()
t2.fahrenheit = 32                 # __setattr__ converts → celsius = 0.0
celsius_after_freezing = t2.celsius
fahrenheit_after_freezing = t2.fahrenheit  # 32.0


# --- Mixed F/C writes both update the same underlying state ---
t3 = Thermometer()
t3.celsius = 100                   # __setattr__ → object store
celsius_first = t3.celsius
fahrenheit_first = t3.fahrenheit   # 212.0

t3.fahrenheit = 32                 # __setattr__ rewrites celsius
celsius_second = t3.celsius        # 0.0
fahrenheit_second = t3.fahrenheit  # 32.0


# --- __getattr__ raises AttributeError for genuinely-missing names ---
t4 = Thermometer(20)
try:
    _ = t4.bogus
    missing_attr = 'no_error'
except AttributeError:
    missing_attr = 'attribute_error'


# --- __setattr__ accepts arbitrary names (else branch stores anything) ---
t5 = Thermometer(0)
t5.label = 'lab probe'
arbitrary_attr_after_set = t5.label
