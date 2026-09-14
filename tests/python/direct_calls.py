# Direct keyword sends for attribute calls (GRAIL_DIRECT_CALLS=1), stage 2 of the
# object-model refactor.
#
# With the flag on, Grail compiles ``recv.foo(a)'' -- for a receiver it cannot
# resolve at compile time -- to the plain env-1 keyword send ``recv foo: a``, and
# recovers a miss in the doesNotUnderstand hooks by loading the attribute and
# calling it.  None of that is visible from Python: every check below is plain
# call semantics, so this fixture is SELF-RUNNING (scripts/check_python_fixtures.sh)
# and its expectations are measured against CPython.  Each probe is a
# module-level function answering True; DirectCallsTestCase runs them with the
# flag forced on and off (and on the IR path).

import math


class Plain:
    Factory = None                      # rebound below to a nested class

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

    def two(self, a, b):
        return a + b

    @classmethod
    def make(cls, v):
        return (cls.__name__, v)

    @staticmethod
    def stat(v):
        return ('stat', v)

    @property
    def handler(self):
        return lambda x: ('handler', x)

    def call_self_from_nested(self, x):
        def inner():
            return self.foo(x)          # ``self`` is a captured variable here
        return inner()

    def call_self_from_lambda(self, x):
        f = lambda: self.two(x, x)
        return f()

    def call_inherited_via_self(self):
        return self.zero()


Plain.Factory = Plain.Inner


class Sub(Plain):
    def zero(self):
        return 'sub-' + super().zero()

    def two(self, a, b):
        return super().two(a, b) * 10


class Getattr:
    def __getattr__(self, name):
        if name.startswith('dyn_'):
            return lambda *a: (name,) + a
        raise AttributeError(name)


class NotCallableHolder:
    def __init__(self):
        self.n = 5


def foreign_receiver_method():
    p = Plain()
    return p.foo(3) == ('foo', 3) and p.zero() == 'zero' and p.two(1, 2) == 3 and p.count == 1


def stored_callable_on_instance():
    p = Plain()
    p.bar = lambda x: ('bar', x)
    return p.bar(4) == ('bar', 4)


def instance_store_shadows_method():
    p = Plain()
    p.foo = lambda x: ('shadow', x)     # instance attribute wins over the class method
    ok = p.foo(1) == ('shadow', 1)
    q = Plain()
    return ok and q.foo(1) == ('foo', 1)


def class_store_shadows_method():
    class K:
        def m(self, x):
            return ('orig', x)
    k = K()
    before = k.m(1)
    K.m = lambda self, x: ('patched', x, self is k)
    after = k.m(1)
    return before == ('orig', 1) and after == ('patched', 1, True)


def getattr_returns_callable():
    g = Getattr()
    return g.dyn_thing(1, 2) == ('dyn_thing', 1, 2)


def property_returns_callable():
    p = Plain()
    return p.handler(7) == ('handler', 7)


def class_attribute_is_a_class():
    p = Plain()
    return p.Factory(9).v == 9 and p.Inner(8).v == 8


def bound_method_passed_around():
    p = Plain()
    f = p.foo
    g = Sub().zero
    return f(5) == ('foo', 5) and g() == 'sub-zero'


def wrong_arity_is_type_error():
    p = Plain()
    try:
        p.foo(1, 2)
        return False
    except TypeError:
        pass
    try:
        p.zero(1)
        return False
    except TypeError:
        pass
    try:
        p.two(1)
        return False
    except TypeError:
        return True


def missing_attribute_error_names_it():
    p = Plain()
    try:
        p.quantize(7)
        return False
    except AttributeError as e:
        one = 'quantize' in str(e) and 'Plain' in str(e)
    try:
        p.nothing()
        return False
    except AttributeError as e:
        zero = 'nothing' in str(e)
    return one and zero and not hasattr(p, 'quantize')


def not_callable_attribute_is_type_error():
    h = NotCallableHolder()
    try:
        h.n()
        return False
    except TypeError:
        return True


def kernel_receivers():
    lst = []
    lst.append(1)
    lst.extend([2, 3])
    d = {'a': 1}
    s = ' Hi '
    t = (1, 2, 2)
    st = set()
    st.add(3)
    b = b'ab'
    n = 255
    f = 2.5
    return (lst == [1, 2, 3] and lst.pop() == 3 and lst.count(1) == 1
            and d.get('a') == 1 and d.get('z') is None and list(d.keys()) == ['a']
            and d.setdefault('b', 2) == 2 and d.pop('b') == 2
            and s.upper() == ' HI ' and s.strip() == 'Hi' and s.split() == ['Hi']
            and '{}-{}'.format(1, 2) == '1-2' and s.startswith(' H') and s.find('i') == 2
            and t.count(2) == 2 and t.index(2) == 1
            and 3 in st and b.decode() == 'ab' and b.hex() == '6162'
            and n.bit_length() == 8 and f.is_integer() is False and (4.0).is_integer()
            and True.bit_length() == 1 and (3).__add__(4) == 7)


