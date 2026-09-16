## `NameAst:type-other`: a `false` that meant "already handled", read as "refuse" (2026-09-16)

`cm:NameAst:type-other` (3). `type` read as a VALUE must be the CLASS, not the
BoundMethod wrapper every other builtin read answers, and the IR path has had
that since cut 55. What it did not have was the name in the FUNCTION POSITION
of a call.

`isFastPathBuiltinName` answers false there **by design**, and its own comment
says why: *"CallAst>>printSmalltalkOn: has already decided whether to emit the
fast path... We must not wrap the function in a BoundMethod."* The IR path read
that `false` as *refuse*. The text reads it as *emit the bare identifier and let
the call spell itself*:

```smalltalk
type @env1:__new__                                    (no arguments)
type @env1:__new__: ('A') _: (()) _: ({}) _: (())     (four)
type @env1:value: { ... } value: <kwargs dict>        (any keyword)
```

**So nothing here was a missing feature.** All eleven measured shapes already
answered the same on both paths — the IR just reached that answer by falling
back to text. The cut changes eligibility, not behaviour, which is why the
behavioural test asserts the two paths AGREE rather than that either is right,
and why the guard is a census assertion.

Most of these shapes are wrong about CPython on BOTH paths and are the
fixture's XFAILs: Grail's `type()` accepts arities CPython rejects, words its
TypeErrors differently, and builds a class from `type('A', [], {})` where
CPython insists the bases be a tuple. Not this cut's, unchanged by it, pinned so
a later fix has to come through the file.

### One of the three moved rather than closed

| row | before | after |
| --- | ---: | ---: |
| `cm:NameAst:type-other` | 3 | **0** |
| `cm:CallAst:builtinArityMismatch` | 2 | **3** |
| `cm:eligible` | 13213 | **13215** |

Three freed, two closed, one relocated to the row that names the gap actually
stopping it — so **+2 net**, and only the row-by-row diff shows it. Same-tree
baseline on `2ecc3607`, measured by reverting `NameAst.gs` alone.
`CENSUS.md` still wants one combined re-measure once the family has landed.
