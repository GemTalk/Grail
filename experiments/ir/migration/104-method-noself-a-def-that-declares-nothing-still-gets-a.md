## `method:noSelf`: a def that declares nothing still gets a receiver (2026-09-13)

`method:noSelf` (15) refused every class-body def written `def m(*args)` — no
declared parameter at all. That is not an exotic spelling: it is how the corpus
writes a hook that wants the raw argument tuple. `test_compare` has
`def __eq__(*args)`, `test_genericclass` has
`def __class_getitem__(*args, **kwargs)` and then asserts `args[0] is C`.

### Why it needed an emit rather than a wider guard

CPython still passes the receiver to such a def — as `args[0]`. `c.m(1)` sees
`(c, 1)` and `c.m()` sees `(c,)`. Grail's generator strips a method's FIRST
DECLARED parameter and carries it as the Smalltalk receiver, so with nothing
declared there is nothing to strip and the receiver would simply be dropped. The
text path has a documented branch for exactly that:

```smalltalk
args := tuple perform: #withAll: env: 0 withArguments: {
    (Array @env0:with: self) @env0:, (positional @env0:copyFrom: 1 to: positional @env0:size) }
```

and `___emitIRVarargBindingOn___:pos:names:receiverFirst:` had only the other one. **Getting
this wrong does not fail** — it answers a tuple one element short with every
later element shifted, a silently wrong VALUE. So the fixture leads with
`args[0]` rather than with a shape check.

The rest of the prologue already agreed: `___irBuildParamNames___` answers `#()`
here (`instanceMethodParameterNames` returns `#()` for an empty list rather than
stripping a parameter that is not there), which is the text's `paramNames`. One
branch in one emit method was the whole codegen change.

### Two exits remain, and the flag-on suite found the second one

`method:noSelfNamesReceiver` — a body that NAMES the receiver. With no parameter
of its own that name is the ENCLOSING method's `self`, captured by a
method-local class, and Grail compiles a captured receiver to bare Smalltalk
`self`: the inner instance, not the enclosing one. That divergence is on the
text path already and the cut does not need to settle it. It measures **0** on
this corpus.

`method:noSelfSuper` — a body that calls `super()`. **The first draft of this
cut admitted it, and the flag-on cold suite turned red.** CPython's check is on
`co_argcount`, so with nothing declared there is no argument 0 to take the
receiver from, and the answer is `RuntimeError: super(): no arguments`; the IR
super shapes (cut 55) emit the method's own receiver and answered a WORKING
super instead. `SuperPreconditionErrorsTestCase >>
testAZeroParameterMethodIsCallableThroughItsClass` pins that exact message and
named it. It measures **1** on this corpus, so the guard costs one def.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:method:noSelf` | 15 | **0** |
| `cm:method:noSelfSuper` | 0 | 1 |
| `cm:NonlocalAst:notLocal` | 21 | 22 |
| `cm:NameAst:__class__-methodLocalClass` | 9 | 12 |
| `cm:eligible` | 10733 | **10743** (98.2%) |

Measured against the main that carries #961; against the one before it the row
read 10708 -> 10718, the same **+10**, so this cut and the `except*` cut do not
overlap.

**15 retired, +10 net, and the five-def gap is the point.** One is the `super()`
guard above. The other four refuse on a second reason once this one stops firing
first, and the census now says which: one `nonlocal` write-back and three
`__class__` reads in a method-local class. That is the board working as designed
— it reports the FIRST refusal — and it is why a cut is measured rather than
counted from the row it closes. The stdlib corpus is unmoved at 4575: it has no
def of this shape.

Fallbacks 0 across all three census shards; the smoke pin does not move (640),
the smoke fixture having no such def.

One more thing the nested case cost, and it is the reusable part. The vararg
binding emitter serves BOTH the method prologue and a nested closure's
prologue, and `___irMethodMode___` answers `CallAst classBeingCompiled notNil`
— true for a def nested inside a class-body method too. Deciding
"does this carry a receiver?" inside the emitter therefore prepended `self` to
every `def wrapper(*args)` closure in a method, which is how
`ModuleFunctionDecoratorsTestCase` failed with *"tagged() takes 1 positional
argument but 2 were given"*. The decision is not a property of the def; it is a
property of the CALL SITE, so it is now a `receiverFirst:` argument the method
prologue passes and the closure passes `false`.

### The control, which is the part worth keeping

Measured BOTH ways on the fixture. With the refusal restored, the behavioural
comparison **still passes** — the text twin answers identically on all twelve
checks — and only the census moves: 8 `cm:method:noSelf` against 8
`cm:eligible`. An eligibility refusal never reaches the seam, so it is not a
fallback either, and `___irStats___` cannot see it. A behavioural test alone
could not tell this cut from its absence; the census assertion is the only
instrument that can.

### A pre-existing gap the fixture found

`def m()` — declaring nothing AND taking no `*args` — is a TypeError in CPython
when called as `C().m()`, the receiver counting as one argument to a
zero-argument function. Grail runs it and returns normally, **on both codegen
paths**, so it is a gap in the arity check rather than anything this cut does.
Documented in the fixture and left out of its checks; the def stays in the class
so the shape is still compiled.
