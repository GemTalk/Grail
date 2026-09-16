## Progress — cut 1 (landed on feat/ir-codegen)

The seam is live behind `GRAIL_IR_CODEGEN` (off by default), for a deliberately
narrow node subset, proven end to end.

* **Flag** — `importlib class >> ___irCodegenEnabled___` (SessionTemps-cached
  env read, paired `___irCodegenEnabledInvalidate___` + a test-only
  `___irCodegenForce___:`), registered in `os.gs`. Observability counters:
  `___irStats___` reports `compiled` / `fallbacks` / `lastError`.
* **Builder** — `PythonAst::PyMethodIRBuilder`, the production sibling of
  `experiments/ir/PyIRBuilder.gs`: resolves the `GsCom*` node classes through
  the `GsCompilerClasses` dictionary (they are NOT on the runtime symbol list),
  installs into env 1, holds a name→leaf map for locals.
* **Eligibility** — `FunctionDefAst >> ___irEligible___`: module-level, simple
  positional, non-generator/async, direct-return, no decorators / annotations /
  PEP-695 type params, read-only params, and a body whitelist enforced by
  double-dispatch (`___irEligibleStatementLocals___:` /
  `___irEligibleValueLocals___:`). Cut-1 nodes: **Pass, Return, Expr** over
  **Constant** (bool / None / str / int / float / bytes) and **Name** (a plain
  parameter load).
* **Emit** — `___emitIRStatementOn___:` / `___emitIRValueOn___:` on those nodes,
  `FunctionDefAst >> ___installIRMethodOn___:` driving the builder.
* **Safety** — the seam tries IR only for an eligible def and **falls back to
  the text path on ANY error**, so an eligibility gap or an emitter bug never
  costs correctness; flag-off is the text path verbatim.
* **Tests** — `tests/python/ir_codegen_smoke.py` (CPython-validated) +
  `PythonTests::IRCodegenSmokeTestCase` (forces the flag, asserts correct values
  AND `compiled = 9, fallbacks = 0`). Full SUnit suite green with the flag off
  (6080/6080); the IR test green with the flag forced on.

Deferred to the next cuts (each falls back cleanly today): **the
`___derivePythonLineForMethod___:ip:` second path** (an IR frame still drops
from tracebacks — see cut 2), then **Assign, BinOp, Compare, Call, If, While**,
module globals / builtins, and parameter temps.
