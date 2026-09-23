## The text twin was one literal

`test.test_builtin` scored **OK, 133 tests, 0 failed** on the text path and
**IMPORTERROR** under IR:

```
a CompileError occurred (error 1001), string literal too big (exceeds 5M bytes)
```

### What the literal was

A class with IR-built methods carries, class-side, the Smalltalk text each IR
method replaced -- `___irTextSources___` -- because the MI merge and three
other consumers re-compile a method's source, and an IR method's source is its
Python. The text path carries no twin: its methods' source already is the text.
That is why the failure could only ever appear under IR.

The table was **one accessor compiled from one string literal**, passed to
`___compileMethod:`, so every quote in it was doubled again. For `BuiltinTest`
that literal was 1,464,437 characters.

### Why 1.46M characters is over a 5M-byte limit

The limit is in **storage** bytes, and one character above U+FFFF anywhere in
the literal makes GemStone store all of it four bytes a character.
`test_builtin` is full of astral-plane test strings:

```
literal  1464437 chars  max codepoint U+10FFFF -> 4 bytes/char = 5.86 MB
```

A class of the same size in plain ASCII would have fitted with room to spare.
The cost of a twin is not its length; it is its length times the widest
character in the whole class.

### The fix

A table whose accessor would exceed a byte budget (1 MB, a fifth of the limit)
is split into chunk accessors, each filling a table it is handed, threaded by
the one `___irTextSources___` the reader has always asked for. The chunker
costs each entry at its outer-quoted size times its run's storage width, so a
run with an astral character pays for it and the runs around it do not:
`BuiltinTest` split four ways, and only the chunk holding the astral strings
is four bytes wide.

A class that fits in one literal -- all but a handful -- gets the single
accessor it always did, **byte for byte**, so the twin stays deterministic.

### The tests, and which one is evidence

`IRTextSourcesChunkedTestCase`, all three forcing IR (the text path builds no
twin, so a flag-off run exercises none of this):

| test | with the fix | emitter reverted |
| --- | --- | --- |
| `test_builtin.py` imports under IR | pass | **error**: `string literal too big` |
| a split table **equals** the whole one | pass | fail (nothing splits) |
| every merged method works from a split table | pass | fail (nothing splits) |

Only the first detects the defect. The other two guard the fix: what can go
wrong with a split is a LOST entry, which a consumer would silently answer
nil for. Each asserts that the table really split before trusting the
comparison -- an equality between two single accessors would pass and prove
nothing. A session override of the budget makes a seven-method fixture split,
where proving it on a class big enough to need it would take a 1.3M-character
fixture.

### Gates

| gate | result |
| --- | --- |
| fixtures | 442 fixtures, 7327 OK, 54 XFAIL, all agreeing with CPython |
| full suite, text | 7265 run, 7265 passed, 0 failed, 0 errors (8 of 8) |
| corpus, default | `0 regression(s), 6 improvement(s)` |
| corpus, IR vs text | `test_builtin` OK in both arms |

The IR-on suite's remaining defects are unrelated to this change: the
recursion-depth pair, and eleven from `obj.x op= v` whose TEXT store #1123
moved to `__setattr__` -- the next cut.
