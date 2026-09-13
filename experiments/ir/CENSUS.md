# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: `census_stdlib.tpz` imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and `census_tests_00..02.tpz` import every module of `scripts/cpython_suite_manifest.txt`, round-robin across three sessions because one session cannot hold the whole manifest. Each script reads its module list at run time, so adding a module to the manifest needs no edit here. Both corpora run in well under a minute.

**They need the suite's gem configuration, not topaz's defaults.** Under a bare
`topaz -l` the manifest shards die partway with `OutOfMemory old space overflow`
/ `VM temporary object memory is full` (error 4067) — which looks like a census
bug and is not. Run them the way the suite runner does:

```bash
CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=500000;GEM_MAX_SMALLTALK_STACK_DEPTH=80000;"
$GEMSTONE/bin/topaz -lq -C "$CFG" -S experiments/ir/census_tests_00.tpz < /dev/null
```

The totals are per-reason `CENSUS|<reason>|<count>|<examples>` lines, so a
corpus-wide tally is the sum across the three shards:

```bash
cat cen_0*.log | grep -oE "^CENSUS\|[^|]+\|[0-9]+" \
  | awk -F'|' '{a[$2]+=$3} END {for (k in a) print a[k], k}' | sort -rn
```

Counting the EXAMPLE names instead undercounts badly — each row lists only the
first few.

**Each module is counted once, however many sessions compiled it.** Every session compiles the stdlib its own modules import, so a module reached from two shards is measured in both; this report therefore builds the corpus totals from the per-module rows rather than by summing the session totals. It matters here: of the 220 modules the test corpus touches, 83 are reached from more than one shard, and summing them -- which is what produced the boards before this was fixed -- overstates the corpus by about half. The shards agree exactly on every module they share, so which copy is taken makes no difference, and ANY split of the manifest gives the same board; that is checked by running one.

Counts here are exact and reproducible; the EXAMPLE names beside each reason are not. importlib keeps only the first five it sees per reason per session, so which five reach the board depends on the order modules were compiled. They illustrate a reason; they never enumerate it.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1582 top-level defs, **1574 compiled through IR (99.5%)**; 4600 class-body methods, of which **4575 are IR-eligible (99.5%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6386 defs the corpus holds, 96.4% go through IR.

**The stdlib DENOMINATOR moved and this board does not explain why.** The previous board counted 1592 top-level defs and 4621 class-body methods where this one counts 1582 and 4600, on a run reporting `IMPORTED|125|FAILED|0`. A merged cut moves defs BETWEEN reasons and cannot change the total, so something else did. Recorded rather than smoothed over: a moving denominator does not validate the numerator, and the honest comparison for any one cut is a before/after measured on ONE tree, which is what MIGRATION.md carries. The test corpus below is unaffected -- its 10942 class methods are the same number the previous board reported.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1574 | 99.5% | `compiled` | _codecs.normalizestring, _codecs._bootstrap, _codecs.register, _codecs.unregister, _codecs.lookup |
| 2 | 0.1% | `typeParams` | typing.reveal_type, typing.override |
| 1 | 0.1% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter |
| 1 | 0.1% | `CallAst:super-noClass` | typing._generic_init_subclass |
| 1 | 0.1% | `Comprehension:async` | jinja2.async_utils.auto_to_list |
| 1 | 0.1% | `nestedDef:flow` | difflib._mdiff |
| 1 | 0.1% | `nestedDef:kwonly` | asyncio.tasks.create_eager_task_factory |
| 1 | 0.1% | `stmt:MatchAst` | typing._make_eager_annotate |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4575 | 99.5% | `eligible` | __future__._Feature.__init__, __future__._Feature.getOptionalRelease, __future__._Feature.getMandatoryRelease, |
| 10 | 0.2% | `method:selfRebound` | _pydecimal.Decimal.__eq__, _pydecimal.Decimal.__lt__, _pydecimal.Decimal.__le__, _pydecimal.Decimal.__gt__, _p |
| 5 | 0.1% | `Comprehension:async` | jinja2.environment.Template.render_async, jinja2.environment.Template.generate, jinja2.environment.Template.ma |
| 4 | 0.1% | `signature:defaultReadsLocal` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codec |
| 2 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, pydoc.Helper.interact |
| 1 | 0.0% | `AssignAst:target-AttributeAst` | werkzeug.wrappers.response.Response.force_type |
| 1 | 0.0% | `CallAst:super-arity` | argparse._ChoicesPseudoAction.__init__ |
| 1 | 0.0% | `nestedDef:super` | _py_warnings.deprecated.__call__ |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 129 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_codecencodings_kr, test.test_ipaddress, test.test_linecache, test.test_pickle, test.test_pulldom, test.test_sax, test.test_ssl, test.test_typing, test.test_zipapp).

