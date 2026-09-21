## The class helper was filed against the stand-in, not the class

The fix for the `test_datetime` regression cut note 128 bisected to #983.

### What was wrong

`ClassDefAst>>___emitIRStatementOn___:` carries a class statement inside an IR
method by compiling a helper method and sending it to `self`. It compiled that
helper onto `aBuilder targetClass`.

For a method of a METHOD-LOCAL class the build is SHARED (cut 79): the class is
rebuilt on every call of the enclosing def, so the method is built once against
importlib's stand-in and regenerated per class by `___irRegenerateOn___:`. At
emit time `targetClass` is therefore the stand-in, and the helper was filed
where the method would never look. The selector is derived from the class's
source offset, so it is identical on every regeneration -- every copy sent the
same missing selector:

```
a MyTzInfo class does not understand #'___irClassDef_91742_MyStr___' (env 1)
```

**The guard #983 removed said this, in its own docstring**, and the docstring
outlived the guard:

> cut 76 carries a class statement inside an IR method by compiling a helper
> method onto ``aBuilder targetClass'', and for a SHARED build that class is
> the stand-in PythonInstance

### The fix

The same shape as `deferInstVars`, which already solves this problem for the
other thing in a built method that names its class -- an instVar OFFSET:

* `PyMethodIRBuilder>>___irNoteClassHelper___:source:` compiles the helper now
  for an ordinary build and RECORDS it for a shared one;
* `___irRegenerateOn___:` files the recorded helpers onto the class it is
  regenerating for, once per class -- the same lifetime the class has, and the
  same one the text path pays for the whole method;
* `install` refuses when helpers are unresolved for `targetClass`, matching the
  existing instVar guard. Without it the method generates cleanly and raises a
  DNU the first time the class statement runs, which is the failure mode this
  whole note is about.

Deferring is sound for the reason deferring an offset is: the helper's SOURCE
is the class body's text, which does not mention the enclosing class at all.
Only where it is filed depends on the class.

`___irSubtreeContainsClassDef___`, the predicate the deleted guard called, has
had NO SENDERS since #983. Its docstring still described the shape as staying
on text; both it and
`___irMethodLocalClassMethodReason___`'s are corrected here rather than left to
mislead the next reader.

### The fixture nearly repeated the mistake it exists to catch

The first version modelled the nesting faithfully -- a method-local class whose
method defines `class MyStr(str)`, inherited by a subclass, identity-checked
per call -- and **passed against the unfixed tree**. Exactly what #983's
fixture did, one level down.

The discriminator is the base of the MIDDLE class. With `object` or a plain
module-level class the misfiled helper is still reachable and nothing fails;
only a BUILTIN base (`str`, `dict`, `Exception`, `tzinfo`) puts the class where
the stand-in is not. Measured, on the unfixed tree:

```
with_object            OK   'v'
with_plain             OK   'v'
a Mid class does not understand #'___irClassDef_866_Leaf___'
```

So all six bases are cases in the fixture, and the two that cannot fail are
kept as the controls that say so.

Measured both ways, same tree:

| | fixture vs CPython | `ClassInMethodLocalClassMethodTestCase` |
| --- | --- | --- |
| with the fix | identical, both arms | 3 run, 3 passed |
| fix reverted | raises before any key is produced | 3 run, **3 errors** |

### Gates

| gate | result |
| --- | --- |
| fixtures | 398 self-running, 6380 OK, 53 XFAIL, all agree |
| SUnit flag-off | 8/8 shards, `6985 run, 2 failed, 0 errors` |
| SUnit flag-on cold | 8/8 shards, `6985 run, 2 failed, 0 errors` |
| CPython corpus flag-off | `OK 74 FAIL 3 ERROR 17 CRASH 0`; regression gate **0 regressions, 0 improvements** against the refreshed baseline |
| CPython corpus flag-on | `test.test_datetime` ERROR -> **OK** |

The two SUnit failures are `AsyncioIoTestCase>>testSockConnectReportsARefusedConnection`
and `AsgiServerTestCase>>testStopClosesTheListener`, in both arms. **Controlled
rather than assumed pre-existing**: on a clean `main` tree, same machine, both
classes read `19 run, 1 failed` and `28 run, 1 failed` -- identical. They are a
refused connect reporting the wrong error on macOS 27, the area 5d214d8c
touches.

### Three instruments that lied on the way here, all quietly

* **A variable assignment prefixing a shell FUNCTION persists.**
  `GRAIL_IR_CODEGEN=1 bounded ... run_cpython_suite.sh` leaked the flag into
  every later phase of the gate driver, so the "flag-off" corpus ran flag-ON.
  It was caught only because its board matched the flag-on board exactly on all
  four modules where the arms differ -- a suspiciously *clean* result, not a
  broken one. POSIX keeps assignments that precede a function or special
  built-in; use `env VAR=x` for anything that is not an external command.
* **The fixture gate silently skips a fixture with no `__main__` block.** The
  first version printed at module level, so the gate ran 397 fixtures and said
  "all self-running fixtures agree with CPython" without ever reading it. The
  count going 397 -> 398 is the only thing that shows it was added. The gate's
  own header warns about exactly this failure for quote styles; the missing
  block is the same hole one step earlier.
* **A topaz probe under bare defaults OOMs**, and a `grep` for result lines
  turns that crash into empty output. The control for the socket failures
  "passed" by printing nothing until it was given the suite's gem
  configuration, which `CENSUS.md` already documents for the census scripts.
