# TODO

Known gaps and follow-ups, grouped by area and roughly ordered by priority
within each group (highest first). The "Phase X" labels referenced in
commit messages are working-session shorthand — this file groups by topic
instead so the work is meaningful to a fresh reader.

## Bugs Blocking Common Python Idioms

These break programs that look ordinary in CPython.

- [x] ~~**Class-mapped builtin calls fall through to a broken legacy
  path**~~ — Done. `bool(x)`, `int(x)`, `float(x)`, `str(x)`,
  `object()`, `Decimal(x)`, `range(...)`, `bytes(...)`, `bytearray(...)`,
  `list(...)`, `tuple(...)`, `dict(...)`, `set(...)`, `frozenset(...)`
  all emit `(cls @env1:__new__: arg ...)` via `bareCallClassNewSelector`
  in `CallAst >> printSmalltalkOn:`. Arity mismatches on a known class
  produce a Python `TypeError` instead of a `value:value:`
  MessageNotUnderstood. Group A refactor (drop the leading `cls` first
  argument from `__new__: cls _: arg` signatures on Decimal, range,
  bytes, bytearray) and Group B (add `__new__` to list, tuple, dict,
  frozenset; set inherits from frozenset) shipped together. The
  discriminator walks the metaclass chain so inherited `__new__`
  selectors are detected. Tests in `ClassCallFastPathTestCase`.

- [x] ~~**Comprehensions have no codegen**~~ — Done.
  `ComprehensionAst class >> emitGenerators:from:on:innerBody:` emits
  one nested `[true] whileTrue:` block per generator (with target
  binding, tuple unpacking, `if`-chains, and a StopIteration handler),
  and `ListCompAst`/`DictCompAst`/`SetCompAst`/`GeneratorExpAst` each
  supply the deepest-body emitter (`OrderedCollection` add, dict
  `at:put:`, set add). `GeneratorExpAst` materializes eagerly into an
  `OrderedCollection`; revisit when Grail grows a real generator type.
  Test coverage: `ComprehensionTestCase` (14 tests).

- [x] ~~**Slice subscript assignment / del**~~ — `list.__setitem__`
  and `list.__delitem__` now handle slice indices (used by
  `re._parser` for `subpattern[i:i+1] = p` and `del literal[:]`).
  Contiguous (step=1) and extended-step paths both work; tests in
  `ListTestCase >> test__delitem__slice`.

- [ ] **`*args` / `**kwargs` only bound in `def` codegen** — the closure
  emit and varargs-selector emit paths now bind both, but `LambdaAst`
  doesn't, so `lambda *xs: xs` still emits a bare `xs` read. Mirror
  the FunctionDefAst code paths.

- [ ] **`super(Cls, self)` rejected at compile time** — the
  class-name reference inside the class body fails the codegen's
  name resolution. The no-arg `super()` form is accepted and produces
  the same runtime call. Fix: when emitting a `super(...)` call,
  resolve the first argument lazily (e.g., `___cls___` from the
  enclosing class-compile scope) instead of as a bare name.

