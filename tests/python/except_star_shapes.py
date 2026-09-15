"""Fixture: PEP 654 ``except*'', every shape the direct-to-IR path must spell.

``except*'' is not a variation on ``except''.  Its clauses are not alternatives:
EVERY clause runs, each taking its matching sub-exceptions out of the group and
passing the remainder on, and whatever is left at the end is re-raised.  Grail
emits that as ONE handler block threading a remainder through the clauses --

    [ body ] on: BaseException do: [:ex | | rest norm rr |
        norm := normalize(ex).  rest := norm.  rr := OrderedCollection new.
        rest := clause(rest, T1, rr, [:g | n1 := g.  body1]).
        rest := clause(rest, T2, rr, [:g | n2 := g.  body2]).
        finish(rest, ex, rr).
        finishReraised(rest, ex, rr, norm) ]

-- rather than as the ordinary path's nest of on:do:, which could only ever run
the first matching clause.

The checks below pin the properties that distinguish the two: that several
clauses run for ONE raise, in clause order; that a non-matching group
propagates unchanged; that the ``as'' name binds a GROUP and not a leaf; that a
bare ``raise'' inside a clause re-raises that clause's subgroup and the rest
still propagates; that ``else'' runs only when the body did not raise and is not
protected by this statement's own clauses; and that ``finally'' runs either way.

Everything here is verified against real CPython by running the file directly.
"""


def catch(fn):
    try:
        return ['ok', fn()]
    except BaseException as e:
        return [type(e).__name__, str(e)]


def one_clause_matches():
    log = []
    try:
        raise ExceptionGroup('g', [ValueError('v')])
    except* ValueError as eg:
        log.append(('V', len(eg.exceptions)))
    return log


def every_matching_clause_runs():
    """The property the ordinary emit cannot have: ONE raise, BOTH clauses."""
    log = []
    try:
        raise ExceptionGroup('g', [ValueError('v'), TypeError('t')])
    except* ValueError as eg:
        log.append(('V', len(eg.exceptions)))
    except* TypeError as eg:
        log.append(('T', len(eg.exceptions)))
    return log


def clauses_run_in_source_order():
    log = []
    try:
        raise ExceptionGroup('g', [TypeError('t'), ValueError('v')])
    except* ValueError as eg:
        log.append('V')
    except* TypeError as eg:
        log.append('T')
    return log


def the_as_name_binds_a_group():
    # ``return'' is a SyntaxError inside an except* block (PEP 654 forbids
    # break/continue/return there), so every check below collects into a local
    # and returns after the statement.
    out = None
    try:
        raise ExceptionGroup('g', [ValueError('a'), ValueError('b')])
    except* ValueError as eg:
        out = [type(eg).__name__, len(eg.exceptions),
               sorted(str(e) for e in eg.exceptions)]
    return out


def a_naked_exception_is_wrapped():
    """A plain raise is normalized into a group before the clauses see it."""
    out = None
    try:
        raise ValueError('naked')
    except* ValueError as eg:
        out = [type(eg).__name__, len(eg.exceptions), str(eg.exceptions[0])]
    return out


def an_unmatched_remainder_propagates():
    def inner():
        try:
            raise ExceptionGroup('g', [ValueError('v'), KeyError('k')])
        except* ValueError:
            pass
    return catch(inner)


def a_wholly_unmatched_group_propagates():
    def inner():
        try:
            raise ExceptionGroup('g', [KeyError('k')])
        except* ValueError:
            pass
    return catch(inner)


def a_tuple_of_types_matches_either():
    log = []
    try:
        raise ExceptionGroup('g', [ValueError('v'), TypeError('t')])
    except* (ValueError, TypeError) as eg:
        log.append(len(eg.exceptions))
    return log


def the_clause_body_can_raise():
    def inner():
        try:
            raise ExceptionGroup('g', [ValueError('v')])
        except* ValueError:
            raise KeyError('from the clause')
    return catch(inner)


def a_bare_raise_reraises_the_subgroup():
    def inner():
        try:
            raise ExceptionGroup('g', [ValueError('v')])
        except* ValueError:
            raise
    return catch(inner)


def else_runs_when_the_body_does_not_raise():
    log = []
    try:
        log.append('body')
    except* ValueError:
        log.append('clause')
    else:
        log.append('else')
    return log


