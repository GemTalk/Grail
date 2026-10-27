"""Fixture: a class pattern raises the TypeErrors CPython's match_class raises.

Once the isinstance test passes, CPython's match_class (Python/ceval.c)
checks what the pattern asks of the class before reading any attribute:
__match_args__ must be an exact tuple of exact strs with room for every
positional sub-pattern, and no attribute may be named twice across the
positional names and the keywords.  Grail raised the count error without the
``(N given)`` and the plural rule, and none of the others: a list
__match_args__ was indexed like a tuple, a non-str name was looked up, and a
repeated attribute was matched twice.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def error_of(match_statement):
    try:
        return match_statement()
    except TypeError as e:
        return str(e)


class C:
    __match_args__ = ('a', 'b')
    a = 1
    b = 2
    c = 3


class TakesA(C):
    __match_args__ = ('a',)


class ListArgs(C):
    __match_args__ = ['a', 'b']


class NoneArg(C):
    __match_args__ = (None,)


class Repeated(C):
    __match_args__ = ('c', 'c')


class NamedTupleArgs(C):
    __match_args__ = __import__('collections').namedtuple('T', 'x y')('a', 'b')


class StrSubclassArg(C):
    __match_args__ = (type('S', (str,), {})('a'),)


class NoArgs(C):
    __match_args__ = ()


def matched(subject, pattern_class, positional, keywords=()):
    """A class pattern on pattern_class with that many positional sub-patterns
    and those keywords, built as source so each shape is one statement."""
    arguments = ['_'] * positional + ['%s=_' % k for k in keywords]
    source = ('def check(subject):\n'
              '    match subject:\n'
              '        case %s(%s):\n'
              '            return "matched"\n'
              '    return "no match"\n') % (pattern_class.__name__, ', '.join(arguments))
    namespace = {pattern_class.__name__: pattern_class}
    exec(source, namespace)
    return error_of(lambda: namespace['check'](subject))


r['valid'] = [matched(C(), C, 2), matched(C(), C, 0, ('a', 'b')), matched(TakesA(), TakesA, 1, ('c',))]
r['too_many'] = [matched(TakesA(), TakesA, 2), matched(NoArgs(), NoArgs, 1), matched(5, int, 2)]
r['not_a_tuple'] = [matched(ListArgs(), ListArgs, 1), matched(NamedTupleArgs(), NamedTupleArgs, 1)]
r['not_strings'] = [matched(NoneArg(), NoneArg, 1), matched(StrSubclassArg(), StrSubclassArg, 1)]
r['named_twice'] = [matched(Repeated(), Repeated, 2), matched(TakesA(), TakesA, 1, ('a',))]
r['isinstance_first'] = [matched('not a C', ListArgs, 1), matched(5, NoArgs, 3)]
r['no_positional_asks_nothing'] = matched(ListArgs(), ListArgs, 0, ('a',))

EXPECTED = {
    'valid': ['matched'] * 3,
    'too_many': ['TakesA() accepts 1 positional sub-pattern (2 given)',
                 'NoArgs() accepts 0 positional sub-patterns (1 given)',
                 'int() accepts 1 positional sub-pattern (2 given)'],
    'not_a_tuple': ['ListArgs.__match_args__ must be a tuple (got list)',
                    'NamedTupleArgs.__match_args__ must be a tuple (got T)'],
    'not_strings': ['__match_args__ elements must be strings (got NoneType)',
                    '__match_args__ elements must be strings (got S)'],
    'named_twice': ["Repeated() got multiple sub-patterns for attribute 'c'",
                    "TakesA() got multiple sub-patterns for attribute 'a'"],
    'isinstance_first': ['no match', 'no match'],
    'no_positional_asks_nothing': 'matched',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-18s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
