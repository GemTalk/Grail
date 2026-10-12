# Regression fixture for #1456: a @property's value is what its getter
# returned -- CPython never runs __get__ on it.
#
# Grail passed a getter's result through the descriptor protocol, so a
# property that hands back a plain function answered that function BOUND to
# the property's own instance.  pytest's FunctionDefinition.obj is such a
# property: every ``class TestX:'' test then failed with ``Could not determine
# arguments of <bound method ... of <FunctionDefinition ...>>''.
#
# Expected values are what CPython 3.14 answers.

import inspect

RESULTS = {}


class TestClass:
    def test_method(self):
        return 'test_method ran'


class Holder:
    def __init__(self, callobj):
        self._obj = callobj

    @property
    def obj(self):
        return self._obj

    @property
    def rw(self):
        return self._obj

    @rw.setter
    def rw(self, value):
        self._obj = value

    @property
    def bound(self):
        return TestClass().test_method


class Slotted:
    __slots__ = ('_f',)

    def __init__(self, f):
        self._f = f

    @property
    def f(self):
        return self._f


def module_function(x):
    return x * 2


h = Holder(TestClass.test_method)

RESULTS['returns_the_function'] = h.obj is TestClass.test_method
RESULTS['not_bound_to_the_holder'] = getattr(h.obj, '__self__', None) is None
RESULTS['getattr_spelling'] = getattr(h, 'obj') is TestClass.test_method
RESULTS['read_write_property'] = h.rw is TestClass.test_method
RESULTS['fget_agrees'] = Holder.obj.fget(h) is h.obj
RESULTS['slotted_holder'] = Slotted(TestClass.test_method).f is TestClass.test_method
RESULTS['call_with_explicit_instance'] = h.obj(TestClass()) == 'test_method ran'
RESULTS['module_function_value'] = Holder(module_function).obj(21) == 42
RESULTS['bound_method_keeps_its_own_self'] = (
    isinstance(Holder(None).bound.__self__, TestClass)
    and Holder(None).bound() == 'test_method ran')
# pytest's question about the property's value: its parameters, self included.
RESULTS['signature_sees_self'] = list(inspect.signature(h.obj).parameters) == ['self']

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
