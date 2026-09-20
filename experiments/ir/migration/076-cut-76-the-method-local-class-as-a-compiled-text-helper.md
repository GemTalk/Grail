## Progress — cut 76 (the method-local class, as a compiled-text helper)

`stmt:ClassDefAst` — a `class` statement inside a def — was the largest
remaining coverage refusal: 6 stdlib top-level defs and 3 stdlib class methods,
and **963 class methods in the CPython-suite corpus**, where it was the biggest
single blocker after `method:classNotAtModuleScope`.

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on `plain()`, `make(n)`,
`with_if(flag)` and the methods `Host.build(self)` / `Host.build2(self, tag)`).
`ClassDefAst>>printSmalltalkOn:` is `printSmalltalkRuntimeOn:` for every scope,
module or not, and inside a def it inlines ~30 statements into the enclosing
method:

    Simple := (PythonInstance) @env1:___subclass___: #'Simple' instVarNames: #( ) classInstVarNames: #( __doc__ __module__ ___dynInstVars___ ).
    Simple ___compileMethod: '___pyDefinedClass___ ^ true' category: 'Grail-Slots'.
    (Simple ___pyInheritsStrictSlots___) ifTrue: [Simple ___compileMethod: '___pySlotsStrict___ ^ false' category: 'Grail-Slots'.].
    Simple ___compileMethod: '<one method source per def>' category: 'Grail-Class Methods'.
    Simple @env0:class ___compileMethod: '<accessor pair / table>' category: 'Grail-Class Attrs'.
    Simple @env1:___grailBeginClassBuild___.  Simple @env1:___grailPrepareNamespace___: nil.
    Simple __doc__: (Simple @env1:___grailNsStore___: '__doc__' value: ((None))).
    Simple @env1:___grailNsBind___: '<name>'.        "one per def"
    Simple __module__: '<module>'.
    Simple ___dynInstVars___ == nil ifTrue: [Simple ___dynInstVars___: (Object @env0:new)].
    Simple @env1:___classHolderAttrStore___: #'___qualname___' put: 'plain.<locals>.Simple'.
    Simple @env1:___pyAttrStore___: #'___cell_n___' put: [n].       "one per captured local"
    Simple := Simple @env1:___pyClassDefined___: { ... }.
    Simple @env1:___grailInitSubclass___: nil.
    Simple := Simple @env1:___grailDispatchMetaclass___.

**What the IR emits — and why it is not a transcription.**  Every other cut
reproduces the text's sends as IR nodes.  This one deliberately does not, and
the reason is the size and the shape of the producer rather than of the output:
`printSmalltalkRuntimeOn:` is ~2400 lines of branches (slots, dataclasses,
metaclass hooks, decorators, aliases, property pairs, conditional defs, the
five class-side tables), and almost every ARGUMENT it emits is a STRING LITERAL
holding a whole method's source.  An IR twin would be a second copy of those
2400 lines, free to drift from the original, for output that is mostly literals
— exactly the failure the emit rule exists to prevent, arrived at from the
other end.

So the class statement travels as **compiled text**, the way a class-body
method already does on both paths (`<cls> ___compileMethod: '<source>'`, and
cut 36's `importlib ___irInstallDef: <id> on: <cls> or: '<source>'`, whose
fallback carrier is the same text).  `ClassDefAst>>___emitIRStatementOn___:`

* generates the class emit's own text — `printSmalltalkOn:` on a fresh stream,
  called at the point in the IR build where the compile context
  (`functionBeingCompiled`, the scope stack, `classBeingCompiled`,
  `moduleClassBeingCompiled`) is exactly what the text path would have
  generated it under, so the text is the text path's, character for character;
* wraps it in a private unary method — `| <ClassVar> <class-body helper temps> |`,
  the emit, `^ <ClassVar>` — and compiles it with
  `compileMethod:dictionaries:category:environmentId: 1` onto
  **`aBuilder targetClass`, the very class the enclosing method is being built
  on**;
* emits one IR statement: `<ClassVar> := self ___irClassDef_<offset>_<Name>___`.

The receiver is `self` and the helper lives on the enclosing method's own
class, which is the whole trick: `self` means inside the helper exactly what it
means in the enclosing method — the module instance for a top-level def, the
Python receiver for a class-body method, the metaclass for a @classmethod — so
every `self`-relative resolution in the generated text (a module attribute
load, `self.x` in a base expression, `(<Mod> ___instance___)` in method mode)
is unchanged, and ONE shape covers both seams.

**Three things the helper must not do**, each of which decided a rule:

