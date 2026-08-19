"""The enum metaclass methods carry CPython's docstrings and signatures.

Grail implements them in Smalltalk, so no FunctionDefAst ran and ClassDefAst's
___methodDocTable___ -- which captures the docstring of a class-body def -- had
nothing to capture.  Every one of them answered None, and inspect.signature
answered ``()''.  pydoc renders whatever it is handed, so ``help(Color)'' printed
bare names where CPython prints a signature and a description.

The tables are declared by hand on the enum roots, the same way
builtins_docstrings.gs and functools' ___methodSignatureTable___ are: a class
implemented in Smalltalk has to supply the metadata the compiler would otherwise
have derived from source.  The signature table drops the RECEIVER and a sibling
receiver table puts it back, which is how the bound reading renders
``__contains__(value)'' while an unbound one still shows ``cls''.

WHY THIS FILE ASSERTS THE FULL TEXT.  These strings are observable behaviour --
test_enum's test_pydoc compares help(Color) byte for byte -- so a paraphrase
would be a different answer that merely looks similar.  Running the assertions
against the host CPython is what keeps them honest as CPython edits the wording
between releases: when upstream rewords one, this file DIFFs rather than
silently drifting.

The table is keyed by NAME ONLY, which is the mechanism's one sharp edge, and
the Flag section is where it shows.  ``Flag.__contains__'' is a real
instance-side method with a different meaning and its own docstring, so Flag
declares its own table; the nearest-first walk gives a Flag member Flag's text
while a plain Enum still gets the metaclass's, and names Flag's table omits
still fall through to Enum's.
"""

import inspect
from enum import Enum, Flag, IntEnum, StrEnum
from pydoc import classify_class_attrs


class Color(Enum):
    CYAN = 1
    MAGENTA = 2


class Colour(Flag):
    RED = 1
    BLUE = 2


class Nums(IntEnum):
    ONE = 1


class Strs(StrEnum):
    A = 'a'


_META_METHODS = ('__contains__', '__getitem__', '__iter__', '__len__')


def _descriptor(cls, name):
    for a in classify_class_attrs(cls):
        if a[0] == name:
            return a[3]
    return None


r = {}

# --- docstrings on the four metaclass methods -------------------------------------------
for _n in _META_METHODS:
    r['doc_' + _n] = repr(inspect.getdoc(getattr(Color, _n)))

# --- and their signatures ---------------------------------------------------------------
# The receiver is dropped for the BOUND reading, which is the one pydoc renders.
for _n in _META_METHODS:
    r['sig_' + _n] = repr(str(inspect.signature(getattr(Color, _n))))

# --- the two member descriptors ---------------------------------------------------------
# Built from a Smalltalk getter, so there is no def-time docstring to pick up;
# it has to be supplied when the descriptor is constructed.
r['doc_name'] = repr(Enum.__dict__['name'].__doc__)
r['doc_value'] = repr(Enum.__dict__['value'].__doc__)

# --- the readonly property on the metaclass ---------------------------------------------
r['doc_members'] = repr(inspect.getdoc(_descriptor(Color, '__members__')))

# --- Flag overrides both readings, as CPython does --------------------------------------
# CPython answers Flag's text for the CLASS reading too: Flag.__contains__ finds
# the instance method on Flag's mro before it reaches the metatype.
r['flag_member_contains'] = repr(inspect.getdoc(Colour.RED.__contains__))
r['flag_member_iter'] = repr(inspect.getdoc(Colour.RED.__iter__))
r['flag_class_contains'] = repr(inspect.getdoc(Colour.__contains__))
# A name Flag's table omits still falls through to the metaclass entry.
r['flag_class_len'] = repr(inspect.getdoc(Colour.__len__))

# --- IntEnum is a separate root and names the same tables -------------------------------
# Correct for all four because ``int'' defines none of them, so CPython's lookup
# also falls through to the metatype.
r['intenum_len'] = repr(inspect.getdoc(Nums.__len__))
r['intenum_contains_sig'] = repr(str(inspect.signature(Nums.__contains__)))


# --- KNOWN GAP, recorded rather than papered over ---------------------------------------
# StrEnum is deliberately NOT given the same delegation.  ``str'' DOES define all
# four of these names, so CPython's lookup finds them on StrEnum's mro and never
# reaches the metatype -- ``StrEnum.__len__.__doc__'' is str's 'Return len(self).',
# not the metaclass's.  Handing StrEnum the enum tables would replace one wrong
# answer with a different wrong answer; the right fix is docstrings for the str
# methods, which is its own piece of work.
r['strenum_len'] = repr(inspect.getdoc(Strs.__len__))


EXPECTED = {
    'doc___contains__': repr(
        'Return True if `value` is in `cls`.\n'
        '\n'
        '`value` is in `cls` if:\n'
        '1) `value` is a member of `cls`, or\n'
        "2) `value` is the value of one of the `cls`'s members.\n"
        '3) `value` is a pseudo-member (flags)'),
    'doc___getitem__': repr('Return the member matching `name`.'),
    'doc___iter__': repr('Return members in definition order.'),
    'doc___len__': repr('Return the number of members (no aliases)'),
    'sig___contains__': repr('(value)'),
    'sig___getitem__': repr('(name)'),
    'sig___iter__': repr('()'),
    'sig___len__': repr('()'),
    'doc_name': repr('The name of the Enum member.'),
    'doc_value': repr('The value of the Enum member.'),
    'doc_members': repr(
        'Returns a mapping of member name->value.\n'
        '\n'
        'This mapping lists all enum members, including aliases.  Note that\n'
        'this is a read-only view of the internal mapping.'),
    'flag_member_contains': repr(
        'Returns True if self has at least the same flags set as other.'),
    'flag_member_iter': repr('Returns flags in definition order.'),
    'flag_class_contains': repr(
        'Returns True if self has at least the same flags set as other.'),
    'flag_class_len': repr('Return the number of members (no aliases)'),
    'intenum_len': repr('Return the number of members (no aliases)'),
    'intenum_contains_sig': repr('(value)'),
}

GRAIL_ONLY = {
    'strenum_len': 'None',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-24s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-24s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
