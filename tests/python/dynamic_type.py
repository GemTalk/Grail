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
