! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NameAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameAst'
  instVarNames: #( id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NameAst comment: 
'Names refer to objects. Names are introduced by name binding operations.

The following constructs bind names: formal parameters to functions, import statements, class and function definitions (these bind the class or function name in the defining block), and targets that are identifiers if occurring in an assignment, for loop header, or after as in a with statement or except clause. The import statement of the form from ... import * binds all names defined in the imported module, except those beginning with an underscore. This form may only be used at the module level.

A target occurring in a del statement is also considered bound for this purpose (though the actual semantics are to unbind the name).

Each assignment or import statement occurs within a block defined by a class or function definition or at the module level (the top-level code block).

If a name is bound in a block, it is a local variable of that block, unless declared as nonlocal or global. If a name is bound at the module level, it is a global variable. (The variables of the module code block are local and global.) If a variable is used in a code block but not defined there, it is a free variable.

Each occurrence of a name in the program text refers to the binding of that name established by certain name resolution rules.




https://docs.python.org/3/reference/executionmodel.html#naming-and-binding'
%

expectvalue /Class
doit
NameAst category: 'Parser'
%

! ------------------- Remove existing behavior from NameAst
removeallmethods NameAst
removeallclassmethods NameAst

set compile_env: 0

category: 'other'
classmethod: NameAst
with: aSymbol

	^self basicNew
		id: aSymbol;
		yourself
%

category: 'Grail-codegen helpers'
classmethod: NameAst
isResolvableSymbol: aSymbol
	"True if aSymbol names something the GemStone method compiler can
	resolve at compile time — i.e., it's defined in some
	SymbolDictionary on the user's symbol list (a class name, a
	pre-installed Python module, a Globals binding, etc.).  Used by
	the late-module-name-binding fallback in `printSmalltalkOn:` to
	avoid emitting a runtime self-at-lookup for names that already
	resolve as bare identifiers."

	^ (System myUserProfile symbolList @env0:objectNamed: aSymbol) notNil
%

category: 'other'
method: NameAst
addVariableNamesTo: aStream

	
	aStream nextPutAll: id; space.
%

category: 'other'
method: NameAst
assertContextIsLoad

	ctx assertIsLoad.
%

category: 'other'
method: NameAst
assertContextIsStore

	ctx assertIsStore.
%

category: 'other'
method: NameAst
ctx

	^ ctx
%

category: 'other'
method: NameAst
ctx: aContext

	ctx := aContext.
%

category: 'other'
method: NameAst
id

	^id
%

category: 'other'
method: NameAst
id: aSymbol

	id := aSymbol
%

