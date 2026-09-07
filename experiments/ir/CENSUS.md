# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1570 top-level defs, **957 compiled through IR (61.0%)**; 4427 class-body methods, of which **1685 are IR-eligible (38.1%)** through the class-method seam (cut 36); 204 nested defs/lambdas. Of all 6201 defs the corpus holds, 42.6% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 957 | 61.0% | `compiled` | _codecs.normalizestring, _codecs.register, _codecs.unregister, _codecs.lookup, _codecs._forget_codec |
| 258 | 16.4% | `returnAnnotation` | asyncio.timeouts.timeout, asyncio.timeouts.timeout_at, typing._deprecation_warning_for_no_type_params_passed, typing._is |
| 70 | 4.5% | `decorators` | _pyio.open, typing.NoReturn, typing.Never, typing.Self, typing.LiteralString |
| 45 | 2.9% | `stmt:FunctionDefAst` | re._parser.parse_template, _py_warnings._warn_unawaited_coroutine, types._derive_code_type, types._derive_cell_type, typ |
| 33 | 2.1% | `value:ListCompAst` | _codecs.xmlcharrefreplace_errors, _codecs.backslashreplace_errors, _codecs.namereplace_errors, re._compiler._mk_bitmap,  |
| 27 | 1.7% | `generator` | codecs.iterencode, codecs.iterdecode, _strptime._findall, _strptime._fixmonths, gettext._tokenize |
| 21 | 1.3% | `async` | asyncio.tasks.sleep, asyncio.tasks.gather, asyncio.tasks._cancel_and_wait, asyncio.tasks.wait_for, asyncio.tasks.wait |
| 20 | 1.3% | `CallAst:doubleStarKwargs` | typing._make_forward_ref, copy.replace, dataclasses.replace, dataclasses._dataclass_replace_dunder, subprocess.run |
| 19 | 1.2% | `value:StarredAst` | _strptime._strptime_datetime_date, _strptime._strptime_datetime_time, _strptime._strptime_datetime_datetime, operator.ca |
| 18 | 1.1% | `NameAst:super-__class__-type` | _py_warnings.filterwarnings, _py_warnings.warn, annotationlib.type_repr, inspect.isclass, inspect._defines_own_method |
| 17 | 1.1% | `globalDeclaration` | _codecs._bootstrap, _py_warnings._set_module, abc._bump_invalidation_counter, _strptime._strptime, gettext.textdomain |
| 15 | 1.0% | `value:GeneratorExpAst` | re._compiler._hex_code, _py_warnings._is_filename_to_skip, _typing._union_getitem, typing._type_repr, typing._check_gene |
| 9 | 0.6% | `NameAst:builtinFunctionAsValue` | _codecs.escape_decode, _codecs.readbuffer_encode, re._subject, re._compiler._compile, re._parser._parse |
| 7 | 0.4% | `flow` | re._compiler._get_charset_prefix, re._compiler._compile_info, _py_warnings._formatwarnmsg_impl, pydoc.source_synopsis, p |
| 5 | 0.3% | `pseudoVariableParam` | typing._typevar_subst, typing._typevartuple_prepare_subst, typing._paramspec_subst, typing._paramspec_prepare_subst, typ |
| 5 | 0.3% | `AssignAst:chained` | re._compiler._optimize_charset, typing._make_nmtuple, django.utils.regex_helper.flatten_result, urllib.request.parse_htt |
| 5 | 0.3% | `signature:defaultExpr` | werkzeug.http.parse_cache_control_header, werkzeug.http.parse_csp_header, jinja2.filters.sync_do_map, jinja2.filters.do_ |
| 4 | 0.3% | `stmt:ClassDefAst` | typing._nt_base, pydoc._start_server, pydoc._url_handler, pydoc.cli |
| 4 | 0.3% | `value:DictCompAst` | codecs.make_identity_dict, typing._make_eager_annotate, typing.NamedTuple, pydoc.sort_attributes |
| 4 | 0.3% | `ForAst:else` | re._compiler._get_literal_prefix, re._parser._parse_sub, _py_warnings.warn_explicit, socket.getfqdn |
| 3 | 0.2% | `value:LambdaAst` | inspect.walktree, weakref._make_finalize_callback, email.utils.make_msgid |
| 3 | 0.2% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type, asyncio.tasks.ensure_future |
| 3 | 0.2% | `value:NamedExprAst` | _py_warnings._next_external_frame, typing._eval_type, quopri.decode |
| 3 | 0.2% | `AugAssignAst:target-AttributeAst` | re._parser._parse_flags, _py_warnings._filters_mutated_lock_held, pickle._advance |
| 2 | 0.1% | `CallAst:frameSensitive-vars` | pickle._find_global, sqlparse.cli._process_file |
| 2 | 0.1% | `CallAst:frameSensitive-globals` | typing.__getattr__, importlib._search_roots |
| 2 | 0.1% | `AugAssignAst:target-SubscriptAst` | tempfile._next_candidate, sqlparse.utils.split_unquoted_newlines |
| 2 | 0.1% | `ConstantAst:complex` | copy._grail_shared_atomic_samples, pickle._builtin_type_registry |
| 2 | 0.1% | `ConstantAst:Ellipsis` | typing._is_param_expr, typing._unpack_args |
| 1 | 0.1% | `value:SetCompAst` | asyncio.tasks.all_tasks |
| 1 | 0.1% | `CallAst:frameSensitive-exec` | gettext.c2py |
| 1 | 0.1% | `paramAnnotation` | typing._collect_type_parameters |
| 1 | 0.1% | `WhileAst:else` | re._compiler._generate_overlap_table |
| 1 | 0.1% | `RaiseAst:keywords` | gemdb.commit |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 1685 | 38.1% | `eligible` | __future__._Feature.__init__, __future__._Feature.getOptionalRelease, __future__._Feature.getMandatoryRelease, __future_ |
| 1140 | 25.8% | `returnAnnotation` | _py_warnings.deprecated.__init__, asyncio.taskgroups.TaskGroup._is_base_error, asyncio.timeouts.Timeout.__init__, asynci |
| 353 | 8.0% | `decorators` | contextvars.Token.var, contextvars.Token.old_value, contextvars.ContextVar.name, re._parser.State.groups, re._parser.Tok |
| 266 | 6.0% | `method:slots` | _grail_session.SessionDict.__init__, _grail_session.SessionDict._dict, _grail_session.SessionDict.__getitem__, _grail_se |
| 151 | 3.4% | `NameAst:moduleFunctionInMethod` | _pyio.BufferedReader.__init__, _pyio.BufferedWriter.__init__, _pyio.TextIOWrapper.__init__, _strptime.LocaleTime.__init_ |
| 143 | 3.2% | `CallAst:selfSendKeywordsOrArity` | _markupbase.ParserBase.parse_declaration, _markupbase.ParserBase._parse_doctype_subset, re._parser.Tokenizer.getuntil, r |
| 76 | 1.7% | `NameAst:super-__class__-type` | re._constants.PatternError.__init__, _py_warnings.deprecated.__call__, _pyio.BytesIO.close, _pyio.FileIO.close, _pyio.St |
| 66 | 1.5% | `async` | asyncio.events.EventLoop.shutdown_asyncgens, asyncio.events.EventLoop._wait_readable, asyncio.events.EventLoop._wait_wri |
| 65 | 1.5% | `generator` | _typing.TypeVarTuple.__iter__, argparse.HelpFormatter._iter_indented_subactions, collections.UserList.__iter__, asyncio. |
| 64 | 1.4% | `method:selfNotNamedSelf` | abc.ABCMeta.register, abc.ABCMeta.__subclasscheck__, abc.ABCMeta.__instancecheck__, codecs.CodecInfo.__new__, _typing._N |
| 49 | 1.1% | `value:StarredAst` | argparse.HelpFormatter._format_usage, argparse._ActionsContainer.add_argument, argparse._ActionsContainer.add_argument_g |
| 46 | 1.0% | `value:ListCompAst` | _strptime.LocaleTime.__calc_weekday, _strptime.LocaleTime.__calc_month, _strptime.LocaleTime.__calc_alt_digits, argparse |
| 44 | 1.0% | `AugAssignAst:target-NameAst` | re._parser.Tokenizer.__next, re._parser.Tokenizer.getwhile, _pyio.IOBase.readlines, _pyio.BytesIO.__init__, _pyio.Buffer |
| 42 | 0.9% | `method:classmethod` | inspect.Signature.from_callable, collections._NT._make, collections.Counter.fromkeys, collections.UserDict.fromkeys, col |
| 41 | 0.9% | `AugAssignAst:target-AttributeAst` | _pyio.BytesIO.write, _pyio.IncrementalNewlineDecoder.decode, _pyio.TextIOWrapper._get_decoded_chars, _pyio.TextIOWrapper |
| 34 | 0.8% | `method:classNotAtModuleScope` | argparse._Section.__init__, argparse._Section.format_help, argparse._ChoicesPseudoAction.__init__, collections._NT.__new |
| 25 | 0.6% | `paramAnnotation` | werkzeug.datastructures.auth.WWWAuthenticate.__init__, werkzeug.datastructures.cache_control._CacheControl.__init__, wer |
| 20 | 0.5% | `value:GeneratorExpAst` | _pyio.FileIO.__init__, argparse.RawDescriptionHelpFormatter._fill_text, argparse.FileType.__call__, argparse.ArgumentPar |
| 19 | 0.4% | `method:staticmethod` | operator.attrgetter._resolve, asyncio.timeouts.Timeout._insert_timeout_error, django.utils.functional.cached_property.fu |
| 18 | 0.4% | `AssignAst:chained` | re._parser.SubPattern.getwidth, _py_warnings.catch_warnings.__enter__, _strptime.LocaleTime.__find_month_format, _strpti |
| 18 | 0.4% | `CallAst:doubleStarKwargs` | argparse._SubParsersAction.add_parser, argparse._ActionsContainer.add_mutually_exclusive_group, argparse.ArgumentParser. |
| 15 | 0.3% | `stmt:FunctionDefAst` | _pyio.IOBase.readline, _pyio.TextIOWrapper.seek, _strptime.TimeRE.pattern, argparse.HelpFormatter._format_action_invocat |
| 8 | 0.2% | `value:NamedExprAst` | _pyio.IOBase.__del__, _pyio.RawIOBase.readall, _pyio._BufferedIOMixin._dealloc_warn, _pyio.FileIO.readall, _pyio.TextIOW |
| 7 | 0.2% | `NameAst:builtinFunctionAsValue` | _pyio.BufferedIOBase._readinto, _pyio.BufferedReader._readinto, _strptime.TimeRE.__seqToRE, operator.attrgetter.__repr__ |
| 5 | 0.1% | `signature:defaultExpr` | codecs.StreamWriter.__getattr__, codecs.StreamReader.__getattr__, codecs.StreamReaderWriter.__getattr__, codecs.StreamRe |
| 4 | 0.1% | `flow` | _pyio.TextIOWrapper._read_chunk, argparse.HelpFormatter._format_action, argparse._ActionsContainer._get_optional_kwargs, |
| 3 | 0.1% | `globalDeclaration` | contextvars.Context.run, asyncio.events.EventLoop.run_forever, typing._LazyAnnotationLib.__getattr__ |
| 3 | 0.1% | `CallAst:frameSensitive-vars` | argparse.HelpFormatter._expand_help, argparse._SubParsersAction.__call__, argparse.Namespace.__eq__ |
| 3 | 0.1% | `RaiseAst:keywords` | subprocess.Popen.communicate, requests.models.Response.raise_for_status, requests.sessions.Session._send_once |
| 2 | 0.0% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule |
| 2 | 0.0% | `stmt:ClassDefAst` | typing.NewType.__mro_entries__, pydoc.HTMLDoc.docclass |
| 2 | 0.0% | `value:DictCompAst` | collections.deque.__deepcopy__, selectors.SelectSelector.select |
| 2 | 0.0% | `value:LambdaAst` | argparse.HelpFormatter.add_argument, hmac.HMAC.__init__ |
| 1 | 0.0% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__ |
| 1 | 0.0% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__ |
| 1 | 0.0% | `CallAst:frameSensitive-locals` | pydoc.HTMLDoc.docmodule |
| 1 | 0.0% | `ForAst:else` | sqlparse.lexer.Lexer.is_keyword |
| 1 | 0.0% | `shape:CompareAst` | pydoc.Helper.interact |
| 1 | 0.0% | `WhileAst:else` | graphlib.TopologicalSorter._find_cycle |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_linecache, test.test_pickle, test.test_typing, test.test_codecencodings_kr, test.test_ipaddress, test.test_pulldom, test.test_sax, test.test_ssl, test.test_zipapp).

