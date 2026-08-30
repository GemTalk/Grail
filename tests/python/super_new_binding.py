"""Fixture: ``super().__new__`` and where the target class goes.

CPython makes ``__new__`` an implicit STATICMETHOD, so the class being
constructed is an ordinary first positional argument at every call site:
``super().__new__(cls, a, b)`` is a three-argument call, and the parent's
``def __new__(cls, a, b)`` receives exactly those three.

Grail spells the two halves of that with two different calling conventions, and
that is the whole of the defect this fixture pins:

  * a class-body ``def __new__(cls, a, b)`` compiles INSTANCE-side as
    ``__new__:_:``, with ``cls`` as the Smalltalk RECEIVER -- one argument
    fewer than the Python call site wrote;
  * Grail's built-in and kernel __new__ methods are CLASS-side and written to
    CPython's convention, taking the class as a real argument -- ``object class
    >> __new__: cls``, ``type class >> __new__: mcls _: name _: bases _: ns``.

super() resolved BOTH sides with the class-side arity, so a call that landed on
a user-written parent __new__ passed the class twice: the parent saw
``(cls, cls, a, b)`` and raised ``A.__new__() takes 2 positional arguments but 3
were given``.  urllib3's ``Url`` is that shape -- a typing.NamedTuple subclass
whose __new__ normalises and then delegates -- so ``kaggle`` reached its first
network call and died on ``Url() takes 7 positional arguments but 8 were
given``.

BOTH DIRECTIONS MATTER, which is why this fixture is not just the instance
case.  Resolving both sides with the INSTANCE arity instead would have fixed
the classes and broken every metaclass: the standard
``super().__new__(mcls, name, bases, ns)`` idiom resolves class-side onto
``type >> __new__:_:_:_:`` and needs all four arguments.  Neither single
convention can serve both, so the lookup carries one arity family per side and
the caller strips the leading class back off again for an instance-side hit.
The metaclass checks below are the negative control: they passed before the fix
and must still pass after it.

Ground truth is CPython 3.14's own output; run this file to check it.
"""

import collections

# Values are handed back as STRINGS wherever the answer is a tuple: the
# Smalltalk harness compares ``asString'' of what it reads out of ``r``, and
# asString of a Grail tuple is not the Python repr.  Converting here keeps the
# expectation and the harness reading the same characters.
r = {}


# --------------------------------------------------------------- the defect
#
# Two plain classes.  Nothing here is about namedtuples -- the double bind was
# general, and this is the smallest shape that shows it.

class A:
    def __new__(cls, a, b):
        self = object.__new__(cls)
        self.pair = (a, b)
        return self


class B(A):
    def __new__(cls, a, b):
        return super().__new__(cls, a, b)


_b = B(1, 2)
r['plain_pair'] = str(_b.pair)
r['plain_class'] = type(_b).__name__


# A three-level chain, so the receiver is not merely "the class the method was
# found on": each level forwards to the next and every one of them must see the
# MOST DERIVED class, not the class that defines the __new__ being run.

class D1:
    def __new__(cls, x):
        self = object.__new__(cls)
        self.x = x
        return self


class D2(D1):
    def __new__(cls, x):
        return super().__new__(cls, x + 1)


class D3(D2):
    def __new__(cls, x):
        return super().__new__(cls, x + 10)


_d = D3(1)
r['chain_value'] = _d.x
r['chain_class'] = type(_d).__name__


# The zero-extra-argument form, which reaches object.__new__ CLASS-side.  It
# worked before the fix and is here because the fix rewrites the resolution it
# takes: ``super().__new__(cls)`` must still find ``object class >> __new__:``
# with the class as its argument, not an instance-side 0-arg ``__new__``.

class C0:
    def __new__(cls):
        return super().__new__(cls)


r['object_new_class'] = type(C0()).__name__


# Keyword arguments take the varargs form ``___new__:kw:`` rather than a
# fixed-arity selector -- a SECOND resolution path through the same lookup, and
# one where the instance-side and class-side spellings of that one selector
# disagree about the leading class just as the fixed forms do.

class E1:
    def __new__(cls, a, b=5):
        self = object.__new__(cls)
        self.v = (a, b)
        return self


class E2(E1):
    def __new__(cls, a, b=5):
        return super().__new__(cls, a, b=b)


r['kwargs'] = str(E2(1, b=9).v)


# A splat call site, whose arity is known only at run time.

