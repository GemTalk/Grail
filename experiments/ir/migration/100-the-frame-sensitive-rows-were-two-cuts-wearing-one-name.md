## The frame-sensitive rows were two cuts wearing one name (2026-09-13)

`CallAst:frameSensitive-exec` (77) and `-eval` (52) were the top two rows on
the board, 129 methods between them and the largest coherent family left. They
were also one line of code:

```smalltalk
(#(#'eval' #'exec') includes: function id) ifTrue: [^ nil].
```

The name refused at **every arity in every scope**, and the forty-line comment
above it justified that with a real divergence — one that needs a nested def to
happen.

### What the comment was right about

`eval(e, g, l)` whose `g` and `l` hold None means, in CPython, *use the
caller's namespaces*. Grail honours it at run time by walking to the innermost
frame carrying a codegen marker temp. A nested def compiles to a BLOCK of the
enclosing method, so that walk lands on a frame whose temps are not the ones
the expression names — measured to diverge in BOTH directions (too permissive
for a plain enclosing local, blind to the enclosing `*args`, which is
test_decorators' `dbcheck`). That is a frame-machinery cut and it is still
open.

### What it was wrong about

Nothing in it is a reason to refuse the shapes that were **measured to agree**.
#906 taught `___namesIncludeCodegenMarker___:` both marker spellings, and after
it a plain parameter, a plain local, a module global, a top-level `*args` def
and a method were each measured to agree with text and CPython. The refusal
never asked which shape it had.

Two context-free conditions now, both read off the parent chain:

* **`-bareRewrite`** — the one-positional `eval(expr)` / `exec(src)` in
  function scope or inside a comprehension. The text does not dispatch that to
  the builtin at all: step 0c rewrites it into `printBareEvalExecOn:`,
  injecting the enclosing locals as the evaluation namespace. IR has no
  spelling for that rewrite, and emitting the ordinary builtin call instead
  would run the expression in an empty scope — a wrong answer, not a missing
  feature.
* **`-nested`** — the call sits inside a nested def, lambda or comprehension
  within the compiled function. The frame divergence above.

Everything else compiles as the ordinary builtin dispatch the text already
emits for it.

### THE PARENT CHAIN, NOT THE COMPILE CONTEXT

The text's own step-0c guard tests `CallAst functionBeingCompiled notNil`.
Copying that here would have reproduced the trap that has now cost three cuts
a session each: the eligibility probe runs in a DIFFERENT FRAME from the emit,
so a compile-context accessor answers about someone else's def while a probe is
walking this one. `___irEvalScopeKinds___` walks `parent` instead and says the
same thing in both frames.

### The board

Measured on the suite manifest, per-module deduped, install-then-census with no
test run in between:

| row | before | after |
| --- | ---: | ---: |
| `cm:CallAst:frameSensitive-exec` | 77 | **0** |
| `cm:CallAst:frameSensitive-eval` | 52 | **0** |
| `cm:CallAst:frameSensitive-eval-bareRewrite` | — | 37 |
| `cm:CallAst:frameSensitive-exec-bareRewrite` | — | 14 |
| `cm:CallAst:frameSensitive-eval-nested` | — | 4 |
| `cm:CallAst:frameSensitive-exec-nested` | — | 0 |
| `cm:eligible` | 10570 | **10642** |

74 methods admitted, 72 of them all the way to eligible — the other two refuse
further on `ForAst:tupleTargetShape` and `classDef:outerBinding`, which is the
census naming the FIRST refusal and nothing more.

**The split is the more valuable half.** The dominant remaining reason is the
bare rewrite, 51 of the 55 left, and it is a CODEGEN cut, not the frame-machinery
one the row was named for. `exec` has no `-nested` rows at all. So the family
that read as "129 methods waiting on a frame-marker unification" is really 51
methods waiting on an emit the IR path is already most of the way to spelling
(`___emitIRLocalsSnapshotOn___:` from cut 84 is the locals half; what is missing
is `___evalScopeFor___:locals:` around it and the module-store receiver) and 4
waiting on the frame work.

### The evidence that the admitted shapes are right

`tests/python/eval_caller_namespace.py` under a forced flag: **16/16 checks**,
11 top-level defs and both `Holder` methods compiled through IR, **0
fallbacks**. Before this cut none of its eval-bearing defs were on the IR path
at all, so the fixture had been passing on the strength of the text twin.

---
