# Fixture for NamedIntConstantTestCase.  Validates that
# NamedIntConstant — Grail's stand-in for CPython's
# ``class _NamedIntConstant(int)`` — behaves enough like a Python
# int for re._constants to use it directly.  See TODO.md (the
# int-subclass entry) for the long-form caveats.

LITERAL = NamedIntConstant(16, 'LITERAL')
BRANCH = NamedIntConstant(7, 'BRANCH')
MAXREPEAT = NamedIntConstant(4294967295, 'MAXREPEAT')

# 1. Name is preserved and reachable via .name and repr().
name_attr = LITERAL.name
repr_str = repr(LITERAL)

# 2. Underlying integer value is reachable via int() / __index__.
as_int = int(LITERAL)

# 3. Equality with plain int — the direction re/_compiler uses.
eq_with_int = (LITERAL == 16)
ne_with_int = (LITERAL == 17)

# 4. Reverse-direction equality (improperly used in CPython
# stdlib but should still work to avoid silent foot-guns).
reverse_eq = (16 == LITERAL)
reverse_ne = (17 == LITERAL)

# 5. Identity — two NamedIntConstants with the same value but
# different names are DISTINCT objects (Symbol-like).
sym_a = NamedIntConstant(16, 'LITERAL')
sym_b = NamedIntConstant(16, 'LITERAL')
identity_different = (sym_a is sym_b)

# 6. Set/dict membership — needs __hash__ + __eq__ to agree.
ops_set = {LITERAL, BRANCH}
literal_in_set = (LITERAL in ops_set)
maxrepeat_in_set = (MAXREPEAT in ops_set)

# 7. Arithmetic via DNU forwarding — the one MAXREPEAT-style use.
maxrepeat_minus_one = MAXREPEAT - 1
greater_than_zero = (MAXREPEAT > 0)
