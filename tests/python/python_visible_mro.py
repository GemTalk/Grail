"""The Python-visible class chain names only classes CPython also names.

Grail roots every Python-defined class at ``PythonInstance'', the Smalltalk
class that carries the instance dictionary, the catchable-TypeError call
fallbacks and the doesNotUnderstand: bridge -- the job CPython gives to
``object''.  The kernel ``Object'' (Python's ``object'') sits directly above it,
so reporting both put a base class in ``__mro__'' that CPython does not have,
in between two that it does:

    class Plain: pass    Grail (Plain, PythonInstance, object)
                         CPython (Plain, object)

Hiding it does not merely tidy a name.  For a Python-defined class it makes
``__mro__'' EQUAL CPython's, because ``object'' already followed.

The cost of the leak was not a cosmetic one, because PythonInstance answers no
``__module__'': pydoc's TextDoc.docclass asks every base in the mro for one in
order to render the ``Method resolution order:'' block, the AttributeError was
swallowed by document()'s own ``except AttributeError: pass'', and every class
fell through to docdata.  ``help(C)'' printed a single line for every class in
the system.  inspect.getclasstree rooted its trees at PythonInstance for the
same reason.

The second half of this file is the part that had to be proved rather than
asserted: hiding a class from the REFLECTION surface must not change what the
chain DOES.  Method lookup, super(), isinstance and issubclass all walk the
Smalltalk superclass chain directly, so PythonInstance is still there for them.
"""

import inspect
from enum import Enum


class Plain:
    pass


class Mid(Plain):
    pass


class Leaf(Mid):
    pass


class A:
    pass


class B:
    pass


class MI(A, B):
    pass


class Color(Enum):
    CYAN = 1
    MAGENTA = 2


def _outer():
    class Local:
        pass
    return Local


class SBase:
    def who(self):
        return 'base'


class SSub(SBase):
    def who(self):
        return 'sub+' + super().who()


def _names(classes):
    return [c.__name__ for c in classes]


r = {}

# --- __mro__ ----------------------------------------------------------------------------
r['plain_mro'] = repr(_names(Plain.__mro__))
r['leaf_mro'] = repr(_names(Leaf.__mro__))
r['enum_mro'] = repr(_names(Color.__mro__))
r['mi_mro'] = repr(_names(MI.__mro__))
# A class defined inside a function is created by the same path; nothing about
# the elision depends on the class being module-level.
r['local_mro'] = repr(_names(_outer().__mro__))

# ``mro()'' is the callable spelling of the same linearization, so the two must
# not disagree -- they are separate methods in Grail.
r['mro_call_agrees'] = repr(_names(Plain.mro()) == _names(Plain.__mro__))
r['getmro_agrees'] = repr(_names(inspect.getmro(Leaf)) == _names(Leaf.__mro__))

# --- __bases__ / __base__ ---------------------------------------------------------------
# The direct-base reads are their own fix, not a consequence of the mro one:
# inspect.getclasstree builds its tree purely from __bases__, so it rooted every
# tree at PythonInstance while __mro__ was still being walked correctly.
r['plain_bases'] = repr(_names(Plain.__bases__))
r['leaf_bases'] = repr(_names(Leaf.__bases__))
r['mi_bases'] = repr(_names(MI.__bases__))
r['enum_base_of_enum'] = repr(Enum.__bases__[0].__name__)
r['plain_base'] = repr(Plain.__base__.__name__)
r['leaf_base'] = repr(Leaf.__base__.__name__)

# --- the chain still WORKS --------------------------------------------------------------
# Hiding a class from reflection must not hide it from dispatch.  These are the
# consumers that read the real chain: were the elision done by unlinking the
# class rather than by filtering the report, each of them would break.
r['issubclass_object'] = repr(issubclass(Leaf, object))
r['isinstance_object'] = repr(isinstance(Leaf(), object))
r['issubclass_through_gap'] = repr(issubclass(Leaf, Plain))
r['super_still_works'] = repr(SSub().who())
r['inherited_method'] = repr(hasattr(Leaf(), '__str__'))
r['enum_member_lookup'] = repr(Color['CYAN'].value)


EXPECTED = {
    'enum_base_of_enum': "'object'",
    'enum_member_lookup': '1',
    'enum_mro': "['Color', 'Enum', 'object']",
    'getmro_agrees': 'True',
    'inherited_method': 'True',
    'isinstance_object': 'True',
    'issubclass_object': 'True',
    'issubclass_through_gap': 'True',
    'leaf_base': "'Mid'",
    'leaf_bases': "['Mid']",
    'leaf_mro': "['Leaf', 'Mid', 'Plain', 'object']",
    'local_mro': "['Local', 'object']",
    'mi_bases': "['A', 'B']",
    'mi_mro': "['MI', 'A', 'B', 'object']",
    'mro_call_agrees': 'True',
    'plain_base': "'object'",
    'plain_bases': "['object']",
    'plain_mro': "['Plain', 'object']",
    'super_still_works': "'sub+base'",
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-26s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
