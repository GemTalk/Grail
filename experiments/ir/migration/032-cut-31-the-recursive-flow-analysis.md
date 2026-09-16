## Progress — cut 31 (the recursive flow analysis)

The bound-before-read proof (`___irAssignFlowSafe___:`) was a FLAT walk of the
top-level statements: every local a statement's subtree read had to be bound
already, and any FIRST binding below the top level (inside an if branch, a
loop body, a try body) was refused outright.  That kept every def of the shape
``if c: x = 1; return x'' -- with the return inside the branch -- or a loop
body that bound a name and then used it, or ``v = d[k]'' in a try body read in
the body itself, on the text path.  Cut 26 recorded the try/else case as a
deferred refinement; the general form is the same problem.

The walk is now `___irFlowBound___: boundIn locals: localSet`, per statement,
answering the set of locals DEFINITELY bound afterwards (or nil = unprovable),
and the containers walk their bodies with the right entry set:

* Block / Suite: statement by statement, each from what the previous left.
* If: test reads bound; both branches from the entry set; result is the MEET
  (intersection) of the two -- an absent else contributes the entry set.
* While: test reads bound at entry; body from the entry set; result is the
  entry set (zero-trip).  A name bound late in one iteration is not known
  bound at the top of the next, so a read there is refused.
* For: iterable reads bound; body from entry ∪ {target}; result the entry set.
* Try: body from entry; else from what the BODY left (the cut-26 refinement);
  each handler from entry ∪ {as-name}, type reads bound at entry; finally from
  entry (it also runs when no handler matched).  Result: else-path met with
  every handler path, then the finally's own bindings added.  The as-name is
  left out of its handler's contribution (text keeps the temp, CPython unbinds
  it; a later read keeps the def on text either way).
* Terminators (return, raise, break, continue): reads bound; answer EVERY
  local -- what follows on that path is dead, and a branch that returns must
  not narrow what the other branch bound.
* Everything else: the old simple rule (reads bound, nested writes bound, the
  statement's `___irTopLevelWriteNames___:` added).  That hook replaces the
  single `___irLocalWriteTarget___:` in the analysis, so a statement binding
  several names at once (a multi-alias import, a tuple unpack) can say so.

Soundness argument: the set answered for a statement is a subset of the names
bound on every path through it, by construction of the meets and the zero-trip
loop rule, so a read the walk accepts is a read of a name bound on every path
to it.  The fixture's `maybe` (``if flag: x = 1; return x'') is the negative
control: it must stay on text so the guard raises UnboundLocalError, and
`maybe_unbound` asserts that it does.

Fixture: `with_else` loses its ``v = None'' pre-bind; first_even_bound, label,
sum_squares, try_get, try_get_else, countdown, maybe_unbound; compiled
106 -> 113 (`maybe` excluded).

**Cut 31 flag-on triage -> a traceback defect, fixed.** The wider eligibility
made general_traceback.py's two catching defs IR-compiled for the first time,
and `TracebackTestCase>>testCaughtExceptionHasFrame` failed: each traceback
held only the `<module>` frame.  `BaseException class>>___isIRPythonMethod___:`
classed a method as IR only if its source began with ``def '' AND contained no
``___curPos___'' -- and that fixture's Python COMMENTS mention ___curPos___ by
name.  An IR method's attached source is the user's Python, comments included
(a text method's generated source never carries comments, which is what the
old marker heuristics relied on), so the defs were classed as text, the marker
scan found no ``___curPos___ :='' store, and the frame was dropped as
non-Python.  The prefix test is decisive alone -- generated text begins with
the selector pattern and no Python identifier is ``def'' -- so the exclusion
is gone.  Any IR def whose source mentioned ___curPos___ would have vanished
from tracebacks the same way.

Cut 31 flag-on residue after the fix: the PEP 657 column families
(`testForLoopExceptionPositions`, `RaiseSpanTestCase`, `SpanEndTokenTestCase`),
the temps-fast-path test, and one AlmostOutOfMemory-driven shard ERROR
(`PropertyNotDynamicClassAttributeTestCase>>testNeitherMroNamesTheSharedImplementationBase`,
10 hits of the notification in that shard's log).

A probe note: a single-class flag-on run in a bare topaz session dies with
``VM temporary object memory is full, code space doits_meths overflow'' for
TracebackTestCase; pass run_tests.sh's `-C "GEM_TEMPOBJ_CODE_SIZE=300000;
GEM_TEMPOBJ_CACHE_SIZE=500000;"`.
