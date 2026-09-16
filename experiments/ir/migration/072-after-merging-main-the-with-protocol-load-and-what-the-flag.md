## After merging main: the `with` protocol load, and what the flag-on residue is now

Merging main (45 commits: the vendored `_pydecimal`, the metaclass `with` /
`next` fix, and **a Python position map in every generated method**) needed
one IR change and re-ranked the residue.

**The change.** Main's metaclass fix moved the text's `with` from
`___pyAttrLoad___: #'__enter__'` to `___grailProtocolAttr___: #'__enter__'`
-- a miss must answer the raising DEFAULT rather than propagate
AttributeError, so `with Bare:` is CPython's "'Bare' object does not support
the context manager protocol" and not an AttributeError.  The IR emit still
said `___pyAttrLoad___:`, so under the flag that test failed
(`MetaclassWithAndNextTestCase>>testAClassWithNoMetaclassStillRefuses`, and
only under the flag).  `___emitIRProtocolCall___:on:args:builder:` now sends
what the text sends.  This is the emit rule doing its job in the other
direction: when the TEXT changes, the IR twin has to follow, and the flag-on
sweep is what says so.

**The residue is now one cause.** Flag-on cold sweep on the merged tree:
`6531 run, 6518 passed, 12 failed, 1 errors`, every shard reporting, zero
memory notifications.  All thirteen are the same thing -- an IR method
carries no position map:

  * the PEP 657 span family (`RaiseSpanTestCase`, `SpanEndTokenTestCase`,
    `LambdaFrameTestCase`, `TracebackTestCase>>testForLoopExceptionPositions`,
    `WithItemPositionsTestCase` x3);
  * main's two new `PythonOffsetMapTestCase` tests, which measure exactly the
    table an IR method lacks;
  * the two generated-TEXT introspections
    (`LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
    `ImportlibTestCase>>testInstanceMethodNoOuterBlock`) and
    `FrameReceiverSuggestionTestCase`, which read Smalltalk source an IR
    method does not have;
  * `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling`, the
    recursion-guard byte budget.

So the next non-coverage cut is well defined, and main just built the half
that was missing.  The text stores its map as a trailing comment in the
method source: six SmallIntegers per node (Smalltalk start and end offset,
then the Python line, column, end line and end column), and
`BaseException class>>___mapSpanForMethod___:ip:` turns an ip into a span
with `_previousStepPointForIp:` + `_sourceOffsetsAt:` and an
innermost-containing-range search.  An IR method needs no Smalltalk-offset
half at all: the builder stamps every node with its PYTHON offset already
(`aBuilder at: <position>`), so the same two primitives answer a Python
offset directly, and what is missing is only offset -> span.  The IR twin is
therefore a per-method table the builder fills as it stamps, plus a branch in
`___mapSpanForMethod___:ip:` -- not a new mechanism.
