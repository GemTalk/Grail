## The text moved and the IR emit did not

With #1118 in, `main`'s flag-on suite dropped from 65 defects to a handful, and
two of them were `AugmentedAssignmentTestCase`: `self.lst += [2]` rebinding
instead of extending, and `self.d |= proxy` never reaching the reflected
dunder.

### The emit agreed with its docstring, and with nothing else

`___emitIRComplexTargetOn___:kind:` -- the attribute and subscript branches of
cut 62 -- applied the **bare binary** dunder to the loaded value:

```smalltalk
aBuilder send: binSel to: load with: { v } env: 1
```

Its docstring said this was right: *"The text applies the BINARY operator send
(`__add__:`, not the in-place probe of the simple-local branch)"*. When cut 62
was written, that was true. The text emitters were corrected since --
`printSmalltalkAttributeAugAssignOn:` now opens with *"EVERY BRANCH GOES THROUGH
`___augmentedOp___`"* -- and the IR emit kept the old shape. Nothing forced the
two back together, because the emit and its docstring still agreed with each
other.

The emit rule has the text path as the oracle. It is only an oracle for as long
as someone re-reads it: an IR emit is a copy of the text at the moment the cut
was written, and it does not follow when the text changes.

### Why a green suite did not see it

Both losses are quiet, which is the part worth keeping:

* a lost **in-place** dunder still leaves the right value under the target's
  own name. `self.lst` reads `[1, 2]` either way; only a second name bound to
  the same list can tell. Every list check in the new fixture therefore records
  an alias identity next to its value, and `TracksInPlace` answers *which*
  dunder ran, so a fallback cannot reach the right value by the wrong route;
* a stored `NotImplemented` is a **value**, not an error. It surfaces at the
  next read, arbitrarily far from the statement at fault.

And the default gate could not see it at all. The text path is correct, and
every test that existed inherited the ambient flag, so a flag-off run compiled
none of the emit under test. That is how it reached `main`.

### The fix

All four shapes -- slot accessor, `self.x`, a foreign receiver, a subscript --
now go through `___augmentedOp___:inplace:binary:`, built in one block shared
by all four so they cannot drift apart from each other the way the whole
method drifted from the text.

### The control

`AugAssignComplexTargetTestCase` forces IR, so it runs on the flag-off gate:

| tree | ambient flag off |
| --- | --- |
| with the fix | 3 run, 3 passed |
| emit reverted to `main` | 3 run, **0 passed, 3 failed** |

### Gates

| gate | result |
| --- | --- |
| fixtures | 438 fixtures, 7264 OK, 54 XFAIL, all agreeing with CPython |
| full suite, text | 7250 run, 7250 passed, 0 failed, 0 errors (8 of 8) |
| full suite, IR on | 7250 run, 7243 passed, 1 failed, 6 errors (8 of 8) |
| corpus, default | `0 regression(s), 2 improvement(s)` |

The seven IR-on defects left are all pre-existing: `ExecWithClosureTestCase`
(5, landed today; `exec() cannot run this code object with a closure` -- a
feature that needs something only a text-compiled code object carries), and the
two recursion-depth tests. `ExecWithClosureTestCase` was measured against
`main`'s emit and errors identically.
