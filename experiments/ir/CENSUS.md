# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 1570 top-level defs, **658 compiled through IR (41.9%)**. Beyond the seam: 4471 class-body methods and 204 nested defs/lambdas, so of all 6245 defs the corpus holds, 10.5% go through IR today and 71.6% are class methods the seam never sees.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 658 | 41.9% | `compiled` | _codecs.normalizestring, _codecs.register, _codecs.unregister, _codecs.lookup, _codecs._forget_codec |
| 355 | 22.6% | `signature:defaults` | _codecs.encode, _codecs.decode, _codecs.charmap_decode, _codecs.charmap_encode, _codecs.utf_8_encode |
| 168 | 10.7% | `returnAnnotation` | asyncio.timeouts.timeout, asyncio.timeouts.timeout_at, typing._deprecation_warning_for_no_type_params_passed, typing._is |
| 75 | 4.8% | `signature:*args` | re.sub, re.subn, re.split, re._constants._makecodes, _py_warnings._add_filter |
| 47 | 3.0% | `signature:kwonly` | _colorize.can_colorize, _colorize.get_theme, _py_warnings.warn, _py_warnings._deprecated, gettext.install |
| 47 | 3.0% | `signature:**kwargs` | codecs.iterencode, codecs.iterdecode, annotationlib.get_annotations, typing._make_forward_ref, typing.NamedTuple |
| 46 | 2.9% | `decorators` | typing.NoReturn, typing.Never, typing.Self, typing.LiteralString, typing.ClassVar |
| 34 | 2.2% | `stmt:FunctionDefAst` | re._parser.parse_template, _py_warnings._warn_unawaited_coroutine, types._derive_code_type, types._derive_cell_type, typ |
| 32 | 2.0% | `NameAst:unresolvedName` | re._subject, re._compiler._compile_charset, re._compiler._simple, re._compiler._get_literal_prefix, re._compiler._get_ch |
| 19 | 1.2% | `value:ListCompAst` | _codecs.xmlcharrefreplace_errors, _codecs.backslashreplace_errors, _codecs.namereplace_errors, _py_warnings._setoption,  |
| 15 | 1.0% | `generator` | _strptime._findall, _strptime._fixmonths, gettext._tokenize, collections.abc._gen, asyncio.tasks.__sleep0 |
| 12 | 0.8% | `globalDeclaration` | _codecs._bootstrap, _py_warnings._set_module, abc._bump_invalidation_counter, inspect._attribute_class, asyncio.events.g |
| 9 | 0.6% | `value:StarredAst` | atexit._run_exitfuncs, typing._get_protocol_attrs, copy._newobj_ex, encodings.search_function, pickle._op_reduce |
| 8 | 0.5% | `value:GeneratorExpAst` | re._compiler._hex_code, _typing._union_getitem, typing._type_repr, typing._value_and_type_iter, typing._strip_annotation |
| 7 | 0.4% | `async` | asyncio.tasks._cancel_and_wait, asyncio.tasks.wait_for, jinja2.filters.do_first, jinja2.filters.do_list, jinja2.filters. |
| 5 | 0.3% | `flow` | _py_warnings._formatwarnmsg_impl, pydoc.source_synopsis, pydoc.importfile, quopri.unhex, quopri.main |
| 4 | 0.3% | `pseudoVariableParam` | typing._typevar_subst, typing._typevartuple_prepare_subst, typing._paramspec_subst, typing._paramspec_prepare_subst |
| 3 | 0.2% | `AssignAst:chained` | django.utils.regex_helper.flatten_result, urllib.request.parse_http_list, traceback._levenshtein_distance |
| 3 | 0.2% | `stmt:ClassDefAst` | typing._nt_base, pydoc._start_server, pydoc.cli |
| 3 | 0.2% | `NameAst:super-__class__-type` | inspect._defines_own_method, inspect.classify_class_attrs, pydoc._getowndoc |
| 3 | 0.2% | `AugAssignAst:target-AttributeAst` | re._parser._parse_flags, _py_warnings._filters_mutated_lock_held, pickle._advance |
| 3 | 0.2% | `value:DictCompAst` | codecs.make_identity_dict, typing._make_eager_annotate, pydoc.sort_attributes |
| 2 | 0.1% | `NameAst:builtinFunctionAsValue` | re._compiler._compile, traceback._format_notes |
| 2 | 0.1% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type |
| 2 | 0.1% | `AugAssignAst:target-SubscriptAst` | tempfile._next_candidate, sqlparse.utils.split_unquoted_newlines |
| 2 | 0.1% | `ConstantAst:complex` | copy._grail_shared_atomic_samples, pickle._builtin_type_registry |
| 1 | 0.1% | `RaiseAst:keywords` | gemdb.commit |
| 1 | 0.1% | `ForAst:else` | re._parser._parse_sub |
| 1 | 0.1% | `value:LambdaAst` | weakref._make_finalize_callback |
| 1 | 0.1% | `value:NamedExprAst` | _py_warnings._next_external_frame |
| 1 | 0.1% | `ConstantAst:Ellipsis` | typing._is_param_expr |
| 1 | 0.1% | `WhileAst:else` | re._compiler._generate_overlap_table |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 128 manifest modules compiles them AND the stdlib they pull in; 10 failed to import for pre-existing reasons unrelated to IR (test.test_annotationlib, test.test_linecache, test.test_pickle, test.test_typing, test.test_codecencodings_kr, test.test_ipaddress, test.test_pulldom, test.test_sax, test.test_ssl, test.test_zipapp).

