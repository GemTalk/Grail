"""Fixture: which ``except'' clause catches an exception raised in a handler.

Python's except clauses are alternatives for the try BODY only.  An exception
raised inside one clause's handler is NOT offered to the other clauses of that
same try -- it propagates out.  Grail's clauses compile to NESTED protected
blocks, where the later clauses' handlers enclose the earlier clauses' bodies,
so that rule has to be enforced explicitly: a later clause is SHIELDED while an
earlier one's handler runs.

THE SHIELD WAS TOO WIDE.  It was keyed to a global count of running handlers, so
it also fired for a handler that had nothing to do with this try -- one inside a
function the try BODY merely called:

    def g():
        try:    raise ValueError()
        except: raise B()          # a handler, but g's, not mine

    try:      g()
    except A: ...                  # does not match
    except B: ...                  # CPython catches here; Grail did not

The count could not tell those apart, so B escaped uncaught.  Anything that
converts one exception into another inside a handler hits this -- the shape is
ordinary -- and the failure is silent: the exception simply passes a clause
written to catch it.

``sibling_not_caught'' and ``handler_calls_fn'' are the cases the shield exists
for and must keep: an exception my own handler raised, directly or through
something it called, is still MINE and must not be caught by my later clauses.
``body_calls_fn'' is the one that was wrong.  A fix that simply removed the
shield would pass that and break the first two.

``try_inside_handler'' and ``recursive'' pin the two nesting cases: a try
written inside a handler still catches from its own body, and a function that
recurses through a try catches at the activation that raised.
"""


class A(RuntimeError):
    pass


class B(RuntimeError):
    pass


class C(RuntimeError):
    pass


def _raises_b_from_its_own_handler():
    try:
        raise ValueError('v')
    except ValueError:
        raise B('from-callee')


def sibling_not_caught():
    # THE SHIELD: B raised by this try's own `except A:` must not be caught by
    # this try's `except B:`.
    log = []
    try:
        try:
            raise A('a')
        except A:
            log.append('in-A')
            raise B('b')
        except B:
            log.append('WRONG-sibling-caught')
    except B:
        log.append('outer-caught-B')
    return log


def handler_calls_fn():
    # Still inside my handler, so still mine -- even though the raise happens a
    # call away, in someone else's handler.
    log = []
    try:
        try:
            raise A('a')
        except A:
            log.append('in-A')
            _raises_b_from_its_own_handler()
        except B:
            log.append('WRONG-sibling-caught')
    except B:
        log.append('outer-caught-B')
    return log


def body_calls_fn():
    # THE BUG: no handler of MINE is running -- the callee's handler is not my
    # business -- so my later clause must catch.
    log = []
    try:
        _raises_b_from_its_own_handler()
    except A:
        log.append('WRONG-A')
    except B:
        log.append('caught-B')
    return log


def body_calls_fn_three_clauses():
    # The same, with the match in the third clause: the shield applied to every
    # clause after the first, so depth mattered, not position.
    log = []

    def g():
        try:
            raise ValueError('v')
        except ValueError:
            raise C('c')

    try:
        g()
    except A:
        log.append('WRONG-A')
    except B:
        log.append('WRONG-B')
    except C:
        log.append('caught-C')
    return log


def bare_except_as_a_later_clause():
    # A bare `except:` must be LAST, so it is always a "later" clause and gets
    # the shield: B raised by the `except A:` handler must pass it by.
    log = []
    try:
        try:
            raise A('a')
        except A:
            log.append('in-A')
            raise B('b')
        except:
            log.append('WRONG-sibling-caught')
    except B:
        log.append('outer-caught-B')
    return log


def bare_except_still_catches_from_a_callee():
    # ...and the same bare clause must still catch what a CALLEE's handler
    # raised, which is the bug in its bare-except form.
    log = []
    try:
        _raises_b_from_its_own_handler()
    except A:
        log.append('WRONG-A')
    except:
        log.append('caught-bare')
    return log


def try_inside_handler():
    # A try written inside a handler catches from its OWN body.
    log = []
    try:
        raise A('a')
    except A:
        try:
            raise B('inner')
        except A:
            log.append('WRONG-A')
        except B:
            log.append('inner-caught-B')
    return log


