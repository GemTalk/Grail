## Progress — cut 58 (set and dict comprehensions)

`value:SetCompAst` (2 stdlib defs + methods) and `value:DictCompAst` (5 + 8):
the list comprehension's accumulator block with a different seed and a
different innermost statement, and nothing else.  The text (trace of
`uniq(xs)` and `index(xs)`):

    ___r___ := (set perform: #new env: 0).      ...  ___r___ @env0:add: ((x) ___binOpMod___: (3)).
    ___r___ := (PyDict perform: #new env: 0).   ...  ___r___ @env0:at: (x) @env0:put: (i).

SetCompAst and DictCompAst take the four IR methods ListCompAst has
(eligibility, the census child-scope hook, the refusal detail, the read
collector) with `ComprehensionAst class>>___emitIRGenerators___:...` doing
the clauses; DictCompAst judges and collects reads for both its key and its
value in the comprehension's scope and emits the key before the value, the
text's argument order.  Nothing new is refused: the clause refusals are cut
57's (`Comprehension:async` / `starTarget` / `target-<Class>`).

Fixture: seven module defs (set: modulo, pairs with a filter, a tuple target
with a filter; dict: enumerate, `.items()` with a filter, a nested list
comprehension as the value, a target shadowing a parameter and read after)
and class `CompBag` (a set and a dict comprehension over `self.items`, a dict
whose value is a self-send whose body is itself a list comprehension), values
verified under CPython 3.14.6.  Compiled 302 -> 315 (all 13 new defs),
fallbacks 0; flag OFF ALL_OK at compiled=0.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 315, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`
  on the second run.  The first read `6431 run, 6430 passed, 0 failed, 1
  errors` -- `ZipfileTestCase>>testOpenStreamsInSmallReads`, an
  AlmostOutOfMemory notification in shard 3 (4 in that shard's log; the
  test cut 33 recorded for the same effect), 14/14 alone in a fresh
  session, 0 notifications on the re-run.  With the flag OFF none of this
  cut's code runs (`___buildModuleClassBody:name:` consults the flag before
  eligibility), so this is the machine's ceiling reaching the flag-off gate
  for the first time; cuts 53, 54 and 57's flag-off runs had 0 notifications.
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6422 passed, 8 failed, 1 errors`
  -- exactly the known nine at 9b72095b by name, every shard finished, 0
  AlmostOutOfMemory notifications in any shard log (the run before, cut 57's,
  lost shard 1 to the ceiling three times out of four, control included).
