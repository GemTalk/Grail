# Fixture for AttributeAccessTestCase.
#
# Symmetric counterpart to attribute_store.py.  Covers the read /
# query / delete side of Python's attribute protocol:
#   getattr(obj, name)   — read with optional default
#   hasattr(obj, name)   — query for presence
#   delattr(obj, name)   — remove
#   del obj.attr         — statement form of delattr
#
# After the attribute-store fix, an instance attribute store goes
# straight to dynamicInstVarAt:put:.  These tests verify the read /
# query / delete paths see the same store consistently — and that
# del / delattr actually REMOVE the slot (using removeDynamicInstVar:
# per the nil-as-absent convention) instead of nilling it, so that a
# same-named method on the class becomes visible again afterwards.


class Holder:
    """A class with a method whose name collides with a typical
    attribute name.  Used to verify del / delattr unshadow the
    method by removing the instance attribute."""

    def __init__(self):
        self.note = 'init'

    def method_name(self):
        return 'method_result'


# --- getattr ---
h1 = Holder()
h1.value = 42
getattr_existing = getattr(h1, 'value')                    # 42
getattr_with_default = getattr(h1, 'missing', 'fallback')  # 'fallback'

try:
    _ = getattr(h1, 'missing')
    getattr_missing_no_default = 'no_error'
except AttributeError:
    getattr_missing_no_default = 'attribute_error'

# Reading an unshadowed method via getattr yields a callable handle.
getattr_method = getattr(h1, 'method_name')
getattr_method_call = getattr_method()                     # 'method_result'


# --- hasattr ---
h2 = Holder()
h2.attr = 1
hasattr_present = hasattr(h2, 'attr')          # True
hasattr_missing = hasattr(h2, 'no_such_attr')  # False
hasattr_method  = hasattr(h2, 'method_name')   # True (method exists)


# --- del obj.attr (statement form) ---
h3 = Holder()
h3.tmp = 'present'
del_before = h3.tmp        # 'present'
del h3.tmp
try:
    _ = h3.tmp
    del_after_lookup = 'still_there'
except AttributeError:
    del_after_lookup = 'attribute_error'


# --- del unshadows a method ---
h4 = Holder()
h4.method_name = 'shadowed'
unshadow_before = h4.method_name           # 'shadowed' (the string)
del h4.method_name
# After del, the instance dict no longer has method_name; reads
# fall through to the class's method, lazy-wrapped as a callable.
unshadow_after_is_callable = callable(h4.method_name)
unshadow_after_call = h4.method_name()     # 'method_result'


# --- delattr (builtin form) ---
h5 = Holder()
h5.x = 'gone soon'
delattr(h5, 'x')
delattr_result_is_none = (delattr(h5, 'note') is None)  # delattr returns None
try:
    _ = h5.x
    delattr_after_lookup = 'still_there'
except AttributeError:
    delattr_after_lookup = 'attribute_error'


# --- del/delattr on a missing attribute raises AttributeError ---
h6 = Holder()
try:
    del h6.never_set
    del_missing = 'no_error'
except AttributeError:
    del_missing = 'attribute_error'

h7 = Holder()
try:
    delattr(h7, 'never_set')
    delattr_missing = 'no_error'
except AttributeError:
    delattr_missing = 'attribute_error'
