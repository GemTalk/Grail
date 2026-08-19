"""Fixture: ``EnumType._convert_'' EXPORTS as well as builds.

_convert_ turns a module's C-style integer constants into a real enum.  Its
purpose is not to return a class -- it is to REPLACE the constants in the
module.  CPython finishes with:

    if as_global:  global_enum(cls)          # also updates the globals
    else:          sys.modules[cls.__module__].__dict__.update(cls.__members__)
    module_globals[name] = cls

so afterwards the module's plain ints ARE the enum's members, and the class is
bound under ``name''.

Grail built the enum and dropped it on the floor: nothing was written back, so
the constants stayed bare ints and the class name stayed undefined -- and
nothing raised while that happened.  That is precisely how CPython's socket.py
fails on Grail: it calls _convert_ four times to build AddressFamily/SocketKind
and then refers to them, so the first reference is a NameError.

The second bug here is arity.  ``filter'' is CPython's THIRD POSITIONAL
parameter -- _convert_(name, module, filter, ...) -- and every real caller
passes it that way, socket.py's four calls included.  Grail read it from
kwargs only, so filterFn came out nil, which means "no filter", which means
EVERY global in the module becomes a member.  ``filter_is_positional'' and
``unmatched_globals_stay_out'' are what pin that: without the fix the enum
would swallow the whole module namespace, which is a far louder wrong answer
than a missing one.
"""

import sys
from enum import IntEnum, IntFlag

CV_RED = 1
CV_BLUE = 2
CV_GREEN = 3
NOT_A_MEMBER = 99

# The socket.py shape exactly: filter passed POSITIONALLY, at module level.
Colour = IntEnum._convert_('Colour', __name__, lambda n: n.startswith('CV_'))

FL_ONE = 1
FL_TWO = 2
Flags = IntFlag._convert_('Flags', __name__, lambda n: n.startswith('FL_'))

KW_A = 5
KW_B = 6
ByKeyword = IntEnum._convert_('ByKeyword', __name__,
                              filter=lambda n: n.startswith('KW_'))


def class_is_bound_in_the_module():
    """module_globals[name] = cls -- the class must be reachable by name."""
    return [isinstance(Colour, type),
            hasattr(sys.modules[__name__], 'Colour'),
            'Colour' in globals()]


def constants_became_members():
    """The whole point: the module's ints are now enum members."""
    return [repr(CV_RED), repr(CV_BLUE), repr(CV_GREEN)]


def members_still_compare_as_ints():
    """IntEnum members keep int behaviour, so existing code is unaffected."""
    return [CV_RED == 1, CV_BLUE + 1 == 3, isinstance(CV_RED, int)]


def filter_is_positional():
    """socket.py's calling convention.  Reading filter from kwargs only makes
    this enum contain the entire module namespace."""
    return sorted(m.name for m in Colour)


def unmatched_globals_stay_out():
    """NOT_A_MEMBER fails the filter, so it must remain a plain int."""
    return [repr(NOT_A_MEMBER), 'NOT_A_MEMBER' not in Colour.__members__]


def keyword_filter_still_works():
    return sorted(m.name for m in ByKeyword)


def flag_type_is_honoured():
    """_convert_ builds an enum of the RECEIVER's type."""
    return [issubclass(Flags, IntFlag), sorted(m.name for m in Flags),
            repr(FL_ONE)]


def members_map_is_complete():
    return sorted(Colour.__members__)


def return_value_is_the_class():
    return Colour is sys.modules[__name__].Colour


def lookup_by_value_and_name():
    return [Colour(1).name, Colour['CV_BLUE'].value]


r = {
    'class_is_bound_in_the_module': class_is_bound_in_the_module(),
    'constants_became_members': constants_became_members(),
    'members_still_compare_as_ints': members_still_compare_as_ints(),
    'filter_is_positional': filter_is_positional(),
    'unmatched_globals_stay_out': unmatched_globals_stay_out(),
    'keyword_filter_still_works': keyword_filter_still_works(),
    'flag_type_is_honoured': flag_type_is_honoured(),
    'members_map_is_complete': members_map_is_complete(),
    'return_value_is_the_class': return_value_is_the_class(),
    'lookup_by_value_and_name': lookup_by_value_and_name(),
}


EXPECTED = {
    'class_is_bound_in_the_module': [True, True, True],
    'constants_became_members': ['<Colour.CV_RED: 1>', '<Colour.CV_BLUE: 2>',
                                 '<Colour.CV_GREEN: 3>'],
    'members_still_compare_as_ints': [True, True, True],
    'filter_is_positional': ['CV_BLUE', 'CV_GREEN', 'CV_RED'],
    'unmatched_globals_stay_out': ['99', True],
    'keyword_filter_still_works': ['KW_A', 'KW_B'],
    'flag_type_is_honoured': [True, ['FL_ONE', 'FL_TWO'], '<Flags.FL_ONE: 1>'],
    'members_map_is_complete': ['CV_BLUE', 'CV_GREEN', 'CV_RED'],
    'return_value_is_the_class': True,
    'lookup_by_value_and_name': ['CV_RED', 2],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-32s is not in EXPECTED' % ('FAIL', extra))
