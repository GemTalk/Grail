# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1570 top-level defs, **1267 compiled through IR (80.7%)**; 4427 class-body methods, of which **3809 are IR-eligible (86.0%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6201 defs the corpus holds, 81.9% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 1267 | 80.7% | `compiled` | _codecs.normalizestring, _codecs.register, _codecs.unregister, _codecs.lookup, _codecs._forget_codec |
| 70 | 4.5% | `stmt:FunctionDefAst` | re._parser.parse_template, _py_warnings._warn_unawaited_coroutine, types._derive_code_type, types._derive_cell_type, typ |
| 48 | 3.1% | `value:ListCompAst` | _codecs.xmlcharrefreplace_errors, _codecs.backslashreplace_errors, _codecs.namereplace_errors, re._compiler._mk_bitmap,  |
| 27 | 1.7% | `value:GeneratorExpAst` | re._compiler._hex_code, _py_warnings._is_filename_to_skip, _typing._union_getitem, asyncio.tasks.wait, typing._type_repr |
| 23 | 1.5% | `pseudoVariableParam` | typing.NoReturn, typing.Never, typing.Self, typing.LiteralString, typing.ClassVar |
| 19 | 1.2% | `globalDeclaration` | _codecs._bootstrap, _py_warnings._set_module, abc._bump_invalidation_counter, _strptime._strptime, gettext._tokenize |
| 18 | 1.1% | `value:LambdaAst` | inspect.walktree, weakref._make_finalize_callback, werkzeug.http.dump_cookie, email.utils.make_msgid, werkzeug.datastruc |
| 17 | 1.1% | `ConstantAst:Ellipsis` | annotationlib.type_repr, typing._is_param_expr, typing._unpack_args, werkzeug._internal._dt_as_utc, werkzeug._internal._ |
| 11 | 0.7% | `flow` | re._compiler._get_charset_prefix, re._compiler._compile_info, _py_warnings._formatwarnmsg_impl, _py_warnings.filterwarni |
| 11 | 0.7% | `NameAst:builtinFunctionAsValue` | _codecs.escape_decode, _codecs.readbuffer_encode, re._subject, re._compiler._compile, re._parser._parse |
| 7 | 0.4% | `AssignAst:chained` | re._compiler._optimize_charset, typing._make_nmtuple, django.utils.regex_helper.flatten_result, urllib.request.parse_htt |
| 5 | 0.3% | `value:DictCompAst` | codecs.make_identity_dict, typing._make_eager_annotate, typing.NamedTuple, werkzeug.datastructures.headers._options_head |
| 5 | 0.3% | `AugAssignAst:target-AttributeAst` | re._parser._parse_flags, _py_warnings._filters_mutated_lock_held, pickle._advance, sqlparse.utils.offset, sqlparse.utils |
| 5 | 0.3% | `ForAst:else` | re._compiler._get_literal_prefix, re._parser._parse_sub, _py_warnings.warn_explicit, typing._proto_hook, socket.getfqdn |
| 5 | 0.3% | `signature:defaultExpr` | werkzeug.http.parse_cache_control_header, werkzeug.http.parse_csp_header, jinja2.filters.sync_do_map, jinja2.filters.do_ |
| 4 | 0.3% | `stmt:ClassDefAst` | typing._nt_base, pydoc._start_server, pydoc._url_handler, pydoc.cli |
| 4 | 0.3% | `value:NamedExprAst` | _py_warnings._next_external_frame, typing._eval_type, werkzeug.http.parse_options_header, quopri.decode |
| 3 | 0.2% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type, asyncio.tasks.ensure_future |
| 3 | 0.2% | `CallAst:frameSensitive-vars` | typing.get_type_hints, pickle._find_global, sqlparse.cli._process_file |
| 3 | 0.2% | `CallAst:frameSensitive-globals` | typing.__getattr__, django.utils.version.get_git_changeset, importlib._search_roots |
| 3 | 0.2% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, typing.no_type_check |
| 2 | 0.1% | `value:SetCompAst` | asyncio.tasks.all_tasks, werkzeug.http.remove_entity_headers |
| 2 | 0.1% | `typeParams` | typing.reveal_type, typing.override |
| 2 | 0.1% | `AugAssignAst:target-SubscriptAst` | tempfile._next_candidate, sqlparse.utils.split_unquoted_newlines |
| 2 | 0.1% | `ConstantAst:complex` | copy._grail_shared_atomic_samples, pickle._builtin_type_registry |
| 1 | 0.1% | `NameAst:super` | typing._generic_init_subclass |
| 1 | 0.1% | `CallAst:frameSensitive-exec` | gettext.c2py |
| 1 | 0.1% | `WhileAst:else` | re._compiler._generate_overlap_table |
| 1 | 0.1% | `RaiseAst:keywords` | gemdb.commit |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 3809 | 86.0% | `eligible` | __future__._Feature.__init__, __future__._Feature.getOptionalRelease, __future__._Feature.getMandatoryRelease, __future_ |
| 82 | 1.9% | `value:ListCompAst` | _strptime.LocaleTime.__calc_weekday, _strptime.LocaleTime.__calc_month, _strptime.LocaleTime.__calc_alt_digits, argparse |
| 76 | 1.7% | `stmt:FunctionDefAst` | _py_warnings.deprecated.__call__, _pyio.IOBase.readline, _pyio.TextIOWrapper.seek, _strptime.TimeRE.pattern, argparse.He |
| 67 | 1.5% | `value:GeneratorExpAst` | _pyio.FileIO.__init__, _strptime.TimeRE.__init__, argparse.RawDescriptionHelpFormatter._fill_text, argparse.FileType.__c |
| 64 | 1.4% | `AugAssignAst:target-AttributeAst` | _pyio.BytesIO.write, _pyio.BufferedReader._read_unlocked, _pyio.IncrementalNewlineDecoder.decode, _pyio.TextIOWrapper._g |
| 64 | 1.4% | `method:selfNotNamedSelf` | abc.ABCMeta.register, abc.ABCMeta.__subclasscheck__, abc.ABCMeta.__instancecheck__, codecs.CodecInfo.__new__, _typing._N |
| 42 | 0.9% | `method:classmethod` | inspect.Signature.from_callable, collections._NT._make, collections.Counter.fromkeys, collections.UserDict.fromkeys, col |
| 36 | 0.8% | `AssignAst:chained` | re._parser.SubPattern.getwidth, _py_warnings.catch_warnings.__enter__, _pyio.TextIOWrapper.__init__, _pyio.TextIOWrapper |
| 34 | 0.8% | `method:classNotAtModuleScope` | argparse._Section.__init__, argparse._Section.format_help, argparse._ChoicesPseudoAction.__init__, collections._NT.__new |
| 22 | 0.5% | `value:LambdaAst` | _strptime.LocaleTime.__calc_date_time, argparse.HelpFormatter.add_argument, asyncio.locks.Barrier._block, asyncio.locks. |
| 19 | 0.4% | `method:staticmethod` | operator.attrgetter._resolve, asyncio.timeouts.Timeout._insert_timeout_error, django.utils.functional.cached_property.fu |
| 15 | 0.3% | `NameAst:builtinFunctionAsValue` | _pyio.BufferedIOBase._readinto, _pyio.BufferedReader._readinto, _strptime.TimeRE.__seqToRE, operator.attrgetter.__repr__ |
| 13 | 0.3% | `value:NamedExprAst` | _pyio.IOBase.__del__, _pyio.RawIOBase.readall, _pyio._BufferedIOMixin._dealloc_warn, _pyio.FileIO.readall, _pyio.TextIOW |
| 12 | 0.3% | `RaiseAst:keywords` | subprocess.Popen.communicate, werkzeug.routing.map.MapAdapter.match, jinja2.environment.Environment.handle_exception, ji |
| 12 | 0.3% | `ConstantAst:Ellipsis` | blinker.base._PNamespaceSignal.__call__, typing._TupleType.__getitem__, werkzeug.formparser.TStreamFactory.__call__, jin |
| 10 | 0.2% | `flow` | _pyio.TextIOWrapper._read_chunk, argparse.HelpFormatter._format_action, argparse._ActionsContainer._get_optional_kwargs, |
| 9 | 0.2% | `value:DictCompAst` | collections.deque.__deepcopy__, selectors.SelectSelector.select, werkzeug.routing.map.MapAdapter.build, jinja2.environme |
| 6 | 0.1% | `ForAst:else` | werkzeug.datastructures.headers.Headers.set, werkzeug.routing.matcher.StateMachineMatcher.add, jinja2.lexer.Lexer.tokeni |
| 4 | 0.1% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, werkzeug.local.LocalProxy.__dir__, flask. |
| 4 | 0.1% | `signature:defaultExpr` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codecs.StreamRe |
| 3 | 0.1% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__, jinja2.environment.Template.generate, grail_asgi.Server._run_app |
| 3 | 0.1% | `globalDeclaration` | contextvars.Context.run, asyncio.events.EventLoop.run_forever, typing._LazyAnnotationLib.__getattr__ |
| 3 | 0.1% | `CallAst:frameSensitive-vars` | argparse.HelpFormatter._expand_help, argparse._SubParsersAction.__call__, argparse.Namespace.__eq__ |
| 3 | 0.1% | `CallAst:frameSensitive-locals` | jinja2.environment.Environment.overlay, pydoc.HTMLDoc.docmodule, sqlparse.sql.Token.__repr__ |
| 3 | 0.1% | `value:SetCompAst` | werkzeug.datastructures.structures.HeaderSet.__init__, werkzeug.routing.rules.Rule.__init__, flask.sansio.app.App.add_ur |
| 3 | 0.1% | `WhileAst:else` | _pyio.TextIOWrapper.tell, werkzeug.test.Client.open, graphlib.TopologicalSorter._find_cycle |
| 2 | 0.0% | `stmt:ClassDefAst` | typing.NewType.__mro_entries__, pydoc.HTMLDoc.docclass |
| 2 | 0.0% | `CallAst:frameSensitive-eval` | annotationlib.ForwardRef.evaluate, pydoc.Helper.help |
| 1 | 0.0% | `AugAssignAst:target-SubscriptAst` | codecs.StreamReader.readline |
| 1 | 0.0% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__ |
| 1 | 0.0% | `CallAst:frameSensitive-exec` | flask.config.Config.from_pyfile |
| 1 | 0.0% | `shape:CompareAst` | pydoc.Helper.interact |
| 1 | 0.0% | `typeParams` | typing._IdentityCallable.__call__ |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_linecache, test.test_pickle, test.test_typing, test.test_codecencodings_kr, test.test_ipaddress, test.test_pulldom, test.test_sax, test.test_ssl, test.test_zipapp).

