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

	| methodDefs classMethodDefs staticMethodDefs selfParam
	  funcNames varargsFuncNames
	  methodSources classMethodSources staticMethodSources
	  initMethod initSelector classAttrs allClassInstVars
	  savedClass savedFuncNames savedVarargsFuncNames
	  savedSelfParam savedClassAttrNames settersByName |
	methodDefs := self instanceMethodDefs.
	classMethodDefs := self classMethodDefs.
	staticMethodDefs := self staticMethodDefs.
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
	etc.).  Save outer values so a class nested in another class
	restores correctly."
	savedClass := CallAst classBeingCompiled.
	savedFuncNames := CallAst classFunctionNames.
	savedVarargsFuncNames := CallAst classVarargsFunctionNames.
	savedClassAttrNames := CallAst classAttrNames.
	savedSelfParam := CallAst selfParameterName.

	"classBeingCompiled is only used as a non-nil marker here; the
	actual class doesn't exist until the emitted code runs."
	CallAst classBeingCompiled: name asSymbol.
	CallAst classFunctionNames: funcNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	CallAst classAttrNames: (IdentitySet withAll: (classAttrs collect: [:p | p key])).
	CallAst selfParameterName: selfParam.

	methodSources := OrderedCollection new.
	classMethodSources := OrderedCollection new.
	staticMethodSources := OrderedCollection new.
	[
		methodDefs do: [:def |
			| s |
			s := PrettyWriteStream on: Unicode7 new.
			def generateMethodSourceOn: s.
			methodSources add: def name asString -> s contents.
		].
		"@classmethod bodies use the same per-method source generator
		(both strip the first positional — ``self`` or ``cls`` — and
		the Smalltalk receiver IS the class for class-side methods, so
		``cls`` becomes the implicit ``self``).  Compile target is
		class-side; see the classSide: true emit further below."
		classMethodDefs isEmpty ifFalse: [
			classMethodDefs do: [:def |
				| s savedSelfForCM |
				"For each classmethod, switch ``selfParameterName'' to its
				own first argument (typically ``cls'') so NameAst maps
				body references like ``cls(...)'' and ``cls.X'' to
				Smalltalk ``self'' (which on a class-side method IS the
				class)."
				savedSelfForCM := CallAst selfParameterName.
				CallAst selfParameterName: (def allParameterNames isEmpty
					ifTrue: [#cls asSymbol]
					ifFalse: [def allParameterNames first asSymbol]).
				[
					s := PrettyWriteStream on: Unicode7 new.
					def generateMethodSourceOn: s.
					classMethodSources add: def name asString -> s contents.
				] ensure: [
					CallAst selfParameterName: savedSelfForCM.
				].
			]
		].
		"@staticmethod bodies have no implicit ``self``/``cls`` —
		first arg is a regular parameter.  Use the module-method
		source generator (no first-param strip).  Clear
		selfParameterName so the body's bare-name resolution still
		finds module-scope names (class-level dispatch context stays
		intact for ``ClassName.X'' references)."
		staticMethodDefs isEmpty ifFalse: [
			| savedSelfForSM |
			savedSelfForSM := CallAst selfParameterName.
			CallAst selfParameterName: nil.
			[
				staticMethodDefs do: [:def |
					| s |
					s := PrettyWriteStream on: Unicode7 new.
					def generateModuleMethodSourceOn: s.
					staticMethodSources add: def name asString -> s contents.
				]
			] ensure: [
				CallAst selfParameterName: savedSelfForSM.
			].
		].
	] ensure: [
		CallAst classBeingCompiled: savedClass.
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
	"Always request a ``__module__'' slot — unless the user already
	declared one in the class body (e.g. re._constants's
	``class PatternError(Exception): __module__ = 're''').
	``___subclass___:'' filters names the parent metaclass already
	declares, so this is a no-op for subclasses of a Python user class
	(they inherit the slot) and creates a fresh slot for subclasses of
	a built-in (whose metaclass doesn't have one).  Pairing this with
	an unconditional accessor + setter emit below means ``Foo
	__module__: self'' always resolves — no MessageNotUnderstood
	handler needed at the call site."
	(allClassInstVars includes: #'__module__') ifFalse: [
		allClassInstVars add: #'__module__'].
	"Always request a ``dynInstVars'' slot to hold the per-class
	dynamic-attribute dict (an Object whose dynamicInstVars provide
	the storage).  Each class gets its own slot — see
	[[class-side-dynamic-attrs]].  GemStone classes don't support
	dynamicInstVarAt:put: directly; this Object new sits in the
	classInstVar and gives us the same dictionary semantics for
	class-level Python attribute stores."
	(allClassInstVars includes: #'dynInstVars') ifFalse: [
		allClassInstVars add: #'dynInstVars'].
	"Add ``_fields`` slot so NamedTuple-style subclasses can introspect
	their bare-annotation field layout in declaration order.  Skipped
	when the user already declared ``_fields`` themselves.  See the
	matching accessor/setter + init emit further below."
	((classAttrs anySatisfy: [:p | p value isNil])
		and: [(classAttrs anySatisfy: [:p | p key == #'_fields']) not])
			ifTrue: [allClassInstVars add: #'_fields'].
	"Emit a single send to the ``___subclass___:...'' helper on Class.
	The helper filters the instVar and classInstVar name arrays
	against the parent's hierarchy before calling subclass:..., so the
	codegen here doesn't need to inline the block / temps / reject:
	expressions any more.  See Class >> ___subclass___:instVarNames:
	classInstVarNames: for the full filtering rationale (Python single
	instance __dict__ vs. Smalltalk per-class instVar slots).

	Wrap the parent expression in parentheses: when the parent is a
	keyword send like ``Typing @env1:___pyAttrLoad___: #'NamedTuple'''
	the unparenthesized form would merge the keywords with ours into
	one big selector (``___pyAttrLoad___:___subclass___:...'')."
	"Phase A: when this class def lands at module scope, the Python
	name has no static instVar to hold the class object — wrap the
	entire emit in a block that declares ``<name>'' as a Smalltalk
	temp, performs all class setup against that temp, and at the end
	stores the (possibly decorator-wrapped) class into the module
	instance via dynamicInstVarAt:put:.  For non-module-scope class
	defs (nested inside a function or another class) the existing
	bare-assignment emit works because the parser declares the
	enclosing scope's variable."
	(self isModuleScopeClassDef) ifTrue: [
		aStream nextPutAll: '[| '; nextPutAll: name; nextPutAll: ' | '.
	].
	"Phase B: instance attributes live in dynamic-instVar storage on
	each instance (created on first write via ``dynamicInstVarAt:put:'').
	Instance instVarNames is therefore empty — no pre-declaration
	needed.  Class attributes (``class C: X = 1'') still allocate
	classInstVar slots because GemStone prohibits dynamic instVars on
	Behavior / Class receivers (error 2484); accessor/setter pairs
	keep the read/write path working for class-side attrs."
	aStream nextPutAll: name; nextPutAll: ' := ('.
	self printSuperclassOn: aStream.
	aStream
		nextPutAll: ') ___subclass___: #''';
		nextPutAll: (importlib @env0:___asSmalltalkClassName___: name) asString;
		nextPutAll: ''' instVarNames: #() classInstVarNames: '.
	self printSymbolArray: allClassInstVars on: aStream.
	aStream nextPutAll: '.'; lf.

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

	"Compile each @staticmethod onto the metaclass.  Body has no
	implicit ``self`` — generateModuleMethodSourceOn: (module form, no
	first-param strip) is what was used to build the source."
	staticMethodSources do: [:assoc |
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
	"Class attributes (``class C: X = 1'') still need accessor/setter
	pairs on the metaclass because GemStone prohibits dynamic instVars
	on Behavior/Class receivers.  Each pair lets ``___pyAttrLoad___:''
	distinguish a value-attribute (paired getter+setter) from a
	regular method (which would be wrapped as a BoundMethod)."
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
	"Re-push the class compile context around the class-attribute
	value emit so NameAst can resolve in-body references like
	``def get_data(...); data = property(get_data)'' or
	``def first(); pair = (first,)'' to a BoundMethod whose receiver
	will be supplied as positional[1] at call time.  Without this
	push, ``first'' falls through to module-scope lookup and raises
	NameError at class-init time."
	CallAst classBeingCompiled: name asSymbol.
	CallAst classFunctionNames: funcNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	CallAst classAttrNames: (IdentitySet withAll: (classAttrs collect: [:p | p key])).
	CallAst selfParameterName: selfParam.
	CallAst inClassBodyValueEmit: true.
	[
		classAttrs do: [:pair |
			"pair value is nil for bare annotations (``x: int'' with no
			assignment) — skip the init emit; the slot stays nil until
			some later assignment fills it."
			pair value ifNotNil: [
				aStream nextPutAll: name; nextPutAll: ' '; nextPutAll: pair key; nextPutAll: ': '.
				pair value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '.'; lf
			].
		].
	] ensure: [
		CallAst classBeingCompiled: savedClass.
		CallAst classFunctionNames: savedFuncNames.
		CallAst classVarargsFunctionNames: savedVarargsFuncNames.
		CallAst classAttrNames: savedClassAttrNames.
		CallAst selfParameterName: savedSelfParam.
		CallAst inClassBodyValueEmit: false.
	].
	"NamedTuple-style classes get a ``_fields'' accessor/setter pair
	on the metaclass, initialised to a tuple of declaration-order
	bare-annotation names.  The slot was added to allClassInstVars
	above (filtered by ___subclass___: if a parent already declared
	it)."
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
		bareNames := (classAttrs select: [:p | p value isNil])
			collect: [:p | p key].
		aStream
			nextPutAll: name;
			nextPutAll: ' _fields: (tuple @env0:withAll: #('.
		bareNames do: [:n |
			aStream space; nextPutAll: ''''; nextPutAll: n asString; nextPutAll: '''' ].
		aStream nextPutAll: ' )).'; lf.
	].
	"Inherit parent class-attr values into our slot.  Smalltalk
	class-side instVars are per-class storage; without this the
	subclass's inherited slot stays nil."
	bases isEmpty ifFalse: [
		aStream
			nextPutAll: '(Python @env0:at: #importlib) @env0:___inheritClassAttrs___: ';
			nextPutAll: name;
			nextPutAll: ' exclude: '.
		self printSymbolArray: (classAttrs collect: [:p | p key]) on: aStream.
		aStream nextPutAll: '.'; lf
	].

	"Compile the synthetic ``__module__'' accessor + setter on every
	class (unless the user already declared ``__module__'' in the
	class body — re._constants's PatternError sets ``__module__ =
	're''').  The slot itself is added to allClassInstVars via the
	unconditional ``add: #'__module__''' above."
	(classAttrs anySatisfy: [:p | p key == #'__module__']) ifFalse: [
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
		aStream nextPutAll: name; nextPutAll: ' __module__: self.'; lf.
	].

	"Compile the ``dynInstVars'' accessor + setter pair on every class.
	The slot holds an Object new whose dynamic instVars serve as the
	per-class dictionary for dynamically-set Python attributes
	(``C.brand_new = 42'').  See [[class-side-dynamic-attrs]] —
	GemStone classes don't support ``dynamicInstVarAt:put:'' directly,
	so this Object proxy gives us the same dict semantics."
	self
		emitCompileMethodOn: name
		source: 'dynInstVars
	^ dynInstVars'
		category: 'Grail-Class Attrs'
		env: 1
		classSide: true
		onStream: aStream.
	self
		emitCompileMethodOn: name
		source: 'dynInstVars: ___1
	dynInstVars := ___1.'
		category: 'Grail-Class Attrs'
		env: 1
		classSide: true
		onStream: aStream.
	aStream nextPutAll: name; nextPutAll: ' dynInstVars: (Object @env0:new).'; lf.

	"For each @property method, compile a 1-arg setter that signals
	AttributeError.  Pairing the @property getter with a setter makes
	it look like an instVar to ``___pyAttrLoad___:`` so attribute
	reads INVOKE the property method (returning its value) instead of
	being wrapped in a BoundMethod.  Python @property without an
	explicit @setter is read-only; signalling AttributeError on
	assignment matches that.

	Skip the stub when ``@<name>.setter'' supplied an explicit setter
	method def — the explicit setter compiles to the same ``name:''
	selector and the stub would overwrite it.  Detect @x.setter by
	an AttributeAst decorator whose attr is 'setter' and whose value
	is a NameAst matching the property name."

	settersByName := IdentitySet new.
	methodDefs do: [:def |
		def decoratorList isNil ifFalse: [
			def decoratorList do: [:deco |
				((deco isKindOf: AttributeAst)
					and: [deco attr asString = 'setter'
					and: [deco value isKindOf: NameAst]])
					ifTrue: [settersByName add: deco value id asSymbol]
			]
		]
	].
	methodDefs do: [:def |
		((def decoratorList notNil
			and: [def decoratorList includes: #'property'])
			and: [(settersByName includes: def name asSymbol) not]) ifTrue: [
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
		ifNotNil: [initMethod instanceMethodSelector]
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
	"Phase A: close the wrapping block (opened at the top of this
	method) and store the final class object into the module
	instance's dynamic-instVar storage."
	(self isModuleScopeClassDef) ifTrue: [
		aStream
			nextPutAll: 'self @env0:dynamicInstVarAt: #''';
			nextPutAll: name;
			nextPutAll: ''' put: '; nextPutAll: name;
			nextPutAll: '.] value.'; lf.
	].
%

category: 'Grail-code generation'
method: ClassDefAst
isModuleScopeClassDef
	"Phase A: true when this class definition lands directly at module
	scope (top-level of the module body, not nested inside another
	class body or a function/method).  Used to decide whether to wrap
	the emit in a block-with-temp + dynamicInstVarAt:put: epilogue
	(module-scope) or leave the existing bare-assignment emit
	in place (nested — declares ``<name>'' in the enclosing scope's
	Smalltalk temps via parser declareWrite)."

	| node |
	CallAst moduleClassBeingCompiled ifNil: [^ false].
	CallAst classBeingCompiled ifNotNil: [^ false].
	"Walk up to see if any enclosing scope is a function/lambda — if
	so we're nested and the function's BlockAst declares <name> as a
	Smalltalk temp."
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [^ false].
		node := node parent.
	].
	^ true
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
	"Emit a `<class> [class] ___compileMethod: '...' category: '...'.`
	statement that calls the Class >> ___compileMethod:category:
	helper.  The helper compiles env-1, uses the Grail symbol list,
	and wraps in a CompileWarning handler that resumes — the same
	machinery the module-body compile uses (an upstream-shaped class
	body that shadows a method argument would otherwise abort the
	whole module load).  ``envId'' is currently unused — the helper
	hardcodes env-1, which matches every emit site here today; if a
	non-env-1 compile target ever appears, lift the env into the
	helper's signature."

	aStream nextPutAll: classVarName.
	classSideBool ifTrue: [aStream nextPutAll: ' @env0:class'].
	aStream nextPutAll: ' ___compileMethod: '.
	self printQuotedString: sourceString on: aStream.
	aStream
		nextPutAll: ' category: ''';
		nextPutAll: categoryString;
		nextPutAll: '''.'; lf.
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
	src nextPutAll: '| instance dynInit |'; nextPutAll: lf.
	self firstBaseIsStr
		ifTrue: [
			src
				nextPutAll: 'instance := self @env1:__new__: ((positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: ['''']).';
				nextPutAll: lf
		]
		ifFalse: [self firstBaseIsTuple
			ifTrue: [
				"Tuple subclasses — route a single-positional construction
				through tuple's ``__new__:`` so the iterable populates the
				instance (matches CPython's ``tuple(iterable)`` semantics).
				Used by jinja2's ``OptionalLStrip`` factory which builds a
				marker tuple from an iterable.  Empty positional yields
				the empty-tuple fast path."
				src
					nextPutAll: 'instance := positional @env0:size @env0:= 0 ifTrue: [self @env0:new] ifFalse: [self @env1:__new__: (positional @env0:at: 1)].';
					nextPutAll: lf
			]
			ifFalse: [src nextPutAll: 'instance := self @env0:new.'; nextPutAll: lf]].
	"Descriptor-bound __init__ override: a setattr-installed
	``cls.__init__ = synth_fn'' lands in the class''s dynInstVars
	store.  Probe for it BEFORE the static dispatch so dataclass-
	style synthesis (or any runtime mutation of __init__) takes
	effect.  When found, prepend the instance to positional args and
	forward via ___pyCallValue___ — matches CPython''s descriptor
	read.  When absent (the common case), fall through to the
	statically-compiled dispatch below."
	src
		nextPutAll: 'dynInit := self @env1:___dynamicClassAttr___: #''__init__''.';
		nextPutAll: lf;
		nextPutAll: 'dynInit @env0:== nil ifFalse: [';
		nextPutAll: 'dynInit @env1:___pyCallValue___: ({ instance } @env0:, positional) kw: keywords.';
		nextPutAll: '^ instance].';
		nextPutAll: lf.
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
staticMethodDefs
	"Return all StaticFunctionDefAst nodes from the class body.
	@staticmethod-decorated functions take no implicit first arg
	(no ``self`` or ``cls``); they're compiled onto the metaclass
	exactly as written so a Python ``Cls.X(args)`` send dispatches
	to a class-side Smalltalk method with the same arity."

	^ body body select: [:stmt | stmt isKindOf: StaticFunctionDefAst]
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
firstBaseIsTuple
	"True when this class is a direct ``tuple`` subclass.  Gates the
	tuple-specific value:value: path that routes single-positional
	construction through tuple's ``__new__: iterable`` so the
	instance carries the iterable's elements (the Smalltalk
	allocator returns an empty 0-size Array otherwise)."

	bases isEmpty ifTrue: [^ false].
	^ (bases first isKindOf: NameAst)
		and: [bases first id asSymbol = #'tuple']
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
