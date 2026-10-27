"""Fixture: a refused attribute store or delete reads as CPython's does.

A strictly slotted object has no __dict__, so a name it did not declare can be
neither stored nor deleted.  CPython's generic setattr says so --
"'A' object has no attribute 'b' and no __dict__ for setting new attributes"
-- and stamps ``name`` and ``obj`` on the error; a class with its own
__setattr__ gets the plain "has no attribute" (Objects/object.c:1989-1999).
Grail always said the plain form and stamped neither, so test_descrtut's
slotted dict subclass read differently.

A delete that misses was worse: Grail raised the bare quoted name, a
KeyError's wording, for a dict-ful object and a slotted one alike.  CPython
answers the load's message for the first, stamping nothing because an
ordinary instance keeps its attributes inline (Objects/dictobject.c:6998);
the no-__dict__ one for the second; and the bare unquoted name for an unset
slot (Python/structmember.c:168).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(fn):
    try:
        fn()
    except AttributeError as e:
        return (str(e), e.name, getattr(e, 'obj', None) is not None)
    return 'accepted'


class Slotted:
    __slots__ = ('a',)


class OwnSetattr:
    __slots__ = ('a',)

    def __setattr__(self, name, value):
        object.__setattr__(self, name, value)


class SlottedDict(dict):
    __slots__ = ['default']


class SlottedSub(Slotted):
    __slots__ = ()


class Plain:
    shared = 1


def store(o):
    return refusal(lambda: setattr(o, 'b', 1))


def delete(o):
    return refusal(lambda: delattr(o, 'b'))


NO_DICT = "'%s' object has no attribute 'b' and no __dict__ for setting new attributes"
MISSING = "'%s' object has no attribute 'b'"

r['store_slotted'] = store(Slotted())
r['store_own_setattr'] = store(OwnSetattr())
r['store_slotted_dict'] = store(SlottedDict())
r['store_slotted_sub'] = store(SlottedSub())
r['del_slotted'] = delete(Slotted())
r['del_own_setattr'] = delete(OwnSetattr())
r['del_slotted_dict'] = delete(SlottedDict())


def del_unset_slot():
    s = Slotted()
    s.a = 1
    del s.a
    del s.a


r['del_unset_slot'] = refusal(del_unset_slot)
r['declared_slot_still_works'] = (lambda s: (setattr(s, 'a', 5), s.a)[1])(Slotted())

r['del_plain_missing'] = delete(Plain())
r['del_plain_class_attr'] = refusal(lambda: delattr(Plain(), 'shared'))


def del_twice():
    p = Plain()
    p.b = 1
    del p.b
    del p.b


r['del_plain_twice'] = refusal(del_twice)
r['del_statement'] = refusal(lambda: exec('del p.b', {'p': Plain()}))

EXPECTED = {
    'store_slotted': (NO_DICT % 'Slotted', 'b', True),
    'store_own_setattr': (MISSING % 'OwnSetattr', 'b', True),
    'store_slotted_dict': (NO_DICT % 'SlottedDict', 'b', True),
    'store_slotted_sub': (NO_DICT % 'SlottedSub', 'b', True),
    'del_slotted': (NO_DICT % 'Slotted', 'b', True),
    'del_own_setattr': (MISSING % 'OwnSetattr', 'b', True),
    'del_slotted_dict': (NO_DICT % 'SlottedDict', 'b', True),
    'del_unset_slot': ('a', None, False),
    'declared_slot_still_works': 5,
    'del_plain_missing': (MISSING % 'Plain', None, False),
    'del_plain_class_attr': ("'Plain' object has no attribute 'shared'", None, False),
    'del_plain_twice': (MISSING % 'Plain', None, False),
    'del_statement': (MISSING % 'Plain', None, False),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
