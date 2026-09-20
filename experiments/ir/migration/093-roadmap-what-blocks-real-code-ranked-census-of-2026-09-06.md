## Roadmap — what blocks real code, ranked (census of 2026-09-06)

Until batch 5 the cuts were chosen syntax-first, and there was no measure of
progress.  `experiments/ir/CENSUS.md` now measures it: with the flag forced,
the seam records why every top-level def in the vendored stdlib (and, as a
second corpus, the CPython suite's test modules) is or is not IR-compiled.
Re-run it after each batch; the two headline numbers are the progress metric.

**Where we were (2026-09-06).** Of the stdlib's 1570 top-level defs, 658
(41.9%) compiled through IR.  Of ALL 6245 defs in that corpus, 10.5% did --
because 4471 (71.6%) are class-body methods, which the seam never saw.

**Where we are (2026-09-07, after cuts 35-36 and 40-43 -- CENSUS.md
regenerated on the same stone).** Of the stdlib's 1570 top-level defs, **957
(61.0%) compile through IR**; of its 4427 class-body methods, **851 (19.2%)
are built through the class-method seam**; of ALL 6201 defs, **29.2%** go
through IR.  The test corpus: 75.8% of top-level defs, 15.7% of class
methods, 25.4% of all defs.  Item 1 is open, items 2, 3 and 7 are done.

**Where we are (2026-09-07, after cuts 44-45 -- same stone, same
denominators).** Top-level defs unchanged (957 / 1570, 61.0%); of the 4427
stdlib class-body methods **1685 (38.1%) are built through the seam** (was
851); of ALL 6201 defs **42.6%** go through IR (was 29.2%).  The test corpus:
75.8% of top-level defs, **45.7%** of class methods (was 15.7%), **50.0%** of
all defs (was 25.4%).  Items 1a and 1b are done; what refuses a class method
now is, in order: return annotations (1140), decorators (353), `__slots__`
(266), module-function reads in methods (151), `self.m(kw=...)` self-sends
(143), `super`/`__class__`/`type` reads (76), async (66), generators (65),
receivers not named `self` (64).  The two biggest are items 5 and 6 of the
table, which now block methods far more than they block top-level defs.

**Where we are (2026-09-07, after cuts 47-48 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1160 (73.9%)** compile
through IR (was 957, 61.0%); of its 4427 class-body methods **2628 (59.4%)**
are built through the seam (was 1685, 38.1%); of ALL 6201 defs **61.1%** go
through IR (was 42.6%).  The test corpus: 77.0% of top-level defs, 48.9% of
class methods, 52.8% of all defs (was 75.8 / 45.7 / 50.0).  Items 5 and 6
are done.  What refuses a class method now, in order: `__slots__` (266),
`self.m(kw=...)` self-sends and arity mismatches (261), module-function
reads in methods (233), `super` / `__class__` / `type` reads (173),
annotated assignments (79, a new statement shape), starred values (75),
async (66), generators (65), receivers not named `self` (64).  Item 1c is
now the whole of the method-only tail; the rest is the long tail of items
4, 8-12 as it occurs inside methods.

**Where we are (2026-09-07, after cuts 49-52 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1167 (74.3%)**
compile through IR (was 1160, 73.9%); of its 4427 class-body methods **3337
(75.4%)** are built through the seam (was 2628, 59.4%); of ALL 6201 defs
**72.6%** go through IR (was 61.1%).  The test corpus: 77.0% of top-level
defs, **57.7%** of class methods (was 48.9%), **60.0%** of all defs (was
52.8%).  Four of item 1c's six pieces are done.  What refuses a class method
now, in order: `super` / `__class__` / `type` reads (186), starred values
(89), generators (72), nested defs (68), async (67), name-target augmented
assignment (67 -- a method-only count; the module twin is done, so this is
a missing method-mode branch, not a missing emit), receivers not named
`self` (64), generator expressions (57), attribute-target augmented
assignment (57), `**kwargs` call splats (50), classmethod (42), classes not
at module scope (34), chained assignment (31), staticmethod (19).  Item 9
(generators + async, 139 methods + 48 top-level defs) is being cut in the
second lane (wt/d, `feat/ir-generators`).

**Where we are (2026-09-07, after cuts 53-56 -- the two lanes merged; same
stone, same denominators).** Of the stdlib's 1570 top-level defs **1267
(80.7%)** compile through IR (was 1167, 74.3%); of its 4427 class-body
methods **3809 (86.0%)** are built through the seam (was 3337, 75.4%); of
ALL 6201 defs **81.9%** go through IR (was 72.6%).  The test corpus: 82.7% of
top-level defs, **63.4%** of class methods, **65.6%** of all defs (was 77.0 /
57.7 / 60.0).  Item 9 is done (wt/d lane, cuts 53-54); of item 1c, `super`
/ `__class__` / `type` is done (cut 55); starred values are done (cut 56,
with `**kw` splats, item 11).  What refuses a class method now, in order:
list comprehensions (82), nested defs (76), generator expressions (67),
attribute-target augmented assignment (64), receivers not named `self`
(64), classmethod (42), chained assignment (36), classes not at module
scope (34), lambdas (22), staticmethod (19), builtin functions as values
(15), walrus (13), `raise Cls(kw=...)` (12), Ellipsis (12).  Top-level defs
refuse, in order: nested defs (70), list comprehensions (48), generator
expressions (27), pseudo-variable parameters (23), `global` (19), lambdas
(18), Ellipsis (17).  Item 8 (comprehensions, ~210 defs across the four
node kinds) is being cut in the second lane (wt/d, `feat/ir-comprehensions`).

**Where we are (2026-09-07, after cuts 57-63 and 67 -- the two lanes merged
again; same stone, same denominators).** Of the stdlib's 1570 top-level defs
**1348 (85.9%)** compile through IR (was 1267, 80.7%); of its 4427 class-body
methods **4161 (94.0%)** are built through the seam (was 3809, 86.0%); of ALL
6201 defs **88.8%** go through IR (was 81.9%).  The test corpus: 86.5% of
top-level defs, **68.3%** of class methods, **70.2%** of all defs (was 82.7 /
63.4 / 65.6).  Item 8 is done (wt/d lane, cuts 57-59: list / set / dict
comprehensions, generator expressions); item 1c is done but for method-local
classes (cuts 60, 61, 67: any receiver name, @classmethod, @staticmethod);
the two statement shapes are done (cut 62 augmented attribute / subscript
stores, cut 63 chained assignment).  What refuses a class method now, in
order: nested defs (81), classes not at module scope (35), lambdas (26),
builtin functions as values (18), flow (15), walrus (14), Ellipsis (13),
`raise Cls(kw=...)` (12), `for ... else` (11); every other row is under 6.
Top-level: nested defs (76), pseudo-variable parameters (23), lambdas (19),
`global` (19), Ellipsis (17), flow (13), builtin functions as values (11).
Item 4 (nested defs and lambdas, 81 + 76 + 26 + 19) is being cut in the second
lane (wt/d, `feat/ir-nested-defs`, cuts 64-66); what is left for the first
lane is the long tail of item 12 and the method-local classes.

**Where we are (2026-09-08, after cuts 67-70 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1429 (91.0%)** compile
through IR (was 1348, 85.9%); of its 4427 class-body methods **4226 (95.5%)**
are built through the seam (was 4161, 94.0%); of ALL 6201 defs **91.2%** go
through IR (was 88.8%).  The test corpus: 91.9% of top-level defs, **69.8%**
of class methods, **72.3%** of all defs (was 86.5 / 68.3 / 70.2).  Item 1c is
complete but for method-local classes (cut 67 @staticmethod); of item 12 the
Ellipsis, builtin-as-value, `raise Cls(kw=...)`, loop-`else`, `global`,
walrus and pseudo-variable-parameter rows are done (cuts 68-70).  What
refuses a class method now: nested defs (84), method-local classes (35),
lambdas (26), flow (21), then the deliberately frame-sensitive calls (`dir`,
`exec`, `vars`, `globals`, `locals`, `eval`: 5 + 3 + 3 + ...) and single
digits.  Top-level: nested defs (77), lambdas (19), flow (17), classes
defined in a def (5), frame-sensitive calls (4 + 4 + 3).  Item 4 (nested defs
and lambdas) is in the wt/d lane (cuts 64-66); after it the coverage work is
essentially the flow refinements and the method-local classes -- the rest is
frame-sensitive by design.

**Where we are (2026-09-08, after cuts 71-72 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1446 (92.1%)** compile
through IR (was 1429, 91.0%); of its 4427 class-body methods **4247 (95.9%)**
are built through the seam (was 4226, 95.5%); of ALL 6201 defs **91.8%** go
through IR.  The test corpus: 93.0% of top-level defs, **70.6%** of class
methods, **73.2%** of all defs (was 91.9 / 69.8 / 72.3).  The `flow` row is
GONE from both corpora: cut 71 taught the analysis what a `while True` loop
leaves bound, and cut 72 stopped it being a refusal at all (an unproven read
carries the text's unbound guard).  What refuses a class method now: nested
defs (84), method-local classes (35), lambdas (26), then only the
deliberately frame-sensitive calls (`dir` 5, `exec` 3, `vars` 3, ...), async
comprehensions (4), a default reading a local (4) and single digits.
Top-level: nested defs (77), lambdas (19), classes defined in a def (5),
frame-sensitive calls (4 + 4 + 3).  Item 4 (nested defs and lambdas) is in
the wt/d lane; after it the only coverage work left is the method-local
classes -- everything else on the board is frame-sensitive by design.

**Where we are (2026-09-08, after cuts 64-72 and the merge with main).  THE
DENOMINATORS MOVED**: main vendored `_pydecimal` and `test_decimal`, so the
stdlib corpus is 1592 top-level defs and 4621 class-body methods (was 1570 /
4427) and the test corpus 2809 / 14132 (was 2731 / 13550).  Compare shares,
not counts, against anything above this paragraph.

Of the stdlib's 1592 top-level defs **1551 (97.4%)** compile through IR; of
its 4621 class-body methods **4539 (98.2%)** are built through the seam; of
ALL 6417 defs **94.9%** go through IR.  The test corpus: **97.0%** of
top-level defs, **77.7%** of class methods, **79.7%** of all defs.

Item 4 is done (wt/d lane, cuts 64-66: nested defs, lambdas, `nonlocal`).
What refuses a class method now, in full: method-local classes (35), a
rebound receiver (10, all in the newly vendored `_pydecimal`), the
deliberately frame-sensitive calls (`dir` 5, `vars` 4, `exec` 3, `globals`,
`locals`, `eval`), async comprehensions (5), a default that reads a local
(4), and single digits below that.  Top-level: nested defs with a
pseudo-variable-named parameter or local (13), classes defined in a def (6),
frame-sensitive calls (4 + 4 + 3).

So the coverage work is essentially finished: what is left is method-local
classes (35 + 6), the `reservedName` nested defs (13 + 2), a rebound
receiver (10), and shapes that are frame-sensitive by design and belong on
the text path.  The next non-coverage cut is the position map for IR frames
-- see the section above.

A trap in re-measuring, recorded because it cost one wrong census: the
denominator is *modules compiled in the session*, and a `run_tests.sh` run
deploys the framework modules (committed canonical cache), after which a
census session takes cache HITS for most of the stdlib and counts 603
top-level defs instead of 1570.  `./install.sh` bumps the runtime generation
and invalidates the deployed set; run it, then the census, before anything
else touches the stone.  Compare denominators before comparing shares.

**What to do next, by defs unblocked** (stdlib counts; the test corpus ranks
them identically):

| # | blocker | stdlib defs | what it takes | status |
| ---: | --- | ---: | --- | --- |
| 1 | class-body methods | 4471 | a second seam in ClassDefAst: the class's methods are compiled at class-build time from source literals embedded in the emitted class statement, so IR needs a transport -- a class-side IR table plus an `___installIRMethod:` runtime call (original plan, step 5) | **opened, cut 36**: 851 of 4427 stdlib class methods (19.2%); **1685 (38.1%) after cuts 44-45**; the remaining method-only blockers are 1c below, the rest are the table's items 4-12 as they occur inside methods |
| 1a | methods on the varargs selector (`__init__`, any method with defaults / `*args` / keyword-only) | 1235 | run the cuts 40-43 prologue in method mode: the receiver is stripped, `positional` / `kwargs` are the two Smalltalk arguments, the selector is `_name:kw:`; the class-form default memo | **done, cut 44** |
| 1b | classes whose backing instVars are unknown at emit time | 1152 | the no-shadow rule was the TEXT's (a method temp shadowing an instVar is a source-compiler CompileError); IR leaves have no name resolution, so no check is needed at any time | **done, cut 45** |
| 1c | `__slots__` classes (266), `self.x(kw=...)` self-sends (143), module-function reads in methods (151), `self`-less receiver names (64), classmethod / staticmethod (61), classes not at module scope (34) | ~720 | slot instVar leaves in the builder; the varargs self-send; the dynamic-slot-first BoundMethod read shape; `cls`; class-side install; the closure-cell class path | **done but for method-local classes (35)**: varargs self-sends cut 49, module-function reads cut 50, `__slots__` cut 51 (+ annotated assignment cut 52), `super` / `__class__` / `type` reads cut 55, any receiver name cut 60, @classmethod cut 61, @staticmethod cut 67 |
| 2 | parameter defaults | 355 | the text's prologue: the def-time default memo, positional/kw binding, the missing-argument TypeErrors; the same emit as (3) | **done, cut 40** |
| 3 | `*args` / `**kwargs` / keyword-only | 169 | the varargs calling convention (`_f:kw:` selector, the `positional` / `kwargs` binding prologue) | **done**: `*args`/`**kwargs` cut 41, keyword-only cut 42, positional-only cut 43 |
| 4 | nested defs and lambdas | 239 (204 nested + 34 defs + 1 lambda as first refusal); after batch 11: 81 + 76 defs refuse on a nested def, 26 + 19 on a lambda | closures: a nested def is a block in the enclosing method; needs the PyFunction wrap and cell/temps capture | **in progress** (wt/d lane, `feat/ir-nested-defs`, cuts 64-66) |
| 5 | return / parameter annotations | 168 (+1140 methods) | the annotation statements are the def STATEMENT's / ClassDefAst's, never the method's -- an eligibility-only cut | **done, cut 47** |
| 6 | decorators | 46 (+353 methods) | Grail applies decorators OVER the compiled method, as text, on both seams -- an eligibility-only cut; it flushed out the name-keyed registration map (fixed: keyed by selector) | **done, cut 48** |
| 7 | late-bound module names | 32 | the text's `___moduleAttrLoad___:` fallback for a name neither local, module-var nor resolvable (a star import) -- the IR already emits that send for module names | **done, cut 35** |
| 8 | comprehensions / genexps | 30 (+~210 across the four node kinds in methods) | scoped locals in the builder (a target shadows a method temp), the outer-iterable hoist, the traceback-frame wrapper | **done, cuts 57-59** (wt/d lane): scoped locals (`withLocals:do:`), the hoisted outer iterable, chained filters, the traceback-frame wrapper; genexps reuse the generator machinery |
| 9 | generators / async | 24 (+139 methods) | the PythonGenerator / PythonCoroutine body wrapper (`___wrapsBody___`); a different method shape | **done, cuts 53-54** (wt/d lane): the wrapper block with `PythonReturn`, `yield` / `yield from` / `await`, `async for` / `async with` through the ForAst / WithAst hooks |
| 10 | `global` declarations | 12 (19 after batch 11) | module-route the declared names (dynamicInstVarAt:put:) | **done, cut 69** (with the walrus; cut 70 the pseudo-variable parameters, cut 68 Ellipsis / builtins as values / `raise Cls(kw=...)` / loop `else`) |
| 11 | call-site `*` splats | 9 (+89 methods; `**kw` 50 + 31) | the text's Array concatenation and the `update:` keyword merge | **done, cut 56**, together with starred tuple / list displays |
| 12 | the long tail | ~30 | flow refinements (5), pseudo-variable params (4), class defs inside a def (3), `super`/`__class__`/`type` reads (3), attribute/subscript aug-assign targets (5), chained assignment (3), builtin function as a value (2), complex literals (2), walrus (1), loop `else` (2), `raise Cls(kw=...)` (1), Ellipsis (1) | **done but for the frame-sensitive calls and method-local classes**: cuts 55 (`super` family), 62-63 (the two statement shapes), 68 (Ellipsis, builtins as values, `raise Cls(kw=...)`, loop `else`), 69 (`global`, walrus), 70 (pseudo-variable params), 71-72 (flow) |

Items 1a, 1b, 1c (but for method-local classes), 2, 3, 5, 6, 7, 8, 9, 10,
11 and 12 (but for the frame-sensitive calls, which stay on text by design)
are done, and so are the two statement shapes (cuts 62, 63) and the flow
refinements (cuts 71, 72).  What moves the headline number now is item 4,
nested defs and lambdas, in the wt/d lane (84 + 77 methods/defs on a nested
def, 26 + 19 on a lambda); after that, method-local classes (35 + 5).

Still-open non-coverage work: PEP 657 columns for IR frames (the (method, ip)
-> span side table; five test classes measure it), the recursion-guard byte
budget, and the memory-pressure follow-ups (importlib's ``on: AbstractException''
handler unloading a module on a Notification; a larger temp-object cache for
cold shards).
