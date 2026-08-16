"""Fixture: ``type(name, bases, namespace)`` with a NON-EMPTY namespace.

The three-argument form builds a class dynamically, and the namespace holds
exactly what a class body would have bound -- data attributes and functions
alike.  Grail supported an EMPTY namespace only; a non-empty one raised
``AttributeError: 'B' object has no attribute 'z'`` from INSIDE the
constructor, so the error escaped the ``type()`` call rather than the later
read, and a Python ``try``/``except`` around the attribute could not catch it.

Two causes, one behind the other:

  * a class attribute is stored in a per-class ``dynInstVars`` holder, and a
    class built by ``type()`` had no accessor pair for it (ClassDefAst emits
    one for every class it compiles)
  * the holder needs a class-side SLOT of that name, fixed at class creation.
    Compiling an accessor without it fails, and a failed compile installs the
    codegen-gap stub -- which turned the original AttributeError into
    ``NameError: Grail could not compile this method``

This matters beyond dynamic class creation: rebuilding a class from a
namespace captured in a metaclass is how CPython's own test_super checks
``__classcell__`` propagation (``type("B", (), test_namespace)``).
"""


class Base:
    def inherited(self):
        return 'inherited'

    kind = 'base'


def method(self):
    return 'method:' + self.kind


def report():
    # Data only.
    Data = type('Data', (), {'z': 5})

    # Data and a function, which must be callable through an instance.
    WithMethod = type('WithMethod', (), {'method': method, 'kind': 'plain'})

    # A base class, plus an override of one of its attributes.
    Derived = type('Derived', (Base,), {'kind': 'derived'})

    # The empty-namespace case, which already worked and must keep working.
    Empty = type('Empty', (Base,), {})

    return {
        # Read the attribute off the class and off an instance.
        'data_on_class': Data.z,
        'data_on_instance': Data().z,
        'data_name': Data.__name__,
        # A function in the namespace becomes a callable method.
        'method_result': WithMethod().method(),
        # Bases still work, and a namespace entry overrides an inherited value.
        'derived_inherited': Derived().inherited(),
        'derived_override': Derived.kind,
        'base_untouched': Base.kind,
        # Empty namespace: unchanged behaviour.
        'empty_inherited': Empty().inherited(),
        'empty_kind': Empty.kind,
        # A later setattr on a dynamically built class also lands.
        'setattr_after': _set_after(Data),
    }


def _set_after(cls):
    cls.added = 'added'
    return cls.added


EXPECTED = {
    'data_on_class': 5,
    'data_on_instance': 5,
    'data_name': 'Data',
    'method_result': 'method:plain',
    'derived_inherited': 'inherited',
    'derived_override': 'derived',
    'base_untouched': 'base',
    'empty_inherited': 'inherited',
    'empty_kind': 'base',
    'setattr_after': 'added',
}


if __name__ == '__main__':
    got = report()
    for key, expected in EXPECTED.items():
        actual = got[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(got) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
