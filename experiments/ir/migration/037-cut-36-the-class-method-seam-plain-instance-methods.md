## Progress — cut 36 (the class-method seam: plain instance methods)

Roadmap item 1, opened.  A Python class's methods are compiled at RUN time:
ClassDefAst emits, into the module's initialize, one ``<cls> ___compileMethod:
'<source>' category: 'Grail-Class Methods'.`` statement per def, with the method
source embedded as a string literal, and the class object only exists when
that statement runs.  An IR tree cannot travel inside a string literal, so the
transport is a session-side table plus a deferred build:

* while ClassDefAst emits the class body -- the moment the compile context
  (classBeingCompiled, selfParameterName, classFunctionNames, the slot and
  backing-instVar sets, ...) is exactly what the text source was generated
  under -- an IR-eligible def is registered with `importlib
  ___irRegisterDef:forClass:name:`, which stores the def AST together with
  `CallAst ___compileContextSnapshot___` (a copy of the session compile-context
  dictionary) and answers an id;
* the emission loop then writes ``importlib @env0:___irInstallDef: <id> on:
  <cls> or: '<source>' category: 'Grail-Class Methods'.`` in place of the
  ___compileMethod: statement (ClassDefAst>>emitIRInstallOn:id:source:
  category:onStream:);
* at run time `importlib ___irInstallDef:on:or:category:` restores the
  snapshot around `FunctionDefAst>>___installIRMethodOn___:category:` -- the
  module-def builder with the method selector (`instanceMethodSelector`), the
  receiver stripped from the Smalltalk arguments (`___irBuildParamNames___`)
  and the category set explicitly (the runtime tells a def from a class-body
  value BY category: object>>___setNameOn___:, the property-pair test) -- and
  on any error, or with the flag off, or an unknown id, compiles the embedded
  text exactly as before.  The same stats counters record the outcome.

The table is session-local like the compile context: a module builds and
runs in one session, and a deployed class keeps its methods in the repository.

**Method-mode eligibility** (`___irMethodModeReason___`, each exit a census
``method:...`` row) is deliberately narrow for this cut: a PLAIN instance
method (`InstanceFunctionDefAst` -- no @classmethod / @staticmethod /
decorators / forwarders) of a module-level class, receiver named ``self`` and
never rebound, no __slots__, no method temp shadowing a backing instVar, and
NOT `__init__`: it compiles under the varargs selector ``___init__:kw:`` even
when simple-positional (compilesAsVarargs, for keyword construction), so it
needs the varargs calling convention the defaults/varargs lane is building.
Everything else about the body is the module-def rules.

**Method-body emits added**, each the text's own shape: ``self`` is the
receiver (`NameAst>>___irIsSelfReceiver___`); ``self.x`` loads as
``(self @env0:dynamicInstVarAt: #x ifAbsent: [self @env1:___pyAttrLoad___: #x])``;
``self.x = v`` is the same ``__setattr__: 'x' _:`` send as a foreign store;
``self.m(a)`` for a sibling def is the direct self-send ``(self m: a)``
(#classSelfSend; the keyword / arity-mismatch varargs twin is refused); a
module variable, or a free name resolving nowhere, loads through the module
singleton ``(<Module> @env0:___instance___) @env1:___moduleAttrLoad___:``
(#moduleInstance); a same-module top-level FUNCTION read (the dynamic-slot-first
BoundMethod shape) and a closure-cell read are refused for now.

**Three defects found by the smoke fixture**, in order: the bulk rename of
``allParameterNames`` to the build-params helper reached three TEXT-path
methods that follow the IR section in the file -- `instanceMethodParameterNames`
recursed into the helper (stack overflow on import) and the two source
generators would have changed the text path; the receiver became a body local
because the body-locals helper excluded only the build params, so every
``self`` read failed the flow proof (`cm:flow` for all seven methods); and
`__init__`'s varargs selector was built with a fixed-arity argument list (the
constructor's `perform:` then reported a MessageNotUnderstood).  Also changed
in passing: `PyMethodIRBuilder>>ensureEnvDict` created a class's first env-1
method dictionary through the `intoMethodDict: nil` compile variant; it now
uses the plain form ___compileMethod: uses, with the stub removed again.

**Two more defects, both found only by the cold flag-on sweep**, which is
exactly what it is for:

* **Every shard died of ``VM temporary object memory is full''.**  The def
  table held each registered def AST -- and, through the parent chain, its
  whole module AST -- plus a context snapshot, for the session.  Two leaks:
  a registration was never released once its install statement had run
  (fixed: `___irInstallDef:` removes the entry first), and a module whose
  class bodies were COMPILED but whose body did not RUN in the session (a
  deployed module bound from the repository) left every registration
  pending -- 640 of them after twenty stdlib imports (fixed: `loadModuleFromPath:`
  purges the module's pending registrations in its ensure:).  The per-class
  name->id map is dropped after emission, and an id the emission loop did not
  consume is dropped with it.
* **1044 errors, ``NameError: method compile failed []'', all under classes
  with several bases.**  `importlib ___mergeSecondaryBases___:bases:` (and the
  enum gap-fill walk) copies a secondary base's methods onto the subclass by
  RECOMPILING THEIR SOURCE -- and an IR method's source is its Python, which
  the Smalltalk compiler rejects; `___compileMethod:` then installs the
  codegen-gap stub, and the first call raises.  The instance-side copies now
  go through `___copyMethod___:from:to:category:`, which SHARES the GsNMethod
  when the provider's method is IR-built (sound for what method mode admits:
  no super, no instVar references) and recompiles text otherwise.  The
  class-side copies still recompile text; class-side methods are not IR yet.
  A general lesson recorded: any consumer that re-compiles a method's
  sourceString must first ask `BaseException ___isIRPythonMethod___:`.

Fixture: `Counter` (four plain methods over `self.value` / `self.log`, a
self-send, `str()`, a module variable) and `counter_run`; the with fixture's
`Pair` and `Ctx` managers gain IR methods too; compiled 138 -> 147 (`__init__`
of both classes stays on text).  The census now tallies class methods by
reason (``cm:...`` rows) from inside ClassDefAst's emit, where the context is
live; the report shows them as their own table.

Cut 36 flag-on sweep (fifth run, after the fixes above): the known families,
two AlmostOutOfMemory ERRORs, and two NEW inherent residuals:
`ImportlibTestCase>>testInstanceMethodNoOuterBlock` reads the generated .tpz
text for ``Counter ___compileMethod: 'get ...''' -- under the flag that method
is an ``___irInstallDef:'' statement, so the assertion is about a shape the
IR path does not emit (the temps-fast-path test's twin); and
`FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver` -- the
``self.blech'' suggestion for a NameError raised inside an IR method.  The
receiver name comes from the class-side ``___methodReceiverTable___'' via
PyFrame>>___receiverNameForMethod___:, which the frame walk consults only for
frames it recognises through the text's ``___curPos___'' marker names
(___namesIncludeCodegenMarker___:); an IR frame has no such names.  The same
gap as the PEP 657 columns -- the frame walk's text-marker heuristics -- and
it joins that family for the (method, ip) side-table work.
