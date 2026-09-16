## `except*`: the first cut that is a genuinely new emit (2026-09-13)

`shape:TryAst-exceptStar` (25) was the top row on the board once the
frame-sensitive family came down, and unlike everything else closed today it was
not a guard wider than its reason. PEP 654's clauses are **not alternatives**:
every clause runs, each taking its matching sub-exceptions out of the group and
passing the remainder on, and whatever is left at the end is re-raised. The
ordinary path's nest of `on:do:` runs only the first matching clause, so no
amount of widening reaches this — it needed the emit.

### The shape

```smalltalk
[ body ] on: BaseException do: [:ex | | rest norm rr |
    <push catching frame>
    norm := normalize(ex).  rest := norm.  rr := OrderedCollection new.
    rest := clause(rest, T1, rr, [:g | n1 := g.  body1]).
    rest := clause(rest, T2, rr, [:g | n2 := g.  body2]).
    finish(rest, ex, rr).
    finishReraised(rest, ex, rr, norm) ]
```

One handler block threading a remainder, not a nest. The normalized group is
kept separately from the remainder because the remainder is consumed clause by
clause and the final merge needs the whole group back to project onto.

Three pieces were already available and are what kept it to one method:
`blockWithArgs:temps:do:` for `[:___ex | | rest norm rr |]`,
`___emitIRModuleScopeStoreOf___:from:on:` for the `as` binding (a
`global`-declared as-name binds the module variable, not a method local), and
`pushHandlerEx:` so a bare `raise` in a clause body names the right `___ex`.

The finally wrapper is shared with the ordinary path, so the split is in
`___emitIRProtectedPartOn___:` — exactly where `printSmalltalkOn:` splits it.

### What the emit deliberately does not copy

The text stores `___curPos___` between the two finish calls so its backwards
text scan blames the `except*` CLAUSE for a re-raise and the try body for an
unhandled remainder. That is a TEXT mechanism: the IR path passes `pos: nil` to
`___pushCatchingFrame___` throughout and derives every line from the captured
ips. The same distinction is a builder stamp here, applied under the text's own
condition (one clause, inside a function) for the text's own reason — CPython's
answer is which clause actually re-raised, a runtime fact, and one stamp cannot
name a different clause per run.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:shape:TryAst-exceptStar` | 25 | **0** |
| `cm:eligible` | 10708 | **10733** (98.1%) |

Re-measured on each rebase rather than carried forward: this board read
10642 -> 10667 against the main it was written on, 10689 -> 10714 after #959
landed, and 10708 -> 10733 after #960. **The delta is +25 every time**, which is
the useful part — three independent baselines and one constant says the cuts do
not overlap, where a single measurement could not have told them apart.

The diff is those two lines and **nothing else** — no row moved up, so not one
of the 25 refuses on a second reason. Fallbacks 0 across all three census
shards. The smoke pin does not move (640).

Two new named exits replace the row, neither reachable from Python as it stands:
`exceptStarMixed` (star and non-star clauses in one statement, which the parser
rejects) and `exceptStarNoType` (`except*:` with no type, a SyntaxError). Named
rather than dropped so a future parser change cannot make the row reappear
without saying which shape it is.

### CPython corrected the fixture twice

Worth recording because both would have been plausible guesses:

* **`return` is a SyntaxError inside an `except*` block** — PEP 654 forbids
  `break`, `continue` and `return` there. Two checks had to collect into a local
  and return after the statement.
* **an exception raised by a clause body propagates BARE**, not wrapped in a
  group, when there is no unmatched remainder to merge it with.

Both are now in the fixture as written rather than as assumed.
