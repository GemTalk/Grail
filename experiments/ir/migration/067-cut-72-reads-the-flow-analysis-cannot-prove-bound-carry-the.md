## Progress — cut 72 (reads the flow analysis cannot prove bound carry the text's guard)

The bound-before-read analysis (cut 31) was a GATE: a def with one read it
could not prove bound stayed on text (`flow`, 21 methods + 17 defs after cut
71).  The text never had that constraint -- it guards EVERY read of a
function local with `(x ifNil: [UnboundLocalError ___signalUnbound___: #x])`
and skips the guard only for a parameter no `del` can unbind
(`___guardedLocalNeedsCheck___:`).  The IR now does the same in the one case
the analysis fails: the build asks `___irAssignFlowSafe___:` and, when it is
false, hands the builder the guarded set -- every body local plus any deleted
parameter (`___irGuardedLocalNames___`) -- and NameAst emits the guarded read
(`ifNilValue:then:`, the inlined `ifNil:` the text relies on) for those
names.  A def the analysis proves keeps its bare reads, so the common case
pays nothing; the analysis is an optimisation now, not a refusal.

The two fixture defs written in cut 31 to exercise the refusal (`maybe`,
`drop_then_read`) moved to IR with this cut and answer the same values --
the guard is what they were exercising on the text side.

Fixture: guarded_with (a `with` body binding on both branches, read after --
the `_py_warnings.catch_warnings.__enter__` shape), guarded_unbound (an
UnboundLocalError caught, with CPython's message), guarded_del (a deleted
parameter).  Compiled 377 -> 385 (six new defs and the two that moved), 0
fallbacks, RESULTS true with the flag on and off.

The first flag-on sweep added four UnboundLocalErrorTestCase failures: all
four read the compiled fixture methods' `sourceString` for the text's
`ifNil: [UnboundLocalError ...]` guard (one also checks `_blockLiterals
isNil`), which an IR method -- Python source, the guard an inlined node --
cannot show; the behavioural half (the deleted parameter RAISES) passed.
They measure the TEXT emitter, so `unboundGuardFixture` now loads its module
with the flag forced off and restored in an ensure:, as TracebackTestCase
does for its line-cache fixture.  Gates after that: flag-off `6431 run, 6431
passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run, 6421 passed, 8
failed, 2 errors` -- the known nine plus `[ERROR]
TwilioClientTestCase>>testMessagesCreate` (AlmostOutOfMemory, 15
notifications).
