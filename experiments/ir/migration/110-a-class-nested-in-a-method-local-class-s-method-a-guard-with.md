## A class nested in a method-local class's method: a guard with no mechanism behind it (2026-09-14)

`cm:method:methodLocalNestedClass` (11) refused the one-level-deeper case of a
shape the transport already handles. `Outer` travels as a compiled-text helper
because it is defined in a function body (cuts 76/79); `Inner` does the same
thing again from inside a method that is itself being built.

**Removing the guard is the entire change.** No new emit: the class statement
inside the method takes the same transport it takes anywhere else, so
`self ___irSubtreeContainsClassDef___ ifTrue: [^ #'method:methodLocalNestedClass']`
was refusing a shape that already worked.

That is a claim worth distrusting, so the fixture stresses the family rather
than the single line that motivated it — three levels deep, several methods
sharing one capture, a base expression, and both class-cell readers
(`__class__` and zero-argument `super()`) resolving to the INNER class. All nine
agree with CPython under IR with 0 fallbacks.

### What a broken transport would do

The failures here are wrong VALUES, not errors, which is what the checks are
shaped around. A dropped capture reads nil rather than raising. A class hoisted
out of the enclosing method would silently ALIAS two calls instead of building
one per call — `each_call_builds_a_fresh_class` compares IDENTITY rather than
contents, because two equal-looking classes is exactly what that bug produces.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:method:methodLocalNestedClass` | 11 | **0** |
| `cm:eligible` | 10878 | **10889** (98.7%) |

Eleven retired, **+11 net** — nothing moves up behind it. Measured against a
same-tree baseline on the `main` this branch is cut from; it includes neither
#981 nor #982, both of which move other rows of the same family.

### The control

With the refusal restored the fixture censuses 10
`cm:method:methodLocalNestedClass` against 13 `cm:eligible` and compiles 22 of
the 47 — and the behavioural comparison **still passes on all nine checks**,
from the text twin. The census assertion is the only instrument that sees it.
