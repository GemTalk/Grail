## Progress — cut 86 (`super` as a VALUE, and what the biggest row was hiding)

Cut 55 taught the IR path the two `super()` CALL rewrites. What still refused
was `super` read as a **value**: `s = super`, `class mysuper(super)`,
`super.__init__`, `super(int, int, int)`. The text resolves the bare name to
the `Super` class -- through a run-time probe for a module-level shadow, because
`mock.patch` can set the attribute long after the module body compiled -- and
`___irSuperLoadKind___` / the `#superShadowed` emit reproduce exactly that,
`ifNil:` inlined as source compilation inlines it. The guards are the text's, in
its order: an enclosing function declaring `super`, or a module binding of the
name, stand the branch down.

The class-cell side effect (`CallAst classNeedsClassCell: true`, because CPython
makes a `__class__` cell for any method that so much as references `super`) has
already fired when the method's text twin was generated -- the same reasoning
`___irDunderClassLoadKind___` records for `__class__`.

### The row was 91 and it was mostly not about this

`NameAst:super` **91 -> 1** (the survivor correctly refuses: a function that
declares `super` itself). But corpus 2 class methods eligible moved only
**10396 -> 10399**, because 79 of those 91 were *masking* a different refusal:

| was | is now |
| ---: | --- |
| 79 | `CallAst:super-methodLocalClass` -- `super()` inside a method of a METHOD-LOCAL class |
| 4 | `CallAst:super-methodLocalClass` (stdlib, jinja2) |
| 2 | `CallAst:super-other` (test_super's argcount / argtype checks) |
| 1 + 1 | `CallAst:super-noClass` -- `super()` with no enclosing class |
| 1 | `NameAst:super-declaredInFunction` |

**This is the second time in two days that ranking by row NAME misled this
roadmap.** Cut 85 found the `frameSensitive` family was mostly ordinary calls
refused by name; cut 86 finds the biggest single row was 79/91 the method-local
class path wearing another row's label. The uncovering effect is recorded in
this document, but the lesson is stronger than "totals drop by less than the
row": *a row's name tells you which test refused FIRST, not which shape is
actually blocking the code.* You learn the latter by retiring the first one --
so a cheap cut that retires a row and re-labels its residue buys information
even when it buys few defs.

What it says here: **method-local classes are the real prize** --
`CallAst:super-methodLocalClass` 79 + 83 now joins `method:classNotAtModuleScope`
72, `method:methodLocalSlots` 17 and `method:methodLocalNestedClass` 11, all the
same family, and they are next.

### Measured

Corpus 2 class methods eligible 10396 -> **10399**; the row retired, the residue
correctly re-labelled, no `fallback` rows. Probe: 11 compiled, 0 fallbacks, IR
and text byte-identical, matching CPython on every shape except
`type(super.__init__).__name__` -- both Grail paths answer `function` where
CPython answers `wrapper_descriptor`, a pre-existing difference on the text path
too, so the fixture deliberately does not claim it.

Gates: flag-off `6592 run, 6592 passed`; flag-on cold `6592, 1 error`
(`PrivateNameMangling` alone -- #905 and #906 retired the other three this lane
carried, so the IR sweep is now ONE intermittent test from clean); tier 2
`OK 72 · FAIL 3 · ERROR 17`, gate 1 known regression / 2 improvements; fixture
gate 338 fixtures, 5628 OK.
