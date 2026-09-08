# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1570 top-level defs, **1348 compiled through IR (85.9%)**; 4427 class-body methods, of which **4161 are IR-eligible (94.0%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6201 defs the corpus holds, 88.8% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1348 | 85.9% | `compiled` | _codecs.normalizestring, _codecs.register, _codecs.unregister, _codecs.lookup, _codecs._forget_codec |
| 76 | 4.8% | `stmt:FunctionDefAst` | re._parser.parse_template, _py_warnings._warn_unawaited_coroutine, types._derive_code_type, types._derive_cell_type, typ |
| 23 | 1.5% | `pseudoVariableParam` | typing.NoReturn, typing.Never, typing.Self, typing.LiteralString, typing.ClassVar |
| 19 | 1.2% | `value:LambdaAst` | inspect.walktree, weakref._make_finalize_callback, werkzeug.http.dump_cookie, email.utils.make_msgid, werkzeug.datastruc |
| 19 | 1.2% | `globalDeclaration` | _codecs._bootstrap, _py_warnings._set_module, abc._bump_invalidation_counter, _strptime._strptime, gettext._tokenize |
| 17 | 1.1% | `ConstantAst:Ellipsis` | annotationlib.type_repr, typing._is_param_expr, typing._unpack_args, werkzeug._internal._dt_as_utc, werkzeug._internal._ |
| 13 | 0.8% | `flow` | re._compiler._get_charset_prefix, re._compiler._compile_info, _py_warnings._formatwarnmsg_impl, _py_warnings.filterwarni |
| 11 | 0.7% | `NameAst:builtinFunctionAsValue` | _codecs.escape_decode, _codecs.readbuffer_encode, re._subject, re._compiler._compile, re._parser._parse |
| 7 | 0.4% | `ForAst:else` | re._compiler._get_literal_prefix, re._parser._parse_sub, _py_warnings.warn_explicit, typing._proto_hook, copy._deepcopy_ |
| 5 | 0.3% | `stmt:ClassDefAst` | collections.namedtuple, typing._nt_base, pydoc._start_server, pydoc._url_handler, pydoc.cli |
| 5 | 0.3% | `signature:defaultExpr` | werkzeug.http.parse_cache_control_header, werkzeug.http.parse_csp_header, jinja2.filters.sync_do_map, jinja2.filters.do_ |
| 4 | 0.3% | `value:NamedExprAst` | _py_warnings._next_external_frame, typing._eval_type, werkzeug.http.parse_options_header, quopri.decode |
| 4 | 0.3% | `CallAst:frameSensitive-globals` | re._constants._makecodes, typing.__getattr__, django.utils.version.get_git_changeset, importlib._search_roots |
| 4 | 0.3% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, typing.no_type_check, traceback._candidates_for |
| 3 | 0.2% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type, asyncio.tasks.ensure_future |
| 3 | 0.2% | `CallAst:frameSensitive-vars` | typing.get_type_hints, pickle._find_global, sqlparse.cli._process_file |
| 2 | 0.1% | `typeParams` | typing.reveal_type, typing.override |
| 2 | 0.1% | `ConstantAst:complex` | copy._grail_shared_atomic_samples, pickle._builtin_type_registry |
| 1 | 0.1% | `Comprehension:async` | jinja2.async_utils.auto_to_list |
| 1 | 0.1% | `NameAst:super` | typing._generic_init_subclass |
| 1 | 0.1% | `CallAst:frameSensitive-exec` | gettext.c2py |
| 1 | 0.1% | `WhileAst:else` | re._compiler._generate_overlap_table |
| 1 | 0.1% | `RaiseAst:keywords` | gemdb.commit |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4161 | 94.0% | `eligible` | __future__._Feature.__init__, __future__._Feature.getOptionalRelease, __future__._Feature.getMandatoryRelease, __future_ |
| 81 | 1.8% | `stmt:FunctionDefAst` | _py_warnings.deprecated.__call__, _pyio.IOBase.readline, _pyio.TextIOWrapper.seek, _strptime.TimeRE.pattern, argparse.He |
| 35 | 0.8% | `method:classNotAtModuleScope` | argparse._Section.__init__, argparse._Section.format_help, argparse._ChoicesPseudoAction.__init__, collections._NT.__new |
| 26 | 0.6% | `value:LambdaAst` | _strptime.LocaleTime.__calc_date_time, argparse.HelpFormatter.add_argument, gettext.GNUTranslations._parse, asyncio.lock |
| 18 | 0.4% | `NameAst:builtinFunctionAsValue` | _pyio.BufferedIOBase._readinto, _pyio.BufferedReader._readinto, _strptime.TimeRE.__seqToRE, operator.attrgetter.__repr__ |
| 15 | 0.3% | `flow` | _py_warnings.catch_warnings.__enter__, _pyio.BytesIO.write, _pyio.FileIO.__init__, _pyio.TextIOWrapper._read_chunk, argp |
| 14 | 0.3% | `value:NamedExprAst` | _pyio.IOBase.__del__, _pyio.RawIOBase.readall, _pyio._BufferedIOMixin._dealloc_warn, _pyio.FileIO.readall, _pyio.TextIOW |
| 13 | 0.3% | `ConstantAst:Ellipsis` | blinker.base._PNamespaceSignal.__call__, typing._GenericAlias.__init__, typing._TupleType.__getitem__, werkzeug.formpars |
| 12 | 0.3% | `RaiseAst:keywords` | subprocess.Popen.communicate, werkzeug.routing.map.MapAdapter.match, jinja2.environment.Environment.handle_exception, ji |
| 11 | 0.2% | `ForAst:else` | typing._BaseGenericAlias.__mro_entries__, typing._ProtocolMeta.__instancecheck__, itertools.combinations.__next__, itert |
| 5 | 0.1% | `CallAst:frameSensitive-dir` | typing._BaseGenericAlias.__dir__, unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, werkzeu |
| 4 | 0.1% | `signature:defaultExpr` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codecs.StreamRe |
| 4 | 0.1% | `Comprehension:async` | jinja2.environment.Template.render_async, jinja2.environment.Template.make_module_async, jinja2.runtime.BlockReference._ |
| 3 | 0.1% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__, jinja2.environment.Template.generate, grail_asgi.Server._run_app |
| 3 | 0.1% | `globalDeclaration` | contextvars.Context.run, asyncio.events.EventLoop.run_forever, typing._LazyAnnotationLib.__getattr__ |
| 3 | 0.1% | `CallAst:frameSensitive-vars` | argparse.HelpFormatter._expand_help, argparse._SubParsersAction.__call__, argparse.Namespace.__eq__ |
| 3 | 0.1% | `CallAst:frameSensitive-exec` | werkzeug.routing.rules.Rule._get_func_code, flask.config.Config.from_pyfile, jinja2.environment.Template.from_code |
| 3 | 0.1% | `CallAst:frameSensitive-locals` | jinja2.environment.Environment.overlay, pydoc.HTMLDoc.docmodule, sqlparse.sql.Token.__repr__ |
| 3 | 0.1% | `WhileAst:else` | _pyio.TextIOWrapper.tell, werkzeug.test.Client.open, graphlib.TopologicalSorter._find_cycle |
| 2 | 0.0% | `stmt:ClassDefAst` | typing.NewType.__mro_entries__, pydoc.HTMLDoc.docclass |
| 2 | 0.0% | `CallAst:frameSensitive-eval` | annotationlib.ForwardRef.evaluate, pydoc.Helper.help |
| 2 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, pydoc.Helper.interact |
| 1 | 0.0% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__ |
| 1 | 0.0% | `method:selfRebound` | jinja2.runtime.Context.call |
| 1 | 0.0% | `AssignAst:target-AttributeAst` | werkzeug.wrappers.response.Response.force_type |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_linecache, test.test_pickle, test.test_typing, test.test_codecencodings_kr, test.test_ipaddress, test.test_pulldom, test.test_sax, test.test_ssl, test.test_zipapp).

