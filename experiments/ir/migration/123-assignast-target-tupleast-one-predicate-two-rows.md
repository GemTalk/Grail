## `AssignAst:target-TupleAst`: one predicate, two rows (2026-09-16)

`cm:AssignAst:target-TupleAst` (2) and — for free — `cm:shape:WithAst` (1).

Every leaf of an unpacking target has to be stored somewhere, and a
`global`-declared leaf has no local to store into: the parser strips a declared
global from the scope's variables, so `___irUnpackLeafEligible___:`'s
"is this name in the local set" test refused it, and with it the whole
statement.

**The same predicate serves `with ... as`**, which is why one change closed two
rows. `WithAst` asks `___irUnpackTargetEligible___:` / `___irUnpackLeafEligible___:`
for its as-target, so `with cm() as some_global:` was refused for exactly the
same reason — test_global's `test_enter_result`, the one site. That row closing
was not predicted; it showed up in the row-by-row diff and traced straight back
to the shared predicate.

### The leaves are decided individually

Which is the failure this guards against: routing a whole statement one way
would be wrong for `c, loc = 'C', 'local'` where one leaf is a global and the
other a local, and each half looks right on its own. Each leaf asks
`___nameStoreRoutesToModule___:` — the rule this family keeps coming back to
(the nested-def global cut, the augmented-assignment one, and now the unpack).

`module_sees_the_change` reads every name back from module scope at the end, so
a leaf that stored into a method temp — right-looking inside its own function,
invisible outside — cannot pass.

### One helper was lifted rather than copied

`___emitIRModuleStoreOf___:to:on:` lived on `AssignAst` and carried its OWN copy
of the receiver rule (`self` in a module def, `<Mod> ___instance___` in a class
method) beside the copy in `___emitIRModuleReceiverOn___:`. The unpack needed it
from `AbstractNode`, so it moved there and now reads the shared receiver. Two
copies of a rule that must not drift is how a store and a delete came to
disagree once already.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:AssignAst:target-TupleAst` | 2 | **0** |
| `cm:shape:WithAst` | 1 | **0** |
| `cm:AssignAst:chained-target-NameAst` | 0 | **1** |
| `cm:eligible` | 13213 | **13215** |

Three sites freed, one MOVED: the same method holds a CHAINED assignment to a
global, a different shape and the next refusal in line. A row names the first
refusal, not the only one — so **+2 net**. Same-tree baseline measured by
reverting `AbstractNode.gs` and `AssignAst.gs` to `origin/main`.
