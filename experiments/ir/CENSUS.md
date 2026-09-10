# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: `census_stdlib.tpz` imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and `census_tests_00..02.tpz` import every module of `scripts/cpython_suite_manifest.txt`, round-robin across three sessions because one session cannot hold the whole manifest. Each script reads its module list at run time, so adding a module to the manifest needs no edit here. Both corpora run in well under a minute.

**Each module is counted once, however many sessions compiled it.** Every session compiles the stdlib its own modules import, so a module reached from two shards is measured in both; this report therefore builds the corpus totals from the per-module rows rather than by summing the session totals. It matters here: of the 220 modules the test corpus touches, 83 are reached from more than one shard, and summing them -- which is what produced the boards before this was fixed -- overstates the corpus by about half. The shards agree exactly on every module they share, so which copy is taken makes no difference, and ANY split of the manifest gives the same board; that is checked by running one.

Counts here are exact and reproducible; the EXAMPLE names beside each reason are not. importlib keeps only the first five it sees per reason per session, so which five reach the board depends on the order modules were compiled. They illustrate a reason; they never enumerate it.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1592 top-level defs, **1582 compiled through IR (99.4%)**; 4621 class-body methods, of which **4585 are IR-eligible (99.2%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6417 defs the corpus holds, 96.1% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1582 | 99.4% | `compiled` | _codecs._bootstrap, _codecs.lookup, _codecs.normalizestring, _codecs.register, _codecs.unregister |
| 2 | 0.1% | `typeParams` | typing.override, typing.reveal_type |
| 1 | 0.1% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter |
| 1 | 0.1% | `CallAst:frameSensitive-eval` | pickle._builtin_type_registry |
| 1 | 0.1% | `CallAst:frameSensitive-exec` | gettext.c2py |
| 1 | 0.1% | `Comprehension:async` | jinja2.async_utils.auto_to_list |
| 1 | 0.1% | `NameAst:super` | typing._generic_init_subclass |
| 1 | 0.1% | `nestedDef:flow` | difflib._mdiff |
| 1 | 0.1% | `nestedDef:kwonly` | asyncio.tasks.create_eager_task_factory |
| 1 | 0.1% | `stmt:MatchAst` | typing._make_eager_annotate |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4585 | 99.2% | `eligible` | __future__._Feature.__init__, __future__._Feature.__repr__, __future__._Feature.getMandatoryRelease, __future__._Feature |
| 10 | 0.2% | `method:selfRebound` | _pydecimal.Decimal.__eq__, _pydecimal.Decimal.__ge__, _pydecimal.Decimal.__gt__, _pydecimal.Decimal.__le__, _pydecimal.D |
| 5 | 0.1% | `Comprehension:async` | jinja2.environment.Template.generate, jinja2.environment.Template.make_module_async, jinja2.environment.Template.render_ |
| 4 | 0.1% | `NameAst:super` | jinja2.runtime.LoggingUndefined.__bool__, jinja2.runtime.LoggingUndefined.__iter__, jinja2.runtime.LoggingUndefined.__st |
| 4 | 0.1% | `signature:defaultReadsLocal` | codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codecs.StreamRecoder.__getattr__, codecs.StreamW |
| 3 | 0.1% | `CallAst:frameSensitive-exec` | flask.config.Config.from_pyfile, jinja2.environment.Template.from_code, werkzeug.routing.rules.Rule._get_func_code |
| 3 | 0.1% | `method:classNotAtModuleScope` | argparse._ChoicesPseudoAction.__init__, argparse._Section.__init__, argparse._Section.format_help |
| 2 | 0.0% | `CallAst:frameSensitive-eval` | annotationlib.ForwardRef.evaluate, pydoc.Helper.help |
| 2 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, pydoc.Helper.interact |
| 1 | 0.0% | `AssignAst:target-AttributeAst` | werkzeug.wrappers.response.Response.force_type |
| 1 | 0.0% | `nestedDef:super` | _py_warnings.deprecated.__call__ |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 129 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_codecencodings_kr, test.test_ipaddress, test.test_linecache, test.test_pickle, test.test_pulldom, test.test_sax, test.test_ssl, test.test_typing, test.test_zipapp).

**test corpus, everything compiled**: 1327 top-level defs, **1312 compiled through IR (98.9%)**; 10942 class-body methods, of which **10396 are IR-eligible (95.0%)** through the class-method seam (cut 36); 151 nested defs/lambdas. Of all 12420 defs the corpus holds, 94.3% go through IR.

