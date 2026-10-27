"""Fixture: a Python subclass of types.GenericAlias constructs as an alias.

CPython's ga_new (Objects/genericaliasobject.c:897) builds whatever subtype
it is handed from exactly two positionals -- origin and arguments -- and no
keywords, so ``class SubClass(GenericAlias): ...`` makes working aliases.
Grail allocated such a subclass bare: its __origin__ did not exist, and
reading it was a Smalltalk MessageNotUnderstood that no Python handler could
catch.  ``GenericAlias.__new__`` with keywords -- what a subclass's
``super().__new__(cls, *args, **kwargs)`` forwards -- dropped them, and given
only the type built the same bare alias.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from types import GenericAlias

r = {}


class SubClass(GenericAlias): ...


alias = SubClass(list, int)
pair = SubClass(dict, (str, int))
r['alias'] = [type(alias).__name__, alias.__origin__, alias.__args__, repr(alias),
              alias == list[int], pair.__args__, repr(pair)]


def refusal_of(cls, *args, **kwargs):
    try:
        cls(*args, **kwargs)
        return 'no error'
    except TypeError as e:
        return str(e)


r['refusals'] = [refusal_of(SubClass, list), refusal_of(SubClass, list, int, str),
                 refusal_of(SubClass, list, int, bad=int)]


class WithNew(GenericAlias):
    def __new__(cls, origin, args):
        return super().__new__(cls, origin, (args,))


r['with_new'] = repr(WithNew(set, bytes))


class Bad(GenericAlias):
    def __new__(cls, *args, **kwargs):
        return super().__new__(cls, *args, **kwargs)


def direct(*args, **kwargs):
    try:
        return repr(GenericAlias.__new__(*args, **kwargs))
    except TypeError as e:
        return str(e)


r['forwarded_keywords'] = [refusal_of(Bad, list, int, bad=int), repr(Bad(tuple, str)),
                           direct(GenericAlias, bad=1), direct(GenericAlias, list),
                           direct(Bad, dict, (int, str)), refusal_of(GenericAlias, list, int, str)]

EXPECTED = {
    'alias': ['SubClass', list, (int,), 'list[int]', True, (str, int), 'dict[str, int]'],
    'refusals': ['GenericAlias expected 2 arguments, got 1',
                 'GenericAlias expected 2 arguments, got 3',
                 'GenericAlias() takes no keyword arguments'],
    'with_new': 'set[bytes]',
    'forwarded_keywords': ['GenericAlias() takes no keyword arguments', 'tuple[str]',
                           'GenericAlias() takes no keyword arguments',
                           'GenericAlias expected 2 arguments, got 1', 'dict[int, str]',
                           'GenericAlias expected 2 arguments, got 3'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-10s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