category: 'other'
method: NameAst
injectSuperArguments: anArray scope: aScope

	| type objectOrType |
	type := aScope superInfo
		at: #'type'
		ifAbsent: [].
	objectOrType := aScope superInfo
		at: #'objectOrType'
		ifAbsent: [].
	(((type isNil not) and: [objectOrType isNil not]) and: [id == #'super']) ifTrue: ["in case of calling super"
		anArray add: type.
		anArray add: objectOrType.
	].
%

category: 'other'
method: NameAst
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $(;
		nextPutAll: id;
		nextPut: $).
%

category: 'other'
method: NameAst
printSmalltalkAssignmentOn: aStream

	self printSmalltalkOn: aStream.
	aStream nextPutAll: 'value'.
%

category: 'other'
method: NameAst
printSmalltalkOn: aStream
	"Name dispatch — see docs/Rewrite_Dispatch_Model.md.

	When a name in load context resolves to a fast-path builtin method,
	emit a BoundMethod wrapper instead of the bare identifier. This makes
	first-class function uses like `f = abs; f(-5)` work without going
	through the legacy block-in-symbol-list path.

	`Fast-path builtin' here means: the name is not shadowed by a local in
	any enclosing scope, and the builtins class has at least one env-1
	method whose Smalltalk selector base matches this name (`abs`, `abs:`,
	`abs:_:`, etc.). The BoundMethod stores the unary selector (Python
	0-arg form) by convention, and forwards calls via reflective dispatch;
	a future revision can use the actual call-site arity if known.

	Note: this method is called for both load and store contexts —
	`AssignAst >> printSmalltalkOn:` invokes it on its target (LHS) too.
	The unbound-local check (Phase C-2) only applies in load context;
	stores must emit the bare identifier so the surrounding
	`<name> := <value>` is well-formed.

	Direct call sites like `abs(5)` are special-cased in
	`CallAst>>printSmalltalkOn:` and bypass this method entirely."

	"self parameter in class method → Smalltalk self.  NOT when a
	nested function between here and the method binds the name itself
	(``def view(request): self = cls(**kw)'' inside View.as_view) —
	that ``self'' is the nested def's own local and takes the
	reserved-name transport rename below."
	((CallAst isSelfReference: id)
		and: [(self ___boundInNestedFunction___: id) not]) ifTrue: [
		aStream nextPutAll: 'self'.
		^ self
	].
	"Reserved-name parameter rename: when the Python parameter name is
	a Smalltalk pseudo-variable (``self'', ``super'', ``nil'', ``true'',
	``false'', ``thisContext'') — typically ``def f(self, ...)'' at
	module level — the method-arg slot is renamed to ``_<name>'' (the
	transport identifier).  Body references to the original Python
	name must emit the transport form so they read the actual value
	instead of Smalltalk's pseudo-variable.  Applies to load and store
	contexts alike; without this, ``self`` in a module-level def's
	body would read Smalltalk's implicit self (the module instance),
	not the first call argument."
	(self ___enclosingFuncDeclaresReservedParam___: id) ifTrue: [
		aStream nextPut: $_; nextPutAll: id.
		^ self
	].
	(self isFastPathBuiltinName) ifTrue: [
		aStream
			nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
			nextPutAll: id;
			nextPutAll: ')'.
		^ self
	].
	"Class-method free-variable path: when compiling a Python class
	body, a free name that isn't a local or a class inst var still
	resolves through Python's LEGB rules to the enclosing module's
	globals.  Three sub-cases, in priority order:
	  (1) Module-level function name → emit BoundMethod pointing at
	      the module instance (no unary accessor exists; adding one
	      would shadow 0-arg call dispatch).
	  (2) Statically-declared module instVar → emit the unary
	      accessor for direct instVar read.
	  (3) Unknown name that doesn't resolve as a Smalltalk global
	      and isn't a local in any enclosing scope → emit a runtime
	      dict lookup on the module instance with a NameError on
	      miss.  Catches module globals injected after parse time
	      (e.g. by `globals().update(...)` in a helper called from
	      the source's body — the `re._constants._makecodes` idiom,
	      where opcodes like `IN` / `BRANCH` are referenced in class
	      methods on `SubPattern` but only added to the module's
	      namespace at module-init time).
	Detect all three BEFORE the UnboundLocalError wrap below —
	otherwise `isVariableIsDeclared:` walks up to the module body's
	BlockAst, sees the name declared there, and wraps it in a check
	that reads the name as a Smalltalk local (which fails at
	compile time because class methods don't have module inst vars
	in scope)."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBeingCompiled notNil
			and: [CallAst moduleClassBeingCompiled notNil]])
		ifTrue: [
			"Class-body reference to a sibling method (``def f();
			pair = (f,)'' or ``data = property(get_data, set_data)'').
			Emit a receiver-less BoundMethod — its call protocol pops
			positional[1] as the receiver at invocation time, matching
			CPython's unbound-function-from-class-dict semantics.

			Guard: only fires while ClassDefAst is emitting the class-
			attribute value expressions (CallAst inClassBodyValueEmit
			is true).  Method bodies share the same classBeingCompiled
			context but their bare-name references must follow Python's
			LEGB rule (skipping the class scope) — falling through to
			the existing module-scope / declared-local branches below."
			(CallAst inClassBodyValueEmit
				and: [CallAst classFunctionNames notNil
				and: [(CallAst classFunctionNames includes: id asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: id asSymbol]]]])
				ifTrue: [
					aStream
						nextPutAll: '(BoundMethod receiver: nil selector: #';
						nextPutAll: id;
						nextPutAll: ')'.
					^self
				].
			"Class-body reference to a sibling @staticmethod (test_enum's
			``@staticmethod def _generate_next_value_(...)'' then
			``enum_type = Enum(..., {'_generate_next_value_':
			_generate_next_value_})'').  Static defs compile CLASS-side,
			so the reference is a BoundMethod on the class temp itself --
			calling it dispatches the metaclass method with the caller's
			full argument list (no receiver popping)."
			(CallAst inClassBodyValueEmit
				and: [CallAst classStaticFunctionNames notNil
				and: [(CallAst classStaticFunctionNames includes: id asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: id asSymbol]]]])
				ifTrue: [
					aStream
						nextPutAll: '(BoundMethod receiver: ';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' selector: #';
						nextPutAll: id;
						nextPutAll: ')'.
					^self
				].
			"Class-body reference to a PRIOR class attribute (``ul = ...''
			then ``regex = '[a-z' + ul + ...'`` — django's URLValidator).
			The class under construction is in scope as ``___cls___''
			while attribute values emit; probe its dict first and fall
			back to the module global of the same name (Python reads the
			class-local if already bound, else the global)."
			"NESTED-class sibling reference (``class A: ...`` then
			``a = A()``): the nested class lives in the outer class's
			per-class DYNAMIC store -- read it there (the accessor
			send below would DNU)."
			(CallAst inClassBodyValueEmit
				and: [CallAst classNestedClassNames notNil
				and: [(CallAst classNestedClassNames includes: id asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: id asSymbol]]]])
				ifTrue: [
					aStream
						nextPutAll: '(';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' @env1:___dynamicClassAttr___: #''';
						nextPutAll: id;
						nextPutAll: ''')'.
					^self
				].
			(CallAst inClassBodyValueEmit
				and: [CallAst classAttrNames notNil
				and: [(CallAst classAttrNames includes: id asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: id asSymbol]]]])
				ifTrue: [
					"The attr accessor pair is compiled just before each
					``<Class> <attr>: value'' store, so a later value
					expression can read the earlier attr with a plain
					getter send.  nil (never a stored value — Grail's
					nil-as-absent rule) means ``not bound yet''; fall
					back to the module global of the same name, matching
					Python's class-body read semantics."
					aStream
						nextPutAll: '((';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' ';
						nextPutAll: id;
						nextPutAll: ') @env0:ifNil: ['.
					self emitModuleAttrLoad: id
						receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
						on: aStream.
					aStream nextPutAll: '])'.
					^self
				].
			"LEGB guard: a name that is a true Python local (parameter or
			genuine body binding) of an enclosing function, or the target of
			an enclosing comprehension, SHADOWS a same-named module-level
			function.  Divert those reads past this shortcut so they fall
			through to the regular declared-local emit at the bottom (the
			path every non-colliding local/param already takes).  Uses the
			precise ``writes''-based checks — NOT ``variables'', whose
			over-approximation (comprehension targets, f-string hints)
			would wrongly divert genuine module-function reads (e.g.
			django's receiver/match/url collisions with comprehension
			targets elsewhere in the same method)."
			(CallAst moduleFunctionNames notNil
				and: [(CallAst moduleFunctionNames includes: id asSymbol)
				and: [(self ___localBindingShadows___: id) not]])
				ifTrue: [
					"Probe the dynamic slot FIRST: a module-level decorator
					(``@functools.singledispatch def g'') rebinds g to a
					wrapper stored there, and this shortcut previously
					handed back the ORIGINAL compiled def as a BoundMethod
					regardless (g.dispatch(...) inside a same-module method
					read the stale function)."
					aStream
						nextPutAll: '(((';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) @env0:dynamicInstVarAt: #''';
						nextPutAll: id;
						nextPutAll: ''') @env0:ifNil: [ | ___fn___ | ___fn___ := BoundMethod receiver: (';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) selector: #';
						nextPutAll: id;
						nextPutAll: '. (';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) @env0:dynamicInstVarAt: #''';
						nextPutAll: id;
						nextPutAll: ''' put: ___fn___. ___fn___])'.
					^self
				].
			(self isModuleScopeName: id) ifTrue: [
				"BUT: if the name is also declared as a local in an
				enclosing function (parameter or assignment target),
				the function's local shadows the module attribute —
				Python's LEGB lookup gives local priority.  Fall
				through to the regular declared-local branch in that
				case.  Without this guard, a function parameter named
				``x`` whose name happens to collide with a module-
				level loop variable (e.g. from a generator expression
				elsewhere in the file) would read the module instVar
				instead of the parameter."
				((self ___pythonLocalInEnclosingFunctions___: id)
					or: [self ___isEnclosingComprehensionTarget___: id]) ifFalse: [
					"Phase A: module globals live in dynamic instVar
					storage on the module instance.  Read through
					dynamicInstVarAt:ifAbsent: so `del` truly unbinds
					the name (probe returns absent → NameError)."
					self emitModuleAttrLoad: id
						receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
						on: aStream.
					^self
				].
			].
			"Free name with no static binding.  Skip the runtime
			lookup when the name IS a local of some enclosing scope
			(parameter or assignment target — handled by the bare
			emit below) OR resolves as a Smalltalk global (class
			names, exception classes, etc. — emit bare so the
			compiler resolves them through the symbol list)."
			((self isVariableIsDeclared: id) not
				and: [(self class isResolvableSymbol: id asSymbol) not])
				ifTrue: [
					"Builtins names (``type``, ``len``, ``hasattr``, ...)
					aren't stored as module attributes — they live as
					methods on the ``builtins`` class.  Wrap as a
					BoundMethod so direct calls dispatch through env-1
					arity resolution."
					(self class isFastPathBuiltinName: id asSymbol) ifTrue: [
						aStream
							nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
							nextPutAll: id;
							nextPutAll: ')'.
						^self
					].
					"Phase A: probe module dynamic-instVar storage."
					self emitModuleAttrLoad: id
						receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
						on: aStream.
					^self
				]
		].
	"Phase C-2 / Phase A: in load context, wrap reads of declared
	FUNCTION locals (parameter or assignment target inside an enclosing
	function/lambda) with a runtime nil-check that raises
	UnboundLocalError naming the variable.  Module-body declarations
	are NOT covered here — they route through the dynamicInstVarAt:
	branches below so `del` truly unbinds the name (a probe of an
	absent dynamic instVar raises NameError, the Python-correct
	exception for module-scope ``del x; x'')."
	"CLASS-METHOD CLOSURE CELL: a load of an enclosing-function local
	from inside a class METHOD body.  The method string-compiles onto
	the class with no home context, so the enclosing temp is
	unreachable (``class CustomInt(int)`` referencing its own name in
	a method, test_functools' sibling fixtures).  The classdef
	emission stores each captured VALUE on the class's per-class
	dynamic attrs at DEFINITION time; read it back through the
	receiver's class chain.  Attr-VALUE expressions
	(inClassBodyValueEmit) emit inline in the enclosing method where
	the temps ARE reachable -- excluded."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [CallAst inBasesEmit ~~ true
		and: [self ___enclosingFunctionLocalBeyondClass___: id]]]]) ifTrue: [
		CallAst addCapturedClassName: id.
		aStream
			nextPutAll: '(self @env1:___classCell___: #''___cell_';
			nextPutAll: id;
			nextPutAll: '___'')'.
		^self
	].
	((ctx isKindOf: LoadAst) and: [self ___pythonLocalInEnclosingFunctions___: id]) ifTrue: [
		aStream
			nextPutAll: '(UnboundLocalError ___checkLocal: ';
			nextPutAll: id;
			nextPutAll: ' named: #';
			nextPutAll: id;
			nextPutAll: ')'.
		^ self
	].
	"Phase A: comprehension loop variables (the target of any enclosing
	List/Dict/Set/Generator comprehension) are emitted as bare
	identifiers because ComprehensionAst's codegen binds them as
	Smalltalk block locals.  Without this check, a comprehension
	target name that also appears in moduleVariableNames (parser
	records it via declareWrite at parse time) would route through
	the module's dynamicInstVarAt: storage and miss the closure
	binding."
	((ctx isKindOf: LoadAst) and: [self ___isEnclosingComprehensionTarget___: id]) ifTrue: [
		aStream nextPutAll: id.
		^ self
	].
	"Late module-name binding.  In a module-body or module-method
	context (compiling `initialize` or a top-level def, NOT inside a
	user class), a load of a name that didn't resolve statically AND
	can't be resolved through the user's symbol list at compile time
	(so the bare identifier would CompileError as `undefined symbol`)
	falls back to a runtime lookup on the module instance.  module
	inherits from SymbolDictionary, so `self at:` finds names added
	dynamically — e.g. by `globals().update({...})` or decorators
	that mutate module globals (`@enum.global_enum`).  Misses raise
	Python NameError, matching CPython semantics."
	((ctx isKindOf: LoadAst)
		and: [CallAst moduleClassBeingCompiled notNil
		and: [(CallAst classBeingCompiled isNil
				or: [CallAst inClassBodyValueEmit])
		and: [(self class isResolvableSymbol: id asSymbol) not]]]) ifTrue: [
		"Builtins (``type``, ``len``, ...) are methods on the
		builtins class — emit a BoundMethod so direct call sites
		dispatch through env-1 arity resolution rather than a
		failing ``at:`` lookup.  Suppressed when this NameAst is
		the base of an enclosing ClassDefAst (a class needs the
		actual class object, not a callable wrapper).

		Class-body value-emit (inClassBodyValueEmit) takes the same
		fallback: a bare name that isn't a sibling method, module
		function, or static Smalltalk global still wants the
		``self at: #name'' lookup, otherwise it CompileErrors as
		``undefined symbol''.  This covers references like
		``__doc__'' at class body level (the module attribute, since
		Grail doesn't bind class-body locals to a class namespace)."
		(self isFastPathBuiltinName) ifTrue: [
			aStream
				nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
				nextPutAll: id;
				nextPutAll: ')'.
			^self
		].
		"Phase A: module attribute load goes through dynamicInstVarAt:.
		The receiver expression is ``self'' (module body / top-level
		def) or ``<ModuleClass> @env0:___instance___'' (class-body
		value-emit, where ``self'' is the class being built and lacks
		the module dynamic-instVar storage)."
		CallAst inClassBodyValueEmit
			ifTrue: [
				self emitModuleAttrLoad: id
					receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
					on: aStream.
			]
			ifFalse: [
				self emitModuleAttrLoad: id receiverExpr: 'self' on: aStream.
			].
		^ self
	].
	"Phase A: module-body load of a name declared in the module body
	(via assignment, for-target, etc.) — route through self's dynamic
	instVar storage so `del` truly unbinds.  We're here only when no
	earlier branch fired and we're compiling either the module-body
	initialize or a top-level def (CallAst classBeingCompiled is nil
	AND moduleClassBeingCompiled is not nil).  Skip when the name is
	a function-local (declared in an enclosing function scope) — that
	stays a Smalltalk temp and uses the UnboundLocalError check above."
	((ctx isKindOf: LoadAst)
		and: [CallAst moduleClassBeingCompiled notNil
		and: [CallAst classBeingCompiled isNil
		and: [(self isModuleVariableName: id)
		and: [((self ___pythonLocalInEnclosingFunctions___: id)
			or: [self ___isEnclosingComprehensionTarget___: id]) not]]]]) ifTrue: [
			self emitModuleAttrLoad: id receiverExpr: 'self' on: aStream.
			^ self
		].
	aStream nextPutAll: id.
%

category: 'Grail-codegen helpers'
method: NameAst
emitModuleAttrLoad: aSymbol receiverExpr: receiverString on: aStream
	"Phase A emit pattern for module attribute loads:
		(<receiver> @env0:dynamicInstVarAt: #'name' ifAbsent: [NameError ___signal___: ...])
	receiverString is the Smalltalk source for the receiver expression
	(``self'' from inside the module body / a top-level def, or
	``<ModuleClass> @env0:___instance___'' from inside a user class
	method that references a module global).

	Routes through ``module>>___moduleAttrLoad___:'' which probes
	dynamic-instVar storage, falls through to class-method lookup
	(lazy-wrapping top-level defs as BoundMethods), and raises
	NameError on miss.  The class-fallback step is what makes
	``def foo: ...; f = foo'' work without pre-storing a BoundMethod
	at def time — which would in turn block rebinding detection in
	CallAst's bare-call dispatch."

	aStream
		nextPutAll: '(';
		nextPutAll: receiverString;
		nextPutAll: ' @env1:___moduleAttrLoad___: #''';
		nextPutAll: aSymbol;
		nextPutAll: ''')'.
%

category: 'Grail-codegen helpers'
method: NameAst
isModuleVariableName: aSymbol
	"Phase A: true if aSymbol was declared in the module body's scope
	(as recorded by the parser into ``CallAst moduleVariableNames'').
	Function names are tracked separately in ``moduleFunctionNames'' —
	this returns false for them."

	| names |
	names := CallAst moduleVariableNames.
	names ifNil: [^ false].
	^ names includes: aSymbol asSymbol
%

category: 'other'
classmethod: NameAst
isReservedSmalltalkIdentifier: aSymbol
	"True if aSymbol names a Smalltalk pseudo-variable.  Mirrors
	FunctionDefAst's instance-side check; lifted to class side so the
	body-rename test in printSmalltalkOn: can call it without an
	AST-context instance."

	^ #(#'self' #'super' #'thisContext' #'nil' #'true' #'false')
		includes: aSymbol asSymbol
%

category: 'other'
method: NameAst
___boundInNestedFunction___: aSymbol
	"True when the nearest enclosing binder of aSymbol is a NESTED
	plain function or lambda (not the class method itself).  Walk
	outward: the first plain FunctionDefAst/LambdaAst that declares
	aSymbol as a parameter or writes it in its body claims the name;
	hitting the method (Instance/Class/StaticFunctionDefAst) first
	means the name is the receiver parameter."

	| node ivars idx argsNode blockNode writesSet |
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: InstanceFunctionDefAst)
			or: [(node isKindOf: ClassFunctionDefAst)
			or: [node isKindOf: StaticFunctionDefAst]]) ifTrue: [^ false].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst]) ifTrue: [
			ivars := node class allInstVarNames.
			idx := ivars indexOf: #args.
			argsNode := idx > 0 ifTrue: [node instVarAt: idx] ifFalse: [nil].
			argsNode notNil ifTrue: [
				| argsIvars found |
				argsIvars := argsNode class allInstVarNames.
				found := false.
				#(#args #posonlyargs #kwonlyargs) do: [:fld |
					| fldIdx lst |
					fldIdx := argsIvars indexOf: fld.
					fldIdx > 0 ifTrue: [
						lst := argsNode instVarAt: fldIdx.
						lst ifNotNil: [
							(lst anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
								ifTrue: [found := true]]]].
				#(#vararg #kwarg) do: [:fld |
					| fldIdx v |
					fldIdx := argsIvars indexOf: fld.
					fldIdx > 0 ifTrue: [
						v := argsNode instVarAt: fldIdx.
						(v notNil and: [v name asSymbol == aSymbol asSymbol])
							ifTrue: [found := true]]].
				found ifTrue: [^ true]
			].
			(node isKindOf: FunctionDefAst) ifTrue: [
				idx := ivars indexOf: #body.
				blockNode := idx > 0 ifTrue: [node instVarAt: idx] ifFalse: [nil].
				(blockNode notNil and: [blockNode isKindOf: BlockAst]) ifTrue: [
					writesSet := blockNode writes.
					(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
						ifTrue: [^ true]
				]
			]
		].
		node := node parent.
	].
	^ false
%

category: 'other'
method: NameAst
___enclosingFunctionLocalBeyondClass___: aSymbol
	"True iff aSymbol is a python-local of an enclosing function BEYOND
	the nearest enclosing ClassDefAst -- i.e. this NameAst sits in a
	class-method body and the name belongs to the method's ENCLOSING
	def, not to the method itself (or a def nested in it).  The first
	binding function wins: bound before crossing a classdef -> a real
	temp of the compiled method -> false."

	| node passedClass |
	node := parent.
	passedClass := false.
	[node notNil] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [passedClass := true].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				(self ___functionBindsPythonLocal___: node named: aSymbol)
					ifTrue: [^ passedClass]].
		node := node parent].
	^ false
%

category: 'other'
method: NameAst
___enclosingFuncDeclaresReservedParam___: aSymbol
	"True iff aSymbol is a Smalltalk pseudo-variable (``self'', etc.)
	AND some enclosing FunctionDef/Lambda binds it as a PARAMETER or
	assigns it as a BODY LOCAL.  Drives the body rename: references to
	the original Python name emit the transport identifier ``_<name>''
	rather than Smalltalk's pseudo-variable, matching the temp the
	source generators declare (module defs, closures, @staticmethod
	bodies, and in-class methods that REBIND their self/cls parameter
	— ``self = None'' / ``self = tuple.__new__(cls, ...)'').

	The live receiver reference is NOT renamed: CallAst's
	isSelfReference: check fires before this method and emits
	Smalltalk ``self'' — except when the enclosing method rebinds it
	(CallAst selfParameterRebound), in which case isSelfReference:
	answers false and the walk below finds the parameter, landing on
	the ``_self'' temp the method generator initialised from the
	receiver."

	| node ivars idx argsNode argsIvars bodyIdx blockNode writesSet |
	(NameAst isReservedSmalltalkIdentifier: aSymbol) ifFalse: [^ false].
	CallAst moduleClassBeingCompiled ifNil: [^ false].
	node := parent.
	[node notNil] whileTrue: [
		"An enclosing INSTANCE METHOD whose self-param is aSymbol and is
		NOT rebound binds it to the Smalltalk RECEIVER -- no transport
		temp exists, and blocks capture ``self'' at any nesting depth,
		so the caller must emit plain ``self''.  (A @staticmethod inside
		a method-local class closing over the outer method's ``self'' --
		test_functools' lru_cache_weakrefable -- emitted an undeclared
		``_self'' before this check.)"
		((node isKindOf: InstanceFunctionDefAst)
			and: [node allParameterNames notEmpty
			and: [node allParameterNames first asSymbol == aSymbol
			and: [(node assignedNamesInBody includes: aSymbol) not]]])
			ifTrue: [^ false].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				ivars := node class allInstVarNames.
				idx := ivars indexOf: #args.
				argsNode := idx > 0 ifTrue: [node instVarAt: idx] ifFalse: [nil].
				argsNode ifNotNil: [
					argsIvars := argsNode class allInstVarNames.
					#(#args #posonlyargs #kwonlyargs) do: [:fld |
						| fldIdx list |
						fldIdx := argsIvars indexOf: fld.
						fldIdx > 0 ifTrue: [
							list := argsNode instVarAt: fldIdx.
							list ifNotNil: [
								(list anySatisfy:
									[:a | a name asSymbol == aSymbol asSymbol])
									ifTrue: [^ true]
							]
						]
					].
					#(#vararg #kwarg) do: [:fld |
						| fldIdx v |
						fldIdx := argsIvars indexOf: fld.
						fldIdx > 0 ifTrue: [
							v := argsNode instVarAt: fldIdx.
							(v notNil and: [v name asSymbol == aSymbol asSymbol])
								ifTrue: [^ true]
						]
					]
				].
				"Assigned-in-body check (FunctionDefAst only — lambdas
				can't assign).  body writes is the parser's record of
				assignment/for/with-as/walrus targets."
				(node isKindOf: FunctionDefAst) ifTrue: [
					bodyIdx := ivars indexOf: #body.
					blockNode := bodyIdx > 0 ifTrue: [node instVarAt: bodyIdx] ifFalse: [nil].
					(blockNode notNil and: [blockNode isKindOf: BlockAst]) ifTrue: [
						writesSet := blockNode writes.
						(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
							ifTrue: [^ true]
					]
				]
			].
		node := node parent.
	].
	^ false
%

category: 'other'
method: NameAst
___localBindingShadows___: aSymbol
	"True when a LOCAL Python binding visible from this node shadows
	module-level resolution of aSymbol: a true python-local (parameter
	or body binding) of an enclosing function, or the target of an
	enclosing comprehension.  This is the guard tier for module-level
	shortcuts (module-function BoundMethods, module self-sends) --
	module-scope bindings themselves do NOT count, since they are what
	those shortcuts resolve to."

	(self ___pythonLocalInEnclosingFunctions___: aSymbol) ifTrue: [^ true].
	^ self ___isEnclosingComprehensionTarget___: aSymbol
%

category: 'other'
method: NameAst
___pythonBindingShadows___: aSymbol
	"True when ANY Python binding visible from this node shadows
	builtin-level resolution of aSymbol: a local binding (see
	___localBindingShadows___:), a module-body binding -- variable OR
	top-level def (re.py's own ``def compile'' must shadow the
	``compile'' builtin for the whole module) -- or, during class-body
	value emit, a class attribute of the same name (Python reads the
	class-local).  This is the guard tier for builtin fast paths and
	class-instantiation shortcuts.

	PRECISE by construction: built from params + the writes set + the
	parser-recorded module name sets, never from the over-approximating
	``variables'' walk (comprehension targets, f-string hints)."

	(self ___localBindingShadows___: aSymbol) ifTrue: [^ true].
	(self isModuleVariableName: aSymbol) ifTrue: [^ true].
	(CallAst moduleFunctionNames notNil
		and: [CallAst moduleFunctionNames includes: aSymbol asSymbol]) ifTrue: [^ true].
	(CallAst inClassBodyValueEmit
		and: [CallAst classAttrNames notNil
		and: [CallAst classAttrNames includes: aSymbol asSymbol]]) ifTrue: [^ true].
	"Top-level (root) body binding.  Covers the EVAL path, where the
	module compile context (moduleVariableNames / moduleFunctionNames)
	is not set: ``abs = 42; abs'' evaluated via ModuleAst
	evaluateSource: binds abs in the root block's writes."
	^ self ___boundAtTopLevel___: aSymbol
%

category: 'other'
method: NameAst
___boundAtTopLevel___: aSymbol
	"True iff the OUTERMOST BlockAst on the parent chain (the module /
	eval body) genuinely binds aSymbol -- its precise ``writes'' set
	(assignments, def / class names, imports; comprehension targets and
	global-declared names excluded by the parser)."

	| node rootBlock writesSet |
	node := parent.
	rootBlock := nil.
	[node notNil] whileTrue: [
		(node isKindOf: BlockAst) ifTrue: [rootBlock := node].
		node := node parent.
	].
	rootBlock isNil ifTrue: [^ false].
	writesSet := rootBlock writes.
	^ writesSet notNil and: [writesSet includes: aSymbol asSymbol]
%



category: 'other'
method: NameAst
___targetPattern___: targetNode bindsName: aSymbol
	"True iff the given assignment-target pattern (a NameAst, or a
	Tuple/List/Starred nesting of them) binds aSymbol."

	| cls ivars idx elts inner |
	(targetNode isKindOf: NameAst) ifTrue: [
		^ targetNode id asSymbol == aSymbol asSymbol].
	cls := targetNode class name.
	((cls == #TupleAst) or: [cls == #ListAst]) ifTrue: [
		ivars := targetNode class allInstVarNames.
		idx := ivars indexOf: #elts.
		elts := idx > 0 ifTrue: [targetNode instVarAt: idx] ifFalse: [nil].
		elts ifNotNil: [
			elts do: [:e |
				(self ___targetPattern___: e bindsName: aSymbol) ifTrue: [^ true]]].
		^ false].
	cls == #StarredAst ifTrue: [
		ivars := targetNode class allInstVarNames.
		idx := ivars indexOf: #value.
		inner := idx > 0 ifTrue: [targetNode instVarAt: idx] ifFalse: [nil].
		inner ifNotNil: [^ self ___targetPattern___: inner bindsName: aSymbol].
		^ false].
	^ false
%

category: 'other'
method: NameAst
___declaredInEnclosingFunction___: aSymbol
	"True if aSymbol is declared as a local in some FunctionDefAst
	or LambdaAst between this NameAst and the surrounding module
	body — i.e. some enclosing function parameter or assignment
	target.  Used by the load-context codegen to prefer a function-
	local read over the module-scope-name shortcut so a function
	parameter named ``x`` doesn't get read as a module instVar just
	because ``x`` also appears as a comprehension loop var somewhere
	in the same module."

	| node |
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				"Python LEGB closure rule: a name defined in ANY
				enclosing function (parameter or assignment target) is
				accessible from a nested function/lambda via Smalltalk
				closure capture, so emit the bare identifier rather
				than routing through module dynamicInstVarAt:.  Keep
				walking past the first enclosing function so a name
				declared two scopes out still wins over a same-named
				module global."
				(self ___functionDeclaresLocal___: node named: aSymbol)
					ifTrue: [^ true].
				"Stop at the outermost FunctionDef/Lambda — beyond that
				is module scope or class scope, neither of which
				counts as an ``enclosing function'' for this check."
			].
		node := node parent.
	].
	^ false
%

category: 'other'
method: NameAst
___isEnclosingComprehensionTarget___: aSymbol
	"Phase A: true if aSymbol is the target (loop variable) of any
	enclosing ListComp / DictComp / SetComp / GeneratorExp.
	Comprehension targets are bound as Smalltalk block locals by
	ComprehensionAst codegen, so reads of them should emit the bare
	identifier instead of routing through module dynamicInstVarAt:.

	Walks the parent chain looking for a node whose class name
	includes ``Comp'' or ``GeneratorExp'', then checks that node's
	`generators' field (a sequence of ComprehensionAst, each with a
	`target' field that is either a NameAst or a TupleAst of NameAst)."

	| node |
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: ListCompAst)
			or: [(node isKindOf: DictCompAst)
			or: [(node isKindOf: SetCompAst)
			or: [node isKindOf: GeneratorExpAst]]])
			ifTrue: [
				(self ___compNodeBindsTarget___: node named: aSymbol)
					ifTrue: [^ true]
			].
		node := node parent.
	].
	^ false
%

category: 'other'
method: NameAst
___compNodeBindsTarget___: compNode named: aSymbol
	"True if compNode (a ListComp/DictComp/SetComp/GeneratorExp) has
	any generator whose target binds aSymbol.  The target is either
	a NameAst (`for x in xs') or a TupleAst (`for k, v in pairs')."

	| ivars idx gens |
	ivars := compNode class allInstVarNames.
	idx := ivars indexOf: #generators.
	idx = 0 ifTrue: [^ false].
	gens := compNode instVarAt: idx.
	gens ifNil: [^ false].
	gens do: [:gen |
		"Recursive pattern match: covers plain names, nested tuple /
		list patterns, and starred targets (``for a, (b, *c) in ...'')."
		(self ___targetPattern___: gen target bindsName: aSymbol)
			ifTrue: [^ true]
	].
	^ false
