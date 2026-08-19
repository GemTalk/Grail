"""Fixtures for f_locals on a LIVE Python frame.

Driven by PythonTests>>LiveFrameLocalsTestCase.  Each check answers True when
Grail agrees with CPython.

THE RULE.  ``frame.f_locals'' is the executing frame's bound local variables, and
traceback.StackSummary.extract(..., capture_locals=True) is the public way to see
it: each FrameSummary keeps a name -> repr() mapping, which format() renders as
one ``    name = value'' line per variable, sorted by name.

WHY IT IS NOT ONE FRAME IN GRAIL.  A Python function becomes one of several
Smalltalk shapes, and the locals do not all land in the same place:

  * a MODULE-LEVEL def compiles to a real method, whose one frame holds both the
    arguments and the body's temporaries;
  * a def in a CLASS BODY puts its body inside a zero-argument block, so the
    method's own frame reports no names at all and every local lives in the
    block one level in;
  * a NESTED def is a two-argument block (``:___positional___ :___kwargs___'')
    with its body in a further block, so the arguments are in the outer one.

So one Python frame is several Smalltalk frames and f_locals has to union them,
innermost first.  On top of that, a Smalltalk method argument cannot be assigned
while a Python parameter can, so a REBOUND parameter is passed under a transport
name (``_q'' for ``q'') and unpacked into a block temp carrying the real name --
both frames are merged here, so the transport has to be recognised and dropped or
it surfaces as a variable the program does not have.

WHAT IS DELIBERATELY NOT CHECKED.  ``self''.  CPython lists it among a method's
locals; Grail's live frames do not, because a Python method's receiver is the
Smalltalk receiver rather than a frame temporary (the same asymmetry
frame_receiver_suggestions.py works around at raise time, from
``___methodReceiverTable___'').  The method check below therefore asserts a
SUBSET and the absence of compiler artefacts -- claims both implementations
satisfy -- rather than an equality that would encode the gap as though it were
correct.

EXTRACTED INLINE IN EVERY CHECK, never through a shared helper.  walk_stack
counts frames from its own caller, so putting the extract behind a helper makes
the innermost frame the HELPER's: limit=1 then captures the helper's locals and
every assertion is quietly about the wrong function.  CPython's own
test_format_locals inlines it for the same reason.

Run this file under CPython (``python3 tests/python/frame_locals_live.py'') to
see what it produces.
"""

import traceback


def a_module_level_def_reports_arguments_and_temps():
    """One real method frame, holding everything."""
    def module_level(k, v):
        a = 1
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), capture_locals=True, limit=1)[0].locals
    got = module_level(3, 4)
    if sorted(got) != ['a', 'k', 'v']:
        return 'names were %r' % (sorted(got),)
    if [got['a'], got['k'], got['v']] != ['1', '3', '4']:
        return 'values were %r' % (got,)
    return True


def a_nested_def_reports_both_of_its_blocks():
    """The arguments are in the two-argument block, some temps in the inner one;
    a frame that reported only the marked (inner) block would lose k and v."""
    def enclosing():
        def nested(k, v):
            a = 1
            b = 2
            return traceback.StackSummary.extract(
                traceback.walk_stack(None),
                capture_locals=True, limit=1)[0].locals
        return nested(3, 4)
    got = enclosing()
    if sorted(got) != ['a', 'b', 'k', 'v']:
        return 'names were %r' % (sorted(got),)
    if [got['a'], got['b'], got['k'], got['v']] != ['1', '2', '3', '4']:
        return 'values were %r' % (got,)
    return True


def a_class_body_def_reports_its_body_block():
    """The method frame has no names of its own here -- everything is in the
    body block -- so this is the shape that fails if only the frame the walk
    names is read."""
    class Holder:
        def method(self, q):
            z = 9
            q = q + 1        # rebinding forces Grail's transport argument
            return traceback.StackSummary.extract(
                traceback.walk_stack(None),
                capture_locals=True, limit=1)[0].locals
    got = Holder().method(11)
    if not {'q', 'z'} <= set(got):
        return 'names were %r' % (sorted(got),)
    if [got['q'], got['z']] != ['12', '9']:
        return 'values were %r' % (got,)
    return True


