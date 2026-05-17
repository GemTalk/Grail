# Fixture for ClassAttrsTestCase.  Exercises class-level (not
# per-instance) attributes — names assigned directly in the class
# body but outside __init__.  CPython makes these reachable as both
# `Cls.X` (class-side) and `instance.X` (falls through from instance
# to class dict).  Grail must capture them since Python idioms like
# enums and constant pools rely on the class-attribute lookup path.

class Color:
    RED = 1
    GREEN = 2
    BLUE = 4
    NAME = 'palette'

cls_red = Color.RED
cls_blue = Color.BLUE
cls_name = Color.NAME

# Read via instance — should fall through to the class attribute.
c = Color()
inst_green = c.GREEN
