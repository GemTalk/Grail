# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1592 top-level defs, **1551 compiled through IR (97.4%)**; 4621 class-body methods, of which **4539 are IR-eligible (98.2%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6417 defs the corpus holds, 94.9% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1551 | 97.4% | `compiled` | _codecs.normalizestring, _codecs._bootstrap, _codecs.register, _codecs.unregister, _codecs.lookup |
| 13 | 0.8% | `nestedDef:reservedName` | dataclasses._make_synthesized_init, dataclasses._make_synthesized_repr, dataclasses._make_synthesized_eq, django.utils.f |
| 6 | 0.4% | `stmt:ClassDefAst` | collections.namedtuple, typing._nt_base, jinja2.runtime.make_logging_undefined, pydoc._start_server, pydoc._url_handler |
| 4 | 0.3% | `CallAst:frameSensitive-globals` | re._constants._makecodes, typing.__getattr__, django.utils.version.get_git_changeset, importlib._search_roots |
| 4 | 0.3% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, typing.no_type_check, traceback._candidates_for |
| 3 | 0.2% | `CallAst:frameSensitive-vars` | typing.get_type_hints, pickle._find_global, sqlparse.cli._process_file |
| 2 | 0.1% | `typeParams` | typing.reveal_type, typing.override |
| 2 | 0.1% | `ConstantAst:complex` | copy._grail_shared_atomic_samples, pickle._builtin_type_registry |
| 1 | 0.1% | `stmt:MatchAst` | typing._make_eager_annotate |
| 1 | 0.1% | `Comprehension:async` | jinja2.async_utils.auto_to_list |
| 1 | 0.1% | `nestedDef:kwonly` | asyncio.tasks.create_eager_task_factory |
| 1 | 0.1% | `CallAst:frameSensitive-exec` | gettext.c2py |
| 1 | 0.1% | `nestedDef:flow` | difflib._mdiff |
| 1 | 0.1% | `NameAst:super` | typing._generic_init_subclass |
| 1 | 0.1% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4539 | 98.2% | `eligible` | __future__._Feature.__init__, __future__._Feature.getOptionalRelease, __future__._Feature.getMandatoryRelease, __future_ |
| 35 | 0.8% | `method:classNotAtModuleScope` | argparse._Section.__init__, argparse._Section.format_help, argparse._ChoicesPseudoAction.__init__, collections._NT.__new |
| 10 | 0.2% | `method:selfRebound` | _pydecimal.Decimal.__eq__, _pydecimal.Decimal.__lt__, _pydecimal.Decimal.__le__, _pydecimal.Decimal.__gt__, _pydecimal.D |
| 5 | 0.1% | `CallAst:frameSensitive-dir` | typing._BaseGenericAlias.__dir__, unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, werkzeu |
| 5 | 0.1% | `Comprehension:async` | jinja2.environment.Template.render_async, jinja2.environment.Template.generate, jinja2.environment.Template.make_module_ |
| 4 | 0.1% | `CallAst:frameSensitive-vars` | argparse.HelpFormatter._expand_help, argparse._SubParsersAction.__call__, argparse.Namespace.__eq__, _pydecimal.Context. |
| 4 | 0.1% | `signature:defaultReadsLocal` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codecs.StreamRe |
| 3 | 0.1% | `CallAst:frameSensitive-exec` | werkzeug.routing.rules.Rule._get_func_code, flask.config.Config.from_pyfile, jinja2.environment.Template.from_code |
| 3 | 0.1% | `CallAst:frameSensitive-locals` | jinja2.environment.Environment.overlay, pydoc.HTMLDoc.docmodule, sqlparse.sql.Token.__repr__ |
| 3 | 0.1% | `stmt:ClassDefAst` | typing.NewType.__mro_entries__, pydoc.HTMLDoc.docclass, pydoc.TextDoc.docclass |
| 2 | 0.0% | `nestedDef:reservedName` | werkzeug.local._ProxyIOp.__init__, flask.sessions.SecureCookieSession.__init__ |
| 2 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, pydoc.Helper.interact |
| 2 | 0.0% | `CallAst:frameSensitive-eval` | annotationlib.ForwardRef.evaluate, pydoc.Helper.help |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |
| 1 | 0.0% | `nestedDef:super` | _py_warnings.deprecated.__call__ |
| 1 | 0.0% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__ |
| 1 | 0.0% | `AssignAst:target-AttributeAst` | werkzeug.wrappers.response.Response.force_type |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_linecache, test.test_pickle, test.test_typing, test.test_codecencodings_kr, test.test_ipaddress, test.test_pulldom, test.test_sax, test.test_ssl, test.test_zipapp).

