"""Fixture: ``class Meta(type)`` has ``type`` in its ancestry.

Grail had a ``type`` BUILTIN but no ``type`` OBJECT -- the name evaluated to a
BoundMethod on builtins.  A class cannot inherit from a non-class, so
ClassDefAst rooted every ``class M(type)`` at PythonInstance instead, and the
divergence notes in the vendored ports say so at each site ("Grail doesn't
expose ``type`` as a base"): django's ModelBase, MediaDefiningClass,
InstanceCheckMeta, ChoicesType and AutoFieldMeta are all demoted to plain
classes, and django's own comment records that concrete user models are
therefore unsupported.

PyType is that missing object, so a metaclass now roots at a real ``type``.

WHAT THIS FIXTURE DOES NOT CLAIM.  ``type`` is still the BoundMethod when
evaluated as a VALUE, so ``issubclass(Meta, type)`` and ``isinstance(type,
type)`` are still False here where CPython answers True.  Those move when the
name is bound to PyType, which has to happen together with giving PyType the
call protocol -- registering the name alone makes ``type('C', (), {})``
compile as a constructor call and breaks class creation (measured:
test_subclassinit test_type).  Only the agreed behaviour is asserted below.
"""


class Meta(type):
    def shout(cls):
        return 'shout'


class Plain:
    pass


def report():
    return {
        # The headline: the base is `type`, not a substitute.
        'meta_bases': [b.__name__ for b in Meta.__bases__],
        # `type` reports its Python name even though the Smalltalk class
        # behind it is called PyType.
        'type_name': type.__name__,
        # A metaclass is still an ordinary class: it can be defined, named,
        # and can carry methods.  Rooting it somewhere new must not cost that.
        'meta_name': Meta.__name__,
        'meta_is_class': isinstance(Meta, type),
        'meta_method': Meta.shout(Meta),
        # And an ordinary class is undisturbed by any of it.
        'plain_type': type(Plain).__name__,
        'plain_is_class': isinstance(Plain, type),
    }


EXPECTED = {
    'meta_bases': ['type'],
    'type_name': 'type',
    'meta_name': 'Meta',
    'meta_is_class': True,
    'meta_method': 'shout',
    'plain_type': 'type',
    'plain_is_class': True,
}


if __name__ == '__main__':
    got = report()
    for key, expected in EXPECTED.items():
        actual = got[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(got) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
