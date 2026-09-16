## Progress — cut 78 (the captured local, carried BY REFERENCE)

Cut 77 carried a capture by VALUE and so could only carry a name that cannot
change -- an unassigned parameter -- which measured as +3 class methods,
because real code captures BODY LOCALS.  This cut carries all of them, and the
mechanism is one hook the text already routes every cell store through.

**How.**  The helper is handed the enclosing frame's own zero-argument READER
BLOCK for each captured name, `[x]`, built in the IR method (`inBlockDo:` over
`var: (leafFor: #x)` -- bare, no unbound guard, which is what the text's `[x]`
compiles to).  Each gets two temps in the helper, and they answer different
questions:

* `___irCell_<i>___` holds the block, and the class's cell BODY calls it --
  `Cap ___pyAttrStore___: #'___cell_x___' put: [___irCell_1___ @env0:value]` --
  so a method-body read sees what the enclosing binding holds AT READ TIME.
  That is by reference through one more level of indirection, and it is
  CPython's cell semantics and the text's alike.
* the enclosing-scope IDENTIFIER temp holds the value the block answers NOW,
  for the reads the class emit makes EAGERLY at class-creation time: a base
  expression, a class attribute's value, a method's def-time default.  That is
  exactly when the text evaluates those too, and the read is unguarded on both
  sides, so an unbound binding answers nil rather than raising -- again what
  the text does.

