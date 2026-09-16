## `method:selfRebound`: one flag, not a sweep through the node classes (2026-09-15)

`cm:method:selfRebound` (11). CPython treats the self/cls parameter as an
ordinary rebindable local, and two idioms depend on it: `self = None` to break a
reference cycle, and `self = object.__new__(cls)` in `__new__`. Grail compiles
the receiver to Smalltalk `self`, which cannot be assigned, so such a method
carries it in a TEMP instead.

**The row was parked twice as "degrades every receiver fast path across several
node classes".** That is true and it is not the cost it sounds like: every one of
those paths reaches the decision through ONE predicate —
`___irIsSelfReceiver___` → `CallAst>>isSelfReference:`, which already answers
false when `selfParameterRebound` is set. Setting that flag for the build stands
them all down at once. The cut is the flag plus a transport temp initialised
from `self`, which is precisely the pair `generateMethodSourceOn:` emits.

The flag is set in `___irMethodBodyOn___:install:`, split into a wrapper and a
core, so both build entry points (`___irBuilderFor___:` and
`___installIRMethodBodyOn___:`) get it without having to agree separately.

### What the behavioural test could not see

The first version passed all the fixture's checks with correct answers and still
had a gap. `___irLocalNameSet___` excluded the receiver, so `self = None`
refused one step LATER as an ordinary bad assignment target. The census said so
and the fixture could not:

| row | baseline | first version |
| --- | ---: | ---: |
| `cm:method:selfRebound` | 11 | **0** |
| `cm:AssignAst:target-NameAst` | 0 | **6** |
| `cm:AssignAst:target-TupleAst` | 2 | **7** |
| `cm:eligible` | 10878 | 10878 |

The row did not close, it **MOVED** — and that is only visible in the row-by-row
diff. The totals alone read as a plausible "+0 net, all eleven uncovered behind
it", which is a shape this board produces legitimately all the time. The test
case now asserts `AssignAst:target-NameAst` is 0 as well, so the same mistake
cannot pass again.

### `del self` stays refused, deliberately

The original refusal covered an assignment OR a `del`, and the first draft of
this cut handled both. That was wrong: **`del self` does not compile on the TEXT
path either** — measured on `main` with the flag off, it answers *"Grail could
not compile this method (codegen gap)"*. Handling it here would put the IR path
ahead of its own oracle and leave the flag-off build failing on source the
flag-on build accepts. It keeps its own row (`method:selfDeleted`, 0 on this
corpus) so the board names the shape rather than claiming support for it, and
the fixture documents it instead of asserting it.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:method:selfRebound` | 11 | **0** |
| `cm:eligible` | 10878 | **10889** (98.7%) |

Eleven retired, **+11 net** — nothing moves up behind it. Same-tree baseline on
the `main` this branch was cut from, which predates #981, #982 and #983; the
branch has since been rebased on top of all three, so these two numbers are the
cut's own delta and not the board's current absolute position. `CENSUS.md` wants
one combined re-measure once the family has landed.
