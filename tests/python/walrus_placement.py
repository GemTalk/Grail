"""PEP 572: where ``:=`` may and may not appear.

The walrus is not an expression that can go anywhere.  CPython's grammar
admits it only where the production is ``namedexpr_test``, which is why
``x := 0`` is a SyntaxError while ``(x := 0)`` is fine.  Grail accepted
nine of the ten placements CPython rejects -- a bare statement, the
right-hand side of ``=``, a keyword-argument value, a parameter default
or annotation, a tuple target.

Unlike the async and parameter placement rules, this CANNOT be checked
after parsing: ``x := 0`` and ``(x := 0)`` produce the same AST, and the
difference is the parenthesis, which only the parser sees.  So the gate
is parser state -- default FORBIDDEN, permitted explicitly at each site
the grammar allows.  That direction is the safe one: a site left out
refuses valid code loudly instead of accepting invalid code silently.

The permitted list is what this fixture is really for, because it was
built by being wrong four times.  Positional call arguments, subscripts,
``elif`` conditions and decorators were each missed in a first cut and
found by a failing test -- three of them in real code (test_decorators,
and Django's ``elif query_string := ...``).

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def compiles(code):
    try:
        compile(code, '<test>', 'exec')
        return True
    except SyntaxError as exc:
        return 'SyntaxError: %s' % exc


def refuses(code, fragment='invalid syntax'):
    try:
        compile(code, '<test>', 'exec')
        return 'compiled'
    except SyntaxError as exc:
        return (fragment in str(exc)) or 'msg: %s' % exc


# -- refused: the walrus has no business here ---------------------------

check('bare_statement', refuses('x := 0'), True)
check('bare_statement_call', refuses('y := f(x)'), True)
check('right_hand_side_of_assignment', refuses('x = y := 0'), True)
check('right_hand_side_with_call', refuses('y0 = y1 := f(x)'), True)
check('keyword_argument_value', refuses("spam(a=b := 'c')"), True)
check('keyword_argument_call', refuses('spam(x = y := f(x))'), True)
check('parameter_default', refuses('def spam(a = b := 42): pass'), True)
check('parameter_annotation', refuses('def spam(a: b := 42 = 5): pass'), True)

# A tuple target gets CPython's own wording -- the objection is the
# TARGET, not the position, since this one IS inside parentheses.
check('tuple_target',
      refuses('((a, b) := (1, 2))',
              'cannot use assignment expressions with tuple'), True)

# The walrus is legal here as a positional argument, so the complaint is
# the ORDER -- and reporting the right one of the two matters.
check('positional_after_keyword',
      refuses('spam(a=1, b := 2)',
              'positional argument follows keyword argument'), True)


# -- permitted: every site the grammar allows ---------------------------

check('parenthesised_statement', compiles('(x := 0)'), True)
check('if_condition', compiles('if (n := 10) > 5: pass'), True)
check('if_condition_bare', compiles('if n := 10: pass'), True)
check('while_condition', compiles('n = 0\nwhile c := n: break'), True)

# elif was missed in a first cut; Django writes exactly this.
check('elif_condition',
      compiles('if 0:\n    pass\nelif q := 1:\n    pass'), True)

# A positional call argument -- one of the shapes PEP 572 exists for.
check('positional_call_argument', compiles('print(z := 3)'), True)
check('nested_call_argument', compiles('print(len(x := [1, 2]))'), True)
check('genexp_argument', compiles('list(y := x for x in range(3))'), True)

# A subscript; test_named_expressions itself uses this spelling.
check('subscript', compiles('a = [1]\nelement = a[b := 0]'), True)

# PEP 614: a decorator is an arbitrary expression.
check('decorator', compiles('@x := y\ndef f(): pass'), True)

check('comprehension_element', compiles('[(y := x) for x in range(3)]'), True)
check('comprehension_condition',
      compiles('[y for x in range(3) if (y := x)]'), True)
check('list_display', compiles('[y := 2, y ** 2]'), True)
check('dict_value', compiles("{'k': (v := 1)}"), True)
check('set_element', compiles('{(s := 1)}'), True)
check('assert_statement', compiles('assert (m := 1)'), True)
check('return_value', compiles('def g():\n    return (r := 1)'), True)
check('ternary_arm', compiles('a = (b := 1) if True else 2'), True)
check('lambda_body', compiles('fn = lambda: (w := 1)'), True)
check('fstring', compiles("f'{(v := 2)}'"), True)

# Parenthesised, a walrus reaches even the positions refused above.
check('parenthesised_in_parameter_default',
      compiles('def spam(a=(b := 42)): pass'), True)
check('parenthesised_in_keyword_value',
      compiles("def spam(**kw): pass\nspam(a=(b := 'c'))"), True)


# -- the TARGET has to be a bare name -----------------------------------
#
# Inside parentheses the walrus is permitted, so what is refused here is
# the left-hand side.  CPython names the shape that was written --
# _PyPegen_get_expr_name -- and only ``tuple`` was implemented, so every
# other shape was ACCEPTED and emitted a store to something Python has
# no store for.

check('target_attribute',
      refuses('(x.y := 1)', 'with attribute'), True)
check('target_subscript',
      refuses('(x[0] := 1)', 'with subscript'), True)
check('target_call',
      refuses('(f() := 1)', 'with function call'), True)
check('target_literal',
      refuses('(1 := 2)', 'with literal'), True)
check('target_none', refuses('(None := 2)', 'with None'), True)
check('target_true', refuses('(True := 2)', 'with True'), True)
check('target_list', refuses('([a] := 1)', 'with list'), True)
check('target_set', refuses('({1} := 2)', 'with set display'), True)
check('target_dict', refuses('({1:2} := 3)', 'with dict literal'), True)
check('target_comparison',
      refuses('(a < b := 1)', 'with comparison'), True)
check('target_conditional',
      refuses('(a if b else c := 1)', 'with conditional expression'), True)
check('target_lambda',
      refuses('(lambda: 1 := 2)', 'with lambda'), True)
check('target_list_comprehension',
      refuses('([x for x in y] := 1)', 'with list comprehension'), True)
check('target_set_comprehension',
      refuses('({x for x in y} := 1)', 'with set comprehension'), True)
check('target_dict_comprehension',
      refuses('({x:1 for x in y} := 1)', 'with dict comprehension'), True)
check('target_generator',
      refuses('((x for x in y) := 1)', 'with generator expression'), True)
# Operators, unary forms and ``and``/``or`` all answer the same word.
check('target_expression', refuses('(a + b := 1)', 'with expression'), True)
check('target_expression_not', refuses('(not a := 1)', 'with expression'),
      True)


# -- and the right-hand side is ``expression'', not ``namedexpr'' -------
#
# ``(x := y := 1)`` does not chain: the value of a walrus is parsed by a
# rule that admits no walrus of its own.  Parenthesised it does.

check('rhs_does_not_chain', refuses('(x := y := 1)'), True)
check('rhs_chains_parenthesised', compiles('(x := (y := 1))'), True)


# -- and it still binds ------------------------------------------------

# NOT a list display, on purpose: this file's business is placement, and
# a display exercises the EMIT.  ``check('list_display', ...)`` above asks
# only whether ``[y := 2, y ** 2]`` compiles -- and Grail's ``compile``
# stops after parsing, so that check passed throughout a period when the
# same source could not run at all.  tests/python/walrus_in_display.py is
# where the display is executed.

def _binds():
    ns = {}
    exec('if (y := 5): r = y + 1', ns)
    return (ns['r'], ns['y'])


check('the_binding_still_happens', _binds(), (6, 5))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
