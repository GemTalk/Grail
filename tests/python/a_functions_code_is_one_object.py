"""Fixture: a function's __code__ is one object, and its frames' f_code is that object.

A CPython function holds one code object: ``f.__code__ is f.__code__'', and
a frame running f has ``sys._getframe().f_code is f.__code__'' (test_sys
test_getframe asserts exactly that).  Grail built a method's code object
afresh from its class's code table at every read, so neither identity held,
and a frame's code was never its function's.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def module_function():
    return sys._getframe().f_code


def outer():
    def inner():
        return sys._getframe().f_code
    return inner


nested = outer()


class Holder:
    def method(self):
        return sys._getframe().f_code

    @classmethod
    def class_method(cls):
        return sys._getframe().f_code

    @staticmethod
    def static_method():
        return sys._getframe().f_code


r['a_module_functions_code_is_one_object'] = outcome(lambda: [
    module_function.__code__ is module_function.__code__, module_function() is module_function.__code__])
r['a_methods_code_is_one_object'] = outcome(lambda: [
    Holder.method.__code__ is Holder.method.__code__,
    Holder().method.__code__ is Holder.method.__code__,
    Holder().method() is Holder.method.__code__])
r['a_class_and_a_static_methods_too'] = outcome(lambda: [
    Holder.class_method() is Holder.class_method.__code__,
    Holder.static_method() is Holder.static_method.__code__])
r['a_nested_functions_too'] = outcome(lambda: [nested.__code__ is nested.__code__, nested() is nested.__code__])
r['a_code_object_keys_a_dict'] = outcome(lambda: {Holder.method.__code__: 'found'}.get(Holder().method()))

EXPECTED = {
    'a_module_functions_code_is_one_object': [True, True],
    'a_methods_code_is_one_object': [True, True, True],
    'a_class_and_a_static_methods_too': [True, True],
    'a_nested_functions_too': [True, True],
    'a_code_object_keys_a_dict': 'found',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
