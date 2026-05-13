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

- [ ] **Comprehensions have no codegen** — `ListCompAst`, `DictCompAst`,
  `SetCompAst`, `GeneratorExpAst`, and the helper `ComprehensionAst`
  parse successfully but define no `printSmalltalkOn:`, so any
  comprehension falls through to `AbstractNode`'s "abstract; subclasses
  must implement" error at compile time. Emit the
  nested-loop-with-accumulator form (list/dict/set init, then for/if
  scaffolding from `generators`, then an append / `at:put:` of `elt`).
  `GeneratorExpAst` additionally needs a generator/iterator protocol
  decision.

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
compiled, and linked into `libcpython_ua.dylib`. Module-level functions
work (`getcodesize`, `ascii_iscased`, `ascii_tolower`, `unicode_iscased`,
`unicode_tolower`).

What remains is `_sre.compile()`, which returns C-allocated
`PatternObject` and `MatchObject` structs. These use `PyVarObject`
(variable-length objects with `ob_size` at offset 16), which conflicts
with the shim's hidden-OOP convention at offset 16. Moving the OOP to
offset 24 won't work because `PatternObject`'s `groups` field occupies
that offset and is accessed by compiled C code via struct layout.

These objects don't need a hidden OOP — they live entirely in C memory.
Smalltalk holds the raw C pointer address as a SmallInteger and passes
it back for method dispatch.

### Shim extensions needed

1. **`shimCallTyped`** — extend `shimCall` (or add a new entry point) to:
   - Accept a C pointer (SmallInteger) as `self` instead of a
     PyObject-with-hidden-OOP
   - Look up methods on heap types (Pattern_Type, Match_Type, Scanner_Type)
     created during `_sre`'s multi-phase init (`Py_mod_exec`)
   - Return raw C pointer addresses for results that are C-allocated
     structs (controlled by a flag bit, e.g., bit 3 of the flags
     argument)

2. **Multi-phase init** — `get_or_load_module()` needs to handle
   `Py_mod_exec` slots: after calling `PyInit__sre()` (which returns a
   `PyModuleDef*`), allocate module state (`malloc(m_size)`), then call
   the exec function which creates the heap types and adds constants.

3. **Heap type support** — implement `PyType_FromModuleAndSpec()` which
   `_sre`'s exec function calls to create Pattern_Type, Match_Type, and
   Scanner_Type.

### Pure Python dependencies for `import re`

The `re` package (5 files: `__init__.py`, `_compiler.py`, `_parser.py`,
`_constants.py`, `_casefix.py`) is pure Python from CPython's stdlib.
It also requires:

- `enum` — enumeration types (used for `re.RegexFlag`)
- `functools` — `functools.lru_cache` (used in `_compiler.py`)
- `copyreg` — pickle/copy support for compiled patterns

These can be stubbed or implemented incrementally.

### Dependency chain

```
import html
  └─ import re
       ├─ _sre.compile()     ← C-pointer protocol (this TODO)
       ├─ re/_compiler.py    ← pure Python from CPython stdlib
       ├─ re/_parser.py      ← pure Python from CPython stdlib
       ├─ re/_constants.py   ← pure Python from CPython stdlib
       ├─ re/_casefix.py     ← pure Python from CPython stdlib
       ├─ enum               ← stdlib module (stub or implement)
       ├─ functools          ← stdlib module (stub or implement)
       └─ copyreg            ← stdlib module (stub or implement)
```

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
