# Fixture for the canonical-class METACLASS regression.
#
# A class built with ``metaclass=M'' must keep reporting M as its metaclass.
# Grail records that separately from the class object (a Smalltalk Class cannot
# hold dynamic instVars, so the record lives in SessionTemps), and the record
# was written only on the path that BUILDS the class -- so a WARM BIND, which
# adopts a committed module without re-running its body, left the class with no
# metaclass at all in every session after the one that deployed it.
#
# Everything below is ordinary CPython: run this file to see it.  The
# cross-session half -- that a re-import in a LATER session still answers these
# same things -- cannot be expressed here, because one process is one session;
# it lives in tests/scripts/runCanonicalClassTest.gs, which imports this module
# in session 1, commits, and re-checks after a fresh login.


class Tagging(type):
    """A metaclass with members reachable ONLY through the metaclass.

    ``tag'' is the shape that broke in the wild: abc.ABCMeta gives the io ABCs
    their ``register'', django called ``TextIOBase.register(...)'', and with the
    record lost the call died on "type object has no attribute 'register'".
    """

    marker = "on-the-metaclass"

    def tag(cls):
        return "tagged-" + cls.__name__


class Tagged(metaclass=Tagging):
    kind = "base"


class InheritsMeta(Tagged):
    """No ``metaclass='' of its own -- it INHERITS Tagging from Tagged.

    Pins the claim that a subclass needs no record emitted for itself because
    the metaclass is found by walking the superclass chain on read.
    """

    kind = "derived"


def metaclass_method_is_callable():
    return Tagged.tag() == "tagged-Tagged"


def type_of_the_class_is_the_metaclass():
    return type(Tagged) is Tagging


def dunder_class_is_the_metaclass():
    return Tagged.__class__ is Tagging


def isinstance_of_the_metaclass():
    return isinstance(Tagged, Tagging)


def metaclass_attribute_reaches_through_the_class():
    # Attribute lookup on a CLASS consults type(cls) as well as cls.__mro__.
    #
    # NOT ASSERTED BY THE SMALLTALK PEER: measured on Grail, this one raises
    # AttributeError ("type object 'Tagged' has no attribute 'marker'") -- its
    # class-attribute lookup does not consult the metaclass for a plain data
    # attribute, independently of the record this fixture is here to pin.  Kept
    # because it IS what CPython does, so the gap is recorded rather than
    # quietly absent; the seven checks around it all hold on both.
    return Tagged.marker == "on-the-metaclass"


def subclass_inherits_the_metaclass():
    return type(InheritsMeta) is Tagging


def subclass_inherits_the_metaclass_method():
    return InheritsMeta.tag() == "tagged-InheritsMeta"


def the_class_body_still_ran():
    # A metaclass must not cost the class its own attributes.
    return Tagged.kind == "base" and InheritsMeta.kind == "derived"


CHECKS = [
    metaclass_method_is_callable,
    type_of_the_class_is_the_metaclass,
    dunder_class_is_the_metaclass,
    isinstance_of_the_metaclass,
    metaclass_attribute_reaches_through_the_class,
    subclass_inherits_the_metaclass,
    subclass_inherits_the_metaclass_method,
    the_class_body_still_ran,
]


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
