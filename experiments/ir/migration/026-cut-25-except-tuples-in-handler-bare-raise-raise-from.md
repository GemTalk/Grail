## Progress — cut 25 (except tuples, in-handler bare `raise`, `raise … from …`)

Three completions of the try/raise surface, each reproducing its text shape:

* **`except (A, B, C)`** — the type handed to ___pyExceptType___: is the
  ExceptionSet join `(A @env0:, B) @env0:, C` (on:do: asks its argument
  #handles:, which a tuple/Array lacks), left-folded in source order like the
  text.  `TryAst>>___irExceptTypeEligible___:locals:` admits a non-empty tuple
  of emittable values; `___emitIRExceptType___:on:` builds the chain.
* **bare `raise` inside a handler** → `BaseException @env0:___reRaise___:
  ___ex`.  The builder grew a handler-ex stack (`pushHandlerEx:` /
  `popHandlerEx` / `currentHandlerEx`); TryAst brackets the handler-body emit
  with it (ensure-popped), and RaiseAst names `currentHandlerEx` when its
  `___enclosingExceptHandler___` is non-nil — the two agree because a RaiseAst
  in a handler body is emitted while that handler is open.  A bare raise in a
  finally or try body still passes nil, as text does; the runtime prefers the
  session's current exception anyway (see ___reRaise___:).
* **`raise X from Y`** → the `cause:` selectors (`___pyRaiseNew___:args:kw:
  cause:` / `___pyRaise___:cause:`); `from None` passes the None global, which
  is what distinguishes "suppress context" from "no cause".

Fixture: classify (tuple), rethrow (bare raise in handler, module-level check
RETHROWN), chained (`from e`, CHAINED reads __cause__), suppressed (`from
None`, SUPPRESSED checks __cause__ is None and __suppress_context__); compiled
73 -> 77.

### Cut 25 flag-on triage (main moved under the sweep)

Six flag-on residuals against a main that gained several test classes since
the last sweep.  Attribution, each re-run alone in a fresh forced-flag session:

* **`FrameLocalsCaptureTestCase` (landed 09-04) — a REAL IR parity gap, fixed.**
  `the_except_target_is_bound_while_the_handler_runs` read false: the IR
  handler pushed its catch-site frame with `___pushCatchingFrame___:pos:` and
  never bound the `as` name, where text passes `target: 'name'` and unbinds it
  (`___unbindCatchingTarget___:`) in the handler's ensure:.  Grail's f_locals is
  a snapshot taken while the exception propagates -- before the handler stores
  the name -- so codegen has to hand the name over.  The IR handler now emits
  both, so the "gone once the handler ends" half is no longer vacuously true.
* **`RaiseSpanTestCase` and `SpanEndTokenTestCase` (both 09-01)** — PEP 657
  COLUMN spans, the documented third flag-on interaction (IR step points carry
  begin offsets only).  Two more test classes now measure it; the fix is still
  the (method, ip) -> span side table.
* **`PropertyNotDynamicClassAttributeTestCase>>testHelpOnAnEnumPrintsCPythonsHeading`**
  (08-18, green in every earlier sweep) ERRORed once in the sharded run and
  passes 9/9 alone under the flag: suite-order state on a cold flag-on pydoc
  import, not an IR emit defect.  Watch for recurrence.
* The two inherent ones as before: `testTheTempsFastPathNeedsNoSource`,
  `testForLoopExceptionPositions`.
