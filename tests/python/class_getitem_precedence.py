"""Who answers ``C[x]``: the metatype first, then the class's own hook.

Two independent ways the PEP 560 dispatch was being bypassed.

A METACLASS ``__getitem__`` was never consulted.  CPython evaluates
``C[int]`` as ``type(C).__getitem__(C, int)`` when the metatype defines
one, and only falls back to ``C.__class_getitem__(int)`` otherwise -- so
the metaclass outranks the class's own hook, and applies to a class with
no hook at all.  Grail RECORDS a metaclass rather than building the class
through it, so nothing made that consult happen and the metaclass hook
was dead.

A BUILT-IN's class-side subscript shortcut swallowed the dispatch for its
own subclasses.  ``dict class >> __getitem__:`` (answering the class, so
``class N(dict[str, Foo])`` works) and the ``list`` / ``functools.partial``
overrides (answering a real GenericAlias) sit on the metaclass chain
AHEAD of the dispatcher, so ``class A(dict)`` with its own
``__class_getitem__`` never ran it.  Each now defers when -- and only
when -- a hook actually exists, keeping the plain ``dict[K, V]`` and
``list[int]`` spellings on their original paths.

Every expectation was checked against CPython 3.14 first.
"""

import functools

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- the metatype comes first ------------------------------------------

class Meta(type):
    def __getitem__(cls, item):
        return 'from metaclass'


class BothDefined(metaclass=Meta):
    def __class_getitem__(cls, item):
        return 'from __class_getitem__'


class MetaclassOnly(metaclass=Meta):
    pass


check('metaclass_outranks_the_class_hook', BothDefined[int], 'from metaclass')
check('metaclass_hook_without_a_class_hook', MetaclassOnly[int],
      'from metaclass')


class PlainMeta(type):
    pass


class NoMetaclassGetitem(metaclass=PlainMeta):
    def __class_getitem__(cls, item):
        return ('class hook', item)


check('a_metaclass_without_getitem_defers',
      NoMetaclassGetitem[int], ('class hook', int))


# -- a built-in's subclass gets its own hook ---------------------------

class DictSub(dict):
    called_with = None

    def __class_getitem__(cls, item):
        cls.called_with = item
        return 'ran'


class DictSubSub(DictSub):
    pass


check('dict_subclass_hook_not_yet_run', DictSubSub.called_with, None)
check('dict_subclass_hook_runs', DictSubSub[int], 'ran')
check('dict_subclass_hook_saw_the_index', DictSubSub.called_with, int)
check('dict_subclass_hook_left_the_base_alone', DictSub.called_with, None)


class ListSub(list):
    called_with = None

    def __class_getitem__(cls, item):
        cls.called_with = item
        return 'ran'


check('list_subclass_hook_runs', ListSub[str], 'ran')
check('list_subclass_hook_saw_the_index', ListSub.called_with, str)


class PartialSub(functools.partial):
    called_with = None

    def __class_getitem__(cls, item):
        cls.called_with = item
        return 'ran'


check('partial_subclass_hook_runs', PartialSub[int], 'ran')
check('partial_subclass_hook_saw_the_index', PartialSub.called_with, int)


# -- and the plain built-in spellings are untouched --------------------

check('plain_dict_subscript_is_still_dict_ish',
      dict[str, int] is not None, True)
check('plain_list_subscript_is_an_alias', str(list[int]), 'list[int]')


class PlainDictSub(dict):
    pass


class PlainListSub(list):
    pass


check('a_dict_subclass_without_a_hook_is_unchanged',
      PlainDictSub[str, int] is not None, True)
check('a_list_subclass_without_a_hook_still_aliases',
      str(PlainListSub[int]).endswith('PlainListSub[int]'), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
