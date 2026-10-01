"""A WeakSet that has been committed does not grow with dead references.

A committed weak reference reads back DEAD in every later session, and its
callback never runs there (its holder is dbTransient -- see
src/weakref/WeakReference.gs).  WeakSet.add only skipped a LIVE duplicate and
never dropped a dead entry, so a committed WeakSet re-added each member as a
fresh reference and kept the old one: Mapping._abc_cache grew from 4 entries
to 76 over 200 committed requests, and every isinstance(x, Mapping) scanned
the lot (#1229).

Driven from tests/scripts/runCommittedWeakSetTest.gs.  Running this file
directly checks the single-process half under real CPython.
"""

import weakref


class Member:
    pass


REGISTRY = weakref.WeakSet()
KEPT = [Member(), Member(), Member()]
for _m in KEPT:
    REGISTRY.add(_m)


def references_held():
    """How many weak references the set is holding, dead or alive.  Grail's
    WeakSet keeps them in ``_refs'', CPython's in ``data''."""
    return len(getattr(REGISTRY, '_refs', None) or REGISTRY.data)


def add_and_count(obj):
    """Add obj, then answer (members, references held)."""
    REGISTRY.add(obj)
    return (len(REGISTRY), references_held())


def fresh():
    return Member()


RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


if __name__ == '__main__':
    newcomer = fresh()
    check('adding_a_new_member_holds_one_reference_each', add_and_count(newcomer), (4, 4))
    check('re_adding_a_member_adds_no_reference', add_and_count(newcomer), (4, 4))
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
