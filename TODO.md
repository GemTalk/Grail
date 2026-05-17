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

- [ ] **Slice subscript assignment / del** — `SubscriptAst` reads
  (`xs[i:j]`) work via `SequenceableCollection >> __getslice__:_:_:`
  but stores (`xs[i:j] = ys`) and deletes (`del xs[i:j]`) are not
  wired. Most ports don't need either; flag them with a clean error
  if they do.

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

- [ ] **Dynamic module-level names resolve at compile time** —
  `LITERAL` in a dict literal works only if Grail has already seen
  `LITERAL = ...` higher in the same module. CPython's `globals().update()`
  pattern adds names at *module-init* time, after the whole module
  body is compiled, so any later reference compile-errors with
  `undefined symbol`. Two options: (a) two-pass scan that pre-declares
  module names mentioned by static analysis of `globals().update`
  call sites; (b) emit unresolved bare-name reads as
  `(self @env0:at: #name)` runtime lookups when the surrounding
  scope is a module body.

- [ ] **Dotted submodule loader names inst vars with a `.`** —
  `import re._constants` fails with
  `ArgumentError 2149, illegal identifier #'re._constants'`. Storing
  the module under a dot-free key (or renaming the submodule's slot
  to `re__constants` / a separate registry lookup) would fix the
  inst-var naming clash.

- [ ] **Relative imports** — `from ._constants import *` (leading
  `.`) is not handled.

- [ ] **Star imports** — `from X import *` not implemented. Needed
  for CPython stdlib ports that re-export module-internal names.

- [ ] **Python `int` subclasses can't carry extra inst vars** —
  CPython's `class _NamedIntConstant(int)` stores `.name` on the
  instance for debug repr. Grail represents Python `int` as
  Smalltalk's `SmallInteger`, which has no inst-var slot. Either
  (a) box int subclasses in a wrapper that holds the underlying int
  + extra slots, or (b) document the limitation and require ports
  to drop the wrapper.

- [ ] **`slice` not a built-in class** — CPython exposes `slice` as
  a real class so user code can do `isinstance(idx, slice)` (e.g.,
  `re/_parser.py:169` `SubPattern.__getitem__`).  Grail handles
  slice *expressions* (`xs[i:j]`) via `__getslice__:_:_:` codegen
  but has no `slice` class to compare against. Add `slice` as a
  built-in that:
    * `slice(stop)` / `slice(start, stop[, step])` builds a value
      object with `.start`, `.stop`, `.step` attributes.
    * `__getslice__:_:_:` callers / `SliceAst` codegen can also
      build one and pass it to `__getitem__` when the user defines
      `__getitem__` rather than `__getslice__`.

- [ ] **SubPattern.dump in re/_parser.py fails at module load**
  (after stubbing dump it gets past, so the dump body has the
  trigger).  The body is dense — `for op, av in self.data`, lots of
  `print(... end='')`, tuple-unpack in nested for, `isinstance(av,
  seqtypes)`, `is`-comparisons against IN / BRANCH /
  GROUPREF_EXISTS.  Error surface is "SmallInteger does not
  understand #do:" so something in codegen is iterating over a
  literal integer it expected to be a collection.  Open question
  which construct triggers; further bisection welcome.

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
| `_constants.py`     | Loads (Strategy A — see deviations below).                          |
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
| `src/python/stdlib/re/_constants.py` | Dropped `_NamedIntConstant(int)`. | `SmallInteger` has no inst-var slot for `.name`. | Grail supports int subclasses with extra inst vars (see *Bugs Blocking…* above). |
| `src/python/stdlib/re/_constants.py` | Expanded `_makecodes(*names)` + `globals().update(...)` into explicit `NAME = N` constants and literal `OPCODES`/`ATCODES`/`CHCODES` lists. | Grail resolves module-name forward references at compile time; later dict literals can't see names added at module-init time. | Grail does dynamic module-name resolution (`(self @env0:at: #name)` fallback in `NameAst`). |
| `src/python/stdlib/re/__init__.py` | Replaced with a 1-statement Grail stub.  CPython original archived alongside as `__init__.cpython.py`. | Class-method free-name resolution now works (commit `7235810` / merge `da86ed8`), and `count, *args = args` star-unpack codegen landed (this branch).  Remaining blockers when the upstream file is dropped in: (1) `@enum.global_enum` on `class RegexFlag` is supposed to inject the enum members (`DEBUG`, `ASCII`, `IGNORECASE`, …) into the module's globals — Grail doesn't run the decorator, so the later `if flags & DEBUG:` site compile-errors with `undefined symbol DEBUG`.  (2) `next()` and `iter()` aren't implemented as builtins, so `next(iter(_cache))` compile-errors with `undefined symbol`. | Grail implements `@enum.global_enum` (or a `globals().update(...)` shim that runs at module-init time) **and** ships `next` / `iter` as fast-path builtins.  Until then, either keep the stub or land a Strategy A patch that hand-injects the RegexFlag members as module constants and stubs `_compile`'s `next(iter(...))` line. |
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
