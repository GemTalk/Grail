## The module-call probe was costing two frames per call (2026-09-12)

Measured while investigating the three flag-on resource failures. The text
writes the module-function dispatch as

    [:___f___ | ___f___ == nil ifTrue: [self f: ...] ifFalse: [...]]
        value: (self ___dynamicInstVarAt___: #f)

and GemStone's SOURCE compiler inlines a literal-block `value:` to no activation
at all. **The IR generator cannot** — it builds a real `ExecBlock` — so the send
cost two real frames, `ExecBlock>>value:` and `ExecBlock>>valueWithArguments:`,
on every module-function call. That is the hottest emit in the language.

Frames per Python call, and the recursion depth they buy, measured on a
self-recursive def:

| path | frames/call | depth |
| --- | ---: | ---: |
| text | 6 | 391 |
| IR, before | 8 | 322 |
| IR, after | **5** | **448** |

`ifValue:then:else:` is already inlined (`COMPAR_IF_TRUE_IF_FALSE`), so a temp
plus that conditional is the same shape at no frame cost.

**The block was not arbitrary, and the replacement needs the same property.** A
block activation gave every call its own `___f___`; the emit assigns the probe
and THEN builds the argument list, so one shared temp would let the inner call
of `f(g(1))` overwrite the outer's probe between its assignment and its use, and
the outer send would call `g`. `___irProbeTempSymbol___` counts enclosing
`CallAst`s the way `ForAst>>___irIterTempSymbol___` counts enclosing loops, which
separates exactly that case. Siblings at one depth share a temp soundly, because
neither interleaves with the other.

### It did NOT fix the three flag-on failures, and the negative result is the point

The hypothesis was that IR frames are fatter, so recursion bottoms out earlier.
**Measured, that is false in both directions:**

| recursion | text | IR (after) |
| --- | ---: | ---: |
| module-function | 391 | 448 |
| method-to-method | 2607 | **3041** |

Method-to-method recursion is **one frame per call on both paths** and always
was. So IR is not stack-poorer than text — it is now stack-RICHER on both axes,
and the two `RecursionError`s are not a frame-width problem.

What the evidence actually points at is a MEMORY ceiling:

* `test_set` fails as an outright `OutOfMemory` (`48233Kdoits`), not a stack error;
* `PrivateNameManglingTestCase>>testPrivateNameMangling` **passes standalone with
  the flag forced on** and fails only inside a suite shard — state dependence,
  not a deterministic defect;
* `test_copy` is the only one that reproduces alone, and its
  `GRAIL_STACK_OVERFLOW` reads `enter=2 converted=2` — both overflows WERE
  converted, so the yellow-zone reserve is not being overrun either.

And leaner frames make that worse, not better: deeper recursion is more live
frames, so the memory ceiling arrives sooner. **The three failures should be
costed as one memory problem, not as a codegen problem** — which matches the
standing note that the `test_set` OOM is caused by three per-class session caches
pinning every class, and is not an IR bug. IR only raises the floor enough to
expose it.

---
