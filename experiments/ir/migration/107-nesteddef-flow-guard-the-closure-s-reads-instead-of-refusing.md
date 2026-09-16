## `nestedDef:flow`: guard the closure's reads instead of refusing it (2026-09-14)

`nestedDef:flow` (16 class methods + 1 top-level def) refused any closure whose
bound-before-read walk could not be proved. That kept the IR path CORRECT by
staying away from the shape — a refused closure sends its whole enclosing def to
text, and the text already guards every body-local read with
`(x ifNil: [UnboundLocalError ___signalUnbound___: #x])`.

**The refusal was not conservative in the usual sense.** A bare read of an
unbound temp answers nil, so admitting the shape without the guard is a silently
wrong VALUE, not a missing feature: the function returns None-ish where CPython
raises. `test_listcomps.test_unbound_local_after_comprehension` asserts exactly
that raise, and it is one of the 16.

### Cut 72 had already built most of this

`PyMethodIRBuilder>>guardLocals:` emits the guard for the METHOD form when its
flow proof fails. The nested path simply never used it. What it needed was the
SCOPED form, `withGuardedLocals:do:`, for two reasons: `guardLocals:` replaces
the whole set, so it would drop the ENCLOSING def's guards for the duration of
the closure; and the closure's own guards must not leak back out to statements
emitted after the def.

`___irNestedGuardedLocalNames___` is spelled separately from
`___irGuardedLocalNames___` because that one routes through
`___irLocalParamNames___`, which drops the first parameter whenever
`___irStripsReceiver___` is true — and that is true for a def nested inside a
class-body method, where `___irMethodMode___` answers about the ENCLOSING build.
The same trap as the `receiverFirst:` bug two cuts ago: a predicate about the
enclosing frame read as though it were about this one.

### The guard is unconditional, and that is the part to review

The obvious design gates it on the flow walk — bare reads when proven, guarded
otherwise, mirroring the method form. **That version was written and it produced
wrong answers.** `___irNestedFlowSafe___:` answers SAFE for a closure whose body
is `if False: x = 0` then `return x`, so the read was emitted bare and answered
nil where CPython raises.

The same body in a MODULE-LEVEL def is judged correctly, so the discrepancy is
in how the nested case is seeded. **It is not explained here.** The seed, the
tracked local set and the body's statement classes were all probed and all
looked right; the walk still reports every local bound, which is the terminator
rule's answer after its read-check passes — so `return x` is not being seen as a
read of `x`, and that was as far as it got.

Guarding every closure body-local read makes the emit independent of the walk,
and is what `printSmalltalkOn:` does for every such read anyway. The cost is one
inlined `ifNil:` per read, and it can fire only on a genuinely unbound temp:
Python's `None` is an object and never Smalltalk nil, which the fixture pins.

**The unexplained walk result is worth its own look.** It is the same analysis
cut 72 trusts on the method path; that path happens to answer correctly on this
shape, but "happens to" is the operative phrase.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:nestedDef:flow` | 16 | **0** |
| `nestedDef:flow` (top-level) | 1 | **0** |
| `cm:eligible` | 10763 | **10778** (98.5%) |
| `compiled` (test corpus top-level) | 1317 | **1319** |

Nothing moves up behind it.

### Two controls, and here the BEHAVIOURAL test is the load-bearing one

The opposite of the recent eligibility cuts, and worth stating because the habit
points the other way.

* **Neutralise `withGuardedLocals:do:`**: four of the thirteen fixture checks
  answer nil instead of raising. Caught by the behavioural test; the census does
  not move at all.
* **Restore the refusal**: the fixture censuses 6 `nestedDef:flow` and compiles
  8 of 14, and the behavioural test **still passes** — a refused closure sends
  its enclosing def to text, which guards. Caught only by the census assertion.
