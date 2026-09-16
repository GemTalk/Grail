## Progress — cut 69 (the long tail, part 2: `global` declarations and the walrus)

**`global`** (`globalDeclaration`, 19 top-level defs + a few methods).  The
parser already does the work: a declared name is removed from the body's
variables and registered in the module scope, so a READ takes the module load
kind the IR has had since cut 5 and only the STORE was missing --
`AssignAst>>___irModuleStoreTarget___:` now emits the text's
`printSmalltalkModuleStoreOn:target:` route, `<recv> @env0:dynamicInstVarAt:
#name put: (v)` with `self` in a module def and `<Mod> @env0:___instance___`
inside a class method (`___moduleStoreReceiverExpr___`).  The GlobalAst
statement itself emits nothing, as the text's does.  The def-level refusal is
gone; a `nonlocal` still refuses through the name's own predicates.

**The walrus** (`value:NamedExprAst`, 14 methods + a few defs).  A local
target is the assignment node used as a VALUE (an assignment is an expression
in the IR as in Smalltalk source -- the text parenthesises `(x := v)` for the
same reason); a module-scope target is the module store send, whose answer is
the value put.  The class-body branches stay on text.  The flow analysis
learned the one idiom that matters: a walrus evaluated UNCONDITIONALLY in an
`if` or `while` test (`if (m := re.match(...)):`, `while (chunk :=
f.read(n)):`, through a comparison or `not`, or as the first operand of
`and` / `or`) is bound on both branches and after the statement
(`___irWalrusTargetNames___:`); a walrus anywhere else keeps the default
rule -- a below-top-level write must already be bound, or the def stays on
text.

Two fixture hazards met, both recorded because they will recur: (1) the
text-side def of the text-calls-IR traceback check used `global` as its
opt-out from IR, which this cut made eligible; it now uses `dir()`
(frame-sensitive, refused for good).  (2) The first replacement tried was
`eval("0")`, and it failed with `ImproperOperation: object cannot have more
than 255 dynamic instVars` on the fixture's module instance: a doit
pre-creates a module slot for every module variable of the source, and the
smoke module -- 372 defs, dozens of classes and constants -- is within reach
of GemStone's per-object dynamic-instVar limit.  The fixture must not grow
its module-level NAMES much further; new cases should reuse classes or move
to a second fixture module.

Fixture: bump_global / read_global / GlobalUser.poke (a module-def store, a
method store through the module instance), walrus_if, walrus_while,
walrus_compare.  Compiled 365 -> 372, 0 fallbacks, RESULTS true with the flag
on and off.  Gates: flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] WarningRegistryTestCase>>testOnceIsOncePerProcess`
(AlmostOutOfMemory in its shard log, 4 notifications).
