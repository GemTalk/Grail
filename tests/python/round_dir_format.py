# Three builtins whose results Grail did not check: round(), dir() and
# format().
#
# --- round() ----------------------------------------------------------------
#
# Python rounds TIES TO EVEN.  GemStone's ``rounded'' is half-away-from-zero,
# and every Grail path that reached it was therefore a half-unit out on exactly
# the inputs a rounding test checks:
#
#     round(0.5)      1 where CPython answers 0
#     round(2.5)      3                       2
#     round(-0.5)    -1                       0
#     round(25, -1)  30                      20
#
# and in the direction that makes a long series of roundings drift upward
# instead of cancelling, which is the whole reason Python picked ties-to-even.
# float.__round__(ndigits) was already right, by its own exact-rational route,
# so ``round(2.5)'' answered 3 while ``round(2.5, 0)'' answered 2.0 -- one
# function with two tie rules, depending on whether a second argument was
# passed.
#
# Three further gaps in round(): ``number='' was not accepted as a keyword
# though ``ndigits='' was; extra positionals were silently DROPPED, so
# ``round(1, 2, 3)'' answered 1; and a receiver whose type defines no
# __round__ fell into the kernel arithmetic and raised an UNCATCHABLE
# ``does not understand #'*'''.
#
# --- dir() ------------------------------------------------------------------
#
# The result of __dir__ is not the result of dir().  CPython converts what the
# hook returns to a LIST and SORTS it; Grail handed the hook's value straight
# back, so a __dir__ returning a tuple gave a tuple, a set gave a set, and one
# returning 7 gave 7 -- from a function documented to answer a sorted list.
#
# dir(cls) also leaked GemStone's class-side protocol: the metaclass walk ran
# the whole chain, so __mro__, mro, __bases__, __base__, __subclasses__ (on
# Behavior) and __name__, __qualname__ (on Object class) appeared on every
# built-in type.  The walk now stops below ``Object class'', which is where
# Python class attributes stop and GemStone's own begin.
#
# --- format() ---------------------------------------------------------------
#
# __format__ is required to answer a str.  Grail returned whatever it got, so
# ``format(x)'' could answer an int -- and the f-string codegen calls straight
# through format(), so ``f'{x}''' would then try to concatenate one.
#
# test_builtin's test_round, test_bug_27936 and test_format.  (test_dir also
# drives several of these; it asserts more besides and is not yet green.)

import decimal
import fractions
import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def kind(fn):
    """Exception TYPE only, where the wording is not the point."""
    try:
        fn()
        return 'no exception'
    except Exception as e:
        return type(e).__name__


# --- round: ties to even -----------------------------------------------------
#
# Both signs, and both sides of the tie, because half-away-from-zero and
# ties-to-even agree on everything except an exact .5.

r['round_ties'] = [round(v) for v in
                   (0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5,
                    -0.5, -1.5, -2.5, -5.5, -6.5)]
r['round_non_ties'] = [round(v) for v in (0.1, 0.9, 1.1, -0.1, -0.9, -1.1)]
# The ndigits form was always right; here so a fix cannot trade one for the
# other.
r['round_ndigits_ties'] = [round(5.5, 0), round(6.5, 0), round(-5.5, 0)]
r['round_int_ndigits_ties'] = [round(v, -1) for v in (5, 15, 25, 35, -15, -25)]
r['round_int_ndigits_wide'] = [round(150, -2), round(250, -2), round(1234, -2)]

# --- round: argument handling ------------------------------------------------

r['round_kw_both'] = round(number=-8.0, ndigits=-1)
r['round_kw_ndigits'] = round(-8.0, ndigits=-1)
r['round_no_args'] = kind(lambda: round())
r['round_too_many'] = outcome(lambda: round(1, 2, 3))
# ndigits=None means the argument was not supplied.  Each of these takes a
# different __round__, and only the int leg failed -- int tested Smalltalk nil
# where Python None is a distinct object.
for _x, _label in ((1234, 'int'), (1234.56, 'float'),
                   (decimal.Decimal('1234.56'), 'decimal'),
                   (fractions.Fraction(123456, 100), 'fraction')):
    r['round_none_ndigits_' + _label] = (round(_x, None), round(_x))
    r['round_none_type_' + _label] = (type(round(_x, None)).__name__,
                                      type(round(_x)).__name__)

r['round_result_types'] = [type(round(0.0)).__name__,
                           type(round(-8.0, -1)).__name__,
                           type(round(-8, -1)).__name__,
                           type(round(-8, 0)).__name__,
                           type(round(-8, 1)).__name__]


class RoundsItself:
    def __round__(self):
        return 23


class RoundsNot:
    pass


r['round_delegates'] = round(RoundsItself())
r['round_no_dunder'] = outcome(lambda: round(RoundsNot()))
# An INSTANCE attribute named __round__ must not be honoured -- CPython looks
# the dunder up on the TYPE.  Landing in the kernel arithmetic made this raise
# uncatchably instead.
_inst = RoundsNot()
_inst.__round__ = lambda *args: args
r['round_instance_dunder'] = outcome(lambda: round(_inst))
r['round_instance_dunder_ndigits'] = outcome(lambda: round(_inst, 0))


# --- dir: the result is a sorted list ----------------------------------------

