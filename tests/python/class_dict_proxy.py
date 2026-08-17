"""Fixture: ``C.__dict__`` is a read-only mappingproxy, for EVERY class.

CPython hands back a ``mappingproxy`` for any class, not just ``type``: the
class namespace is a view you can read and not a dict you can edit.  Grail
handed back the ___classDict___ snapshot itself, so two things were wrong --
``type(C.__dict__)`` said ``dict``, and ``C.__dict__['y'] = 2`` silently
mutated a throwaway mapping instead of raising.

``type.__dict__`` was already a mappingproxy, special-cased because CPython's
own test_dict reaches through it to get hold of the mappingproxy TYPE.  That
special case is now the narrow one rather than the only one.

The instance side is the mirror image and was wrong in the opposite direction:
``obj.__dict__`` IS a dict in CPython, and Grail leaked the name of the view
class backing it (``PyInstanceDict``).
"""


class C:
    x = 1

    def m(self):
        return 'm'


class Sub(C):
    y = 2


obj = C()
obj.inst = 'i'

r = {
    # The headline: every class, not just `type`.
    'class_dict_type': type(C.__dict__).__name__,
    'subclass_dict_type': type(Sub.__dict__).__name__,
    'type_dict_type': type(type.__dict__).__name__,
    # An instance __dict__ is a plain dict, and says so.
    'instance_dict_type': type(obj.__dict__).__name__,
    # Reading through the proxy still works, and sees the class body.
    'has_attr': 'x' in C.__dict__,
    'has_method': 'm' in C.__dict__,
    'read_through': C.__dict__['x'],
    # A subclass's proxy shows its OWN namespace, not the parent's -- the
    # proxy must not be flattened across the MRO.
    'subclass_own': ['y' in Sub.__dict__, 'x' in Sub.__dict__],
    # The instance dict is still readable and writable.
    'instance_read': obj.__dict__['inst'],
}

try:
    C.__dict__['y'] = 2
    r['store_rejected'] = 'MUTATED'
except TypeError:
    r['store_rejected'] = 'TypeError'
except Exception as exc:
    r['store_rejected'] = type(exc).__name__


EXPECTED = {
    'class_dict_type': 'mappingproxy',
    'subclass_dict_type': 'mappingproxy',
    'type_dict_type': 'mappingproxy',
    'instance_dict_type': 'dict',
    'has_attr': True,
    'has_method': True,
    'read_through': 1,
    'subclass_own': [True, False],
    'instance_read': 'i',
    'store_rejected': 'TypeError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
