# Minimal `numbers` stub for Grail.  CPython exposes an abstract
# numeric tower (Number → Complex → Real → Rational → Integral) for
# isinstance dispatch.  Grail uses concrete Smalltalk classes for
# ints / floats / decimals, so the tower is stubbed as empty
# classes — isinstance() against them returns False; Jinja2 (and
# Werkzeug) fall through to the duck-typed branch, which is what
# they want anyway.


class Number:
    pass


class Complex(Number):
    pass


class Real(Complex):
    pass


class Rational(Real):
    pass


class Integral(Rational):
    pass