%

category: 'other'
method: NameAst
isModuleScopeName: aSymbol
	"True if aSymbol was declared in the enclosing module body's
	scope (recorded by the parser into ``CallAst moduleVariableNames'').
	Python's LEGB free-variable lookup inside a class method body
	does NOT include the class scope — bare names skip past the
	class to the module's globals.  So we do not shadow on class
	inst vars or class method names; the only thing that takes
	precedence is the self parameter (a real local of the method).

	Phase A: module globals live in dynamicInstVarAt: storage rather
	than static instVars on the module class, so the discriminator
	queries ``CallAst moduleVariableNames'' rather than
	``modCls allInstVarNames''."

	(CallAst moduleClassBeingCompiled) ifNil: [^false].
	(self isModuleVariableName: aSymbol) ifFalse: [^false].
	(CallAst selfParameterName notNil
		and: [CallAst selfParameterName asSymbol = aSymbol asSymbol])
			ifTrue: [^false].
	^ true
%

category: 'other'
method: NameAst
isFastPathBuiltinName
	"True if this load-context read names a builtin that the codegen
	considers fast-path eligible (any arity), and is not shadowed by an
	enclosing-scope local.

	Returns false when this NameAst is the function position of a CallAst
	— in that case, CallAst>>printSmalltalkOn: has already decided whether
	to emit the fast path or fall through to the legacy varargs path. We
	must not wrap the function in a BoundMethod and force the legacy path
	through reflective dispatch."

	(self isFunctionPositionOfCall) ifTrue: [^false].
	(self isBaseOfClassDef) ifTrue: [^false].
	"Shadow check, PRECISE (see ___pythonBindingShadows___:).  Previously
	isVariableIsDeclared:, whose over-approximating `variables' walk made
	a mere comprehension target suppress the builtin for the whole
	function -- `vals = [len for len in xs]; len(s)' then raised
	UnboundLocalError on the second len."
	(self ___pythonBindingShadows___: id) ifTrue: [^false].
	"A comprehension loop variable shadows the builtin for both the
	store that binds it and every read in the comprehension body —
	``(cwd / to_path(dir) for dir in dirs)'' in django.template.
	autoreload names its target ``dir''.  Without this, the store
	emits ``(BoundMethod ...) := ...'', which doesn't parse."
	(self ___isEnclosingComprehensionTarget___: id) ifTrue: [^false].
	^ self class isFastPathBuiltinName: id
