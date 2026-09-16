# The IR cut log

One file per cut, oldest first. **The directory listing above is the index** —
the numeric prefix is the order the work happened in, and the slug is the cut's
own heading. There is deliberately no generated list of links here; see below.

Each note is self-contained: what the census row was, what the text emits for
that shape, what the emit rule required, what the census measured before and
after, and what went wrong on the way. The last part is not decoration — more
than one cut in this log was saved by a control that failed, and a few were
shipped only after an instrument was caught measuring nothing.

See [../MIGRATION.md](../MIGRATION.md) for the plan the log belongs to, and
[../CENSUS.md](../CENSUS.md) for the progress metric the rows come from.

## Adding a cut

Write `NNN-<slug>.md`, where `NNN` is the next free number and the slug comes
from the note's own `##` heading. Nothing else needs editing — that is the
entire point of the layout.

## Why there is no index file

This log used to be one section per cut appended to the end of `MIGRATION.md`.
A pure end-of-file append with no edit to shared text is the shape MOST likely
to conflict: any two cuts in flight resolve against the same three lines of
trailing context, and those lines were the previous cut's `### The board`
table, of which there were eighteen. Git spliced one cut's prose onto another
cut's numbers and called it a merge, repeatedly.

Splitting the log one file per cut removed that anchor — two cuts in flight add
two different paths, and different paths cannot conflict. What survived was a
generated index carrying one line per cut, which sounds harmless and was not:
measured across the ten cuts in flight at the time, **9 of 9 concurrent pairs
still collided**, just one line at a time instead of sixty.

Two fixes were measured before this one:

* **sorting the index by title** left 6 of those 9 pairs colliding. Cuts named
  after census rows (`AssignAst:…`, `nestedDef:…`) cluster alphabetically just
  as they do chronologically, so the scatter that worked for `install.gs`'s 694
  test classes does not work here;
* **`merge=union`** resolves it correctly in a local merge — and does nothing
  for the problem, because *GitHub's server-side merge does not run the union
  driver*. That is measured and recorded in `.gitattributes` for
  `docs/Issues.md`: on 2026-08-31 eight queued PRs went UNMERGEABLE, and the
  only two that did not were the only two that left that file alone. Union
  merge also appends rather than sorts, so the merged index came out in the
  wrong order and needed regenerating anyway.

So the index was deleted instead. A directory listing is an index that no two
branches ever have to edit, and it is the only option of the four that reaches
zero. The cost is that a cut's full heading — backticks, punctuation, no
truncation — lives inside its file rather than in one list; the filename slug
carries enough to find it.

The general rule this leaves behind: **a shared append-only list will collide
on GitHub no matter what merge driver it is given.** If concurrent branches
must each register something, give them each a file.
