! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlaskScaffoldingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlaskScaffoldingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlaskScaffoldingTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
FlaskScaffoldingTestCase removeAllMethods.
FlaskScaffoldingTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! FlaskScaffoldingTestCase
!
! Locks in four AST/codegen changes that landed during the Flask
! roadmap M2 push and lay infrastructure for the rest of the Flask
! stack.  Each test loads a focused fixture under
! `tests/python/pkg_scaffolding/` and asserts the visible behaviour.
! ===============================================================================

category: 'Grail-Helpers'
method: FlaskScaffoldingTestCase
loadFixture: fixtureName
	"Load tests/python/pkg_scaffolding/<fixtureName>.py fresh, returning
	the module instance.  Drops any prior load so the test is hermetic."

	| mods fullName |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	#( 'pkg_scaffolding' ) do: [:n |
		mods @env0:removeKey: n @env0:asSymbol ifAbsent: []].
	mods @env0:removeKey: fullName @env0:asSymbol ifAbsent: [].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
		name: 'pkg_scaffolding'.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName
%

! --- AnnAssignAst -----------------------------------------------------------

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignModuleLevel
	"`x: int = expr` at module scope binds the value, drops the
	annotation."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_int) equals: 42.
	self assert: (mod @env1:module_doubled) equals: 84.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignBareAnnotation
	"`x: int` with no value emits nothing executable — accessing
	the name yields nil (no binding ever happened)."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_bare) isNil.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignLocalInFunction
	"`local_val: int = 7` inside a function body works the same
	as a plain assignment."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:value_with_annotation) equals: 7.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignComplexAnnotation
	"`items: list = []` — the annotation evaluates a name
	(`list`) Grail recognises, then `.append(...)` mutates the
	bound value.  Confirms the body runs cleanly after the
	annotation is stripped."

	| mod result |
	mod := self loadFixture: 'annassign'.
	result := mod @env1:computed_local_annotation.
	self assert: result @env0:size equals: 2.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignClassAttribute
	"Class-level `class_counter: int = 100` becomes a Smalltalk
	classInstVar that Python attribute access can read."

	| mod cls |
	mod := self loadFixture: 'annassign'.
	cls := mod @env1:HasAnnotatedAttrs.
	self assert: (cls @env1:class_counter) equals: 100.
%

! --- ImportAst dotted-import-as-alias --------------------------------------

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testDottedImportAsAlias
	"`import collections.abc as cabc` binds cabc to the LEAF
	collections.abc submodule, not the top-level `collections`.
	Before the fix the alias resolved to the top package."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:LEAF_NAME) equals: 'collections.abc'.
%

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testUnaliasedDottedImport
	"`import collections.abc` (no alias) binds the TOP-LEVEL
	package `collections` — CPython statement semantics.  The
	leaf is reachable via attribute access on the top."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:TOP_NAME) equals: 'collections'.
	self assert: (mod @env1:ABC_VIA_TOP) equals: 'collections.abc'.
%

! --- ClassDefAst: Python class doesn't clobber built-ins -----------------

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testClassNameDoesNotClobberBuiltin
	"`class Symbol:` and `class Set:` are deliberately named to
	collide with GemStone built-ins.  The codegen emits
	``Object subclass: 'Symbol' inDictionary: nil`` — the `nil`
	dictionary makes the class anonymous (no SymbolList entry),
	so the built-ins are untouched and the Python class is
	reachable only through the module's instVar."

	| mod sym builtin |
	mod := self loadFixture: 'builtin_collision'.
	sym := mod @env1:Symbol.
	"The built-in Symbol class still resolves via the symbol
	list — and it's NOT the Python class."
	builtin := System myUserProfile symbolList @env0:objectNamed: #Symbol.
	self assert: builtin notNil.
	self deny: builtin == sym.
	"The Python class is the one the module instVar holds, not
	a clone of the built-in."
	self assert: sym superclass equals: PythonInstance.
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testCollidingClassConstructs
	"The anonymous Python class is fully usable: __init__ runs,
	instance attrs land in the right slots, module-level
	construction wires up correctly."

	| mod a b set |
	mod := self loadFixture: 'builtin_collision'.
	a := mod @env1:make_a.
	b := mod @env1:make_b.
	set := mod @env1:both.
	self assert: a @env1:name equals: 'a'.
	self assert: b @env1:name equals: 'b'.
	self assert: set @env1:items @env0:size equals: 2.
%

