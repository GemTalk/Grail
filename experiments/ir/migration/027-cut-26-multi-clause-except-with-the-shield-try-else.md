## Progress — cut 26 (multi-clause `except` with the shield, `try/else`)

`TryAst>>___emitIRProtectedPartOn___:` now builds printSmalltalkOn:'s full
handler NEST, `[[[body] on: s1 do: h1] on: s2 do: h2] on: s3 do: h3`, plus the
two things text does for more than one clause:

* **The shield.** H1's body runs INSIDE H2's protected block, but Python's
  clauses are alternatives for the try BODY only, so every clause after the
  first gets `PyLazyExceptSelector on: [..] shieldedFor: #token` and every
  handler calls `___enterHandler___: #token` (the no-arg form for a single
  clause).  The token is the per-SITE Symbol the text bakes in
  (`___grailTrySite_<path>_<line>___`, see ___trySiteTokenLiteral___ for why
  per-site).  A bare `except:` after the first clause wraps BaseException in
  the lazy selector so the shield has a selector to live on.
* **The else** sits OUTSIDE the nest and INSIDE the finally -- it is exactly
  the code this statement's own handlers must not protect.  Whether the body
  fell through is the nest's VALUE: body block ends in `true`, every handler
  in `false`, `(nest) ifTrue: [orelse]`.  Emitted only with an else.

**One emit defect caught by the smoke fixture, worth recording:** the first
emit sent the outer `on:do:` to the inner send's VALUE.  `on:do:` installs a
handler only on a BLOCK receiver, so the second clause never installed and a
TypeError from the body escaped `except TypeError:` (module import died with
``unsupported operand type(s) for //``).  Every clause after the first now
protects a block WRAPPING the inner on:do: -- the text's outer brackets.

**Also fixed here, from the cut-25 flag-on triage:** the IR handler now passes
`target: 'name'` to ___pushCatchingFrame___ for `except X as name` and emits
`___unbindCatchingTarget___:` in the handler's ensure:, so the catching
frame's f_locals shows the target while the handler runs and not after
(FrameLocalsCaptureTestCase both halves true under the flag).

**Flow-analysis limit surfaced:** `v = d[k]` in a try body followed by `v` in
the else is ineligible -- the body may raise before the write, so the write is
nested/conditional and a FIRST nested binding is refused; the rule does not yet
know an else runs only after the body completed.  The fixture pre-binds `v`.
Refinement (body top-level writes are bound within the else) deferred.

Fixture: pick_handler (three clauses), shielded (raise in H1 must not reach
H2; SHIELDED), with_else / else_not_protected (ELSE_LEAK: a TypeError from
the else propagates past `except KeyError`), bare_after_typed; compiled
77 -> 82.

Cut 26 flag-on sweep: FrameLocalsCaptureTestCase is green (the target: parity
fix above).  Residue: the two PEP 657 column classes, the two inherent tests,
and two ERRORs that both pass alone in a fresh forced-flag session --
`PropertyNotDynamicClassAttributeTestCase>>testHelpOnAnEnumPrintsCPythonsHeading`
(second recurrence) and `UnicodeNamesTestCase>>testAHangulSyllableIsFoundByComposition`
(new on main with #826).  Both are cold-shard ORDER effects under the flag, not
emit defects; a stack-geometry or shared-state interaction to chase when they
stop being intermittent.  Flag-off is the gate and is deterministic.
