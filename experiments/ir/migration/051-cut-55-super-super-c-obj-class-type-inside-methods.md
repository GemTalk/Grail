## Progress — cut 55 (`super()`, `super(C, obj)`, `__class__`, `type` inside methods)

The largest method-only refusal after batch 9 (`NameAst:super-__class__-type`,
186 stdlib methods + 22 defs) was one label for four reads with four text
shapes.  Every one is emitted now for a method of a MODULE-SCOPE class; the
method-local-class spellings (the closure-cell reads `___classCellForSuper___:`
/ `___dunderClassCell___:`) stay on text, and the method seam refuses those
classes anyway (`method:classNotAtModuleScope`).

**Zero-argument `super()`** (`#superZero`, the corpus's 1662 occurrences) is
the text's `___printShadowableSuperOn___:arm:` exactly:

    ([:___sup___ | ___sup___ == nil
            ifTrue: [(Super @env1:cls: ((<Mod> @env0:___instance___) @env1:<Cls>) obj: self)]
            ifFalse: [___sup___ @env1:value: { } value: nil]]
        @env0:value: ((<Mod> @env0:___instance___) @env1:___grailShadowedSuper___))

-- a real one-argument block so the run-time shadow probe (a `super` patched
onto the module after its body compiled, test_super's test_shadowed_dynamic)
is evaluated once and in the enclosing expression's order; the class read is
wrapped in `___grailClassCellValueForSuper___` when ClassDefAst found the
class's `__class__` cell rebindable (classCellRebindable, in the compile
context the seam snapshots).  The argument-0 deletion guard is absent by
construction: the shape is admitted only for a method's own receiver, which
no `del` can nil.  **`super(C, obj)`** (`#superExplicit`) is `(Super
@env1:checkedCls: <cls> obj: <obj>)`, the first argument read through the
module instance's class accessor when the module binds that name and as its
own value otherwise (a parameter holding a class, a builtin type).
**`__class__`** (`#dunderClass`) is printDefiningClassOn:'s module route,
`((<Mod> @env0:___instance___) @env1:<Cls>)`, wrapped in
`___grailClassCellValue___` when rebindable.  **`type`** as a value is the
bare global `type` (the class, not a BoundMethod wrapper) whenever the text's
fast-path-builtin branch would claim it.

The text branches' compile-time side effects -- `classNeedsClassCell:` and
`___recordClassCellMethod___`, which ClassDefAst reads to inject
`__classcell__` and answer `__closure__` -- are deliberately NOT repeated in
the IR emits: every seam method's text twin is generated first
(`methodSources`, then the registration), so they have already fired under
the same context when the deferred IR build runs.

Two things found on the way.  (1) A Python edit script whose anchor was the
closing brackets of `___irNonLocalLoadKind___:` swallowed the method's `on:
Error do: [:ex | nil]` line into the NEXT method: the guarded block was then
answered UNEVALUATED -- a BlockClosure, non-nil, so every name looked
eligible -- and 59 of 235 smoke defs fell back at emit time with "unhandled
name load ZeroDivisionError".  (2) That was undiagnosable from `lastError`
alone, so `importlib ___irStats___` now carries a `fallbackLog` (every
fallback's `def: message`, capped at 500) and `___irNoteFallback___:error:`
appends to it.

Fixture: Base / Child / Grand (zero-arg `super()` in `__init__` and a
sibling, `super(Child, self)`, `super(cls, obj)` with a parameter,
`__class__` on a subclass instance answering the DEFINING class, `type(self)`,
`isinstance(Child, type)`).  Compiled 224 -> 235.  Flag-on probe of the 72
SUnit classes that mention `super` / `__class__`: 16752 defs compiled, 0
fallbacks, one error -- `SuperTwoArgLocalTestCase>>
testTwoArgSuperAcceptsNonModuleClasses` -- which passed alone and passed on
the probe's re-run, both flag-on, while a flag-off suite was running on the
same stone; recorded, not attributed.
