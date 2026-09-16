## Progress — cut 81 (the class-method closure CELL)

Cut 79 exposed this row rather than creating it.  A class method reading an
enclosing FUNCTION's local was previously refused twice over -- the whole
method refused as `classNotAtModuleScope` -- so `NameAst:classCell` sat at 120
in a subset and jumped to **272** on the full board the moment cut 79 let those
methods build.  It was then the single biggest refusal, three times the next.

**How.**  One send, and the text already had it: the method compiles with no
home context, so the enclosing temp is unreachable from it; the class emit
stores each captured name on the class at DEFINITION time and the read goes
back through the receiver's class chain --
`(self @env1:___classCell___: #'___cell_x___')`.  `___irClassContextLoadKind___`
answers `#classCell` where it answered nil, and `___emitIRValueOn___:` emits
that send: env 1, receiver `self`, one Symbol literal.

**The part that is not obvious, and is a sequencing argument rather than a
translation.**  The text branch also has a SIDE EFFECT -- `CallAst
addCapturedClassName: id` -- and that registration is what makes the class emit
store the cell at all.  The IR emit deliberately does NOT repeat it, because it
could not work if it tried: an IR method is built at the seam's registration
point or later, by which time the emit has already written its cell stores, so
a registration from here would arrive too late to have any effect.  It is not
needed either -- a class-body method's TEXT TWIN is generated whatever path
builds it, being the fallback literal of its own `___irInstallDef:` statement,
and the text branch fires the registration as it runs.  This is the same
argument `___irDunderClassLoadKind___` already relies on, and the two now stand
or fall together: if the text twin ever stops being generated, both break.

**Measured.**  `NameAst:classCell` **272 -> 0**.  Total refusals across both
corpora **998 -> 737**.  Corpus 2 goes from 91.0% to **93.1%** of all defs
through IR (class-body methods 9999 -> 10260 eligible); the stdlib moves by 7,
because a class inside a function is mostly a TEST shape.

`NameAst:super` is the new top at 91, up from 84 -- seven methods that used to
refuse on the cell now get as far as refusing on `super`.  That is worth
stating plainly: retiring a refusal can UNCOVER the next one on the same
method, so a row that grows after a cut is not necessarily a regression.

**Verified against both oracles, not just the text.**  Six new fixture shapes
in `ir_codegen_smoke.py`, each one that a by-VALUE reading of the cell or a
partial registration would get wrong: a plain capture; the class's own name
read inside its method (`C.__name__`, also an enclosing local); a rebinding
AFTER the class is defined (105 in CPython, 5 under by-value); two
instantiations that must not see each other's cell; several captured names in
one method plus one only a sibling method reads; and one class per loop
iteration.  All six agree on the IR path, the text path, and CPython -- the
fixture gate reads 5167 OK / 39 XFAIL under Python 3.14.6.

**The smoke count moved twice and the split is recorded** in
`IRCodegenSmokeTestCase`: 536 -> 549 from the emitter change alone, then -> 563
with this cut's fixture defs and their inner classes' methods.  That assertion
is exact on purpose -- it is what makes a silently dead seam visible -- and the
flag-OFF suite is what catches it, because the smoke test forces the flag.  A
stale pin there reads as a flag-off failure, which is alarming and is not one.
