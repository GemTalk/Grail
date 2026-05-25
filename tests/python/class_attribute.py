# Fixture for ClassAttributeTestCase.
#
# Class-level dynamic attribute storage: ``C.new_attr = 42'' must
# work even when ``new_attr'' wasn't declared in the class body, and
# the value must read back through C.new_attr / getattr(C, 'new_attr').
#
# Grail's pre-fix design exposed a hole: instance attribute stores
# go to dynamicInstVarAt: (works for any name), but class attribute
# stores fell back to the env-1 class-side setter — which only
# exists for slots declared in the class body or @property pairs.
# Setting a brand-new name on a class MNU'd.
#
# Fix: each generated Python class gets a class instVar
# ``dynInstVars'' holding an Object whose dynamic instVars provide
# the class-level dict storage.  Class-attribute reads / writes /
# deletes route through it.


class Box:
    declared = 'preset'


# --- Class-attribute assignment to a brand-new name ---
Box.brand_new = 42
brand_new_read = Box.brand_new       # 42
declared_read = Box.declared          # 'preset' (still works for the pre-declared slot)


# --- setattr / getattr on the class ---
setattr(Box, 'via_setattr', 'hello')
via_setattr_read = Box.via_setattr     # 'hello'
via_getattr_read = getattr(Box, 'via_setattr')  # 'hello'


# --- hasattr ---
hasattr_brand_new = hasattr(Box, 'brand_new')       # True
hasattr_missing = hasattr(Box, 'never_set')          # False
hasattr_declared = hasattr(Box, 'declared')          # True


# --- delattr / del on a class attribute ---
Box.removable = 'soon gone'
delattr_target_before = Box.removable                # 'soon gone'
delattr(Box, 'removable')
try:
    _ = Box.removable
    delattr_after = 'still_there'
except AttributeError:
    delattr_after = 'attribute_error'


# --- del statement on a class attribute ---
Box.del_me = 'temporary'
del Box.del_me
try:
    _ = Box.del_me
    del_stmt_after = 'still_there'
except AttributeError:
    del_stmt_after = 'attribute_error'


# --- delattr on a never-set attribute raises ---
try:
    delattr(Box, 'never_set')
    delattr_missing = 'no_error'
except AttributeError:
    delattr_missing = 'attribute_error'


# --- Re-binding a brand-new name works ---
Box.counter = 1
Box.counter = 2
Box.counter = 3
counter_after_rebind = Box.counter                   # 3


# --- Two separate classes get separate class-level dicts ---
class Other:
    pass

Box.tag = 'box-tag'
Other.tag = 'other-tag'
box_tag = Box.tag
other_tag = Other.tag
