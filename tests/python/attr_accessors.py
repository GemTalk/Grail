# Read-accessor convention for attribute loads (GRAIL_ATTR_ACCESSORS=1), stage 3
# of the object-model refactor.
#
# With the flag on, Grail compiles a Python READ ``recv.x'' -- for a receiver
# that is not the method's own self and not a statically known module / class --
# to the direct env-1 unary send ``recv ___pyattr_x___``, against an accessor the
# class build compiled for every inferred attribute, method and class-body
# attribute; a receiver without one falls into the doesNotUnderstand hooks,
# which answer through the attribute loader.  With GRAIL_DIRECT_CALLS also on,
# a bare unary send is always a CALL, so ``mod.f()'' / ``holder.cls.m()'' are
# direct too.  None of that is visible from Python: every check below is plain
# attribute semantics, so this fixture is SELF-RUNNING
# (scripts/check_python_fixtures.sh) and measured against CPython.
# AttrAccessorsTestCase runs it with each flag combination.

import math
import sys

MODULE_CONST = 7


def zero_arg_fn():
    return 'zf'


class Plain:
    MAX = 10

    class Inner:
        def __init__(self, v):
            self.v = v

    def __init__(self):
        self.count = 0

    def foo(self, x):
        self.count += 1
        return ('foo', x)

    def zero(self):
        return 'zero'

    @classmethod
    def make_default(cls):
        return ('made', cls.__name__)

    @staticmethod
    def stat0():
        return 'stat0'

    @property
    def doubled(self):
        return self.count * 2


class Sub(Plain):
    MAX = 20

    def foo(self, x):
        return ('sub', x)


class Base:
    def __init__(self):
        self.x = 1

    def double(self):
        return self.x * 2


class PropOverBase(Base):
    @property
    def x(self):
        return 100

    @x.setter
    def x(self, v):
        self._x = v


class Fallback:
    def __getattr__(self, name):
        return ('missing', name)


class Slotted:
    __slots__ = ('a',)

    def __init__(self):
        self.a = 1


class Getter:
    def __get__(self, obj, owner):
        return ('get', obj is not None)


class WithDescriptor:
    d = Getter()


class Holder:
    cls = Plain

    def __init__(self):
        self.plain = Plain()
        self.module = math


def instance_read_inferred():
    p = Plain()
    before = p.count
    p.foo(1)
    return before == 0 and p.count == 1


def instance_read_set_from_outside():
    p = Plain()
    setattr(p, 'extra', 5)
    p.other = 6
    return p.extra == 5 and p.other == 6


def class_attr_read_via_instance_and_shadowing():
    p = Plain()
    a = p.MAX
    p.MAX = 3
    return a == 10 and p.MAX == 3 and Plain.MAX == 10


def class_attr_read_via_class_and_subclass():
    return Plain.MAX == 10 and Sub.MAX == 20 and Sub().MAX == 20


def class_read_through_dynamic_variable():
    k = Plain
    return k.MAX == 10 and k.Inner(4).v == 4


def method_as_value():
    p = Plain()
    f = p.foo
    z = p.zero
    return f(1) == ('foo', 1) and z() == 'zero' and p.count == 1


def property_read():
    p = Plain()
    p.foo(1)
    p.foo(2)
    return p.doubled == 4


def getattr_fallback():
    g = Fallback()
    return g.anything == ('missing', 'anything')


def attribute_error_on_miss():
    p = Plain()
    try:
        p.nope
    except AttributeError as e:
        return 'nope' in str(e)
    return False


def read_after_del_is_attribute_error():
    p = Plain()
    p.tmp = 1
    del p.tmp
    try:
        p.tmp
    except AttributeError:
        return True
    return False


def shadowing_method_by_instance_attribute():
    p = Plain()
    p.foo = lambda x: ('inst', x)
    return p.foo(2) == ('inst', 2) and p.foo(3) == ('inst', 3)


