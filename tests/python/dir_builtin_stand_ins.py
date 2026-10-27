"""Fixture: dir() and cls.__dict__ leave out Grail's stand-ins for a builtin.

Three kinds of method answer a name on a builtin in Grail that CPython's type
does not have:

  * list's, dict's, str's (and eight more) __dict__, which serves only the
    instances of a Python SUBCLASS -- an exact list has no instance dict;
  * object's __getattr__, Grail's attribute-miss fallback -- CPython's object
    has no __getattr__;
  * a protocol refusal such as int's __iter__, which exists only to raise
    CPython's TypeError.

dir() listed all three, so dir(list) read differently from CPython's
(test_descrtut pprints it), and ``list.__dict__`` held '__dict__'.  A Python
subclass that has an instance dict still lists __dict__, from its own
namespace, as CPython's does; a slotted one does not.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

BUILTINS = (list, tuple, dict, set, frozenset, str, bytes, bytearray, complex, int, float)
SUBCLASSES = [type('Sub' + t.__name__, (t,), {}) for t in BUILTINS]


class SlottedList(list):
    __slots__ = ()


class Plain:
    pass


class OwnGetattr:
    def __getattr__(self, name):
        return 7


r['dir_list'] = dir(list)
r['builtins_list_no_dict'] = [t.__name__ for t in BUILTINS if '__dict__' in dir(t)]
r['builtin_namespaces_no_dict'] = [t.__name__ for t in BUILTINS if '__dict__' in t.__dict__]
r['exact_instances_no_dict'] = [type(v).__name__ for v in ([], (), {}, set(), 'a', b'', 1j, 1, 1.0)
                                if '__dict__' in dir(v)]
r['subclasses_list_dict'] = [c.__name__ for c in SUBCLASSES if '__dict__' not in dir(c)]
r['subclass_instance_lists_dict'] = '__dict__' in dir(SUBCLASSES[0]())
r['subclass_instance_dict_works'] = (lambda o: (setattr(o, 'x', 1), o.__dict__)[1])(SUBCLASSES[0]())
r['slotted_subclass_no_dict'] = ('__dict__' in dir(SlottedList), '__dict__' in dir(SlottedList()))
r['object_no_getattr'] = [c.__name__ for c in (object, list, int, Plain) if '__getattr__' in dir(c)]
r['instance_no_getattr'] = ('__getattr__' in dir(Plain()), '__getattr__' in dir([]))
r['own_getattr_listed'] = ('__getattr__' in dir(OwnGetattr), '__getattr__' in dir(OwnGetattr()))
r['int_refusals_unlisted'] = [n for n in ('__iter__', '__getitem__') if n in dir(int) or n in dir(1)]
r['plain_lists_dict'] = ('__dict__' in dir(Plain), '__dict__' in dir(Plain()))

EXPECTED = {
    'dir_list': [
        '__add__', '__class__', '__class_getitem__', '__contains__', '__delattr__',
        '__delitem__', '__dir__', '__doc__', '__eq__', '__format__', '__ge__',
        '__getattribute__', '__getitem__', '__getstate__', '__gt__', '__hash__',
        '__iadd__', '__imul__', '__init__', '__init_subclass__', '__iter__', '__le__',
        '__len__', '__lt__', '__mul__', '__ne__', '__new__', '__reduce__',
        '__reduce_ex__', '__repr__', '__reversed__', '__rmul__', '__setattr__',
        '__setitem__', '__sizeof__', '__str__', '__subclasshook__', 'append', 'clear',
        'copy', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort'],
    'builtins_list_no_dict': [],
    'builtin_namespaces_no_dict': [],
    'exact_instances_no_dict': [],
    'subclasses_list_dict': [],
    'subclass_instance_lists_dict': True,
    'subclass_instance_dict_works': {'x': 1},
    'slotted_subclass_no_dict': (False, False),
    'object_no_getattr': [],
    'instance_no_getattr': (False, False),
    'own_getattr_listed': (True, True),
    'int_refusals_unlisted': [],
    'plain_lists_dict': (True, True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