**test corpus, everything compiled**: 2731 top-level defs, **1490 compiled through IR (54.6%)**. Beyond the seam: 11858 class-body methods and 257 nested defs/lambdas, so of all 14846 defs the corpus holds, 10.0% go through IR today and 79.9% are class methods the seam never sees.

**`test.*` modules alone**: 386 top-level defs, 174 compiled (45.1%); 6880 class methods (test code is almost entirely TestCase methods), 69 nested.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 174 | 45.1% | `compiled` | unittest._describe_exception, unittest.expectedFailure, unittest.strclass, unittest.async_case._grail_iscoroutinefunctio |
| 60 | 15.5% | `signature:defaults` | unittest.main, inspect.formatannotation, inspect.getouterframes, inspect.stack, inspect.getattr_static |
| 39 | 10.1% | `signature:kwonly` | inspect._signature_from_callable, inspect.unwrap, test.support.subTests, test.support.check_syntax_error, test.support.c |
| 36 | 9.3% | `signature:*args` | inspect.signature, re.sub, re.subn, re.split, re._constants._makecodes |
| 24 | 6.2% | `generator` | collections.abc._gen, test.test_math.parse_mtestfile, test.test_math.parse_testfile, test.support.async_yield, test.test |
| 13 | 3.4% | `stmt:FunctionDefAst` | unittest.skip, unittest.skipIf, unittest.skipUnless, types._derive_code_type, types._derive_cell_type |
| 9 | 2.3% | `NameAst:unresolvedName` | inspect.isclass, inspect.walktree, types.resolve_bases, re._subject, re._compiler._compile_charset |
| 9 | 2.3% | `signature:**kwargs` | textwrap.wrap, textwrap.fill, textwrap.shorten, test.support.check_impl_detail, test.support.impl_detail |
| 4 | 1.0% | `globalDeclaration` | inspect._attribute_class, decimal.setcontext, abc._bump_invalidation_counter, test.support.os_helper.can_chmod, gc.enabl |
| 3 | 0.8% | `pseudoVariableParam` | typing._typevar_subst, typing._typevartuple_prepare_subst, typing._paramspec_subst, typing._paramspec_prepare_subst, tes |
| 3 | 0.8% | `stmt:ClassDefAst` | test.test_heapq.load_tests, typing._nt_base, pydoc._start_server, pydoc.cli |
| 3 | 0.8% | `async` | test.test_with.do_async_with, asyncio.tasks._cancel_and_wait, asyncio.tasks.wait_for, test.test_coroutines.asynciter |
| 2 | 0.5% | `value:ListCompAst` | textwrap.dedent, pickle._pack_uint, pickle._encode_long, copy._deepcopy_tuple, test.test_set.cube |
| 2 | 0.5% | `decorators` | fractions._hash_algorithm, typing.NoReturn, typing.Never, typing.Self, typing.LiteralString |
| 1 | 0.3% | `AssignAst:chained` | test.test_math.py_factorial, traceback._levenshtein_distance |
| 1 | 0.3% | `stmt:AsyncFunctionDefAst` | types._derive_coroutine_type, types._derive_async_generator_type |
| 1 | 0.3% | `value:StarredAst` | pickle._op_reduce, pickle._op_newobj, pickle._op_newobj_ex, pickle._op_inst, pickle._op_obj |
| 1 | 0.3% | `value:SetCompAst` | test.test_asyncio.test_taskgroups.get_error_types |
| 1 | 0.3% | `ForAst:else` | re._parser._parse_sub |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| operator | 54 | 52 | 96% | 14 | `signature:defaults` (1) |
| ast | 13 | 12 | 92% | 3 | `signature:defaults` (1) |
| platform | 11 | 10 | 91% | 0 | `signature:defaults` (1) |
| tarfile | 10 | 9 | 90% | 45 | `signature:**kwargs` (1) |
| posixpath | 13 | 11 | 85% | 0 | `signature:defaults` (1) |
| pickle | 88 | 74 | 84% | 31 | `value:StarredAst` (5) |
| heapq | 17 | 14 | 82% | 0 | `signature:defaults` (2) |
| asyncio.events | 10 | 8 | 80% | 53 | `globalDeclaration` (2) |
| base64 | 11 | 8 | 73% | 0 | `signature:defaults` (3) |
| sysconfig | 11 | 8 | 73% | 0 | `signature:defaults` (2) |
| inspect | 57 | 41 | 72% | 38 | `signature:defaults` (8) |
| codecs | 12 | 7 | 58% | 77 | `signature:defaults` (2) |
| traceback | 59 | 34 | 58% | 32 | `signature:defaults` (12) |
| gettext | 20 | 11 | 55% | 16 | `signature:defaults` (5) |
| gc | 17 | 9 | 53% | 0 | `signature:*args` (3) |
| _py_warnings | 30 | 15 | 50% | 13 | `signature:defaults` (5) |
| copy | 22 | 11 | 50% | 1 | `signature:*args` (3) |
| linecache | 12 | 6 | 50% | 0 | `signature:defaults` (4) |
| email.utils | 12 | 6 | 50% | 0 | `signature:defaults` (4) |
| pydoc | 42 | 19 | 45% | 66 | `signature:defaults` (11) |
| _codecs | 66 | 27 | 41% | 0 | `signature:defaults` (35) |
| _strptime | 11 | 4 | 36% | 13 | `signature:defaults` (5) |
| dis | 11 | 4 | 36% | 2 | `signature:kwonly` (7) |
| urllib.parse | 17 | 6 | 35% | 34 | `signature:defaults` (11) |
| re | 15 | 5 | 33% | 2 | `signature:defaults` (6) |
| sqlparse.engine.grouping | 28 | 8 | 29% | 0 | `stmt:FunctionDefAst` (10) |
| shutil | 11 | 3 | 27% | 0 | `signature:defaults` (8) |
| types | 12 | 3 | 25% | 9 | `stmt:FunctionDefAst` (4) |
| typing | 85 | 21 | 25% | 131 | `decorators` (18) |
| logging | 17 | 4 | 24% | 44 | `signature:*args` (9) |
| re._compiler | 17 | 4 | 24% | 0 | `NameAst:unresolvedName` (6) |
| difflib | 14 | 3 | 21% | 29 | `signature:defaults` (8) |
| dataclasses | 16 | 3 | 19% | 6 | `stmt:FunctionDefAst` (3) |
| jinja2.filters | 75 | 0 | 0% | 2 | `signature:defaults` (31) |
| werkzeug.http | 39 | 0 | 0% | 0 | `signature:defaults` (19) |
| jinja2.tests | 23 | 0 | 0% | 0 | `returnAnnotation` (21) |
| flask.helpers | 17 | 0 | 0% | 0 | `signature:defaults` (5) |
| jinja2.utils | 16 | 0 | 0% | 35 | `returnAnnotation` (9) |
| asyncio.tasks | 12 | 0 | 0% | 15 | `signature:defaults` (5) |
