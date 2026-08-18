# ``inspect.signature`` of an ENUM class, which CPython answers from a property
# on the enum METACLASS:
#
#     @property
#     def __signature__(cls):
#         if cls._member_names_:
#             return Signature([Parameter('values', Parameter.VAR_POSITIONAL)])
#         else:
#             return Signature([Parameter('new_class_name', POSITIONAL_ONLY),
#                               Parameter('names', POSITIONAL_OR_KEYWORD),
#                               Parameter('module', KEYWORD_ONLY, default=None),
#                               ... qualname, type, start=1, boundary=None])
#
# The split is the two things CALLING an enum can mean.  A class that HAS
# members is final, so the call is a value lookup -- ``Color(1)``, or
# ``Cardinal(1, 0)`` for a multi-value member, hence VAR_POSITIONAL.  A
# MEMBER-LESS one is still open, so the call is the functional API,
# ``Enum('Color', 'RED GREEN')``.  Grail's own class-call path draws exactly the
# same distinction on the same test (membership); this reports it.
#
# Grail had no such property, so every enum reported ``()``.  Note the general
# fix for ``signature`` of a class is a separate thing and does NOT cover this:
# the answer here does not come from __init__, __new__, or a metaclass
# __call__, it comes from an explicit __signature__ -- which signature() has
# always consulted first.
#
# test_enum TestStdLib.test_inspect_signatures is the upstream case.

import enum
import inspect
from enum import Enum, Flag, IntEnum, IntFlag, StrEnum

r = {}


class Color(Enum):
    RED = 1
    GREEN = 2


class Ints(IntEnum):
    A = 1


class Strs(StrEnum):
    A = 'a'


class Flags(IntFlag):
    X = 1


class Empty(Enum):
    pass


_functional = ('(new_class_name, /, names, *, module=None, qualname=None,'
               ' type=None, start=1, boundary=None)')

r['enum_base'] = str(inspect.signature(Enum))
r['flag_base'] = str(inspect.signature(Flag))
r['member_bearing'] = str(inspect.signature(Color))
r['int_rooted'] = str(inspect.signature(Ints))
r['str_rooted'] = str(inspect.signature(Strs))
r['flag_rooted'] = str(inspect.signature(Flags))
r['member_less_subclass'] = str(inspect.signature(Empty))
r['stdlib_boundary'] = str(inspect.signature(enum.FlagBoundary))

# It is a real Signature, not a rendered string: the test upstream compares it
# against one built by hand out of Parameters.
_sig = inspect.signature(Color)
r['is_signature'] = isinstance(_sig, inspect.Signature)
r['param_names'] = [p for p in _sig.parameters]
r['param_kind'] = str(_sig.parameters['values'].kind)
r['equals_handmade'] = _sig == inspect.Signature(
    [inspect.Parameter('values', inspect.Parameter.VAR_POSITIONAL)])

# A NON-enum class must be untouched by the metaclass property: it answers from
# its own __init__, and a class that defines __signature__ as an ordinary
# method must still hand back the method rather than calling it.
class Plain:
    def __init__(self, a, b=2):
        pass


class OwnSignatureMethod:
    def __signature__(self):
        return 'not a signature'


r['plain_class'] = str(inspect.signature(Plain))
r['own_method_not_called'] = callable(OwnSignatureMethod.__signature__)


EXPECTED = {
    'enum_base': repr(_functional),
    'equals_handmade': 'True',
    'flag_base': repr(_functional),
    'flag_rooted': "'(*values)'",
    'int_rooted': "'(*values)'",
    'is_signature': 'True',
    'member_bearing': "'(*values)'",
    'member_less_subclass': repr(_functional),
    'own_method_not_called': 'True',
    'param_kind': "'VAR_POSITIONAL'",
    'param_names': "['values']",
    'plain_class': "'(a, b=2)'",
    'stdlib_boundary': "'(*values)'",
    'str_rooted': "'(*values)'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-24s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
