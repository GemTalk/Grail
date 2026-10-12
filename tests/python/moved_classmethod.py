# Regression fixture for #1455: a method compiled in one class body and
# stored on a DIFFERENT class.
#
# typing.NamedTuple does exactly that -- NamedTupleMeta.__new__ setattr()s the
# class body's namespace onto the class collections.namedtuple built -- so every
# method on a NamedTuple subclass is "moved".  Grail compiled the methods on the
# class statement's own class, and three calls did not reach them:
#
#  * a keyword call to a moved @classmethod (no ``_name:kw:'' companion is
#    compiled for classmethods, and the unbound handle could not bind by name);
#  * a sibling call through ``cls'' inside one -- a send to the namedtuple
#    class, which compiled nothing of the sort: an UNCATCHABLE
#    MessageNotUnderstood;
#  * five or more arguments, which have no non-virtual perform primitive: an
#    uncatchable MessageNotUnderstood for a class receiver, RecursionError for
#    an instance -- and the same virtual send made ``Base.m5(self, ...)'' from
#    inside an override run the override again.
#
# pytest's ParameterSet is a NamedTuple whose classmethods do all three.
# Expected values are what CPython 3.14 answers.

from typing import NamedTuple

RESULTS = {}


def attempt(f):
    try:
        return f()
    except RecursionError:
        return 'RecursionError'
    except TypeError as e:
        return 'TypeError: ' + str(e)


# --- moved by hand, the way the issue shows it -----------------------------

class Src:
    @classmethod
    def three(cls, a, b, c):
        return (cls.__name__, a, b, c)

    @classmethod
    def five(cls, a, b, c, d, e):
        return (cls.__name__, a, b, c, d, e)

    @classmethod
    def caller(cls, x):
        return cls.three(x, 2, 3)

    @classmethod
    def zero(cls):
        return cls.__name__

    @classmethod
    def calls_zero(cls):
        return cls.zero()

    def helper5(self, a, b, c, d, e):
        return (type(self).__name__, a, b, c, d, e)


class Dst:
    pass


for _k in ('three', 'five', 'caller', 'zero', 'calls_zero', 'helper5'):
    setattr(Dst, _k, Src.__dict__[_k])

RESULTS['positional'] = attempt(lambda: Dst.three(1, 2, 3)) == ('Dst', 1, 2, 3)
RESULTS['keyword'] = attempt(lambda: Dst.three(1, 2, c=3)) == ('Dst', 1, 2, 3)
RESULTS['keyword_via_instance'] = (
    attempt(lambda: Dst().three(1, b=2, c=3)) == ('Dst', 1, 2, 3))
RESULTS['keyword_on_func'] = (
    attempt(lambda: Src.__dict__['three'].__func__(Dst, 1, 2, c=3))
    == ('Dst', 1, 2, 3))
RESULTS['sibling_through_cls'] = attempt(lambda: Dst.caller(1)) == ('Dst', 1, 2, 3)
RESULTS['unary_sibling_through_cls'] = attempt(lambda: Dst.calls_zero()) == 'Dst'
RESULTS['five_args_class'] = (
    attempt(lambda: Dst.five(1, 2, 3, 4, 5)) == ('Dst', 1, 2, 3, 4, 5))
RESULTS['five_args_instance'] = (
    attempt(lambda: Dst().helper5(1, 2, 3, 4, 5)) == ('Dst', 1, 2, 3, 4, 5))
RESULTS['keyword_errors'] = (
    attempt(lambda: Dst.three(1, 2, d=3))
    == "TypeError: Src.three() got an unexpected keyword argument 'd'"
    and attempt(lambda: Dst.three(1, 2, a=3))
    == "TypeError: Src.three() got multiple values for argument 'a'")


# --- the typing.NamedTuple shape: pytest's ParameterSet, cut down -----------

class ParameterSet(NamedTuple):
    values: tuple
    marks: tuple
    id: object

    @classmethod
    def param(cls, *values, marks=(), id=None):
        return cls(values, tuple(marks), id)

    @classmethod
    def extract_from(cls, parameterset, force_tuple=False):
        if isinstance(parameterset, cls):
            return parameterset
        if force_tuple:
            return cls.param(parameterset)
        return cls(parameterset, (), None)

    @classmethod
    def _for_parametrize(cls, argnames, argvalues, func, config, nodeid):
        return [cls.extract_from(x, force_tuple=len(argnames) == 1)
                for x in argvalues]


RESULTS['namedtuple_keyword_and_siblings'] = (
    attempt(lambda: ParameterSet._for_parametrize(['x'], [1, 2], None, None,
                                                   nodeid='n'))
    == [ParameterSet((1,), (), None), ParameterSet((2,), (), None)])
RESULTS['namedtuple_five_positional'] = (
    attempt(lambda: ParameterSet._for_parametrize(['x', 'y'], [(1, 2)], None,
                                                   None, 'n'))
    == [ParameterSet((1, 2), (), None)])


# --- an explicit parent call at five arguments, from inside the override ----

class Base:
    def m5(self, a, b, c, d, e):
        return 'Base'


class Sub(Base):
    def m5(self, a, b, c, d, e):
        return 'Sub>' + Base.m5(self, a, b, c, d, e)


RESULTS['explicit_parent_five_args'] = (
    attempt(lambda: Sub().m5(1, 2, 3, 4, 5)) == 'Sub>Base')
RESULTS['explicit_parent_five_args_again'] = (
    attempt(lambda: Sub().m5(1, 2, 3, 4, 5)) == 'Sub>Base')

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
