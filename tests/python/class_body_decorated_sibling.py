"""A class-body statement that reads a DECORATED sibling sees the decorator's
result, as CPython's class namespace holds it (#1580).

Grail compiles each def to a method and used to apply class-body decorators
after the whole body, and a class-body read of a sibling def answered the
plain function -- so numpy's matrixlib (``getT = T.fget`` after ``@property
def T``) and sqlalchemy's ``@_state_dict_inst.classlevel`` both failed at
import.
"""

import functools

LOG = []


def logged(f):
    LOG.append('logged ' + f.__name__)
    return f


def tagging(f):
    @functools.wraps(f)
    def wrapper(*args):
        return ('wrapped', f(*args))
    wrapper.tag = 'tagged'
    return wrapper


class hybridmethod:
    """sqlalchemy.util.langhelpers.hybridmethod, cut down."""

    def __init__(self, func):
        self.func = func
        self.clslevel = func

    def classlevel(self, func):
        self.clslevel = func
        return self

    def __get__(self, instance, owner):
        if instance is None:
            return self.clslevel.__get__(owner, owner.__class__)
        return self.func.__get__(instance, owner)


class ReadsAProperty:
    @property
    def T(self):
        "the doc"
        return 1

    getT = T.fget
    kind = type(T).__name__


class ReadsADecoratedDef:
    LOG.append('before')

    @logged
    def a(self):
        return 'a'

    LOG.append('after a')

    @tagging
    def b(self):
        return 'b'

    btag = b.tag

    @staticmethod
    def s():
        return 's'

    plain = s


class DecoratorReadsASibling:
    @hybridmethod
    def _inst(self):
        return 'inst'

    @_inst.classlevel
    def _cls(cls):
        return ('cls', cls.__name__)


class RebindsLater:
    @tagging
    def m(self):
        return 'first'

    def m(self):
        return 'second'


def a_property_read_later_is_the_property():
    return (ReadsAProperty.kind == 'property'
            and ReadsAProperty.getT(ReadsAProperty()) == 1)


def a_decorated_def_read_later_is_decorated():
    return (ReadsADecoratedDef.btag == 'tagged'
            and ReadsADecoratedDef().b() == ('wrapped', 'b'))


def the_decorator_runs_at_the_def():
    return LOG[:3] == ['before', 'logged a', 'after a']


def a_decorator_reads_its_sibling_raw():
    return (DecoratorReadsASibling._cls() == ('cls', 'DecoratorReadsASibling')
            and DecoratorReadsASibling()._cls() == 'inst')


def a_function_binds_to_a_class():
    class K:
        def f(cls):
            return cls.__name__
    fn = K.__dict__['f']
    return fn.__get__(K, type(K))() == 'K' and fn.__get__(K)() == 'K'


def a_later_def_still_wins():
    return RebindsLater().m() == 'second'


def an_undecorated_read_is_unchanged():
    return ReadsADecoratedDef.plain() == 's' and ReadsADecoratedDef().a() == 'a'


CHECKS = [
    a_property_read_later_is_the_property,
    a_decorated_def_read_later_is_decorated,
    the_decorator_runs_at_the_def,
    a_decorator_reads_its_sibling_raw,
    a_function_binds_to_a_class,
    a_later_def_still_wins,
    an_undecorated_read_is_unchanged,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
