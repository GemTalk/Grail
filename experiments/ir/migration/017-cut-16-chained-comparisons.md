## Progress — cut 16 (chained comparisons)

`a < b < c` reproduces printSmalltalkOn:'s temp + and:-block shape:

    (((a) ___cmpLt___: (___1 := b)) and: [((___1) ___cmpLt___: (c))])

Each middle comparator is captured into the parse-allocated `rhsTemp` as an
assignment EXPRESSION (GsComAssignmentNode as a send argument) and re-read as
the next op's left operand — every operand evaluated at most once, and only as
far as the chain gets. The rhsTemp is registered as a method temp at emit
(guarded by leafFor:, matching text's `| ___1 |` declaration). The `and:` is a
real env-0 send to the Boolean (kernel Boolean>>and:) — text's and: IS
Boolean>>and:, just inlined. Chains containing is / is not / in / not in stay
on text (they need the extra lhsTemp shape). Fixture: in_range
(`lo <= x <= hi`), ascending (4-operand chain); compiled 46 -> 48. Flag-on
6235/6236 (inherent only), flag-off 6236/6236.
