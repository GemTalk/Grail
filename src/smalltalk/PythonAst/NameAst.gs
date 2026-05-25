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

	"self parameter in class method → Smalltalk self"
	(CallAst isSelfReference: id) ifTrue: [
		aStream nextPutAll: 'self'.
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
			(CallAst moduleFunctionNames notNil
				and: [CallAst moduleFunctionNames includes: id asSymbol])
				ifTrue: [
					aStream
						nextPutAll: '(BoundMethod receiver: (';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) selector: #';
						nextPutAll: id;
						nextPutAll: ')'.
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
				(self ___declaredInEnclosingFunction___: id) ifFalse: [
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
	((ctx isKindOf: LoadAst) and: [self ___declaredInEnclosingFunction___: id]) ifTrue: [
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
		and: [CallAst classBeingCompiled isNil
		and: [(self class isResolvableSymbol: id asSymbol) not]]]) ifTrue: [
		"Builtins (``type``, ``len``, ...) are methods on the
		builtins class — emit a BoundMethod so direct call sites
		dispatch through env-1 arity resolution rather than a
		failing ``at:`` lookup.  Suppressed when this NameAst is
		the base of an enclosing ClassDefAst (a class needs the
		actual class object, not a callable wrapper)."
		(self isFastPathBuiltinName) ifTrue: [
			aStream
				nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
				nextPutAll: id;
				nextPutAll: ')'.
			^self
		].
		"Phase A: module attribute load goes through dynamicInstVarAt:."
		self emitModuleAttrLoad: id receiverExpr: 'self' on: aStream.
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
		and: [(self ___declaredInEnclosingFunction___: id) not]]]]) ifTrue: [
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
		| tgt |
		tgt := gen target.
		((tgt isKindOf: NameAst) and: [tgt id asSymbol == aSymbol asSymbol])
			ifTrue: [^ true].
		(tgt isKindOf: TupleAst) ifTrue: [
			tgt elts do: [:elt |
				((elt isKindOf: NameAst) and: [elt id asSymbol == aSymbol asSymbol])
					ifTrue: [^ true]
			]
		]
	].
	^ false
%

category: 'other'
method: NameAst
___functionDeclaresLocal___: funcAst named: aSymbol
	"True iff the given FunctionDefAst or LambdaAst declares
	aSymbol as a parameter or in its body's BlockAst variables.
	Uses instVar access (no public getters on AST nodes)."

	| ivars argsIdx bodyIdx argsNode bodyNode argsIvars |
	ivars := funcAst class allInstVarNames.
	argsIdx := ivars indexOf: #args.
	bodyIdx := ivars indexOf: #body.
	argsNode := argsIdx > 0 ifTrue: [funcAst instVarAt: argsIdx] ifFalse: [nil].
	bodyNode := bodyIdx > 0 ifTrue: [funcAst instVarAt: bodyIdx] ifFalse: [nil].
	argsNode ifNotNil: [
		argsIvars := argsNode class allInstVarNames.
		#(#args #posonlyargs #kwonlyargs) do: [:fld |
			| idx list |
			idx := argsIvars indexOf: fld.
			idx > 0 ifTrue: [
				list := argsNode instVarAt: idx.
				list ifNotNil: [
					(list anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
						ifTrue: [^ true]
				].
			].
		].
		#(#vararg #kwarg) do: [:fld |
			| idx v |
			idx := argsIvars indexOf: fld.
			idx > 0 ifTrue: [
				v := argsNode instVarAt: idx.
				(v notNil and: [v name asSymbol == aSymbol asSymbol])
					ifTrue: [^ true].
			].
		].
	].
	((bodyNode isKindOf: BlockAst)
		and: [bodyNode variables includes: aSymbol asSymbol])
			ifTrue: [^ true].
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
	(self isVariableIsDeclared: id) ifTrue: [^false].
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