class DirTuple:
    def __dir__(self):
        return ('b', 'c', 'a')


class DirSet:
    def __dir__(self):
        return {'b', 'c', 'a'}


class DirInt:
    def __dir__(self):
        return 7


r['dir_tuple_value'] = dir(DirTuple())
r['dir_tuple_type'] = type(dir(DirTuple())).__name__
r['dir_set_value'] = dir(DirSet())
r['dir_set_type'] = type(dir(DirSet())).__name__
r['dir_not_iterable'] = outcome(lambda: dir(DirInt()))


class BadDictModule(types.ModuleType):
    __dict__ = 8


r['dir_module_bad_dict'] = kind(lambda: dir(BadDictModule('foo')))

# The metaclass leak.  Asked as membership rather than as the whole list: the
# list still differs from CPython's in other ways (Grail's object carries
# __enter__ / __aenter__ and friends), and pinning it whole would make this
# fixture fail for reasons it is not about.
r['dir_str_no_metaclass_names'] = sorted(
    n for n in ('__mro__', 'mro', '__bases__', '__base__', '__subclasses__',
                '__name__', '__qualname__')
    if n in dir(str))
r['dir_str_keeps_real_methods'] = sorted(
    n for n in ('strip', 'upper', 'join', '__len__') if n in dir(str))


# Class attributes must still be reachable from the class, a SUBCLASS and an
# instance -- that union is what the metaclass walk was added for, so narrowing
# it needs this control.
class HasClassAttr:
    data = 42

    def meth(self):
        pass


class InheritsClassAttr(HasClassAttr):
    pass


r['dir_class_attr'] = sorted(
    n for n in ('data', 'meth') if n in dir(HasClassAttr))
r['dir_subclass_attr'] = sorted(
    n for n in ('data', 'meth') if n in dir(InheritsClassAttr))
r['dir_instance_attr'] = sorted(
    n for n in ('data', 'meth') if n in dir(HasClassAttr()))


# --- format: the result must be a str ----------------------------------------

class BadFormatResult:
    def __format__(self, spec):
        return 1


class GoodFormatResult:
    def __format__(self, spec):
        return 'spec=%s' % spec


r['format_bad_result'] = outcome(lambda: format(BadFormatResult()))
r['format_bad_result_with_spec'] = outcome(
    lambda: format(BadFormatResult(), 'x'))
r['format_good_result'] = format(GoodFormatResult(), '>4')
r['format_default_spec'] = format(GoodFormatResult())
# The control: ordinary formatting is untouched.
r['format_plain'] = [format(3, ''), format(3, '>4'), format(1.5, ''),
                     format('ab', ''), format(None, '')]
r['format_bad_spec_type'] = kind(lambda: format(1, 2))


EXPECTED = {
    'dir_class_attr': ['data', 'meth'],
    'dir_instance_attr': ['data', 'meth'],
    'dir_module_bad_dict': 'TypeError',
    'dir_not_iterable': "TypeError: 'int' object is not iterable",
    'dir_set_type': 'list',
    'dir_set_value': ['a', 'b', 'c'],
    'dir_str_keeps_real_methods': ['__len__', 'join', 'strip', 'upper'],
    'dir_str_no_metaclass_names': [],
    'dir_subclass_attr': ['data', 'meth'],
    'dir_tuple_type': 'list',
    'dir_tuple_value': ['a', 'b', 'c'],
    'format_bad_result': 'TypeError: __format__ must return a str, not int',
    'format_bad_result_with_spec': 'TypeError: __format__ must return a str, not int',
    'format_bad_spec_type': 'TypeError',
    'format_default_spec': 'spec=',
    'format_good_result': 'spec=>4',
    'format_plain': ['3', '   3', '1.5', 'ab', 'None'],
    'round_delegates': 23,
    'round_instance_dunder': "TypeError: type RoundsNot doesn't define __round__ method",
    'round_instance_dunder_ndigits': "TypeError: type RoundsNot doesn't define __round__ method",
    'round_int_ndigits_ties': [0, 20, 20, 40, -20, -20],
    'round_int_ndigits_wide': [200, 200, 1200],
    'round_kw_both': -10.0,
    'round_kw_ndigits': -10.0,
    'round_ndigits_ties': [6.0, 6.0, -6.0],
    'round_no_args': 'TypeError',
    'round_no_dunder': "TypeError: type RoundsNot doesn't define __round__ method",
    'round_non_ties': [0, 1, 1, 0, -1, -1],
    'round_none_ndigits_decimal': (1235, 1235),
    'round_none_ndigits_float': (1235, 1235),
    'round_none_ndigits_fraction': (1235, 1235),
    'round_none_ndigits_int': (1234, 1234),
    'round_none_type_decimal': ('int', 'int'),
    'round_none_type_float': ('int', 'int'),
    'round_none_type_fraction': ('int', 'int'),
    'round_none_type_int': ('int', 'int'),
    'round_result_types': ['int', 'float', 'int', 'int', 'int'],
    'round_ties': [0, 2, 2, 4, 4, 6, 6, 8, 0, -2, -2, -6, -6],
    'round_too_many': 'TypeError: round() takes at most 2 arguments (3 given)',
}

# A NAMED roll-up, not a count -- see the SUnit peer.
DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-34s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
