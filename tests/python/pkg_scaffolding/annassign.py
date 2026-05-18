# Exercises AnnAssignAst codegen.
#
# `x: int = expr` → emit the assignment, drop the annotation.
# `x: int` (no value) → no-op, leaves x undeclared.
# Works for Name, Attribute (self.x), and Subscript targets.


# Module-level annotated assignment with value.
module_int: int = 42

# Annotated assignment with computed value.
module_doubled: int = module_int * 2

# Bare annotation, no value — should NOT bind a value.
module_bare: str


def value_with_annotation() -> int:
    """Local annotated assign inside a function."""
    local_val: int = 7
    return local_val


def computed_local_annotation():
    """Annotation that references a type we never evaluate
    (Grail strips annotations, so this should compile clean)."""
    items: list = []
    items.append(1)
    items.append(2)
    return items


class HasAnnotatedAttrs:
    """Class with both class-level and instance-level annotations."""

    # Class-level annotated attr — becomes a classInstVar.
    class_counter: int = 100

    def __init__(self, value):
        self.value = value
