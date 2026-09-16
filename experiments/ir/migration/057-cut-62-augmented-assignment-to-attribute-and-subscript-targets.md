## Progress — cut 62 (augmented assignment to attribute and subscript targets)

`AugAssignAst:target-AttributeAst` (64 stdlib methods + 3 defs) and
`-SubscriptAst` (a handful) were the last statement shapes the class-method
corpus ranked above the long tail.  printSmalltalkOn:'s three branches are
reproduced -- and, unlike the simple-local branch's `___augmentedOp___:
inplace:binary:` probe, all three apply the BINARY operator send to the
loaded value and store the result, as the text does:

    self @env0:dynamicInstVarAt: #x put: ((self @env0:dynamicInstVarAt: #x
        ifAbsent: [self @env1:___pyAttrLoad___: #x]) __add__: (v))          -- self.x op= v
    ___slot_x___ := (___slot_x___ ifNil: [self @env1:___pyAttrLoad___: #x]) __add__: (v)
                                                                            -- a __slots__ name
    (obj) @env1:___pyAttrStore___: #x put: (((obj) @env1:___pyAttrLoad___: #x) __add__: (v))
    (obj) __setitem__: (i) _: (((obj) __getitem__: (i)) __add__: (v))

The receiver (and index) are emitted twice for the foreign and subscript
shapes because the text prints them twice -- a call there runs twice on both
paths.  A slice index (`a[1:] += ...`) stays on text
(`AugAssignAst:target-SubscriptAst-slice`); the structural discriminator
(`___irComplexTargetShape___`) is shared by eligibility and the emit, which
has no locals set at build time.  The flow analysis counts the target's
receiver and index as reads.

Fixture: Tally (`self.n += k`, `self.items += [k]`, a foreign `other.n -=
1`, `d["k"] += 10`, `lst[1] *= 3`), SlotAcc (`self.total += v` on a slot).
Compiled 292 -> 298, 0 fallbacks, RESULTS true with the flag on and off.

The first flag-on sweep added `TracebackTestCase>>testRecursionContextChain`
(reproducible alone flag-on, 46/46 flag-off in the same harness).  The
fixture's runaway `f()` does `_depth[0] += 1`, so this cut moved it to IR --
and the RecursionError block's innermost frame then rendered `line 53 /
except ZeroDivisionError:` where the text renders `line 52 / 1 / 0`, so the
one-block-per-link count found an extra `ZeroDivisionError:`.  An IR frame's
line comes from its ip, and at a stack overflow ON ENTRY to the try the ip
sits on the try's set-up sends: the `on:do:` itself (stamped at the TryAst's
position, which is the except header) and the lazy except-selector
construction (stamped wherever the type NAME's emit had left the builder --
the header again).  The text names the try-body statement there
(`___curPos___`).  Both sends are now stamped at the first try-body
statement's position (`___irTryStampPosition___`); the selector block's
contents keep the header's line, so a failing `except <expr>` still points at
its clause.  Direct probes of the fixture (`perform:` outside the module
body) overflow uncatchably on BOTH paths -- the recursion guard wraps the
module body, which is where the test's checks run -- so the instrument had
to be the SUnit class itself, flag-off as the control.
Gates (after the fix): flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] WeakReferenceTestCase>>testCallbackFiredOnCollection`
(AlmostOutOfMemory in its shard log, 13/13 alone flag-on: the cold-shard
memory-pressure follow-up again, 4 notifications in the sweep).
