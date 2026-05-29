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

## Hypothesis

The codegen extension changes how a module-level `def` body's
captured locals (specifically `pattern = re.compile(...)` inside
`_make_unquote_part`) are routed back through the module's
dynamic-instVar storage and re-read by the inner closure.  Pre-fix,
nested defs at module scope went through the
`isModuleScopeNestedDefTarget` path with no decorator emit on top;
post-fix the parent function's body is also re-emitted (via
`printPassXDecoratorsOn:` on the now-unfiltered `decorator_list`),
and the inner closure ends up reading a stale `pattern` reference
whose backing C `PatternObject` was freed or never finished
compiling.  Confirming that requires either:

* Adding a Smalltalk-level assertion to `SrePattern >> split:` that
  checks `cPtr asOop ~= 0` and the C-side pattern's codesize, or
* Single-stepping the module-init for `werkzeug.urls` with the
  codegen change toggled.

## Files

* `repro.gs` — the deterministic Topaz script.
* This README — the analysis trail above.

Output lands in `/tmp/hostcoredump_repro.out`.
