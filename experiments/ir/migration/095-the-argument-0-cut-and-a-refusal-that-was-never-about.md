## The argument-0 cut, and a refusal that was never about argument 0 (2026-09-11)

`CallAst:super-argZeroDeletable` (32) is closed. It cost one predicate and no
machinery, which is not what the previous section predicted, and the reason is
worth more than the row.

| row | before | after | where it went |
| --- | ---: | ---: | --- |
| `CallAst:super-argZeroDeletable` | 32 | **0** | 30 eligible, 2 to `NameAst:reservedIdentifier` |

Measured paired on one build, on a brand-new extent, census reverted and
re-run rather than reasoned about. `cm:eligible` 10510 → **10540**, and the
before-control reproduces the committed baseline of 10510 exactly. The two
that moved are one method each in `test_enum` and `test_subclassinit`: they now
pass the super gate and refuse on a reserved identifier the super refusal had
been masking. Nothing is unaccounted for.

### The refusal was a context artifact

`___irSuperShape___` asked `___superArgZeroGuardName___` whether a `del` could
have cleared argument 0. That predicate is only meaningful **while the def is
being emitted**, because it reads `CallAst selfParameterName`. During the
eligibility probe that name belongs to a different frame, so `cls` did not
compare equal to it and every such method looked deletable. At emit time it
answers nil, the text path emits no guard at all, and the two paths' generated
code for these methods is character-for-character identical — which is why the
cut changes no behaviour and needed no frame work.

This is [[ir-eligibility-and-emit-differ-in-context]] again, and it is the
second row on this board to be closed by noticing it rather than by building
anything. **Before costing a row, check whether its predicate means the same
thing in both contexts.**

`___emitIRSuperZeroOn___` does now emit the guard, faithfully mirroring the
text:

    (<argZero> == nil ifTrue: [Super ___argZeroDeleted___] ifFalse: [<proxy>])

**That arm is not reachable through the seam today**, and the honesty matters
more than the code. Every shape whose guard name is non-nil at EMIT time
refuses earlier and elsewhere: a def nested in a method as `cm:nestedDef:super`,
a method that rebinds its own receiver as `cm:method:selfRebound`, and a def
written under an `if` in a class body by never being registered at all (it is
not a direct class-body statement). It is emitted so the IR path mirrors the
text by construction rather than by coincidence, and so the nested-def cut
inherits it.

### The fixture's nesting is load-bearing

`tests/python/super_arg_zero.py` wraps every shape in a method of `Harness`.
A first draft put them in module-level functions and censused **9 eligible, 0
refusals with the refusal still in place** — a fixture that passes whether or
not the cut exists. Only a class local to a METHOD OF A CLASS refuses, which is
the shape `test_subclassinit` is full of. With the nesting right: 4 refused / 9
eligible before, 0 refused / 13 eligible and 13 compiled after.

`___irStats___` cannot see this cut at all. An eligibility refusal never
reaches the seam, so it is not a FALLBACK — the refused methods are simply
compiled the old way, every behavioural assertion still passes, and
`compiled > 0` stays true on the strength of the fixture's other methods.
`testTheRefusedShapeIsNowEligible` therefore asserts on the CENSUS, and was
verified against the revert: it is the one test of the three that fails.

**So `compiled > 0` is necessary and not sufficient.** It catches a seam that
died; it cannot catch a widening that never happened. A cut that moves
eligibility needs a census assertion, not a stats one.

### The board after this cut

| row | count |
| --- | ---: |
| `CallAst:frameSensitive-exec` | 77 |
| `CallAst:frameSensitive-eval` | 52 |
| `NameAst:reservedIdentifier` | 30 |
| `shape:TryAst` | 25 |
| `NonlocalAst:notLocal` | 21 |

The top two are still one cut and still genuine frame machinery.
`reservedIdentifier` (30) and `shape:TryAst` (25) are the largest codegen rows.

**CORRECTION, and it is the trap this file already documents.** This table first
listed `method:selfRebound` at 29 as the second-largest codegen row. That number
was SHARD-SUMMED while every other row in the table was per-module deduped — the
two lists were read in the same session and one row was taken from the wrong one.
Deduped the way `CENSUS.md` builds corpus totals, `method:selfRebound` is **11**,
and NINE of those eleven are `_pydecimal.Decimal`'s comparison methods
(`__eq__`, `__lt__`, `__le__`, `__gt__`, `__ge__`, …); the other two are one
method each in `test_super` and `test_scope`. It is a small row concentrated in
one module, not a second frame-sized cut.

So: **never read one row from a different aggregation than its neighbours.**
Shard-summing overstates by roughly half because a stdlib module pulled in by
two shards is compiled and counted in both, and the overstatement is uneven —
here it tripled one row while leaving the four around it correct, which is
exactly what makes it survive a sanity check.

`method:selfRebound` is still worth reading, and unlike the argument-0 row it is
NOT a context artifact: `assignedNamesInBody` and `deletedNamesInSubtree` walk
this def's own AST, so the predicate means the same thing in both phases. It
refuses a method that assigns to or deletes its own receiver parameter, which
the text handles by declaring a transport temp, seeding it from the receiver,
and printing the body with `CallAst selfParameterRebound` set so every receiver
fast path degrades. The IR half of that is real work: `___irIsSelfReceiver___`
already consults `isSelfReference:` and so would degrade on its own, but the
name must then resolve to a LOCAL TEMP, and today it would fall through to the
module-instance/global read. A genuine cut, correctly sized at 11.
