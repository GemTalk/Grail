# Known Issues

## Extensions using internal macros

CPython extensions fall into two categories with respect to our shim:

**Public API only** (`PyList_GetItem`, `PyList_Append`, etc.) — These call functions by name. A pre-compiled `.so`/`.dylib` built against the real `Python.h` will link against our implementations without recompilation.

**Internal macros** (`PyList_GET_ITEM`, `PyList_SET_ITEM`, `_PyList_ITEMS`, etc.) — In the real `Python.h`, these expand to direct memory access into `PyListObject->ob_item[i]`. The compiled extension has that pointer arithmetic baked in. Since our lists are backed by GemStone `OrderedCollection` (not a contiguous C array), these extensions cannot work without recompilation against our `cpython.h`, which routes the macros through function calls.

The same applies to `PyTuple_GET_ITEM`/`PyTuple_SET_ITEM` and any other macro that accesses internal struct fields.

Our adapted `_heapqmodule.c` is an example: the original CPython source uses `_PyList_ITEMS()` for raw array access in the sift operations. We replaced those with `PyList_GET_ITEM`/`PyList_SET_ITEM` calls, which route through GCI to GemStone.

## Importing any submodule of the `grail` package poisons the session

`import grail.gemstone`, `import grail.repl` — any `grail.<submodule>` — leaves
this session unable to import anything else. The very next unrelated import
fails inside `importlib >> loadModuleFromPath:name:` with

```
a ImproperOperation occurred (error 2085), Expected nil to be a Boolean.
```

and a long chain of `AbstractException >> outer` frames, because the module
body's failure is re-signalled through the unload handler.

**It is the package NAME, not the files.** Measured on a clean checkout
(2026-08-23, `ef0313c5`), each step in its own fresh session:

| what | result |
|---|---|
| `import grail` (the package alone) | fine |
| `import grail.gemstone`, then any other import | **poisoned** |
| the identical `gemstone.py` copied to `grailx/`, imported as `grailx.gemstone` | fine |
| a fresh `zzpkg/mod.py` in the same directory, as `zzpkg.mod` | fine |
| the same file imported as a TOP-LEVEL module | fine |
| with `src/python/grail/__pycache__` moved aside | still poisoned |

So it is not the file contents, not the directory, not stale bytecode, and not
packages in general — something in the resolver treats `grail` specially, which
is unsurprising given `grailDir` and the search order in
`importlib >> ___resolveModulePath___`.

**Why nobody has hit it.** `grail/gemstone.py` publishes itself as
`sys.modules['gemstone']`, so the documented spelling is `import gemstone`, and
that path does not go through the package.

**How it was found.** `grail_asgi.py` was originally written as
`src/python/grail/asgi.py`. Its fixture imported `grail.asgi`, and every test
that ran after it in the same SUnit shard failed — 80 of them, all with the
error above, in classes with nothing to do with ASGI. The workaround was to
move the module to `src/python/stdlib/`, which is also a standard search root,
so `import grail_asgi` needs no `sys.path` manipulation at all.

**Not diagnosed further than the table above.** Anything new under `grail/`
should expect this until it is fixed.
