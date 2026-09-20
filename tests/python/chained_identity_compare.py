"""Fixture: a CHAINED comparison whose ops include ``is'' or ``in''.

``a < b < c'' is sugar for ``a < b and b < c'' with b evaluated once, and Python
lets any comparison operator take part -- including the two that are not rich
comparisons:

    type(n) is int is type(d)                 # fractions.Fraction.__new__
    request[0] == request[-1] in ("'", '"')   # pydoc.Helper.interact

Grail's text path emits the chain by threading each middle operand through one
shared temp.  ``in'' needs a SECOND temp because it reverses the operands -- the
container is the Smalltalk receiver -- so a non-final ``in'' stages its container
in that temp, runs the membership test, and then copies the container into the
shared temp for the next comparison, discarding the copy's value with
``___ignore:'' so the expression still yields the membership result.

The shapes below pin the three things a chain must get right whatever the ops
are: the VALUE, the SHORT-CIRCUIT (nothing after the first false is evaluated),
and each middle operand being evaluated EXACTLY ONCE.  The last two are pinned
with a counter rather than by inspection, because a chain that re-evaluates its
middle operand answers the right thing for every pure operand and only breaks on
one with a side effect.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

calls = []


def probe(v, tag):
    calls.append(tag)
    return v


def took(expr_result):
    got = list(calls)
    del calls[:]
    return expr_result, got


def fraction_new(numerator, denominator):
    return type(numerator) is int is type(denominator)


r['two_is_ops_all_true'] = fraction_new(1, 2)
r['two_is_ops_first_false'] = fraction_new(1.0, 2)
r['two_is_ops_second_false'] = fraction_new(1, 2.0)


def pydoc_interact(request):
    return request[0] == request[-1] in ("'", '"')


r['rich_then_a_final_in'] = (pydoc_interact("'x'"), pydoc_interact('"x"'),
                             pydoc_interact('ab'), pydoc_interact('aba'))


def non_final_in(a, b, c):
    return a in b < c


r['a_non_final_in'] = (non_final_in(1, [1, 2], [3]),
                       non_final_in(9, [1, 2], [3]),
                       non_final_in(1, [1, 2], [0]))


def non_final_not_in(a, b, c):
    return a not in b < c


r['a_non_final_not_in'] = (non_final_not_in(9, [1, 2], [3]),
                           non_final_not_in(1, [1, 2], [3]),
                           non_final_not_in(9, [1, 2], [0]))


def is_not_chain(x, y):
    return x is not None is not y


r['an_is_not_chain'] = (is_not_chain(1, 2), is_not_chain(None, 2),
                        is_not_chain(1, None))


def two_in_ops(a, b, c):
    return a in b in c


bc = (1, 2)
r['two_in_ops'] = (two_in_ops(1, bc, [bc]), two_in_ops(9, bc, [bc]),
                   two_in_ops(1, bc, [(3, 4)]))


r['the_chain_short_circuits'] = took(
    probe(1, 'a') is int is probe(2, 'c'))

r['a_middle_operand_is_evaluated_once'] = took(
    1 == probe(1, 'mid') < 5)

r['a_non_final_in_evaluates_its_container_once'] = took(
    1 in probe([1, 2], 'container') < [3])

r['a_mixed_three_op_chain'] = (0 <= 1 < 2 in (2, 3), 0 <= 1 < 9 in (2, 3))


EXPECTED = {
    'two_is_ops_all_true': True,
    'two_is_ops_first_false': False,
    'two_is_ops_second_false': False,
    'rich_then_a_final_in': (True, True, False, False),
    'a_non_final_in': (True, False, False),
    'a_non_final_not_in': (True, False, False),
    'an_is_not_chain': (True, False, False),
    'two_in_ops': (True, False, False),
    'the_chain_short_circuits': (False, ['a']),
    'a_middle_operand_is_evaluated_once': (True, ['mid']),
    'a_non_final_in_evaluates_its_container_once': (True, ['container']),
    'a_mixed_three_op_chain': (True, False),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
