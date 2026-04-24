# TODO

## Dispatch Rewrite — Open Limitations

The core dispatch rewrite (Phases 1-5) is complete. These are known
limitations that are not blockers but would improve completeness:

- [ ] **`module` still inherits from `SymbolDictionary`** — deferred since
  Phase 1. User modules (Phase 5a) and user classes (Phase 5c) use proper
  Smalltalk classes. Only the 23 built-in modules still require
  SymbolDictionary inheritance (for legacy `___at___:` storage of constants
  like `sys.modules`). Restructuring to `Object` subclass would require
  migrating those stored attributes to instVars or explicit methods.

- [ ] **No inheritance for Phase 5c classes** — `class Foo(Bar):` ignores
  `bases`. Generated Smalltalk classes are always `Object` subclasses.
  Supporting single inheritance would require making `pyc_Foo` a subclass
  of `pyc_Bar` and propagating instVars/methods from the parent.

- [ ] **No `@classmethod` / `@staticmethod`** — only instance methods
  (`InstanceFunctionDefAst`) are compiled as real methods. `@classmethod`
  and `@staticmethod` decorators are recognized by the parser but not
  handled by Phase 5c codegen.

- [ ] **No dynamic attribute access on generated classes** — `setattr()`,
  `getattr()`, and `delattr()` don't work on Phase 5c class instances.
  Attributes are instVars, so dynamic access would need reflection
  (`instVarAt:put:` via name lookup).

- [ ] **Nested `def` stays as a block** — by design. A `def` inside another
  `def` compiles to a Smalltalk block (closure), not a method. This is
  correct for Python closures that capture the enclosing scope.

- [ ] **Comprehensions have no codegen** — `ListCompAst`, `DictCompAst`,
  `SetCompAst`, `GeneratorExpAst`, and the helper `ComprehensionAst` parse
  successfully but define no `printSmalltalkOn:`, so any comprehension
  falls through to `AbstractNode`'s "abstract; subclasses must implement"
  error at compile time. Need to emit the nested-loop-with-accumulator
  form (list/dict/set init, then for/if scaffolding from `generators`,
  then an append/at:put: of `elt`). `GeneratorExpAst` additionally needs
  a generator/iterator protocol decision.

- [ ] **Module dunders (`__name__`, `__file__`, etc.) not bound at module
  scope** — bare references like `if __name__ == "__main__":` emit
  `__name__` as a Smalltalk identifier and fail with
  `CompileError 1001, undefined symbol __name__`. The attribute exists
  (`module>>__name__` is set during import), so `NameAst`'s codegen needs
  to resolve module-scope dunder reads to `((thisModule instance) @env1:__name__)`
  (or special-case the small dunder set). Note from memory: NameAst
  currently hardcodes `(builtins instance)` — this is the same area.

- [ ] **`_sre.compile()` C integration incomplete** — `SrePattern`/`SreMatch`
  methods are converted to real arity-specialized methods, but the
  underlying `shimCall` path for `_sre.compile()` isn't wired up. See the
  section below for details.

## `import re` — Regular Expression Support

The `_sre` C extension module (CPython's regex engine) is forked, compiled,
and linked into `libcpython_ua.dylib`. Module-level functions work
(`getcodesize`, `ascii_iscased`, `ascii_tolower`, `unicode_iscased`,
`unicode_tolower`).

What remains is `_sre.compile()`, which returns C-allocated PatternObject
and MatchObject structs. These use `PyVarObject` (variable-length objects
with `ob_size` at offset 16), which conflicts with the shim's hidden-OOP
convention at offset 16. Moving the OOP to offset 24 won't work because
PatternObject's `groups` field occupies that offset and is accessed by
compiled C code via struct layout.

These objects don't need a hidden OOP — they live entirely in C memory.
Smalltalk holds the raw C pointer address as a SmallInteger and passes it
back for method dispatch.

### Shim extensions needed

1. **`shimCallTyped`** — extend `shimCall` (or add a new entry point) to:
   - Accept a C pointer (SmallInteger) as `self` instead of a
     PyObject-with-hidden-OOP
   - Look up methods on heap types (Pattern_Type, Match_Type, Scanner_Type)
     created during `_sre`'s multi-phase init (`Py_mod_exec`)
   - Return raw C pointer addresses for results that are C-allocated structs
     (controlled by a flag bit, e.g., bit 3 of the flags argument)

2. **Multi-phase init** — `get_or_load_module()` needs to handle
   `Py_mod_exec` slots: after calling `PyInit__sre()` (which returns a
   `PyModuleDef*`), allocate module state (`malloc(m_size)`), then call the
   exec function which creates the heap types and adds constants.

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
