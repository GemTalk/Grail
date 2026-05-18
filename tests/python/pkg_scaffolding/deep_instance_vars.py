# Exercises the propagation-based instance-variable discovery.
#
# Before the rewrite, ClassDefAst's scan only looked at top-level
# `self.X = ...` Assign statements in __init__.  Now `self.X` /
# `cls.X` writes anywhere in any method body propagate up via
# `declareInstanceVar:` to the enclosing ClassDefAst.


class DeepInit:
    """Every instance-attr style the old scan would miss:
      * AnnAssign on self.X (with annotation)
      * Conditional / nested compound statements
      * Set outside __init__ in a separate method
      * Set via the `cls` alias inside __new__"""

    def __new__(cls, doc=None, threshold=0):
        obj = object.__new__(cls)
        cls.last_doc = doc
        return obj

    def __init__(self, doc=None, threshold=0):
        # AnnAssign on self.X
        self.tags: list = []

        # Conditional inside __init__
        if doc:
            self.doc = doc

        # Nested compound (for inside try) inside __init__
        try:
            for i in range(2):
                self.last_index = i
        except Exception:
            pass

        # Plain top-level (the only one the old scan caught)
        self.threshold = threshold

    def configure(self, name):
        """Instance attr set outside __init__ — historically lost."""
        self.name = name


def make():
    obj = DeepInit('hello', 5)
    obj.configure('the-name')
    return obj
