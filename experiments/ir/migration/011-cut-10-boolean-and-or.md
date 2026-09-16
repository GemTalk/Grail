## Progress — cut 10 (boolean `and` / `or`)

`a and b` -> `((a) ___pyAnd___: [b])` and `a or b` -> `((a) ___pyOr___: [b])` —
the value-preserving short-circuit helpers, right-folded for chains
(`a and b and c`). The tail operand is wrapped in a **block** so the helper
evaluates it lazily — the first use of a `GsComBlockNode` as a REGULAR send
argument (earlier blocks were control-send receivers/args for
`ifTrue:`/`whileTrue:`). Verified value preservation and short-circuit:
`both(0,5)=0`, `either(3,7)=3`, `guard(-1)=false`.
