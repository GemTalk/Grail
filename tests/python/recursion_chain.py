"""Fixtures for the context chain a RUNAWAY RECURSION produces, and for
rendering a chain too long to walk recursively.

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

Two rules, both about the same shape -- the classic runaway

    def f():
        try: 1/0
        except ZeroDivisionError: f()

Every level raises ZeroDivisionError while the level above is HANDLING one, so
each links to the next by __context__, and the RecursionError that finally stops
it links to the innermost.  CPython therefore reports a context chain as long as
the recursion, and renders one traceback block per link.

Grail reaches the limit differently: there is no Python frame counter, so the
gem's Smalltalk stack runs out first and GemStone signals AlmostOutOfStack, which
BaseException class>>___recursionGuard___ converts to a catchable RecursionError.
That replacement was built with ___new___ alone, so it took no __context__ and
the whole chain rendered as a single traceback.

Depth is therefore NOT comparable between the two, and is not even a Grail
constant: CPython stops at sys.getrecursionlimit() (1000), while Grail stops
wherever the stack runs out, which the gem's configuration moves (188 levels
under the SUnit runner's settings, 6645 under the CPython suite's deeper stack).
So every expectation below is stated as a RELATION -- one chain link per level,
one rendered block per link -- rather than as a count.  sys.getrecursionlimit()
is deliberately not used as the yardstick: in Grail it answers a fixed 1000 that
has nothing to do with the depth actually reachable.

Run this file under CPython (``python3 tests/python/recursion_chain.py'') to see
what it produces -- that is where the expectations come from.
"""

import sys
import traceback

# Longer than the chain a runaway recursion can build before the stack runs out
# (~6600 in Grail, 1000 in CPython), so it can only be built by the loop below.
# Above ~13000 links, recursive construction of the TracebackException chain
# overflowed the gem stack and raised RecursionError while REPORTING one.
LOOP_CHAIN = 16000

_depth = [0]


def f():
    _depth[0] += 1
    try:
        1 / 0
    except ZeroDivisionError:
        f()


_cached = []


def runaway():
    """Drive f() to the limit and hand back the RecursionError it raised, along
    with the depth reached.

    Memoized deliberately: every check below needs the same exception, and each
    call drives the stack to exhaustion.  Under Grail the handler that catches the
    converted RecursionError runs at the SIGNAL point -- GemStone runs an
    on:do: handler before unwinding -- so it executes in whatever reserve is left
    past the AlmostOutOfStack threshold.  That works, but there is no reason to
    spend the margin five times over when one excursion answers every question
    (and it makes the test about 4x faster)."""
    if _cached:
        return _cached[0]
    _depth[0] = 0
    caught = None
    try:
        f()
    except RecursionError as e:
        caught = e
    _cached.append(caught)
    _cached.append(_depth[0])
    return caught


def depth_reached():
    """Levels entered by the memoized runaway (see runaway)."""
    runaway()
    return _cached[1]


def chain_length(exc):
    """__context__ links, guarded against a cycle and against running away."""
    seen = set()
    n = 0
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        n += 1
        exc = exc.__context__
    return n


def loop_built_chain(n):
    """An n-link __context__ chain built with NO recursion, by assigning the
    attribute directly -- so its length is bounded by memory, not by the stack.
    CPython allows the assignment (it is a writable attribute), which is what
    makes a chain longer than any recursion could produce reachable at all."""
    head = ValueError('link 0')
    for i in range(1, n):
        nxt = ValueError('link %d' % i)
        nxt.__context__ = head
        head = nxt
    return head


def a_runaway_recursion_raises_a_catchable_recursionerror():
    """The premise: it must be a Python RecursionError, not something that
    escapes ``except''.  Under Grail this is ___recursionGuard___'s conversion of
    GemStone's AlmostOutOfStack notification."""
    e = runaway()
    return (type(e).__name__ == 'RecursionError'
            and 'maximum recursion depth exceeded' in str(e))


def the_recursionerror_records_the_handled_exception_as_context():
    """The bug this fixture was written for: the guard's replacement exception
    took no implicit __context__, so the chain stopped at length 1."""
    e = runaway()
    return type(e.__context__).__name__ == 'ZeroDivisionError'


