## `decorators:bigmemtest`: a refusal that was standing in for a crash (2026-09-13)

`decorators:bigmemtest` (10) was the only row on the board whose stated reason
was not a shape at all. Its own comment said so:

> applyBigmemtestDefaultIfNeeded rewrites the def before codegen, injecting a
> SYNTHETIC `size` default with no source position, and the varargs prologue's
> default memo stamps the def's position — the IR build raised (`nil does not
> understand #-`) and fell back to text, four fallbacks in the test-corpus
> census. **A fallback is safe but is not a refusal; this is.**

Turning it into a refusal was the right call at the time — a silent fallback is
worse than a counted one — but it left a defect recorded as a feature.

### The fix is one node

`ConstantAst new value: 5147` stands for no characters of the source, and it
carried no position. `PyMethodIRBuilder>>atNode:` computes
`beginPosition - sourceBase + 1`, so a nil `beginPosition` is not merely
unmapped, it raises. The node now carries the **def's own extent** — which is
what CPython would blame for a default evaluated at definition time, and which
makes the node well formed for every consumer rather than only for the one that
crashed.

**The text path is byte-identical either way**, verified by diffing the
generated Smalltalk for a `@bigmemtest` class before and after the change rather
than by reasoning about it.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:decorators:bigmemtest` | 10 | **0** |
| `cm:eligible` | 10743 | **10753** (98.3%) |

+10, with nothing moving up behind it — none of the ten refuses on a second
reason. `nestedDef:bigmemtest`, the closure-form twin of the same guard, goes
with it. The stdlib corpus is unmoved at 4575: it has no `@bigmemtest`.

### Two controls, and they land on DIFFERENT assertions

This is the part worth keeping, because it inverts the pattern the last several
cuts established.

* **Restore the refusal** (leaving the position fix in): the census moves —
  `cm:decorators:bigmemtest` 2, `cm:eligible` 1 on the fixture — and
  `___irStats___` does not, because an eligibility refusal never reaches the
  seam. Caught only by the CENSUS assertion.
* **Revert the position stamp** (leaving the refusal removed): `___irStats___`
  reports **2 fallbacks**, `a UndefinedObject does not understand #'-'`, on both
  decorator spellings — and the census is IDENTICAL, because a fallback is not a
  refusal. Caught only by the FALLBACKS guard.

In both arms the fixture still answers `(5147, 5147, True, True)`, from the text
twin. So for this cut the behavioural test is worthless as a regression guard,
the census assertion catches one revert, the fallbacks guard catches the other,
and neither alone is enough. Every previous cut needed the census assertion
*because* `compiled > 0` could not see an eligibility widening; this one needs
both for two different reasons.

### Why there is no `tests/python` fixture

A fixture there must self-verify under real CPython, and this shape cannot. The
shim fires on the decorator's NAME and injects the default whatever the
decorator actually does, so a file with a passthrough `bigmemtest` answers 5147
in Grail and raises `TypeError` in CPython — that divergence is the whole point
of the shim. The existing stdlib-tree fixture
(`src/python/stdlib/test/grail_bigmem_check.py`, already driven by
`CPythonHarnessTestCase >> testBigmemtestDecoratorInjection` on the text path) is
driven from `BigmemtestIRTestCase` instead.
