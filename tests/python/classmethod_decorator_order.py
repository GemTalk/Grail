# Regression fixture: @classmethod composed with a WRAPPING decorator.
#
# `@classmethod @deco def m(cls, x)` is classmethod(deco(m)): deco wraps the
# RAW function, which still takes `cls`, and classmethod binds it afterwards.
# Grail handed deco a BoundMethod on the class -- already bound -- so `cls`
# was consumed by the binding and the wrapper never saw it:
#
#     CPython: ('tagged', (<class B>, 1), ...)
#     Grail:   ('tagged', (1,),           ...)
#
# The base is now an UnboundMethod rooted at the METAclass (callable as
# (cls, ...)), and the chain's result is re-wrapped in the PyClassMethod
# descriptor, which the class-attribute read paths already honour.
#
# Order matters: `@singledispatchmethod @classmethod def m` is the OTHER
# way round -- the classmethod applies first and singledispatchmethod's
# descriptor is what the class must hold -- so only the OUTERMOST case is
# rewritten.

import contextlib

RESULTS = {}


def _tag(fn):
    def wrapper(*a, **k):
        return ('tagged', a, fn(*a, **k))
    return wrapper


class B:
    @classmethod
    @_tag
    def tagged_cm(cls, x):
        return 'p:' + cls.__name__ + ':' + str(x)

    @classmethod
    @contextlib.contextmanager
    def cm(cls):
        yield 'cm:' + cls.__name__

    def use_tagged(self):
        return self.tagged_cm(1)

    def use_cm(self):
        with self.cm() as v:
            return v


class Sub(B):
    pass


_b = B()

# cls must reach the WRAPPER, through every access shape.
_expected = ('tagged', (B, 1), 'p:B:1')
RESULTS['via_class'] = (B.tagged_cm(1) == _expected)
RESULTS['via_instance'] = (_b.tagged_cm(1) == _expected)
RESULTS['via_self'] = (_b.use_tagged() == _expected)
RESULTS['binds_subclass'] = (Sub.tagged_cm(1) == ('tagged', (Sub, 1), 'p:Sub:1'))

# The decorator must actually be applied -- not the raw generator.
RESULTS['cm_via_class_wrapped'] = ('Generator' not in type(B.cm()).__name__
                                   or 'CM' in type(B.cm()).__name__
                                   or 'ContextManager' in type(B.cm()).__name__)
with B.cm() as _v:
    RESULTS['with_via_class'] = (_v == 'cm:B')
RESULTS['with_via_self'] = (_b.use_cm() == 'cm:B')


# An UNDECORATED classmethod must be untouched, at every arity.
class P:
    @classmethod
    def cm0(cls):
        return 'cm0:' + cls.__name__

    @classmethod
    def cm1(cls, x):
        return 'cm1:' + cls.__name__ + ':' + str(x)

    def use(self):
        return (self.cm0(), self.cm1(5))


RESULTS['plain_cm_via_class'] = (P.cm0() == 'cm0:P')
RESULTS['plain_cm_via_instance'] = (P().cm0() == 'cm0:P')
RESULTS['plain_cm_via_self'] = (P().use() == ('cm0:P', 'cm1:P:5'))


# A decorated @staticmethod must be untouched (its receiver is ignored).
class S:
    @staticmethod
    @_tag
    def st(x):
        return 's:' + str(x)


RESULTS['static_with_decorator'] = (S.st(3) == ('tagged', (3,), 's:3'))


# @classmethod as the INNER decorator must NOT be re-wrapped: the outer
# decorator's object is what the class holds.
def _outer(fn):
    def wrapper(*a, **k):
        return ('outer', fn(*a, **k))
    wrapper.marker = 'kept'
    return wrapper


class Q:
    @_outer
    @classmethod
    def inner_cm(cls, x):
        return 'q:' + str(x)


RESULTS['classmethod_inner_keeps_outer'] = (getattr(Q.inner_cm, 'marker', None) == 'kept')
