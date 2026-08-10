# Regression fixture: a subclass of float / int inherits the builtin's
# method suite.
#
# `class F(float)` cannot be a real subclass -- the kernel class is sealed
# -- so Grail substitutes a wrapper (AbstractPyFloat / AbstractPyInt) that
# forwards unknown env-1 SENDS to the wrapped value.  An attribute LOAD had
# no such fallback and raised AttributeError first, so the send that would
# have forwarded cleanly never happened:
#
#     F(0.5).is_integer()   AttributeError: F object has no attribute ...
#
# Arithmetic, comparison, hash, str/repr and user-defined methods already
# worked; it was only the builtin method suite that was unreachable.

RESULTS = {}

class F(float):
    pass

class G(float):
    def double(self):
        return self * 2

class I(int):
    pass

class J(int):
    def triple(self):
        return self * 3

# The methods that were unreachable.
RESULTS['float_as_integer_ratio'] = (F(0.5).as_integer_ratio() == (1, 2))
RESULTS['float_is_integer_false'] = (F(0.5).is_integer() is False)
RESULTS['float_is_integer_true'] = (F(2.0).is_integer() is True)
RESULTS['float_hex'] = (F(0.5).hex() == (0.5).hex())
RESULTS['int_bit_length'] = (I(3).bit_length() == 2)

# What already worked must keep working.
RESULTS['float_arithmetic'] = (F(0.5) + 1 == 1.5)
RESULTS['float_compare'] = (F(0.5) < 1 and F(0.5) == 0.5)
RESULTS['float_hash'] = (hash(F(0.5)) == hash(0.5))
RESULTS['float_str'] = (str(F(0.5)) == '0.5')
RESULTS['float_isinstance'] = isinstance(F(0.5), float)
RESULTS['float_type_name'] = (type(F(0.5)).__name__ == 'F')
RESULTS['float_user_method'] = (G(0.5).double() == 1.0)
RESULTS['int_arithmetic'] = (I(3) + 1 == 4)
RESULTS['int_user_method'] = (J(3).triple() == 9)

# A subclass OVERRIDE must win over the inherited builtin method.
class Over(float):
    def is_integer(self):
        return 'overridden'

RESULTS['subclass_override_wins'] = (Over(2.0).is_integer() == 'overridden')

# A genuinely missing attribute must still raise.
try:
    F(0.5).definitely_not_a_method
    RESULTS['missing_still_raises'] = False
except AttributeError:
    RESULTS['missing_still_raises'] = True
