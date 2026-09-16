## Progress — cut 20 (is / is not / in / not in, unchained)

The four remaining single comparison ops, matching their printers:
* `a is b` -> `((a) == (b))` and `a is not b` -> `((a) ~~ (b))` — real env-0
  sends to the kernel identity tests (same rationale as cut 15's `==`).
* `a in b` -> `((b) ___pyContains___: (a))` — the CONTAINER receives;
  `a not in b` -> `(((b) ___pyContains___: (a)) ___isTruthy___) @env0:not`
  (the helper may answer a non-Boolean, so coerce before negating — NotInAst's
  own shape).
Chains containing these still stay on text (the lhsTemp staging shape).
Fixture: same, differs, holds, lacks (incl. str contains); compiled 57 -> 61.
