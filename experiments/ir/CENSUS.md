# IR eligibility census

How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.

## Method

`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.

Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: `census_stdlib.tpz` imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and `census_tests_00..02.tpz` import every module of `scripts/cpython_suite_manifest.txt`, round-robin across three sessions because one session cannot hold the whole manifest. Each script reads its module list at run time, so adding a module to the manifest needs no edit here. The stdlib corpus takes about two minutes, each test shard several.

**They need the suite's gem configuration, not topaz's defaults.** Under a bare
`topaz -l` the manifest shards die partway with `OutOfMemory old space overflow`
/ `VM temporary object memory is full` (error 4067) -- which looks like a census
bug and is not. Run them the way the suite runner does:

```bash
CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=1800000;GEM_MAX_SMALLTALK_STACK_DEPTH=80000;"
$GEMSTONE/bin/topaz -lq -C "$CFG" -S experiments/ir/census_tests_00.tpz < /dev/null
```

The cache is TWICE the suite's 900000 KB now: the manifest has grown to 200
modules, and on 2026-10-30 shard 1's 67 died at 900000 with old space full
(675 MB, error 4067) while shards 0 and 2 completed. At 1800000 all three do.

This paragraph is EMITTED BY `census_report.py`, not hand-written here: the
report rewrites `CENSUS.md` wholesale, so prose added to the board by hand is
silently dropped by the next regeneration.  Anything worth keeping goes in the
generator.

**Each module is counted once, however many sessions compiled it.** Every session compiles the stdlib its own modules import, so a module reached from two shards is measured in both; this report therefore builds the corpus totals from the per-module rows rather than by summing the session totals. It matters here: of the 490 modules the test corpus touches, 208 are reached from more than one shard, and summing them -- which is what produced the boards before this was fixed -- overstates the corpus by about half. The shards agree exactly on every module they share, so which copy is taken makes no difference, and ANY split of the manifest gives the same board; that is checked by running one.

Counts here are exact and reproducible; the EXAMPLE names beside each reason are not. importlib keeps only the first five it sees per reason per session, so which five reach the board depends on the order modules were compiled. They illustrate a reason; they never enumerate it.

## Corpus 1: the vendored stdlib (125 top-level imports)

**stdlib**: 2070 top-level defs, **2069 compiled through IR (100.0%)**; 6257 class-body methods, of which **6256 are IR-eligible (100.0%)** through the class-method seam (cut 36); 277 nested defs/lambdas. Of all 8604 defs the corpus holds, 96.8% go through IR.

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 2069 | 100.0% | `compiled` | _codecs._bootstrap, _codecs.lookup, _codecs.normalizestring, _codecs.register, _codecs.unregister |
| 1 | 0.0% | `shape:ImportFromAst` | ast.unparse |

### Class-body methods (stdlib corpus)

What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 6256 | 100.0% | `eligible` | __future__._Feature.__init__, __future__._Feature.__repr__, __future__._Feature.getMandatoryRelease, __future__._Feature |
| 1 | 0.0% | `shape:ImportFromAst` | random.Random.seed |

## Corpus 2: the CPython test modules of the suite manifest

Importing the 250 manifest modules compiles them AND the stdlib they pull in; 0 failed to import for pre-existing reasons unrelated to IR ().

**test corpus, everything compiled**: 2663 top-level defs, **2650 compiled through IR (99.5%)**; 21858 class-body methods, of which **21824 are IR-eligible (99.8%)** through the class-method seam (cut 36); 505 nested defs/lambdas. Of all 25026 defs the corpus holds, 97.8% go through IR.

**`test.*` modules alone**: 539 top-level defs, 528 compiled (98.0%); 16415 class methods (test code is almost entirely TestCase methods), of which 16382 IR-eligible; 250 nested.

| methods | share of class methods | reason | examples |
| ---: | ---: | --- | --- |
| 16382 | 99.8% | `eligible` | test.test_int.IntTestCases.test_basic, test.test_int.IntTestCases.test_invalid_signs, test.test_int.IntTestCases.test_no |
| 19 | 0.1% | `classDef:deferredAnnotationRead` | test.test_annotationlib.TestGetAnnotations.test_partial_evaluation_cell, test.test_patma.TestPatma.test_patma_generic_pr |
| 4 | 0.0% | `method:noSelfNamesReceiver` | test.test_copy.C.__reduce__, test.test_copy.C.__reduce_ex__ |
| 2 | 0.0% | `classDef:deferredReadOfNonlocal` | test.test_annotationlib.TestForwardRefClass.test_fwdref_evaluate_argument_mutation, test.test_annotationlib.TestGetAnnot |
| 2 | 0.0% | `signature:defaultReadsLocal` | test.test_descr.Checker.__getattr__, test.test_descr.Checker.__getattribute__ |
| 1 | 0.0% | `AssignAst:target-AttributeAst` | test.test_descr.A.__del__ |
| 1 | 0.0% | `DeleteAst:target` | test.test_grammar.GrammarTests.test_del_stmt |
| 1 | 0.0% | `ForAst:async` | test.test_coroutines.CoroutineTest.test_for_assign_raising_stop_async_iteration |
| 1 | 0.0% | `LambdaAst:yield` | test.test_generators.FinalizationTest.test_lambda_generator |
| 1 | 0.0% | `nestedDef:decoratorReadsOwnName` | test.test_grammar.GrammarTests.test_funcdef |
| 1 | 0.0% | `shape:ImportFromAst` | random.Random.seed, test.test_types.SubinterpreterTests.setUpClass |

| defs | share of top-level | reason | examples |
| ---: | ---: | --- | --- |
| 528 | 98.0% | `compiled` | test.test_math.count_set_bits, test.test_math.partial_product, test.test_math.py_factorial, test.test_math.to_ulps, test |
| 9 | 1.7% | `classDef:deferredAnnotationRead` | test.test_inspect.inspect_stringized_annotations_pep695.___generic_parameters_of_A___, test.test_inspect.inspect_stringi |
| 2 | 0.4% | `ForAst:target-SubscriptAst` | test.test_generators.conjoin, test.test_generators.simple_conjoin |

## Per-module coverage (stdlib corpus)

Top-level defs only. Modules with at least 10 top-level defs, by share compiled.

| module | top-level defs | compiled | share | class methods | biggest blocker |
| --- | ---: | ---: | ---: | ---: | --- |
| typing | 82 | 82 | 100% | 126 | `cm:eligible` (126) |
| _codecs | 75 | 75 | 100% | 0 | `-` (0) |
| inspect | 73 | 73 | 100% | 51 | `cm:eligible` (51) |
| jinja2.filters | 69 | 69 | 100% | 3 | `cm:eligible` (3) |
| traceback | 59 | 59 | 100% | 32 | `cm:eligible` (32) |
| urllib.parse | 55 | 55 | 100% | 19 | `cm:eligible` (19) |
| operator | 54 | 54 | 100% | 14 | `cm:eligible` (14) |
| _ssl | 49 | 49 | 100% | 128 | `cm:eligible` (128) |
| pydoc | 42 | 42 | 100% | 80 | `cm:eligible` (80) |
| dataclasses | 36 | 36 | 100% | 14 | `cm:eligible` (14) |
| pickle | 33 | 33 | 100% | 125 | `cm:eligible` (125) |
| werkzeug.http | 31 | 31 | 100% | 0 | `-` (0) |
| _py_warnings | 30 | 30 | 100% | 13 | `cm:eligible` (13) |
| annotationlib | 29 | 29 | 100% | 61 | `cm:eligible` (61) |
| base64 | 28 | 28 | 100% | 0 | `-` (0) |
| sqlparse.engine.grouping | 28 | 28 | 100% | 0 | `-` (0) |
| _pydecimal | 26 | 26 | 100% | 214 | `cm:eligible` (214) |
| logging | 25 | 25 | 100% | 76 | `cm:eligible` (76) |
| doctest | 25 | 25 | 100% | 76 | `cm:eligible` (76) |
| uuid | 23 | 23 | 100% | 29 | `cm:eligible` (29) |
| jinja2.tests | 23 | 23 | 100% | 0 | `-` (0) |
| copy | 22 | 22 | 100% | 1 | `cm:eligible` (1) |
| binascii | 21 | 21 | 100% | 1 | `cm:eligible` (1) |
| email.utils | 21 | 21 | 100% | 0 | `-` (0) |
| gettext | 20 | 20 | 100% | 16 | `cm:eligible` (16) |
| glob | 20 | 20 | 100% | 15 | `cm:eligible` (15) |
| urllib.request | 20 | 20 | 100% | 92 | `cm:eligible` (92) |
| _grail_generic_alias | 19 | 19 | 100% | 4 | `cm:eligible` (4) |
| re._compiler | 17 | 17 | 100% | 0 | `-` (0) |
| heapq | 17 | 17 | 100% | 0 | `-` (0) |
| genericpath | 17 | 17 | 100% | 2 | `cm:eligible` (2) |
| gc | 17 | 17 | 100% | 0 | `-` (0) |
| mock | 16 | 16 | 100% | 95 | `cm:eligible` (95) |
| jinja2.utils | 16 | 16 | 100% | 35 | `cm:eligible` (35) |
| posixpath | 16 | 16 | 100% | 0 | `-` (0) |
| types | 16 | 16 | 100% | 33 | `cm:eligible` (33) |
| shutil | 15 | 15 | 100% | 0 | `-` (0) |
| re | 15 | 15 | 100% | 2 | `cm:eligible` (2) |
| ntpath | 15 | 15 | 100% | 0 | `-` (0) |
| flask.helpers | 15 | 15 | 100% | 0 | `-` (0) |
| _grail_copyreg | 14 | 14 | 100% | 0 | `-` (0) |
| difflib | 14 | 14 | 100% | 29 | `cm:eligible` (29) |
| ssl | 13 | 13 | 100% | 87 | `cm:eligible` (87) |
| stat | 13 | 13 | 100% | 0 | `-` (0) |
| threading | 13 | 13 | 100% | 50 | `cm:eligible` (50) |
| asyncio.tasks | 13 | 13 | 100% | 15 | `cm:eligible` (15) |
| linecache | 12 | 12 | 100% | 0 | `-` (0) |
| email.quoprimime | 12 | 12 | 100% | 0 | `-` (0) |
| zipfile | 12 | 12 | 100% | 85 | `cm:eligible` (85) |
| ipaddress | 12 | 12 | 100% | 128 | `cm:eligible` (128) |
| codecs | 12 | 12 | 100% | 77 | `cm:eligible` (77) |
| _strptime | 11 | 11 | 100% | 13 | `cm:eligible` (13) |
| asyncio.events | 11 | 11 | 100% | 60 | `cm:eligible` (60) |
| platform | 11 | 11 | 100% | 0 | `-` (0) |
| dis | 11 | 11 | 100% | 2 | `cm:eligible` (2) |
| unittest | 11 | 11 | 100% | 123 | `cm:eligible` (123) |
| tempfile | 11 | 11 | 100% | 45 | `cm:eligible` (45) |
| _typing | 11 | 11 | 100% | 59 | `cm:eligible` (59) |
| sysconfig | 11 | 11 | 100% | 0 | `-` (0) |
| tarfile | 11 | 11 | 100% | 45 | `cm:eligible` (45) |
| multiprocessing | 10 | 10 | 100% | 1 | `cm:eligible` (1) |
| asyncio.futures | 10 | 10 | 100% | 15 | `cm:eligible` (15) |
| ast | 32 | 31 | 97% | 19 | `cm:eligible` (19) |

## What is still text

The def rows above say which METHODS go through IR. Everything else Grail compiles is still Smalltalk text: module bodies, class bodies, method-local class helpers, doits, the text twin each IR method carries, and templated support code. These rows measure it (plan item P0.2). The flags are the same: IR forced on, census on, imports only. `importlib ___irCensus___` holds them beside the def reasons as `ms:` (module statements), `cs:` (class-body statements), `th:helper`, `in:` (install statements), `lit:` (their literals) and `by:` / `tx:` (characters and compiles per kind of compiled source).

**Bytes are counted per compile, so a corpus figure is what an import of it compiles.** A class-body method compiled from text is counted twice, honestly: once as a literal inside the module body, and again when the class build compiles it. The `by:rt:` kinds are compiles made while a module body runs (`Behavior >> ___compileMethod:category:scope:`), attributed to that module; a handful made outside any import are attributed to `?`.

## Corpus 1 (stdlib): what is still text

### Bytes of generated Smalltalk compiled (stdlib)

**98.63 MB of generated Smalltalk source was handed to the compiler**: **63.17 MB (64%) is translated Python**, 19.98 MB (20%) is the text twin of methods already built through IR, and 15.48 MB (16%) is templated support code that stays. Characters, counted where the source is compiled; one per character for a non-ASCII literal.

| group | kind | compiles | MB | share |
| --- | --- | ---: | ---: | ---: |
| translated | module body `initialize` (module statements, module-level class builds) | 302 | 61.39 | 62.2% |
| translated | class-body defs compiled from text at class build (carry `<grailPython>`) | 12 | 0.03 | 0.0% |
| translated | methods copied by recompiling their text (MI merge) | 612 | 1.12 | 1.1% |
| translated | method-local class helpers (cut 76) | 13 | 0.41 | 0.4% |
| translated | `exec` / `eval` doits run during the import | 8 | 0.21 | 0.2% |
| translated | top-level defs compiled as text | 1 | 0.00 | 0.0% |
| twin | `___irTextSources___` tables (text twins of IR methods) | 906 | 19.98 | 20.3% |
| support | `Grail-Class Methods (template)` | 4643 | 4.88 | 4.9% |
| support | `Grail-Tracebacks` | 894 | 2.48 | 2.5% |
| support | `support:moduleForwarder` | 1236 | 1.76 | 1.8% |
| support | `support:moduleTables` | 496 | 1.37 | 1.4% |
| support | `Grail-Class Attrs` | 13585 | 1.30 | 1.3% |
| support | `Grail-Instantiation` | 1160 | 1.06 | 1.1% |
| support | `Grail-Signatures` | 2275 | 0.92 | 0.9% |
| support | `Grail-Docstrings` | 894 | 0.74 | 0.8% |
| support | 23 smaller kinds | 3895 | 0.96 | 1.0% |

Of the 61.39 MB of module bodies, **57.94 MB (94%) is module-level class statements**; the remaining 3.46 MB is every other module statement. Inside class builds (module-level or not), 18.63 MB is the text literal each IR install carries (`in:IR+literal` below) and 12.01 MB is the source of methods compiled from text at class build.

### Module statements (stdlib)

Every top-level statement of every module compiled, by kind. **All of them are text today**: the module body is one text `initialize` (P4). A top-level `def` is a statement here too -- it binds the name in `initialize` -- while its own method is IR.

| statement | count | share |
| --- | ---: | ---: |
| `FunctionDef` | 2060 | 26.9% |
| `Assign` | 2028 | 26.5% |
| `ImportFrom` | 1164 | 15.2% |
| `ClassDef` | 1131 | 14.8% |
| `Import` | 610 | 8.0% |
| `Expr` | 399 | 5.2% |
| `If` | 109 | 1.4% |
| `Try` | 39 | 0.5% |
| `Delete` | 38 | 0.5% |
| `AsyncFunctionDef` | 28 | 0.4% |
| `For` | 26 | 0.3% |
| `AnnAssign` | 24 | 0.3% |
| `Assert` | 5 | 0.1% |
| `AugAssign` | 3 | 0.0% |
| `TypeAlias` | 1 | 0.0% |
| **total** | **7665** | |

### Class-body statements (stdlib)

Every statement directly in a class body, by kind, wherever the class is. **All are emitted as text** (P3): a def's method is built through IR, but the statement that installs it is text in the class build.

| statement | count | share |
| --- | ---: | ---: |
| `InstanceFunctionDef` | 6216 | 71.7% |
| `Assign` | 1126 | 13.0% |
| `Expr` | 792 | 9.1% |
| `AnnAssign` | 287 | 3.3% |
| `ClassFunctionDef` | 99 | 1.1% |
| `Pass` | 89 | 1.0% |
| `StaticFunctionDef` | 34 | 0.4% |
| `If` | 16 | 0.2% |
| `Delete` | 5 | 0.1% |
| `ClassDef` | 2 | 0.0% |
| `For` | 1 | 0.0% |
| `Import` | 1 | 0.0% |
| `ImportFrom` | 1 | 0.0% |
| **total** | **8669** | |

### Text-helper class builds (stdlib)

**13** class statements in an IR-built def were built as a compiled-text helper method (cut 76), 0.41 MB over 13 helper compiles. Their enclosing defs count as `compiled` above, so this is the row that shows them. Counted where the helper is built during the import; a deferred helper compiled at call time is not.

### Class-method installs (stdlib)

| install statement in a class build | count | literal MB |
| --- | ---: | ---: |
| IR build, carrying its text twin as a literal (`___irInstallDef:on:or:category:`) | 6247 | 18.63 |
| direct IR install, no literal (P4.6) | 0 | 0.00 |
| `Grail-Class Methods` compiled from text (a varargs/bigmem/skip forwarder, or a def the seam refuses) | 4538 | |
| synthesized support methods compiled from text (accessors, tables, instantiation, ...) | 25142 | |
| (all text-compile literals) | 29680 | 12.01 |


Largest module bodies, stdlib corpus:

| module | `initialize` MB | class statements MB |
| --- | ---: | ---: |
| _pydecimal | 2.50 | 2.47 |
| argparse | 1.84 | 1.83 |
| _ssl | 1.49 | 1.31 |
| _pyio | 1.41 | 1.40 |
| pydoc | 1.39 | 1.37 |
| jinja2.compiler | 1.36 | 1.34 |
| collections | 1.35 | 1.35 |
| zipfile | 1.26 | 1.24 |
| typing | 1.26 | 1.18 |
| pickle | 1.22 | 1.15 |

## Corpus 2 (test corpus, everything compiled): what is still text

### Bytes of generated Smalltalk compiled (test corpus)

**582.94 MB of generated Smalltalk source was handed to the compiler**: **424.09 MB (73%) is translated Python**, 120.51 MB (21%) is the text twin of methods already built through IR, and 38.33 MB (7%) is templated support code that stays. Characters, counted where the source is compiled; one per character for a non-ASCII literal.

| group | kind | compiles | MB | share |
| --- | --- | ---: | ---: | ---: |
| translated | module body `initialize` (module statements, module-level class builds) | 490 | 296.47 | 50.9% |
| translated | class-body defs compiled from text at class build (carry `<grailPython>`) | 154 | 1.49 | 0.3% |
| translated | methods copied by recompiling their text (MI merge) | 30543 | 94.99 | 16.3% |
| translated | method-local class helpers (cut 76) | 3636 | 30.86 | 5.3% |
| translated | `exec` / `eval` doits run during the import | 10 | 0.14 | 0.0% |
| translated | top-level defs compiled as text | 13 | 0.15 | 0.0% |
| twin | `___irTextSources___` tables (text twins of IR methods) | 2624 | 120.51 | 20.7% |
| support | `Grail-Class Methods (template)` | 17626 | 14.33 | 2.5% |
| support | `Grail-Tracebacks` | 2363 | 8.42 | 1.4% |
| support | `Grail-Class Attrs` | 32965 | 3.20 | 0.5% |
| support | `Grail-Instantiation` | 3050 | 2.88 | 0.5% |
| support | `Grail-Signatures` | 5272 | 2.38 | 0.4% |
| support | `support:moduleForwarder` | 1626 | 2.33 | 0.4% |
| support | `support:moduleTables` | 710 | 1.65 | 0.3% |
| support | `Grail-Docstrings` | 2363 | 1.37 | 0.2% |
| support | 24 smaller kinds | 11772 | 1.77 | 0.3% |

Of the 296.47 MB of module bodies, **291.35 MB (98%) is module-level class statements**; the remaining 5.12 MB is every other module statement. Inside class builds (module-level or not), 115.31 MB is the text literal each IR install carries (`in:IR+literal` below) and 46.40 MB is the source of methods compiled from text at class build.

### Module statements (test corpus)

Every top-level statement of every module compiled, by kind. **All of them are text today**: the module body is one text `initialize` (P4). A top-level `def` is a statement here too -- it binds the name in `initialize` -- while its own method is IR.

| statement | count | share |
| --- | ---: | ---: |
| `ClassDef` | 2854 | 23.3% |
| `Assign` | 2810 | 23.0% |
| `FunctionDef` | 2647 | 21.7% |
| `Import` | 1694 | 13.9% |
| `ImportFrom` | 1102 | 9.0% |
| `Expr` | 509 | 4.2% |
| `If` | 297 | 2.4% |
| `Try` | 125 | 1.0% |
| `Delete` | 87 | 0.7% |
| `For` | 43 | 0.4% |
| `AnnAssign` | 21 | 0.2% |
| `AsyncFunctionDef` | 16 | 0.1% |
| `Assert` | 7 | 0.1% |
| `AugAssign` | 5 | 0.0% |
| `TypeAlias` | 4 | 0.0% |
| `With` | 3 | 0.0% |
| **total** | **12224** | |

### Class-body statements (test corpus)

Every statement directly in a class body, by kind, wherever the class is. **All are emitted as text** (P3): a def's method is built through IR, but the statement that installs it is text in the class build.

| statement | count | share |
| --- | ---: | ---: |
| `InstanceFunctionDef` | 21743 | 76.5% |
| `Assign` | 3597 | 12.7% |
| `Pass` | 1232 | 4.3% |
| `Expr` | 1018 | 3.6% |
| `AnnAssign` | 361 | 1.3% |
| `ClassFunctionDef` | 198 | 0.7% |
| `ClassDef` | 114 | 0.4% |
| `StaticFunctionDef` | 87 | 0.3% |
| `If` | 39 | 0.1% |
| `ImportFrom` | 7 | 0.0% |
| `Delete` | 6 | 0.0% |
| `For` | 5 | 0.0% |
| `Nonlocal` | 4 | 0.0% |
| `AugAssign` | 3 | 0.0% |
| `TypeAlias` | 3 | 0.0% |
| `With` | 2 | 0.0% |
| `Global` | 1 | 0.0% |
| `Try` | 1 | 0.0% |
| **total** | **28421** | |

### Text-helper class builds (test corpus)

**3545** class statements in an IR-built def were built as a compiled-text helper method (cut 76), 30.86 MB over 3636 helper compiles. Their enclosing defs count as `compiled` above, so this is the row that shows them. Counted where the helper is built during the import; a deferred helper compiled at call time is not.

### Class-method installs (test corpus)

| install statement in a class build | count | literal MB |
| --- | ---: | ---: |
| IR build, carrying its text twin as a literal (`___irInstallDef:on:or:category:`) | 19043 | 115.31 |
| direct IR install, no literal (P4.6) | 0 | 0.00 |
| `Grail-Class Methods` compiled from text (a varargs/bigmem/skip forwarder, or a def the seam refuses) | 22383 | |
| synthesized support methods compiled from text (accessors, tables, instantiation, ...) | 111359 | |
| (all text-compile literals) | 133742 | 46.40 |


Largest module bodies, test corpus:

| module | `initialize` MB | class statements MB |
| --- | ---: | ---: |
| test.test_typing | 18.54 | 18.49 |
| test.test_descr | 10.21 | 10.20 |
| test.test_enum | 9.59 | 9.53 |
| test.datetimetester | 7.29 | 7.26 |
| test.test_functools | 5.48 | 5.46 |
| test.pickletester | 5.00 | 4.94 |
| test.test_ssl | 4.98 | 4.92 |
| test.test_decimal | 4.86 | 4.82 |
| test.test_traceback | 4.80 | 4.77 |
| test.test_xml_etree | 4.60 | 4.58 |