! --- AttributeAst cls vs self ---------------------------------------------

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillFastPath
	"`self.X` in an instance method whose first param is the
	conventional `self` still takes the instVar fast path —
	the AttributeAst change only narrowed the path, not removed
	it."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	inst := cls @env1:value: { 'hello' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'hello'.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfReadOfClassSideAttribute
	"`self.set_class` where `set_class` was declared at class
	body level (`set_class: type = list`) lives on the Smalltalk
	class side, not in instance layout.  Reading it from an
	instance method has to go through ___pyAttrLoad___: at
	runtime; before the AttributeAst fallback fix, the codegen
	emitted bare `set_class` and Smalltalk compile-errored with
	`undefined symbol set_class`.  The CallAst exclusion makes
	sure `self.<unknown-attr>(...)` doesn't take the direct
	unary-send fastpath either — that path bypasses
	___pyAttrLoad___: and would DNU on the metaclass."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	"`self.set_class` resolves through ___pyAttrLoad___: to the
	class-side attribute value (the built-in ``list`` class,
	which is OrderedCollection in Grail)."
	result := inst @env1:read_class_attr.
	self assert: result equals: OrderedCollection.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testCallOfClassSideAttribute
	"`self.set_class()` — load the class-side attribute (`list`)
	through ___pyAttrLoad___:, then invoke it.  Built-in classes
	gain callability through ``Object class >> value:value:``,
	which dispatches to ``__new__`` based on arity."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	result := inst @env1:make_via_class_attr.
	self assert: result class equals: OrderedCollection.
	self assert: result @env0:size equals: 0.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillWorksWhenClassHasNew
	"When a class defines __new__ (whose first param is `cls` by
	convention), the WHOLE class's selfParameterName had been
	picked from __new__ — turning every `self.X` reference in
	other methods into an UnboundLocal access.  After the
	ClassDefAst fix, selfParameterName prefers __init__'s first
	param, so `self.label` keeps reaching the instance instVar."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:HasNewAndInit.
	inst := cls @env1:value: { 'world' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'world'.
%

! --- Deep instance-variable discovery --------------------------------------

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromConditionalAssign
	"`if doc: self.doc = doc` inside __init__ — old scan missed
	the nested write; new chain propagates from AttributeAst up
	through the IfAst to ClassDefAst."

	| mod cls obj |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	"Construction triggers __init__; if doc isn't a real
	instVar the conditional write would silently fail with an
	'undefined symbol doc' compile error before runtime."
	self assert: (cls @env0:allInstVarNames @env0:includes: #doc).
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #doc) equals: 'hello'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromAnnAssign
	"AnnAssign on self.X (`self.tags: list = []`) — different
	AST node from plain Assign; old scan only recognised
	AssignAst targets."

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #tags).
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromNestedCompound
	"`try / for / self.last_index = i` — write buried two
	compound statements deep inside __init__.  Propagation
	walks through every IfAst / ForAst / TryAst body branch."

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #last_index).
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromMethodOutsideInit
	"`self.name = name` in `configure(self, name)` — old scan
	walked __init__ only.  New walk covers every method body
	in the class."

	| mod cls obj |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #name).
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #name) equals: 'the-name'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromCls
	"`cls.last_doc = doc` inside __new__ — `cls` is the
	conventional class-attribute receiver name, but for
	instance-var discovery the AttributeAst chain treats it
	the same as `self`.  (Whether the runtime store actually
	hits the class side is a separate question handled by
	___pyAttrLoad___:.)"

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #last_doc).
%

! --- Generators: yield in function body --------------------------------------

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorThreeYields
	"Three consecutive yields drained via __next__ until StopIteration.
	The body runs in a forked GsProcess; consumer and producer
	synchronise through a pair of Semaphores."

	| mod gen v1 v2 v3 stopped |
	mod := self loadFixture: 'generators'.
	gen := mod @env1:make_three.
	self assert: gen @env0:class equals: PythonGenerator.
	v1 := gen @env1:__next__.
	v2 := gen @env1:__next__.
	v3 := gen @env1:__next__.
	self assert: v1 equals: 'a'.
	self assert: v2 equals: 'b'.
	self assert: v3 equals: 'c'.
	stopped := [gen @env1:__next__. false]
		on: StopIteration do: [:ex | true].
	self assert: stopped.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorLocalStateAcrossYields
	"`count_up(n)` keeps a local `i` across yields, proving the
	GsProcess preserves the producer's stack between resumes."

	| mod gen result done |
	mod := self loadFixture: 'generators'.
	gen := mod @env1:count_up: 4.
	result := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[result add: gen @env1:__next__]
			on: StopIteration do: [:ex | done := true]
	].
	self assert: result @env0:size equals: 4.
	self assert: (result @env0:at: 1) equals: 0.
	self assert: (result @env0:at: 4) equals: 3.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorInsideClassMethod
	"Generator declared as an instance method must close over the
	class's ``self`` correctly (the body block captures the receiver
	of the enclosing method)."

	| mod Counter c gen items done |
	mod := self loadFixture: 'generators'.
	Counter := mod @env1:Counter.
	c := Counter @env1:value: { 'item' } value: nil.
	gen := c @env1:labelled: 3.
	items := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[items add: gen @env1:__next__]
			on: StopIteration do: [:ex | done := true]
	].
	self assert: items @env0:size equals: 3.
	self assert: (items @env0:at: 1) equals: 'item_0'.
	self assert: (items @env0:at: 3) equals: 'item_2'.
