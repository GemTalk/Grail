# HostCoreDump from FunctionDefAst module-level decorator codegen

## Crash signature

```
Assertion failed: (self->codesize != 0), function _sre_SRE_Pattern_split_impl,
file sre.c, line 1094.
GemStone signal handler: signal 6 (SIGABRT)
```

(The signal also surfaces as `SIGSEGV` (11) when the corrupt pattern's
zero codesize causes a downstream pointer deref before the assert
fires.)

## What's broken

`FunctionDefAst >> printSmalltalkOn:` was extended to apply *all*
module-level decorator_list entries (not just the jinja2 pass-X
whitelist).  With that codegen change active, executing
`uri_to_iri('http://...')` from a freshly-loaded `werkzeug.urls` trips
the C-side assertion in the `_sre` extension's `split` implementation.

The cascade is short:

1.  `werkzeug.urls` module init calls `_make_unquote_part(...)` twice
    (once for path, once for query).  Each call:
    *  Locally computes a regex string.
    *  Binds `pattern = re.compile(<that string>, re.I)`.
    *  Defines a closure `_unquote_partial(value)` that calls
       `pattern.split(value)`.
    *  Returns the closure.
2.  The returned closures are bound to module names `unquote_path` and
    `unquote_qs`.
3.  `uri_to_iri('http://...')` reaches `_unquote_partial`'s
    `pattern.split(value)`.
4.  The C `_sre_SRE_Pattern_split_impl` reads `self->codesize` and
    finds 0.  The assertion fires and the gem dies via SIGABRT.

Reverting the codegen change to the pre-fix pass-X-only path restores
the suite to 2348 / 2348.

## Reproduce

From the project root, with `.setenv` already configured:

```sh
source .setenv
LC_ALL=C topaz -lq -S repros/decorator-codegen-hostcoredump/repro.gs
```

The script logs in, clears any cached flask/werkzeug/jinja2 modules
from `sys.modules`, loads `werkzeug.urls`, and calls `uri_to_iri`.

* **Pre-fix (codegen change active):** `topaz` exits non-zero, the gem
  prints "Possible Internal Error: HostCoreDump invoked", and
  `/tmp/hostcoredump_repro.out` ends with the C-stack dump above.

* **Post-fix:** the script prints either an `uri_to_iri returned:
  ...` line or a clean Python exception caught at the Smalltalk
  layer, and exits 0.

## Stack at the moment of the crash

Smalltalk frames (from the gemnetobject log, oldest first ↓):

```
16  (Executed Code)                           — topaz `run` block
15  ExecBlock >> on:do:                       — the on:do: wrapper
14  (block, homeMethod: …)                    — driver block
13  BoundMethod >> value:value:               — call into uri_to_iri
12  Object >> perform:env:withArguments:
11  Werkzeug_urls >> uri_to_iri: (envId 1)
10  (block, homeMethod: _unquote_partial …)   — closure body
 9  ExecBlock >> on:do:
 8  (block, homeMethod: _unquote_partial …)
 7  (block, homeMethod: _unquote_partial …)
 6  BoundMethod >> value:value:               — into pattern.split:
 5  Object >> perform:env:withArguments:
 4  SrePattern >> split: (envId 1)            — Smalltalk wrapper
 3  CPythonShim >> callTyped:type:method:selfPtr:with:
 2  System class >> userAction:withArgs:
 1  GsNMethod class >> _gsReturnToC
```

`split:` reaches C with a `SrePattern` whose first-instVar
`cPtr` points at a `PatternObject` whose `codesize` field is 0 — see
`src/c/shim/_sre/sre.c:1094` for the assertion that fires.

## Confirmed: the `code` list is NOT empty at compile time

Followed up the obvious "maybe `_sre_compile_impl` is being handed an
empty list" hypothesis by instrumenting `_sre callCompile:flags:code:...`
to log every compile's `code size` into `SessionTemps current at:
#'___SreCompileTrace___'`.  Re-ran the repro with the codegen change
active and dumped the trace before invoking `uri_to_iri`:

```
Compile trace count: 23
#20 code-size=246 isColl=true pattern='((?:%(?:127|31|30|29|28|27|...
#21 code-size=274 isColl=true pattern='((?:%(?:127|31|30|29|28|27|...
#22 code-size=267 isColl=true pattern='((?:%(?:127|31|30|29|28|27|...
#23 code-size=281 isColl=true pattern='((?:%(?:127|31|30|29|28|27|...
```

All 23 compile calls reach `_sre.compile` with a non-empty
OrderedCollection.  The four `_make_unquote_part` patterns at the
end carry between 246 and 281 codewords — well above zero.  At
compile time `self->codesize` is set correctly from
`PyList_GET_SIZE(code)`.

So `codesize == 0` *at split time* isn't a "we were handed an empty
list" bug.  Something between the moment the Pattern is created
(line 1637–1649 in `_sre/sre.c`) and the moment Werkzeug's closure
re-reads it during `pattern.split(value)` either:

1. **Frees the PatternObject** (Python refcount drops to zero, the
   shim's `free(op)` runs, the memory is later reallocated for a
   different object whose first eight bytes after the
   `PyObject_VAR_HEAD` happen to land on `codesize`), or
2. **Re-uses the cPtr slot for a different live object** (the
   captured `pattern` reference in the closure ends up pointing to
   a freshly-allocated Pattern that hasn't had its codebuffer
   filled in yet).

Both shapes are stale-pointer / lifetime-mismatch bugs at the
Smalltalk-side `SrePattern` ↔ C-side `PatternObject` boundary.
With the codegen change there's much more decorator-driven
allocation traffic during module init, which gives Python's
refcount machinery more chances to drop a Pattern Smalltalk still
thinks it's holding.

## Next-step probes

* Add a Smalltalk-callable user action `peekCodesize: cPtr` in the
  shim (reads the `Py_ssize_t` at `cPtr + 80`) — call it both right
  after `_sre.compile` returns and right before `SrePattern >>
  split:` invokes the C side.  Equal non-zero values → stale-free
  during split.  Different values → the cPtr slot was reused.
* Instrument the shim's `_PyObject_NewVar` / `PyObject_GC_Del` to
  log every PatternObject alloc/free with its address.  Cross-
  reference with the saved cPtr from compile time.
* On the Smalltalk side, pin every returned `SrePattern` in a
  per-session collection so the Smalltalk wrapper at least lives
  the whole session — see whether the crash goes away.  If it does,
  the gap is "Python refcount isn't tracking Smalltalk-held
  references on the cPtr".

## Files

* `repro.gs` — the deterministic Topaz script.
* This README — the analysis trail above.

Output lands in `/tmp/hostcoredump_repro.out`.
