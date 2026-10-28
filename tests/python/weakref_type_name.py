"""Fixture: weakref.ref names itself as CPython's ReferenceType does.

CPython's weakref.ref is the type ``weakref.ReferenceType``: __name__ and
__qualname__ 'ReferenceType', __module__ 'weakref', and ``weakref.ref[int]``
reprs from those.  Grail's Smalltalk class name, ``WeakReference``, leaked
into all of them and there was no __module__.  A Python subclass keeps its
own name.  And a weakref's repr is CPython's weakref_repr -- ``<weakref at
0x...; to 'Target' at 0x...>`` -- where Grail had none of its own.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import weakref

r = {}


class Target:
    pass


obj = Target()
ref = weakref.ref(obj)
r['names'] = [weakref.ref.__name__, weakref.ref.__qualname__, weakref.ref.__module__,
              repr(weakref.ref), repr(weakref.ref[int])]
r['identity'] = [weakref.ReferenceType is weakref.ref, type(ref) is weakref.ref, ref() is obj]
class TaggedRef(weakref.ref):
    pass


r['subclass'] = [TaggedRef.__name__, TaggedRef.__qualname__, TaggedRef.__module__ == __name__,
                 issubclass(TaggedRef, weakref.ref)]


def shape(text):
    import re
    return re.sub(r'0x[0-9a-f]+', '0x...', text)


def function(): pass


class Named: pass


dying = Target()
dead_ref = weakref.ref(dying)
del dying
__import__('gc').collect()
r['instance_repr'] = [shape(repr(ref)), shape(repr(weakref.ref(function))), shape(repr(weakref.ref(Named))),
                      shape(repr(dead_ref)) if dead_ref() is None else 'still alive']

EXPECTED = {
    'names': ['ReferenceType', 'ReferenceType', 'weakref', "<class 'weakref.ReferenceType'>",
              'weakref.ReferenceType[int]'],
    'identity': [True, True, True],
    'subclass': ['TaggedRef', 'TaggedRef', True, True],
    'instance_repr': ["<weakref at 0x...; to 'Target' at 0x...>",
                      "<weakref at 0x...; to 'function' at 0x... (function)>",
                      "<weakref at 0x...; to 'type' at 0x... (Named)>",
                      '<weakref at 0x...; dead>'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-20s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
