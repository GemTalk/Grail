## PEP 695 type parameters: three rows, and only one of them had anything to emit (2026-09-16)

`typeParams` (2, module-program), `cm:typeParams` (2) and
`cm:nestedDef:typeParams` (2) — three rows, one mechanism.

At run time a type-parameter list is almost nothing: the function takes and
returns ordinary objects, and the names survive only as `__type_params__`.
Grail leans on that and ERASES them, keeping the names on the one def shape
that can hold them.

**Which shape that is settles the whole cut.** `___pyTypeParams___:` is a method
on `ExecBlock`, so only the CLOSURE form — a nested def — can carry the cascade
that records the names. A def compiling to a real method, at module scope or in
a class body, emits **nothing at all** for its type parameters. Measured on the
generated text for `def identity[T](obj: T) -> T` at module scope and on a
method: the names appear nowhere.

So two of the three rows had nothing for the IR path to reproduce and were
refusing out of caution. Dropping the refusal is the entire change for them. The
third needed one spec entry beside the qualname.

### The XFAIL is the price of that erasure, and it is older than this cut

`__type_params__` is unreadable on a module-level def on BOTH paths, because
such a def is reached as a `BoundMethod`, which has no such attribute; CPython
answers the tuple of parameter objects. Unchanged by this cut and pinned so a
later fix has to come through the fixture — the test asserts the two paths
AGREE and that the answer is still an `AttributeError`, so it fails when either
half moves.

### What the nested shape can get wrong

Its cascade joins the SAME spec list that carries the qualname, the code object
and the CLOSURE CELLS. Appending to the wrong one would drop a capture rather
than a type name — a wrong value, not an error — so the fixture includes a
nested def that both declares its own parameter and closes over an enclosing
local, and a test states that failure mode on its own.

### The board

| row | before | after |
| --- | ---: | ---: |
| `typeParams` | 2 | **0** |
| `cm:typeParams` | 2 | **0** |
| `cm:nestedDef:typeParams` | 2 | **0** |
| `cm:eligible` | 13213 | **13217** |

Six sites, all closed, nothing moved. Same-tree baseline measured by reverting
`FunctionDefAst.gs` alone to `origin/main`. `CENSUS.md` still wants one combined
re-measure once the family has landed.

Two docstrings went stale with this cut and were corrected rather than left:
`___irEligibleUnguarded___`'s "No decorators / PEP 695 type params yet" and
`___irNestedDefReasonUnguarded___`'s list of refused nested shapes, which still
named type parameters among them. That is the same slip #1002 made and had to
come back for.