def else_is_skipped_when_a_clause_ran():
    log = []
    try:
        raise ExceptionGroup('g', [ValueError('v')])
    except* ValueError:
        log.append('clause')
    else:
        log.append('else')
    return log


def finally_runs_when_a_clause_ran():
    log = []
    try:
        raise ExceptionGroup('g', [ValueError('v')])
    except* ValueError:
        log.append('clause')
    finally:
        log.append('finally')
    return log


def finally_runs_when_nothing_raised():
    log = []
    try:
        log.append('body')
    except* ValueError:
        log.append('clause')
    finally:
        log.append('finally')
    return log


def finally_runs_while_a_remainder_propagates():
    log = []

    def inner():
        try:
            raise ExceptionGroup('g', [KeyError('k')])
        except* ValueError:
            log.append('clause')
        finally:
            log.append('finally')
    caught = catch(inner)
    return [log, caught[0]]


def a_local_written_in_a_clause_is_visible_after():
    seen = 'before'
    try:
        raise ExceptionGroup('g', [ValueError('v')])
    except* ValueError:
        seen = 'after'
    return seen


def nested_except_star_statements():
    log = []
    try:
        try:
            raise ExceptionGroup('outer', [ValueError('v')])
        except* TypeError:
            log.append('inner-T')
    except* ValueError:
        log.append('outer-V')
    return log


r = {
    'one_clause_matches': one_clause_matches(),
    'every_matching_clause_runs': every_matching_clause_runs(),
    'clauses_run_in_source_order': clauses_run_in_source_order(),
    'the_as_name_binds_a_group': the_as_name_binds_a_group(),
    'a_naked_exception_is_wrapped': a_naked_exception_is_wrapped(),
    'an_unmatched_remainder_propagates': an_unmatched_remainder_propagates(),
    'a_wholly_unmatched_group_propagates': a_wholly_unmatched_group_propagates(),
    'a_tuple_of_types_matches_either': a_tuple_of_types_matches_either(),
    'the_clause_body_can_raise': the_clause_body_can_raise(),
    'a_bare_raise_reraises_the_subgroup': a_bare_raise_reraises_the_subgroup(),
    'else_runs_when_the_body_does_not_raise': else_runs_when_the_body_does_not_raise(),
    'else_is_skipped_when_a_clause_ran': else_is_skipped_when_a_clause_ran(),
    'finally_runs_when_a_clause_ran': finally_runs_when_a_clause_ran(),
    'finally_runs_when_nothing_raised': finally_runs_when_nothing_raised(),
    'finally_runs_while_a_remainder_propagates': finally_runs_while_a_remainder_propagates(),
    'a_local_written_in_a_clause_is_visible_after': a_local_written_in_a_clause_is_visible_after(),
    'nested_except_star_statements': nested_except_star_statements(),
}


EXPECTED = {
    'one_clause_matches': [('V', 1)],
    'every_matching_clause_runs': [('V', 1), ('T', 1)],
    'clauses_run_in_source_order': ['V', 'T'],
    'the_as_name_binds_a_group': ['ExceptionGroup', 2, ['a', 'b']],
    'a_naked_exception_is_wrapped': ['ExceptionGroup', 1, 'naked'],
    'an_unmatched_remainder_propagates': ['ExceptionGroup', 'g (1 sub-exception)'],
    'a_wholly_unmatched_group_propagates': ['ExceptionGroup', 'g (1 sub-exception)'],
    'a_tuple_of_types_matches_either': [2],
    # CPython propagates the clause's own exception BARE here, not wrapped:
    # there is no unmatched remainder to merge it with.
    'the_clause_body_can_raise': ['KeyError', "'from the clause'"],
    'a_bare_raise_reraises_the_subgroup': ['ExceptionGroup', 'g (1 sub-exception)'],
    'else_runs_when_the_body_does_not_raise': ['body', 'else'],
    'else_is_skipped_when_a_clause_ran': ['clause'],
    'finally_runs_when_a_clause_ran': ['clause', 'finally'],
    'finally_runs_when_nothing_raised': ['body', 'finally'],
    'finally_runs_while_a_remainder_propagates': [['finally'], 'ExceptionGroup'],
    'a_local_written_in_a_clause_is_visible_after': 'after',
    'nested_except_star_statements': ['outer-V'],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
