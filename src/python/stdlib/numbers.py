# Minimal `numbers` stub for Grail.  CPython exposes an abstract
# numeric tower (Number → Complex → Real → Rational → Integral) for
# isinstance dispatch.  Grail uses concrete Smalltalk classes for
# ints / floats / decimals, so the tower is stubbed as empty
# classes — isinstance() against them returns False; Jinja2 (and
# Werkzeug) fall through to the duck-typed branch, which is what
# they want anyway.
#
# `register(subclass)` is a no-op returning the subclass (so it also
# works in decorator position and so a module-level
# `numbers.Real.register(X)` does not raise).  Grail does not track
# virtual subclasses -- isinstance() against the tower stays False -- but
# real code (and CPython's own tests) call register() at import time.
# It is repeated per class rather than relying on classmethod
# inheritance, which Grail supports only partially.


class Number:
    @classmethod
    def register(cls, subclass):
        return subclass


class Complex(Number):
    @classmethod
    def register(cls, subclass):
        return subclass


class Real(Complex):
    @classmethod
    def register(cls, subclass):
        return subclass


class Rational(Real):
    @classmethod
    def register(cls, subclass):
        return subclass


class Integral(Rational):
    @classmethod
    def register(cls, subclass):
        return subclass
