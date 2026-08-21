"""Defining a class runs its BODY -- not its methods.

Obvious as stated, and easy for an implementation to violate without
noticing: while a class is being created the runtime walks the names bound
in its body -- for the ``__set_name__`` protocol among other things -- and
asking "what VALUE is bound to this name" must not mean CALLING anything.
A zero-argument ``@classmethod`` is where the difference shows, because it
looks exactly like a data accessor: a name on the class, no arguments
needed, just ask.  Grail asked, so every zero-arg classmethod in a class
body RAN once at class-creation time, silently.

Three consequences pinned here:

* a zero-arg classmethod with a side effect had the side effect at import
  -- the class was never instantiated, nothing was called, and the effect
  happened anyway;
* an explicit ``@classmethod def __init_subclass__(cls)`` fired with cls =
  the class being DEFINED.  PEP 487 promises the opposite twice over: the
  hook runs for SUBCLASSES, and a class's own hook never runs for itself;
* PEP 702's ``@deprecated`` on such a class then failed its own test suite,
  because the hook had already recorded a call nobody made.

The ``__set_name__`` walk that caused this still has to work: a descriptor
in a class body must still be told its owner and name.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


# ------------------------------------------------- creation is not invocation

_creation_calls = []


class HasZeroArgClassmethods:
    @classmethod
    def zero(cls):
        _creation_calls.append('zero')
        return 42

    @classmethod
    def __init_subclass__(cls):
        _creation_calls.append('isc:%s' % cls.__name__)


check('creating_the_class_calls_nothing', lambda: list(_creation_calls), [])
check('reading_a_classmethod_calls_nothing',
      lambda: (HasZeroArgClassmethods.zero, list(_creation_calls))[1], [])
check('calling_it_still_works',
      lambda: HasZeroArgClassmethods.zero(), 42)


def _own_hook_never_runs_for_itself():
    seen = []

    class Base:
        @classmethod
        def __init_subclass__(cls):
            seen.append(cls.__name__)

    before = list(seen)

    class Sub(Base):
        pass

    return (before, seen)


check('the_own_hook_runs_only_for_subclasses',
      _own_hook_never_runs_for_itself, ([], ['Sub']))


# ------------------------------------------------- __set_name__ still works

def _set_name_still_delivered():
    told = []

    class Descriptor:
        def __set_name__(self, owner, name):
            told.append((owner.__name__, name))

        def __get__(self, obj, objtype=None):
            return 'described'

    class Holder:
        d = Descriptor()

    return (told, Holder().d)


check('set_name_is_still_delivered', _set_name_still_delivered,
      ([('Holder', 'd')], 'described'))


# ------------------------------------------------- what it was for

def _deprecated_with_explicit_classmethod_hook():
    saw = []

    @warnings.deprecated('Base will go away soon')
    class Base:
        @classmethod
        def __init_subclass__(cls):
            saw.append(cls)

    at_decoration = list(saw)
    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class C(Base):
            pass

    return (at_decoration, saw[-1] is C,
            [w.category.__name__ for w in log])


check('deprecated_with_an_explicit_classmethod_hook',
      _deprecated_with_explicit_classmethod_hook,
      ([], True, ['DeprecationWarning']))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
