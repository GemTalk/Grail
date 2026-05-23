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
	is rerouted to the sentinel names to match.

	Defaults are pre-evaluated in the OUTER scope (wrapped in a
	zero-arg outer block invoked immediately with ``value``) so a
	default expression that references its own parameter name —
	jinja2's ``def root(context, missing=missing):`` — sees the
	enclosing module binding rather than the (nil) inner temp.
	Python's semantics evaluate defaults at def-time in the
	enclosing scope; matching that here is the only way ``X=X``
	default-capture works without raising UnboundLocalError."
	aStream
		nextPutAll: name;
		nextPutAll: ' := '.
	"Emit a def-time default-capture outer block when there are
	defaults.  The outer block runs immediately (``] value``) and
	returns the inner function block; defaults that reference the
	enclosing scope (jinja2's ``missing=missing``) resolve there
	at def-time instead of failing in the inner block where the
	same name is the local being bound."
	(args defaults notNil and: [args defaults @env0:notEmpty]) ifTrue: [
		| numDefaults firstWithDefault |
		numDefaults := args defaults size.
		firstWithDefault := args args size - numDefaults + 1.
		aStream nextPut: $[; lf; nextPutAll: '| '.
		1 to: numDefaults do: [:i |
			aStream nextPutAll: '___default_'; nextPutAll: (args args at: firstWithDefault + i - 1) name; nextPutAll: '___ '].
		aStream nextPutAll: '|'; lf.
		1 to: numDefaults do: [:i |
			| pname |
			pname := (args args at: firstWithDefault + i - 1) name.
			aStream nextPutAll: '___default_'; nextPutAll: pname; nextPutAll: '___ := '.
			(args defaults at: i) printSmalltalkOn: aStream.
			aStream nextPut: $.; lf].
	].
	aStream
		nextPutAll: '[:___positional___ :___kwargs___ |';
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
	"Generator functions wrap the entire body in ``PythonGenerator
	@env1:withBlock: [:___gen___ | ... ]`` so a call returns a lazy
	generator instead of running the body to completion.  Matches
	the module-method path's ``printBodyOn:``; without this, a
	closure-form ``def gen(): yield x`` would emit ``___gen___
	___yield___:`` references with no surrounding declaration —
	compile error ``undefined symbol ___gen___``.  Eval and exec
	paths both flow through this closure form."
	self isGenerator ifTrue: [
		aStream nextPutAll: 'PythonGenerator @env1:withBlock: [:___gen___ |'; lf.
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
		nextPutAll: '] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]';
		lf.
	self isGenerator ifTrue: [
		aStream nextPutAll: ']'.
	].
	aStream nextPutAll: '.'; lf.
	aStream decreaseIndent; nextPutAll: ']'.
	"Close the default-pre-eval outer block if any.  When defaults
	exist, ``name := [ ___default_X___ := X. [inner] ] value`` —
	the outer block evaluates immediately to capture defaults at
	def-time, returning the inner block as the actual callable.
	With no defaults the outer wrapper is the inner block directly."
	(args defaults notNil and: [args defaults @env0:notEmpty]) ifTrue: [
		aStream nextPutAll: '] value'.
	].
	aStream nextPutAll: '.'.
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
			"Reference the pre-evaluated default temp captured by the
			enclosing block (closure form only — the closure path wraps
			in an outer block that binds ``___default_<pname>___`` at
			def-time).  Module/class-method generators still emit the
			default expr inline; the closure path is the only one that
			needs def-time evaluation because that's the only form
			where ``X=X`` defaults reference the enclosing scope."
			(posName @env0:= '___positional___')
				ifTrue: [
					aStream nextPutAll: '___default_'; nextPutAll: pname; nextPutAll: '___'
				] ifFalse: [
					(args defaults at: i - firstWithDefault + 1) printSmalltalkOn: aStream
				]
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
assignedNamesInBody
	"Return the IdentitySet of names bound anywhere in the body — i.e.
	names that are assigned, augmented-assigned, used as a for-loop
	target, walrus target, except-as / with-as target, or bound by a
	nested ``def`` / ``class`` / ``import`` statement.

	The parser's declareWrite: calls populate body.writes at every
	such binding site; this accessor just exposes that set.  Excludes
	parameter declarations (those use declareVariable:, which lands
	in body.variables but not body.writes — see PythonParser >>
	parseFunctionDefWithDecorators:).  May be nil for hand-built
	BlockAst nodes that predate write-tracking; treat nil as empty."

	^ body writes ifNil: [IdentitySet new]
%

category: 'Module Method Compilation'
method: FunctionDefAst
isSmalltalkReservedIdentifier: aString
	"Smalltalk pseudo-variables and other identifiers that can't be
	used as method-argument names without ambiguity.  When a Python
	parameter has one of these names, fall back to the ``___N``
	positional placeholder + block-temp copy."

	^ #(#'self' #'super' #'thisContext' #'nil' #'true' #'false')
		includes: aString asSymbol
%

category: 'Module Method Compilation'
method: FunctionDefAst
paramNeedsTemp: aName assigned: assignedNames instVars: instVarNames
	"Return true if Python parameter aName needs to be a block-local
	temp rather than serving as the Smalltalk method argument
	directly.  Three cases force the temp:
	  - The body rebinds the parameter (Smalltalk method args are
	    read-only; Python parameters are rebindable).
	  - The parameter name collides with a Smalltalk pseudo-variable
	    (self / super / nil / true / false / thisContext).
	  - The parameter name matches an instVar of the enclosing class
	    (GemStone forbids method args from shadowing instVars; block
	    temps may, which is why the fallback works)."

	(assignedNames includes: aName asSymbol) ifTrue: [^ true].
	(self isSmalltalkReservedIdentifier: aName) ifTrue: [^ true].
	(instVarNames includes: aName asSymbol) ifTrue: [^ true].
	^ false
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

	| paramNames bodyVars allLocals assignedNames needsTemp instVarNames canOptimise |
	paramNames := self allParameterNames.
	bodyVars := body variables.
	"Whether to apply the method-arg optimisation (use the real Python
	parameter name as the Smalltalk method argument when it's read-only
	and not a pseudo-var).  Only safe when we know exactly which class
	the resulting method will live on — module-level defs compile onto
	moduleClassBeingCompiled, whose allInstVarNames we can enumerate.
	@staticmethod / @classmethod bodies also go through this generator
	but compile onto a Python class's metaclass (signalled by
	classBeingCompiled being non-nil), whose instVar set we can't
	enumerate at codegen time."
	canOptimise := CallAst moduleClassBeingCompiled notNil
		and: [CallAst classBeingCompiled isNil].
	instVarNames := canOptimise
		ifTrue: [IdentitySet withAll:
			(CallAst moduleClassBeingCompiled allInstVarNames
				collect: [:each | each asSymbol])]
		ifFalse: [IdentitySet new].

	self isSimplePositionalArgs ifTrue: [
		| transportNames |
		"Compute per-parameter ``needs a block temp'' decisions.  See
		paramNeedsTemp:assigned:instVars: for the three conditions that
		force a temp; otherwise the param serves as the Smalltalk method
		argument directly.  When the optimisation isn't safe (see
		``canOptimise'' above), force a temp for every param — the
		original conservative behaviour."
		assignedNames := self assignedNamesInBody.
		needsTemp := paramNames collect: [:each |
			canOptimise
				ifTrue: [self paramNeedsTemp: each assigned: assignedNames instVars: instVarNames]
				ifFalse: [true]].

		"For each param that needs a temp, pick the method-arg name used
		to transport the value into the block.  When canOptimise is
		true (module-level def whose target class's instVars we can
		fully enumerate), prefer ``_X'' so the selector and the copy
		line read traceably; fall back to ``___N'' if ``_X'' would
		collide with another parameter, a body local, or an instVar.
		When canOptimise is false (class method body, target class's
		instVars include unknown inherited slots), stay on ``___N''
		— a collision against an inherited instVar would otherwise
		surface as a CompileError at runtime.

		Real-world collision the instVar check catches: urllib.parse
		does ``import string as _string'' at module level, so
		``_string'' is an instVar; a later ``def unquote_to_bytes(
		string):'' would otherwise emit ``unquote_to_bytes: _string''
		and clash."
		transportNames := paramNames collect: [:each | each].
		1 to: paramNames size do: [:i |
			(needsTemp at: i) ifTrue: [
				| candidate |
				candidate := '_' , (paramNames at: i).
				(canOptimise
					and: [(paramNames includes: candidate) not
					and: [(bodyVars includes: candidate asSymbol) not
					and: [(instVarNames includes: candidate asSymbol) not]]])
					ifTrue: [transportNames at: i put: candidate]
					ifFalse: [transportNames at: i put: '___' , i printString].
			].
		].

		"Emit selector line.  Each keyword's argument is either the real
		parameter name (when the param is read-only inside the body and
		not a Smalltalk pseudo-var) or the ``_X'' (or ``___N'') transport
		name that will be unpacked into a block temp below."
		aStream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			aStream nextPutAll: ': '.
			aStream nextPutAll: ((needsTemp at: 1)
				ifTrue: [transportNames at: 1]
				ifFalse: [paramNames first]).
			2 to: paramNames size do: [:i |
				aStream nextPutAll: ' _: '.
				aStream nextPutAll: ((needsTemp at: i)
					ifTrue: [transportNames at: i]
					ifFalse: [paramNames at: i]).
			].
		].
		aStream lf.

		"Build outer-block locals: reassigned/reserved params (need a
		writable temp) followed by body-only locals (excluding ones that
		are direct method arguments)."
		allLocals := OrderedCollection new.
		1 to: paramNames size do: [:i |
			(needsTemp at: i) ifTrue: [allLocals add: (paramNames at: i)].
		].
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [
				((paramNames includes: each) and: [
					(needsTemp at: (paramNames indexOf: each)) not]) ifFalse: [
					allLocals add: each.
				].
			].
		].

		"If we need any temps, wrap in an outer block; otherwise emit the
		body's on:do: expression directly after ^."
		allLocals isEmpty ifTrue: [
			aStream nextPutAll: '^ '.
		] ifFalse: [
			aStream nextPutAll: '^ ['.
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
			"Unpack each transported param into its block-local temp."
			1 to: paramNames size do: [:i |
				(needsTemp at: i) ifTrue: [
					aStream
						nextPutAll: (paramNames at: i);
						nextPutAll: ' := ';
						nextPutAll: (transportNames at: i);
						nextPut: $.;
						lf.
				].
			].
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

	"Emit the PythonReturn handler wrapping the body.  When there are
	no outer-block locals (no reassigned/reserved params and no body
	locals), the on:do: expression sits directly after ^ — no outer
	block wrapper needed.  Otherwise it's nested inside the outer
	``[| temps | ... ] value`` block opened above.  Append a trailing
	``None`` so an implicit fall-off (no explicit ``return``) yields
	the Python None singleton, not Smalltalk nil.

	For generator functions (body contains ``yield``), the body itself
	doesn't run on call — it's wrapped in a 1-arg block that takes a
	``___gen___`` parameter (the PythonGenerator), and the outer
	expression returns the generator.  ``yield`` inside the body emits
	``___gen___ ___yield___: value``."
	self printBodyOn: aStream.
	allLocals isEmpty ifFalse: [
		aStream nextPutAll: '] value'.
	].
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
	returns a generator instead of running the body.

	Body locals are hoisted into the enclosing function block by
	generateClassMethodSourceOn: / generateMethodSourceOn:, so the
	body statements sit directly inside the on:do: block — no
	separate ``[ <stmts> ] value`` scope wrapper is needed.  The
	trailing ``None.`` is the implicit fall-through return value
	when no Python ``return`` fires."

	self isGenerator ifTrue: [
		aStream nextPutAll: 'PythonGenerator @env1:withBlock: [:___gen___ |'; lf.
	].
	aStream nextPutAll: '['; lf.
	body body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].
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
		"Class methods always use ``___N`` placeholders + block-temp
		copies for parameters, even when the body doesn't rebind them.
		The module-method path optimises away the temp when safe, but
		that check needs the full set of inherited instVars of the
		class being defined — and at codegen time the class doesn't
		exist yet (its parent is an arbitrary Python expression).
		Without a way to enumerate inherited slots, we'd risk emitting
		a method arg that silently shadows an inherited instVar — a
		GemStone compile error.  Stick with the conservative shape
		here; the optimisation is mostly a module-method win anyway."
		aStream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			aStream nextPutAll: ': ___1'.
			2 to: paramNames size do: [:i |
				aStream nextPutAll: ' _: ___'; nextPutAll: i printString.
			].
		].
		aStream lf.

		aStream nextPutAll: '^ ['.

		"Declare parameter names + body locals as block temps.  Parameter
		names ALWAYS become block temps — Python parameters are always
		locals and must shadow any class-instVar of the same name.  Body
		variables that happen to match a classIvar are *excluded* so
		that bare-name reads/writes of those names continue to flow
		through the instVar path (Grail's implicit ``self.X`` shorthand
		inside instance methods).  Without the parameter override,
		``def from_string(self, source, globals=None, ...)`` would assign
		None to the enclosing class's ``globals`` instVar instead of
		binding the local."
		allLocals := OrderedCollection new.
		paramNames do: [:each | allLocals add: each].
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
		a binding emitted below.  Parameters always become block temps
		(see the simple-positional branch for the rationale)."
		allLocals := OrderedCollection new.
		paramNames do: [:each | allLocals add: each].
		args vararg ifNotNil: [allLocals add: args vararg name].
		args kwonlyargs do: [:each |
			(allLocals includes: each name) ifFalse: [
				allLocals add: each name].
		].
		args kwarg ifNotNil: [allLocals add: args kwarg name].
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

	"Class methods always use the outer ``^ [ ... ] value`` block (see
	the simple-positional branch above for why the optimisation is
	restricted to module methods)."
	self printBodyOn: aStream.
	aStream nextPutAll: '] value'.
%
