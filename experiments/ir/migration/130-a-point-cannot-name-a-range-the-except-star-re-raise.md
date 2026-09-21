## A point cannot name a range: the except* re-raise position

The last module where the flag-on corpus was worse than flag-off.
`test.test_traceback` read `OK` off and `FAIL 1` on, from 2026-09-10 until now.

### What CPython blames

A re-raise out of an `except*` clause is blamed on the WHOLE CLAUSE -- keyword
through the end of its body -- so the frame renders two source lines:

```
  |   File "...", line 6, in exc
  |     except* Exception as e:
  |         raise
```

That extent belongs to NO AST NODE, which is the whole difficulty. The
handler's own `endPosition` is wherever the clause is followed by -- the next
line for a def at column 0, the next STATEMENT for anything indented -- and its
last statement's is no better, because a bare `raise` answers one character past
its start. Where an indented block ends is a fact about the TEXT, so both paths
have to scan for it.

### What each path did

The text stores a literal PEP 657 span in `___curPos___` between the two finish
calls -- two calls existing precisely so a store can sit between them, because
an unhandled remainder is blamed on the try body and a re-raise on the clause.

The IR path stamped a POINT:

```smalltalk
aBuilder at: (handlers at: 1) beginPosition.
```

`at:` sets an offset; `atNode:` is what records a position-map ENTRY, and an
entry is a six-field range. The reader answers a point with the smallest
recorded RANGE containing it -- and with no entry for the clause, that was the
enclosing def's.

**The emit's own docstring argued this was fine:**

> WHAT THIS EMIT DOES NOT REPRODUCE, and why that is right rather than a gap …
> the IR path passes ``pos: nil'' to ___pushCatchingFrame___ throughout and
> derives every line from the captured ips instead.

Deriving from an ip works for a REAL frame. The frame here is a SYNTHESISED
catching frame, pushed by `___pushCatchingFrame___`, which has no ip of its own.
The docstring is corrected rather than deleted, because the reasoning it records
is right about every other catching frame.

### Two nestings, failing differently

Worth keeping because a fixture with only the first would have understated it:

| shape | flag-off | flag-on, before |
| --- | --- | --- |
| module-level def | line 6, both lines | line 6, **one** line |
| def nested in a method | line 14, both lines | **line 11** -- `def nested():` plus `...<3 lines>...` |

Same cause: with no clause entry the reader falls back to the innermost entry
that does contain the stamp, and for a nested def that is the def's own -- which
also drags the LINE back to the `def`.

### The fix

* `TryAst>>___exceptStarClauseSpanFieldsFor___:` -- the source scan, factored
  out of the text's literal builder so BOTH paths compute the clause extent in
  one place. They are answering the same question; having two scans is how they
  drift.
* `TryAst>>___irExceptStarClauseSpanFor___:` -- that, as a position-map entry in
  module offsets.
* `PyMethodIRBuilder>>at:span:` -- stamps and arms an EXPLICIT entry, mirroring
  `atNode:` exactly (same clamp into the attached slice, same "outside the slice
  earns no entry", same armed-not-recorded discipline) for a range no node has.

The call site falls back to the old point stamp if the scan raises, so a node
that cannot say where it is costs precision rather than the compile -- the same
guard every other reader of the column accessors uses.

Still only with ONE clause, in a function. Which clause re-raised is a runtime
fact and one compile-time span cannot name a different one per run; the fixture
pins that case separately so a later cut cannot quietly widen the condition.

### The board this closes

Both arms, same tree, same machine:

```
flag OFF   OK 74 · FAIL 3 · ERROR 17 · SKIP 1 · IMPORTERROR 9 · CRASH 0
flag ON    OK 74 · FAIL 3 · ERROR 17 · SKIP 1 · IMPORTERROR 9 · CRASH 0
```

`test.test_traceback` is OK in both. **No module is worse under IR any more**,
and the three that still differ are all IR ahead: `test_asyncgen` 6 -> 5
failures, `test_contextlib_async` 2 -> 1 errors, `test_xml_etree` 35 -> 34.

SUnit is `6996 run, 6996 passed, 0 failed, 0 errors` in both arms, 8/8 shards.
The denominator moved from the 6985 of cut 129 and was ACCOUNTED FOR rather than
accepted: main gained `ModuleSpecTestCase` (5) in #1068 and
`IndexedSlotRebuildTestCase` gained 3, plus this cut's 3.

### Controls, and one that came free

The fixture's discrimination was measured by accident and then kept: a run that
landed on the unfixed image -- because the patch was reapplied without a
reinstall -- printed 5 of 12 keys as DIFF (`module_shows_the_raise` and all four
nested keys). That is the control, and it is stronger than a contrived one
because nothing about it was arranged.

`TracebackTestCase>>testRecursionContextChain` errors when its class is run
ALONE in one session while passing in the sharded suite. Controlled against a
clean `main` tree: identical, `60 run, 59 passed, 1 error` both ways. Not this
cut, and not new.

Two of this cut's own mistakes, both caught by running the fixture under CPython
before trusting it:

* a temp named `endLine` collides with an instance variable
  `AbstractLocationNode` already declares -- GemStone CompileError 1030,
  "variable has already been declared", not a shadow;
* the nested clause's expected line was counted from the OUTER def and was two
  short. The fixture now locates it from the inner function's own code object,
  which cannot drift as the file is edited.
