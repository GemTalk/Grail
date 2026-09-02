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

category: 'Grail-Class Body'
method: ClassDefAst
___boundTargetNames___
	"A ``class'' statement binds its own name.  Like ``def'' it contributes
	no classBodyAttributePairs: a nested class compiles to a real Smalltalk
	class, not to a class attribute of the enclosing one.

	Private-name mangled, like every other class-body binding."

	^ Array with: (self ___manglePrivate___: name) asSymbol
%

category: 'Grail-code generation'
method: ClassDefAst
printSmalltalkOn: aStream
	"A Python `class X:` statement is an executable statement that
	creates a fresh class object on every execution.  We emit the GemStone
	equivalent inline: an ``importlib ___subclassOf:`` call that produces a
	gensym'd subclass, followed by a sequence of compileMethod: calls for each
	instance method, accessor, and the class-side value:value: instantiation
	method.

	This used to be gated on ``CallAst moduleClassBeingCompiled notNil'', with
	an eval/exec context falling back to a ``legacy dict-based
	representation'' that built a PythonClass (a SymbolDictionary of class
	attributes).  That fallback could never run: PythonClass.gs is not in
	install.gs's input list, so the class was never created -- the name is
	pre-declared as nil in the Python dictionary and stays nil.  The emitted
	``PythonClass perform: #new env: 0'' therefore raised
	``a UndefinedObject does not understand #new'', a SMALLTALK error, so
	every ``exec(''class C: ...'')'' aborted uncatchably.  That was 30 of
	test_listcomps' 52 errors, whose harness execs each snippet in module,
	class AND function scope.

	The runtime path needs nothing the module compilation provides:
	``importlib ___subclassOf:'' and compileMethod: are runtime sends, and
	isModuleScopeClassDef already answers false without a module class, which
	selects exactly the bare-assignment emit an exec doit wants (the
	assignment lands in the doit's symbol-list scope, which builtins>>_exec:
	then reflects back into the caller's globals).  So a class defined by
	exec/eval is now the SAME kind of object as one defined in a module --
	real Smalltalk class, MRO, descriptors, isinstance -- rather than a
	second, shallower class model."

	^self printSmalltalkRuntimeOn: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
___classAttrBackingSlotFor: aKey reserved: reservedClassObjIvars
	"The classInstVar slot name backing the class attribute named aKey.

	Usually the attribute name itself.  Two families get a MANGLED
	``___cattr_<name>___'' slot instead:

	  * kernel class-object instVars (``name'', ``format'', ...) -- an
	    unmangled slot would COALESCE with the inherited structural one and
	    the setter would overwrite the class's real name / format;

	  * Smalltalk PSEUDO-VARIABLES (``self'', ``super'', ``nil'', ``true'',
	    ``false'', ``thisContext'') -- these cannot be declared as variables
	    nor assigned, so both the ``classInstVarNames:'' declaration and the
	    ``true := ___1'' setter body are uncompilable.

	The accessor pair stays NAMED after the attribute either way, so
	``cls.attr'' is unchanged in Python; only the physical slot moves.

	One method because the DECLARATION site and the ACCESSOR site must agree:
	when they disagreed, the slot was declared ``true'' while the setter body
	assigned ``___cattr_true___'', the pair failed to compile, and the whole
	class came back as a raising stub (``NameError: Grail could not compile
	this method'')."

	^ ((reservedClassObjIvars includes: aKey)
		or: [NameAst isReservedSmalltalkIdentifier: aKey])
		ifTrue: ['___cattr_' , aKey asString , '___']
		ifFalse: [aKey asString]
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
	  methodSources fixedArityForwarderSources classMethodSources staticMethodSources
	  initMethod initSelector classAttrs allClassInstVars staticFuncNames savedStaticFuncNames savedIsModuleScope savedDynamicLocals
	  savedClass savedFuncNames savedVarargsFuncNames
	  savedSelfParam savedClassAttrNames settersByName
	  slotNamesOrdered slotNameSet savedSlotNames mangledSlotNames
	  savedInBodyEmit savedBoundNames savedNestedNames
	  savedCapturedNames savedCapturedWriteNames reservedClassObjIvars
	  siblings savedConditionalNames decoratedFuncNames savedDecoratedFuncNames
	  metaclassKw savedAliasTargets savedNeedsClassCell savedCellMethodNames
	  savedCellRebindable
	  savedEnclosingClassCtx savedScopeForMethods savedScopeForBody
	  savedMethodBodyEmit savedMethodDynamicLocals |
	methodDefs := self instanceMethodDefs.
	classMethodDefs := self classMethodDefs.
	staticMethodDefs := self staticMethodDefs.
	selfParam := self selfParameterName.
	funcNames := IdentitySet new.
	staticFuncNames := IdentitySet new.
	"``classBeingCompiled'' must already name THIS class while the name sets
	are collected: ___mangledName___ mangles through it (AbstractNode >>
	___manglePrivate___: reads it), and it was not set until well below --
	so every set was filled with UNMANGLED names while the call sites, emitted
	later with it set, asked for the MANGLED one.  classSelfSendSelector's
	membership test then missed, and every private-method call fell off the
	direct-send fast path onto the far heavier ___pyAttrLoad___ route.  That
	is a stack-depth regression, not just a slow path: a private recursion
	bottomed out at depth 400 where the public equivalent reached 1137, and it
	died with an uncatchable ``cross frame of C primitive'' instead of raising
	RecursionError (test_richcmp MiscTest.test_recursion, whose UserList
	comparison chain runs through UserList.__eq__ -> self.__cast()).
	Saved and restored by the existing savedClass handling below."
	savedClass := CallAst classBeingCompiled.
	CallAst classBeingCompiled: name asSymbol.
	staticMethodDefs do: [:def | staticFuncNames add: def ___mangledName___ asSymbol].
	varargsFuncNames := IdentitySet new.
	decoratedFuncNames := IdentitySet new.
	methodDefs do: [:def |
		"Normalise ``@bigmemtest''-family test methods up front (inject a
		dry-run ``size'' default) so the compilesAsVarargs classification
		just below — and the later source generation — both see the def in
		its adjusted, varargs form.  No-op for every other method."
		def applyBigmemtestDefaultIfNeeded.
		funcNames add: def ___mangledName___ asSymbol.
		"A def that compiles to the varargs ``_name:kw:`` form (complex
		signature, or __init__ which is forced to varargs so it can bind
		keyword args) is marked so classSelfSendSelector dispatches via
		the varargs selector rather than a fixed-arity send into thin air."
		def compilesAsVarargs ifTrue: [
			varargsFuncNames add: def ___mangledName___ asSymbol
		].
		"A WRAPPED def (@contextlib.contextmanager, a user decorator, ...)
		has a class-dict entry that is the decorator's RESULT, while the
		compiled selector is the raw function -- so a self.m() fast-path
		send would bypass the decorator entirely."
		def ___hasWrappingDecorator___ ifTrue: [
			decoratedFuncNames add: def name asSymbol
		].
	].
	"Track @classmethod-decorated funcs in the same name set so a
	self-send like ``cls.foo`` from another method resolves to a
	known function name (and uses the correct varargs/fixed-arity
	selector below)."
	classMethodDefs do: [:def |
		funcNames add: def ___mangledName___ asSymbol.
		def isSimplePositionalArgs ifFalse: [
			varargsFuncNames add: def ___mangledName___ asSymbol
		].
		"Extended to @classmethod defs as well.  This was previously held
		back because a class-side method was not reachable through an
		instance's ___pyAttrLoad___, so suppressing the fast path turned
		``self.cm0()'' into an AttributeError; that probe now exists, and
		a decorated classmethod is stored as a PyClassMethod descriptor
		which only the attribute path consults.  Without this, ``self.m()''
		still reached the RAW class-side method and bypassed the wrapper."
		def ___hasWrappingDecorator___ ifTrue: [
			decoratedFuncNames add: def ___mangledName___ asSymbol
		].
	].
	"Collection done -- put classBeingCompiled BACK to the outer value.
	It was set early only so ___mangledName___ could mangle through it.
	It must NOT stay set here: isModuleScopeClassDef answers false
	whenever classBeingCompiled is non-nil (that is its `nested inside
	another class' test), so leaving it set reports EVERY class as
	non-module-scope and routes every super() through the method-local
	closure-cell path -- which broke super().__init__ argument passing
	(werkzeug's Request lost `environ', taking out a whole SUnit shard).
	The real set, for the per-method codegen, happens further down."
	CallAst classBeingCompiled: savedClass.
	"Scan body for class-level simple assignments (`NAME = value`,
	or chained `A = B = value`).  Each declared name becomes a
	class-side attribute (Smalltalk classInstVar + class-side getter/
	setter)."
	classAttrs := self classBodyAttributes.

	"Stamp ``__doc__'': CPython lifts a class body's leading string literal
	into ``Cls.__doc__'', and a class with NO docstring has ``__doc__ ==
	None'' -- it does NOT inherit a base's (or object's) docstring.  Grail
	classes otherwise fell through to Object>>__doc__ and reported object's
	own docstring for every user class (test_enum test_doc_1..4 assert a
	docstring-less enum's __doc__ is None).  Inject it as a class attribute
	so it rides the existing getter+setter value-attr path -- and so a
	subclass with no docstring stamps its OWN None slot (classInstVars are
	per-class), shadowing a documented base exactly as CPython does.  Skipped
	when the body already assigns __doc__ itself.  A ConstantAst holding nil
	emits as the ``None'' singleton; a string ConstantAst emits an escaped
	literal."
	(classAttrs anySatisfy: [:p | p key == #'__doc__']) ifFalse: [
		| docNode |
		docNode := self ___docString___ ifNil: [
			ConstantAst new 
				value: nil;
				kind: nil;
				yourself ].
		classAttrs := classAttrs copy.
		classAttrs addFirst: (#'__doc__' -> docNode)].

	"A Python class-body data attribute whose name is an inherited kernel
	class-object instance variable (``name'', ``format'', ``timeStamp'', ...)
	must NOT back its getter/setter with a same-named classInstVar: that slot
	coalesces with the inherited one, so the generated ``name := value'' would
	overwrite the class's real Smalltalk name (silent on 3.7.x; a hard crash on
	4.0 MR#6, where the kernel permitSessionMethodFor: does ``thisClass name
	asSymbol'').  Such attributes get a MANGLED backing slot (``___cattr_name___'')
	instead -- the same isolation __slots__ get via ___slot_x___ -- so ``Foo.name''
	(Python, through the still-named ``name'' accessor) and ``Foo name''
	(Smalltalk, the real class name) stay independent.  Object's metaclass carries
	exactly the kernel class-object instVars (no Grail additions like __module__
	/ ___dynInstVars___), so it is the reserved set.  See
	docs/Python_Class_Attribute_Namespaces.md."
	reservedClassObjIvars := IdentitySet @env0:withAll:
		(Object @env0:class @env0:allInstVarNames).

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
	restores correctly.  ``savedClass'' is NOT re-captured here: it was
	already taken further up, before classBeingCompiled had to be set early
	for the name-mangling collection, and re-taking it now would save THIS
	class instead of the enclosing one."
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
	"A METHOD BODY is not a class body.  CPython compiles a class-body read to
	LOAD_NAME and a method-body read to LOAD_FAST/LOAD_GLOBAL, so the
	class-body probes -- inClassBodyValueEmit and the locals()/vars() gate it
	carries -- must be OFF while the method sources below are generated.
	They already are for a module-scope class, because nothing outside a class
	body ever sets them.  For a class NESTED in another class body they were
	not: the outer's emit turns both on before it reaches the nested classdef
	(see the attribute-value section further down), and the nested emit does
	not set its OWN values until after this point -- so the nested class's
	METHODS were generated under the OUTER class's flags.

	With a locals()/vars() call anywhere in the outer class (argparse's
	HelpFormatter._expand_help calls vars(action)), every name read in a
	nested class's method bodies then emitted

	    ((_Section @env1:___classBodyDynamicRead___: #'parent') ifNil: [...])

	whose receiver is the nested class's BLOCK TEMP, invisible to the runtime
	compileMethod: that compiles the method source against the symbol list.
	Every such method failed to compile (CompileError 1001, ``undefined symbol
	_Section'') and was replaced by the codegen-gap stub, so calling it raised
	``Grail could not compile this method''.  argparse's
	HelpFormatter._Section and _SubParsersAction._ChoicesPseudoAction are two
	live examples; the probe was also plain wrong there, since it let a
	class-body dynamic name outrank a method LOCAL."
	savedMethodBodyEmit := CallAst inClassBodyValueEmit.
	savedMethodDynamicLocals := CallAst classBodyDynamicLocals.
	CallAst inClassBodyValueEmit: false.
	CallAst classBodyDynamicLocals: false.
	CallAst classFunctionNames: funcNames.
	savedStaticFuncNames := CallAst classStaticFunctionNames.
	CallAst classStaticFunctionNames: staticFuncNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	savedDecoratedFuncNames := CallAst classDecoratedFunctionNames.
	CallAst classDecoratedFunctionNames: decoratedFuncNames.
	CallAst classAttrNames: (IdentitySet withAll: (classAttrs collect: [:p | p key])).
	CallAst selfParameterName: selfParam.
	CallAst classSlotNames: slotNameSet.

	savedCapturedNames := CallAst classCapturedNames.
	CallAst classCapturedNames: IdentitySet new.
	"Whether a method body reads ``__class__'' is a question about THIS class,
	so a nested class statement must not inherit or clobber the outer answer."
	savedNeedsClassCell := CallAst classNeedsClassCell.
	CallAst classNeedsClassCell: false.
	"Whether this class's cell can be REBOUND -- decided by a subtree walk here,
	before any method source is generated, because it cannot be discovered
	during the emit (see ___classCellIsRebindable___)."
	savedCellRebindable := CallAst classCellRebindable.
	CallAst classCellRebindable: self ___classCellIsRebindable___.
	savedCellMethodNames := CallAst classCellMethodNames.
	CallAst classCellMethodNames: IdentitySet new.
	savedCapturedWriteNames := CallAst classCapturedWriteNames.
	CallAst classCapturedWriteNames: IdentitySet new.
	methodSources := OrderedCollection new.
	fixedArityForwarderSources := OrderedCollection new.
	classMethodSources := OrderedCollection new.
	staticMethodSources := OrderedCollection new.
	"This class's frame on the LEXICAL SCOPE STACK, for exactly the window in
	which classBeingCompiled names it.  Method BODIES are generated inside this
	window, so a class or def written in one reads its enclosing chain from here
	-- ``Outer.meth.<locals>.Inner'' needs Outer's frame to still be underneath
	meth's when Inner is emitted, and a single slot cannot hold both."
	savedScopeForMethods := CallAst ___pushScope___: self kind: #class name: name.
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
			"...UNLESS the carried-over name is one this def binds ITSELF.
			A def with no plain positional has no self parameter, so the
			class-wide name is kept for its body -- but when that same name is
			this def's keyword-only, *vararg or **kwarg, every reference to the
			def's OWN parameter compiled to the RECEIVER instead.  ``def
			m(*args, a=1)'' in a class whose other methods start with ``a''
			returned self where the caller passed a=3 -- a silently wrong
			VALUE, not an error, which is the worst way for this to fail.

			nil in that case, so nothing in the body maps to the receiver --
			which is also what CPython has, the def having taken no self."
			CallAst selfParameterName: (def allParameterNames isEmpty
				ifTrue: [
					(savedSelfForIM notNil
						and: [def ___bindsOwnParameterNamed___: savedSelfForIM])
							ifTrue: [nil]
							ifFalse: [savedSelfForIM]]
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
						methodSources add: def ___mangledName___ asString
							-> def generateResourceSkipSource]
					ifFalse: [
					def isCpythonOnlyDecorated
					ifTrue: [
						"A ``@cpython_only''-decorated test skips under an
						alternative Python implementation (see
						isCpythonOnlyDecorated); emit a skipping body."
						methodSources add: def ___mangledName___ asString
							-> def generateCpythonOnlySkipSource]
					ifFalse: [
						s := PrettyWriteStream on: Unicode7 new.
						def generateMethodSourceOn: s.
						def isDeleterDecorated
							ifTrue: [
								"A property DELETER (``@x.deleter def x(self)'') is unary
								like the getter; emitting it as ``x'' would clobber the
								getter.  Redirect to ``___propDeleter_x'', invoked by
								object>>___pyAttrDelete___ for ``del obj.x''."
								methodSources add: ('___propDeleter_' , def ___mangledName___ asString)
									-> (self ___redirectUnarySelectorIn: s contents
										from: def ___mangledName___ asString
										to: ('___propDeleter_' , def ___mangledName___ asString))]
							ifFalse: [
								methodSources add: def ___mangledName___ asString -> s contents].
						"Keyword-call companion for a simple-positional instance
						method: a varargs ``_name:kw:'' forwarder so ``obj.m(a,
						kw=v)'' binds by name rather than DNU-ing (django calls
						view/handler methods with keyword arguments)."
						def needsVarargsForwarder ifTrue: [
							methodSources add: ('_' , def ___mangledName___ asString)
								-> def generateInstanceVarargsForwarderSource].
						"The MIRROR of the above: fixed-arity entry points for a
						method that compiled as varargs, so a fixed-arity send
						reaches it.  Without them an override written
						``def m(self, x, flag=False)'' cannot replace a base
						``def m(self, x)'': base code calling ``self.m(x)'' emits
						``m:'', the override is only ``_m:kw:'', and the send
						silently finds the BASE.  See §9.35.

						Kept in a SEPARATE collection because these compile into
						their own method category: an arity-1 forwarder ``m:''
						is shape-identical to the synthesized property SETTER
						that pairs with a unary getter ``m'', and
						___pyAttrLoad___ reads such a pair as a property and
						PERFORMS the getter.  The category is what tells them
						apart.  See §9.36."
						def needsFixedArityForwarders ifTrue: [
							def fixedArityForwarderArities do: [:n |
								fixedArityForwarderSources
									add: (def fixedAritySelectorFor: n)
										-> (def generateInstanceFixedArityForwarderSource: n)]].
						"A ``@bigmemtest''-family method was normalised to the
						varargs form (a dry-run ``size'' default injected above),
						which hides it from dir()-based test discovery.  Emit a
						plain unary forwarder so getTestCaseNames finds it."
						def isBigmemtestDecorated ifTrue: [
							methodSources add: ('bigmem_' , def ___mangledName___ asString)
								-> def generateBigmemtestUnaryForwarderSource]]].
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
					classMethodSources add: def ___mangledName___ asString -> s contents.
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
					staticMethodSources add: def ___mangledName___ asString -> s contents.
				]
			] ensure: [
				CallAst selfParameterName: savedSelfForSM.
			].
		].
	] ensure: [
		CallAst ___restoreScopeDepth___: savedScopeForMethods.
		CallAst inClassBodyValueEmit: savedMethodBodyEmit.
		CallAst classBodyDynamicLocals: savedMethodDynamicLocals.
		CallAst classBeingCompiled: savedClass.
		CallAst classFunctionNames: savedFuncNames.
		CallAst classStaticFunctionNames: savedStaticFuncNames.
		CallAst classDefIsModuleScope: savedIsModuleScope.
		CallAst classVarargsFunctionNames: savedVarargsFuncNames.
		CallAst classDecoratedFunctionNames: savedDecoratedFuncNames.
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
	"DEDUPLICATED, first occurrence winning.  classAttrs holds one pair per
	assignment TARGET, so a body that binds the same name twice -- ordinary
	Python, ``x = 1'' then ``x = x + 1'' -- yielded the slot twice and
	``subclass:...classInstVars:'' rejected it with rtErrAddDupInstvar.  That
	surfaced as the catch-all ``Grail cannot subclass sealed kernel class
	'PythonInstance''' from Class.gs's retry, i.e. the class failed to build at
	all.  The stores themselves stay one per assignment, in source order, so
	the last one still wins."
	allClassInstVars := OrderedCollection new.
	classAttrs do: [:p | | slot |
		"Reserved kernel class-object names, and Smalltalk pseudo-variables, are
		declared under their MANGLED slot -- see
		___classAttrBackingSlotFor:reserved:, which the accessor emit below
		shares so the declaration and the accessor bodies cannot disagree."
		slot := (self ___classAttrBackingSlotFor: p key reserved: reservedClassObjIvars)
			asSymbol.
		(allClassInstVars includes: slot) ifFalse: [allClassInstVars add: slot]].
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
	"Always request a ``___dynInstVars___'' slot to hold the per-class
	dynamic-attribute dict (an Object whose dynamicInstVars provide
	the storage).  Each class gets its own slot — see
	[[class-side-dynamic-attrs]].  GemStone classes don't support
	dynamicInstVarAt:put: directly; this Object new sits in the
	classInstVar and gives us the same dictionary semantics for
	class-level Python attribute stores."
	(allClassInstVars includes: #'___dynInstVars___') ifFalse: [
		allClassInstVars add: #'___dynInstVars___'].
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
	Skipped when the user already declared the name.

	Emitted for EVERY class carrying class-body annotations, not just a
	@dataclass one.  ``class Point(NamedTuple): x: int; y: int = 0'' has
	the same problem and no decorator to key off: ``_fields'' answers
	``('x',)'' and the declaration ORDER of the defaulted fields is
	unrecoverable from ``__annotations__'' (a KeyValueDictionary, whose
	iteration order is hash order).  typing.NamedTuple reads this slot to
	build the real field layout -- see src/python/stdlib/typing.py."
	((self annotatedFieldNames notEmpty)
		and: [(classAttrs anySatisfy: [:p | p key == #'___annotatedFields___']) not])
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
	"...and the SAME block is what declares the class body's codegen helper
	temps (``___t_N'').  A class body is a scope with a BlockAst of its own,
	so allocateTemp lands its temps there -- but ClassDefAst emits the body's
	statements one at a time, straight into the enclosing method, and never
	calls BlockAst >> printSmalltalkOn:, which is the only thing that declares
	them.  Every class-body construct needing a temp therefore named an
	undefined symbol and took the WHOLE module's compile down with it
	(CompileError 1001, uncatchable from Python): a chained comparison
	``1 < x < 10'', a comprehension filtered by one, a conditional expression
	over one.  So the block is opened whenever there are helper temps to
	declare, even when the class name itself needs no temp -- a class nested
	in a function or in another class body reaches this the same way, and
	Smalltalk block temps are visible to the nested blocks the body emits."
	(self ___bindsClassNameToModule___ or: [self ___classBodyHelperTemps___ notEmpty]) ifTrue: [
		aStream nextPutAll: '[| '.
		self ___bindsClassNameToModule___ ifTrue: [
			aStream nextPutAll: self ___stVarName___; nextPutAll: ' '].
		self ___classBodyHelperTemps___ do: [:each |
			aStream nextPutAll: each asString; nextPutAll: ' '].
		aStream nextPutAll: '| '.
	].
	(self isModuleScopeClassDef) ifTrue: [
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
			nextPutAll: self ___stVarName___;
			nextPutAll: ' := importlib @env0:___canonicalClassProbe___: '.
		self printQuotedString: self ___enclosingModuleName___ on: aStream.
		aStream nextPutAll: ' name: '.
		self printQuotedString: name asString on: aStream.
		aStream nextPutAll: '.'; lf;
			nextPutAll: self ___stVarName___; nextPutAll: ' == nil ifTrue: ['; lf.
	].
	"Phase B: instance attributes live in dynamic-instVar storage on
	each instance (created on first write via ``dynamicInstVarAt:put:'').
	Instance instVarNames is therefore empty — no pre-declaration
	needed.  Class attributes (``class C: X = 1'') still allocate
	classInstVar slots because GemStone prohibits dynamic instVars on
	Behavior / Class receivers (error 2484); accessor/setter pairs
	keep the read/write path working for class-side attrs."
	aStream nextPutAll: self ___stVarName___; nextPutAll: ' := ('.
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
	"Marks a class as PYTHON-DEFINED.  The strictness walk needs to tell a
	Python class that declared no __slots__ -- which gives its instances a
	__dict__ and so forbids strictness below it -- from a Grail BUILTIN
	base such as property or a numbers ABC, whose instances carry no Python
	__dict__ and which CPython spells with __slots__ = () anyway."
	self
		emitCompileMethodOn: self ___stVarName___
		source: '___pyDefinedClass___
	^ true'
		category: 'Grail-Slots'
		env: 1
		classSide: false
		onStream: aStream.

	"A body that ``del''s a name needs the dynamic-attr holder to EXIST before
	its attribute stores run.  The pair is compiled further down, after the
	attribute-value section, and that is normally fine: a store only reaches the
	holder when the accessor pair is missing, which for an ordinary class it is
	not.  A del removes the pair, so the re-assignment after it lands on the
	holder -- and found no ___dynInstVars___ accessor to store through, because
	the accessor had not been compiled yet.  ``class C: x = 1; del x; x = 2''
	failed with a doesNotUnderstand naming Grail's own internal selector.

	Emitted HERE as well, not moved: a class whose body has a runtime statement
	(a loop, try, with, or if) already gets the holder early through that path,
	so moving the single site would reorder every other class's emit for no
	reason.  Compiling the same method twice is idempotent and the initialiser
	is nil-guarded, so the later site is a no-op when this one has run -- which
	is what makes duplicating it safe (an UNGUARDED overwrite there is what once
	made a nested Outer.A vanish)."
	self ___classBodyDeletedNames___ isEmpty ifFalse: [
		self
			emitCompileMethodOn: self ___stVarName___
			source: '___dynInstVars___
	^ ___dynInstVars___'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		self
			emitCompileMethodOn: self ___stVarName___
			source: '___dynInstVars___: ___1
	___dynInstVars___ := ___1.'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		aStream nextPutAll: self ___stVarName___;
			nextPutAll: ' ___dynInstVars___ == nil ifTrue: [';
			nextPutAll: self ___stVarName___;
			nextPutAll: ' ___dynInstVars___: (Object @env0:new)].'; lf].

	(self slotsValueAst notNil) ifTrue: [
		self
			emitCompileMethodOn: self ___stVarName___
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
	"Gated at CLASS-CREATION time on ___pyStrictSlotsAllowed___, not just on
	this class's own declaration: CPython drops the __dict__ only when the
	WHOLE mro declares __slots__, so a slotted class with a plain base still
	has one.  The base may live in another module, so only the runtime can
	answer that -- see PythonInstance class>>___pyStrictSlotsAllowed___."
	self slotsDeclaredStrict ifTrue: [
		aStream nextPutAll: '('; nextPutAll: self ___stVarName___;
			nextPutAll: ' ___pyStrictSlotsAllowed___) ifTrue: ['; lf.
		self
			emitCompileMethodOn: self ___stVarName___
			source: '___pySlotsStrict___
	^ true'
			category: 'Grail-Slots'
			env: 1
			classSide: false
			onStream: aStream.
		aStream nextPutAll: '].'; lf.
	].

	"...and the MIRROR of that rule, which strictness-by-INHERITANCE got
	wrong in the other direction.  CPython gives a class a __dict__ unless
	the class ITSELF declares __slots__; inheriting from a slotted base
	does not suppress it.  Grail emitted ___pySlotsStrict___ once, on the
	slotted ancestor, and every descendant inherited the marker -- so a
	subclass declaring no __slots__ of its own was strict and could not be
	given an attribute at all:

	    class Base:
	        __slots__ = ()
	    class Sub(Base):
	        def __init__(self): self.x = 1   # AttributeError in Grail

	which is what stopped CPython's ipaddress.py, whose IPv4Network
	descends from a base spelled ``__slots__ = ()''.  A class that declares
	NO __slots__ therefore OVERRIDES the inherited marker with false.  The
	slot instVars themselves stay reachable -- ___pyHasSlots___ is still
	inherited, so an inherited slot name keeps writing the named instVar,
	as CPython's inherited slot DESCRIPTOR does -- only the ``no __dict__,
	reject everything else'' half is dropped.

	Gated at class-creation time on whether anything above actually
	implements the marker, so the ordinary class (nothing slotted anywhere
	in its chain) pays one selector lookup and compiles no extra method."
	self slotsValueAst isNil ifTrue: [
		aStream nextPutAll: '('; nextPutAll: self ___stVarName___;
			nextPutAll: ' ___pyInheritsStrictSlots___) ifTrue: ['; lf.
		self
			emitCompileMethodOn: self ___stVarName___
			source: '___pySlotsStrict___
	^ false'
			category: 'Grail-Slots'
			env: 1
			classSide: false
			onStream: aStream.
		aStream nextPutAll: '].'; lf.
	].

	"Compile each instance method as a real env-1 method on the new
	class.  The source is embedded as a Smalltalk string literal."
	methodSources do: [:assoc |
		self
			emitCompileMethodOn: self ___stVarName___
			source: assoc value
			category: 'Grail-Class Methods'
			env: 1
			classSide: false
			onStream: aStream.
	].

	"Fixed-arity forwarders into a varargs body (see §9.36), each GATED on the
	superclass actually implementing that selector -- which is the only case
	where one is needed, and the only case where it is safe.  Emitting them
	unconditionally cost 114 SUnit errors and 22 CPython-suite regressions
	through three unrelated mechanisms: the property getter/setter pair test,
	UnboundMethod's selector-by-arity lookup, and plain name collisions.  The
	gate is a RUNTIME test because the base class is a runtime object that
	codegen cannot see.

	Their own category as well, because an arity-1 forwarder ``m:'' is
	shape-identical to the synthesized property SETTER that pairs with a unary
	getter ``m'', and ___pyAttrLoad___ reads such a pair as a property --
	performing the getter and answering its RESULT where Python answers a bound
	method.  The category is what distinguishes them there."
	fixedArityForwarderSources do: [:assoc |
		aStream
			nextPutAll: '(';
			nextPutAll: self ___stVarName___;
			nextPutAll: ' ___grailSuperImplements___: #''';
			nextPutAll: assoc key;
			nextPutAll: ''') ifTrue: ['; lf.
		self
			emitCompileMethodOn: self ___stVarName___
			source: assoc value
			category: 'Grail-Fixed Arity Forwarders'
			env: 1
			classSide: false
			onStream: aStream.
		aStream nextPutAll: '].'; lf.
	].

	"Compile sibling-method aliases (``__lt__ = __eq__'') as real delegating
	instance methods, so operator dispatch and normal sends find them.  A
	class-attribute BoundMethod is invisible to ``a < b''s #__lt__: send and
	mis-binds when called through an instance (test_heapq test_cmp_err)."
	self ___classBodyMethodAliases___ do: [:assoc |
		self
			emitCompileMethodOn: self ___stVarName___
			source: (self ___methodAliasSourceFor___: assoc key def: assoc value)
			category: 'Grail-Method Aliases'
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
			emitCompileMethodOn: self ___stVarName___
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
			emitCompileMethodOn: self ___stVarName___
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
		"Reserved kernel class-object names (``name'', ``format'', ...) get a
		MANGLED backing slot so the generated ``attr := value'' setter writes a
		FRESH classInstVar instead of coalescing with -- and overwriting -- the
		inherited structural slot (silent corruption of the class's real name /
		format / ...; a hard crash on 4.0 MR#6 permitSessionMethodFor: at
		``name asSymbol'').  The accessor is still NAMED ``attr'' so ``cls.attr''
		(Python) works unchanged; only the physical slot moves -- the same
		isolation __slots__ get via ___slot_x___.  Non-reserved names use the
		attribute name directly.  See docs/Python_Class_Attribute_Namespaces.md.

		The Smalltalk PSEUDO-VARIABLES (``self'', ``super'', ``nil'', ``true'',
		``false'', ``thisContext'') are mangled for a second, harder reason: they
		cannot be assigned AT ALL, so the generated setter body ``true := ___1''
		is not merely wrong but uncompilable.  The whole accessor pair then failed
		to compile and the class got a raising stub, which surfaced as
		``NameError: Grail could not compile this method (codegen gap)'' for the
		entire class -- ``class Logic(Enum): true = True; false = False''
		(test_enum TestSpecial.test_bool) and any Python class with an attribute
		so named.  Parameters and locals already get this treatment via NameAst's
		reserved-name rename; class attributes were the gap.  Reuse that same
		predicate so the two lists cannot drift."
		| attrName backingSlot lf accessorSrc setterSrc |
		attrName := pair key.
		backingSlot := self
			___classAttrBackingSlotFor: attrName
			reserved: reservedClassObjIvars.
		lf := Character lf asString.
		accessorSrc := attrName , lf , '	^ ' , backingSlot.
		self
			emitCompileMethodOn: self ___stVarName___
			source: accessorSrc
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := attrName , ': ___1' , lf , '	' , backingSlot , ' := ___1.'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: setterSrc
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
	].
	"PUBLISH THE ENCLOSING CLASS before the re-push below overwrites the two
	slots that describe it.  Right here -- after the earlier restore and before
	line ``classBeingCompiled: name asSymbol'' -- classBeingCompiled and
	classDefIsModuleScope still name the class this one is nested in, and
	savedCapturedNames is that class's own captured set.  Nothing else in the
	body emit can recover them, which is why NameAst gets them from here.
	Needed because ``__class__'' in a class BODY is the ENCLOSING class, not the
	class being defined; see CallAst >> enclosingClassContext."
	savedEnclosingClassCtx := CallAst enclosingClassContext.
	"Only when a FUNCTION separates the two classes.  ``__class__'' is a free
	variable of the enclosing SCOPE, and a class body is not a scope names
	resolve through -- so a class body nested DIRECTLY inside another class body
	does not see the outer class and CPython raises NameError:
	    class Outer:
	        class Inner:
	            x = __class__          # NameError, not Outer
	inClassBodyValueEmit is still the OUTER value here (the re-push below sets
	it), so it answers exactly that question: true means we got here from a
	class body rather than through a method."
	CallAst enclosingClassContext: ((CallAst classBeingCompiled == nil
		or: [CallAst inClassBodyValueEmit == true])
		ifTrue: [nil]
		ifFalse: [Array
			with: CallAst classBeingCompiled
			with: (CallAst classDefIsModuleScope ~~ false)
			with: savedCapturedNames]).
	"Re-push the class compile context around the class-attribute
	value emit so NameAst can resolve in-body references like
	``def get_data(...); data = property(get_data)'' or
	``def first(); pair = (first,)'' to a BoundMethod whose receiver
	will be supplied as positional[1] at call time.  Without this
	push, ``first'' falls through to module-scope lookup and raises
	NameError at class-init time."
	CallAst classBeingCompiled: name asSymbol.
	"...and the matching scope frame, so a class nested DIRECTLY in this body
	(emitted below, in the attribute-value section) reads ``Outer.Inner'' -- and
	the full chain, not just one level, when Outer is itself nested."
	savedScopeForBody := CallAst ___pushScope___: self kind: #class name: name.
	CallAst classFunctionNames: funcNames.
	"A SIBLING-METHOD ALIAS (``wrapped = m'') binds a class-body name like any
	other statement, but it is neither a class ATTRIBUTE (classBodyAttributes
	drops it on purpose) nor a def -- so a LATER class-body statement reading
	that name matched none of NameAst's class-body branches and fell all the
	way through to the module, raising NameError at class-init time:

	    class C:
	        def m(self): ...
	        wrapped = m
	        wrapper = staticmethod(wrapped)   -- name 'wrapped' is not defined

	That is what kept test_reprlib from importing at all.

	Published as alias -> ORIGINAL name rather than as a bare name set, so the
	read can answer the original's function object: in CPython both names hold
	one object, and reading the alias's own compiled forwarder instead would
	call correctly but compare unequal (``C.in_tuple[0] is C.m'')."
	savedAliasTargets := CallAst classMethodAliasTargets.
	CallAst classMethodAliasTargets:
		(IdentityKeyValueDictionary new
			addAll: (self ___classBodyMethodAliases___
				collect: [:a | a key -> a value name asSymbol]);
			yourself).
	savedStaticFuncNames := CallAst classStaticFunctionNames.
	CallAst classStaticFunctionNames: staticFuncNames.
	CallAst classVarargsFunctionNames: varargsFuncNames.
	savedDecoratedFuncNames := CallAst classDecoratedFunctionNames.
	CallAst classDecoratedFunctionNames: decoratedFuncNames.
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
	savedConditionalNames := CallAst classBodyConditionalNames.
	CallAst classBodyConditionalNames: self ___classBodyConditionalNames___.
	savedDynamicLocals := CallAst classBodyDynamicLocals.
	CallAst classBodyDynamicLocals: self ___classBodyCanBindDynamically___.
	CallAst inClassBodyValueEmit: true.
	"NESTED CLASSES (``class Outer: class A: ...``) -- previously
	dropped entirely.  Emit each nested classdef inside a bracketed
	block (its class variable is block-local, not a module temp) and
	store the built class as a class attribute on the outer class via
	the per-class dynamic store, BEFORE the attr values emit so a later
	``a = A()'' in the outer body can read it (test_functools'
	TestPartialMethod.A).  The nested emit saves/restores the CallAst
	compile context itself."
	"...and a class body that can bind DYNAMICALLY needs them just as much: a
	``locals()['x'] = 43'' for a name no statement mentions has no accessor pair
	to store through, so ___classBodyDefinitionalStore___ falls back to the
	holder -- which must already exist by the time the attribute section runs,
	not be compiled at the end of it."
	"...and so does a class-body WALRUS, for the same reason: ``z = (n := 7) + n''
	binds ``n'' from inside an attribute VALUE expression, where no accessor pair
	was ever declared for it, so the store lands in the holder."
	((body body anySatisfy: [:stmt | stmt isKindOf: ClassDefAst])
		or: [self ___classBodyCanBindDynamically___
		or: [self ___classBodyWalrusNames___ notEmpty
		or: [body body anySatisfy: [:stmt |
			(stmt isKindOf: IfAst)
				or: [self ___isClassBodyRuntimeStatement___: stmt]]]]]) ifTrue: [
		"The per-class dynamic store backs the nested-class attribute
		AND the class-body ``if'' branch stores (emitted in the attr
		section below);
		its accessors normally compile at the END of the class emit,
		AFTER this section runs -- pull them (and the holder init)
		forward.  The later init is conditional, so the holder set
		here survives."
		self
			emitCompileMethodOn: self ___stVarName___
			source: '___dynInstVars___
	^ ___dynInstVars___'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		self
			emitCompileMethodOn: self ___stVarName___
			source: '___dynInstVars___: ___1
	___dynInstVars___ := ___1.'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		aStream nextPutAll: self ___stVarName___;
			nextPutAll: ' ___dynInstVars___: (Object @env0:new).'; lf].
	"___classHolderAttrStore___, not ___pyAttrStore___: this store is
	DEFINITIONAL and must land on the committed class.  ___pyAttrStore___
	diverts to the session overlay once the class is in the canonical set,
	which it already is on any REBUILD (the previous load registered it) --
	and ___resetClassAttrOverlay___, emitted just after the class-build
	guard, then wipes the overlay.  See object >> ___classHolderAttrStore___,
	whose method-decorator caller was bitten by exactly this."
	(body body select: [:stmt | stmt isKindOf: ClassDefAst]) do: [:nested |
		aStream nextPutAll: '[ | '; nextPutAll: nested ___stVarName___;
			nextPutAll: ' |'; lf.
		nested printSmalltalkOn: aStream.
		aStream lf;
			nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___classHolderAttrStore___: #''';
			nextPutAll: nested name asString;
			nextPutAll: ''' put: ';
			nextPutAll: nested ___stVarName___;
			nextPutAll: '.'; lf.
			"No __qualname__ store here.  The nested class stamps its OWN dotted
			name during its own emit, from the lexical scope stack -- this class's
			frame is on it, pushed beside classBeingCompiled above.  A store built
			here from ``self __qualname__'' would run BEFORE this class's qualname
			was stamped (that happens after the attribute section), so a doubly
			nested class read the short answer."
			aStream nextPutAll: ' ] value.'; lf.
	].
	"Class-side ``___methodCodeTable___'' (method name -> PyCode), the __code__
	twin of the doc / signature / annotations tables.  A class-body def compiles
	to a Smalltalk METHOD and so cannot carry the def-time ``___pyCode___:''
	cascade that stamps a nested def's ExecBlock.

	Emitted HERE, before the class-attribute statements below, NOT beside its
	sibling tables at the end of the emit: a class body may READ a sibling def's
	code object while it runs -- ``callable_line =
	get_exception.__code__.co_firstlineno + 2'' is exactly the line that blocked
	test.test_traceback at import -- and the attr statements are emitted at that
	point, so a table compiled afterwards would not exist yet.  The table is a
	literal dict of compile-time constants, depending only on the class already
	existing, so it is safe this early.  (The sibling tables stay late; nothing
	reads __doc__ / __annotations__ from inside a class body.)"
	self emitMethodCodeTableOn: aStream className: name.

	"``___receiverlessMethods___'' is early for the SAME reason, and it is a
	call rather than a read that needs it: a class body may CALL a sibling
	zero-parameter def while it runs --

	    class _C:
	        def inner():
	            return 7
	        x = inner()

	-- and that call reaches UnboundMethod >> value:value:, which asks the
	table whether a receiverless invocation is allowed.  Compiled after the
	attribute statements, the table did not exist yet; an absent table answers
	false by design, so the call was refused with ``unbound method 'inner'
	must be called with an instance as the first argument'' even though the
	very same call SUCCEEDS from outside the body once the table lands
	(test_listcomps test_shadows_outer_cell and three siblings).  Like the
	code table it is a literal of compile-time constants and depends only on
	the class existing."
	self emitReceiverlessMethodTableOn: aStream className: name.

	"PEP 3115's ``__prepare__'': ask the metaclass for the mapping the body is to
	be executed in, BEFORE the attribute statements below run, because a
	namespace that watches the writes has to see them as they happen.  Answers
	nil -- every store then goes straight through -- unless the metaclass really
	supplies one.

	Emitted for EVERY class statement, not only one naming a metaclass: Grail's
	own metaclasses are Smalltalk, and an enum's namespace comes from ``Enum
	class'' rather than from a ``metaclass='' keyword.  The helper answers nil
	unless something really supplies a namespace, so an ordinary class pays one
	send and stores exactly what it did before.  A class that INHERITS a PYTHON
	metaclass is still not reached -- Grail does not install one as the Smalltalk
	metaclass, so there is nothing to ask.  See docs/Class_Body_Namespace.md.

	The metaclass expression evaluates in the scope ENCLOSING the class
	statement, like the boundary keyword and the decorators, so it is emitted
	under inDecoratorEmit."
	metaclassKw := keywords isNil
		ifTrue: [nil]
		ifFalse: [keywords detect: [:kw |
			kw name notNil and: [kw name asString = 'metaclass']] ifNone: [nil]].
	[ | savedDeco |
	savedDeco := CallAst inDecoratorEmit.
	CallAst inDecoratorEmit: true.
	"MARK THE BUILD, after the class is minted and before the body stores
	anything.  Closed beside ___canonicalClassRegister___.  For the whole
	cold-build region a store on this class then counts as DEFINITIONAL: on a
	FIRST build that is already true, because the class joins the canonical set
	only at registration, but on a REBUILD it is not -- the previous build put it
	there, which is how @dataclass's setattr ended up in a session overlay that
	___resetClassAttrOverlay___ wiped moments later."
	"UNCONDITIONAL, unlike the ___grailEndClassBuild___ that closes it, which
	sits in the module-scope-only guard-close block: ``isModuleScopeClassDef''
	is not yet true this early in the emit, so pairing on it here emitted
	nothing at all.

	An unpaired mark on a NESTED or local class is harmless by construction:
	___classAttrOverlayStore___ answers false before ever consulting the mark
	unless the class is in GrailCanonicalClassSet, and only a module-scope class
	is ever registered there.  So a leak cannot change any behaviour."
	aStream nextPutAll: self ___stVarName___;
		nextPutAll: ' @env1:___grailBeginClassBuild___.'; lf.
	[aStream nextPutAll: self ___stVarName___; nextPutAll: ' @env1:___grailPrepareNamespace___: '.
	metaclassKw
		ifNil: [aStream nextPutAll: 'nil']
		ifNotNil: [
			aStream nextPut: $(.
			metaclassKw value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $)].
	aStream nextPutAll: '.'; lf]
		ensure: [CallAst inDecoratorEmit: (savedDeco == true)]] value.
	[
		"Python executes a class body top-to-bottom: a name is class-
		local only once its binding statement has run.  Build each
		body name's first binding position, then emit every attr value
		with classBodyBoundNames = the names bound strictly before it,
		so NameAst falls back to module scope for later siblings
		(``empty_values = list(validators.EMPTY_VALUES)'' before
		``def validators'' — django's Field)."
		| firstBinding attrAssignPos pendingStmts flushPendingBefore |
		firstBinding := IdentityKeyValueDictionary new.
		attrAssignPos := IdentityKeyValueDictionary new.
		"Each statement ANNOUNCES what it binds (___boundTargetNames___) and
		which attribute values it yields (classBodyAttributePairs); this scan
		only assigns positions.  A new binding form therefore becomes visible
		to later siblings by implementing those methods -- it does not have to
		be added to a list of isKindOf: tests here."
		body body doWithIndex: [:stmt :pos |
			stmt ___boundTargetNames___ do: [:nm |
				(firstBinding includesKey: nm) ifFalse: [
					firstBinding at: nm put: pos]].
			"Last assignment wins — that's the statement the classAttrs pair
			came from (``args_check = staticmethod(args_check)'' rebinding a
			sibling def must see the def as already bound).  Driven by the
			attribute pairs, not by the bound names, because a ``def'' or a
			nested ``class'' binds a name but yields no attribute value and so
			must not move the position."
			stmt classBodyAttributePairs do: [:pair |
				attrAssignPos at: pair key put: pos].
		].
		"emittedChainValues: value-AST object -> the FIRST target key that
		emitted it.  A class-body chained assignment ``a = b = expr'' makes
		classBodyAttributes yield several pairs that all point at ONE value AST;
		emitting it once per target re-evaluates the RHS per name, which is wrong
		for an RHS with identity/side effects.  Block-wrapped only to add the
		temp without touching the method-level declaration."
		"The class-body statements the structural compile has no attribute pair
		for and yet CPython executes -- a ``global''-declared assignment, an
		assignment through a subscript, a ``del'' -- each emitted through its OWN
		printSmalltalkOn: (see ___classBodyOrderedRuntimeStatements___ for what
		qualifies and why).  Dropping them was silent in all three cases.

		Emitted in SOURCE ORDER, interleaved with the attribute stores below
		rather than in a pass after them.  A pass afterwards is what the
		``nonlocal'' writes use and it is wrong here: a later attribute that
		READS the name would see the pre-statement value.  ``global g; g = 2; y
		= g'' in a class body must leave y == 2 (test_listcomps
		test_explicit_global), and with a trailing pass it answered 1."
		pendingStmts := self ___classBodyOrderedRuntimeStatements___.
		flushPendingBefore := [:limit |
			[pendingStmts notEmpty and: [pendingStmts first key < limit]]
					whileTrue: [
						| entry stmt bound savedRuntimeClass |
						entry := pendingStmts removeFirst.
						stmt := entry value.
						bound := IdentitySet new.
						firstBinding keysAndValuesDo: [:nm :p |
							p < entry key ifTrue: [bound add: nm]].
						CallAst classBodyBoundNames: bound.
						"``del x'' takes the class it unbinds from this flag, and so
						does every statement emitted VERBATIM here -- it is what
						makes AssignAst route a bare-NAME binding inside a class-body
						loop to the per-class definitional store instead of an
						undeclared block temp.  A global-declared ASSIGNMENT must NOT
						see it: it would route the store to the class instead of the
						module, which is the opposite of what the declaration asked
						for.  ``if'' has its own emit and sets nothing."
						savedRuntimeClass := CallAst classBodyRuntimeClass.
						((stmt isKindOf: DeleteAst)
							or: [self ___isClassBodyRuntimeStatement___: stmt])
								ifTrue: [CallAst classBodyRuntimeClass: name].
						[(self ___isClassBodyNamespaceBinding___: stmt)
							ifTrue: [
								"NOT an emit of the statement -- the def is already
								compiled and the nested class already stored.  Only
								the namespace binding, at this name's own source
								position, so a mapping sees the body in order."
								aStream nextPutAll: self ___stVarName___;
									nextPutAll: ' @env1:___grailNsBind___: ''';
									nextPutAll: stmt name asString;
									nextPutAll: '''.']
							ifFalse: [(stmt isKindOf: IfAst)
								ifTrue: [self emitClassBodyIf: stmt on: aStream]
								ifFalse: [stmt printSmalltalkOn: aStream]]]
							ensure: [CallAst classBodyRuntimeClass: savedRuntimeClass].
						aStream lf]].
		[:emittedChainValues |
		classAttrs do: [:pair |
			"Any pending statement that stands BEFORE this attribute in the
			source goes out first, so the attribute's value expression reads
			what that statement left.  An attribute whose position is unknown
			flushes nothing -- the ordering can only be honoured against a
			position."
			(attrAssignPos at: pair key asSymbol
				ifAbsent: [firstBinding at: pair key asSymbol ifAbsent: [nil]])
					ifNotNil: [:attrPos | flushPendingBefore value: attrPos].
			"pair value is nil for bare annotations (``x: int'' with no
			assignment) — skip the init emit; the slot stays nil until
			some later assignment fills it."
			pair value ifNotNil: [
				(emittedChainValues includesKey: pair value)
					ifTrue: [
						"A later target of a class-body chained assignment
						(``first = primero = auto()'').  Read the FIRST target's
						already-stored class attribute rather than re-emitting the
						RHS, so every name shares the single evaluation -- one
						GrailEnumAuto marker, which the enum builder then aliases."
						(self ___classBodyDeletedNames___ includes: pair key asSymbol)
							ifTrue: [
								aStream nextPutAll: self ___stVarName___;
									nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
									nextPutAll: pair key asString; nextPutAll: ''' put: (';
									nextPutAll: self ___stVarName___; nextPutAll: ' ';
									nextPutAll: (emittedChainValues at: pair value);
									nextPutAll: ').'; lf]
							ifFalse: [
								aStream nextPutAll: self ___stVarName___; nextPutAll: ' '; nextPutAll: pair key;
									nextPutAll: ': ('; nextPutAll: self ___stVarName___;
									nextPutAll: ' @env1:___grailNsStore___: '''; nextPutAll: pair key asString;
									nextPutAll: ''' value: ('; nextPutAll: self ___stVarName___; nextPutAll: ' ';
									nextPutAll: (emittedChainValues at: pair value);
									nextPutAll: ')).'; lf]]
					ifFalse: [
						| myPos bound |
						emittedChainValues at: pair value put: pair key.
						myPos := attrAssignPos at: pair key asSymbol
							ifAbsent: [firstBinding at: pair key asSymbol ifAbsent: [nil]].
						bound := IdentitySet new.
						myPos ifNotNil: [
							firstBinding keysAndValuesDo: [:nm :pos |
								pos < myPos ifTrue: [bound add: nm]]].
						CallAst classBodyBoundNames: (myPos isNil ifTrue: [nil] ifFalse: [bound]).
						"Through the class-body namespace, when there is one: the
						value is offered to the mapping and READ BACK, so a
						namespace may refuse the write (enum.EnumDict on a reused
						member name) or transform it.  With no namespace the helper
						answers the value untouched, so this is what it always was."
						"A name the body also ``del''s has no accessor pair to send to
						after the del ran -- route it through the definitional
						store, which asks at runtime which home it has.  See
						___classBodyDeletedNames___."
						(self ___classBodyDeletedNames___ includes: pair key asSymbol)
							ifTrue: [
								aStream nextPutAll: self ___stVarName___;
									nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
									nextPutAll: pair key asString; nextPutAll: ''' put: ('.
								pair value printSmalltalkWithParenthesisOn: aStream.
								aStream nextPutAll: ').'; lf]
							ifFalse: [
								aStream nextPutAll: self ___stVarName___; nextPutAll: ' '; nextPutAll: pair key;
									nextPutAll: ': ('; nextPutAll: self ___stVarName___;
									nextPutAll: ' @env1:___grailNsStore___: '''; nextPutAll: pair key asString;
									nextPutAll: ''' value: ('.
								pair value printSmalltalkWithParenthesisOn: aStream.
								aStream nextPutAll: ')).'; lf]]
			].
		]] value: IdentityKeyValueDictionary new.
		"Whatever is left stands after the last attribute in the body.

		Which is where the class-body ``if'' and the try/for/while/with/
		augassign/bare-expression statements END UP when nothing reads what they
		bind -- but they are flushed ABOVE, at their own source position, rather
		than in a pass of their own here.  Two behaviours ride on that emit and
		are unchanged by where it happens: an ``if'' becomes a runtime
		conditional whose branch assignments store per-class DYNAMIC attrs, so
		the attribute exists exactly when its branch ran (the C-vs-Python
		dual-module pattern -- ``if c_functools: partial = c_functools.partial''
		guards 30+ attributes in test_functools; only simple NAME = value
		assignments and nested ifs are honoured inside one).  The rest go out
		through their OWN printSmalltalkOn:, so try/except/finally and loop
		codegen is not re-derived here."
		flushPendingBefore value: body body size + 1.
		"A class-body statement whose target is an ATTRIBUTE or SUBSCRIPT
		(``cls.foo = property()'', ``Inner.x = 1'') -- not a bare NAME, so it is
		not a class attribute and was previously DROPPED.  CPython runs it at
		class-definition time, mutating a nested class or other object; emit it as
		a runtime statement here (after nested classes are built, so the target
		name resolves).  test_propertys PropertyUnreachableAttributeNoName does
		``cls.foo = property()`` at class-body level."
		body body doWithIndex: [:stmt :pos |
			(self ___isClassBodyAttributeAssign___: stmt) ifTrue: [
				| bound |
				bound := IdentitySet new.
				firstBinding keysAndValuesDo: [:nm :p |
					p < pos ifTrue: [bound add: nm]].
				CallAst classBodyBoundNames: bound.
				stmt printSmalltalkOn: aStream.
				aStream lf]].
		"A class-body statement assigning a name the body declared ``nonlocal''.
		It binds the ENCLOSING function's variable, not a class attribute, so the
		structural compile has nothing to emit for it and dropped it whole --
		``nonlocal x; x += 1'' in a class body left the outer x untouched and
		produced no code at all (test_scope testNonLocalClass).  The name is
		already excluded from classBodyAttributes, so it does not become a class
		attribute either.

		Emitted through the statement's OWN printSmalltalkOn: in THIS enclosing
		scope, where the name is a real Smalltalk temp and ``x := ...'' compiles
		-- the same trick the runtime-statement pass above uses.  Deliberately
		NOT inside classBodyRuntimeClass: that flag routes bare-NAME bindings to
		the per-class store, which is the opposite of what a nonlocal name wants.

		ORDERING: these run after the class attributes are initialised rather
		than at their source position in the body.  It matters only if an
		attribute value expression READS the nonlocal name, which would then see
		the pre-write value; the common shape (a ``nonlocal'' declaration and its
		write at the top of the body, read later from a method) is unaffected."
		body body doWithIndex: [:stmt :pos |
			| targets |
			targets := self ___classBodyNonlocalTargetNames___: stmt.
			targets isEmpty ifFalse: [
				| bound |
				bound := IdentitySet new.
				firstBinding keysAndValuesDo: [:nm :p |
					p < pos ifTrue: [bound add: nm]].
				CallAst classBodyBoundNames: bound.
				"``__class__'' is not an ordinary nonlocal: CPython's is the
				implicit CLASS CELL of the enclosing scope's class, and writing it
				changes what every method of that class reads.  Grail has no temp
				for it -- that is what ___nonlocalTargetIsAssignableHere___ refuses
				-- so the write is emitted against the cell instead."
				(targets allSatisfy: [:t | t id asSymbol == #'__class__'])
					ifTrue: [self ___emitNonlocalClassCellWrite___: stmt on: aStream]
					ifFalse: [
						(targets allSatisfy: [:t |
							self ___nonlocalTargetIsAssignableHere___: t id asSymbol]) ifTrue: [
							stmt printSmalltalkOn: aStream.
							aStream lf]]]].
		"PARAMETER DEFAULTS, LAST IN THE BODY AND STILL INSIDE IT.  A default is
		evaluated once, at def time, in the ENCLOSING scope -- and for a method that
		scope is this class body.  So the store is emitted here rather than beside the
		other per-class tables in printSmalltalkRuntimeOn:, which is where it was
		first written and why it could not work: that code runs after this block's
		``ensure'' has torn the body context down, so a default expression naming a
		class-body local resolved as a MODULE name and raised at import time --

		    class M:
		        __marker = object()
		        def pop(self, key, default=__marker): ...
		    => NameError: name '__marker' is not defined

		which collections/abc.py's Mapping.pop does verbatim, so every shard of the
		SUnit suite crashed (0 run) rather than merely failing a test.  Emitted HERE,
		the expression resolves through the same class-body branches an attribute
		VALUE uses (inClassBodyValueEmit is still true), and it is a READ, so
		classBodyRuntimeClass stays nil -- that flag routes bare-name BINDINGS to the
		per-class store, which a default must not do.

		LAST, because a default may read a class attribute or an earlier body
		statement's name, and both are already emitted above; CPython evaluates the
		default at the def's own position, so a body that REBINDS the name between the
		def and the end of the body would be seen late.  That shape is pathological
		and the ordering is the same compromise the nonlocal writes above accept."
		self emitMethodDefaultStoresOn: aStream className: name.
	] ensure: [
		"RESTORE (not hardcode-off) the body-emit flags: a NESTED class
		emits inside the OUTER class's attr-value section, and clearing
		the flags here killed the outer prior-class-attr resolution
		(``a = A()`` after ``class A:`` emitted a bare undeclared A)."
		CallAst ___restoreScopeDepth___: savedScopeForBody.
		CallAst classBeingCompiled: savedClass.
		CallAst classFunctionNames: savedFuncNames.
		CallAst classStaticFunctionNames: savedStaticFuncNames.
		CallAst classVarargsFunctionNames: savedVarargsFuncNames.
		CallAst classDecoratedFunctionNames: savedDecoratedFuncNames.
		CallAst classAttrNames: savedClassAttrNames.
		CallAst selfParameterName: savedSelfParam.
		CallAst classSlotNames: savedSlotNames.
		CallAst inClassBodyValueEmit: (savedInBodyEmit == true).
		CallAst enclosingClassContext: savedEnclosingClassCtx.
		CallAst classBodyBoundNames: savedBoundNames.
		CallAst classNestedClassNames: savedNestedNames.
		CallAst classBodyConditionalNames: savedConditionalNames.
		CallAst classMethodAliasTargets: savedAliasTargets.
		CallAst classBodyDynamicLocals: (savedDynamicLocals == true).
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
			emitCompileMethodOn: self ___stVarName___
			source: accessorSrc
			category: 'Grail-NamedTuple'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := '_fields: ___1' , lf , '	_fields := ___1.'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: setterSrc
			category: 'Grail-NamedTuple'
			env: 1
			classSide: true
			onStream: aStream.
		bareNames := (classAttrs select: [:p | p value isNil])
			collect: [:p | p key].
		aStream
			nextPutAll: self ___stVarName___;
			nextPutAll: ' _fields: (tuple @env0:withAll: #('.
		bareNames do: [:n |
			aStream space; nextPutAll: ''''; nextPutAll: n asString; nextPutAll: '''' ].
		aStream nextPutAll: ' )).'; lf.
	].
	"``___annotatedFields___`` accessor/setter + init — every annotated
	field name in declaration order (see the slot registration above).
	Mirrors the ``_fields'' emission but includes annotated-with-value
	lines, so dataclasses can recover defaulted fields, and
	typing.NamedTuple the ordered field layout of a class with defaults."
	((self annotatedFieldNames notEmpty)
		and: [(classAttrs anySatisfy: [:p | p key == #'___annotatedFields___']) not])
			ifTrue: [
		| lf accessorSrc setterSrc |
		lf := Character lf asString.
		accessorSrc := '___annotatedFields___' , lf , '	^ ___annotatedFields___'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: accessorSrc
			category: 'Grail-Dataclass'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := '___annotatedFields___: ___1' , lf , '	___annotatedFields___ := ___1.'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: setterSrc
			category: 'Grail-Dataclass'
			env: 1
			classSide: true
			onStream: aStream.
		aStream
			nextPutAll: self ___stVarName___;
			nextPutAll: ' ___annotatedFields___: (tuple @env0:withAll: #('.
		self annotatedFieldNames do: [:n |
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
			emitCompileMethodOn: self ___stVarName___
			source: accessorSrc
			category: 'Grail-Annotations'
			env: 1
			classSide: true
			onStream: aStream.
		setterSrc := '__annotations__: ___1' , lf , '	__annotations__ := ___1.'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: setterSrc
			category: 'Grail-Annotations'
			env: 1
			classSide: true
			onStream: aStream.
		aStream nextPutAll: self ___stVarName___; nextPutAll: ' __annotations__: '.
		self emitClassAnnotationsDictOn: aStream.
		aStream nextPutAll: '.'; lf].
	"Compile a class-side ``___methodAnnotationsTable___`` (method-name ->
	annotations dict) for every annotated instance method; BoundMethod >>
	__annotations__ walks the superclass chain consulting it."
	self emitMethodAnnotationsTableOn: aStream className: name.
	"Same shape for inspect.signature: a class-side ``___methodSignatureTable___''
	(method-name -> parameter spec) that BoundMethod >> __signature_spec__ walks
	the superclass chain consulting.  A method compiles to a Smalltalk METHOD, not
	a block, so it cannot carry the def-time cascade a nested def does."
	self emitMethodSignatureTableOn: aStream className: name.
	"And the receiver name that table drops, so the UNBOUND read can put it
	back -- CPython's signature(Cls.method) shows ``self''."
	self emitMethodReceiverTableOn: aStream className: name.
	"And the same for docstrings.  A class-body def compiles to a Smalltalk
	METHOD, so it cannot carry the def-time ``___pyNamed___:doc:'' stamp a
	nested def does -- which left every method inheriting Object's own
	__doc__ and claiming to be documented as ``The base class of the class
	hierarchy...''."
	self emitMethodDocTableOn: aStream className: name.
	"Inherit parent class-attr values into our slot.  Smalltalk
	class-side instVars are per-class storage; without this the
	subclass's inherited slot stays nil."
	bases isEmpty ifFalse: [
		| excludeNames |
		"Exclude this class's own class-attr names from the parent-value
		copy.  Also exclude ``___annotatedFields___'' whenever this class
		emitted its own, so the just-emitted per-class field list isn't
		overwritten by the parent's (the init runs before this copy).
		Cross-class field merging for dataclass inheritance is a separate,
		unimplemented concern.  A class with NO annotations of its own is
		NOT excluded and so inherits the parent's list -- which is what
		makes ``class Sub(SomeNamedTuple): pass'' keep the parent's fields."
		excludeNames := (classAttrs collect: [:p | p key]) asOrderedCollection.
		self annotatedFieldNames notEmpty
			ifTrue: [excludeNames add: #'___annotatedFields___'].
		"``_fields'' the same way, and for the same reason: a class that
		declared its OWN bare annotations just initialised it, and the parent
		value would overwrite that.  It never mattered while every NamedTuple
		base was a plain stub with no ``_fields'' of its own; a base that IS a
		namedtuple (``_fields = ()'') makes the copy destructive."
		((classAttrs anySatisfy: [:p | p value isNil])
			and: [(classAttrs anySatisfy: [:p | p key == #'_fields']) not])
				ifTrue: [excludeNames add: #'_fields'].
		"Never copy the parent's ``__annotations__'' — CPython's
		``Cls.__annotations__'' reports the class's OWN annotations only; the
		guarded getter turns an uninitialised (inherited) slot into {}."
		self classAnnotationPairs notEmpty ifTrue: [excludeNames add: #'__annotations__'].
		aStream
			nextPutAll: '(Python @env0:at: #importlib) @env0:___inheritClassAttrs___: ';
			nextPutAll: self ___stVarName___;
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
			emitCompileMethodOn: self ___stVarName___
			source: '__module__
	^ __module__'
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream.
		self
			emitCompileMethodOn: self ___stVarName___
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
		aStream nextPutAll: self ___stVarName___; nextPutAll: ' __module__: '.
		self printQuotedString: self ___enclosingModuleName___ on: aStream.
		aStream nextPutAll: '.'; lf.
	].

	"Compile the ``___dynInstVars___'' accessor + setter pair on every class.
	The slot holds an Object new whose dynamic instVars serve as the
	per-class dictionary for dynamically-set Python attributes
	(``C.brand_new = 42'').  See [[class-side-dynamic-attrs]] —
	GemStone classes don't support ``dynamicInstVarAt:put:'' directly,
	so this Object proxy gives us the same dict semantics."
	self
		emitCompileMethodOn: self ___stVarName___
		source: '___dynInstVars___
	^ ___dynInstVars___'
		category: 'Grail-Class Attrs'
		env: 1
		classSide: true
		onStream: aStream.
	self
		emitCompileMethodOn: self ___stVarName___
		source: '___dynInstVars___: ___1
	___dynInstVars___ := ___1.'
		category: 'Grail-Class Attrs'
		env: 1
		classSide: true
		onStream: aStream.
	"Conditional: a NESTED class (or a class-body ``if'' binding) stored
	during the attr-value section already forced the holder into existence
	-- an unconditional overwrite here wiped it (Outer.A vanished)."
	aStream nextPutAll: self ___stVarName___;
		nextPutAll: ' ___dynInstVars___ == nil ifTrue: [';
		nextPutAll: self ___stVarName___;
		nextPutAll: ' ___dynInstVars___: (Object @env0:new)].'; lf.

	"``__qualname__'' when this class is nested: the dotted path CPython gives
	it, read off the lexical scope stack -- ``Outer.Inner'', ``fn.<locals>.C'',
	``Outer.meth.<locals>.C''.  object class >> __qualname__ looks for exactly
	this holder entry and falls back to the bare name, so a top-level class needs
	no store and gets none (the prefix is nil).

	This replaced a store the PARENT emitted after each nested class's emit,
	built from the parent's own runtime ``__qualname__''.  Three things were
	wrong with that and are right here: it ran BEFORE the parent's own qualname
	was stamped, so a doubly-nested class read the short answer; it selected
	direct ClassDefAst children only, so a class under a class-body ``if'' got
	nothing; and it had to guard on the target still being a class, because it
	ran after the nested DECORATORS and ``@member'' on a nested enum class
	returns a marker with no holder.  Emitted here it precedes the decorator
	loop, which is also where CPython stamps it -- a decorator that returns
	something else never receives the qualname in CPython either."
	(CallAst ___qualnamePrefixBefore___: self) ifNotNil: [:prefix |
		aStream nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___classHolderAttrStore___: #''___qualname___'' put: '.
		self printQuotedString: prefix , '.' , name asString on: aStream.
		aStream nextPutAll: '.'; lf].

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
					match CPython by signalling AttributeError on assignment.
					The message is built at RAISE time, not baked in here: it
					names the owner (``property 'x' of 'C' object has no
					setter''), which the class body does not yet know.  It used
					to be an env-0 ``AttributeError signal:'' with a partial
					text, which reached Python as an AttributeError whose str()
					was EMPTY -- so test_property's message assertions could
					never pass.  ___raiseReadOnlyProperty___: is the same text
					AbstractPropertyDescriptor raises for the call form."
					propSetterSrc := def name , ': ___1' , lf2 ,
						'	^ self ___raiseReadOnlyProperty___: ''',
						def name , '''' ].
			self
				emitCompileMethodOn: self ___stVarName___
				source: propSetterSrc
				category: (isCached ifTrue: ['Grail-CachedProperty-Setter'] ifFalse: ['Grail-Property-ReadOnly'])
				env: 1
				classSide: false
				onStream: aStream.
		].
	].

	"Unhashable-by-class-body.  CPython clears tp_hash when the class is
	CREATED, so the cheapest faithful place to do it is here: a compiled
	raising __hash__ costs nothing at runtime, and every hash entry point
	(builtins hash:, PyDict >> hashFunction:, the set element gates) already
	routes through __hash__, so one emitted method covers them all.  See
	___unhashableByClassBody___ for exactly when it fires."
	self ___unhashableByClassBody___ ifTrue: [
		self
			emitCompileMethodOn: self ___stVarName___
			source: ('__hash__' , (String with: Character lf)
				, '	^ self ___raiseUnhashableType___')
			category: 'Grail-Unhashable'
			env: 1
			classSide: false
			onStream: aStream.
		"Also bind __hash__ = None as a class ATTRIBUTE, because that is
		literally what CPython's class dict holds and what reads it care about:
		collections.abc.Hashable is _check_methods, which walks the MRO and
		answers ``not hashable'' on a present-and-None __hash__.  With only the
		raising method, isinstance(x, Hashable) was True for an implicitly
		unhashable class while correctly False for an explicit
		``__hash__ = None'' -- which gets this attribute from the ordinary
		class-attribute machinery, so this just gives the implicit form the same
		shape.  The raising method above is what the hash SEND finds.

		This depends on object >> ___classChainAttrLookup___ resolving in MRO
		order.  Before that fix, binding this broke a SUBCLASS that restores a
		hash: the attribute walk ran ahead of the unbound-method wrap, so the
		subclass's own __hash__ def lost to the ancestor's stored None."
		aStream
			nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___classHolderAttrStore___: #''__hash__'' put: None.';
			lf].

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
			nextPutAll: self ___stVarName___;
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
		emitInstantiationMethodFor: self ___stVarName___
		initSelector: initSelector
		onStream: aStream.

	"Class-body METHOD decorators.  ``@deco def m'' rebinds m to deco(m); in
	CPython that happens while the class body executes, so the class dict only
	ever holds the wrapper.  Grail compiles the def to a real method first, so
	the decorator runs once the class exists and stores OVER the compiled
	method -- see FunctionDefAst >> printMethodDecoratorsOn:decorators:className:
	for why that store is visible and why it is definitional.

	Emitted here, after the methods are compiled but BEFORE the metaclass hook
	and the class decorators, because that is CPython's order: the class body
	is complete -- decorated methods included -- before either of them sees the
	class."
	"The names the class body binds as defs -- what a decorator may legally
	name as a SIBLING (``@t.register(int)'').  Computed once for the loop and
	handed to each def; see CallAst >> classBodyDecoratorScope."
	siblings := IdentitySet new.
	self ___allFunctionDefs___ do: [:d | siblings add: d name asSymbol].
	"EVERY def, not just the instance-side ones.  A @classmethod or
	@staticmethod can carry a further decorator -- ``@singledispatchmethod
	@staticmethod def t'' -- and iterating only instanceMethodDefs skipped it
	silently, so the outer decorator never ran.  applicableMethodDecorators
	already answers empty for the declarative decorators themselves, so a
	plain @classmethod / @staticmethod / @property def emits nothing here
	exactly as before."
	self ___allFunctionDefs___ do: [:def |
		| decos |
		decos := def applicableMethodDecorators.
		decos isEmpty ifFalse: [
			def
				printMethodDecoratorsOn: aStream
				decorators: decos
				className: self ___stVarName___
				siblingNames: siblings]].

	"``b = a'' where ``a'' is a sibling DEF must see the DECORATED def.  CPython
	guarantees it by applying a decorator at the def statement, so by the time
	the assignment runs ``a'' is already the decorated object.  Grail emits
	attribute VALUES in an earlier phase than method decorators, so such an
	alias captured the undecorated method -- ``b'' answered an UnboundMethod
	where ``a'' answered a functools.cached_property.

	Re-point the alias now that the decorators have run, and BEFORE the
	__set_name__ hook below, because being bound to two names is something the
	descriptor is entitled to object to: cached_property raises
	``Cannot assign the same cached_property to two different names'', which it
	can only do if both names actually hold it.

	Scoped to a BARE sibling-def name.  Any other RHS -- a call, a subscript, a
	module-level name -- keeps its original single evaluation, so this cannot
	re-run an expression with side effects.

	Read through ___pyAttrLoad___ rather than as a bare send: the decorator
	stores its result over the compiled method in the per-class attribute
	store, and a plain ``Cls name'' send looks for a compiled metaclass method
	that is not there."
	classAttrs do: [:pair |
		(pair value notNil
			and: [(pair value isKindOf: NameAst)
			and: [siblings includes: pair value id asSymbol]]) ifTrue: [
				aStream nextPutAll: self ___stVarName___; nextPutAll: ' '; nextPutAll: pair key;
					nextPutAll: ': ('; nextPutAll: self ___stVarName___;
					nextPutAll: ' @env1:___pyAttrLoad___: #''';
					nextPutAll: pair value id asString; nextPutAll: ''').'; lf]].

	"A SIBLING-METHOD alias (``__ne__ = __eq__'', ``wrapped = m'') is compiled
	as a delegating METHOD, for the reasons ___classBodyMethodAliases___ gives
	-- and a method is a DIFFERENT function object from the one it delegates
	to, where CPython simply binds the same object twice:

	    C.alias is C.m                     -- False here, True in CPython
	    C.__dict__['alias'] is C.__dict__['m']   -- likewise
	    C.alias.__name__                   -- 'alias' here, 'm' in CPython

	No error announced any of it; ``is'' just answered the wrong way, and
	pickling such a method by reference (functools.total_ordering does exactly
	this) cannot round-trip when the name does not resolve back to the same
	object.

	Bind the alias name in the per-class attribute store to the ORIGINAL's
	function object, which ___pyAttrLoad___ consults ahead of the method
	dictionary, so all three read as CPython does.  The compiled forwarder
	stays and is what keeps this fix free: operator dispatch does not go
	through attribute lookup at all -- ``a < b'' sends #__lt__: -- so it still
	finds a real method, which is the whole reason aliases are compiled.

	The holder is written DIRECTLY rather than through
	___classBodyDefinitionalStore___: an alias name has no accessor pair by
	construction (classBodyAttributes drops it), so the dispatch would have
	nothing to choose, and it would also re-enter the class-body namespace --
	which a metaclass may refuse a second binding for.

	Emitted after the method decorators for the same reason the attribute
	re-point above is: by CPython's order the aliased def is already whatever
	its decorators made of it.  (Decorated defs are excluded from method
	aliases and stay on the attribute path, so this loop and that one do not
	overlap.)"
	self ___classBodyMethodAliases___ do: [:assoc |
		aStream nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___classHolderAttrStore___: ''';
			nextPutAll: assoc key asString;
			nextPutAll: ''' put: ('; nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___pyAttrLoad___: #''';
			nextPutAll: assoc value name asString; nextPutAll: ''').'; lf].

	"Declaration order of EVERY class-body binding -- defs and assignments
	alike -- for the __set_name__ walk.

	The hook below is passed the class ATTRIBUTE names only, and that is
	deliberate: a metaclass such as ``Enum class'' turns exactly those into
	members, so adding def names there would make members of methods.  But
	__set_name__ must visit in true declaration order, and a decorated def is a
	binding too: with attribute names first and the unordered holder second, a
	descriptor bound to a decorated def AND a later alias reported its two names
	backwards -- ``('b' and 'a')'' where CPython says ``('a' and 'b')''.

	Emitted as a separate class-side method so the hook's own argument, and
	therefore Enum, is untouched.  Object >> ___invokeSetNameHooks___: consults
	it when present and falls back to the old two-store walk when it is not."
	[:orderNames :repeated |
	body body do: [:stmt |
		stmt ___boundTargetNames___ do: [:nm |
			(orderNames includes: nm)
				ifTrue: [(repeated includes: nm) ifFalse: [repeated add: nm]]
				ifFalse: [orderNames add: nm]]].
	orderNames isEmpty ifFalse: [
		| src |
		src := WriteStream on: String new.
		src nextPutAll: '___classBodyOrder___'; lf.
		src nextPutAll: '	^ #('.
		orderNames do: [:nm |
			src nextPutAll: ' #'''; nextPutAll: nm asString; nextPut: $'].
		src nextPutAll: ' )'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: src contents
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream].

	"Names the body binds MORE THAN ONCE, counting defs and assignments alike.

	CPython tracks this in _EnumDict.__setitem__ -- an enum class body may not
	reuse a name, however the two bindings are spelled:

	    red = 1 ... red = 4          # two assignments
	    red = 1 ... def red(self)    # assignment then def
	    @enum.property def red ... red = 1

	all three raise ``TypeError: 'red' already defined as 1''
	(test_duplicate_name_error).  Grail's class body cannot notice: each
	binding compiles to a store that simply overwrites the one before, so by
	the time the metaclass hook runs a single value is left and nothing
	records that there were two.

	Recorded for EVERY class because only codegen can see it, but acted on by
	nobody except Enum's ___grailBuildMembers:.  Rebinding a name in a class
	body is ordinary Python (``x = 1'' then ``x = f(x)'') and stays legal
	everywhere else -- CPython restricts it to enums for the same reason, the
	rule lives in _EnumDict rather than in type.__new__."
	repeated isEmpty ifFalse: [
		| src |
		src := WriteStream on: String new.
		src nextPutAll: '___classBodyDuplicates___'; lf.
		src nextPutAll: '	^ #('.
		repeated do: [:nm |
			src nextPutAll: ' #'''; nextPutAll: nm asString; nextPut: $'].
		src nextPutAll: ' )'.
		self
			emitCompileMethodOn: self ___stVarName___
			source: src contents
			category: 'Grail-Class Attrs'
			env: 1
			classSide: true
			onStream: aStream]]
		value: OrderedCollection new
		value: OrderedCollection new.

	"Metaclass post-population hook.  Send a class-side
	``___pyClassDefined___:`` to the freshly-populated class with its
	class-body attribute names (declaration order).  Dispatched through
	the class's metaclass: the default (object class) returns the class
	unchanged, but a metaclass such as ``Enum class`` overrides it to
	transform the body into members.  Emitted BEFORE decorators, so the
	metaclass runs first — mirroring Python's metaclass-then-decorator
	order."
	"CLOSURE CELLS, FIRST EMIT -- before the metaclass hook below.

	A method compiled into this class can RUN during class construction, not
	only afterwards: Enum's hook calls each member's __init__/__new__ while it
	builds the members.  With the cells stored only after the hook, such a
	method read a cell that did not exist yet --

	    def outer():
	        limit = 255
	        class E(Enum):
	            A = 1
	            def __init__(self, v): self.lim = limit

	raised ``free variable 'limit' referenced before assignment in enclosing
	scope'' -- test_enum's test_raise_custom_error_on_creation and
	test_init_exception, where the free variable is an exception CLASS the
	member __init__ raises.  PyEnumTypes worked around the self-name case alone
	by pre-storing ___cell_<Name>___ for super(); this fixes the general case.

	Repeated after the decorator loop (see below), because the self-name cell
	must end up holding the DECORATED class."
	self
		___emitClosureCellStoresOn: aStream
		className: self ___stVarName___
		saved: savedCapturedNames
		savedWrite: savedCapturedWriteNames.
	"``__classcell__'', injected at the END of the body exactly as CPython's
	compiler does, and only when a method actually referenced ``__class__'' or
	used a zero-arg ``super()''.  Emitted before the metaclass hook because the
	metaclass must SEE the cell -- passing it on to type.__new__ is the contract
	the protocol exists to express."
	CallAst classNeedsClassCell ifTrue: [
		aStream nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___grailInjectClassCell___.'; lf.
		"WHICH methods close over that cell, for ``m.__closure__''.  Compiled as
		a class-side table beside the doc / signature / annotation ones, because
		like them it describes the class body and has to survive to run time --
		and, like them, it is looked up along the superclass chain so an
		inherited method reports what it closed over where it was DEFINED."
		self emitMethodClassCellNamesOn: aStream].
	aStream nextPutAll: self ___stVarName___; nextPutAll: ' := '; nextPutAll: self ___stVarName___;
		nextPutAll: ' @env1:___pyClassDefined___: { '.
	self classBodyAttributes
		do: [:pair |
			aStream nextPutAll: '#'''; nextPutAll: pair key asString; nextPut: $']
		separatedBy: [aStream nextPutAll: '. '].
	aStream nextPutAll: ' }.'; lf.

	"The namespace is torn down by ___grailDispatchMetaclass___ below, which is
	the LAST class-construction step and so the last thing entitled to see it.
	It used to be dropped here, immediately after the metaclass hook; that
	cannot work now that a ``metaclass='' may re-bind the name to a NON-class
	(CPython lets __new__ return None or 0), because every send between here and
	the decorators would then be aimed at None."

	"CLASS KEYWORD ``boundary='': a Flag/IntFlag may override its family-default
	FlagBoundary (STRICT for Flag, KEEP for IntFlag) with
	``class E(Flag, boundary=CONFORM)''.  Emit a store onto the freshly-built
	class -- AFTER the metaclass hook (members exist) but BEFORE decorators, the
	same order CPython's EnumType.__new__ sets _boundary_ in.  The value
	expression (``enum.KEEP'' / ``CONFORM'') is evaluated in THIS enclosing scope,
	where those names resolve, exactly like a decorator.  Only enum metaclasses
	answer ___grailSetClassBoundary___:, so this is emitted solely for a
	``boundary'' keyword (never metaclass= et al.)."
	"The boundary value and the decorators below both evaluate in the scope
	ENCLOSING the class statement, so they are emitted under inDecoratorEmit --
	which suppresses NameAst's class-method closure-cell branch exactly as
	inBasesEmit does for base names.  Without it, ``@mark class C: ...'' inside a
	METHOD compiled ``mark'' as a ___classCell___ read nothing had stored and
	raised NameError for a temp the method could see perfectly well: the classdef
	is emitted inline there, and only method BODIES string-compile away from the
	enclosing temps."
	[ | savedDecoFlag |
	savedDecoFlag := CallAst inDecoratorEmit.
	CallAst inDecoratorEmit: true.
	[
	"PEP 487: type.__new__ finishes by calling
	``super(cls, cls).__init_subclass__(**kwds)'' on the class it just built, so
	a parent is told about each new subclass.  Emitted after the metaclass hook
	and before the decorators, which is where CPython fires it -- inside
	type.__new__, hence BEFORE EnumType.__new__ sets _boundary_ from a
	``boundary='' class keyword (the loop just below) and before any decorator
	sees the class.

	Sent to the class rather than folded into ___pyClassDefined___: for the same
	reason CPython puts it in type.__new__ rather than in a metaclass: every
	metaclass reaches it through super().__new__, so overriding that hook (as
	Enum class does, three times over) must not be able to lose it.

	The class KEYWORDS travel with it, which is what the protocol is mostly used
	for -- ``class Sub(Base, tag='x')'' reaches ``__init_subclass__(cls, tag)''.
	Two are withheld, the same two the loop below consumes: ``metaclass'', which
	CPython's class machinery takes for itself, and ``boundary'', which
	EnumType.__new__ declares as a named parameter and so never forwards.  Every
	other keyword is passed on, and object.__init_subclass__ rejects whatever no
	one in the chain accepted -- an unconsumed class keyword is a typo, and
	CPython says so rather than dropping it.

	Values are ordinary expressions in the scope ENCLOSING the class statement,
	so this sits inside the inDecoratorEmit guard alongside the boundary value
	and the decorators."
	aStream nextPutAll: self ___stVarName___; nextPutAll: ' @env1:___grailInitSubclass___: '.
	self printClassKeywordsDictOn: aStream.
	aStream nextPutAll: '.'; lf.

	keywords notNil ifTrue: [
		keywords do: [:kw |
			(kw name notNil and: [kw name asString = 'boundary']) ifTrue: [
				aStream nextPutAll: self ___stVarName___;
					nextPutAll: ' @env1:___grailSetClassBoundary___: ('.
				kw value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ').'; lf].
			"CLASS KEYWORD ``metaclass='': record it, so a metaclass-defined
			comparison can be found for ``A < B''.  See object >>
			___grailSetMetaclass___ for why it is a record, not a construction."
			(kw name notNil and: [kw name asString = 'metaclass']) ifTrue: [
				aStream nextPutAll: self ___stVarName___;
					nextPutAll: ' @env1:___grailSetMetaclass___: ('.
				kw value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ').'; lf]]].

	"RUN THE METACLASS.  Last of the class-construction steps and the one that
	can re-bind the name: CPython evaluates ``class A(metaclass=M)'' as
	``M(name, bases, ns)'', so M's __new__ decides what A is -- and is entitled
	to answer something that is not a class at all (test_super returns None,
	test_subclassinit returns 0).

	Placed AFTER __init_subclass__ and the class keywords rather than at the
	metaclass hook, so that every one of those still addresses the real class.
	Placed BEFORE the decorators because CPython runs the metaclass first, which
	is the same reason the ___pyClassDefined___ hook sits where it does.

	Answers the receiver untouched unless a ``metaclass='' overriding __new__ or
	__init__ is in effect, so an ordinary class pays one send."
	aStream nextPutAll: self ___stVarName___; nextPutAll: ' := '; nextPutAll: self ___stVarName___;
		nextPutAll: ' @env1:___grailDispatchMetaclass___.'; lf.

	"Bind the class cell on the FINISHED class.  The injection above only fires
	when a metaclass is watching -- there is no namespace to inject into
	otherwise -- so an ordinary class whose methods read ``__class__'' had no
	cell for ``m.__closure__'' to report.  Here rather than at the injection
	point because the cell must hold the class type.__new__ produced; BEFORE the
	decorator loop below because CPython's cell holds the UNDECORATED class,
	which is what the method bodies close over."
	CallAst classNeedsClassCell ifTrue: [
		"GUARDED on the result still being a class.  ___grailDispatchMetaclass___
		hands back whatever the metaclass __new__ returned, and a metaclass is
		entitled to return something that is not a class at all -- test_super's
		test___class___delayed returns None, test_subclassinit returns 0.  The
		unguarded send raised an UNCATCHABLE Smalltalk MessageNotUnderstood
		(``a NoneType class does not understand ___grailBindClassCell___''),
		turning a plain assertion failure into an ST error.

		``@env0:isBehavior'' rather than the obvious ``isKindOf: Behavior'', which
		cannot be used here: this is emitted into env-1 module code, where the
		name ``Behavior'' does not resolve (CompileError 1001, which scored the
		whole module IMPORTERROR on the first attempt).  isBehavior is an env-0
		predicate on Object, total over every receiver (``nil isBehavior'' and
		``3 isBehavior'' are both false), and names no global -- so the guard is
		exactly the bare send for every real class and a no-op for anything
		else."
		aStream nextPutAll: '(';
			nextPutAll: self ___stVarName___;
			nextPutAll: ' @env0:isBehavior) ifTrue: [';
			nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___grailBindClassCell___].'; lf].

	"Apply class decorators bottom-up.  Python's ``@A @B class C:``
	rebinds C to ``A(B(C))`` — the decorator closest to the class
	(B, last in source order) runs first, then its result is passed
	to the next one out (A).  Iterating decorator_list in REVERSE
	order yields that semantics: each iteration evaluates one
	decorator and re-assigns the result to the class name."
	decorator_list reverseDo: [:deco |
		aStream nextPutAll: self ___stVarName___; nextPutAll: ' := '.
		deco printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' value: { '; nextPutAll: self ___stVarName___; nextPutAll: ' } value: nil.'; lf.
	]
	] ensure: [CallAst inDecoratorEmit: (savedDecoFlag == true)]] value.
	"CLOSURE CELLS (second emit).  See ___emitClosureCellStoresOn:className:saved:savedWrite:
	-- the FIRST emit happens before the metaclass hook so a method that RUNS
	during class construction can read its cells; this one repeats the stores
	after the decorator loop so the self-name cell holds the FINAL, decorated
	class object.  Idempotent: the same blocks, and the captured sets are
	IdentitySets."
	self
		___emitClosureCellStoresOn: aStream
		className: self ___stVarName___
		saved: savedCapturedNames
		savedWrite: savedCapturedWriteNames.
	CallAst classCapturedNames: savedCapturedNames.
	CallAst classCapturedWriteNames: savedCapturedWriteNames.
	CallAst classNeedsClassCell: savedNeedsClassCell.
	CallAst classCellMethodNames: savedCellMethodNames.
	CallAst classCellRebindable: savedCellRebindable.

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
		"END OF THE BUILD, and it must come after the decorators: from here on a
		store on this class is post-definition mutation and belongs in the
		session overlay.  Paired with the ___grailBeginClassBuild___ emitted as
		the guard opens -- see object >> ___classAttrOverlayStore___ for why a
		REBUILD needs the mark that a first build gets from the registration
		ordering alone."
		aStream nextPutAll: self ___stVarName___;
			nextPutAll: ' @env1:___grailEndClassBuild___.'; lf.
		aStream
			nextPutAll: 'importlib @env0:___canonicalClassRegister___: '.
		self printQuotedString: self ___enclosingModuleName___ on: aStream.
		aStream nextPutAll: ' name: '.
		self printQuotedString: name asString on: aStream.
		aStream
			nextPutAll: ' value: '; nextPutAll: self ___stVarName___; nextPutAll: '.'; lf;
			nextPutAll: '].'; lf.
		"OUTSIDE the guard (runs on both cold build and warm probe hit): drop
		this class's stale session-local attr overlay, then bind the class
		into the module instance."
		aStream
			nextPutAll: 'importlib @env0:___resetClassAttrOverlay___: ';
			nextPutAll: self ___stVarName___; nextPutAll: '.'; lf.
	].
	"The module BINDING closes the block, so it runs for the
	global-declared case too -- where no canonical guard was opened."
	(self ___bindsClassNameToModule___) ifTrue: [
		"NOT a bare ``self'': inside a user class METHOD self is the Python
		instance, not the module, so a method declaring ``global C'' would
		hang the class off the instance.  ___moduleStoreReceiverExpr___
		reaches the module singleton explicitly there."
		aStream
			nextPutAll: self ___moduleStoreReceiverExpr___;
			nextPutAll: ' @env0:dynamicInstVarAt: #''';
			nextPutAll: name;
			nextPutAll: ''' put: '; nextPutAll: self ___stVarName___;
			nextPutAll: '.] value.'; lf.
	] ifFalse: [
		"No module binding, but the block was still opened above to declare
		this body's codegen helper temps -- close it."
		self ___classBodyHelperTemps___ notEmpty ifTrue: [
			aStream nextPutAll: '] value.'; lf].
	].
%

category: 'Grail-code generation'
method: ClassDefAst
___classBodyHelperTemps___
	"The codegen HELPER temps (``___t_N'') that this class body's own scope
	allocated -- the chained-comparison operand caches and their kin, handed
	out by BlockAst >> allocateTemp to whatever node asked, which walks up to
	the nearest enclosing BlockAst and for a class-body expression that is the
	class body itself.

	They are genuine Smalltalk locals and never Python names, so unlike the
	body's Python bindings (which are class ATTRIBUTES, reached through
	accessors) they must be declared as temps wherever the body's statements
	land.  ClassDefAst inlines those statements into the enclosing method, so
	the declaration goes on the block that wraps the whole class emit.

	SORTED, not in Set order: a Set's enumeration order is not stable across
	platforms, and generated source that differs between Linux and Darwin
	makes every downstream diff unreadable."

	| vars |
	body ifNil: [^ #()].
	vars := body variables.
	vars ifNil: [^ #()].
	^ (vars select: [:each | each asString beginsWith: '___t_'])
		asSortedCollection: [:a :b | a asString <= b asString]
%

category: 'Grail-code generation'
method: ClassDefAst
___bindsClassNameToModule___
	"True when the class NAME must be stored into the module instance
	rather than into a Smalltalk temp of the enclosing scope.

	Two ways that happens.  The class def sits directly at module scope
	(isModuleScopeClassDef), or -- the case this predicate exists for --
	the name is declared ``global'' in the nearest enclosing scope:

	    def f():
	        global C
	        class C: pass       # binds the MODULE's C

	The nested path assumes the parser declared <name> as a Smalltalk
	temp via declareWrite.  For a global-declared name it correctly does
	NOT, so the bare assignment emitted there named an UNDEFINED SYMBOL
	and the whole method failed to compile -- surfacing as ``Grail could
	not compile this method (codegen gap)'' rather than as anything
	pointing at ``global''.

	This is deliberately SEPARATE from isModuleScopeClassDef, which also
	gates the canonical-class registry.  A function-local class is minted
	fresh per execution and must not enter that registry no matter where
	its name is bound."

	self isModuleScopeClassDef ifTrue: [^ true].
	CallAst moduleClassBeingCompiled ifNil: [^ false].
	^ self ___nearestEnclosingScopeDeclaresGlobal___: name asSymbol
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
		"``class M(type):'' -- a metaclass.  Rooted at type, the class that
		IS Python's ``type'' (Python.gs dictionary entry ``type'').

		This used to root at PythonInstance, and the reason it had to is worth
		keeping: there was no ``type'' OBJECT at all.  ``builtins >> type:''
		answers a canonical BoundMethod for any class, and nothing was bound to
		the NAME, so the bare name raised NameError and the definition never ran.
		PythonInstance at least made the class exist with its methods, which is
		what a metaclass-defined comparison needs.

		What the real base buys is ancestry: a metaclass now HAS ``type'' above
		it, so ``super().__new__(cls, name, bases, ns)'' has something to reach
		and ``issubclass(Meta, type)'' is true.  That second one is load-bearing
		beyond metaclasses -- object >> ___pyMetaclass___ deliberately declines
		to report a declared ``metaclass='' because copy() tests a class with
		``issubclass(type(x), type)'', which was false while Meta rooted at
		PythonInstance.  Rooting here is what makes reporting it safe.

		It does NOT by itself make class creation route through the metaclass;
		type carries no construction protocol yet.  See type's comment."
		((only isKindOf: NameAst) and: [only id asString = 'type'])
			ifTrue: [^ aStream nextPutAll: 'type'].
		"``class X(str):`` subclasses Unicode32, not the Unicode7 that the
		name ``str'' resolves to.  GemStone migrates a Unicode string to
		the canonical wider class IN PLACE when it is handed a character
		out of range, which silently stripped the Python subclass off any
		instance holding non-ASCII.  See importlib >>
		___widenStrBase___: for the measured migration table and why
		Unicode16 is not enough."
		((only isKindOf: NameAst) and: [only id asString = 'str'])
			ifTrue: [^ aStream nextPutAll: 'Unicode32'].
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
___redirectUnarySelectorIn: sourceString from: oldName to: newName
	"Rewrite the leading (unary) selector of a generated method source from
	oldName to newName, keeping the body verbatim.  Used to move a property
	deleter def off the plain name (which the getter owns) onto a private
	``___propDeleter_x'' selector.  A method compiled from ``def x(self)'' has
	no parameters after the stripped self, so its source begins with the bare
	selector token followed by whitespace/newline -- only that leading token is
	replaced."

	((sourceString size >= oldName size)
		and: [(sourceString copyFrom: 1 to: oldName size) = oldName])
		ifTrue: [
			^ newName , (sourceString copyFrom: oldName size + 1 to: sourceString size)].
	^ sourceString
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
		nextPutAll: ''''.
	"Inside a DOIT, hand the helper the doit's own scope.  These methods
	compile at RUNTIME against the user profile's symbol list, which an
	exec's SymbolDictionary is not on, so without this a method could not
	read a name from the source it was written in -- ``exec('x = 12; class
	C: ...')'' left every method that mentions x uncompilable, and the
	classdef survived only through the raising stub Grail installs for a
	method it cannot compile.  The handle ensureModuleScope: parks in the
	scope is what names it here; outside a doit there is no scope to pass
	and the plain two-keyword form stands."
	ModuleAst compilingDoitScope ifNotNil: [
		aStream nextPutAll: ' scope: ___pyGlobals___'].
	aStream nextPutAll: '.'; lf.
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
	content.

	A str subclass that defines its OWN ``__new__`` now falls through
	to the runtime allocator instead, exactly as the bytes-like path
	already did, so that constructor runs (markupsafe.Markup's
	``__html__`` detour, and any __new__ that sets attributes on the
	instance before returning it — test_bytes' StrWithBytes).  Only a
	subclass with no __new__ of its own takes the direct allocator
	shortcut above."

	| src lf |
	lf := Character lf asString.
	src := AppendStream on: Unicode7 new.
	src nextPutAll: 'value: ___pos___ value: ___kw___'; nextPutAll: lf.
	src nextPutAll: '| instance dynInit |'; nextPutAll: lf.
	((self firstBaseIsStr or: [self firstBaseIsBytesLike])
		and: [self definesOwnNew not])
		ifTrue: [
			self firstBaseIsStr
				ifTrue: [
					"str subclass: route through CharacterCollection>>__new__:
					(self-typed).  Forward a SECOND and THIRD positional to the
					``__new__:_:'' / ``__new__:_:_:'' arities -- ``str'' takes
					(object, encoding, errors), and passing only the first meant
					``S(b'x', 'ascii')'' silently stringified the bytes OBJECT
					instead of decoding it, yielding the 4 characters b'x'."
					src
						nextPutAll: 'instance := ___pos___ @env0:size @env0:= 0';
						nextPutAll: ' ifTrue: [self @env1:__new__: '''']';
						nextPutAll: ' ifFalse: [___pos___ @env0:size @env0:= 1';
						nextPutAll: ' ifTrue: [self @env1:__new__: (___pos___ @env0:at: 1)]';
						nextPutAll: ' ifFalse: [___pos___ @env0:size @env0:= 2';
						nextPutAll: ' ifTrue: [self @env1:__new__: (___pos___ @env0:at: 1) _: (___pos___ @env0:at: 2)]';
						nextPutAll: ' ifFalse: [self @env1:__new__: (___pos___ @env0:at: 1) _: (___pos___ @env0:at: 2) _: (___pos___ @env0:at: 3)]]].';
						nextPutAll: lf ]
				ifFalse: [
					"bytes/bytearray subclass: bytes>>__new__: is self-typed, so
					``C(arg)'' allocates a C carrying the content.  No positional ->
					the 0-arg __new__ (empty); do NOT pass '''' -- bytes __new__: with
					a str source is a ''string without encoding'' TypeError."
					initSelector isNil
						ifTrue: [
							"No user __init__: __new__ builds the content, so forward a
							SECOND and THIRD positional to the ``__new__:_:'' /
							``__new__:_:_:'' encode arities (``bytes'' takes source,
							encoding, errors).  Passing only the first meant
							``C(str, 'ascii')'' dropped the encoding and fell to the
							1-arg __bytes__/buffer path (test_bytes' BytesTest.test_custom:
							a bytes-subclass of a str carrying __bytes__ returned the
							__bytes__ payload instead of the encoded string)."
							src
								nextPutAll: 'instance := ___pos___ @env0:size @env0:= 0';
								nextPutAll: ' ifTrue: [self @env1:__new__]';
								nextPutAll: ' ifFalse: [___pos___ @env0:size @env0:= 1';
								nextPutAll: ' ifTrue: [self @env1:__new__: (___pos___ @env0:at: 1)]';
								nextPutAll: ' ifFalse: [___pos___ @env0:size @env0:= 2';
								nextPutAll: ' ifTrue: [self @env1:__new__: (___pos___ @env0:at: 1) _: (___pos___ @env0:at: 2)]';
								nextPutAll: ' ifFalse: [self @env1:__new__: (___pos___ @env0:at: 1) _: (___pos___ @env0:at: 2) _: (___pos___ @env0:at: 3)]]].';
								nextPutAll: lf ]
						ifFalse: [
							"A user __init__ owns the constructor positionals (they are
							ITS signature -- e.g. ``(newarg=1, *args)'' forwarding *args
							to bytearray.__init__, test_init_override), so __new__ must
							NOT read arg 2 as an encoding.  Allocate self-typed from the
							first positional (a mutable bytearray __init__ repopulates)
							and let __init__ run below."
							src
								nextPutAll: 'instance := (___pos___ @env0:size @env0:>= 1) ifTrue: [self @env1:__new__: (___pos___ @env0:at: 1)] ifFalse: [self @env1:__new__].';
								nextPutAll: lf ] ]
		]
		ifFalse: [(self firstBaseIsTuple and: [self definesOwnNew not])
			ifTrue: [
				"Tuple subclasses — route a single-positional construction
				through tuple's ``__new__:`` so the iterable populates the
				instance (matches CPython's ``tuple(iterable)`` semantics).
				Used by jinja2's ``OptionalLStrip`` factory which builds a
				marker tuple from an iterable.  Empty positional yields
				the empty-tuple fast path.  A subclass that defines its OWN
				__new__ falls through to the runtime allocator below so that
				__new__ runs with all args (test_keywords_in_subclass's
				subclass_with_new)."
				src
					nextPutAll: 'instance := ___pos___ @env0:size @env0:= 0 ifTrue: [self @env0:new] ifFalse: [self @env1:__new__: (___pos___ @env0:at: 1)].';
					nextPutAll: lf.
				"tuple.__new__ takes no keyword arguments; a plain subclass
				(no own __new__/__init__ to consume them) must reject them
				(test_keywords_in_subclass)."
				(initSelector isNil and: [self definesOwnNew not]) ifTrue: [
					src
						nextPutAll: '((___kw___ @env0:notNil) @env0:and: [___kw___ @env0:notEmpty]) ifTrue: [TypeError ___signal___: ''tuple() takes no keyword arguments''].';
						nextPutAll: lf]
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
					src nextPutAll: 'instance := self @env1:___allocateInstance___: ___pos___ kw: ___kw___.'; nextPutAll: lf.
					"A subclass of a built-in COLLECTION (list, ...) with no
					__init__ of its own inherits population from the built-in
					__init__.  Detected at RUNTIME (isKindOf) so DYNAMIC bases --
					``class T(self.type2test)'' (list_tests test_getitemoverwriteiter)
					-- work too, unlike the static firstBaseIsX paths above.
					``new:'' says whether the class defined its own __new__;
					CPython then makes the inherited __init__ lenient about the
					args __new__ already consumed (test_keywords_in_subclass's
					subclass_with_new)."
					initSelector isNil ifTrue: [
						src
							nextPutAll: 'instance @env1:___pyBuiltinSubclassInit___: ___pos___ kw: ___kw___ new: ';
							nextPutAll: (self definesOwnNew ifTrue: ['true'] ifFalse: ['false']);
							nextPutAll: '.'; nextPutAll: lf]]]].
	"Descriptor-bound __init__ override: a setattr-installed
	``cls.__init__ = synth_fn'' lands in the class''s ___dynInstVars___
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
	single quotes by doubling them.

	Build the whole literal in a LOCAL buffer and write it with a single
	nextPutAll:, NOT character-by-character onto aStream: aStream is a
	PrettyWriteStream whose nextPut: inserts indentCount tabs after every
	linefeed.  Writing char-by-char splices that indentation into any newline
	EMBEDDED in the literal -- e.g. a compiled method's source carrying a Python
	string constant like ``''a\nb''`` verbatim -- corrupting the value by one tab
	per nesting level when the class is defined inside try/for/if/... (test_iter
	test_writelines: a class whose __next__ returns ``str(i) + '\n''' inside a
	try block wrote ``\n\t'' instead of ``\n'').  nextPutAll: applies the
	line-start indent once, up front, then copies the content verbatim."

	| buf |
	buf := WriteStream on: (Unicode7 new: aString size + 2).
	buf nextPut: $'.
	aString do: [:c |
		c = $'
			ifTrue: [buf nextPut: $'; nextPut: $']
			ifFalse: [buf nextPut: c].
	].
	buf nextPut: $'.
	aStream nextPutAll: buf contents.
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___unhashableByClassBody___
	"True when CPython would give this class NO hash, which it decides at class
	creation (type_new clears tp_hash) rather than at hash time.

	Two cases, and CPython treats them identically:

	  * EXPLICIT -- the body assigns ``__hash__ = None''.  This is how a class
	    opts out, and how CPython's own list/dict/set do it.
	  * IMPLICIT -- the body supplies __eq__ and no __hash__ at all.  Redefining
	    equality without redefining hash would leave an inherited hash that no
	    longer agrees with it, so CPython refuses to guess and makes the class
	    unhashable.  This is the case that surprises people, and it is the one
	    Grail was silently getting wrong: such a class kept object's IDENTITY
	    hash, so two equal instances hashed differently and a dict happily held
	    both.

	Either way an explicit __hash__ -- def or a non-None assignment -- wins and
	nothing is emitted, so a class that defines both keeps its own hash.

	Applies only to classes compiled from a Python class BODY.  Grail's
	hand-written Smalltalk classes are not affected: BaseException, for one,
	defines __eq__ and must stay hashable (CPython exceptions are)."

	| hashAttr namesAssigned |
	(self ___classBodyDefines___: #'__hash__') ifTrue: [^ false].
	"``__hash__ = some_sibling_method'' is a real hash function.  It does NOT
	appear in classBodyAttributes -- that deliberately excludes sibling-method
	aliases, which are compiled as delegating METHODS instead -- so without this
	check the implicit rule below fired and the emitted raising __hash__
	overwrote the alias."
	((self ___classBodyMethodAliases___
		detect: [:a | a key == #'__hash__']
		ifNone: [nil]) notNil) ifTrue: [^ false].
	namesAssigned := self classBodyAttributes.
	hashAttr := namesAssigned
		detect: [:p | p key == #'__hash__']
		ifNone: [nil].
	hashAttr notNil ifTrue: [
		"``__hash__ = None'' opts out; ``__hash__ = anything_else'' is a real
		hash function and must not be overwritten."
		^ (hashAttr value isKindOf: ConstantAst) and: [hashAttr value value isNil]].
	"No __hash__ in the body at all -- unhashable iff __eq__ is there, whether
	as a def or as an assignment (CPython only asks whether the name is in the
	class namespace)."
	(self ___classBodyDefines___: #'__eq__') ifTrue: [^ true].
	^ (namesAssigned detect: [:p | p key == #'__eq__'] ifNone: [nil]) notNil
%

category: 'Grail-code generation'
method: ClassDefAst
___classBodyDefines___: aSelector
	"True when the class body has a ``def'' for aSelector.  Selects on
	FunctionDefAst, so it covers the re-classed forms too -- a @staticmethod /
	@classmethod / @property __hash__ or __eq__ is still that name in the class
	namespace, which is all CPython's rule asks about.  (``methodDefs'' is a
	temp of the emit method, not an instVar, so this cannot use it.)"

	^ self ___allFunctionDefs___ anySatisfy: [:d | d name asSymbol == aSelector]
%

category: 'Grail-code generation'
method: ClassDefAst
___allFunctionDefs___
	"Every function def in the class body, whichever subclass the parser
	re-classed it into -- methodDefs holds only the plain instance methods, so
	a @staticmethod/@classmethod/@property __hash__ or __eq__ would be missed."

	^ body body select: [:stmt | stmt isKindOf: FunctionDefAst]
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodClassCellNamesOn: aStream
	"Compile a class-side ``___methodClassCellNames___'' -- the class-body defs
	that closed over the class cell.  Emitted only for a class that injected a
	cell at all, so a class whose methods never ask carries no table and
	UnboundMethod >> __closure__ answers None without walking anything."

	| names src |
	names := CallAst classCellMethodNames.
	(names == nil or: [names isEmpty]) ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___methodClassCellNames___
	^ #( '.
	names asSortedCollection do: [:each |
		src nextPutAll: '#'''; nextPutAll: each asString; nextPutAll: ''' '].
	src nextPutAll: ')'.
	self
		emitCompileMethodOn: self ___stVarName___
		source: src contents
		category: 'Grail-Class Attrs'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
___emitClosureCellStoresOn: aStream className: clsName saved: savedCapturedNames savedWrite: savedCapturedWriteNames
	"Emit the per-class closure-cell stores.  Factored out because it runs
	TWICE per classdef: once before the metaclass hook, so a method that runs
	DURING class construction can read its cells, and once after the decorator
	loop, so the self-name cell holds the final decorated class.  Both call
	sites are in printSmalltalkRuntimeOn:."

	"READER CELLS: store every enclosing-function local the class's
	method bodies referenced (NameAst emitted ___classCell___ reads for
	them) onto the class's per-class dynamic attrs.
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
					nextPutAll: clsName;
					nextPutAll: ' @env1:___pyAttrStore___: #''___cell_';
					nextPutAll: cap asString;
					nextPutAll: '___'' put: ['.
				"The store's VALUE is `cap` read in THIS classdef's enclosing
				scope.  If that scope is a class METHOD where `cap` is itself a
				free variable (an enclosing-function local reached past an
				intervening class), the method cannot name the outer temp -- it
				must read its OWN closure cell, and the enclosing class must
				forward `cap` in turn.  Register `cap` on the enclosing class's
				captured set (savedCapturedNames) so its own classdef emits the
				next forward; the recursion terminates at the scope that binds
				`cap` as a real temp, where the bare name is emitted.  Otherwise
				`cap` is a reachable temp here (the single-level case): bare."
				((self ___enclosingFunctionLocalBeyondClass___: cap asSymbol)
					and: [savedCapturedNames notNil])
					ifTrue: [
						aStream
							nextPutAll: 'self @env1:___classCell___: #''___cell_';
							nextPutAll: cap asString;
							nextPutAll: '___'''.
						savedCapturedNames add: cap asSymbol]
					ifFalse: [aStream
						nextPutAll: (self ___enclosingScopeIdentifierFor___: cap asSymbol)].
				aStream nextPutAll: '].'; lf]].
	"SETTER CELLS: for every enclosing-function local a method body ASSIGNS
	(``nonlocal x; x = ...''), store a one-arg block that writes the binding
	BY REFERENCE, so the mutation reaches the enclosing scope (a method
	string-compiles with no lexical link to the outer temp, so it cannot
	assign it directly -- test_dict test_str_nonstr's Key3.__eq__ doing
	``nonlocal eq_count; eq_count += 1'').  Same enclosing-scope resolution as
	the reader above: bare temp at the binding scope, else forward through the
	enclosing method's own setter cell (registering on the enclosing class)."
	(CallAst classCapturedWriteNames notNil and: [CallAst classCapturedWriteNames notEmpty])
		ifTrue: [
			CallAst classCapturedWriteNames do: [:cap |
				aStream
					nextPutAll: clsName;
					nextPutAll: ' @env1:___pyAttrStore___: #''___cellSetter_';
					nextPutAll: cap asString;
					nextPutAll: '___'' put: [:___cellSetVal___ | '.
				((self ___enclosingFunctionLocalBeyondClass___: cap asSymbol)
					and: [savedCapturedWriteNames notNil])
					ifTrue: [
						aStream
							nextPutAll: '(self @env1:___classCellSetter___: #''___cellSetter_';
							nextPutAll: cap asString;
							nextPutAll: '___'') value: ___cellSetVal___].';
							lf.
						savedCapturedWriteNames add: cap asSymbol]
					ifFalse: [
						aStream
							nextPutAll: (self ___enclosingScopeIdentifierFor___: cap asSymbol);
							nextPutAll: ' := ___cellSetVal___].';
							lf]]].
%

category: 'Grail-code generation'
method: ClassDefAst
classBodyAttributes
	"Every class attribute the body declares, as an OrderedCollection of
	(Symbol -> ExpressionAst) associations in source order.  Used by codegen
	to materialize them (e.g. ``class Color: RED = 1``) as Smalltalk
	classInstVars + class-side accessor/setter pairs on the new class.

	The pairs come from the statements themselves, via
	classBodyAttributePairs -- see StatementAst for the protocol.  A chained
	``A = B = expr'' yields one entry per target, all pointing at the SAME
	value AST (emitted once below, the rest aliased); attribute and
	subscript targets declare nothing on the class and yield no entry."

	| pairs aliasNames nonlocals globals |
	"Sibling-method aliases (``__lt__ = __eq__'') are compiled as real
	delegating methods (see ___classBodyMethodAliases___), NOT materialized
	as class attributes -- exclude their names here."
	aliasNames := (self ___classBodyMethodAliases___ collect: [:a | a key]) asIdentitySet.
	"...and so is a SELF-alias of a def, ``plain = plain''.  That one is not in
	the collection above -- it must not become a delegating method, which would
	be ``plain ^ self plain'', an infinite recursion -- so it fell through to
	here and was materialized as a class ATTRIBUTE holding a receiver-less
	BoundMethod.  That attribute SHADOWS the compiled method, and calling it
	through an instance popped a receiver off an empty argument array:
	``NotAliases().plain()'' died with an OffsetError, an UNCATCHABLE Smalltalk
	error rather than a Python one.

	CPython makes the statement a pure no-op -- it reads the name the def just
	bound and binds it right back -- so declaring nothing is not an
	approximation, it is the whole meaning."
	aliasNames addAll: self ___classBodyDefSelfAliasNames___.
	"A name the body declared ``nonlocal'' names the ENCLOSING function's
	binding, so an assignment to it is not a class attribute at all -- CPython
	keeps it out of the class __dict__, which test_scope's testNonLocalClass
	asserts directly.  Grail bound it as an attribute AND left the enclosing
	variable untouched, so the statement was wrong in both directions; the
	write itself is emitted by emitClassBodyNonlocalWritesOn:."
	nonlocals := (body notNil and: [body nonlocalNames notNil])
		ifTrue: [body nonlocalNames]
		ifFalse: [#()].
	"A name the body declared ``global'' is the same story one scope further
	out: it names the MODULE binding, so an assignment to it is not a class
	attribute either.  ``class Global: global x; x = 13'' leaves Global with no
	``x'' at all -- test_scope's testScopeOfGlobalStmt reads it back through a
	method, which sees the module value.  Grail bound a class attribute AND
	left the module binding untouched, wrong in both directions.  The write
	itself is emitted by the global-write flush in printSmalltalkRuntimeOn:,
	interleaved with these attributes in SOURCE ORDER."
	globals := (body notNil and: [body globalNames notNil])
		ifTrue: [body globalNames]
		ifFalse: [#()].
	pairs := OrderedCollection new.
	"Each binding form says which attributes it yields; this method only
	applies the rule ClassDefAst owns -- drop the sibling-method aliases,
	which is cross-statement knowledge no single statement has.  A new
	binding form joins in by implementing classBodyAttributePairs; nothing
	here has to learn about it.  (``import x'' in a class body is exactly
	such a form: CPython binds x in the class NAMESPACE, so it becomes a
	class attribute like any assignment -- werkzeug's EnvironBuilder does
	that, then ``del json''.)"
	body body do: [:stmt |
		stmt classBodyAttributePairs do: [:pair |
			((aliasNames includes: pair key)
				or: [(nonlocals includes: pair key asSymbol)
				or: [globals includes: pair key asSymbol]])
					ifFalse: [pairs add: pair]]].
	^ pairs
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___docString___
	"The class's docstring node -- the leading bare string-literal statement
	of the class body, which CPython lifts into ``__doc__''.  Answer that
	ConstantAst, or nil when the body doesn't open with one.  Mirrors
	FunctionDefAst>>___docString___ (which returns the string value; here the
	NODE is wanted so it rides the class-attribute value emit, escaping and
	all).  Used to stamp ``__doc__'' so a class no longer inherits object's
	docstring through Object>>__doc__."

	| stmts first inner |
	body isNil ifTrue: [^ nil].
	stmts := body body.
	(stmts isNil or: [stmts isEmpty]) ifTrue: [^ nil].
	first := stmts at: 1.
	(first isKindOf: ExprAst) ifFalse: [^ nil].
	inner := first value.
	(inner isKindOf: ConstantAst) ifFalse: [^ nil].
	^ (inner value isKindOf: CharacterCollection)
		ifTrue: [inner]
		ifFalse: [nil]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyMethodAliases___
	"Class-body simple assignments that alias a SIBLING instance method --
	``__ne__ = __lt__ = __le__ = __gt__ = __ge__ = __eq__'' (test_heapq's
	CmpErr) or ``bar = foo''.  Answer an OrderedCollection of
	(aliasNameSymbol -> originalFunctionDefAst) in source order.

	Such an alias MUST become a real delegating method, not a class
	attribute: the class-attribute path stores a receiver-less BoundMethod
	that (1) is invisible to operator dispatch -- ``a < b'' sends #__lt__:,
	which resolves only to compiled methods, not to attributes -- and (2)
	mis-binds when read and called through an instance (OffsetError).
	Restricted to NON-varargs instance methods (the aliased selector arity
	must be known to emit the delegating header); @staticmethod /
	@classmethod and varargs defs are left on the class-attribute path."

	| defsByName aliases |
	defsByName := IdentityDictionary new.
	self instanceMethodDefs do: [:d |
		"A DECORATED def is not a plain method at runtime -- the decorator
		replaces it with an object, and ``b = a'' must bind THAT object, which is
		what CPython does because the decorator has already run by then.  A
		delegating method would call the undecorated compiled method instead, so
		``b'' answered an UnboundMethod where ``a'' answered a
		functools.cached_property.  Left on the class-attribute path, where the
		alias is re-pointed after the decorators run."
		(d compilesAsVarargs not and: [d applicableMethodDecorators isEmpty])
			ifTrue: [defsByName at: d name asSymbol put: d]].
	aliases := OrderedCollection new.
	body body do: [:stmt |
		((stmt isKindOf: AssignAst)
			and: [(stmt value isKindOf: NameAst)
			and: [stmt targets allSatisfy: [:t | t isKindOf: NameAst]]]) ifTrue: [
				| origDef |
				origDef := defsByName at: stmt value id asSymbol ifAbsent: [nil].
				origDef ifNotNil: [
					stmt targets do: [:t |
						"skip a self-alias, and a name that is itself a def (the
						real method wins)"
						((t id asSymbol == stmt value id asSymbol)
							or: [defsByName includesKey: t id asSymbol]) ifFalse: [
								aliases add: t id asSymbol -> origDef]]]]].
	^ aliases
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyDefSelfAliasNames___
	"The names a class body rebinds TO THEMSELVES where the name is already a
	def of that body -- ``plain = plain''.  Answer them as an IdentitySet.

	Deliberately separate from ___classBodyMethodAliases___, which excludes
	these: the delegating method that collection drives would be
	``plain ^ self plain'', an infinite recursion.  But excluding them there
	and nowhere else left them on the class-ATTRIBUTE path, where the stored
	receiver-less BoundMethod shadows the compiled method and mis-binds --
	see classBodyAttributes for the OffsetError that produced.

	CPython evaluates the right-hand side (the function the def bound moments
	ago) and binds it back under the same name, so the statement changes
	nothing; declaring no attribute for it is exact, not a shortcut.

	Every def kind counts -- @staticmethod and @classmethod bind a class-body
	name just as an instance def does, and a self-alias of one is the same
	no-op."

	| defNames result |
	defNames := IdentitySet new.
	self ___allFunctionDefs___ do: [:d | defNames add: d name asSymbol].
	result := IdentitySet new.
	body body do: [:stmt |
		((stmt isKindOf: AssignAst)
			and: [(stmt value isKindOf: NameAst)
			and: [stmt targets allSatisfy: [:t | t isKindOf: NameAst]]]) ifTrue: [
				stmt targets do: [:t |
					((t id asSymbol == stmt value id asSymbol)
						and: [defNames includes: t id asSymbol])
						ifTrue: [result add: t id asSymbol]]]].
	^ result
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___methodAliasSourceFor___: aliasName def: origDef
	"Source of an instance method that aliases origDef: the same (non-varargs)
	selector arity, delegating to origDef's selector with the same arguments.
	``__lt__ = __eq__'' with ``def __eq__(self, other)'' yields
	``__lt__: ___1'' / ``^ self __eq__: ___1''."

	| stream arity emitSel |
	stream := AppendStream on: Unicode7 new.
	arity := origDef instanceMethodArity.
	emitSel := [:sel |
		stream nextPutAll: sel asString.
		arity >= 1 ifTrue: [
			stream nextPutAll: ': ___1'.
			2 to: arity do: [:i | stream nextPutAll: ' _: ___'; nextPutAll: i printString]]].
	emitSel value: aliasName.
	stream nextPut: Character lf.
	stream nextPutAll: '^ self '.
	emitSel value: origDef name.
	^ stream contents
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

category: 'Grail-Class Compilation'
method: ClassDefAst
___isClassBodyAttributeAssign___: stmt
	"True for a class-body assignment ``<NestedClass>.attr = value'' -- a runtime
	mutation of a NESTED CLASS that CPython performs at class-definition time and
	Grail otherwise drops (test_property's PropertyUnreachableAttributeNoName does
	``cls.foo = property()'').

	Deliberately NARROW: only when the mutated object is a class defined in THIS
	class body.  A method-name target (``acreate_user.alters_data = True'',
	Django) is NOT a class-body value -- emitting it would resolve the method name
	to nothing and NameError -- so it stays dropped, as before.  Restricted to a
	single attribute target for the same reason (a plain, resolvable statement)."

	| tgt |
	(stmt isKindOf: AssignAst) ifFalse: [^ false].
	stmt targets size = 1 ifFalse: [^ false].
	tgt := stmt targets first.
	(tgt isKindOf: AttributeAst) ifFalse: [^ false].
	(tgt value isKindOf: NameAst) ifFalse: [^ false].
	^ self body body anySatisfy: [:s |
		(s isKindOf: ClassDefAst) and: [s name asString = tgt value id asString]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyGlobalTargetNames___: stmt
	"The bare-NAME targets of stmt that this class body declared ``global'',
	as ___classBodyNonlocalTargetNames___ does for ``nonlocal'' -- and for the
	same reason: such a statement assigns the MODULE binding rather than a
	class attribute, so it needs an emit of its own rather than the structural
	class-attribute compile.

	No assignability guard is needed, unlike the nonlocal case: that one has to
	prove Grail HAS a temp for the name in the enclosing scope, whereas a
	module binding is reached through the module instance (or, in a doit, the
	scope handle) and is always writable."

	| targets globals |
	globals := (body notNil and: [body globalNames notNil])
		ifTrue: [body globalNames]
		ifFalse: [^ #()].
	globals isEmpty ifTrue: [^ #()].
	targets := (stmt isKindOf: AssignAst)
		ifTrue: [stmt targets]
		ifFalse: [(stmt isKindOf: AugAssignAst)
			ifTrue: [Array with: stmt target]
			ifFalse: [^ #()]].
	^ (targets select: [:t |
		(t isKindOf: NameAst) and: [globals includes: t id asSymbol]])
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyOrderedRuntimeStatements___
	"The class-body statements that must be emitted AT THEIR OWN SOURCE
	POSITION, interleaved with the attribute stores rather than in a pass after
	them, as (sourcePosition -> statement) associations in body order.
	printSmalltalkRuntimeOn: flushes them.

	Position matters for every one of them because each can change what a LATER
	attribute value reads -- which a trailing pass, running once every attribute
	has been computed, cannot do:

	  * a ``global''-declared assignment (``global g; g = 2; y = g'' must leave
	    y == 2; with a trailing pass it answered 1, which is how this regressed
	    test_listcomps' test_explicit_global once already)
	  * an assignment through a SUBSCRIPT (``locals()['x'] = 43; y = x'', and
	    ``d = {}; d['a'] = 1; k = d['a']'' -- both statements Grail dropped
	    entirely, leaving the write undone and no error anywhere)
	  * ``del x'', which unbinds a name a later attribute may read
	  * an ``if'', and the try/for/while/with/augassign/bare-expression set
	    ___isClassBodyRuntimeStatement___: covers.  These ran in a trailing pass
	    until the loop that DEFINES a name met the attribute that READS it:

	        class Period(timedelta, Enum):
	            Period = vars()
	            for i in range(32):
	                Period['day_%d' % i] = i, 'day'
	            OneDay = day_1

	    ``OneDay = day_1'' was emitted before the loop it depends on, so the
	    name resolved through to the module and raised NameError (test_enum
	    TestSpecial.test_ignore).  The dynamic read was already in place and
	    correct -- what was wrong was WHEN it ran.

	CPython executes a class body top to bottom, once, so source order is not a
	refinement here but the algorithm.  The remaining pass that does NOT join
	this one is ___isClassBodyAttributeAssign___:, which requires an ATTRIBUTE
	target (``Inner.x = 1'') and must keep running after the nested classes it
	mutates are built."

	| result |
	result := OrderedCollection new.
	body ifNil: [^ result].
	body body doWithIndex: [:stmt :pos |
		((self ___classBodyGlobalTargetNames___: stmt) isEmpty not
			or: [(self ___isClassBodySubscriptAssign___: stmt)
			or: [(self ___isClassBodyDeleteStatement___: stmt)
			or: [(stmt isKindOf: IfAst)
			or: [(self ___isClassBodyNamespaceBinding___: stmt)
			or: [self ___isClassBodyRuntimeStatement___: stmt]]]]])
				ifTrue: [result add: pos -> stmt]].
	^ result
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___isClassBodyNamespaceBinding___: stmt
	"True for a class-body ``def'' or nested ``class'' -- the two body
	statements that BIND A NAME without producing a value.

	They join the source-order flush not to be emitted (each already has its
	own emission path -- a def compiles to a Smalltalk method, a nested class
	is built and stored through ___classHolderAttrStore___) but so the name
	can be offered to the prepared namespace AT ITS OWN POSITION.  CPython's
	class namespace holds a function object for every def in the body;
	Grail's held nothing for either, which is the gap
	docs/Class_Body_Namespace.md calls the load-bearing one.

	Both async spellings count: ``async def'' binds a name in a class body
	exactly as ``def'' does.  Including it is currently a NO-OP rather than a
	fix -- Grail does not compile a class-body ``async def'' to an attribute at
	all (``hasattr(K, 'coro')'' is false), so the bind finds nothing to offer
	the mapping and skips.  Listed anyway because the omission would be the
	wrong shape: when that separate gap closes, the binding is already right."

	^ (stmt isKindOf: FunctionDefAst)
		or: [(stmt isKindOf: AsyncFunctionDefAst)
		or: [stmt isKindOf: ClassDefAst]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___isClassBodySubscriptAssign___: stmt
	"True for a class-body assignment whose target is a SUBSCRIPT --
	``locals()['x'] = 43'', ``Period['month_0'] = i * 30''.

	Not a bare name, so it yields no classBodyAttributePairs, so the structural
	compile had nothing to emit and DROPPED the statement whole: even
	``class C: d = {}; d['a'] = 1'' left d empty, and the failure was silent.
	CPython runs it at class-definition time like any other body statement."

	(stmt isKindOf: AssignAst) ifFalse: [^ false].
	stmt targets size = 1 ifFalse: [^ false].
	^ stmt targets first isKindOf: SubscriptAst
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___isClassBodyDeleteStatement___: stmt
	"True for a class-body ``del'' this emit can honour.

	A bare-NAME target is routed to the class (DeleteAst reads
	classBodyRuntimeClass, which the flush sets), and two kinds of name are
	EXCLUDED -- each keeps today's behaviour, which is to be dropped:

	  * one the body declared ``global'' or ``nonlocal''.  That names another
	    scope's binding, so there is no class attribute to unbind and it needs
	    the enclosing-scope emit instead.
	  * one the body binds with a ``def'' or a nested ``class''.  Grail compiles
	    those to real Smalltalk METHODS, and a sibling assignment referring to
	    one compiles to a BoundMethod naming its SELECTOR -- so removing the
	    method to honour the delete would break the alias that the delete is
	    normally there to leave behind.  Flask's NullSession is exactly that
	    shape (``def _fail'', then ``__setitem__ = ... = _fail'', then ``del
	    _fail''), and honouring the statement there broke every Flask test.
	    CPython has no such coupling: the assignment captured the function
	    object, so unbinding the name costs it nothing.

	Subscript and attribute targets carry their own receiver, so they need no
	exclusion and simply emit as they would anywhere else."

	(stmt isKindOf: DeleteAst) ifFalse: [^ false].
	stmt targets isEmpty ifTrue: [^ false].
	^ stmt targets allSatisfy: [:t |
		(t isKindOf: NameAst)
			ifTrue: [(self ___classBodyDeclaresElsewhere___: t id asSymbol) not
				and: [(self ___classBodyBindsAsDefinition___: t id asSymbol) not]]
			ifFalse: [(t isKindOf: SubscriptAst) or: [t isKindOf: AttributeAst]]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyBindsAsDefinition___: aSymbol
	"True when this class body binds aSymbol with a ``def'' or a nested
	``class'' -- a binding that compiles to a Smalltalk method or a per-class
	holder entry other class-body expressions may name by SELECTOR, rather than
	to a value a delete can simply take away."

	body ifNil: [^ false].
	^ body body anySatisfy: [:stmt |
		((stmt isKindOf: FunctionDefAst) or: [stmt isKindOf: ClassDefAst])
			and: [stmt name notNil
			and: [stmt name asString = aSymbol asString]]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyDeclaresElsewhere___: aSymbol
	"True when this class body declared aSymbol ``global'' or ``nonlocal'' --
	either way the name belongs to an enclosing scope rather than to the class
	namespace."

	body ifNil: [^ false].
	(body globalNames notNil and: [body globalNames includes: aSymbol])
		ifTrue: [^ true].
	^ body nonlocalNames notNil and: [body nonlocalNames includes: aSymbol]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyCanBindDynamically___
	"True when this class body can bind a name that NO statement in it names --
	that is, when it calls locals() or vars(), whose answer is a live
	ClassBodyLocals that ``locals()['x'] = 43'' writes through.

	It is what CallAst classBodyDynamicLocals carries, and through that what
	decides whether a class-body name read pays for a runtime probe of the
	class's own dynamically-bound names before resolving statically.  Grail's
	static resolution is exact for a body whose bindings are all statements, so
	the probe would be pure cost everywhere else.

	The evidence is the scope's MENTION set rather than a walk for the call, so
	it over-approximates: a nested method's own locals() call is accumulated
	outward into the class body's reads and trips this too.  That direction is
	deliberate.  Over-triggering costs one nil probe per class-body read and
	changes no answer; under-triggering would silently lose a binding."

	| reads |
	body ifNil: [^ false].
	reads := body reads.
	reads ifNil: [^ false].
	^ (reads includes: #'locals') or: [reads includes: #'vars']
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classCellIsRebindable___
	"Does anything inside this class rebind its ``__class__'' cell?

	True when the subtree contains a class body declaring ``nonlocal
	__class__'' -- the one construct that can make a method's ``__class__''
	differ from the class itself:

	    class Host:
	        def m(self):
	            class X:
	                nonlocal __class__
	                __class__ = 42     # Host's methods now read 42

	Answered by a SUBTREE WALK, before any method source is generated, because
	the answer has to be known when the FIRST method is emitted and the write
	that reveals it may sit in the last.  Over-approximates on purpose: it does
	not check that a FUNCTION separates the inner class body from this one (the
	condition under which the nonlocal actually targets THIS class's cell).  A
	false positive costs one extra send per ``__class__'' read in this class
	and changes no answer; a false negative would silently drop a binding.

	The corpus-wide cost is nil -- no module outside test_super contains the
	construct, so every other class emits exactly what it emitted before.

	Also true when a METHOD declares it, which is the OTHER construct that can
	move the cell:

	    class X:
	        def f(self):
	            nonlocal __class__
	            del __class__      # X's methods now read nothing at all

	A method reaches the same shared cell the nested class body does -- it
	writes or empties it for every method of the class, not just its own frame
	-- so the reads have to consult the cell for this shape too.  Only a def
	that DECLARES the name nonlocal counts: a bare ``__class__'' inside a method
	is an ordinary lexical read and is exactly the case this predicate exists to
	keep cheap."

	body ifNil: [^ false].
	^ body ___anyDescendantSatisfies___: [:n |
		((n isKindOf: ClassDefAst)
			and: [n ___classBodyDeclaresNonlocal___: #'__class__'])
		or: [(n isKindOf: FunctionDefAst)
			and: [n body notNil
			and: [n body nonlocalNames notNil
			and: [n body nonlocalNames includes: #'__class__']]]]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyDeclaresNonlocal___: aSymbol
	"True when THIS class body declared aSymbol ``nonlocal''."

	body ifNil: [^ false].
	^ body nonlocalNames notNil and: [body nonlocalNames includes: aSymbol]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___nonlocalTargetIsAssignableHere___: aSymbol
	"True when aSymbol is a plain assignable Smalltalk temp in the scope this
	classdef is being emitted into, so ``aSymbol := value'' compiles there.

	A ``nonlocal'' declaration only says the name is not local to the class
	body; it does not guarantee Grail HAS a temp for it.  ``__class__'' is the
	counter-example that matters -- CPython gives every method an implicit
	__class__ closure cell, so

	    class X:
	        nonlocal __class__
	        __class__ = 42

	is legal there and Grail has no such temp, making the emitted
	``__class__ := 42'' a CompileError 1001 that takes the whole enclosing
	method down (test_super's test_various___class___pathologies, which went
	from a plain assertion failure to a codegen-gap stub when the write was
	emitted unconditionally).

	Tested the same way the closure-cell writer is: render the name through
	NameAst at the emission point and require it to come back as the bare
	identifier.  Anything else -- Smalltalk ``self'', a ___classCell___ read, a
	module attribute load -- is not an assignable variable.  Failing the test
	the statement stays dropped, which is what it was before; the name is still
	excluded from the class attributes, so the CPython-visible
	``__class__ not in X.__dict__'' half keeps holding."

	^ CallAst ___freeVariableIsAssignableTemp___: aSymbol parent: self parent
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___emitNonlocalClassCellWrite___: stmt on: aStream
	"Emit ``nonlocal __class__; __class__ = v'' as a write to the ENCLOSING
	class's cell.

	CPython's ``__class__'' is a closure cell that every method of the class
	shares, so the write is visible to all of them -- not a local rebinding.
	Grail has no assignable ``__class__'' temp (___nonlocalTargetIsAssignableHere___
	refuses it for exactly that reason), so the write goes to the cell the class
	carries and the reads are compiled to consult it: see
	___classCellIsRebindable___, which is what turns those reads on for this
	class and only this class.

	Silently drops the write when there is NO enclosing class -- a class body at
	module scope, or one nested directly in another class body.  There is no
	cell to write in either case, and dropping is what happened before."

	| valueAst |
	valueAst := self ___assignedValueAstOf___: stmt.
	valueAst ifNil: [^ self].
	aStream nextPutAll: '('.
	(CallAst printEnclosingClassOn: aStream) ifFalse: [
		"Rewind is not possible on a WriteStream, so the guard has to run before
		anything meaningful is written -- the open paren is harmless filler that
		the ``nil'' below closes into a complete statement."
		aStream nextPutAll: 'nil).'; lf.
		^ self].
	aStream nextPutAll: ') @env1:___grailSetClassCell___: '.
	valueAst printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: '.'; lf
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___assignedValueAstOf___: stmt
	"The value expression of a simple assignment / annotated assignment, or nil
	for anything else.  Mirrors the two statement shapes
	___classBodyNonlocalTargetNames___ recognises."

	(stmt isKindOf: AssignAst) ifTrue: [^ stmt value].
	(stmt isKindOf: AnnAssignAst) ifTrue: [^ stmt value].
	^ nil
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyNonlocalTargetNames___: stmt
	"The bare-NAME targets of stmt that this class body declared ``nonlocal'',
	or an empty collection when there are none.

	Such a statement assigns the ENCLOSING function's binding rather than a
	class attribute, so it needs the enclosing-scope emit rather than the
	structural class-attribute compile -- see the third body pass in
	printSmalltalkRuntimeOn:.

	Handles the two forms that can carry a bare-name target: ``x = v'' and
	``x += v''.  An AugAssignAst is the one that made the gap visible, since it
	implements neither ___boundTargetNames___ nor classBodyAttributePairs and so
	is invisible to every other class-body scan; the plain-assign case was
	worse than invisible, binding a class attribute of the same name."

	| targets nonlocals |
	nonlocals := (body notNil and: [body nonlocalNames notNil])
		ifTrue: [body nonlocalNames]
		ifFalse: [^ #()].
	nonlocals isEmpty ifTrue: [^ #()].
	targets := (stmt isKindOf: AssignAst)
		ifTrue: [stmt targets]
		ifFalse: [(stmt isKindOf: AugAssignAst)
			ifTrue: [Array with: stmt target]
			ifFalse: [^ #()]].
	^ (targets select: [:t |
		(t isKindOf: NameAst) and: [nonlocals includes: t id asSymbol]])
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___isClassBodyRuntimeStatement___: aStatement
	"True for a class-body statement that carries no classBodyAttributePairs
	of its own but that CPython still EXECUTES at class-definition time, so
	whatever it binds becomes a class attribute.

	``if'' is deliberately NOT here: it has its own emit
	(emitClassBodyIf:on:), which only honours the binding forms it knows.
	These four are emitted verbatim instead -- re-deriving try/except/finally
	and loop codegen would duplicate it."

	"A body-level AUGMENTED ASSIGNMENT to a bare name joins them.  ``x += 1''
	rebinds the class attribute, so CPython leaves ``class C: x = 1; x += 1''
	with C.x == 2 -- but an AugAssignAst yields no classBodyAttributePairs, so
	the structural compile had nothing to emit and dropped the statement whole,
	leaving C.x == 1 and reporting nothing.  Emitted verbatim here instead, with
	AugAssignAst's class-body branch turning it into a read-modify-write through
	___classBodyDefinitionalStore___:put:.

	A target the body declared ``nonlocal'' is excluded: that one binds the
	ENCLOSING function's variable, not a class attribute, and has its own
	enclosing-scope emit (___classBodyNonlocalTargetNames___:).  Without the
	exclusion it would be emitted twice, once per pass, and the increment would
	be applied to both the class and the outer binding."
	((aStatement isKindOf: AugAssignAst)
		and: [aStatement target isKindOf: NameAst]) ifTrue: [
			^ (self ___classBodyNonlocalTargetNames___: aStatement) isEmpty].
	"A bare EXPRESSION statement joins them for the same reason.  CPython
	executes one at class-definition time -- it is how a class body calls
	``vars().update({...})'' to define members computed at runtime (test_enum's
	test_dynamic_members_with_static_methods) -- but it binds no name, so it
	carried no classBodyAttributePairs and the structural compile dropped it
	whole.  A class-body ``print(...)'' produced no output and no error either.

	The DOCSTRING is excluded: the leading bare string literal is not an
	expression CPython evaluates for effect, it is lifted into __doc__, and
	___docString___ already emits it as a class attribute.  Every other pure
	constant is excluded with it, since evaluating one can have no effect."
	(aStatement isKindOf: ExprAst) ifTrue: [
		^ (aStatement value isKindOf: ConstantAst) not].
	^ (aStatement isKindOf: TryAst)
		or: [(aStatement isKindOf: ForAst)
		or: [(aStatement isKindOf: WhileAst)
		or: [aStatement isKindOf: WithAst]]]
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
	"One branch of a class-body ``if'': simple NAME = value assignments and
	``def''s become class-attribute stores on the class temp; nested ifs
	recurse; loops, try, with and non-name assignment targets are emitted
	verbatim under the class-body runtime class.

	The stores go through ___classBodyDefinitionalStore___, which picks
	between the accessor pair and the ___dynInstVars___ holder at runtime -- a
	conditional binding cannot know at emit time which home the name has.
	NOT ___pyAttrStore___, which would dispatch the same way but divert to
	the session overlay for a canonically-registered class; see the
	nested-class emit in printSmalltalkRuntimeOn: for why that is not
	cosmetic.  ___pyAttrStore___ is what these used to be, and the
	consequence was that a class-body ``if'' binding survived the first
	import of a module and vanished from every later one."

	(aSuite isNil or: [aSuite body isNil]) ifTrue: [^ self].
	aSuite body do: [:stmt |
		(stmt isKindOf: IfAst) ifTrue: [
			self emitClassBodyIf: stmt on: aStream].
		"A try/for/while/with INSIDE an if branch: same verbatim emit the
		top-level ones get, so ``if flag: try: x = 1'' binds x like every
		other class-body path rather than silently dropping the statement."
		(self ___isClassBodyRuntimeStatement___: stmt) ifTrue: [
			| savedRuntimeClass |
			savedRuntimeClass := CallAst classBodyRuntimeClass.
			CallAst classBodyRuntimeClass: name.
			[stmt printSmalltalkOn: aStream]
				ensure: [CallAst classBodyRuntimeClass: savedRuntimeClass].
			aStream lf].
		(stmt isKindOf: FunctionDefAst) ifTrue: [
			self emitClassBodyIfDef: stmt on: aStream].
		((stmt isKindOf: AssignAst)
			and: [stmt targets allSatisfy: [:t | t isKindOf: NameAst]]) ifTrue: [
			stmt targets do: [:t |
				aStream nextPutAll: self ___stVarName___;
					nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
					nextPutAll: t id asString;
					nextPutAll: ''' put: '.
				stmt value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '.'; lf]].
		"An assignment whose target is NOT a plain name -- ``p, q = 5, 6'',
		``obj.attr = v'', ``d[k] = v'' -- was DROPPED here, silently: no error,
		and the binding simply never happened, so a later statement in the same
		branch raised NameError naming a variable the reader can see being
		assigned two lines up.  Emitted verbatim under the class-body runtime
		class, exactly as a for / while / try / with in the same branch is, so
		it reaches AssignAst's own unpacking emit and each name is stored where
		NameAst reads it from."
		((stmt isKindOf: AssignAst)
			and: [(stmt targets allSatisfy: [:t | t isKindOf: NameAst]) not]) ifTrue: [
			| savedRuntimeClass |
			savedRuntimeClass := CallAst classBodyRuntimeClass.
			CallAst classBodyRuntimeClass: name.
			[stmt printSmalltalkOn: aStream]
				ensure: [CallAst classBodyRuntimeClass: savedRuntimeClass].
			aStream lf].
		((stmt isKindOf: AnnAssignAst)
			and: [(stmt target isKindOf: NameAst) and: [stmt value notNil]]) ifTrue: [
			aStream nextPutAll: self ___stVarName___;
				nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
				nextPutAll: stmt target id asString;
				nextPutAll: ''' put: '.
			stmt value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: '.'; lf]]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
emitClassBodyIfDef: aDef on: aStream
	"A ``def'' inside a class-body ``if'' branch.  It cannot be compiled as
	a Smalltalk METHOD the way an unconditional class-body def is: whether
	it exists at all is a runtime fact, and both branches of the same if
	would otherwise install the same selector with the last emit winning.

	So emit it as a VALUE -- the nested-def block form -- into a bracketed
	scope whose block temp gives FunctionDefAst >> printSmalltalkOn: the
	``<name> := ...'' target it expects (and gives its decorator chain the
	same target to rebind), then store the result as a class attribute.  A
	plain function stored there binds the receiver on an instance read and
	comes back raw on a class read, which is exactly what CPython does with
	a function in a class namespace.

	@staticmethod / @classmethod reach here re-classed by the parser rather
	than carrying a runtime decorator, so the wrapper that would otherwise
	have been applied structurally is applied here instead -- PyStaticMethod
	suppresses the receiver bind, PyClassMethod redirects it to the owner."

	| fname wrapper savedValueDefNode |
	fname := aDef name asString.
	wrapper := (aDef isKindOf: StaticFunctionDefAst)
		ifTrue: ['PyStaticMethod']
		ifFalse: [(aDef isKindOf: ClassFunctionDefAst)
			ifTrue: ['PyClassMethod']
			ifFalse: [nil]].
	aStream nextPutAll: '[ | '; nextPutAll: fname; nextPutAll: ' |'; lf.
	savedValueDefNode := CallAst classBodyValueDefNode.
	CallAst classBodyValueDefNode: aDef.
	[aDef printSmalltalkOn: aStream]
		ensure: [CallAst classBodyValueDefNode: savedValueDefNode].
	aStream lf;
		nextPutAll: self ___stVarName___;
		nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
		nextPutAll: fname;
		nextPutAll: ''' put: '.
	wrapper
		ifNil: [aStream nextPutAll: fname]
		ifNotNil: [aStream nextPutAll: '('; nextPutAll: wrapper;
			nextPutAll: ' value: { '; nextPutAll: fname; nextPutAll: ' } value: nil)'].
	aStream nextPutAll: '. ] value.'; lf
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyDeletedNames___
	"Names this class body ``del''s, anywhere in it, as Symbols.

	A class-body ``del'' REMOVES the attribute's accessor pair rather than
	nilling its slot -- see object >> ___classBodyDefinitionalDelete___: for why
	nilling is the worse answer.  So an unconditional assignment emitted as a
	direct accessor send (``C x: v'') is only safe while that pair still
	exists, and ``class C: x = 1; del x; x = 2'' -- which CPython leaves with
	C.x == 2 -- died with a doesNotUnderstand on the setter.

	Position is deliberately IGNORED: any del of the name anywhere in the body
	routes every assignment of it through the definitional store, which asks at
	runtime which home the name has.  Over-approximating is free here (the
	store does the same work the accessor send would) and a position-sensitive
	version would have to model which branch ran."

	| names walk |
	names := IdentitySet new.
	walk := nil.
	walk := [:stmt |
		(stmt isKindOf: DeleteAst) ifTrue: [
			stmt targets ifNotNil: [:ts |
				ts do: [:t | self ___addTargetNames___: t to: names]]].
		#(#body #orelse #finalbody) do: [:sel |
			| vars idx suite |
			vars := stmt class allInstVarNames.
			idx := vars indexOf: sel.
			idx > 0 ifTrue: [
				suite := stmt instVarAt: idx.
				suite ifNotNil: [
					(suite isKindOf: Array)
						ifTrue: [suite do: [:each | walk value: each]]
						ifFalse: [(suite respondsTo: #body)
							ifTrue: [suite body ifNotNil: [:b | b do: [:each | walk value: each]]]]]]].
		(stmt isKindOf: TryAst) ifTrue: [
			stmt handlers ifNotNil: [:hs |
				hs do: [:h | h body ifNotNil: [:hb |
					(hb respondsTo: #body)
						ifTrue: [hb body ifNotNil: [:b | b do: [:each | walk value: each]]]
						ifFalse: [hb do: [:each | walk value: each]]]]]]].
	body body do: [:stmt | walk value: stmt].
	^ names
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___addTargetNames___: aTarget to: names
	"Add every NAME that assigning to aTarget would bind, as a Symbol.

	A store target is not always a bare name.  ``for t, ss in ...'',
	``with cm() as (a, b)'' and ``head, *tail = xs'' all bind more than one,
	and ``h.slot'' or ``d['k']'' bind none -- they mutate an object that is
	reached by an expression.  Recursive over the tuple / list / starred
	shapes for that reason, and silent on everything else.

	The parser already registers these names as writes by recursing the same
	way (setStoreCtx:), and ForAst's emitUnpackOn: already stores them one leaf
	at a time.  This is the third place that has to agree, and it did not:
	names bound by unpacking were stored on the class and then read as module
	globals."

	aTarget isNil ifTrue: [^ self].
	(aTarget isKindOf: NameAst) ifTrue: [
		names add: aTarget id asSymbol.
		^ self].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		aTarget elts ifNotNil: [:es |
			es do: [:e | self ___addTargetNames___: e to: names]].
		^ self].
	(aTarget isKindOf: StarredAst) ifTrue: [
		^ self ___addTargetNames___: aTarget value to: names].
	^ self
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyConditionalNames___
	"Every name bound inside a top-level class-body ``if'' (either branch,
	recursively) or inside a class-body ``try'' / ``for'' / ``while'' /
	``with''.  NameAst needs the set because such a name is usually in
	the per-class dynamic attr store rather than behind an accessor, and
	without it the read falls straight through to module scope.  A name that
	is ALSO bound unconditionally does have an accessor, which is why the
	read there tries both before giving up -- see NameAst's conditional
	sibling branch.

	All of these are CONDITIONAL in the sense that matters here: whether the
	binding ran is a runtime fact (the branch may not be taken, the loop may
	not iterate, the try may raise before reaching the assignment)."

	| names collect collectStmt |
	names := IdentitySet new.
	collect := nil.
	collectStmt := nil.
	collectStmt := [:stmt |
		(stmt isKindOf: IfAst) ifTrue: [
			collect value: stmt body.
			collect value: stmt orelse].
		"A class-body loop binds its TARGET as well as whatever its body
		assigns -- ``for i in ...:'' leaves ``i'' on the class.  Collected
		through ___addTargetNames___:to:, so an UNPACKING target contributes
		every name it binds: ``for topic, symbols_ in d.items():'' bound both
		on the class and read back neither, because only a bare NameAst
		counted here.  The store side already unpacked correctly, which is what
		made the failure a NameError from a later statement rather than
		anything at the loop itself."
		(stmt isKindOf: ForAst) ifTrue: [
			self ___addTargetNames___: stmt target to: names.
			collect value: stmt body.
			collect value: stmt orelse].
		(stmt isKindOf: WhileAst) ifTrue: [
			collect value: stmt body.
			collect value: stmt orelse].
		"``with X() as c:'' binds c on the class exactly as a loop target does,
		and only the STORE side knew it: W.c read back fine from outside, while
		``c'' inside the with body -- or in any later class-body statement --
		fell through to module scope and raised NameError.  Every item, since
		``with A() as a, B() as b:'' binds both."
		(stmt isKindOf: WithAst) ifTrue: [
			stmt items ifNotNil: [:its |
				its do: [:item |
					self ___addTargetNames___: item optional_vars to: names]].
			collect value: stmt body].
		(stmt isKindOf: TryAst) ifTrue: [
			collect value: stmt body.
			collect value: stmt orelse.
			collect value: stmt finalbody.
			stmt handlers ifNotNil: [:hs |
				hs do: [:h |
					"``except E as e'' binds e for the handler's extent."
					h name ifNotNil: [:n | names add: n asSymbol].
					collect value: h body]]].
		(stmt isKindOf: FunctionDefAst) ifTrue: [
			names add: stmt name asSymbol].
		"Per TARGET rather than only when every target is a plain name: Python
		binds each name in each target, so ``a, b = pair'' inside a class-body
		loop binds both -- and the old all-or-nothing test collected NEITHER,
		nor did it collect ``x'' from ``x, h.slot = pair''."
		(stmt isKindOf: AssignAst) ifTrue: [
			stmt targets do: [:t | self ___addTargetNames___: t to: names]].
		((stmt isKindOf: AnnAssignAst)
			and: [(stmt target isKindOf: NameAst) and: [stmt value notNil]]) ifTrue: [
			names add: stmt target id asSymbol].
		"An IMPORT binds a name in the class namespace exactly as an assignment
		does, and both import forms already answer ___boundTargetNames___ for
		precisely this purpose.  Without this clause the STORE landed (see
		StatementAst >> printImportBindingOpenOn:name:) while the READ fell
		through to module scope, so

		    class C:
		        try:      from math import floor
		        except ImportError: value = -1
		        else:     value = floor(3.7)

		bound C.floor and then raised ``name 'floor' is not defined'' on the
		next line.  An import whose name is ALSO a module global read fine, so
		the gap looked like it affected only some imports -- ``import math''
		under a module that had already imported math was indistinguishable
		from working."
		((stmt isKindOf: ImportAst) or: [stmt isKindOf: ImportFromAst]) ifTrue: [
			stmt ___boundTargetNames___ do: [:n | names add: n asSymbol]]].
	collect := [:suite |
		(suite notNil and: [suite body notNil]) ifTrue: [
			suite body do: [:stmt | collectStmt value: stmt]]].
	body body do: [:stmt |
		((stmt isKindOf: IfAst)
			or: [self ___isClassBodyRuntimeStatement___: stmt]) ifTrue: [
			collectStmt value: stmt]].
	"A WALRUS in the class body binds a class attribute too -- PEP 572 puts the
	binding in the scope containing the comprehension-free expression, and for
	``z = (n := 7) + n'' that scope is the class namespace, so CPython leaves
	both ``n'' and ``z'' in C.__dict__.  It belongs in THIS set rather than
	among the ordinary attributes because whether the binding ran is a runtime
	fact in exactly the sense above: the walrus may sit on the dead side of an
	``and'' / ``or'' / conditional expression and never evaluate.  The store
	side answers it through ___classBodyDefinitionalStore___ (see
	AbstractNode >> emitNameStoreOn:target:rhs:); without the name here the
	READ fell through to module scope and raised NameError one line later."
	names addAll: self ___classBodyWalrusNames___.
	^ names
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___classBodyWalrusNames___
	"Every name a walrus binds directly in this class body, as an IdentitySet.

	``Directly'' is the whole point: the walk stops at a nested def, lambda or
	class, because a walrus inside one of those binds in THAT scope and has an
	ordinary Smalltalk temp waiting for it.  A walrus inside a COMPREHENSION in
	a class body is a SyntaxError in CPython and NamedExprAst raises it, so
	whether this collects the name is immaterial.

	Feeds the conditional-name read path and the early ___dynInstVars___ holder
	emit -- the two things a class-body binding with no accessor pair needs."

	| names |
	names := IdentitySet new.
	body ifNil: [^ names].
	self ___collectClassBodyWalrusNamesIn___: body body into: names.
	^ names
%

category: 'Grail-Class Compilation'
method: ClassDefAst
___collectClassBodyWalrusNamesIn___: aNode into: names
	"Depth-first walk of aNode collecting NamedExprAst name targets, stopping
	at every scope boundary.  Enumerates instance variables rather than knowing
	each AST class's shape, like ___anyDescendantSatisfies___:, so a new node
	type is covered without being taught here; ``parent'' is skipped because it
	points UP and following it would never terminate."

	aNode isNil ifTrue: [^ self].
	(aNode isKindOf: AbstractNode) ifFalse: [
		((aNode isKindOf: Collection) and: [(aNode isKindOf: CharacterCollection) not])
			ifTrue: [aNode do: [:each | self ___collectClassBodyWalrusNamesIn___: each into: names]].
		^ self].
	((aNode isKindOf: FunctionDefAst)
		or: [(aNode isKindOf: LambdaAst) or: [aNode isKindOf: ClassDefAst]])
			ifTrue: [^ self].
	((aNode isKindOf: NamedExprAst) and: [aNode target isKindOf: NameAst])
		ifTrue: [names add: aNode target id asSymbol].
	aNode class allInstVarNames doWithIndex: [:ivarName :i |
		ivarName == #'parent' ifFalse: [
			self ___collectClassBodyWalrusNamesIn___: (aNode instVarAt: i) into: names]].
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
annotatedFieldNames
	"Ordered names of every annotated assignment in the class body —
	bare ``x: int'' AND ``x: int = default'' alike.  ClassDefAst's
	``_fields'' captures only the bare ones (annotated-with-value lines
	route to class-attribute storage), so this is what
	dataclasses._collect_fields and typing.NamedTuple need to recover the
	full field layout and each field's default.  Plain (un-annotated)
	assignments such as ``x = 1'' are excluded — they are not fields.

	Order matters and is the reason this exists at all: ``__annotations__''
	carries the same NAMES but as a KeyValueDictionary, whose iteration is
	hash order, so it cannot answer ``which field is first''."

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
emitMethodDocTableOn: aStream className: aClassName
	"Compile a class-side ``___methodDocTable___'' returning a dict
	``method-name -> docstring'' for every method that opens with one.

	A class-body def compiles to a Smalltalk METHOD rather than a block, so
	it cannot carry the def-time ``___pyNamed___:doc:'' stamp that gives a
	nested def its ``__doc__''.  Without this table the read fell all the way
	through to Object's own __doc__, and EVERY method -- plain, @property,
	@staticmethod, @classmethod -- reported ``The base class of the class
	hierarchy...''.

	Same shape as the annotations and signature tables, and for the same
	reason.  Overload stubs stay out: the stub is not the implementation.

	No-op when no method has a docstring, so only classes that need it pay
	for the extra class-side method."

	| documented src |
	documented := self ___allFunctionDefs___ select: [:def |
		def isOverloadStub not and: [def ___docString___ notNil]].
	documented isEmpty ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___methodDocTable___'; lf.
	src nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
	documented do: [:def |
		src nextPutAll: ' @env0:at: '''; nextPutAll: def ___mangledName___ asString; nextPutAll: ''' put: '.
		def emitStringLiteral: def ___docString___ on: src.
		src nextPut: $;].
	src nextPutAll: ' @env0:yourself)'.
	self
		emitCompileMethodOn: self ___stVarName___
		source: src contents
		category: 'Grail-Docstrings'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodCodeTableOn: aStream className: aClassName
	"Compile a class-side ``___methodCodeTable___'' returning a dict
	``method-name -> PyCode'' for every method in this class body.

	A class-body def compiles to a Smalltalk METHOD, so -- exactly as with the
	doc / signature / annotations tables beside it -- it cannot carry the
	def-time ``___pyCode___:'' cascade that stamps a nested def's ExecBlock.
	Without this table ``C.m.__code__'' / ``instance.m.__code__'' raised
	AttributeError, which is what blocked test.test_traceback at IMPORT: a
	CLASS-BODY line ``callable_line = get_exception.__code__.co_firstlineno + 2''
	runs while the class body executes.

	EVERY def, including @classmethod / @staticmethod / @property: CPython gives
	each a code object, and the reader is usually asking for co_firstlineno.
	Overload stubs stay out -- the stub is not the implementation, matching the
	sibling tables.

	Unconditional otherwise (no ``isEmpty ifTrue: [^ self]'' guard beyond the
	no-defs case): unlike a docstring, EVERY def has a line number, so there is
	no ``method without one'' to skip."

	| defs src |
	defs := self ___allFunctionDefs___ reject: [:def | def isOverloadStub].
	defs isEmpty ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___methodCodeTable___'; lf.
	src nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
	defs do: [:def |
		src nextPutAll: ' @env0:at: '''; nextPutAll: def name asString; nextPutAll: ''' put: '.
		def emitPyCodeExprOn: src qualname: aClassName , '.' , def name asString.
		src nextPut: $;].
	src nextPutAll: ' @env0:yourself)'.
	self
		emitCompileMethodOn: self ___stVarName___
		source: src contents
		category: 'Grail-Tracebacks'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodSignatureTableOn: aStream className: aClassName
	"Compile a class-side ``___methodSignatureTable___'' returning a dict
	``method-name -> parameter spec'' for every method that declares a
	parameter.  The values are FunctionDefAst >> emitSignatureSpecOn: output --
	the same triples a nested def carries in ``__signature_spec__''.

	EVERY def, as with the annotations table: a @classmethod or @staticmethod
	has a signature Python reports the same way, and singledispatchmethod
	reads one off a class-side implementation.  Overload stubs stay out -- the
	stub is not the implementation.

	No-op when no method declares a parameter, so only classes that need it
	pay for the extra class-side method."

	| withParams src |
	withParams := self ___allFunctionDefs___ select: [:def |
		def isOverloadStub not and: [def hasSignatureSpec]].
	withParams isEmpty ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___methodSignatureTable___'; lf.
	src nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
	withParams do: [:def |
		src nextPutAll: ' @env0:at: '''; nextPutAll: def ___mangledName___ asString; nextPutAll: ''' put: '.
		"Skip ``self''/``cls'' for an instance method or classmethod: what this
		table feeds is a BOUND access (``instance.method'', or a classmethod
		reached through its class), where the receiver is already supplied and
		CPython omits it.  A @staticmethod has no receiver parameter to omit.

		Known divergence: ``signature(Cls.instance_method)'' -- UNBOUND, where
		CPython DOES show ``self'' -- reports without it, because one table
		serves both accesses.  Nothing in the corpus reads that form; a method
		wrapped by a descriptor (singledispatchmethod) reports through
		``__wrapped__'' and the raw def's own spec, which keeps ``self''."
		def emitSignatureSpecOn: src
			skipReceiver: (def isKindOf: StaticFunctionDefAst) not.
		src nextPut: $;].
	src nextPutAll: ' @env0:yourself)'.
	self
		emitCompileMethodOn: self ___stVarName___
		source: src contents
		category: 'Grail-Signatures'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodDefaultStoresOn: aStream className: aClassName
	"Evaluate every class-body method's parameter defaults ONCE, in the class body,
	and stash each on the class it was declared in.  Both kinds: positional AND
	KEYWORD-ONLY.

	WHY HERE.  For a method, the class body IS def time -- it is the scope CPython
	evaluates the default in, and the moment it does so.  Emitting the store
	alongside the other per-class tables also puts it after the class exists, so the
	class object is available to own the entry.

	AND WHY THE SCOPE MATTERS AS MUCH AS THE TIMING.  Emitted here, the expression
	compiles in CLASS-BODY scope, where the class's own names are in scope; emitted
	inline in the method body it compiles as a module GLOBAL read, so
	``def __init__(self, *, socket_options=default_socket_options)'' -- urllib3's
	HTTPConnection -- raised ``NameError: name 'default_socket_options' is not
	defined'' on every call.  The keyword-only half of this store is what fixes that.

	SKIPPED for a def with no defaults at all, and for a STATIC method, whose body
	has no receiver to walk outward from; a staticmethod keeps the inline default it
	has always had rather than acquiring a lookup that cannot resolve.
	FunctionDefAst >> ___defaultOwnerClassName___ -- which both the positional and
	the keyword-only read consult -- makes the same two exclusions, and the two must
	agree: a store with no matching read is dead weight, and a read with no store
	silently recomputes, which is the bug this fixes wearing a disguise."

	| defs |
	defs := self ___allFunctionDefs___ select: [:def |
		def isOverloadStub not
			and: [(def isKindOf: StaticFunctionDefAst) not
			and: [def ___defaultedPositionalParams___ notEmpty
				or: [def ___defaultedKeywordOnlyParams___ notEmpty]]]].
	defs isEmpty ifTrue: [^ self].
	defs do: [:def |
		"Two accessors rather than one, because kw_defaults pairs positionally with
		kwonlyargs while defaults right-aligns against the positional list -- see
		___defaultedKeywordOnlyParams___.  A parameter name is unique within a def,
		so the two share one key namespace without colliding."
		(def ___defaultedPositionalParams___ asArray
			, def ___defaultedKeywordOnlyParams___ asArray) do: [:pair |
			aStream
				nextPutAll: self ___stVarName___;
				nextPutAll: ' @env0:___grailClassDefaultPut___: #';
				nextPut: $';
				nextPutAll: (def ___classDefaultKeyFor___: (pair at: 1) className: aClassName);
				nextPut: $';
				nextPutAll: ' compute: ['.
			(pair at: 2) printSmalltalkOn: aStream.
			aStream nextPutAll: '].'; lf]]
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodReceiverTableOn: aStream className: aClassName
	"Compile a class-side ``___methodReceiverTable___'' -- method-name -> the
	name of the receiver parameter the SIGNATURE table drops (``self'',
	``cls'', or whatever the def wrote).

	ADDITIVE on purpose: ___methodSignatureTable___ stays byte-identical and
	bound-shaped, which is what a bound access reports, and the unbound read
	reconstructs CPython's form by prepending this.  Emitting the receiver into
	the spec itself and stripping it at every bound read would have needed a
	staticness marker in that table as well, and would have changed what every
	existing reader sees.

	A @staticmethod has no receiver to record, so it is skipped and its unbound
	read stays exactly as it is."

	| withReceiver src |
	withReceiver := self ___allFunctionDefs___ select: [:def |
		def isOverloadStub not
			and: [def hasSignatureSpec
			and: [(def isKindOf: StaticFunctionDefAst) not
			and: [def ___receiverParamName___ notNil]]]].
	withReceiver isEmpty ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___methodReceiverTable___'; lf.
	src nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
	withReceiver do: [:def |
		src nextPutAll: ' @env0:at: '''; nextPutAll: def ___mangledName___ asString;
			nextPutAll: ''' put: '''; nextPutAll: def ___receiverParamName___;
			nextPutAll: ''''; nextPut: $;].
	src nextPutAll: ' @env0:yourself)'.
	self
		emitCompileMethodOn: self ___stVarName___
		source: src contents
		category: 'Grail-Signatures'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
emitReceiverlessMethodTableOn: aStream className: aClassName
	"Compile a class-side ``___receiverlessMethods___'' -- the methods of this
	class that ``Cls.meth()'' may call with NO arguments at all.

	Python 3 dropped unbound methods: ``Cls.meth'' fetches the plain function
	off the class, so ``def f(): ...'' is callable as ``C.f()''.  Grail still
	enforced the Python-2 rule and refused it (``unbound method 'f' must be
	called with an instance as the first argument''), which is what stopped
	test_super's test_obscure_super_errors before it could observe the
	``super(): no arguments'' the def would have raised.

	Grail compiles such a def to a ZERO-ARGUMENT Smalltalk method, so the call
	works -- performMethod: runs it against whatever receiver it is given, and a
	def with no parameters has no name bound to one.  The defining class is what
	UnboundMethod hands it.

	NOT EVERY ZERO-PARAMETER DEF QUALIFIES, and the exclusion is the reason this
	table exists rather than a plain argcount test at the call site.  A
	method-local class can close over the ENCLOSING method's receiver:

	    class Host:
	        def run(self):
	            class C:
	                def peek():
	                    return self.tag     # ``self'' is Host's, from the closure

	Grail compiles a captured receiver to the bare Smalltalk ``self'' (see
	ReservedNameLocalClassTestCase >> testACapturedSelfIsStillTheReceiver), so
	handing such a def the class as its receiver would read the CLASS's
	attributes and answer something plausible instead of raising.  Today that
	call is refused, loudly and wrongly; making it quietly wrong would be worse,
	so a def whose body mentions the receiver name in scope is left out and
	keeps the existing TypeError.

	The test OVER-APPROXIMATES on purpose -- it asks whether the body names the
	receiver anywhere, not whether that name resolves to the enclosing one -- so
	its errors can only be a refusal to fix, never a wrong answer."

	| callable src |
	callable := self ___allFunctionDefs___ select: [:def |
		def isOverloadStub not
			and: [(def isKindOf: StaticFunctionDefAst) not
			and: [def ___receiverParamName___ == nil
			and: [(def ___namesEnclosingReceiver___: CallAst selfParameterName) not]]]].
	callable isEmpty ifTrue: [^ self].
	src := WriteStream on: String new.
	src nextPutAll: '___receiverlessMethods___'; lf.
	src nextPutAll: '	^ #('.
	callable do: [:def |
		src nextPutAll: ' #'''; nextPutAll: def ___mangledName___ asString;
			nextPutAll: ''''].
	src nextPutAll: ' )'.
	self
		emitCompileMethodOn: self ___stVarName___
		source: src contents
		category: 'Grail-Signatures'
		env: 1
		classSide: true
		onStream: aStream
%

category: 'Grail-code generation'
method: ClassDefAst
emitMethodAnnotationsTableOn: aStream className: aClassName
	"Compile a class-side ``___methodAnnotationsTable___'' returning a dict
	``method-name -> annotate function'' for every annotated method.  The
	values are FunctionDefAst >> emitAnnotateBlockOn: output (PEP 649);
	the CALLER supplies the Format.  No-op when no method is annotated, so
	only classes that need it pay for the extra class-side method.

	The blocks are built when the table method RUNS, so -- unlike a nested
	def, whose annotate function is stamped once at def-time -- a method's
	``__annotate__'' is not identity-stable across reads.  Nothing asserts
	that for methods, and the dict it computes was already rebuilt per
	read before this.

	EVERY def, not just the instance-side ones: a @classmethod or @staticmethod
	has annotations that Python reports the same way, and singledispatch's
	annotation form (``@go.register'' with no argument) reads them to infer the
	dispatch type.  Listing only instance methods made that form report ``no
	type annotation found'' for a class-side implementation and drop the
	registration.  Overload stubs stay out, as they do for instanceMethodDefs
	-- the stub is not the implementation."

	| annotated src |
	annotated := self ___allFunctionDefs___ select: [:def |
		def isOverloadStub not and: [def hasAnnotations]].
	annotated isEmpty ifTrue: [^ self].
	src := AppendStream on: String new.
	src nextPutAll: '___methodAnnotationsTable___'; lf.
	src nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
	annotated do: [:def |
		src nextPutAll: ' @env0:at: '''; nextPutAll: def ___mangledName___ asString; nextPutAll: ''' put: '.
		def emitAnnotateBlockOn: src.
		src nextPut: $;].
	src nextPutAll: ' @env0:yourself)'.
	self
		emitCompileMethodOn: self ___stVarName___
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
	"True when ``str`` is this class's STORAGE base — used to gate the
	str-specific value:value: instantiation path that creates a
	self-typed string carrying the first positional argument.  Static
	check on the bases list; Grail can't resolve transitive ancestry
	at codegen time.

	``str'' need not be written FIRST.  ``class X(Mixin, str)'' takes its
	Smalltalk superclass from importlib >> ___selectStorageBase___:, which
	answers the leftmost base with built-in storage and so still picks
	str -- but this gate used to test ``bases first'' alone, so the
	population step was skipped and every instance came out EMPTY, at
	ASCII width too (``X('abc')'' answered ``''''').  str is the only
	builtin base with that gap: bytes/tuple/list/dict all get populated
	on other paths, verified directly.

	Scanning stops at the first base naming a builtin storage type, which
	mirrors ___selectStorageBase___:'s leftmost-wins rule, so
	``class X(SomeDict, str)'' would still be treated as dict-backed.
	CPython forbids inheriting from two different builtin types anyway
	(instance layout conflict), so in practice at most one such base
	exists and the earlier bases are storage-less mixins."

	| storageNames |
	storageNames := #(#str #bytes #bytearray #tuple #list #dict #set
		#frozenset).
	bases do: [:b |
		(b isKindOf: NameAst) ifTrue: [
			| n |
			n := b id asSymbol.
			(storageNames includes: n) ifTrue: [^ n = #'str']]].
	^ false
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
firstBaseIsBytesLike
	"True when this class is a direct ``bytes'' or ``bytearray'' subclass.
	Gates the bytes-specific instantiation path: ``bytes''/``bytearray''
	are byte-format kernel classes (like ``str''), and ``bytes>>__new__:''
	is self-typed, so ``C(arg)'' must route through it to allocate a
	C-typed instance carrying the content -- the generic allocator returns
	an empty base ByteArray otherwise (test_bytes ByteArraySubclass /
	BytesSubclass).  Static check on the bases list; Grail can't resolve
	transitive ancestry at codegen."

	bases isEmpty ifTrue: [^ false].
	^ (bases first isKindOf: NameAst)
		and: [#(#bytes #bytearray) includes: bases first id asSymbol]
%

category: 'Grail-Class Compilation'
method: ClassDefAst
definesOwnNew
	"True when the class body defines its own ``__new__''.  When it does, a
	built-in-collection subclass's inherited __init__ is lenient about the
	extra constructor args (CPython: __new__ consumed them) -- see
	___pyBuiltinSubclassInit___ (test_list test_keywords_in_subclass's
	subclass_with_new)."

	^ (self instanceMethodDefs
		detect: [:def | def name asSymbol == #'__new__'] ifNone: [nil]) notNil
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
printClassKeywordsDictOn: aStream
	"The class keywords that PEP 487 forwards to __init_subclass__, as the
	kwargs expression for ___grailInitSubclass___: -- ``nil'' when there are
	none, mirroring CallAst >> printKeywordsDictOn:.

	``metaclass'' and ``boundary'' are withheld: both are consumed by the class
	machinery itself (see the caller), so forwarding them would hand
	object.__init_subclass__ a keyword nobody asked for and turn every
	``class E(Flag, boundary=KEEP)'' into a TypeError.

	A ``**splat'' in a class header carries no compile-time name, so it cannot
	be split against those two; it is forwarded whole via update:, and a splat
	that happens to carry ``metaclass'' would reach __init_subclass__.  Nothing
	in the corpus writes one -- the header form exists mainly for metaclass
	factories -- and the alternative, dropping it, would lose the keywords that
	ARE meant to travel.

	PyDict, and String keys, for the reasons CallAst spells out: kwargs are
	looked up with ``='' and user code expects ``kwargs['tag']'' to work."

	| forwarded |
	keywords isNil ifTrue: [aStream nextPutAll: 'nil'. ^ self].
	forwarded := keywords reject: [:kw |
		kw name notNil and: [
			(kw name asString = 'metaclass') or: [kw name asString = 'boundary']]].
	forwarded isEmpty ifTrue: [aStream nextPutAll: 'nil'. ^ self].
	aStream nextPutAll: '((PyDict @env0:new)'.
	forwarded do: [:kw |
		kw name
			ifNotNil: [
				aStream nextPutAll: ' @env0:at: '''; nextPutAll: kw name asString;
					nextPutAll: ''' put: '.
				kw value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $;]
			ifNil: [
				aStream nextPutAll: ' @env1:update: '.
				kw value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $;]].
	aStream nextPutAll: ' yourself)'.
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
___enclosingScopeIdentifierFor___: aSymbol
	"How to NAME aSymbol in the scope this class definition sits in -- used by
	the closure-cell stores, whose reader block and setter block both run in
	that scope rather than inside the class.

	Not simply the transport identifier.  ``self'' is reserved AND is usually
	the Smalltalk RECEIVER of the enclosing method, which has no ``_self'' temp
	at all -- so blindly mangling a captured ``self'' emitted an undeclared
	variable and cost the whole enclosing method (test_super's
	test_mixed_staticmethod_hierarchy, whose method-local @staticmethod closes
	over the test's own ``self'' to call assertFalse).  The transport temp
	exists only where NameAst's reserved-name rename would read it, so the
	answer comes from that same predicate, asked from a probe node planted in
	the enclosing scope."

	| probe |
	(NameAst isReservedSmalltalkIdentifier: aSymbol) ifFalse: [^ aSymbol asString].
	probe := NameAst with: aSymbol.
	probe setParent: self parent.
	^ (probe ___enclosingFuncDeclaresReservedParam___: aSymbol)
		ifTrue: [NameAst ___transportIdentifierFor___: aSymbol]
		ifFalse: [aSymbol asString]
%

category: 'Grail-other'
method: ClassDefAst
___stVarName___
	"The Smalltalk IDENTIFIER that holds this class while its own body is
	being built -- the assignment target of ``<var> := (...) ___subclass___:''
	and the receiver of every ___compileMethod: that follows.

	It is NOT always the Python name.  Six names are Smalltalk
	pseudo-variables (``self'', ``super'', ``thisContext'', ``nil'', ``true'',
	``false'') and cannot be assigned, so a Python class called one of them
	has to travel under ``_<name>''.  FunctionDefAst already declares a
	reserved-named function local that way and NameAst already reads it that
	way; this emit did not, so ``class super:'' inside a def produced a method
	whose temps said ``_super'' and whose body said ``super := ...''.  That is
	not a runtime bug -- the METHOD FAILS TO COMPILE (``expected an assignable
	variable''), and the whole enclosing function is replaced by a codegen-gap
	stub (test_super's test_shadowed_local).

	Applied at EVERY variable site, including the two places that declare
	their own block temp (a module-scope class and a class nested in a class
	body).  A block temp named ``super'' is in fact legal -- which is exactly
	why the module-scope form of this fixture has always worked and hid the
	bug -- but having one identifier for all three shapes is what keeps the
	declaration and the uses from drifting apart again.

	Deliberately NOT applied where ``name'' is the PYTHON name: the
	___asSmalltalkClassName___ argument, the canonical-class probe key, the
	attribute symbol a class is stored under, and printOn:."

	^ NameAst ___transportIdentifierFor___: name asSymbol
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
method: ClassDefAst
name: newValue
	name := newValue
%
method: ClassDefAst
bases: newValue
	bases := newValue
%
method: ClassDefAst
keywords
	^keywords
%
method: ClassDefAst
keywords: newValue
	keywords := newValue
%
method: ClassDefAst
body: newValue
	body := newValue
%
method: ClassDefAst
decorator_list
	^decorator_list
%
method: ClassDefAst
decorator_list: newValue
	decorator_list := newValue
%
method: ClassDefAst
type_params
	^type_params
%
method: ClassDefAst
type_params: newValue
	type_params := newValue
%