**test corpus, everything compiled**: 2731 top-level defs, **2259 compiled through IR (82.7%)**; 13550 class-body methods, of which **8590 are IR-eligible (63.4%)** through the class-method seam (cut 36); 257 nested defs/lambdas. Of all 16538 defs the corpus holds, 65.6% go through IR.

**`test.*` modules alone**: 386 top-level defs, 314 compiled (81.3%); 8515 class methods (test code is almost entirely TestCase methods), of which 4196 IR-eligible; 69 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 4196 | 49.3% | `eligible` | test.test_textwrap.BaseTestCase.check, test.test_textwrap.BaseTestCase.check_wrap, test.test_textwrap.BaseTestCase.check |
| 1653 | 19.4% | `method:classNotAtModuleScope` | collections._NT.__new__, collections._NT._nt_tuple_index, collections._NT._nt_tuple_count, collections._NT.__getattr__,  |
| 865 | 10.2% | `stmt:ClassDefAst` | test.test_math.MathTests.testCeil, test.test_math.MathTests.testFloor, test.test_math.MathTests.test_trunc, test.test_ma |
| 624 | 7.3% | `stmt:FunctionDefAst` | test.test_math.MathTests.testFrexp, test.test_math.MathTests.testFsum, test.test_math.MathTests.testModf, test.test_math |
| 214 | 2.5% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__ |
| 152 | 1.8% | `NameAst:builtinFunctionAsValue` | textwrap.TextWrapper._wrap_chunks, operator.attrgetter.__repr__, operator.itemgetter.__repr__, operator.methodcaller.__r |
| 125 | 1.5% | `value:LambdaAst` | test.test_textwrap.IndentTestCase.test_indent_nomargin_all_lines, test.test_textwrap.IndentTestCase.test_indent_no_lines |
| 111 | 1.3% | `value:ListCompAst` | collections.OrderedDict.values, collections.OrderedDict.items, collections.Counter._keep_positive, collections.ChainMap. |
| 69 | 0.8% | `flow` | test.test_textwrap.BaseTestCase.show, test.test_math.MathTests.testHypotAccuracy, test.test_math.MathTests.test_exceptio |
| 62 | 0.7% | `CallAst:frameSensitive-exec` | test.test_enum.TestSpecial.test_empty_globals, test.test_unpack.TestCornerCases.test_extended_oparg_not_ignored, test.te |
| 55 | 0.6% | `ConstantAst:complex` | test.test_operator.OperatorTestCase.test_lt, test.test_operator.OperatorTestCase.test_le, test.test_operator.OperatorTes |
| 50 | 0.6% | `value:GeneratorExpAst` | types.SimpleNamespace.__repr__, textwrap.TextWrapper._handle_long_word, test.test_math.MathTests.testHypot, test.test_ma |
| 49 | 0.6% | `AugAssignAst:target-AttributeAst` | collections._deque_iterator.__next__, collections.deque.append, collections.deque.appendleft, collections.deque.pop, col |
| 38 | 0.4% | `method:classmethod` | unittest.TestCase.setUpClass, unittest.TestCase.tearDownClass, unittest.TestCase.addClassCleanup, unittest.TestCase.doCl |
| 37 | 0.4% | `method:staticmethod` | operator.attrgetter._resolve, itertools.islice._coerce, test.datetimetester.T.from_td, test.datetimetester.ZoneInfo.inve |
| 26 | 0.3% | `CallAst:frameSensitive-eval` | test.test_float.ReprTestCase.test_repr, annotationlib.ForwardRef.evaluate, test.datetimetester.TestTimeZone.test_repr, t |
| 25 | 0.3% | `ConstantAst:surrogateStr` | test.test_codecs.ReadTest.test_lone_surrogates, test.test_codecs.ReadTest.test_incremental_surrogatepass, test.test_code |
| 23 | 0.3% | `AssignAst:chained` | re._parser.SubPattern.getwidth, test.test_math.FMATests.test_fma_overflow, test.test_operator.OperatorTestCase.test_is,  |
| 23 | 0.3% | `globalDeclaration` | contextvars.Context.run, typing._LazyAnnotationLib.__getattr__, test.test_set.TestWeirdBugs.test_8420_set_merge |
| 19 | 0.2% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__, test.test_enum.TestSpecial.test_pickle_explodes, test.test_enum.TestConvert.tearDown, t |
| 15 | 0.2% | `value:NamedExprAst` | fractions.Fraction.__format__, pydoc.HTMLDoc.markup |
| 14 | 0.2% | `shape:TryAst` | test.test_exception_variations.ExceptStarTestCases.test_try_except_else_finally, test.test_exception_variations.ExceptSt |
| 12 | 0.1% | `value:DictCompAst` | collections.deque.__deepcopy__, test.test_dict.DictTest.test_copy_noncompact, test.test_dict.DictTest.test_items_symmetr |
| 10 | 0.1% | `decorators:bigmemtest` | test.test_math.MathTests.test_isqrt_huge, test.test_math.MathTests.test_log_huge_integer, test.test_re.ReTests.test_larg |
| 9 | 0.1% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, test.datetimetester.TestModule.test_all,  |
| 7 | 0.1% | `method:selfNotNamedSelf` | types._FunctionTypeMeta.__instancecheck__, types._MethodTypeMeta.__instancecheck__, types.MappingProxyType.__new__, coll |
| 6 | 0.1% | `NameAst:type-other` | test.test_builtin.TestType.test_type_nokwargs, test.test_builtin.TestType.test_type_name, test.test_builtin.TestType.tes |
| 5 | 0.1% | `AugAssignAst:target-SubscriptAst` | test.test_collections.TestCounter.test_basics, test.test_augassign.AugAssignTest.testInList, test.test_augassign.AugAssi |
| 5 | 0.1% | `ForAst:else` | test.datetimetester.TestDateTimeTZ.test_tzinfo_now, test.test_re.ReTests.test_locale_flag |
| 4 | 0.0% | `NameAst:super` | test.test_listcomps.ListComprehensionTest.test_references_super, test.test_super.TestSuper.test_super_init_leaks, test.t |
| 3 | 0.0% | `CallAst:frameSensitive-vars` | test.test_operator.OperatorTestCase.test___all__, test.test_functools.TestPartialMethod.test_repr |
| 3 | 0.0% | `signature:defaultExpr` | test.test_bytes.AssortedBytesTest.test_bytes_repr, test.test_bytes.AssortedBytesTest.test_bytearray_repr |
| 2 | 0.0% | `ForAst:tupleTargetShape` | test.test_codecs.CodePageTest.check_decode, test.test_codecs.CodePageTest.check_encode |
| 1 | 0.0% | `CallAst:frameSensitive-locals` | test.test_set.TestSubsets.test_issubset, pydoc.HTMLDoc.docmodule |
| 1 | 0.0% | `shape:SetAst` | test.test_collections.TestCollectionABCs.test_Set_hash_matches_frozenset |
| 1 | 0.0% | `stmt:NonlocalAst` | test.test_super.TestSuper.tearDown |
| 1 | 0.0% | `value:SetCompAst` | test.test_pickle.CompatPickleTests.test_import |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 314 | 81.3% | `compiled` | unittest._describe_exception, unittest.expectedFailure, unittest.strclass, unittest.main, unittest.async_case._grail_isc |
| 31 | 8.0% | `stmt:FunctionDefAst` | unittest.skip, unittest.skipIf, unittest.skipUnless, types._derive_code_type, types._derive_cell_type |
| 7 | 1.8% | `globalDeclaration` | inspect._attribute_class, decimal.setcontext, abc._bump_invalidation_counter, test.support.os_helper.can_chmod, _strptim |
| 6 | 1.6% | `CallAst:frameSensitive-dir` | inspect.getmembers, inspect.classify_class_attrs, test.support.check__all__, typing.no_type_check, test.test_enum.enum_d |
| 5 | 1.3% | `value:LambdaAst` | inspect.walktree, test.test_heapq.L, weakref._make_finalize_callback, test.seq_tests.itermulti, test.test_set.L |
| 4 | 1.0% | `pseudoVariableParam` | typing.NoReturn, typing.Never, typing.Self, typing.LiteralString, typing.ClassVar |
| 3 | 0.8% | `value:ListCompAst` | collections.namedtuple, textwrap.dedent, re._compiler._mk_bitmap, re._constants._makecodes, pickle._pack_uint |
| 3 | 0.8% | `stmt:ClassDefAst` | test.test_heapq.load_tests, typing._nt_base, pydoc._start_server, pydoc._url_handler, pydoc.cli |
| 3 | 0.8% | `flow` | re._compiler._get_charset_prefix, re._compiler._compile_info, pydoc.source_synopsis, pydoc.importfile |
| 2 | 0.5% | `AssignAst:chained` | re._compiler._optimize_charset, test.test_math.py_factorial, typing._make_nmtuple, traceback._levenshtein_distance |
| 2 | 0.5% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type |
| 2 | 0.5% | `signature:defaultExpr` | test.test_sax.xml_bytes, test.test_sax.make_xml_file |
| 1 | 0.3% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |
| 1 | 0.3% | `value:SetCompAst` | asyncio.tasks.all_tasks |
| 1 | 0.3% | `ForAst:else` | re._compiler._get_literal_prefix, re._parser._parse_sub, typing._proto_hook |
| 1 | 0.3% | `AugAssignAst:target-AttributeAst` | re._parser._parse_flags, pickle._advance |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (8) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (44) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:eligible` (34) |
| ast | 13 | 13 | 100% | 3 | `cm:eligible` (3) |
| posixpath | 13 | 13 | 100% | 0 | `-` (0) |
| shutil | 11 | 11 | 100% | 0 | `-` (0) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:eligible` (2) |
| tarfile | 10 | 10 | 100% | 45 | `cm:eligible` (42) |
| pickle | 88 | 83 | 94% | 31 | `cm:eligible` (28) |
| re | 15 | 14 | 93% | 2 | `cm:eligible` (2) |
| inspect | 57 | 53 | 93% | 38 | `cm:eligible` (37) |
| email.utils | 12 | 11 | 92% | 0 | `value:LambdaAst` (1) |
| codecs | 12 | 11 | 92% | 77 | `cm:eligible` (70) |
| _codecs | 66 | 60 | 91% | 0 | `value:ListCompAst` (3) |
| _strptime | 11 | 10 | 91% | 13 | `cm:eligible` (4) |
| sysconfig | 11 | 10 | 91% | 0 | `value:ListCompAst` (1) |
| copy | 22 | 19 | 86% | 1 | `value:ListCompAst` (1) |
| traceback | 59 | 50 | 85% | 32 | `cm:eligible` (24) |
| gc | 17 | 14 | 82% | 0 | `globalDeclaration` (3) |
| base64 | 11 | 9 | 82% | 0 | `value:ListCompAst` (2) |
| jinja2.utils | 16 | 13 | 81% | 35 | `cm:eligible` (32) |
| gettext | 20 | 16 | 80% | 16 | `cm:eligible` (15) |
| asyncio.events | 10 | 8 | 80% | 53 | `cm:eligible` (51) |
| flask.helpers | 17 | 13 | 76% | 0 | `ConstantAst:Ellipsis` (2) |
| linecache | 12 | 9 | 75% | 0 | `value:ListCompAst` (2) |
| pydoc | 42 | 30 | 71% | 80 | `cm:eligible` (51) |
| _py_warnings | 30 | 21 | 70% | 13 | `cm:eligible` (11) |
| difflib | 14 | 9 | 64% | 29 | `cm:eligible` (16) |
| werkzeug.http | 39 | 24 | 62% | 0 | `ConstantAst:Ellipsis` (6) |
| jinja2.filters | 75 | 45 | 60% | 3 | `value:LambdaAst` (8) |
| sqlparse.engine.grouping | 28 | 16 | 57% | 0 | `stmt:FunctionDefAst` (10) |
| re._compiler | 17 | 9 | 53% | 0 | `flow` (2) |
| dataclasses | 16 | 8 | 50% | 6 | `cm:eligible` (5) |
| types | 12 | 6 | 50% | 9 | `cm:eligible` (5) |
| typing | 85 | 41 | 48% | 133 | `cm:eligible` (106) |
| asyncio.tasks | 12 | 5 | 42% | 15 | `cm:eligible` (13) |
