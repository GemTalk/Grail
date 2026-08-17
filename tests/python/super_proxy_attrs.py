"""Fixture: a super object's own attributes, equality, and copyability.

Three things a super proxy owes its caller, all of which Grail was missing, and
they interlock in a way worth stating up front:

1. ITS OWN STATE -- ``__self__``, ``__thisclass__``, ``__self_class__``.  These
   describe the proxy rather than naming something to look up on the parent
   chain, so they must be answered before the parent walk.  Grail ran the walk
   and reported ``'super' object has no attribute '__self__'``.

2. EQUALITY WITH THE OBJECT'S OWN BOUND METHOD.  Attribute access on a super
   object resolves against the parent chain, so ``s.__reduce__`` IS the
   underlying object's reduce -- CPython hands back the very same function, so
   the two compare equal.  A super object must not make the pickling protocol
   look different from the object's own.

3. COPYABILITY WITHOUT OWNING THE COPY PROTOCOL.  This is the interlock: super
   must be copyable while defining NO ``__reduce__``/``__copy__``/
   ``__deepcopy__`` of its own -- because by (2) those names belong to the
   underlying object.  CPython squares that circle by registering a reductor in
   ``copyreg.dispatch_table``, which is keyed by TYPE and therefore invisible to
   attribute lookup.  Grail's dispatch table was empty, so deepcopy took the
   generic path; super's state lives in Smalltalk instance variables rather than
   a Python __dict__, so it produced a NEW but EMPTY proxy -- and the emptiness
   only surfaced later, when calling a method on the copy.

Note the asymmetry in the copy protocol, which is CPython's and not an accident:
a SHALLOW copy of a super object is the object itself, while a DEEP copy is a new
proxy over a deep-copied __self__.
"""

import copy


class A:
    def f(self):
        return 'A'

    @classmethod
    def cm(cls):
        return (cls.__name__, 'A')


class C(A):
    def f(self):
        return super().f() + 'C'


class E(C):
    pass


r = {}

# --- 1. the proxy's own state, for both receiver kinds ---
e = E()
s = super(C, e)
r['self_is_the_object'] = s.__self__ is e
r['thisclass_is_the_named_class'] = s.__thisclass__ is C
r['self_class_is_the_objects_type'] = s.__self_class__ is E

sc = super(C, E)
# When __self__ IS a class, __self_class__ coincides with it.
r['class_form_self'] = sc.__self__ is E
r['class_form_self_class'] = sc.__self_class__ is E

# --- 2. equality with the object's own handles, both receiver kinds ---
r['reduce_equals_objects'] = s.__reduce__ == e.__reduce__
r['reduce_ex_equals_objects'] = s.__reduce_ex__ == e.__reduce_ex__
r['getstate_equals_objects'] = s.__getstate__ == e.__getstate__
# The class form compares against an UNBOUND handle, which Grail spells with a
# different class than the bound one -- so this exercises a second code path.
r['class_form_reduce_equals'] = sc.__reduce__ == E.__reduce__

# ...and the names super must NOT have, precisely because of the above.
for _n in ('__getnewargs__', '__getnewargs_ex__', '__setstate__',
           '__copy__', '__deepcopy__'):
    r['absent_' + _n] = not hasattr(s, _n)

# --- 3. copying ---
# Shallow: the proxy itself.
r['shallow_copy_is_identical'] = copy.copy(s) is s

# Deep: a new proxy whose __self__ was deep-copied, and which still dispatches.
e2 = E()
e2.x = [1]
s2 = super(C, e2)
u = copy.deepcopy(s2)
r['deep_copy_is_new'] = u is not s2
r['deep_copy_same_type'] = type(u) is type(s2)
r['deep_copy_dispatches'] = u.f() == s2.f()
r['deep_copy_self_is_copied'] = u.__self__ is not e2
r['deep_copy_self_type'] = type(u.__self__).__name__
r['deep_copy_state_copied'] = u.__self__.x == [1] and u.__self__.x is not e2.x
r['deep_copy_thisclass_shared'] = u.__thisclass__ is C

# --- the type itself, which is how pickle would name it by reference ---
r['type_name'] = type(s).__name__
r['type_module'] = type(s).__module__


EXPECTED = {
    'self_is_the_object': True,
    'thisclass_is_the_named_class': True,
    'self_class_is_the_objects_type': True,
    'class_form_self': True,
    'class_form_self_class': True,
    'reduce_equals_objects': True,
    'reduce_ex_equals_objects': True,
    'getstate_equals_objects': True,
    'class_form_reduce_equals': True,
    'absent___getnewargs__': True,
    'absent___getnewargs_ex__': True,
    'absent___setstate__': True,
    'absent___copy__': True,
    'absent___deepcopy__': True,
    'shallow_copy_is_identical': True,
    'deep_copy_is_new': True,
    'deep_copy_same_type': True,
    'deep_copy_dispatches': True,
    'deep_copy_self_is_copied': True,
    'deep_copy_self_type': 'E',
    'deep_copy_state_copied': True,
    'deep_copy_thisclass_shared': True,
    'type_name': 'super',
    'type_module': 'builtins',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
