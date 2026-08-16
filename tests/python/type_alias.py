# PEP 695's ``type X = value'' statement.  Grail's parser had no type-alias
# statement at all, so every one of these was a SyntaxError.
#
# The load-bearing detail is that ``__value__'' is LAZY.  PEP 695 evaluates it
# on first access, which is what lets an alias name something defined later in
# the module, or name ITSELF (``type Json = int | list[Json]'').  An eager
# implementation turns both into a NameError at the point of definition, so the
# laziness is the semantics rather than an optimisation.
#
# ``type'' is a SOFT keyword and also a BUILTIN, so it appears as an ordinary
# identifier far more often than it opens a statement -- the checks at the
# bottom pin that it still does.
#
# test_global's test_type_alias, and test_annotationlib's ``type C1 = None''.

r = {}

type Alias = tuple[int, int]
r['repr'] = repr(Alias)
r['name'] = Alias.__name__
r['type_params'] = Alias.__type_params__

# An alias whose value legitimately IS None.  A cache keyed on "is the stored
# value nil?" re-runs its thunk forever here; the fixture reads it twice so a
# regression to that shows up as a difference rather than as a slow test.
type NoneAlias = None
r['none_value'] = NoneAlias.__value__
r['none_value_again'] = NoneAlias.__value__

# LAZY: the alias is defined BEFORE the name it refers to exists.
type Later = _defined_afterwards
_defined_afterwards = 42
r['lazy_forward_reference'] = Later.__value__

# The alias binds like an assignment, so it is an ordinary module global.
r['is_a_module_global'] = globals()['Alias'] is Alias

# --- ``type'' is still the builtin ------------------------------------------

r['builtin_call'] = type(3).__name__
r['builtin_isinstance'] = isinstance(int, type)
_saved = type
r['builtin_as_value'] = _saved is type


EXPECTED = {
    'repr': "'Alias'",
    'name': "'Alias'",
    'type_params': '()',
    'none_value': 'None',
    'none_value_again': 'None',
    'lazy_forward_reference': '42',
    'is_a_module_global': 'True',
    'builtin_call': "'int'",
    'builtin_isinstance': 'True',
    'builtin_as_value': 'True',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-24s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
