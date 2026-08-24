# Known Issues

## Extensions using internal macros

CPython extensions fall into two categories with respect to our shim:

**Public API only** (`PyList_GetItem`, `PyList_Append`, etc.) — These call functions by name. A pre-compiled `.so`/`.dylib` built against the real `Python.h` will link against our implementations without recompilation.

**Internal macros** (`PyList_GET_ITEM`, `PyList_SET_ITEM`, `_PyList_ITEMS`, etc.) — In the real `Python.h`, these expand to direct memory access into `PyListObject->ob_item[i]`. The compiled extension has that pointer arithmetic baked in. Since our lists are backed by GemStone `OrderedCollection` (not a contiguous C array), these extensions cannot work without recompilation against our `cpython.h`, which routes the macros through function calls.

The same applies to `PyTuple_GET_ITEM`/`PyTuple_SET_ITEM` and any other macro that accesses internal struct fields.

Our adapted `_heapqmodule.c` is an example: the original CPython source uses `_PyList_ITEMS()` for raw array access in the sift operations. We replaced those with `PyList_GET_ITEM`/`PyList_SET_ITEM` calls, which route through GCI to GemStone.

## FIXED: a failed `GsFile` probe answers nil, and nil is not a Boolean

Reported as "importing any submodule of the `grail` package poisons the
session": `import grail.gemstone`, `import grail.repl` — any
`grail.<submodule>` — failed with

```
a ImproperOperation occurred (error 2085), Expected nil to be a Boolean.
```

and every test that ran afterwards in the same SUnit shard failed the same
way, 80 of them, in classes with nothing to do with the import.

**The cause is one unguarded predicate.** For a dotted name,
`importlib >> ___moduleNameToSoPath___:` probes `<root>/<pkg>/<leaf>.so`.
Search root #1 is the repo, and `./grail` there is the Grail CLI **shell
script** — so `stat("<repo>/grail/gemstone.so")` fails with ENOTDIR, and
`GsFile>>existsOnServer:` answers **nil** (not false) for a probe that
errors. The inlined `ifTrue:` that nil reached raised error 2085. The `.py`
resolver had guarded exactly this with `== true` for longer, and its comment
even names `./grail`; the `.so` search, which runs after it, was missed.

That explains every row of the original report's table — it is the package
NAME only because the name collides with a plain FILE in a search root, so
`grailx`, `zzpkg` and a top-level import were all fine, and moving
`__pycache__` changed nothing.

**Two things the report got wrong**, both worth knowing for the next
diagnosis of this shape:

* **There is no session poisoning.** Measured after the crash, from a module
  body, from a Python `try/except`, and through the unload handler: every
  later import in the session succeeds, `sys.modules` is clean, and the
  initializing-module stack is empty. What looked like poison was one
  fixture, imported by 80 tests, hitting the same first-order crash each
  time — and because an `ImproperOperation` is a Smalltalk error, not a
  Python exception, `except BaseException` does not contain it, so it read as
  something spreading.
* **The submodule that crashes is the one that does not exist.** The `.so`
  probe runs only after the `.py` resolver comes up empty. `import
  grail.asgi` crashed because `src/python` is not a search root, so the
  module was never resolvable at all; the answer it deserved was
  `ModuleNotFoundError`.

**`open()` had the same defect on the same cause.** `open('grail/x.txt')`
raised error 2085 where CPython raises `NotADirectoryError`. Its failure
branch now asks `os >> ___statOrSignal___:isLstat:`, which maps the errno to
CPython's `OSError` subclass (ENOTDIR, ENOENT, EACCES) with CPython's message
text, instead of reporting every failure as "No such file".

Guards: `ImportlibTestCase >>
testSoSearchAnswersNilWhenAPlainFileShadowsAPackageDir` (asserts the live
`./grail` collision first, so it cannot pass by exercising nothing),
`testDottedImportUnderAFileShadowedRootReportsNotFound`, and `FileIoTestCase
>> testOpenBelowAPlainFileRaisesNotADirectory`.

`src/python/grail/` is fine to import from again, given a search root that
reaches it. Note that `grail/repl.py` still needs a `code` module Grail does
not have, and `grail/gemstone.py` publishes itself as `sys.modules['gemstone']`
— which is why `import gemstone` is the documented spelling.
