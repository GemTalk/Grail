! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'FunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
FunctionDefAst comment: 
'FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns,
                       string? type_comment)'
%

expectvalue /Class
doit
FunctionDefAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from FunctionDefAst
removeallmethods FunctionDefAst
removeallclassmethods FunctionDefAst

set compile_env: 0

category: 'Grail-other'
method: FunctionDefAst
addVariableNamesTo: aStream

	aStream nextPutAll: name; space
%

category: 'Grail-other'
method: FunctionDefAst
decoratorList

	^decorator_list
%

category: 'Grail-other'
method: FunctionDefAst
name

	^name
%

category: 'Grail-other'
method: FunctionDefAst
printArgList: anArray on: aStream


	aStream nextPutAll: '{ '.
	anArray do: [:arg |
		aStream
			nextPut: $#;
			nextPutAll: arg name;
			nextPutAll: '. ';
			yourself.
	].
	aStream nextPut: $}.
%

category: 'Grail-other'
method: FunctionDefAst
printDefaultsList: anArray on: aStream


	aStream nextPutAll: '{ '.
	anArray do: [:arg |
		arg == None ifTrue: [
			aStream nextPutAll: 'None. '.
		] ifFalse: [
			arg printSmalltalkWithParenthesisOn: aStream.
			aStream
				nextPutAll: '. ';
				yourself.
		].
	].
	aStream nextPut: $}.
%

category: 'Grail-other'
method: FunctionDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%

