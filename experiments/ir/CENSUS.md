# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1570 top-level defs, **1446 compiled through IR (92.1%)**; 4427 class-body methods, of which **4247 are IR-eligible (95.9%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6201 defs the corpus holds, 91.8% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1446 | 92.1% | `compiled` | _codecs.normalizestring, _codecs._bootstrap, _codecs.register, _codecs.unregister, _codecs.lookup |
| 77 | 4.9% | `stmt:FunctionDefAst` | re._parser.parse_template, _py_warnings._warn_unawaited_coroutine, _strptime._strptime, types._derive_code_type, types._ |
| 19 | 1.2% | `value:LambdaAst` | inspect.walktree, weakref._make_finalize_callback, werkzeug.http.dump_cookie, email.utils.make_msgid, werkzeug.datastruc |
| 5 | 0.3% | `stmt:ClassDefAst` | collections.namedtuple, typing._nt_base, pydoc._start_server, pydoc._url_handler, pydoc.cli |
| 4 | 0.3% | `CallAst:frameSensitive-globals` | re._constants._makecodes, typing.__getattr__, django.utils.version.get_git_changeset, importlib._search_roots |
| 4 | 0.3% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, typing.no_type_check, traceback._candidates_for |
| 3 | 0.2% | `CallAst:frameSensitive-vars` | typing.get_type_hints, pickle._find_global, sqlparse.cli._process_file |
| 3 | 0.2% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type, asyncio.tasks.ensure_future |
| 2 | 0.1% | `typeParams` | typing.reveal_type, typing.override |
| 2 | 0.1% | `ConstantAst:complex` | copy._grail_shared_atomic_samples, pickle._builtin_type_registry |
| 1 | 0.1% | `Comprehension:async` | jinja2.async_utils.auto_to_list |
| 1 | 0.1% | `signature:defaultExpr` | sqlparse.engine.grouping._group |
| 1 | 0.1% | `CallAst:frameSensitive-exec` | gettext.c2py |
| 1 | 0.1% | `NameAst:super` | typing._generic_init_subclass |
| 1 | 0.1% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4247 | 95.9% | `eligible` | __future__._Feature.__init__, __future__._Feature.getOptionalRelease, __future__._Feature.getMandatoryRelease, __future_ |
| 84 | 1.9% | `stmt:FunctionDefAst` | _py_warnings.deprecated.__call__, _pyio.IOBase.readline, _pyio.TextIOWrapper.seek, _strptime.TimeRE.pattern, argparse.He |
| 35 | 0.8% | `method:classNotAtModuleScope` | argparse._Section.__init__, argparse._Section.format_help, argparse._ChoicesPseudoAction.__init__, collections._NT.__new |
| 26 | 0.6% | `value:LambdaAst` | _strptime.LocaleTime.__calc_date_time, argparse.HelpFormatter.add_argument, gettext.GNUTranslations._parse, asyncio.lock |
| 5 | 0.1% | `CallAst:frameSensitive-dir` | typing._BaseGenericAlias.__dir__, unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, werkzeu |
| 4 | 0.1% | `Comprehension:async` | jinja2.environment.Template.render_async, jinja2.environment.Template.make_module_async, jinja2.runtime.BlockReference._ |
| 4 | 0.1% | `signature:defaultReadsLocal` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codecs.StreamRe |
| 3 | 0.1% | `CallAst:frameSensitive-exec` | werkzeug.routing.rules.Rule._get_func_code, flask.config.Config.from_pyfile, jinja2.environment.Template.from_code |
| 3 | 0.1% | `CallAst:frameSensitive-vars` | argparse.HelpFormatter._expand_help, argparse._SubParsersAction.__call__, argparse.Namespace.__eq__ |
| 3 | 0.1% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__, jinja2.environment.Template.generate, grail_asgi.Server._run_app |
| 3 | 0.1% | `CallAst:frameSensitive-locals` | jinja2.environment.Environment.overlay, pydoc.HTMLDoc.docmodule, sqlparse.sql.Token.__repr__ |
| 2 | 0.0% | `stmt:ClassDefAst` | typing.NewType.__mro_entries__, pydoc.HTMLDoc.docclass |
| 2 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, pydoc.Helper.interact |
| 2 | 0.0% | `CallAst:frameSensitive-eval` | annotationlib.ForwardRef.evaluate, pydoc.Helper.help |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |
| 1 | 0.0% | `method:selfRebound` | jinja2.runtime.Context.call |
| 1 | 0.0% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__ |
| 1 | 0.0% | `AssignAst:target-AttributeAst` | werkzeug.wrappers.response.Response.force_type |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_linecache, test.test_pickle, test.test_typing, test.test_codecencodings_kr, test.test_ipaddress, test.test_pulldom, test.test_sax, test.test_ssl, test.test_zipapp).