- [ ] **`del` statement panics codegen** — Grail's parser accepts `del
  x[-2:]` but there is no `printSmalltalkOn:` on the relevant AST
  node, so codegen hits `AbstractNode is abstract …`. Implement for
  the three common targets: name (`del x`), subscript (`del xs[i]`),
  attribute (`del obj.x`).

- [x] ~~**Dynamic module-level names resolve at compile time**~~ —
  option (b) landed.  `NameAst`'s module-body load path emits an
  `at:ifAbsent:` runtime lookup on the module instance for any
  unresolved bare name (the *late module-name binding* path);
  inside class methods, the parallel hook on the class-method
  free-variable path does the same against `(ModuleClass
  ___instance___)`.  Catches the `re._constants._makecodes` idiom
  where opcodes like `IN` / `BRANCH` are referenced before
  `globals().update()` ever runs.  See `ClassMethodGlobalFallbackTestCase`.

- [x] ~~**Dotted submodule loader names inst vars with a `.`**~~ —
  `loadModuleFromPath:name:` now maps dotted module names to a
  flat Smalltalk class name (e.g. `re._constants` → `Re__constants`)
  via `___asSmalltalkClassName___:`, and the parent package binds
  the leaf in its dict slot under the short name through
  `importlib >> registerModule:with:`.  `import re._constants` /
  `from re import _constants` round-trips cleanly.

- [x] ~~**Relative imports**~~ — `from ._constants import *` (leading
  `.`) handled by `ImportFromAst >> resolvedModuleName` which walks
  the parent chain to find the enclosing ModuleAst and resolves
  against the importer's package.  ALSO: `from . import X` inside
  a package's `__init__.py` now resolves to `package.X` rather
  than the parent's `X` (ModuleAst >> isPackage check) — see
  `PkgRelativeInitTestCase`.

- [x] ~~**Star imports miss dynamic names**~~ — `from X import *`
  now emits a runtime merge step in addition to the parse-time
  per-name expansion.  `ImportFromAst` carries a `wasStarImport`
  flag (set by `importlib.expandStarImports:`) that triggers
  codegen of `self ___mergePublicAttrsFrom: X` after the static
  imports.  The merge walks BOTH X's own declared instVars
  (skipping the inherited SymbolDictionary structural slots) AND
  its dynamic dict entries, copying every public attribute into
  the importer via `importlib.___bind:onParent:as:` (which writes
  to both the importer's dict slot and same-named instVar slot).
  The `___import__` call uses `('*',)` as fromlist to pull the
  leaf submodule rather than the top-level package.  Covered by
  `StarImportDynamicNamesTestCase` (fixtures under
  `tests/python/pkg_star_dyn/`).

- [x] ~~**Submodule auto-binding on parent package**~~ —
  `importlib >> registerModule:with:` now binds child on parent
  in both orderings (child registered after parent → binds on
  the cached parent; child registered before parent → orphan
  scan when the parent later registers picks it up).  The bind
  helper `___bind:onParent:as:` writes to both the parent's
  SymbolDictionary slot AND the same-named instVar slot when one
  exists — the instVar write is what makes `from . import sub`
  inside a package's `__init__.py` actually see `sub` (the
  generated module's `sub ^ sub` accessor was returning the
  still-nil instVar otherwise).  See
  `SubmoduleAutoBindTestCase`.

- [x] ~~**Python `int` subclasses can't carry extra inst vars**~~ —
  Addressed for `_NamedIntConstant(int)` specifically via the
  `NamedIntConstant` wrapper class (option (a) — non-int wrapper
  with `value` + `name` instVars, DNU-forwarded numeric protocol).
  The CPython shim's `PyLong_As*` extractors unbox at the C boundary
  via `__index__` so `_sre.compile()` etc. see plain SmallIntegers.
  General int-subclass support (a real Python-int wrapper class
  applied to every int) is still missing — only opts-in via the
  explicit `NamedIntConstant` class.  See its class comment for the
  silent-failure caveats (arithmetic strips the name; reverse
  comparisons through non-Int classes don't agree).

- [x] ~~**`slice` not a built-in class**~~ — `SubscriptAst` now
  builds a real `slice` instance for every slice subscript and
  calls `__getitem__:` with it; `SequenceableCollection`, `range`,
  `bytes`, `CharacterCollection`, and `list` all dispatch on a
  slice index by delegating to `__getslice__:_:_:`.  User classes
  that override `__getitem__` (`re._parser.SubPattern`) get to
  branch on `isinstance(index, slice)` exactly as CPython does.

- [x] ~~**SubPattern.dump in re/_parser.py fails at module load**~~ —
  the dispatch / varargs / class-method-global / iter-protocol
  fixes that landed during the `re` push collectively let the
  entire `_parser.py` (including SubPattern.dump) compile clean.
  re._parser loads end-to-end; `_dump:kw:` is on SubPattern's
  env-1 method dict.  (dump itself isn't on the regex hot path,
  so we don't exercise it in tests — covered by the broader
  re-module suite.)

- [ ] **Module-level dunders (`__name__`, `__file__`, …) not bound at
  module scope** — `if __name__ == "__main__":` emits `__name__` as a
  bare Smalltalk identifier and fails with
  `CompileError 1001, undefined symbol __name__`. The attribute exists
  (`module >> __name__` is set during import); `NameAst` codegen needs
  to resolve module-scope dunder reads to
  `((thisModule instance) @env1:__name__)` (or special-case the small
  dunder set). Same area as the `(builtins instance)` rewrite that
  already lives in `NameAst`.

- [ ] **Module-level unbound names compile-error instead of NameError**
  — `print(undefined_var)` at module scope produces a GemStone
  `undefined symbol` *compile* error rather than a runtime Python
  `NameError`. There is no function scope to attach the load-site
  check to; the fix needs to intercept the unresolved name during
  `importlib loadModuleFromPath:` compilation (e.g. install a
  symbol-list fallback that raises `NameError` at runtime, similar
  to the `(builtins instance)` rewrite for bare builtin references).

## Class System (Phase 5c) Limitations

Real Python class semantics that the current Smalltalk-class translation
doesn't preserve.

- [ ] **No single inheritance** — `class Foo(Bar):` ignores `bases`.
  Generated Smalltalk classes are always `Object` subclasses. Supporting
  single inheritance would require making `pyc_Foo` a subclass of
  `pyc_Bar` and propagating instVars/methods from the parent.

- [ ] **No `@classmethod` / `@staticmethod`** — only instance methods
  (`InstanceFunctionDefAst`) are compiled as real methods. The
  decorators are recognized by the parser but ignored by Phase 5c
  codegen.

- [ ] **No dynamic attribute access** — `setattr()`, `getattr()`, and
  `delattr()` don't work on Phase 5c class instances. Attributes are
  instVars, so dynamic access would need reflection (`instVarAt:put:`
  via name lookup).

- [ ] **instVar registration is shallow** —
  `ClassDefAst >> instanceVarNamesFromInit` only scans top-level
  `self.X = …` statements in `__init__`. Conditional or nested
  assignments (`if c: self.X = 1`) do not register `X` as an instVar,
  so a later `self.X` read produces `undefined symbol` at compile
  time. Either (a) walk the entire `__init__` body recursively when
  collecting instVars, or (b) collect instVars from *all* methods
  in the class body (any `self.X = …` site declares the instVar).
  The runtime AttributeError check on instVar reads then handles the
  conditional-write case cleanly.

## Unbound-Name Detection — Remaining Gaps

The DNU backstop, load-site definite-assignment check, and instVar
AttributeError check are in. Edge cases left:

- [x] ~~**blinker import: instance-var detection too shallow**~~ —
  `self.X = …` writes now propagate up via a new
  `declareInstanceVar:` chain (AbstractNode forwards, ClassDefAst
  is the sink).  `AttributeAst >> declareVariable` detects
  `self.X` / `cls.X` patterns and fires the chain;
  `ClassDefAst >> walkForInstanceVars:` recursively walks the
  class body — including IfAst / WhileAst / ForAst / TryAst /
  WithAst branches and every method body — so conditional,
  AnnAssign, AugAssign, and outside-__init__ writes all
  register.  Covered by `FlaskScaffoldingTestCase >>
  testInstanceVarsFrom*` (5 tests).  Blinker import still has
  other blockers ahead (eager annotation evaluation of complex
  typing generics like `type[set[t.Any]]`).

- [ ] **AugAssign target reads slip past the load-site check** —
  `x += 1` reads `x` on the RHS through the same `NameAst` that is
  the store target, so `ctx` is `StoreAst` and the wrapper is not
  emitted. The DNU backstop still catches it, but with the
  less-specific *"received `__add__:` on nil"* instead of *"cannot
  access local variable 'x'"*. Fix options: special-case the RHS in
  `AugAssignAst >> printSmalltalkOn:`, or add a
  `printSmalltalkLoadOn:` on `NameAst` that ignores ctx and is
  emitted from any context that needs a forced load.

- [ ] **Lambda parameters are not declared** — `LambdaAst` does not
  call `declareVariable:` on its parameters, so
  `isVariableIsDeclared:` returns false for them and the load-site
  check is not emitted. Lambda parameters are always bound by the
  caller, so there is no false negative in practice — but a free
  variable read inside a lambda that resolves to an unbound
  enclosing-scope local would slip past the check (the DNU backstop
  still catches it). Fix: add `declareVariable:` calls during lambda
  parameter parsing, mirroring `FunctionDefAst`.

## Bridge / Boundary nil Leaks

These are the categories of Smalltalk nil that can still reach Python
code despite the env-1 audit. Most are documented deviations rather
than fixable bugs.

- [ ] **Smalltalk-bridge return values** — Python code that calls a
  pure-Smalltalk method (via the `gemstone` module or attribute access
  on a Smalltalk object) can receive nil if the underlying method
  returns nil. No general fix. The DNU backstop catches the resulting
  nil before it propagates further.

- [ ] **Collections containing nil** — a `dict`/`list` populated from
  the Smalltalk side with nil-valued entries leaks nil on subscript
  access. Not seen in current code paths, but a possibility once
  user-written Smalltalk extensions appear.

- [ ] **Kwargs `ifAbsent: [nil]` sentinels in varargs handlers** —
  `random.gs`, `statistics.gs`, `os.gs`, `builtins.gs`. The local nil
  is then compared with `a == nil or: [a == None]` to detect "argument
  not given". Intentional (distinguishes absent from explicit `None`)
  and stays as nil; documented here so a future blanket nil-sweep
  doesn't break the varargs unpacking logic.

## Architectural Cleanup (Non-blocking)

- [ ] **`module` still inherits from `SymbolDictionary`** — deferred
  since the dispatch rewrite. User modules and user classes use proper
  Smalltalk classes; only the 23 built-in modules still require
  `SymbolDictionary` inheritance (legacy `___at___:` storage of
  constants like `sys.modules`). Restructuring to an `Object` subclass
  would require migrating those stored attributes to instVars or
  explicit methods.

## `import re` — Regular Expression Support

The `_sre` C extension module (CPython's regex engine) is forked,
compiled, and linked into `libcpython_ua.dylib`. End-to-end:

- [x] ~~Multi-phase init (`Py_mod_exec`), heap types
  (Pattern/Match/Scanner), `PyType_FromModuleAndSpec()`~~ — done.
- [x] ~~`shimCallTyped` (typed-object dispatch by C pointer)~~ — done.
- [x] ~~`_sre.compile()` round-trip~~ — done. `SrePattern`/`SreMatch`
  wrappers hold the raw C pointer in an inst var; `match`/`search`/
  `findall`/`group`/`span`/etc. all work. Test coverage:
  `SreTestCase` (13 tests).

### Pure Python `re` port — current state

Bundled CPython 3.14 sources live under
`src/python/stdlib/re/` and are loaded via `importlib`'s extended
search path (see [`Support_Flask.md`](docs/Support_Flask.md)).

| File                | Status                                                              |
|---------------------|---------------------------------------------------------------------|
| `_constants.py`     | Loads (one tiny Strategy A — see deviations below).                |
| `_casefix.py`       | Loads unmodified (Strategy B).                                      |
| `_parser.py`        | Doesn't load: needs `from ._constants import *` (relative + star) and dotted-submodule loader fix. |
| `_compiler.py`      | Untried: blocked on `_parser`.                                       |
| `__init__.py`       | Untried: blocked on `_parser` + `_compiler`.                         |

Other pure-Python deps `re` pulls in: `enum`, `functools` (have shims),
`copyreg` (have shim). None blocking.

### Stdlib port deviations (Strategy A)

Policy: prefer Strategy B (load CPython source unmodified, fix Grail
when it breaks). Use Strategy A only when the underlying Grail change
is genuinely architectural. Every Strategy A deviation gets a `# GRAIL:`
block in the file and an entry here so the fork can shrink as Grail
catches up.