%

! --- Unified attribute-call protocol --------------------------------------

category: 'Grail-Tests - AttrCall'
method: FlaskScaffoldingTestCase
testAttrCallInvokesClassValue
	"``obj.X()`` where X resolves to a class (class-side attribute
	holding a class) must invoke ``__new__`` to construct, not just
	read the class.  The unified call protocol routes 0-arg
	attribute calls through ___pyAttrLoad___ + ``value:value:`` —
	classes respond to ``value:value:`` via ``object class``."

	| mod h inst Inner |
	mod := self loadFixture: 'attr_call_protocol'.
	h := mod @env1:make.
	inst := h @env1:make_inner.
	Inner := mod @env1:Inner.
	self assert: inst class equals: Inner.
	self assert: (inst @env1:label) equals: 'inner-built'.
%

! --- Generator protocol: send / throw / close ------------------------------

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorSend
	"``gen.send(value)`` resumes the generator with ``value`` as the
	yield expression's value.  Adder generator accumulates sent
	values; first ``next()`` reaches the initial yield (total=0),
	subsequent ``send(x)`` updates total and yields the new total."

	| mod g first second third |
	mod := self loadFixture: 'generator_protocol'.
	g := mod @env1:adder.
	first := g @env1:__next__.
	second := g @env1:send: 10.
	third := g @env1:send: 5.
	self assert: first equals: 0.
	self assert: second equals: 10.
	self assert: third equals: 15.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorThrowCaught
	"``gen.throw(ex)`` injects ``ex`` at the suspended yield point.
	Generators that wrap a yield in try/except can catch the thrown
	exception and continue yielding past it."

	| mod g first afterCatch tail |
	mod := self loadFixture: 'generator_protocol'.
	g := mod @env1:catches_throw.
	first := g @env1:__next__.
	afterCatch := g @env1:throw: (ValueError @env0:new).
	tail := g @env1:__next__.
	self assert: first equals: 'before'.
	self assert: afterCatch equals: 'caught'.
	self assert: tail equals: 'after'.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorClose
	"``gen.close()`` injects GeneratorExit at the suspended yield
	point.  Body ``finally`` clauses fire as the exception unwinds,
	so cleanup runs even though the consumer never drains the
	generator to StopIteration."

	| mod holder g closeResult |
	mod := self loadFixture: 'generator_protocol'.
	holder := OrderedCollection new add: 'open'; yourself.
	g := mod @env1:cleanup_marker: holder.
	g @env1:__next__.
	g @env1:__next__.
	closeResult := g @env1:close.
	self assert: closeResult equals: None.
	self assert: (holder @env0:at: 1) equals: 'closed'.
%

! --- FunctionDefAst: varargs method prologue (kwargs fallback, *args, **kwargs) ---

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testKwargFallbackForNamedParam
	"A named parameter (with default) is satisfied by a keyword
	argument when not passed positionally.  Before the fix, the
	varargs prologue ignored kwargs for named params and the
	default fired even when the caller had supplied the keyword."

	| mod cls obj result |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	"Pass `a` positionally, `b` and `c` as kwargs."
	result := obj
		@env1:_by_default: { 1 }
		kw: (IdentityKeyValueDictionary new
			at: #b put: 20;
			at: #c put: 300;
			yourself).
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 20.
	self assert: (result @env0:at: 3) equals: 300.
	"Defaults still fire when no kwargs supplied."
	result := obj @env1:_by_default: { 1 } kw: nil.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
	self assert: (result @env0:at: 3) equals: 3.