**test corpus, everything compiled**: 1329 top-level defs, **1316 compiled through IR (99.0%)**; 10942 class-body methods, of which **10689 are IR-eligible (97.7%)** through the class-method seam (cut 36); 151 nested defs/lambdas. Of all 12422 defs the corpus holds, 96.7% go through IR.

**`test.*` modules alone**: 273 top-level defs, 267 compiled (97.8%); 8456 class methods (test code is almost entirely TestCase methods), of which 8174 IR-eligible (96.7%); 55 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 10689 | 97.7% | `eligible` | test.test_textwrap.BaseTestCase.show, test.test_textwrap.BaseTestCase.check, test.test_textwrap.BaseTestCase.c |
| 25 | 0.2% | `shape:TryAst-exceptStar` | test.test_asyncio.test_taskgroups.BaseTestTaskGroup.test_taskgroup_context_manager_exit_raises, test.test_asyn |
| 21 | 0.2% | `NonlocalAst:notLocal` | test.support.A.__del__, test.test_itertools.Key.__eq__, test.test_yield_from.MyGen.send, test.test_super.Meta. |
| 19 | 0.2% | `classDef:nonlocalBelow` | test.test_itertools.TestBasicOps.test_grouper_reentrant_eq_does_not_crash, test.test_yield_from.TestPEP380Oper |
| 17 | 0.2% | `method:methodLocalSlots` | test.test_builtin.Foo.__init__ |
| 16 | 0.1% | `nestedDef:flow` | test.test_itertools.TestBasicOps.test_combinations, test.test_itertools.TestBasicOps.test_combinations_with_re |
| 15 | 0.1% | `method:noSelf` | test.test_operator.A.baz, test.test_operator.A.baz, test.test_compare.Left.__eq__, test.test_compare.Right.__e |
| 11 | 0.1% | `Comprehension:async` | test.test_asyncgen.AsyncGenAsyncioTest.test_async_gen_aiter |
| 11 | 0.1% | `method:methodLocalNestedClass` | test.datetimetester.MyTzInfo.tzname, test.mapping_tests.FailingUserDict.keys, test.mapping_tests.FailingUserDi |
| 11 | 0.1% | `method:selfRebound` | _pydecimal.Decimal.__eq__, _pydecimal.Decimal.__lt__, _pydecimal.Decimal.__le__, _pydecimal.Decimal.__gt__, _p |
| 10 | 0.1% | `decorators:bigmemtest` | test.test_itertools.TestBasicOps.test_combinations_overflow, test.test_itertools.TestBasicOps.test_combination |
| 10 | 0.1% | `nestedDef:kwonly` | test.test_positional_only_arg.PositionalOnlyTestCase.test_pos_only_definition, test.test_positional_only_arg.P |
| 9 | 0.1% | `NameAst:__class__-methodLocalClass` | test.test_super.X.f, test.test_super.X.f, test.test_super.X.f, test.test_super.A.f, test.test_super.A.f |
| 6 | 0.1% | `CallAst:frameSensitive-eval-nested` | test.test_builtin.BuiltinTest.test_compile_top_level_await, test.test_builtin.SpreadSheet.__getitem__ |
| 5 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, test.datetimetester.TZInfoBase.test_aware_compare, test.datetimetester.TestDateTim |
| 5 | 0.0% | `stmt:MatchAst` | test.test_global.GlobalTests.test_match, test.test_global.GlobalTests.test_match_as, test.test_global.GlobalTe |
| 4 | 0.0% | `CallAst:super-arity` | test.test_super.TestSuper.test_super_argcount, test.test_super.TestSuper.test_super_argtype, test.test_super.C |
| 4 | 0.0% | `GeneratorExpAst:async` | test.test_builtin.BuiltinTest.test_builtin_call_async_genexpr_no_crash, test.test_asyncgen.AsyncGenAsyncioTest |
| 4 | 0.0% | `classDef:bodyStatement` | test.test_enum._EnumTests.setUp, test.test_enum.TestSpecial.test_ignore, test.test_enum.TestEnumDict.test_enum |
| 4 | 0.0% | `signature:defaultReadsLocal` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codec |
| 3 | 0.0% | `ForAst:tupleTargetShape` | test.test_builtin.BuiltinTest.test_compile |
| 3 | 0.0% | `NameAst:type-other` | test.test_builtin.TestType.test_type_nokwargs, test.test_builtin.TestType.test_bad_args |
| 3 | 0.0% | `nestedDef:global` | test.test_named_expressions.NamedExpressionScopeTest.test_named_expression_global_scope |
| 3 | 0.0% | `nestedDef:moduleScopeTarget` | test.test_pickle.CPicklerUnpicklerObjectTests.test_concurrent_unpickler_load, test.test_pickle.CPicklerUnpickl |
| 3 | 0.0% | `nestedDef:super` | test.test_super.TestSuper.test_obscure_super_errors, test.test_super.TestSuper.test_unusual_getattro |
| 2 | 0.0% | `AssignAst:target-AttributeAst` | test.test_super.TestSuper.test___class___modification_multithreaded |
| 2 | 0.0% | `AssignAst:target-TupleAst` | test.test_builtin.BuiltinTest.test_all_any_tuple_optimization |
| 2 | 0.0% | `CallAst:builtinArityMismatch` | test.test_asyncgen.AsyncGenAsyncioTest.test_anext_bad_args, test.test_asyncgen.AsyncGenAsyncioTest.test_aiter_ |
| 2 | 0.0% | `CallAst:frameSensitive-exec-nested` | test.test_traceback.BaseExceptionReportingTests.test_syntax_error_offset_at_eol, test.test_traceback.Suggestio |
| 2 | 0.0% | `NonlocalAst:classCell` | test.test_super.TestSuper.tearDown, test.test_super.X.f |
| 2 | 0.0% | `classDef:outerBinding` | test.test_super.TestSuper.test_various___class___pathologies |
| 2 | 0.0% | `nestedDef:typeParams` | test.test_funcattrs.FunctionPropertiesTest.test___type_params__ |
| 2 | 0.0% | `shape:DeleteAst` | test.test_global.GlobalTests.test_assignment_statement, test.test_global.GlobalTests.test_assignment_expressio |
| 2 | 0.0% | `typeParams` | typing._IdentityCallable.__call__, test.test_reprlib.My.__repr__ |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst-slice` | test.test_augassign.AugAssignTest.testSequences |
| 1 | 0.0% | `CallAst:super-explicitNamesOtherClass` | test.test_super.C.method |
| 1 | 0.0% | `Comprehension:target-SubscriptAst` | test.test_listcomps.ListComprehensionTest.test_unbound_local_inside_comprehension |
| 1 | 0.0% | `ForAst:async` | test.test_coroutines.CoroutineTest.test_for_assign_raising_stop_async_iteration |
| 1 | 0.0% | `ForAst:other` | test.test_global.GlobalTests.test_iteration_variable |
| 1 | 0.0% | `NameAst:super-declaredInFunction` | test.test_super.C.method |
| 1 | 0.0% | `classDef:moduleScopeTarget` | test.test_global.GlobalTests.test_class_def |
| 1 | 0.0% | `method:classInClassBody` | test.test_traceback.X.__str__ |
| 1 | 0.0% | `shape:DictAst` | test.test_listcomps.ListComprehensionTest.test_code_replace_extended_arg |
| 1 | 0.0% | `shape:ImportAst` | test.test_global.GlobalTests.test_import_result |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `shape:WithAst` | test.test_global.GlobalTests.test_enter_result |
| 1 | 0.0% | `stmt:TypeAliasAst` | test.test_global.GlobalTests.test_type_alias |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1316 | 99.0% | `compiled` | unittest._describe_exception, unittest.skip, unittest.skipIf, unittest.skipUnless, unittest.expectedFailure |
| 2 | 0.2% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter |
| 2 | 0.2% | `CallAst:super-noClass` | typing._generic_init_subclass |
| 2 | 0.2% | `typeParams` | typing.reveal_type, typing.override |
| 1 | 0.1% | `CallAst:frameSensitive-eval-nested` | test.test_decorators.dbcheck |
| 1 | 0.1% | `classDef:nonlocalBelow` | test.support.check_free_after_iterating |
| 1 | 0.1% | `nestedDef:flow` | difflib._mdiff |
| 1 | 0.1% | `nestedDef:kwonly` | asyncio.tasks.create_eager_task_factory |
| 1 | 0.1% | `nestedDef:moduleScopeTarget` | test.test_funcattrs.global_function |
| 1 | 0.1% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |
| 1 | 0.1% | `stmt:MatchAst` | typing._make_eager_annotate |

## Per-module coverage (stdlib corpus)

**Not regenerated on the 2026-09-13 pass** -- the four tables above are, this one is not. It ranks by share COMPILED, which the recent cuts have pushed to 100% for almost every module, so it now discriminates much less than when it was written; re-generate it when a cut lands that moves a module rather than a row.

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| jinja2.filters | 75 | 75 | 100% | 3 | `cm:eligible` (3) |
| _codecs | 66 | 66 | 100% | 0 | `-` (0) |
| traceback | 59 | 59 | 100% | 32 | `cm:eligible` (32) |
| inspect | 57 | 57 | 100% | 38 | `cm:eligible` (38) |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (14) |
| pydoc | 42 | 42 | 100% | 80 | `cm:eligible` (78) |
| werkzeug.http | 39 | 39 | 100% | 0 | `-` (0) |
| _py_warnings | 30 | 30 | 100% | 13 | `cm:eligible` (12) |
| sqlparse.engine.grouping | 28 | 28 | 100% | 0 | `-` (0) |
| _pydecimal | 25 | 25 | 100% | 214 | `cm:eligible` (205) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| copy | 22 | 22 | 100% | 1 | `cm:eligible` (1) |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (44) |
| re._compiler | 17 | 17 | 100% | 0 | `-` (0) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:eligible` (34) |
| gc | 17 | 17 | 100% | 0 | `-` (0) |
| flask.helpers | 17 | 17 | 100% | 0 | `-` (0) |
| dataclasses | 16 | 16 | 100% | 6 | `cm:eligible` (6) |
| jinja2.utils | 16 | 16 | 100% | 35 | `cm:eligible` (35) |
| re | 15 | 15 | 100% | 2 | `cm:eligible` (2) |
| ast | 13 | 13 | 100% | 3 | `cm:eligible` (3) |
| posixpath | 13 | 13 | 100% | 0 | `-` (0) |
| linecache | 12 | 12 | 100% | 0 | `-` (0) |
| email.utils | 12 | 12 | 100% | 0 | `-` (0) |
| codecs | 12 | 12 | 100% | 77 | `cm:eligible` (73) |
| types | 12 | 12 | 100% | 9 | `cm:eligible` (9) |
| _strptime | 11 | 11 | 100% | 13 | `cm:eligible` (13) |
| shutil | 11 | 11 | 100% | 0 | `-` (0) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:eligible` (2) |
| base64 | 11 | 11 | 100% | 0 | `-` (0) |
| sysconfig | 11 | 11 | 100% | 0 | `-` (0) |
| asyncio.events | 10 | 10 | 100% | 53 | `cm:eligible` (53) |
| tarfile | 10 | 10 | 100% | 45 | `cm:eligible` (45) |
| pickle | 88 | 87 | 99% | 31 | `cm:eligible` (31) |
| typing | 85 | 81 | 95% | 133 | `cm:eligible` (132) |
| gettext | 20 | 19 | 95% | 16 | `cm:eligible` (16) |
| difflib | 14 | 13 | 93% | 29 | `cm:eligible` (29) |
| asyncio.tasks | 12 | 11 | 92% | 15 | `cm:eligible` (15) |