**test corpus, everything compiled**: 2809 top-level defs, **2724 compiled through IR (97.0%)**; 14132 class-body methods, of which **10985 are IR-eligible (77.7%)** through the class-method seam (cut 36); 257 nested defs/lambdas. Of all 17198 defs the corpus holds, 79.7% go through IR.

**`test.*` modules alone**: 389 top-level defs, 369 compiled (94.9%); 8515 class methods (test code is almost entirely TestCase methods), of which 5491 IR-eligible; 69 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 5491 | 64.5% | `eligible` | test.test_textwrap.BaseTestCase.show, test.test_textwrap.BaseTestCase.check, test.test_textwrap.BaseTestCase.check_wrap, |
| 1702 | 20.0% | `method:classNotAtModuleScope` | collections._NT.__new__, collections._NT._nt_tuple_index, collections._NT._nt_tuple_count, collections._NT.__getattr__,  |
| 963 | 11.3% | `stmt:ClassDefAst` | test.test_math.MathTests.testCeil, test.test_math.MathTests.testFloor, test.test_math.MathTests.testDist, test.test_math |
| 71 | 0.8% | `CallAst:frameSensitive-exec` | test.test_enum.TestSpecial.test_empty_globals, test.test_unpack.TestCornerCases.test_extended_oparg_not_ignored, test.te |
| 66 | 0.8% | `ConstantAst:complex` | test.test_float.GeneralFloatCases.test_from_number, test.test_float.RoundTestCase.test_inf_nan, test.test_operator.Opera |
| 37 | 0.4% | `CallAst:frameSensitive-eval` | test.test_int.IntTestCases.test_underscores, test.test_float.GeneralFloatCases.test_underscores, test.test_float.ReprTes |
| 29 | 0.3% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__, test.test_itertools.TestBasicOps.test_ziplongest, test.test_enum.TestSpecial.test_pickl |
| 27 | 0.3% | `ConstantAst:surrogateStr` | test.test_builtin.BuiltinTest.test_ascii, test.test_builtin.BuiltinTest.test_getattr, test.test_codecs.ReadTest.test_lon |
| 18 | 0.2% | `shape:TryAst` | test.test_traceback.BaseExceptionReportingTests.test_exception_group_wrapped_naked |
| 15 | 0.2% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, test.test_operator.OperatorTestCase.test_ |
| 12 | 0.1% | `nestedDef:flow` | test.test_itertools.TestBasicOps.test_combinations, test.test_itertools.TestBasicOps.test_combinations_with_replacement, |
| 10 | 0.1% | `decorators:bigmemtest` | test.test_math.MathTests.test_isqrt_huge, test.test_math.MathTests.test_log_huge_integer, test.test_re.ReTests.test_larg |
| 9 | 0.1% | `nestedDef:kwonly` | test.test_keywordonlyarg.KeywordOnlyArgTestCase.testTooManyPositionalErrorMessage, test.test_keywordonlyarg.KeywordOnlyA |
| 9 | 0.1% | `Comprehension:async` | test.test_asyncgen.AsyncGenAsyncioTest.test_async_gen_aiter, test.test_coroutines.CoroutineTest.test_comp_3, test.test_c |
| 5 | 0.1% | `CallAst:frameSensitive-vars` | _pydecimal.Context.__repr__, test.test_operator.OperatorTestCase.test___all__, test.test_functools.TestPartialMethod.tes |
| 5 | 0.1% | `stmt:MatchAst` | test.test_global.GlobalTests.test_match, test.test_global.GlobalTests.test_match_as, test.test_global.GlobalTests.test_m |
| 5 | 0.1% | `NameAst:type-other` | test.test_builtin.TestType.test_type_nokwargs, test.test_builtin.TestType.test_type_name, test.test_builtin.TestType.tes |
| 4 | 0.0% | `nestedDef:reservedName` | test.test_property.PropertyTests.test_property_name, test.test_property.PropertySubclassTests.test_docstring_copy2, test |
| 4 | 0.0% | `GeneratorExpAst:async` | test.test_builtin.BuiltinTest.test_builtin_call_async_genexpr_no_crash, test.test_asyncgen.AsyncGenAsyncioTest.test_asyn |
| 4 | 0.0% | `NameAst:super` | test.test_listcomps.ListComprehensionTest.test_references_super, test.test_super.TestSuper.test_super_init_leaks, test.t |
| 3 | 0.0% | `CallAst:frameSensitive-locals` | test.test_set.TestSubsets.test_issubset, pydoc.HTMLDoc.docmodule |
| 3 | 0.0% | `nestedDef:global` | test.test_scope.ScopeTests.testNestingPlusFreeRefToGlobal, test.test_scope.ScopeTests.testTopIsNotSignificant, test.test |
| 3 | 0.0% | `nestedDef:moduleScopeTarget` | test.test_global.GlobalTests.test_func_def |
| 2 | 0.0% | `nestedDef:typeParams` | test.test_functools.TestUpdateWrapper._default_update |
| 2 | 0.0% | `CallAst:builtinArityMismatch` | test.test_asyncgen.AsyncGenAsyncioTest.test_anext_bad_args, test.test_asyncgen.AsyncGenAsyncioTest.test_aiter_bad_args |
| 2 | 0.0% | `ForAst:tupleTargetShape` | test.test_codecs.CodePageTest.check_decode, test.test_codecs.CodePageTest.check_encode |
| 2 | 0.0% | `AssignAst:target-TupleAst` | test.test_builtin.BuiltinTest.test_all_any_tuple_optimization, test.test_global.GlobalTests.test_unpacking_assignment |
| 1 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, test.test_enum._EnumTests.test_basics, pydoc.Helper.interact |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst-slice` | test.test_augassign.AugAssignTest.testSequences |
| 1 | 0.0% | `LambdaAst:reservedName` | test.test_call.TestPEP590.test_vectorcall_override_on_mutable_class |
| 1 | 0.0% | `shape:DictAst` | test.test_listcomps.ListComprehensionTest.test_code_replace_extended_arg |
| 1 | 0.0% | `Comprehension:target-SubscriptAst` | test.test_listcomps.ListComprehensionTest.test_unbound_local_inside_comprehension |
| 1 | 0.0% | `NonlocalAst:classCell` | test.test_super.TestSuper.tearDown |
| 1 | 0.0% | `nestedDef:super` | test.test_super.TestSuper.test_obscure_super_errors |
| 1 | 0.0% | `shape:ImportAst` | test.test_global.GlobalTests.test_import_result |
| 1 | 0.0% | `shape:WithAst` | test.test_global.GlobalTests.test_enter_result |
| 1 | 0.0% | `stmt:TypeAliasAst` | test.test_global.GlobalTests.test_type_alias |
| 1 | 0.0% | `ForAst:other` | test.test_global.GlobalTests.test_iteration_variable |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 369 | 94.9% | `compiled` | unittest._describe_exception, unittest.skip, unittest.skipIf, unittest.skipUnless, unittest.expectedFailure |
| 7 | 1.8% | `stmt:ClassDefAst` | collections.namedtuple, test.support.check_free_after_iterating, test.test_heapq.load_tests, typing._nt_base, pydoc._sta |
| 6 | 1.5% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, test.support.check__all__, typing.no_type_check, test.test_enum.enum_d |
| 3 | 0.8% | `nestedDef:reservedName` | test.support.subTests, mock._make_magic_forwarder, reprlib.recursive_repr |
| 1 | 0.3% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter, test.test_sort.check |
| 1 | 0.3% | `CallAst:frameSensitive-eval` | test.test_decorators.dbcheck |
| 1 | 0.3% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |
| 1 | 0.3% | `NameAst:super` | typing._generic_init_subclass |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| jinja2.filters | 75 | 75 | 100% | 3 | `cm:eligible` (3) |
| _codecs | 66 | 66 | 100% | 0 | `-` (0) |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (14) |
| werkzeug.http | 39 | 39 | 100% | 0 | `-` (0) |
| _py_warnings | 30 | 30 | 100% | 13 | `cm:eligible` (12) |
| sqlparse.engine.grouping | 28 | 28 | 100% | 0 | `-` (0) |
| _pydecimal | 25 | 25 | 100% | 214 | `cm:eligible` (204) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (44) |
| re._compiler | 17 | 17 | 100% | 0 | `-` (0) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:eligible` (34) |
| gc | 17 | 17 | 100% | 0 | `-` (0) |
| flask.helpers | 17 | 17 | 100% | 0 | `-` (0) |
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
| traceback | 59 | 58 | 98% | 32 | `cm:eligible` (32) |
| pickle | 88 | 86 | 98% | 31 | `cm:eligible` (31) |
| inspect | 57 | 55 | 96% | 38 | `cm:eligible` (38) |
| copy | 22 | 21 | 95% | 1 | `cm:eligible` (1) |
| gettext | 20 | 19 | 95% | 16 | `cm:eligible` (16) |
| pydoc | 42 | 39 | 93% | 80 | `cm:eligible` (61) |
| difflib | 14 | 13 | 93% | 29 | `cm:eligible` (29) |
| asyncio.tasks | 12 | 11 | 92% | 15 | `cm:eligible` (15) |
| typing | 85 | 77 | 91% | 133 | `cm:eligible` (127) |
| dataclasses | 16 | 13 | 81% | 6 | `cm:eligible` (6) |
