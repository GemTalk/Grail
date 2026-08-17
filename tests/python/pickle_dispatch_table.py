"""Fixture: pickle honours copyreg.dispatch_table.

``copyreg.dispatch_table`` maps a TYPE to a reduction function, registered out
of band.  Being keyed by type, an entry is invisible to attribute lookup -- and
that is exactly what it is for: a type whose attribute access is a PROXY cannot
answer ``__reduce__`` for itself.

``super`` is the standard case, and the one that exposed this.  Attribute access
on a super object resolves against the parent chain, so ``s.__reduce__`` IS the
underlying object's reduce; a super object must therefore define none of
``__reduce__`` / ``__copy__`` / ``__deepcopy__``, and stays picklable purely
through its dispatch-table entry.

Grail's copy.py consulted the table; pickle.py did not.  So a registered reductor
worked for copy.deepcopy and was silently skipped when pickling -- the unpickler
built the object EMPTY and then asked it for ``__setstate__``.  Nothing reported
the skip; it surfaced as a broken object further on.

The registration is also checked here for a type the program registers ITSELF,
not just for the built-in one, since the two reach the table by different routes.
"""

import copyreg
import pickle


class A:
    def f(self):
        return 'A'


class C(A):
    def f(self):
        return super().f() + 'C'


class E(C):
    pass


class Point:
    """A type that registers its own reductor, as the re module does."""

    def __init__(self, x, y):
        self.x = x
        self.y = y


def _rebuild_point(x, y):
    return Point(x, y)


def _pickle_point(p):
    return _rebuild_point, (p.x, p.y)


copyreg.pickle(Point, _pickle_point)


r = {}

# --- the built-in registration: super ---
r['super_is_registered'] = super in copyreg.dispatch_table

e = E()
e.x = 1
s = super(C, e)
u = pickle.loads(pickle.dumps(s))
r['round_trip_type'] = type(u) is type(s)
r['round_trip_dispatches'] = u.f() == s.f()
r['round_trip_self_type'] = type(u.__self__).__name__
r['round_trip_self_state'] = u.__self__.x
r['round_trip_thisclass'] = u.__thisclass__ is C
r['round_trip_self_class'] = u.__self_class__ is E

# The class-receiver form reduces the same way.
sc = super(C, E)
uc = pickle.loads(pickle.dumps(sc))
r['class_form_self'] = uc.__self__ is E
r['class_form_thisclass'] = uc.__thisclass__ is C

# --- a program's own registration ---
p2 = pickle.loads(pickle.dumps(Point(3, 4)))
r['user_registered_type'] = type(p2).__name__
r['user_registered_state'] = (p2.x, p2.y)

# --- the guard: registering a type must not disturb unregistered ones ---
r['plain_object_still_pickles'] = pickle.loads(pickle.dumps(E())).__class__ is E
r['builtins_still_pickle'] = pickle.loads(pickle.dumps([1, 'two', (3,)]))


EXPECTED = {
    'super_is_registered': True,
    'round_trip_type': True,
    'round_trip_dispatches': True,
    'round_trip_self_type': 'E',
    'round_trip_self_state': 1,
    'round_trip_thisclass': True,
    'round_trip_self_class': True,
    'class_form_self': True,
    'class_form_thisclass': True,
    'user_registered_type': 'Point',
    'user_registered_state': (3, 4),
    'plain_object_still_pickles': True,
    'builtins_still_pickle': [1, 'two', (3,)],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
