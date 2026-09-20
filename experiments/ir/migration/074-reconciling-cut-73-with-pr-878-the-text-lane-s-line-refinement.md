## Reconciling cut 73 with PR #878 (the text lane's line refinement)

#878 landed while cut 73 was in flight and moved the text path in the same
area: a frame's LINE now comes from the position map, not only its columns. Two
things had to change here, and one thing deliberately did not.

**The `onLine:` filter is gone.** Cut 73 filtered the IR map lookup to the caret
scan's line, so that a span could never disagree with the line the frame
reported. That was right while the map refined columns only. Once the LINE also
came from the map, filtering on the caret line would have restricted the span to
a line the frame no longer claims to be on, and the caller's `span line = frame
line` gate would have thrown the columns away. `___irPythonSpanForMethod___`
now takes the map's own line, so it agrees with `___tracebackLineForMethod___`
by construction. That also restores `___mapSpanForMethod___:ip:` to main's exact
form.

**The footprint on shared text code is now three lines** — the dispatch in
`___pythonSpanForMethod___:ip:`, which mirrors the one main already has in
`___pythonLineForMethod___:ip:`. Everything else the IR path adds is new
IR-only methods. The two lanes read one map FORMAT and one parser, and keep
their policy apart.

**What did not change: the IR line stays send-granular.** #878's new control
`testALiveFrameKeepsTheStatementsLine` fails under the flag, and a control run
says it did so BEFORE cut 73:

| test, flag on | origin/main (has #878, not cut 73) | with cut 73 |
| --- | --- | --- |
| `testANestedOperandIsBlamedForItsOwnRaise` | FAIL | PASS |
| `testALiveFrameKeepsTheStatementsLine` | FAIL | FAIL |

So cut 73 fixes one and does not cause the other. The failing one asserts that a
LIVE frame keeps the coarse statement line. The text path gets that coarseness
free, because its `___curPos___` scan is statement-granular; the IR path is
send-granular by construction, which is the point of compiling Python straight
to IR — every IR node carries the offset of the AST node it came from, so a
frame names the SEND in flight rather than the statement containing it.

Coarsening the IR line to the statement was tried and reverted. It would buy
this one test by discarding the property the whole approach exists to provide.

**The root cause is not a position at all.** #878's own analysis names it:
`traceback.walk_stack` answers a LIST here and a generator in CPython, so when
the stack is read the frame is suspended at `walk_stack(` in Grail and at
`extract(` in CPython — two lines of one statement. A statement-granular line
hides that; an exact one reports it. #878 records making `walk_stack` a
generator as the fix and defers it as its own change. That is the text lane's
call and its file (`src/python/stdlib/traceback.py`), so it is not taken here.
Until it is, this is a known IR-path divergence with a named cause, not an open
defect in the map.
