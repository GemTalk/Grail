# Regression for ``from enum import auto'' callable binding.
#
# CPython's import-from binds ``auto'' to the function object (it's a
# descriptor, so attribute access returns it unchanged).  Grail's
# default module-attribute path INVOKES unary methods on read,
# which turned ``from enum import auto'' into ``auto = <result of
# calling auto>'' (a SmallInteger) — subsequent ``auto()'' calls
# would then try ``SmallInteger value:value:'' and MNU.
#
# Fix: pre-store ``auto'' as a BoundMethod on the enum module so
# the import-from path reads the BoundMethod directly via
# dynamicInstVarAt: (the first probe in ___pyAttrLoad___).
#
# Werkzeug.sansio.multipart hits this via ``class State(Enum):
# PREAMBLE = auto()''.


from enum import auto


x = auto()
y = auto()
z = auto()


def imported_auto_is_callable():
    """Each call returns a fresh integer."""
    return x, y, z
