## Progress — cut 3 (arithmetic + unary operators)

`BinOp` (all arithmetic/bitwise ops) and the dunder unary ops (`-x` / `+x` /
`~x`) now emit as IR. Each is a single send:
* `a + b` -> `a ___binOpXxx___: b` (the NotImplemented-aware helper on `object`,
  the same one `BinOpAst>>printSmalltalkOn:` uses);
* `-x` -> `x __neg__` (and `__pos__` / `__invert__`).

**The send-environment gotcha (load-bearing):** `GsComSendNode`'s `envFlags`
ivar IS the send's environment id (comparse.ht `envId() == envFlags`). A Python
send must be **env 1** (where the protocol methods live), so
`PyMethodIRBuilder>>send:to:with:` sets `envFlags := 1`. envFlags 0 dispatches in
env 0 and DNUs `___binOpAdd___:` on a SmallInteger. A `send:to:with:env:` variant
exists for the `@env0:` Smalltalk sends the later cuts need (dynamicInstVarAt:,
`not`, ...).

Deferred: `not` and `BoolOp` (need env-0 truthiness sends), chained `Compare`
(temps + `and:` blocks).
