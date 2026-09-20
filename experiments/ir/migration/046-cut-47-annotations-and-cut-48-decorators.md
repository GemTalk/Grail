## Progress — cut 47 (annotations) and cut 48 (decorators)

Roadmap items 5 and 6, the two largest class-method blockers after batch 7
(return annotations 1140 methods + 258 defs; decorators 353 + 70).  Both
turned out to be eligibility-only cuts: neither changes an emit.

**Annotations (cut 47).** The refusal assumed annotations emit runtime
statements the IR does not produce.  They do -- but never in the method.  A
module def's PEP 649 `__annotate__` is stamped on the module instance by the
def STATEMENT (`___setFunctionAnnotations___:annotate:` in
`printSmalltalkOn:`), a class method's by ClassDefAst's stamp loop
(`___methodAnnotationsTable___` and friends), both text statements emitted
around the compiled method whichever path built it; neither
`generateModuleMethodSourceOn:` nor `generateMethodSourceOn:` reads
`returns` or a parameter annotation.  The two refusals go; `typeParams` (PEP
695) stays.

**Decorators (cut 48).** The same shape.  Grail compiles the def to a real
method FIRST and applies decorators over it afterwards, as text: a module
def's by its statement (`printModuleDecoratorsOn:`, storing `A(B(f))` in the
module slot that every bare call probes first -- the IR's `#moduleSelfSend`
emits the same probe), a class method's by ClassDefAst's decorator loop
(`Cls.m := A(B(Cls.m))` over the compiled method, the base an UnboundMethod
resolved by selector, so an IR method serves as well as a text one).  The
decorator-specific SOURCES -- `@requires_resource` / `@cpython_only` skip
bodies, the `@x.deleter` redirect -- are separate ClassDefAst branches the
predicate is never asked about; a `@property` getter is the plain unary
method plus a synthesized text setter; `@bigmemtest` is normalised before
codegen; and a self-send to a decorated sibling already takes the attribute
path (`classSelfSendSelector` consults `classDecoratedFunctionNames`, and the
IR call shape reuses it).  The refusal goes.

Fixtures: typed_add / typed_none / class Typed with an `__annotations__`
check against CPython's exact values; a `functools.wraps` decorator and a
tagging factory on module defs, class Deco with a decorated method, a
`@property` getter and a self-send to the decorated sibling.  One text gap
recorded and not asserted: `deco_add.__doc__` through `functools.wraps`
answers None on either path.  Compiled 190 -> 196 -> 204.

### Cut 48 flushed out a seam defect: registrations keyed by Python name

The first flag-on sweep lost every `@property` with an explicit setter (six
`AttributePropertyTestCase` failures, the BuiltinSubclassProperty and
ClassBodyMethodDecorator property tests, an inherited-pair read, three
Django WSGI errors -- a request property answering the getter's
BoundMethod).  The seam's per-class registration map (`___irClassDefIdsFor___:`)
was keyed by PYTHON NAME, and a getter and its `@x.setter` share one: the
setter's registration overwrote the getter's, the getter's install
statement built the SETTER (the setter's own text compile overwrote it a
statement later), the getter's text fallback never ran, and the unary
`celsius` was simply absent from the class.  Until cut 48 no two eligible
defs in one class body could share a name, so the key was never exercised.
Keyed by SELECTOR now: `___irSelector___` at registration, and the emission
loop reads the same key off each source's pattern line
(`___irSelectorOfSource___:`).  Fixture: Deco gains a `level` getter/setter
pair; compiled 204 -> 206.

The census then showed four FALLBACKS in the test corpus (`test_large_subn`,
`test_large_utf8_input`, ...): `@bigmemtest` methods.  `applyBigmemtestDefaultIfNeeded`
rewrites the def before codegen, injecting a synthetic `size` default with no
source position, and the default memo stamps the def's position -- the IR
build raised (`nil does not understand #-`) and fell back to text.  Safe, but
a fallback is not a refusal; `isBigmemtestDecorated` now refuses
(`decorators:bigmemtest`), and the fallback counters read 0 across all four
census sessions again.
