## Progress — cut 2 (source attachment)

The IR method now carries its def's **Python source** (`PyMethodIRBuilder`
`fileName:source:` + `sourceBase:` + per-node `at:` stamping from each node's
`beginPosition`), so `sourceString` is the Python def and `_sourceOffsets` map
step points to it. This fixed the one flag-on interaction
(`UnboundLocalErrorTestCase>>test_parameter_read_emits_no_guard`, which
introspects the generated source) — flag-on suite green again.

**The traceback line path is NOT done yet** and was deliberately backed out
rather than shipped wrong. Findings for whoever picks it up:
* `_lineNumberForIp:` is the WRONG API for IR methods — it reads a precomputed
  line *table* that `generateFromIR:` does not populate, so it answers 1 for
  every ip. The working mechanism is the source-offset one (`_sourceAtIp:` /
  the stack report), which for a source-mapped IR method reports the right
  line — verified: a hand-built raiser shows `@2 line 4` (absolute) with WHOLE
  module source, `line 2` (slice-relative) with a def slice.
* So the line base matters: with a def **slice** the VM counts newlines from the
  slice start (relative); `methNode lineNumber:`/`firstLine:` does NOT shift it.
  Either attach whole-module source (absolute lines, but O(defs×moduleSize)
  memory) or prepend `beginLine-1` newlines to the slice (absolute lines, tiny).
* The frame's ip (from `st at: i+1`) may already be a STEP POINT — `_sourceAtIp:`
  and `_sourceOffsetsAt:` (which takes a step point: 1→1, 2→20, 3→13) are the
  pieces; `ex _gsStack` is nil for a plain Smalltalk DNU, so end-to-end testing
  needs a real Python raise (i.e. wait for the Call/BinOp cut).
* Recognition marker for an IR method: its `sourceString`, leading-whitespace
  trimmed, begins with `'def '` — Smalltalk method sources never do. A
  ``module``-subclass-plus-no-``___curPos___`` test is NOT enough: a trivial
  module body's `initialize` also lacks `___curPos___`.
