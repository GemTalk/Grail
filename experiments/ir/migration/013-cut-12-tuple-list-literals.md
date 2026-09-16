## Progress — cut 12 (tuple / list literals)

The builder grew `arrayOf:` (GsComArrayBuilderNode -- the `{ e1 . e2 }`
construct, proven in experiment 07). Non-splat, Load-context displays only:
* `(a, b)` -> `tuple withAll: {a. b}` (env 0) and `()` -> `tuple new` (env 0)
* `[a, b]` -> `{a. b} asOrderedCollection` (env 0) and `[]` ->
  `OrderedCollection new` (env 0)
matching the text path's non-splat branches exactly (text's `perform:env:` is
just its syntax for forcing env 0; IR sets the send env directly). Splat
(`[a, *b]`) and store-context unpacking targets stay on text -- Assign's
single-Name-target rule already refuses tuple targets. Containers nest
(`[(a, b), a]`). Fixture: pair/empty_tuple/listing/empty_list/nested;
compiled 28 -> 33. Flag-on 6235/6236 (inherent only), flag-off 6236/6236.
