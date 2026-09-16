## `frameSensitive-*-bareRewrite`: the rows the eval-nested cut created (2026-09-16)

`cm:CallAst:frameSensitive-eval-bareRewrite` (2) and
`cm:CallAst:frameSensitive-exec-bareRewrite` (2). These two rows are ones the
eval-nested cut CREATED — it retired the blanket `-nested` refusal and let four
sites report under the name of the gap that actually stopped them. This closes
that gap, so the family is finished.

`eval(expr)` with no namespace argument is not dispatched to the builtin at all:
`printSmalltalkOn:`'s step 0c rewrites it, injecting the enclosing scope's
locals. The IR path had that rewrite for a top-level def and a method, and
refused every other scope under one symbol.

**The text emits the same rewrite in a nested def, character for character.**
Step 0c's first arm tests `functionBeingCompiled notNil`, which a nested def
satisfies, and `___emitIRLocalsSnapshotOn___:` reads that *same*
`CallAst functionBeingCompiled` — inside a nested block emit it IS the nested
def. So the snapshot gathers that def's own names with no change to the emit;
the whole cut is the scope predicate.

What stays refused is a scope whose locals the snapshot cannot build: a
COMPREHENSION, whose targets step 0c prints through a different helper, and a
CLASS BODY, which is not a namespace the snapshot models. A class further OUT is
just the class a method belongs to — so the predicate tests the INNERMOST kind
rather than asking whether a class appears anywhere.

### Two wrong versions, both caught by the census and neither by a value

* the first used `noneSatisfy:`, which GemStone does not implement, so the
  ELIGIBILITY PROBE RAISED — six `body:probeError` rows. Every value in the
  fixture was still right, because a probe error falls back to text. This is the
  failure mode `ir-eligibility-must-not-raise` records, met again;
* the second rejected a class ANYWHERE in the chain, which would have regressed
  the plain-method shape the old rule admitted. One `bareRewrite` row survived
  and said so.

The three-stage control shows both, plus the restored refusal: each fails
`testTheBareRewriteRowsAreGone`, and the behavioural test passes in all three.

### It moved a number in another test, which is the honest part

`BareEvalExecScopeTestCase>>testTheBareRewriteIsNowEligible` asserts how many
bare-rewrite sites its own fixture still has. That number has now been **0, then
3, then 1** — and each move was a different cut narrowing a refusal rather than
anything about the fixture changing. It was 0 while the wider `-nested` refusal
reached those sites first; it became 3 when that was retired; it is 1 now, and
the one left is the comprehension at the bottom of that fixture. The flag-on
cold suite is what caught it, which is the gate doing exactly its job.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:CallAst:frameSensitive-eval-bareRewrite` | 2 | **0** |
| `cm:CallAst:frameSensitive-exec-bareRewrite` | 2 | **0** |
| `cm:eligible` | 13213 | **13217** |

Four sites, all closed, nothing moved.
