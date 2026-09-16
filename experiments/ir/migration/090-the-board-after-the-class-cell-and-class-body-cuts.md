## The board after the class-cell and class-body cuts (2026-09-11)

Two of the three largest rows closed in one session, and what is left has
consolidated into a single cut.

| row | before | after | where it went |
| --- | ---: | ---: | --- |
| `CallAst:super-methodLocalClass` | 81 | **0** | 45 eligible, 37 to named residue |
| `method:classNotAtModuleScope` | 72 | **1** | 66 eligible (#935) |
| `CallAst:frameSensitive-exec` | 77 | 77 | — |
| `CallAst:frameSensitive-eval` | 51 | 51 | — |
| `CallAst:super-argZeroDeletable` | — | 32 | new, split out of the super row |

Deduped the way `CENSUS.md` builds corpus totals, corpus 2's eligible class
methods reconcile exactly against the checked-in baseline:

    CENSUS.md baseline              10399
      + classInClassBody (#935)       +66
      + super through the cell (#938) +45
      = measured                    10510

**THE TOP TWO ROWS ARE ONE CUT; THE THIRD IS NOT.** `frameSensitive-exec` (77)
and `frameSensitive-eval` (51) refuse for a run-time reason: `eval(e, g, l)`
with None namespaces means "use the caller's", and a nested def compiles to a
BLOCK inside its enclosing method, so the frame the snapshot walk finds is not
the one whose temps it wants. 128 methods of genuine frame machinery, and its
blast radius is the traceback path.

`super-argZeroDeletable` (32) SHARES THE WORDS AND NOT THE MECHANISM, which is
worth stating because the phrase "nested def" invites exactly that conflation —
this note said they were one cut before the refusal was read properly. What it
needs is a COMPILE-TIME guard, not a frame:

    (<argZero> == nil ifTrue: [Super ___argZeroDeleted___] ifFalse: [<proxy>])

CPython's precondition 2 tests `localsplus[0] == NULL`, and Grail's equivalent
is exact: a def copies each parameter into a temp and `del x` compiles to
`x := nil`. A METHOD's first parameter is the Smalltalk receiver, which no
`del` can nil, so the test is dead code there and `___superArgZeroGuardName___`
answers nil; a def NESTED in a method has an ordinary temp, so it gets the
test — and the IR path refuses precisely because that wrapper is not emitted.
A local nil-test the builder can already express, so this is the cheaper cut of
the two and does not wait on the frame work.

### Two measurement traps, both of which bit here

**The census denominator needs a fresh `install.sh`, and the shape of being
wrong is a SMALLER number rather than an error.** A census counts only the
modules it actually compiles, so a preceding install or test run turns most of
the corpus into cache hits: a clean run reads 854 module rows where a dirty one
reads 191. A reading taken casually after other work therefore understates
eligibility and looks like a regression. Pair any before/after measurement with
its own install, in both arms.

**Session totals are not corpus totals.** 83 of the 220 modules are reached from
more than one shard, so summing the per-shard `CENSUS|` lines overstates by about
half — 14627 summed against 10510 deduped. The deltas survive either way (each
moved method lives in one shard, so +45 is +45 in both), but an absolute quoted
from a sum is wrong by 40%. `CENSUS.md` already says this; it is repeated here
because the mistake is easy to make and reads as plausible.
