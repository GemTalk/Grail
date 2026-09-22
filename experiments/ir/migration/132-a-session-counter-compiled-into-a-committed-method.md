## A session counter compiled into a committed method

The flag-on suite had 53 defects. The flip was blamed, and the flip was
innocent: clean `main` with `GRAIL_IR_CODEGEN=1` produced an **identical**
53-defect list, so what the flip did was make a latent defect the default.

### What the id was

A class-body def is registered in a session table and its id is compiled as a
LITERAL into the class-build statement:

```smalltalk
id := (temps at: #'___grailIRDefCounter___' otherwise: 0) + 1.
temps at: #'___grailIRDefCounter___' put: id.
```

A per-session monotonic counter. The statement carrying it, though, lives in a
method which is **committed** -- a deployed framework, a canonical module -- and
re-runs in later sessions, and once per CALL for a method-local class. A later
session's counter restarts at 1, so the baked-in id names whatever THAT session
happened to register in that slot.

### Why nothing caught it

`___irInstallDef:on:or:category:` already guards the id being **unknown**: it
falls back to the text source, which its docstring calls out as the safe
outcome. There is no guard it could have had for a **known and wrong** id, and
a selector check would not have helped either. From the id trace:

```
id=939 class=chain shared=__bool__       srcHead=___init__: positional kw: kwargs
id=940 class=chain shared=___init__:kw:  srcHead=__iter__
id=941 class=chain shared=___init__:kw:  srcHead=__next__
```

The whole sequence is shifted by one against the deployed code's ids, so
`chain` took `SeqIter`'s `__init__` -- and both defs are named `__init__`, so
the names agree while the bodies do not.

### The fix

Make the id **self-identifying** rather than positional:

```
<module>|<classOffset>|<defOffset>|<name>|<side>
```

An id from another session then names the same LOGICAL def: it either finds
that def (correct) or finds nothing (the documented text fallback). That
removes the failure mode instead of detecting it.

A doit keeps the counter. With no module name there is nothing to make the key
unique -- two exec'd strings can each hold a class at offset 10 with an
`__init__` at offset 30 -- and a doit's method is not committed, so the
cross-session recycling this fixes cannot reach it.

### What the search got wrong, and why it still paid

The bisect over suite classes found brackets but no culprit. Two binary
searches named `CPythonHarnessTestCase` and `ClassBodySourceOrderTestCase`;
the minimal triple built from them did **not** reproduce. That is the result
that mattered: it falsified the premise both searches rested on -- that one
class poisons the table -- and established the condition is CUMULATIVE, enough
registrations in a session to land on a live id. The searches were still worth
running, because they produced a 3-minute reproduction, and a 3-minute
reproduction is what made an id trace affordable.

A related trap sat in the middle of it: one trace run passed, which looked like
the defect vanishing. `install.sh` had re-deployed and therefore rewritten the
committed ids -- the run was measuring a freshly-consistent image. That is
corroboration of the cross-session model, not a counterexample to it, but it
reads as the opposite for as long as it takes to notice.

### Gates

| arm | result |
| --- | --- |
| `GRAIL_IR_CODEGEN=1` | 7018 run, 7018 passed, 0 failed, 0 errors (8 of 8, 0 login failures) |
| `GRAIL_IR_CODEGEN=0` | 7018 run, 7018 passed, 0 failed, 0 errors (8 of 8, 0 login failures) |
| corpus, IR on | `0 regression(s), 5 improvement(s)` |

Shard 5 alone went from 20 defects to `1084 run, 1084 passed, 0 failed, 0
errors`; shard 0 from 33 to zero.

`IRDefIdStableTestCase` pins the property a counter cannot have -- the same
logical def registers under the same id across separate compilations -- plus
the two ways over-collapsing would trade one swap for another: two defs sharing
a name must still differ, and the same source compiled as two modules must
differ.
