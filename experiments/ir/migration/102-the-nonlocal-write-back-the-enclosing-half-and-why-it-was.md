## The nonlocal write-back: the enclosing half, and why it was smaller than costed (2026-09-13)

`classDef:nonlocalBelow` (19) and `NonlocalAst:notLocal` (21) were recorded here
as one 42-row family needing **"five coordinated changes across three files, two
of them new emits in the assignment path… bigger than the last four cuts put
together."** That estimate was wrong in a way worth keeping, because the reason
it was wrong is a fact about the design rather than an arithmetic slip.

### What the estimate missed

It assumed the inner class's methods would be built through the IR seam, so an
`AssignAst` / `AugAssignAst` store-through-cell emit would be needed. They are
not: `___irHelperSourceWithSelector___:carrying:` generates the class emit with
the class-method seam **suppressed** (`___irEmitClassBodyAsTextDo___:`), so the
inner method's `(self ___classCellSetter___: …) value: …` is TEXT that already
works. **No new IR emit is needed for the enclosing half at all.**

That splits the 42 cleanly. The 19 `classDef:nonlocalBelow` rows are the
ENCLOSING methods and are closed here. The 21 `NonlocalAst:notLocal` rows are
the inner class's own methods; they need the seam un-suppressed, which is the
separate cut the helper's comment already names.

### The refusal's stated reason was true and not a reason

`___cellReaderSourceFor___:` carried this note:

> Only the reader has this route: the SETTER's identifier is an assignment
> TARGET (`x := ___cellSetVal___`), which no block call can be, which is why
> `___irMethodLocalClassReason___:` refuses a `nonlocal` below the class.

Both clauses are correct. The conclusion does not follow: the enclosing frame
can hand in a **one-argument block that performs the assignment**, exactly as it
hands in a zero-argument block that performs the read. `___cellSetterSourceFor___:`
routes the setter cell's body through `___irSetter_<i>___ value: ___cellSetVal___`
and the write lands where the reader reads.

**And the failure it was guarding against is real**, which is why this needed an
emit rather than a predicate read like the last three cuts. The helper declares a
temp of the enclosing name and seeds it from the reader block, so
`calls := v` inside the helper *compiles happily and writes the helper's local
copy*. Not a compile error — a silently wrong answer.

### Symmetric throughout

* `___irHelperSelector___:` gains a `setters:` keyword when anything is carried;
* the helper declares `___irSetter_<i>___` beside `___irCell_<i>___` and unpacks
  both in its prologue;
* `___emitIRStatementOn___:` builds `[:v | x := v]` per carried name over the
  same leaf the reader block reads;
* the refusal narrows from "any `nonlocal` below" to "a `nonlocal` naming
  something the helper does not carry" (`classDef:nonlocalNotCarried`).

A setter is carried for every carried name, not only for the written ones. The
write set is a side effect OF generating the class emit and so is not known until
after the helper's selector and arity are fixed, while the carried list is a
static property of the tree. An unused setter block costs one block object.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:classDef:nonlocalBelow` | 19 | **0** |
| `classDef:nonlocalBelow` (top-level) | 1 | **0** |
| `cm:NonlocalAst:notLocal` | 21 | 21 (the other half) |
| `cm:eligible` | 10689 | **10708** |

Re-measured after rebasing onto #959, so the baseline is the bare-rewrite cut's
10689 rather than the 10642 this board first carried; the delta is the same +19.
Fallbacks 0 across all three census shards.

### Two pre-existing gaps the fixture found

Both verified against `main` before this cut, on the TEXT path, so neither is
this cut's:

* **`nonlocal p` naming the enclosing function's PARAMETER** raises
  `CompileError (error 1001), expected an assignable variable` — the module
  fails to load outright. CPython writes the parameter like any other local.
* **`{Key(): 1}[Key()]` calls `__eq__` a different number of times than
  CPython** (2 against 1). That is how the corpus spells this shape, so it is
  worth knowing; the fixture drives the comparison explicitly instead, because
  counting cell writes is not the place to discover a dict-lookup divergence.

Both are documented in `tests/python/nonlocal_through_class_cell.py` and left
out of its checks — a red test for a pre-existing gap says nothing about the cut
the file is there for.
