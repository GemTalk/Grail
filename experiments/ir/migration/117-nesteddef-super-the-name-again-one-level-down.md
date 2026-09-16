## `nestedDef:super`: the name again, one level down (2026-09-16)

`cm:nestedDef:super` (3) plus the module-program `nestedDef:super` (1). Any
closure whose body MENTIONED `super` refused.

The reason recorded for it is entirely about the ZERO-ARGUMENT spelling: the
text asks the innermost def for `super()`'s argument 0, and a def with no
enclosing class raises `super(): no arguments` — arms the IR super shapes do not
emit. **None of that is a reason to refuse `super(C, obj)`**, which names its
class and its object outright, consults no frame, and is an ordinary
two-argument call.

This is the same over-wide refusal `super` in a METHOD had, corrected the same
way and for the same reason — see the `frameSensitive` family and cut 88's
`___irSuperStaysOnText___`. **The pattern is worth naming: a refusal written for
one spelling, keyed on the NAME, quietly covers every other spelling of it.**
Three rows have now gone this way.

### What the corpus actually held

| site | spelling |
| --- | --- |
| `_py_warnings` `deprecated.__call__` | `super(arg, cls).__init_subclass__(...)` |
| `test.support.hashlib_helper` | `super(decorated_class, cls).setUpClass()` |
| `test_super` `test_unusual_getattro` | `super(MyType, type(mytype)).__setattr__(...)` |
| `test_super` `test_obscure_super_errors` | `super()` — the bare one |

Three of the four are explicit two-argument calls. Only the last is the shape
the refusal was written for, and it still refuses.

### The bare spellings are in the fixture on purpose

A narrowing that started compiling them would emit the ordinary builtin call,
whose message is not CPython's — a WRONG message rather than a missing feature,
which is exactly what `SuperPreconditionErrorsTestCase` measured for the method
case. `testTheBareSpellingsStillRaise` is the guard on this cut's blast radius.

### Only the census can see this cut

The values are right either way: an eligibility refusal never reaches the seam,
so the refused defs compile the old way and `fallbacks` reads 0. The control
bears that out — restoring the blanket refusal fails **one** of the four tests,
and it is the census one. (Its guard is `___irCodegenSupported___`, not the
ambient `___irCodegenEnabled___`, for the reason the previous cut records.)

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:nestedDef:super` | 3 | **1** |
| `nestedDef:super` | 1 | **0** |
| `cm:eligible` | 13213 | **13215** |

Three sites freed, **+2 net** on the class-method row; the one left is
`test_obscure_super_errors`, whose whole subject is the RuntimeError arms.
Same-tree baseline on the `main` this branch was cut from (`2ecc3607`), measured
by reverting `FunctionDefAst.gs` alone to `origin/main`, re-running `install.sh`
and censusing again. `CENSUS.md` still wants one combined re-measure once the
family has landed.
