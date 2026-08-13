# A subclass of an immutable builtin did not survive pickling: it came back as
# the plain builtin, its class gone.
#
#     class MyInt(int): pass
#     pickle.loads(pickle.dumps(MyInt(7)))     # -> 7, an int, not a MyInt
#
# Two halves were missing.
#
# CPython dispatches pickling on the EXACT type, so a subclass instance falls
# through to __reduce_ex__; Grail dispatched with isinstance, so ``class
# MyInt(int)`` took the plain-int fast path and pickled as its raw value.  It
# had to: Grail backs one Python type with several GemStone classes -- str is
# Unicode7/Unicode16/Unicode32/String by content and origin -- so ``type(x) is
# str`` is False even for a literal.  The distinction that does hold is whether
# the class was defined by PYTHON code, which ClassDefAst already stamps.
#
# And once it falls through, the value has to be recoverable.  An immutable
# builtin's subclass carries its value in the CONSTRUCTOR, not in instance
# state, so object.__reduce_ex__'s new-style reduction hands it back as a
# __new__ argument -- which needs __getnewargs__, and Grail had none.
#
# test_enum TestSpecial.test_subclasses_without_direct_pickle_support.

import pickle

r = {}


class MyInt(int):
    pass


class MyStr(str):
    pass


class MyTup(tuple):
    pass


class MyFloat(float):
    pass


def _round(o):
    back = pickle.loads(pickle.dumps(o))
    return '%s:%r' % (type(back).__name__, back)


r['int'] = _round(MyInt(7))
r['str'] = _round(MyStr('hi'))
r['tuple'] = _round(MyTup((1, 2)))
r['float'] = _round(MyFloat(1.5))

# The plain builtins are untouched -- they keep the fast path, and their pickles
# are byte-for-byte what they were.
r['plain_int'] = _round(5)
r['plain_str'] = _round('abc')
r['plain_tuple'] = _round((1, 2))
r['plain_bool'] = _round(True)

# --- __getnewargs__ ---------------------------------------------------------------
# CPython defines it on the immutable builtins; a subclass inherits it, which is
# how the reduction learns the value.

r['getnewargs_int'] = repr(MyInt(7).__getnewargs__())
r['getnewargs_str'] = repr(MyStr('hi').__getnewargs__())
r['getnewargs_tuple'] = repr(MyTup((1, 2)).__getnewargs__())

# Extra instance state travels too, alongside the constructor argument: the
# reduction is __new__(cls, *getnewargs) followed by the state.


class Tagged(int):
    def __new__(cls, value, tag=''):
        self = int.__new__(cls, value)
        self.tag = tag
        return self


t = pickle.loads(pickle.dumps(Tagged(3, 'three')))
r['state'] = '%s:%r:%s' % (type(t).__name__, int(t), t.tag)

# A __new__ whose extra argument is REQUIRED cannot be rebuilt this way, and
# CPython cannot either -- int.__getnewargs__ reports only the value, so
# __new__ is called one argument short.  That failure is the point of
# test_enum's test_subclasses_without_direct_pickle_support, which asserts the
# TypeError and then assigns enum.pickle_by_enum_name over __reduce_ex__ to get
# around it.  Pinned as CORRECT behaviour, not as a gap.


class Demanding(int):
    def __new__(cls, value, tag):
        self = int.__new__(cls, value)
        self.tag = tag
        return self


try:
    pickle.loads(pickle.dumps(Demanding(3, 'three')))
    r['required_arg'] = 'NOT RAISED'
except TypeError as e:
    r['required_arg'] = 'TypeError'

# --- what the guard must NOT catch ------------------------------------------------
# Grail uses Symbol -- a CharacterCollection subclass -- for str-ish internal
# values, including enum's boundary constants.  It is not a Python subclass of
# str, and it must keep pickling AS a str: a name-based guard sent it down the
# subclass path and pickle then failed trying to name the Symbol class.

import enum

r['symbol'] = _round(enum.STRICT)

# An enum member that mixes in int is still a member, not a raw int -- the enum
# branch of the dispatch runs before the primitive one.


class Colour(enum.IntEnum):
    RED = 1


r['int_enum_member'] = repr(pickle.loads(pickle.dumps(Colour.RED)) is Colour.RED)

# --- KNOWN GAP, recorded rather than endorsed -------------------------------------
# list and dict subclasses still pickle as plain containers.  CPython rebuilds
# those through the reduction's listitems / dictitems, a different mechanism
# from __getnewargs__, so they are not covered here.


class MyList(list):
    pass


class MyDict(dict):
    pass


r['list_subclass_is_a_known_gap'] = _round(MyList([1, 2]))
r['dict_subclass_is_a_known_gap'] = _round(MyDict({'a': 1}))
