"""Fixture: ExceptionGroup's bases are BaseExceptionGroup and Exception.

CPython builds ExceptionGroup with two bases, (BaseExceptionGroup,
Exception) -- Objects/exceptions.c:1779-1793, create_exception_group_class
-- so its __mro__ is ExceptionGroup, BaseExceptionGroup, Exception,
BaseException, object.  It is the one builtin type with more than one base
(test_descr test_builtin_bases).  Grail's ExceptionGroup is a Smalltalk
subclass of BaseExceptionGroup and reported that one base, with no
Exception in its __mro__.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import builtins

r = {}


def names(classes):
    return [each.__name__ for each in classes]


class MyGroup(ExceptionGroup):
    pass


def caught_as_exception():
    try:
        raise ExceptionGroup('g', [ValueError(1)])
    except Exception as e:
        return [type(e).__name__, repr(e.exceptions)]


def caught_by_star():
    matched = []
    try:
        raise ExceptionGroup('g', [ValueError(1), TypeError(2)])
    except* ValueError as e:
        matched.append(names(type(each) for each in e.exceptions))
    except* TypeError as e:
        matched.append(names(type(each) for each in e.exceptions))
    return matched


r['its_bases_are_two'] = names(ExceptionGroup.__bases__)
r['its_mro_holds_exception'] = names(ExceptionGroup.__mro__)
r['mro_answers_the_same'] = ExceptionGroup.mro() == list(ExceptionGroup.__mro__)
r['a_subclass_inherits_both'] = [names(MyGroup.__bases__), names(MyGroup.__mro__)]
r['it_is_the_one_builtin_with_more_than_one_base'] = sorted(
    tp.__name__ for tp in builtins.__dict__.values()
    if isinstance(tp, type) and tp is not object and len(tp.__bases__) != 1)
r['it_is_still_an_exception'] = [issubclass(ExceptionGroup, Exception), caught_as_exception()]
r['except_star_still_splits_it'] = caught_by_star()
r['base_exception_group_still_chooses_its_class'] = [
    type(BaseExceptionGroup('b', [ValueError()])).__name__,
    type(BaseExceptionGroup('b', [KeyboardInterrupt()])).__name__]

EXPECTED = {
    'its_bases_are_two': ['BaseExceptionGroup', 'Exception'],
    'its_mro_holds_exception': ['ExceptionGroup', 'BaseExceptionGroup', 'Exception', 'BaseException', 'object'],
    'mro_answers_the_same': True,
    'a_subclass_inherits_both': [
        ['ExceptionGroup'],
        ['MyGroup', 'ExceptionGroup', 'BaseExceptionGroup', 'Exception', 'BaseException', 'object']],
    'it_is_the_one_builtin_with_more_than_one_base': ['ExceptionGroup'],
    'it_is_still_an_exception': [True, ['ExceptionGroup', '(ValueError(1),)']],
    'except_star_still_splits_it': [['ValueError'], ['TypeError']],
    'base_exception_group_still_chooses_its_class': ['ExceptionGroup', 'BaseExceptionGroup'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
