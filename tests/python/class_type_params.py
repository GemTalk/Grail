# PEP 695 type parameters on a CLASS: ``class A[T]'' must answer ``(T,)'' from
# __type_params__, where T is a typing.TypeVar.
#
# Grail's class parser called skipTypeParams -- which already ANSWERS the names,
# because the def parser has stored them since f.__type_params__ became
# observable -- and threw the answer away, setting an empty array.  So the names
# were gone before codegen could record them and the attribute did not exist.
#
# THE TYPEVARS ARE BUILT ON FIRST READ, and that laziness is the design rather
# than an optimisation.  Materialising one means importing typing, and typing
# defines its own generic classes (``SupportsAbs[T]'', ``SupportsRound[T]''), so
# doing it while a class is being defined re-enters typing's own import and
# breaks ForwardRef -- deterministically, and far from here.  An earlier attempt
# did it eagerly, at every class definition in the corpus, and had to be
# reverted for exactly that.  Only the NAMES are stored at class creation, under
# a Grail-internal key that __dict__ already excludes.
#
# An ASSIGNED value wins, and a DELETE is refused.  ``A.__type_params__ =
# whatever'' is legal; ``del A.__type_params__'' is a TypeError -- not the
# AttributeError a missing attribute gets -- because the slot is part of the
# type rather than an entry in its namespace: it always reads, as an empty tuple
# for a class that declares none, so there is nothing for a delete to remove.
#
# COMPARED BY NAME, NOT BY REPR.  Grail's TypeVar repr carries the old variance
# prefix (``~T'') that CPython dropped in 3.12; that is a TypeVar.__repr__
# divergence and not about type parameters, so pinning it here would hide what
# this fixture is for.
#
# test_builtin's TestType.test_type_typeparams.

import typing

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class A[T]:
    pass


class Pair[K, V]:
    pass


class Plain:
    pass


# --- the parameters are there ----------------------------------------------------

r['names'] = outcome(lambda: [t.__name__ for t in A.__type_params__])
r['count'] = outcome(lambda: len(A.__type_params__))
r['is_typevar'] = outcome(lambda: isinstance(A.__type_params__[0], typing.TypeVar))
r['two_parameters'] = outcome(lambda: [t.__name__ for t in Pair.__type_params__])
r['is_a_tuple'] = outcome(lambda: type(A.__type_params__).__name__)

# --- and an ordinary class has an empty tuple --------------------------------------

r['plain_class'] = outcome(lambda: Plain.__type_params__)
r['dynamic_class'] = outcome(lambda: type('D', (), {}).__type_params__)

# --- assignment wins, deletion is refused --------------------------------------------


def _assign_then_delete():
    class B[T]:
        pass

    B.__type_params__ = "whatever"
    before = B.__type_params__
    try:
        del B.__type_params__
        deleted = 'no raise'
    except TypeError:
        deleted = 'TypeError'
    return (before, deleted, B.__type_params__)


r['assign_then_delete'] = outcome(_assign_then_delete)

# --- controls -------------------------------------------------------------------------
#
# The names live under a Grail-internal key, so they must not surface as a class
# attribute; and typing must still be importable and usable afterwards, which is
# what the eager version broke.

r['not_in_dict'] = outcome(lambda: '___typeParamNames___' in A.__dict__)
r['type_params_not_in_dict'] = outcome(lambda: '__type_params__' in Plain.__dict__)
r['typing_still_works'] = outcome(lambda: typing.ForwardRef('int').__forward_arg__)
r['typevar_usable'] = outcome(lambda: typing.TypeVar('X').__name__)
r['class_still_usable'] = outcome(lambda: type(A()).__name__)
r['subclass_of_generic'] = outcome(
    lambda: (lambda C: [t.__name__ for t in C.__type_params__])(
        type('C', (A,), {})))


EXPECTED = {
    'assign_then_delete': "ok -> ('whatever', 'TypeError', 'whatever')",
    'class_still_usable': "ok -> 'A'",
    'count': 'ok -> 1',
    'dynamic_class': 'ok -> ()',
    'is_a_tuple': "ok -> 'tuple'",
    'is_typevar': 'ok -> True',
    'names': "ok -> ['T']",
    'not_in_dict': 'ok -> False',
    'plain_class': 'ok -> ()',
    'subclass_of_generic': 'ok -> []',
    'two_parameters': "ok -> ['K', 'V']",
    'type_params_not_in_dict': 'ok -> False',
    'typevar_usable': "ok -> 'X'",
    'typing_still_works': "ok -> 'int'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
