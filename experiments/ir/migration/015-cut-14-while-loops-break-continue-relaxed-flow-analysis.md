## Progress — cut 14 (while loops + break/continue, relaxed flow analysis)

`while test: body` (no else) reproduces the text path's EXCEPTION-based loop,
shape for shape:

    [[(test) ___isTruthy___] whileTrue: [
        [body] @env0:on: PythonContinue do: [:___ex___ | nil].
    ]] @env0:on: PythonBreak do: [:___ex___ | nil].

`break` / `continue` -> `PythonBreak/PythonContinue @env0:___signal___` — the
text emits verbatim. The builder grew `handlerBlockNamed:` (a one-arg
`[:___ex___ | nil]` handler; blockArg:argNumber:forBlock:, never a method
local) and text-shaped `whileTrue:do:` (inlined COMPAR_WHILE_TRUE, distinct
from the goto-based `while:do:` kept for later optimization). while-else stays
on text.

**The bug this cut flushed out: builder `return:` was a BLOCK return.**
`GsComReturnNode new return:` sets returnKind 0; source compilation emits
returnKind 1 (`returnFromHome:`) for EVERY `^`, method top level included
(oracle-verified). Kind 0 is indistinguishable at method level and in INLINED
blocks — cuts 1-13 never noticed — but a `return` inside a while body sits in a
REAL block (the on: PythonContinue do: receiver), where kind 0 ends only the
block: find_first_ge re-entered its loop forever. `return:` now always emits
`returnFromHome:`.

**Flow analysis relaxed, still sound.** The all-writes-top-level rule would
have made eligible loops useless (`i += 1` is a nested write). New rule, per
top-level statement: subtree READS must be bound; subtree NESTED writes must
ALSO be already bound (conditionally REbinding a bound local is safe; a FIRST
binding inside a branch/loop is not — the branch may not run, the loop may run
zero times); then the statement's own top-level write target joins the bound
set. Requires complete write collectors (`___irWriteLocalNamesInto___:locals:`
on Assign/AugAssign/If/While/Block/Suite) — complete because eligibility is
established before the analysis runs. Bonus: `x = 0; if c: x = 1` (conditional
REBIND) is now eligible too.

Fixture: count_to, sum_below, find_first_ge (return-from-loop), skip_odds
(while True + break + continue + %), cond_rebind; compiled 36 -> 41. Flag-on
6235/6236 (inherent only), flag-off 6236/6236.
