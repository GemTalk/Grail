# Fixture for CallingConventionTestCase.
#
# CPython raises TypeError when a call supplies more positional arguments
# than the function accepts (and it has no *args), or an unexpected keyword
# argument (and it has no **kwargs).  Grail previously SILENTLY DROPPED the
# extras, so ``operator.pow(1, 2, 3)`` returned 1 and attrgetter/itemgetter/
# methocaller's over-supplied __call__ never raised.
#
# The fix emits arg-count guards in the varargs prologue + forwarder
# (FunctionDefAst>>printArgCountChecksOn:...).


def _raises(fn):
    try:
        fn()
        return 'no error'
    except TypeError:
        return 'TypeError'
    except BaseException as e:
        return type(e).__name__


def twoarg(a, b):
    return (a, b)


def correct_positional():
    return twoarg(1, 2) == (1, 2)             # True


def correct_keyword():
    return twoarg(a=1, b=2) == (1, 2)         # True


def toomany_positional():
    return _raises(lambda: twoarg(1, 2, 3))   # TypeError


def unexpected_keyword():
    return _raises(lambda: twoarg(1, 2, z=3))  # TypeError


def missing_required():
    return _raises(lambda: twoarg(1))         # TypeError


def withdefault(a, b=10):
    return (a, b)


def default_used():
    return withdefault(1) == (1, 10)          # True


def default_toomany():
    return _raises(lambda: withdefault(1, 2, 3))  # TypeError


def starargs(a, *rest):
    return (a, rest)


def starargs_absorbs():
    return starargs(1, 2, 3, 4) == (1, (2, 3, 4))   # True (no error)


def kwargsfn(a, **kw):
    return (a, kw)


def kwargs_absorbs():
    r = kwargsfn(1, x=2, y=3)
    return r[0] == 1 and r[1] == {'x': 2, 'y': 3}    # True (no error)


def kwonly(a, *, b):
    return (a, b)


def kwonly_ok():
    return kwonly(1, b=2) == (1, 2)           # True


def kwonly_unexpected():
    return _raises(lambda: kwonly(1, b=2, c=3))  # TypeError


class Getter:
    def __init__(self, attr):
        self.attr = attr

    def __call__(self, obj):
        return getattr(obj, self.attr)


class _Rec:
    pass


def method_ok():
    r = _Rec()
    r.name = 'x'
    return Getter('name')(r)                  # 'x'


def method_toomany():
    r = _Rec()
    r.name = 'x'
    return _raises(lambda: Getter('name')(r, 'extra'))     # TypeError


def method_unexpected_keyword():
    r = _Rec()
    r.name = 'x'
    return _raises(lambda: Getter('name')(r, surname='y'))  # TypeError