**`test.*` modules alone**: 273 top-level defs, 267 compiled (97.8%); 8456 class methods (test code is almost entirely TestCase methods), of which 7929 IR-eligible; 55 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 7929 | 93.8% | `eligible` | test.test_int.IntTestCases.test_basic, test.test_int.IntTestCases.test_invalid_signs, test.test_int.IntTestCases.test_ke |
| 85 | 1.0% | `NameAst:super` | test.test_collections.SubclassRor.__ror__, test.test_dict.MyStr.__eq__, test.test_dict.MyStr.__hash__, test.test_enum.Ba |
| 77 | 0.9% | `CallAst:frameSensitive-exec` | test.test_builtin.BuiltinTest.test_compile, test.test_dict.DictTest.test_bad_key, test.test_enum.TestSpecial.test_empty_ |
| 69 | 0.8% | `method:classNotAtModuleScope` | test.test_builtin.C_get_vars.getDict, test.test_compare.Cmp.__eq__, test.test_compare.Cmp.__init__, test.test_compare.Cm |
| 50 | 0.6% | `CallAst:frameSensitive-eval` | annotationlib.ForwardRef.evaluate, pydoc.Helper.help, test.datetimetester.TestDate.test_roundtrip, test.datetimetester.T |
| 28 | 0.3% | `NameAst:reservedIdentifier` | test.datetimetester.C.__new__, test.datetimetester.DateSubclass.__new__, test.datetimetester.DateTimeSubclass.__new__, t |
| 25 | 0.3% | `shape:TryAst` | test.test_asyncio.test_taskgroups.BaseTestTaskGroup.test_cancelling_level_preserved, test.test_asyncio.test_taskgroups.B |
| 21 | 0.2% | `NonlocalAst:notLocal` | test.support.A.__del__, test.test_builtin.X.__getattribute__, test.test_dict.ClearOnDelete.__del__, test.test_dict.Key3. |
| 19 | 0.2% | `classDef:nonlocalBelow` | test.test_builtin.BuiltinTest.test_input_gh130163, test.test_coroutines.CoroutineTest.test_for_1, test.test_dict.DictTes |
| 17 | 0.2% | `method:methodLocalSlots` | test.test_builtin.Foo.__init__, test.test_functools.A.t, test.test_functools.Slot.___unused17___, test.test_functools.Sl |
| 16 | 0.2% | `nestedDef:flow` | test.test_asyncgen.AsyncGenAsyncioTest.test_anext_iter, test.test_asyncgen.AsyncGenAsyncioTest.test_async_gen_asyncio_at |
| 15 | 0.2% | `method:noSelf` | test.test_compare.Left.__eq__, test.test_compare.Right.__eq__, test.test_compare.Right.__ne__, test.test_genericclass.C. |
| 11 | 0.1% | `Comprehension:async` | test.test_asyncgen.AsyncGenAsyncioTest.test_async_gen_aiter, test.test_coroutines.CoroutineTest.test_comp_3, test.test_c |
| 11 | 0.1% | `method:methodLocalNestedClass` | test.datetimetester.MyTzInfo.tzname, test.mapping_tests.FailingUserDict.keys, test.test_dict.FailingUserDict.keys, test. |
| 10 | 0.1% | `decorators:bigmemtest` | test.test_codecs.CodePageTest.test_large_input, test.test_codecs.CodePageTest.test_large_utf8_input, test.test_itertools |
| 10 | 0.1% | `nestedDef:kwonly` | test.test_call.TestErrorMessagesSuggestions.test_unexpected_keyword_suggestion_valid_positions, test.test_contextlib.Con |
| 8 | 0.1% | `NameAst:__class__-methodLocalClass` | test.test_super.A.f, test.test_super.X.f |
| 5 | 0.1% | `stmt:MatchAst` | test.test_global.GlobalTests.test_match, test.test_global.GlobalTests.test_match_as, test.test_global.GlobalTests.test_m |
| 4 | 0.0% | `GeneratorExpAst:async` | test.test_asyncgen.AsyncGenAsyncioTest.test_async_gen_expression_01, test.test_asyncgen.AsyncGenAsyncioTest.test_async_g |
| 4 | 0.0% | `classDef:bodyStatement` | test.test_enum.TestEnumDict.test_enum_dict_in_metaclass, test.test_enum.TestSpecial.test_ignore, test.test_enum._EnumTes |
| 3 | 0.0% | `NameAst:type-other` | test.test_builtin.TestType.test_bad_args, test.test_builtin.TestType.test_type_nokwargs, test.test_subclassinit.Test.tes |
| 3 | 0.0% | `nestedDef:global` | test.test_named_expressions.NamedExpressionScopeTest.test_named_expression_global_scope, test.test_scope.ScopeTests.test |
| 3 | 0.0% | `nestedDef:moduleScopeTarget` | test.test_global.GlobalTests.test_func_def, test.test_pickle.CPicklerUnpicklerObjectTests.test_concurrent_unpickler_load |
| 3 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, pydoc.Helper.interact, test.datetimetester.TZInfoBase.test_aware_compare, test.datetimeteste |
| 2 | 0.0% | `AssignAst:target-AttributeAst` | test.test_sort.WackyComparator.__lt__, test.test_super.TestSuper.test___class___modification_multithreaded |
| 2 | 0.0% | `AssignAst:target-TupleAst` | test.test_builtin.BuiltinTest.test_all_any_tuple_optimization, test.test_global.GlobalTests.test_unpacking_assignment |
| 2 | 0.0% | `CallAst:builtinArityMismatch` | test.test_asyncgen.AsyncGenAsyncioTest.test_aiter_bad_args, test.test_asyncgen.AsyncGenAsyncioTest.test_anext_bad_args |
| 2 | 0.0% | `ForAst:tupleTargetShape` | test.test_codecs.CodePageTest.check_decode, test.test_codecs.CodePageTest.check_encode |
| 2 | 0.0% | `NonlocalAst:classCell` | test.test_super.TestSuper.tearDown, test.test_super.X.f |
| 2 | 0.0% | `method:selfRebound` | _pydecimal.Decimal.__eq__, _pydecimal.Decimal.__ge__, _pydecimal.Decimal.__gt__, _pydecimal.Decimal.__le__, _pydecimal.D |
| 2 | 0.0% | `nestedDef:super` | _py_warnings.deprecated.__call__, test.test_super.TestSuper.test_obscure_super_errors, test.test_super.TestSuper.test_un |
| 2 | 0.0% | `nestedDef:typeParams` | test.test_funcattrs.FunctionPropertiesTest.test___type_params__, test.test_functools.TestUpdateWrapper._default_update |
| 2 | 0.0% | `shape:DeleteAst` | test.test_global.GlobalTests.test_assignment_expression, test.test_global.GlobalTests.test_assignment_statement |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst-slice` | test.test_augassign.AugAssignTest.testSequences |
| 1 | 0.0% | `Comprehension:target-SubscriptAst` | test.test_listcomps.ListComprehensionTest.test_unbound_local_inside_comprehension |
| 1 | 0.0% | `ForAst:async` | test.test_coroutines.CoroutineTest.test_for_assign_raising_stop_async_iteration |
| 1 | 0.0% | `ForAst:other` | test.test_global.GlobalTests.test_iteration_variable |
| 1 | 0.0% | `classDef:moduleScopeTarget` | test.test_global.GlobalTests.test_class_def |
| 1 | 0.0% | `classDef:outerBinding` | test.test_scope.ScopeTests.testNonLocalClass |
| 1 | 0.0% | `shape:DictAst` | test.test_listcomps.ListComprehensionTest.test_code_replace_extended_arg |
| 1 | 0.0% | `shape:ImportAst` | test.test_global.GlobalTests.test_import_result |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `shape:WithAst` | test.test_global.GlobalTests.test_enter_result |
| 1 | 0.0% | `stmt:TypeAliasAst` | test.test_global.GlobalTests.test_type_alias |
| 1 | 0.0% | `typeParams` | test.test_reprlib.My.__repr__, typing._IdentityCallable.__call__ |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 267 | 97.8% | `compiled` | test.test_math.count_set_bits, test.test_math.partial_product, test.test_math.py_factorial, test.test_math.to_ulps, test |
| 1 | 0.4% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter, test.test_sort.check |
| 1 | 0.4% | `CallAst:frameSensitive-eval` | pickle._builtin_type_registry, test.test_decorators.dbcheck |
| 1 | 0.4% | `NameAst:super` | test.support.hashlib_helper._decorate_func_or_class, typing._generic_init_subclass |
| 1 | 0.4% | `classDef:nonlocalBelow` | test.support.check_free_after_iterating |
| 1 | 0.4% | `nestedDef:moduleScopeTarget` | test.test_funcattrs.global_function |
| 1 | 0.4% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |

## Per-module coverage (stdlib corpus)

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
