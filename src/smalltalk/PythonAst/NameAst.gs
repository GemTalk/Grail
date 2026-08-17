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
	"True if a USER-WRITTEN bare name may bind directly to a Smalltalk
	global at compile time.  Used by the free-name fallback in
	printSmalltalkOn: to decide between emitting the bare identifier and
	emitting a runtime module-attribute lookup.

	Two conditions, both required.  The name must be one Python itself
	would resolve unqualified -- i.e. it is in CPython's builtins namespace
	(see builtins class >> ___builtinNamespaceNames___) -- and it must
	actually resolve on this user's symbol list.

	The builtins gate is the important half.  Grail's Python
	SymbolDictionary is also its implementation namespace: alongside the 93
	real builtins it holds module classes (``json'', ``math''),
	implementation classes (``PyDict'', ``PySocket'', ``BoundMethod'') and
	flattened ``module_attr'' names (``sys_flags'', ``os_path''), and the
	symbol list reaches the whole GemStone kernel beyond that.  Resolving
	against all of it made 166 names bind that CPython would not resolve at
	all: ``json'' worked with no import, and ``Decimal'' silently bound to
	GemStone's ScaledDecimal.  Now those raise NameError, as they should.

	This gates only names the USER wrote.  Internal classes that codegen
	EMITS -- ``Python'', ``BoundMethod'', ``PyLazyExceptSelector'' -- are
	written straight into the generated source and never come through here,
	so they are unaffected."

	^ (builtins ___builtinNamespaceNames___ includes: aSymbol)
		and: [(System myUserProfile symbolList objectNamed: aSymbol) notNil]
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

