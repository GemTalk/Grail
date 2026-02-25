# TODO

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
