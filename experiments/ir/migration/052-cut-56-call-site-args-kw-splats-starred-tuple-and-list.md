## Progress — cut 56 (call-site `*args` / `**kw` splats; starred tuple and list displays)

`value:StarredAst` (89 methods + 23 defs) was mostly `f(*args, **kwargs)`
forwarding, and `CallAst:doubleStarKwargs` (50 + 31) the same calls' keyword
half.  Both are the text's `printArgumentsArrayOn:` / `printKeywordsDictOn:`:

  * a positional splat is the concatenation `({} @env0:, { a } @env0:, (x
    @env0:___pyStarToArray___) @env0:, { c })` -- an empty seed, one run per
    element -- now `AbstractNode>>___emitIRElementsArrayOn___:elts:`, shared
    by call arguments and by the tuple and list displays `(a, *b)` / `[*a,
    *b]`, whose text emits the same run inside `tuple withAll:` /
    `asOrderedCollection`;
  * a lone `**m` is the mapping itself, no wrapping dict; `**m` among named
    keywords is an env-1 `update:` in the PyDict cascade, in source order
    (later entries win) -- the builder gained `cascade:specs:` with a
    per-send environment for that mix.

The call-shape dispatcher no longer refuses a splat up front: every
fixed-arity selector probe declines it as the text's do, so the call lands on
`#general` / `#attrLegacy` -- or on `#builtinVarargs` / `#attrVarargs`, whose
text printers also go through printArgumentsArrayOn: (the first flag-on probe
caught `max(*xs)` taking that shape with a brace-literal emit; every varargs
shape now splices).  The two arity-mismatch refusals mirror the text's
deferrals: a known builtin's TypeError is not emitted when a splat makes the
arity unknown or the name is also a class with a varargs constructor, a known
class's not when a splat is present.

Fixture: splat_target / splat_calls (positional, mixed, lone `**`, `**` with
named keywords, `*xs, *xs`, `max(*xs)`, `range(*[...])`), splat_seq (starred
tuple and list displays), Splatter (self-sends with splats, `(*xs, len(xs))`).
Compiled 235 -> 242, 0 fallbacks, RESULTS all true with the flag on and off.

Gates for cuts 55-56 together (the two are one commit because the cut-56
fixture was appended while the cut-55 flag-on sweep was still reading the
fixture from disk -- the sweep's one extra failure, the smoke tripwire, was
that edit, and the rule not to touch `tests/python` during a run exists for
exactly this): flag-off `6431 run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run, 6422 passed, 8 failed, 1 errors`, exactly the known nine (the five PEP 657 span tests, the two generated-text introspections, the IR-frame receiver suggestion, the recursion-guard byte budget).  Fixture gate:
316 fixtures, 4938 OK, 39 XFAIL, all agree with CPython 3.14.6.
