## Progress — cut 17 (unary not + conditional expressions)

* `not x` -> `((x) ___isTruthy___) @env0:not` — truthiness (env 1) then Boolean
  negation (env 0), overriding UnaryOpAst's dunder-selector default on NotAst.
* `a if c else b` -> `((c) ___isTruthy___ ifTrue: [a] ifFalse: [b])` — the
  builder grew `ifValue:then:else:`, the un-added VALUE form of the inlined
  conditional (if:then:else: is now a one-line add: of it).
Fixture: negation, pick (incl. non-bool truthy test); compiled 48 -> 50.
Flag-on 6235/6236 (inherent only), flag-off 6236/6236.