def kernel_missing_attribute():
    # Only the attribute NAME is asserted: Grail's loader still spells the
    # type as the backing Smalltalk class ('OrderedCollection' for a list) --
    # a pre-existing message defect, independent of the call shape.
    try:
        [].no_such_method(1)
        return False
    except AttributeError as e:
        a = 'no_such_method' in str(e)
    try:
        'x'.no_such()
        return False
    except AttributeError as e:
        b = 'no_such' in str(e)
    try:
        (5).no_such(1)
        return False
    except AttributeError as e:
        c = 'no_such' in str(e)
    return a and b and c


def none_receiver_is_attribute_error():
    x = None
    try:
        x.foo(1)
        return False
    except AttributeError as e:
        one = 'NoneType' in str(e) and 'foo' in str(e)
    try:
        x.foo()
        return False
    except AttributeError:
        return one


def module_through_rebound_name(m=math):
    # ``m'' is a parameter: the compiler cannot see it is a module.
    return m.floor(3.7) == 3 and m.sqrt(16) == 4.0 and callable(m.floor)


def module_missing_attribute(m=math):
    try:
        m.no_such_function(1)
        return False
    except AttributeError as e:
        return 'no_such_function' in str(e)


def nested_function_self_capture():
    p = Plain()
    return p.call_self_from_nested(2) == ('foo', 2) and p.call_self_from_lambda(3) == 6


def super_calls():
    s = Sub()
    return s.zero() == 'sub-zero' and s.two(1, 2) == 30 and s.call_inherited_via_self() == 'sub-zero'


def classmethod_and_staticmethod_via_instance():
    p = Plain()
    s = Sub()
    return (p.make(1) == ('Plain', 1) and s.make(2) == ('Sub', 2)
            and p.stat(3) == ('stat', 3) and Plain.make(4) == ('Plain', 4)
            and Plain.stat(5) == ('stat', 5))


def unbound_call_through_class():
    p = Plain()
    return Plain.foo(p, 6) == ('foo', 6) and Plain.zero(p) == 'zero'


def class_data_attribute_called_through_class():
    class Outer:
        class Inner:
            def __init__(self, v):
                self.v = v
        key = staticmethod(lambda x: x * 2)
        tag = 'T'

        @classmethod
        def via_cls(cls, v):
            return cls.Inner(v).v          # ``cls'' receiver is a class

    k = Outer
    ok = Outer.Inner(1).v == 1 and Outer.key(2) == 4 and Outer.via_cls(3) == 3
    ok = ok and k.Inner(4).v == 4 and k.key(5) == 10     # class held in a variable
    ok = ok and Outer.tag == 'T'                         # a call never turned into a store
    try:
        Outer.tag(1)
        return False
    except TypeError:
        return ok and Outer.tag == 'T'


def dunder_call_explicit():
    p = Plain()
    return p.__eq__(p) is True and p.__repr__().startswith('<') and (7).__mul__(6) == 42


def call_on_expression_receivers():
    ps = [Plain(), Plain()]
    d = {'p': Plain()}
    return ps[0].foo(1) == ('foo', 1) and d['p'].zero() == 'zero' and Plain().two(2, 3) == 5


def stored_callable_then_deleted():
    p = Plain()
    p.foo = lambda x: ('shadow', x)
    del p.foo
    return p.foo(1) == ('foo', 1)


CHECKS = [
    foreign_receiver_method,
    stored_callable_on_instance,
    instance_store_shadows_method,
    class_store_shadows_method,
    getattr_returns_callable,
    property_returns_callable,
    class_attribute_is_a_class,
    bound_method_passed_around,
    wrong_arity_is_type_error,
    missing_attribute_error_names_it,
    not_callable_attribute_is_type_error,
    kernel_receivers,
    kernel_missing_attribute,
    none_receiver_is_attribute_error,
    module_through_rebound_name,
    module_missing_attribute,
    nested_function_self_capture,
    super_calls,
    classmethod_and_staticmethod_via_instance,
    unbound_call_through_class,
    class_data_attribute_called_through_class,
    dunder_call_explicit,
    call_on_expression_receivers,
    stored_callable_then_deleted,
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
