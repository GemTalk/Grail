"""Fixture: real parameterised generics for a class that opts in.

Grail's default for class subscription is to collapse -- ``list[int] is
list'' -- because the vendored frameworks subscript a class in 45 places
only to use it as a base, and nothing enforces type parameters at runtime.
CPython opts INTO real ``types.GenericAlias`` objects one class at a time
(``partial.__class_getitem__ = classmethod(GenericAlias)``), and so does
Grail: functools.partial answers a real alias, everything else collapses.
"""

import functools
import typing

T = typing.TypeVar('T')


def _partial_subclass():
    """Built lazily, on purpose.

    A MODULE-SCOPE subclass of functools.partial is minted through
    importlib ___canonicalSubclassOf: and registered in the committed
    canonical registry plus GrailCanonicalClassSet.  The SUnit gate runs four
    shards concurrently as one user against one stone, so that registration
    is shared state, and adding one for a partial subclass made
    PartialCallableAndCopyTestCase's deepcopy fail in a DIFFERENT shard --
    reproducibly under the full gate, never when its shard ran alone.  A
    method-local class is minted fresh per execution and never registered,
    which is what this fixture wants anyway: nothing here is testing
    persistence.
    """
    class PySub(functools.partial):
        pass
    return PySub


def probe():
    a = functools.partial[int]
    return {
        'origin_is_partial': a.__origin__ is functools.partial,
        'args_len': len(a.__args__),
        'args_first_is_int': a.__args__[0] is int,
        'parameters': a.__parameters__,
        'repr': repr(a),
        'two_args_len': len(functools.partial[int, str].__args__),
        'typevar_parameters_len': len(functools.partial[T].__parameters__),
        'eq_same': functools.partial[int] == functools.partial[int],
        'eq_different': functools.partial[int] == functools.partial[str],
        'eq_non_alias': functools.partial[int] == 17,
        # the origin of a SUBCLASS's alias is the subclass, not partial
        'subclass_origin_is_subclass': _subclass_origin_matches(),
        # subscript erased at call time
        'call': functools.partial[int](lambda x: x + 1, 4)(),
        # and erased as a base -- __mro_entries__
        'base_call': _subclass_of_alias()(lambda x: x, 3)(),
        # list has since opted IN, so it answers a real alias
        'list_opted_in': list[int].__origin__ is list,
        # everything that did NOT opt in still collapses
        'dict_collapses': dict[str, int] is dict,
        'tuple_collapses': tuple[int] is tuple,
    }


def _subclass_of_alias():
    class Sub(functools.partial[int]):
        pass
    return Sub


def _subclass_origin_matches():
    sub = _partial_subclass()
    return sub[int].__origin__ is sub