* **It must not look like a Python frame.**  `PyFrame class>>___namesIncludeCodegenMarker___:`
  recognises a Grail-generated frame by the temp name `___curPos___`, so a
  helper that declared one would put a phantom entry in every traceback through
  it.  The class emit does not store `___curPos___` for the admitted shapes
  (measured: the only stores in a dumped module are the ENCLOSING statement's
  and the ones inside each method's own source literal), so the helper declares
  none — and if a shape ever needed one, the reference is an undeclared
  identifier and the compile fails, which is a fallback to text, not a wrong
  traceback.  `___irClassBodyStatementsAreSimple___` keeps out the class bodies
  that WOULD need it: control flow in a class body (`if`, `for`, `try`, `with`,
  `del`, augmented assignment) falls through to the ordinary statement
  emitters, which do stamp `___curPos___`.
* **It must not register the class body's defs for a deferred IR build.**
  `___irEmitClassBodyAsTextDo___:` turns cut 36's seam off for the duration
  (`importlib ___irClassSeamEnabled___`), so the body's defs come out as the
  plain `___compileMethod:` statements the flag-off path emits.  Registering
  them would register a class-body method's defs TWICE — its text twin is
  generated anyway, as its own install statement's fallback literal — and
  either way the entries would be waiting for a statement that runs, if at all,
  long after `___irPurgeDefTableForModule___:` has dropped them (a method-local
  class is built on every CALL of its enclosing def, not once at module load).
  The inner class's own methods are therefore text, exactly as flag-off, and
  are a later cut.
* **It must not carry the class's extent into the position map.**  The stamp is
  `at: beginPosition`, not `atNode:`: a class statement's extent is its whole
  suite, so a map entry would put carets under every line of the class body for
  anything raised while the class is built.  With no entry the reader falls
  through to the line-only answer, which is **the line CPython names for this
  frame** — measured on a class whose body divides by zero, CPython reports the
  `class Bad:` line for the enclosing function's frame (and adds a `Bad` frame
  Grail has on neither path), where the TEXT path reports the failing
  class-body line.  So flag-on is closer here than flag-off.

**Eligibility** (`___irMethodLocalClassReason___:`, each exit a census
`classDef:...` row): no decorators (`classDef:decorated`), no class keywords /
metaclass (`classDef:keywords`), no PEP 695 type parameters
(`classDef:typeParams`), not inside an exec/eval doit (`classDef:doit`), a
module class in context (`classDef:noModule`), the class name not `global`-bound
to the module (`classDef:moduleScopeTarget`), no `global` / `nonlocal` at the
top of the class body (`classDef:outerBinding`), no class-body walrus
(`classDef:walrus`), only declarative body statements
(`classDef:bodyStatement`), and — the one that matters — **no capture of an
enclosing local** (`classDef:capturesLocal`).  The helper is unary: a name the
class statement reads out of the enclosing def's frame (which the text turns
into a `___pyAttrStore___: #'___cell_x___' put: [x]` closure cell, by
REFERENCE) is simply not reachable there.  A locally-defined BASE CLASS is a
capture too, by the same rule.

The capture set is computed twice and unioned, which is not belt and braces but
a measured hole.  The first pass is the parser's own sets — `body reads` (the
class scope's mention set, accumulated outward at popScope so a name only a
deeper method mentions is still free here) minus `body variables` and
`body globalNames`, intersected with the enclosing locals — the same inputs
`CallAst>>___freeVariableNamesFor___:` uses.  **An f-string replacement field
is parsed by a CHILD parser, so a name mentioned only inside one never reaches
that set**: `typing.NewType.__mro_entries__` reads `superclass_name` only from
an f-string in a nested `__init_subclass__`, and the helper compiled against an
undefined symbol — a safe fallback, but a fallback and not a refusal, and the
one fallback in a 6098-def stdlib census.  So a second, syntactic pass adds
every load in the subtree that names an enclosing local and is not bound by any
scope inside the class.  It over-approximates in the safe direction and cannot
under-approximate the f-string case, which is what it is for.

**Census walk.**  `___irWalksChildrenForRefusal___` (new on AbstractNode, false
only on ClassDefAst) stops the first-refusing-child walk at a class statement:
nothing under it is judged as IR at all, so a node inside it that the IR path
happens not to handle is not why the class refused.

**Fixture**: `mlc_plain` (name / qualname / module), `mlc_fresh` (a distinct
class object per execution), `mlc_attrs` (docstring + class attributes),
`mlc_methods` (`__init__`, instance state, two methods), `mlc_based` (a
module-level base, raised and caught), `mlc_slots`, `mlc_decorated_members`
(@staticmethod / @classmethod / @property inside the local class),
`mlc_nested_class`, `mlc_in_branch` (a class per branch of an `if`),
`mlc_in_loop`, `mlc_body_error` (a class-body ZeroDivisionError caught by the
enclosing def), `mlc_after` (the statement after the class still runs), and
`Mlcer.build` / `Mlcer.counted` — a class defined inside a class METHOD, which
is the corpus's dominant shape.  Two NEGATIVE CONTROLS stay on text and are
excluded from the compiled count: `mlc_captures` (reads an enclosing parameter)
and `mlc_two_classes` (its base class is a local of the same def, and its
`super()` therefore exercises the text path).  Compiled 465 -> 480, 0
fallbacks, RESULTS true with the flag on and off.

