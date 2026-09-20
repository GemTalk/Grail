## Progress — cut 70 (parameters and locals spelled like Smalltalk pseudo-variables)

`pseudoVariableParam` (23 top-level defs -- typing's `def NoReturn(self,
parameters)` family).  The text carries such a binding under its transport
identifier (`self` -> `_self`, `super` -> `_super`, ...:
`___transportIdentifierFor___:`) and rewrites its reads; the IR has no name
resolution, so the leaf merely gets that name while the builder's table
stays keyed by the PYTHON name (`argNamed:leafName:`, `tempNamed:leafName:`,
`___irLeafNameFor___:`).  Every registration site -- fixed-arity arguments,
transport temps, varargs-prologue temps, body locals -- goes through it, and
the def-level refusal is gone.

Two TEXT gaps found by the fixture and not asserted (the fixture must pass
with the flag off too): a star parameter spelled like a pseudo-variable (`def
f(*super, **false)`) is a CompileError on the text path, and a METHOD with
any parameter spelled like a pseudo-variable (`def combine(me, nil)`) hits
the text's codegen-gap stub (`NameError: Grail could not compile this
method`), and a KEYWORD argument spelled like one (`pv_add(1, 2, nil=5)`)
binds the default instead of the value on the text path (5 where CPython and
the IR answer 8).  All three compile and run correctly through IR.

Fixture: pv_add (`self`, `true`, `nil` parameters, a `thisContext` local, at
module level).  Compiled 372 -> 374, 0
fallbacks, RESULTS true with the flag on and off.  Gated together with cut 69:
flag-off `6431 run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep
`6431 run, 6422 passed, 8 failed, 1 errors` -- exactly the known nine, and
for once no AlmostOutOfMemory notification in any shard.
