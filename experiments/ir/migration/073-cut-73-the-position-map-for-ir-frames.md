## Progress — cut 73 (the position map for IR frames)

Retires fourteen of the fifteen flag-on residue items, which were all one cause:
an IR method carried no position map, so a frame could report a line but never
columns.

**The half that did not need building.** A text-compiled method needs two hops
-- ip to Smalltalk offset, then Smalltalk offset to Python node -- and only the
second is knowable at emit time, which is why `PrettyWriteStream` records it.
An IR method needs no Smalltalk hop at all. `PyMethodIRBuilder>>stamp:` already
writes each node's PYTHON offset onto its IR node, and GemStone keeps one source
offset per step point inside the method (`_numSourceOffsets` /
`_sourceOffsetsAt:`), so `_previousStepPointForIp:` + `_sourceOffsetsAt:` answer
a Python offset directly. Measured on `nested_operand_span.py`: 17 IR methods,
99 step points, 82 of them carrying a distinct stamped offset and exactly one
per method reading offset 1 (the prologue, which has no Python node behind it).

So the only thing missing was offset -> span, and the reader needs no new
parsing: `___mapSpanForMethod___:ip:` reads the same `"___GRAILPOS___ ..."`
trailing comment, byte for byte, in whichever coordinate system the method was
built in. One reader, two paths.

**Why the map records a RANGE and not a start.** An offset alone cannot name a
node, because nested nodes routinely share a `beginPosition`. Dumping the step
points of `return [(1, 2 + 1 / 0)][0]`:

| step | offset | source there |
| ---: | ---: | --- |
| 2 | 119 | `1 / 0` |
| 3 | 115 | `2 + 1 / 0` |
| 4 | 111 | `(1, 2 + 1 / 0)` |
| 5, 6 | 110 | `[(1, 2 + 1 / 0)]` **and** the subscript |
| 7 | 103 | `return ...` |

Steps 5 and 6 are different operations at the same offset. Recording each node's
extent and taking the smallest containing range is what separates them -- the
rule main's reader already applies, arrived at independently from the same
constraint.

**Three things that had to be got right, each found by a test rather than by
reading.**

*An entry earns its place only if a send can land in it.* The text map tests the
generated text (`sendFreeFrom:to:`); the IR map reaches the same rule
structurally -- `atNode:` only ARMS an entry and `stamp:` commits it when the
node it stamps is a send. It matters more here, because resolution is by
smallest range: the literal `1` in `1 / 0` is one character wide, so recording it
won every lookup the division should have won and every traceback underlined
`1`. Measured exactly that way before the commit was made conditional.

*A compound node must not stamp where its leading child stamps.* `_bad +
(_other)` and `_bad` begin at the same character, so both step points reported
the same offset and the narrower operand won. The text path never had this
problem: its step point lands on the SELECTOR, which for `a ___binOpAdd___: b`
sits between the operands. `___irStampChild___` puts the IR stamp in the same
place -- just past the leading child -- while the recorded range stays the
node's own. Six overrides (BinOp, Compare, BoolOp, Subscript, Attribute, Call)
and a nil default; no call site changed.

*The stamp must be the LAST thing before the send it labels.* Two emitters set
it and then built their arguments, and each argument's own emit overwrote it:
`assert x > 0, 'must be positive'` underlined the MESSAGE, and `_boom(lambda: 1 +
1)` gave the calling frame the LAMBDA's span. Both now stamp immediately before
the send. This is the one rule a new emitter can get wrong silently, so it is
stated in `stamp:`.

**Two guards carried over from the text path, for the same reasons.** Nodes
parsed from an f-string replacement field claim line 1 column 1
(`___markFragmentPositions___`) and are neither recorded nor stamped -- a line-1
range would nest inside the true one and win, blaming line 1 of the file. And
asking a node for its columns can RAISE: `column`/`endColumn` scan the module
source backwards, and linecache's module body and one nested `__init__` both
failed there. Unguarded that is worse than imprecision, because an IR compile
that raises is a silent fallback to text -- it cost 2 of 818 smoke defs before
the guard went in. Every other reader of those accessors guards them the same
way.

**One test changed rather than one behaviour.**
`NestedOperandSpanTestCase>>testAMultiLineExpressionKeepsTheStatementsLine`
asserts a documented coarseness: a multi-line expression keeps the statement's
line. That coarseness is a property of recovering the line by SCANNING for a
per-statement `___curPos___` store -- the store is the statement's, so the line
is. An IR method has no store and no scan, so its frame was already on the
operand's line before any map existed, and the map only gives it columns that
agree. The test now asks the module which path built it and expects CPython's
answer on the IR path. This cut changed no line on either path; the live-frame
-chain hazard the guard exists for is untouched.

**The one residue item left, by name.**
`TracebackTestCase>>testForLoopExceptionPositions` / `tuple_target_span`. `for
a, b in LateBreak():` inside a `try`: the catching frame's ip resolves to the
try's own `on:do:` step point (offset 239, the `for` keyword), which no map
entry covers, so it gets no columns. The text path wins this one differently --
it reads the RUNTIME `___curPos___` value, not an ip -- and main's
`___refineCatcherPos___:span:` supplies a catcher's columns from the protected
block's span. That path is not yet wired for IR blocks, which is the next cut,
not a defect in this one. Stamping the loop's outer `on:do:` sends at the
iterable (which they should be anyway, since an iterator-protocol raise belongs
to the iterator expression) was necessary but not sufficient.

**Gates.** Flag-off 6535 run / 6535 passed. Smoke tripwire 4/4 with 818
compiled and 0 fallbacks. Span classes under the flag: NestedOperandSpan 2/2,
RaiseSpan 1/1, SpanEndToken 1/1, PythonOffsetMap 4/4, WithItemPositions 7/7,
LambdaFrame 1/1, PrivateNameMangling 1/1, ShortCircuitOperandSpan 1/1.

**An operational note that cost a gate.** Main's PR #876 took the suite from
four shards to eight, so one `run_tests.sh` now opens eight GemStone sessions.
Two worktrees on one stone need sixteen and exceed its limit: three shards died
with "Login failed: the maximum number of users are already logged in" and the
runner still printed a well-formed `4288 run, 4288 passed, 0 failed`. A suite
line is only a gate result if `grep -h GRAIL_SHARD_RESULT out/shard_*.out | wc
-l` is 8. The lanes must serialize their suite runs.