def subclass_override_method_read():
    s = Sub()
    f = s.foo
    return f(1) == ('sub', 1) and Sub().zero() == 'zero'


def subclass_property_over_parent_inferred():
    return PropOverBase().double() == 200 and Base().double() == 2


def module_reads_static_and_dynamic():
    m = math
    mod = sys.modules[__name__]
    return math.pi == m.pi and mod.MODULE_CONST == 7 and m.floor(2.5) == 2


def module_function_read_as_value():
    m = math
    f = m.floor
    return f(3.7) == 3


def kernel_receiver_reads():
    e = ValueError('a')
    return (1).real == 1 and e.args == ('a',) and 'ab'.__class__ is str


def kernel_receiver_reads_more():
    r = range(1, 9, 2)
    f = 1.5
    return ((3).numerator == 3 and (3).denominator == 1 and (r.start, r.stop, r.step) == (1, 9, 2)
            and f.real == 1.5 and f.imag == 0.0 and b'ab'.__class__ is bytes)


def none_receiver_is_attribute_error():
    n = None
    try:
        n.foo
    except AttributeError:
        return True
    return False


def argless_call_on_module_through_local():
    mod = sys.modules[__name__]
    p = mod.Plain()
    return mod.zero_arg_fn() == 'zf' and isinstance(p, Plain)


def argless_call_on_class_through_attribute():
    h = Holder()
    return h.cls.stat0() == 'stat0' and h.cls.make_default() == ('made', 'Plain') and h.plain.zero() == 'zero'


def argless_call_on_module_through_attribute():
    h = Holder()
    return h.module.floor(1.5) == 1 and h.module.pi > 3


def argless_call_on_stored_callable():
    p = Plain()
    p.zc = lambda: 'zc'
    return p.zc() == 'zc'


def nested_class_read_and_construct():
    p = Plain()
    return p.Inner(1).v == 1 and Plain.Inner(2).v == 2


def slotted_read_from_outside():
    s = Slotted()
    return s.a == 1


def descriptor_read():
    w = WithDescriptor()
    return w.d == ('get', True)


CHECKS = [
    instance_read_inferred,
    instance_read_set_from_outside,
    class_attr_read_via_instance_and_shadowing,
    class_attr_read_via_class_and_subclass,
    class_read_through_dynamic_variable,
    method_as_value,
    property_read,
    getattr_fallback,
    attribute_error_on_miss,
    read_after_del_is_attribute_error,
    shadowing_method_by_instance_attribute,
    subclass_override_method_read,
    subclass_property_over_parent_inferred,
    module_reads_static_and_dynamic,
    module_function_read_as_value,
    kernel_receiver_reads,
    kernel_receiver_reads_more,
    none_receiver_is_attribute_error,
    argless_call_on_module_through_local,
    argless_call_on_class_through_attribute,
    argless_call_on_module_through_attribute,
    argless_call_on_stored_callable,
    nested_class_read_and_construct,
    slotted_read_from_outside,
    descriptor_read,
]


def run_all():
    """Every check name that did not answer True (a raised exception counts as
    a failure and is reported with its class name)."""
    failed = []
    for fn in CHECKS:
        try:
            r = fn()
        except Exception as e:  # noqa: BLE001 -- report, do not hide
            r = type(e).__name__ + ': ' + str(e)
        if r is not True:
            failed.append(fn.__name__ + (' -> ' + repr(r) if r is not False else ''))
    return failed


check_count = len(CHECKS)
failures = ', '.join(run_all())


if __name__ == '__main__':
    for fn in CHECKS:
        try:
            r = fn()
        except Exception as e:  # noqa: BLE001
            r = type(e).__name__ + ': ' + str(e)
        print('%-4s %s%s' % ('OK' if r is True else 'FAIL', fn.__name__,
                             '' if r in (True, False) else '  (' + str(r) + ')'))
