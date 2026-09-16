## Progress — cut 59 (generator expressions)

`value:GeneratorExpAst` (57 stdlib class methods + 25 top-level defs) -- the
second-largest comprehension family, and the one whose text shape is LAZY.
GeneratorExpAst>>printSmalltalkOn: has two forms; this cut emits the
synchronous one and refuses the async one.

**What the text emits** (trace of `lazy(xs)`, `total(xs)` and `K.lazy(self)`):

    ^ (([:___gxsrc0___ |
        (PythonGenerator @env1:withBlock: [:___gen___ |
          [
          [| ___src1___ |
            ___src1___ := ___gxsrc0___.
            [| ___iter1___ x |
              ___iter1___ := ___src1___ __iter__.
              [true] whileTrue: [
                x := ([___iter1___ __next__] @env0:on: StopIteration do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
                ___gen___ @env1:___yield___: ((x) ___binOpMul___: (2)).
              ].
            ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
          ] value
          ] @env0:on: Exception do: [:___tex___ | ... ___pushTracebackFrame___ ... ___tex___ @env0:pass].
          None
        ] name: '<genexpr>' qualname: 'lazy.<locals>.<genexpr>' code: nil)
    ] @env0:value: ((xs) __iter__)))

A real PythonGenerator over the clause blocks: the outermost iterable is
evaluated AND `__iter__`'d at construction, in the enclosing scope, and
passed in through the depth-named wrapper-block parameter (`___gxsrc1___`
for a genexp nested in a genexp) -- which is why `(x for x in None)` raises
its TypeError from the enclosing statement rather than the first `next()`,
and why a genexp built in a loop closes over the loop variable's VALUE, not
its temp.  Inside, emitGenerators' `outerSource:` path binds `___src1___`
from that parameter, and the innermost statement is `___gen___
___yield___:` on the genexp's OWN generator.

**What the IR emits** is that, send for send, through
GeneratorExpAst>>___emitIRValueOn___: -- `blockWithArg:` for the `___gxsrcD___`
wrapper and the `___gen___` block, the shared clause emitter with an
`outerSource:` block answering the wrapper parameter, the `withBlock:name:
qualname:code:` send (env 1) with `code: nil`, and the `value:` of the outer
block over `(iter) __iter__` (env 1).  Two things from cut 53's generator
machinery are reused rather than duplicated: the `___yield___:` send to the
builder's `genLeaf`, which is SWAPPED to the genexp's own block argument for
the body and restored under ensure: -- so a genexp inside a generator def
(`ge_in_generator`) yields its elements to itself while the def's own
`yield` still reaches the def's generator -- and the wrapper class name.
Nothing of `___emitIRWrappedBodyOn___:` applies: a genexp has no statements,
no PythonReturn handler, no PyCode.

**The qualname needed one thing the IR build did not do.**  The text's
`'lazy.<locals>.<genexpr>'` comes from `CallAst ___qualnameFor___:name:`
walking the LEXICAL SCOPE STACK, on which printBodyOn: pushes the def's own
frame around its body emit.  `___installIRMethodOn___:` set
functionBeingCompiled around the IR build but pushed no frame, so the first
build would have answered `<genexpr>` (module def) or `K.<genexpr>` (method,
where the seam's snapshot restores the class frame).  It now pushes the
def's frame for the same window and truncates back in its ensure:; the def's
own qualname (cut 53's `Walker.walk`) is unaffected because
`___qualnamePrefixBefore___:` stops at the node's own frame.  Measured:
`lazy.<locals>.<genexpr>` and `K.lazy.<locals>.<genexpr>` under the flag,
equal to the text.

**What is refused**: the ASYNC generator expression (`GeneratorExpAst:async`,
PEP 530's rule as `___isAsyncGenexp___` -- an `async for` clause or an
`await` anywhere in the expression's own scope, nested list / set / dict
comprehensions included, nested genexps excluded), whose wrapper is
PythonAsyncGenerator over `___asyncYield___:` with the outermost iterable
`___grailAiter___`'d at construction when the first clause is async.  The
census counts it separately now; the stdlib corpus has few.  The clause
refusals are cut 57's.

Fixture: ten module defs -- a returned genexp consumed by `list()`, `sum()`
over a filtered genexp, `any()` short-circuit proving laziness (the
appended log stops at the first hit), `next()` then `list()` on one
generator, the construction-time TypeError of `(x for x in None)`,
`type(g).__name__` / `__name__` / `__qualname__`, a genexp nested in a
genexp, a tuple target, a genexp inside a generator def, a target
shadowing the parameter that its own outermost iterable reads -- and class
`GenExpr` (a genexp over `self.items` and a `sum()` over self-sends), plus
`genexpr_run` checking `GenExpr.lazy.<locals>.<genexpr>`; every value
verified under CPython 3.14.6.  Compiled 315 -> 330 (all 15 new defs),
fallbacks 0; flag OFF ALL_OK at compiled=0.  The eleven-def comprehension
probe module (list / set / dict / genexp, module and method) now compiles
14/14 under the flag with the text's OUT.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 330, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`, 0 AlmostOutOfMemory notifications;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6421 passed, 8 failed, 2 errors`
  -- the known nine at 9b72095b by name plus one ERROR,
  `WarningRegistryTestCase>>testDefaultactionCanBeReplacedAndDeleted`, whose
  text is the AlmostOutOfMemory notification (13 in shard 3's log, 0 in the
  other three); 11/11 alone in a fresh flag-on session (132 IR compiles, 0
  fallbacks).  The cold-shard pressure effect, on the shard that carries the
  frameworks; every shard finished this time.

**Where item 8 leaves the census (2026-09-07, after cuts 57-59; stdlib
corpus, `census_stdlib.tpz` right after `./install.sh` on gs40 as Claude3,
125 modules imported, 0 failures, 5279 IR compiles, 0 fallbacks).**  Of the
stdlib's 1570 top-level defs **1334 (85.0%)** compile through IR (was 1167,
74.3%, after cuts 49-52 -- the difference also carries cuts 55-56, which
this lane did not census separately); of its 4427 class-body methods
**3947 (89.2%)** are built through the seam (was 3337, 75.4%); of ALL 6201
defs **85.2%** go through IR (was 72.6%).  No `value:ListCompAst`,
`value:GeneratorExpAst`, `value:DictCompAst` or `value:SetCompAst` row
remains.  What the comprehension family still refuses: `Comprehension:async`
-- 1 top-level def (jinja2.async_utils.auto_to_list) + 4 class methods
(jinja2's Template.render_async / make_module_async, BlockReference._async_call,
AsyncLoopContext.length); `GeneratorExpAst:async`, `Comprehension:starTarget`
and the subscript / attribute target labels do not occur in this corpus.
The largest refusals now are nested defs (`stmt:FunctionDefAst`, 76 defs +
77 methods -- roadmap item 4), pseudo-variable parameters (23), and on the
method side attribute-target augmented assignment (64), `self`-less receivers
(64), classmethod (42) and staticmethod (19), chained assignment (36),
method-local classes (34), lambdas (25).  The CENSUS.md rewrite is the other
lane's; these numbers are from the raw census log.
