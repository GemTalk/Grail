## The `classNotAtModuleScope` row was one shape, not two (2026-09-11)

`___irMethodModeReason___` answered `method:classNotAtModuleScope` from TWO
different exits, so the row could not say which of them the ranking was about:

* no module class at all — an exec/eval doit's scope, which has no transport
  helper to hang a shared build on;
* a class nested DIRECTLY inside another class body, emitted as a class-body
  VALUE rather than through cut 76's helper.

Those want different fixes, so a single number was the wrong instrument. Split
into `method:doitScopeClass` and `method:classInClassBody`, and measured on both
corpora with the flag forced:

| corpus | `classInClassBody` | `doitScopeClass` |
| --- | ---: | ---: |
| stdlib | 3 | **0** |
| corpus 2 (suite manifest) | 69 | **0** |

**The whole 72 is the class-in-a-class-body shape, and the doit exit is
unreachable in practice.** That was worth measuring rather than assuming: the
expectation going in was a mix, and a cut aimed at the doit half would have
retired nothing at all. What the row actually asks for is that a class nested
in a class BODY get the same shared-build treatment cut 79 gave a method-local
class — one target, not two.

Ranked against its neighbours it is now third, behind
`CallAst:super-methodLocalClass` (79) and `CallAst:frameSensitive-exec` (77),
and ahead of `CallAst:frameSensitive-eval` (53). The two frameSensitive rows
are the nested-def frame cut, which is frame machinery rather than codegen.
