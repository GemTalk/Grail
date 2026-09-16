## `Comprehension:async`: three substitutions the statement form already had (2026-09-14)

`Comprehension:async` (11 class methods) refused a comprehension with any
`async for` clause. The refusal read as a missing feature — "a fourth shape not
emitted yet" — but for the COMPREHENSION it was three substitutions, all of
which `ForAst` / `AsyncForAst` already carry for the STATEMENT form:

| | sync | async |
| --- | --- | --- |
| iterator | `(src) __iter__` | `PythonCoroutine ___grailAiter___: (src)` |
| step | `___iterN___ __next__` | `___gen___ ___grailAwaitAnext___: (___iterN___ __anext__)` |
| exhaustion | `StopIteration` | `StopAsyncIteration` |

The clause emit now has the same three hooks the statement form does
(`___emitIRIteratorFrom___:on:`, `___emitIRNextFrom___:on:`,
`___irExhaustedExceptionSymbol___` there;
`___emitIRClauseIterator___:source:on:`, `___emitIRClauseNext___:from:on:`,
`___irClauseExhausted___:` here).

Three details are not cosmetic. The iterator goes through `___grailAiter___:`
rather than sending `__aiter__` inline, so `[x async for x in [1, 2]]` — an
ordinary mistake — is a catchable Python `TypeError` instead of an uncatchable
`doesNotUnderstand`. The step is awaited through the ENCLOSING coroutine's
`___gen___`, so a suspension inside `__anext__` suspends the whole comprehension
and reaches the driver. And `StopAsyncIteration` descends from `Exception`, not
`StopIteration`, so the sync handler would never have caught it.

### Keyed off the CLAUSE, not the comprehension

One comprehension may mix `for` and `async for` in either order, so the hooks
take the generator clause and read its own `is_async`. A per-comprehension flag
would get `[(a, b) for a in [1, 2] async for b in arange(2)]` wrong in one
direction and `[(a, b) async for a in arange(2) for b in [10, 20]]` wrong in the
other; the fixture pins both, plus two async clauses together.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:Comprehension:async` | 11 | **0** |
| `cm:GeneratorExpAst:async` | 4 | 10 |
| `cm:ForAst:async` | 0 | 1 |
| `cm:eligible` | 10778 | **10783** (98.5%) |

**11 retired, +5 net, and the six-def gap is the interesting part.** Retiring
this row uncovered the async GENERATOR EXPRESSION, which is genuinely the fourth
wrapper shape the old comment described: `PythonAsyncGenerator withBlock:` over
`___asyncYield___:`, with the outermost iterable bound into a wrapper-block
parameter at CONSTRUCTION time so nested genexps do not close over a shared loop
temp (`test_nested_comp`'s `run_gen_inside_list` is the case that forced that).
None of these three hooks reaches it — it is its own cut, and the census now
says so instead of the number being hidden inside this row.

### The control

With the refusal restored the fixture censuses 10 `Comprehension:async` and
compiles 2 of the 12, and the behavioural comparison **still passes on all ten
checks** — the text twin answers them correctly. Only the census moves, which is
the usual shape for an eligibility widening and the reason the census assertion
is not redundant with the behavioural one.
