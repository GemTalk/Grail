! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'FunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment type_params
                    isGeneratorCache deletedNamesCache isAsyncFlag)
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

category: 'Grail-Class Body'
method: FunctionDefAst
___boundTargetNames___
	"A ``def'' binds its own name.  It contributes no
	classBodyAttributePairs, though -- the body compiles to a real method,
	not to a class attribute -- so it makes the name visible to later
	siblings without claiming an attribute value.

	Private-name mangled, matching ___mangledName___ (which is what the
	compiled method is actually called) and the class-body name sets."

	^ Array with: self ___mangledName___ asSymbol
%

category: 'Grail-other'
method: FunctionDefAst
decoratorList

	^decorator_list
%

category: 'Grail-other'
method: FunctionDefAst
isOverloadStub
	"True if this def is decorated with ``@typing.overload'' or bare
	``@overload''.  Those defs are type-checker stubs only — at
	runtime they're meant to be inert; CPython's typing.overload
	returns a stub that raises NotImplementedError if called.  Grail
	skips compiling them as real methods so the LAST def (the
	real implementation) is the only thing in the class method
	dict.

	Without this, Grail compiles each @overload-decorated stub to a
	fixed-arity method (``name'', ``name:'', ``name:_:''), and the
	last def — which usually has defaults and therefore compiles
	only to the varargs ``_name:kw:'' — fails to overwrite them.
	Symptom: ``headers.pop'' returns None because the unary ``pop''
	method is the stub body (``...; return None''), not the real
	dispatch entry that the unary form's defaults should hit.

	Recognises three shapes:
	  - bare ``@overload''                (NameAst id = 'overload')
	  - ``@typing.overload''              (AttributeAst attr 'overload')
	  - ``@t.overload'' (aliased typing)  (same shape)
	"

	decorator_list isNil ifTrue: [^ false].
	^ decorator_list anySatisfy: [:deco |
		((deco isKindOf: NameAst) and: [deco id asString = 'overload'])
			or: [(deco isKindOf: AttributeAst)
				and: [deco attr asString = 'overload']]
	]
%

category: 'Grail-other'
method: FunctionDefAst
isBigmemtestDecorated
	"True if this def carries a CPython ``@support.bigmemtest(size, ...)''
	decorator (or the ``bigaddrspacetest'' / ``precisionbigmemtest''
	siblings).  In CPython that decorator wraps the method and, in a
	dry run (no ``-M'' memory limit), calls it with ``size'' set to a
	small maxsize (5147).  Grail does not apply this ONE decorator — the def is
	normalised to a dry-run varargs form instead, so applicableMethodDecorators
	excludes it — and test.support's
	bigmemtest is a passthrough — so the wrapped body keeps its
	``(self, size)'' signature with ``size'' REQUIRED, and unittest,
	invoking the method with no arguments, errors.  Recognising the
	decorator lets applyBigmemtestDefaultIfNeeded inject that dry-run
	default so the method runs.

	Shapes recognised: ``@bigmemtest(...)'' (Call>Name), ``@support.
	bigmemtest(...)'' (Call>Attribute), and the uncalled bare forms."
	| names |
	decorator_list isNil ifTrue: [^ false].
	names := #('bigmemtest' 'bigaddrspacetest' 'precisionbigmemtest').
	^ decorator_list anySatisfy: [:deco | | fn |
		fn := (deco isKindOf: CallAst) ifTrue: [deco function] ifFalse: [deco].
		((fn isKindOf: NameAst) and: [names includes: fn id asString])
			or: [(fn isKindOf: AttributeAst)
				and: [names includes: fn attr asString]]
	]
%

category: 'Grail-other'
method: FunctionDefAst
applyBigmemtestDefaultIfNeeded
	"Normalisation pass for ``@bigmemtest''-family test methods (see
	isBigmemtestDecorated).  Injects a synthetic trailing default equal
	to CPython's own no-memlimit maxsize (5147) so the required ``size''
	parameter becomes optional and the method is callable with no args
	— the dry-run path CPython itself takes when no ``-M'' limit is set.

	Must run BEFORE compilesAsVarargs is consulted (giving a param a
	default flips the def to the varargs form, whose prologue binds
	``size'' from the default), so ClassDefRuntime invokes it up front.
	Idempotent — guarded on a currently-empty defaults list — and scoped
	to the bigmemtest family plus a real trailing parameter, so no other
	method's codegen is touched."
	(self isBigmemtestDecorated
		and: [(args defaults isNil or: [args defaults isEmpty])
		and: [(args posonlyargs size + args args size) > 1]]) ifTrue: [
			args appendDefault: (ConstantAst new
					value: 5147;
					kind: nil;
					yourself)].
%

category: 'Grail-other'
method: FunctionDefAst
isRequiresResourceDecorated
	"True if this def carries a CPython ``@support.requires_resource(res)''
	(or bare ``@requires_resource(res)'') decorator.  That decorator skips
	the test unless the named resource is enabled via regrtest's ``-u''
	option; a default ``python -m test'' run enables NONE of the expensive
	resources (cpu, network, ...), so the decorated test is SKIPPED.  Grail
	has no ``-u'' mechanism, and this decorator is excluded from the class-body
	decorator application (applicableMethodDecorators) because the BODY is
	replaced instead, so without help the
	body would RUN and (for an expensive test) error.  Recognising the
	decorator lets ClassDefRuntime emit a skipping body instead, matching
	CPython's default behaviour.

	Shapes recognised: ``@requires_resource(...)'' (Call>Name) and
	``@support.requires_resource(...)'' (Call>Attribute)."
	decorator_list isNil ifTrue: [^ false].
	^ decorator_list anySatisfy: [:deco | | fn |
		fn := (deco isKindOf: CallAst) ifTrue: [deco function] ifFalse: [deco].
		((fn isKindOf: NameAst) and: [fn id asString = 'requires_resource'])
			or: [(fn isKindOf: AttributeAst)
				and: [fn attr asString = 'requires_resource']]
	]
%

category: 'Grail-other'
method: FunctionDefAst
requiresResourceName
	"The resource string from a ``@requires_resource(res)'' decorator (for
	the skip message), or nil when it is absent or not a plain string
	literal."
	decorator_list isNil ifTrue: [^ nil].
	decorator_list do: [:deco | | fn |
		fn := (deco isKindOf: CallAst) ifTrue: [deco function] ifFalse: [deco].
		(((fn isKindOf: NameAst) and: [fn id asString = 'requires_resource'])
			or: [(fn isKindOf: AttributeAst) and: [fn attr asString = 'requires_resource']])
			ifTrue: [
				((deco isKindOf: CallAst)
					and: [deco arguments notNil and: [deco arguments notEmpty]]) ifTrue: [
						| a |
						a := deco arguments first.
						(a isKindOf: ConstantAst) ifTrue: [^ a value]]]].
	^ nil
%

category: 'Grail-other'
method: FunctionDefAst
generateResourceSkipSource
	"Body for a ``@requires_resource''-decorated test method (see
	isRequiresResourceDecorated): skip it, the way CPython's default (no
	``-u'') run does.  The method keeps its plain unary selector so
	unittest's dir()-based discovery still finds it; the body raises
	SkipTest via TestCase>>skipTest:, so it is counted in the skipped
	column rather than run."
	| stream res |
	res := self requiresResourceName ifNil: ['a'].
	stream := AppendStream on: Unicode7 new.
	stream nextPutAll: name; lf.
	stream nextPutAll: '^ self skipTest: ''resource '; nextPutAll: res asString;
		nextPutAll: ' is not enabled'''.
	^ stream contents
%

category: 'Grail-other'
method: FunctionDefAst
isCpythonOnlyDecorated
	"True if this def carries a ``@cpython_only'' (or ``@support.cpython_only'')
	decorator.  In CPython that marks a test of an implementation detail not
	required of other Python implementations; alternative implementations
	(PyPy, ...) skip such tests.  This decorator is excluded from class-body
	decorator application (applicableMethodDecorators) because the BODY is
	replaced instead, so without help
	the body RUNS and fails on behaviour Grail is not obliged to match (gc
	tracking, exact object identity of interned singletons, split-table dict
	internals, ...).  Recognising the decorator lets ClassDefRuntime emit a
	skipping body instead.

	Shapes recognised: bare ``@cpython_only'' (NameAst) and
	``@support.cpython_only'' / ``@test.support.cpython_only'' (AttributeAst)."
	decorator_list isNil ifTrue: [^ false].
	^ decorator_list anySatisfy: [:deco | | fn |
		fn := (deco isKindOf: CallAst) ifTrue: [deco function] ifFalse: [deco].
		((fn isKindOf: NameAst) and: [fn id asString = 'cpython_only'])
			or: [(fn isKindOf: AttributeAst)
				and: [fn attr asString = 'cpython_only']]
	]
%

category: 'Grail-other'
method: FunctionDefAst
generateCpythonOnlySkipSource
	"Body for a ``@cpython_only''-decorated test method (see
	isCpythonOnlyDecorated): skip it, the way an alternative Python
	implementation does.  Keeps the plain unary selector so unittest's
	dir()-based discovery still finds it; the body raises SkipTest via
	TestCase>>skipTest:, counting it in the skipped column rather than run."
	| stream |
	stream := AppendStream on: Unicode7 new.
	stream nextPutAll: name; lf.
	stream nextPutAll: '^ self skipTest: ''CPython implementation detail'''.
	^ stream contents
%

category: 'Grail-other'
method: FunctionDefAst
name

	^name
%

category: 'Grail-accessing'
method: FunctionDefAst
___mangledName___
	"The name this def BINDS under: private-name mangled inside a class
	body.  CPython mangles the binding (class attribute _C__m) but leaves
	the function's own __name__ as written (__m), so this is used only at
	binding/selector sites -- never for the ___pyNamed___ stamp."

	^ self ___manglePrivate___: name
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