**Two things the transport costs, both recorded rather than hidden.**  For a
class inside a class-body METHOD the class emit runs TWICE -- the method's text
twin is generated anyway (it is the fallback literal of its own
`___irInstallDef:` statement) and the helper generates it again -- which is
compile-time string work, not a second class.  It also double-counted the inner
class's methods in the census: 326 phantom `cm:method:classNotAtModuleScope`
rows over fourteen test modules, which moves the DENOMINATOR and so every share
on the board.  `importlib ___irClassEmitIsForTransport___` now turns the census
off for the transport emit as well as the seam.

Gates (both from wt/d on gs40, through `scripts/with_stone_lock.sh`; 8 of 8
shards reporting, no "Login failed", per-shard counts summing to the suite
line):

* flag-off `6551 run, 6551 passed, 0 failed, 0 errors`;
* flag-on cold sweep `6551 run, 6545 passed, 5 failed, 1 errors` -- the SAME
  six as main, no new name: `TracebackTestCase>>testForLoopExceptionPositions`
  (`tuple_target_span`), `FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`,
  `ImportlibTestCase>>testInstanceMethodNoOuterBlock`,
  `LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
  `NestedOperandSpanTestCase>>testALiveFrameKeepsTheStatementsLine`, and the
  `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling` recursion-guard
  flap.

**Census.**  Stdlib corpus (`experiments/ir/census_stdlib.tpz`, 125 imports,
`./install.sh` first): 1565 / 1592 top-level defs (98.3%, was 1564) and 4541 /
4621 class methods (98.3%, was 4539), 6098 compiled with **0 fallbacks**.
`stmt:ClassDefAst` is gone from both stdlib tables; what replaced it is
`classDef:capturesLocal` 5 + `cm:classDef:capturesLocal` 3, so five of the six
stdlib top-level defs and all three stdlib class methods that a class statement
blocked capture an enclosing local.  The stdlib was never where this refusal
lived.

The CPython-suite corpus is, and it was measured as a MATCHED PAIR on one
stone: fourteen test modules (`test.test_math`, `test_enum`, `test_heapq`,
`test_operator`, `test_builtin`, `test_collections`, `test_functools`,
`test_itertools`, `test_super`, `test_property`, `test_scope`, `test_listcomps`,
`test_dict`, `test_set`) plus everything they import, run twice with
`./install.sh` immediately before each -- once with
`ClassDefAst>>___irEligibleStatementLocals___:` forced to `false`, once as
landed:

| | before | after |
| --- | ---: | ---: |
| top-level defs compiled | 795 / 821 (96.8%) | **797 / 821 (97.1%)** |
| class methods eligible | 2716 / 4103 (66.2%) | **2957 / 4102 (72.1%)** |

**+241 class methods**, and the `stmt:ClassDefAst` row is gone.  What is left of
it: `cm:classDef:capturesLocal` 140, `cm:classDef:decorated` 22,
`cm:classDef:keywords` 14, `cm:classDef:bodyStatement` 2,
`cm:classDef:outerBinding` 1.  So the next cut in this family is unambiguous --
**the captured enclosing local**, 140 of the 179 remaining refusals here and 8
of 8 in the stdlib.  It needs the helper to stop being unary: the captured
values become arguments, which is sound exactly when the enclosing binding
cannot change after the class statement (the text's cell is by REFERENCE), so
the rule is a parameter never reassigned or deleted, or a body local assigned
once.  `classDef:decorated` and `classDef:keywords` are separate, smaller cuts:
both evaluate an expression in the enclosing scope, which is the same
marshalling problem.

**Two capture-detection holes were found by the census's fallback log**, both
worth recording because a missed capture is a compile failure and so a silent
fallback rather than a wrong answer:

* `typing.NewType.__mro_entries__` -- a name read only from inside an f-string,
  which the parser's `reads` set never sees (the child parser);
* `test.test_scope.ScopeTests.testFreeVarInMethod` -- a local whose name a
  class-body def also binds, where a method-body read is still a capture
  because Python skips class scope.

The second pass described above answers both, and the census's fallback count
went 1 -> 0 in each corpus.  The lesson generalises: **when eligibility is
decided from the parser's scope sets, a scope Python treats specially (a class
body) and a scope the parser does not model (an f-string) are the two places to
check**, and the instrument that finds them is the fallback log, not the tests.
