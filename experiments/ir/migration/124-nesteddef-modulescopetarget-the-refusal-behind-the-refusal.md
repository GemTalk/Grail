## `nestedDef:moduleScopeTarget`: the refusal behind the refusal (2026-09-16)

`cm:nestedDef:moduleScopeTarget` (3) plus the module-program row (1). `global f`
then `def f(): ...` inside a function binds no local — the def STATEMENT stores
the closure on the module. The closure is ordinary; only where its name goes
differs, and it goes through the same `dynamicInstVarAt:put:` the plain
assignment, the augmented assignment and the unpack all use, with
`___emitIRModuleReceiverOn___:` as the receiver.

### It refused twice over, and the second one is the point

Dropping the `moduleScopeTarget` guard alone moved all three corpus sites to
`nestedDef:nameNotLocal` and gained **nothing**: the def's name is not a local
precisely BECAUSE it is a module name, so the very next guard caught it.

| row | baseline | first version | with both guards |
| --- | ---: | ---: | ---: |
| `cm:nestedDef:moduleScopeTarget` | 3 | **0** | **0** |
| `cm:nestedDef:nameNotLocal` | 0 | **3** | 0 |
| `cm:eligible` | 13213 | 13213 | **13216** |

`cm:eligible` read 13213 either way. Only the row-by-row diff showed it, and a
totals-only reading would have called the first version an honest "+0 net, all
three uncovered behind it" — a shape this board produces legitimately all the
time. Both guards are part of this cut, and `testBothGuardsAreGone` asserts
both rows so the same mistake cannot pass again.

**The two-stage control bears that out**: with both guards restored, 2 of the 4
tests fail; with only the first dropped — the +0 state — exactly **one** fails,
and it is `testBothGuardsAreGone`.

### A decorated module-scope def is deliberately still refused

Under its own row, `nestedDef:moduleScopeTargetDecorated`.
`printSmalltalkOn:` re-stores the module binding for EACH decorator step and
reads it back between them with `dynamicInstVarAt: #f ifAbsent: [nil]`, which is
a different emit from the leaf-based decorator tail — a separate shape rather
than a harder one, and none of the corpus's four sites is decorated. The fixture
covers it anyway, and `testADecoratedModuleScopeDefStillRefuses` pins the row, so
what still refuses is measured rather than assumed.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:nestedDef:moduleScopeTarget` | 3 | **0** |
| `nestedDef:moduleScopeTarget` | 1 | **0** |
| `cm:eligible` | 13213 | **13216** |

Four sites, all closed, nothing moved. Same-tree baseline measured by reverting
`FunctionDefAst.gs` alone to `origin/main`.