category: 'Grail-codegen helpers'
method: NameAst
___mangledId___
	"The name AS COMPILED: private-name mangled when this node sits inside a
	class body (see AbstractNode >> ___manglePrivate___:), so ``__x'' written
	in class C is _C__x.  The counterpart of AttributeAst >> ___mangledAttr___
	and FunctionDefAst >> ___mangledName___.

	Used ONLY on the class-body paths -- the name sets those consult
	(classFunctionNames, classAttrNames, classSlotNames) are themselves filled
	with mangled names, so an unmangled probe simply missed.  The ENCLOSING-
	SCOPE fallbacks keep the raw name: CPython mangles there too and so raises
	NameError for a module-level ``__x'' read from a class body, but Grail has
	always resolved it and nothing is gained by breaking that."

	^ self ___manglePrivate___: id
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

	"Class-body name referenced from a class-body METHOD DECORATOR.
	``@t.register(int)'' names ``t'', a sibling def -- a local of the class
	body in CPython, which has no counterpart in Grail, so the name used to
	fall through to the module and raise NameError.  Because the decorator
	application is wrapped in a handler, that failure was silent: the
	decorator never took effect and the undecorated method stayed in place.
	Resolve it off the class, which is where the class body's bindings live
	(the def's own decorator chain stored them there moments earlier).

	Scoped to the names the class body actually binds as defs, so a decorator
	naming a MODULE global -- ``@functools.singledispatchmethod'' -- is
	untouched.  See CallAst >> classBodyDecoratorScope."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBodyDecoratorScope notNil
		and: [(CallAst classBodyDecoratorScope value includes: id asSymbol)]])
		ifTrue: [
			aStream
				nextPutAll: '(';
				nextPutAll: CallAst classBodyDecoratorScope key;
				nextPutAll: ' @env1:___pyAttrLoad___: #''';
				nextPutAll: id;
				nextPutAll: ''')'.
			^ self
		].
	"self parameter in class method → Smalltalk self.  NOT when a
	nested function between here and the method binds the name itself
	(``def view(request): self = cls(**kw)'' inside View.as_view) —
	that ``self'' is the nested def's own local and takes the
	reserved-name transport rename below."
	((CallAst isSelfReference: id)
		and: [(self ___boundInNestedFunction___: id) not]) ifTrue: [
		aStream nextPutAll: 'self'.
		^ self
	].
	"Reserved-name parameter rename: when the Python parameter name is
	a Smalltalk pseudo-variable (``self'', ``super'', ``nil'', ``true'',
	``false'', ``thisContext'') — typically ``def f(self, ...)'' at
	module level — the method-arg slot is renamed to ``_<name>'' (the
	transport identifier).  Body references to the original Python
	name must emit the transport form so they read the actual value
	instead of Smalltalk's pseudo-variable.  Applies to load and store
	contexts alike; without this, ``self`` in a module-level def's
	body would read Smalltalk's implicit self (the module instance),
	not the first call argument."
	(self ___enclosingFuncDeclaresReservedParam___: id) ifTrue: [
		aStream nextPut: $_; nextPutAll: id.
		^ self
	].
	"``__class__'' inside a method is the class the method was DEFINED in --
	CPython gives every method an implicit closure cell holding it, which is
	also what zero-arg ``super()'' reads.  Grail had no such name, so the read
	fell through to the fast-path builtin wrap just below and answered a
	BoundMethod for ``builtins.__class__'' -- the same object for every class,
	so ``__class__ is X'' was false everywhere and nothing errored to say so
	(test_super's test___class___instancemethod / _classmethod / _staticmethod,
	and the __class___mro / _new / _delayed group).

	It is the DEFINING class, not type(self): a method inherited by a subclass
	still sees the class whose body it appeared in, which is what makes
	CallAst's cell key name-specific.  Both share printDefiningClassOn: so the
	two readings cannot drift.

	Load context only -- a store still emits the bare identifier so
	``<name> := <value>'' stays well-formed -- and stood down when an
	ENCLOSING FUNCTION declares ``__class__'' itself, so an explicit
	``nonlocal __class__'' local (which popScope now keeps, see PythonParser)
	still wins.

	The test is deliberately per-enclosing-function rather than
	isVariableIsDeclared:, which also consults MODULE scope.  ``global
	__class__'' anywhere in a module registers the name there, and
	test_super does exactly that inside one test
	(test_various___class___pathologies) -- which made ``__class__'' look
	declared for the whole file and stood this branch down in every unrelated
	method, leaving them all on the BoundMethod fallback.  A module-level
	binding of ``__class__'' is not what a method's implicit cell reads
	anyway."
	((ctx isKindOf: LoadAst)
		and: [id asSymbol == #'__class__'
		and: [CallAst classBeingCompiled notNil
		and: [CallAst moduleClassBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [(self ___declaredInEnclosingFunction___: id asSymbol) not]]]]])
		ifTrue: [
			CallAst printDefiningClassOn: aStream.
			^ self
		].
	"The bare name ``super'', where CallAst's call-shape rewrites did not
	already consume it.  ``super'' is a Smalltalk PSEUDO-VARIABLE, so the
	identifier can never be emitted as itself; until now nothing emitted
	anything for it, and every use that was not the zero-arg or
	2-arg-bare-NameAst call form raised ``name 'super' is not defined'' --
	``super(int, int, int)'', ``super(1, int)'', ``f = super'',
	``class mysuper(super)'', ``super.__init__(...)''.

	Resolve it to the Super class, which IS Python's ``super'' type here, so
	those uses see a real object: calling it runs Super class's argument
	checks, and ``super().__class__ is super'' holds because the proxy's
	class is that same object.

	Stood down when an enclosing function declares ``super'' itself, and when
	the MODULE binds the name -- a module is free to define ``class super:''
	or have the attribute patched, and then the binding wins over the builtin,
	exactly as for any other shadowed builtin."
	((ctx isKindOf: LoadAst)
		and: [id asSymbol == #'super'
		and: [(self ___declaredInEnclosingFunction___: #'super') not
		and: [(self isModuleVariableName: #'super') not]]])
		ifTrue: [
			aStream nextPutAll: 'Super'.
			^ self
		].
	(self isFastPathBuiltinName) ifTrue: [
		"``type'' as a VALUE is the CLASS, not a callable wrapper.  Every other
		builtin read here answers a BoundMethod on builtins, which is a callable
		and nothing more -- fine for ``len'' or ``abs'', wrong for ``type'',
		whose value Python code compares and inherits from: ``issubclass(Meta,
		type)'' and ``isinstance(x, type)'' take it as an ARGUMENT, and
		``class M(type)'' as a BASE.  While it was a BoundMethod, builtins >>
		___resolveClassRef___ had to map it to Behavior (``is it a class'') to
		keep those two answerable at all, which conflates them: ``is x a class''
		is right for isinstance and wrong for issubclass, where CPython asks
		whether the class inherits from type.  type answers both directly.
		It stays callable -- type class >> value:value: dispatches the 1-arg
		and 3-arg forms -- so a ``type'' passed as a function still works."
		(id asSymbol == #'type') ifTrue: [
			aStream nextPutAll: 'type'.
			^ self
		].
		aStream
			nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
			nextPutAll: id;
			nextPutAll: ')'.
		^ self
	].
	"CLASS-BODY LOAD_NAME.  CPython compiles every read in a class body to
	LOAD_NAME, which consults the body's NAMESPACE at runtime and only then the
	enclosing scopes.  Grail resolves the read statically instead, which is
	exact for a body whose bindings are all statements -- and wrong for one that
	writes through locals():

	    x = 42
	    class X:
	        locals()['x'] = 43
	        y = x               -- 43 in CPython; the static read answered 42

	So probe the class's own dynamically-bound names first (that write lands in
	the per-class holder, since no statement named ``x'' for an accessor to be
	compiled for) and fall back to whatever the read would otherwise have been.
	___classBodyDynamicRead___ deliberately does NOT walk the bases: LOAD_NAME
	sees the class body's namespace, never inherited attributes, so an inherited
	``x'' must not outrank the module global here.

	Gated on classBodyDynamicLocals, so a class body with no locals()/vars()
	call -- every class body in the corpus but a handful -- emits exactly what
	it did before.

	The fallback is THIS METHOD re-entered with the gate suppressed, so there is
	one description of how a class-body name resolves rather than a copy that
	can drift.  A plain flag suffices for the suppression: a NameAst emit is a
	leaf and never emits another NameAst, so nothing else is in flight."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBodyDynamicLocals
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit
		and: [self ___inNestedScopeWithinClassBody___ not]]]]) ifTrue: [
			| inner |
			inner := WriteStream on: String new.
			CallAst classBodyDynamicLocals: false.
			[self printSmalltalkOn: inner]
				ensure: [CallAst classBodyDynamicLocals: true].
			aStream
				nextPutAll: '((';
				nextPutAll: CallAst classBeingCompiled asString;
				nextPutAll: ' @env1:___classBodyDynamicRead___: #''';
				nextPutAll: self ___mangledId___;
				nextPutAll: ''') @env0:ifNil: [';
				nextPutAll: inner contents;
				nextPutAll: '])'.
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
	"EXEC/EVAL class body: same sibling-name reads as the block below, but
	there is no module class, so every one of that block's fallbacks --
	``<ModuleClass> @env0:___instance___ ...'' -- is unavailable.  Handled
	first, and separately, so the module path below stays untouched.

	Without this, a class-body value expression reading a name bound earlier
	in the SAME class body fell through to the generic emits and came out as a
	bare Smalltalk identifier.  The class attribute lives on the class, not as
	a doit temp, so the doit failed to compile: ``CompileError 1001, undefined
	symbol items'' for ``exec(''class C: items = [1,2]; y = [x for x in
	items]'')''.  That is 10 of test_listcomps' remaining 42 failures, whose
	_check_in_scopes harness execs every snippet in a class body.

	Python evaluates a comprehension's OUTERMOST ITERABLE in the enclosing
	scope -- the class body -- which is why it may see a class attribute at
	all; the element expression and inner clauses run in the comprehension's
	own scope and correctly do NOT (test_free_inner_cell_outer asserts
	NameError for that half)."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBeingCompiled notNil
			and: [CallAst moduleClassBeingCompiled isNil
			and: [CallAst inClassBodyValueEmit
			and: [self ___inNestedScopeWithinClassBody___ not
			and: [CallAst classBodyBoundNames isNil
				or: [CallAst classBodyBoundNames includes: self ___mangledId___ asSymbol]]]]]])
		ifTrue: [
			"Sibling method -> receiver-less BoundMethod (call protocol pops
			positional[1] as the receiver); sibling @staticmethod -> BoundMethod
			on the class; nested class -> the per-class dynamic store.  None of
			these needs a module instance, so they mirror the module block
			exactly."
			(CallAst classFunctionNames notNil
				and: [CallAst classFunctionNames includes: self ___mangledId___ asSymbol]) ifTrue: [
				aStream
					nextPutAll: '(BoundMethod receiver: nil selector: #';
					nextPutAll: self ___mangledId___;
					nextPutAll: ' definingClass: ';
					nextPutAll: CallAst classBeingCompiled asString;
					nextPutAll: ')'.
				^self].
			(CallAst classStaticFunctionNames notNil
				and: [CallAst classStaticFunctionNames includes: self ___mangledId___ asSymbol]) ifTrue: [
				aStream
					nextPutAll: '(BoundMethod receiver: ';
					nextPutAll: CallAst classBeingCompiled asString;
					nextPutAll: ' selector: #';
					nextPutAll: self ___mangledId___;
					nextPutAll: ')'.
				^self].
			(CallAst classNestedClassNames notNil
				and: [CallAst classNestedClassNames includes: self ___mangledId___ asSymbol]) ifTrue: [
				aStream
					nextPutAll: '(';
					nextPutAll: CallAst classBeingCompiled asString;
					nextPutAll: ' @env1:___dynamicClassAttr___: #''';
					nextPutAll: self ___mangledId___;
					nextPutAll: ''')'.
				^self].
			"Conditionally-bound sibling: the per-class dynamic store, then the
			accessor pair if the name is ALSO bound unconditionally, then the
			enclosing scope."
			(CallAst classBodyConditionalNames notNil
				and: [CallAst classBodyConditionalNames includes: self ___mangledId___ asSymbol]) ifTrue: [
				| alsoStatic |
				alsoStatic := CallAst classAttrNames notNil
					and: [CallAst classAttrNames includes: self ___mangledId___ asSymbol].
				aStream
					nextPutAll: '((';
					nextPutAll: CallAst classBeingCompiled asString;
					nextPutAll: ' @env1:___dynamicClassAttr___: #''';
					nextPutAll: self ___mangledId___;
					nextPutAll: ''') @env0:ifNil: ['.
				alsoStatic ifTrue: [
					aStream
						nextPutAll: '(';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' ';
						nextPutAll: self ___mangledId___;
						nextPutAll: ') @env0:ifNil: ['].
				self emitDoitEnclosingScopeLoad: id on: aStream.
				alsoStatic ifTrue: [aStream nextPutAll: ']'].
				aStream nextPutAll: '])'.
				^self].
			"Prior class attribute: the accessor pair is compiled just before
			each ``<Class> <attr>: value'' store, so a later value expression
			reads the earlier attr with a plain getter send.  nil means ``not
			bound yet'' (Grail's nil-as-absent rule) -> enclosing scope."
			(CallAst classAttrNames notNil
				and: [CallAst classAttrNames includes: self ___mangledId___ asSymbol]) ifTrue: [
				aStream
					nextPutAll: '((';
					nextPutAll: CallAst classBeingCompiled asString;
					nextPutAll: ' ';
					nextPutAll: self ___mangledId___;
					nextPutAll: ') @env0:ifNil: ['.
				self emitDoitEnclosingScopeLoad: id on: aStream.
				aStream nextPutAll: '])'.
				^self].
		].
	((ctx isKindOf: LoadAst)
		and: [CallAst classBeingCompiled notNil
			and: [CallAst moduleClassBeingCompiled notNil]])
		ifTrue: [
			"Class-body reference to a sibling method (``def f();
			pair = (f,)'' or ``data = property(get_data, set_data)'').
			Emit a receiver-less BoundMethod — its call protocol pops
			positional[1] as the receiver at invocation time, matching
			CPython's unbound-function-from-class-dict semantics.

			Guard: only fires while ClassDefAst is emitting the class-
			attribute value expressions (CallAst inClassBodyValueEmit
			is true).  Method bodies share the same classBeingCompiled
			context but their bare-name references must follow Python's
			LEGB rule (skipping the class scope) — falling through to
			the existing module-scope / declared-local branches below."
			(CallAst inClassBodyValueEmit
				and: [self ___inNestedScopeWithinClassBody___ not
				and: [CallAst classFunctionNames notNil
				and: [(CallAst classFunctionNames includes: self ___mangledId___ asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: self ___mangledId___ asSymbol]]]]])
				ifTrue: [
					"Record the defining class so a staticmethod-style call
					(a gnv: _generate_next_value_(name, ...), where name is a
					plain value, not a receiver) can still reach the method when
					the popped receiver's class does not implement it.  The pop
					protocol is otherwise unchanged (BoundMethod>>value:value:)."
					aStream
						nextPutAll: '(BoundMethod receiver: nil selector: #';
						nextPutAll: self ___mangledId___;
						nextPutAll: ' definingClass: ';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ')'.
					^self
				].
			"Class-body reference to a sibling @staticmethod (test_enum's
			``@staticmethod def _generate_next_value_(...)'' then
			``enum_type = Enum(..., {'_generate_next_value_':
			_generate_next_value_})'').  Static defs compile CLASS-side,
			so the reference is a BoundMethod on the class temp itself --
			calling it dispatches the metaclass method with the caller's
			full argument list (no receiver popping)."
			(CallAst inClassBodyValueEmit
				and: [self ___inNestedScopeWithinClassBody___ not
				and: [CallAst classStaticFunctionNames notNil
				and: [(CallAst classStaticFunctionNames includes: self ___mangledId___ asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: self ___mangledId___ asSymbol]]]]])
				ifTrue: [
					aStream
						nextPutAll: '(BoundMethod receiver: ';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' selector: #';
						nextPutAll: self ___mangledId___;
						nextPutAll: ')'.
					^self
				].
			"Class-body reference to a PRIOR class attribute (``ul = ...''
			then ``regex = '[a-z' + ul + ...'`` — django's URLValidator).
			The class under construction is in scope as ``___cls___''
			while attribute values emit; probe its dict first and fall
			back to the module global of the same name (Python reads the
			class-local if already bound, else the global)."
			"NESTED-class sibling reference (``class A: ...`` then
			``a = A()``): the nested class lives in the outer class's
			per-class DYNAMIC store -- read it there (the accessor
			send below would DNU)."
			(CallAst inClassBodyValueEmit
				and: [self ___inNestedScopeWithinClassBody___ not
				and: [CallAst classNestedClassNames notNil
				and: [(CallAst classNestedClassNames includes: self ___mangledId___ asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: self ___mangledId___ asSymbol]]]]])
				ifTrue: [
					aStream
						nextPutAll: '(';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' @env1:___dynamicClassAttr___: #''';
						nextPutAll: self ___mangledId___;
						nextPutAll: ''')'.
					^self
				].
			"CONDITIONAL sibling reference — a name bound inside a class-body
			``if'' branch (``if c_functools: module = c_functools'' then
			``@module.lru_cache()'' on the next def, test_functools' TestLRUC).
			Same per-class dynamic store as a nested class, but the binding is
			conditional, so a nil slot means the branch did not run.

			What to fall back TO depends on whether the name is bound
			unconditionally as well (``x = 1'' and then ``if flag: x = 2''):
			if it is, it has an accessor pair holding that value and the
			accessor is the next place to look; only then, or straight away
			when there is no such pair, does the read reach the module global.
			Both fallbacks are what Python's class-body lookup does -- consult
			the class namespace, then the enclosing scope."
			(CallAst inClassBodyValueEmit
				and: [self ___inNestedScopeWithinClassBody___ not
				and: [CallAst classBodyConditionalNames notNil
				and: [CallAst classBodyConditionalNames includes: self ___mangledId___ asSymbol]]])
				ifTrue: [
					| alsoStatic |
					alsoStatic := CallAst classAttrNames notNil
						and: [CallAst classAttrNames includes: self ___mangledId___ asSymbol].
					aStream
						nextPutAll: '((';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' @env1:___dynamicClassAttr___: #''';
						nextPutAll: self ___mangledId___;
						nextPutAll: ''') @env0:ifNil: ['.
					alsoStatic ifTrue: [
						aStream
							nextPutAll: '(';
							nextPutAll: CallAst classBeingCompiled asString;
							nextPutAll: ' ';
							nextPutAll: self ___mangledId___;
							nextPutAll: ') @env0:ifNil: ['].
					self emitModuleAttrLoad: id
						receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
						on: aStream.
					alsoStatic ifTrue: [aStream nextPutAll: ']'].
					aStream nextPutAll: '])'.
					^self
				].
			(CallAst inClassBodyValueEmit
				and: [self ___inNestedScopeWithinClassBody___ not
				and: [CallAst classAttrNames notNil
				and: [(CallAst classAttrNames includes: self ___mangledId___ asSymbol)
				and: [CallAst classBodyBoundNames isNil
					or: [CallAst classBodyBoundNames includes: self ___mangledId___ asSymbol]]]]])
				ifTrue: [
					"The attr accessor pair is compiled just before each
					``<Class> <attr>: value'' store, so a later value
					expression can read the earlier attr with a plain
					getter send.  nil (never a stored value — Grail's
					nil-as-absent rule) means ``not bound yet''; fall
					back to the module global of the same name, matching
					Python's class-body read semantics."
					aStream
						nextPutAll: '((';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: ' ';
						nextPutAll: self ___mangledId___;
						nextPutAll: ') @env0:ifNil: ['.
					self emitModuleAttrLoad: id
						receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
						on: aStream.
					aStream nextPutAll: '])'.
					^self
				].
			"LEGB guard: a name that is a true Python local (parameter or
			genuine body binding) of an enclosing function, or the target of
			an enclosing comprehension, SHADOWS a same-named module-level
			function.  Divert those reads past this shortcut so they fall
			through to the regular declared-local emit at the bottom (the
			path every non-colliding local/param already takes).  Uses the
			precise ``writes''-based checks — NOT ``variables'', whose
			over-approximation (comprehension targets, f-string hints)
			would wrongly divert genuine module-function reads (e.g.
			django's receiver/match/url collisions with comprehension
			targets elsewhere in the same method)."
			(CallAst moduleFunctionNames notNil
				and: [(CallAst moduleFunctionNames includes: id asSymbol)
				and: [(self ___localBindingShadows___: id) not]])
				ifTrue: [
					"Probe the dynamic slot FIRST: a module-level decorator
					(``@functools.singledispatch def g'') rebinds g to a
					wrapper stored there, and this shortcut previously
					handed back the ORIGINAL compiled def as a BoundMethod
					regardless (g.dispatch(...) inside a same-module method
					read the stale function)."
					aStream
						nextPutAll: '(((';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) @env0:dynamicInstVarAt: #''';
						nextPutAll: id;
						nextPutAll: ''') @env0:ifNil: [ | ___fn___ | ___fn___ := BoundMethod receiver: (';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) selector: #';
						nextPutAll: id;
						nextPutAll: '. (';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) @env0:dynamicInstVarAt: #''';
						nextPutAll: id;
						nextPutAll: ''' put: ___fn___. ___fn___])'.
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
				((self ___pythonLocalInEnclosingFunctions___: id)
					or: [self ___isEnclosingComprehensionTarget___: id]) ifFalse: [
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
	"CLASS-METHOD CLOSURE CELL: a load of an enclosing-function local
	from inside a class METHOD body.  The method string-compiles onto
	the class with no home context, so the enclosing temp is
	unreachable (``class CustomInt(int)`` referencing its own name in
	a method, test_functools' sibling fixtures).  The classdef
	emission stores each captured VALUE on the class's per-class
	dynamic attrs at DEFINITION time; read it back through the
	receiver's class chain.  Attr-VALUE expressions
	(inClassBodyValueEmit), BASE expressions (inBasesEmit) and
	DECORATOR expressions (inDecoratorEmit) all emit inline in the
	enclosing method where the temps ARE reachable -- excluded.  A class
	decorator is the same kind of expression as a base: ``@mark class C:
	...'' inside a method evaluates ``mark'' in that method, so hijacking
	it into a cell read raised NameError for a name the method could see
	perfectly well."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [CallAst inBasesEmit ~~ true
		and: [CallAst inDecoratorEmit ~~ true
		and: [self ___enclosingFunctionLocalBeyondClass___: id]]]]]) ifTrue: [
		CallAst addCapturedClassName: id.
		aStream
			nextPutAll: '(self @env1:___classCell___: #''___cell_';
			nextPutAll: id;
			nextPutAll: '___'')'.
		^self
	].
	"``ifNil:'' rather than a send of ___checkLocal:named:.  ifNil: is an
	OPTIMISED selector: the compiler inlines it and allocates no
	BlockClosure, in env-1 exactly as in env-0 (GemStone refuses to
	compile a method FOR #ifNil: at all, so no env-1 override can
	intercept it).  The bound case -- the overwhelming majority of these
	~12k guards -- therefore costs an inline nil test instead of a real
	message send, ~5x cheaper per read measured on 3.7.5.  Value
	semantics are unchanged: ifNil: yields the receiver when non-nil,
	which is what ___checkLocal:named: returned.

	The guard is OMITTED ENTIRELY when the name resolves to a parameter
	that no ``del'' can unbind -- see ___guardedLocalNeedsCheck___:.  Not
	emitting a check beats making one cheaper, and parameters are a large
	share of all guarded reads."
	"A name an enclosing scope declared ``global'', read inside a DOIT
	(exec/eval).  The bare identifier cannot be used here: the doit's scope
	dictionary and an enclosing def's local are both spelled ``x'', and
	Smalltalk resolves the identifier LEXICALLY, so the block temp wins and
	the global declaration does nothing:

	    exec('''x = 7
	    def f():
	        x = 1
	        def g():
	            global x
	            def h(): return x     # 7 in CPython, was f''s 1 here
	            return h()
	        return g()''')

	Naming the slot through the scope handle ensureModuleScope: parks in the
	dictionary is what no temp can shadow.  Outside a doit the module-level
	path already routes these correctly -- a module global is an attribute of
	the module instance, not an identifier -- so this is doit-only.

	A COMPREHENSION TARGET is excluded, and is the one shape that makes this
	branch's position matter.  A comprehension has its own scope, so its loop
	variable shadows the declaration for the length of the comprehension --
	``global g'' then ``[g for g in [1]]'' iterates over the comprehension's
	own g and leaves the global alone (test_listcomps test_explicit_global,
	test_explicit_global_3).  Without the exclusion this branch outranked the
	comprehension-target branch below and read the global instead."
	((ctx isKindOf: LoadAst)
		and: [ModuleAst compilingDoitScope notNil
		and: [(self ___isEnclosingComprehensionTarget___: id) not
		and: [self ___globalDeclarationWinsFor___: id]]]) ifTrue: [
			aStream
				nextPutAll: '(___pyGlobals___ @env0:at: #''';
				nextPutAll: (NameAst doitScopeNameFor: id asSymbol) asString;
				nextPutAll: ''' otherwise: nil)';
				nextPutAll: ' ifNil: [NameError @env0:___signalUndefined___: ''';
				nextPutAll: id;
				nextPutAll: ''']'.
			^ self
		].
	((ctx isKindOf: LoadAst) and: [self ___pythonLocalInEnclosingFunctions___: id]) ifTrue: [
		(self ___guardedLocalNeedsCheck___: id) ifFalse: [
			aStream nextPutAll: id.
			^ self
		].
		aStream
			nextPut: $(;
			nextPutAll: id;
			nextPutAll: ' ifNil: [UnboundLocalError ___signalUnbound___: #';
			nextPutAll: id;
			nextPutAll: '])'.
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
		and: [(CallAst classBeingCompiled isNil
				or: [CallAst inClassBodyValueEmit])
		and: [(self class isResolvableSymbol: id asSymbol) not]]]) ifTrue: [
		"Builtins (``type``, ``len``, ...) are methods on the
		builtins class — emit a BoundMethod so direct call sites
		dispatch through env-1 arity resolution rather than a
		failing ``at:`` lookup.  Suppressed when this NameAst is
		the base of an enclosing ClassDefAst (a class needs the
		actual class object, not a callable wrapper).

		Class-body value-emit (inClassBodyValueEmit) takes the same
		fallback: a bare name that isn't a sibling method, module
		function, or static Smalltalk global still wants the
		``self at: #name'' lookup, otherwise it CompileErrors as
		``undefined symbol''.  This covers references like
		``__doc__'' at class body level (the module attribute, since
		Grail doesn't bind class-body locals to a class namespace)."
		(self isFastPathBuiltinName) ifTrue: [
			"``type'' answers the CLASS here too -- see the sibling emit above."
			(id asSymbol == #'type') ifTrue: [
				aStream nextPutAll: 'type'.
				^ self
			].
			aStream
				nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
				nextPutAll: id;
				nextPutAll: ')'.
			^self
		].
		"Phase A: module attribute load goes through dynamicInstVarAt:.
		The receiver expression is ``self'' (module body / top-level
		def) or ``<ModuleClass> @env0:___instance___'' (class-body
		value-emit, where ``self'' is the class being built and lacks
		the module dynamic-instVar storage)."
		CallAst inClassBodyValueEmit
			ifTrue: [
				self emitModuleAttrLoad: id
					receiverExpr: CallAst moduleClassBeingCompiled name , ' @env0:___instance___'
					on: aStream.
			]
			ifFalse: [
				self emitModuleAttrLoad: id receiverExpr: 'self' on: aStream.
			].
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
		and: [((self ___pythonLocalInEnclosingFunctions___: id)
			or: [self ___isEnclosingComprehensionTarget___: id]) not]]]]) ifTrue: [
			self emitModuleAttrLoad: id receiverExpr: 'self' on: aStream.
			^ self
		].
	"DOIT (exec/eval) load of a name nothing can bind.  A bare identifier here
	is not merely wrong at run time -- the SMALLTALK COMPILER rejects it
	outright (CompileError 1001, 'undefined symbol'), so the whole exec dies
	before running, even when the name sits in a branch that never executes.
	CPython compiles such code happily and raises NameError only if the read is
	actually reached:

	    exec('out = a if False else None')    # fine in CPython; out is None

	Emit the NameError expression instead, which is valid Smalltalk that
	compiles, stays unevaluated in a dead branch, and raises the catchable
	Python error when it is reached.

	Deliberately the LAST resort, and narrow: every earlier branch has had its
	say, the name is declared in no enclosing scope, it is not a module
	variable or module function of the source being compiled, and it does not
	resolve as a permitted Smalltalk global.  Those conditions are exactly the
	ones under which the emitted bare identifier could not have compiled, so
	this can only convert a hard CompileError into the Python-correct error --
	it cannot change the meaning of anything that worked before.

	The doit test must be ModuleAst>>compilingDoit, a POSITIVE flag, and not
	``CallAst moduleClassBeingCompiled isNil''.  That proxy looks equivalent
	and is not: it also reads nil while compiling the methods of a class
	defined INSIDE a function, where a local class name is perfectly
	resolvable.  Using it turned ``class Base:'' in a function into
	``NameError: name 'Base' is not defined'' for every sibling reference --
	31 SUnit errors.

	Load context only: a store must keep the bare identifier so the surrounding
	``<name> := <value>'' stays well-formed."
	((ctx isKindOf: LoadAst)
		and: [ModuleAst compilingDoitScope notNil
		and: [(ModuleAst compilingDoitScope
				objectNamed: (NameAst doitScopeNameFor: id asSymbol)) isNil
		and: [(self ___isDeclaredForThisScope___: id asSymbol) not
		and: [(self isModuleVariableName: id) not
		and: [(CallAst moduleFunctionNames notNil
			and: [CallAst moduleFunctionNames includes: id asSymbol]) not
		and: [(NameAst isResolvableSymbol: id asSymbol) not]]]]]]) ifTrue: [
			self emitDoitEnclosingScopeLoad: id on: aStream.
			^ self
		].
	"A name that collides with a Smalltalk pseudo-variable cannot be carried
	by a doit's symbol-list scope under its own spelling -- see
	NameAst class >> doitScopeNameFor:.  Emit the mangled stand-in, which
	the scope seeding in builtins _exec: / _eval: binds to the real value.
	Load and store alike: ``self := x'' is no more legal than reading it."
	ModuleAst compilingDoitScope notNil ifTrue: [
		aStream nextPutAll: (NameAst doitScopeNameFor: id) asString.
		^ self
	].
	aStream nextPutAll: id.
%

category: 'Grail-codegen helpers'
method: NameAst
emitDoitEnclosingScopeLoad: aSymbol on: aStream
	"The ``fall back to the enclosing scope'' half of a class-body sibling read
	when the class body is compiled in a DOIT (exec/eval) rather than into a
	module class.  The module form -- ``<ModuleClass> @env0:___instance___
	@env1:___moduleAttrLoad___:'' -- has no receiver here: there is no module
	instance.

	What the enclosing scope IS, in a doit, is the SymbolDictionary
	ModuleAst>>evaluateSource:usingModuleScope:as: puts in the compiler's
	symbol list.  ensureModuleScope: pre-creates a slot for every module-body
	variable of the source being compiled, so a bare identifier for one of
	those names always resolves -- that is the same mechanism that lets
	``_C := ...'' compile at all.

	For any OTHER name a bare identifier would be a Smalltalk CompileError, so
	emit Python's NameError instead.  That is also the right answer: the name
	is bound neither on the class under construction nor in the enclosing
	scope of the compiled source."

	((self isModuleVariableName: aSymbol)
		or: [CallAst moduleFunctionNames notNil
			and: [CallAst moduleFunctionNames includes: aSymbol asSymbol]])
		ifTrue: [
			aStream nextPutAll: aSymbol.
			^ self].
	"Raised through ___signalUndefined___: so the exception carries CPython's
	``name''.  The MESSAGE is unchanged -- the helper builds the same
	``name 'x' is not defined'' text -- but the attribute is what traceback.py
	needs to offer ``Did you mean: ...?'' and the ``Did you forget to import'' hint,
	and what stdlib code reading ``e.name'' expects.  Emitting the raise inline
	left every bare-name miss compiled into a function body without it; only the
	MODULE-global path (module>>___moduleAttrLoad___:) had been converted.

	``___signalUndefined___:'' is an env-0 classmethod and generated code is env 1,
	hence the @env0: prefix.  Only the NAME is quoted now, so the doubled-quote
	gymnastics the old inline message needed are gone.

	``___resolveBuiltinOrSignal___:'' rather than ___signalUndefined___: so a
	name INJECTED into builtins at run time (``builtins.__dict__['_'] = ...'',
	which is how gettext.install() publishes ``_'') still resolves.  Compiling
	an unconditional raise made that idiom unusable: the name does not exist
	when the reader is compiled, and nothing later could be consulted.  On a
	miss the resolver raises the identical NameError, so this only converts a
	certain failure into a lookup.

	PARENTHESISED, which the emit was not.  This is an EXPRESSION, and when the
	unresolved name is CALLED -- ``spam(a=1)'' for an undefined spam -- the
	caller appends its own keyword parts to whatever this emitted.  Unbracketed,
	the two merged into a single selector: the generated source read
	``NameError @env0:___resolve...: 'spam' value: a value: b'', which is one
	keyword message ``___resolve...:value:value:'' that nothing implements, so
	the intended NameError surfaced as an uncatchable MessageNotUnderstood.
	Longstanding -- the previous ___signalUndefined___: emit had the same shape
	and merged the same way."

	aStream nextPutAll: '(NameError @env0:___resolveBuiltinOrSignal___: '; nextPut: $'.
	aStream nextPutAll: aSymbol; nextPut: $'.
	aStream nextPut: $)
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
classmethod: NameAst
isReservedSmalltalkIdentifier: aSymbol
	"True if aSymbol names a Smalltalk pseudo-variable.  Mirrors
	FunctionDefAst's instance-side check; lifted to class side so the
	body-rename test in printSmalltalkOn: can call it without an
	AST-context instance."

	^ #(#'self' #'super' #'thisContext' #'nil' #'true' #'false')
		includes: aSymbol asSymbol
%

category: 'other'
classmethod: NameAst
doitScopeNameFor: aSymbol
	"The identifier under which aSymbol is carried in a DOIT (exec/eval)
	scope: the name itself, unless it collides with a Smalltalk
	pseudo-variable, in which case a mangled stand-in.

	Names in an exec'd body resolve as SYMBOL-LIST globals -- the scope is
	a SymbolDictionary the compiler is handed, not a set of block temps
	(ModuleAst >> evaluateSource:usingModuleScope:as:).  That works for
	every ordinary name and silently fails for exactly six: emitting
	``self'' compiles to Smalltalk's pseudo-variable, which in a doit
	executed with ``_executeInContext: nil'' is nil.  So

	    class C:
	        def m(self):
	            exec('self.assertEqual(1, 1)')

	saw ``self'' as nil rather than the receiver -- and a bare ``self''
	could never be ASSIGNED in exec'd source either, since ``self := x''
	is not legal Smalltalk (test_scope testScopeOfGlobalStmt,
	testClassAndGlobal).

	Both halves must agree on this name -- codegen (NameAst
	printSmalltalkOn:, ModuleAst ensureModuleScope:) and the scope seeding
	/ reflect-back in builtins _exec: / _eval: -- so it lives here as the
	single definition rather than being spelled out at each site."

	^ (self isReservedSmalltalkIdentifier: aSymbol)
		ifTrue: [('___pyresv_' , aSymbol asString , '___') asSymbol]
		ifFalse: [aSymbol asSymbol]
%

category: 'other'
classmethod: NameAst
doitScopeNameToPythonName: aSymbol
	"Inverse of doitScopeNameFor: -- the Python name a doit-scope
	identifier stands for.  Used by the reflect-back loops in builtins
	_exec: / _eval:, which copy the scope's bindings out to the caller's
	globals mapping and must restore the original spelling."

	| s |
	s := aSymbol asString.
	((s beginsWith: '___pyresv_') and: [s endsWith: '___'])
		ifFalse: [^ aSymbol asString].
	^ s copyFrom: 11 to: s size - 3
%

category: 'other'
method: NameAst
___boundInNestedFunction___: aSymbol
	"True when the nearest enclosing binder of aSymbol is a NESTED
	plain function or lambda (not the class method itself).  Walk
	outward: the first plain FunctionDefAst/LambdaAst that declares
	aSymbol as a parameter or writes it in its body claims the name;
	hitting the method (Instance/Class/StaticFunctionDefAst) first
	means the name is the receiver parameter."

	| node ivars idx argsNode blockNode writesSet |
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: InstanceFunctionDefAst)
			or: [(node isKindOf: ClassFunctionDefAst)
			or: [node isKindOf: StaticFunctionDefAst]]) ifTrue: [^ false].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst]) ifTrue: [
			ivars := node class allInstVarNames.
			idx := ivars indexOf: #args.
			argsNode := idx > 0 ifTrue: [node instVarAt: idx] ifFalse: [nil].
			argsNode notNil ifTrue: [
				| argsIvars found |
				argsIvars := argsNode class allInstVarNames.
				found := false.
				#(#args #posonlyargs #kwonlyargs) do: [:fld |
					| fldIdx lst |
					fldIdx := argsIvars indexOf: fld.
					fldIdx > 0 ifTrue: [
						lst := argsNode instVarAt: fldIdx.
						lst ifNotNil: [
							(lst anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
								ifTrue: [found := true]]]].
				#(#vararg #kwarg) do: [:fld |
					| fldIdx v |
					fldIdx := argsIvars indexOf: fld.
					fldIdx > 0 ifTrue: [
						v := argsNode instVarAt: fldIdx.
						(v notNil and: [v name asSymbol == aSymbol asSymbol])
							ifTrue: [found := true]]].
				found ifTrue: [^ true]
			].
			(node isKindOf: FunctionDefAst) ifTrue: [
				idx := ivars indexOf: #body.
				blockNode := idx > 0 ifTrue: [node instVarAt: idx] ifFalse: [nil].
				(blockNode notNil and: [blockNode isKindOf: BlockAst]) ifTrue: [
					writesSet := blockNode writes.
					(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
						ifTrue: [^ true]
				]
			]
		].
		node := node parent.
	].
	^ false
%

category: 'other'
method: NameAst
___enclosingFuncDeclaresReservedParam___: aSymbol
	"True iff aSymbol is a Smalltalk pseudo-variable (``self'', etc.)
	AND some enclosing FunctionDef/Lambda binds it as a PARAMETER or
	assigns it as a BODY LOCAL.  Drives the body rename: references to
	the original Python name emit the transport identifier ``_<name>''
	rather than Smalltalk's pseudo-variable, matching the temp the
	source generators declare (module defs, closures, @staticmethod
	bodies, and in-class methods that REBIND their self/cls parameter
	— ``self = None'' / ``self = tuple.__new__(cls, ...)'').

	The live receiver reference is NOT renamed: CallAst's
	isSelfReference: check fires before this method and emits
	Smalltalk ``self'' — except when the enclosing method rebinds it
	(CallAst selfParameterRebound), in which case isSelfReference:
	answers false and the walk below finds the parameter, landing on
	the ``_self'' temp the method generator initialised from the
	receiver."

	| node ivars idx argsNode argsIvars bodyIdx blockNode writesSet |
	(NameAst isReservedSmalltalkIdentifier: aSymbol) ifFalse: [^ false].
	CallAst moduleClassBeingCompiled ifNil: [^ false].
	node := parent.
	[node notNil] whileTrue: [
		"An enclosing INSTANCE METHOD whose self-param is aSymbol and is
		NOT rebound binds it to the Smalltalk RECEIVER -- no transport
		temp exists, and blocks capture ``self'' at any nesting depth,
		so the caller must emit plain ``self''.  (A @staticmethod inside
		a method-local class closing over the outer method's ``self'' --
		test_functools' lru_cache_weakrefable -- emitted an undeclared
		``_self'' before this check.)"
		"...UNLESS this is the class-body def currently being emitted in
		VALUE (block) form -- a conditional def, whose ``self'' is the
		transported temp rather than the receiver.  Anything nested inside
		it closes over that same temp, so the walk continues past this node
		and finds the parameter below."
		((node isKindOf: InstanceFunctionDefAst)
			and: [node ~~ CallAst classBodyValueDefNode
			and: [node allParameterNames notEmpty
			and: [node allParameterNames first asSymbol == aSymbol
			and: [(node assignedNamesInBody includes: aSymbol) not]]]])
			ifTrue: [^ false].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				ivars := node class allInstVarNames.
				idx := ivars indexOf: #args.
				argsNode := idx > 0 ifTrue: [node instVarAt: idx] ifFalse: [nil].
				argsNode ifNotNil: [
					argsIvars := argsNode class allInstVarNames.
					#(#args #posonlyargs #kwonlyargs) do: [:fld |
						| fldIdx list |
						fldIdx := argsIvars indexOf: fld.
						fldIdx > 0 ifTrue: [
							list := argsNode instVarAt: fldIdx.
							list ifNotNil: [
								(list anySatisfy:
									[:a | a name asSymbol == aSymbol asSymbol])
									ifTrue: [^ true]
							]
						]
					].
					#(#vararg #kwarg) do: [:fld |
						| fldIdx v |
						fldIdx := argsIvars indexOf: fld.
						fldIdx > 0 ifTrue: [
							v := argsNode instVarAt: fldIdx.
							(v notNil and: [v name asSymbol == aSymbol asSymbol])
								ifTrue: [^ true]
						]
					]
				].
				"Assigned-in-body check (FunctionDefAst only — lambdas
				can't assign).  body writes is the parser's record of
				assignment/for/with-as/walrus targets."
				(node isKindOf: FunctionDefAst) ifTrue: [
					bodyIdx := ivars indexOf: #body.
					blockNode := bodyIdx > 0 ifTrue: [node instVarAt: bodyIdx] ifFalse: [nil].
					(blockNode notNil and: [blockNode isKindOf: BlockAst]) ifTrue: [
						writesSet := blockNode writes.
						(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
							ifTrue: [^ true]
					]
				]
			].
		node := node parent.
	].
	^ false
%

category: 'other'
method: NameAst
___localBindingShadows___: aSymbol
	"True when a LOCAL Python binding visible from this node shadows
	module-level resolution of aSymbol: a true python-local (parameter
	or body binding) of an enclosing function, or the target of an
	enclosing comprehension.  This is the guard tier for module-level
	shortcuts (module-function BoundMethods, module self-sends) --
	module-scope bindings themselves do NOT count, since they are what
	those shortcuts resolve to."

	(self ___pythonLocalInEnclosingFunctions___: aSymbol) ifTrue: [^ true].
	^ self ___isEnclosingComprehensionTarget___: aSymbol
%

category: 'other'
method: NameAst
___pythonBindingShadows___: aSymbol
	"True when ANY Python binding visible from this node shadows
	builtin-level resolution of aSymbol: a local binding (see
	___localBindingShadows___:), a module-body binding -- variable OR
	top-level def (re.py's own ``def compile'' must shadow the
	``compile'' builtin for the whole module) -- or, during class-body
	value emit, a class attribute of the same name (Python reads the
	class-local).  This is the guard tier for builtin fast paths and
	class-instantiation shortcuts.

	PRECISE by construction: built from params + the writes set + the
	parser-recorded module name sets, never from the over-approximating
	``variables'' walk (comprehension targets, f-string hints)."

	(self ___localBindingShadows___: aSymbol) ifTrue: [^ true].
	(self isModuleVariableName: aSymbol) ifTrue: [^ true].
	(CallAst moduleFunctionNames notNil
		and: [CallAst moduleFunctionNames includes: aSymbol asSymbol]) ifTrue: [^ true].
	(CallAst inClassBodyValueEmit
		and: [CallAst classAttrNames notNil
		and: [CallAst classAttrNames includes: aSymbol asSymbol]]) ifTrue: [^ true].
	"Top-level (root) body binding.  Covers the EVAL path, where the
	module compile context (moduleVariableNames / moduleFunctionNames)
	is not set: ``abs = 42; abs'' evaluated via ModuleAst
	evaluateSource: binds abs in the root block's writes."
	^ self ___boundAtTopLevel___: aSymbol
%

category: 'other'
method: NameAst
___boundAtTopLevel___: aSymbol
	"True iff the OUTERMOST BlockAst on the parent chain (the module /
	eval body) genuinely binds aSymbol -- its precise ``writes'' set
	(assignments, def / class names, imports; comprehension targets and
	global-declared names excluded by the parser)."

	| node rootBlock writesSet |
	node := parent.
	rootBlock := nil.
	[node notNil] whileTrue: [
		(node isKindOf: BlockAst) ifTrue: [rootBlock := node].
		node := node parent.
	].
	rootBlock isNil ifTrue: [^ false].
	writesSet := rootBlock writes.
	^ writesSet notNil and: [writesSet includes: aSymbol asSymbol]
%



category: 'other'
method: NameAst
___targetPattern___: targetNode bindsName: aSymbol
	"True iff the given assignment-target pattern (a NameAst, or a
	Tuple/List/Starred nesting of them) binds aSymbol."

	| cls ivars idx elts inner |
	(targetNode isKindOf: NameAst) ifTrue: [
		^ targetNode id asSymbol == aSymbol asSymbol].
	cls := targetNode class name.
	((cls == #TupleAst) or: [cls == #ListAst]) ifTrue: [
		ivars := targetNode class allInstVarNames.
		idx := ivars indexOf: #elts.
		elts := idx > 0 ifTrue: [targetNode instVarAt: idx] ifFalse: [nil].
		elts ifNotNil: [
			elts do: [:e |
				(self ___targetPattern___: e bindsName: aSymbol) ifTrue: [^ true]]].
		^ false].
	cls == #StarredAst ifTrue: [
		ivars := targetNode class allInstVarNames.
		idx := ivars indexOf: #value.
		inner := idx > 0 ifTrue: [targetNode instVarAt: idx] ifFalse: [nil].
		inner ifNotNil: [^ self ___targetPattern___: inner bindsName: aSymbol].
		^ false].
	^ false
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
___isDeclaredForThisScope___: aSymbol
	"isVariableIsDeclared:, with the class body's own names invisible when this
	read sits in a nested scope inside it.

	isVariableIsDeclared: switches to the class-body-blind ``FromMethod'' walk
	when it climbs out of a FunctionDefAst or a LambdaAst, but not out of a
	COMPREHENSION -- which is equally a scope of its own in Python 3, and
	equally does not see the enclosing class namespace.  So a class-level
	``y'' counted as a declaration for a read inside a class-body
	comprehension, and the doit fallback above concluded that a bare ``y''
	would compile.  In a doit it does not: the name is in no symbol-list slot,
	so the SMALLTALK compiler rejects the whole exec with ``undefined symbol
	y'' before running a line of it.

	    exec('class _C:\\n    y = 1\\n    [x + y for x in range(2)]')

	is a plain NameError in CPython (the comprehension skips class scope and
	finds no global ``y''), which is what the fallback now emits.

	Only this guard consults it.  ___inNestedScopeWithinClassBody___ already
	encodes the same rule -- including its one exception, the outermost
	comprehension's outermost iterable, which CPython DOES evaluate in the
	enclosing scope -- for the class-sibling read branches above."

	self ___inNestedScopeWithinClassBody___
		ifTrue: [^ self isVariableIsDeclaredFromMethod: aSymbol].
	^ self isVariableIsDeclared: aSymbol
%

category: 'other'
method: NameAst
___inNestedScopeWithinClassBody___
	"True when this NameAst sits inside a nested SCOPE -- a comprehension or a
	lambda -- that lies between it and the enclosing class body.

	Python's rule: a comprehension (like a lambda) is its own function scope,
	and a CLASS scope is NOT part of the enclosing-scope chain of a nested
	function.  So a free name read inside one skips the class namespace and
	resolves in the module/global scope:

	    y = 1
	    class C:
	        y = 2
	        vals = [(x, y) for x in range(2)]

	is [(0, 1), (1, 1)] in CPython -- the module's y, NOT the class's.  Grail
	read the class attribute and answered [(0, 2), (1, 2)] (test_listcomps
	test_in_class_scope_inside_function_1/_2).  It applies to every class-level
	name, methods included: ``class C: def f(self): pass;
	lst = [f for _ in range(1)]'' is a NameError in CPython.

	The ONE exception is the OUTERMOST ITERABLE of the outermost comprehension
	(``range(2)'' above, ``items'' in ``[x for x in items]''): CPython
	evaluates it in the ENCLOSING scope, which is precisely why it CAN see a
	class attribute.  A name reached through the first clause's ``iter'' is
	therefore not behind a scope boundary and the walk continues outward -- so
	an INNER comprehension's iterable is still inside the outer
	comprehension's scope and correctly answers true.

	Consulted ONLY by the class-SIBLING branches of printSmalltalkOn:, never by
	the whole class-body block: that block also holds the module-global,
	module-function and fast-path-builtin branches, and suppressing THOSE for a
	comprehension left every module global and builtin inside a class-body
	comprehension emitting a bare identifier -- which broke Django's import
	outright (4 DjangoTestCase failures) even though no Django class body
	matches the pattern this rule is about."

	| node child gens inClauseIter |
	child := self.
	node := parent.
	inClauseIter := false.
	[node notNil] whileTrue: [
		(node isKindOf: LambdaAst) ifTrue: [^ true].
		((node isKindOf: ClassDefAst) or: [node isKindOf: FunctionDefAst])
			ifTrue: [^ false].
		"``iter'' hangs off the ComprehensionAst CLAUSE, one level below the
		comprehension node itself, so the ``did we come up through the
		iterable?'' test has to be made here and carried one step."
		(node isKindOf: ComprehensionAst) ifTrue: [
			inClauseIter := (self ___generatorIterOf___: node) == child].
		((node isKindOf: ListCompAst)
			or: [(node isKindOf: DictCompAst)
			or: [(node isKindOf: SetCompAst)
			or: [node isKindOf: GeneratorExpAst]]]) ifTrue: [
			gens := self ___compGeneratorsOf___: node.
			"Only the FIRST clause's iterable is evaluated in the enclosing
			scope; a second ``for'' clause's iterable already runs inside the
			comprehension."
			(inClauseIter
				and: [gens notNil
				and: [gens notEmpty and: [gens first == child]]])
				ifFalse: [^ true].
			inClauseIter := false].
		child := node.
		node := node parent].
	^ false
%

category: 'other'
method: NameAst
___compGeneratorsOf___: compNode
	"The `generators' sequence of a comprehension node, by instVar index --
	AST nodes have no public getters."

	| idx |
	idx := compNode class allInstVarNames indexOf: #generators.
	idx = 0 ifTrue: [^ nil].
	^ compNode instVarAt: idx
%

category: 'other'
method: NameAst
___generatorIterOf___: aComprehensionAst
	"The `iter' expression of one ComprehensionAst clause (the ``in xs'' part),
	by instVar index."

	| idx |
	idx := aComprehensionAst class allInstVarNames indexOf: #iter.
	idx = 0 ifTrue: [^ nil].
	^ aComprehensionAst instVarAt: idx
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
		"Recursive pattern match: covers plain names, nested tuple /
		list patterns, and starred targets (``for a, (b, *c) in ...'')."
		(self ___targetPattern___: gen target bindsName: aSymbol)
			ifTrue: [^ true]
	].
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
	"Shadow check, PRECISE (see ___pythonBindingShadows___:).  Previously
	isVariableIsDeclared:, whose over-approximating `variables' walk made
	a mere comprehension target suppress the builtin for the whole
	function -- `vals = [len for len in xs]; len(s)' then raised
	UnboundLocalError on the second len."
	(self ___pythonBindingShadows___: id) ifTrue: [^false].
	"A comprehension loop variable shadows the builtin for both the
	store that binds it and every read in the comprehension body —
	``(cwd / to_path(dir) for dir in dirs)'' in django.template.
	autoreload names its target ``dir''.  Without this, the store
	emits ``(BoundMethod ...) := ...'', which doesn't parse."
	(self ___isEnclosingComprehensionTarget___: id) ifTrue: [^false].
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

category: 'Grail-annotations'
method: NameAst
___annotationSourceString___
	^ id asString
%
