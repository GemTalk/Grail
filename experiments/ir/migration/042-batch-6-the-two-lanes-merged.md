## Batch 6: the two lanes merged

Cuts 35-36 (wt/c) and 40-43 (wt/d) were developed in parallel on two
worktrees and merged in FunctionDefAst: the varargs lane's all-bound-parameter
set feeds the body-local derivation and the flow analysis, minus the receiver
in method mode (`___irLocalParamNames___`); the class-method lane's build
parameters name the Smalltalk arguments of the simple form inside the varargs
lane's branch; the eligibility predicate runs the method-mode conditions first
(they keep methods on the simple-positional selector for now) and then the
signature judgement.  Smoke fixture 147 + 26 = 173 compiled.

Merged flag-on sweep: 6429 run, 8 failed, 1 error -- all known: the PEP 657
span family (`testForLoopExceptionPositions`, `RaiseSpanTestCase`,
`SpanEndTokenTestCase`, `WithItemPositionsTestCase`, `LambdaFrameTestCase`),
the two generated-text introspections (`testTheTempsFastPathNeedsNoSource`,
`testInstanceMethodNoOuterBlock`), the IR-frame receiver suggestion, and one
AlmostOutOfMemory.

After merging main (#835, the bound-method capture pin): flag-off 6430/6430;
flag-on adds `PrivateNameManglingTestCase>>testPrivateNameMangling` -- the
fixture's ``Deep'' recursion (a private method recursing until RecursionError,
which the caller's ``except RecursionError'' must catch) now escapes the IR
handler: the recursion-guard byte budget, already on the deferred list
(test_recursion_raises_recursion_error flaps the same way).  An IR frame is
narrower than its text twin, so the guard fires at a different depth and the
reserve left for the handler differs; the test passed alone before #835 moved
the call path's frame sizes.  Deterministic now, and the right fix is the
guard's, not the emitter's.
