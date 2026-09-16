## Progress — cut 7 (IR methods are first-class in tracebacks)

An IR method's frame now appears in a Python traceback with the correct absolute
line and source text — verified end to end: a text `run()` calling an IR `bad()`
that raises reports `File "tb2.py", line 3, in bad / return x + "oops"`.

How it fits together:
* **Absolute lines.** `_lineNumberForIp:` is useless for IR methods (empty line
  table), and `methNode lineNumber:` does NOT shift the VM's line base. So the
  attached source is the def slice **prefixed with `beginLine-1` newlines**: the
  VM counts newlines from the start, so a source line's position IS its module
  line. `sourceBase = defBegin - beginLine + 1` rebases node offsets into it.
* **Recognition.** `BaseException>>___isGeneratedPythonMethod___:` (which gates
  whether a frame is Python) now also accepts a source that, trimmed, begins
  with `def `/`async def ` — the IR method shape — via
  `___sourceMarksGeneratedPython___:`. A hand-written Smalltalk method never
  does. `___isIRPythonMethod___:` is the IR-specific test (def-prefix, cached).
* **Line derivation.** `___pythonLineForMethod___:ip:` routes an IR method to
  `___irPythonLineForMethod___:ip:`, which reads `_sourceAtIp:`'s caret and
  counts the source lines at/above it — the absolute line, since the source is
  padded to module line numbers.

**Known flag-on interaction (inherent, not a regression):**
`LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource` asserts a
def carries `___curPos___` as a METHOD TEMP (the text fast path that recognises a
Python frame with no source read). IR methods have no `___curPos___` temp — they
use the native-offset path above — so this text-specific test fails when the flag
is forced on. Off by default, so it passes normally.