category: 'Grail-Class Body'
method: FunctionDefAst
printSmalltalkClassBodyRuntimeDefOn: aStream
	"Emit a ``def'' that a class-body try/for/while/with binds:

		[ | f | f := <function value>.
		  Cls ___classBodyDefinitionalStore___: #'f' put: f. ] value.

	It cannot be compiled as a Smalltalk METHOD the way an unconditional
	class-body def is -- whether it exists at all is a runtime fact, and the
	same selector may be bound by more than one branch of the statement.  A
	plain function stored as a class attribute binds the receiver on an
	instance read and comes back raw on a class read, which is what CPython
	does with a function in a class namespace.

	@staticmethod / @classmethod reach here re-classed by the parser rather
	than carrying a runtime decorator, so the wrapper that would otherwise
	have been applied structurally is applied here instead."

	| clsName wrapper savedRuntimeClass savedValueDefNode |
	clsName := CallAst classBodyRuntimeClass.
	wrapper := (self isKindOf: StaticFunctionDefAst)
		ifTrue: ['PyStaticMethod']
		ifFalse: [(self isKindOf: ClassFunctionDefAst)
			ifTrue: ['PyClassMethod']
			ifFalse: [nil]].
	aStream nextPutAll: '[ | '; nextPutAll: name; nextPutAll: ' |'; lf.
	savedRuntimeClass := CallAst classBodyRuntimeClass.
	savedValueDefNode := CallAst classBodyValueDefNode.
	CallAst classBodyRuntimeClass: nil.
	CallAst classBodyValueDefNode: self.
	[self printSmalltalkOn: aStream] ensure: [
		CallAst classBodyRuntimeClass: savedRuntimeClass.
		CallAst classBodyValueDefNode: savedValueDefNode].
	aStream lf;
		nextPutAll: clsName;
		nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
		nextPutAll: name;
		nextPutAll: ''' put: '.
	wrapper
		ifNil: [aStream nextPutAll: name]
		ifNotNil: [aStream nextPutAll: '('; nextPutAll: wrapper;
			nextPutAll: ' value: { '; nextPutAll: name; nextPutAll: ' } value: nil)'].
	aStream nextPutAll: '. ] value.'; lf
%

category: 'Grail-other'
method: FunctionDefAst
printSmalltalkOn: aStream
	"When compiling a user module, top-level defs are compiled as
	real methods separately. In the initialize stream, emit a BoundMethod
	assignment so the instVar holds a callable reference for first-class use
	(e.g. `f = add; f(1, 2)`). Nested defs still use the block form."

	| fixedCount paramNames savedReturnMode savedFunction savedScopeDepth moduleDecorators
	  poCount regCount kwoCount hasKwonly hasPosDefaults needsOuterBlock |
	"A ``def'' inside a class-body try/for/while/with.  The value form below
	emits ``<name> := ...'', which needs a declared temp AND a home on the
	class -- neither exists in ClassDefAst's class-build code, so without this
	the def is an undefined symbol and the whole class fails to compile.
	Same shape as emitClassBodyIfDef: (a def in a class-body ``if''): give the
	emit its ``<name> :='' target as a block temp, then store the result as a
	class attribute.  The flag is cleared inside, so the def's own body treats
	its bare names as the locals they are -- and so this branch does not
	re-enter on the recursive call."
	self ___inClassBodyRuntimeScope___ ifTrue: [
		^ self printSmalltalkClassBodyRuntimeDefOn: aStream].
	(CallAst moduleClassBeingCompiled notNil and: [self isModuleLevelDef]) ifTrue: [
		"Top-level def: the real env-1 method has already been
		compiled on the module class (by importlib's topLevelDefs
		pass).  Without decorators, emit nothing — the CallAst bare-
		call dispatcher probes the dynamic instVar at call time, and
		an absent slot routes to the fast self-send path.

		Decorators ARE applied at module-body time: ``@A @B def f''
		rebinds f to A(B(f)).  The original function is read as a
		BoundMethod via ``___moduleAttrLoad___:'', each decorator is
		called on the previous result via ``___pyCallValue___:kw:'', and
		the final value is stored in f's dynamic-instVar slot.  Bare
		calls ``f(...)'' probe that slot first (an absent slot routes to
		the fast self-send of the real method), so a decorator that
		returns a wrapper takes effect, while one that merely mutates and
		returns the original (jinja2's ``@pass_environment'' family) still
		resolves to the same BoundMethod with its tag attached.  The
		parse-time class-declarative decorators (staticmethod /
		classmethod / property) are excluded — the parser already handled
		them by re-classing this node."
		"Record this top-level function's PEP 649 ``__annotate__'' on the
		module instance, keyed by the plain Python name.  ``self'' here is
		the module instance (the module body compiles to a method on the
		module class); BoundMethod >> __annotations__ calls it back.
		Emitted before any decorator application so the annotations are
		available regardless of decoration."
		self hasAnnotations ifTrue: [
			aStream
				lf;
				nextPutAll: 'self @env0:___setFunctionAnnotations___: ''';
				nextPutAll: name;
				nextPutAll: ''' annotate: '.
			self emitAnnotateBlockOn: aStream.
			aStream nextPutAll: '.'].
		"Same for the inspect.signature parameter spec -- a module-level def
		compiles to a method, so it cannot carry the def-time cascade."
		self hasSignatureSpec ifTrue: [
			aStream
				lf;
				nextPutAll: 'self @env0:___setFunctionSignature___: ''';
				nextPutAll: name;
				nextPutAll: ''' spec: '.
			self emitSignatureSpecOn: aStream.
			aStream nextPutAll: '.'].
		moduleDecorators := self applicableModuleDecorators.
		moduleDecorators isEmpty ifTrue: [^self].
		self printModuleDecoratorsOn: aStream decorators: moduleDecorators.
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
	"Phase A: nested-def assignment target (inside an `if`/`for`/etc.
	at module scope) needs to route through dynamicInstVarAt:put: when
	the parser declared the name in module body variables.  Without
	this, the bare ``<name> := ...'' wouldn't compile (no Smalltalk
	temp / instVar slot).  Function-local nested defs keep the bare
	assignment because the surrounding function declares the name as
	a block temp."
	(self isModuleScopeNestedDefTarget) ifTrue: [
		aStream
			nextPutAll: self ___moduleStoreReceiverExpr___;
			nextPutAll: ' @env0:dynamicInstVarAt: #''';
			nextPutAll: name;
			nextPutAll: ''' put: ('
	] ifFalse: [
		aStream
			nextPutAll: name;
			nextPutAll: ' := '
	].
	"A def-time outer wrapper block (run immediately via ``] value'') is needed
	when there are positional defaults (evaluated once, in the enclosing scope)
	OR keyword-only parameters (whose mutable ___kwdefaults___ cell must also be
	built once at def-time and captured by the inner block)."
	hasPosDefaults := args notNil and: [args defaults notNil and: [args defaults notEmpty]].
	hasKwonly := args notNil and: [args kwonlyargs notNil and: [args kwonlyargs notEmpty]].
	needsOuterBlock := hasPosDefaults or: [hasKwonly].
	"Open the paren that ``) @env0:shallowCopy'' (or, for a keyword-only def, the
	wrapper's own ``] value)'') closes once the block is built -- see the comment
	there for why the def's value must be a copy."
	aStream nextPut: $(.
	"Emit a def-time default-capture outer block when there are defaults or
	keyword-only params.  The outer block runs immediately (``] value``) and
	returns the inner function block; defaults that reference the enclosing
	scope (jinja2's ``missing=missing``) resolve there at def-time instead of
	failing in the inner block where the same name is the local being bound."
	needsOuterBlock ifTrue: [
		| numDefaults firstWithDefault positionals |
		"``defaults'' covers the POSITIONAL-ONLY params and the regular ones
		together -- CPython's arguments node applies it to
		``posonlyargs , args'' as one sequence -- so the name each default
		belongs to has to be looked up in that combined list.  Indexing
		``args args'' alone made the arithmetic go off the front of it for any
		def whose defaults reach back into the posonly section: ``def f(a=1, /,
		b=2)'' has 2 defaults over 1 regular arg, so firstWithDefault was 0 and
		codegen died with a raw OffsetError (2003 objErrBadOffsetIncomplete,
		max:1 actual:0) -- an uncatchable Smalltalk error during compilation, so
		the whole module failed to import rather than one def failing.  That is
		both of test_call's and test_positional_only_arg's IMPORTERRORs."
		positionals := (args posonlyargs ifNil: [#()]) , (args args ifNil: [#()]).
		numDefaults := hasPosDefaults ifTrue: [args defaults size] ifFalse: [0].
		firstWithDefault := positionals size - numDefaults + 1.
		aStream nextPut: $[; lf; nextPutAll: '| '.
		1 to: numDefaults do: [:i |
			aStream nextPutAll: '___default_'; nextPutAll: (positionals at: firstWithDefault + i - 1) name; nextPutAll: '___ '].
		hasKwonly ifTrue: [aStream nextPutAll: '___kwdefaults___ '].
		aStream nextPutAll: '|'; lf.
		1 to: numDefaults do: [:i |
			| pname |
			pname := (positionals at: firstWithDefault + i - 1) name.
			aStream nextPutAll: '___default_'; nextPutAll: pname; nextPutAll: '___ := '.
			(args defaults at: i) printSmalltalkOn: aStream.
			aStream nextPut: $.; lf].
		hasKwonly ifTrue: [self emitKwDefaultsCellInitOn: aStream].
	].
	"For a keyword-only def, the inner block gets its OWN paren so shallowCopy +
	the ___kwdefaults___ stamp apply to it INSIDE the wrapper (where the cell is
	in scope); other defs let the outer paren above serve."
	hasKwonly ifTrue: [aStream nextPut: $(].
	aStream
		nextPutAll: '[:___positional___ :___kwargs___ |';
		lf;
		increaseIndent.
	"Collect every name we need as a block temp: fixed positionals,
	*vararg, **kwarg, AND every variable declared in the body.  The
	body's BlockAst now includes parameter names (added by
	PythonParser>>parseFunctionDefWithDecorators), so we must declare
	all locals here in a single `| ... |` pane and emit the body's
	statements without re-declaring temps.

	Reserved-name params (``self'', ``super'', ``nil'', ``true'',
	``false'', ``thisContext'') are transported as ``_<name>'' — the
	Smalltalk pseudo-variables can't be declared as temps or used as
	assignment targets.  Body references to the Python name resolve
	to the transport identifier via NameAst's reserved-param rename."
	"Combined positional sequence: posonlyargs come before args (the
	regular positional params).  Both feed the same ___positional___
	unpacking below — Python's ``/'' is a parse-time marker, not a
	runtime dispatch boundary."
	fixedCount := args posonlyargs size + args args size.
	paramNames := OrderedCollection new.
	args posonlyargs do: [:arg | paramNames add: (self transportParamName: arg name)].
	args args do: [:arg | paramNames add: (self transportParamName: arg name)].
	args vararg ifNotNil: [paramNames add: (self transportParamName: args vararg name)].
	args kwarg ifNotNil: [paramNames add: (self transportParamName: args kwarg name)].
	"Merge bodyVars while preserving uniqueness.  Reserved-name body
	locals (``self = cls(**initkwargs)'' in django's View.as_view
	inner function) are declared via their ``_<name>'' transport —
	NameAst's reserved-name rename points every read and write at
	that temp; the pseudo-variable itself can't be declared."
	body variables do: [:n |
		((paramNames includes: n)
			or: [paramNames includes: (self transportParamName: n)])
			ifFalse: [paramNames add: (self transportParamName: n)].
	].
	"Traceback: every function carries a ___curPos___ temp holding its current
	execution position (set by ___emitCurPosBefore: before each statement)."
	paramNames add: '___curPos___'.
	paramNames isEmpty ifFalse: [
		aStream nextPutAll: '| '.
		paramNames do: [:n | aStream nextPutAll: n; space].
		aStream nextPut: $|; lf.
	].
	"Bind fixed positionals (with default fallback) — closure path
	uses the underscored sentinels declared as block params.  Pass
	transported param names so reserved-name params resolve to the
	``_<name>'' temp the body actually references."
	self
		printPositionalUnpackingOn: aStream
		paramNames: ((args posonlyargs, args args)
			collect: [:a | self transportParamName: a name])
		positionalName: '___positional___'
		kwargsName: '___kwargs___'.
	"Bind *vararg to the tail of positional, wrapped as a tuple. When
	the call passed exactly the fixed args, the tail is empty."
	args vararg ifNotNil: [
		aStream
			nextPutAll: (self transportParamName: args vararg name);
			nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { ___positional___ @env0:copyFrom: ';
			print: fixedCount + 1;
			nextPutAll: ' to: ___positional___ @env0:size }.';
			lf.
	].
	"Bind **kwarg to the keyword dict (or an empty dict if nil was passed).
	When the def also has keyword-only params, COPY first and drop those names
	so they bind to their own parameters, not into **kwargs (mirrors the
	module-method path); without keyword-only params the plain alias is kept
	unchanged."
	args kwarg ifNotNil: [
		hasKwonly
			ifTrue: [
				aStream
					nextPutAll: (self transportParamName: args kwarg name);
					nextPutAll: ' := (___kwargs___ ifNil: [(PyDict perform: #new env: 0)]) @env0:copy.';
					lf.
				args kwonlyargs do: [:each |
					aStream
						nextPutAll: (self transportParamName: args kwarg name);
						nextPutAll: ' @env0:removeKey: '''; nextPutAll: each name;
						nextPutAll: ''' ifAbsent: []. '; lf]]
			ifFalse: [
				aStream
					nextPutAll: (self transportParamName: args kwarg name);
					nextPutAll: ' := ___kwargs___ ifNil: [(PyDict perform: #new env: 0)].';
					lf].
	].
	"Bind keyword-only params (previously left UNBOUND in the closure form --
	a nested ``def f(*, k): ...'' raised UnboundLocalError on any use of k)."
	hasKwonly ifTrue: [self emitKeywordOnlyBindingOn: aStream].
	"Generator functions wrap the entire body in ``PythonGenerator
	@env1:withBlock: [:___gen___ | ... ]`` so a call returns a lazy
	generator instead of running the body to completion.  Matches
	the module-method path's ``printBodyOn:``; without this, a
	closure-form ``def gen(): yield x`` would emit ``___gen___
	___yield___:`` references with no surrounding declaration —
	compile error ``undefined symbol ___gen___``.  Eval and exec
	paths both flow through this closure form."
	self ___wrapsBody___ ifTrue: [
		aStream nextPutAll: self ___lazyWrapperClass___ , ' @env1:withBlock: [:___gen___ |'; lf.
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
	outer `| ... |` above already declares them).

	Force #exception return-emit mode here: this body is a Smalltalk
	*block*, not a method.  A ``^'' inside would do a non-local return
	out of the enclosing Smalltalk method (the wrong frame from
	Python's standpoint — Python's ``return'' should only exit this
	nested function, not its containing scope).  The surrounding
	``[...] on: PythonReturn do: [...]'' handler catches PythonReturn
	and yields the value as the block's result, which is what the
	caller of the nested function sees."
	savedReturnMode := CallAst returnEmitMode.
	savedFunction := CallAst functionBeingCompiled.
	"...and onto the LEXICAL SCOPE STACK, beside functionBeingCompiled and for
	the same window: a def or class written inside this body reads its own
	__qualname__ off the stack, and the single slot cannot spell a chain."
	savedScopeDepth := CallAst ___pushScope___: self kind: #function name: name.
	[
		CallAst returnEmitMode: #exception.
		"Expose this def as the current function scope for the body
		emit — the locals() rewrite reads it (same save/restore as
		printBodyOn:, which this closure path bypasses)."
		CallAst functionBeingCompiled: self.
		(self ___reachableStatements___: body body) do: [:stmt |
			self ___emitCurPosBefore: stmt on: aStream.
			stmt printSmalltalkOn: aStream.
			aStream lf].
	] ensure: [
		CallAst returnEmitMode: savedReturnMode.
		CallAst functionBeingCompiled: savedFunction.
		CallAst ___restoreScopeDepth___: savedScopeDepth].
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
	self ___wrapsBody___ ifTrue: [
		aStream nextPutAll: ']'.
	].
	aStream nextPutAll: '.'; lf.
	aStream decreaseIndent; nextPutAll: ']'.
	"Close the default-pre-eval outer block if any.  When defaults exist,
	``name := [ ___default_X___ := X. [inner] ] value`` — the outer block
	evaluates immediately to capture defaults at def-time, returning the inner
	block as the actual callable.  With no defaults (and no keyword-only params)
	the outer wrapper is the inner block directly.

	A keyword-only def closes DIFFERENTLY: its inner block got its own paren, so
	close it here, shallowCopy it, and stamp the ___kwdefaults___ cell -- all
	still INSIDE the wrapper, the only place the cell temp is in scope -- then
	close+eval the wrapper and the outer value paren.  The def-site stamps below
	then cascade onto the block the wrapper returns."
	hasKwonly ifTrue: [
		aStream nextPutAll: ') @env0:shallowCopy @env0:___pyKwDefaults___: ___kwdefaults___'; lf.
		aStream nextPutAll: '] value)'.
	] ifFalse: [
		hasPosDefaults ifTrue: [aStream nextPutAll: '] value'].
	].
	"Every execution of a ``def'' must yield a DISTINCT function object -- that
	is what CPython does, and Python code depends on it.  GemStone reuses a
	CLEAN block (one referencing no self, instance variable, enclosing temp or
	thisContext) as a compile-time literal, so a nested def whose body captures
	nothing answers the SAME ExecBlock on every execution, and everything keyed
	on that object -- user attributes, a __doc__ or __name__ written by
	functools.update_wrapper, the memoized __annotations__ -- is shared across
	invocations:

		def run_once(tag):
			def inner(x): pass
			seen = getattr(inner, 'stamp', 'ABSENT')
			inner.stamp = tag
			return seen
		# CPython: ('ABSENT', 'ABSENT').  Shared block: ('ABSENT', 'first').

	The copy is taken HERE, before the stamps below, so the stamps address the
	object the def's name will actually be bound to.  Taking it afterwards (as
	the last cascade message) also defeats the sharing, but then every stamp
	writes against the original -- which works only for the DEF-SITE stamps,
	keyed by ``method'', and silently loses any PER-OBJECT one.  ``__annotate__''
	is per-object (it closes over the enclosing scope, so it is NOT the same
	function for every execution of the def), and stamping it on the original
	left every annotated def reporting ``{}''.

	shallowCopy preserves ``method'' -- so the def-site slots still resolve to
	one shared entry, which is correct because those values are identical for
	every execution -- and preserves the captured home context, so closures and
	shared mutable enclosing temps behave unchanged.

	Why a copy rather than forcing the block to be non-clean: both defeat the
	sharing, but a marker that makes the block non-clean must be a USED
	reference (the compiler eliminates a discarded one) and therefore executes
	on every invocation, measured at +2ns per CALL.  The copy costs ~10ns once
	per def execution and nothing per call."
	"For a keyword-only def the ``) shallowCopy'' already happened INSIDE the
	wrapper (with the ___kwdefaults___ stamp); here we only close the plain
	cases."
	hasKwonly ifFalse: [aStream nextPutAll: ') @env0:shallowCopy'].
	"Stamp the closure's ``__name__'' from the def's lexical name so
	``func.__name__'' answers 'name', not the ``<closure>'' placeholder.
	``___pyNamed___:'' returns self, so it sits transparently in front of
	the assignment / decorator pipeline.  flask's ``@app.route'' reads
	``view_func.__name__'' to key ``view_functions'' and the rule
	endpoint; without a real name the lookup KeyErrors."
	"Stamp __name__ (always), plus __annotations__ when the def carries
	annotations and __doc__ when it opens with a docstring -- as ONE
	keyword send, because two chained keyword sends would parse as a
	single combined selector.  The four shapes are
	``___pyNamed___:''/``:annotations:''/``:doc:''/``:annotations:doc:'',
	each defined on ExecBlock.  All stamps return self, so this composes
	transparently in the ``name := <block>'' assignment / decorator
	pipeline.  The annotate FUNCTION is built HERE, in the enclosing
	scope, so it captures that scope -- but it is not called until
	``__annotations__'' is read (PEP 649)."
	aStream nextPutAll: ' @env0:___pyNamed___: '''; nextPutAll: name; nextPutAll: ''''.
	self hasAnnotations ifTrue: [
		aStream nextPutAll: ' annotate: '.
		self emitAnnotateBlockOn: aStream].
	self ___docString___ ifNotNil: [:doc |
		aStream nextPutAll: ' doc: '.
		self emitStringLiteral: doc on: aStream].
		"Stamp func.__code__ (a PyCode) at def-time -- a CASCADE onto the same
		block receiver as ___pyNamed___ (chaining another keyword send would
		instead form one combined selector).  ___pyCode___: returns self, so the
		cascade value stays the block.  co_firstlineno (the def line) drives
		tracebacks; the three parameter counts (co_argcount / co_posonlyargcount
		/ co_kwonlyargcount) are what introspection reads -- co_argcount counts
		posonly+regular positional params (self/cls included, as in CPython),
		co_kwonlyargcount the keyword-only ones."
		poCount := args isNil ifTrue: [0] ifFalse: [(args posonlyargs ifNil: [#()]) size].
		regCount := args isNil ifTrue: [0] ifFalse: [(args args ifNil: [#()]) size].
		kwoCount := args isNil ifTrue: [0] ifFalse: [(args kwonlyargs ifNil: [#()]) size].
		"__qualname__ when this def is nested inside something.  A CASCADE, like
		___pyCode___: below and for the same reason: emitted as another keyword
		part of ``___pyNamed___:'' it would swallow the following ``annotate:'' /
		``doc:'' into one combined selector that does not exist -- which turned 22
		tests into uncatchable Smalltalk errors when tried that way."
		self ___emitQualnameOn___: aStream name: name.
		"PEP 695 type parameters, when the def declares any.  A CASCADE, for the
		same reason as the qualname beside it."
		(type_params notNil and: [type_params notEmpty]) ifTrue: [
			aStream nextPutAll: '; @env0:___pyTypeParams___: #('.
			type_params do: [:n |
				aStream nextPutAll: ''''; nextPutAll: n asString; nextPutAll: ''' '].
			aStream nextPutAll: ')'].
		aStream
			nextPutAll: '; @env0:___pyCode___: '.
		self emitCodeExtrasOpenOn: aStream nested: true.
		aStream
			nextPutAll: '(PyCode @env0:name: '''; nextPutAll: name;
			nextPutAll: ''' filename: '.
		self emitSourceFilenameLiteralOn: aStream.
		aStream
			nextPutAll: ' firstlineno: '; nextPutAll: self beginLine printString;
			nextPutAll: ' argcount: '; nextPutAll: (poCount + regCount) printString;
			nextPutAll: ' posonlyargcount: '; nextPutAll: poCount printString;
			nextPutAll: ' kwonlyargcount: '; nextPutAll: kwoCount printString;
			nextPutAll: ')'.
		self emitCodeExtrasOn: aStream nested: true.
		"Stamp the def-time PARAMETER SPEC, another cascade onto the same
		receiver.  This is what makes inspect.signature real: Grail has no code
		object to introspect, so the compiler records the parameter names, kinds
		and default SOURCE TEXT it already has.  Only emitted for a def that has
		parameters -- a niladic def needs no spec, and signature() renders ``()''
		for one either way."
		self hasSignatureSpec ifTrue: [
			aStream nextPutAll: '; @env0:___pySig___: '.
			self emitSignatureSpecOn: aStream].
		"Stamp func.__closure__ -- one PyCell per FREE VARIABLE, cascaded onto
		the same block receiver.  Each cell carries the reader/writer block pair
		for that variable, so it reads and writes the enclosing scope's LIVE
		binding (Smalltalk blocks capture by reference) rather than a snapshot;
		the ___cell_<name>___ / ___cellSetter_<name>___ pair ClassDefAst emits
		for class-method capture works the same way.
		Only emitted when the def actually closes over something -- CPython's
		__closure__ is None otherwise, which the accessor answers when no stamp
		is present, so a niladic-capture def pays nothing."
		self emitClosureCellsOn: aStream.
	"Phase A: close the dynamicInstVarAt:put: paren opened above when
	this is a module-scope nested def; otherwise just emit the
	statement-terminating period."
	(self isModuleScopeNestedDefTarget)
		ifTrue: [aStream nextPutAll: ').']
		ifFalse: [aStream nextPutAll: '.'].
	"Apply decorators bottom-up.  ``@A @B def f: ...`` rebinds f to
	``A(B(f))`` — the decorator nearest the def (B) runs first, so
	iterate in reverse.  Skip Symbol entries that are class-body
	special markers -- but ONLY when the parser actually re-classed this node,
	which is what handles them.

	It re-classes under ``classNesting > 0'', and it zeroes classNesting while
	parsing a body, so a def nested inside a FUNCTION is left a plain
	FunctionDefAst and nothing has handled its ``@classmethod'' at all.  Skipping
	it there silently DROPPED the decorator and left a plain function: that is why
	functools' test_callable_register -- whose class and registrations live inside
	the test METHOD -- registered a plain function with singledispatch, which was
	then called without its class.

	A def inside an ``if'' in a class BODY is the other case: classNesting is
	still positive there, so it WAS re-classed, and applying the decorator again
	double-wraps it (six ClassBodyConditionalTestCase errors when this
	distinction was missing).  ___parserReclassedThisDef___ tells the two apart."
	decorator_list isNil ifFalse: [ | applicable |
		"CPython evaluates every decorator EXPRESSION top-down and only then
		APPLIES the resulting decorators, bottom-up.  test_decorators
		test_eval_order pins the exact interleaving:
		makedec1/makedec2/makedec3 then calldec3/calldec2/calldec1.

		The per-decorator emit below fuses the two phases -- it evaluates AND
		applies each decorator before looking at the next, giving
		makedec3/calldec3/makedec2/calldec2/... instead.  With a single decorator
		the two orders coincide, so only a CHAIN needs the split emit; the
		module-scope path (printModuleDecoratorsOn:) already nests its chain into
		one expression and was never affected."
		applicable := decorator_list reject: [:deco |
			(self isClassDeclarativeDecorator: deco)
				and: [self ___parserReclassedThisDef___]].
		applicable size > 1 ifTrue: [
			self emitOrderedLocalDecoratorsOn: aStream decorators: applicable.
			^ self].
		applicable reverseDo: [:deco |
			((self isClassDeclarativeDecorator: deco) not
				or: [self ___parserReclassedThisDef___ not]) ifTrue: [
				"Phase A: decorator re-bind uses dynamicInstVarAt:put: when
				the target name is module-scope (parser-declared in module
				body and not shadowed by an enclosing function)."
				(self isModuleScopeNestedDefTarget) ifTrue: [
					aStream
						lf;
						nextPutAll: self ___moduleStoreReceiverExpr___;
			nextPutAll: ' @env0:dynamicInstVarAt: #''';
						nextPutAll: name;
						nextPutAll: ''' put: ('
				] ifFalse: [
					aStream
						lf;
						nextPutAll: name;
						nextPutAll: ' := '
				].
				(deco isKindOf: Symbol)
					ifTrue: [
						"Phase A: a Symbol decorator (parser stored the bare
						name as a Symbol rather than a NameAst) that names a
						module-scope global needs to read through the module
						instance's dynamic-instVar storage — bare emit would
						compile-fail with ``undefined symbol''.  Route via
						``___moduleAttrLoad___:'' so top-level defs lazy-wrap
						as BoundMethods (the typical decorator case)."
						(CallAst moduleVariableNames notNil
							and: [CallAst moduleVariableNames includes: deco asSymbol])
							ifTrue: [
								aStream
									nextPutAll: '((';
									nextPutAll: CallAst moduleClassBeingCompiled name;
									nextPutAll: ' @env0:___instance___) @env1:___moduleAttrLoad___: #''';
									nextPutAll: deco asString;
									nextPutAll: ''')'
							]
							ifFalse: [self ___printDecoratorNameOn___: aStream name: deco]
					]
					ifFalse: [deco printSmalltalkWithParenthesisOn: aStream].
				"Phase A: when the target is module-scope, the value-block
				arg ``{ name }'' reads the just-defined function through
				dynamicInstVarAt: (no Smalltalk temp exists), and the
				trailing ``)'' closes the dynamicInstVarAt:put: paren
				opened above.  Function-local targets keep the bare
				``{ name }'' form."
				(self isModuleScopeNestedDefTarget) ifTrue: [
					aStream
						nextPutAll: ' value: { (self @env0:dynamicInstVarAt: #''';
						nextPutAll: name;
						nextPutAll: ''' ifAbsent: [nil]) } value: nil).'
				] ifFalse: [
					aStream
						nextPutAll: ' value: { ';
						nextPutAll: name;
						nextPutAll: ' } value: nil.'
				].
			].
		].
	].
%

category: 'Grail-code generation'
method: FunctionDefAst
emitKwDefaultsCellInitOn: aStream
	"Emit the def-time keyword-only-defaults CELL inside the def's outer wrapper:
	``___kwdefaults___ := { <dict-or-nil> }''.  The cell is a one-slot Array the
	inner block captures for its per-call keyword-only binding AND that
	``___pyKwDefaults___:'' records on the block, so ``func.__kwdefaults__'' and
	its assignment both see it.  The slot holds a dict of {name -> evaluated
	default} for the keyword-only params that HAVE a default, or nil when none do
	(CPython's ``__kwdefaults__'' is None then).  Each default is evaluated ONCE
	here, at def-time in the enclosing scope -- the correct point, so a mutable
	keyword-only default is shared across calls."

	| anyDefault |
	anyDefault := ((args kw_defaults ifNil: [#()])
		detect: [:d | d notNil] ifNone: [nil]) notNil.
	anyDefault ifFalse: [
		aStream nextPutAll: '___kwdefaults___ := { nil }.'; lf.
		^ self].
	aStream nextPutAll: '___kwdefaults___ := { (PyDict perform: #new env: 0) }.'; lf.
	args kwonlyargs doWithIndex: [:each :i |
		| def |
		def := (args kw_defaults ifNil: [#()]) at: i ifAbsent: [nil].
		def ifNotNil: [
			aStream
				nextPutAll: '(___kwdefaults___ @env0:at: 1) @env0:at: ''';
				nextPutAll: each name;
				nextPutAll: ''' put: '.
			def printSmalltalkOn: aStream.
			aStream nextPutAll: '.'; lf]].
%

category: 'Grail-code generation'
method: FunctionDefAst
emitKeywordOnlyBindingOn: aStream
	"Bind each keyword-only parameter in the closure (block) form.  The block
	form historically left these UNBOUND, so a nested ``def f(*, k): ...''
	declared k as a temp but never assigned it and any use raised
	UnboundLocalError.  Each param resolves in priority order: the passed keyword
	(``___kwargs___''), else the CURRENT ``___kwdefaults___'' cell contents, else
	TypeError.  Consulting the cell (rather than an inlined default) is what lets
	``func.__kwdefaults__ = {...}'' change what the next call binds."

	"Every keyword-only name goes into the all-at-once check, not just the ones
	declared without a default: this form reads its defaults from the LIVE cell,
	so ``del f.__kwdefaults__['k']'' makes a defaulted parameter required, and
	CPython reports it here when the call omits it."
	self printMissingKeywordOnlyCheckOn: aStream
		kwargsName: '___kwargs___'
		defaultsSource: '(___kwdefaults___ @env0:at: 1)'
		names: self ___allKeywordOnlyNames___.
	(args kwonlyargs ifNil: [#()]) do: [:each |
		| nm pn |
		nm := each name.
		pn := self transportParamName: each name.
		aStream nextPutAll: pn; nextPutAll: ' := ___kwargs___ ifNil: ['.
		self emitKwDefaultLookupFor: nm on: aStream.
		aStream
			nextPutAll: '] ifNotNil: [___kwargs___ @env0:at: ''';
			nextPutAll: nm;
			nextPutAll: ''' ifAbsent: ['.
		self emitKwDefaultLookupFor: nm on: aStream.
		aStream nextPutAll: ']].'; lf].
%

category: 'Grail-code generation'
method: FunctionDefAst
emitKwDefaultLookupFor: nm on: aStream
	"Emit the ``consult the ___kwdefaults___ cell, else TypeError'' fallback for
	one keyword-only parameter -- used in both arms of its ``___kwargs___'' probe
	(the param may be absent from the kwargs dict, or the dict may be nil)."

	aStream nextPutAll: '(___kwdefaults___ @env0:at: 1) ifNil: ['.
	self printSingleMissingArgumentOn: aStream name: nm kind: 'keyword-only'.
	aStream
		nextPutAll: '] ifNotNil: [:___d___ | ___d___ @env0:at: ''';
		nextPutAll: nm;
		nextPutAll: ''' ifAbsent: ['.
	self printSingleMissingArgumentOn: aStream name: nm kind: 'keyword-only'.
	aStream nextPutAll: ']]'.
%

category: 'Grail-code generation'
method: FunctionDefAst
isModuleScopeNestedDefTarget
	"Phase A: true if this nested (non-isModuleLevelDef) def lands at
	module scope — the parser declared its name in module body
	variables, no enclosing function shadows it, and we're inside a
	module-body compile (not a user class body).  Drives whether the
	bare ``<name> := ...'' emit gets rewritten to a
	dynamicInstVarAt:put: store."

	| node |
	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global f'' in the nearest enclosing scope forces the module route,
	ahead of BOTH guards below: it holds inside a class METHOD (where the
	receiver becomes the module singleton, not self), and it holds for a
	name the module body never mentions -- ``def f(): global g; def g()...''
	creates the module binding at call time, so g is not in
	moduleVariableNames.  Missing it emitted a bare assignment to a name
	the parser had (correctly) not declared, and the method failed to
	compile."
	(self ___nearestEnclosingScopeDeclaresGlobal___: name asSymbol)
		ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	CallAst moduleVariableNames ifNil: [^ false].
	(CallAst moduleVariableNames includes: name asSymbol) ifFalse: [^ false].
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				(self ___enclosingDefDeclares___: node named: name asSymbol)
					ifTrue: [^ false]
			].
		node := node parent.
	].
	^ true
%

category: 'Grail-code generation'
method: FunctionDefAst
___enclosingDefDeclares___: funcAst named: aSymbol
	"True iff funcAst (a FunctionDef/Lambda) declares aSymbol as a
	parameter or body local.  Mirrors NameAst's __functionDeclaresLocal:."

	| ivars idx argsNode bodyNode |
	ivars := funcAst class allInstVarNames.
	idx := ivars indexOf: #body.
	bodyNode := idx > 0 ifTrue: [funcAst instVarAt: idx] ifFalse: [nil].
	((bodyNode isKindOf: BlockAst) and: [bodyNode variables includes: aSymbol])
		ifTrue: [^ true].
	idx := ivars indexOf: #args.
	argsNode := idx > 0 ifTrue: [funcAst instVarAt: idx] ifFalse: [nil].
	argsNode ifNil: [^ false].
	#(#args #posonlyargs #kwonlyargs) do: [:fld |
		| fldIdx list |
		fldIdx := argsNode class allInstVarNames indexOf: fld.
		fldIdx > 0 ifTrue: [
			list := argsNode instVarAt: fldIdx.
			list ifNotNil: [
				(list anySatisfy: [:a | a name asSymbol == aSymbol])
					ifTrue: [^ true]
			]
		]
	].
	^ false
%

category: 'Grail-code generation'
method: FunctionDefAst
applicableModuleDecorators
	"Decorators to apply at module-body time for a top-level def: ALL of
	decorator_list.  Source order preserved (outermost first), so ``@A @B def f''
	yields { A. B } and is applied as A(B(f)).

	This used to reject the class-declarative ones (staticmethod / classmethod /
	property) on the grounds that the parser had already handled them by
	re-classing the node.  It only does that INSIDE a class -- PythonParser
	re-classes under ``classNesting > 0'' -- so at module scope nothing had
	handled them and rejecting them silently DROPPED the decorator:

	    @classmethod
	    def f(cls, arg): ...
	    type(f)        # CPython: classmethod.  Was: the plain function.

	``classmethod(f)'' spelled as a call already answered a real classmethod, so
	the two spellings disagreed.  It matters beyond introspection because the
	descriptor kind is what a later consumer dispatches on: functools'
	test_callable_register registers ``@classmethod def _(cls, arg)'' with
	singledispatch, and a plain function there is called without its class."

	decorator_list isNil ifTrue: [^ #()].
	^ decorator_list
%

category: 'Grail-code generation'
method: FunctionDefAst
applicableMethodDecorators
	"Decorators to apply at class-build time for a CLASS-BODY method, as
	``Cls.m = A(B(Cls.m))'' -- the module-scope ``applicableModuleDecorators''
	for methods.  Source order preserved (outermost first).

	Empty for a def Grail already handles some other way, because applying the
	decorator on top of that handling would either double-apply it or wrap a
	body that is deliberately not the Python one:

	  * @staticmethod / @classmethod / @property -- handled at PARSE time by
	    re-classing this node (isClassDeclarativeDecorator:), and @property is
	    additionally paired with a synthesized setter.
	  * @cached_property -- ClassDefAst realises it as the same getter/setter
	    pair, using the setter as the cache slot.
	  * @x.setter / @x.getter / @x.deleter -- property accessor forms; the def
	    IS the accessor and compiles to the paired selector.
	  * @typing.overload -- the stub is not the implementation.
	  * @requires_resource / @cpython_only -- ClassDefAst replaced the BODY
	    with a self.skipTest(...), so there is no real method to wrap.
	  * @bigmemtest and friends -- the def was normalised to a dry-run
	    varargs form with an injected size default.
	  * grail's @smalltalk -- the body is rewritten into an env-0 forwarder."

	(self isOverloadStub
		or: [self isBigmemtestDecorated
		or: [self isRequiresResourceDecorated
		or: [self isCpythonOnlyDecorated
		or: [self isSmalltalkForwarder]]]]) ifTrue: [^ #()].
	decorator_list isNil ifTrue: [^ #()].
	^ decorator_list reject: [:deco |
		(self isClassDeclarativeDecorator: deco)
			or: [(self isCachedPropertyDecorator: deco)
				or: [self isPropertyAccessorDecorator: deco]]]
%

category: 'Grail-code generation'
method: FunctionDefAst
isCachedPropertyDecorator: deco
	"Bare ``@cached_property'' -- ClassDefAst turns it into a getter/setter
	pair, so it must not also be applied as a runtime decorator call."

	(deco isKindOf: Symbol) ifFalse: [^ false].
	^ deco asSymbol == #'cached_property'
%

category: 'Grail-code generation'
method: FunctionDefAst
isPropertyAccessorDecorator: deco
	"``@x.setter'' / ``@x.getter'' / ``@x.deleter'' -- an AttributeAst whose
	value is a plain name.  The decorated def IS the accessor and compiles to
	the property's paired selector; calling ``x.setter(...)'' at class-build
	time would be meaningless."

	| a |
	(deco isKindOf: AttributeAst) ifFalse: [^ false].
	(deco value isKindOf: NameAst) ifFalse: [^ false].
	a := deco attr asString.
	^ a = 'setter' or: [a = 'getter' or: [a = 'deleter']]
%

category: 'Grail-code generation'
method: FunctionDefAst
___hasWrappingDecorator___
	"True when this def carries a decorator that REPLACES the function with
	something else at runtime -- @contextlib.contextmanager, @functools.wraps,
	any user decorator -- as opposed to the STRUCTURAL ones Grail handles by
	putting the def in a different bucket (@property and its setter/getter/
	deleter, @staticmethod, @classmethod) or by interpreting them itself.

	Such a def has TWO distinct entities: the compiled Smalltalk method (the
	RAW, undecorated function) and the class-dict entry (the decorator's
	RESULT).  A ``self.m()'' fast-path send reaches the former, which is why
	it must be suppressed -- see CallAst>>classSelfSendSelector."

	| structural |
	decorator_list isNil ifTrue: [^ false].
	"decorator_list holds SYMBOLS (PythonParser builds decoratorNames), not
	AST nodes.  Testing for NameAst/AttributeAst therefore matched nothing
	and fell through to the ``unrecognized => wrapping'' default for EVERY
	entry -- so even a bare @classmethod counted as wrapped.  That was
	merely wasteful before (the fast path was suppressed and the attribute
	path answered the same method), but it now decides whether a classmethod
	is re-wrapped in a descriptor, where it has to be right."
	structural := #(#'property' #'staticmethod' #'classmethod' #'setter'
		#'getter' #'deleter' #'abstractmethod' #'abstractproperty'
		#'cached_property').
	^ decorator_list anySatisfy: [:deco |
		(deco isKindOf: Symbol)
			ifTrue: [(structural includes: deco asSymbol) not]
			ifFalse: ["a non-symbol entry is a call form such as @deco(arg)"
				true]]
%

category: 'Grail-code generation'
method: FunctionDefAst
isDeleterDecorated
	"True when this def is a property DELETER (``@x.deleter def x(self)'').
	Such a def has the SAME unary signature as the property getter, so
	compiling it under the plain name ``x'' would OVERWRITE the getter; the
	ClassDefAst emit redirects it to a distinct ``___propDeleter_x'' selector
	that the delete path (object>>___pyAttrDelete___) invokes for ``del
	obj.x''."

	decorator_list isNil ifTrue: [^ false].
	^ (decorator_list detect: [:deco |
		(deco isKindOf: AttributeAst)
			and: [(deco value isKindOf: NameAst)
			and: [deco attr asString = 'deleter']]] ifNone: [nil]) notNil
%

category: 'Grail-code generation'
method: FunctionDefAst
printMethodDecoratorsOn: aStream decorators: decoList className: aClassName siblingNames: siblingNames
	"Rebind a decorated class-body method: ``Cls.m = A(B(Cls.m))''.

	This is what CPython does, one step removed.  There, the decorator runs
	during class-body execution and the class dict never holds anything but
	the final wrapper.  Grail compiles the def to a real Smalltalk method
	first, so the earliest the decorator can run is once the class exists --
	hence a store over the compiled method rather than in place of it.  For
	that store to be visible the class-attribute lookup has to beat the
	compiled method on BOTH the class and the instance path; see
	object >> ___classChainAttrLookup___: and its caller.

	Emitted BEFORE the metaclass hook and class decorators, matching CPython's
	order: the class body -- decorated methods and all -- is complete before
	either of those sees the class.  It also has to precede
	___canonicalClassRegister___, which is what makes the store DEFINITIONAL
	rather than a runtime mutation, and the store goes straight to the
	committed per-class holder so it cannot be dropped by the warm-reuse
	overlay reset.

	The original method is read ONCE as the innermost base of the chain, so a
	chain threads correctly even when an inner decorator returns a fresh
	wrapper.

	Wrapped in a handler, like the module-scope path: if applying a decorator
	raises, the store never runs and the compiled method stays in place --
	exactly the previous behaviour of dropping the decorator.  That keeps this
	strictly additive; decorators that apply take effect, decorators that
	cannot are no worse than before.  Python control-flow signals are
	re-raised rather than swallowed."

	aStream
		nextPutAll: '[';
		nextPutAll: aClassName;
		nextPutAll: ' @env1:___classHolderAttrStore___: #''';
		nextPutAll: name;
		nextPutAll: ''' put: '.
	"A decorator may name a SIBLING def -- ``@t.register(int)''.  Announce the
	class-body namespace for the duration of the chain so NameAst resolves such
	a name off the class rather than the module; see
	CallAst >> classBodyDecoratorScope.  Cleared on the way out, including on
	an emit error, so it can never leak into an unrelated compile."
	CallAst classBodyDecoratorScope: aClassName -> siblingNames.
	"A decorated @classmethod's chain now produces a PLAIN callable taking
	``cls'' (see printMethodDecoratorChainOn:), so re-apply the classmethod
	descriptor over the result -- classmethod(deco(m)), CPython's order.
	PyClassMethod already answers __get__, which the class-attribute read
	paths honour, so the class gets bound on every access shape."
	(self ___decoratorBaseIsClassMethod___
		and: [self ___classMethodIsOutermost___])
		ifTrue: [aStream nextPutAll: '(PyClassMethod @env1:__new__: '].
	[self
		printMethodDecoratorChainOn: aStream
		decorators: decoList
		index: 1
		className: aClassName]
			ensure: [CallAst classBodyDecoratorScope: nil].
	(self ___decoratorBaseIsClassMethod___
		and: [self ___classMethodIsOutermost___])
		ifTrue: [aStream nextPutAll: ')'].
	aStream
		nextPutAll: '] @env0:on: AbstractException do: [:___de |'; lf;
		nextPutAll: '	((___de isKindOf: PythonReturn) @env0:or: [(___de isKindOf: PythonBreak) @env0:or: [___de isKindOf: PythonContinue]]) ifTrue: [___de @env0:pass]].';
		lf
%

category: 'Grail-code generation'
method: FunctionDefAst
___classMethodIsOutermost___
	"Is ``@classmethod'' the OUTERMOST decorator on this def?

	decorator_list is written outermost-first, and applied bottom-up, so
	``@classmethod @deco def m'' is classmethod(deco(m)) -- classmethod wraps
	LAST and the descriptor belongs on the outside.  But
	``@singledispatchmethod @classmethod def m'' is the other order: the
	classmethod applies FIRST and singledispatchmethod's descriptor is what
	the class must hold.  Re-wrapping that in a classmethod broke
	functools' TestSingleDispatch (a PyClassMethod is not callable and
	reprs as ``<classmethod object>'').

	Only the outermost case gets the rewritten base and the descriptor; any
	other position keeps the pre-existing emit."

	| first |
	decorator_list isNil ifTrue: [^ false].
	decorator_list isEmpty ifTrue: [^ false].
	first := decorator_list at: 1.
	^ (first isKindOf: Symbol) and: [first asSymbol == #'classmethod']
%

category: 'Grail-code generation'
method: FunctionDefAst
___decoratorBaseIsClassMethod___
	"Is this def a @classmethod?  False here; ClassFunctionDefAst overrides.

	Separate from ___decoratorBaseIsClassSide___, which a @staticmethod also
	answers true to.  The two need DIFFERENT decorator bases: a staticmethod
	ignores its receiver, so a BoundMethod on the class is harmless, while a
	classmethod's receiver IS ``cls'' and must reach the decorator."

	^ false
%

category: 'Grail-code generation'
method: FunctionDefAst
___decoratorBaseIsClassSide___
	"Does this def compile onto the metaclass rather than the instance side?
	False here; ClassFunctionDefAst (@classmethod) and StaticFunctionDefAst
	(@staticmethod) override.  Decides which callable a class-body decorator
	receives as the base of its chain -- see
	printMethodDecoratorChainOn:decorators:index:className:."

	^ false
%

category: 'Grail-code generation'
method: FunctionDefAst
printMethodDecoratorChainOn: aStream decorators: decoList index: i className: aClassName
	"Nested decorator application A(B(...(the method)...)).  At the base case
	emit an UnboundMethod naming the COMPILED method -- what CPython hands a
	decorator, a plain function taking self first.

	Minted DIRECTLY rather than read back as ``Cls.m''.  The read is not
	idempotent: the rebinding this chain feeds stores onto the committed class,
	so a second execution of the class body would read the FIRST run's wrapper
	as its base and wrap the wrapper.  Flask's ``@setupmethod'' showed exactly
	that -- two nested setupmethod frames around one _add_url_rule, and the
	inner guard raising NotImplementedError.  Naming the compiled method
	directly makes re-execution replace the wrapper instead of stacking on it."

	i > decoList size ifTrue: [
		"A @classmethod / @staticmethod def is compiled CLASS-side, so the
		UnboundMethod form -- which resolves instance-side -- names nothing and
		the decorator dies on the first call.  Hand those a BoundMethod on the
		class instead: calling it dispatches the class-side selector with the
		class as receiver, which is exactly ``cls'' for a classmethod and an
		ignored receiver for a staticmethod.  It is also the right descriptor
		distinction for a decorator to see -- CPython hands over a classmethod
		or staticmethod OBJECT here, neither of which binds an instance."
		(self ___decoratorBaseIsClassMethod___
			and: [self ___classMethodIsOutermost___])
			ifTrue: [
				"``@classmethod @deco def m(cls, ...)'' is classmethod(deco(m)):
				deco wraps the RAW function, which still takes ``cls'', and
				classmethod binds it afterwards.  Handing deco a BoundMethod on
				the class instead bound cls FIRST, so the wrapper never saw it --
				CPython passes (cls, x) where Grail passed (x).  An UnboundMethod
				rooted at the METAclass is the unbound form: called with
				(cls, ...) it performs the class-side selector on cls."
				aStream
					nextPutAll: '(UnboundMethod definingClass: ';
					nextPutAll: aClassName;
					nextPutAll: ' @env0:class selector: #''';
					nextPutAll: name;
					nextPutAll: ''')']
			ifFalse: [self ___decoratorBaseIsClassSide___
			ifTrue: [
				"@staticmethod: the receiver is ignored, so a BoundMethod on the
				class is the right shape already."
				aStream
					nextPutAll: '(BoundMethod receiver: ';
					nextPutAll: aClassName;
					nextPutAll: ' selector: #''';
					nextPutAll: name;
					nextPutAll: ''')']
			ifFalse: [
				aStream
					nextPutAll: '(UnboundMethod definingClass: ';
					nextPutAll: aClassName;
					nextPutAll: ' selector: #''';
					nextPutAll: name;
					nextPutAll: ''')']].
		^ self].
	aStream nextPutAll: '(('.
	self printDecoratorReceiverOn: aStream deco: (decoList at: i).
	aStream nextPutAll: ') @env1:___pyCallValue___: { '.
	self
		printMethodDecoratorChainOn: aStream
		decorators: decoList
		index: i + 1
		className: aClassName.
	aStream nextPutAll: ' } kw: nil)'
%

category: 'Grail-code generation'
method: FunctionDefAst
printModuleDecoratorsOn: aStream decorators: decoList
	"Apply module-level function decorators.  ``@A @B def f'' rebinds f
	to A(B(f)); the result is stored into f's dynamic-instVar slot so
	both attribute reads and bare calls pick it up (an absent slot would
	route a bare call to the fast self-send of the undecorated method).
	The original function is read ONCE as a BoundMethod (the innermost
	base of the chain) via ___moduleAttrLoad___:, and the decorators
	nest around it — so a chain threads correctly even when an inner
	decorator returns a fresh wrapper rather than the original.

	The application is wrapped in a handler: if applying any decorator
	raises (e.g. werkzeug's ``@LocalProxy'', a class that isn't callable
	through the Grail call path), the store never runs and the slot is
	left ABSENT — exactly the pre-fix behaviour (decorator dropped, bare
	call uses the fast self-send of the real method).  This makes the
	generalisation strictly additive: decorators that apply cleanly take
	effect, decorators that can't are no worse than before.  Control-flow
	signals (Python return / break / continue) are re-raised."

	aStream
		lf;
		nextPutAll: '[self @env0:dynamicInstVarAt: #''';
		nextPutAll: name;
		nextPutAll: ''' put: '.
	self printDecoratorChainOn: aStream decorators: decoList index: 1.
	aStream
		nextPutAll: '] @env0:on: AbstractException do: [:___de |'; lf;
		nextPutAll: '	((___de isKindOf: PythonReturn) @env0:or: [(___de isKindOf: PythonBreak) @env0:or: [___de isKindOf: PythonContinue]]) ifTrue: [___de @env0:pass]].'
%

category: 'Grail-code generation'
method: FunctionDefAst
printDecoratorChainOn: aStream decorators: decoList index: i
	"Recursively emit the nested decorator-application expression
	A(B(...(f)...)) as ``(decoRecv ___pyCallValue___: { <inner> } kw: nil)''.
	index i is the 1-based position in decoList (1 = outermost decorator);
	at the base case (i past the end) emit the original function read as
	a BoundMethod from the module instance."

	| modName |
	i > decoList size ifTrue: [
		modName := CallAst moduleClassBeingCompiled name.
		aStream
			nextPutAll: '((';
			nextPutAll: modName;
			nextPutAll: ' @env0:___instance___) @env1:___moduleAttrLoad___: #''';
			nextPutAll: name;
			nextPutAll: ''')'.
		^ self].
	aStream nextPutAll: '(('.
	self printDecoratorReceiverOn: aStream deco: (decoList at: i).
	aStream nextPutAll: ') @env1:___pyCallValue___: { '.
	self printDecoratorChainOn: aStream decorators: decoList index: i + 1.
	aStream nextPutAll: ' } kw: nil)'
%

category: 'Grail-code generation'
method: FunctionDefAst
printDecoratorReceiverOn: aStream deco: deco
	"Emit the decorator expression as the receiver of a
	___pyCallValue___:kw: send.  A bare-Symbol module-scope
	decorator routes through ___moduleAttrLoad___ so the function
	lazy-wraps as a BoundMethod; an AttributeAst form
	(``module.deco_name'') falls through to its own emit."

	(deco isKindOf: Symbol) ifTrue: [
		(CallAst moduleVariableNames notNil
			and: [CallAst moduleVariableNames includes: deco asSymbol])
			ifTrue: [
				aStream
					nextPutAll: '((';
					nextPutAll: CallAst moduleClassBeingCompiled name;
					nextPutAll: ' @env0:___instance___) @env1:___moduleAttrLoad___: #''';
					nextPutAll: deco asString;
					nextPutAll: ''')'
			]
			ifFalse: [self ___printDecoratorNameOn___: aStream name: deco].
		^ self
	].
	deco printSmalltalkWithParenthesisOn: aStream
%
category: 'Grail-code generation'
method: FunctionDefAst
___printDecoratorNameOn___: aStream name: aSymbol
	"Emit a BARE-NAME decorator (the parser records those as Symbols rather
	than NameAsts) as the receiver of the decorator call.

	Normally the bare Smalltalk identifier is right: it names an enclosing
	method temp, a module-body slot, or a resolvable global.  IN A DOIT it can
	name nothing at all, and then a bare identifier is not a runtime error but
	a COMPILE error -- ``[1031] undefined symbol'' -- which aborts the whole
	exec()/eval() and cannot be caught from Python.  CPython raises NameError
	there, which is catchable, and test_decorators test_errors requires exactly
	that: ``eval(compile('@undef\ndef f(): pass\n...'), ctx)'' must raise
	NameError.

	___resolveBuiltinOrSignal___: is the same emit NameAst's own free-name
	fallback uses, so the two agree: it resolves a name injected into builtins
	at run time and raises the identical NameError on a miss."

	(self ___decoratorNameNeedsRuntimeLookup___: aSymbol)
		ifFalse: [
			aStream nextPutAll: aSymbol asString.
			^ self].
	aStream
		nextPutAll: '(NameError @env0:___resolveBuiltinOrSignal___: ''';
		nextPutAll: aSymbol asString;
		nextPutAll: ''')'
%

category: 'Grail-code generation'
method: FunctionDefAst
___decoratorNameNeedsRuntimeLookup___: aSymbol
	"Would a bare Smalltalk identifier for this decorator name fail to
	COMPILE?  Mirrors the four things NameAst's doit fallback accepts as
	resolvable, and answers false for anything it cannot be sure about.

	GATED ON DOIT CONTEXT ON PURPOSE.  Outside a doit the enclosing method's
	temps are not enumerable from here, so ``I could not find it'' does not
	mean ``it is not there'' -- and every ordinary decorator in the corpus goes
	through this emit, so guessing wrong would convert working code into a
	NameError raise.  Inside a doit the question is answerable: the scope is a
	symbol list with a pre-created slot per module-body variable of the source
	being compiled (ModuleAst >> ensureModuleScope:), which is what
	``moduleVariableNames'' records."

	| sym scope |
	scope := ModuleAst compilingDoitScope.
	scope isNil ifTrue: [^ false].
	sym := aSymbol asSymbol.
	"ASK THE SYMBOL LIST FIRST, which is the only test that sees names the
	CALLER supplied.  exec()/eval() seed their globals and locals into the
	doit's scope (builtins >> ___seedDoitScope___:from:), so ``@nullval'' with
	``nullval'' in the passed-in globals resolves perfectly well -- while none
	of the static records below know anything about it: moduleVariableNames
	holds the module-body variables of the SOURCE, not the caller's namespace.
	Consulting only those reported every context-supplied decorator as
	undefined, turning test_errors' expected TypeError from ``@nullval'' into a
	NameError.  This is the same advice ModuleAst >> compilingDoitScope gives
	for NameAst's fallback: asking the symbol list is asking exactly the
	question the Smalltalk compiler is about to ask."
	([(scope resolveSymbol: sym) notNil
		or: [(scope resolveSymbol: (NameAst doitScopeNameFor: sym) asSymbol) notNil]]
			on: AbstractException do: [:ex | ex return: true]) ifTrue: [^ false].
	(CallAst moduleVariableNames notNil
		and: [CallAst moduleVariableNames includes: sym]) ifTrue: [^ false].
	(CallAst moduleFunctionNames notNil
		and: [CallAst moduleFunctionNames includes: sym]) ifTrue: [^ false].
	(self ___pythonLocalInEnclosingFunctions___: sym) ifTrue: [^ false].
	(NameAst isResolvableSymbol: sym) ifTrue: [^ false].
	^ true
%

category: 'Grail-code generation'
method: FunctionDefAst
emitOrderedLocalDecoratorsOn: aStream decorators: decoList
	"Apply a CHAIN of decorators to a function-local (or module-scope-nested)
	def in CPython's order: evaluate every decorator EXPRESSION top-down, then
	call the resulting decorators bottom-up.

	Emitted as ONE statement, because splitting the phases needs somewhere to
	keep the evaluated decorators and there is no way to declare a temp at this
	point in the emit.  A block parameter is that somewhere:

		foo := [:___grailDecoFns___ |
			((___grailDecoFns___ @env0:at: 1) value: {
				((___grailDecoFns___ @env0:at: 2) value: { foo } value: nil) }
					value: nil)
		] @env0:value: { <deco 1 expr>. <deco 2 expr> }.

	The brace array is the point of the shape: its elements evaluate
	left-to-right, in SOURCE order, and all of them before the block is
	entered -- so every decorator-maker call happens before any decorator is
	applied.  The block then nests the applications the other way up, so the
	decorator nearest the def is called first."

	| n |
	n := decoList size.
	aStream lf.
	(self isModuleScopeNestedDefTarget)
		ifTrue: [
			aStream
				nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: name;
				nextPutAll: ''' put: ([']
		ifFalse: [
			aStream
				nextPutAll: name;
				nextPutAll: ' := ['].
	aStream nextPutAll: ':___grailDecoFns___ |'; lf.
	self emitOrderedLocalDecoratorApplicationOn: aStream index: 1 count: n.
	aStream nextPutAll: '] @env0:value: { '.
	1 to: n do: [:i |
		i > 1 ifTrue: [aStream nextPutAll: '. '].
		self printDecoratorReceiverOn: aStream deco: (decoList at: i)].
	aStream nextPutAll: ' }'.
	(self isModuleScopeNestedDefTarget)
		ifTrue: [aStream nextPutAll: ').']
		ifFalse: [aStream nextPutAll: '.']
%

category: 'Grail-code generation'
method: FunctionDefAst
emitOrderedLocalDecoratorApplicationOn: aStream index: i count: n
	"The nested application expression, reading the ALREADY-EVALUATED
	decorators out of the block's array argument.  i is the 1-based index into
	that array; 1 is the outermost decorator, which CPython applies LAST, so it
	is the outermost call here.  At the base case emit the undecorated
	function."

	i > n ifTrue: [^ self emitOrderedLocalDecoratorBaseOn: aStream].
	aStream
		nextPutAll: '((___grailDecoFns___ @env0:at: ';
		nextPutAll: i printString;
		nextPutAll: ') value: { '.
	self emitOrderedLocalDecoratorApplicationOn: aStream index: i + 1 count: n.
	aStream nextPutAll: ' } value: nil)'
%

category: 'Grail-code generation'
method: FunctionDefAst
emitOrderedLocalDecoratorBaseOn: aStream
	"The undecorated function at the base of the chain, read the same way the
	one-decorator-at-a-time path reads it: a module-scope nested def has no
	Smalltalk temp to name, so it comes back out of the module instance's
	dynamic-instVar storage."

	(self isModuleScopeNestedDefTarget)
		ifTrue: [
			aStream
				nextPutAll: '(self @env0:dynamicInstVarAt: #''';
				nextPutAll: name;
				nextPutAll: ''' ifAbsent: [nil])']
		ifFalse: [aStream nextPutAll: name]
%


category: 'Grail-code generation'
method: FunctionDefAst
___parserReclassedThisDef___
	"Did PythonParser convert this node into one of its class-body subclasses?
	That conversion IS how a @staticmethod / @classmethod / @property is handled,
	so it is also the signal that the decorator must not be applied again.

	Answered by class rather than by a flag, because the conversion is a
	changeClassTo: -- the node's class is the record of it."

	^ (self isKindOf: StaticFunctionDefAst)
		or: [(self isKindOf: ClassFunctionDefAst)
			or: [self isKindOf: InstanceFunctionDefAst]]
%

category: 'Grail-code generation'
method: FunctionDefAst
___emitQualnameOn___: aStream name: aName
	"Emit ``; ___pyQualname___: '<dotted path>''' when this def is nested.

	The prefix comes from the emission context: CallAst functionBeingCompiled is
	the ENCLOSING def while a nested one is emitted, and classBeingCompiled names
	the class around it, so a def in a method of class A reads
	``A.meth.<locals>.inner''.  CPython puts ``<locals>'' between an enclosing
	FUNCTION and the names inside it.

	Nothing is emitted when there is no enclosing def: a bare name is already the
	right answer at module and class level, and ExecBlock >> __qualname__ falls
	back to __name__.  Deeper nesting reports from the nearest enclosing def --
	still closer than the bare name, and one level is what the corpus asks for."

	| qualified |
	"__module__ first, and unconditionally: a closure otherwise answers the
	``<closure>'' placeholder, because a module-level def gets its module by
	forwarding to the receiving module and a block has no receiver to forward
	to.  Pickling a callable by reference needs it alongside the qualname."
	CallAst moduleNameBeingCompiled ifNotNil: [:modName |
		aStream
			nextPutAll: '; @env0:___pyModuleNamed___: ''';
			nextPutAll: modName asString;
			nextPutAll: ''''].
	qualified := self ___qualifiedNameFor___: aName.
	qualified = aName asString ifTrue: [^ self].
	aStream
		nextPutAll: '; @env0:___pyQualname___: ''';
		nextPutAll: qualified;
		nextPutAll: ''''
%

category: 'Grail-code generation'
method: FunctionDefAst
___qualifiedNameFor___: aName
	"``Cls.meth.<locals>.aName'' when this def is nested, else aName unchanged.
	CPython puts ``<locals>'' between an enclosing FUNCTION and the names inside
	it, and nothing between an enclosing CLASS and them -- a class body is not a
	function scope.

	The path comes from CallAst's lexical scope stack, which this def has not yet
	pushed itself onto at stamp time and HAS during its own body emit; the reader
	handles both.  It used to come from ``functionBeingCompiled'' and
	``classBeingCompiled'' directly, which hold one value each and so truncated
	anything deeper than one level: ``def a(): def b(): def c()'' answered
	``b.<locals>.c'' rather than CPython's ``a.<locals>.b.<locals>.c''.

	Shared by the __qualname__ stamp and by the arity-error message, which CPython
	also phrases with the qualified name -- test_keywordonlyarg builds its
	expected text from ``f.__qualname__'', so the two have to agree by
	construction rather than by coincidence."

	^ CallAst ___qualnameFor___: self name: aName
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

category: 'Grail-code generation'
method: FunctionDefAst
___annotatedArgs___
	"Every ArgAst across posonly/regular/kwonly params plus *vararg and
	**kwarg, in declaration order, that carries an annotation.  Used to
	build __annotations__ (CPython includes only annotated params)."

	| result |
	result := OrderedCollection new.
	args ifNil: [^ result].
	(args posonlyargs, args args, args kwonlyargs) do: [:a |
		a annotation ifNotNil: [result add: a]].
	(args vararg notNil and: [args vararg annotation notNil])
		ifTrue: [result add: args vararg].
	(args kwarg notNil and: [args kwarg annotation notNil])
		ifTrue: [result add: args kwarg].
	^ result
%

category: 'Grail-code generation'
method: FunctionDefAst
hasAnnotations
	"True when any parameter or the return carries an annotation --
	gates emission of the __annotations__ stamp."

	^ returns notNil or: [self ___annotatedArgs___ notEmpty]
%

category: 'Grail-code generation'
method: FunctionDefAst
___receiverParamName___
	"The name of the parameter that ClassDefAst's signature table DROPS --
	``self'' for an instance method, ``cls'' for a classmethod, whatever the
	def actually wrote.  nil when the def declares no positional parameter.

	The table is bound-shaped on purpose (a bound access supplies the
	receiver, and CPython omits it there), but the UNBOUND read must show it:
	CPython's ``signature(Cls.method)'' includes ``self''.  Recording the name
	separately keeps the existing table byte-identical while making the
	unbound form reconstructible -- the alternative, emitting the receiver
	into the spec and stripping it at every bound read, would have needed a
	staticness marker in the table too."

	| allPositional |
	args ifNil: [^ nil].
	allPositional := (args posonlyargs ifNil: [#()]) , (args args ifNil: [#()]).
	allPositional isEmpty ifTrue: [^ nil].
	^ (allPositional at: 1) name asString
%

category: 'Grail-code generation'
method: FunctionDefAst
___namesEnclosingReceiver___: aSymbolOrNil
	"Does this def's body mention a name that compiles to the bare Smalltalk
	receiver?

	Asked of a ZERO-PARAMETER def, where the answer decides whether the def can
	be run without one.  Such a def has no receiver of its own, so any ``self''
	it names is CAPTURED from an enclosing method -- and Grail compiles a
	captured receiver to bare ``self'' rather than to a closure cell, which is
	what makes running the def against a substitute receiver visible in its
	answers rather than merely irrelevant.

	Both spellings are checked: the literal ``self'', which is what nearly every
	body writes, and whatever CallAst has as the receiver name in the scope this
	class is being emitted into, which is what the enclosing def actually called
	it.  A name that is genuinely local to this def would also match -- a false
	positive that costs a call the ability to run receiverless and changes no
	answer, which is the direction the error has to fall."

	body ifNil: [^ false].
	^ body ___anyDescendantSatisfies___: [:n |
		(n isKindOf: NameAst)
			and: [n id asSymbol == #'self'
				or: [aSymbolOrNil notNil
					and: [n id asSymbol == aSymbolOrNil asSymbol]]]]
%

category: 'Grail-code generation'
method: FunctionDefAst
hasSignatureSpec
	"True when this def declares any parameter at all -- gates emission of
	the inspect.signature spec.  A niladic def renders as ``()'' with or
	without a spec, so it does not pay for one."

	args ifNil: [^ false].
	^ args posonlyargs notEmpty
		or: [args args notEmpty
		or: [args kwonlyargs notEmpty
		or: [args vararg notNil
		or: [args kwarg notNil]]]]
%

category: 'Grail-code generation'
method: FunctionDefAst
emitPyCodeExprOn: aStream qualname: aQualname
	"Write the Smalltalk expression building THIS def's ``__code__'' PyCode.

	Shared by the two emitters that stamp a def compiling to a real Smalltalk
	METHOD -- ClassDefAst >> emitMethodCodeTableOn:className: (class body) and
	importlib's top-level-def pass (module body) -- so the three parameter
	counts are derived in exactly one place, and identically to the nested-def
	cascade in printSmalltalkOn: (co_argcount counts posonly+regular positional
	params, self/cls included as in CPython; co_kwonlyargcount the keyword-only
	ones).  beginLine is the ``def'' keyword's line == co_firstlineno."

	| poCount regCount kwoCount |
	poCount := args isNil ifTrue: [0] ifFalse: [(args posonlyargs ifNil: [#()]) size].
	regCount := args isNil ifTrue: [0] ifFalse: [(args args ifNil: [#()]) size].
	kwoCount := args isNil ifTrue: [0] ifFalse: [(args kwonlyargs ifNil: [#()]) size].
	self emitCodeExtrasOpenOn: aStream nested: false.
	aStream
		nextPutAll: '(PyCode @env0:name: '''; nextPutAll: name asString;
		nextPutAll: ''' qualname: '''; nextPutAll: aQualname;
		nextPutAll: ''' filename: '.
	self emitSourceFilenameLiteralOn: aStream.
	aStream
		nextPutAll: ' firstlineno: '; nextPutAll: self beginLine printString;
		nextPutAll: ' argcount: '; nextPutAll: (poCount + regCount) printString;
		nextPutAll: ' posonlyargcount: '; nextPutAll: poCount printString;
		nextPutAll: ' kwonlyargcount: '; nextPutAll: kwoCount printString;
		nextPutAll: ')'.
	self emitCodeExtrasOn: aStream nested: false
%

category: 'Grail-code generation'
method: FunctionDefAst
emitSignatureSpecOn: aStream
	^ self emitSignatureSpecOn: aStream skipReceiver: false
%

category: 'Grail-code generation'
method: FunctionDefAst
___coFlags___: isNested
	"``code.co_flags'' -- CPython's flag word, restricted to the bits that are a
	property of the SOURCE and so knowable at compile time.

	    1  CO_OPTIMIZED        64   CO_NOFREE (deprecated, not emitted)
	    2  CO_NEWLOCALS       128   CO_COROUTINE
	    4  CO_VARARGS         256   CO_ITERABLE_COROUTINE (a decorator's doing)
	    8  CO_VARKEYWORDS     512   CO_ASYNC_GENERATOR
	   16  CO_NESTED
	   32  CO_GENERATOR

	OPTIMIZED and NEWLOCALS are set on every function code object in CPython --
	they distinguish a function's namespace from a module's or a class body's,
	and every def has both.

	The three KIND bits are what conformance actually turns on: they are how
	CPython tells a plain function, a generator, a coroutine and an async
	generator apart, and ``f.__code__ = g.__code__'' is deprecated across a
	mismatch precisely because the function's calling protocol and its code
	would then disagree.  Grail knows all three from the AST -- isAsync from the
	``async'' keyword, isGenerator from a ``yield'' in the body -- so the answer
	is exact rather than approximated.

	CO_ITERABLE_COROUTINE is not emitted because it is set by
	``types.coroutine'' at runtime, not by the compiler, and CO_NOFREE is
	deprecated in CPython and always clear."

	| flags |
	flags := 3.
	args notNil ifTrue: [
		args vararg notNil ifTrue: [flags := flags + 4].
		args kwarg notNil ifTrue: [flags := flags + 8]].
	isNested ifTrue: [flags := flags + 16].
	self isAsync
		ifTrue: [
			flags := flags + (self isGenerator ifTrue: [512] ifFalse: [128])]
		ifFalse: [
			self isGenerator ifTrue: [flags := flags + 32]].
	^ flags
%

category: 'Grail-code generation'
method: FunctionDefAst
emitCodeExtrasOpenOn: aStream nested: isNested
	"One opening parenthesis per setter emitCodeExtrasOn:nested: will apply.

	The setters are UNARY-position cascades onto a finished PyCode, so the
	constructor's keyword message has to be parenthesised first -- without the
	wrap the parser reads one long keyword selector ending in the setter's own
	name and the send does not exist.  Split across two methods because the
	emitters write straight to the stream and the opens have to precede the
	constructor they build."

	aStream nextPutAll: '('.
	(CallAst ___freeVariableNamesFor___: self) isEmpty ifFalse: [
		aStream nextPutAll: '(']
%

category: 'Grail-code generation'
method: FunctionDefAst
emitCodeExtrasOn: aStream nested: isNested
	"Apply co_flags, and the free-variable names when there are any, to the
	PyCode just emitted.  Chained rather than cascaded: each setter answers the
	code object, so ``((code setFlags: n) setFreevars: names)'' reads back as
	the code object without a trailing ``yourself''."

	| freeNames |
	aStream
		nextPutAll: ' @env0:___setFlags___: ';
		nextPutAll: (self ___coFlags___: isNested) printString;
		nextPutAll: ')'.
	freeNames := CallAst ___freeVariableNamesFor___: self.
	freeNames isEmpty ifTrue: [^ self].
	aStream nextPutAll: ' @env0:___setFreevars___: #( '.
	freeNames do: [:each |
		aStream nextPutAll: ''''; nextPutAll: each asString; nextPutAll: ''' '].
	aStream nextPutAll: '))'
%

category: 'Grail-code generation'
method: FunctionDefAst
emitCodeFreevarsOn: aStream
	"Cascade this def's FREE VARIABLE names onto the PyCode just emitted, so
	``func.__code__.co_freevars'' answers them.

	The same set emitClosureCellsOn: uses, deliberately: CPython refuses
	``f.__code__ = g.__code__'' when the two functions disagree on how many free
	variables they have, because the function's cells and its code would then
	be describing different closures -- and a check written against a
	SEPARATELY derived name set could disagree with the cells it is protecting.

	Emits nothing when the def closes over nothing; PyCode>>co_freevars answers
	an empty tuple there, which is CPython's value."

	| freeNames |
	freeNames := CallAst ___freeVariableNamesFor___: self.
	freeNames isEmpty ifTrue: [^ self].
	aStream nextPutAll: ' @env0:___setFreevars___: #( '.
	freeNames do: [:each |
		aStream nextPutAll: ''''; nextPutAll: each asString; nextPutAll: ''' '].
	aStream nextPutAll: '))'
%

category: 'Grail-code generation'
method: FunctionDefAst
emitCodeFreevarsOpenOn: aStream
	"The opening parenthesis emitCodeFreevarsOn: will close.

	``___setFreevars___:'' is a UNARY-position cascade onto a finished PyCode,
	so the constructor's keyword message has to be parenthesised first --
	without the wrap the parser reads one long keyword selector
	``name:filename:...kwonlyargcount:___setFreevars___:'' and the send does not
	exist.  Split across two methods because the emitters write straight to the
	stream and the open has to precede the constructor they build."

	(CallAst ___freeVariableNamesFor___: self) isEmpty ifTrue: [^ self].
	aStream nextPutAll: '('
%

category: 'Grail-code generation'
method: FunctionDefAst
emitClosureCellsOn: aStream
	"Emit the ``; @env0:___pyClosure___: { <cell>. ... }'' cascade that gives
	this def its ``__closure__'', or nothing when it closes over no enclosing
	binding (CPython answers None there, and so does the accessor when no stamp
	was written).

	Each cell is ``PyCell reader: [x] setter: [:v | x := v]'' -- the same
	capture-by-reference pair ClassDefAst uses for ___cell_<name>___, so
	``cell_contents'' tracks later assignments and writing it reaches the
	enclosing binding.  Emitted in the ENCLOSING scope, where those temps are
	lexically visible; that is the same place the free-variable reads inside
	the body resolve, which is why the blocks compile.

	The free-variable set is CallAst's, the one locals() reports, so
	``sorted(locals()) >= co_freevars'' cannot drift between the two features.
	It is empty for a def compiled to a real Smalltalk METHOD (the walk stops
	at a class body), so a class-body def gets no cells -- a known gap, not a
	wrong answer: CPython would give it cells for the same free variables."

	| freeNames |
	freeNames := CallAst ___freeVariableNamesFor___: self.
	freeNames isEmpty ifTrue: [^ self].
	aStream nextPutAll: '; @env0:___pyClosure___: { '.
	freeNames do: [:each |
		| readSrc |
		"How the name resolves AT THE DEF SITE, which is not always the bare
		identifier -- see CallAst >> ___emitFreeVariableRead___:parent:on:."
		readSrc := CallAst ___freeVariableReadSource___: each asSymbol parent: self parent.
		aStream nextPutAll: '(PyCell @env0:reader: ['; nextPutAll: readSrc.
		"The WRITER half only when the read is the BARE NAME -- that is exactly
		the case where the binding is a plain Smalltalk temp and ``x := v''
		compiles.  Anything else (``self'', a ___classCell___ read, a module
		attribute load) is not an assignable variable, and emitting a setter
		over it is CompileError 1001 at module-load time.  It must also be a
		name the binding scope actually assigns, since a block or method
		ARGUMENT is not assignable either.  Failing both, the cell is
		read-only, which is what CPython's cell was before 3.7."
		((readSrc = each asString)
			and: [CallAst ___freeVariableIsAssignable___: each asSymbol for: self])
			ifTrue: [
				aStream
					nextPutAll: '] setter: [:___cv___ | ';
					nextPutAll: each asString;
					nextPutAll: ' := ___cv___]). ']
			ifFalse: [aStream nextPutAll: ']). ']].
	aStream nextPutAll: '}'
%

category: 'Grail-code generation'
method: FunctionDefAst
___classDefaultKeyFor___: aParamName className: aClassName
	"The side-table key a class-body method's def-time default is stored under.

	QUALIFIED WITH THE DEFINING CLASS'S NAME, which is the whole reason this is a
	method and not a string concatenation at each site.  The lookup walks outward
	from the receiver, so an unqualified key would let a parent's method -- reached
	through super() on a child that also gives that parameter a default -- find the
	CHILD's default object.  Both halves have to agree on the spelling or the read
	simply misses and the default is recomputed, which looks like nothing wrong."

	^ '___default_' , aClassName , '__' , self ___mangledName___ asString ,
		'__' , aParamName asString , '___'
%

category: 'Grail-code generation'
method: FunctionDefAst
___defaultedPositionalParams___
	"{ paramName . defaultNode } for each positional parameter that has a default,
	in declaration order.  Empty when the def has none.

	The defaults sequence covers ``posonlyargs , args'' as ONE list and attaches to
	its TRAILING entries, which is the arithmetic that went wrong once already --
	indexing ``args args'' alone runs off the front for ``def f(a=1, /, b=2)''."

	| positionals defaults firstWithDefault out |
	args isNil ifTrue: [^ #()].
	defaults := args defaults ifNil: [#()].
	defaults isEmpty ifTrue: [^ #()].
	positionals := (args posonlyargs ifNil: [#()]) , (args args ifNil: [#()]).
	firstWithDefault := positionals size - defaults size + 1.
	out := OrderedCollection new.
	1 to: defaults size do: [:i |
		| idx |
		idx := firstWithDefault + i - 1.
		(idx >= 1 and: [idx <= positionals size]) ifTrue: [
			out add: { (positionals at: idx) name. (defaults at: i) }]].
	^ out
%

category: 'Grail-code generation'
method: FunctionDefAst
emitSignatureSpecOn: aStream skipReceiver: skipReceiver
	"Emit the parameter spec inspect.signature reads: an Array of
	``{ name . kind-index . default-source-text-or-nil }'' in DECLARATION
	order.  Kind indices match inspect._KINDS -- 0 POSITIONAL_ONLY,
	1 POSITIONAL_OR_KEYWORD, 2 VAR_POSITIONAL, 3 KEYWORD_ONLY,
	4 VAR_KEYWORD.

	Defaults are recorded as SOURCE TEXT, not values.  A default is
	evaluated exactly once, at def-time, into the wrapper block this class
	already emits; re-emitting the expression here to capture a value would
	evaluate it a SECOND time, which is observable for a mutable or
	side-effecting default.  inspect._DefaultText documents where text and
	repr can disagree.

	CPython pairs defaults with the LAST parameters of the
	posonly+regular list, and kwonly defaults positionally with
	kwonlyargs."

	| posonly regular allPositional defaults firstDefaulted anyYet sep |
	posonly := args posonlyargs ifNil: [#()].
	regular := args args ifNil: [#()].
	allPositional := posonly , regular.
	defaults := args defaults ifNil: [#()].
	"``def f(a, b=1, c=2)'' has 3 positional params and 2 defaults, so the
	defaults attach to params 2..3 -- the trailing ones."
	firstDefaulted := allPositional size - defaults size + 1.
	"Separator state, NOT a per-group index: a def whose only parameter is
	``**kwargs'' (or a keyword-only one) has an empty positional list, and
	emitting the separator unconditionally in those branches produced
	``{ . {'kwargs'. 4} }'' -- CompileError 1001, which failed every module
	defining such a def."
	anyYet := false.
	sep := [anyYet ifTrue: [aStream nextPutAll: '. ']. anyYet := true].
	aStream nextPutAll: '{ '.
	1 to: allPositional size do: [:i |
		"skipReceiver drops ``self''/``cls'' -- see
		ClassDefAst >> emitMethodSignatureTableOn:className:."
		(skipReceiver and: [i = 1]) ifFalse: [
		sep value.
		self
			emitSignatureEntryFor: (allPositional at: i)
			kind: (i <= posonly size ifTrue: [0] ifFalse: [1])
			default: (i >= firstDefaulted
				ifTrue: [defaults at: i - firstDefaulted + 1]
				ifFalse: [nil])
			on: aStream]].
	args vararg ifNotNil: [:v |
		sep value.
		self emitSignatureEntryFor: v kind: 2 default: nil on: aStream].
	(args kwonlyargs ifNil: [#()]) doWithIndex: [:k :i |
		sep value.
		self
			emitSignatureEntryFor: k
			kind: 3
			default: ((args kw_defaults ifNil: [#()]) at: i ifAbsent: [nil])
			on: aStream].
	args kwarg ifNotNil: [:k |
		sep value.
		self emitSignatureEntryFor: k kind: 4 default: nil on: aStream].
	aStream nextPutAll: ' }'
%

category: 'Grail-code generation'
method: FunctionDefAst
emitSignatureEntryFor: anArg kind: kindIndex default: aDefaultNodeOrNil on: aStream
	"One ``{ name . kind . default-text }'' triple.  The default's source
	text comes from ___defaultSourceString___.

	It USED to come from ___annotationSourceString___, the annotations'
	unparser, on the reasoning that it covers the literal shapes real defaults
	take.  It does not, and sharing it was wrong in three ways at once:
	every binary operator rendered as the PEP 604 union bar (``a=1+1'' ->
	``a=1 | 1''), a string literal lost its quotes because an annotation's
	string is a forward reference (``a='abc''' -> ``a=abc'', and the empty
	string -> nothing at all), and a tuple rendered bare so the signature's
	apparent ARITY changed (``j=(1,2)'' -> ``j=1, 2'').  Unary minus, lists and
	dicts fell to the ``<annotation>'' placeholder.  ___defaultSourceString___
	delegates to the annotation form for the nodes where the two agree.

	A parameter with no default emits a TWO-element entry rather than a
	third slot holding Smalltalk nil: nil reaching a Python local is
	indistinguishable from an unassigned one, so ``default = entry[2]''
	raised UnboundLocalError on the very next read."

	aStream nextPutAll: '{ '''; nextPutAll: anArg name asString; nextPutAll: '''. '.
	aStream nextPutAll: kindIndex printString.
	(aDefaultNodeOrNil isNil or: [aDefaultNodeOrNil isNone]) ifFalse: [
		aStream nextPutAll: '. '.
		self emitStringLiteral: aDefaultNodeOrNil ___defaultSourceString___
			on: aStream].
	aStream nextPutAll: ' }'
%

category: 'Grail-code generation'
method: FunctionDefAst
emitAnnotateBlockOn: aStream
	"Emit this def's PEP 649 ``__annotate__'' -- a ONE-ARGUMENT block
	taking a Format and answering { param-name -> annotation, ...,
	'return' -> ... }.

	The block is CREATED here, in the enclosing scope, so it captures the
	def's own scope; it is not CALLED until ``__annotations__'' is read.
	That deferral is the whole point.  Grail used to store annotations as
	PEP 563 source strings precisely because evaluating at def-time
	breaks module load -- 55+ werkzeug/flask modules annotate parameters
	with forward references to names not yet bound -- but that made
	``f.__annotations__'' answer strings where CPython 3.14 answers the
	types, and left ``__annotate__'' with nothing to be.  Deferring gets
	both: nothing evaluates during load, and the read sees real values by
	which time the forward-referenced names are bound.

	Each annotation is rendered by ___annotationValue___:source:format:,
	which is handed BOTH the expression (as a block, to evaluate) and its
	source text (for Format.STRING, and to name a ForwardRef).  Per
	annotation rather than per dict, so Format.FORWARDREF can resolve the
	keys it can and leave only the others unresolved."

	"TWO parameters, (positional-array, kwargs-dict): that is Grail's
	shape for a block used as a Python callable, the one
	___pyCallValue___:kw: recognises by numArgs == 2.  A one-parameter
	block is NOT callable from Python -- an env-1 ``value:value:'' send
	finds Object's not-callable raiser before reaching block invocation --
	and annotationlib.get_annotations does call this from Python."
	| savedOwner |
	aStream nextPutAll: '[:___annArgs___ :___annKw___ | ((PyDict @env0:new)'.
	"Mark this def as the annotation owner for the duration, so NameAst
	resolves the annotation expressions in the ENCLOSING scope -- the def's
	own parameters must not shadow (CPython evaluates annotations there)."
	savedOwner := CallAst annotationOwnerDefNode.
	CallAst annotationOwnerDefNode: self.
	[self ___annotatedArgs___ do: [:a |
		aStream nextPutAll: ' @env0:at: '''; nextPutAll: a name asString; nextPutAll: ''' put: '.
		self emitOneAnnotation: a annotation on: aStream.
		aStream nextPut: $;].
	returns ifNotNil: [
		aStream nextPutAll: ' @env0:at: ''return'' put: '.
		self emitOneAnnotation: returns on: aStream.
		aStream nextPut: $;]]
		ensure: [CallAst annotationOwnerDefNode: savedOwner].
	aStream nextPutAll: ' @env0:yourself)]'
%

category: 'Grail-code generation'
method: FunctionDefAst
emitOneAnnotation: aNode on: aStream
	"One ``___annotationValue___:source:format:'' send: the annotation
	expression wrapped in a block so it is evaluated only when the
	annotate function runs, plus its codegen-time source text.

	PyAnnotate, not ExecBlock: generated module code compiles against a
	dictionary list without the kernel ``Globals'', so ``ExecBlock'' --
	where this method otherwise belongs -- is an undefined symbol there."

	aStream nextPutAll: '(PyAnnotate @env1:___annotationValue___: ['.
	aNode printSmalltalkOn: aStream.
	aStream nextPutAll: '] source: '.
	self emitStringLiteral: aNode ___annotationSourceString___ on: aStream.
	aStream nextPutAll: ' format: (___annArgs___ @env0:at: 1))'
%

category: 'Grail-code generation'
method: FunctionDefAst
___docString___
	"The def's docstring — the value of a leading bare string-literal
	statement — or nil when the body doesn't open with one.  CPython's
	compiler lifts exactly that expression into ``__doc__''.

	Without this, every Grail function inherited ``object''`s own docstring
	via Object>>__doc__ and claimed to be documented as ``The base class of
	the class hierarchy...''; ExecBlock>>__doc__ now answers None instead,
	and this supplies the real text when there is one.

	Gated on CharacterCollection rather than String so a docstring holding
	non-Latin-1 text (a Unicode16/32 literal) is still recognised."

	| stmts first inner |
	body isNil ifTrue: [^ nil].
	stmts := body body.
	(stmts isNil or: [stmts isEmpty]) ifTrue: [^ nil].
	first := stmts at: 1.
	(first isKindOf: ExprAst) ifFalse: [^ nil].
	inner := first value.
	(inner isKindOf: ConstantAst) ifFalse: [^ nil].
	^ (inner value isKindOf: CharacterCollection)
		ifTrue: [inner value]
		ifFalse: [nil]
%

category: 'Grail-code generation'
method: FunctionDefAst
emitStringLiteral: aString on: aStream
	"Emit aString as a Smalltalk string literal, doubling embedded
	single quotes."

	aStream nextPut: $'.
	aString do: [:ch |
		ch = $' ifTrue: [aStream nextPut: $'].
		aStream nextPut: ch].
	aStream nextPut: $'
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

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
compilesAsVarargs
	"True when this def must compile to the varargs ``_name:kw:'' form
	(positional array + keyword dict) rather than a fixed-arity
	selector.  Always for complex signatures (the inverse of
	isSimplePositionalArgs), AND forced for ``__init__'' even when it
	is simple-positional: a fixed-arity selector encodes only arity,
	not parameter names, so it can't bind keyword arguments.  Routing
	``__init__'' through the varargs form (whose prologue already binds
	positional-then-keyword by name, via printPositionalUnpackingOn:)
	makes construction ``Foo(1, 2)'', keyword construction
	``Foo(a=1, b=2)'', and ``super().__init__(a=1, b=2)'' all work
	uniformly — and sidesteps the Super dispatch's positional-arity
	cap, since the varargs form takes any number of arguments.

	Scoped to ``__init__'' for now (the super-call hot spot); other
	simple-positional methods still use fixed-arity selectors and do
	not yet accept keyword calls."

	self isSimplePositionalArgs ifFalse: [^ true].
	^ name asSymbol == #'__init__'
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
needsVarargsForwarder
	"True for a simple-positional def that should ALSO get a varargs
	``_name:kw:'' companion so keyword call sites bind.  A fixed-arity
	selector (``greet:_:'') encodes only arity, so a keyword call
	``greet(request, name='x')'' — which Django's URL dispatcher makes
	for every captured kwarg — routes to ``_greet:kw:'' and would DNU.
	Skip zero-parameter defs (nothing to bind by keyword) and defs
	that already compile as varargs."

	^ self isSimplePositionalArgs
		and: [self compilesAsVarargs not
		and: [self allParameterNames notEmpty]]
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
needsFixedArityForwarders
	"""True for a def that compiles as VARARGS but accepts a bounded number of
	positional arguments, so it should ALSO get fixed-arity entry points.

	The MIRROR IMAGE of needsVarargsForwarder.  That one adds a ``_name:kw:''
	companion so a KEYWORD call site reaches a fixed-arity def; this one adds
	``name:'' / ``name:_:'' companions so a FIXED-ARITY call site reaches a def
	that compiled as varargs.

	Without it a subclass override cannot replace a fixed-arity base method.
	Base-class code calling ``self.m(x)'' emits ``m:''; an override written
	``def m(self, x, flag=False)'' compiles only to ``_m:kw:''; the send finds
	the BASE's ``m:'' and the override never runs -- silently, with no DNU.
	That is the shape stdlib subclassing takes whenever CPython grows a keyword
	(``colorize=False''), and it is recorded in section 9.35 of
	docs/Python_Traceback_Design.md.

	Two exclusions:

	  * ``*args'' -- the positional arity is unbounded, so the set of forwarders
	    cannot be enumerated.  Such a def keeps varargs-only dispatch.
	  * ``__init__'' -- compilesAsVarargs forces it to the varargs form ON
	    PURPOSE (see there), and construction / super dispatch resolve it by
	    name.  Adding a fixed-arity entry point would reintroduce exactly the
	    positional-arity cap that routing through varargs exists to sidestep."""

	self compilesAsVarargs ifFalse: [^ false].
	args vararg ifNotNil: [^ false].
	name asSymbol == #'__init__' ifTrue: [^ false].
	^ self fixedArityForwarderArities notEmpty
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
fixedArityForwarderArities
	"""The instance-method arities (self excluded) this def can be CALLED with,
	from fewest to most.

	The most is every positional parameter; the fewest is that minus the
	defaulted tail, since a defaulted parameter may be omitted.  Keyword-only
	parameters do not appear -- they are never bound positionally -- and
	``**kwargs'' does not change the positional count.

	ARITY 0 IS INCLUDED, and it is the one that needs the category guard in
	___pyAttrLoad___ (§9.36) to be safe.  ``m'' plus ``m:'' is exactly the
	shape of a synthesized property getter/setter pair, so the attribute load
	read an ordinary method as a property and PERFORMED it:

	    class C:
	        def foo(self, a=None):
	            return 42
	    C().foo            --> 42     (CPython: a bound method)
	    C().foo(1)         --> TypeError: 'int' object is not callable

	Measured, not reasoned: that broke ``import werkzeug.local'' through
	re/_parser's ``State >> opengroup(self, name=None)'' -- which returns a
	group id, so ``state.opengroup(name)'' read the id and then tried to call
	it.  Compiling the forwarders into their own method category, and having
	the pair test consult it, tells the two apart -- so the arities can be
	emitted in full and a base ``def m(self)'' overridden by ``def m(self,
	flag=False)'' dispatches like every other override."""

	| maxArity nDefaults minArity |
	maxArity := self instanceMethodArity.
	nDefaults := args defaults isNil ifTrue: [0] ifFalse: [args defaults size].
	minArity := (maxArity - nDefaults) max: 0.
	^ (minArity to: maxArity) asArray
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
fixedAritySelectorFor: nArgs
	"The Smalltalk selector a call of nArgs positional arguments sends -- the
	one generateInstanceFixedArityForwarderSource: defines, and the one the
	___grailSuperImplements___: gate asks the superclass about."

	| stream |
	nArgs = 0 ifTrue: [^ self ___mangledName___ asString].
	stream := AppendStream on: Unicode7 new.
	stream nextPutAll: self ___mangledName___ asString; nextPutAll: ':'.
	2 to: nArgs do: [:i | stream nextPutAll: '_:'].
	^ stream contents
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
generateInstanceFixedArityForwarderSource: nArgs
	"""A fixed-arity entry point of arity nArgs that forwards into this def's
	varargs body, so a fixed-arity send reaches it.

	Same shape as generateBigmemtestUnaryForwarderSource, which does this for
	one special case (arity 0, for dir()-based test discovery); this is the
	general form.  The positional arguments are packed into the array the
	varargs body already unpacks, and ``kw: nil'' means no keywords -- the body
	then applies its own defaults for whatever was not passed."""

	| stream params |
	stream := AppendStream on: Unicode7 new.
	params := (1 to: nArgs) collect: [:i | '___fa' , i printString].
	nArgs = 0
		ifTrue: [stream nextPutAll: name]
		ifFalse: [
			stream nextPutAll: name; nextPutAll: ': '; nextPutAll: (params at: 1).
			2 to: nArgs do: [:i |
				stream nextPutAll: ' _: '; nextPutAll: (params at: i)]].
	stream lf.
	stream nextPutAll: '^ self _'; nextPutAll: name; nextPutAll: ': {'.
	1 to: nArgs do: [:i |
		i > 1 ifTrue: [stream nextPutAll: '. '].
		stream nextPutAll: (params at: i)].
	stream nextPutAll: '} kw: nil'.
	^ stream contents
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
generateModuleMethodVarargsForwarderSource
	"Emit a varargs ``_name:kw:'' method that binds positional-then-
	keyword by declared parameter name and forwards to the fixed-arity
	module method.  Lets keyword call sites reach a simple-positional
	module function."

	^ self ___varargsForwarderSourceStripSelf___: false
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
generateInstanceVarargsForwarderSource
	"As generateModuleMethodVarargsForwarderSource but for an instance
	method: the first Python parameter (self) is stripped — the
	Smalltalk receiver IS self."

	^ self ___varargsForwarderSourceStripSelf___: true
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
generateBigmemtestUnaryForwarderSource
	"Fixed-arity 0-arg entry point for a ``@bigmemtest''-decorated test
	method.  applyBigmemtestDefaultIfNeeded gives the method a synthetic
	trailing default, which forces it to the varargs ``_name:kw:'' form —
	right for the CALL path, but invisible to ``dir()'': object>>__dir__
	reports a varargs selector under its ``_name'' spelling, so unittest's
	getTestCaseNames — which filters on a ``test'' prefix — never discovers
	the method.  This companion unary selector restores the plain ``name''
	entry so discovery finds the test, then forwards into the varargs body
	with an empty positional so the injected default supplies the dry-run
	size."
	| stream |
	stream := AppendStream on: Unicode7 new.
	stream nextPutAll: name; lf.
	stream nextPutAll: '^ self _'; nextPutAll: name; nextPutAll: ': { } kw: nil'.
	^ stream contents
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
___varargsForwarderSourceStripSelf___: stripSelf
	"Shared body for the varargs forwarders.  paramNames is the list of
	Python parameters that become call arguments (self stripped for
	instance methods).  Emit:
	  _name: positional kw: kwargs
	  | p1 p2 ... |
	  p1 := (positional size >= 1) ifTrue: [positional at: 1]
	        ifFalse: [kwargs...'p1'... ifAbsent default/TypeError].
	  ...
	  ^ self name: p1 _: p2 ...       (module: bare selector)
	  ^ self <sel>                    (instance: env-1 fixed selector)"

	| stream callParams allParams defaults firstDefault posonlyNames |
	stream := AppendStream on: Unicode7 new.
	allParams := self allParameterNames.
	callParams := stripSelf
		ifTrue: [allParams copyFrom: 2 to: allParams size]
		ifFalse: [allParams].
	"Positional-only parameters are not keyword-bindable, so their keyword must
	be left for **kwargs instead of ALSO binding the parameter -- the same fix as
	in printPositionalUnpackingOn:..., which this forwarder duplicates for the
	class-body method form.  Fixing only that one left ``C(dict=42)'' still
	double-applying while the equivalent module-level function was correct."
	posonlyNames := (args posonlyargs ifNil: [#()])
		collect: [:a | a name asString].
	"Defaults align to the TAIL of args (posonly+args)."
	defaults := args defaults.
	firstDefault := (args posonlyargs size + args args size)
		- (defaults isNil ifTrue: [0] ifFalse: [defaults size]).

	stream nextPut: $_; nextPutAll: name; nextPutAll: ': ___pos___ kw: ___kw___'; lf.
	callParams isEmpty ifFalse: [
		stream nextPutAll: '| '.
		callParams do: [:p | stream nextPutAll: (self transportParamName: p); space].
		stream nextPut: $|; lf.
	].
	"Reject extra positional / unexpected keyword args BEFORE binding (the
	fixed selector we forward to would otherwise silently drop them).  Ahead
	of the loop for the reason printPositionalUnpackingOn: gives: the binding
	raises ``missing required argument'' for the first parameter it cannot
	fill, so running the guards afterwards let that outrank what the caller
	actually did wrong -- passing a positional-only parameter by keyword."
	self printArgCountChecksOn: stream
		positionalName: '___pos___' kwargsName: '___kw___' nPositional: callParams size.
	"The all-at-once missing-parameter check, as in printPositionalUnpackingOn:.
	``firstDefault'' counts over the FULL parameter list, so a stripped receiver
	shifts it by one relative to callParams; clamp because a def may have more
	defaults than this forwarder has parameters."
	self printMissingPositionalCheckOn: stream
		paramNames: callParams
		positionalName: '___pos___'
		kwargsName: '___kw___'
		requiredCount: ((firstDefault - (stripSelf ifTrue: [1] ifFalse: [0]))
			min: callParams size)
		posonlyNames: posonlyNames.
	callParams doWithIndex: [:p :i |
		| absoluteIdx isPosOnly |
		"absolute parameter index in the full (self-included) list, to
		align with the fixed selector's positional order."
		absoluteIdx := stripSelf ifTrue: [i + 1] ifFalse: [i].
		isPosOnly := posonlyNames includes: p asString.
		stream nextPutAll: (self transportParamName: p);
			nextPutAll: ' := (___pos___ @env0:size @env0:>= '; print: i;
			nextPutAll: ') ifTrue: [___pos___ @env0:at: '; print: i;
			nextPutAll: '] ifFalse: ['.
		isPosOnly ifFalse: [
			stream
				nextPutAll: '(___kw___ @env0:isNil @env0:not and: [___kw___ @env0:includesKey: ''';
				nextPutAll: p asString;
				nextPutAll: ''']) ifTrue: [___kw___ @env0:at: '''; nextPutAll: p asString;
				nextPutAll: '''] ifFalse: ['].
		"Default expression when this param has one; else TypeError."
		(defaults notNil and: [absoluteIdx >= (firstDefault + 1)
			and: [absoluteIdx <= (args posonlyargs size + args args size)]])
			ifTrue: [
				| d |
				d := defaults at: absoluteIdx - firstDefault.
				d printSmalltalkOn: stream ]
			ifFalse: [
				self printSingleMissingArgumentOn: stream
					name: p kind: 'positional' ].
		"One close per gate opened — the kwargs gate is absent for a
		positional-only parameter."
		stream nextPutAll: (isPosOnly ifTrue: ['].'] ifFalse: [']].']); lf.
	].
	"Forward to the fixed-arity selector."
	stream nextPutAll: '^ self '.
	stripSelf
		ifTrue: [
			callParams isEmpty
				ifTrue: [stream nextPutAll: name]
				ifFalse: [
					stream nextPutAll: name; nextPutAll: ': '; nextPutAll: (self transportParamName: (callParams at: 1)).
					2 to: callParams size do: [:i |
						stream nextPutAll: ' _: '; nextPutAll: (self transportParamName: (callParams at: i))]] ]
		ifFalse: [
			callParams isEmpty
				ifTrue: [stream nextPutAll: name]
				ifFalse: [
					stream nextPutAll: name; nextPutAll: ': '; nextPutAll: (self transportParamName: (callParams at: 1)).
					2 to: callParams size do: [:i |
						stream nextPutAll: ' _: '; nextPutAll: (self transportParamName: (callParams at: i))]] ].
	^ stream contents
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
generateModuleMethodStubSource
	"Generate a minimal stub method source for pre-registration on the module
	class. The stub has the correct selector header with parameter names but
	just returns nil. It gets replaced by the real method after codegen."

	| stream paramNames |
	stream := AppendStream on: Unicode7 new.
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

	| numParams numDefaults firstWithDefault posonlyNames ownerClassName |
	numParams := paramNames size.
	numDefaults := args defaults size.
	firstWithDefault := numParams - numDefaults + 1.
	"The class this def is being compiled INTO, or nil when there is none.  It
	qualifies the side-table key a class-body method's def-time default is stored
	under, so it has to be the same name ClassDefAst used when it emitted the store.
	Nil for a module-level def (which has its own module-keyed memo) and for a
	@staticmethod, whose body has no receiver for the lookup to walk out from --
	both of those keep the default expression inline.

	Read through classBeingCompiled rather than from a scope stack because this
	runs while the class's OWN methods are emitted, one at a time, which is exactly
	the single-value case that slot is right for."
	ownerClassName := (self isKindOf: StaticFunctionDefAst)
		ifTrue: [nil]
		ifFalse: [CallAst classBeingCompiled ifNotNil: [:c | c asString]].
	"A POSITIONAL-ONLY parameter (declared before ``/'') can never be bound by
	keyword: CPython routes such a keyword to **kwargs and leaves the parameter
	on its default.  Grail fell through to the kwargs lookup for EVERY parameter,
	so the keyword did both -- bound the parameter AND stayed in **kwargs, hence
	got applied twice.  ``collections.UserDict(dict=[('one', 1)])'' built
	{'one': 1, 'dict': [('one', 1)]} instead of {'dict': [('one', 1)]}
	(test_userdict test_init / test_update / test_all); that is exactly why
	upstream fences these parameters off -- any name is a legal dict key.

	Matched by NAME, not by index: the three callers build ``paramNames''
	differently (the module / class-method forms may drop the receiver and may
	pass names already transported), so a posonly PREFIX LENGTH would be wrong
	for some of them.  Both spellings are collected for the same reason.

	``asString'' on BOTH sides, as elsewhere in this class: paramNames carries
	SYMBOLS, and a Symbol/String comparison does not answer true in the
	direction ``includes:'' happens to test -- which silently made every
	parameter look keyword-bindable and left the class-body method form still
	double-applying after the module-level one was fixed."
	posonlyNames := OrderedCollection new.
	(args posonlyargs ifNil: [#()]) do: [:a |
		posonlyNames add: a name asString.
		posonlyNames add: (self transportParamName: a name) asString].
	"Arity + keyword guards BEFORE the per-parameter binding, not after it.
	The binding loop raises ``missing required argument'' as it goes, so
	whichever parameter it reaches first won the report -- and CPython decides
	the other way round, validating the CALL before complaining about what it
	could not fill.  ``def f(a, /, b)'' called ``f(a=1, b=2)'' has to say the
	positional-only parameter was passed by keyword; running the guards last
	said ``missing required argument: a'', which names the right parameter for
	entirely the wrong reason and hides what the caller actually did wrong."
	self printArgCountChecksOn: aStream
		positionalName: posName kwargsName: kwName nPositional: numParams.
	"...and the missing-parameter report likewise cannot be made from inside the
	binding loop, which sees one parameter at a time: CPython names EVERY
	unfilled parameter in one message.  Emitted as a pre-pass over the same
	inputs the loop is about to use."
	self printMissingPositionalCheckOn: aStream
		paramNames: paramNames
		positionalName: posName
		kwargsName: kwName
		requiredCount: firstWithDefault - 1
		posonlyNames: posonlyNames.
	1 to: numParams do: [:i |
		| pname hasDefault isPosOnly |
		pname := paramNames at: i.
		hasDefault := i >= firstWithDefault.
		isPosOnly := posonlyNames includes: pname asString.
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
		site (varargs methods accept both).  Lookup keys are Python
		``str''s (per CPython spec); CallAst's printKeywordsDictOn:
		builds the kwargs dict with String keys to match.

		SKIPPED entirely for a positional-only parameter, which is not
		keyword-bindable — see the posonlyNames comment above.  The gate is
		what opens the second bracket, so the close below matches on the same
		condition."
		isPosOnly ifFalse: [
			aStream
				nextPutAll: '(';
				nextPutAll: kwName;
				nextPutAll: ' @env0:isNil @env0:not and: [';
				nextPutAll: kwName;
				nextPutAll: ' @env0:includesKey: ''';
				nextPutAll: pname;
				nextPutAll: ''']) ifTrue: [';
				nextPutAll: kwName;
				nextPutAll: ' @env0:at: ''';
				nextPutAll: pname;
				nextPutAll: '''] ifFalse: ['].
		hasDefault ifTrue: [
			"Reference the pre-evaluated default temp captured by the
			enclosing block (closure form only — the closure path wraps
			in an outer block that binds ``___default_<pname>___`` at
			def-time).  Module/class-method generators still emit the
			default expr inline; the closure path is the only one that
			needs def-time evaluation because that's the only form
			where ``X=X`` defaults reference the enclosing scope."
			(posName = '___positional___')
				ifTrue: [
					aStream nextPutAll: '___default_'; nextPutAll: pname; nextPutAll: '___'
				] ifFalse: [
					"Module-level function: no def-time outer block exists (the def
					compiles to a METHOD), so evaluate the default ONCE and cache it
					on the module instance -- a MUTABLE default (``def f(x=[])``) must
					be SHARED across calls, not re-created every call (test_iter's
					``def spam(state=[0])`` counter).  A class-body method keeps the
					inline default: its self is an instance/class with no reliable
					dynamic-instVar store (class-level sharing is a follow-up)."
					self isModuleLevelDef
						ifTrue: [
							aStream
								nextPutAll: '(self @env0:___moduleDefaultAt: #''___default_';
								nextPutAll: self name asString;
								nextPutAll: '__';
								nextPutAll: pname;
								nextPutAll: '___'' compute: ['.
							(args defaults at: i - firstWithDefault + 1) printSmalltalkOn: aStream.
							aStream nextPutAll: '])'
						] ifFalse: [
							"CLASS-BODY METHOD.  The default was evaluated once while the
							class body ran (ClassDefAst >> emitMethodDefaultStoresOn:) and
							stored on the defining class; read it back rather than
							re-evaluating the expression here.  Inline re-evaluation is what
							made ``def acc(self, item, bucket=[])'' answer a FRESH list on
							every call where CPython shares one -- measured [2] against
							CPython's [1, 2], with a side-effecting default firing once per
							call instead of once per def.

							``ifNil:'' back to the inline expression, so any shape the store
							does not cover (a staticmethod, which is excluded there, or a
							class the walk cannot reach) behaves exactly as before rather
							than binding nil."
							ownerClassName isNil
								ifTrue: [(args defaults at: i - firstWithDefault + 1) printSmalltalkOn: aStream]
								ifFalse: [
									aStream
										nextPutAll: '((self @env0:___grailClassDefault___: #';
										nextPut: $';
										nextPutAll: (self ___classDefaultKeyFor___: pname className: ownerClassName);
										nextPut: $';
										nextPutAll: ') ifNil: ['.
									(args defaults at: i - firstWithDefault + 1) printSmalltalkOn: aStream.
									aStream nextPutAll: '])']
						]
					]
		] ifFalse: [
			"Unreachable once the pre-pass above has run -- kept as the binding's
			own last word, and phrased identically so a call that somehow arrives
			here does not report the parameter in older wording."
			self printSingleMissingArgumentOn: aStream
				name: pname kind: 'positional'
		].
		"One closing bracket per gate opened: the positional gate always, the
		kwargs gate only for a keyword-bindable parameter."
		aStream nextPutAll: (isPosOnly ifTrue: ['].'] ifFalse: [']].']); lf
	]
%

category: 'Module Method Compilation'
method: FunctionDefAst
printMissingPositionalCheckOn: aStream paramNames: paramNames positionalName: posName kwargsName: kwName requiredCount: nRequired posonlyNames: posonlyNames
	"Emit the ``every unfilled positional parameter, in one message'' check that
	has to run BEFORE the binding loop -- see ___checkMissingPositional___ for
	why it cannot be part of it.

	Guarded by a size comparison so the ordinary call pays a compare and no
	send: when the caller passed at least as many positional args as there are
	REQUIRED parameters, none of them can be unfilled.  That is the overwhelming
	majority of calls, and this check is emitted into every def in the corpus.

	``nRequired'' is the count of parameters with no default.  They are always
	the leading ones (Python rejects a bare parameter after a defaulted one), so
	the required set is paramNames' prefix and its parameter positions are
	1..nRequired -- which is what lets the runtime check compare against the
	positional count by index."

	| displayNames posonlyCount |
	nRequired <= 0 ifTrue: [^ self].
	"Report the PYTHON name.  paramNames may hold transport names (``_self'' for
	a parameter named ``self''), which is what the binding temps are called but
	not what the caller wrote."
	displayNames := (1 to: nRequired) collect: [:i |
		self ___pythonParamNameFor___: (paramNames at: i)].
	"Positional-only parameters are a prefix of the parameter list, so a count is
	enough for the runtime check -- but count only the CONSECUTIVE leading ones
	rather than trusting that, since the callers build paramNames differently."
	posonlyCount := 0.
	[posonlyCount < nRequired
		and: [posonlyNames includes: (paramNames at: posonlyCount + 1) asString]]
			whileTrue: [posonlyCount := posonlyCount + 1].
	aStream
		nextPutAll: '(('; nextPutAll: posName;
		nextPutAll: ' @env0:size) @env0:< '; print: nRequired;
		nextPutAll: ') ifTrue: [TypeError ___checkMissingPositional___: ';
		nextPutAll: posName; nextPutAll: ' kwargs: '; nextPutAll: kwName;
		nextPutAll: ' names: '.
	self printNameLiteralArray: displayNames on: aStream.
	aStream
		nextPutAll: ' posonly: '; print: posonlyCount;
		nextPutAll: ' qualifiedName: ''';
		nextPutAll: (self ___qualifiedNameFor___: name);
		nextPutAll: '''].'; lf
%

category: 'Module Method Compilation'
method: FunctionDefAst
printMissingKeywordOnlyCheckOn: aStream kwargsName: kwName defaultsSource: defaultsSource names: names
	"Emit the matching check for keyword-only parameters, before their binding
	loop -- so a call missing several is reported in one message, and after the
	positional check, which CPython lets outrank it.

	Unguarded, unlike the positional one: a keyword-only parameter is filled by
	NAME, so there is no count to compare that would prove them all present.
	Only defs that actually declare keyword-only parameters emit it at all.

	``defaultsSource'' is Smalltalk source for the def's __kwdefaults__ dict, or
	nil where the generator bakes each default in and the set is fixed at
	compile time; in that case ``names'' holds only the parameters that have no
	default."

	names isEmpty ifTrue: [^ self].
	aStream
		nextPutAll: 'TypeError ___checkMissingKeywordOnly___: '; nextPutAll: kwName;
		nextPutAll: ' defaults: '; nextPutAll: (defaultsSource ifNil: ['nil']);
		nextPutAll: ' names: '.
	self printNameLiteralArray: names on: aStream.
	aStream
		nextPutAll: ' qualifiedName: ''';
		nextPutAll: (self ___qualifiedNameFor___: name);
		nextPutAll: '''.'; lf
%

category: 'Module Method Compilation'
method: FunctionDefAst
___requiredKeywordOnlyNames___
	"The keyword-only parameters declared WITHOUT a default, in order -- the ones
	the generators that bake defaults in can know are required at compile time."

	| result |
	result := OrderedCollection new.
	(args kwonlyargs ifNil: [#()]) doWithIndex: [:each :i |
		((args kw_defaults ifNil: [#()]) at: i ifAbsent: [nil]) isNil
			ifTrue: [result add: each name asString]].
	^ result asArray
%

category: 'Module Method Compilation'
method: FunctionDefAst
___allKeywordOnlyNames___
	"Every keyword-only parameter, in order.  Used by the generator whose
	defaults live in a runtime cell, where which of them are required is not a
	compile-time fact."

	^ (args kwonlyargs ifNil: [#()]) collect: [:each | each name asString]
%

category: 'Module Method Compilation'
method: FunctionDefAst
printSingleMissingArgumentOn: aStream name: aName kind: kindString
	"One parameter's missing-argument raise, in CPython's wording.  Used by the
	per-parameter binding fallbacks, which the pre-pass checks now reach first
	but which still have to compile to something."

	aStream nextPutAll: 'TypeError ___signalMissingArguments___: '.
	self printNameLiteralArray:
		(Array with: (kindString = 'positional'
			ifTrue: [self ___pythonParamNameFor___: aName]
			ifFalse: [aName asString]))
		on: aStream.
	aStream
		nextPutAll: ' kind: '''; nextPutAll: kindString;
		nextPutAll: ''' qualifiedName: ''';
		nextPutAll: (self ___qualifiedNameFor___: name);
		nextPutAll: ''''
%

category: 'Module Method Compilation'
method: FunctionDefAst
printNameLiteralArray: names on: aStream
	"``#( ''a'' ''b'' )'' -- a Smalltalk literal array of parameter names.  No
	escaping: these are Python identifiers by construction."

	aStream nextPutAll: '#( '.
	names do: [:each | aStream nextPut: $'; nextPutAll: each asString; nextPutAll: ''' '].
	aStream nextPut: $)
%

category: 'Module Method Compilation'
method: FunctionDefAst
___pythonParamNameFor___: aName
	"The Python name of the parameter whose binding temp is ``aName''.  The
	three generators pass printPositionalUnpackingOn: their parameter lists in
	different shapes -- raw names, transport names, receiver stripped -- so the
	mapping is by lookup over this def's own parameters rather than by index.
	Answers aName unchanged when it matches none, which is the safe direction:
	the name is only ever used in an error message."

	| target |
	target := aName asString.
	((args posonlyargs ifNil: [#()]) , (args args ifNil: [#()])) do: [:a |
		((a name asString = target)
			or: [(self transportParamName: a name) asString = target])
				ifTrue: [^ a name asString]].
	^ target
%

category: 'Module Method Compilation'
method: FunctionDefAst
printArgCountChecksOn: aStream positionalName: posName kwargsName: kwName nPositional: nPos
	"Emit the CPython arg-count guards for a varargs entry, raising the
	catchable TypeError instead of silently dropping the extras:

	  1. too-many-positional -- more positional args than accepted (skipped
	     when the def has *args to absorb the tail).
	  2. unexpected-keyword -- a keyword matching no parameter (skipped when
	     the def has **kwargs to collect it).  Accepted names = every param
	     that may be passed by keyword (positional + keyword-only; posonly
	     kept lenient, included here).

	Without these, ``f(a, b)'' called ``f(1, 2, 3)'' or ``f(1, 2, z=3)''
	quietly ignored the extras (test_operator's pow/attrgetter/itemgetter/
	methodcaller).  ``nPos'' is the count of accepted positional params at
	this site (self already stripped for instance methods).  Emitted right
	after the named-param unpacking.  Messages skip CPython's exact
	singular/plural + quoting since no caller inspects them.

	HISTORY: the unexpected-keyword guard first regressed Django's WSGI stack
	-- it exposed a latent bug where ``WeakMethod'' (not a `ref` subclass, so
	Django's dispatcher never dereferenced it) was invoked directly as a
	signal receiver with ``signal=/sender=/**named''.  Fixed at the source
	(WeakMethod.__call__ now derefs + forwards), after which the guard is
	regression-clean."

	"1. Too many positional args -- skipped when *args absorbs the tail.
	Match CPython's too_many_positional() wording exactly (a plain function
	is scored on it -- test_keywordonlyarg testTooManyPositionalErrorMessage):
	  * with positional defaults the accepted count is a RANGE,
	    ``from <required> to <nPos>'' (plural always);
	  * with none it is the single ``<nPos>'' (singular only when nPos = 1).
	``given'' and the was/were suffix are runtime (given = posName size); the
	suffix is ``was'' only for a lone extra arg (given = 1, i.e. nPos = 0)."
	args vararg isNil ifTrue: [ | defcount sig plural |
		defcount := (args defaults ifNil: [#()]) size.
		defcount > 0
			ifTrue: [
				sig := 'from ' , ((nPos - defcount) max: 0) printString , ' to ' , nPos printString.
				plural := 's']
			ifFalse: [
				sig := nPos printString.
				plural := nPos = 1 ifTrue: [''] ifFalse: ['s']].
		aStream
			nextPutAll: '(('; nextPutAll: posName;
			nextPutAll: ' @env0:size) @env0:> '; print: nPos;
			nextPutAll: ') ifTrue: [TypeError ___signal___: (''';
			nextPutAll: (self ___qualifiedNameFor___: name);
			nextPutAll: '() takes '; nextPutAll: sig;
			nextPutAll: ' positional argument'; nextPutAll: plural;
			nextPutAll: ' but '' @env0:, ('; nextPutAll: posName;
			nextPutAll: ' @env0:size) @env0:printString @env0:, ('; nextPutAll: posName;
			nextPutAll: ' @env0:size @env0:> 1 ifTrue: ['' were given''] ifFalse: ['' was given'']))].'; lf ].
	"2. Unexpected keyword -- skipped when **kwargs collects the extras.

	A POSITIONAL-ONLY name is not bindable by keyword, which is the whole
	point of PEP 570, so it must not be in the accepted list.  It was, and the
	consequence was worse than a wrong message: a posonly parameter WITH a
	default silently ignored the keyword and used the default, so
	``def h(a=1, /, b=2)'' answered (1, 2) for ``h(a=9)'' where CPython raises.
	(Without a default the call still failed, but as ``missing required
	argument: a'' rather than for the real reason.)

	The **kwargs case is untouched and stays correct: this whole guard is
	skipped when the def collects extras, and CPython likewise lets
	``def g(a, /, **kw)'' take ``g(1, a=2)'' with the name landing in kw.

	Two messages, and CPython prefers the posonly one when a call commits both
	sins -- ``f(1, 2, a=1, z=9)'' reports a, not z -- so the offenders are
	collected before either is raised rather than raised as they are met.
	Posonly names are reported in PARAMETER order, joined by ', ' inside ONE
	pair of quotes (``'a, b''', not ``'a', 'b'''), matching
	CPython's format_kwargs_error."
	args kwarg isNil ifTrue: [ | kwNames poNames |
		poNames := args posonlyargs collect: [:a | a name asString].
		kwNames := OrderedCollection new.
		args args do: [:a | kwNames add: a name asString].
		args kwonlyargs do: [:a | kwNames add: a name asString].
		poNames isEmpty
			ifTrue: [
				"No positional-only parameters: emit exactly what this always
				emitted, so the overwhelmingly common def is byte-identical."
				aStream
					nextPutAll: '('; nextPutAll: kwName;
					nextPutAll: ' @env0:isNil) @env0:not ifTrue: [';
					nextPutAll: kwName; nextPutAll: ' @env0:keysDo: [:___k___ | ({ '.
				kwNames do: [:n | aStream nextPutAll: ''''; nextPutAll: n; nextPutAll: '''. '].
				aStream
					nextPutAll: '} @env0:includes: (___k___ @env0:asString)) ifFalse: [TypeError ___signal___: (''';
					nextPutAll: name;
					nextPutAll: '() got an unexpected keyword argument: '' @env0:, (___k___ @env0:asString))]]].'; lf ]
			ifFalse: [
				aStream
					nextPutAll: '('; nextPutAll: kwName;
					nextPutAll: ' @env0:isNil) @env0:not ifTrue: [ [ | ___po___ ___unk___ | '; lf;
					nextPutAll: '  ___po___ := OrderedCollection @env0:new. ___unk___ := nil.'; lf.
				"Posonly offenders, walked in parameter order so the message is
				deterministic and matches CPython's ordering."
				aStream nextPutAll: '  { '.
				poNames do: [:n | aStream nextPutAll: ''''; nextPutAll: n; nextPutAll: '''. '].
				aStream
					nextPutAll: '} @env0:do: [:___n___ | ';
					nextPutAll: kwName;
					nextPutAll: ' @env0:keysDo: [:___k___ | (___k___ @env0:asString) @env0:= ___n___ ifTrue: [___po___ @env0:add: ___n___]]].'; lf.
				"First unbindable name that is not a posonly one."
				aStream
					nextPutAll: '  '; nextPutAll: kwName;
					nextPutAll: ' @env0:keysDo: [:___k___ | (({ '.
				kwNames do: [:n | aStream nextPutAll: ''''; nextPutAll: n; nextPutAll: '''. '].
				aStream nextPutAll: '} @env0:includes: (___k___ @env0:asString)) or: [{ '.
				poNames do: [:n | aStream nextPutAll: ''''; nextPutAll: n; nextPutAll: '''. '].
				aStream
					nextPutAll: '} @env0:includes: (___k___ @env0:asString)]) ifFalse: [';
					nextPutAll: '___unk___ @env0:isNil ifTrue: [___unk___ := ___k___ @env0:asString]]].'; lf;
					nextPutAll: '  ___po___ @env0:isEmpty ifFalse: [TypeError ___signal___: (''';
					nextPutAll: name;
					nextPutAll: '() got some positional-only arguments passed as keyword arguments: '''''' @env0:, ';
					nextPutAll: '((___po___ @env0:inject: nil into: [:___acc___ :___e___ | ___acc___ @env0:isNil ifTrue: [___e___] ifFalse: [___acc___ @env0:, '', '' @env0:, ___e___]])) @env0:, '''''''')].'; lf;
					nextPutAll: '  ___unk___ @env0:isNil ifFalse: [TypeError ___signal___: (''';
					nextPutAll: name;
					nextPutAll: '() got an unexpected keyword argument: '' @env0:, ___unk___)].'; lf;
					nextPutAll: '] @env0:value ].'; lf ] ].
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
transportParamName: aName
	"Return the Smalltalk identifier that holds a Python parameter
	value.  Reserved-name params (``self'', ``super'', ``nil'',
	``true'', ``false'', ``thisContext'') become ``_<name>'' — they
	can't be declared as temps or used as assignment targets in
	Smalltalk.  NameAst's reserved-param rename matches this so body
	references read the transport identifier."

	^ (self isSmalltalkReservedIdentifier: aName)
		ifTrue: ['_' , aName asString]
		ifFalse: [aName asString]
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
generateModuleMethodSourceOn: aStream
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

	| paramNames bodyVars allLocals assignedNames needsTemp instVarNames canOptimise
	  savedReturnMode useDirectReturn useMethodTemps |
	"A ``@smalltalk'' forwarder on a @staticmethod (this generator also
	serves @staticmethod bodies, signalled by classBeingCompiled being
	non-nil).  A static method has no self/cls parameter, but its compiled
	method is class-side — so the Smalltalk receiver ``self'' IS the class,
	ALL parameters are forwarded, and the send dispatches to a class-side
	env-0 selector.  Module-level @smalltalk defs (classBeingCompiled nil)
	fall through — the receiver there would be the module instance, which
	isn't a supported forward target."
	(self isSmalltalkForwarder and: [CallAst classBeingCompiled notNil]) ifTrue: [
		^ self generateSmalltalkForwarderSourceOn: aStream
			argCount: self allParameterNames size].
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
		"A ``del'' of one of our own parameters also needs a writable
		temp: DeleteAst emits ``name := nil'', which cannot target a
		Smalltalk METHOD ARGUMENT (CompileError 1029, ``expected an
		assignable variable'').  deletedNamesInSubtree covers the
		nested case too -- ``def outer(a): def inner(): nonlocal a;
		del a'' unbinds OUTER's parameter, so outer is the def that
		has to carry the temp.  Copy rather than mutate:
		assignedNamesInBody hands back the parse's own writes set."
		self deletedNamesInSubtree isEmpty ifFalse: [
			assignedNames := (IdentitySet withAll: assignedNames)
				addAll: self deletedNamesInSubtree;
				yourself].
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
		aStream nextPutAll: self ___mangledName___.
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
		are direct method arguments).

		Pseudo-variable param names (``self'', ``super'', ``nil'',
		``true'', ``false'', ``thisContext'') are EXCLUDED here even
		though needsTemp is true for them — Smalltalk forbids declaring
		them as temps or assigning to them.  Body references to the
		Python parameter resolve to the transport identifier directly,
		via NameAst's reserved-param rename (see NameAst >>
		emitTransportNameForReservedParam:on:)."
		allLocals := OrderedCollection new.
		allLocals add: '___curPos___'.  "traceback: current-execution-position temp"
		1 to: paramNames size do: [:i |
			((needsTemp at: i)
				and: [(self isSmalltalkReservedIdentifier: (paramNames at: i)) not])
				ifTrue: [allLocals add: (paramNames at: i)].
		].
		bodyVars do: [:each |
			(allLocals includes: each) ifFalse: [
				((paramNames includes: each) and: [
					(needsTemp at: (paramNames indexOf: each)) not]) ifFalse: [
					(self isSmalltalkReservedIdentifier: each)
						ifFalse: [allLocals add: each]
						ifTrue: [
							"Reserved-named BODY LOCAL (``self = cls(**kw)''
							in a nested function or @staticmethod __new__):
							declare the ``_<name>'' transport temp; NameAst's
							reserved-name rename points reads and writes at
							it.  A reserved-named PARAM also appears in
							body.variables (the parser registers params
							there) but its ``_<name>'' is already the METHOD
							ARG — declaring it as a temp too would shadow-
							collide, so skip anything the transportNames
							slot already carries."
							| transport |
							transport := '_' , each asString.
							((allLocals includes: transport)
								or: [(paramNames includes: transport)
								or: [(transportNames detect: [:t | t asString = transport] ifNone: [nil]) notNil
								or: [paramNames includes: each]]])
								ifFalse: [allLocals add: transport]]
				].
			].
		].

		"Decide between method-scope temps and an outer block wrapper.

		Method temps are simpler (no ``^ [ ... ] value'' wrap, just
		``selector | temps | inits. body. ^ None.'') but GemStone
		forbids them from shadowing instVars.  When every entry in
		allLocals is safe (matches no instVar of the moduleClass),
		emit at method scope; otherwise fall back to the outer block
		form whose block temps ARE allowed to shadow.  The optimisation
		is gated on canOptimise (we need the instVar set) and on
		useDirect (the method-scope form needs the ``^''-return path —
		generator and with/try-finally bodies still need the wrapper)."
		useDirectReturn := (self ___wrapsBody___ not)
			and: [body hasReturnBlocking ~~ true].
		useMethodTemps := canOptimise
			and: [useDirectReturn
			and: [(allLocals anySatisfy: [:n |
				instVarNames includes: n asSymbol]) not]].

		useMethodTemps ifTrue: [
			"Method scope: temps at the top, params transported in
			directly, body inline.  Trailing ``^ None.'' (or just
			``^ X.'' when the body ends with a return) comes from
			printBodyOn: in #directMethod mode."
			allLocals isEmpty ifFalse: [
				aStream nextPutAll: '| '.
				allLocals do: [:each | aStream nextPutAll: each; space].
				aStream nextPut: $|; lf.
			].
			"Pseudo-variable params (``self'', ``super'', ...) skip
			the copy line — they aren't temps; body references resolve
			to the transport identifier via NameAst's reserved-param
			rename."
			1 to: paramNames size do: [:i |
				((needsTemp at: i)
					and: [(self isSmalltalkReservedIdentifier: (paramNames at: i)) not])
					ifTrue: [
						aStream
							nextPutAll: (paramNames at: i);
							nextPutAll: ' := ';
							nextPutAll: (transportNames at: i);
							nextPut: $.;
							lf.
				].
			].
		] ifFalse: [
			"Outer-block form: wrap so block temps can shadow instVars
			and so the method has a single ``^ <expr>'' shape even when
			the body contains multiple statements or a generator wrap."
			aStream nextPutAll: '^ ['.
			allLocals isEmpty ifFalse: [
				aStream nextPutAll: '| '.
				allLocals do: [:each | aStream nextPutAll: each; space].
				aStream nextPut: $|; lf.
				1 to: paramNames size do: [:i |
					((needsTemp at: i)
						and: [(self isSmalltalkReservedIdentifier: (paramNames at: i)) not])
						ifTrue: [
							aStream
								nextPutAll: (paramNames at: i);
								nextPutAll: ' := ';
								nextPutAll: (transportNames at: i);
								nextPut: $.;
								lf.
					].
				].
			].
		].
	] ifFalse: [
		"Varargs selector.  Method-param names are normally ``positional''
		and ``kwargs''; when the user's *vararg or **kwarg name collides
		(``def render(self, *args, **kwargs):'' makes ``kwargs'' both
		the method param AND a block temp, which shadows the param so
		``kwargs := kwargs ifNil: [...]'' reads nil), rename the method
		params to internal sentinels that body code never names."
		| posMethodParam kwMethodParam |
		"The collision isn't limited to *vararg/**kwarg names: ANY
		parameter or body local named ``positional''/``kwargs''
		shadows the method param as a block temp, so the kw-binding
		preamble reads nil and every keyword-passed argument binds
		None.  twilio's TwilioHttpClient.request builds a LOCAL dict
		named ``kwargs'' — data/auth silently vanished."
		"asString both sides: paramNames/bodyVars carry Symbols, and
		GemStone Symbol equality is identity — a bare includes: with a
		String probe never matches."
		posMethodParam := ((args vararg notNil and: [args vararg name asString = 'positional'])
			or: [(paramNames detect: [:p | p asString = 'positional'] ifNone: [nil]) notNil
			or: [(bodyVars detect: [:v | v asString = 'positional'] ifNone: [nil]) notNil]])
			ifTrue: ['___pos___'] ifFalse: ['positional'].
		kwMethodParam := ((args kwarg notNil and: [args kwarg name asString = 'kwargs'])
			or: [(paramNames detect: [:p | p asString = 'kwargs'] ifNone: [nil]) notNil
			or: [(bodyVars detect: [:v | v asString = 'kwargs'] ifNone: [nil]) notNil]])
			ifTrue: ['___kw___'] ifFalse: ['kwargs'].
		aStream nextPut: $_; nextPutAll: self ___mangledName___;
			nextPutAll: ': '; nextPutAll: posMethodParam;
			nextPutAll: ' kw: '; nextPutAll: kwMethodParam; lf.

		"Wrap in block for same instVar-shadowing reason"
		aStream nextPutAll: '^ ['.

		"Declare param locals (positional + *vararg + kwonly + **kwarg)
		+ body locals as block temps."
		"Every entry goes through transportParamName: (a String; reserved
		names become ``_<name>'') so the includes: dedupe below compares
		String-to-String — Symbol entries would dodge it (Symbol
		equality is identity) and re-declare the same temp."
		allLocals := OrderedCollection new.
		allLocals add: '___curPos___'.  "traceback: current-execution-position temp"
		paramNames do: [:each | allLocals add: (self transportParamName: each)].
		args vararg ifNotNil: [allLocals add: (self transportParamName: args vararg name)].
		args kwonlyargs do: [:each |
			| transport |
			transport := self transportParamName: each name.
			(allLocals includes: transport) ifFalse: [allLocals add: transport].
		].
		args kwarg ifNotNil: [
			| transport |
			transport := self transportParamName: args kwarg name.
			(allLocals includes: transport) ifFalse: [allLocals add: transport].
		].
		bodyVars do: [:each |
			| transport |
			"Reserved-named body locals (``self = cls(**kw)'' in a nested
			function) are carried in the ``_<name>'' transport temp;
			NameAst's reserved-name rename points reads and writes at it."
			transport := self transportParamName: each.
			(allLocals includes: transport) ifFalse: [allLocals add: transport].
		].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		"Unpack positional args into locals (with default-arg fallback).
		Reserved-named params bind through their ``_<name>'' transport."
		self printPositionalUnpackingOn: aStream
			paramNames: (paramNames collect: [:p | self transportParamName: p])
			positionalName: posMethodParam
			kwargsName: kwMethodParam.
		"Bind *vararg to the tail of positional, wrapped as a tuple."
		args vararg ifNotNil: [
			aStream
				nextPutAll: (self transportParamName: args vararg name);
				nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { ';
				nextPutAll: posMethodParam;
				nextPutAll: ' @env0:copyFrom: ';
				nextPutAll: (paramNames size + 1) printString;
				nextPutAll: ' to: ';
				nextPutAll: posMethodParam;
				nextPutAll: ' @env0:size }.';
				lf.
		].
		"Bind keyword-only args from the kwargs dict, falling back to
		the corresponding kw_default expression.  A nil entry in
		kw_defaults means the kwonly arg is required (no default) —
		emit a TypeError if missing.  Lookup keys are symbols since
		kwargs dicts are built with symbol keys."
		self printMissingKeywordOnlyCheckOn: aStream
			kwargsName: kwMethodParam
			defaultsSource: nil
			names: self ___requiredKeywordOnlyNames___.
		args kwonlyargs doWithIndex: [:each :i |
			| def |
			def := args kw_defaults at: i ifAbsent: [nil].
			aStream
				nextPutAll: each name;
				nextPutAll: ' := '; nextPutAll: kwMethodParam;
				nextPutAll: ' ifNil: ['.
			def isNil ifTrue: [
				self printSingleMissingArgumentOn: aStream
					name: each name kind: 'keyword-only'
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream
				nextPutAll: '] ifNotNil: ['; nextPutAll: kwMethodParam;
				nextPutAll: ' @env0:at: ''';
				nextPutAll: each name;
				nextPutAll: ''' ifAbsent: ['.
			def isNil ifTrue: [
				self printSingleMissingArgumentOn: aStream
					name: each name kind: 'keyword-only'
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream nextPutAll: ']].'; lf.
		].
		"Bind **kwarg to the user-visible dict.  Python's ``**kwargs''
		collects only the keyword args that DON'T match a named
		parameter, so copy the incoming kwargs (never mutate the
		caller's dict) and drop the keyword-only parameter names that
		were already bound above.  Without the drop they leak into
		**kwargs — e.g. werkzeug's ``open(*a, buffered=False,
		follow_redirects=False, **kw)'' saw both kw-only names in kw,
		so its ``if not kwargs'' guard wrongly failed.  Keys are String
		per the codegen convention."
		args kwarg ifNotNil: [
			aStream
				nextPutAll: args kwarg name;
				nextPutAll: ' := ('; nextPutAll: kwMethodParam;
				nextPutAll: ' ifNil: [(PyDict perform: #new env: 0)]) @env0:copy.';
				lf.
			args kwonlyargs do: [:each |
				aStream
					nextPutAll: args kwarg name;
					nextPutAll: ' @env0:removeKey: '''; nextPutAll: each name;
					nextPutAll: ''' ifAbsent: []. '; lf.
			].
			"Regular named params bind from the kw dict too (``def
			f(body=None, **kw)`` called as ``f(body=x, voice=y)``), so
			they must be dropped the same way — without this, twilio's
			TwiML verbs saw every declared param duplicated into the
			attrs dict.  posonlyargs stay: a keyword spelled like a
			positional-only param legitimately lands in **kwargs."
			args args do: [:each |
				aStream
					nextPutAll: args kwarg name;
					nextPutAll: ' @env0:removeKey: '''; nextPutAll: each name;
					nextPutAll: ''' ifAbsent: []. '; lf.
			].
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
	``___gen___ ___yield___: value``.

	Push #direct return-emit mode for non-generator bodies (a Smalltalk
	``^'' inside the body returns from this method — the right frame
	for Python's ``return'').  Two cases force the conservative
	#exception path back:
	  - Generators: body runs in a forked GsProcess where ``^''
	    targets the wrong activation.
	  - Bodies containing ``with'' or ``try/finally'': those
	    codegens emit cleanup statements AFTER the inlined body in
	    the same Smalltalk block, so a ``^'' inside the body would
	    leave dead code that GemStone rejects at parse time.

	#directMethod is picked when useMethodTemps decided method-scope
	temps are safe — body sits at method scope, no outer block."
	savedReturnMode := CallAst returnEmitMode.
	[
		CallAst returnEmitMode:
			(useMethodTemps == true
				ifTrue: [#directMethod]
				ifFalse: [
					(self ___wrapsBody___ or: [body hasReturnBlocking == true])
						ifTrue: [#exception]
						ifFalse: [#direct]]).
		self printBodyOn: aStream.
	] ensure: [CallAst returnEmitMode: savedReturnMode].
	"Close the outer block only when we opened one."
	useMethodTemps == true ifFalse: [aStream nextPutAll: '] value'].
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
isAsync
	"True if this def was written ``async def''.

	A FLAG rather than the node's class, because the class already carries
	something else: a def inside a CLASS BODY is re-classed to
	Instance/Static/ClassFunctionDefAst, and overwriting that with
	AsyncFunctionDefAst is what silently discarded every async method.  The two
	facts are independent, so they need independent storage."

	^ isAsyncFlag == true
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
isAsync: aBoolean
	isAsyncFlag := aBoolean.
	^ self
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
___wrapsBody___
	"True when a CALL must not run the body -- it has to answer a lazy object
	instead.  Two reasons, and they emit the same shape:

	  * a GENERATOR (the body contains yield), answering a PythonGenerator
	  * a COROUTINE (``async def''), answering a PythonCoroutine

	Everything that keyed off isGenerator keys off this instead, because the
	question was never really ``is it a generator'' -- it was ``is the body a
	Smalltalk BLOCK rather than a method body''.  That governs the wrapper emit,
	its closing bracket, and whether ``return'' can use the direct ``^'' path or
	must signal PythonReturn for the block handler to catch."

	^ self isGenerator or: [self isAsync]
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
___lazyWrapperClass___
	"The class a call answers when the body is wrapped.  An ``async def''
	containing ``yield'' is an ASYNC GENERATOR upstream, which Grail does not
	model; it answers a coroutine here, the closer of the two."

	^ self isAsync ifTrue: ['PythonCoroutine'] ifFalse: ['PythonGenerator']
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
isGenerator
	"True if this function''s body contains a ``yield`` (or
	``yield from``) expression — not counting yields inside
	*nested* defs, which belong to their own generator scope.

	MEMOISED, because the answer costs a full walk of the body subtree and
	is asked for repeatedly: nine call sites in this class's own codegen,
	plus TryAst consulting ``functionBeingCompiled isGenerator'' once per
	TRY STATEMENT.  A def was re-walked ten-odd times, and each visit built
	a fresh ``node class allInstVarNames'' Array to find its children --
	which put this walk on the stack for about half of all profiler samples
	taken over the SUnit suite.

	Safe to cache: the body is fully parsed before any of these callers run,
	and none of them rewrites it.  nil means not yet computed (the answer
	itself is a Boolean, so it is never ambiguous)."

	isGeneratorCache isNil ifTrue: [
		isGeneratorCache := self bodyContainsYieldExceptNestedDefs: body body].
	^ isGeneratorCache
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
deletedNamesInSubtree
	"The IdentitySet of bare names appearing as ``del <name>'' targets
	anywhere beneath this def.  Drives NameAst's decision to KEEP the
	unbound-local guard on a parameter read: a parameter is bound on
	entry in every calling convention Grail emits (method argument,
	prologue temp assigned-or-TypeError, or rebind transport temp), so
	``del'' is the only thing that can unbind one.

	DESCENDS INTO NESTED DEFS AND LAMBDAS, unlike
	bodyContainsYieldExceptNestedDefs:.  ``def outer(a): def inner():
	nonlocal a; del a'' unbinds OUTER's parameter, so a nested del has
	to count against this def.  That over-approximates -- a nested def
	with its own local of the same name also counts -- which only
	costs an unnecessary guard, never correctness.

	MEMOISED, for the reason isGenerator documents: the walk builds a
	fresh ``allInstVarNames'' Array per node, and the guard decision is
	asked once per NAME READ.  Safe to cache: the body is fully parsed
	before codegen runs and no caller rewrites it."

	deletedNamesCache isNil ifTrue: [
		deletedNamesCache := IdentitySet new.
		self collectDeletedNamesFrom: body into: deletedNamesCache].
	^ deletedNamesCache
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
collectDeletedNamesFrom: node into: aSet
	"Recursive walk collecting bare-name ``del'' targets into aSet.
	Handles both a single node and a collection of them."

	| targets |
	node isNil ifTrue: [^ self].
	"Strings and Symbols are SequenceableCollections; recursing into them
	would walk every Character for nothing."
	node isString ifTrue: [^ self].
	(node isKindOf: SequenceableCollection) ifTrue: [
		node do: [:each | self collectDeletedNamesFrom: each into: aSet].
		^ self].
	(node isKindOf: AbstractNode) ifFalse: [^ self].
	(node isKindOf: DeleteAst) ifTrue: [
		targets := node targets.
		targets ifNotNil: [
			targets do: [:t |
				(t isKindOf: NameAst) ifTrue: [aSet add: t id asSymbol]]]].
	"Walk every instVar, skipping the ``parent'' back-pointer so the
	walk cannot cycle up the tree."
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			self collectDeletedNamesFrom: (node instVarAt: i) into: aSet]].
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
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			| child |
			child := node instVarAt: i.
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
___stmtEndsWithInlineReturn___: stmt
	"True when emitting stmt in a ``^''-return mode leaves a caret
	return as the LAST statement at the enclosing block level.  A bare
	ReturnAst obviously does; so does a while/for whose ``else''
	clause ends with a return, because the orelse statements print
	inline after the loop at the same level (django.utils.autoreload's
	wait_for_apps_ready ends with while/else/return).  ``if'' branches
	don't count — their returns sit inside ifTrue:/ifFalse: blocks, so
	a trailing fall-through after the send is still parseable."

	| ivars idx orelse lastStmt |
	(stmt isKindOf: ReturnAst) ifTrue: [^ true].
	((stmt isKindOf: WhileAst) or: [stmt isKindOf: ForAst]) ifFalse: [^ false].
	ivars := stmt class allInstVarNames.
	idx := ivars indexOf: #orelse.
	idx = 0 ifTrue: [^ false].
	orelse := stmt instVarAt: idx.
	orelse isNil ifTrue: [^ false].
	(orelse isKindOf: AbstractNode) ifTrue: [
		"SuiteAst wrapper — take its statement list."
		| sIvars sIdx |
		sIvars := orelse class allInstVarNames.
		sIdx := sIvars indexOf: #body.
		sIdx = 0 ifTrue: [^ false].
		orelse := orelse instVarAt: sIdx].
	(orelse isKindOf: SequenceableCollection) ifFalse: [^ false].
	orelse isEmpty ifTrue: [^ false].
	lastStmt := orelse last.
	^ self ___stmtEndsWithInlineReturn___: lastStmt
%

category: 'Grail-Module Method Compilation'
method: FunctionDefAst
printBodyOn: aStream
	"Emit the function body.

	Two shapes, picked by ``CallAst returnEmitMode'':

	  #direct   — body statements emit directly; ``return X'' inside
	              the body emits ``^ X.'' (Smalltalk non-local return
	              targets the surrounding real method).  No on:do:
	              wrapper is needed — the Smalltalk method's own
	              return semantics carry the value out.  Used for
	              top-level defs and class methods that aren't
	              generators.

	  default   — body wraps in ``[ ... ] on: PythonReturn do: [...]''
	              and ``return X'' raises PythonReturn.  Required for
	              block-form bodies (nested def closures) and
	              generator coroutines where ``^'' would target the
	              wrong frame.

	Body locals are hoisted into the enclosing function block by
	generateMethodSourceOn: / generateModuleMethodSourceOn:, so the
	body statements sit directly inside the block.  The trailing
	``None.'' is the implicit fall-through return value when no
	Python ``return'' fires."

	| mode useDirect useMethod lastIsReturn savedFunction savedScopeDepth |
	mode := CallAst returnEmitMode.
	useDirect := mode == #direct.
	useMethod := mode == #directMethod.
	"In any ``^''-based mode the body's final ``return X'' compiles to
	``^ X.'' — and GemStone requires ``^'' to be the last statement of
	its enclosing block.  When the body's last top-level statement IS
	a ReturnAst we therefore omit the trailing fall-through (it would
	be unreachable and the compiler would reject it).  Functions whose
	last statement isn't a return — most decorators, side-effecting
	routines — still get a fall-through (``None.'' inside the block in
	#direct mode, ``^ None.'' at method scope in #directMethod mode)
	so the implicit return matches Python's ``return None''."
	"Judge the REACHABLE statement list: unreachable code after a
	top-level `return` is dropped at emit (___reachableStatements___:),
	so `return 1` followed by dead statements still ends the emitted
	body with ^ and must suppress the fall-through."
	lastIsReturn := (useDirect or: [useMethod])
		and: [body body notEmpty
		and: [self ___stmtEndsWithInlineReturn___:
			(self ___reachableStatements___: body body) last]].

	self ___wrapsBody___ ifTrue: [
		aStream nextPutAll: self ___lazyWrapperClass___ , ' @env1:withBlock: [:___gen___ |'; lf.
	].
	(useDirect or: [useMethod]) ifFalse: [
		aStream nextPutAll: '['; lf.
	].
	"Expose this def as the current function scope while its body
	statements emit, so the locals() rewrite in CallAst sees the right
	variable set.  Save/restore (not set/nil) so a nested def's body
	hands the enclosing def back on exit."
	savedFunction := CallAst functionBeingCompiled.
	CallAst functionBeingCompiled: self.
	"Same window on the LEXICAL SCOPE STACK.  This is the path a class defined
	in a METHOD comes through, so it is what makes ``Outer.meth.<locals>.Inner''
	reachable at all -- the class is emitted here, inside the method source, with
	Outer's own frame still on the stack underneath."
	savedScopeDepth := CallAst ___pushScope___: self kind: #function name: name.
	[
		(self ___reachableStatements___: body body) do: [:each |
			self ___emitCurPosBefore: each on: aStream.
			each printSmalltalkOn: aStream.
			aStream lf].
	] ensure: [
		CallAst functionBeingCompiled: savedFunction.
		CallAst ___restoreScopeDepth___: savedScopeDepth].
	lastIsReturn ifFalse: [
		useMethod
			ifTrue: [aStream nextPutAll: '^ None.'; lf]
			ifFalse: [aStream nextPutAll: 'None.'; lf].
	].
	(useDirect or: [useMethod]) ifFalse: [
		aStream nextPutAll: '] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]'.
	].
	self ___wrapsBody___ ifTrue: [
		aStream nextPutAll: ']'.
	].
	(useDirect or: [useMethod]) ifFalse: [
		aStream nextPutAll: '.'; lf.
	].
%

! ===============================================================================
! Class instance method → real Smalltalk method
! ===============================================================================

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
instanceMethodParameterNames
	"Return parameter names excluding the self parameter (first arg).
	For `def foo(self, a, b):` returns #('a' 'b')."

	| all |
	all := self allParameterNames.
	all isEmpty ifTrue: [^ #()].
	^ all copyFrom: 2 to: all size
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
instanceMethodArity
	"Return the arity excluding the self parameter."

	^ self moduleMethodArity - 1 max: 0
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
instanceMethodSelector
	"Return the Smalltalk selector for this function as a class instance method.
	Same convention as module methods but with self stripped:
	  def foo(self): → #foo (0 real args)
	  def foo(self, a): → #foo: (1 real arg)
	  def foo(self, a, b): → #foo:_: (2 real args)
	For complex signatures → #_foo:kw: (varargs)."

	self compilesAsVarargs ifTrue: [
		^ CallAst varargsSelectorForName: name
	].
	^ CallAst fastPathSelectorForAttr: name arity: self instanceMethodArity
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
generateMethodStubSource
	"Generate a stub for pre-registration (same idea as generateModuleMethodStubSource
	but with self stripped from parameters)."

	| stream paramNames |
	stream := AppendStream on: Unicode7 new.
	self compilesAsVarargs ifTrue: [
		stream nextPut: $_; nextPutAll: name; nextPutAll: ': positional kw: kwargs'.
	] ifFalse: [
		paramNames := self instanceMethodParameterNames.
		stream nextPutAll: name.
		paramNames isEmpty ifFalse: [
			stream nextPutAll: ': ___1'.
			2 to: paramNames size do: [:i |
				stream nextPutAll: ' _: ___'; nextPutAll: i printString.
			].
		].
	].
	stream nextPut: Character lf; nextPutAll: '^ nil'.
	^ stream contents
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
isSmalltalkForwarder
	"True when this def is decorated with grail's ``@smalltalk'' — bare
	``@smalltalk'', ``@smalltalk('selector')'', or either of the
	``@grail.smalltalk'' attribute forms.  Such a method has no Python
	body (``...''); Grail rewrites it at compile time into a forwarder
	that dispatches to a native env-0 Smalltalk method on the receiver.
	See generateSmalltalkForwarderSourceOn:."

	decorator_list isNil ifTrue: [^ false].
	^ decorator_list anySatisfy: [:deco | self decoratorRefersToSmalltalk: deco]
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
decoratorRefersToSmalltalk: deco
	"Recognise grail's ``@smalltalk'' decorator in every shape the parser
	may store: a bare name (the parser collapses ``@smalltalk'' to the
	Symbol/String ``smalltalk''; a NameAst is handled too for safety), the
	``@grail.smalltalk'' attribute form (AttributeAst attr 'smalltalk'), or
	either wrapped in a call ``@smalltalk('sel')'' / ``@grail.smalltalk('sel')''
	(CallAst — recurse into the called function)."

	(deco isKindOf: Symbol) ifTrue: [^ deco asString = 'smalltalk'].
	(deco isKindOf: String) ifTrue: [^ deco asString = 'smalltalk'].
	(deco isKindOf: NameAst) ifTrue: [^ deco id asString = 'smalltalk'].
	(deco isKindOf: AttributeAst) ifTrue: [^ deco attr asString = 'smalltalk'].
	(deco isKindOf: CallAst) ifTrue: [^ self decoratorRefersToSmalltalk: deco function].
	^ false
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
smalltalkForwarderExplicitSelector
	"The explicit env-0 selector string supplied as ``@smalltalk('sel')''
	(or ``@grail.smalltalk('sel')''), or nil for the bare ``@smalltalk''
	form (whose target selector is derived from the method name + arity).
	The decorator argument, when present, must be a string literal."

	decorator_list isNil ifTrue: [^ nil].
	decorator_list do: [:deco |
		(self decoratorRefersToSmalltalk: deco) ifTrue: [
			(deco isKindOf: CallAst) ifTrue: [
				| posArgs first |
				posArgs := deco arguments.
				(posArgs isNil or: [posArgs isEmpty]) ifTrue: [^ nil].
				first := posArgs first.
				((first isKindOf: ConstantAst) and: [first value isKindOf: String])
					ifTrue: [^ first value asString].
				self error: 'grail @smalltalk(...) selector must be a string literal'.
			].
			^ nil.
		].
	].
	^ nil
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
smalltalkForwarderTargetSelector: argCount
	"The env-0 selector this forwarder dispatches to: the explicit string
	from ``@smalltalk('sel')'', else derived from the method name and
	arity (name / name: / name:_: ...) — the same convention Grail uses
	for a normal fixed-arity method."

	| explicit |
	explicit := self smalltalkForwarderExplicitSelector.
	explicit ifNotNil: [^ explicit asString].
	^ (CallAst fastPathSelectorForAttr: name arity: argCount) asString
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
generateSmalltalkForwarderSourceOn: aStream argCount: argCount
	"Emit the complete env-1 method source for a ``@smalltalk''-decorated
	forwarder.  The header is the ordinary fixed-arity selector (name /
	name: / name:_: ...); the body performs the target env-0 selector on
	the receiver ``self'' with the method's arguments, and maps a nil
	result to Python None.

	``argCount'' is the number of forwarded arguments, which also picks the
	receiver:
	  - instance method   -> self is the instance   (self stripped: argCount
	    = instanceMethodParameterNames size)
	  - @classmethod       -> self is the class      (cls stripped, same count)
	  - @staticmethod      -> self is the class too, but NO first parameter is
	    stripped (argCount = allParameterNames size), compiled class-side.

	Only fixed positional signatures are supported (no defaults, *args,
	**kwargs, keyword-only args, and not __init__ — which Grail forces to
	the varargs form)."

	| targetSel numExpected |
	self compilesAsVarargs ifTrue: [
		self error: 'grail @smalltalk forwarder ''' , name asString ,
			''' must have a fixed positional signature (no defaults, *args, **kwargs or keyword-only args; and not __init__)'].
	targetSel := self smalltalkForwarderTargetSelector: argCount.
	"Validate that the target selector's arity matches the forwarded args."
	numExpected := (targetSel includes: $:)
		ifTrue: [targetSel occurrencesOf: $:]
		ifFalse: [
			(targetSel size > 0 and: [(targetSel at: 1) isLetter or: [(targetSel at: 1) = $_]])
				ifTrue: [0] ifFalse: [1]].
	numExpected = argCount ifFalse: [
		self error: 'grail @smalltalk selector ''' , targetSel asString ,
			''' expects ' , numExpected printString ,
			' argument(s) but method ''' , name asString ,
			''' forwards ' , argCount printString].
	"Header — the same selector a normal instance method would expose."
	aStream nextPutAll: name asString.
	argCount > 0 ifTrue: [
		aStream nextPutAll: ': ___1'.
		2 to: argCount do: [:i | aStream nextPutAll: ' _: ___' , i printString]].
	aStream lf.
	"Body — forward to the env-0 target via perform:, coercing nil to None."
	aStream nextPutAll: '| ___stResult___ |'; lf.
	aStream nextPutAll: '___stResult___ := self perform: #'''.
	aStream nextPutAll: targetSel asString.
	aStream nextPutAll: ''' env: 0 withArguments: { '.
	1 to: argCount do: [:i | aStream nextPutAll: '___' , i printString , '. '].
	aStream nextPutAll: '}.'; lf.
	aStream nextPutAll: '^ ___stResult___ == nil ifTrue: [None] ifFalse: [___stResult___]'
%

category: 'Grail-Class Method Compilation'
method: FunctionDefAst
generateMethodSourceOn: aStream
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

	| paramNames bodyVars allLocals savedReturnMode
	  useDirectReturn useMethodTemps
	  selfName selfRebound selfTransport savedSelfRebound |
	"``@smalltalk''-decorated methods forward to a native (env-0) Smalltalk
	method rather than compiling a Python body — see isSmalltalkForwarder.
	Instance methods and @classmethods strip the first parameter (self /
	cls), so the forwarded arg count is instanceMethodParameterNames size."
	self isSmalltalkForwarder ifTrue: [
		^ self generateSmalltalkForwarderSourceOn: aStream
			argCount: self instanceMethodParameterNames size].
	paramNames := self instanceMethodParameterNames.
	bodyVars := body variables.

	"CPython treats the self/cls parameter as an ordinary rebindable
	local (``self = None'' to break reference cycles in asgiref;
	``self = tuple.__new__(cls, ...)'' in __new__).  Smalltalk's
	``self'' pseudo-variable is not assignable, so when the body
	rebinds it, carry the receiver in a ``_self'' block temp instead:
	declare the temp, initialise it from the receiver, and print the
	body with CallAst selfParameterRebound set so NameAst emits the
	transport identifier and every receiver fast path (instVar
	read/store, self-send) degrades to the generic object paths."
	selfName := CallAst selfParameterName.
	selfRebound := selfName notNil
		and: [self assignedNamesInBody includes: selfName asSymbol].
	"The transport temp needs the ``_'' prefix only when the param is a
	Smalltalk pseudo-variable (``self'') that can't be declared as a
	temp.  An ordinary self-param name (jinja2's ``Context.call(__self,
	...)`` rebinds ``__self``) is declared under its OWN name -- NameAst
	emits the plain identifier for it (isSelfReference answers false on
	the rebound path and no reserved rename fires), so a prefixed temp
	would leave every body reference undeclared."
	selfTransport := selfRebound
		ifTrue: [(self isSmalltalkReservedIdentifier: selfName asString)
			ifTrue: ['_' , selfName asString]
			ifFalse: [selfName asString]]
		ifFalse: [nil].

	self compilesAsVarargs ifFalse: [
		| transportNames |
		"Pick a per-parameter transport name (the Smalltalk method-arg
		identifier that carries the value into the block temp).  Prefer
		the underscore-prefixed form (``_x'' for Python ``x'') so the
		selector reads traceably; fall back to the ``___N'' positional
		placeholder when ``_x'' would collide with another parameter or
		a body local.  Phase B: instance attributes live in dynamic-
		instVar storage (not static slots), so no per-class instVar
		collision check is necessary."
		transportNames := paramNames collect: [:each |
			| candidate |
			candidate := '_' , each.
			((paramNames includes: candidate)
				or: [bodyVars includes: candidate asSymbol])
				ifTrue: [nil]
				ifFalse: [candidate]].
		1 to: paramNames size do: [:i |
			(transportNames at: i) isNil ifTrue: [
				transportNames at: i put: '___' , i printString].
		].

		aStream nextPutAll: self ___mangledName___.
		paramNames isEmpty ifFalse: [
			aStream nextPutAll: ': '; nextPutAll: (transportNames at: 1).
			2 to: paramNames size do: [:i |
				aStream nextPutAll: ' _: '; nextPutAll: (transportNames at: i).
			].
		].
		aStream lf.

		"Build the locals set — paramNames (always declared as block
		temps for the no-shadow rule) + body locals.  Phase B: no
		longer filter against classIvars; instance attributes live in
		dynamic-instVar storage, not in static instVar slots, so a
		bare-name body local (``x = ...; print(x)'') must always be
		declared as a Smalltalk temp.  ``self.x = ...'' goes through
		AttributeAst's dynamicInstVarAt:put: emit and is a separate
		write target from the bare-name local."
		allLocals := OrderedCollection new.
		allLocals add: '___curPos___'.  "traceback: current-execution-position temp"
		paramNames do: [:each | allLocals add: each].
		bodyVars do: [:each |
			| declared |
			"Reserved-named body locals (``self = super(...).__new__(cls)``
			in a def whose receiver param is ``cls``) must be DECLARED
			under their ``_<name>'' transport -- NameAst's reserved-name
			rename points every read/write at that temp, and the
			pseudo-variable itself can't be a Smalltalk temp."
			declared := (self isSmalltalkReservedIdentifier: each)
				ifTrue: ['_' , each asString]
				ifFalse: [each].
			(allLocals includes: declared) ifFalse: [
				(CallAst isSelfReference: each) ifFalse: [
					allLocals add: declared
				]
			]
		].
		selfRebound ifTrue: [
			(allLocals includes: selfTransport) ifFalse: [
				allLocals add: selfTransport]].

		"Drop the outer ``^ [ ... ] value'' wrapper when there's
		nothing to put inside it — no params, no body locals, and
		``^''-return is safe (non-generator, no with/try-finally).
		Body sits directly at method scope.  Helps zero-other-arg
		Python instance methods like ``def sum(self): return self.x
		+ self.y'' which previously emitted ``^ [^ X.] value'' for
		no gain.  (Despite this method's name, ``class method'' here
		means ``method of a Python class'' — covers instance methods,
		@classmethod, and @staticmethod alike.)"
		useDirectReturn := (self ___wrapsBody___ not)
			and: [body hasReturnBlocking ~~ true].
		useMethodTemps := useDirectReturn and: [allLocals isEmpty].

		useMethodTemps ifFalse: [
			aStream nextPutAll: '^ ['.
			allLocals isEmpty ifFalse: [
				aStream nextPutAll: '| '.
				allLocals do: [:each | aStream nextPutAll: each; space].
				aStream nextPut: $|; lf.
			].
			1 to: paramNames size do: [:i |
				aStream
					nextPutAll: (paramNames at: i);
					nextPutAll: ' := ';
					nextPutAll: (transportNames at: i);
					nextPut: $.;
					lf.
			].
			selfRebound ifTrue: [
				aStream nextPutAll: selfTransport;
					nextPutAll: ' := self.'; lf].
		].
	] ifTrue: [
		"Varargs selector.  Rename method params to internal sentinels
		when the user's *vararg / **kwarg name would collide — same
		rationale as the module-method varargs branch."
		| posMethodParam kwMethodParam |
		"The collision isn't limited to *vararg/**kwarg names: ANY
		parameter or body local named ``positional''/``kwargs''
		shadows the method param as a block temp, so the kw-binding
		preamble reads nil and every keyword-passed argument binds
		None.  twilio's TwilioHttpClient.request builds a LOCAL dict
		named ``kwargs'' — data/auth silently vanished."
		"asString both sides: paramNames/bodyVars carry Symbols, and
		GemStone Symbol equality is identity — a bare includes: with a
		String probe never matches."
		posMethodParam := ((args vararg notNil and: [args vararg name asString = 'positional'])
			or: [(paramNames detect: [:p | p asString = 'positional'] ifNone: [nil]) notNil
			or: [(bodyVars detect: [:v | v asString = 'positional'] ifNone: [nil]) notNil]])
			ifTrue: ['___pos___'] ifFalse: ['positional'].
		kwMethodParam := ((args kwarg notNil and: [args kwarg name asString = 'kwargs'])
			or: [(paramNames detect: [:p | p asString = 'kwargs'] ifNone: [nil]) notNil
			or: [(bodyVars detect: [:v | v asString = 'kwargs'] ifNone: [nil]) notNil]])
			ifTrue: ['___kw___'] ifFalse: ['kwargs'].
		aStream nextPut: $_; nextPutAll: self ___mangledName___;
			nextPutAll: ': '; nextPutAll: posMethodParam;
			nextPutAll: ' kw: '; nextPutAll: kwMethodParam; lf.

		aStream nextPutAll: '^ ['.

		"Declare param locals (positional + *vararg + kwonly + **kwarg)
		+ body locals as block temps.  Match the module-method path so
		every parameter shape — defaults, *args, kwonly, **kwargs — has
		a binding emitted below.  Parameters always become block temps
		(see the simple-positional branch for the rationale)."
		allLocals := OrderedCollection new.
		allLocals add: '___curPos___'.  "traceback: current-execution-position temp"
		paramNames do: [:each | allLocals add: each].
		args vararg ifNotNil: [allLocals add: args vararg name].
		args kwonlyargs do: [:each |
			(allLocals includes: each name) ifFalse: [
				allLocals add: each name].
		].
		args kwarg ifNotNil: [allLocals add: args kwarg name].
		bodyVars do: [:each |
			| declared |
			"Phase B: body locals are always temps — no classIvars
			filter; instance state lives in dynamic instVar storage now.
			Reserved-named locals declare their ``_<name>'' transport
			(see the fixed-arity branch above)."
			declared := (self isSmalltalkReservedIdentifier: each)
				ifTrue: ['_' , each asString]
				ifFalse: [each].
			(allLocals includes: declared) ifFalse: [
				(CallAst isSelfReference: each) ifFalse: [
					allLocals add: declared
				]
			]
		].
		selfRebound ifTrue: [
			(allLocals includes: selfTransport) ifFalse: [
				allLocals add: selfTransport]].
		allLocals isEmpty ifFalse: [
			aStream nextPutAll: '| '.
			allLocals do: [:each | aStream nextPutAll: each; space].
			aStream nextPut: $|; lf.
		].

		"Positional / kwargs / default unpacking for the named params."
		self printPositionalUnpackingOn: aStream
			paramNames: paramNames
			positionalName: posMethodParam
			kwargsName: kwMethodParam.
		"Bind *vararg to the tail of positional, wrapped as a tuple."
		args vararg ifNotNil: [
			aStream
				nextPutAll: args vararg name;
				nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { ';
				nextPutAll: posMethodParam;
				nextPutAll: ' @env0:copyFrom: ';
				nextPutAll: (paramNames size + 1) printString;
				nextPutAll: ' to: ';
				nextPutAll: posMethodParam;
				nextPutAll: ' @env0:size }.';
				lf.
		].
		"Bind keyword-only args from the kwargs dict, falling back to
		the corresponding kw_default expression."
		self printMissingKeywordOnlyCheckOn: aStream
			kwargsName: kwMethodParam
			defaultsSource: nil
			names: self ___requiredKeywordOnlyNames___.
		args kwonlyargs doWithIndex: [:each :i |
			| def |
			def := args kw_defaults at: i ifAbsent: [nil].
			aStream
				nextPutAll: each name;
				nextPutAll: ' := '; nextPutAll: kwMethodParam;
				nextPutAll: ' ifNil: ['.
			def isNil ifTrue: [
				self printSingleMissingArgumentOn: aStream
					name: each name kind: 'keyword-only'
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream
				nextPutAll: '] ifNotNil: ['; nextPutAll: kwMethodParam;
				nextPutAll: ' @env0:at: ''';
				nextPutAll: each name;
				nextPutAll: ''' ifAbsent: ['.
			def isNil ifTrue: [
				self printSingleMissingArgumentOn: aStream
					name: each name kind: 'keyword-only'
			] ifFalse: [
				def printSmalltalkOn: aStream
			].
			aStream nextPutAll: ']].'; lf.
		].
		"Bind **kwarg to the user-visible dict.  Python's ``**kwargs''
		collects only the keyword args that DON'T match a named
		parameter, so copy the incoming kwargs (never mutate the
		caller's dict) and drop the keyword-only parameter names that
		were already bound above.  Without the drop they leak into
		**kwargs — e.g. werkzeug's ``open(*a, buffered=False,
		follow_redirects=False, **kw)'' saw both kw-only names in kw,
		so its ``if not kwargs'' guard wrongly failed.  Keys are String
		per the codegen convention."
		args kwarg ifNotNil: [
			aStream
				nextPutAll: args kwarg name;
				nextPutAll: ' := ('; nextPutAll: kwMethodParam;
				nextPutAll: ' ifNil: [(PyDict perform: #new env: 0)]) @env0:copy.';
				lf.
			args kwonlyargs do: [:each |
				aStream
					nextPutAll: args kwarg name;
					nextPutAll: ' @env0:removeKey: '''; nextPutAll: each name;
					nextPutAll: ''' ifAbsent: []. '; lf.
			].
			"Regular named params bind from the kw dict too (``def
			f(body=None, **kw)`` called as ``f(body=x, voice=y)``), so
			they must be dropped the same way — without this, twilio's
			TwiML verbs saw every declared param duplicated into the
			attrs dict.  posonlyargs stay: a keyword spelled like a
			positional-only param legitimately lands in **kwargs."
			args args do: [:each |
				aStream
					nextPutAll: args kwarg name;
					nextPutAll: ' @env0:removeKey: '''; nextPutAll: each name;
					nextPutAll: ''' ifAbsent: []. '; lf.
			].
		].
		selfRebound ifTrue: [
			aStream nextPutAll: selfTransport;
				nextPutAll: ' := self.'; lf].
	].

	"Push the return-emit mode.  #directMethod when useMethodTemps is
	set (body at method scope, no wrapper); #direct otherwise (body
	inside the outer ``^ [ ... ] value'' block).  #exception when
	``^'' can't safely escape the body (generator or
	with/try-finally — those still need the PythonReturn handler)."
	savedReturnMode := CallAst returnEmitMode.
	savedSelfRebound := CallAst selfParameterRebound.
	[
		CallAst returnEmitMode:
			(useMethodTemps == true
				ifTrue: [#directMethod]
				ifFalse: [
					(self ___wrapsBody___ or: [body hasReturnBlocking == true])
						ifTrue: [#exception]
						ifFalse: [#direct]]).
		CallAst selfParameterRebound: selfRebound.
		self printBodyOn: aStream.
	] ensure: [
		CallAst returnEmitMode: savedReturnMode.
		CallAst selfParameterRebound: savedSelfRebound].
	"Close the outer block only when one was opened."
	useMethodTemps == true ifFalse: [aStream nextPutAll: '] value'].
%

category: 'Grail-printing'
method: FunctionDefAst
___reachableStatements___: stmts
	"Statements up to and including the first top-level `return`.
	Smalltalk rejects statements after ^ inside a block, so Python's
	(legal) unreachable tail after `return` must be dropped at codegen
	-- test_fractions.Rat.__rmod__ has dead code after its return and
	the whole module failed to compile."

	| out |
	out := OrderedCollection new.
	stmts do: [:each |
		out add: each.
		each isUnconditionalReturn ifTrue: [^ out]].
	^ out
%
method: FunctionDefAst
name: newValue
	name := newValue
%
method: FunctionDefAst
args
	^args
%
method: FunctionDefAst
args: newValue
	args := newValue
%
method: FunctionDefAst
body: newValue
	body := newValue
%
method: FunctionDefAst
decorator_list
	^decorator_list
%
method: FunctionDefAst
decorator_list: newValue
	decorator_list := newValue
%
method: FunctionDefAst
returns
	^returns
%
method: FunctionDefAst
returns: newValue
	returns := newValue
%
method: FunctionDefAst
type_comment
	^type_comment
%
method: FunctionDefAst
type_comment: newValue
	type_comment := newValue
%
method: FunctionDefAst
type_params
	^type_params
%
method: FunctionDefAst
type_params: newValue
	type_params := newValue
%
