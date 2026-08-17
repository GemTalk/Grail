"""Fixture: ``super(type, obj)`` checks that obj belongs to type.

CPython's "supercheck": obj must be an instance of type, or a SUBCLASS of it
when obj is itself a type.  Otherwise TypeError, and the message says which of
the two readings failed -- that is what tells you whether you passed the wrong
object or the wrong class:

    super(type, obj): obj (instance of C) is not an instance or subtype of type (int).

Grail applied this only in the runtime constructor, never on the COMPILED path,
so ``super(type_, obj)`` written in source built a proxy that walked the wrong
chain.  The failure then surfaced later and elsewhere -- as ``'super' object has
no attribute 'method'`` from the eventual lookup, which displaces the TypeError
entirely (test_super's test_supercheck_fail).

WHY IT WAS SKIPPED, AND WHAT THE FIX HAD TO PRESERVE.  The check itself was
wrong in a way that made it unusable on the compiled path: it asked only whether
the reported MRO contained the class.  Grail reaches a cooperative mixin's
methods through the receiver's MRO, but a class merged that way is not always ON
the linearization Grail reports -- so the check rejected calls the proxy then
serviced perfectly well, and turning it on cost four Django failures.  It now
accepts the MRO *or* the Smalltalk inheritance chain, which can only ever accept
more than before.

So the mixin case below is not decoration: it is the case that made the check
impossible before, and a fix that tightens the compiled path without widening
the test would break it while still passing every rejection case here.
"""


class Base:
    def f(self):
        return 'Base'


class Mixin:
    def f(self):
        return 'Mixin+' + super(Mixin, self).f()


class Derived(Mixin, Base):
    # Mixin is reached through the C3 linearization, NOT as a Smalltalk
    # superclass -- the shape the MRO-only check got wrong.
    def f(self):
        return 'Derived+' + super(Derived, self).f()


class C:
    def method(self, type_, obj):
        return super(type_, obj).method()


r = {}

# The three rejections, with CPython's exact wording.
_c = C()
for _key, _type, _obj in (
    ('reject_unrelated_type', int, _c),
    ('reject_unrelated_instance', C, list()),
    ('reject_type_as_obj', C, list),
):
    try:
        _c.method(_type, _obj)
        r[_key] = 'NOT RAISED'
    except TypeError as exc:
        r[_key] = str(exc)

# The guard: a well-formed cooperative chain through an explicit two-arg super,
# including a mixin that is not on the plain superclass chain.
r['cooperative_mixin_chain'] = Derived().f()
r['mixin_alone'] = Mixin.f.__name__

# A subclass passed as obj is legitimate -- the "or subtype" half of the rule,
# and the case that catches a check which only understands instances.  Asserted
# as "constructs without raising" rather than through __self_class__, which Grail
# does not implement (a separate gap, and one that would make this fixture fail
# for an unrelated reason).
try:
    super(Base, Derived)
    r['subclass_as_obj_ok'] = 'constructed'
except TypeError as exc:
    r['subclass_as_obj_ok'] = 'TypeError: ' + str(exc)

# Argument 1 must be a type, and that diagnosis wins over the obj check.
try:
    super(1, int)
    r['arg1_not_a_type'] = 'NOT RAISED'
except TypeError as exc:
    r['arg1_not_a_type'] = 'TypeError' if 'must be a type' in str(exc) else str(exc)


EXPECTED = {
    'reject_unrelated_type':
        'super(type, obj): obj (instance of C) is not an instance or '
        'subtype of type (int).',
    'reject_unrelated_instance':
        'super(type, obj): obj (instance of list) is not an instance or '
        'subtype of type (C).',
    'reject_type_as_obj':
        'super(type, obj): obj (type list) is not an instance or '
        'subtype of type (C).',
    'cooperative_mixin_chain': 'Derived+Mixin+Base',
    'mixin_alone': 'f',
    'subclass_as_obj_ok': 'constructed',
    'arg1_not_a_type': 'TypeError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
