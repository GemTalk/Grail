# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: `census_stdlib.tpz` imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and `census_tests_00..02.tpz` import every module of `scripts/cpython_suite_manifest.txt`, round-robin across three sessions because one session cannot hold the whole manifest. Each script reads its module list at run time, so adding a module to the manifest needs no edit here. Both corpora run in well under a minute.

**They need the suite's gem configuration, not topaz's defaults.** Under a bare
`topaz -l` the manifest shards die partway with `OutOfMemory old space overflow`
/ `VM temporary object memory is full` (error 4067) -- which looks like a census
bug and is not. Run them the way the suite runner does:

```bash
CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=900000;GEM_MAX_SMALLTALK_STACK_DEPTH=80000;"
$GEMSTONE/bin/topaz -lq -C "$CFG" -S experiments/ir/census_tests_00.tpz < /dev/null
```

This paragraph is EMITTED BY `census_report.py`, not hand-written here: the
report rewrites `CENSUS.md` wholesale, so prose added to the board by hand is
silently dropped by the next regeneration.  Anything worth keeping goes in the
generator.

**Each module is counted once, however many sessions compiled it.** Every session compiles the stdlib its own modules import, so a module reached from two shards is measured in both; this report therefore builds the corpus totals from the per-module rows rather than by summing the session totals. It matters here: of the 227 modules the test corpus touches, 89 are reached from more than one shard, and summing them -- which is what produced the boards before this was fixed -- overstates the corpus by about half. The shards agree exactly on every module they share, so which copy is taken makes no difference, and ANY split of the manifest gives the same board; that is checked by running one.

Counts here are exact and reproducible; the EXAMPLE names beside each reason are not. importlib keeps only the first five it sees per reason per session, so which five reach the board depends on the order modules were compiled. They illustrate a reason; they never enumerate it.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1583 top-level defs, **1581 compiled through IR (99.9%)**; 4600 class-body methods, of which **4599 are IR-eligible (100.0%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6387 defs the corpus holds, 96.8% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1581 | 99.9% | `compiled` | _codecs._bootstrap, _codecs.lookup, _codecs.normalizestring, _codecs.register, _codecs.unregister |
| 2 | 0.1% | `typeParams` | typing.override, typing.reveal_type |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4599 | 100.0% | `eligible` | __future__._Feature.__init__, __future__._Feature.__repr__, __future__._Feature.getMandatoryRelease, __future__._Feature |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 9 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_codecencodings_kr, test.test_ipaddress, test.test_linecache, test.test_pickle, test.test_pulldom, test.test_ssl, test.test_typing, test.test_zipapp).

**test corpus, everything compiled**: 1347 top-level defs, **1344 compiled through IR (99.8%)**; 11153 class-body methods, of which **11119 are IR-eligible (99.7%)** through the class-method seam (cut 36); 154 nested defs/lambdas. Of all 12654 defs the corpus holds, 98.5% go through IR.

