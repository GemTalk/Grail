## Progress — cut 74 (a nested def whose parameters or locals are pseudo-variables)

Numbering note: the two lanes both reached for 73 at the same time.  **73 is
the OTHER lane's** (the position map for IR frames, `feat/ir-position-map`);
these two are 74 and 75.  The flag-on residue quoted below is therefore
measured on a base that does NOT yet carry the position map -- 15 items.  With
cut 73 merged the same residue is 5, and those five
(`TracebackTestCase>>testForLoopExceptionPositions`,
`FrameReceiverSuggestionTestCase`, `ImportlibTestCase>>testInstanceMethodNoOuterBlock`,
`LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
`PrivateNameManglingTestCase>>testPrivateNameMangling`) are a subset of the
fifteen, so nothing here is hidden by the difference.

`nestedDef:reservedName` -- 13 stdlib top-level defs + 2 stdlib class methods,
3 + 4 in the test corpus, the largest remaining nested-def refusal.  The shape
is `dataclasses._make_synthesized_init`'s: a closure whose first parameter is
spelled `self` (or `nil`, `true`, `false`, `super`, `thisContext`), which
Smalltalk cannot declare as a block temp.

This is **cut 70 one lexical level down** and nothing more.  Cut 70 gave a
METHOD's arguments and temps a transport LEAF NAME while the builder's local
table stayed keyed by the PYTHON name (`argNamed:leafName:` /
`tempNamed:leafName:` / `___irLeafNameFor___:`); the closure block wants the
same split.  `___irNestedOwnLeafNames___` answers the transport spelling of
each `___irNestedOwnNames___` entry, in the same order, and
`___emitIRNestedBlockOn___:` now carries two parallel lists -- the leaf names
go to `blockWithArgs:temps:do:`, the Python names to `withLocals:do:`.  Every
consumer inside the block already resolves through `aBuilder leafFor:
<python name>` (the positional binding, the vararg and kwarg bindings, name
reads and stores, the closure cells), so **not one send moved**: the only
difference in the emitted method is the spelling of a block temp, which is
exactly what the text does (`transportParamName:`, `| _self other
___curPos___ |`).

What is refused instead, a new census row: `nestedDef:leafNameCollision`, a
def that binds BOTH `self` and `_self`, whose transport identifiers are the
same string.  The text silently aliases the two onto one temp (its body-local
merge skips a name already present under its transport spelling); refusing is
cheaper than reproducing that.  No occurrence in either corpus.

**Three TEXT gaps this cut walked into, all recorded and none asserted** (the
fixture must pass with the flag off too):

* A **defaulted** pseudo-variable parameter of a nested def is an uncatchable
  CompileError on the text path: the def-time wrapper declares
  `| ___default_nil___ |` (the raw Python name, `printSmalltalkOn:` line ~502)
  and the binding reads `___default__nil___` (built from the TRANSPORT name in
  `printPositionalUnpackingOn:`), so `def inner(nil=2)` inside a def is
  "undefined symbol" and takes the whole enclosing method with it.  The IR uses
  one spelling on both sides and compiles it.  The fixture therefore puts the
  default on a normal parameter (`def inner(nil, k=2)`).
* The **keyword lookup** uses the transport name: the text emits `kwargs
  includesKey: '_self'`, so `init(self=box)` cannot bind the parameter -- while
  the SAME method's unexpected-keyword guard admits `'self'`, so the call is
  accepted and then reported as a missing positional argument.  The IR looks up
  `'self'`, which is what CPython binds.  This is the nested twin of the
  keyword gap cut 70 recorded at method level.
* Not a gap, checked and equal: the missing-argument REPORT already names the
  Python spelling on both paths (`printMissingPositionalCheckOn:` maps back
  through `___pythonParamNameFor___:`), so `names: #( 'self' )` in the text and
  in the IR.

Oracle check: the text dump of the fixture (`GRAIL_CODEGEN_TRACE_DIR`) for
`npv_synth.<locals>.init` and `NpvNester.make.<locals>.i_op` is the cut-64
closure shape with `_self` in the temp pane and in every read -- identical send
for send to what the IR builds, the kwargs key above being the one literal that
differs.

Fixture: npv_synth / npv_synth_run (the dataclasses shape: `def init(self,
*args, **kwargs)` with `setattr`), npv_locals (a `nil` parameter and `true` /
`false` body locals -- django `View.as_view`'s `self = cls(**initkwargs)`),
npv_deco (reprlib `recursive_repr`'s shape: a decorator factory whose wrapper
takes `self`, applied to a nested def that also takes `self`), npv_free (the
pseudo-variable is the closure's, the free variable is the enclosing local),
NpvNester.make (the werkzeug `_ProxyIOp.__init__` shape -- the nested `self`
SHADOWS the method's receiver, which `___irIsSelfReceiver___` already got
right through `___boundInNestedFunction___:`) and NpvNester.cell.  Compiled
449 -> 458 (6 top-level defs + 3 class methods), 0 fallbacks, RESULTS true
with the flag on and off.

Gates: flag-off `6535 run, 6535 passed, 0 failed, 0 errors`; flag-on cold
sweep `6535 run, 6520 passed, 14 failed, 1 errors` -- the known fifteen, every
one of them a method with no position map or a Smalltalk-source introspection
(`RaiseSpanTestCase`, `SpanEndTokenTestCase`, `LambdaFrameTestCase`,
`NestedOperandSpanTestCase` x2, `WithItemPositionsTestCase` x3,
`TracebackTestCase>>testForLoopExceptionPositions`, `PythonOffsetMapTestCase`
x2, `LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
`ImportlibTestCase>>testInstanceMethodNoOuterBlock`,
`FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`) plus
`[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling`, the
recursion-guard byte budget.  No new name.
