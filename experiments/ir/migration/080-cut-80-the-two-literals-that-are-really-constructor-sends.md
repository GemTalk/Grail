## Progress — cut 80 (the two literals that are really constructor sends)

Not every Python literal compiles to a Smalltalk literal.  Two cannot, for the
same reason: there is no literal syntax that can hold the value.  A `complex`
has none at all, and a str holding a LONE SURROGATE has no Character for its
code point -- which is why `PyStrSurrogate` exists.  So `printSmalltalkOn:`
emits a CONSTRUCTOR SEND for each, and until this cut `ConstantAst`'s IR
eligibility refused both, which is why they show on the board as
`ConstantAst:complex` and `ConstantAst:surrogateStr`.

**How.**  Both emits are one send, read off the text rather than chosen:

* `(PyStrSurrogate @env0:___fromCodePoints___: #(cp cp ...))` -- an ENV 0 send,
  with the code points as an invariant literal Array, matching what the
  Smalltalk compiler makes of `#(...)`;
* `(complex ___new___: <real> _: <imag>)` -- an ENV 1 send.

The environment is the part worth naming, because getting it wrong is SILENT:
`envFlags` is just an integer on the send node, so an env-1 send where the text
wrote `@env0:` compiles fine and dispatches into the wrong method dictionary at
run time.

The two arguments travel as the OBJECTS the parser already holds, where the text
has to print them and have the compiler read them back.  That is strictly safer
rather than merely shorter: a Float literal's round trip through `printString`
is the one place this emit could disagree with the text about a VALUE, and
passing the Float itself removes the question.  Checked rather than assumed --
`0.1 + 0.30000000000000004j`, `1e-300 + 2.5e-17j` and
`1.7976931348623157e308 + 1j` all `repr()` identically on the IR path, the text
path, and CPython 3.9.6.  So do the surrogate cases (`'\ud800'` -> `[55296]`,
`'a\udc80b'` -> `[97, 56448, 98]`, and an astral pair, which must NOT be
treated as a surrogate at all).

**Measured.**  `ConstantAst:complex` 74 -> **0** and `ConstantAst:surrogateStr`
27 -> **0**; total remaining refusals across both corpora 2322 -> **2221**,
which is exactly -101.  Corpus 2 goes from 80.3% to **81.1%** of all defs
through IR (class-body methods 8676 -> 8776 eligible).  The stdlib side moves by
one def, because these literals are overwhelmingly TEST code.

**Also here: one residue item retired, in the test rather than the emitter.**
`ImportlibTestCase>>testInstanceMethodNoOuterBlock` reads the emitted TEXT --
the `___compileMethod:` send, the pragma and temps lines inside its source
literal, the absence of a `^ [` wrapper.  Under the flag the class-method seam
emits `___irInstallDef:` instead, so the test failed on its own PREMISE (its
first search found nothing) rather than on the wrapper it exists to rule out.
It now forces the flag off around `runPath:` and restores it in an `ensure:`,
the `UnboundLocalErrorTestCase>>unboundGuardFixture` idiom.  That is not
weakening it: the text emitter is still the shape it is about, and still the
fallback the IR seam compiles when a build fails.

**A finding for the record: an IR method can never carry the `<grailPython>`
pragma.**  Main's #880 replaced the `___curPos___`-temp heuristic with an
explicit pragma, and the obvious follow-up was to emit it from the builder too.
It cannot be done.  `GsComMethNode` has no pragma instance variable and no
pragma selector, and `generateFromIR:` (prim 679) takes only the meth node, so
there is nothing to put in the slot; measured on a hand-built IR method, its
`pragmas` is empty and debugInfo slot 4 is `nil`.  Nor can it be patched
afterwards: `_debugInfo:` fails with `Attempt to modify invariant object` even
on a fresh, never-installed method.  (`_hasPragmaInfo` is not a usable test
either -- it answers true for a method with an EMPTY pragma array.)

The consequence is worth stating where it will be read.  `BaseException class
>> ___isGeneratedPythonMethod___`'s comment presents its SOURCE probe as a
compatibility shim for methods compiled before the pragma.  For the IR path it
is not a shim: an IR method carries no pragma and no `___curPos___` temp, so the
source read is the ONLY route to its identity -- and that is the read whose
fault under concurrent shards motivated the retry #880 built.  So the retry is
load-bearing for IR, not legacy.  Nothing is broken today (classification is
correct through the fallback, measured on `_py_warnings>>resetwarnings`), but
the source probe must not be pruned as dead.  An in-memory marker is possible
-- a distinctively named method-level temp -- and is deliberately NOT taken
here: it costs a frame word on every generated Python method, and frame width is
already load-bearing for recursion depth (one extra temp in `___pyAttrLoad___`
broke `test_richcmp`).  It should be measured against the recursion tests before
anyone writes it.