def recursive():
    # The same try site active several times over; the raise happens at the
    # deepest activation and is caught there.
    log = []

    def f(n):
        try:
            if n > 0:
                f(n - 1)
            else:
                raise B('deep')
        except A:
            log.append('A%d' % n)
        except B:
            log.append('B%d' % n)

    f(2)
    return log


def no_later_clause():
    # Nothing to shield: the handler's exception simply propagates.
    log = []
    try:
        try:
            raise A('a')
        except A:
            raise B('b')
    except B:
        log.append('outer-B')
    return log


def single_clause_is_untouched():
    # One clause has no sibling, so it needs no shield at all.
    log = []
    try:
        _raises_b_from_its_own_handler()
    except B:
        log.append('caught-B')
    return log


def first_clause_still_matches():
    # The ordinary path: clause one matches and runs.
    log = []
    try:
        raise A('a')
    except A:
        log.append('A')
    except B:
        log.append('WRONG-B')
    return log


def else_and_finally_still_run():
    log = []
    try:
        log.append('body')
    except A:
        log.append('WRONG-A')
    except B:
        log.append('WRONG-B')
    else:
        log.append('else')
    finally:
        log.append('finally')
    return log


def _yields_inside_its_own_handler():
    """A generator that parks INSIDE an except handler."""
    try:
        raise C('inner')
    except C:
        yield 'parked'
    yield 'done'


def generator_parked_in_handler_does_not_shield_its_consumer():
    """THE SHIELD MUST NOT CROSS A CALL STACK.

    A generator body is a second thread of execution -- it runs on its own
    forked process -- and it can suspend INSIDE an except handler, which leaves
    a handler counted while control is back with the consumer.  The count and
    the try-token stack it parallels lived in one session-wide place, so the
    consumer's own handler then unwound the GENERATOR's entry and left its own
    behind.  Its try site looked permanently "already handling" from then on,
    and the shield refused every later clause of it -- so the second raise below
    escaped uncaught rather than reaching ``except B''.

    This is the synchronous statement of the bug an ASGI server hit on its first
    request, where the two stacks were two coroutines both parked inside
    ``except BlockingIOError: await ...''.  Fixed by saving and restoring that
    bookkeeping across every suspension: BaseException
    >> ___captureHandlerState___, used by PythonGenerator >> ___yield___: and
    >> ___captureConsumerState___.
    """
    out = []
    g = _yields_inside_its_own_handler()
    for attempt in (0, 1):
        try:
            if attempt == 0:
                raise A('first')
            raise B('second')
        except A:
            out.append('A')
            out.append(next(g))       # g parks inside ITS handler, not mine
        except B:
            out.append('B')
    out.append(next(g))
    return out


r = {
    'sibling_not_caught': sibling_not_caught(),
    'handler_calls_fn': handler_calls_fn(),
    'body_calls_fn': body_calls_fn(),
    'body_calls_fn_three_clauses': body_calls_fn_three_clauses(),
    'bare_except_as_a_later_clause': bare_except_as_a_later_clause(),
    'bare_except_still_catches_from_a_callee': bare_except_still_catches_from_a_callee(),
    'try_inside_handler': try_inside_handler(),
    'recursive': recursive(),
    'no_later_clause': no_later_clause(),
    'single_clause_is_untouched': single_clause_is_untouched(),
    'first_clause_still_matches': first_clause_still_matches(),
    'else_and_finally_still_run': else_and_finally_still_run(),
    'generator_parked_in_handler_does_not_shield_its_consumer':
        generator_parked_in_handler_does_not_shield_its_consumer(),
}


EXPECTED = {
    'sibling_not_caught': ['in-A', 'outer-caught-B'],
    'handler_calls_fn': ['in-A', 'outer-caught-B'],
    'body_calls_fn': ['caught-B'],
    'body_calls_fn_three_clauses': ['caught-C'],
    'bare_except_as_a_later_clause': ['in-A', 'outer-caught-B'],
    'bare_except_still_catches_from_a_callee': ['caught-bare'],
    'try_inside_handler': ['inner-caught-B'],
    'recursive': ['B0'],
    'no_later_clause': ['outer-B'],
    'single_clause_is_untouched': ['caught-B'],
    'first_clause_still_matches': ['A'],
    'else_and_finally_still_run': ['body', 'else', 'finally'],
    'generator_parked_in_handler_does_not_shield_its_consumer':
        ['A', 'parked', 'B', 'done'],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-32s is not in EXPECTED' % ('FAIL', extra))
