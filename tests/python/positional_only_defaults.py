# PEP 570 positional-only parameters that carry DEFAULTS.
#
# ``def f(a=1, /, b=2)'' puts one parameter in the AST's posonlyargs list and
# one in args, and CPython's arguments node applies ``defaults'' to the two as
# ONE sequence.  Grail's def-time default-capture indexed ``args'' alone, so as
# soon as a default reached back into the posonly section the arithmetic ran off
# the front of that list: 2 defaults over 1 regular arg put the first-defaulted
# index at 0, and codegen died with a raw Smalltalk OffsetError.
#
# It failed at COMPILE time, inside the emit, which is why it cost whole
# modules rather than single functions -- an uncatchable error there aborts the
# import of everything in the file.  test.test_call and
# test.test_positional_only_arg both stopped on it.

r = {}


# --- the shape that broke: a default that belongs to a posonly parameter ------


def one_each(a=1, /, b=2):
    return (a, b)


r['defaults'] = one_each()
r['both_positional'] = one_each(10, 20)
r['keyword_for_regular'] = one_each(10, b=30)


# --- every parameter positional-only, all defaulted ---------------------------


def all_posonly(a=1, b=2, /):
    return (a, b)


r['all_posonly_defaults'] = all_posonly()
r['all_posonly_given'] = all_posonly(7, 8)


# --- posonly + regular + keyword-only, defaults spanning the boundary ---------


def spanning(a, b=2, /, c=3, *, d=4):
    return (a, b, c, d)


r['spanning_min'] = spanning(1)
r['spanning_all'] = spanning(1, 20, 30, d=40)
r['spanning_kwonly_only'] = spanning(1, d=40)


# --- a posonly default that closes over the ENCLOSING scope -------------------
# The outer capture block exists so a default resolves at def time in the scope
# that wrote it, rather than in the inner block where the same name is the local
# being bound.  That is the block whose temp list the bad index corrupted, so
# the closing-over case is the one that proves it is wired to the right names.

_sentinel = object()


def _make(limit):
    def uses_enclosing(x=limit, /, y=_sentinel):
        return (x, y is _sentinel)
    return uses_enclosing


r['closes_over_enclosing'] = _make(99)()
r['closes_over_overridden'] = _make(99)(5, None)


# --- a posonly parameter with NO default still works --------------------------


def no_default(a, /, b=2):
    return (a, b)


r['no_default_on_posonly'] = no_default(1)


# --- and the plain case, which must not have moved ----------------------------


def plain(x=5, y=6):
    return (x, y)


r['plain_defaults'] = plain()
r['plain_given'] = plain(1, 2)


def plain_kwonly(x=5, *, y=6):
    return (x, y)


r['plain_kwonly'] = plain_kwonly()
r['plain_kwonly_given'] = plain_kwonly(1, y=2)

# A posonly parameter may not be passed by name -- CPython raises TypeError,
# which is the whole point of PEP 570.  Grail currently binds it happily; that
# is a separate gap in the call/binding path, not in the default-capture
# codegen above, and the SUnit case pins the current answer so the day it is
# fixed something says so.
try:
    one_each(a=1)
    r['posonly_by_name'] = 'no error'
except TypeError as e:
    r['posonly_by_name'] = 'TypeError'
except Exception as e:
    r['posonly_by_name'] = type(e).__name__

RESULTS = r
