## Progress — cut 77 (a method-local class that captures)

Cut 76's one real refusal was `classDef:capturesLocal`, 140 of the 179
remaining class-method refusals in the fourteen-module test subset and 8 of 8
in the stdlib.  Two of the three kinds of capture can be carried; the third is
what is left, and it is now measured rather than guessed.

* **The enclosing RECEIVER needs no marshalling at all.**  The text names it
  Smalltalk `self` everywhere in the class emit, cell store included
  (`R ___pyAttrStore___: #'___cell_self___' put: [self]`), and cut 76's helper
  is installed on the same class -- so `self` means the same object there and
  the text compiles unchanged.  Cut 76 refused these for nothing.  Measured on
  a class whose body method reads the enclosing `self` past a differently-named
  receiver (`def get(inner): return self.v`).
* **An enclosing PARAMETER the def never assigns and never deletes is carried
  BY VALUE.**  Such a name binds once per call and cannot change afterwards, so
  a value is observationally identical to the text's by-reference cell block.
  The helper stops being unary: the values arrive as one Array
  (`___irCaptured___`) in sorted order and are bound to temps spelled the way
  the class emit names them in the ENCLOSING scope
  (`___enclosingScopeIdentifierFor___:`, which is the `_self` transport
  identifier for a pseudo-variable parameter and the plain name otherwise), so
  every read the emit makes -- the cell block `[tag]`, a class attribute's
  value expression, a base-class expression -- resolves to the temp.  The
  argument array is built BEFORE the position stamp, because each captured read
  re-stamps the builder (cut 73's rule).
* **A BODY LOCAL, or a reassigned parameter, still refuses.**  The text's cell
  is a block, so a later rebinding is visible through it -- CPython's cell
  semantics -- and a loop rebinds under the class's feet.  `mlc_cap_reassigned`
  is the negative control: the def does `x = x + 1` after the class statement
  and both CPython and the text answer the NEW value, which a carried value
  would freeze.

One correctness gap found while drawing the line: a `nonlocal` anywhere below
the class (in a body method, not just at class-body level) makes the text emit
a SETTER cell, `___cellSetter_x___ put: [:v | x := v]`, which writes the
enclosing frame's temp.  No marshalling reaches that frame, so
`classDef:nonlocalBelow` refuses it -- 9 class methods and 1 top-level def in
the test subset, previously inside the `capturesLocal` count.

Two more traps, both of which would have been silent:

* **Eligibility cannot read `CallAst functionBeingCompiled`.**  The seam asks
  `___irEligible___` BEFORE `___installIRMethodOn___:` sets that static, so at
  eligibility time it is nil (or an outer def) and every capture looked
  uncarried -- the cut measured as a no-op until the enclosing def came from
  the PARENT CHAIN instead, which answers the same node at both moments.
* **The census's denominator moved, in both directions.**  A class inside a
  class-body METHOD is emitted twice (the method's text twin is generated
  anyway), so the inner class's methods were tallied twice: +326 phantom
  `cm:method:classNotAtModuleScope` rows over fourteen modules.  Suppressing
  the tally for every transport emit then made a MODULE-level def's inner
  methods vanish, because there the transport is the only emit.  The census
  flag is therefore set only in method mode
  (`ClassDefAst>>___irEmitClassBodyAsTextDo___:`), separately from the seam
  flag, and the cut-76 numbers above were re-measured with it right.

**Census.**  Stdlib: unchanged at 1565 / 1592 top-level defs and 4541 / 4621
class methods, 6098 compiled, 0 fallbacks -- all eight stdlib captures are body
locals (`collections.namedtuple`, `typing._nt_base`, `pydoc._start_server`,
`pydoc._url_handler`, `jinja2.runtime.make_logging_undefined`,
`typing.NewType.__mro_entries__`, `pydoc.HTMLDoc.docclass`,
`pydoc.TextDoc.docclass`).  Test subset (same fourteen modules, `./install.sh`
first): class methods 2957 -> **2960 / 4103**, top-level defs unchanged at 797
/ 821, and `cm:classDef:capturesLocal` 140 -> 128 with 9 of the difference
reclassified as `nonlocalBelow`.

**So this cut is small, and the number says why**: real code captures BODY
LOCALS, not parameters -- `calls = []` and then a class whose method appends to
it is the archetypal test-corpus shape.  Carrying those needs the by-REFERENCE
cell, which the helper can only get by being handed the enclosing frame's own
block: the reader `[calls]` built in the IR method and the cell store rewritten
to `put: [<arg> value]` through `___enclosingScopeIdentifierFor___:`, which is
the one hook the text already routes every cell store through.  That is sound
only when the name is read NOWHERE but inside the body's methods (a class-body
value expression or a base would see the block, not the value), which is
checkable.  It is the next cut, and it is worth 128 of the 179 refusals here.

Gates (both from wt/d on gs40 through `scripts/with_stone_lock.sh`, 8 of 8
shards reporting, no "Login failed", per-shard counts summing to the suite
line): flag-off `6551 run, 6551 passed, 0 failed, 0 errors`; flag-on cold sweep
`6551 run, 6545 passed, 5 failed, 1 errors` -- the same six as main, no new
name.

Fixture: mlc_cap_attr (a captured parameter read at class-body level AND from a
method), mlc_cap_base (the base class is a parameter, with `super()`),
mlc_cap_two, mlc_cap_default, mlc_cap_pseudo (`self` and `nil` parameters, the
transport spelling), MlcerCap.from_receiver / from_body / from_param (the
enclosing receiver, alone and with a parameter), and mlc_cap_reassigned as the
negative control.  Compiled 480 -> 492, 0 fallbacks, RESULTS true with the flag
on and off and under CPython 3.14.6.