%

category: 'other'
method: NameAst
isBaseOfClassDef
	"True if this NameAst is one of the `bases` of an enclosing
	ClassDefAst (i.e. ``class Markup(str):`` — `str` is the base).
	Used to suppress the BoundMethod fast-path so the bare class
	identifier (resolved through the symbol list to e.g. Unicode7)
	is emitted as the parent expression of the ``subclass:`` send."

	(parent isKindOf: ClassDefAst) ifFalse: [^false].
	parent bases isNil ifTrue: [^false].
	^ parent bases includes: self
%

category: 'other'
method: NameAst
isFunctionPositionOfCall
	"True if this NameAst is the `function` of an enclosing CallAst (i.e.
	`name(...)`-style call site). Used to suppress the BoundMethod special
	case when the name is being called directly."

	(parent isKindOf: CallAst) ifFalse: [^false].
	^ parent function == self
%

category: 'other'
classmethod: NameAst
isFastPathBuiltinName: aSymbol
	"Return true if `builtins` has any env-1 fast-path method matching
	`aSymbol`. Delegates to the general form with builtins as the class."

	^ self isFastPathBuiltinName: aSymbol on: builtins
%

category: 'other'
classmethod: NameAst
isFastPathBuiltinName: aSymbol on: aClass
	"Return true if `aClass` has any env-1 fast-path method matching
	`aSymbol`. We check the common fixed-arity keyword forms (`aSymbol:`,
	`aSymbol:_:`, `aSymbol:_:_:`) plus the varargs form (`_aSymbol:kw:`),
	since walking the entire env-1 method dict per Name reference would
	be too expensive at codegen time.

	Note: we deliberately do NOT check the bare unary `aSymbol` form,
	because that selector may be a legacy block-getter on unconverted
	modules, or a stored-attribute accessor on converted modules."

	| md s |
	md := aClass methodDictForEnv: 1.
	s := aSymbol asString.
	(md includesKey: (s , ':') asSymbol) ifTrue: [^true].
	(md includesKey: (s , ':_:') asSymbol) ifTrue: [^true].
	(md includesKey: (s , ':_:_:') asSymbol) ifTrue: [^true].
	(md includesKey: ('_' , s , ':kw:') asSymbol) ifTrue: [^true].
	^ false
%

category: 'other'
method: NameAst
setTo: aValue scope: aScope

	self assertContextIsStore.
	aScope set: id to: aValue.
%

category: 'Grail-annotations'
method: NameAst
___annotationSourceString___
	^ id asString
%
