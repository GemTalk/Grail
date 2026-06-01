# Fixture for DynamicTypeTestCase.
#
# The 3-argument form of the ``type`` builtin — ``type(name, bases,
# namespace)`` — creates a class at runtime.  Grail builds it the same
# way ClassDefAst does at compile time: the storage base becomes the
# Smalltalk superclass and the other Python bases' methods are merged
# in.  An empty namespace is supported (werkzeug's
# ``type('WrapperTestResponse', (TestResponse, wrapper), {})``).


class Animal:
    def speak(self):
        return 'generic'

    def legs(self):
        return 4


class Loud:
    def shout(self):
        return 'LOUD'


def dynamic_multi_base():
    C = type('LoudAnimal', (Animal, Loud), {})
    o = C()
    return [
        type(o).__name__,
        o.speak(),       # from the primary/storage base
        o.shout(),       # merged from the secondary base
        o.legs(),
        isinstance(o, Animal),
        isinstance(o, Loud),
    ]


def dynamic_single_base():
    C = type('Solo', (Animal,), {})
    return [C.__name__, C().speak()]


# --- class-body data-attribute inheritance through type() -----------------
# A dynamically-built class must inherit class-body data attributes
# (``X = v``) from its bases — Smalltalk class-side instVars are per-class
# storage, so type() must run the same ___inheritClassAttrs___ copy that
# ClassDefAst does at compile time.  werkzeug's WrapperTestResponse
# otherwise lost ``Response.implicit_sequence_conversion = True`` and the
# test-client's ``get_data()`` raised "response object required the
# iterable to be a sequence".


class Flagged:
    enabled = True
    label = 'base'


class Sub(Flagged):
    # A regular subclass that does NOT redeclare the attrs (ClassDefAst
    # path) — so the values must come from Flagged.
    pass


def dynamic_inherits_class_attr():
    Dyn = type('Dyn', (Flagged,), {})
    o = Dyn()
    return [Dyn.enabled, o.enabled, Dyn.label, o.label]


def dynamic_inherits_through_two_levels():
    # type() base is Sub, but the attrs live on Sub's parent Flagged —
    # mirrors WrapperTestResponse(flask.Response -> werkzeug.Response).
    Dyn = type('Dyn2', (Sub,), {})
    o = Dyn()
    return [o.enabled, o.label]
