## `GeneratorExpAst:async`: a row that was already closed (2026-09-18)

**This is a correctness fix, not a migration cut.** It closes no census row. It
is filed here anyway because the row it was *aimed* at is still on the board,
and the next person to pick the top of the roadmap will pick this one.

### What the cut actually changes

PEP 530 evaluates a generator expression's OUTERMOST iterable — and
`__aiter__`s it — at CONSTRUCTION, in the enclosing scope. The outermost clause
must therefore not acquire it a second time: a second `__aiter__` is a protocol
violation for a one-shot iterable, and the sync path's habit of calling `iter()`
twice (harmless, since `iter(iter(x)) is iter(x)`) does not carry over.

The already-acquired flag is now threaded down from `___emitIRGenerators___`,
which knows whether construction supplied a source, rather than re-derived
inside the clause emit from `srcBlockOrNil` — which is **never nil for a first
clause**, so the flag was effectively always set.

Getting it wrong is silent for every well-formed genexp. It shows up only on a
LIST comprehension, which supplies no construction-time iterator and so stopped
acquiring one at all: `[x async for x in [1, 2]]` drove a raw
`OrderedCollection` and died with an uncatchable env-0 DNU instead of the
`TypeError` CPython raises. That is why the fixture pins the list-comprehension
side as its own test.

### The row was already closed when the board recorded it

`CENSUS.md` listed `GeneratorExpAst:async` at 10 class methods — the largest
single refusal left. A corpus census of both arms (the cut, and a same-tree
baseline with only `ComprehensionAst.gs` reverted) is **identical across all
four census scripts**, and the row is **absent from both**. `test.test_asyncgen`
imports fine in both and contributes `cm:eligible 111`, with no refusal row at
all, so this is not a module dropping out of the corpus.

Both cuts that plausibly closed it — `2e80e92b` (2026-09-14) and `f2885019`
(2026-09-07) — are *ancestors* of the board commit. So the board recorded 10
refusals for a shape that was already eligible when it was measured. The
mechanism is unproven; the most likely one is a census run against a stale
install, which is exactly what the "run the census immediately after
`install.sh`" rule exists to prevent.

Two other rows have also gone stale, for a total of 13 methods:

| row | board (2026-09-16) | measured now |
| --- | ---: | ---: |
| `GeneratorExpAst:async` | 10 | gone |
| `nestedDef:typeParams` | 2 | gone (#1012) |
| `typeParams` | 1 | gone |
| `cm:eligible` | 8426 | **8439** |

8426 + 13 = 8439 exactly — those methods became eligible, they were not
re-attributed to another reason.

### The lesson: a test that cannot fail

The first version of this branch shipped four tests, two of which were
**vacuous**, and the control is the only thing that found them.

`testTheAsyncGenexpRowIsGone` asserted that no census key contains
`GeneratorExpAst`. That assertion passes against a full revert of the cut,
because the key is absent either way — `nestedDef` refuses every genexp in the
fixture first, so the row name never appears. It carried a comment calling
itself "the assertion that fails if the cut is reverted." It was deleted rather
than repaired: there is nothing in this fixture for it to discriminate.

`testTheIRArmActuallyCompiledTheFixture` is kept, because it only claims to be a
guard against a total fallback, which is true and worth having.

What survives is the behavioural test, and its detection power is measured
rather than assumed. Reverting only `ComprehensionAst.gs`:

```
a_one_shot_source_is_not_restarted: ([1, 2, 3], 2) vs ([1, 2, 3], 1)
```

**A control has to be one the instrument can report.** The first control
reverted to this branch's own WIP commit, whose message reads "has an unresolved
hang" — that state's defect is an uncatchable DNU inside a coroutine, and
SUnit's handler recurses on it, so the run spun for 4h24m at 100% CPU instead of
failing. Meanwhile a `4 run, 4 passed` left in `out/one.out` by an earlier run
sat there looking like the answer. Reverting to `origin/main` instead gives a
6-second arm that names the defect.
