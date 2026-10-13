"""Fixture: a function taken from the class keeps running the class's function
after an instance stores an attribute over the method's name (#1226).

CPython's rule: an instance attribute changes what a later LOOKUP of
``obj.m`` finds on that instance, and nothing else.  ``A.m(obj)``, and a
bound method captured from any instance before or after, holds the class's
function and runs it.  Only the lookup consults the instance.

Grail's ``self.m()`` is a plain send, so the first store over ``m`` installs
a dispatcher under ``m`` that probes the receiver for an override (see
instance_method_override.py).  A BoundMethod or UnboundMethod holds a
SELECTOR, and one minted after that store used to send it into the
dispatcher, which found an override stored LATER on the receiver.  So
``A.f(obj)`` ran the instance's attribute, and the wrap-a-method idiom
(``saved = obj.m; obj.m = wrapper-calling-saved``) recursed from its second
instance on, as did ``mock.patch.object(obj, 'm', wraps=obj.m)``.  Putting
the saved bound method back (``obj.m = saved``) recursed too: the
dispatcher's guard against the receiver's own bound method compared a
String with a Symbol and never fired.

The controls are the other half of the contract.  ``self.f()`` must still
see the instance override; a CLASS-level patch must still reach every later
lookup, ``A.f(obj)`` included; and ``del D.m`` must leave a fresh lookup
finding the inherited method while an earlier capture keeps D's.

Everything here is verified against real CPython by running the file
directly.
"""

from unittest import mock

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except RecursionError:
        r[key] = 'RecursionError'
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class A:
    def f(self):
        return 'method'

    def g(self):
        return self.f()


a1 = A()
saved1 = a1.f
a1.f = lambda: 'a1 attr'
record('class_function_ignores_the_instance', lambda: A.f(a1))
record('capture_before_the_store', saved1)
record('lookup_sees_the_instance', lambda: a1.f())
record('self_send_sees_the_instance', a1.g)

# A second instance, captured AFTER the first instance's store installed the
# dispatcher -- the case the old generation test got wrong.
a2 = A()
saved2 = a2.f
a2.f = lambda: 'a2 attr'
record('capture_after_another_instance_was_patched', saved2)
record('class_function_on_the_second_instance', lambda: A.f(a2))
record('an_unpatched_instance', lambda: A().g())


class Wrapped:
    def f(self):
        return 'method'


def _wrap_twice():
    out = []
    for _ in (1, 2):
        obj = Wrapped()
        saved = obj.f
        obj.f = lambda saved=saved: 'wrapper(' + saved() + ')'
        out.append(obj.f())
    return out


record('wrap_a_method_on_two_instances', _wrap_twice)


class WrappedByClass:
    def f(self):
        return 'method'


def _wrap_through_the_class():
    out = []
    for _ in (1, 2):
        obj = WrappedByClass()
        obj.f = lambda obj=obj: 'wrapper(' + WrappedByClass.f(obj) + ')'
        out.append(obj.f())
    return out


record('wrap_through_the_class_function', _wrap_through_the_class)


class Restored:
    def f(self):
        return 'method'

    def __call__(self):
        return self.f()


def _patch_then_restore():
    out = []
    for _ in (1, 2):
        obj = Restored()
        saved = obj.f
        obj.f = lambda: 'tmp'
        obj.f = saved
        out.append((obj(), obj.f(), saved()))
    return out


record('patch_then_restore_the_saved_method', _patch_then_restore)


def _store_own_bound_method():
    obj = Restored()
    obj.f = obj.f
    return (obj(), Restored.f(obj))


record('store_an_instance_its_own_bound_method', _store_own_bound_method)


class Mocked:
    def f(self, x):
        return 'real-%d' % x

    def run(self, x):
        return self.f(x)


def _mock_wraps_two_instances():
    out = []
    for n in (1, 2):
        obj = Mocked()
        with mock.patch.object(obj, 'f', wraps=obj.f) as spy:
            out.append((obj.run(n), spy.call_count))
    return out


record('mock_patch_object_wraps_on_two_instances', _mock_wraps_two_instances)


class Defaults:
    def h(self, x=1):
        return 'h%d' % x

    def go(self, x):
        return self.h(x)


def _varargs_def():
    d1 = Defaults()
    d1.h = lambda x=1: 'attr'
    d2 = Defaults()
    saved = d2.h
    d2.h = lambda x=1: 'attr2'
    return (saved(2), saved(x=3), Defaults.h(d1, 4), Defaults.h(d1, x=5),
            d2.go(6))


record('a_def_with_defaults', _varargs_def)


class Base:
    def f(self):
        return 'base'


class Sub(Base):
    pass


def _inherited():
    s1 = Sub()
    s1.f = lambda: 'attr'
    s2 = Sub()
    saved = s2.f
    s2.f = lambda: 'attr2'
    return (saved(), Sub.f(s1), Base.f(s1), Base().f())


record('an_inherited_method', _inherited)


# Controls: a CLASS-level store is a change every later lookup must see.
class Patched:
    def f(self):
        return 'method'

    def g(self):
        return self.f()


def _class_patch():
    p = Patched()
    p.f = lambda: 'instance'  # installs the dispatcher first
    q = Patched()
    before = q.f
    Patched.f = lambda self: 'class patch'
    after = q.f
    return (q.f(), q.g(), before(), after(), Patched.f(q), p.g())


record('a_class_patch_still_reaches_later_lookups', _class_patch)


class DelBase:
    def m(self):
        return 'base'


class DelSub(DelBase):
    def m(self):
        return 'sub'


def _del_after_instance_patch():
    d1 = DelSub()
    d1.m = lambda: 'attr'  # installs the dispatcher on DelSub
    captured = DelSub().m
    del DelSub.m
    return (DelSub().m(), captured(), DelSub.m(DelSub()))


record('del_after_an_instance_patch', _del_after_instance_patch)


EXPECTED = {
    'class_function_ignores_the_instance': 'method',
    'capture_before_the_store': 'method',
    'lookup_sees_the_instance': 'a1 attr',
    'self_send_sees_the_instance': 'a1 attr',
    'capture_after_another_instance_was_patched': 'method',
    'class_function_on_the_second_instance': 'method',
    'an_unpatched_instance': 'method',
    'wrap_a_method_on_two_instances': ['wrapper(method)', 'wrapper(method)'],
    'wrap_through_the_class_function': ['wrapper(method)', 'wrapper(method)'],
    'patch_then_restore_the_saved_method': [('method', 'method', 'method'),
                                            ('method', 'method', 'method')],
    'store_an_instance_its_own_bound_method': ('method', 'method'),
    'mock_patch_object_wraps_on_two_instances': [('real-1', 1), ('real-2', 1)],
    'a_def_with_defaults': ('h2', 'h3', 'h4', 'h5', 'attr2'),
    'an_inherited_method': ('base', 'base', 'base', 'base'),
    'a_class_patch_still_reaches_later_lookups': (
        'class patch', 'class patch', 'method', 'class patch', 'class patch',
        'instance'),
    'del_after_an_instance_patch': ('base', 'sub', 'base'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
