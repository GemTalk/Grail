# Fixture for AttributePropertyTestCase.
#
# Counterpart to attribute_protocol.py (which uses __setattr__ /
# __getattr__).  Demonstrates the same Fahrenheit/Celsius computed-
# attribute pattern via Python's @property descriptor protocol —
# the idiomatic choice when the wrapping is per-attribute rather
# than catch-all.
#
# A @property is a data descriptor: its __set__ intercepts before
# the instance dict is checked, and its __get__ runs every time the
# attribute is read.  Unlike __setattr__ / __getattr__, property
# decorators only fire for the named attribute — other writes /
# reads go through the normal instance dict path.


class Thermometer:
    """Internal storage: _celsius (one private slot).  External
    interface: .celsius and .fahrenheit, both descriptor-managed."""

    def __init__(self, celsius=0):
        self._celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        self._celsius = value

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value):
        self._celsius = (value - 32) * 5 / 9


# --- Basic round-trip via the property getters ---
t1 = Thermometer(100)
celsius_init = t1.celsius          # 100 (property getter reads _celsius)
fahrenheit_read = t1.fahrenheit    # 212.0 (property getter computes)


# --- Property setter converts on write ---
t2 = Thermometer()
t2.fahrenheit = 32                 # setter converts → _celsius = 0.0
celsius_after_freezing = t2.celsius
fahrenheit_after_freezing = t2.fahrenheit  # 32.0


# --- Mixed F/C writes both update the same _celsius slot ---
t3 = Thermometer()
t3.celsius = 100                   # celsius setter writes _celsius
celsius_first = t3.celsius
fahrenheit_first = t3.fahrenheit   # 212.0

t3.fahrenheit = 32                 # fahrenheit setter rewrites _celsius
celsius_second = t3.celsius        # 0.0
fahrenheit_second = t3.fahrenheit  # 32.0


# --- Internal slot is observable through the public name too ---
t4 = Thermometer(25)
private_value = t4._celsius        # 25 (no descriptor — direct dict)
public_value = t4.celsius          # 25 (via getter)
