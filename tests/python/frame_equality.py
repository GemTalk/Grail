"""Frame objects compare by VALUE in Grail, and this is what that costs.

Driven by PythonTests>>FrameEqualityTestCase.

CPython compares frames by IDENTITY, and Grail cannot.  A live stack is read by
RAISING and reading the VM's captured (method, ip, receiver) triples, so every
walk RECONSTRUCTS its frames; two walks of one unchanged stack yield distinct
objects.  Real identity would need a cache keyed to a physical frame, and no
such key exists -- one activation walked twice and three separate activations of
the same method on the same receiver at the same depth produce byte-identical
(method, ip, receiver).  See docs/Python_Traceback_Design.md 9.47.

So equality states what Grail can know: same code, same caller chain.

``f_lineno'' is deliberately not part of it.  A frame's line is mutable STATE --
in CPython it advances while the frame object stays the same -- so comparing it
makes two readings of ONE frame taken at different lines unequal, which is
`the_same_frame_read_twice_is_equal' below.  It also buys no discrimination
against the case it looks like it should catch: two separate activations at the
same depth return from the same line, so they compared equal with the line
included too.  Consumers that want the line read it directly, and
``traceback.walk_stack'' yields it as its own tuple element, so it is still
compared where it matters.

Every check above the line answers identically under real CPython 3.14.6.  The
one below it records the divergence, and is expected to disagree.
"""

import sys


def _frame():
    return sys._getframe()


def _elsewhere():
    return sys._getframe()


def the_same_frame_read_twice_is_equal():
    """Two reads of one frame, taken at DIFFERENT lines, are the same frame.

    CPython hands back one object, so this is trivially true there.  It is the
    check that forced f_lineno out of Grail's comparison: the two reads below
    are on different source lines, so a line-sensitive equality called them
    different frames."""
    f1 = sys._getframe()
    f2 = sys._getframe()
    return f1 == f2


def the_same_frame_read_twice_hashes_equal():
    f1 = sys._getframe()
    f2 = sys._getframe()
    return hash(f1) == hash(f2)


def different_functions_are_not_equal():
    return _frame() != _elsewhere()


def a_frame_is_not_equal_to_a_non_frame():
    f = sys._getframe()
    return f != 42 and f != None and f != "frame"


def equality_is_symmetric():
    f1 = sys._getframe()
    f2 = sys._getframe()
    return (f1 == f2) == (f2 == f1)


def a_frame_equals_itself():
    f = sys._getframe()
    return f == f


def deeper_frames_are_not_equal_to_shallower_ones():
    """The caller chain is what stops a shared code object over-matching."""
    def inner():
        return sys._getframe()
    return inner() != sys._getframe()


def walk_stack_pairs_compare_equal_across_two_walks():
    """The behaviour test_walk_stack asserts: two walks of one unchanged stack
    describe the same frames.  The linenos are compared too -- walk_stack yields
    (frame, lineno) pairs -- so dropping f_lineno from frame equality does not
    stop this from checking the line."""
    import traceback
    def deeper():
        return list(traceback.walk_stack(None))
    s1, s2 = list(traceback.walk_stack(None)), deeper()
    if len(s2) - len(s1) == 1 and s2[1:] == s1:
        return True
    # A dropped frame shows here as a length that is not exactly one apart, and
    # a bare False says nothing about which walk lost what.  Name the frames.
    return 'len(s1)=%d len(s2)=%d s1=%r s2=%r' % (
        len(s1), len(s2),
        [(f.f_code.co_name, n) for f, n in s1],
        [(f.f_code.co_name, n) for f, n in s2])


# --- the documented divergence -------------------------------------------

def two_activations_at_one_depth_compare_equal():
    """GRAIL-SPECIFIC, and the price of value equality.

    Two SEPARATE calls of one function, at the same depth with the same caller
    chain, are different frames in CPython and indistinguishable to Grail: the
    VM's (method, ip, receiver) triples are byte-identical for both, including
    the ip, because the call site does not move.  9.47 records why no key can
    tell them apart without per-activation identity, which would cost the
    +14 ns-per-call wrapper 9.2 rejected.

    This is the honest failure mode: Grail says these are the same frame.  The
    alternative -- claiming IDENTITY via a cache keyed on those same triples --
    would return one object here AND refresh its line from each capture, making
    a loop's repeated calls look like a single frame that moved.  Wrong in the
    same place, but silently."""
    a = _frame()
    b = _frame()
    return a == b


if __name__ == '__main__':
    checks = [
        the_same_frame_read_twice_is_equal,
        the_same_frame_read_twice_hashes_equal,
        different_functions_are_not_equal,
        a_frame_is_not_equal_to_a_non_frame,
        equality_is_symmetric,
        a_frame_equals_itself,
        deeper_frames_are_not_equal_to_shallower_ones,
        walk_stack_pairs_compare_equal_across_two_walks,
    ]
    grail_only = [
        two_activations_at_one_depth_compare_equal,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    # These assert a Grail LIMITATION, so CPython is expected to disagree.
    # XFAIL is that expected disagreement and is not a failure;  XPASS means
    # CPython now agrees, i.e. the check no longer documents a difference and
    # should be retired or moved up into `checks'.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for fn in grail_only:
        print('%-5s %s' % ('XPASS' if fn() is True else 'XFAIL', fn.__name__))
