## `ForAst:tupleTargetShape`: a real emit gap, and which shape to copy (2026-09-16)

`cm:ForAst:tupleTargetShape` (3). `for a, b, *rest in xs` refused.

**Unlike most rows in this family this is a genuine emit gap, not an over-wide
refusal**, and the note said so exactly: *"the text's star shape needs a
Smalltalk arithmetic send the IR emit does not yet make"*. The elements after
the star are indexed from the END, which takes a subtraction on the sequence's
length.

### Which shape to copy was the whole decision

Grail ALREADY had a starred unpack — `AbstractNode>>___emitIRUnpack___:from:holder:on:`,
for `a, *b = xs`. It goes through `___unpackSequence___ ___unpackCheck___:star:after:`
and reads the star with `___getslice___:_:_:`. Reusing it here would have been
less code and a better shape.

`printSmalltalkOn:` does not spell a for-loop target that way:

```smalltalk
a   := (src __getitem__: 0).
mid := (list @env1:__new__:
          (src __getitem__: (slice @env1:__new__: 1 _: ((src __len__) @env0:- 1)))).
z   := (src __getitem__: ((src __len__) @env0:- 1)).
```

**And the difference is observable.** With too few values,
`___unpackCheck___:star:after:` raises CPython's `ValueError: not enough values
to unpack`; the for-loop's slice shape runs off the end with an `IndexError`.
Borrowing the assignment's shape would have made a loop raise a DIFFERENT
EXCEPTION under the flag than without it — the one divergence the seam exists
to prevent. So the text's shape is reproduced send for send, `- 0` of a
trailing star included, and the gap is pinned as the fixture's XFAIL.

`testBothPathsAgreeOnTheTooFewError` asserts the two paths AGREE rather than
that either is right, so it fails when the text's loop unpack is fixed and both
sides move together.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:ForAst:tupleTargetShape` | 3 | **0** |
| `cm:eligible` | 13213 | **13216** |

Three retired, **+3 net** — nothing moves up behind it. Same-tree baseline on
the `main` this branch was cut from (`2ecc3607`), measured by reverting
`ForAst.gs` alone to `origin/main`, re-running `install.sh` and censusing again.

**A note on the first measurement of this cut**, because it is the mistake this
board warns about twice already: it was taken on a tree that still carried the
`nestedDef:super` cut, and read `cm:eligible` 13213 → 13218. Both cuts were
real and the rows do not overlap, so nothing was wrong with the number — it was
just two cuts' delta reported as one. Re-measured with `ForAst.gs` alone on a
branch from `main`. `CENSUS.md` still wants one combined re-measure once the
family has landed.
