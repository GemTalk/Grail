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
	  initMethod initSelector classAttrs allClassInstVars staticFuncNames savedStaticFuncNames savedIsModuleScope
	  savedClass savedFuncNames savedVarargsFuncNames
	  savedSelfParam savedClassAttrNames settersByName
	  slotNamesOrdered slotNameSet savedSlotNames mangledSlotNames
	  savedInBodyEmit savedBoundNames savedNestedNames
	  savedCapturedNames |
	methodDefs := self instanceMethodDefs.
	classMethodDefs := self classMethodDefs.
	staticMethodDefs := self staticMethodDefs.
	selfParam := self selfParameterName.
	funcNames := IdentitySet new.
	staticFuncNames := IdentitySet new.
	staticMethodDefs do: [:def | staticFuncNames add: def name asSymbol].
	varargsFuncNames := IdentitySet new.
	methodDefs do: [:def |
		"Normalise ``@bigmemtest''-family test methods up front (inject a
		dry-run ``size'' default) so the compilesAsVarargs classification
		just below — and the later source generation — both see the def in
		its adjusted, varargs form.  No-op for every other method."
		def applyBigmemtestDefaultIfNeeded.
		funcNames add: def name asSymbol.
		"A def that compiles to the varargs ``_name:kw:`` form (complex
		signature, or __init__ which is forced to varargs so it can bind
		keyword args) is marked so classSelfSendSelector dispatches via
		the varargs selector rather than a fixed-arity send into thin air."
		def compilesAsVarargs ifTrue: [
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

	"Python ``__slots__'' → GemStone named instance variables on the
	backing class.  ``slotNamesOrdered'' is the declaration-order slot
	list; ``slotNameSet'' is the identity set the per-method codegen
	consults to emit direct slot access (see CallAst classSlotNames).
	The instVars themselves are NAME-MANGLED (``x'' → ``___slot_x___'')
	so they never collide with a Python method parameter / local of the
	same name: Grail emits such locals as Smalltalk method temps, and a
	temp that shadows an instVar is a GemStone CompileError — which would
	otherwise break the ubiquitous ``def __init__(self, x): self.x = x''."
	slotNamesOrdered := self slotNames.
	slotNameSet := IdentitySet withAll: slotNamesOrdered.
	mangledSlotNames := slotNamesOrdered collect: [:n | '___slot_' , n asString , '___'].

	"Push the class-compile context that the per-method codegen reads
	(CallAst consults these to decide how to dispatch self-sends,
	etc.).  Save outer values so a class nested in another class
	restores correctly."
	savedClass := CallAst classBeingCompiled.
	savedFuncNames := CallAst classFunctionNames.
	savedVarargsFuncNames := CallAst classVarargsFunctionNames.
	savedClassAttrNames := CallAst classAttrNames.
	savedSelfParam := CallAst selfParameterName.
	savedSlotNames := CallAst classSlotNames.

	"Capture module-scope-ness NOW, BEFORE classBeingCompiled is set to
	this class below: isModuleScopeClassDef returns false when
	classBeingCompiled is non-nil (its ``nested inside another class''
	test), so reading it after the set would report EVERY class as
	non-module-scope and route every super() through the method-local
	closure-cell path."
	savedIsModuleScope := CallAst classDefIsModuleScope.
	CallAst classDefIsModuleScope: self isModuleScopeClassDef.

	"classBeingCompiled is only used as a non-nil marker here; the
	actual class doesn't exist until the emitted code runs."
	CallAst classBeingCompiled: name asSymbol.
	CallAst classFunctionNames: funcNames.
	savedStaticFuncNames := CallAst classStaticFunctionNames.
	CallAst classStaticFunctionNames: staticFuncNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	CallAst classAttrNames: (IdentitySet withAll: (classAttrs collect: [:p | p key])).
	CallAst selfParameterName: selfParam.
	CallAst classSlotNames: slotNameSet.

	savedCapturedNames := CallAst classCapturedNames.
	CallAst classCapturedNames: IdentitySet new.
	methodSources := OrderedCollection new.
	classMethodSources := OrderedCollection new.
	staticMethodSources := OrderedCollection new.
	[
		methodDefs do: [:def |
			| s savedSelfForIM |
			"Per-def receiver name: each method's FIRST parameter is its
			receiver (Python binds it to the instance regardless of what
			it is called), so switch selfParameterName per def -- the
			class-wide value (from __init__/`self` methods) mis-binds a
			``def __new__(cls, ...)`` body, leaving ``cls`` an
			UnboundLocal.  Mirrors the @classmethod loop below.  A def
			with no plain params (only *args/**kwargs) keeps the
			class-wide name."
			savedSelfForIM := CallAst selfParameterName.
			CallAst selfParameterName: (def allParameterNames isEmpty
				ifTrue: [savedSelfForIM]
				ifFalse: [def allParameterNames first asSymbol]).
			[
				"A ``@requires_resource(res)''-decorated test method skips
				itself in a default CPython run (the resource is not enabled
				without regrtest ``-u''); Grail has no ``-u'' and drops method
				decorators, so emit a self.skipTest(...) body in place of the
				real one -- the method stays discoverable under its plain
				selector but is counted as skipped, matching CPython."
				def isRequiresResourceDecorated
					ifTrue: [
						methodSources add: def name asString
							-> def generateResourceSkipSource]
					ifFalse: [
						s := PrettyWriteStream on: Unicode7 new.
						def generateMethodSourceOn: s.
						methodSources add: def name asString -> s contents.
						"Keyword-call companion for a simple-positional instance
						method: a varargs ``_name:kw:'' forwarder so ``obj.m(a,
						kw=v)'' binds by name rather than DNU-ing (django calls
						view/handler methods with keyword arguments)."
						def needsVarargsForwarder ifTrue: [
							methodSources add: ('_' , def name asString)
								-> def generateInstanceVarargsForwarderSource].
						"A ``@bigmemtest''-family method was normalised to the
						varargs form (a dry-run ``size'' default injected above),
						which hides it from dir()-based test discovery.  Emit a
						plain unary forwarder so getTestCaseNames finds it."
						def isBigmemtestDecorated ifTrue: [
							methodSources add: ('bigmem_' , def name asString)
								-> def generateBigmemtestUnaryForwarderSource]].
			] ensure: [CallAst selfParameterName: savedSelfForIM].
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
		CallAst classStaticFunctionNames: savedStaticFuncNames.
		CallAst classDefIsModuleScope: savedIsModuleScope.
		CallAst classVarargsFunctionNames: savedVarargsFuncNames.
		CallAst classAttrNames: savedClassAttrNames.
		CallAst selfParameterName: savedSelfParam.
		CallAst classSlotNames: savedSlotNames.
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
	"Add ``___annotatedFields___`` slot holding EVERY annotated field
	name in declaration order — bare ``x: int'' AND ``x: int = default''.
	``_fields'' above carries only the BARE annotations (annotated-with-
	value lines route to class-attribute storage), so it can't drive
	dataclass __init__ for defaulted fields.  dataclasses._collect_fields
	consults this slot to recover the full field layout + each default.
	Skipped when the user already declared the name."
	((self isDataclassDecorated)
		and: [self dataclassAnnotatedNames notEmpty
		and: [(classAttrs anySatisfy: [:p | p key == #'___annotatedFields___']) not]])
			ifTrue: [allClassInstVars add: #'___annotatedFields___'].
	"Add an ``__annotations__`` slot for ANY class carrying class-body
	annotations (``x: int'' / ``x: int = default''), not just dataclasses
	— CPython gives every such class a ``Cls.__annotations__''.  Holds a
	PEP 563 source-string dict (never evaluated; see FunctionDefAst).
	Skipped when the user declared ``__annotations__'' explicitly."
	((self classAnnotationPairs notEmpty)
		and: [(classAttrs anySatisfy: [:p | p key == #'__annotations__']) not])
			ifTrue: [allClassInstVars add: #'__annotations__'].
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
		"Canonical-class fast path (docs/Persistent_Modules_and_Classes.md):
		probe the committed registry first -- a hit binds the final
		(post-decorator) object with ZERO compiles, so a warm import never
		touches the committed class.  The probe returns nil unless the
		feature flag is on AND this session verified the module's source
		hash, so with the flag off the guard body always runs and the emit
		is behaviour-neutral.  Living INSIDE the (possibly conditional)
		statement position keeps ``if cond: class C`` semantics: the probe
		only fires when the definition would have executed."
		aStream
			lf;
			nextPutAll: name;
			nextPutAll: ' := importlib @env0:___canonicalClassProbe___: '.
		self printQuotedString: self ___enclosingModuleName___ on: aStream.
		aStream nextPutAll: ' name: '.
		self printQuotedString: name asString on: aStream.
		aStream nextPutAll: '.'; lf;
			nextPutAll: name; nextPutAll: ' == nil ifTrue: ['; lf.
	].
	"Phase B: instance attributes live in dynamic-instVar storage on
	each instance (created on first write via ``dynamicInstVarAt:put:'').
	Instance instVarNames is therefore empty — no pre-declaration
	needed.  Class attributes (``class C: X = 1'') still allocate
	classInstVar slots because GemStone prohibits dynamic instVars on
	Behavior / Class receivers (error 2484); accessor/setter pairs
	keep the read/write path working for class-side attrs."
	aStream nextPutAll: name; nextPutAll: ' := ('.
	"Phase-1 canonical classes: a module-scope class definition mints
	through importlib ___canonicalSubclassOf: so a stale-source rebuild can
	reuse the committed class's IDENTITY (recompiling its methods in place;
	see docs/Persistent_Modules_and_Classes.md).  The helper falls back to
	___subclass___ when its feature flag is off, so this is behaviour-neutral
	by default.  Nested / method-local classes keep the direct ___subclass___
	path (minted fresh per execution, matching CPython)."
	self isModuleScopeClassDef ifTrue: [
		aStream nextPutAll: 'importlib @env0:___canonicalSubclassOf: ('].
	"The BASES expression evaluates INLINE in the enclosing scope at
	classdef time -- a sibling method-local class (``class BaseEnum:
	... class MainEnum(BaseEnum):`` in a setUp) is a plain Smalltalk
	temp there.  classBeingCompiled is already pushed, so NameAst's
	closure-cell branch would otherwise hijack the base name into a
	___classCell___ read that was never stored (539 test_enum setUp
	errors, incl. ``class enum_type(date, Enum)`` on ``date``).  The
	DEDICATED inBasesEmit flag suppresses ONLY that branch -- flipping
	inClassBodyValueEmit here instead broke twilio (module-level base
	names took the class-body value branches)."
	[ | savedBasesFlag |
	savedBasesFlag := CallAst inBasesEmit.
	CallAst inBasesEmit: true.
	[self printSuperclassOn: aStream]
		ensure: [CallAst inBasesEmit: (savedBasesFlag == true)]] value.
	"``___subclass___:'' is an env-1 method on Class (see Class.gs).
	The bare send used to work for built-in classes whose metaclass
	chain reached Class via env-0 dispatch, but Grail-built parents
	(e.g. ``click.UsageError'') have a metaclass chain that requires
	env-1 dispatch to find the inherited method."
	self isModuleScopeClassDef
		ifTrue: [
			"The parent expression just emitted becomes the first argument to
			___canonicalSubclassOf:; the Python dotted module name keys the
			registry (same key the probe and register epilogue use)."
			aStream
				nextPutAll: ') name: #''';
				nextPutAll: (importlib ___asSmalltalkClassName___: name) asString;
				nextPutAll: ''' module: '.
			self printQuotedString: self ___enclosingModuleName___ on: aStream.
			aStream nextPutAll: ' instVarNames: ']
		ifFalse: [
			aStream
				nextPutAll: ') @env1:___subclass___: #''';
				nextPutAll: (importlib ___asSmalltalkClassName___: name) asString;
				nextPutAll: ''' instVarNames: '].
	"Python ``__slots__'' names become real GemStone named instance
	variables (name-mangled — see above).  ___subclass___: filters any the
	parent already declares, so an inherited / re-declared slot reuses the
	parent's slot rather than duplicating it (matches Python inheritance)."
	self printSymbolArray: mangledSlotNames on: aStream.
	aStream nextPutAll: ' classInstVarNames: '.
	self printSymbolArray: allClassInstVars on: aStream.
	self isModuleScopeClassDef ifTrue: [aStream nextPutAll: ')'].
	aStream nextPutAll: '.'; lf.

	"Every class that declares __slots__ (in any form, even ``()'') gets an
	instance-side ``___pyHasSlots___'' marker.  The runtime attribute probes
	gate on it — by selector, so it works from any receiver including
	subclasses of built-ins (Exception, dict, ...) that are NOT
	PythonInstances, and is inherited so a subclass of a slotted class is
	covered too."
	(self slotsValueAst notNil) ifTrue: [
		self
			emitCompileMethodOn: name
			source: '___pyHasSlots___
	^ true'
			category: 'Grail-Slots'
			env: 1
			classSide: false
			onStream: aStream.
	].

	"Strict __slots__: when the class declares __slots__ as a recognized
	literal without a ``__dict__'' member, instances forbid any non-slot
	attribute and have no __dict__ (CPython semantics).  Emit an
	instance-side marker the runtime store / __dict__ paths consult via
	``self class whichClassIncludesSelector:'' (self is the instance there);
	subclasses inherit it so strictness propagates down a slotted chain."
	self slotsDeclaredStrict ifTrue: [
		self
			emitCompileMethodOn: name
			source: '___pySlotsStrict___
	^ true'
			category: 'Grail-Slots'
			env: 1
			classSide: false
			onStream: aStream.
	].

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
	savedStaticFuncNames := CallAst classStaticFunctionNames.
	CallAst classStaticFunctionNames: staticFuncNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	CallAst classAttrNames: ((IdentitySet withAll: (classAttrs collect: [:p | p key]))
		addAll: ((body body select: [:stmt | stmt isKindOf: ClassDefAst])
			collect: [:c | c name asSymbol]);
		yourself).
	CallAst selfParameterName: selfParam.
	CallAst classSlotNames: slotNameSet.
	savedInBodyEmit := CallAst inClassBodyValueEmit.
	savedBoundNames := CallAst classBodyBoundNames.
	savedNestedNames := CallAst classNestedClassNames.
	CallAst classNestedClassNames: (IdentitySet withAll:
		((body body select: [:stmt | stmt isKindOf: ClassDefAst])
			collect: [:c | c name asSymbol])).
	CallAst inClassBodyValueEmit: true.
	"NESTED CLASSES (``class Outer: class A: ...``) -- previously
	dropped entirely.  Emit each nested classdef inside a bracketed
	block (its class variable is block-local, not a module temp) and
	store the built class as a class attribute on the outer class via
	the per-class dynamic store, BEFORE the attr values emit so a later
	``a = A()'' in the outer body can read it (test_functools'
	TestPartialMethod.A).  The nested emit saves/restores the CallAst
	compile context itself."
	((body body anySatisfy: [:stmt | stmt isKindOf: ClassDefAst])
		or: [body body anySatisfy: [:stmt | stmt isKindOf: IfAst]]) ifTrue: [
		"The per-class dynamic store backs the nested-class attribute
		AND the class-body ``if'' branch stores (emitted in the attr
		section below);
		its accessors normally compile at the END of the class emit,
		AFTER this section runs -- pull them (and the holder init)
		forward.  The later init is conditional, so the holder set
		here survives."
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
		aStream nextPutAll: name;
			nextPutAll: ' dynInstVars: (Object @env0:new).'; lf].
	(body body select: [:stmt | stmt isKindOf: ClassDefAst]) do: [:nested |
		aStream nextPutAll: '[ | '; nextPutAll: nested name asString;
			nextPutAll: ' |'; lf.
		nested printSmalltalkOn: aStream.
		aStream lf;
			nextPutAll: name;
			nextPutAll: ' @env1:___pyAttrStore___: #''';
			nextPutAll: nested name asString;
			nextPutAll: ''' put: ';
			nextPutAll: nested name asString;
			nextPutAll: ' ] value.'; lf.
	].
	[
		"Python executes a class body top-to-bottom: a name is class-
		local only once its binding statement has run.  Build each
		body name's first binding position, then emit every attr value
		with classBodyBoundNames = the names bound strictly before it,
		so NameAst falls back to module scope for later siblings
		(``empty_values = list(validators.EMPTY_VALUES)'' before
		``def validators'' — django's Field)."
		| firstBinding attrAssignPos |
		firstBinding := IdentityKeyValueDictionary new.
		attrAssignPos := IdentityKeyValueDictionary new.
		body body doWithIndex: [:stmt :pos |
			(stmt isKindOf: FunctionDefAst) ifTrue: [
				(firstBinding includesKey: stmt name asSymbol) ifFalse: [
					firstBinding at: stmt name asSymbol put: pos]].
			(stmt isKindOf: ClassDefAst) ifTrue: [
				(firstBinding includesKey: stmt name asSymbol) ifFalse: [
					firstBinding at: stmt name asSymbol put: pos]].
			((stmt isKindOf: AssignAst) or: [stmt isKindOf: AnnAssignAst]) ifTrue: [
				(stmt ___boundTargetNames___) do: [:nm |
					(firstBinding includesKey: nm) ifFalse: [
						firstBinding at: nm put: pos].
					"Last assignment wins — that's the statement the
					classAttrs pair came from (``args_check =
					staticmethod(args_check)'' rebinding a sibling def
					must see the def as already bound)."
					attrAssignPos at: nm put: pos]].
		].
		classAttrs do: [:pair |
			"pair value is nil for bare annotations (``x: int'' with no
			assignment) — skip the init emit; the slot stays nil until
			some later assignment fills it."
			pair value ifNotNil: [
				| myPos bound |
				myPos := attrAssignPos at: pair key asSymbol
					ifAbsent: [firstBinding at: pair key asSymbol ifAbsent: [nil]].
				bound := IdentitySet new.
				myPos ifNotNil: [
					firstBinding keysAndValuesDo: [:nm :pos |
						pos < myPos ifTrue: [bound add: nm]]].
				CallAst classBodyBoundNames: (myPos isNil ifTrue: [nil] ifFalse: [bound]).
				aStream nextPutAll: name; nextPutAll: ' '; nextPutAll: pair key; nextPutAll: ': '.
				pair value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '.'; lf
			].
		].
		"Top-level ``if'' statements in the class body: CPython runs
		them at class-DEFINITION time — the C-vs-Python dual-module
		pattern (``if c_functools: partial = c_functools.partial''
		guards 30+ attributes in test_functools).  Emit each as a
		runtime conditional whose branch assignments store per-class
		DYNAMIC attrs — the tier setattr(cls, ...) writes and both
		class-receiver and instance attribute loads consult — so the
		attribute exists exactly when its branch ran.  Only simple
		NAME = value assignments (and nested ifs) are honored; other
		statement kinds inside a class-body if are still dropped."
		body body doWithIndex: [:stmt :pos |
			(stmt isKindOf: IfAst) ifTrue: [
				| bound |
				bound := IdentitySet new.
				firstBinding keysAndValuesDo: [:nm :p |
					p < pos ifTrue: [bound add: nm]].
				CallAst classBodyBoundNames: bound.
				self emitClassBodyIf: stmt on: aStream]].
	] ensure: [
		"RESTORE (not hardcode-off) the body-emit flags: a NESTED class
		emits inside the OUTER class's attr-value section, and clearing
		the flags here killed the outer prior-class-attr resolution
		(``a = A()`` after ``class A:`` emitted a bare undeclared A)."
		CallAst classBeingCompiled: savedClass.
		CallAst classFunctionNames: savedFuncNames.
		CallAst classStaticFunctionNames: savedStaticFuncNames.
		CallAst classVarargsFunctionNames: savedVarargsFuncNames.
		CallAst classAttrNames: savedClassAttrNames.
		CallAst selfParameterName: savedSelfParam.
		CallAst classSlotNames: savedSlotNames.
		CallAst inClassBodyValueEmit: (savedInBodyEmit == true).
		CallAst classBodyBoundNames: savedBoundNames.
		CallAst classNestedClassNames: savedNestedNames.
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
	"``___annotatedFields___`` accessor/setter + init — every annotated
	field name in declaration order (see the slot registration above).
	Mirrors the ``_fields'' emission but includes annotated-with-value
	lines, so dataclasses can recover defaulted fields."
	((self isDataclassDecorated)
		and: [self dataclassAnnotatedNames notEmpty
		and: [(classAttrs anySatisfy: [:p | p key == #'___annotatedFields___']) not]])
			ifTrue: [
		| lf accessorSrc setterSrc |
		lf := Character lf asString.
		accessorSrc := '___annotatedFields___' , lf , '	^ ___annotatedFields___'.
		self
			emitCompileMethodOn: name
			source: accessorSrc
			category: 'Grail-Dataclass'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := '___annotatedFields___: ___1' , lf , '	___annotatedFields___ := ___1.'.
		self
			emitCompileMethodOn: name
			source: setterSrc
			category: 'Grail-Dataclass'
			env: 1
			classSide: true
			onStream: aStream.
		aStream
			nextPutAll: name;
			nextPutAll: ' ___annotatedFields___: (tuple @env0:withAll: #('.
		self dataclassAnnotatedNames do: [:n |
			aStream space; nextPutAll: ''''; nextPutAll: n asString; nextPutAll: '''' ].
		aStream nextPutAll: ' )).'; lf.
	].
	"``__annotations__`` accessor/setter + init for a class with class-body
	annotations.  The getter guards nil so a subclass — which inherits the
	class-side slot but leaves it nil (excluded from the parent-value copy
	below) — reports {} rather than nil, matching CPython's own-annotations-
	only ``Cls.__annotations__''."
	((self classAnnotationPairs notEmpty)
		and: [(classAttrs anySatisfy: [:p | p key == #'__annotations__']) not])
			ifTrue: [
		| lf accessorSrc setterSrc |
		lf := Character lf asString.
		accessorSrc := '__annotations__' , lf , '	^ __annotations__ @env0:ifNil: [KeyValueDictionary @env0:new]'.
		self
			emitCompileMethodOn: name
			source: accessorSrc
			category: 'Grail-Annotations'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := '__annotations__: ___1' , lf , '	__annotations__ := ___1.'.
		self
			emitCompileMethodOn: name
			source: setterSrc
			category: 'Grail-Annotations'
			env: 1
			classSide: true
			onStream: aStream.
		aStream nextPutAll: name; nextPutAll: ' __annotations__: '.
		self emitClassAnnotationsDictOn: aStream.
		aStream nextPutAll: '.'; lf].
	"Compile a class-side ``___methodAnnotationsTable___`` (method-name ->
	annotations dict) for every annotated instance method; BoundMethod >>
	__annotations__ walks the superclass chain consulting it."
	self emitMethodAnnotationsTableOn: aStream className: name.
	"Inherit parent class-attr values into our slot.  Smalltalk
	class-side instVars are per-class storage; without this the
	subclass's inherited slot stays nil."
	bases isEmpty ifFalse: [
		| excludeNames |
		"Exclude this class's own class-attr names from the parent-value
		copy.  Also exclude ``___annotatedFields___'' for a dataclass so
		the just-emitted per-class field list isn't overwritten by the
		parent's (the init runs before this copy).  Cross-class field
		merging for dataclass inheritance is a separate, unimplemented
		concern."
		excludeNames := (classAttrs collect: [:p | p key]) asOrderedCollection.
		self isDataclassDecorated ifTrue: [excludeNames add: #'___annotatedFields___'].
		"Never copy the parent's ``__annotations__'' — CPython's
		``Cls.__annotations__'' reports the class's OWN annotations only; the
		guarded getter turns an uninitialised (inherited) slot into {}."
		self classAnnotationPairs notEmpty ifTrue: [excludeNames add: #'__annotations__'].
		aStream
			nextPutAll: '(Python @env0:at: #importlib) @env0:___inheritClassAttrs___: ';
			nextPutAll: name;
			nextPutAll: ' exclude: '.
		self printSymbolArray: excludeNames on: aStream.
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
		"__module__ is the defining module's dotted NAME STRING (CPython
		semantics), emitted as a compile-time literal via the enclosing
		ModuleAst.  Never the module instance — see
		___enclosingModuleName___ for the reachability rationale."
		aStream nextPutAll: name; nextPutAll: ' __module__: '.
		self printQuotedString: self ___enclosingModuleName___ on: aStream.
		aStream nextPutAll: '.'; lf.
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
	"Conditional: a NESTED class stored via ___pyAttrStore___ during the
	attr-value section already forced the holder into existence --
	an unconditional overwrite here wiped it (Outer.A vanished)."
	aStream nextPutAll: name;
		nextPutAll: ' dynInstVars == nil ifTrue: [';
		nextPutAll: name;
		nextPutAll: ' dynInstVars: (Object @env0:new)].'; lf.

	"For each @property (and @cached_property) method, compile a 1-arg
	setter that signals AttributeError.  Pairing the getter with a
	setter makes it look like an instVar to ``___pyAttrLoad___:`` so
	attribute reads INVOKE the method (returning its value) instead of
	being wrapped in a BoundMethod.  Python @property without an
	explicit @setter is read-only; signalling AttributeError on
	assignment matches that.

	``cached_property'' is realized via the same getter+setter pairing
	(detected as the bare-name ``@cached_property'' from ``from
	functools import cached_property'' / ``from werkzeug.utils import
	cached_property'').  Functional parity for reads; it does NOT yet
	cache (the getter recomputes on each access) — fine for the
	idempotent reads (``.args'' / ``.headers'' / ``.cookies'') that
	unblock the Werkzeug request path, but stream-consuming
	cached_properties (``.form'' / ``.data'') would need real caching.
	The attribute-access form ``@functools.cached_property'' (an
	AttributeAst decorator) is not detected.

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
			and: [(def decoratorList includes: #'property')
				or: [def decoratorList includes: #'cached_property']])
			and: [(settersByName includes: def name asSymbol) not]) ifTrue: [
			| propSetterSrc lf2 isCached |
			lf2 := Character lf asString.
			isCached := def decoratorList includes: #'cached_property'.
			isCached
				ifTrue: [
					"@cached_property is a NON-DATA descriptor in CPython:
					assigning ``obj.attr = v'' writes the instance __dict__,
					which then shadows the descriptor on every later read.
					Grail's ___pyAttrLoad___ probes dynamic-instVar storage
					BEFORE any getter (Object >> ___pyAttrLoad___:), so a
					storing setter reproduces that set-then-read behaviour —
					and doubles as the cache slot.  flask's
					``create_url_adapter'' relies on this: it does
					``request.host = get_host(...)'' on a @cached_property."
					propSetterSrc := def name , ': ___1' , lf2 ,
						'	self @env0:dynamicInstVarAt: #''' , def name , ''' put: ___1.' , lf2 ,
						'	^ ___1' ]
				ifFalse: [
					"Plain @property with no explicit @x.setter is read-only —
					match CPython by signalling AttributeError on assignment."
					propSetterSrc := def name , ': ___1' , lf2 ,
						'	AttributeError @env0:signal: ''property ''''',
						def name , ''''' has no setter''.' ].
			self
				emitCompileMethodOn: name
				source: propSetterSrc
				category: (isCached ifTrue: ['Grail-CachedProperty-Setter'] ifFalse: ['Grail-Property-ReadOnly'])
				env: 1
				classSide: false
				onStream: aStream.
		].
	].

	"Multiple inheritance: aClass inherits whichever base
	printSuperclassOn: selected as the Smalltalk superclass (the
	storage base, else the first base); merge in the env-1 methods of
	the OTHER bases that aClass's chain doesn't already provide.  ALL
	bases are passed — the one that became the superclass dedups out
	(its methods are inherited, so ___primaryChainProvides___ sees
	them).  Emitted after the class's own methods are compiled so they
	take precedence.  See importlib >> ___mergeSecondaryBases___:bases:."
	bases size > 1 ifTrue: [
		"Same inline-scope rule as printSuperclassOn: above -- these are
		the SAME base expressions, re-emitted for the MI merge."
		| savedBasesFlag |
		savedBasesFlag := CallAst inBasesEmit.
		CallAst inBasesEmit: true.
		[aStream
			nextPutAll: '(Python @env0:at: #importlib) @env0:___mergeSecondaryBases___: ';
			nextPutAll: name;
			nextPutAll: ' bases: { '.
		1 to: bases size do: [:i |
			i > 1 ifTrue: [aStream nextPutAll: '. '].
			(bases at: i) printSmalltalkWithParenthesisOn: aStream].
		aStream nextPutAll: ' }.'; lf]
			ensure: [CallAst inBasesEmit: (savedBasesFlag == true)]
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

	"Metaclass post-population hook.  Send a class-side
	``___pyClassDefined___:`` to the freshly-populated class with its
	class-body attribute names (declaration order).  Dispatched through
	the class's metaclass: the default (object class) returns the class
	unchanged, but a metaclass such as ``Enum class`` overrides it to
	transform the body into members.  Emitted BEFORE decorators, so the
	metaclass runs first — mirroring Python's metaclass-then-decorator
	order."
	aStream nextPutAll: name; nextPutAll: ' := '; nextPutAll: name;
		nextPutAll: ' @env1:___pyClassDefined___: { '.
	self classBodyAttributes
		do: [:pair |
			aStream nextPutAll: '#'''; nextPutAll: pair key asString; nextPut: $']
		separatedBy: [aStream nextPutAll: '. '].
	aStream nextPutAll: ' }.'; lf.

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
	"CLOSURE CELLS: store every enclosing-function local the class's
	method bodies referenced (NameAst emitted ___classCell___ reads for
	them) onto the class's per-class dynamic attrs.  Emitted AFTER the
	decorator loop so the self-name cell holds the FINAL class object.
	Captured BY REFERENCE: stored as a zero-arg block ``[cap]'' closing over
	the enclosing method temp (Smalltalk blocks capture by reference), so a
	value assigned to ``cap'' AFTER this class def is still seen when a method
	body reads it (CPython closure-cell semantics -- test_list
	test_equal_operator_modifying_operand / test_count_index_remove_crashes /
	test_repr_mutate).  object>>___classCell___: evaluates the block on read."
	(CallAst classCapturedNames notNil and: [CallAst classCapturedNames notEmpty])
		ifTrue: [
			CallAst classCapturedNames do: [:cap |
				aStream
					nextPutAll: name;
					nextPutAll: ' @env1:___pyAttrStore___: #''___cell_';
					nextPutAll: cap asString;
					nextPutAll: '___'' put: [';
					nextPutAll: cap asString;
					nextPutAll: '].';
					lf]].
	CallAst classCapturedNames: savedCapturedNames.

	"Phase A: close the wrapping block (opened at the top of this
	method) and store the final class object into the module
	instance's dynamic-instVar storage.  The canonical-class guard
	(opened beside the block) closes FIRST, after registering the final
	post-decorator object under the module.class key -- the store into
	the module instance stays OUTSIDE the guard because a fresh session's
	module instance needs the binding whether the class was probed or
	built.

	Decorators, the metaclass hook, and ___canonicalClassRegister___ all
	live INSIDE the guard (cold path): under canonical reuse the class is a
	stable object that was fully built + decorated ONCE, and a warm probe
	hit binds that same decorated object -- re-running a decorator such as
	``@dataclass'' on the reused class would re-process it against a fresh
	module load's singletons (e.g. a second ``MISSING'' sentinel) and
	corrupt it.  The ONE per-import side effect a warm reuse must still run
	is dropping this class's stale session-local attr overlay, so a re-run
	of the module body does not inherit the previous run's ``Cls.x = v''
	state; emitted OUTSIDE the guard (no-op with the flag off)."
	(self isModuleScopeClassDef) ifTrue: [
		"Still INSIDE the canonical guard: register the final (post-metaclass,
		post-decorator) object under (module, qualname), then close the guard."
		aStream
			nextPutAll: 'importlib @env0:___canonicalClassRegister___: '.
		self printQuotedString: self ___enclosingModuleName___ on: aStream.
		aStream nextPutAll: ' name: '.
		self printQuotedString: name asString on: aStream.
		aStream
			nextPutAll: ' value: '; nextPutAll: name; nextPutAll: '.'; lf;
			nextPutAll: '].'; lf.
		"OUTSIDE the guard (runs on both cold build and warm probe hit): drop
		this class's stale session-local attr overlay, then bind the class
		into the module instance."
		aStream
			nextPutAll: 'importlib @env0:___resetClassAttrOverlay___: ';
			nextPutAll: name; nextPutAll: '.'; lf.
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
	pre-discovered from __init__).

	Single base → that base.  Multiple bases → pick the one whose
	Smalltalk class chain reaches a built-in storage collection
	(dict / list / set) so the new class keeps that storage; e.g.
	``ImmutableMultiDict(ImmutableMultiDictMixin, MultiDict)'' subclasses
	``MultiDict'' (dict-backed) rather than the storage-less mixin.  The
	other bases' methods are merged in by ___mergeSecondaryBases___.
	When no base has built-in storage the first base wins (unchanged) —
	see importlib >> ___selectStorageBase___:."

	bases isEmpty ifTrue: [^ aStream nextPutAll: 'PythonInstance'].
	bases size = 1 ifTrue: [
		| only |
		only := bases first.
		"``class C(object):`` is identical to ``class C:`` in Python 3.
		The bare name would resolve to GemStone Object, silently
		dropping the class out of the PythonInstance chain — every
		``isKindOf: PythonInstance`` gate in ___pyAttrLoad___ (property
		pair-reads, class-attr fallbacks) then misfires (twilio's
		``ClientBase(object)`` wrapped its @property getters as
		BoundMethods instead of invoking them)."
		((only isKindOf: NameAst) and: [only id asString = 'object'])
			ifTrue: [^ aStream nextPutAll: 'PythonInstance'].
		^ only printSmalltalkOn: aStream].
	aStream nextPutAll: '((Python @env0:at: #importlib) @env0:___selectStorageBase___: { '.
	1 to: bases size do: [:i |
		i > 1 ifTrue: [aStream nextPutAll: '. '].
		(bases at: i) printSmalltalkWithParenthesisOn: aStream].
	aStream nextPutAll: ' })'
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
	"Emit the class-side `value: ___pos___ value: ___kw___` method
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
	src nextPutAll: 'value: ___pos___ value: ___kw___'; nextPutAll: lf.
	src nextPutAll: '| instance dynInit |'; nextPutAll: lf.
	self firstBaseIsStr
		ifTrue: [
			src
				nextPutAll: 'instance := self @env1:__new__: ((___pos___ @env0:size @env0:>= 1) ifTrue: [___pos___ @env0:at: 1] ifFalse: ['''']).';
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
					nextPutAll: 'instance := ___pos___ @env0:size @env0:= 0 ifTrue: [self @env0:new] ifFalse: [self @env1:__new__: (___pos___ @env0:at: 1)].';
					nextPutAll: lf
			]
			ifFalse: [self firstBaseIsDict
				ifTrue: [
					"dict subclasses — allocate an empty instance (of the
					subclass), then, ONLY when the subclass does not
					override __init__, populate it from the positional
					mapping/iterable + kwargs.  CPython puts population in
					the inherited dict.__init__, so a subclass WITH its own
					__init__ must NOT be auto-populated (its __init__ owns
					that, and may or may not call super().__init__); that
					case falls through to the static __init__ dispatch
					below.  ``self new'' keeps the subclass storage; a user
					__new__ on a dict subclass is bypassed (same documented
					limitation as the str/tuple paths)."
					src nextPutAll: 'instance := self @env0:new.'; nextPutAll: lf.
					initSelector isNil ifTrue: [
						src nextPutAll: 'instance @env1:___initFrom___: ___pos___ kw: ___kw___.'; nextPutAll: lf]]
				ifFalse: [
					"Route through the runtime allocator so a class-body (or
					inherited) ``def __new__(cls, ...)`` runs with the class
					as receiver before __init__ -- see object class >>
					___allocateInstance___:kw: (vendored fractions.py's
					Fraction.__new__ carries ALL of its construction)."
					src nextPutAll: 'instance := self @env1:___allocateInstance___: ___pos___ kw: ___kw___.'; nextPutAll: lf]]].
	"Descriptor-bound __init__ override: a setattr-installed
	``cls.__init__ = synth_fn'' lands in the class''s dynInstVars
	store.  Probe for it BEFORE the static dispatch so dataclass-
	style synthesis (or any runtime mutation of __init__) takes
	effect.  When found, prepend the instance to ___pos___ args and
	forward via ___pyCallValue___ — matches CPython''s descriptor
	read.  When absent (the common case), fall through to the
	statically-compiled dispatch below."
	src
		nextPutAll: 'dynInit := self @env1:___dynamicClassAttr___: #''__init__''.';
		nextPutAll: lf;
		nextPutAll: 'dynInit == nil ifFalse: [';
		nextPutAll: 'dynInit @env1:___pyCallValue___: ({ instance } @env0:, ___pos___) kw: ___kw___.';
		nextPutAll: '^ instance].';
		nextPutAll: lf.
	initSelector ifNotNil: [
		"Varargs __init__ (defaults, *args, or **kwargs) compiles to a
		`___init__:kw:` selector that takes both ___pos___ and keyword
		arrays; the fixed-arity form takes the ___pos___ values
		spread."
		(initSelector asString endsWith: ':kw:')
			ifTrue: [
				src
					nextPutAll: 'instance perform: #''';
					nextPutAll: initSelector asString;
					nextPutAll: ''' env: 1 withArguments: (Array @env0:with: ___pos___ @env0:with: ___kw___).';
					nextPutAll: lf.
			] ifFalse: [
				src
					nextPutAll: 'instance perform: #''';
					nextPutAll: initSelector asString;
					nextPutAll: ''' env: 1 withArguments: ___pos___.';
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
			nextPutAll: ' (Array @env0:with: ___pos___ @env0:with: ___kw___)] @env0:on: MessageNotUnderstood do: [:___ex | nil].';
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
			"Tuple-target class-body assignment: ``__add__, __radd__ =
			_operator_fallbacks(_add, operator.add)'' (vendored
			fractions.py builds every binary operator this way).  Each
			element becomes a class attribute whose value is a synthetic
			``<value>[i]`` subscript.  The RHS re-evaluates once per
			element -- acceptable for the factory-call idiom (each call
			returns an equivalent fresh tuple)."
			((stmt targets size = 1)
				and: [(stmt targets first isKindOf: TupleAst)
				and: [(stmt targets first instVarAt:
						((stmt targets first class allInstVarNames indexOf: #elts)))
					allSatisfy: [:e | e isKindOf: NameAst]]]) ifTrue: [
				| elts |
				elts := stmt targets first instVarAt:
					(stmt targets first class allInstVarNames indexOf: #elts).
				1 to: elts size do: [:i |
					| sub |
					sub := SubscriptAst buildWithFields:
						(IdentityKeyValueDictionary new
							at: #value put: stmt value;
							at: #slice put: (ConstantAst buildWithFields:
								(IdentityKeyValueDictionary new
									at: #value put: i - 1;
									at: #kind put: nil;
									yourself));
							at: #ctx put: LoadAst basicNew;
							yourself).
					pairs add: (elts at: i) id asSymbol -> sub]
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

category: 'Grail-Class Compilation'
method: ClassDefAst
___mangleSlotName___: aName
	"CPython private-name mangling for a __slots__ entry: a name with at
	least two leading underscores and at most one trailing underscore
	(``__x'', ``__x_'' — but NOT ``__x__'') becomes ``_<class>__x'', where
	<class> is this class's name with leading underscores stripped.  Names
	that don't qualify — and the case where the class name is entirely
	underscores — are returned unchanged.  Mirrors the transform CPython
	applies to BOTH the slot descriptor and ``self.__x'' access; Grail
	doesn't mangle access, so stdlib code uses the explicit mangled name
	and the slot must be created under that same name to match."

	| s stripped i |
	s := aName asString.
	((s beginsWith: '__') and: [(s endsWith: '__') not]) ifFalse: [^ s].
	stripped := name asString.
	i := 1.
	[i <= stripped size and: [(stripped at: i) = $_]] whileTrue: [i := i + 1].
	i > stripped size ifTrue: [^ s].
	^ '_' , (stripped copyFrom: i to: stripped size) , s
%

category: 'Grail-Class Compilation'
method: ClassDefAst
slotsValueAst
	"Return the value-expression AST of the class body's ``__slots__''
	assignment — plain ``__slots__ = ...'' or annotated
	``__slots__: T = ...'' — or nil when the class declares no __slots__.
	A later assignment wins if (unusually) __slots__ is assigned twice."

	| result |
	result := nil.
	body body do: [:stmt |
		((stmt isKindOf: AssignAst)
			and: [stmt targets size = 1
			and: [(stmt targets first isKindOf: NameAst)
			and: [stmt targets first id asString = '__slots__']]])
				ifTrue: [result := stmt value].
		((stmt isKindOf: AnnAssignAst)
			and: [(stmt target isKindOf: NameAst)
			and: [stmt target id asString = '__slots__'
			and: [stmt value notNil]]])
				ifTrue: [result := stmt value].
	].
	^ result
%

category: 'Grail-Class Compilation'
method: ClassDefAst
slotNames
	"Python ``__slots__'' declared attribute names, as an ordered,
	de-duplicated OrderedCollection of Symbols — the names that become
	GemStone named instance variables on the backing class.

	Accepts the common literal forms:
	  __slots__ = 'x'            single string  → (x)
	  __slots__ = ('x', 'y')     tuple of strs
	  __slots__ = ['x', 'y']     list of strs
	  __slots__ = ()             empty (no instance attrs, still no __dict__)

	``__dict__'' and ``__weakref__'' are Python directives (they request a
	dict / weakref slot), not real attribute slots, so they are dropped
	from the instVar set.  A non-constant or non-string element (a
	computed __slots__) can't map to a static instVar and is skipped.
	Returns an empty collection when the class declares no __slots__."

	| valueAst names addName |
	valueAst := self slotsValueAst.
	valueAst ifNil: [^ OrderedCollection new].
	names := OrderedCollection new.
	addName := [:s |
		| sym |
		"Apply CPython private-name mangling (``__x'' → ``_<class>__x'').
		Grail does not auto-mangle attribute access, so stdlib code that
		declares such a slot reaches it via the explicit mangled name
		(e.g. weakref's _Proxy declares ``__slots__ = ('__ref',)'' and uses
		``_Proxy__ref''); mangling the slot to match keeps it findable."
		sym := (self ___mangleSlotName___: s) asSymbol.
		((sym == #'__dict__') or: [sym == #'__weakref__']) ifFalse: [
			(names includes: sym) ifFalse: [names add: sym]]].
	(valueAst isKindOf: ConstantAst)
		ifTrue: [
			(valueAst value isKindOf: String) ifTrue: [addName value: valueAst value]]
		ifFalse: [
			((valueAst isKindOf: TupleAst) or: [valueAst isKindOf: ListAst]) ifTrue: [
				valueAst elts do: [:elt |
					((elt isKindOf: ConstantAst) and: [elt value isKindOf: String])
						ifTrue: [addName value: elt value]]]].
	^ names
%

category: 'Grail-Class Compilation'
method: ClassDefAst
slotsDeclaredStrict
	"True when the class declares __slots__ as a recognized literal
	(string, or tuple/list of constant strings) that does NOT include a
	``__dict__'' member.  Such a class forbids non-slot attributes and
	has no per-instance __dict__ (strict CPython __slots__).  A computed /
	unrecognized __slots__ value returns false — a lenient fallback, since
	Grail can't enforce a slot set it can't read at compile time."

	| valueAst hasDict |
	valueAst := self slotsValueAst.
	valueAst ifNil: [^ false].
	(valueAst isKindOf: ConstantAst) ifTrue: [
		^ valueAst value isKindOf: String].
	((valueAst isKindOf: TupleAst) or: [valueAst isKindOf: ListAst]) ifFalse: [
		^ false].
	hasDict := false.
	valueAst elts do: [:elt |
		((elt isKindOf: ConstantAst) and: [elt value isKindOf: String])
			ifTrue: [elt value = '__dict__' ifTrue: [hasDict := true]]
			ifFalse: [^ false]].
	^ hasDict not
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

category: 'Grail-Class Compilation'
method: ClassDefAst
emitClassBodyIf: ifStmt on: aStream
	"Emit a class-body ``if'' as a runtime conditional over per-class
	dynamic-attr stores (see the call site in the attr-init section)."

	aStream nextPutAll: '('.
	ifStmt test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___) ifTrue: ['; lf.
	self emitClassBodyIfBranch: ifStmt body on: aStream.
	aStream nextPutAll: '] ifFalse: ['; lf.
	self emitClassBodyIfBranch: ifStmt orelse on: aStream.
	aStream nextPutAll: '].'; lf
%

category: 'Grail-Class Compilation'
method: ClassDefAst
emitClassBodyIfBranch: aSuite on: aStream
	"One branch of a class-body ``if'': simple NAME = value assignments
	become per-class dynamic-attr stores on the class temp; nested ifs
	recurse.  Anything else is dropped (same as before this feature)."

	(aSuite isNil or: [aSuite body isNil]) ifTrue: [^ self].
	aSuite body do: [:stmt |
		(stmt isKindOf: IfAst) ifTrue: [
			self emitClassBodyIf: stmt on: aStream].
		((stmt isKindOf: AssignAst)
			and: [stmt targets allSatisfy: [:t | t isKindOf: NameAst]]) ifTrue: [
			stmt targets do: [:t |
				aStream nextPutAll: name;
					nextPutAll: ' @env1:___pyAttrStore___: #''';
					nextPutAll: t id asString;
					nextPutAll: ''' put: '.
				stmt value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '.'; lf]].
		((stmt isKindOf: AnnAssignAst)
			and: [(stmt target isKindOf: NameAst) and: [stmt value notNil]]) ifTrue: [
			aStream nextPutAll: name;
				nextPutAll: ' @env1:___pyAttrStore___: #''';
				nextPutAll: stmt target id asString;
				nextPutAll: ''' put: '.
			stmt value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: '.'; lf]]
%

category: 'Grail-accessing'
method: ClassDefAst
body

	^ body
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___enclosingModuleName___
	"The dotted Python name of the module this class definition textually
	lives in, read from the enclosing ModuleAst (loadModuleFromPath: stamps
	``moduleAst name:'' before codegen).  '__main__' when there is no named
	module (plain eval) — CPython's default for exec'd code.  Used to emit
	``Cls.__module__'' as a compile-time NAME STRING (CPython semantics:
	__module__ IS a string).  Storing the module INSTANCE (the old emit)
	made every committed class drag its defining session's module instance
	— and that instance's entire globals graph — into any commit that
	reached the class: exactly the ephemeron/commit-conflict shape the
	session-state refactor removed, resurfacing through class reachability."

	| node |
	node := self.
	[node notNil] whileTrue: [
		(node isKindOf: ModuleAst) ifTrue: [
			^ node name ifNil: ['__main__'] ifNotNil: [:n | n asString]].
		node := node parent].
	^ '__main__'
%

category: 'Grail-Class Compilation'
method: ClassDefAst
isModuleLevelClassDef
	"True if this class def is a direct child of a module body (not nested in
	a function or another class).  Parent chain: self -> BlockAst -> ModuleAst.
	Only module-level classes are routed through the phase-1 canonical-class
	registry (docs/Persistent_Modules_and_Classes.md); method-local classes
	are minted fresh per execution, matching CPython (a class statement in a
	function body produces a new class object on each call)."

	parent ifNil: [^ false].
	(parent isKindOf: BlockAst) ifFalse: [^ false].
	parent parent ifNil: [^ false].
	^ parent parent isKindOf: ModuleAst
%

category: 'Grail-Class Compilation'
method: ClassDefAst
dataclassAnnotatedNames
	"Ordered names of every annotated assignment in the class body —
	bare ``x: int'' AND ``x: int = default'' alike.  ClassDefAst's
	``_fields'' captures only the bare ones (annotated-with-value lines
	route to class-attribute storage), so this is what
	dataclasses._collect_fields needs to recover the full field layout
	and each field's default.  Plain (un-annotated) assignments such as
	``x = 1'' are excluded — they are not dataclass fields."

	| names |
	names := OrderedCollection new.
	body body do: [:stmt |
		((stmt isKindOf: AnnAssignAst) and: [stmt target isKindOf: NameAst])
			ifTrue: [names add: stmt target id asString]].
	^ names
%

category: 'Grail-Class Compilation'
method: ClassDefAst
classAnnotationPairs
	"Ordered ``name -> annotation-SOURCE-STRING'' associations for every
	annotated class-body assignment (bare ``x: int'' AND ``x: int =
	default''), in declaration order.  Drives ``Cls.__annotations__''.
	Annotations are stored as PEP 563 source strings and NEVER evaluated
	(see FunctionDefAst >> emitAnnotationsDictOn:) — the recursive
	``___annotationSourceString___'' unparser builds them at codegen."

	| pairs |
	pairs := OrderedCollection new.
	body body do: [:stmt |
		((stmt isKindOf: AnnAssignAst) and: [stmt target isKindOf: NameAst])
			ifTrue: [pairs add:
				stmt target id asString -> stmt annotation ___annotationSourceString___]].
	^ pairs
%

category: 'Grail-code generation'
method: ClassDefAst
emitClassAnnotationsDictOn: aStream
	"Emit the ``{ name -> annotation-source-string, ... }'' dict expression
	for this class's class-body annotations — same shape as
	FunctionDefAst >> emitAnnotationsDictOn:."

	aStream nextPutAll: '((KeyValueDictionary @env0:new)'.
	self classAnnotationPairs do: [:assoc |
		aStream nextPutAll: ' @env0:at: '''; nextPutAll: assoc key; nextPutAll: ''' put: '.
		self printQuotedString: assoc value on: aStream.
		aStream nextPut: $;].
	aStream nextPutAll: ' @env0:yourself)'
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodAnnotationsTableOn: aStream className: aClassName
	"Compile a class-side ``___methodAnnotationsTable___'' returning a dict
	``method-name -> annotations dict'' for every annotated instance method.
	The method dict expressions are FunctionDefAst >> emitAnnotationsDictOn:
	output (PEP 563 source strings).  No-op when no method is annotated, so
	only classes that need it pay for the extra class-side method."

	| annotated src |
	annotated := self instanceMethodDefs select: [:def | def hasAnnotations].
	annotated isEmpty ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___methodAnnotationsTable___'; lf.
	src nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
	annotated do: [:def |
		src nextPutAll: ' @env0:at: '''; nextPutAll: def name asString; nextPutAll: ''' put: '.
		def emitAnnotationsDictOn: src.
		src nextPut: $;].
	src nextPutAll: ' @env0:yourself)'.
	self
		emitCompileMethodOn: aClassName
		source: src contents
		category: 'Grail-Annotations'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-Class Compilation'
method: ClassDefAst
isDataclassDecorated
	"True when one of this class's decorators is ``@dataclass'' —
	``@dataclass'', ``@dataclass(...)'', ``@dataclasses.dataclass'' or
	``@dataclasses.dataclass(...)''.  Gates emission of the
	``___annotatedFields___'' accessor so ONLY dataclasses pay for it
	(most classes carry annotations but are not dataclasses).
	Limitation: an import alias (``from dataclasses import dataclass as
	dc'') is not recognised."

	decorator_list isNil ifTrue: [^ false].
	^ decorator_list anySatisfy: [:deco | self decoratorRefersToDataclass: deco]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
decoratorRefersToDataclass: deco
	"Recurse through a CallAst (``@dataclass(frozen=True)'') to its
	function, and recognise both the bare name and the attribute form."

	(deco isKindOf: NameAst) ifTrue: [^ deco id asString = 'dataclass'].
	(deco isKindOf: AttributeAst) ifTrue: [^ deco attr asString = 'dataclass'].
	(deco isKindOf: CallAst) ifTrue: [^ self decoratorRefersToDataclass: deco function].
	^ false
%

category: 'Grail-Class Compilation'
method: ClassDefAst
instanceMethodDefs
	"Return all InstanceFunctionDefAst nodes from the class body.
	Skip ``@typing.overload''-decorated stubs — those are type-checker
	annotations only and should not be compiled into the class method
	dict (they would otherwise overwrite the real implementation's
	fixed-arity entries; see FunctionDefAst >> isOverloadStub)."

	^ body body select: [:stmt |
		(stmt isKindOf: InstanceFunctionDefAst)
			and: [stmt isOverloadStub not]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
classMethodDefs
	"Return all ClassFunctionDefAst nodes from the class body.
	These are ``@classmethod``-decorated functions that the parser
	re-classed at parse time (see PythonParser >>
	parseFunctionDefWithDecorators:).  ``@overload''-decorated stubs
	skipped — see instanceMethodDefs."

	^ body body select: [:stmt |
		(stmt isKindOf: ClassFunctionDefAst)
			and: [stmt isOverloadStub not]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
staticMethodDefs
	"Return all StaticFunctionDefAst nodes from the class body.
	@staticmethod-decorated functions take no implicit first arg
	(no ``self`` or ``cls``); they're compiled onto the metaclass
	exactly as written so a Python ``Cls.X(args)`` send dispatches
	to a class-side Smalltalk method with the same arity.
	``@overload''-decorated stubs skipped — see instanceMethodDefs."

	^ body body select: [:stmt |
		(stmt isKindOf: StaticFunctionDefAst)
			and: [stmt isOverloadStub not]]
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
firstBaseIsDict
	"True when this class is a direct ``dict`` subclass.  Gates the
	dict-specific value:value: path that populates the allocated
	instance from the positional mapping/iterable + kwargs (the
	inherited dict.__init__ behavior), since the Smalltalk allocator
	returns an empty KeyValueDictionary otherwise.  Static check on the
	bases list; Grail can't resolve transitive ancestry at codegen."

	bases isEmpty ifTrue: [^ false].
	^ (bases first isKindOf: NameAst)
		and: [bases first id asSymbol = #'dict']
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
			and: [stmt name asString ~= '__new__'
			and: [stmt allParameterNames notEmpty
			and: [stmt allParameterNames first asSymbol == #self]]]
	] ifNone: [nil].
	fallback ifNotNil: [^ #self].
	"No method literally takes ``self''.  Fall back to the first
	non-__new__ instance method's first parameter — but never to
	``cls'': that's a decorated classmethod-alike the parser didn't
	re-class (django's @classproperty), and adopting it would make
	every plain ``self'' method in the class miscompile (Expression
	in django.db.models.expressions)."
	fallback := body body detect: [:stmt |
		(stmt isKindOf: InstanceFunctionDefAst)
			and: [stmt name asString ~= '__new__'
			and: [stmt allParameterNames notEmpty
			and: [stmt allParameterNames first asSymbol ~~ #cls]]]
	] ifNone: [nil].
	fallback ifNotNil: [
		paramNames := fallback allParameterNames.
		paramNames isEmpty ifFalse: [^ paramNames first asSymbol]
	].
	^ #self
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
