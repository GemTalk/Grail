"""Fixture: a class type() builds is judged as a class statement's is.

To CPython ``type('T', (), {})`` and ``class T: pass`` are the same kind of
class.  Grail decides two things only for a class "written entirely in
Python" (object class >> ___grailPurePythonChain___): whether a missing
``__class_getitem__`` refuses a subscript, and whether ``object.__new__`` /
``object.__init__`` refuse excess arguments, as CPython's object_new and
object_init do (Objects/typeobject.c).  It recognised only a class
statement's stamp, so a class built by type(), by a metaclass call or by
types.new_class() answered ``T[int]`` with T itself and let
``object.__new__(T, 1)`` through.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types
from typing import Generic, TypeVar

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Base:
    pass


class Meta(type):
    pass


class Hooked:
    __class_getitem__ = classmethod(types.GenericAlias)


Plain = type('Plain', (), {})
OverBase = type('OverBase', (Base,), {})
ByMetaclass = Meta('ByMetaclass', (), {})
ByNewClass = types.new_class('ByNewClass', ())

# --- no __class_getitem__: refused -------------------------------------------
r['type_built'] = outcome(lambda: Plain[int])
r['over_a_python_base'] = outcome(lambda: OverBase[int])
r['by_a_metaclass_call'] = outcome(lambda: ByMetaclass[int])
r['by_new_class'] = outcome(lambda: ByNewClass[int])

# --- a __class_getitem__ of its own or inherited: an alias -------------------
r['own_hook'] = outcome(lambda: repr(type('Own', (), {'__class_getitem__': classmethod(types.GenericAlias)})[int]))
r['inherited_hook'] = outcome(lambda: repr(type('Heir', (Hooked,), {})[int]))
r['over_dict_and_list'] = outcome(lambda: [repr(type('D', (dict,), {})[int]), repr(type('L', (list,), {})[int])])
X = TypeVar('X')
r['over_generic'] = outcome(lambda: repr(types.new_class('G', (Generic[X],))[int]))

# --- excess constructor arguments --------------------------------------------
r['no_arguments'] = outcome(lambda: Plain(1))
r['no_keyword_arguments'] = outcome(lambda: Plain(x=1))
r['object_new_refuses'] = outcome(lambda: object.__new__(Plain, 1))
r['object_new_refuses_over_a_base'] = outcome(lambda: object.__new__(OverBase, 1))
r['object_init_refuses'] = outcome(lambda: object.__init__(Plain(), 1))
r['forwarding_init'] = outcome(lambda: type('J', (), {'__init__': lambda self, *a: object.__init__(self, *a)})(1))
r['forwarding_new'] = outcome(lambda: type('K', (), {'__new__': lambda cls, *a: object.__new__(cls, *a)})(1))

# --- unchanged ---------------------------------------------------------------
r['plain_call'] = outcome(lambda: type(Plain()).__name__)
r['own_init'] = outcome(lambda: type('I', (), {'__init__': lambda self, a: setattr(self, 'a', a)})(5).a)
r['own_new'] = outcome(lambda: type(type('N', (), {'__new__': lambda cls, *a: object.__new__(cls)})(1, 2)).__name__)
r['over_builtins'] = outcome(lambda: [type('E', (Exception,), {})(1, 2).args, type('D', (dict,), {})(a=1)])


EXPECTED = {
    'type_built': "TypeError: type 'Plain' is not subscriptable",
    'over_a_python_base': "TypeError: type 'OverBase' is not subscriptable",
    'by_a_metaclass_call': "TypeError: type 'ByMetaclass' is not subscriptable",
    'by_new_class': "TypeError: type 'ByNewClass' is not subscriptable",
    'own_hook': __name__ + '.Own[int]',
    'inherited_hook': __name__ + '.Heir[int]',
    'over_dict_and_list': [__name__ + '.D[int]', __name__ + '.L[int]'],
    'over_generic': 'types.G[int]',
    'no_arguments': 'TypeError: Plain() takes no arguments',
    'no_keyword_arguments': 'TypeError: Plain() takes no arguments',
    'object_new_refuses': 'TypeError: Plain() takes no arguments',
    'object_new_refuses_over_a_base': 'TypeError: OverBase() takes no arguments',
    'object_init_refuses': 'TypeError: Plain.__init__() takes exactly one argument (the instance to initialize)',
    'forwarding_init': 'TypeError: object.__init__() takes exactly one argument (the instance to initialize)',
    'forwarding_new': 'TypeError: object.__new__() takes exactly one argument (the type to instantiate)',
    'plain_call': 'Plain',
    'own_init': 5,
    'own_new': 'N',
    'over_builtins': [(1, 2), {'a': 1}],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