**test corpus, everything compiled**: 2731 top-level defs, **2539 compiled through IR (93.0%)**; 13550 class-body methods, of which **9560 are IR-eligible (70.6%)** through the class-method seam (cut 36); 257 nested defs/lambdas. Of all 16538 defs the corpus holds, 73.2% go through IR.

**`test.*` modules alone**: 386 top-level defs, 335 compiled (86.8%); 8515 class methods (test code is almost entirely TestCase methods), of which 4659 IR-eligible; 69 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4659 | 54.7% | `eligible` | test.test_textwrap.BaseTestCase.show, test.test_textwrap.BaseTestCase.check, test.test_textwrap.BaseTestCase.check_wrap, |
| 1702 | 20.0% | `method:classNotAtModuleScope` | collections._NT.__new__, collections._NT._nt_tuple_index, collections._NT._nt_tuple_count, collections._NT.__getattr__,  |
| 884 | 10.4% | `stmt:ClassDefAst` | test.test_math.MathTests.testCeil, test.test_math.MathTests.testFloor, test.test_math.MathTests.testDist, test.test_math |
| 641 | 7.5% | `stmt:FunctionDefAst` | test.test_math.MathTests.testFrexp, test.test_math.MathTests.testFsum, test.test_math.MathTests.testSumProd, test.test_m |
| 216 | 2.5% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__ |
| 138 | 1.6% | `value:LambdaAst` | test.test_textwrap.IndentTestCase.test_indent_nomargin_all_lines, test.test_textwrap.IndentTestCase.test_indent_no_lines |
| 63 | 0.7% | `CallAst:frameSensitive-exec` | test.test_enum.TestSpecial.test_empty_globals, test.test_unpack.TestCornerCases.test_extended_oparg_not_ignored, test.te |
| 60 | 0.7% | `ConstantAst:complex` | test.test_float.RoundTestCase.test_inf_nan, test.test_operator.OperatorTestCase.test_lt, test.test_operator.OperatorTest |
| 33 | 0.4% | `CallAst:frameSensitive-eval` | test.test_int.IntTestCases.test_underscores, test.test_float.GeneralFloatCases.test_underscores, test.test_float.ReprTes |
| 26 | 0.3% | `ConstantAst:surrogateStr` | test.test_builtin.BuiltinTest.test_getattr, test.test_codecs.ReadTest.test_lone_surrogates, test.test_codecs.ReadTest.te |
| 24 | 0.3% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__, test.test_itertools.TestBasicOps.test_ziplongest, test.test_enum.TestSpecial.test_pickl |
| 14 | 0.2% | `shape:TryAst` | test.test_exception_variations.ExceptStarTestCases.test_try_except_else_finally, test.test_exception_variations.ExceptSt |
| 12 | 0.1% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, test.test_operator.OperatorTestCase.test_ |
| 10 | 0.1% | `decorators:bigmemtest` | test.test_math.MathTests.test_isqrt_huge, test.test_math.MathTests.test_log_huge_integer, test.test_re.ReTests.test_larg |
| 5 | 0.1% | `CallAst:frameSensitive-vars` | test.test_operator.OperatorTestCase.test___all__, test.test_functools.TestPartialMethod.test_repr |
| 5 | 0.1% | `stmt:MatchAst` | test.test_global.GlobalTests.test_match, test.test_global.GlobalTests.test_match_as, test.test_global.GlobalTests.test_m |
| 5 | 0.1% | `NameAst:type-other` | test.test_builtin.TestType.test_type_nokwargs, test.test_builtin.TestType.test_type_name, test.test_builtin.TestType.tes |
| 4 | 0.0% | `NameAst:super` | test.test_listcomps.ListComprehensionTest.test_references_super, test.test_super.TestSuper.test_super_init_leaks, test.t |
| 2 | 0.0% | `CallAst:frameSensitive-locals` | test.test_set.TestSubsets.test_issubset, pydoc.HTMLDoc.docmodule |
| 2 | 0.0% | `ForAst:tupleTargetShape` | test.test_codecs.CodePageTest.check_decode, test.test_codecs.CodePageTest.check_encode |
| 1 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, test.test_enum._EnumTests.test_basics, pydoc.Helper.interact |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst-slice` | test.test_augassign.AugAssignTest.testSequences |
| 1 | 0.0% | `shape:DictAst` | test.test_listcomps.ListComprehensionTest.test_code_replace_extended_arg |
| 1 | 0.0% | `stmt:NonlocalAst` | test.test_super.TestSuper.tearDown |
| 1 | 0.0% | `shape:ImportAst` | test.test_global.GlobalTests.test_import_result |
| 1 | 0.0% | `shape:WithAst` | test.test_global.GlobalTests.test_enter_result |
| 1 | 0.0% | `stmt:TypeAliasAst` | test.test_global.GlobalTests.test_type_alias |
| 1 | 0.0% | `ForAst:other` | test.test_global.GlobalTests.test_iteration_variable |
| 1 | 0.0% | `AssignAst:target-TupleAst` | test.test_global.GlobalTests.test_unpacking_assignment |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 335 | 86.8% | `compiled` | unittest._describe_exception, unittest.expectedFailure, unittest.strclass, unittest.main, unittest.async_case._grail_isc |
| 33 | 8.5% | `stmt:FunctionDefAst` | unittest.skip, unittest.skipIf, unittest.skipUnless, types._derive_code_type, types._derive_cell_type |
| 6 | 1.6% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, test.support.check__all__, typing.no_type_check, test.test_enum.enum_d |
| 5 | 1.3% | `value:LambdaAst` | inspect.walktree, test.test_heapq.L, weakref._make_finalize_callback, test.seq_tests.itermulti, test.test_set.L |
| 3 | 0.8% | `stmt:ClassDefAst` | collections.namedtuple, test.test_heapq.load_tests, typing._nt_base, pydoc._start_server, pydoc._url_handler |
| 2 | 0.5% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type |
| 1 | 0.3% | `AugAssignAst:target-NameAst` | abc._bump_invalidation_counter, test.test_sort.check |
| 1 | 0.3% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| _codecs | 66 | 66 | 100% | 0 | `-` (0) |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (14) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (44) |
| re._compiler | 17 | 17 | 100% | 0 | `-` (0) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:eligible` (34) |
| gc | 17 | 17 | 100% | 0 | `-` (0) |
| re | 15 | 15 | 100% | 2 | `cm:eligible` (2) |
| ast | 13 | 13 | 100% | 3 | `cm:eligible` (3) |
| posixpath | 13 | 13 | 100% | 0 | `-` (0) |
| codecs | 12 | 12 | 100% | 77 | `cm:eligible` (73) |
| shutil | 11 | 11 | 100% | 0 | `-` (0) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:eligible` (2) |
| base64 | 11 | 11 | 100% | 0 | `-` (0) |
| sysconfig | 11 | 11 | 100% | 0 | `-` (0) |
| asyncio.events | 10 | 10 | 100% | 53 | `cm:eligible` (53) |
| tarfile | 10 | 10 | 100% | 45 | `cm:eligible` (44) |
| traceback | 59 | 58 | 98% | 32 | `cm:eligible` (31) |
| pickle | 88 | 86 | 98% | 31 | `cm:eligible` (31) |
| werkzeug.http | 39 | 38 | 97% | 0 | `value:LambdaAst` (1) |
| _py_warnings | 30 | 29 | 97% | 13 | `cm:eligible` (12) |
| copy | 22 | 21 | 95% | 1 | `cm:eligible` (1) |
| gettext | 20 | 19 | 95% | 16 | `cm:eligible` (15) |
| inspect | 57 | 54 | 95% | 38 | `cm:eligible` (38) |
| linecache | 12 | 11 | 92% | 0 | `stmt:FunctionDefAst` (1) |
| email.utils | 12 | 11 | 92% | 0 | `value:LambdaAst` (1) |
| _strptime | 11 | 10 | 91% | 13 | `cm:eligible` (11) |
| flask.helpers | 17 | 15 | 88% | 0 | `value:LambdaAst` (1) |
| pydoc | 42 | 37 | 88% | 80 | `cm:eligible` (60) |
| jinja2.utils | 16 | 14 | 88% | 35 | `cm:eligible` (35) |
| typing | 85 | 74 | 87% | 133 | `cm:eligible` (126) |
| difflib | 14 | 12 | 86% | 29 | `cm:eligible` (28) |
| jinja2.filters | 75 | 61 | 81% | 3 | `value:LambdaAst` (8) |
| dataclasses | 16 | 12 | 75% | 6 | `cm:eligible` (6) |
| asyncio.tasks | 12 | 7 | 58% | 15 | `cm:eligible` (15) |
| sqlparse.engine.grouping | 28 | 16 | 57% | 0 | `stmt:FunctionDefAst` (10) |
| types | 12 | 6 | 50% | 9 | `cm:eligible` (9) |
