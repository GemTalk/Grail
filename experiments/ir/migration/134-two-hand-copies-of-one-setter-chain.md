## Two hand copies of one setter chain

After #1122, `main`'s flag-on suite was down to seven defects, and five were
`ExecWithClosureTestCase`, which had landed the same day:

```
TypeError: exec() cannot run this code object with a closure
```

### What the feature needs from the code object

`exec(f.__code__, g, closure=cells)` cannot re-enter a compiled closure with
different cells -- Grail's free variables are Smalltalk temps captured at def
time. So it re-runs the def's **body text** against a namespace backed by the
cells, and refuses when the code object carries none. The text is attached by
`___setBodySource___:`, one of the setters the text path chains onto every
def's `PyCode` in `emitCodeExtrasOn:nested:`:

```
___setFlags___:  ->  ___setFreevars___:  ->  ___setConsts___:  ->  ___setBodySource___:
```

### Where the IR path lost it

The IR path builds a def's code object in **two** places --
`___emitIRNestedPyCodeOn___` (the def-time `__code__` of a closure) and
`___emitIRPyCodeExprOn___` (a generator's `gi_code` thunk). Each had
hand-copied the first two setters when it was written. The text later gained
`co_consts` and the body text; neither copy followed.

That is the same failure as cut 133, one level up: not an emit that diverged
from its text twin in a single place, but two copies of one text method that
each froze at the moment they were made.

### The fix is one mirror, not two patches

`___emitIRCodeExtrasOn___:code:nested:` mirrors `emitCodeExtrasOn:nested:`
send for send, and both IR emitters call it. Its conditions are the text's own
predicates (`___codeConstScopes___`, `___emitsBodySource___`), not
restatements of them, so a setter added to the text has one IR place to go.

### The control

`ExecWithClosureTestCase` inherits the ambient flag, so on the flag-off gate
it compiles nothing through IR. `ExecWithClosureIRTestCase` drives the same
fixture with IR forced:

| tree | ambient flag **off** |
| --- | --- |
| with the fix | 2 run, 2 passed |
| emit reverted to `main` | 2 run, **0 passed, 2 errors** |

### Gates

| gate | result |
| --- | --- |
| fixtures | 438 fixtures, 7264 OK, 54 XFAIL, all agreeing with CPython |
| full suite, text | 7252 run, 7252 passed, 0 failed, 0 errors (8 of 8) |
| full suite, IR on | 7252 run, 7250 passed, 1 failed, 1 errors (8 of 8) |
| corpus, default | `0 regression(s), 3 improvement(s)` |

The two IR-on defects left are the recursion-depth pair,
`BaseExceptionTestCase` and `PrivateNameManglingTestCase` -- down from 65
before #1118.