def the_context_chain_is_as_long_as_the_recursion():
    """One link per level: the RecursionError plus one ZeroDivisionError for each
    call that got as far as raising one.

    Stated against the depth actually REACHED rather than a fixed count, because
    that depth is not a Grail constant -- it is wherever the gem's Smalltalk
    stack runs out, which the gem's configuration moves (188 links under the
    SUnit runner's settings, 6646 under the CPython suite's deeper stack).  The
    innermost call may or may not have reached its ``1/0'' before the overflow,
    so the total is depth+1 or depth."""
    e = runaway()
    depth = depth_reached()
    n = chain_length(e)
    return depth > 10 and (n == depth + 1 or n == depth)


def the_long_chain_renders_one_block_per_link():
    """CPython's test_long_context_chain: one traceback block per link, and the
    RecursionError LAST because the chain renders deepest-first."""
    e = runaway()
    n = chain_length(e)
    res = list(traceback.TracebackException.from_exception(e).format())
    return (n > 10
            and len([l for l in res if 'ZeroDivisionError:' in l]) == n - 1
            and 'RecursionError: maximum recursion depth exceeded' in res[-1])


def format_exception_renders_the_long_chain_too():
    """The other entry point walks the LIVE exceptions rather than captured
    links, so it needs its own guard against the same blow-up.

    Counts ``ZeroDivisionError:'' rather than the whole message line: Grail
    words this particular one differently from CPython (``integer division or
    modulo by zero'' where CPython 3.14 says ``division by zero'' for ``/''), and
    that gap is not what this check is about."""
    e = runaway()
    n = chain_length(e)
    text = ''.join(traceback.format_exception(e))
    return (n > 10
            and text.count('ZeroDivisionError:') == n - 1
            and text.rstrip().endswith(
                'RecursionError: maximum recursion depth exceeded'))


def a_chain_longer_than_the_stack_is_still_constructible():
    """TracebackException must not recurse once per link.  A loop-built chain is
    limited only by memory, so it goes well past what the stack can hold -- and
    recursing over it raised RecursionError from inside the reporting machinery,
    which is the one place that error is useless."""
    head = loop_built_chain(LOOP_CHAIN)
    te = traceback.TracebackException.from_exception(head)
    return chain_length_of_te(te) == LOOP_CHAIN


def chain_length_of_te(te):
    """Captured __context__ links on a TracebackException, counted iteratively."""
    n = 0
    while te is not None:
        n += 1
        te = te.__context__
    return n


def the_long_chain_still_renders_every_link():
    """And rendering it stays iterative end to end."""
    head = loop_built_chain(LOOP_CHAIN)
    res = list(traceback.TracebackException.from_exception(head).format())
    return (len([l for l in res if l.startswith('ValueError: link ')])
            == LOOP_CHAIN)


def a_cycle_in_an_assigned_context_still_terminates():
    """The attribute is writable, so a caller can build a cycle the raise path
    would have refused.  Both walks must stop rather than hang."""
    a, b = ValueError('a'), ValueError('b')
    a.__context__ = b
    b.__context__ = a
    built = traceback.TracebackException.from_exception(a)
    rendered = ''.join(traceback.format_exception(a))
    return (chain_length_of_te(built) == 2
            and rendered.count('Traceback (most recent call last)') <= 2
            and 'ValueError: a' in rendered)


if __name__ == '__main__':
    checks = [
        a_runaway_recursion_raises_a_catchable_recursionerror,
        the_recursionerror_records_the_handled_exception_as_context,
        the_context_chain_is_as_long_as_the_recursion,
        the_long_chain_renders_one_block_per_link,
        format_exception_renders_the_long_chain_too,
        a_chain_longer_than_the_stack_is_still_constructible,
        the_long_chain_still_renders_every_link,
        a_cycle_in_an_assigned_context_still_terminates,
    ]
    print('recursionlimit=%d' % sys.getrecursionlimit())
    _probe = runaway()
    print('runaway reached depth=%d, chain=%d'
          % (depth_reached(), chain_length(_probe)))
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))

