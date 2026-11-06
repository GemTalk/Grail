"""Fixture: a bound method is named by its function, as in CPython.

CPython's bound method answers its function's __qualname__, and its repr is
``<bound method {that qualname} of {the receiver's repr}>``
(method_repr, Objects/classobject.c), read from the function, so a callable
types.MethodType binds is named as it names itself, or ``?''.  What super()
answers is the parent's bound method, printed the same way.  The function's qualname names the
class that DEFINES it, so a method a subclass inherits reads ``Base.method``.
Grail named it by the receiver's class: ``Derived.method``.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import re
import types

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Base:
    def method(self):
        pass

    @classmethod
    def class_method(cls):
        pass


class Derived(Base):
    pass


class Overriding(Base):
    def method(self):
        pass


def nested():
    class Inner:
        def method(self):
            pass

    class InnerDerived(Inner):
        pass

    return InnerDerived()


def shown(method):
    return re.sub(r'0x[0-9a-fA-F]+', 'ADDR', repr(method)).replace(__name__ + '.', '')


r['an_inherited_method_is_named_by_its_class'] = [
    outcome(lambda: Derived().method.__qualname__), outcome(lambda: shown(Derived().method))]
r['an_overriding_method_is_named_by_its_own'] = [
    outcome(lambda: Overriding().method.__qualname__), outcome(lambda: shown(Overriding().method))]
r['a_method_of_its_own_class_is_named_by_it'] = outcome(lambda: shown(Base().method))
r['a_nested_class_keeps_its_nesting'] = outcome(lambda: nested().method.__qualname__)
r['an_inherited_classmethod_is_named_by_its_class'] = outcome(lambda: Derived.class_method.__qualname__)
r['a_builtins_method_is_named_by_its_type'] = [
    outcome(lambda: [].append.__qualname__), outcome(lambda: 'x'.lower.__qualname__)]
r['the_name_is_still_the_bare_one'] = outcome(lambda: Derived().method.__name__)


class Callable:
    def __call__(self, argument):
        pass


def method_type_reprs():
    function = Callable()
    method = types.MethodType(function, object())
    shown_reprs = [shown(method)]
    function.__name__ = 'name'
    shown_reprs.append(shown(method))
    function.__qualname__ = 'qualname'
    shown_reprs.append(shown(method))
    return shown_reprs


r['super_answers_the_parents_bound_method'] = outcome(
    lambda: shown(super(Overriding, Overriding()).method))
r['a_method_type_names_its_callable_as_it_names_itself'] = outcome(method_type_reprs)

EXPECTED = {
    'an_inherited_method_is_named_by_its_class': [
        'Base.method', '<bound method Base.method of <Derived object at ADDR>>'],
    'an_overriding_method_is_named_by_its_own': [
        'Overriding.method', '<bound method Overriding.method of <Overriding object at ADDR>>'],
    'a_method_of_its_own_class_is_named_by_it': '<bound method Base.method of <Base object at ADDR>>',
    'a_nested_class_keeps_its_nesting': 'nested.<locals>.Inner.method',
    'an_inherited_classmethod_is_named_by_its_class': 'Base.class_method',
    'a_builtins_method_is_named_by_its_type': ['list.append', 'str.lower'],
    'the_name_is_still_the_bare_one': 'method',
    'super_answers_the_parents_bound_method': '<bound method Base.method of <Overriding object at ADDR>>',
    'a_method_type_names_its_callable_as_it_names_itself': [
        '<bound method ? of <object object at ADDR>>', '<bound method name of <object object at ADDR>>',
        '<bound method qualname of <object object at ADDR>>'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