**test corpus, everything compiled**: 2731 top-level defs, **2071 compiled through IR (75.8%)**; 13550 class-body methods, of which **6193 are IR-eligible (45.7%)** through the class-method seam (cut 36); 257 nested defs/lambdas. Of all 16538 defs the corpus holds, 50.0% go through IR.

**`test.*` modules alone**: 386 top-level defs, 271 compiled (70.2%); 8515 class methods (test code is almost entirely TestCase methods), of which 3227 IR-eligible; 69 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 3227 | 37.9% | `eligible` | test.test_textwrap.BaseTestCase.check, test.test_textwrap.BaseTestCase.check_split, test.test_textwrap.WrapTestCase.setU |
| 1653 | 19.4% | `method:classNotAtModuleScope` | collections._NT.__new__, collections._NT._nt_tuple_index, collections._NT._nt_tuple_count, collections._NT.__getattr__,  |
| 807 | 9.5% | `stmt:ClassDefAst` | test.test_math.MathTests.testCeil, test.test_math.MathTests.testFloor, test.test_math.MathTests.test_trunc, test.test_ma |
| 563 | 6.6% | `stmt:FunctionDefAst` | test.test_math.MathTests.testFrexp, test.test_math.MathTests.testModf, contextlib.ContextDecorator.__call__, itertools.g |
| 326 | 3.8% | `decorators` | contextvars.Token.var, contextvars.Token.old_value, contextvars.ContextVar.name, inspect._ParameterKind.name, inspect._P |
| 257 | 3.0% | `CallAst:selfSendKeywordsOrArity` | test.test_textwrap.ShortenTestCase.test_simple, test.test_textwrap.ShortenTestCase.test_placeholder, test.test_textwrap. |
| 252 | 3.0% | `NameAst:moduleFunctionInMethod` | unittest.TestCase.id, unittest.TestCase.__str__, unittest.TestCase.__repr__, unittest.TestCase.run, unittest.TestSuite._ |
| 210 | 2.5% | `async` | unittest.async_case.IsolatedAsyncioTestCase.asyncSetUp, unittest.async_case.IsolatedAsyncioTestCase.asyncTearDown, unitt |
| 123 | 1.4% | `NameAst:builtinFunctionAsValue` | operator.attrgetter.__repr__, operator.itemgetter.__repr__, operator.methodcaller.__repr__, test.test_float.FormatTestCa |
| 113 | 1.3% | `value:LambdaAst` | test.test_textwrap.IndentTestCase.test_indent_nomargin_all_lines, test.test_textwrap.IndentTestCase.test_indent_no_lines |
| 101 | 1.2% | `stmt:AsyncFunctionDefAst` | contextlib.AsyncContextDecorator.__call__ |
| 93 | 1.1% | `value:ListCompAst` | collections.OrderedDict.values, collections.OrderedDict.items, collections.Counter._keep_positive, collections.ChainMap. |
| 91 | 1.1% | `value:StarredAst` | unittest.TestCase.doCleanups, unittest.TestCase._callCleanup, unittest.TestCase.__call__, unittest.TestCase.assertRaises |
| 71 | 0.8% | `AugAssignAst:target-NameAst` | unittest.TestCase._callTestMethod, collections.deque.count, collections.deque.index, collections.deque.__contains__, col |
| 62 | 0.7% | `NameAst:super-__class__-type` | unittest.async_case.IsolatedAsyncioTestCase.__init__, unittest.async_case.IsolatedAsyncioTestCase.run, unittest.async_ca |
| 62 | 0.7% | `CallAst:frameSensitive-exec` | test.test_enum.TestSpecial.test_empty_globals, test.test_unpack.TestCornerCases.test_extended_oparg_not_ignored, test.te |
| 50 | 0.6% | `flow` | test.test_textwrap.BaseTestCase.show, test.test_int.IntStrDigitLimitsTests.test_denial_of_service_prevented_int_to_str,  |
| 46 | 0.5% | `ConstantAst:complex` | test.test_operator.OperatorTestCase.test_lt, test.test_operator.OperatorTestCase.test_le, test.test_operator.OperatorTes |
| 42 | 0.5% | `AugAssignAst:target-AttributeAst` | collections._deque_iterator.__next__, collections.deque.append, collections.deque.appendleft, collections.deque.pop, col |
| 40 | 0.5% | `value:GeneratorExpAst` | types.SimpleNamespace.__repr__, textwrap.TextWrapper._handle_long_word, test.test_math.MathTests.testDist, test.test_mat |
| 38 | 0.4% | `method:classmethod` | unittest.TestCase.setUpClass, unittest.TestCase.tearDownClass, unittest.TestCase.addClassCleanup, unittest.TestCase.doCl |
| 37 | 0.4% | `method:staticmethod` | operator.attrgetter._resolve, itertools.islice._coerce, test.datetimetester.T.from_td, test.datetimetester.ZoneInfo.inve |
| 26 | 0.3% | `generator` | collections.UserList.__iter__, itertools.groupby._grouper, test.test_heapq.TestHeap.heapiter, test.test_heapq.TestHeap.h |
| 26 | 0.3% | `CallAst:frameSensitive-eval` | test.test_float.ReprTestCase.test_repr, test.datetimetester.TestTimeZone.test_repr, test.datetimetester.TestTimeDelta.te |
| 24 | 0.3% | `ConstantAst:surrogateStr` | test.test_codecs.ReadTest.test_lone_surrogates, test.test_codecs.ReadTest.test_incremental_surrogatepass, test.test_code |
| 22 | 0.3% | `globalDeclaration` | contextvars.Context.run, typing._LazyAnnotationLib.__getattr__, test.test_set.TestWeirdBugs.test_8420_set_merge |
| 22 | 0.3% | `method:slots` | types.MethodType.__init__, types.MethodType.__call__, types.MethodType.__repr__, _grail_session.SessionDict.__init__, _g |
| 21 | 0.2% | `AssignAst:chained` | re._parser.SubPattern.getwidth, test.test_math.FMATests.test_fma_overflow, test.test_operator.OperatorTestCase.test_is,  |
| 19 | 0.2% | `CallAst:frameSensitive-globals` | typing._GenericAlias.__reduce__, test.test_enum.TestSpecial.test_pickle_explodes, test.test_enum.TestConvert.tearDown, t |
| 16 | 0.2% | `CallAst:doubleStarKwargs` | test.test_textwrap.BaseTestCase.check_wrap, test.test_textwrap.ShortenTestCase.check_shorten, test.datetimetester.CapiTe |
| 15 | 0.2% | `value:NamedExprAst` | pydoc.HTMLDoc.markup |
| 14 | 0.2% | `shape:TryAst` | test.test_exception_variations.ExceptStarTestCases.test_try_except_else_finally, test.test_exception_variations.ExceptSt |
| 12 | 0.1% | `value:DictCompAst` | collections.deque.__deepcopy__, test.test_dict.DictTest.test_copy_noncompact, test.test_dict.DictTest.test_items_symmetr |
| 8 | 0.1% | `CallAst:frameSensitive-dir` | unittest.TestLoader.getTestCaseNames, unittest.TestLoader.loadTestsFromModule, test.datetimetester.TestModule.test_all,  |
| 7 | 0.1% | `method:selfNotNamedSelf` | types._FunctionTypeMeta.__instancecheck__, types._MethodTypeMeta.__instancecheck__, types.MappingProxyType.__new__, coll |
| 3 | 0.0% | `returnAnnotation` | typing._UnionGenericAliasMeta.__instancecheck__, typing._UnionGenericAliasMeta.__subclasscheck__, typing._IdentityCallab |
| 3 | 0.0% | `CallAst:frameSensitive-vars` | test.test_operator.OperatorTestCase.test___all__, test.test_functools.TestPartialMethod.test_repr |
| 3 | 0.0% | `signature:defaultExpr` | test.test_bytes.AssortedBytesTest.test_bytes_repr, test.test_bytes.AssortedBytesTest.test_bytearray_repr |
| 3 | 0.0% | `AugAssignAst:target-SubscriptAst` | test.test_collections.TestCounter.test_basics, test.test_augassign.AugAssignTest.testInList, test.test_augassign.AugAssi |
| 3 | 0.0% | `ForAst:else` | test.datetimetester.TestDateTimeTZ.test_tzinfo_now, test.test_re.ReTests.test_locale_flag |
| 2 | 0.0% | `ForAst:tupleTargetShape` | test.test_codecs.CodePageTest.check_decode, test.test_codecs.CodePageTest.check_encode |
| 1 | 0.0% | `CallAst:frameSensitive-locals` | test.test_set.TestSubsets.test_issubset, pydoc.HTMLDoc.docmodule |
| 1 | 0.0% | `stmt:NonlocalAst` | test.test_super.TestSuper.tearDown |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 271 | 70.2% | `compiled` | unittest._describe_exception, unittest.expectedFailure, unittest.strclass, unittest.main, unittest.async_case._grail_isc |
| 29 | 7.5% | `stmt:FunctionDefAst` | unittest.skip, unittest.skipIf, unittest.skipUnless, types._derive_code_type, types._derive_cell_type |
| 26 | 6.7% | `generator` | collections.abc._gen, test.test_math.parse_mtestfile, test.test_math.parse_testfile, test.support.async_yield, test.test |
| 15 | 3.9% | `value:StarredAst` | test.support.check_disallow_instantiation, test.support.run_yielding_async_fn, test.support.run_no_yield_async_fn, opera |
| 6 | 1.6% | `globalDeclaration` | inspect._attribute_class, decimal.setcontext, abc._bump_invalidation_counter, test.support.os_helper.can_chmod, _strptim |
| 5 | 1.3% | `value:LambdaAst` | inspect.walktree, test.test_heapq.L, weakref._make_finalize_callback, test.seq_tests.itermulti, test.test_set.L |
| 5 | 1.3% | `CallAst:frameSensitive-dir` | test.support.check__all__, test.test_enum.enum_dir, test.test_enum.member_dir |
| 4 | 1.0% | `pseudoVariableParam` | typing._typevar_subst, typing._typevartuple_prepare_subst, typing._paramspec_subst, typing._paramspec_prepare_subst, typ |
| 3 | 0.8% | `stmt:ClassDefAst` | test.test_heapq.load_tests, typing._nt_base, pydoc._start_server, pydoc._url_handler, pydoc.cli |
| 3 | 0.8% | `async` | test.test_with.do_async_with, asyncio.tasks.sleep, asyncio.tasks.gather, asyncio.tasks._cancel_and_wait, asyncio.tasks.w |
| 3 | 0.8% | `flow` | re._compiler._get_charset_prefix, re._compiler._compile_info, pydoc.source_synopsis, pydoc.importfile |
| 2 | 0.5% | `value:ListCompAst` | collections.namedtuple, textwrap.dedent, re._compiler._mk_bitmap, re._constants._makecodes, pickle._pack_uint |
| 2 | 0.5% | `decorators` | fractions._hash_algorithm, typing.NoReturn, typing.Never, typing.Self, typing.LiteralString |
| 2 | 0.5% | `AssignAst:chained` | re._compiler._optimize_charset, test.test_math.py_factorial, typing._make_nmtuple, traceback._levenshtein_distance |
| 2 | 0.5% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type |
| 2 | 0.5% | `signature:defaultExpr` | test.test_sax.xml_bytes, test.test_sax.make_xml_file |
| 1 | 0.3% | `signature:defaultReadsLocal` | test.test_struct.iter_integer_formats |
| 1 | 0.3% | `NameAst:super-__class__-type` | inspect.isclass, inspect._defines_own_method, inspect.signature, inspect.getmembers, inspect.classify_class_attrs |
| 1 | 0.3% | `value:SetCompAst` | asyncio.tasks.all_tasks |
| 1 | 0.3% | `CallAst:doubleStarKwargs` | textwrap.wrap, textwrap.fill, textwrap.shorten, typing._make_forward_ref, copy.replace |
| 1 | 0.3% | `ForAst:else` | re._compiler._get_literal_prefix, re._parser._parse_sub |
| 1 | 0.3% | `AugAssignAst:target-AttributeAst` | re._parser._parse_flags, pickle._advance |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| logging | 17 | 17 | 100% | 44 | `cm:eligible` (34) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| urllib.parse | 17 | 17 | 100% | 34 | `cm:method:slots` (34) |
| ast | 13 | 13 | 100% | 3 | `cm:eligible` (3) |
| posixpath | 13 | 13 | 100% | 0 | `-` (0) |
| shutil | 11 | 11 | 100% | 0 | `-` (0) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:NameAst:moduleFunctionInMethod` (2) |
| tarfile | 10 | 10 | 100% | 45 | `cm:eligible` (38) |
| operator | 54 | 53 | 98% | 14 | `cm:eligible` (7) |
| re | 15 | 14 | 93% | 2 | `cm:eligible` (2) |
| email.utils | 12 | 11 | 92% | 0 | `value:LambdaAst` (1) |
| _codecs | 66 | 60 | 91% | 0 | `value:ListCompAst` (3) |
| sysconfig | 11 | 10 | 91% | 0 | `value:ListCompAst` (1) |
| pickle | 88 | 78 | 89% | 31 | `cm:eligible` (11) |
| inspect | 57 | 50 | 88% | 38 | `cm:eligible` (27) |
| gc | 17 | 14 | 82% | 0 | `globalDeclaration` (3) |
| base64 | 11 | 9 | 82% | 0 | `value:ListCompAst` (2) |
| traceback | 59 | 48 | 81% | 32 | `cm:eligible` (13) |
| gettext | 20 | 16 | 80% | 16 | `cm:eligible` (13) |
| asyncio.events | 10 | 8 | 80% | 53 | `cm:eligible` (37) |
| linecache | 12 | 9 | 75% | 0 | `value:ListCompAst` (2) |
| codecs | 12 | 9 | 75% | 77 | `cm:eligible` (68) |
| pydoc | 42 | 29 | 69% | 80 | `cm:eligible` (22) |
| _py_warnings | 30 | 20 | 67% | 13 | `cm:eligible` (9) |
| copy | 22 | 13 | 59% | 1 | `NameAst:super-__class__-type` (3) |
| re._compiler | 17 | 9 | 53% | 0 | `flow` (2) |
| difflib | 14 | 7 | 50% | 29 | `cm:generator` (8) |
| _strptime | 11 | 5 | 45% | 13 | `value:StarredAst` (3) |
| dataclasses | 16 | 6 | 38% | 6 | `cm:eligible` (5) |
| typing | 85 | 29 | 34% | 133 | `cm:decorators` (41) |
| types | 12 | 4 | 33% | 9 | `stmt:FunctionDefAst` (4) |
| sqlparse.engine.grouping | 28 | 8 | 29% | 0 | `stmt:FunctionDefAst` (10) |
| asyncio.tasks | 12 | 2 | 17% | 15 | `cm:eligible` (8) |
| jinja2.filters | 75 | 0 | 0% | 3 | `returnAnnotation` (30) |
| werkzeug.http | 39 | 0 | 0% | 0 | `returnAnnotation` (31) |
| jinja2.tests | 23 | 0 | 0% | 0 | `returnAnnotation` (21) |
| flask.helpers | 17 | 0 | 0% | 0 | `returnAnnotation` (14) |
| jinja2.utils | 16 | 0 | 0% | 35 | `cm:returnAnnotation` (31) |
