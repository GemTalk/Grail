"""Fixture: ``obj.__class__ = NewClass`` -- an in-place TYPE CHANGE.

This is not an attribute store, and Grail does not emit it as one.  CPython
rebinds the object's type in place; Grail spells that

    object @env1:___pyChangeClassOf: (obj) to: (NewClass)

and the target travels as an ARGUMENT rather than as the receiver ON PURPOSE:
GemStone's ``changeClassTo:'' refuses an object that is ``self'' on the stack,
which is what ``(obj) __setattr__: '__class__' _: (X)'' would make it.  A
``self.__class__ = ...'' target is self on the stack however it is spelled, so
that one keeps the default path on both codegen paths and is not admitted here.

The shapes below vary the RECEIVER -- a local, a parameter, an attribute, a
subscript -- because that is the expression the type-change send has to
evaluate, and it is the only part of the statement the IR emit has any latitude
about.

The two sites in the corpus are both foreign receivers: werkzeug's
``Response.force_type`` (the documented way to re-type a response object) and
test_super's ``test___class___modification_multithreaded``.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class Base:
    def who(self):
        return 'base'


class Other(Base):
    def who(self):
        return 'other'


class H:
    def a_local_receiver(self):
        obj = Base()
        obj.__class__ = Other
        return obj.who(), type(obj).__name__

    def a_parameter_receiver(self, obj):
        obj.__class__ = Other
        return obj.who()

    def an_attribute_receiver(self):
        class Holder:
            pass
        h = Holder()
        h.inner = Base()
        h.inner.__class__ = Other
        return h.inner.who()

    def a_subscript_receiver(self):
        xs = [Base()]
        xs[0].__class__ = Other
        return xs[0].who()

    def the_werkzeug_shape(self, response):
        response.__class__ = Other
        return response.who()

    def the_change_is_visible_to_isinstance(self):
        obj = Base()
        obj.__class__ = Other
        return isinstance(obj, Other), isinstance(obj, Base)

    def a_plain_attribute_still_works(self):
        class Holder:
            pass
        h = Holder()
        h.x = 5
        return h.x


h = H()
record('a_local_receiver', h.a_local_receiver)
record('a_parameter_receiver', lambda: h.a_parameter_receiver(Base()))
record('an_attribute_receiver', h.an_attribute_receiver)
record('a_subscript_receiver', h.a_subscript_receiver)
record('the_werkzeug_shape', lambda: h.the_werkzeug_shape(Base()))
record('the_change_is_visible_to_isinstance', h.the_change_is_visible_to_isinstance)
record('a_plain_attribute_still_works', h.a_plain_attribute_still_works)


EXPECTED = {
    'a_local_receiver': ('other', 'Other'),
    'a_parameter_receiver': 'other',
    'an_attribute_receiver': 'other',
    'a_subscript_receiver': 'other',
    'the_werkzeug_shape': 'other',
    'the_change_is_visible_to_isinstance': (True, True),
    'a_plain_attribute_still_works': 5,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