**test corpus, everything compiled**: 2731 top-level defs, **2362 compiled through IR (86.5%)**; 13550 class-body methods, of which **9251 are IR-eligible (68.3%)** through the class-method seam (cut 36); 257 nested defs/lambdas. Of all 16538 defs the corpus holds, 70.2% go through IR.

**`test.*` modules alone**: 386 top-level defs, 319 compiled (82.6%); 8515 class methods (test code is almost entirely TestCase methods), of which 4425 IR-eligible; 69 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4425 | 52.0% | `eligible` | test.test_textwrap.BaseTestCase.check, test.test_textwrap.BaseTestCase.check_wrap, test.test_textwrap.BaseTestCase.check |
| 1702 | 20.0% | `method:classNotAtModuleScope` | collections._NT.__new__, collections._NT._nt_tuple_index, collections._NT._nt_tuple_count, collections._NT.__getattr__,  |
| 872 | 10.2% | `stmt:ClassDefAst` | test.test_math.MathTests.testCeil, test.test_math.MathTests.testFloor, test.test_math.MathTests.testDist, test.test_math |
| 630 | 7.4% | `stmt:FunctionDefAst` | test.test_math.MathTests.testFrexp, test.test_math.MathTests.testFsum, test.test_math.MathTests.testSumProd, test.test_m |
| 216 | 2.5% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__ |
| 162 | 1.9% | `NameAst:builtinFunctionAsValue` | textwrap.TextWrapper._wrap_chunks, operator.attrgetter.__repr__, operator.itemgetter.__repr__, operator.methodcaller.__r |
| 129 | 1.5% | `value:LambdaAst` | test.test_textwrap.IndentTestCase.test_indent_nomargin_all_lines, test.test_textwrap.IndentTestCase.test_indent_no_lines |
| 72 | 0.8% | `flow` | test.test_textwrap.BaseTestCase.show, test.test_math.MathTests.testHypotAccuracy, test.test_math.MathTests.test_exceptio |
| 63 | 0.7% | `CallAst:frameSensitive-exec` | test.test_enum.TestSpecial.test_empty_globals, test.test_unpack.TestCornerCases.test_extended_oparg_not_ignored, test.te |
| 56 | 0.7% | `ConstantAst:complex` | test.test_operator.OperatorTestCase.test_lt, test.test_operator.OperatorTestCase.test_le, test.test_operator.OperatorTes |
| 32 | 0.4% | `CallAst:frameSensitive-eval` | test.test_int.IntTestCases.test_underscores, test.test_float.GeneralFloatCases.test_underscores, test.test_float.ReprTes |
| 25 | 0.3% | `ConstantAst:surrogateStr` | test.test_codecs.ReadTest.test_lone_surrogates, test.test_codecs.ReadTest.test_incremental_surrogatepass, test.test_code |
| 23 | 0.3% | `globalDeclaration` | contextvars.Context.run, typing._LazyAnnotationLib.__getattr__, test.test_set.TestWeirdBugs.test_8420_set_merge |
| 23 | 0.3% | `value:NamedExprAst` | fractions.Fraction.__format__, typing.NamedTupleMeta.__new__, pydoc.HTMLDoc.markup |
| 19 | 0.2% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__, test.test_enum.TestSpecial.test_pickle_explodes, test.test_enum.TestConvert.tearDown, t |
| 14 | 0.2% | `shape:TryAst` | test.test_exception_variations.ExceptStarTestCases.test_try_except_else_finally, test.test_exception_variations.ExceptSt |
| 11 | 0.1% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, test.test_operator.OperatorTestCase.test_ |
| 10 | 0.1% | `decorators:bigmemtest` | test.test_math.MathTests.test_isqrt_huge, test.test_math.MathTests.test_log_huge_integer, test.test_re.ReTests.test_larg |
| 6 | 0.1% | `NameAst:type-other` | test.test_builtin.TestType.test_type_nokwargs, test.test_builtin.TestType.test_type_name, test.test_builtin.TestType.tes |
| 5 | 0.1% | `CallAst:frameSensitive-vars` | test.test_operator.OperatorTestCase.test___all__, test.test_functools.TestPartialMethod.test_repr |
| 5 | 0.1% | `ForAst:else` | itertools.combinations.__next__, itertools.combinations_with_replacement.__next__, typing._BaseGenericAlias.__mro_entrie |
| 4 | 0.0% | `NameAst:super` | test.test_listcomps.ListComprehensionTest.test_references_super, test.test_super.TestSuper.test_super_init_leaks, test.t |
| 3 | 0.0% | `signature:defaultExpr` | test.test_bytes.AssortedBytesTest.test_bytes_repr, test.test_bytes.AssortedBytesTest.test_bytearray_repr |
| 2 | 0.0% | `ForAst:tupleTargetShape` | test.test_codecs.CodePageTest.check_decode, test.test_codecs.CodePageTest.check_encode |
| 1 | 0.0% | `CallAst:frameSensitive-locals` | test.test_set.TestSubsets.test_issubset, pydoc.HTMLDoc.docmodule |
| 1 | 0.0% | `shape:CompareAst` | fractions.Fraction.__new__, test.test_enum._EnumTests.test_basics, pydoc.Helper.interact |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst-slice` | test.test_augassign.AugAssignTest.testSequences |
| 1 | 0.0% | `shape:DictAst` | test.test_listcomps.ListComprehensionTest.test_code_replace_extended_arg |
| 1 | 0.0% | `stmt:NonlocalAst` | test.test_super.TestSuper.tearDown |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 319 | 82.6% | `compiled` | unittest._describe_exception, unittest.expectedFailure, unittest.strclass, unittest.main, unittest.async_case._grail_isc |
| 32 | 8.3% | `stmt:FunctionDefAst` | unittest.skip, unittest.skipIf, unittest.skipUnless, types._derive_code_type, types._derive_cell_type |
| 7 | 1.8% | `globalDeclaration` | inspect._attribute_class, decimal.setcontext, abc._bump_invalidation_counter, test.support.os_helper.can_chmod, _strptim |
| 6 | 1.6% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, test.support.check__all__, typing.no_type_check, test.test_enum.enum_d |
| 5 | 1.3% | `value:LambdaAst` | inspect.walktree, test.test_heapq.L, weakref._make_finalize_callback, test.seq_tests.itermulti, test.test_set.L |
| 4 | 1.0% | `pseudoVariableParam` | typing.NoReturn, typing.Never, typing.Self, typing.LiteralString, typing.ClassVar |
| 4 | 1.0% | `flow` | re._compiler._get_charset_prefix, re._compiler._compile_info, typing.NamedTuple, pydoc.source_synopsis, pydoc.importfile |
| 3 | 0.8% | `stmt:ClassDefAst` | collections.namedtuple, test.test_heapq.load_tests, typing._nt_base, pydoc._start_server, pydoc._url_handler |
| 2 | 0.5% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type |
| 2 | 0.5% | `signature:defaultExpr` | test.test_sax.xml_bytes, test.test_sax.make_xml_file |
| 1 | 0.3% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |
| 1 | 0.3% | `ForAst:else` | re._compiler._get_literal_prefix, re._parser._parse_sub, typing._proto_hook, copy._deepcopy_tuple, linecache.updatecache |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (11) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (44) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:eligible` (34) |
| ast | 13 | 13 | 100% | 3 | `cm:eligible` (3) |
| posixpath | 13 | 13 | 100% | 0 | `-` (0) |
| codecs | 12 | 12 | 100% | 77 | `cm:eligible` (73) |
| shutil | 11 | 11 | 100% | 0 | `-` (0) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:eligible` (2) |
| base64 | 11 | 11 | 100% | 0 | `-` (0) |
| sysconfig | 11 | 11 | 100% | 0 | `-` (0) |
| tarfile | 10 | 10 | 100% | 45 | `cm:eligible` (44) |
| pickle | 88 | 86 | 98% | 31 | `cm:eligible` (30) |
| _codecs | 66 | 63 | 95% | 0 | `NameAst:builtinFunctionAsValue` (2) |
| traceback | 59 | 56 | 95% | 32 | `cm:eligible` (30) |
| re | 15 | 14 | 93% | 2 | `cm:eligible` (2) |
| inspect | 57 | 53 | 93% | 38 | `cm:eligible` (38) |
| email.utils | 12 | 11 | 92% | 0 | `value:LambdaAst` (1) |
| copy | 22 | 20 | 91% | 1 | `cm:eligible` (1) |
| _strptime | 11 | 10 | 91% | 13 | `cm:eligible` (10) |
| jinja2.utils | 16 | 14 | 88% | 35 | `cm:eligible` (35) |
| difflib | 14 | 12 | 86% | 29 | `cm:eligible` (28) |
| linecache | 12 | 10 | 83% | 0 | `stmt:FunctionDefAst` (1) |
| gc | 17 | 14 | 82% | 0 | `globalDeclaration` (3) |
| gettext | 20 | 16 | 80% | 16 | `cm:eligible` (15) |
| asyncio.events | 10 | 8 | 80% | 53 | `cm:eligible` (52) |
| _py_warnings | 30 | 23 | 77% | 13 | `cm:eligible` (11) |
| flask.helpers | 17 | 13 | 76% | 0 | `ConstantAst:Ellipsis` (2) |
| pydoc | 42 | 32 | 76% | 80 | `cm:eligible` (57) |
| dataclasses | 16 | 12 | 75% | 6 | `cm:eligible` (6) |
| werkzeug.http | 39 | 28 | 72% | 0 | `ConstantAst:Ellipsis` (6) |
| re._compiler | 17 | 12 | 71% | 0 | `flow` (2) |
| jinja2.filters | 75 | 52 | 69% | 3 | `value:LambdaAst` (8) |
| asyncio.tasks | 12 | 7 | 58% | 15 | `cm:eligible` (15) |
| sqlparse.engine.grouping | 28 | 16 | 57% | 0 | `stmt:FunctionDefAst` (10) |
| typing | 85 | 47 | 55% | 133 | `cm:eligible` (121) |
| types | 12 | 6 | 50% | 9 | `cm:eligible` (9) |