**`test.*` modules alone**: 273 top-level defs, 273 compiled (100.0%); 8459 class methods (test code is almost entirely TestCase methods), of which 8426 IR-eligible; 55 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 8426 | 99.6% | `eligible` | test.test_int.IntTestCases.test_basic, test.test_int.IntTestCases.test_invalid_signs, test.test_int.IntTestCases.test_no |
| 10 | 0.1% | `GeneratorExpAst:async` | test.test_asyncgen.AsyncGenAsyncioTest.test_async_gen_expression_01, test.test_asyncgen.AsyncGenAsyncioTest.test_async_g |
| 2 | 0.0% | `NonlocalAst:classCell` | test.test_super.TestSuper.tearDown, test.test_super.X.f |
| 2 | 0.0% | `classDef:outerBinding` | test.test_scope.ScopeTests.testNonLocalClass, test.test_super.TestSuper.test_various___class___pathologies |
| 2 | 0.0% | `nestedDef:typeParams` | test.test_funcattrs.FunctionPropertiesTest.test___type_params__, test.test_functools.TestUpdateWrapper._default_update |
| 1 | 0.0% | `AssignAst:chained-target-NameAst` | test.test_builtin.BuiltinTest.test_all_any_tuple_optimization |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst-slice` | test.test_augassign.AugAssignTest.testSequences |
| 1 | 0.0% | `CallAst:super-explicitNamesOtherClass` | test.test_super.C.method |
| 1 | 0.0% | `Comprehension:target-SubscriptAst` | test.test_listcomps.ListComprehensionTest.test_unbound_local_inside_comprehension |
| 1 | 0.0% | `DeleteAst:name` | test.test_dict.ClearOnDelete.__del__ |
| 1 | 0.0% | `ForAst:async` | test.test_coroutines.CoroutineTest.test_for_assign_raising_stop_async_iteration |
| 1 | 0.0% | `ForAst:other` | test.test_global.GlobalTests.test_iteration_variable |
| 1 | 0.0% | `NameAst:super-declaredInFunction` | test.test_super.C.method |
| 1 | 0.0% | `classDef:moduleScopeTarget` | test.test_global.GlobalTests.test_class_def |
| 1 | 0.0% | `method:classInClassBody` | test.test_traceback.X.__str__ |
| 1 | 0.0% | `method:noSelfSuper` | test.test_super.C.f |
| 1 | 0.0% | `nestedDef:super` | test.test_super.TestSuper.test_obscure_super_errors |
| 1 | 0.0% | `shape:DictAst` | test.test_listcomps.ListComprehensionTest.test_code_replace_extended_arg |
| 1 | 0.0% | `shape:ImportAst` | test.test_global.GlobalTests.test_import_result |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `stmt:TypeAliasAst` | test.test_global.GlobalTests.test_type_alias |
| 1 | 0.0% | `typeParams` | test.test_reprlib.My.__repr__, typing._IdentityCallable.__call__ |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 273 | 100.0% | `compiled` | test.test_math.count_set_bits, test.test_math.partial_product, test.test_math.py_factorial, test.test_math.to_ulps, test |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| pickle | 88 | 88 | 100% | 31 | `cm:eligible` (31) |
| jinja2.filters | 75 | 75 | 100% | 3 | `cm:eligible` (3) |
| _codecs | 67 | 67 | 100% | 0 | `-` (0) |
| traceback | 59 | 59 | 100% | 32 | `cm:eligible` (32) |
| inspect | 57 | 57 | 100% | 38 | `cm:eligible` (38) |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (14) |
| pydoc | 42 | 42 | 100% | 80 | `cm:eligible` (80) |
| werkzeug.http | 39 | 39 | 100% | 0 | `-` (0) |
| _py_warnings | 30 | 30 | 100% | 13 | `cm:eligible` (13) |
| sqlparse.engine.grouping | 28 | 28 | 100% | 0 | `-` (0) |
| _pydecimal | 26 | 26 | 100% | 214 | `cm:eligible` (214) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| copy | 22 | 22 | 100% | 1 | `cm:eligible` (1) |
| gettext | 20 | 20 | 100% | 16 | `cm:eligible` (16) |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (44) |
| re._compiler | 17 | 17 | 100% | 0 | `-` (0) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:eligible` (34) |
| gc | 17 | 17 | 100% | 0 | `-` (0) |
| flask.helpers | 17 | 17 | 100% | 0 | `-` (0) |
| dataclasses | 16 | 16 | 100% | 6 | `cm:eligible` (6) |
| jinja2.utils | 16 | 16 | 100% | 35 | `cm:eligible` (35) |
| re | 15 | 15 | 100% | 2 | `cm:eligible` (2) |
| difflib | 14 | 14 | 100% | 29 | `cm:eligible` (29) |
| ast | 13 | 13 | 100% | 3 | `cm:eligible` (3) |
| posixpath | 13 | 13 | 100% | 0 | `-` (0) |
| types | 13 | 13 | 100% | 9 | `cm:eligible` (9) |
| linecache | 12 | 12 | 100% | 0 | `-` (0) |
| email.utils | 12 | 12 | 100% | 0 | `-` (0) |
| codecs | 12 | 12 | 100% | 77 | `cm:eligible` (77) |
| asyncio.tasks | 12 | 12 | 100% | 15 | `cm:eligible` (15) |
| _strptime | 11 | 11 | 100% | 13 | `cm:eligible` (13) |
| shutil | 11 | 11 | 100% | 0 | `-` (0) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:eligible` (2) |
| base64 | 11 | 11 | 100% | 0 | `-` (0) |
| sysconfig | 11 | 11 | 100% | 0 | `-` (0) |
| tarfile | 11 | 11 | 100% | 45 | `cm:eligible` (45) |
| asyncio.events | 10 | 10 | 100% | 53 | `cm:eligible` (53) |
| typing | 85 | 83 | 98% | 133 | `cm:eligible` (132) |
