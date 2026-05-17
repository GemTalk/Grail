! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDefAst
expectvalue /Class
doit
StatementAst subclass: 'ClassDefAst'
  instVarNames: #( name bases keywords
                    body decorator_list type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ClassDefAst comment: 
'ClassDef(identifier name,
		 expr* bases,
		 keyword* keywords,
		 stmt* body,
		 expr* decorator_list,
		 type_param* type_params)'
%

expectvalue /Class
doit
ClassDefAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ClassDefAst
removeallmethods ClassDefAst
removeallclassmethods ClassDefAst

set compile_env: 0

category: 'Grail-code generation'
method: ClassDefAst
addVariableNamesTo: aStream

	aStream nextPutAll: name; space
%

category: 'Grail-code generation'
method: ClassDefAst
printSmalltalkOn: aStream
	"A Python `class X:` statement is an executable statement that
	creates a fresh class object on every execution.  Inside a module-
	or function-body compilation we emit the GemStone equivalent
	inline: an ``importlib ___subclassOf:`` call that produces a
	gensym'd subclass, followed by a sequence of compileMethod: calls
	for each instance method, accessor, and the class-side value:value:
	instantiation method.  Outside that context (e.g. plain eval) we
	fall back to the legacy dict-based representation."

	(CallAst moduleClassBeingCompiled notNil) ifTrue: [
		^self printSmalltalkRuntimeOn: aStream
	].
	self printSmalltalkLegacyOn: aStream.
%