class F1:
    def __new__(cls, *args):
        self = object.__new__(cls)
        self.v = args
        return self


class F2(F1):
    def __new__(cls, *args):
        return super().__new__(cls, *args)


r['splat'] = str(F2(1, 2, 3).v)


# The EXPLICIT two-argument super, which takes a different codegen path to the
# same proxy.

class G1:
    def __new__(cls, a):
        self = object.__new__(cls)
        self.a = a
        return self


class G2(G1):
    def __new__(cls, a):
        return super(G2, cls).__new__(cls, a)


r['explicit_super'] = str((G2(7).a, type(G2(7)).__name__))


# The class handed to __new__ is the one CONSTRUCTED, even when it is not the
# class super() was bound to.  This is what makes "strip the leading argument
# and use it as the receiver" the right rule rather than "use super()'s own
# object": the two coincide for every ordinary call and part company here.

class H1:
    def __new__(cls, a):
        self = object.__new__(cls)
        self.a = a
        return self


class H2(H1):
    pass


class H3(H1):
    def __new__(cls, a):
        return super().__new__(H2, a)


r['constructs_the_named_class'] = type(H3(1)).__name__


# ------------------------------------------------- the negative control
#
# METACLASSES resolve class-side and must keep passing the class explicitly.
# A fix that stopped the double bind everywhere would break exactly these.

class Meta(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        cls.stamped = True
        return cls


class MC(metaclass=Meta):
    pass


r['metaclass_stamped'] = MC.stamped
r['metaclass_type'] = type(MC).__name__


# A metaclass INHERITING a metaclass, where the inner super() lands on a
# Python-written ``__new__`` (instance-side) rather than on type's -- so this
# one exercises the stripped convention with metaclass arguments.

class M1(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        cls.m1 = True
        return cls


class M2(M1):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        cls.m2 = True
        return cls


class MC2(metaclass=M2):
    pass


r['metaclass_chain'] = str((MC2.m1, MC2.m2, type(MC2).__name__))


# --------------------------------------------------- built-in bases
#
# str / int / tuple subclasses delegate to a CLASS-side built-in __new__, which
# takes the class explicitly.  They are the other half of the negative control:
# the two sides are told apart by where the method was found, so a built-in
# base must be unaffected by the instance-side stripping.

class S1(str):
    def __new__(cls, v):
        return super().__new__(cls, v.upper())


r['str_sub'] = str((str(S1('ab')), type(S1('ab')).__name__))


class I1(int):
    def __new__(cls, v):
        return super().__new__(cls, v * 2)


r['int_sub'] = str((int(I1(3)), type(I1(3)).__name__))


class TBase(tuple):
    def __new__(cls, a, b):
        return tuple.__new__(cls, (a, b))


class TDerived(TBase):
    def __new__(cls, a, b):
        return super().__new__(cls, a, b)


r['tuple_sub'] = str((tuple(TDerived(1, 2)), type(TDerived(1, 2)).__name__))


# ------------------------------------------------------- urllib3's Url
#
# The shape that made this worth fixing: a namedtuple subclass whose __new__
# normalises its arguments and then delegates with super().  ``kaggle`` scored
# 2/3 on the acceptance harness and failed the first network call with
# ``Url() takes 7 positional arguments but 8 were given`` -- this, at arity 7.

NT = collections.namedtuple('NT', 'scheme host')


class Url(NT):
    def __new__(cls, scheme=None, host=None):
        if scheme is not None:
            scheme = scheme.lower()
        return super().__new__(cls, scheme, host)


_u = Url('HTTP', 'example.com')
r['url_scheme'] = _u.scheme
r['url_values'] = str(tuple(_u))
r['url_class'] = type(_u).__name__


EXPECTED = {
    'plain_pair': '(1, 2)',
    'plain_class': 'B',
    'chain_value': 12,
    'chain_class': 'D3',
    'object_new_class': 'C0',
    'kwargs': '(1, 9)',
    'splat': '(1, 2, 3)',
    'explicit_super': "(7, 'G2')",
    'constructs_the_named_class': 'H2',
    'metaclass_stamped': True,
    'metaclass_type': 'Meta',
    'metaclass_chain': "(True, True, 'M2')",
    'str_sub': "('AB', 'S1')",
    'int_sub': "(6, 'I1')",
    'tuple_sub': "((1, 2), 'TDerived')",
    'url_scheme': 'http',
    'url_values': "('http', 'example.com')",
    'url_class': 'Url',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
