# enum's two module-level pickling helpers, and the three things they needed.
#
# ``enum._reduce_ex_by_global_name'' is assigned OVER a class's __reduce_ex__ and
# ``enum._make_class_unpicklable(obj)'' replaces that method with one that
# raises, so both are plain functions taking self first.  Neither existed.
#
# (1) A module attribute implemented in Smalltalk answers a BoundMethod on the
#     module, and Grail deliberately does NOT bind those through the descriptor
#     protocol -- one on a Smalltalk-implemented module models a C function, and
#     a C function is not a descriptor.  CPython's are pure Python, so these are
#     exposed as UnboundMethods (``Cls.method'' -- a plain function taking self
#     first) rather than as an exception to that rule.
#
# (2) pickle swallowed EVERY exception from __reduce_ex__ and treated it as "no
#     reduce available".  A __reduce_ex__ that raises is how an object declares
#     itself unpicklable, which is the whole point of _make_class_unpicklable:
#     the TypeError became a PicklingError about the wrong object.
#
# (3) A functional-API enum had no per-class attribute store at all -- no
#     ``dynInstVars'' classInstVar, which ClassDefAst emits for a class-SYNTAX
#     class -- so every ``setattr(E, ...)'' raised AttributeError and E.__module__
#     did not exist.  The ``module='' keyword was accepted and ignored, and that
#     is the name pickle resolves a class BY.
#
# test_enum test_pickle_by_name and test_pickle_explodes.

import enum
import pickle
from enum import Enum, IntEnum

r = {}

# The two class-SYNTAX enums that get MUTATED are built inside functions on
# purpose.  A module-level class in a DEPLOYED module is canonical (committed and
# shared), and a runtime class-attribute store on one of those is deliberately
# routed to a session-local overlay -- which the instance-side read path does not
# consult, and which ``__module__'' misses as well.  That is a separate gap in
# the overlay, noted rather than worked around silently; the enums under test are
# local so this fixture measures the helpers and not that.

# --- _reduce_ex_by_global_name ------------------------------------------------


def _by_name_case():
    class ReplaceGlobalInt(IntEnum):
        ONE = 1
        TWO = 2

    ReplaceGlobalInt.__reduce_ex__ = enum._reduce_ex_by_global_name
    return (ReplaceGlobalInt.TWO.__reduce_ex__(0),
            ','.join(ReplaceGlobalInt.ONE.__reduce_ex__(p) for p in range(3)))


r['by_name'], r['by_name_protos'] = _by_name_case()

# --- _make_class_unpicklable on a CLASS-SYNTAX enum ---------------------------


def _class_syntax_case():
    class ClassSyntax(Enum):
        dill = 1
        sweet = 2

    enum._make_class_unpicklable(ClassSyntax)
    out = {'module': ClassSyntax.__module__}
    try:
        pickle.dumps(ClassSyntax.dill)
        out['member'] = 'NOT RAISED'
    except TypeError as e:
        out['member'] = 'TypeError: %s' % (e,)
    except BaseException as e:
        out['member'] = 'OTHER %s' % (type(e).__name__,)
    try:
        pickle.dumps(ClassSyntax)
        out['class'] = 'NOT RAISED'
    except pickle.PicklingError:
        out['class'] = 'PicklingError'
    except BaseException as e:
        out['class'] = 'OTHER %s' % (type(e).__name__,)
    return out


_cs = _class_syntax_case()
r['cs_module'] = _cs['module']
r['cs_member'] = _cs['member']
r['cs_class'] = _cs['class']

# --- and on a FUNCTIONAL-API enum, which is what test_pickle_explodes uses ----

BadPickle = Enum('BadPickle', 'dill sweet bread-n-butter', module=__name__)

r['fn_module_from_kwarg'] = (BadPickle.__module__ == __name__)

enum._make_class_unpicklable(BadPickle)

r['fn_module'] = BadPickle.__module__
try:
    pickle.dumps(BadPickle.dill)
    r['fn_member'] = 'NOT RAISED'
except TypeError as e:
    r['fn_member'] = 'TypeError: %s' % (e,)
except BaseException as e:
    r['fn_member'] = 'OTHER %s' % (type(e).__name__,)
try:
    pickle.dumps(BadPickle)
    r['fn_class'] = 'NOT RAISED'
except pickle.PicklingError:
    r['fn_class'] = 'PicklingError'
except BaseException as e:
    r['fn_class'] = 'OTHER %s' % (type(e).__name__,)

# --- a functional enum is an ORDINARY class: setattr works --------------------

Plain = Enum('Plain', 'a b', module=__name__)
Plain.extra = 'stuck'
r['fn_setattr'] = Plain.extra
r['fn_members_intact'] = ','.join(m.name for m in Plain)

# --- a raising __reduce_ex__ propagates for a NON-enum object too -------------


class Stubborn:
    def __reduce_ex__(self, proto):
        raise TypeError('no thank you')


try:
    pickle.dumps(Stubborn())
    r['stubborn'] = 'NOT RAISED'
except TypeError as e:
    r['stubborn'] = 'TypeError: %s' % (e,)
except BaseException as e:
    r['stubborn'] = 'OTHER %s' % (type(e).__name__,)

# --- ordinary enum pickling is untouched --------------------------------------


class Fine(Enum):
    RED = 1
    BLUE = 2


r['roundtrip'] = pickle.loads(pickle.dumps(Fine.BLUE)) is Fine.BLUE
r['roundtrip_class'] = pickle.loads(pickle.dumps(Fine)) is Fine
