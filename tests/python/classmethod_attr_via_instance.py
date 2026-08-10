# Regression fixture: reading a @classmethod through an INSTANCE.
#
# A @classmethod's def lives on the METACLASS (category
# 'Grail-Class Methods'), so none of ___pyAttrLoad___'s instance-side
# probes could see it.  PythonInstance>>doesNotUnderstand: forwarded the
# direct-send shape, but only for KEYWORD selectors (its branch is
# guarded by `s last = $:`), so a ZERO-ARG classmethod had no route at
# all -- and the pure LOAD shapes (getattr, or binding it to a name)
# had none at any arity:
#
#     p.cm1(7)              worked      (keyword selector -> DNU forward)
#     p.cm0()               AttributeError
#     getattr(p, 'cm0')()   AttributeError
#     f = p.cm0; f()        AttributeError

RESULTS = {}


class P:
    @classmethod
    def cm0(cls):
        return 'cm0:' + cls.__name__

    @classmethod
    def cm1(cls, x):
        return 'cm1:' + cls.__name__ + ':' + str(x)

    @classmethod
    def cm2(cls, x, y):
        return 'cm2:' + cls.__name__ + ':' + str(x) + ':' + str(y)


class Sub(P):
    pass


_p = P()

RESULTS['zero_arg_via_class'] = (P.cm0() == 'cm0:P')
RESULTS['zero_arg_via_instance'] = (_p.cm0() == 'cm0:P')
RESULTS['zero_arg_via_getattr'] = (getattr(_p, 'cm0')() == 'cm0:P')

_f = _p.cm0
RESULTS['zero_arg_bound_then_called'] = (_f() == 'cm0:P')

RESULTS['one_arg_via_instance'] = (_p.cm1(7) == 'cm1:P:7')
RESULTS['two_arg_via_instance'] = (_p.cm2(1, 2) == 'cm2:P:1:2')

# cls must be the RECEIVER's class, so a subclass instance binds the subclass.
RESULTS['subclass_binds_subclass'] = (Sub().cm0() == 'cm0:Sub')
RESULTS['subclass_via_getattr'] = (getattr(Sub(), 'cm0')() == 'cm0:Sub')

# A genuinely missing attribute must still raise.
try:
    _p.nope
    RESULTS['missing_still_raises'] = False
except AttributeError:
    RESULTS['missing_still_raises'] = True