%

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testStarArgsAndStarStarKwargs
	"*args collects leftover positionals as a tuple; **kwargs
	collects unused keyword args into a dict.  Both bindings were
	missing from the class-method varargs path before the codegen
	parity fix."

	| mod cls obj result tail kw |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	result := obj
		@env1:_collect_extra: { 'h'. 'a'. 'b' }
		kw: (IdentityKeyValueDictionary new
			at: #extra put: 99;
			yourself).
	self assert: (result @env0:at: 1) equals: 'h'.
	tail := result @env0:at: 2.
	self assert: tail @env0:size equals: 2.
	self assert: (tail @env0:at: 1) equals: 'a'.
	self assert: (tail @env0:at: 2) equals: 'b'.
	kw := result @env0:at: 3.
	self assert: (kw @env0:at: #extra) equals: 99.
%

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testKwonlyArgs
	"Keyword-only arguments must come from kwargs (no positional
	fallback); missing required kwonly raises TypeError."

	| mod cls obj result |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	"Supply both."
	result := obj
		@env1:_kwonly: #()
		kw: (IdentityKeyValueDictionary new
			at: #x put: 10;
			at: #y put: 200;
			yourself).
	self assert: (result @env0:at: 1) equals: 10.
	self assert: (result @env0:at: 2) equals: 200.
	"y has a default."
	result := obj
		@env1:_kwonly: #()
		kw: (IdentityKeyValueDictionary new at: #x put: 11; yourself).
	self assert: (result @env0:at: 1) equals: 11.
	self assert: (result @env0:at: 2) equals: 20.
%

! --- Class/instance introspection: __name__ and __dict__ -------------------

category: 'Grail-Tests - Introspection'
method: FlaskScaffoldingTestCase
testBuiltinClassName
	"``cls.__name__`` works on built-in Python types via the
	``object class >> __name__`` (env-1) fallback inherited
	through the metaclass chain."

	self assert: (OrderedCollection @env1:__name__) equals: 'OrderedCollection'.
	self assert: (KeyValueDictionary @env1:__name__) equals: 'KeyValueDictionary'.
	self assert: (ExecBlock @env1:__name__) equals: 'ExecBlock'.
	self assert: (BoundMethod @env1:__name__) equals: 'BoundMethod'.
%

category: 'Grail-Tests - Introspection'
method: FlaskScaffoldingTestCase
testInstanceDict
	"`obj.__dict__` returns the per-instance attribute dictionary
	(``___dict___``).  Attributes written through PythonInstance's
	DNU dispatch path land here; class-compile-time-discovered
	instVars do not (documented limitation).  Used by blinker's
	cached-property idiom ``if 'X' in self.__dict__:``."

	| mod cls obj d |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	obj := cls @env1:value: { 'label-value' } value: nil.
	"`label` was discovered as an inst var from `self.label = label` —
	stored as a Smalltalk instVar, NOT in ___dict___, so __dict__ is
	expected to be empty here."
	d := obj @env1:__dict__.
	self assert: (d @env0:isKindOf: KeyValueDictionary).
	"Add a runtime attribute via the DNU setter path — that DOES land
	in ___dict___."
	obj @env1:dynamicAttr: 42.
	d := obj @env1:__dict__.
	self assert: (d @env0:at: #dynamicAttr) equals: 42.
%

! --- CallAst: bare zero-arg super() ---------------------------------------

category: 'Grail-Tests - SuperCall'
method: FlaskScaffoldingTestCase
testSuperOneArgInit
	"`super().__init__(x)` from a subclass — codegen rewrites the
	bare ``super()`` to a Super proxy bound to (lexical class, self),
	and the direct unary send ``__init__: x`` routes through Super''s
	DNU which dispatches via ``with:performMethod:`` to the parent
	class's compiled ``__init__:`` with `obj` substituted as receiver
	(bypassing the override that triggered the super call)."

	| mod Derived inst |
	mod := self loadFixture: 'super_calls'.
	Derived := mod @env1:Derived.
	inst := Derived @env1:value: { 10. 20 } value: nil.
	self assert: (inst @env1:x) equals: 10.
	self assert: (inst @env1:y) equals: 20.
%

category: 'Grail-Tests - SuperCall'
method: FlaskScaffoldingTestCase
testSuperZeroArgInit
	"`super().__init__()` with no args — Super DNU dispatches via
	``performMethod:`` (the 0-arg primitive form) to the parent
	class's ``__init__``.  Used by collections.defaultdict.__init__
	to invoke object.__init__."

	| mod ZeroArg inst |
	mod := self loadFixture: 'super_calls'.
	ZeroArg := mod @env1:ZeroArgSuper.
	inst := ZeroArg @env1:value: #() value: nil.
	self assert: (inst @env1:flag) equals: true.
%

! --- SubscriptAst: class-subscript as base ---------------------------------

category: 'Grail-Tests - SubscriptAst'
method: FlaskScaffoldingTestCase
testSubscriptedBuiltinAsBaseClass
	"`class X(dict[K, V]):` evaluates ``dict[K, V]`` at runtime as
	part of the base-class list.  Grail's dict class-side
	__getitem__: stub returns the class itself so the parameterized
	base resolves to the origin class (KeyValueDictionary).  Without
	the stub, class-statement execution DNUs on the metaclass."

	| mod cls inst |
	mod := self loadFixture: 'subscripted_base'.
	cls := mod @env1:StringKeyedDict.
	"The class inherits from KeyValueDictionary (Grail's dict)."
	self assert: cls superclass equals: KeyValueDictionary.
	inst := mod @env1:make.
	self assert: (inst @env0:at: 'k') equals: 1.
	self assert: (inst @env1:label) equals: 'string-keyed'.
%
