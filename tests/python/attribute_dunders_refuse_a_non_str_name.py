"""Fixture: object's and type's attribute dunders refuse a name that is no str.

CPython's generic getattr and setattr -- which object.__getattribute__,
__setattr__ and __delattr__ wrap, a delete being a set with no value --
raise TypeError, ``attribute name must be string, not 'int''', for a name
that is no str (Objects/object.c:1821-1828, 1945-1952), and so do type's
(Objects/typeobject.c:6108-6115, 6247-6254).  Grail's builtins refused it,
but the dunders read the name as the text its printString spells:
``type.__getattribute__(list, type)'' looked for an attribute 'type'
(test_descr test_type___getattribute__), and ``object.__setattr__(o, 5, 1)''
stored one called '5'.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Plain:
    pass


class Name(str):
    pass


def outcome(call):
    try:
        call()
        return 'no error'
    except Exception as error:
        return '%s: %s' % (type(error).__name__, error)


target = Plain()
r['object_getattribute'] = outcome(lambda: object.__getattribute__(target, 5))
r['object_setattr'] = outcome(lambda: object.__setattr__(target, 5, 1))
r['object_delattr'] = outcome(lambda: object.__delattr__(target, 5))
r['type_getattribute'] = outcome(lambda: type.__getattribute__(list, type))
r['type_setattr'] = outcome(lambda: type.__setattr__(Plain, 5, 1))
r['type_delattr'] = outcome(lambda: type.__delattr__(Plain, 5))
r['nothing_was_stored'] = sorted(vars(target)) + sorted(k for k in vars(Plain) if not isinstance(k, str))

object.__setattr__(target, 'kept', 1)
object.__setattr__(target, Name('named'), 2)
r['a_str_and_a_str_subclass_still_work'] = [object.__getattribute__(target, 'kept'),
                                            object.__getattribute__(target, Name('named'))]
object.__delattr__(target, 'kept')
r['a_str_still_deletes'] = sorted(vars(target))

EXPECTED = {
    'object_getattribute': "TypeError: attribute name must be string, not 'int'",
    'object_setattr': "TypeError: attribute name must be string, not 'int'",
    'object_delattr': "TypeError: attribute name must be string, not 'int'",
    'type_getattribute': "TypeError: attribute name must be string, not 'type'",
    'type_setattr': "TypeError: attribute name must be string, not 'int'",
    'type_delattr': "TypeError: attribute name must be string, not 'int'",
    'nothing_was_stored': [],
    'a_str_and_a_str_subclass_still_work': [1, 2],
    'a_str_still_deletes': ['named'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
