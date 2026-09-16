## `frameSensitive-eval-nested`: the walk was right, the frame was missing (2026-09-15)

`cm:CallAst:frameSensitive-eval-nested` (6), `cm:CallAst:frameSensitive-exec-nested`
(2) and the module-program `CallAst:frameSensitive-eval-nested` (1). The refusal
covered every `eval`/`exec` inside a nested def, a lambda or a comprehension,
for a RUNTIME reason no shape test can see: `eval(src, g, l)` whose `g` or `l`
holds `None` means *use the caller's namespaces*, and Grail finds that caller by
walking out to the innermost frame whose temp names carry a codegen marker
(`PyFrame>>___namesIncludeCodegenMarker___:`).

**The refusal's own note recorded the divergence going both ways** — too
permissive for a plain enclosing local, blind to a nested `*args` — and called
it "a frame-machinery cut rather than a codegen one". That framing is what made
it look expensive. It is not a frame-machinery cut: **the walk was already
right, and what the IR path owed it was a frame to stop at.**

The text declares `| ___curPos___ q |` inside a lambda's block and inside a
nested def's, and stores a position into it before every statement, so the walk
stops there. The IR path's two closure blocks carried no marker at all, so the
walk ran straight past them to the enclosing method and read its temps. So the
cut is one declaration and one store in each of two emits —
`FunctionDefAst>>___emitIRNestedBlockOn___:` and
`LambdaAst>>___emitIRLambdaBlockOn___:` — and the store is not optional: the IR
generator drops a temp nothing references.

### The lambda half was found by widening the probe, not by reasoning

With the nested-def marker in and `#nested` removed, eleven measured shapes
agreed with CPython and one did not: `lambda q: eval('q * 2', None)` raised
`NameError: name 'q' is not defined` where CPython and the text answer 42. A
lambda is emitted by a different method, so it had been missed — and the
refusal had been hiding it, because refusing the whole family means never
running the shape that would have shown it. Widening the probe past the cut's
own headline case is what caught it.

### The control is the fixture the refusal was written for

`tests/python/eval_caller_namespace.py` is what the original note cites: with
eval/exec narrowed but the marker still missing, loading it under a forced flag
raised `NameError: name 'args' is not defined` at 19 compiled. It now loads at
20 compiled, 0 fallbacks. `EvalInNestedScopeTestCase` asserts that directly, so
the cut cannot regress into a silent text fallback.

### One asymmetry is left, and it favours the IR path

The text wraps a nested def's body in `[[...] value. None] on: PythonReturn do:
[...]`, and the frame that walk lands on is the INNER block's, whose temps are
not the two-argument block's — so **the text cannot see a nested def's own
parameters at all.** Measured with `eval('sorted(locals().keys())', None)` inside
`def inner(p)`:

| path | names the eval sees |
| --- | --- |
| CPython | `p`, `b` |
| Grail text | `b` |
| Grail IR | `p`, `b` |

Reproducing that would mean emitting a bug on purpose, so it is not reproduced.
It is pinned as a measurement instead —
`EvalInNestedScopeTestCase>>testTheTextPathCannotSeeANestedDefsParameters` fails
when the text path is fixed, which is when the note retires.

Two further shapes stay wrong on BOTH paths and are the fixture's XFAILs: the
walk is blind to a comprehension's own target, and to a name `exec` binds into
the caller's namespace. Neither is this cut's; both are pinned rather than
hidden.

### Four of the nine did not close, they moved

A bare `eval(expr)` in a nested scope still refuses, correctly, under
`#bareRewrite` — the text rewrites it via step 0c and the IR path has no
spelling for that outside a top-level def and a method. Those sites used to
report as `-nested` only because the wider refusal reached them first:

| row | before | after |
| --- | ---: | ---: |
| `cm:CallAst:frameSensitive-eval-nested` | 6 | **0** |
| `cm:CallAst:frameSensitive-exec-nested` | 2 | **0** |
| `CallAst:frameSensitive-eval-nested` | 1 | **0** |
| `cm:CallAst:frameSensitive-eval-bareRewrite` | 0 | **2** |
| `cm:CallAst:frameSensitive-exec-bareRewrite` | 0 | **2** |

`BareEvalExecScopeTestCase>>testTheBareRewriteIsNowEligible` asserted that
fixture had NO `-bareRewrite` row, which was true only for the same reason; it
now asserts the three nested sites it really has, with `compiled` and
`cm:eligible` unchanged at 12 and 5 either way.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:CallAst:frameSensitive-eval-nested` | 6 | **0** |
| `cm:CallAst:frameSensitive-exec-nested` | 2 | **0** |
| `cm:eligible` | 13205 | **13209** |

Nine sites freed, four of them into the `-bareRewrite` row that names the gap
that actually stops them, so **+4 net**. Same-tree baseline measured on the
`main` this branch was cut from (`d6ba0d4f`), immediately after `install.sh`.
`CENSUS.md` still wants one combined re-measure once the family has landed.
