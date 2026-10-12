"""Fixture: object.__getattribute__ is the generic lookup alone -- it never
calls __getattr__ (#1395).

CPython applies __getattr__ when tp_getattro raises AttributeError, but an
explicit ``object.__getattribute__(obj, name)`` IS the generic getattr, with
no __getattr__ step.  That is what makes the standard idiom work:

    def __getattr__(self, name):
        try:
            return object.__getattribute__(self, name)
        except AttributeError:
            ...

Grail's object.__getattribute__ ran the full lookup, whose miss calls
__getattr__ -- so the idiom called itself until the stack overflowed, which no
except can catch.  The controls: an ordinary miss still reaches __getattr__, a
class __getattribute__ hook whose inner object.__getattribute__ misses still
gets __getattr__ applied to its AttributeError, and existing attributes of
every kind are still found.

Everything here is verified against real CPython by running the file
directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class G:
    kind = 'class attr'

    def __init__(self):
        self.real = 'instance attr'

    @property
    def prop(self):
        return 'property'

    def method(self):
        return 'method'

    def __getattr__(self, name):
        try:
            return object.__getattribute__(self, name)
        except AttributeError:
            return 'fallback:' + name


g = G()
record('getattr_with_default', lambda: getattr(G(), 'zz', 'DEFAULT'))
record('plain_read_of_a_missing_name', lambda: g.zz)
record('hasattr_missing', lambda: hasattr(g, 'zz'))
record('existing_attributes_still_found', lambda: (
    object.__getattribute__(g, 'real'), object.__getattribute__(g, 'kind'),
    object.__getattribute__(g, 'prop'), object.__getattribute__(g, 'method')()))
record('explicit_call_outside_the_hook_raises',
       lambda: object.__getattribute__(g, 'zz'))
record('a_later_miss_still_reaches_getattr', lambda: g.later)


class Bound:
    def __getattr__(self, name):
        try:
            return self.__getattribute__(name)
        except AttributeError:
            return 'bound-fallback:' + name


record('bound_spelling', lambda: Bound().zz)


class ViaSuper:
    def __getattr__(self, name):
        try:
            return super().__getattribute__(name)
        except AttributeError:
            return 'super-fallback:' + name


record('super_spelling', lambda: ViaSuper().zz)


def _proxy_getattr(self, name):
    try:
        return object.__getattribute__(self, name)
    except AttributeError:
        return 'attr-fallback:' + name


class AttrSpelling:
    __getattr__ = _proxy_getattr


record('class_attribute_getattr', lambda: AttrSpelling().zz)


class Hooked:
    def __init__(self):
        self.x = 1

    def __getattribute__(self, name):
        return object.__getattribute__(self, name)

    def __getattr__(self, name):
        return 'hook-fallback:' + name


h = Hooked()
record('hook_miss_still_gets_getattr', lambda: (h.x, h.zz))


class Lazy:
    """The proxy shape: wrapped object first, then the proxy's own attrs."""

    def __init__(self, target):
        object.__setattr__(self, '_target', target)

    def __getattr__(self, name):
        try:
            return object.__getattribute__(self, name)
        except AttributeError:
            return getattr(object.__getattribute__(self, '_target'), name)


record('proxy_shape', lambda: (Lazy([3, 1, 2]).count(1),
                               Lazy('abc').upper(),
                               type(Lazy(1)).__name__))


EXPECTED = {
    'getattr_with_default': 'fallback:zz',
    'plain_read_of_a_missing_name': 'fallback:zz',
    'hasattr_missing': True,
    'existing_attributes_still_found': ('instance attr', 'class attr',
                                        'property', 'method'),
    'explicit_call_outside_the_hook_raises':
        "AttributeError: 'G' object has no attribute 'zz'",
    'a_later_miss_still_reaches_getattr': 'fallback:later',
    'bound_spelling': 'bound-fallback:zz',
    'super_spelling': 'super-fallback:zz',
    'class_attribute_getattr': 'attr-fallback:zz',
    'hook_miss_still_gets_getattr': (1, 'hook-fallback:zz'),
    'proxy_shape': (1, 'ABC', 'Lazy'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
