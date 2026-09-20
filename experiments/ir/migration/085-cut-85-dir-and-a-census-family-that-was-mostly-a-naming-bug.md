## Progress — cut 85 (`dir()`, and a census family that was mostly a naming bug)

Cut 85 began as the bare-`dir()` emit and found something larger: **most of the
`frameSensitive` family was never frame-sensitive, or even rewritten.** The
shape dispatch refused `globals`, `locals`, `vars`, `dir`, `eval` and `exec`
**by name, at any arity**, while the text rewrites only specific shapes. Every
refusing `frameSensitive-dir` site in the stdlib is `dir(obj)` -- the
one-argument form, which the text does not touch at all: it falls through to the
ordinary builtins dispatch, exactly like `len(obj)`. The IR path was refusing
ordinary calls because of the name on the front.

So the guard now refuses only what the text's own step 0 claims. Measured, IR
and text emit byte-identical results on `dir(obj)`, `vars(obj)`,
`eval(e, g)`, `eval(e, g, l)` and `exec(s, g)`, all matching CPython.

**The bare `dir()` emit itself** is a thin wrapper, on purpose: Python defines
`dir()` with no argument as the names in the current scope, and the text routes
it through the SAME machinery `locals()` uses rather than finding the scope a
second way. `___emitIRDirOfScopeOn___:` does likewise, over
`___emitIRScopeNamespaceOn___:`, which picks between cut 84's locals snapshot
and cut 83's module view. The class-body and comprehension cases stay on text.

### Three defects found, none of which showed up as a wrong answer

**1. A silent fallback in cut 84** (fixed here). A function with a parameter
spelled like a Smalltalk pseudo-variable (`def f(nil, true)`) fell back to text
on every `locals()`. Cut 84 passed the TRANSPORT name to `localVar:`, which is
what the text must print; but the builder registers such a parameter under its
PYTHON name and only *names* the leaf `_nil`. The IR path must not translate at
all. Correct answers throughout -- the fallback compiled the text -- so only
`___irStats___` showed it.

**2. Eligibility and emit run in DIFFERENT compile-time contexts.** This is the
general one, and it had never bitten because every context-dependent branch
happened to land on *some* emittable shape in both phases. `CallAst
functionBeingCompiled` is **nil** while the seam judges a def and **set** while
its body is emitted, so a shape test consulting it can answer "ordinary call"
to the judge and "refuse" to the emitter. A guard copied from the text's own
`eval` rewrite did exactly that: `pickle._builtin_type_registry`
(`cls = eval(name)`) was judged eligible, then raised `call shape not
emittable`, falling the whole method back to text. It surfaced as the census's
own `fallback` row -- one line, in a board of thousands.

*A shape test must give the same answer in both phases.* Anything consulting
`functionBeingCompiled` or `inClassBodyValueEmit` needs checking against this.

**3. `eval`/`exec` are frame-sensitive at RUN time, and no shape test can see
it.** `eval(e, g, l)` whose `g` and `l` hold None means "use the caller's
namespaces", and Grail honours that by finding the calling Python frame --
identified by the `___curPos___` temp that TEXT-generated methods carry. An IR
method carries `___grailPython___` instead, so the walk does not recognise it
and the expression gets no caller namespace. Compiling those calls through IR
turned test_decorators' `dbcheck` shape into `NameError: name 'args' is not
defined`: **13 errors in EvalCallerNamespaceTestCase**, caught by the flag-on
gate. The values decide, at run time, so `eval`/`exec` are refused at every
arity here. **Unifying the two marker spellings is the next cut** -- it changes
the shared frame walk the traceback path also uses, so it is not a rider on
this one.

*Updated on merging main, then CORRECTED by measurement.* The unification
landed as **#906**, from another lane and for an independent reason -- under
`GRAIL_IR_CODEGEN` the walk ran past every IR method, so a `NameError` inside a
method lost its `self.<name>` suggestion (which was also this lane's
`FrameReceiverSuggestion` residue item). On reading that, this section claimed
the eval/exec blocker was gone. **It is not.** With eval/exec narrowed on top of
#906, loading `tests/python/eval_caller_namespace.py` under a forced flag still
raises `NameError: name 'args' is not defined` -- 19 compiled, 0 fallbacks,
where the text path loads it. Reading a fix's docstring is not measuring it.

What #906 did fix is most of the shapes. Probed one at a time, the IR path now
agrees with text and CPython on a plain parameter, a plain local, a module
global, a top-level `*args` def, and a method. The remaining divergence is a
**nested def**, and it goes BOTH ways:

* `def outer(n): def inner(): return eval('n + 100', None, None)` -- IR answers
  101 where text and CPython raise `NameError`. CPython's compiler never makes
  a cell for a name appearing only inside the eval string, so it is genuinely
  out of scope; IR is too **permissive**, seeing the enclosing method's locals.
* the `dbcheck` shape -- a nested def taking `*args` -- cannot see `args` at
  all.

A nested def compiles to a BLOCK inside the enclosing method, so the frame the
snapshot walk finds is not the one whose temps it wants. That is the next cut in
this lane, and it is frame machinery rather than codegen.

### Measured

| | before | after |
| --- | ---: | ---: |
| stdlib top-level compiled | 1575 / 1592 (98.9%) | **1582 / 1592 (99.4%)** |
| stdlib class methods eligible | 4576 / 4621 (99.0%) | **4585 / 4621 (99.2%)** |
| corpus 2 top-level compiled | 1302 / 1327 (98.1%) | **1312 / 1327 (98.9%)** |
| corpus 2 class methods eligible | 10365 / 10942 (94.7%) | **10396 / 10942 (95.0%)** |
| corpus 2, all defs through IR | 93.9% | **94.3%** |

`frameSensitive-dir` (25 + 4) and `frameSensitive-vars` (4 + 3) are **gone**.
`frameSensitive-eval` (50 + 2) and `-exec` (77 + 3) survive, deferred to the
marker cut with the reason recorded. No `fallback` rows anywhere on the board.

### A test that had quietly stopped testing

`text_caller` is the TEXT side of `testTracebackThroughIRMethod`. It was kept on
the text path by a bare `dir()` in its body -- and this cut made that eligible.
Every test stayed green; the check had simply become IR-calls-IR. The only trace
was the pinned compiled count reading 614 where the new fixture defs accounted
for 613.

The general problem has no permanent fix: *every* refusing shape is by
construction a future cut, so any opt-out is temporary. What is durable is
making its retirement LOUD. `text_caller` now opts out with an inert `match`
statement, and the test asserts its own premise -- an IR method's `sourceString`
is its Python def, so a text method's is not. Verified by positive control: with
the `dir()` opt-out restored the assertion fires and names the fix; with the
`match` in place it is silent.

**Chasing an off-by-one in that pinned count has now twice been worth more than
the count.** The full split is in the test's own docstring; the short version is
604 -> 613 -> 614 (emitter alone, fixture held fixed) -> 622 -> 619, and it
closes exactly once you know class-body methods land in the counter too --
measured on a two-line module rather than assumed.
