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
isVariableLocalToEnclosingFunction: aSymbol
	"Stop the walk at this function: a name is local only if it
	appears in this function body's variables (which include params
	and locally-assigned names).  Names in further-out scopes are
	free with respect to this method."

	^ body variables includes: aSymbol
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

	(CallAst moduleClassBeingCompiled notNil and: [self isModuleLevelDef]) ifTrue: [
		aStream
			nextPutAll: name;
			nextPutAll: ' := (BoundMethod receiver: self selector: #';
			nextPutAll: name;
			nextPutAll: ').'.
		^self
	].

	aStream
		nextPutAll: name;
		nextPutAll: ' := [:positional :keyword |';
		lf;
		increaseIndent.
	args args notEmpty ifTrue: [
		aStream nextPutAll: '| '.
		args args do: [:arg |
			aStream nextPutAll: arg name; space.
		].
		aStream nextPut: $|; lf.
		1 to: args args size do: [:i |
			| arg |
			arg := args args at: i.
			aStream
				nextPutAll: arg name;
				nextPutAll: ' := positional @env0:at: ';
				print: i;
				nextPut: $.;
				lf.
		].
	].
	aStream
		nextPutAll: '[';
		lf;
		increaseIndent.
	aStream
		nextPutAll: '[';
		lf;
		increaseIndent.
	body printSmalltalkOn: aStream.
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

		"Declare param locals + body locals as block temps"
		allLocals := OrderedCollection withAll: paramNames.
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [allLocals add: each].
		].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		"Unpack positional args into locals"
		1 to: paramNames size do: [:i |
			aStream
				nextPutAll: (paramNames at: i);
				nextPutAll: ' := positional @env0:at: ';
				nextPutAll: i printString;
				nextPut: $.;
				lf.
		].
	].

	"Emit the PythonReturn handler wrapping the body, inside the block.
	Append a trailing ``None`` so an implicit fall-off (no explicit
	``return``) yields the Python None singleton, not Smalltalk nil."
	aStream nextPutAll: '['; lf.
	aStream nextPutAll: '['; lf.
	body body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].
	aStream nextPutAll: '] value.'; lf.
	aStream nextPutAll: 'None.'; lf.
	aStream nextPutAll: '] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue].'; lf.
	aStream nextPutAll: '] value'.
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
				nextPutAll: ' := positional @env0:at: ';
				nextPutAll: i printString;
				nextPut: $.;
				lf.
		].
	].

	aStream nextPutAll: '['; lf.
	aStream nextPutAll: '['; lf.
	body body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].
	aStream nextPutAll: '] value.'; lf.
	"Implicit fall-off return value is Python ``None``."
	aStream nextPutAll: 'None.'; lf.
	aStream nextPutAll: '] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue].'; lf.
	aStream nextPutAll: '] value'.
%
