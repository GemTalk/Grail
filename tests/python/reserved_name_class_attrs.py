# A Python class attribute may be named after a Smalltalk PSEUDO-VARIABLE
# (``self'', ``super'', ``nil'', ``true'', ``false'', ``thisContext'').  Those
# cannot be declared as variables nor assigned in Smalltalk, so the generated
# ``classInstVarNames:'' declaration and the ``true := ___1'' setter body were
# both uncompilable: the accessor pair failed to compile and the WHOLE class
# came back as a raising stub -- ``NameError: Grail could not compile this
# method (codegen gap)''.
#
# Parameters and locals already got a mangled transport name via NameAst's
# reserved-name rename; class attributes were the gap.

from enum import Enum

r = {}


class Plain:
    true = 1
    false = 2
    nil = 3
    self = 4
    super = 5
    thisContext = 6
    ordinary = 7


r['read'] = ','.join(str(getattr(Plain, n)) for n in
                     ('true', 'false', 'nil', 'self', 'super', 'thisContext', 'ordinary'))

# The mangled backing slot must not disturb ordinary assignment.
Plain.true = 100
r['after_store'] = Plain.true

# Per-class storage: a subclass overriding one keeps the parent's value intact.
class Sub(Plain):
    true = 42


r['sub_override'] = Sub.true
r['parent_intact'] = Plain.true

# The real Smalltalk class name is untouched by an attribute named ``name''.
r['class_name'] = Plain.__name__


# Enum members may be named the same way (test_enum TestSpecial.test_bool).
class Logic(Enum):
    true = True
    false = False


r['enum_members'] = ','.join(m.name for m in Logic)
r['enum_true_value'] = Logic.true.value
r['enum_truthy'] = bool(Logic.false)      # plain Enum members are always truthy


class Names(Enum):
    nil = 1
    self = 2
    super = 3
    thisContext = 4


r['enum_names'] = ','.join(m.name for m in Names)
