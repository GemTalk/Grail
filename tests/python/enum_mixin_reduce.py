# Pickling a member of a MIXED-IN enum whose mixin defines its own reduce.
#
#     class NamedInt(int):
#         def __new__(cls, *args): ...        # name + value
#         def __reduce__(self): return self.__class__, self._args
#     class NEI(NamedInt, Enum):
#         y = 'the-y', 2
#
# Two things were wrong, and they compound.
#
# (1) Grail's Enum offered only __reduce__.  pickle asks for __reduce_ex__ FIRST
#     and only then falls back, and by MRO NamedInt's __reduce__ correctly beats
#     Enum's -- so the member pickled as ``(NEI, ('the-y', 2))'', NamedInt's
#     CONSTRUCTOR arguments, rather than by its value.  CPython names Enum's
#     method __reduce_ex__, where NamedInt (defining only __reduce__) does not
#     shadow it, so the member pickles by value.
#
# (2) Unpickling that then calls ``NEI('the-y', 2)'' -- and a mixin is entitled
#     to define __reduce_ex__ itself (test_subclasses_with_reduce_ex), in which
#     case it still does.  Two positionals on a member-bearing enum class are a
#     multi-value LOOKUP, but Grail refused the value-packing path whenever the
#     first argument was a string, sending it to the FUNCTIONAL API, which tried
#     to iterate the 2: ``'int' object is not iterable''.  And a mixed-in enum
#     stores member_type(*args) as the value, not the argument tuple, so the
#     lookup has to run the arguments through the constructor before it can
#     match.

import pickle
from enum import Enum

r = {}


class NamedInt(int):
    def __new__(cls, *args):
        _args = args
        name, *args = args
        if len(args) == 0:
            raise TypeError('name and value must be specified')
        self = int.__new__(cls, *args)
        self._intname = name
        self._args = _args
        return self

    def __reduce__(self):
        return self.__class__, self._args

    @property
    def __name__(self):
        return self._intname

    def __repr__(self):
        return '{}({!r}, {})'.format(
                type(self).__name__, self.__name__, int.__repr__(self))


class NEI(NamedInt, Enum):
    x = ('the-x', 1)
    y = ('the-y', 2)


# The mixin's __reduce__ stays the member's __reduce__ -- Enum must not take it
# over -- while __reduce_ex__, which pickle actually asks for, is Enum's.
r['member_reduce'] = repr(NEI.y.__reduce__())
r['member_reduce_ex'] = repr(NEI.y.__reduce_ex__(2))
r['roundtrip'] = pickle.loads(pickle.dumps(NEI.y)) is NEI.y
r['roundtrip_class'] = pickle.loads(pickle.dumps(NEI)) is NEI

# A plain instance of the mixin still uses the mixin's own reduce.
NI5 = NamedInt('test', 5)
r['plain_roundtrip'] = pickle.loads(pickle.dumps(NI5)) == 5

# --- the mixin may override __reduce_ex__ itself ------------------------------


class NamedIntEx(NamedInt):
    def __reduce_ex__(self, proto):
        return self.__class__, self._args


class NEIEx(NamedIntEx, Enum):
    x = ('the-x', 1)
    y = ('the-y', 2)


# Now the mixin's wins by MRO, so the member pickles as its CONSTRUCTOR
# arguments and unpickling is the multi-value call NEIEx('the-y', 2).
r['ex_reduce_ex'] = repr(NEIEx.y.__reduce_ex__(2))
r['ex_roundtrip'] = pickle.loads(pickle.dumps(NEIEx.y)) is NEIEx.y
r['ex_direct_call'] = NEIEx('the-y', 2) is NEIEx.y

# --- multi-value lookup and the functional API stay apart ---------------------


class Cardinal(Enum):
    RIGHT = (1, 0)
    UP = (0, 1)


# The value IS the tuple here, so the packed lookup matches directly.
r['cardinal'] = Cardinal(1, 0) is Cardinal.RIGHT
r['cardinal_tuple'] = Cardinal((0, 1)) is Cardinal.UP

# A string first argument followed by something that could BE names is still the
# functional API.
Made = Enum('Made', 'a b c')
r['functional'] = ','.join(m.name for m in Made)
MadeDict = Enum('MadeDict', {'p': 1, 'q': 2})
r['functional_dict'] = ','.join('%s=%d' % (m.name, m.value) for m in MadeDict)

# --- an ordinary enum is untouched --------------------------------------------


class Plain(Enum):
    A = 1
    B = 2


r['plain_reduce_ex'] = repr(Plain.B.__reduce_ex__(2))
r['plain_roundtrip_member'] = pickle.loads(pickle.dumps(Plain.A)) is Plain.A
