## Progress — cut 84 (`locals()` / `vars()`, and a gate that was skipping the file)

Cut 83 established that the `frameSensitive` family is compile-time, not
frame-sensitive, and that four of its six rows stand on one method,
`printLocalsCallOn:`.  This is that method -- the FUNCTION-scope case of it.

**What it emits.**  `(builtins instance) ___buildLocals___: { {'name'. <read>}.
... }` -- a pair-array in the text's ORDER, which is load-bearing: free
variables first, then the function's own names sorted, then comprehension
targets last so they shadow a same-named local.  `___buildLocals___:` drops the
entries whose value is still nil, which is how a not-yet-bound name stays out.
Each name resolves as the text resolves it: a self/cls parameter is Smalltalk
`self`, a reserved-named PARAMETER is its transport temp, anything else is the
plain local.

Module-scope `locals()`/`vars()` outside a comprehension IS `globals()`, so it
rides cut 83's `#globalsView` rather than getting a second spelling.  The class
body and the comprehension cases stay on text and are still refused.

**Free variables reuse the text's own trick rather than copying its rules.**
`___emitFreeVariableRead___:parent:on:` resolves a free variable by building a
`NameAst` AT THE RESOLUTION POINT and letting it compile itself; the IR twin
builds the same node and calls `___emitIRValueOn___:` on it.  So the two paths
agree by construction, and cut 81's class-cell case comes along for free.

**A trap that produced correct answers.**  The first version fell back to text
on exactly the shapes the free-variable path touched -- and the fixture still
agreed with CPython on all ten shapes, because the fallback compiles the text.
Only `___irStats___` showed it: two fallbacks, logging `UndefinedObject does
not understand #-`.  A SYNTHESIZED node carries nil in all four
`AbstractLocationNode` position instVars, and the IR path stamps every node it
emits -- `column` is `beginPosition - prevEolPos - 1`.  The text twin never
notices because it only prints.  Fixed by copying the four positions from the
call site, which is also the honest position: that read IS emitted there.
**Assert `fallbacks = 0` after every emit change; matching values prove
nothing.**

**Measured.**  `frameSensitive-locals` **11 -> 0**, `frameSensitive-vars`
12 -> 9 (the class-body and comprehension cases, still refused).  Total
refusals **637 -> 626**.  Corpus 2 class methods eligible 10356 -> **10365**.
Modest by design -- the value here is the machinery `dir` (38), `exec` (81) and
`eval` (54) all stand on, 173 rows still to come.

**And a gap in the gate, closed.**  `ir_codegen_smoke.py` had no top-level
`__main__` block, so `check_python_fixtures.sh` -- which runs only self-running
fixtures -- had been SKIPPING it entirely.  Its "all self-running fixtures agree
with CPython" was quoted in three PRs as evidence for shapes it had never
executed.  The gate's own docstring warns the skip is silent.  The file now opts
in and prints one line per RESULTS entry: **337 -> 338 fixtures, 5202 -> 5598
checks**, +396 conformance claims now checked on every run.

It earned its keep immediately: `lv_in_comprehension` was written from
expectation as `['x']` and CPython 3.14 answers `['x', 'xs']`, because PEP 709
inlines a list comprehension into the function's scope from 3.12 on.  Measured
and corrected.