category: 'Grail-other'
method: FunctionDefAst
printSmalltalkOn: aStream
	"When compiling a user module, top-level defs are compiled as
	real methods separately. In the initialize stream, emit a BoundMethod
	assignment so the instVar holds a callable reference for first-class use
	(e.g. `f = add; f(1, 2)`). Nested defs still use the block form."

	| fixedCount paramNames |
	(CallAst moduleClassBeingCompiled notNil and: [self isModuleLevelDef]) ifTrue: [
		aStream
			nextPutAll: name;
			nextPutAll: ' := (BoundMethod receiver: self selector: #';
			nextPutAll: name;
			nextPutAll: ').'.
		"NOTE: module-level decorators on top-level defs are NOT yet
		applied here.  ``self.name`` resolves to the real method on the
		module class via Phase-4d dispatch, which would bypass any
		runtime wrapper rebound into the local ``name``.  Wiring this up
		needs an attribute-load shim that consults the wrapper-holding
		instVar before falling through to the BoundMethod; deferred
		until a module-level @decorator is actually load-bearing."
		^self
	].

	"Block params are renamed to underscored sentinels so a user
	parameter named ``positional`` or ``kwargs`` (Jinja2's
	``optimizeconst`` wraps ``def new_func(self, node, frame,
	**kwargs):``) doesn't collide with the dispatch temps —
	Smalltalk rejects a block where the same name appears as both
	a parameter and a declared temp.  The dispatch code below
	(printPositionalUnpackingOn: + the *vararg / **kwarg bindings)
	is rerouted to the sentinel names to match."
	aStream
		nextPutAll: name;
		nextPutAll: ' := [:___positional___ :___kwargs___ |';
		lf;
		increaseIndent.
	"Collect every name we need as a block temp: fixed positionals,
	*vararg, **kwarg, AND every variable declared in the body.  The
	body's BlockAst now includes parameter names (added by
	PythonParser>>parseFunctionDefWithDecorators), so we must declare
	all locals here in a single `| ... |` pane and emit the body's
	statements without re-declaring temps."
	fixedCount := args args size.
	paramNames := OrderedCollection new.
	args args do: [:arg | paramNames add: arg name].
	args vararg ifNotNil: [paramNames add: args vararg name].
	args kwarg ifNotNil: [paramNames add: args kwarg name].
	"Merge bodyVars while preserving uniqueness."
	body variables do: [:n |
		(paramNames includes: n) ifFalse: [paramNames add: n].
	].
	paramNames isEmpty ifFalse: [
		aStream nextPutAll: '| '.
		paramNames do: [:n | aStream nextPutAll: n; space].
		aStream nextPut: $|; lf.
	].
	"Bind fixed positionals (with default fallback) — closure path
	uses the underscored sentinels declared as block params."
	self
		printPositionalUnpackingOn: aStream
		paramNames: (args args collect: [:a | a name])
		positionalName: '___positional___'
		kwargsName: '___kwargs___'.
	"Bind *vararg to the tail of positional, wrapped as a tuple. When
	the call passed exactly the fixed args, the tail is empty."
	args vararg ifNotNil: [
		aStream
			nextPutAll: args vararg name;
			nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { ___positional___ @env0:copyFrom: ';
			print: fixedCount + 1;
			nextPutAll: ' to: ___positional___ @env0:size }.';
			lf.
	].
	"Bind **kwarg to the keyword dict (or an empty dict if nil was passed)."
	args kwarg ifNotNil: [
		aStream
			nextPutAll: args kwarg name;
			nextPutAll: ' := ___kwargs___ ifNil: [(KeyValueDictionary perform: #new env: 0)].';
			lf.
	].
	aStream
		nextPutAll: '[';
		lf;
		increaseIndent.
	aStream
		nextPutAll: '[';
		lf;
		increaseIndent.
	"Iterate body statements directly so BlockAst doesn't re-declare temps
	(parameters are now in body.variables via the parser change, and the
	outer `| ... |` above already declares them)."
	body body do: [:stmt |
		stmt printSmalltalkOn: aStream.
		aStream lf.
	].
	aStream
		decreaseIndent;
		nextPutAll: '] value.';
		lf.
	"Implicit fall-off return value is Python ``None``. Explicit ``return``
	signals PythonReturn (caught by the outer handler) and bypasses this."
	aStream nextPutAll: 'None.'; lf.
	aStream
		decreaseIndent;
		nextPutAll: '] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue].';
		lf.
	aStream decreaseIndent; nextPutAll: '].'.
	"Apply decorators bottom-up.  ``@A @B def f: ...`` rebinds f to
	``A(B(f))`` — the decorator nearest the def (B) runs first, so
	iterate in reverse.  Skip Symbol entries that are class-body
	special markers (``staticmethod`` / ``classmethod`` / ``property``);
	those mutate the function's *class* via changeClassTo: at parse
	time and must NOT be re-applied as runtime calls."
	decorator_list isNil ifFalse: [
		decorator_list reverseDo: [:deco |
			(self isClassDeclarativeDecorator: deco) ifFalse: [
				aStream
					lf;
					nextPutAll: name;
					nextPutAll: ' := '.
				(deco isKindOf: Symbol)
					ifTrue: [aStream nextPutAll: deco asString]
					ifFalse: [deco printSmalltalkWithParenthesisOn: aStream].
				aStream
					nextPutAll: ' value: { ';
					nextPutAll: name;
					nextPutAll: ' } value: nil.'.
			].
		].
	].
%

category: 'Grail-code generation'
method: FunctionDefAst
isClassDeclarativeDecorator: deco
	"True if ``deco`` is a bare-name decorator that Grail handles at
	parse time by re-classing the FunctionDefAst (staticmethod /
	classmethod / property).  Those must NOT be re-applied as
	runtime decorator calls — the AST node is already a
	StaticFunctionDefAst / ClassFunctionDefAst, and the @property
	getter is paired with an auto-generated setter."

	| s |
	(deco isKindOf: Symbol) ifFalse: [^ false].
	s := deco asSymbol.
	^ s == #'staticmethod' or: [s == #'classmethod' or: [s == #'property']]
%

category: 'Grail-accessing'
method: FunctionDefAst
body

	^ body
%

category: 'Grail-other'
method: FunctionDefAst
setBlock: aBlockAst

	body := aBlockAst.
%

! ===============================================================================
! Module-level def → real Smalltalk method
! ===============================================================================

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
isModuleLevelDef
	"True if this def is a direct child of a module body (not nested inside
	another function or class). Parent chain: self → BlockAst → ModuleAst."

	parent ifNil: [^false].
	(parent isKindOf: BlockAst) ifFalse: [^false].
	parent parent ifNil: [^false].
	^ parent parent isKindOf: ModuleAst
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
isSimplePositionalArgs
	"True if the function takes only simple positional args (no *args, **kwargs,
	defaults, or keyword-only args). These can use fixed-arity selectors."

	args vararg ifNotNil: [^false].
	args kwarg ifNotNil: [^false].
	args defaults isEmpty ifFalse: [^false].
	args kwonlyargs isEmpty ifFalse: [^false].
	args kw_defaults isEmpty ifFalse: [^false].
	^ true
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
moduleMethodArity
	"Return the total positional parameter count (posonlyargs + args)."

	^ args posonlyargs size + args args size
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
moduleMethodSelector
	"Return the Smalltalk selector for this function when compiled as a module method.
	Simple positional → fixed-arity (#name, #name:, #name:_:, etc.).
	Complex signatures → varargs (#_name:kw:)."

	self isSimplePositionalArgs ifTrue: [
		^ CallAst fastPathSelectorForAttr: name arity: self moduleMethodArity
	].
	^ CallAst varargsSelectorForName: name
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
generateStubMethodSource
	"Generate a minimal stub method source for pre-registration on the module
	class. The stub has the correct selector header with parameter names but
	just returns nil. It gets replaced by the real method after codegen."

	| stream paramNames |
	stream := WriteStream on: Unicode7 new.
	self isSimplePositionalArgs ifTrue: [
		paramNames := self allParameterNames.
		stream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			stream nextPutAll: ': ___1'.
			2 to: paramNames size do: [:i |
				stream nextPutAll: ' _: ___'; nextPutAll: i printString.
			].
		].
	] ifFalse: [
		stream nextPut: $_; nextPutAll: name; nextPutAll: ': positional kw: kwargs'.
	].
	stream nextPut: Character lf; nextPutAll: '^ nil'.
	^ stream contents
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
allParameterNames
	"Return an Array of all parameter names in order: posonlyargs then args."

	| result |
	result := OrderedCollection new.
	args posonlyargs do: [:each | result add: each name].
	args args do: [:each | result add: each name].
	^ result asArray
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
printPositionalUnpackingOn: aStream paramNames: paramNames
	"Module / class method form — uses the canonical ``positional``
	and ``kwargs`` parameter names that Grail's method headers bind."

	^ self
		printPositionalUnpackingOn: aStream
		paramNames: paramNames
		positionalName: 'positional'
		kwargsName: 'kwargs'
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
printPositionalUnpackingOn: aStream paramNames: paramNames positionalName: posName kwargsName: kwName
	"Emit Smalltalk code that binds each named parameter, in priority order:
	  1. positional[i] when the call site passed at least i positional args
	  2. kwargs[#name] when kwargs is non-nil and contains the param name
	  3. the parameter's default expression (if it has one)
	  4. TypeError (missing required argument)

	`args defaults` holds the default ASTs right-aligned across the combined
	posonlyargs + args sequence (CPython semantics): the last N parameters
	have defaults, the earlier ones are required.

	``posName`` / ``kwName`` are the Smalltalk identifiers that hold the
	positional Array + keyword Dictionary at this codegen point.  The
	closure path passes underscored sentinels (``___positional___`` /
	``___kwargs___``) so a user parameter named ``positional`` or ``kwargs``
	doesn't collide with the dispatch temps."

	| numParams numDefaults firstWithDefault |
	numParams := paramNames size.
	numDefaults := args defaults size.
	firstWithDefault := numParams - numDefaults + 1.
	1 to: numParams do: [:i |
		| pname hasDefault |
		pname := paramNames at: i.
		hasDefault := i >= firstWithDefault.
		"Open the positional gate."
		aStream
			nextPutAll: pname;
			nextPutAll: ' := ((';
			nextPutAll: posName;
			nextPutAll: ' @env0:size) @env0:>= ';
			print: i;
			nextPutAll: ') ifTrue: [';
			nextPutAll: posName;
			nextPutAll: ' @env0:at: ';
			print: i;
			nextPutAll: '] ifFalse: ['.
		"Kwargs fallback — only if kwargs may be non-nil at the call
		site (varargs methods accept both)."
		aStream
			nextPutAll: '(';
			nextPutAll: kwName;
			nextPutAll: ' @env0:isNil @env0:not and: [';
			nextPutAll: kwName;
			nextPutAll: ' @env0:includesKey: #';
			nextPutAll: pname;
			nextPutAll: ']) ifTrue: [';
			nextPutAll: kwName;
			nextPutAll: ' @env0:at: #';
			nextPutAll: pname;
			nextPutAll: '] ifFalse: ['.
		hasDefault ifTrue: [
			(args defaults at: i - firstWithDefault + 1) printSmalltalkOn: aStream
		] ifFalse: [
			aStream
				nextPutAll: 'TypeError ___signal___: ''missing required argument: ';
				nextPutAll: pname;
				nextPutAll: ''''
		].
		aStream nextPutAll: ']].'; lf
	]
%

category: 'Module Method Compilation'
method: FunctionDefAst
generateMethodSourceOn: aStream
	"Generate the full method source for compiling this def as a real env-1
	method on a module class.

	For simple positional args (no *args, **kwargs, defaults):
		name: a _: b
			| <body locals> |
			^ [
			[
			<body statements>
			] value.
			] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue].

	For varargs (has *args, **kwargs, or defaults):
		_name: positional kw: kwargs
			| a b <body locals> |
			a := positional @env0:at: 1.
			b := positional @env0:at: 2.
			^ [
			[
			<body statements>
			] value.
			] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]."

	| paramNames bodyVars allLocals |
	paramNames := self allParameterNames.
	bodyVars := body variables.

	self isSimplePositionalArgs ifTrue: [
		"Emit selector line with numbered placeholder parameters. Real
		parameter names become block locals below (GemStone does not allow
		method temps to shadow instVars, but block temps can)."
		aStream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			aStream nextPutAll: ': ___1'.
			2 to: paramNames size do: [:i |
				aStream nextPutAll: ' _: ___'; nextPutAll: i printString.
			].
		].
		aStream lf.

		"Wrap everything in a block so locals are block temps (can shadow
		instVars on the module class without compile errors)."
		aStream nextPutAll: '^ ['.

		"Declare all parameter names + body locals as block temps"
		allLocals := OrderedCollection withAll: paramNames.
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [allLocals add: each].
		].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		"Unpack numbered parameters into named locals"
		1 to: paramNames size do: [:i |
			aStream
				nextPutAll: (paramNames at: i);
				nextPutAll: ' := ___';
				nextPutAll: i printString;
				nextPut: $.;
				lf.
		].
	] ifFalse: [
		"Varargs selector: _name: positional kw: kwargs"
		aStream nextPut: $_; nextPutAll: name; nextPutAll: ': positional kw: kwargs'; lf.

		"Wrap in block for same instVar-shadowing reason"
		aStream nextPutAll: '^ ['.

		"Declare param locals (positional + *vararg + kwonly + **kwarg)
		+ body locals as block temps."
		allLocals := OrderedCollection withAll: paramNames.
		args vararg ifNotNil: [allLocals add: args vararg name].
		args kwonlyargs do: [:each |
			(allLocals includes: each name) ifFalse: [allLocals add: each name].
		].
		args kwarg ifNotNil: [allLocals add: args kwarg name].
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [allLocals add: each].
		].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		"Unpack positional args into locals (with default-arg fallback)."
		self printPositionalUnpackingOn: aStream paramNames: paramNames.
		"Bind *vararg to the tail of positional, wrapped as a tuple."
		args vararg ifNotNil: [
			aStream
				nextPutAll: args vararg name;
				nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { positional @env0:copyFrom: ';
				nextPutAll: (paramNames size + 1) printString;
				nextPutAll: ' to: positional @env0:size }.';
				lf.
		].
		"Bind keyword-only args from the kwargs dict, falling back to
		the corresponding kw_default expression.  A nil entry in
		kw_defaults means the kwonly arg is required (no default) —
		emit a TypeError if missing.  Lookup keys are symbols since
		kwargs dicts are built with symbol keys."
		args kwonlyargs doWithIndex: [:each :i |
			| def |
			def := args kw_defaults at: i ifAbsent: [nil].
			aStream
				nextPutAll: each name;
				nextPutAll: ' := kwargs ifNil: ['.
			def isNil ifTrue: [
				aStream
					nextPutAll: 'TypeError ___signal___: ''missing keyword-only argument: ';
					nextPutAll: each name;
					nextPutAll: ''''
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream
				nextPutAll: '] ifNotNil: [kwargs @env0:at: #';
				nextPutAll: each name;
				nextPutAll: ' ifAbsent: ['.
			def isNil ifTrue: [
				aStream
					nextPutAll: 'TypeError ___signal___: ''missing keyword-only argument: ';
					nextPutAll: each name;
					nextPutAll: ''''
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream nextPutAll: ']].'; lf.
		].
		"Bind **kwarg to the keyword dict (or empty)."
		args kwarg ifNotNil: [
			aStream
				nextPutAll: args kwarg name;
				nextPutAll: ' := kwargs ifNil: [(KeyValueDictionary perform: #new env: 0)].';
				lf.
		].
	].

	"Emit the PythonReturn handler wrapping the body, inside the block.
	Append a trailing ``None`` so an implicit fall-off (no explicit
	``return``) yields the Python None singleton, not Smalltalk nil.

	For generator functions (body contains ``yield``), the body itself
	doesn't run on call — it's wrapped in a 1-arg block that takes a
	``___gen___`` parameter (the PythonGenerator), and the outer
	expression returns the generator.  ``yield`` inside the body emits
	``___gen___ ___yield___: value``."
	self printBodyOn: aStream.
	aStream nextPutAll: '] value'.
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
isGenerator
	"True if this function''s body contains a ``yield`` (or
	``yield from``) expression — not counting yields inside
	*nested* defs, which belong to their own generator scope."

	^ self bodyContainsYieldExceptNestedDefs: body body
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
bodyContainsYieldExceptNestedDefs: stmts
	"Walk an array of statements (or a single statement) looking
	for YieldAst / YieldFromAst, but don't descend into FunctionDefAst
	or LambdaAst — yield in a nested def belongs to that def."

	stmts isNil ifTrue: [^false].
	(stmts isKindOf: SequenceableCollection) ifFalse: [
		^ self nodeContainsYieldExceptNestedDefs: stmts
	].
	stmts do: [:stmt |
		(self nodeContainsYieldExceptNestedDefs: stmt) ifTrue: [^true]
	].
	^false
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
nodeContainsYieldExceptNestedDefs: node
	"Recursive walk over a single AST node looking for yield without
	descending into nested defs/lambdas."

	node isNil ifTrue: [^false].
	(node isKindOf: YieldAst) ifTrue: [^true].
	(node isKindOf: YieldFromAst) ifTrue: [^true].
	((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
		ifTrue: [^false].
	"Walk all instVars of this AST node; recurse into AbstractNode
	children and SequenceableCollection containers.  Skip the
	``parent`` back-pointer to avoid cycling up the tree."
	node @env0:class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			| child |
			child := node @env0:instVarAt: i.
			(child isKindOf: AbstractNode) ifTrue: [
				(self nodeContainsYieldExceptNestedDefs: child) ifTrue: [^true]
			] ifFalse: [
				(child isKindOf: SequenceableCollection) ifTrue: [
					(self bodyContainsYieldExceptNestedDefs: child) ifTrue: [^true]
				]
			]
		]
	].
	^false
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
printBodyOn: aStream
	"Emit the function body wrapped in the PythonReturn handler.
	For generator functions, wrap the whole thing in a
	``PythonGenerator withBlock: [:___gen___ | ...]`` so the call
	returns a generator instead of running the body."

	self isGenerator ifTrue: [
		aStream nextPutAll: 'PythonGenerator @env1:withBlock: [:___gen___ |'; lf.
	].
	aStream nextPutAll: '['; lf.
	aStream nextPutAll: '['; lf.
	body body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].
	aStream nextPutAll: '] value.'; lf.
	aStream nextPutAll: 'None.'; lf.
	aStream nextPutAll: '] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]'.
	self isGenerator ifTrue: [
		aStream nextPutAll: ']'.
	].
	aStream nextPutAll: '.'; lf.
%

! ===============================================================================
! Class instance method → real Smalltalk method
! ===============================================================================

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
classMethodParameterNames
	"Return parameter names excluding the self parameter (first arg).
	For `def foo(self, a, b):` returns #('a' 'b')."

	| all |
	all := self allParameterNames.
	all isEmpty ifTrue: [^ #()].
	^ all copyFrom: 2 to: all size
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
classMethodArity
	"Return the arity excluding the self parameter."

	^ self moduleMethodArity - 1 max: 0
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
classMethodSelector
	"Return the Smalltalk selector for this function as a class instance method.
	Same convention as module methods but with self stripped:
	  def foo(self): → #foo (0 real args)
	  def foo(self, a): → #foo: (1 real arg)
	  def foo(self, a, b): → #foo:_: (2 real args)
	For complex signatures → #_foo:kw: (varargs)."

	self isSimplePositionalArgs ifTrue: [
		^ CallAst fastPathSelectorForAttr: name arity: self classMethodArity
	].
	^ CallAst varargsSelectorForName: name
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
generateClassMethodStubSource
	"Generate a stub for pre-registration (same idea as generateStubMethodSource
	but with self stripped from parameters)."

	| stream paramNames |
	stream := WriteStream on: Unicode7 new.
	self isSimplePositionalArgs ifTrue: [
		paramNames := self classMethodParameterNames.
		stream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			stream nextPutAll: ': ___1'.
			2 to: paramNames size do: [:i |
				stream nextPutAll: ' _: ___'; nextPutAll: i printString.
			].
		].
	] ifFalse: [
		stream nextPut: $_; nextPutAll: name; nextPutAll: ': positional kw: kwargs'.
	].
	stream nextPut: Character lf; nextPutAll: '^ nil'.
	^ stream contents
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
generateClassMethodSourceOn: aStream
	"Generate method source for a class instance method. Strips the self
	parameter (first arg of the Python function). The Smalltalk `self`
	serves as the Python instance.

	For simple positional args:
		foo: ___1 _: ___2
			^ [| a b <body locals> |
			a := ___1. b := ___2.
			[
			[<body>] value.
			] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue].
			] value

	For varargs:
		_foo: positional kw: kwargs
			^ [| a b <body locals> |
			a := positional @env0:at: 1.
			b := positional @env0:at: 2.
			...
			] value"

	| paramNames bodyVars allLocals classIvars |
	paramNames := self classMethodParameterNames.
	bodyVars := body variables.
	classIvars := CallAst classInstVarNames ifNil: [IdentitySet new].

	self isSimplePositionalArgs ifTrue: [
		aStream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			aStream nextPutAll: ': ___1'.
			2 to: paramNames size do: [:i |
				aStream nextPutAll: ' _: ___'; nextPutAll: i printString.
			].
		].
		aStream lf.

		aStream nextPutAll: '^ ['.

		"Declare parameter names + body locals as block temps, EXCLUDING
		names that are instVars on the class (those resolve as instVar
		accesses and must not be shadowed by block temps)."
		allLocals := OrderedCollection new.
		paramNames do: [:each |
			(classIvars includes: each asSymbol) ifFalse: [allLocals add: each].
		].
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [
				(CallAst isSelfReference: each) ifFalse: [
					(classIvars includes: each asSymbol) ifFalse: [allLocals add: each].
				].
			].
		].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		1 to: paramNames size do: [:i |
			aStream
				nextPutAll: (paramNames at: i);
				nextPutAll: ' := ___';
				nextPutAll: i printString;
				nextPut: $.;
				lf.
		].
	] ifFalse: [
		| classIvars |
		classIvars := CallAst classInstVarNames ifNil: [IdentitySet new].
		aStream nextPut: $_; nextPutAll: name; nextPutAll: ': positional kw: kwargs'; lf.

		aStream nextPutAll: '^ ['.

		"Declare param locals (positional + *vararg + kwonly + **kwarg)
		+ body locals as block temps.  Match the module-method path so
		every parameter shape — defaults, *args, kwonly, **kwargs — has
		a binding emitted below."
		allLocals := OrderedCollection new.
		paramNames do: [:each |
			(classIvars includes: each asSymbol) ifFalse: [allLocals add: each].
		].
		args vararg ifNotNil: [
			(classIvars includes: args vararg name asSymbol) ifFalse: [
				allLocals add: args vararg name].
		].
		args kwonlyargs do: [:each |
			((allLocals includes: each name)
				or: [classIvars includes: each name asSymbol]) ifFalse: [
					allLocals add: each name].
		].
		args kwarg ifNotNil: [
			(classIvars includes: args kwarg name asSymbol) ifFalse: [
				allLocals add: args kwarg name].
		].
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [
				(CallAst isSelfReference: each) ifFalse: [
					(classIvars includes: each asSymbol) ifFalse: [allLocals add: each].
				].
			].
		].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		"Positional / kwargs / default unpacking for the named params."
		self printPositionalUnpackingOn: aStream paramNames: paramNames.
		"Bind *vararg to the tail of positional, wrapped as a tuple."
		args vararg ifNotNil: [
			aStream
				nextPutAll: args vararg name;
				nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { positional @env0:copyFrom: ';
				nextPutAll: (paramNames size + 1) printString;
				nextPutAll: ' to: positional @env0:size }.';
				lf.
		].
		"Bind keyword-only args from the kwargs dict, falling back to
		the corresponding kw_default expression."
		args kwonlyargs doWithIndex: [:each :i |
			| def |
			def := args kw_defaults at: i ifAbsent: [nil].
			aStream
				nextPutAll: each name;
				nextPutAll: ' := kwargs ifNil: ['.
			def isNil ifTrue: [
				aStream
					nextPutAll: 'TypeError ___signal___: ''missing keyword-only argument: ';
					nextPutAll: each name;
					nextPutAll: ''''
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream
				nextPutAll: '] ifNotNil: [kwargs @env0:at: #';
				nextPutAll: each name;
				nextPutAll: ' ifAbsent: ['.
			def isNil ifTrue: [
				aStream
					nextPutAll: 'TypeError ___signal___: ''missing keyword-only argument: ';
					nextPutAll: each name;
					nextPutAll: ''''
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream nextPutAll: ']].'; lf.
		].
		"Bind **kwarg to the keyword dict (or empty)."
		args kwarg ifNotNil: [
			aStream
				nextPutAll: args kwarg name;
				nextPutAll: ' := kwargs ifNil: [(KeyValueDictionary perform: #new env: 0)].';
				lf.
		].
	].

	self printBodyOn: aStream.
	aStream nextPutAll: '] value'.
%
