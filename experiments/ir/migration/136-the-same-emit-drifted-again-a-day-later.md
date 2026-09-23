## The same emit drifted again, a day later

Cut 133 (#1122) brought the IR attribute/subscript aug-assign emit back into
line with the text. The next day #1123 ("PEP 487 along the MRO") changed that
text again -- correctly -- and the flag-on sweep, running for the first time
with a working seam probe, went red within hours of it merging:

```
[ERROR] InitSubclassMroTestCase>>... (10)
    a ImproperOperation occurred (error 2484), cannot store because
    'dynamic instVars not supported in a Class'; receiver: A
[FAIL]  InferredSlotsTestCase>>testAllChecksPassWithInferredSlotsOff
    ['subclass_setattr_hook_intercepts_parent_augassign'] is not equal to []
```

### What moved

`self.x op= v` had loaded AND stored through the instance's dynamic-instVar
storage. #1123 moved the text STORE to `self @env1:__setattr__: 'x' _: (...)`,
for two reasons it documents: the self reference is not always an instance --
a `@classmethod`'s `cls` and PEP 487's `__init_subclass__` put a CLASS there,
and a dynamic-instVar store on a class is an uncatchable `ImproperOperation` --
and writing storage directly steps past a `__setattr__` override or a
`@property` setter. The IR `#attrSelf` branch kept the old store.

### Why cut 133's own test did not catch it

`AugAssignComplexTargetTestCase` covered four target shapes and never a class
as the self reference, nor a hooked store. So the file that exists to hold the
two paths together passed while they came apart. The four cases it lacked --
a classmethod's `cls.count += 1`, `__init_subclass__`, a subclass
`__setattr__` hook, a `@property` setter -- are now in its fixture, measured
in CPython 3.14.6, with a named test.

### The fix

The IR store is `__setattr__:_:`, env 1, with a String name as the text spells
it. The load is unchanged on both paths.

### The control

With the ambient flag off:

| tree | `AugAssignComplexTargetTestCase` |
| --- | --- |
| with the fix | 4 run, 4 passed |
| emit reverted to `main` | 4 run, **0 passed, 4 errors** |

All four error, not just the new one, because the class-receiver store is
uncatchable at import and takes the fixture down with it -- which is what the
defect actually does.

### Gates

| gate | result |
| --- | --- |
| fixtures | 442 fixtures, 7349 OK, 54 XFAIL, all agreeing with CPython |
| full suite, text | 7272 run, 7272 passed, 0 failed, 0 errors (8 of 8) |
| full suite, IR on | 7272 run, 7270 passed, 1 failed, 1 errors (8 of 8) |
| corpus, default | `0 regression(s), 7 improvement(s)` |
| corpus, IR vs text | `test_subclassinit` now agrees |

### The pattern, three times running

Cuts 133, 134 and this one are the same defect: a correct PR changed a text
emitter, and the IR copy of it stayed where it was. Nothing pre-merge compiles
through IR, so each was found hours or days later by someone else. The sweep
found this one within hours; that is the argument for running it pre-merge.