category: 'Grail-code generation'
method: ClassDefAst
printSmalltalkRuntimeOn: aStream
	"Emit code that, at run time, creates a fresh Smalltalk class for
	this Python class definition and installs its methods.  Method
	source strings are produced now (under a saved class-compile
	context), then embedded as Smalltalk string literals in
	compileMethod: calls in the emitted code."

	| ivarNames methodDefs selfParam funcNames methodSources
	  initMethod initSelector
	  savedClass savedIvarNames savedFuncNames savedSelfParam |
	ivarNames := self instanceVarNamesFromInit.
	methodDefs := self instanceMethodDefs.
	selfParam := self selfParameterName.
	funcNames := IdentitySet new.
	methodDefs do: [:def | funcNames add: def name asSymbol].

	"Push the class-compile context that the per-method codegen reads
	(CallAst consults these to decide how to dispatch self-sends,
	instVar reads, etc.).  Save outer values so a class nested in
	another class restores correctly."
	savedClass := CallAst classBeingCompiled.
	savedIvarNames := CallAst classInstVarNames.
	savedFuncNames := CallAst classFunctionNames.
	savedSelfParam := CallAst selfParameterName.

	"classBeingCompiled is only used as a non-nil marker here; the
	actual class doesn't exist until the emitted code runs."
	CallAst classBeingCompiled: name asSymbol.
	CallAst classInstVarNames: (IdentitySet withAll: ivarNames).
	CallAst classFunctionNames: funcNames.
	CallAst selfParameterName: selfParam.

	methodSources := OrderedCollection new.
	[
		methodDefs do: [:def |
			| s |
			s := PrettyWriteStream on: Unicode7 new.
			def generateClassMethodSourceOn: s.
			methodSources add: def name asString -> s contents.
		].
	] ensure: [
		CallAst classBeingCompiled: savedClass.
		CallAst classInstVarNames: savedIvarNames.
		CallAst classFunctionNames: savedFuncNames.
		CallAst selfParameterName: savedSelfParam.
	].

	"Emit the GemStone subclass: call inline.  The encoded class
	name is computed now (it's a pure function of the Python name)
	and embedded as a literal symbol; `inDictionary: nil` keeps the
	class out of any SymbolDictionary — the variable being assigned
	is the sole handle.  Free-name resolution inside this class's
	methods goes through CallAst moduleClassBeingCompiled at codegen
	time (see NameAst >> isModuleScopeName:), so no per-class module
	reference needs to be stored on the new class."
	aStream
		nextPutAll: name;
		nextPutAll: ' := '.
	self printSuperclassOn: aStream.
	aStream
		nextPutAll: ' @env0:subclass: #''';
		nextPutAll: (importlib @env0:___asSmalltalkClassName___: name) asString;
		nextPutAll: ''' instVarNames: '.
	self printSymbolArray: ivarNames on: aStream.
	aStream nextPutAll: ' classVars: #() classInstVars: #() poolDictionaries: #() inDictionary: nil options: #().'; lf.

	"Compile each instance method as a real env-1 method on the new
	class.  The source is embedded as a Smalltalk string literal."
	methodSources do: [:assoc |
		self
			emitCompileMethodOn: name
			source: assoc value
			category: 'Grail-Class Methods'
			env: 1
			classSide: false
			onStream: aStream.
	].

	"Compile a unary accessor + 1-arg setter per instance variable.
	The setter pairs with the accessor so ``___pyAttrLoad___:`` can
	distinguish a value-attribute (has both getter and setter) from
	a regular method (which would otherwise be wrapped in a
	BoundMethod).  Also lets external code do ``obj.x = v`` via the
	@env1:x: send."
	ivarNames do: [:ivar |
		| lf accessorSrc setterSrc |
		lf := Character lf asString.
		accessorSrc := ivar , lf , '	^ ' , ivar.
		self
			emitCompileMethodOn: name
			source: accessorSrc
			category: 'Grail-Accessors'
			env: 1
			classSide: false
			onStream: aStream.
		setterSrc := ivar , ': ___1' , lf , '	' , ivar , ' := ___1.'.
		self
			emitCompileMethodOn: name
			source: setterSrc
			category: 'Grail-Accessors'
			env: 1
			classSide: false
			onStream: aStream.
	].

	"For each @property method, compile a 1-arg setter that signals
	AttributeError.  Pairing the @property getter with a setter makes
	it look like an instVar to ``___pyAttrLoad___:`` so attribute
	reads INVOKE the property method (returning its value) instead of
	being wrapped in a BoundMethod.  Python @property without an
	explicit @setter is read-only; signalling AttributeError on
	assignment matches that."
	methodDefs do: [:def |
		(def decoratorList notNil
			and: [def decoratorList includes: #'property']) ifTrue: [
			| propSetterSrc lf2 |
			lf2 := Character lf asString.
			propSetterSrc := def name , ': ___1' , lf2 ,
				'	AttributeError @env0:signal: ''property ''''',
				def name , ''''' has no setter''.'.
			self
				emitCompileMethodOn: name
				source: propSetterSrc
				category: 'Grail-Property-ReadOnly'
				env: 1
				classSide: false
				onStream: aStream.
		].
	].

	"Compile the class-side value:value: method used for Python
	instantiation: Bar(x, y) maps to (Bar value: {x. y} value: kwargs)."
	initMethod := methodDefs
		detect: [:def | def name asSymbol == #'__init__']
		ifNone: [nil].
	initSelector := initMethod
		ifNotNil: [initMethod classMethodSelector]
		ifNil: [nil].
	self
		emitInstantiationMethodFor: name
		initSelector: initSelector
		onStream: aStream.
%

category: 'Grail-code generation'
method: ClassDefAst
printSuperclassOn: aStream
	"Emit a runtime expression for this class's superclass.  No
	bases → PythonInstance (the Grail-only base class that provides
	the __dict__ fallback for dynamic Python attributes that aren't
	pre-discovered from __init__).  Otherwise emit the first base's
	expression (multi-inheritance is not modeled yet — first base
	wins, and the base is expected to chain back to PythonInstance)."

	bases isEmpty ifTrue: [^ aStream nextPutAll: 'PythonInstance'].
	bases first printSmalltalkOn: aStream.
%

category: 'Grail-code generation'
method: ClassDefAst
printSymbolArray: names on: aStream
	"Emit a literal symbol array #( a b c ) for the given collection
	of strings/symbols."

	aStream nextPutAll: '#('.
	names do: [:n | aStream space; nextPutAll: n asString].
	aStream nextPutAll: ' )'.
%

category: 'Grail-code generation'
method: ClassDefAst
emitCompileMethodOn: classVarName source: sourceString category: categoryString env: envId classSide: classSideBool onStream: aStream
	"Emit a `<class> [class] compileMethod: '...' dictionaries: ...
	category: ... environmentId: N.` statement."

	aStream nextPutAll: classVarName.
	classSideBool ifTrue: [aStream nextPutAll: ' @env0:class'].
	aStream nextPutAll: ' @env0:compileMethod: '.
	self printQuotedString: sourceString on: aStream.
	aStream
		nextPutAll: ' dictionaries: importlib @env0:___compilationSymbolList___ category: ''';
		nextPutAll: categoryString;
		nextPutAll: ''' environmentId: ';
		nextPutAll: envId printString;
		nextPutAll: '.'; lf.
%

category: 'Grail-code generation'
method: ClassDefAst
emitInstantiationMethodFor: classVarName initSelector: initSelector onStream: aStream
	"Emit the class-side `value: positional value: keywords` method
	used as the entry point when Python code instantiates the class."

	| src lf |
	lf := Character lf asString.
	src := WriteStream on: Unicode7 new.
	src nextPutAll: 'value: positional value: keywords'; nextPutAll: lf.
	src nextPutAll: '| instance |'; nextPutAll: lf.
	src nextPutAll: 'instance := self @env0:new.'; nextPutAll: lf.
	initSelector ifNotNil: [
		"Varargs __init__ (defaults, *args, or **kwargs) compiles to a
		`___init__:kw:` selector that takes both positional and keyword
		arrays; the fixed-arity form takes the positional values
		spread."
		(initSelector asString endsWith: ':kw:')
			ifTrue: [
				src
					nextPutAll: 'instance perform: #''';
					nextPutAll: initSelector asString;
					nextPutAll: ''' env: 1 withArguments: (Array @env0:with: positional @env0:with: keywords).';
					nextPutAll: lf.
			] ifFalse: [
				src
					nextPutAll: 'instance perform: #''';
					nextPutAll: initSelector asString;
					nextPutAll: ''' env: 1 withArguments: positional.';
					nextPutAll: lf.
			].
	].
	src nextPutAll: '^ instance'.

	self
		emitCompileMethodOn: classVarName
		source: src contents
		category: 'Grail-Instantiation'
		env: 1
		classSide: true
		onStream: aStream.
%

category: 'Grail-code generation'
method: ClassDefAst
printQuotedString: aString on: aStream
	"Emit aString as a Smalltalk string literal, escaping embedded
	single quotes by doubling them."

	aStream nextPut: $'.
	aString do: [:c |
		c = $'
			ifTrue: [aStream nextPut: $'; nextPut: $']
			ifFalse: [aStream nextPut: c].
	].
	aStream nextPut: $'.
%

category: 'Grail-code generation'
method: ClassDefAst
printSmalltalkLegacyOn: aStream
	"Legacy dict-based class creation (for eval: context or when not in
	module compilation). Kept as fallback."

	aStream nextPutAll: name.
	aStream nextPutAll: ' := [:___cls___ |'; lf; increaseIndent.

	body variables notEmpty ifTrue: [
		aStream nextPut: $|.
		body variables do: [:each | aStream space; nextPutAll: each].
		aStream nextPutAll: ' |'; lf.
	].

	body body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].

	body variables do: [:each |
		aStream nextPutAll: '___cls___ @env0:at: #'''.
		aStream nextPutAll: each.
		aStream nextPutAll: ''' put: '.
		aStream nextPutAll: each.
		aStream nextPut: $.; lf.
	].

	aStream nextPutAll: '___cls___ @env0:at: #''__name__'' put: #'''.
	aStream nextPutAll: name.
	aStream nextPutAll: '''.'; lf.

	aStream nextPutAll: '___cls___'; lf.

	aStream decreaseIndent; nextPutAll: '] value: (PythonClass perform: #new env: 0).'.
%

category: 'Grail-accessing'
method: ClassDefAst
body

	^ body
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceVarNamesFromInit
	"Scan __init__ body for `self.attr = ...` assignments to determine
	instance variable names for the generated Smalltalk class.  Other
	attributes (set in non-__init__ methods or by external code such as
	`obj.x = ...` from another module) are stashed in the per-instance
	__dict__ fallback that PythonInstance provides."

	| initMethod initBody selfName result |
	initMethod := body body detect: [:stmt |
		(stmt isKindOf: FunctionDefAst) and: [stmt name asSymbol == #'__init__']
	] ifNone: [^ #()].
	selfName := initMethod allParameterNames first.
	initBody := initMethod body.
	result := IdentitySet new.
	initBody body do: [:stmt |
		(stmt isKindOf: AssignAst) ifTrue: [
			| tgt |
			tgt := stmt target.
			((tgt isKindOf: AttributeAst) and: [
				(tgt value isKindOf: NameAst) and: [tgt value id = selfName]
			]) ifTrue: [
				result add: tgt attr asSymbol.
			].
		].
	].
	^ result asArray
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceMethodDefs
	"Return all InstanceFunctionDefAst nodes from the class body."

	^ body body select: [:stmt | stmt isKindOf: InstanceFunctionDefAst]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
selfParameterName
	"Return the self parameter name from __init__ (or the first instance method).
	Conventionally 'self' but could be any name."

	| initMethod paramNames |
	initMethod := body body detect: [:stmt |
		(stmt isKindOf: InstanceFunctionDefAst)
	] ifNone: [^ #self].
	paramNames := initMethod allParameterNames.
	paramNames isEmpty ifTrue: [^ #self].
	^ paramNames first asSymbol
%

category: 'Grail-other'
method: ClassDefAst
__eq__

	^[:lhs :rhs | (lhs name = rhs name) ifTrue: [True] ifFalse: [False]]
%

category: 'Grail-other'
method: ClassDefAst
__mro__

	self error: 'What should thgis do?'.
"
	^[:scope |
		| linearization parentLinearizations parentList mergeLinearizations |
		linearization := Array with: (scope get: self name).
		parentLinearizations := self bases collect: [:base | (scope get: base id) __mro__ value].
		parentList := self bases collect: [:base | (scope get: base id)].
		mergeLinearizations := Array withAll: parentLinearizations.
		mergeLinearizations add: parentList.
		linearization addAll: (Linearization merge: mergeLinearizations).
		linearization.
	]
	"
%

category: 'Grail-other'
method: ClassDefAst
__str__
	"<class '__main__.MyClass'>"

	^[:inst |
		str withAll: ((WriteStream on: Unicode7 new)
			nextPutAll: '<class ''';
			nextPutAll: self module name;
			nextPut: $.;
			nextPutAll: name;
			nextPutAll: '''>';
			contents)]
%

category: 'Grail-other'
method: ClassDefAst
astNode

	^self
%

category: 'Grail-other'
method: ClassDefAst
bases

	^bases
%

category: 'Grail-other'
method: ClassDefAst
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| function |
	function := self get: aSymbol.
	^function
		callFromClass: self
		arguments: anArray
		keywords: aSymbolDictionary
		scope: aScope
%

category: 'Grail-other'
method: ClassDefAst
classAst

	^self
%

category: 'Grail-other'
method: ClassDefAst
get: aSymbol

	self halt.
%

category: 'Grail-other'
method: ClassDefAst
isDerivedFrom: aClass scope: aScope

"distinct from isSubclassOf: because
1) isDerivedFrom: checks the Python class hierarchy
2) isSubclassOf: checks the Smalltalk class hierarchy"

	(aClass name = name) ifTrue: [^true].
	bases do: [:base | ((aScope get: base id) astNode isDerivedFrom: aClass scope: aScope) ifTrue: [^true]].
	^false
%

category: 'Grail-other'
method: ClassDefAst
isInClass

	^true
%

category: 'Grail-other'
method: ClassDefAst
name

	^name
%

category: 'Grail-other'
method: ClassDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%

category: 'Grail-other'
method: ClassDefAst
setBlock: aBlockAst

	body := aBlockAst.
%

category: 'Grail-other'
method: ClassDefAst
value: posArgs value: keywordArgs value: aScope
	"args are the parameters while arguments are the values"

	self error: 'What should this do?'.
	"| obj result |
	obj := Instance new: aScope copy.
	((obj has: #'__init__') == True) ifTrue: [
		result := obj
			call: #'__init__'
			withArguments: posArgs
			keywords: keywordArgs
			scope: aScope.
	] ifFalse: [
		result := None
	].
	result == None ifFalse: [TypeError signal: '__init__() should return None, not ?'].
	^obj
	"
%
