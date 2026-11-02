"""Fixture: reading an attribute of a types.GenericAlias reads it off the origin.

CPython's ga_getattro (Objects/genericaliasobject.c:690-719) answers every
attribute READ of an alias from its origin -- ``list[int].__getitem__`` is
``list.__getitem__`` -- except the alias's own (attr_exceptions:
``__origin__``, ``__args__``, ...) and the blocked ``__bases__``, ``__copy__``
and ``__deepcopy__``.  Applying an operator to the alias is not a read and
still uses the alias's type: ``list[int][str]``, ``list[int] | None``,
``repr()``, ``isinstance()``.  ga_dir lists the origin's names and the
alias's own.

Grail answered a read with the alias's own method whenever it had one, so
``list[int].__getitem__(a, 0)`` ran the alias's subscript and raised
(test_genericalias test_unbound_methods), and dir() listed the alias's class
(test_dir).  And its repr walked a list argument with an iterator, so a list
an item's repr emptied printed what was left instead of raising IndexError
(gh-143823, test_evil_repr3).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types
from typing import TypeVar

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


alias = list[int]
T = TypeVar('T')

# --- reads go to the origin ---------------------------------------------------
r['methods_are_the_origins'] = outcome(lambda: [alias.__getitem__ is list.__getitem__,
                                               alias.append is list.append,
                                               alias.__len__ is list.__len__,
                                               alias.__repr__ is list.__repr__])


def unbound_use():
    instance = alias()
    alias.append(instance, 'foo')
    return [instance, alias.__getitem__(instance, 0), alias.__len__(instance)]


r['unbound_use'] = outcome(unbound_use)
r['names_are_the_origins'] = outcome(lambda: [alias.__module__, alias.__qualname__, dict[str, int].__name__,
                                             alias.__doc__ == list.__doc__, alias.__mro__])

# --- the alias's own names, and the blocked ones -------------------------------
r['own_names'] = outcome(lambda: [alias.__origin__, alias.__args__, alias.__parameters__,
                                  alias.__class__ is types.GenericAlias, alias.__mro_entries__((alias,))])
r['blocked_bases'] = outcome(lambda: alias.__bases__)
r['blocked_copy'] = outcome(lambda: alias.__copy__)
r['blocked_deepcopy'] = outcome(lambda: alias.__deepcopy__)
r['reduce_is_the_aliases'] = outcome(lambda: alias.__reduce__())

# --- dir: the origin's names and the alias's own --------------------------------
r['dir_has_the_origins_names'] = outcome(lambda: set(dir(alias)) >= set(dir(list)))
r['dir_adds_the_own_names'] = outcome(lambda: sorted(set(dir(alias)) - set(dir(list))))
r['dir_leaves_out_the_blocked'] = outcome(lambda: [name in dir(alias) for name in
                                                   ('__bases__', '__copy__', '__deepcopy__')])

# --- operators are not reads ----------------------------------------------------
r['operators_still_the_aliases'] = outcome(lambda: [repr(alias), alias == list[int], repr(alias | None),
                                                    repr(list[T][int]), outcome(lambda: alias[str])])
r['isinstance_still_refuses'] = outcome(lambda: isinstance([], alias))


# --- a subclass of the alias forwards too ---------------------------------------
class MyAlias(types.GenericAlias):
    def label(self):
        return 'label'


sub = MyAlias(list, (int,))
r['subclass_instance_reads_the_origin'] = outcome(lambda: sub.label())
r['subclass_method_through_its_class'] = outcome(lambda: [type(sub).label(sub), repr(sub)])


# --- repr of a list argument fetches by index -----------------------------------
def repr_of_an_emptied_list():
    items = []

    class Emptier:
        def __repr__(self):
            items.clear()
            return 'x'

    items += [Emptier(), 1]
    return repr(types.GenericAlias(int, items))


r['repr_of_an_emptied_list'] = outcome(repr_of_an_emptied_list)
r['repr_of_a_list_argument'] = outcome(lambda: repr(types.GenericAlias(int, [str, ...])))


EXPECTED = {
    'methods_are_the_origins': [True, True, True, True],
    'unbound_use': [['foo'], 'foo', 1],
    'names_are_the_origins': ['builtins', 'list', 'dict', True, (list, object)],
    'own_names': [list, (int,), (), True, (list,)],
    'blocked_bases': "AttributeError: 'types.GenericAlias' object has no attribute '__bases__'",
    'blocked_copy': "AttributeError: 'types.GenericAlias' object has no attribute '__copy__'",
    'blocked_deepcopy': "AttributeError: 'types.GenericAlias' object has no attribute '__deepcopy__'",
    'reduce_is_the_aliases': (types.GenericAlias, (list, (int,))),
    'dir_has_the_origins_names': True,
    'dir_adds_the_own_names': ['__args__', '__mro_entries__', '__origin__', '__parameters__',
                               '__typing_unpacked_tuple_args__', '__unpacked__'],
    'dir_leaves_out_the_blocked': [False, False, False],
    'operators_still_the_aliases': ['list[int]', True, 'list[int] | None', 'list[int]',
                                    'TypeError: list[int] is not a generic class'],
    'isinstance_still_refuses': 'TypeError: isinstance() argument 2 cannot be a parameterized generic',
    'subclass_instance_reads_the_origin': "AttributeError: type object 'list' has no attribute 'label'",
    'subclass_method_through_its_class': ['label', 'list[int]'],
    'repr_of_an_emptied_list': 'IndexError: list index out of range',
    'repr_of_a_list_argument': 'int[[str, ...]]',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
