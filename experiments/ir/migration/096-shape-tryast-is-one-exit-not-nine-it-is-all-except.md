## `shape:TryAst` is one exit, not nine: it is all `except*` (2026-09-11)

The largest remaining codegen row was also the least informative: `shape:TryAst`
is `AbstractNode`'s DEFAULT refusal detail, which answers the bare class name.
Twenty-five rows that named the statement and not one thing to fix.

`TryAst >> ___irRefusalDetail___:` now mirrors
`___irEligibleStatementLocals___:`'s order and names the exit. Re-censused, the
answer is unambiguous:

| row | count |
| --- | ---: |
| `shape:TryAst-exceptStar` | **25** |
| every other TryAst exit | 0 |

**All of it is PEP 654 `except*`.** None of the other eight exits — an
ineligible except TYPE, an `as` target that is not a known local, a body that is
not a statement block — occurs anywhere in the corpus.

### What that costs

`except*` is not a predicate to read; it is an emit Grail does not have. The
text gives it a **wholly separate** 111-line `printExceptStarOn:`, because the
ordinary nested-`on:do:` shape encodes "first matching clause wins, the rest are
alternatives" and `except*` means the opposite — the raised group is SPLIT and
every clause runs against its own share:

    [ body ] on: BaseException do: [:ex |
        rest := normalize(ex).
        rest := clause(rest, T1, [:g | n1 := g. body1]).
        rest := clause(rest, T2, [:g | n2 := g. body2]).
        finish(rest, ex) ]

The remainder is THREADED through the clauses. So this row is feature work of
the same kind as the frame family, not another guard-wider-than-its-reason.

It is, however, the more tractable of the two: the shape is fully specified by
an emit that already exists and works, the threading is mechanical, and its
blast radius is one statement type rather than the traceback path. **Ranked
against the 129-row frame family, `except*` is the better next cut per unit of
risk**, even though it is the smaller row.

### The lesson is about the default, not about try

A node whose class HAS an IR predicate but no `___irRefusalDetail___:` override
censuses as `shape:<Class>`, and that name cannot distinguish a cheap exit from
a feature. `shape:TryAst` sat near the top of the board for weeks meaning
"something about try", when it meant one specific thing the whole time.

**Before costing any `shape:*` row, add the override and re-census first** — it
is census-and-eligibility-only, costs one method, and here it converted the top
codegen row from an open question into a decision. Worth doing for
`shape:CompareAst` (7) and any future `shape:` row for the same reason.

### The board after naming this row

| row | count | kind |
| --- | ---: | --- |
| `CallAst:frameSensitive-exec` | 77 | frame machinery |
| `CallAst:frameSensitive-eval` | 52 | frame machinery (same cut) |
| `shape:TryAst-exceptStar` | 25 | `except*` emit |
| `NonlocalAst:notLocal` | 21 | unread |
| `classDef:nonlocalBelow` | 19 | unread |
| `method:methodLocalSlots` | 17 | unread |

The three "unread" rows have not had their predicates read yet, and on this
board's recent record — three rows in a row closed by reading one — that is
where to look before building anything.
