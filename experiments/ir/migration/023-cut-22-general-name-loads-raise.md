## Progress — cut 22 (general name loads + raise)

**Name loads beyond locals** — NameAst's IR eligibility now admits three kinds,
via `___irNonLocalLoadKind___:` (guarded, conservative-nil):
* a plain LOCAL (as before, via its registered leaf);
* a MODULE name (variable or top-level def) -> `(self @env1:
  ___moduleAttrLoad___: #'name')` — emitModuleAttrLoad:'s shape, probing
  dynamic-instVar storage, falling through to class-method lookup (defs as
  BoundMethods), NameError on miss, so `del`/rebinding behave;
* a RESOLVABLE BARE GLOBAL (a builtins-namespace name resolving on the user's
  symbol list that is NOT a builtins method — those take the BoundMethod
  fast-path wrap and stay on text) -> its symbol-list association, exactly
  what the bare identifier compiles to.  super/__class__/type, reserved
  identifiers, and class contexts all stand down.

**raise** — printSmalltalkOn:'s three no-cause shapes:
* bare `raise` OUTSIDE a handler -> `BaseException @env0:___reRaise___: nil.`
  (inside a handler it must name the handler's ___ex block arg — deferred to
  the try/except cut);
* `raise Cls(args)` (bare-name callee) -> `BaseException @env1:
  ___pyRaiseNew___: (Cls) args: { args } kw: nil.` — the construct-and-signal
  that runs user __init__ and validates the callee is a BaseException subclass;
* `raise expr` -> `BaseException @env1:___pyRaise___: (expr).`
`raise X from Y` stays on text.

Fixture: FLOOR module constant + read_floor/above_floor (module-var loads),
demand_positive (raise ValueError(...)), reraise_expr (raise e), bare_reraise
(RuntimeError), with module-level try blocks capturing the outcomes;
compiled 63 -> 68.

### Cut 22 flushed out three latent defects (found by the widened flag-on surface)

1. **`value:` / `value:value:` sends MUST carry specialOpcode 109.** Source
   compilation attaches the ExecBlock-invoke opcode to every value:-family
   send — even under `@env1:` (oracle-verified). The opcode makes a RAW
   ExecBlock receiver (a class-body lambda read off its class — the legacy
   block-calling protocol) invoke the block; a bare-Symbol selLeaf skips it,
   so the block landed on `object>>value:value:` and raised
   `'ExecBlock' object is not callable`. `newSelector:env:` can't build the
   leaf per-user (SystemUser-only table), so the builder assembles it
   directly (`setIRnodeKind` + selector/specialOpcode/specialSendClass ivars).
2. **`generateFromIR:` answers an ARRAY when it has warnings** (e.g.
   ``statement with no effect`` from a docstring expression statement), with
   the GsNMethod first. Warnings are non-fatal for a source compile;
   `generatedMethod` now unwraps them instead of treating them as failure.
3. **The cut-8 bare-builtin probe lacked the special-id denylist.**
   printSmalltalkOn: special-cases globals/locals/vars/dir/eval/exec/super
   BEFORE the builtins fast path; `exec(...)` only became reachable when cut
   19/22 made its arguments eligible. `___irBareBuiltinSelector___` now denies
   the same seven ids the self-send probe does.

Verified: ClassScopeComprehensionTestCase's fixture imports flag-on with all
11 RESULTS true (9 defs IR-compiled, 0 fallbacks).

### Second known flag-on interaction (stack geometry)

`BaseExceptionTestCase>>test_recursion_raises_recursion_error` can FLAP under
the forced flag (observed once in a full flag-on suite; 5/5 green on retry,
class suite 15/15, direct import all-true). The recursion guard is a stack
BYTE budget (an ~343-frame AlmostOutOfStack reserve), so IR methods' smaller
frames legitimately move where the guard fires; the test sits near that
boundary and harness depth tips it. Deterministic flag-off; nothing gates on
flag-on. Watch for recurrence.
