! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDefAst
expectvalue /Class
doit
StatementAst subclass: 'ClassDefAst'
  instVarNames: #( name bases keywords
                    body decorator_list type_params
                    instanceVariables)
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

	| ivarNames methodDefs classMethodDefs selfParam funcNames varargsFuncNames
	  methodSources classMethodSources
	  initMethod initSelector classAttrs allClassInstVars
	  savedClass savedIvarNames savedFuncNames savedVarargsFuncNames
	  savedSelfParam savedClassAttrNames |
	ivarNames := self instanceVarNamesFromInit.
	methodDefs := self instanceMethodDefs.
	classMethodDefs := self classMethodDefs.
	selfParam := self selfParameterName.
	funcNames := IdentitySet new.
	varargsFuncNames := IdentitySet new.
	methodDefs do: [:def |
		funcNames add: def name asSymbol.
		"A def with *args / **kwargs / defaults compiles to ``_name:kw:``
		only - mark it so classSelfSendSelector doesn't emit a unary
		send into thin air."
		def isSimplePositionalArgs ifFalse: [
			varargsFuncNames add: def name asSymbol
		].
	].
	"Track @classmethod-decorated funcs in the same name set so a
	self-send like ``cls.foo`` from another method resolves to a
	known function name (and uses the correct varargs/fixed-arity
	selector below)."
	classMethodDefs do: [:def |
		funcNames add: def name asSymbol.
		def isSimplePositionalArgs ifFalse: [
			varargsFuncNames add: def name asSymbol
		].
	].
	"Scan body for class-level simple assignments (`NAME = value`,
	or chained `A = B = value`).  Each declared name becomes a
	class-side attribute (Smalltalk classInstVar + class-side getter/
	setter)."
	classAttrs := self classBodyAttributes.

	"Push the class-compile context that the per-method codegen reads
	(CallAst consults these to decide how to dispatch self-sends,
	instVar reads, etc.).  Save outer values so a class nested in
	another class restores correctly."
	savedClass := CallAst classBeingCompiled.
	savedIvarNames := CallAst classInstVarNames.
	savedFuncNames := CallAst classFunctionNames.
	savedVarargsFuncNames := CallAst classVarargsFunctionNames.
	savedClassAttrNames := CallAst classAttrNames.
	savedSelfParam := CallAst selfParameterName.

	"classBeingCompiled is only used as a non-nil marker here; the
	actual class doesn't exist until the emitted code runs."
	CallAst classBeingCompiled: name asSymbol.
	CallAst classInstVarNames: (IdentitySet withAll: ivarNames).
	CallAst classFunctionNames: funcNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	CallAst classAttrNames: (IdentitySet withAll: (classAttrs collect: [:p | p key])).
	CallAst selfParameterName: selfParam.

	methodSources := OrderedCollection new.
	classMethodSources := OrderedCollection new.
	[
		methodDefs do: [:def |
			| s |
			s := PrettyWriteStream on: Unicode7 new.
			def generateClassMethodSourceOn: s.
			methodSources add: def name asString -> s contents.
		].
		"@classmethod bodies use the same per-method source generator
		(both strip the first positional — ``self`` or ``cls`` — and
		the Smalltalk receiver IS the class for class-side methods, so
		``cls`` becomes the implicit ``self``).  Compile target is
		class-side; see the classSide: true emit further below.

		Clear ``classInstVarNames`` during the classmethod compile —
		those names live on *instances*, not on the metaclass, so a
		classmethod parameter that happens to share a name with an
		instance instVar (``def stamped(cls, label)`` against
		``__init__(self, label)``) must be declared as a real temp.
		If it stayed filtered out as if it were an instVar, the
		generated source would read ``label := ___1`` and the
		Smalltalk compiler would reject ``label`` as an undefined
		symbol on the metaclass side."
		classMethodDefs isEmpty ifFalse: [
			| savedForCM |
			savedForCM := CallAst classInstVarNames.
			CallAst classInstVarNames: IdentitySet new.
			[
				classMethodDefs do: [:def |
					| s savedSelfForCM |
					"For each classmethod, switch ``selfParameterName`` to its
					own first argument (typically ``cls``) so NameAst maps
					body references like ``cls(...)`` and ``cls.X`` to
					Smalltalk ``self`` (which on a class-side method IS the
					class)."
					savedSelfForCM := CallAst selfParameterName.
					CallAst selfParameterName: (def allParameterNames isEmpty
						ifTrue: [#cls asSymbol]
						ifFalse: [def allParameterNames first asSymbol]).
					[
						s := PrettyWriteStream on: Unicode7 new.
						def generateClassMethodSourceOn: s.
						classMethodSources add: def name asString -> s contents.
					] ensure: [
						CallAst selfParameterName: savedSelfForCM.
					].
				]
			] ensure: [
				CallAst classInstVarNames: savedForCM.
			].
		].
	] ensure: [
		CallAst classBeingCompiled: savedClass.
		CallAst classInstVarNames: savedIvarNames.
		CallAst classFunctionNames: savedFuncNames.
		CallAst classVarargsFunctionNames: savedVarargsFuncNames.
		CallAst classAttrNames: savedClassAttrNames.
		CallAst selfParameterName: savedSelfParam.
	].

	"Emit the GemStone subclass: call inline.  The encoded class
	name is computed now (it's a pure function of the Python name)
	and embedded as a literal symbol; `inDictionary: nil` keeps the
	class out of any SymbolDictionary — the variable being assigned
	is the sole handle.  Free-name resolution inside this class's
	methods goes through CallAst moduleClassBeingCompiled at codegen
	time (see NameAst >> isModuleScopeName:), so no per-class module
	reference needs to be stored on the new class.

	The subclass: call is wrapped in
	  ``[:___parent | ___parent subclass: ... classInstVars:
	         (<all attr names> reject:
	             [:n | ___parent class allInstVarNames includes: n])
	         ...] value: <parent expr>``
	so subclass declarations that rebind a class attribute the parent
	already exposes (``class TimedSerializer(Serializer):
	default_signer = X``) don't re-declare the slot — Smalltalk's
	``subclass:...classInstVars:`` rejects names already present in
	the parent metaclass with rtErrAddDupInstvar.  The init line
	emitted further below still fires the inherited setter so the
	new class gets its own per-class value (Smalltalk class-side
	instVars are per-class storage, matching Python's
	``A.attr != B.attr`` semantics)."
	allClassInstVars := (classAttrs collect: [:p | p key]) asOrderedCollection.
	bases isEmpty ifTrue: [allClassInstVars add: #'__module__'].
	"Add ``_fields`` slot so NamedTuple-style subclasses can introspect
	their bare-annotation field layout in declaration order.  Skipped
	when the user already declared ``_fields`` themselves.  See the
	matching accessor/setter + init emit further below."
	((classAttrs anySatisfy: [:p | p value isNil])
		and: [(classAttrs anySatisfy: [:p | p key == #'_fields']) not])
			ifTrue: [allClassInstVars add: #'_fields'].
	aStream
		nextPutAll: name;
		nextPutAll: ' := [:___parent___ | ___parent___ @env0:subclass: #''';
		nextPutAll: (importlib @env0:___asSmalltalkClassName___: name) asString;
		nextPutAll: ''' instVarNames: '.
	"Filter instVar names against the parent's existing instVar
	list — Smalltalk rejects re-declaration with rtErrAddDupInstvar
	when a subclass walker rediscovers an instVar the parent already
	declared (e.g. ``self.templates`` defined in both Jinja2's
	TemplateNotFound and TemplatesNotFound)."
	aStream nextPut: $(.
	self printSymbolArray: ivarNames on: aStream.
	aStream nextPutAll:
' @env0:reject: [:___n___ | ___parent___ @env0:allInstVarNames @env0:includes: ___n___])'.
	aStream nextPutAll: ' classVars: #() classInstVars: '.
	"Filter out names already declared on the parent's metaclass —
	in the bases-empty case the parent is PythonInstance, whose
	metaclass still inherits Smalltalk Behavior slots like ``name``
	that a Python class body might re-declare as a class attribute
	(Jinja2's ``threading._Thread.name = 'MainThread'`` shape).
	Without the filter, Smalltalk raises rtErrAddDupInstvar."
	aStream nextPut: $(.
	self printSymbolArray: allClassInstVars on: aStream.
	aStream nextPutAll:
' @env0:reject: [:___n___ | ___parent___ @env0:class @env0:allInstVarNames @env0:includes: ___n___])'.
	aStream
		nextPutAll: ' poolDictionaries: #() inDictionary: nil options: #()] @env0:value: ('.
	self printSuperclassOn: aStream.
	aStream nextPutAll: ').'; lf.

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

	"Compile each @classmethod onto the metaclass.  ``self`` inside
	the body refers to the class (matches Python's ``cls``), so the
	source generated for class methods is identical in shape to the
	instance-method source — only the compile target differs."
	classMethodSources do: [:assoc |
		self
			emitCompileMethodOn: name
			source: assoc value
			category: 'Grail-Class Methods'
			env: 1
			classSide: true
			onStream: aStream.
	].

	"Compile class-side unary accessor + 1-arg setter for each class
	attribute (e.g. `class Color: RED = 1`), then evaluate each
	value expression inline and store via the setter.  The
	accessor/setter pair lets ``___pyAttrLoad___:`` treat the class
	attribute as a value when read through Python attribute syntax.

	When the parent's metaclass already declares this slot (subclass
	redeclaration like ``default_signer = TimestampSigner``), skip
	the compile — the accessor/setter inherit from the parent, and
	emitting fresh ones would just replace inherited methods with
	identical sources.  The runtime check uses ``<class> superclass
	class allInstVarNames`` because the class itself exists by this
	point (assigned in the block above)."
	classAttrs do: [:pair |
		| attrName lf accessorSrc setterSrc |
		attrName := pair key.
		lf := Character lf asString.
		accessorSrc := attrName , lf , '	^ ' , attrName.
		self
			emitCompileMethodOn: name
			source: accessorSrc
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := attrName , ': ___1' , lf , '	' , attrName , ' := ___1.'.
		self
			emitCompileMethodOn: name
			source: setterSrc
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
	].
	"Initialize each class attribute by evaluating the value
	expression in the surrounding module context and sending the
	setter to the class object."
	classAttrs do: [:pair |
		"pair value is nil for bare annotations (``x: int`` with no
		assignment) — skip the init emit; the slot stays nil until
		some later assignment fills it."
		pair value ifNotNil: [
			aStream nextPutAll: name; nextPutAll: ' '; nextPutAll: pair key; nextPutAll: ': '.
			pair value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: '.'; lf
		].
	].
	"Compile + init ``_fields`` accessor/setter for NamedTuple-style
	subclasses.  The slot was added to allClassInstVars above."
	((classAttrs anySatisfy: [:p | p value isNil])
		and: [(classAttrs anySatisfy: [:p | p key == #'_fields']) not])
			ifTrue: [
		| lf accessorSrc setterSrc bareNames |
		lf := Character lf asString.
		accessorSrc := '_fields' , lf , '	^ _fields'.
		self
			emitCompileMethodOn: name
			source: accessorSrc
			category: 'Grail-NamedTuple'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := '_fields: ___1' , lf , '	_fields := ___1.'.
		self
			emitCompileMethodOn: name
			source: setterSrc
			category: 'Grail-NamedTuple'
			env: 1
			classSide: true
			onStream: aStream.
		"Init the slot with a tuple of declaration-order names."
		bareNames := (classAttrs select: [:p | p value isNil])
			collect: [:p | p key].
		aStream
			nextPutAll: name;
			nextPutAll: ' _fields: (tuple @env0:withAll: #('.
		bareNames do: [:n |
			aStream space; nextPutAll: ''''; nextPutAll: n asString; nextPutAll: '''' ].
		aStream nextPutAll: ' )).'; lf.
	].
	"For class attrs the parent declares but we didn't redeclare,
	copy the parent's current value into our slot via the importlib
	helper (factored out to keep per-class generated-code size small).
	Smalltalk class-side instVars are per-class storage, so without
	this the subclass's inherited slot stays nil."
	bases isEmpty ifFalse: [
		"Use ``(Python at: #importlib)`` rather than the bare
		``importlib`` identifier — a user module that did
		``import importlib`` would shadow the latter with the
		Python-level facade."
		aStream
			nextPutAll: '(Python @env0:at: #importlib) @env0:___inheritClassAttrs___: ';
			nextPutAll: name;
			nextPutAll: ' exclude: '.
		self printSymbolArray: (classAttrs collect: [:p | p key]) on: aStream.
		aStream nextPutAll: '.'; lf
	].

	"Compile + initialize the synthetic ``__module__`` slot on the
	root of a Python class chain — subclasses inherit it (the slot
	itself wasn't redeclared above for them)."
	bases isEmpty ifTrue: [
		self
			emitCompileMethodOn: name
			source: '__module__
	^ __module__'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		self
			emitCompileMethodOn: name
			source: '__module__: ___1
	__module__ := ___1.'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
	].
	"Always point the new class at the defining module.  The setter
	is inherited when the first base is itself a Python user class
	(it brings the __module__ slot + setter along the metaclass
	chain); when the first base is a built-in (e.g. ``dict``,
	``int``) the setter isn't there, and we swallow the resulting
	MessageNotUnderstood quietly — losing __module__ on that class
	is a known Grail limitation but doesn't block import."
	aStream nextPutAll: '['; nextPutAll: name; nextPutAll: ' __module__: self] @env0:on: MessageNotUnderstood do: [:___ex___ | ___ex___ @env0:return: nil].'; lf.

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

	"Apply class decorators bottom-up.  Python's ``@A @B class C:``
	rebinds C to ``A(B(C))`` — the decorator closest to the class
	(B, last in source order) runs first, then its result is passed
	to the next one out (A).  Iterating decorator_list in REVERSE
	order yields that semantics: each iteration evaluates one
	decorator and re-assigns the result to the class name."
	decorator_list reverseDo: [:deco |
		aStream nextPutAll: name; nextPutAll: ' := '.
		deco printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' value: { '; nextPutAll: name; nextPutAll: ' } value: nil.'; lf.
	].
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
	category: ... environmentId: N.` statement.  Wrap the compile
	in a CompileWarning handler that resumes — module-body
	compilation does the same (see loadModuleFromPath:); without
	this, an upstream-shaped class body that ends up shadowing a
	method argument (e.g. `kwargs` rebinding from a varargs
	signature) aborts the whole module load.  matches the same
	rule the module-body compile already follows."

	aStream nextPutAll: '['.
	aStream nextPutAll: classVarName.
	classSideBool ifTrue: [aStream nextPutAll: ' @env0:class'].
	aStream nextPutAll: ' @env0:compileMethod: '.
	self printQuotedString: sourceString on: aStream.
	"Resolve ``importlib`` via the Python namespace lookup rather
	than a bare identifier — the bare ``importlib`` would be
	shadowed inside any module that has ``import importlib`` (the
	user's Python-level facade), which redirects the call to the
	Python module instance instead of the Smalltalk loader."
	aStream
		nextPutAll: ' dictionaries: (Python @env0:at: #importlib) @env0:___compilationSymbolList___ category: ''';
		nextPutAll: categoryString;
		nextPutAll: ''' environmentId: ';
		nextPutAll: envId printString;
		nextPutAll: '] @env0:on: CompileWarning do: [:___ex___ | ___ex___ @env0:resume].'; lf.
%

category: 'Grail-code generation'
method: ClassDefAst
emitInstantiationMethodFor: classVarName initSelector: initSelector onStream: aStream
	"Emit the class-side `value: positional value: keywords` method
	used as the entry point when Python code instantiates the class.

	str subclasses are special-cased: ``self new`` returns an empty
	byte object with no way for Grail to back-fill the string content
	from positional[0] without going through ``str.__new__(cls, v)``.
	For ``class Markup(str):`` we emit ``instance := self __new__:
	positional[0]`` (or an empty value when no arg is supplied),
	which routes through CharacterCollection >> __new__: — the env-1
	allocator that creates a self-typed string carrying the input
	content.  Markup's own (instance-side) ``__new__`` override is
	intentionally bypassed; the user-defined ``__html__`` detour
	does not fire here and is a known limitation worth revisiting
	once Python ``__new__`` becomes a first-class class method."

	| src lf |
	lf := Character lf asString.
	src := WriteStream on: Unicode7 new.
	src nextPutAll: 'value: positional value: keywords'; nextPutAll: lf.
	src nextPutAll: '| instance |'; nextPutAll: lf.
	self firstBaseIsStr
		ifTrue: [
			src
				nextPutAll: 'instance := self @env1:__new__: ((positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: ['''']).';
				nextPutAll: lf
		]
		ifFalse: [src nextPutAll: 'instance := self @env0:new.'; nextPutAll: lf].
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
	] ifNil: [
		"No __init__ defined locally — still dispatch to an inherited
		varargs ___init__:kw: if any ancestor provides one (e.g. typing.
		NamedTuple subclasses inherit field-binding init from the
		stub).  MessageNotUnderstood is swallowed so plain-old data
		classes without any __init__ in the hierarchy keep their
		zero-arg ``new`` semantics."
		src
			nextPutAll: '[instance perform: #''___init__:kw:'' env: 1 withArguments:';
			nextPutAll: ' (Array @env0:with: positional @env0:with: keywords)] @env0:on: MessageNotUnderstood do: [:___ex | nil].';
			nextPutAll: lf.
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

category: 'Grail-Class Compilation'
method: ClassDefAst
classBodyAttributes
	"Scan the class body for simple-assignment statements and return
	an OrderedCollection of (Symbol -> ExpressionAst) associations,
	one per declared name in source order.  A simple assignment is
	an AssignAst whose every target is a bare NameAst — chained
	assignments like `A = B = expr` yield two entries pointing at
	the same value AST.  Tuple, attribute, and subscript targets are
	skipped.  Used by codegen to materialize class-level attributes
	(e.g. ``class Color: RED = 1``) as Smalltalk classInstVars +
	class-side accessor/setter pairs on the new class."

	| pairs |
	pairs := OrderedCollection new.
	body body do: [:stmt |
		(stmt isKindOf: AssignAst) ifTrue: [
			(stmt targets allSatisfy: [:t | t isKindOf: NameAst]) ifTrue: [
				stmt targets do: [:t |
					pairs add: t id asSymbol -> stmt value.
				].
			].
		].
		"Class-level annotated assignment (`x: int = 5`) — strip
		the annotation, treat as a regular class attribute.  Bare
		annotations (`x: int` with no value) ALSO materialize a
		class-side slot (with a nil initializer); they're commonly
		used as forward-declared placeholders that get assigned
		from outside the class body later (Jinja2's
		``Environment.template_class = Template``)."
		((stmt isKindOf: AnnAssignAst)
			and: [stmt target isKindOf: NameAst]) ifTrue: [
			pairs add: stmt target id asSymbol -> stmt value
		].
	].
	^ pairs
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
declareInstanceVar: aSymbol
	"Sink for the `declareInstanceVar:` chain.  Called from inside
	this class's body whenever an `<receiver>.X = …` write where
	<receiver> is `self` or `cls` is discovered by walking the
	body.  Stops the upward propagation here — instance vars of
	a nested class belong to the nested class, not its parent."

	instanceVariables ifNil: [instanceVariables := IdentitySet new].
	instanceVariables add: aSymbol asSymbol
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceVarNamesFromInit
	"Return the inst-var name set discovered by walking the class
	body.  Triggers the walk lazily on first call.  Name kept for
	backward compatibility — the walk no longer stops at __init__,
	it covers every method body and every nested compound statement
	in the class.  Discovery itself flows through the
	`declareInstanceVar:` chain (see AttributeAst >> declareVariable
	and AbstractNode >> declareInstanceVar:)."

	instanceVariables ifNil: [
		instanceVariables := IdentitySet new.
		body body do: [:stmt | self walkForInstanceVars: stmt].
	].
	^ instanceVariables asArray
%

category: 'Grail-Class Compilation'
method: ClassDefAst
walkForInstanceVars: aNode
	"Recursively trigger `declareVariable` on every assignment
	target inside aNode, so AttributeAst's chain can surface
	self.X / cls.X writes via `declareInstanceVar:`.  Recurses
	into compound statements (If/While/For/Try/With) and method
	bodies, but NOT into nested class defs — those collect their
	own instance vars."

	aNode ifNil: [^ self].
	(aNode isKindOf: ClassDefAst) ifTrue: [^ self].
	(aNode isKindOf: AssignAst) ifTrue: [
		aNode targets do: [:t | t declareVariable].
		^ self
	].
	(aNode isKindOf: AnnAssignAst) ifTrue: [
		aNode target declareVariable.
		^ self
	].
	(aNode isKindOf: AugAssignAst) ifTrue: [
		aNode target declareVariable.
		^ self
	].
	"Compound statements: recurse into substatement collections by
	walking every instVar that holds an AbstractNode or an Array
	of AbstractNodes.  Catches IfAst/WhileAst/ForAst/TryAst/WithAst
	branches plus FunctionDefAst bodies without enumerating every
	concrete subclass."
	2 to: aNode class allInstVarNames size do: [:i |
		| val |
		val := aNode instVarAt: i.
		(val isKindOf: AbstractNode) ifTrue: [
			self walkForInstanceVars: val
		] ifFalse: [
			(val isKindOf: Array) ifTrue: [
				val do: [:each |
					(each isKindOf: AbstractNode) ifTrue: [
						self walkForInstanceVars: each
					]
				]
			] ifFalse: [
				(val isKindOf: BlockAst) ifTrue: [
					val body do: [:sub | self walkForInstanceVars: sub]
				]
			]
		]
	]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceMethodDefs
	"Return all InstanceFunctionDefAst nodes from the class body."

	^ body body select: [:stmt | stmt isKindOf: InstanceFunctionDefAst]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
classMethodDefs
	"Return all ClassFunctionDefAst nodes from the class body.
	These are ``@classmethod``-decorated functions that the parser
	re-classed at parse time (see PythonParser >>
	parseFunctionDefWithDecorators:)."

	^ body body select: [:stmt | stmt isKindOf: ClassFunctionDefAst]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
firstBaseIsStr
	"True when this class is a direct ``str`` subclass — used to gate
	the str-specific value:value: instantiation path that creates a
	self-typed string carrying the first positional argument.  Static
	check on the bases list; Grail can't resolve transitive ancestry
	at codegen time."

	bases isEmpty ifTrue: [^ false].
	^ (bases first isKindOf: NameAst)
		and: [bases first id asSymbol = #'str']
%

category: 'Grail-Class Compilation'
method: ClassDefAst
selfParameterName
	"Return the self parameter name from __init__ (or the first
	non-__new__ instance method).  Conventionally `self`, but
	classes that override only __new__ would otherwise pick up
	`cls` here and turn every `self` reference in their other
	methods into a UnboundLocal access."

	| initMethod fallback paramNames |
	"Prefer __init__ explicitly when present."
	initMethod := body body detect: [:stmt |
		(stmt isKindOf: InstanceFunctionDefAst)
			and: [stmt name asString = '__init__']
	] ifNone: [nil].
	initMethod ifNotNil: [
		paramNames := initMethod allParameterNames.
		paramNames isEmpty ifFalse: [^ paramNames first asSymbol]
	].
	"No __init__: fall back to the first instance method whose first
	parameter is `self`, ignoring __new__ (whose first parameter is
	`cls` by convention)."
	fallback := body body detect: [:stmt |
		(stmt isKindOf: InstanceFunctionDefAst)
			and: [stmt name asString ~= '__new__']
	] ifNone: [nil].
	fallback ifNotNil: [
		paramNames := fallback allParameterNames.
		paramNames isEmpty ifFalse: [^ paramNames first asSymbol]
	].
	^ #self
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
