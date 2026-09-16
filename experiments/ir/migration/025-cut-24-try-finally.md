## Progress — cut 24 (try / finally)

A finally clause wraps the statement (bare body, or the single-handler nest) in

    BaseException @env0:___ensureFinally___: [ ... ] finally: [ finalbody ].

— the helper, not a bare ensure:, so sys.exc_info() inside the finally sees a
propagating exception; text uses it for every non-generator scope, and a
generator def is never IR-eligible. try/finally with no except qualifies too.

**The enabling insight: `hasReturnBlocking` is a TEXT-SYNTAX constraint.**
GemStone's parser rejects statements after `^`, so a text return inside
try/finally must compile to a PythonReturn signal; ___irEligible___ was
inheriting that bail-out, silently keeping every try/finally def on text
(compiled=71 vs expected 73 — the smoke count caught it). IR has no parser:
returnFromHome unwinds directly and ensure-family blocks run on any unwind, so
the check is now skipped for IR (``with`` also sets the flag but WithAst is
statement-ineligible anyway). Verified: a return through an IR try/finally
runs the finally (div_logged's append count).

Fixture: FINALLY_RAN + div_logged (return through finally, incl. during
exception propagation), guarded_get (except + finally); compiled 71 -> 73.
