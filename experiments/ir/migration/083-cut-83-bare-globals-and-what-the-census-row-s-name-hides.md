## Progress — cut 83 (bare `globals()`, and what the census row's name hides)

**The `frameSensitive` family is misnamed, and that is the finding, not the
cut.**  Six rows -- `globals`, `locals`, `vars`, `dir`, `eval`, `exec`, 231
together -- read as builtins that need the calling frame, and the roadmap was
about to skip the whole block on that reading.  They do not.  Every one is a
COMPILE-TIME REWRITE that `printSmalltalkOn:` performs at step 0, before any
fast path:

* `globals()` becomes `(PyModuleDict @env0:on: <recv>)`, the receiver chosen at
  compile time;
* `locals()` / zero-arg `vars()` become a pair-array of the names in the
  enclosing scope (`printLocalsCallOn:`);
* zero-arg `dir()` is `___dirOfNamespace___:` applied to that same pair-array;
* bare `eval` / `exec` in a function inject that same pair-array as the
  evaluation namespace.

So four of the six are DOWNSTREAM of one piece of machinery, `printLocalsCallOn:`,
and none of the six needs a runtime frame.  The block is tractable; it was the
row name that said otherwise.

**This cut takes the one that stands alone.**  `globals()` does not depend on
`printLocalsCallOn:` at all -- its receiver comes from
`___globalsViewReceiverExpr___`, which is two cases once doits are excluded:
`self` in the module body and its top-level defs, where `self` IS the module
instance, and the module SINGLETON inside a class method, where `self` is the
Python instance instead.  Both sends are ENV 0.  Picking the wrong receiver
still compiles and only misbehaves at run time, which is why the fixture
exercises both.

Doits are excluded rather than handled: there the text's receiver is
`___pyGlobals___`, a symbol-list scope the IR builder has no leaf for, and IR
refuses doits everywhere else already.  The match is otherwise the text's
exactly -- the bare name, no arguments, no keywords.  `globals` reached through
a local alias is not a `NameAst` function and never arrives here; a local
literally NAMED `globals` is rewritten by the text too, because its step 0 runs
before any shadowing test, and reproducing that is the point.

**Measured.**  `CallAst:frameSensitive-globals` **49 -> 0**.  Total refusals
across both corpora **737 -> 699**, which is 38 rather than 49: eleven of those
defs refuse again a step later, the same UNCOVERING effect cut 81 recorded for
`NameAst:super`.  Corpus 2 goes 93.1% -> **93.4%** of all defs through IR;
the stdlib reaches 1575 of 1592 top-level defs (98.9%) and 4573 of 4621 class
methods (99.0%).

**Verified against both oracles.**  Nine fixture shapes: a read, a missing key
raising `KeyError`, a write that creates a real global, the LIVE view (a write
through it visible as a global and back through the same view), a name defined
later in the module, `isinstance(globals(), dict)`, a read and a write from
inside a METHOD (the module-singleton receiver), and a local shadowing a global
-- where the bare read must answer the local and the view still report the
module binding.  All nine agree on the IR path, the text path, and CPython;
fixture gate 5185 OK / 39 XFAIL under Python 3.14.6.

Smoke count 563 -> **572**, almost all of it this cut's own fixture defs: the
emitter change moves little there, because the smoke module barely called
`globals()` before.

**Next in this family** is `printLocalsCallOn:` itself -- `locals()`/`vars()`
at 23 rows directly, but it is the machinery `dir` (37) and `eval`/`exec` (125)
all stand on, so it is worth more than its own row count.  It is also the
branchiest thing here: five scope cases (function, module, module-inside-a-
comprehension, class body, class-body-inside-a-comprehension), each with a
recorded reason.  That is a cut of its own, not an extension of this one.
