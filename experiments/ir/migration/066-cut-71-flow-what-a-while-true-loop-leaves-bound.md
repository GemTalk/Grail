## Progress — cut 71 (flow: what a `while True` loop leaves bound)

The bound-before-read analysis treated every `while` as possibly zero-trip,
so nothing its body bound was known afterwards -- and `re._compiler`'s
`while True: ... op, av = ...; if ...: break` followed by a read of `op` was
one of the 21 + 17 `flow` refusals.  A `while True:` (or `while 1:`) never
leaves through its test: what is bound after it is what EVERY `break` had
bound.  BreakAst now records the set in force at each break into a collector
the enclosing loop pushes around its body walk
(`AbstractNode class>>___irCollectBreakSetsDuring___:`); a `while True` meets
those sets for its after-set (no break at all: nothing after the loop is
reachable, every local counts as bound), any other test keeps the entry set.
A `for` loop pushes and discards its own collector so an inner break cannot
leak into an outer `while True`.

Fixture: scan_tokens (the re._compiler shape, with an inner `for ... break`),
first_even_loop (`while 1:`).  Compiled 374 -> 377, 0 fallbacks, RESULTS
true with the flag on and off.  Gates: flag-off `6431 run, 6431 passed, 0
failed, 0 errors`; flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2
errors` -- the known nine plus `[ERROR] TwilioClientTestCase>>testMessagesCreate`
(AlmostOutOfMemory in its shard log, 15 notifications).
