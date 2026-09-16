## Where we are (2026-09-10, after cuts 81-86)

Same denominators as `CENSUS.md` (stdlib 1592 top-level / 4621 class-body;
corpus 2 1327 / 10942), regenerated on the combined tree with `./install.sh`
immediately before.

| | stdlib | corpus 2 (suite manifest) |
| --- | ---: | ---: |
| top-level defs compiled | 1582 / 1592 (99.4%) | 1312 / 1327 (98.9%) |
| class-body methods eligible | 4585 / 4621 (99.2%) | 10396 / 10942 (95.0%) |
| all defs through IR | **96.1%** | **94.3%** |

Corpus 2 has gone 73.5% -> 81.1% -> 91.0% -> 93.9% -> **94.3%** over cuts
79-85.

Cuts 82 and 83 were developed in parallel and their eligibility deltas are
exactly additive: 10260 + 62 + 34 = 10356.  So is the smoke count, 563 + 23 +
9 = 595 -- measured, not assumed, and not a rule to rely on next time.

**What is left, ranked, with the tractability read rather than the row name.**

* `NameAst:super` **91** -- the biggest single row.  `super()` CALLS already
  emit (cut 55's two Super-proxy rewrites); what refuses is `super` read as a
  VALUE.  Subtle (the `__class__` cell, the MRO), so worth doing carefully
  rather than first.
* **The two frame-marker spellings**, worth `exec` 80 and `eval` 53 and the
  next cut in this lane.  Cuts 83-85 retired `globals`, `locals`, `vars` and
  `dir` from this family -- most of it turned out to be ordinary calls refused
  by NAME rather than by shape (cut 85).  What is left is the genuinely
  runtime-frame-sensitive half: `eval(e, g, l)` with None namespaces means
  "use the caller's", and the caller frame is identified by the `___curPos___`
  temp that only TEXT-generated methods carry, while an IR method carries
  `___grailPython___`.  Until `PyFrame >> ___namesIncludeCodegenMarker___:`
  accepts both, compiling these calls through IR silently drops the caller
  namespace -- measured, 13 errors in EvalCallerNamespaceTestCase.  The change
  is small; its blast radius is not, since the same walk feeds the traceback
  path, so it wants its own cut and its own tier-2 run.
* `method:classNotAtModuleScope` **72** plus `methodLocalSlots` 17 and
  `methodLocalNestedClass` 11 -- cut 79's own named residue.
* `NameAst:reservedIdentifier` **28** and a tail below 25.

**One of the two things on this board that were not coverage is now CLOSED.**
`FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver` was
recorded here as "a genuine IR gap, undiagnosed"; it is diagnosed and fixed
(#906).  `PyFrame >> ___namesIncludeCodegenMarker___:` tested for
`___curPos___` alone -- the TEXT emitter's position temp -- and that predicate
is how `___innermostPythonFrameSnapshot___` FINDS the frame whose receiver and
locals get snapshotted at raise time.  So under the flag the walk ran past every
IR method, nothing was captured, and the exception reached traceback.py with
`___frameLocalNames___`/`___frameSelf___` absent, which is what made
`_raising_frame_self` decline:

    text:  NameError: name 'blech' is not defined. Did you mean: 'self.blech'?
    IR:    NameError: name 'blech' is not defined. Did you mean: 'blich'?

Ruled out first, both cheaper explanations: `___methodReceiverTable___` is
populated identically on both paths, and `extract_tb(capture_locals=True)`
reports the same locals on both.  The receiver machinery was fine.  Note that
`___curPosLineFromFrameContents___:` must NOT be widened the same way -- it
reads the position VALUE out of the temp, and `___grailPython___` holds none.

`TracebackTestCase>>testForLoopExceptionPositions` closed with it (#906): the
tuple-target branch of ForAst's IR emit stamped the iterator protocol at the
TARGET, so `for a, b in LateBreak():` blamed `a, b` (colno 12..16) where the
text path and CPython blame `LateBreak()` (20..31).

**With those two, the flag-on SUnit suite is GREEN on 4.0: 6592 run, 6592
passed, 0 failed, 0 errors -- identical to flag-off, 8 of 8 shards.**  Because
two identical arms are the shape of a vacuous pass, the flag was verified to
reach the gem under the suite's own env (`raw='1' flag=true enabled=true`), and
the same harness read 3 failures before the fixes and 1 after a rebase, so it
distinguishes the arms.

`PrivateNameManglingTestCase` fires
intermittently under the cold flag-on sweep and nobody knows why: the IR
method's selector pool is IDENTICAL to the text method's (so it does take the
private-method direct-send fast path) and its frame is NARROWER, not wider --
both hypotheses refuted by measurement.  It also still fires with #893's
identity marker in, so the marker neither caused nor fixed it.

**Not worth doing: transcribing the class emit itself into IR.**  Cut 76
already routes every eligible class statement through IR, so it would retire
zero rows, and it would cost a second copy of `printSmalltalkRuntimeOn:` --
~2400 lines of branches -- free to drift from the text path that is the oracle
for every other emit.  See `___irEligibleStatementLocals___:`, which argues it
at the site.