| File | Deviation | Why | Reverts when |
|------|-----------|-----|--------------|
| `src/python/stdlib/re/_constants.py` | Rebound `_NamedIntConstant = NamedIntConstant` instead of subclassing int. | `SmallInteger` has no inst-var slot for `.name`; `NamedIntConstant` is Grail's wrapper that crosses the C boundary via `__index__`. | Grail boxes every Python `int` as a real heap class with extra-slot subclass support (project-wide effort). |
| `src/python/stdlib/re/_constants.py` | `OPCODES = OPCODES[:-2]` instead of `del OPCODES[-2:]`. | Grail doesn't yet handle `del` on subscript targets with a slice index. | Grail implements `del` for subscript targets (see *Bugs Blocking…* above). |
| `src/python/stdlib/re/__init__.py` | Restored to upstream form (428 lines) with two small GRAIL deviations: `_ZeroSentinel(int)` rewritten as a plain marker class (Grail can't subclass int) with sentinel-to-zero coercion at the three call sites that need it, and three `func.__text_signature__ = '…'` lines commented out (`BoundMethod` has no attribute slot — pure introspection, no functional impact). The `__init__.cpython.py` archive is still present for reference. `ReModuleTestCase` locks in module loading + literal patterns with capture groups. Regex character classes / quantifiers / `findall`/`sub`/`split` are still ahead — they trip a separate set of `bytes`/`bytearray` protocol gaps. |
| `src/python/stdlib/re/_compiler.py` | `dis(code)` function body replaced with `raise NotImplementedError(...)`. | The original is a 150-line debug disassembler with two nested `def`s (`dis_`, `print_`), heavy free-variable closure references, `*args, to=None` (keyword-only after `*args`), and several `@` operators.  One or more of these trips an AbstractNode codegen branch.  `dis()` is never called by the regex compile path; it's an interactive printer for compiled bytecode. | Grail's codegen handles nested-def closures + `*args, kw_only=N` parameters end-to-end.  The function body is small once those land; restore from `__init__.cpython.py`-style archive (need to add one for `_compiler.py`). |

## `html.parser` Module

`html.parser` is pure Python (no C extension needed) but depends heavily
on `re`. The dependency chain:

1. **Finish `_sre` C module** — expose the regex engine beyond the
   current utility functions (`getcodesize`, casing helpers). Need:
   `compile`, `match`, `search`, `SRE_Pattern`, `SRE_Match` types.

2. **Implement `re` module** — the Python-level wrapper providing
   `re.compile()`, `Pattern` and `Match` objects, flags (`VERBOSE`,
   `IGNORECASE`, etc.), and key methods (`match`, `search`, `sub`,
   `findall`, `split`).

3. **Import `html.parser`** — once `re` works, CPython's
   `html/parser.py` can be imported largely as-is. It uses ~12 compiled
   regex patterns with alternation, character classes, quantifiers,
   lookaheads, named groups, `re.VERBOSE`, and `re.IGNORECASE`.

### Current State

| Component | Status |
|-----------|--------|
| `html.escape` / `html.unescape` | Done (manual parsing, no `re` needed) |
| `html.entities` (HTML4 + HTML5) | Done (252 + 2,125 entries) |
| `_sre` C module (utility funcs) | Partial — casing helpers only |
| `_sre` regex engine | Not yet exposed |
| `re` module | Not yet implemented |
| `html.parser` / `HTMLParser` | Blocked on `re` |
