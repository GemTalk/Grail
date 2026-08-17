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




# --- The call protocol and the bound name (step 2) --------------------------
# `type` is now the CLASS, not a BoundMethod, and is still callable in both
# spellings.  These are the properties that were False before it was one.

def report_type_object():
    t = type('NewClass', (object,), {})
    try:
        type(name='X', bases=(), dict={})
        kwargs = 'NOT RAISED'
    except TypeError:
        kwargs = 'TypeError'
    return {
        'issubclass_meta': issubclass(Meta, type),
        'isinstance_type': isinstance(type, type),
        'repr_is_class': 'class' in repr(type),
        'one_arg': type(5).__name__,
        'three_arg_name': t.__name__,
        'three_arg_isclass': isinstance(t, type),
        'kwargs_rejected': kwargs,
        # `type(cls) is type` must still hold: both the name and the canonical
        # answer moved to PyType together.
        'identity_holds': type(Plain) is type,
        # type.__dict__ is a read-only mappingproxy, which is how CPython's own
        # test_dict gets hold of the mappingproxy type.
        'dict_is_proxy': type(type.__dict__).__name__,
    }


EXPECTED_TYPE_OBJECT = {
    'issubclass_meta': True,
    'isinstance_type': True,
    'repr_is_class': True,
    'one_arg': 'int',
    'three_arg_name': 'NewClass',
    'three_arg_isclass': True,
    'kwargs_rejected': 'TypeError',
    'identity_holds': True,
    'dict_is_proxy': 'mappingproxy',
}


if __name__ == '__main__':
    got = dict(report())
    got.update(report_type_object())
    combined = dict(EXPECTED)
    combined.update(EXPECTED_TYPE_OBJECT)
    for key, expected in combined.items():
        actual = got[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(got) - set(combined)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