def a_rebound_parameter_hides_its_transport_name():
    """``_q'' is Grail's transport argument for a rebindable ``q'' and is not a
    variable of the program.  CPython has no such name either, so this check
    reads the same in both."""
    class Holder:
        def method(self, q):
            q = q + 1
            return traceback.StackSummary.extract(
                traceback.walk_stack(None),
                capture_locals=True, limit=1)[0].locals
    got = Holder().method(11)
    if '_q' in got:
        return 'transport name surfaced: %r' % (sorted(got),)
    return True


def codegen_bookkeeping_temps_are_not_locals():
    """``___curPos___'' is emitted into every generated method and ``___f___''
    into every module body; neither is a Python variable."""
    def fn(k):
        a = 1
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), capture_locals=True, limit=1)[0].locals
    got = fn(1)
    leaked = [n for n in got if n.startswith('___')]
    if leaked:
        return 'codegen temps surfaced: %r' % (leaked,)
    return True


def an_unbound_local_is_omitted_but_none_is_kept():
    """CPython's f_locals holds only BOUND names, and Grail reads an unassigned
    temp as Smalltalk nil.  Python's None is a distinct object, so a local
    explicitly assigned None must still be reported -- the two must not
    collapse."""
    def fn(flag):
        assigned_none = None
        if flag:
            never_assigned = 1        # noqa: F841 -- deliberately not reached
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), capture_locals=True, limit=1)[0].locals
    got = fn(False)
    if 'never_assigned' in got:
        return 'unbound local reported: %r' % (sorted(got),)
    if got.get('assigned_none') != 'None':
        return 'a local assigned None was lost: %r' % (got,)
    return True


def a_frame_with_no_locals_reports_none():
    """Nil rather than an empty mapping, so ``no variables'' and ``cannot say''
    stay distinguishable; both render as no locals lines."""
    def fn():
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), capture_locals=True, limit=1)[0].locals
    got = fn()
    if got not in (None, {}):
        return 'expected no locals, got %r' % (got,)
    return True


def format_renders_locals_sorted_after_the_source_line():
    """The rendering CPython's test_format_locals asserts, end to end: the File
    line, the source line, then one sorted ``    name = repr'' line each."""
    def some_inner(k, v):
        a = 1
        b = 2
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), capture_locals=True, limit=1)
    formatted = some_inner(3, 4).format()
    if len(formatted) != 1:
        return 'expected one frame, got %r' % (formatted,)
    tail = formatted[0].split('\n')[-5:]
    if tail != ['    a = 1', '    b = 2', '    k = 3', '    v = 4', '']:
        return 'rendered tail was %r' % (tail,)
    return True


def capture_locals_off_reports_nothing():
    """The default must stay exactly as it was before frames could answer
    f_locals at all."""
    def fn(k):
        a = 1
        return traceback.StackSummary.extract(
            traceback.walk_stack(None), limit=1)[0].locals
    got = fn(1)
    if got is not None:
        return 'locals captured without being asked: %r' % (got,)
    return True


if __name__ == '__main__':
    checks = [
        a_module_level_def_reports_arguments_and_temps,
        a_nested_def_reports_both_of_its_blocks,
        a_class_body_def_reports_its_body_block,
        a_rebound_parameter_hides_its_transport_name,
        codegen_bookkeeping_temps_are_not_locals,
        an_unbound_local_is_omitted_but_none_is_kept,
        a_frame_with_no_locals_reports_none,
        format_renders_locals_sorted_after_the_source_line,
        capture_locals_off_reports_nothing,
    ]
    for fn in checks:
        got = fn()
        print('%-4s %s%s' % ('OK' if got is True else 'FAIL', fn.__name__,
                             '' if got is True else '  -- %s' % (got,)))
