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

## UPDATE: repro no longer reproduces

After the three prereqs landed (`dd16202`: ExecBlockAttrs + BoundMethod
`__name__` / `__qualname__` / `__module__` + functools `_wraps:kw:`;
`7b4147e`: ExecBlock fallback `__name__` / `__qualname__` /
`__module__`), reviving the `FunctionDefAst` codegen change and
running `repro.gs` now completes cleanly:

```
'Cleared cached modules.'
'werkzeug.urls load: OK'
'uri_to_iri returned: ''http://example.com/påth'''
```

Three back-to-back invocations all returned without a SIGABRT.  The
suite stays at 2348 / 2348 + 103 / 103 with the codegen change
ACTIVE.

So whatever the original bug was at the SrePattern ↔ PatternObject
boundary, one or more of the prereqs closed it.  The most likely
candidate is the ExecBlock side-table: with `setattr` on a closure
no longer raising `ImproperOperation` mid-decoration, the chain
through jinja2 / werkzeug doesn't leave a half-initialized object
behind that would later mis-cast as a Pattern.

A different unrelated codegen failure is still active downstream —
`flask.Flask('myapp')` then `@app.route('/')` from a Python module
import still fails with `TypeError: 'LocalProxy class' object is not
callable`.  That's a separate bisection task; the **HostCoreDump
case documented in this directory is closed**.

The instrumentation that ruled out the empty-list hypothesis (below)
is preserved as a record of the investigation.

## Reproducing the cPtr-stable observation

Direct test of "is the cPtr that compile returned identical to the
cPtr split sees?": instrumented `_sre callCompile:flags:code:...` to
record `(cPtr, codesize, pattern)` into SessionTemps and
`SrePattern >> split:` to record `cPtr`, then re-ran
`uri_to_iri('http://example.com/p%C3%A5th')` end-to-end:

```
Compile trace count: 23
  #20 cPtr=4340069424 size=246
  #21 cPtr=4340070704 size=274
  #22 cPtr=4340026960 size=267
  #23 cPtr=4340028240 size=281
uri_to_iri returned: 'http://example.com/påth'
Split trace count: 3
  #1 cPtr=4340026960
  #2 cPtr=4340070704
  #3 cPtr=4340069424
```

Three of the four `_make_unquote_part` patterns get used (the
`fragment` one isn't reached by an http://example.com URL).  Every
split-time cPtr matches the cPtr that `_sre.compile` returned for
its pattern, with the PatternObject's `codesize` intact.  The
boundary is clean.

## Confirmed (during the earlier failing state): the `code` list is NOT empty at compile time

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

## Why an empty list wouldn't have been the right hypothesis anyway

Original framing called this a "Python refcount freed the Pattern"
shape, but Grail runs on GemStone's mark-sweep GC — there is no
Python refcount that ever frees C memory in this shim:

* `cpython.h` defines `Py_DECREF(op)` as the macro that decrements
  `ob_refcnt` and calls `_Py_Dealloc(op)` when it hits zero.
* `cpython.cc:200` defines `_Py_Dealloc` as `(void)op;` — a no-op.
  So `Py_DECREF` is bookkeeping only; nothing is freed.
* `_PyObject_NewVar` (`cpython.cc:927`) `calloc`'s the PatternObject;
  the matching `PyObject_GC_Del` would `free()` it but nothing ever
  reaches `pattern_dealloc` (which is wired to `Py_tp_dealloc`)
  because no one invokes `_Py_Dealloc`.

So PatternObject memory lives forever inside the shim — the cPtr
returned by `_sre.compile` will *always* point at the original
PatternObject with the right codesize.  The cPtr-trace test above
confirms it experimentally.

Where the original failure mode actually was — given that all three
prereqs are now needed for the codegen change not to crash, and
that adding any of them is enough to expose the rest — the most
likely shape was: the codegen change drove some closure to be
`setattr`'d during decoration, the `ImproperOperation` for "no
dynamic instVar on ExecBlock" surfaced as a Smalltalk exception
mid-call, that exception aborted the in-progress C-side allocation
path, and a subsequent split saw whatever happened to land at the
cPtr offset.  Now that the side-table catches the setattr cleanly,
the chain runs to completion.

## Files

* `repro.gs` — the deterministic Topaz script.
* This README — the analysis trail above.

Output lands in `/tmp/hostcoredump_repro.out`.
