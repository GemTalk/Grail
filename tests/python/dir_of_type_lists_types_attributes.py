"""Fixture: dir(type) and dir() of a metaclass list type's own attributes.

CPython keeps a class's __name__, __qualname__, __mro__, __bases__ and their
kin in type.__dict__, so dir(type) -- and dir() of any metaclass, which
inherits them -- lists them, while dir() of an ordinary class does not
(dir(str) has no __mro__).  Grail answers them from the kernel's class
protocol, which dir() deliberately does not walk for a class, so dir(type)
listed none of them.  rlcompleter adds dir(type(cls)) to a class's
completions, so it offered no ``CompleteMe.__name__'' (test_rlcompleter
test_attr_matches).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import abc
import rlcompleter

r = {}


class Meta(type):
    pass


class CompleteMe:
    spam = 1


owned = ('__base__', '__bases__', '__call__', '__module__', '__mro__', '__name__', '__or__',
         '__prepare__', '__qualname__', '__ror__', '__type_params__')
r['type_lists_them'] = [name in dir(type) for name in owned]
r['so_does_a_metaclass'] = [all(name in dir(each) for name in owned) for each in (abc.ABCMeta, Meta)]
r['every_one_reads'] = all(hasattr(type, name) for name in owned)
r['an_ordinary_class_lists_none_of_the_class_protocol'] = sorted(
    name for each in (int, str, object, CompleteMe) for name in ('__mro__', '__bases__', '__name__', '__qualname__')
    if name in dir(each))
completions = rlcompleter.Completer({'CompleteMe': CompleteMe}).attr_matches('CompleteMe.__')
r['rlcompleter_completes_them_on_a_class'] = ['CompleteMe.__name__' in completions,
                                              'CompleteMe.__new__(' in completions,
                                              all(each.startswith('CompleteMe.__') for each in completions)]

EXPECTED = {
    'type_lists_them': [True] * 11,
    'so_does_a_metaclass': [True, True],
    'every_one_reads': True,
    'an_ordinary_class_lists_none_of_the_class_protocol': [],
    'rlcompleter_completes_them_on_a_class': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-52s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
