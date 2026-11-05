# ``collections.namedtuple('T', ...)`` builds a class and names it after the
# typename it was asked for.  Grail's factory could not: the class STATEMENT
# inside the factory can only be spelled one way, so every namedtuple was
# literally called ``_NT``.
#
# That showed up in the repr of subclasses and in error messages, and it made
# the result impossible to pickle -- pickle saves a class by looking its name
# back up, and ``collections._NT`` is not where it lives.  No Grail namedtuple
# could be pickled at all.
#
# The fix needs ``cls.__name__`` to be writable, which it is in CPython and was
# not here: the class-side read performs a getter that derives the name from the
# Smalltalk class rather than looking for a stored one, so the store went
# nowhere -- the same shape as the __qualname__ gap fixed alongside it.
#
# test_enum TestSpecial.test_tuple_subclass_with_auto_1 / _2.

import pickle
from collections import namedtuple

r = {}

T = namedtuple('T', 'index desc')

r['name'] = T.__name__
r['qualname'] = T.__qualname__

t = T(1, 'for the money')
r['repr'] = repr(t)
r['fields'] = repr(T._fields)

# A real subclass has its own name, and reports it.


class Extended(T):
    pass


r['subclass_repr'] = repr(Extended(2, 'for the show'))
r['subclass_name'] = Extended.__name__

# --- what the naming is FOR: pickling ---------------------------------------------

r['roundtrip'] = repr(pickle.loads(pickle.dumps(t)))
r['roundtrip_equal'] = repr(pickle.loads(pickle.dumps(t)) == t)
r['roundtrip_class'] = repr(pickle.loads(pickle.dumps(T)) is T)

# The two names are INDEPENDENT: CPython leaves __qualname__ alone when
# __name__ is assigned, and vice versa.  Built inside a function because a
# module-level class is canonical -- the registry hands the same object back on
# the next import, so a mutation would leak into the following test.


def _pair():
    class Pair:
        pass
    return Pair


P1 = _pair()
P1.__name__ = 'Renamed'
r['renamed_name'] = P1.__name__
r['renamed_qualname_unchanged'] = P1.__qualname__

P2 = _pair()
P2.__qualname__ = 'Outer.Pair'
r['requalified_qualname'] = P2.__qualname__
r['requalified_name_unchanged'] = P2.__name__

# --- __module__ -------------------------------------------------------------------
# CPython defaults it to the CALLER's module (sys._getframemodulename(1), else
# the caller frame's globals) and, when it cannot work that out, leaves it
# alone rather than guessing.  Grail reads the caller's frame too, so a
# namedtuple belongs to the module that made it -- which is also where pickle
# looks it up by name, and why the round-trips above pass.  It used to be None,
# a gap recorded here.

r['module_default'] = repr(T.__module__)
r['module_is_the_callers'] = repr(T.__module__ == __name__)

# An explicit module= still wins, as upstream.
M = namedtuple('M', 'a', module='some.where')
r['module_explicit'] = M.__module__