The only new seam is `ClassDefAst>>___cellReaderSourceFor___:`, which answers
the cell reader's body: normally `___enclosingScopeIdentifierFor___:`'s answer
(the text's own), and the `___irCell_<i>___ @env0:value` form while a
captured-name -> index map is in place (`___irWithCaptureCellMap___:do:`, set
only around the transport emit).  `___enclosingScopeIdentifierFor___:` itself
is untouched, because the helper's own temp declarations need its plain answer.

**Why the SETTER cell cannot go the same way**, and so why
`classDef:nonlocalBelow` stays: the setter's identifier is emitted as an
assignment TARGET (`x := ___cellSetVal___`), and no block call can be one.  10
defs / class methods in the test subset.

**What the shapes prove.**  Every fixture entry here is a DIFFERENT value under
by-value marshalling, which is the point of choosing them:

* `mlc_loop_classes(3)` -> `[2, 2, 2]` -- three classes made in a loop, each
  reading the loop variable, all seeing its FINAL value.  This is Python's
  famous late-binding closure result, and by-value would have given
  `[0, 1, 2]`.
* `mlc_late_bound()` -> `7` -- the class is built and instantiated BEFORE the
  captured name is ever bound; by-value would have frozen nil.
* `mlc_rebound()` -> `[2, 3]` -- the def rebinds the captured list after the
  class statement (cut 77's negative control `mlc_cap_reassigned`, now
  carried, is the scalar twin: `(2, 2)`).
* `mlc_mutated()` -> `(1, 3, [1, 9, 1])` -- interleaved mutation from inside
  and outside the class.
* `mlc_body_and_cell(5)` -> `(5, 5)` -- the SAME name read both eagerly (a
  class attribute) and lazily (a method body), which is what the two temps are
  for.
* `mlc_two_levels(9)` -> `9` -- a class inside a NESTED def, capturing the
  outer def's parameter across the closure block.

**Census.**  Stdlib (125 imports, `./install.sh` first): **1570 / 1592
top-level defs (98.62%)**, was 1565; **4544 / 4621 class methods (98.33%)**,
was 4541; 6106 compiled, **0 fallbacks**.  The `classDef:*` rows are GONE from
the stdlib board outright -- what refuses a stdlib top-level def now is only
the deliberately frame-sensitive calls (`globals` 4, `dir` 4, `vars` 3, `exec`
1), PEP 695 type parameters (2), complex literals (2), and one each of
`stmt:MatchAst`, `Comprehension:async`, `nestedDef:kwonly`, `nestedDef:flow`,
`NameAst:super`, `AugAssignAst:target-NameAst`.

Test subset (the same fourteen modules, matched against the same before-run):

| | before cuts 76-78 | after |
| --- | ---: | ---: |
| top-level defs compiled | 795 / 821 (96.8%) | **801 / 821 (97.6%)** |
| class methods eligible | 2716 / 4103 (66.2%) | **3071 / 4103 (74.8%)** |

**+355 class methods and +6 top-level defs** over the three cuts.

**WHICH class methods, because the number invites the wrong reading.**  They
are the ENCLOSING class-body methods -- `test.test_math.MathTests.testCeil` and
its 350-odd siblings, methods of MODULE-LEVEL classes whose BODIES contain a
`class` statement.  Those refused with `cm:stmt:ClassDefAst` and now compile
through cut 36's seam like any other method.  The INNER class's own methods do
NOT go through IR and this cut does not claim they do: they are refused by
`___irMethodModeReason___`'s module-scope test as `cm:method:classNotAtModuleScope`,
and that row reads **842 in both halves of the matched pair** -- it did not move
by one.  Retiring it is a separate cut, and a harder one (see the def-table
lifetime note in cut 76: a method-local class is rebuilt on every CALL of its
enclosing def, long after `___irPurgeDefTableForModule___:` has run).

The row-by-row account, so the total is checkable rather than asserted.  Gone:
`cm:shape:ClassDefAst` 347 and `cm:classDef:capturesLocal` 60 = 407.  Grown
within the family: keywords +10, nonlocalBelow +9, decorated +2, bodyStatement
+2 = +23, so the family shrank by 384.  Of those 384, **29 did not become
eligible but simply reported their NEXT blocker** -- refusal is
first-reason-wins, and a class statement earlier in the body had been masking
it: `frameSensitive-globals` +14, `dir` +4, `complex` +2, `exec` +2,
`nestedDef:flow` +2, `eval`/`locals`/`super`/`nestedDef:super`/
`AssignAst:target-AttributeAst` +1 each.  384 - 29 = **355**.

And the eligibility tally is corroborated by the RUNTIME one, which is the
harder number: `importlib ___irStats___`'s `compiled` -- methods actually built
by `generateFromIR:`, counted by `___irNoteCompiled___` in both seams -- goes
**3508 -> 3869 across the same pair, +361 = 355 + 6**.  So these methods are
built, not merely classified.

**The census-tally bug is not in this pair**, which is worth stating because
its phantom rows landed in exactly the row a sceptic would suspect.  The
pre-fix reading of the cut-76 run was `cm:method:classNotAtModuleScope` 1168
and a 4429 denominator; the matched pair reads 842 and 4103 in BOTH halves.
The BEFORE half cannot have been affected at all: with
`___irEligibleStatementLocals___:` forced to `false` the transport emit never
runs, so `___irEmitClassBodyAsTextDo___:` never sets the flag and the old
`___irCensusOn___` behaved identically to the fixed one.  The AFTER half was
measured after the fix.  The 1168/4429 reading was discarded and re-measured,
and it is the only reading the bug ever touched.

What is left of the family: `cm:classDef:decorated` 23, `cm:classDef:keywords` 14 (a
metaclass or other class keyword), `cm:classDef:nonlocalBelow` 9 + 1,
`cm:classDef:bodyStatement` 3, `cm:classDef:outerBinding` 1.  The two biggest
are the same problem as each other -- a decorator and a class keyword are both
expressions the emit evaluates in the enclosing scope, around the class rather
than inside it -- and they are now the next cut in this family.

Gates (both from wt/d on gs40 through `scripts/with_stone_lock.sh`, 8 of 8
shards reporting, no "Login failed", per-shard counts summing to the suite
line): flag-off `6551 run, 6551 passed, 0 failed, 0 errors`; flag-on cold sweep
`6551 run, 6545 passed, 5 failed, 1 errors` -- the same six as main, no new
name.  Fixture: 6 more shapes; compiled 492 -> 500, 0 fallbacks, RESULTS true
with the flag on and off and under CPython 3.14.6.
