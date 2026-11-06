"""Fixture: the __get__ of a builtin descriptor has CPython's signature.

The descriptor types' methods carry a text signature in CPython like any
builtin's: ``object.__init__.__get__'' is a method-wrapper whose qualname is
``wrapper_descriptor.__get__'' and whose text is ``($self, instance,
owner=None, /)'', so inspect.signature answers (instance, owner=None, /) with
None for owner's default (gh-93021).  Grail's builtins carry no text of their
own, inspect reads CPython's from a generated table, and that table held only
the types builtins names and the singletons' -- no descriptor type is one --
so it answered () (test_types test_dunder_get_signature).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import inspect


r = {}


def signature_of(callable_object):
    try:
        return str(inspect.signature(callable_object))
    except (TypeError, ValueError) as error:
        return type(error).__name__


class WithAMethod:
    def method(self):
        pass


owner = inspect.signature(object.__init__.__get__).parameters['owner']
r['a_slot_wrappers_get'] = [object.__init__.__get__.__qualname__,
                            signature_of(object.__init__.__get__)]
r['its_owner_is_optional'] = [owner.default, owner.kind.name]
r['a_method_descriptors_get'] = [str.join.__get__.__qualname__, signature_of(str.join.__get__)]
r['a_class_method_descriptors_get'] = signature_of(dict.__dict__['fromkeys'].__get__)
r['a_functions_get'] = [WithAMethod.method.__get__.__qualname__,
                        signature_of(WithAMethod.method.__get__)]
r['a_builtins_own_signature_is_unchanged'] = [signature_of(len), signature_of(str.join)]

EXPECTED = {
    'a_slot_wrappers_get': ['wrapper_descriptor.__get__', '(instance, owner=None, /)'],
    'its_owner_is_optional': [None, 'POSITIONAL_ONLY'],
    'a_method_descriptors_get': ['method_descriptor.__get__', '(instance, owner=None, /)'],
    'a_class_method_descriptors_get': '(instance, owner=None, /)',
    'a_functions_get': ['function.__get__', '(instance, owner=None, /)'],
    'a_builtins_own_signature_is_unchanged': ['(obj, /)', '(self, iterable, /)'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
