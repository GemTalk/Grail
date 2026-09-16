## Progress — cut 5 (block machinery + `if`/`elif`/`else`)

`PyMethodIRBuilder` grew the block/loop machinery ported from the experiment
builder: a `blockStack` (so `add:` appends to the innermost `GsComBlockNode`),
`inBlockDo:`, `if:then:` / `if:then:else:` (optimized sends with `controlOp` =
`COMPAR__IF_TRUE` / `COMPAR_IF_TRUE_IF_FALSE`), and `while:do:` / `break` /
`continue` (goto-based, `COMPAR_WHILE_TRUE`).

**`If` is wired** (`IfAst>>___emitIRStatementOn___:`): `(test) ___isTruthy___
ifTrue: [body] ifFalse: [orelse]`. elif chains and nested ifs work — the body /
orelse are `SuiteAst` (not `BlockAst`), so BOTH classes got
`___emitIRStatementsOn___:` + `___irEligibleStatementsWithLocals___:`. Verified:
sign/absval/clamp all IR-compiled and correct.

**`While` / `Break` / `Continue` are NOT wired yet**, even though the builder can
do them: Grail's text path implements them with EXCEPTION handlers
(`@env0:on: PythonContinue do:`, an outer PythonBreak handler), not the goto
loop the experiment used. The two are observably equivalent for simple loops but
diverge around `try`/`finally` and exceptions, so wiring them needs care (and a
while loop is not useful until `Assign` lands anyway). Next: `Assign` + body
locals, then `While`, then the `Call` forms.
