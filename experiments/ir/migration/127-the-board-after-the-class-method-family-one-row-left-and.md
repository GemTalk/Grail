## The board after the class-method family: one row left, and its name is not its cause

Re-measured on `main` at a73357ab (2026-09-20), the first measurement on a tree
containing the whole class-method family (#1046-#1067). Four sessions, the
standard split: `census_stdlib.tpz` plus `census_tests_00..02.tpz`, each with
the suite's gem configuration.

### The board

| corpus | top-level defs | class methods | refusals |
| --- | ---: | ---: | ---: |
| stdlib (125 modules) | 1588 / 1588 (100%) | 4604 / 4604 (100%) | **0** |
| test manifest (129 modules) | 1360 / 1360 (100%) | 11462 / 11463 (100.0%) | **1** |

Nineteen refusal rows became one. `fallbacks` is 0 in all four sessions, so
every eligible def built through IR rather than falling back:

```
STATS  compiled->6181  fallbacks->0   (stdlib)
STATS  compiled->5519  fallbacks->0   (tests_00)
STATS  compiled->6514  fallbacks->0   (tests_01)
STATS  compiled->6184  fallbacks->0   (tests_02)
```

**No row moved down a guard this time.** That is the thing worth checking and
the reason to re-measure at all: closing a row repeatedly exposed the next
refusal underneath it (`classDef:moduleScopeTarget` -> `classDef:nameNotLocal`,
`stmt:TypeAliasAst` -> `value:TypeAliasValueAst`,
`NameAst:super-declaredInFunction` -> `CallAst:super-shadowed`). Twenty-one
defs closed and nothing new appeared.

### The one row left, and why its name proves nothing

```
| 1 | 0.0% | `ForAst:async` | test.test_coroutines.CoroutineTest.test_for_assign_raising_stop_async_iteration |
```

`ForAst>>___irRefusalDetail___:` opens with

```smalltalk
self class == ForAst ifFalse: [^ #'ForAst:async'].
```

so **every** AsyncForAst refusal is named `ForAst:async`, whatever refused it —
the target-shape and `ForAst:other` tests below that line are unreachable for an
async receiver. And asyncness is NOT itself a refusal: the eligibility
predicate accepts both classes (`self class == ForAst or: [self class ==
AsyncForAst]`, since cut 54). So the row says "an async for refused" and
nothing more.

The method's own source is

```python
async for tgt[0] in source():
```

a SUBSCRIPT target, which the sync path names `ForAst:target-SubscriptAst` and
also refuses. That makes the subscript target the likely cause — but it is an
INFERENCE from the source text, not a measurement, and it is left as one here.

**An out-of-context probe cannot settle it.** Parsing the four shapes
standalone and asking the node directly answers `eligible=false` for all four,
including `for x in src(): pass` — a shape this same board compiles 1588 times
out of 1588. Eligibility reads `functionBeingCompiled`, the scope stack and the
real locals set, so a node asked outside a compile answers about the probe, not
about the code. Settling this needs either a finer `___irRefusalDetail___:`
(test the shapes first, name async only when nothing else refused) or a
forced-IR compile of that one method with the reason read from the census.

### What this board does not measure, which is most of what is left

The census counts DEFS. Four things carry no row here and are still 100%
transpiled Smalltalk text:

* **the module body** — `importlib` ~831 builds every module as
  `moduleAst printSmalltalkOn:` into a ~900 KB env-1 `initialize`: imports,
  class creation, every top-level statement, and the `___irInstallDef:`
  statements themselves are written INTO that text;
* **the class-body transport** — `ClassDefAst>>printSmalltalkOn:` fills
  `methodSources` with `generateMethodSourceOn:` for every class-body def
  unconditionally; the seam then picks `emitIRInstallOn:` over
  `emitCompileMethodOn:`, so the transpiler runs for all of them either way;
* **doits** — `exec` / `eval` / the REPL / `_compileInContext:`;
* **the text twins** — `___irTextSources___` exists because four consumers
  recompile a method's Smalltalk SOURCE and an IR method's `sourceString` is
  its Python (the MI merge, the enum gap-fill, `grail.smalltalk_class`,
  `UnboundMethod`'s special-receiver recompile).

So "100% of defs" and "the transpiler can be retired" are different claims, and
this board only supports the first.
