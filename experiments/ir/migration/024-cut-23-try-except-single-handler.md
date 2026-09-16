## Progress — cut 23 (try / except, single handler)

`try: body / except [T] [as n]: hbody` (one handler, no else / finally / star)
reproduces printSmalltalkOn:'s single-handler shape:

    [ body ] @env0:on: <sel> do: [:___ex | | ___savedExc |
      ((___ex isKindOf: PythonReturn) or: [... PythonBreak ... PythonContinue])
          ifTrue: [___ex @env0:pass].
      ___savedExc := BaseException @env0:___currentException___.
      BaseException @env0:___setCurrentException___:
          (BaseException @env0:___payloadOf___: ___ex).
      BaseException @env0:___enterHandler___.
      [ <n := payload.> hbody ] @env0:ensure: [
          BaseException @env0:___exitHandler___.
          BaseException @env0:___setCurrentException___: ___savedExc]].

`<sel>` = BaseException for bare `except:`, else the LAZILY-evaluated validated
type `(PyLazyExceptSelector @env0:on: [BaseException @env1:___pyExceptType___:
(T)])` — evaluated only when an exception reaches the clause. The builder grew
`blockWithArg:temp:do:` (blockTemp:sourceLexLevel: + appendTemp:) for the
handler's ___savedExc. The control-flow pass-guard keeps a Python `except`
from swallowing PythonReturn/Break/Continue. Text's ___pushCatchingFrame___
fallback (keyed on ___curPos___) is omitted — IR frames are natively
first-class in tracebacks, which is the no-op condition it exists for.

Flow analysis: the `as` name is treated like a for target (its handler-body
reads are self-satisfied; it contributes no binding after the statement); body
and handler-body writes are conditional-nested. Multi-clause shields,
`except (A, B)` tuples, else, finally, and the in-handler bare `raise` (needs
___ex) stay on text. Fixture: safe_div, catch_as (as-binding used via
len(ex.args)), catch_all (bare except); compiled 68 -> 71.

### Cut 23 follow-through: the catch-site frame push is load-bearing

The first emit omitted ___pushCatchingFrame___ on the theory that IR frames
are natively first-class. Wrong: that call is what BUILDS the exception's
whole traceback chain from the VM's raise-time stack capture (its case 1) —
without it __traceback__ stays None, and an all-IR propagation chain reported
`got []` (7 traceback tests). Two fixes:
* ___installIRMethodOn___: now sets CallAst functionBeingCompiled around the
  emit (ensure-restored), exactly as the text path does — node emitters
  consult it (the catch-site PyCode among them).
* The IR handler emits `(BaseException ___payloadOf___: ___ex)
  ___pushCatchingFrame___: (PyCode name:filename:firstlineno:) pos: nil` —
  pos nil, where text passes ___curPos___: the pos only REFINES the catcher
  frame's span; nil makes the builder derive every line from the captured
  ips, which the IR-aware line machinery answers natively.

**Third known flag-on interaction: PEP 657 COLUMN spans are absent for an
exception raised inside an IR frame** (lines are correct; IR step points
carry only begin offsets, so colno/end_colno cannot be derived and stay
None — per §9.10, absent columns beat wrong ones). One fixture check
(for_traceback_positions body_span) reads false under the forced flag.
Deriving true spans needs per-send end offsets (a (method, ip) -> span side
table built at emit time) — deferred.
