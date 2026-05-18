# `class X(dict[K, V]):` evaluates `dict[K, V]` at runtime and uses
# the result as a base class.  Python's ``dict.__class_getitem__``
# returns a GenericAlias whose origin is ``dict``; subclassing the
# alias actually subclasses ``dict``.  Grail's ``__getitem__`` stub
# on the dict class side returns the class itself, so the same
# subclassing intent is preserved.


class StringKeyedDict(dict[str, int]):
    """Subclass of dict with parameterized base.  Picks up dict
    semantics; the type args are scaffolding for the type
    checker, not runtime behaviour."""

    def label(self) -> str:
        return 'string-keyed'


def make():
    inst = StringKeyedDict()
    inst['k'] = 1
    return inst
