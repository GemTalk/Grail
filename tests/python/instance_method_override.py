"""Fixture: an INSTANCE attribute that shadows a method, including the
self-send from inside another method of the same object.

CPython has one rule here and it is easy to state: a call ``obj.m(...)``
reads ``m`` off the instance first, so an instance attribute wins over the
class's method -- and ``self.m(...)`` inside another method is exactly that
same read, so it wins there too.  ``super().m()`` is the exception: it starts
the lookup above the instance and above the class, so an instance attribute
never affects it.

Grail has to work for that, because ``self.m(x)`` compiles to a plain
Smalltalk send, which is the hottest shape in the system; a lookup at every
call site would cost every intra-object call in the corpus whether anything
is ever patched or not.  Instead the STORE replaces the compiled method the
self-send resolves to: the original is copied under a shadow selector and a
dispatcher takes the original name, probing for an override and falling
through to the shadow when there is none (object class >>
___grailInstallSelfSendDispatchers___).  Unpatched code compiles and runs
byte-identically; the whole cost lands on the store.

The case that matters in practice is the last one.  ``mock.patch.object(obj,
'm', wraps=obj.m)`` installs an instance attribute, so a method of ``obj``
that calls ``self.m(...)`` internally has to reach the mock -- otherwise the
patch appears to work (``obj.m is the_mock`` is true) while the internal call
runs the original and the mock records nothing.  ``wraps=obj.m`` also
captures a bound method BEFORE the store and calls it from inside the
override, which is why the shadow selector is pinned: without that, the
capture re-sends by name and lands back on the dispatcher, without end.

Everything here is verified against real CPython by running the file
directly.
"""

import traceback
from unittest import mock

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class Calls:
    def inner(self, x):
        return 'class'

    def outer(self, x):
        return self.inner(x)


c = Calls()
c.inner = lambda x: 'instance'
record('read_from_outside', lambda: c.inner(1))
record('self_send_honours_the_override', lambda: c.outer(1))

# A second instance of the same class is untouched: the override is stored on
# the one object, and the dispatcher the store installed falls through to the
# shadow for everyone else.
other = Calls()
record('another_instance_is_unaffected', lambda: other.outer(1))


class NoArgs:
    def m(self):
        return 'class'

    def go(self):
        return self.m()


n = NoArgs()
n.m = lambda: 'instance'
record('zero_argument_method', lambda: n.go())

# An instance attribute is a plain function and gets NO self, where a CLASS
# attribute is found on the type and binds one.  Both are exercised, because
# the dispatcher has to tell them apart.
NoArgs.m = lambda self: 'class-attribute'
fresh = NoArgs()
record('class_attribute_binds_self', lambda: fresh.go())
record('instance_still_wins_over_class_attribute', lambda: n.go())


class Base:
    def m(self):
        return 'base'


class Sub(Base):
    def m(self):
        return 'sub'

    def via_super(self):
        return super().m()

    def via_self(self):
        return self.m()


s = Sub()
record('super_before_any_store', lambda: s.via_super())
record('self_before_any_store', lambda: s.via_self())
s.m = lambda: 'instance'
record('super_ignores_the_instance', lambda: s.via_super())
record('self_send_sees_the_instance', lambda: s.via_self())


class Deletable:
    def m(self):
        return 'class'

    def go(self):
        return self.m()


d = Deletable()
d.m = lambda: 'instance'
record('override_active', lambda: d.go())
del d.m
record('del_restores_the_class_method', lambda: d.go())


class Raiser:
    def boom(self):
        raise ValueError('original')

    def go(self):
        return self.boom()


raiser = Raiser()


def _patched_boom():
    raise KeyError('patched')


raiser.boom = _patched_boom


def _traceback_of_patched_call():
    try:
        raiser.go()
    except KeyError:
        return traceback.format_exc()
    return 'no raise'


_tb = _traceback_of_patched_call()
record('patched_exception_reaches_the_caller', lambda: 'KeyError' in _tb)
record('traceback_hides_the_shadow_selector', lambda: '___grailOrig_' in _tb)


class Service:
    def fetch(self, n):
        return 'real-%d' % n

    def run(self, n):
        return self.fetch(n)


svc = Service()


def _patched_run():
    with mock.patch.object(svc, 'fetch', wraps=svc.fetch) as m:
        result = svc.run(3)
        return (result, m.call_count)


record('patch_object_wraps_records_the_internal_call', _patched_run)
record('the_original_is_back_after_the_patch', lambda: svc.run(4))


class Untouched:
    def m(self):
        return 'u'

    def go(self):
        return self.m()


record('a_class_nobody_patched_is_unaffected', lambda: Untouched().go())


EXPECTED = {
    'read_from_outside': 'instance',
    'self_send_honours_the_override': 'instance',
    'another_instance_is_unaffected': 'class',
    'zero_argument_method': 'instance',
    'class_attribute_binds_self': 'class-attribute',
    'instance_still_wins_over_class_attribute': 'instance',
    'super_before_any_store': 'base',
    'self_before_any_store': 'sub',
    'super_ignores_the_instance': 'base',
    'self_send_sees_the_instance': 'instance',
    'override_active': 'instance',
    'del_restores_the_class_method': 'class',
    'patched_exception_reaches_the_caller': True,
    'traceback_hides_the_shadow_selector': False,
    'patch_object_wraps_records_the_internal_call': ('real-3', 1),
    'the_original_is_back_after_the_patch': 'real-4',
    'a_class_nobody_patched_is_unaffected': 'u',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
