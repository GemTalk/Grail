! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for CallAst
expectvalue /Class
doit
ExpressionAst subclass: 'CallAst'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
CallAst comment:
'https://docs.python.org/3/library/ast.html#ast.Call

A function call.

func is the function, which will often be a Name or Attribute object.
args holds a list of the arguments passed by position.
keywords holds a list of keyword objects representing arguments passed by keyword.

Example:
>>> print(ast.dump(ast.parse(''func(a, b=c, *d, **e)'', mode=''eval''), indent=4))
Expression(
    body=Call(
        func=Name(id=''func'', ctx=Load()),
        args=[Name(id=''a'', ctx=Load()), Starred(...)],
        keywords=[keyword(arg=''b'', value=Name(id=''c'', ctx=Load())), ...]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CallAst(func args keywords)
'
%

expectvalue /Class
doit
CallAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from CallAst
removeallmethods CallAst
removeallclassmethods CallAst

set compile_env: 0

category: 'Grail-Accessing'
method: CallAst
arguments

	^arguments
%

category: 'Grail-Accessing'
method: CallAst
function

	^function
%

category: 'Grail-Accessing'
method: CallAst
keywords

	^keywords
%

category: 'Grail-traceback'
method: CallAst
printSmalltalkOn: aStream
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream
%

category: 'Grail-other'
method: CallAst
___emitSmalltalkOn___: aStream
	"Call dispatch — see docs/Rewrite_Dispatch_Model.md.

	Six forms, in priority order:

	  1. Bare-name fixed-arity fast path. If `builtins` has a method
	     whose selector and arity match the call (e.g. `abs:` for
	     `abs(x)`, `pow:_:` for `pow(x, y)`), emit a direct keyword send:
	         ((builtins instance) name: arg1 _: arg2 _: arg3)

	  2. Bare-name varargs fast path. If `builtins` has a varargs method
	     matching the name (e.g. `_print:kw:`), emit a direct varargs send:
	         ((builtins instance) _name: { arg1. arg2. } kw: kwargDict)

	  3. Bare-name known-builtin arity error. If neither bare-name fast
	     path matched but the name IS a known builtin (some env-1
	     selector matches the base name), emit a TypeError raise
	     directly. Catches calls like `abs(1, 2)` and produces a clean
	     Python TypeError instead of a GemStone `undefined symbol`
	     compile error from the legacy fallback.

	  4. Attribute-call fast path. For attribute calls like
	     `module.method(args)` where the receiver is a statically known
	     module, emit a direct keyword send to the receiver:
	         ((module) method: arg1 _: arg2)
	     The discriminator is per-receiver introspection: the module
	     class implements the keyword-form selector (`method:`,
	     `method:_:`, etc.). See `attributeCallFastPathSelector`.

	  5. Class-call fast path. If the bare name resolves (via the Python
	     dictionary) to a GemStone class with a matching env-1 `__new__`
	     selector for the call's arity, emit a direct send:
	         (cls @env1:__new__: arg1 _: arg2 _: ...)
	     Used for `bool(x)`, `int(x)`, `str(x)`, `object()`, etc. — names
	     that map (via install.gs Step 3) to GemStone classes such as
	     Boolean, Integer, Unicode7. A class-call arity mismatch on a
	     known class emits a TypeError raise (analogous to form 3).

	  6. Legacy fallback. Otherwise emit the historical block-call form:
	         <func> value: { <args> } value: <kw>
	     Used for unconverted attribute calls (`math.cos(0)`,
	     `html.escape(s)` before conversion) and for first-class function
	     calls through a local (`f = foo; f(x)`).

	Bare-name forms (1, 2, 3) also require:
	  * `function` is a `NameAst` (bare name, not `obj.method`).
	  * The name is not shadowed by any enclosing-scope local.

	The attribute-call form (4) requires:
	  * `function` is an `AttributeAst` whose `value` is a `NameAst`.
	  * The receiver name resolves to a `module` subclass in the Python
	    dictionary at compile time.
	  * The receiver class implements the candidate keyword-form selector
	    for the attribute name and arity.
	  * No keyword arguments at the call site (kwargs calls use the
	    varargs form instead)."

	| fastSelector knownBuiltinName |
	"0. `globals()` — return the enclosing module's namespace as a LIVE
	dict view (PyModuleDict).  The raw module instance is incoherent as a
	Python dict — user globals live in dynamic instVars while the
	inherited SymbolDictionary slot is empty, so `g['x']` missed real
	globals and `g.keys()` executed the inherited kernel method
	(docs/LEGB.md).  The view reads through the same
	___globalAt___:otherwise: chain bare-name loads use and writes create
	real globals.  ___moduleStoreReceiverExpr___ picks the receiver:
	`self` in the module body / top-level defs, the module singleton
	inside a user class method (where `self` is the Python instance).
	Still only matches the bare-name 0-arg call shape at compile time —
	`globals` aliased through a local is not rewritten."
	((function isKindOf: NameAst)
		and: [function id = #'globals'
			and: [arguments isEmpty and: [keywords isEmpty]]])
				ifTrue: [
					aStream
						nextPutAll: '(PyModuleDict @env0:on: ';
						nextPutAll: self ___globalsOnlyViewReceiverExpr___;
						nextPutAll: ')'.
					^self].

	"0b. `locals()` / zero-arg `vars()` — compile-time rewrite.  Inside
	a function body (CallAst functionBeingCompiled is set by
	FunctionDefAst >> printBodyOn:), emit a pair-array of every name in
	the function scope; builtins ___buildLocals___: filters the
	still-unbound ones (Smalltalk nil ≡ unbound — Python None is the
	None singleton) and answers a dict.  At module body scope locals()
	IS globals(), so emit the PyModuleDict live view like the globals()
	case above.
	vars() with no argument is locals() by definition (the 1-arg form
	dispatches to builtins vars: normally).  Same caveat as globals():
	only the bare-name 0-arg call shape is rewritten."
	((function isKindOf: NameAst)
		and: [(function id = #'locals' or: [function id = #'vars'])
			and: [arguments isEmpty and: [keywords isEmpty]]])
				ifTrue: [^ self printLocalsCallOn: aStream].

	"0b'. Zero-arg ``dir()'' -- the names in the CURRENT scope, sorted.  Python
	defines it as exactly that, so it rewrites through the same machinery
	locals() uses rather than inventing a second way to find the scope: the
	one-argument form ``dir(x)'' is an ordinary builtins call and is untouched.
	Without this a bare dir() had no receiver to inspect at all and raised
	TypeError (test_listcomps test_code_replace)."
	((function isKindOf: NameAst)
		and: [function id = #'dir'
			and: [arguments isEmpty and: [keywords isEmpty]]])
				ifTrue: [
					aStream nextPutAll: '((Python @env0:at: #builtins) instance) @env1:___dirOfNamespace___: ('.
					self printLocalsCallOn: aStream.
					aStream nextPutAll: ')'.
					^ self].

	"0c. Bare `eval(expr)` / `exec(src)` INSIDE A FUNCTION with NO explicit
	globals/locals — compile-time rewrite that injects the enclosing
	function's locals as the evaluation namespace, so an expression can see
	enclosing locals (CPython evaluates in the caller's namespace).  Grail's
	_eval/_exec otherwise run in an EMPTY scope, so ``eval('val.split()[0]')''
	referencing the local ``val'' raised ``undefined symbol'' (test_bytes
	BytearrayPEP3137Test.test_returns_new_copy).  Only the bare-name
	single-positional shape is rewritten, in function scope or inside a
	comprehension: at module scope OUTSIDE a comprehension locals() IS globals()
	and the empty-scope form already resolves module names, and an explicit
	globals/locals argument, kwargs, or an aliased
	`eval` is left to the normal dispatch (same V1 limitation as
	globals()/locals()/super()).  Module globals are NOT injected -- reading a
	module global (vs a local) from a bare in-function eval is an accepted
	gap; injecting the live module view here is unsafe when eval runs outside
	a real module instance (the eval()/exec() harness passes a nil receiver)."
	((function isKindOf: NameAst)
		and: [(function id = #'eval' or: [function id = #'exec'])
			and: [arguments size = 1
				and: [keywords isEmpty
					and: [CallAst functionBeingCompiled notNil
						or: ["INSIDE A COMPREHENSION AT MODULE SCOPE the rewrite is
						needed for the same reason: the comprehension's target is a
						block temp, so the empty-scope form cannot resolve it and
						``[eval('x') for x in l]'' raised NameError even though
						CPython evaluates it in the caller's namespace.  Guarded on
						there being a target to inject, so a module-scope bare eval
						OUTSIDE a comprehension keeps the empty-scope behaviour that
						already resolved module names."
						self ___enclosingComprehensionTargetNames___ notEmpty]]]]])
				ifTrue: [^ self printBareEvalExecOn: aStream].

	"CPYTHON'S PRECONDITIONS, ahead of the rewrite that assumes they hold.
	``super()'' with no arguments does not guess -- it inspects the running
	frame and reports which of four things was missing, in a fixed order that
	puts BOTH argument checks before the class cell is consulted at all (see
	Super's ``Grail-Errors'' category, where the four messages live).

	Grail answered ``no arguments'' for all of them, which names the wrong
	precondition for three: ``def h(x): super()'' HAS an argument and lacks a
	class, and ``def f(x): del x; super()'' has neither an argument left nor a
	class -- CPython reports the deletion, because that check runs first.

	Precondition 1 is settled HERE, at compile time, because it is a compile-time
	fact: a def declaring no positional parameter can never satisfy super(), so
	no run-time state is worth emitting a test for.  ___receiverParamName___ is
	the same accessor ClassDefAst's signature table uses, and it already answers
	nil for the ``def f(*args)'' shape that CPython also rejects (co_argcount
	counts positionals only).

	Still routed through the shadow probe: ``super'' can be replaced on the
	module after its body compiled (test_shadowed_dynamic), and a replacement
	takes the call whatever the source's parameters look like."
	((function isKindOf: NameAst)
		and: [function id = #'super'
			and: [arguments isEmpty
				and: [keywords isEmpty
					and: [self ___superNameIsShadowed___ not
						and: [CallAst moduleClassBeingCompiled notNil
							and: [CallAst functionBeingCompiled notNil
								and: [CallAst functionBeingCompiled
									___receiverParamName___ == nil]]]]]]])
		ifTrue: [
			self ___printShadowableSuperOn___: aStream arm: [
				aStream nextPutAll: 'Super @env1:___noArguments___'].
			^ self].

	"Preconditions 2 and 3, for a ``super()'' with NO enclosing class: the def
	has a positional parameter, so the answer turns on whether that parameter is
	still bound.

	The parameter test is exact rather than analogous.  CPython tests
	``localsplus[0] == NULL''; Grail's def copies each parameter into a temp
	(``x := _x'') and DeleteAst compiles ``del x'' to ``x := nil'', which is the
	very state NameAst's load guard tests to raise UnboundLocalError.  So
	``<param> == nil'' asks the same question.

	Only the no-class case gets the test.  In a METHOD the first parameter IS
	the Smalltalk receiver, which no ``del'' can nil, so the test would be dead
	code there; a def NESTED in a method does have a temp, but Grail binds such
	a super() to the outer receiver rather than to the inner def's parameter, so
	testing one and using the other would be worse than leaving it."
	((function isKindOf: NameAst)
		and: [function id = #'super'
			and: [arguments isEmpty
				and: [keywords isEmpty
					and: [self ___superNameIsShadowed___ not
						and: [CallAst moduleClassBeingCompiled notNil
							and: [CallAst functionBeingCompiled notNil
								and: [CallAst classBeingCompiled == nil]]]]]]])
		ifTrue: [
			self ___printShadowableSuperOn___: aStream arm: [
				aStream
					nextPutAll: '(';
					nextPutAll: self ___superArgZeroGuardName___;
					nextPutAll: ' == nil ifTrue: [Super @env1:___argZeroDeleted___] ';
					nextPutAll: 'ifFalse: [Super @env1:___noClassCell___])'].
			^ self].

	"Bare zero-arg ``super()`` inside a class method.  Rewrite to a
	Super proxy bound to (lexical class, first-arg-of-method).  The
	lexical class is reachable via the module instance's class-name
	instVar; the first arg is conventionally `self` or `cls`, both
	of which emit as Smalltalk `self` (see NameAst >> printSmalltalkOn:).
	Outside class-method context, fall through to the normal call
	dispatch (super will resolve to whatever the surrounding scope
	binds it to, typically NameError).

	Also stood down when the program BINDS the name ``super'' -- see
	___superNameIsShadowed___ -- because then this is not the builtin at all
	and the normal call dispatch is the whole of the right answer."
	((function isKindOf: NameAst)
		and: [function id = #'super'
			and: [arguments isEmpty
				and: [keywords isEmpty
					and: [self ___superNameIsShadowed___ not
						and: [CallAst classBeingCompiled notNil
							and: [CallAst moduleClassBeingCompiled notNil]]]]]])
		ifTrue: [
			"A METHOD-LOCAL class (defined in a function body) is not a
			module attribute, so the module-instance-by-name lookup below
			returns nil and Super walks nil's superClass.  Resolve the
			defining class through the closure cell that holds the class
			object instead: ___classCell___ chain-walks by the NAME-
			SPECIFIC key ``___cell_<ClassName>___'', which only the
			defining class carries, so it resolves correctly even when
			the method runs on a subclass instance.  Register the class's
			own name as captured so ClassDefAst emits the cell store."
			"A zero-arg ``super()'' needs ``__class__'', so CPython's compiler
			injects __classcell__ for it exactly as it does for the bare name.
			Flagged HERE and not in printDefiningClassOn:, which this path does
			not go through -- it emits the Super proxy itself.  The EXPLICIT
			``super(C, self)'' form below is deliberately not flagged: it names
			its class, so CPython creates no cell for it."
			CallAst classNeedsClassCell: true.
			"...and WHICH method, for __closure__.  Same reason this path sets
			the flag itself: it does not go through printDefiningClassOn:."
			CallAst ___recordClassCellMethod___.
			"The RUNTIME half of the shadow rule.  ___superNameIsShadowed___
			above reads the parser's record of the module BODY, so it cannot see
			a name set on the module AFTER that body was compiled --
			``mock.patch(f'{__name__}.super', MySuper)'', which is test_super's
			test_shadowed_dynamic.  Probe for it and call the replacement with
			the zero arguments the source wrote; fall back to the proxy, which
			is what every unpatched call in the corpus takes.

			Written as ``[:___sup___ | ...] @env0:value: <probe>'' so the probe
			is evaluated ONCE and the arms can both refer to it.  The arms use
			``== nil ifTrue:ifFalse:'' rather than ifNil:ifNotNil: because that
			is the form the generated env-1 code already relies on being
			compiler-inlined."
			self ___printShadowableSuperOn___: aStream arm: [
			| argZero |
			"``___classCellForSuper___'' rather than ``___classCell___'': CPython's
			zero-argument super() applies the ``supercheck'' and raises TypeError
			at CONSTRUCTION when the receiver is not an instance of the defining
			class.  That is the whole of test_super's test_cell_as_self, whose
			method body never touches the proxy, so nothing later could raise
			instead -- while a bare ``__class__'' read of the same cell applies no
			such rule and must keep answering the class.  Two behaviours, so the
			two reads go to different entry points and the check rides with the
			one that wants it, rather than being bolted onto the Super
			constructor here where it would fire for both.

			Deliberately NOT ``Super checkedCls:'', which would check EVERY
			zero-arg call.  Cost was never the objection (measured at ~1.4% of a
			~10.9 us call); correctness was.  Grail can hold two distinct class
			objects for one Python class across a metaclass dispatch, and an
			unconditional check rejected super() inside a metaclass __new__
			against its own class -- six InheritedMetaclassDispatchTestCase
			errors, none of which the CPython corpus reaches."
			"Precondition 2 again, for a def NESTED in a method.  CPython reads
			the INNERMOST frame, so ``def g(x): del x; super()'' written inside a
			method reports the deletion even though the method around it has a
			perfectly good receiver.  That is the shape test_super needs, since
			its whole test body is one method -- and it is why this test cannot
			live only on the no-class path, where the fixture first found it.

			___superArgZeroGuardName___ answers nil for a method's OWN parameter,
			which is the Smalltalk receiver and cannot be nil, so the test is
			emitted only where a ``del'' could actually have cleared something."
			argZero := self ___superArgZeroGuardName___.
			argZero == nil ifFalse: [
				aStream
					nextPutAll: '(';
					nextPutAll: argZero;
					nextPutAll: ' == nil ifTrue: [Super @env1:___argZeroDeleted___] ifFalse: ['].
			aStream nextPutAll: '(Super @env1:cls: '.
			CallAst ___printClassCellReadOn___: aStream
				selector: '___grailClassCellValueForSuper___'
				around: [
				(CallAst classDefIsModuleScope == false)
					ifTrue: [
						CallAst addCapturedClassName: CallAst classBeingCompiled.
						aStream
							nextPutAll: '(self @env1:___classCellForSuper___: #''___cell_';
							nextPutAll: CallAst classBeingCompiled asString;
							nextPutAll: '___'')']
					ifFalse: [
						aStream
							nextPutAll: '((';
							nextPutAll: CallAst moduleClassBeingCompiled name;
							nextPutAll: ' @env0:___instance___) @env1:';
							nextPutAll: (CallAst ___moduleClassReadSelector___: CallAst classBeingCompiled asString);
							nextPutAll: ')']].
			aStream nextPutAll: ' obj: self)'.
			argZero == nil ifFalse: [aStream nextPutAll: '])']].
			^self].

	"Explicit ``super(Cls, obj)`` inside a class method.  Mirror the
	zero-arg rewrite but take the class + bound object from the call's
	own arguments.  The class name resolves through the module
	instance's class accessor (the same path the zero-arg form uses) —
	a bare class-name reference isn't reliably bound inside the class's
	own compilation scope.  Only the common ``NameAst-class,
	positional-2'' form is rewritten; anything else falls through (and
	``super'' raises NameError as it did before)."
	"Referencing the NAME ``super'' inside a method is enough for CPython's
	symbol table to create the implicit ``__class__'' cell -- it does not wait
	to see the zero-argument form.  So the EXPLICIT ``super(C, self)'' gets a
	__classcell__ too, which was measured rather than assumed: the fixture
	predicted no cell here and CPython disagreed."
	((function isKindOf: NameAst)
		and: [function id = #'super'
			and: [CallAst classBeingCompiled notNil
				and: [CallAst classNeedsClassCell: true. true]]]) ifTrue: [].
	((function isKindOf: NameAst)
		and: [function id = #'super'
			and: [arguments size = 2
				and: [keywords isEmpty
					and: [self ___superNameIsShadowed___ not
						and: [((arguments at: 1) isKindOf: NameAst)
							and: [CallAst classBeingCompiled notNil
								and: [CallAst moduleClassBeingCompiled notNil]]]]]]])
		ifTrue: [
			"A METHOD-LOCAL class is not a module attribute, so the
			module-instance accessor below answers NIL for it -- and every
			Super consumer walks ``cls superClass'', which nil does not
			understand.  The zero-arg form already resolves this through the
			class's closure cell; the two-arg form did not, so
			``super(Sub, self)'' inside a function-local Sub raised an
			uncatchable env-0 MessageNotUnderstood that took down the whole
			module run (test_functools' test_cache_invalidation, plus
			test_enum and django's related_descriptors).
			Only when the named class IS the one being compiled: that is the
			shape the cell key ``___cell_<ClassName>___'' is stored under,
			and it covers every corpus occurrence (each names its own class).
			Naming a DIFFERENT method-local class keeps the old path."
			((CallAst classDefIsModuleScope == false)
				and: [(arguments at: 1) id asSymbol == CallAst classBeingCompiled asSymbol])
				ifTrue: [
					CallAst addCapturedClassName: CallAst classBeingCompiled.
					aStream
						nextPutAll: '(Super @env1:checkedCls: (self @env1:___classCell___: #''___cell_';
						nextPutAll: CallAst classBeingCompiled asString;
						nextPutAll: '___'') obj: '.
					(arguments at: 2) printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: ')'.
					^self].
			"The module-instance accessor is only right when the first argument
			NAMES A MODULE-LEVEL CLASS.  It was applied to every NameAst, so
			any other kind of name silently became a module-attribute miss --
			nil -- and Super reported ``argument 1 must be a type, not
			NoneType''.  That is a diagnosis of the wrong thing entirely, and
			it hid two ordinary shapes:

			    def method(self, type_, obj):   super(type_, obj).method()
			    sp = super(float, 1.0)

			-- a PARAMETER holding a class (test_supercheck_fail, where the
			bogus message displaced the real one the test matches on) and a
			BUILTIN type (test_super_init_leaks).  Neither is a module
			attribute.

			Emit the argument's own codegen instead, which resolves a local, a
			parameter, a builtin or a module global correctly by construction.
			The accessor is kept only for a name the module really does bind,
			which is the case the comment above is about: inside a class's own
			compiled method a bare reference to that class is not reliably in
			scope."
			((arguments at: 1) isModuleVariableName: (arguments at: 1) id asSymbol)
				ifTrue: [
					aStream
						nextPutAll: '(Super @env1:checkedCls: ((';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) @env1:';
						nextPutAll: (CallAst ___moduleClassReadSelector___: (arguments at: 1) id asString);
						nextPutAll: ') obj: ']
				ifFalse: [
					aStream nextPutAll: '(Super @env1:checkedCls: '.
					(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: ' obj: '].
			(arguments at: 2) printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ')'.
			^self].

	fastSelector := self bareCallFastPathSelector.
	fastSelector ifNotNil: [
		^ self printBareCallFastPathOn: aStream selector: fastSelector
	].

	(self bareCallVarargsSelector) ifNotNil: [:varargsSel |
		^ self printBareCallVarargsOn: aStream selector: varargsSel
	].

	"Class-call fast path runs BEFORE the knownBuiltinName arity-
	mismatch check below.  Without this, ``str(b, encoding)'' — which
	matches a 2-arg ``__new__:_:'' on Unicode7's metaclass — would
	get caught by the ``builtins has str:'' arity check and emit a
	bogus TypeError instead of dispatching to the class constructor.
	Names that ARE valid class calls take precedence over their
	builtin-shorthand counterpart."
	(self bareCallClassNewSelector) ifNotNil: [:newSel |
		^ self printBareCallClassNewOn: aStream selector: newSel
	].

	"Both fast paths missed. If the name is a known builtin (some method
	on builtins matches the base name), the call has wrong arity or kwarg
	shape — emit a clean TypeError instead of falling through to the
	legacy form. Without this branch, calls like `abs(1, 2)` would
	produce a confusing `undefined symbol` compile error from the
	bare-name fallback (since `builtins` is no longer in the symbol list).

	BUT: if the name ALSO resolves to a class with a varargs ``_new:kw:''
	(or ``___new__:kw:'') entry, defer to the legacy ``value:value:''
	form so kwargs-bearing class calls reach the constructor.  Without
	this, ``property(fget, fset, doc=...)'' would trip the builtin arity
	error even though PropertyDescriptor has a varargs constructor."
	"NOT UNDER A ``__builtins__'' OVERRIDE.  This branch exists because the
	fast paths above failed to find a matching selector, and it concludes the
	CALL is malformed.  When the two gates above declined on purpose -- the
	doit's builtins were replaced, so no builtin may be bound at compile time
	-- that conclusion is wrong, and it turned ``exec(\'print(1)\', {'__builtins__': {}})''
	into a TypeError about print's arity where CPython raises NameError for
	print itself."
	knownBuiltinName := self ___builtinsAreOverridden___
		ifTrue: [nil]
		ifFalse: [self knownBuiltinName].
	knownBuiltinName ifNotNil: [
		"If the name ALSO resolves to a class with a varargs
		``_new:kw:'' / ``___new__:kw:'' constructor, skip the arity
		error and fall through to the legacy ``value:value:'' form so
		the class's varargs entry receives the call.  knownClassName
		returns nil in this case (it defers to the legacy form
		exactly when kwargs are present and a varargs entry exists);
		check the class lookup directly.

		A ``*args'' splat likewise defers to the generic form: the arity is
		unknown at compile time, so the fixed-arity mismatch check would raise a
		bogus TypeError (test_slice test_indices: ``range(*slice.indices(n))'')."
		((self ___hasVarargsClassConstructor___) or: [self hasStarredArgument]) ifFalse: [
			^ self printArityMismatchErrorOn: aStream forName: knownBuiltinName
		].
	].

	"Module self-send: `name(args)` → `(self name: args)` when
	compiling a user module and `name` is a top-level def in that module."
	(self moduleSelfSendSelector) ifNotNil: [:modSel |
		^ self printModuleSelfSendOn: aStream selector: modSel
	].
	(self moduleSelfSendVarargsSelector) ifNotNil: [:modVarSel |
		^ self printModuleSelfSendVarargsOn: aStream selector: modVarSel
	].

	"Class self-send: `self.method(args)` → `(self method: args)`
	when compiling a class method and `method` is a known class function."
	(self classSelfSendSelector) ifNotNil: [:clsSel |
		^ self printClassSelfSendOn: aStream selector: clsSel
	].
	(self classSelfSendVarargsSelector) ifNotNil: [:clsVarSel |
		^ self printClassSelfSendVarargsOn: aStream selector: clsVarSel
	].

	"Attribute-call fast path: `module.method(args)` →
	`(module) method: args` when the module class implements `method:`."
	(self attributeCallFastPathSelector) ifNotNil: [:attrSel |
		^ self printAttributeCallFastPathOn: aStream selector: attrSel
	].

	"Attribute-call varargs: `module.method(args, kw=val)` →
	`((module) _method: { args } kw: kwargDict)` when the module has
	a `_method:kw:` varargs method."
	(self attributeCallVarargsSelector) ifNotNil: [:varargsSel |
		^ self printAttributeCallVarargsOn: aStream selector: varargsSel
	].

	"Class-call fast path: `cls(args)` where `cls` is a bare name resolving
	to a GemStone class with a matching env-1 `__new__` selector. Emits
		(cls @env1:__new__: arg1 _: arg2 ...)
	Used for `bool(x)`, `int(x)`, `str(x)`, `object()`, etc. where the
	name maps (via install.gs Step 3) to a Smalltalk class such as
	Boolean, Integer, Unicode7, Object."
	(self bareCallClassNewSelector) ifNotNil: [:newSel |
		^ self printBareCallClassNewOn: aStream selector: newSel
	].

	"Attribute-call fallback: for any attribute call `obj.method(args)` where
	the receiver's class isn't a statically-resolvable module, emit a direct
	send instead of the legacy `(obj) method value: {args} value: kw`
	block-fetch form.

	No keyword args → fixed-arity `(obj) method: arg1 _: arg2` (matches the
	shape of class methods, which have only fixed-arity forms).
	Keyword args present → varargs `(obj) _method: { args } kw: kwargs`.

	Converted wrapper classes (`SrePattern`, `SreMatch`) and dynamically
	loaded C extension modules expose both shapes — fixed-arity for the hot
	no-kw path and `_method:kw:` for keyword argument call sites.

	If the receiver has no matching selector, MessageNotUnderstood is raised —
	the correct Python AttributeError analog for an unknown method.

	Exclusions, both falling through to the legacy form below:

	1. ``self.X(args)`` / ``cls.X(args)`` inside a class method where X
	   isn't a known instance method — routes through AttributeAst's
	   ``___pyAttrLoad___:`` emit so class-side attrs (e.g.
	   ``set_class: type = list``) reach the metaclass-side accessor.

	2. Any-arity attribute calls (``obj.X()`` / ``obj.X(a, b)``) —
	   Python semantics is *load then call*: ``X`` might resolve to
	   an instance method (the direct keyword send was correct), to
	   a class (the direct send fails — class doesn't have an
	   ``X:_:`` method, only the underlying ``__new__:`` family), or
	   to a callable value held in an attribute.  The legacy form
	   ``(obj.___pyAttrLoad___ #X) @env1:value: { args } value: kw``
	   routes all three through the unified call protocol — instance
	   methods return a BoundMethod that ``value:value:`` invokes;
	   classes go through ``Object class value:value:`` to
	   ``__new__``; non-callable values surface a clean DNU.

	The carve-out for ``self.method(args)`` inside a class method
	(case 1) still applies — that path goes through
	``classSelfSendSelector`` which emits a direct fast-path send,
	bypassing this fallback entirely.  All other attribute calls
	fall through to the legacy form below."

	"Class-call arity mismatch: bare name resolves to a class that has at
	least one env-1 `__new__` selector, but none match this call's arity
	or kwarg shape. Emit a clean Python TypeError instead of falling
	through to the broken `cls value: { args } value: kw` form, which
	signals MessageNotUnderstood on plain GemStone classes."
	"A ``*args'' splat has no compile-time arity, so this fixed-arity mismatch
	check must not fire -- defer to the generic ``value: {args} value: kw''
	form, whose printArgumentsArrayOn: splices the splat and reaches the
	class's __new__ with the real argument count (test_slice test_indices:
	``range(*slice.indices(n))'')."
	(self hasStarredArgument) ifFalse: [
		(self knownClassName) ifNotNil: [:knownCls |
			^ self printArityMismatchErrorOn: aStream forName: knownCls
		].
	].

	"AttributeAst's printSmalltalkOn emits ``(value) @env1:___pyAttrLoad___:
	#'attr'`` — a keyword message.  SubscriptAst emits
	``(value) __getitem__: idx'' — also a keyword.  Without surrounding
	parens the following ``value:value:`` keywords merge into one
	selector (e.g. ``___pyAttrLoad___:value:value:'' or
	``__getitem__:value:value:''), dispatching the wrong message.
	Wrap the function expression in parens so the load / index
	is a complete unit before value:value: is sent to its result.
	NameAst (a plain identifier) needs no parens — bare name reads
	don't emit a keyword message."
	"Class-body call to a class-body function (``__add__, __radd__ =
	_operator_fallbacks(_add, operator.add)`` in vendored fractions.py):
	the bare-name reference would emit a receiver-nil BoundMethod whose
	value:value: dispatches on the FIRST ARGUMENT's class -- wrong for a
	direct call.  Emit an UnboundMethod on ``___cls___`` (the class
	under construction, in scope during attr-value emit): its
	value:value: resolves the compiled selector on the class and runs
	it non-virtually with the first argument as the receiver, which is
	exactly Python's plain-function-in-class-namespace semantics under
	Grail's first-param-is-receiver compilation."
	"Direct attribute call (GRAIL_DIRECT_CALLS, stage 2 of the object-model
	refactor): ``recv.foo(a, b)'' with a receiver no branch above could resolve
	compiles to the plain env-1 keyword send ``((recv) foo: a _: b)'' -- the same
	shape a proven self-send takes -- instead of the load-then-call below.  A
	receiver that has no such method reaches the doesNotUnderstand:args:envId:
	hooks, which recover by loading the attribute and calling it (see
	object>>___directCallRecover___:args: for the semantics of a miss).
	___directCallSelector___ lists the exclusions; nil means legacy."
	(self ___directCallSelector___) ifNotNil: [:directSel |
		^ self printDirectAttributeCallOn: aStream selector: directSel].

	((self class inClassBodyValueEmit)
		and: [(function isKindOf: NameAst)
		and: [self class classFunctionNames notNil
		and: [(self class classFunctionNames includes: function id asSymbol)
		and: [self class classBodyBoundNames isNil
			or: [self class classBodyBoundNames includes: function id asSymbol]]]]])
		ifTrue: [
			aStream
				nextPutAll: '((UnboundMethod @env1:definingClass: ';
				nextPutAll: CallAst ___classBeingCompiledVar___;
				nextPutAll: ' selector: #''';
				nextPutAll: function id asString;
				nextPutAll: ''') @env1:value: '.
			self printArgumentsArrayOn: aStream.
			aStream nextPutAll: ' value: '.
			self printKeywordsDictOn: aStream.
			aStream nextPut: $).
			^ self
		].
	(function isKindOf: NameAst)
		ifTrue: [function printSmalltalkOn: aStream]
		ifFalse: [
			aStream nextPut: $(.
			function printSmalltalkOn: aStream.
			aStream nextPut: $)
		].

	"Dispatch via ``@env1:value:value:`` so BoundMethod, ``Object
	class >> value:value:``, etc. resolve consistently."
	aStream nextPutAll: ' @env1:value: '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' value: '.
	self printKeywordsDictOn: aStream.
%

category: 'Grail-other'
method: CallAst
___superNameIsShadowed___
	"True when the name in this call's function position is ``super'' AND the
	program itself binds that name, so the call must NOT be rewritten into a
	Super proxy.

	``super()'' is not a syntactic form in CPython.  The compiler emits an
	ordinary LOAD of the name and the zero-argument magic lives in
	super.__init__, which inspects the calling frame -- so a program that binds
	``super'' shadows the builtin exactly as it would shadow ``len'', and
	``super()'' then calls whatever it bound:

	    class super: msg = 'truly super'      # module scope
	    class C:
	        def method(self): return super().msg    # -> 'truly super'

	NameAst's bare-name ``super'' handler already stood down on both shadow
	forms; the call-shape rewrites below did not, so the two disagreed for the
	one shape that actually occurs -- a CALL -- and a shadowing module got the
	builtin proxy anyway (test_super's test_shadowed_global, test_shadowed_local,
	and the two test_shadowed_dynamic tests).  Sharing ONE predicate is what
	keeps them from drifting apart again; the two tests either move together or
	not at all.

	Both checks are STATIC -- the parser's record of what the module body and
	the enclosing functions bind.  A name patched onto the module at RUNTIME
	(unittest.mock.patch) is therefore still missed; see
	docs/Class_Body_Namespace.md.

	Note what this deliberately does NOT guard: the ``__class__'' cell.  CPython
	creates that cell from the NAME ``super'' appearing in a method, shadowed or
	not -- measured, not assumed:

	    freevars with module shadow: ('__class__',)
	    freevars with local shadow:  ('__class__', 'super')

	so the unconditional classNeedsClassCell: below stays unconditional."

	^ (function isKindOf: NameAst)
		and: [function id = #'super'
			and: [(function ___declaredInEnclosingFunction___: #'super')
				or: [function isModuleVariableName: #'super']]]
%

category: 'Grail-other'
method: CallAst
hasStarredArgument
	"True when any positional argument is a ``*x`` splat.  Every
	fixed-arity fast path must decline such calls -- they print
	arguments individually, and StarredAst's stub raises at runtime.
	The legacy ``(load) value: {args} value: kw`` form handles splats
	via printArgumentsArrayOn:'s concatenation."

	^ arguments anySatisfy: [:each | each isKindOf: StarredAst]
%

category: 'Grail-other'
method: CallAst
bareCallFastPathSelector
	"Return the Smalltalk selector to use for fixed-arity fast-path
	dispatch of this call, or nil if no fixed-arity match exists.

	Eligibility requires:
	  * `function` is a `NameAst` (a bare name like `abs`, not `obj.method`).
	  * No keyword arguments at the call site (kwargs go through varargs).
	  * `arguments size >= 1` (0-arg calls fall through to legacy or
	    varargs — the unary `name` selector is reserved for the legacy
	    block getter and cannot be repurposed as a 0-arg fast path
	    without confusing it with `f = name` block-fetch reads).
	  * The name is not shadowed by any enclosing-scope local.
	  * `builtins` has an env-1 method whose Smalltalk selector matches
	    the name and arity:
	      1 arg   → `name:`
	      2 args  → `name:_:`
	      N args  → `name:` followed by `(N-1)` `_:` keywords."

	| funcName nargs candidate |

	"A doit under a ``__builtins__'' override must not bind a builtin at
	compile time -- see AbstractNode >> ___builtinsAreOverridden___."
	self ___builtinsAreOverridden___ ifTrue: [^nil].
	self hasStarredArgument ifTrue: [^nil].
	(function isKindOf: NameAst) ifFalse: [^nil].
	keywords isEmpty ifFalse: [^nil].
	funcName := function id.
	"Precise LEGB shadow check (see NameAst>>___pythonBindingShadows___:)
	 rather than the over-approximating isVariableIsDeclared: variables
	 walk -- a mere comprehension target elsewhere in the function must
	 not suppress this dispatch (the fallback emits a bare temp that is
	 nil outside the comprehension)."
	(function ___pythonBindingShadows___: funcName) ifTrue: [^nil].

	nargs := arguments size.
	nargs = 0 ifTrue: [^nil].
	candidate := self class fastPathSelectorForName: funcName arity: nargs.
	(self class builtinsHasFastPathSelector: candidate) ifFalse: [^nil].
	^ candidate
%

category: 'Grail-other'
method: CallAst
bareCallVarargsSelector
	"Return the Smalltalk selector to use for varargs fast-path dispatch
	of this call, or nil if no varargs match exists.

	The varargs selector convention is `_name:kw:` (one-underscore prefix
	plus the bare name with two keywords for positional + kwargs). Used
	for builtins that take a variable number of positional args (`print`,
	`zip`), or that need access to kwargs (`round(x, ndigits=2)`), or
	that have multiple supported arities (`pow(2, 3)` vs `pow(2, 3, 5)`).

	Eligibility requires:
	  * `function` is a `NameAst`.
	  * The name is not shadowed by an enclosing-scope local.
	  * `builtins` has an env-1 method `_name:kw:`."

	| funcName candidate |
	"See bareCallFastPathSelector -- same reason, same gate."
	self ___builtinsAreOverridden___ ifTrue: [^nil].
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	"Precise LEGB shadow check (see NameAst>>___pythonBindingShadows___:)
	 rather than the over-approximating isVariableIsDeclared: variables
	 walk -- a mere comprehension target elsewhere in the function must
	 not suppress this dispatch (the fallback emits a bare temp that is
	 nil outside the comprehension)."
	(function ___pythonBindingShadows___: funcName) ifTrue: [^nil].
	candidate := self class varargsSelectorForName: funcName.
	(self class builtinsHasFastPathSelector: candidate) ifFalse: [^nil].
	^ candidate
%

category: 'Grail-other'
method: CallAst
knownBuiltinName
	"Return this call's function name as a Symbol if it is a NameAst whose
	name resolves to a known builtin (some env-1 method on the `builtins`
	class matches the base name) and is not shadowed by an enclosing-scope
	local. Returns nil otherwise.

	Used by codegen to decide whether a fast-path miss is an arity error
	on a known builtin (clean TypeError) or a genuinely unknown name
	(fall through to the legacy form, which today produces a GemStone
	`undefined symbol` compile error). See `knownBuiltinName`'s
	caller in `printSmalltalkOn:`."

	| funcName |
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	"Precise LEGB shadow check (see NameAst>>___pythonBindingShadows___:)
	 rather than the over-approximating isVariableIsDeclared: variables
	 walk -- a mere comprehension target elsewhere in the function must
	 not suppress this dispatch (the fallback emits a bare temp that is
	 nil outside the comprehension)."
	(function ___pythonBindingShadows___: funcName) ifTrue: [^nil].
	(NameAst isFastPathBuiltinName: funcName) ifFalse: [^nil].
	^ funcName
%

category: 'Grail-other'
method: CallAst
attributeCallFastPathSelector
	"Return the keyword-form Smalltalk selector to use for an
	attribute-call fast path, or nil if this call is not eligible.

	Eligibility requires all of:
	  * `function` is an `AttributeAst` (the `obj.method` shape).
	  * `function value` is a `NameAst` (the receiver is a static name,
	    not a chained expression).
	  * The receiver name resolves to a class in the Python dictionary
	    that is a subclass of `module`.
	  * No keyword arguments at the call site.
	  * The receiver class implements the candidate keyword-form selector
	    for the attribute name and arity (`attr`, `attr:`, `attr:_:`, …).

	Note: a local variable that shadows the receiver name (e.g.
	`import gemstone` binds `gemstone` as a local pointing at the
	gemstone instance) does NOT disable the fast path. At runtime the
	local holds the same instance the class would return, so the
	dispatch is identical. If the local is rebound to something else
	entirely (`gemstone = 5; gemstone.commit()`), the runtime send
	produces a `MessageNotUnderstood`, which is the correct
	`AttributeError`-equivalent behavior."

	| receiverName receiverClass candidate |

	self hasStarredArgument ifTrue: [^nil].
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	keywords isEmpty ifFalse: [^nil].
	receiverName := function value id.
	receiverClass := self class resolveModuleClassForName: receiverName.
	receiverClass ifNil: [^nil].
	candidate := self class fastPathSelectorForAttr: function ___mangledAttr___ arity: arguments size.
	((receiverClass methodDictForEnv: 1) includesKey: candidate) ifFalse: [^nil].
	"AT ZERO ARITY THE ``CALL'' AND THE ``READ'' ARE THE SAME SEND.

	``m.f(a)'' compiles to ``(m) f: a'', which no read could be confused with.
	With NO arguments the selector is the bare unary ``f'' -- exactly what
	``m.f'' emits -- so the two collapse, and whether that is right depends
	entirely on what the Smalltalk method DOES:

	  * a FUNCTION (os.getcwd, hashlib.md5, random.random) performs the work
	    and answers the result, so performing it IS calling it.  The collapse
	    is harmless and this path stays;
	  * a VALUE ACCESSOR answers something the caller then means to call, and
	    the collapse silently DROPS the call.  ``io.BufferedIOBase()'' answered
	    the CLASS where ``C := io.BufferedIOBase. C()'' answered an instance --
	    the same expression, two spellings, two answers.

	CATEGORY IS THE ONLY SIGNAL, AND IT IS OPT-IN ON PURPOSE.  An allowlist of
	function categories was tried first and is UNSOUND: real functions live in
	ad-hoc categories (os.getcwd in ``Grail-File and Directory Operations'',
	hashlib.md5 in ``Grail-Constructors''), so declining the fast path for
	everything unlisted broke them -- measured, not guessed.  The categories
	simply do not encode the distinction today.

	So a module DECLARES the accessors that answer a value, and only those
	decline.  Everything else compiles exactly as before, which makes this
	change additive rather than a reinterpretation of every module method.

	The cost of the collapse was 65 tests in test_sax alone: saxutils builds an
	``io.BufferedIOBase()'' by hand, and the class it got back reported a
	truthy ``closed'', so XMLGenerator over a BytesIO died with ``write to
	closed file'' about a stream that was open."
	(arguments isEmpty and: [self class ___isValueAccessorCategory___:
			(receiverClass categoryOfSelector: candidate environmentId: 1)])
		ifTrue: [^ nil].
	^ candidate
%

category: 'Grail-other'
classmethod: CallAst
___isValueAccessorCategory___: aCategory
	"Whether a method in aCategory ANSWERS A VALUE rather than performing an
	action -- so a zero-argument call must load it and then call what it
	answers, instead of collapsing both into one unary send.

	Deliberately a short opt-in list rather than ``everything that is not a
	function'': see attributeCallFastPathSelector for why the inverse is
	unsound.  A module that has accessors of this shape says so by filing them
	here; a module that does not is unaffected.

	Guarded against a nil category (a selector whose category cannot be read
	is treated as ordinary, which is the pre-existing behaviour)."

	aCategory isNil ifTrue: [^ false].
	^ #('Grail-Type Accessors') includes: aCategory asString
%

category: 'Grail-other'
classmethod: CallAst
resolveModuleClassForName: aReceiverName
	"Return the `module` subclass registered under `aReceiverName` in the
	Python dictionary, or nil if no such class exists. Used by codegen
	to determine whether an attribute-call receiver is a statically
	known module."

	| candidate |
	candidate := Python at: aReceiverName ifAbsent: [^nil].
	(candidate isKindOf: Behavior) ifFalse: [^nil].
	(candidate inheritsFrom: module) ifFalse: [^nil].
	^ candidate
%

category: 'Grail-Attr Accessors'
classmethod: CallAst
___moduleClassReadSelector___: aNameString
	"The selector codegen sends to the MODULE INSTANCE to read the module-level
	name aNameString (a class name: the lexical class for zero-arg super() and
	__class__, the two-arg super(C, self) form, a class-body read of a sibling
	class).  Today's shape is the bare unary ``(mod ___instance___) C'' --
	module's doesNotUnderstand READ protocol.  Under GRAIL_ATTR_ACCESSORS a bare
	unary send is a CALL (and with GRAIL_DIRECT_CALLS on, module's hook calls
	what it loads -- ``C'' would construct a C), so the read is spelled
	``___pyattr_C___'', served by the module class's read accessors
	(importlib compiles them after the module body)."

	importlib ___attrAccessorsEnabled___ ifFalse: [^ aNameString asString].
	^ '___pyattr_' , aNameString asString , '___'
%

category: 'Grail-other'
classmethod: CallAst
fastPathSelectorForAttr: anAttrName arity: nargs
	"Build the keyword-form selector for an attribute call.
	Convention is the same as `fastPathSelectorForName:arity:`:
	  0 args  →  #attr             (unary)
	  1 arg   →  #attr:
	  2 args  →  #attr:_:
	  N args  →  #attr: followed by (N-1) `_:` keywords."

	| sb |
	nargs = 0 ifTrue: [^ anAttrName asSymbol].
	sb := AppendStream on: String new.
	sb nextPutAll: anAttrName asString; nextPut: $:.
	2 to: nargs do: [:i | sb nextPutAll: '_:'].
	^ sb contents asSymbol
%

category: 'Grail-other'
method: CallAst
printAttributeCallFastPathOn: aStream selector: aSelector
	"Emit a direct keyword send for an attribute call:
		((receiver) attr: arg1 _: arg2 _: arg3 ...)
	or, for 0-arg methods:
		((receiver) attr)
	The receiver expression is `function value` (the AttributeAst's
	value, which `attributeCallFastPathSelector` has already verified
	is a static NameAst resolving to a module class)."

	| attrName nargs |
	attrName := function ___mangledAttr___ asString.
	nargs := arguments size.
	aStream nextPut: $(.
	function value printSmalltalkWithParenthesisOn: aStream.
	aStream space; nextPutAll: attrName.
	nargs = 0 ifTrue: [
		aStream nextPut: $).
		^ self
	].
	aStream nextPut: $:; space.
	(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
	2 to: nargs do: [:i |
		aStream nextPutAll: ' _: '.
		(arguments at: i) printSmalltalkWithParenthesisOn: aStream.
	].
	aStream nextPut: $)
%

category: 'Grail-other'
method: CallAst
attributeCallVarargsSelector
	"Return the varargs selector `_name:kw:` for an attribute call
	on a module, or nil if not eligible.

	Same eligibility as `attributeCallFastPathSelector` except:
	  * Keywords ARE allowed (that's the whole point of varargs).
	  * The receiver class must have `_name:kw:` in env 1."

	| receiverName receiverClass candidate |
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	receiverName := function value id.
	receiverClass := self class resolveModuleClassForName: receiverName.
	receiverClass ifNil: [^nil].
	candidate := self class varargsSelectorForName: function ___mangledAttr___.
	((receiverClass methodDictForEnv: 1) includesKey: candidate) ifFalse: [^nil].
	^ candidate
%

category: 'Grail-other'
method: CallAst
printAttributeCallVarargsOn: aStream selector: aSelector
	"Emit a varargs send for an attribute call:
		((receiver) _name: { arg1. arg2. } kw: kwargDict)"

	| attrName |
	attrName := function ___mangledAttr___ asString.
	aStream nextPut: $(.
	function value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _'; nextPutAll: attrName; nextPutAll: ': '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: '.
	self printKeywordsDictOn: aStream.
	aStream nextPut: $)
%

category: 'Grail-Direct Calls'
method: CallAst
___directCallSelector___
	"The fixed-arity env-1 selector for a direct attribute call, or nil when this
	call keeps the legacy load-then-call shape.  Behind GRAIL_DIRECT_CALLS; see
	the design note (scratchpad/direct-calls-design.md) for the measurements
	behind each exclusion.

	Exclusions, in order:
	  1. flag off; not an attribute call; keyword arguments; a *splat.  Keyword
	     and star calls keep today's shapes -- ``_foo:kw:'' is emitted only where
	     it already was (static module receivers, class self-sends).
	  2. a name starting with ``___'': Grail's internal protocol; a Python call
	     spelled that way must never become one of its selectors.
	  3. VM-special selectors.  Measured on this stone: an env-1 send of
	     ``yourself'' / ``isNil'' / ``notNil'' answers WITHOUT a method lookup, so
	     a miss could never reach the hook; ``value'' / ``value:'' on an ExecBlock
	     receiver ACTIVATE the block (the compiler's special block send), so
	     ``fn.value()'' would call fn instead of raising AttributeError.
	  4. a receiver that is a statically known MODULE: attrFixed / attrVarargs /
	     legacy already handle it, and a module's bare unary DNU is its Smalltalk
	     READ protocol (it answers the stored value, not a call).
	  5. a receiver that is statically CLASS-LIKE -- the ``cls'' self-parameter,
	     a nested or module-level class name, ``type(x)'', ``x.__class__''.  A
	     generated class carries CLASS-SIDE accessor pairs for its class-body
	     data attributes ('Grail-Class Attrs'), so ``Outer.Inner(1)'' would land
	     on the SETTER and store 1 (the class-side twin of the silent-setter
	     defect PythonInstance's hook guards against) and ``Outer.Inner()'' on
	     the getter, answering the class instead of constructing.
	  7. (below) a ``super()'' receiver: the proxy has env-1 methods of its own.
	  6. a ZERO-argument call on a bare NAME that is not a function local (a
	     parameter, an assigned local, a comprehension target), or that an
	     import statement binds anywhere in the module or the enclosing defs:
	     such a name holds a MODULE, whose unary DNU answers the attribute VALUE
	     -- a class, a lambda, an imported BoundMethod -- rather than calling it
	     (``result.TestResult()'' and a function-local ``import unittest;
	     unittest.TestResult()'' both answered the class).  Other locals,
	     ``self'' and non-name receivers get the direct send at every arity."

	| attrName attrSym recv |
	importlib ___directCallsEnabled___ ifFalse: [^ nil].
	(function isKindOf: AttributeAst) ifFalse: [^ nil].
	keywords isEmpty ifFalse: [^ nil].
	self hasStarredArgument ifTrue: [^ nil].
	attrName := function ___mangledAttr___ asString.
	(attrName size >= 3 and: [(attrName copyFrom: 1 to: 3) = '___']) ifTrue: [^ nil].
	(#('value' 'yourself' 'isNil' 'notNil') includes: attrName) ifTrue: [^ nil].
	"Exclusion 8: an EXPLICIT dunder call (``a.__le__(b)'', ``Base.__init__(self,
	 x)'', ``obj.__repr__()'') keeps the load-then-call shape.  The env-1
	 dunder selectors on object and the kernel classes are Grail's OPERATOR
	 entries (``__le__:'' raises the operator's TypeError where the Python
	 attribute -- e.g. total_ordering's derived function stored on the class --
	 answers NotImplemented), the binary dunders are deliberately outside the
	 dispatcher installer, and a class receiver needs the unbound binding the
	 loader gives.  Explicit dunder calls are rare and never hot."
	(attrName size > 4
		and: [(attrName copyFrom: 1 to: 2) = '__'
		and: [(attrName copyFrom: attrName size - 1 to: attrName size) = '__']])
			ifTrue: [^ nil].
	recv := function value.
	(recv isKindOf: NameAst) ifTrue: [
		| id |
		id := recv id.
		(self class resolveModuleClassForName: id) ifNotNil: [^ nil].
		((self class isSelfReference: id)
			and: [self class selfParameterName == #cls]) ifTrue: [^ nil].
		(self class classNestedClassNames notNil
			and: [self class classNestedClassNames includes: id asSymbol]) ifTrue: [^ nil].
		(self class moduleClassNames notNil
			and: [self class moduleClassNames includes: id asSymbol]) ifTrue: [^ nil].
		"Exclusion 9: a class defined in an ENCLOSING def (``class Slot: ...''
		 inside a test function, then ``Slot.go(1, 1)'').  Module-level and
		 class-nested class names are already excluded above; a function-local
		 one is found by scanning the enclosing defs' statements."
		(self ___receiverIsLocalClassName___: recv) ifTrue: [^ nil].
		"Exclusion 6 (tightened in the 11th cut): a ZERO-argument call is direct
		 only on ``self''.  A module's bare-unary DNU is its READ protocol, and a
		 module can sit behind any name or chain -- a function local assigned
		 from an attribute (``wmod = self.module; wmod.catch_warnings()'' gave
		 the CLASS to ``with'' in test_warnings), an instance attribute
		 (``self.module.merge()'' answered the function itself in test_heapq), a
		 class held in an attribute (``self.A.static()'' hit the class-attr
		 getter in test_functools).  Telling a read from a call at the module
		 needs a runtime disambiguation that is stage-3 work; until then the
		 0-arg shape on anything but self keeps load-then-call."
		"Lifted under GRAIL_ATTR_ACCESSORS (stage 3): a Python READ then has its
		 own spelling (``___pyattr_x___''), so a bare unary selector is always a
		 CALL -- module's hook calls what a unary miss loads, and the read-vs-call
		 ambiguity this exclusion guarded against no longer exists."
		(arguments isEmpty
			and: [importlib ___attrAccessorsEnabled___ not
			and: [(self class isSelfReference: id) not]]) ifTrue: [^ nil]].
	(arguments isEmpty
		and: [importlib ___attrAccessorsEnabled___ not
		and: [(recv isKindOf: NameAst) not]]) ifTrue: [^ nil].
	((recv isKindOf: AttributeAst) and: [recv attr asString = '__class__']) ifTrue: [^ nil].
	((recv isKindOf: CallAst)
		and: [(recv function isKindOf: NameAst)
		and: [recv function id = #'type']]) ifTrue: [^ nil].
	"7. ``super().m(args)'': the Super PROXY carries Python-level env-1 methods
	of its own -- ``__init__:_:'' is super(type, obj)'s constructor -- so a
	direct ``proxy __init__: x _: y'' re-initialises the proxy instead of
	running the parent's __init__.  Super>>___pyAttrLoad___: (the legacy
	load-then-call) resolves the MRO correctly for every arity and for
	classmethods; keep it."
	((recv isKindOf: CallAst)
		and: [(recv function isKindOf: NameAst)
		and: [recv function id = #'super']]) ifTrue: [^ nil].
	attrSym := attrName asSymbol.
	^ self class fastPathSelectorForAttr: attrSym arity: arguments size
%

category: 'Grail-Direct Calls'
method: CallAst
___receiverIsLocalClassName___: aNameAst
	"Is aNameAst the name of a class defined by a ``class'' statement in an
	enclosing def or lambda?  Such a receiver is a CLASS object: a direct send
	would reach the class-side compiled method and skip a class-side descriptor
	stored over it in the class body (singledispatchmethod over @classmethod /
	@staticmethod), so the call keeps load-then-call like module-level classes.
	Only the defs' own statement lists are scanned (no descent)."

	| id node stmts |
	id := aNameAst id asSymbol.
	node := self parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst]) ifTrue: [
			stmts := node body.
			(stmts isKindOf: Collection) ifFalse: [
				stmts := [stmts body] on: MessageNotUnderstood do: [:ex | ex return: #()]].
			(stmts isKindOf: Collection) ifTrue: [
				stmts do: [:stmt |
					((stmt isKindOf: ClassDefAst) and: [stmt name asSymbol == id])
						ifTrue: [^ true]]]].
		node := node parent].
	^ false
%
category: 'Grail-Direct Calls'
method: CallAst
___receiverIsImportBound___: aNameAst
	"Is aNameAst a name bound by an import statement -- at module level (the
	set importlib computes once per module, CallAst moduleImportNames) or in an
	enclosing def (scanned here; defs are small)?  Such a name holds a MODULE,
	whose bare unary DNU answers the stored attribute rather than calling it, so
	a zero-argument call through it keeps load-then-call.  The first ON-suite
	run found the function-local case at once: ``import unittest'' inside a def,
	then ``unittest.TestResult()'' answered the class."

	| id node names |
	id := aNameAst id asSymbol.
	(self class moduleImportNames notNil
		and: [self class moduleImportNames includes: id]) ifTrue: [^ true].
	node := self parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst]) ifTrue: [
			names := node ___importBoundNamesInto___: IdentitySet new.
			(names includes: id) ifTrue: [^ true]].
		node := node parent].
	^ false
%

category: 'Grail-Direct Calls'
method: CallAst
___receiverRootName___: aNode
	"The bare NameAst at the root of an attribute chain (``a.b.c'' -> ``a''), the
	node itself when it is a name, or nil for any other expression.  Exclusion 6
	of ___directCallSelector___ applies its module test to the root: a
	zero-argument ``http.client.HTTPMessage()'' is a call through a MODULE
	reached by attribute, and its unary DNU would answer the class."

	| node |
	node := aNode.
	[node isKindOf: AttributeAst] whileTrue: [node := node value].
	^ (node isKindOf: NameAst) ifTrue: [node] ifFalse: [nil]
%

category: 'Grail-Direct Calls'
method: CallAst
___receiverIsFunctionLocal___: aNameAst
	"Is aNameAst a local of an enclosing function (parameter, assigned local) or
	a comprehension target -- i.e. a name that cannot be a module bound at
	module scope by ``import x'' / ``from . import x''?  Exclusion 6 of
	___directCallSelector___ admits a ZERO-argument direct send only for these:
	the first ON-suite run showed ``from . import result; ... result.TestResult()''
	compiled to the bare unary ``result TestResult'', whose module DNU answers
	the CLASS (its read protocol), so a positive test for ``module-scope name''
	was not enough -- every non-local name is treated as possibly a module.
	Mirrors the tests NameAst>>___emitSmalltalkOn___ makes before routing a bare
	name to a Smalltalk temp."

	| id |
	id := aNameAst id.
	(aNameAst ___pythonLocalInEnclosingFunctions___: id) ifTrue: [^ true].
	(aNameAst ___isEnclosingComprehensionTarget___: id) ifTrue: [^ true].
	^ false
%

category: 'Grail-Direct Calls'
method: CallAst
printDirectAttributeCallOn: aStream selector: aSelector
	"Emit the direct keyword send for an attribute call:
	    ((receiver) attr: arg1 _: arg2 ...)     or     ((receiver) attr)
	Same shape as printAttributeCallFastPathOn:selector:, for a receiver that
	could NOT be resolved at compile time."

	| attrName nargs |
	attrName := function ___mangledAttr___ asString.
	nargs := arguments size.
	aStream nextPut: $(.
	function value printSmalltalkWithParenthesisOn: aStream.
	aStream space; nextPutAll: attrName.
	nargs = 0 ifTrue: [
		aStream nextPut: $).
		^ self].
	aStream nextPut: $:; space.
	(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
	2 to: nargs do: [:i |
		aStream nextPutAll: ' _: '.
		(arguments at: i) printSmalltalkWithParenthesisOn: aStream].
	aStream nextPut: $)
%

category: 'Grail-other'
classmethod: CallAst
fastPathSelectorForName: aName arity: nargs
	"Build the Smalltalk fixed-arity fast-path selector for a Python call
	`aName(...)` with `nargs` positional arguments. The convention is:
	  1 arg   →  #aName:
	  2 args  →  #aName:_:
	  3 args  →  #aName:_:_:
	(0 args is not handled by the fast path — see bareCallFastPathSelector.)"

	| sb |
	sb := AppendStream on: String new.
	sb nextPutAll: aName asString; nextPut: $:.
	2 to: nargs do: [:i | sb nextPutAll: '_:'].
	^ sb contents asSymbol
%

category: 'Grail-other'
classmethod: CallAst
varargsSelectorForName: aName
	"Build the Smalltalk varargs fast-path selector for a Python name.
	The convention is `_aName:kw:` — one-underscore prefix, the bare
	name, then two keywords for positional and kwargs."

	^ ('_' , aName asString , ':kw:') asSymbol
%

category: 'Grail-other'
classmethod: CallAst
builtinsHasFastPathSelector: aSymbol
	"Return true if the builtins class implements aSymbol as an env-1
	method (i.e. there is a real fast-path implementation installed).
	Used by codegen to decide whether to emit the fast path."

	^ (builtins methodDictForEnv: 1) includesKey: aSymbol
%

category: 'Grail-other'
method: CallAst
printLocalsCallOn: aStream
	"Emit the compile-time rewrite of a bare 0-arg ``locals()`` call.

	Function scope: emit a pair-array of every name the parser recorded
	for the enclosing function (parameters land in body.variables via
	declareVariable:, assignments via declareWrite: — both sets feed
	BlockAst variables), and let builtins ___buildLocals___: drop the
	entries whose value is still Smalltalk nil (unbound so far).  The
	`self`/`cls` parameter of a class method emits as Smalltalk `self`
	(mirroring NameAst).  Other Smalltalk pseudo-variable names can't
	be read back by their Python name (codegen renames those temps),
	so they are omitted.

	Module scope (functionBeingCompiled is nil): locals() IS globals()
	— emit `self`, exactly like the globals() rewrite.

	Class-body scope: the names the class body has bound SO FAR, which is
	what CPython's class-body locals() reports -- see
	printClassBodyLocalsOn:."

	| fn |
	"Class body FIRST: inside one, functionBeingCompiled is still the
	ENCLOSING function (the classdef is emitted in its scope), so without
	this test a class-body locals() answered that function's locals -- names
	from a different scope entirely, and CPython's rule is that a class body
	does not even see them."
	CallAst inClassBodyValueEmit ifTrue: [
		| compNames |
		compNames := self ___enclosingComprehensionTargetNames___.
		"A comprehension in a CLASS BODY is a scope of its own, and PEP 709 does
		NOT inline it -- that is restricted to function and module scope -- so
		its locals() is the comprehension's OWN bindings alone.  The class
		namespace is not among them: Python skips class scope when resolving a
		free name from inside a nested scope, so those names are invisible there.

		Emitting them also RAISED.  Each class-body value is compiled as a
		class-body read, and from inside a comprehension that read stands down
		to the module -- so ``[locals()['x'] for x in l]'' in a class body died
		with ``NameError: name 'l' is not defined'' on the SIBLING rather than
		answering x (test_listcomps test_iter_var_available_in_locals, class
		scope).  A plain ___buildLocals___: rather than the class-connected
		___buildClassBodyLocals___:forClass:, because a write through the
		comprehension's locals binds nothing on the class."
		compNames isEmpty ifFalse: [
			^ self ___printCompTargetLocalsOn___: aStream names: compNames].
		^ self printClassBodyLocalsOn: aStream].
	fn := CallAst functionBeingCompiled.
	"Module scope: locals() IS globals() — emit the same live view as the
	globals() rewrite (docs/LEGB.md)."
	fn isNil ifTrue: [
		| compNames |
		compNames := self ___enclosingComprehensionTargetNames___.
		"Module scope INSIDE a comprehension is not plain globals: the
		comprehension's own target is in scope too, and CPython reports it
		(``items = [locals()['x'] for x in l]'' at module level).  Merge rather
		than replace, and as a COPY -- the live view must not gain a key that
		is really a block temp, and ``locals() is globals()'' still holds
		everywhere outside a comprehension, which is the contract
		GlobalsTestCase pins."
		compNames isEmpty ifFalse: [
			aStream
				nextPutAll: '(((Python @env0:at: #builtins) instance) ___evalScopeFor___: ';
				nextPutAll: self ___globalsViewReceiverExpr___;
				nextPutAll: ' locals: '.
			self ___printCompTargetLocalsOn___: aStream names: compNames.
			aStream nextPutAll: ')'.
			^ self].
		"A DOIT handed a live locals mapping answers THAT OBJECT from locals(),
		not a view of it -- see AbstractNode >> ___localsOnlyViewExpr___."
		self ___localsOnlyViewExpr___ ifNotNil: [:expr |
			aStream nextPutAll: expr.
			^ self].
		aStream
			nextPutAll: '(PyModuleDict @env0:on: ';
			nextPutAll: self ___globalsViewReceiverExpr___;
			nextPutAll: ')'.
		^self].
	self printFunctionLocalsSnapshotOn: aStream
%

category: 'Grail-other'
method: CallAst
printBareEvalExecOn: aStream
	"Emit the compile-time rewrite of a bare single-argument ``eval(expr)'' /
	``exec(src)'' in a FUNCTION body (no explicit globals/locals), passing the
	enclosing function's locals snapshot as the evaluation namespace so the
	evaluated code can read enclosing locals -- e.g. ``eval('val.split()[0]')''
	sees the local ``val''.  The snapshot is the same ___buildLocals___ dict
	the locals() rewrite builds (a plain PyDict, so it works regardless of
	whether eval runs inside a real module instance), passed as _eval/_exec's
	``globals'' argument, which they already seed the scope from.

	The caller (printSmalltalkOn: section 0c) guarantees a NameAst eval/exec, a
	single positional, no keywords, and function scope (functionBeingCompiled
	not nil).

	The namespace is the enclosing MODULE's globals with those locals laid
	over them, assembled by builtins ___evalScopeFor___:locals:.  Locals
	alone were passed before, so a bare eval could read an enclosing local
	but not a module-level name -- ``eval('date(1, 2, 3)')'' answered
	`undefined symbol date' even where the module had imported it
	(test_roundtrip).  The helper copies rather than exposing the live
	module view, and tolerates a nil/non-module receiver, which is what
	made injecting globals here unsafe before."

	| fn |
	fn := CallAst functionBeingCompiled.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) _'.
	aStream nextPutAll: function id asString.
	aStream nextPutAll: ': { '.
	(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: '. '.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) ___evalScopeFor___: '.
	"MODULE SCOPE reaches here only from inside a comprehension (the caller's
	guard), where there is no function snapshot to take -- the scope is the
	globals plus the comprehension's own targets.  ___globalsViewReceiverExpr___
	rather than ___moduleStoreReceiverExpr___ so a DOIT names its symbol-list
	scope instead of a nil ``self''."
	fn isNil
		ifTrue: [
			aStream nextPutAll: self ___globalsViewReceiverExpr___.
			aStream nextPutAll: ' locals: '.
			self ___printCompTargetLocalsOn___: aStream
				names: self ___enclosingComprehensionTargetNames___]
		ifFalse: [
			aStream nextPutAll: self ___moduleStoreReceiverExpr___.
			aStream nextPutAll: ' locals: '.
			self printFunctionLocalsSnapshotOn: aStream].
	aStream nextPutAll: ')'.
	aStream nextPutAll: '. } kw: nil)'
%

category: 'Grail-other'
classmethod: CallAst
___freeVariableNamesFor___: aFunctionDefAst
	"The Python FREE VARIABLES of aFunctionDefAst, sorted: names it mentions
	but does not bind, which an enclosing FUNCTION scope does bind.  Used by
	printFunctionLocalsSnapshotOn: to complete the locals() snapshot.

	The mention set comes from the parser (BlockAst >> reads, accumulated
	outward at popScope so a name referenced only by a DEEPER nested def is
	still free here -- which is right, since this scope has to carry the
	binding down to it).  Intersecting it with the enclosing scopes' bound
	names is what separates a free variable from a module global or builtin,
	both of which are also mere mentions and neither of which belongs in
	locals().

	THE WALK STOPS AT A CLASS BODY, for two independent reasons that happen
	to agree.  Python skips class scope when resolving a free variable (a
	method does not see class attributes as closure names), and Grail
	compiles a class-body def to a real Smalltalk METHOD rather than to a
	nested block -- so an enclosing function's temps are not in lexical scope
	there and emitting one would be an undefined-variable COMPILE error, not
	a wrong answer.  Stopping at the ClassDefAst rules that out by
	construction.

	Names declared ``global'' in this scope are excluded: they name the
	module binding, and CPython's locals() does not report them.  ``nonlocal''
	names need no special case -- the parser strips them from the scope's own
	variables, so they arrive here through the free-variable path, which is
	exactly where CPython puts them."

	| mentions bound node own globals |
	mentions := aFunctionDefAst body reads ifNil: [^ #()].
	own := aFunctionDefAst body variables.
	globals := aFunctionDefAst body globalNames ifNil: [#()].
	bound := IdentitySet new.
	node := aFunctionDefAst parent.
	[node notNil] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [node := nil] ifFalse: [
			(node isKindOf: FunctionDefAst) ifTrue: [
				node body ifNotNil: [:b |
					b variables do: [:v | bound add: v].
					"Parameters live on the args node, not in body variables."
					node allParameterNames do: [:p | bound add: p asSymbol]]].
			node := node parent]].
	^ (mentions select: [:n |
		(bound includes: n)
			and: [(own includes: n) not
			and: [(globals includes: n) not]]])
				asSortedCollection: [:a :b | a asString <= b asString]
%

category: 'Grail-other'
classmethod: CallAst
___emitFreeVariableRead___: aSymbol parent: aNode on: aStream
	"Emit the read of free variable aSymbol as it resolves AT aNode -- by
	building a NameAst there and letting it compile itself.

	Emitting the bare name instead is wrong often enough to break module
	loads.  NameAst resolves a name through a stack of cases that a raw
	identifier silently skips: the self/cls parameter of a class-body def IS
	Smalltalk ``self'' (fractions' ``_operator_fallbacks(monomorphic_operator,
	...)'' is exactly this -- its first parameter, captured by the nested
	``forward'', compiles to ``self''), a reserved-named parameter is renamed
	to its ``_<name>'' transport temp, an enclosing local reached past a class
	body comes from ``___classCell___'', and a module-level name is a module
	attribute load.  Emitting ``monomorphic_operator'' where the method has no
	such temp is CompileError 1001, which takes the whole module down.

	aNode fixes the resolution point, and the two callers differ: the closure
	cells are emitted at the DEF SITE, in the enclosing scope, while the
	locals() snapshot is emitted INSIDE the function body."

	| nameNode |
	nameNode := NameAst with: aSymbol.
	nameNode ctx: LoadAst basicNew.
	nameNode setParent: aNode.
	nameNode printSmalltalkOn: aStream
%

category: 'Grail-other'
classmethod: CallAst
___freeVariableIsAssignableTemp___: aSymbol parent: aNode
	"True when ``aSymbol := value'' actually COMPILES at aNode -- the name is a
	real, assignable Smalltalk temp there.

	Asked in a STORE context, and that is the whole point.  The obvious test is
	to render the name and require the bare identifier back, but rendering a
	LOAD wraps a plain local in its unbound-local guard:

	    (marker ifNil: [UnboundLocalError ___signalUnbound___: #marker])

	which is not the bare name -- so the test rejected a perfectly assignable
	temp.  That is why a ``nonlocal'' write in a CLASS BODY silently did
	nothing: the statement was dropped, the name stayed a class attribute, and
	the enclosing variable was never written.  A STORE renders the assignment
	TARGET, which is exactly the thing being asked about.

	The store render alone is not enough, though.  ``__class__'' also renders
	bare in a store context -- deliberately, so that ``__class__ = v'' inside a
	method stays well-formed -- and Grail has NO temp for it, because popScope
	keeps that one name local to the class body.  Emitting ``__class__ := 42''
	there is CompileError 1001, which replaces the whole enclosing method with a
	raising stub.  So the second question is asked too: does an enclosing
	FUNCTION actually bind this name?  That is the one which separates the two.

	Each half is asked in the context where it means something: one decides
	whether the assignment is well-formed, the other whether there is anything
	to assign to."

	| probe ws |
	probe := NameAst with: aSymbol.
	probe ctx: StoreAst basicNew.
	probe setParent: aNode.
	ws := WriteStream on: String new.
	probe printSmalltalkOn: ws.
	ws contents = aSymbol asString ifFalse: [^ false].
	^ probe ___pythonLocalInEnclosingFunctions___: aSymbol
%

category: 'Grail-other'
classmethod: CallAst
___freeVariableReadSource___: aSymbol parent: aNode
	"___emitFreeVariableRead___:parent:on: rendered to a String, so a caller
	can compare it against the bare name -- the test for ``this free variable
	is a plain assignable temp here'' (see FunctionDefAst >>
	emitClosureCellsOn:)."

	| ws |
	ws := WriteStream on: String new.
	self ___emitFreeVariableRead___: aSymbol parent: aNode on: ws.
	^ ws contents
%

category: 'Grail-other'
classmethod: CallAst
___freeVariableIsAssignable___: aSymbol for: aFunctionDefAst
	"True when the enclosing scope that BINDS aSymbol holds it in a real
	Smalltalk TEMP, so ``aSymbol := value'' compiles there.

	Used by FunctionDefAst >> emitClosureCellsOn: to decide whether a closure
	cell gets a writer block.  It is not cosmetic: a Smalltalk block or method
	ARGUMENT is not assignable, so emitting ``[:v | arg := v]'' over a
	parameter the enclosing function never assigns is CompileError 1001,
	``expected an assignable variable'' -- which takes down the whole module
	load, not just that def.

	A name in the binding scope's WRITE set is assignable by construction: the
	scope assigns it somewhere, so codegen either declared it as a temp or
	transported the parameter into one (FunctionDefAst >>
	paramNeedsTemp:assigned:instVars:).  A parameter that is only ever read
	stays a bare argument, and its cell is read-only -- which loses nothing
	real, since nothing in that program writes the binding either."

	| node |
	node := aFunctionDefAst parent.
	[node notNil] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [^ false].
		((node isKindOf: FunctionDefAst) and: [node body notNil]) ifTrue: [
			(node body variables includes: aSymbol) ifTrue: [
				^ (node body writes ifNil: [#()]) includes: aSymbol].
			(node allParameterNames anySatisfy: [:p | p asSymbol == aSymbol]) ifTrue: [
				^ (node body writes ifNil: [#()]) includes: aSymbol]].
		node := node parent].
	^ false
%

category: 'Grail-other'
method: CallAst
printClassBodyLocalsOn: aStream
	"Emit the 0-arg ``locals()'' rewrite for a call INSIDE A CLASS BODY: a
	mapping of the names the class body has bound so far, in source order,
	CONNECTED to the class so that a write through it binds a class attribute.

	That is what CPython reports there.  A class body executes as a namespace
	rather than a function, so its locals() is the mapping being built into the
	class -- NOT the enclosing function's locals, which is what Grail answered
	before (a class body cannot even see those: Python skips class scope when
	resolving a free variable, so ``x'' from an enclosing def is precisely the
	name that must NOT appear).  test_scope's testLocalsClass asserts exactly
	that absence:

	    def f(x):
	        class C:
	            y = x
	            def m(self): return x
	            z = list(locals())      # ['y', 'm'] -- 'x' must not be here

	``bound so far'' comes from CallAst classBodyBoundNames, which ClassDefAst
	already computes per attribute for sequential-execution ordering, so a name
	bound LATER in the body is correctly absent too.  Each value is read by
	letting a NameAst compile itself under the live class-body context, which
	routes a sibling def to a BoundMethod and a plain attribute to the class
	store -- the same expressions any other class-body reference emits.

	Grail's class bodies compile to static attribute stores rather than
	executing into a real mapping, so the entries are a SNAPSHOT -- an instance
	held across statements does not grow as the body binds more names.  The
	WRITES are connected even so: the answer is a ClassBodyLocals bound to the
	class under construction, whose __setitem__/__delitem__ bind and unbind the
	class attribute (test_scope's testClassAndGlobal and
	testClassNamespaceOverridesClosure).  See ClassBodyLocals' class comment for
	what stays snapshot-shaped and docs/Class_Body_Namespace.md for what closing
	that would take.

	Two SHAPE differences from CPython, both deliberate.  The implicit
	``__module__'' / ``__qualname__'' / ``__firstlineno__'' entries CPython
	seeds a class namespace with are absent -- they are not names the body
	binds, and emitting two of the three would be no closer to CPython than
	emitting none.  And the order is the class body's binding order rather
	than a dict's insertion order over those dunders first."

	| bound |
	bound := CallAst classBodyBoundNames.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) ___buildClassBodyLocals___: { '.
	bound ifNotNil: [
		bound do: [:each |
			aStream nextPutAll: '{ '''; nextPutAll: each asString; nextPutAll: '''. '.
			CallAst ___emitFreeVariableRead___: each asSymbol parent: self on: aStream.
			aStream nextPutAll: ' }. ']].
	aStream nextPutAll: '} forClass: '.
	aStream nextPutAll: CallAst ___classBeingCompiledVar___.
	aStream nextPutAll: ')'
%

category: 'Grail-other'
method: CallAst
printFunctionLocalsSnapshotOn: aStream
	"Emit ``((builtins instance) ___buildLocals___: { {name. value}. ... })'' --
	a pair-array snapshot of every name in the enclosing FUNCTION scope, which
	builtins ___buildLocals___: turns into a dict (dropping still-unbound names,
	whose Smalltalk value is nil).  Shared body of the locals()/vars() rewrite
	(printLocalsCallOn:) and the bare eval()/exec() caller-locals injection
	(printBareEvalExecOn:).  MUST be called only in function scope
	(CallAst functionBeingCompiled not nil -- both callers guard this;
	printBareEvalExecOn: takes its module-scope-inside-a-comprehension case
	through ___printCompTargetLocalsOn___:names: instead)."

	| fn names paramNames |
	fn := CallAst functionBeingCompiled.
	names := fn body variables asSortedCollection: [:a :b | a asString <= b asString].
	paramNames := fn allParameterNames.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) ___buildLocals___: { '.
	"FREE VARIABLES first -- CPython's locals() reports a function's free
	variables alongside its own locals, and Grail listed only the locals, so
	``locals()'' in a closure dropped every name inherited from an enclosing
	def (test_scope testLocalsFunction) and a bare ``eval'' built on this same
	snapshot could not see one either (testEvalFreeVars).  Emitted as the bare
	Smalltalk temp name, which is exactly how NameAst compiles a free-variable
	READ in this block -- the nested def is a Smalltalk block closed over the
	enclosing block's temps, so the name is already in lexical scope."
	(CallAst ___freeVariableNamesFor___: fn) do: [:each |
		aStream
			nextPutAll: '{ ''';
			nextPutAll: each asString;
			nextPutAll: '''. '.
		"Resolved AS AT THE CALL SITE (inside the function body), not as the
		bare identifier: a free variable that is the self/cls parameter of an
		enclosing class-body def compiles to Smalltalk ``self'', a reserved
		name to its transport temp, and so on -- see
		___emitFreeVariableRead___:parent:on:."
		CallAst ___emitFreeVariableRead___: each asSymbol parent: fn body on: aStream.
		aStream nextPutAll: ' }. '].
	names do: [:each |
		(CallAst isSelfReference: each)
			ifTrue: [
				"Real-method compile: the self/cls parameter IS Smalltalk self."
				aStream nextPutAll: '{ '''; nextPutAll: each asString; nextPutAll: '''. self }. ']
			ifFalse: [
				(#(#'self' #'super' #'thisContext' #'nil' #'true' #'false') includes: each)
					ifTrue: [
						"Closure-form compile: a reserved-named PARAMETER is
						transported to the `_<name>` temp; read it from there.
						Reserved-named non-parameter locals stay omitted (their
						temps are renamed by NameAst codegen)."
						(paramNames detect: [:p | p asString = each asString] ifNone: [nil]) ~~ nil ifTrue: [
							aStream
								nextPutAll: '{ ''';
								nextPutAll: each asString;
								nextPutAll: '''. ';
								nextPutAll: (fn transportParamName: each);
								nextPutAll: ' }. ']]
					ifFalse: [
						aStream
							nextPutAll: '{ ''';
							nextPutAll: each asString;
							nextPutAll: '''. ';
							nextPutAll: each asString;
							nextPutAll: ' }. ']]].
	"COMPREHENSION TARGETS LAST, so they shadow a same-named function local --
	they are the innermost scope.  Only the comprehensions this call sits
	INSIDE contribute (see ___enclosingComprehensionTargetNames___); a comp
	target is not a local of the enclosing function, so a locals() elsewhere in
	the body must not see it.  Each is a block temp of the comprehension's own
	emitted block, so the bare identifier reaches it, and ___buildLocals___:
	drops any that is still nil."
	self ___enclosingComprehensionTargetNames___ do: [:each |
		aStream
			nextPutAll: '{ ''';
			nextPutAll: each asString;
			nextPutAll: '''. ';
			nextPutAll: each asString;
			nextPutAll: ' }. '].
	aStream nextPutAll: '})'
%

category: 'Grail-Global Shadow Probe'
method: CallAst
___moduleGlobalShadowName___
	"The module-global name a bare BUILTIN call must probe before falling back to
	the direct builtins send -- or nil when no probe is needed.

	CPython's LOAD_GLOBAL reads the module's OWN globals first and only then
	builtins, so ``globals()['len'] = f'' at run time shadows the builtin for
	every function in that module.  Grail classified the name at COMPILE time and
	emitted a direct send to the builtins singleton, so a name the module did not
	assign statically could never be shadowed afterwards: the write landed in the
	namespace (``'len' in globals()'' answered true) and nothing ever consulted
	it.  test_dynamic's test_globals_shadow_builtins is exactly that case, and it
	was the one test of its family to fail -- ``builtins.len = f'' already worked,
	through builtins >> ___syncBuiltinOverride___:, which recompiles the builtins
	class's own selector surface.  That mechanism cannot serve here: the shadow
	belongs to ONE module and the builtins singleton is shared by all of them.

	A STATIC shadow needs no probe and never did: when the module assigns the
	name at top level, the name is a module global at compile time and the call
	never takes the builtin path at all.

	Declines where a probe would be wrong or redundant:
	  * outside a user module -- there is no module instance to probe, and a doit
	    has no module class at all,
	  * a top-level def of the same name, which takes the moduleSelfSend path and
	    already probes this very slot,
	  * a genuine local binding, which shadows the global outright.

	A CLASS BODY IS NOT EXCLUDED, and excluding it was this fix's first mistake.
	The module self-send twin declines there because a class method's ``self'' is
	the Python instance, not the module -- but that is an argument about the
	RECEIVER, not about whether the shadow applies, and
	___moduleStoreReceiverExpr___ already answers it.  The test that prompted all
	this, test_dynamic's test_globals_shadow_builtins, defines its function inside
	a TestCase METHOD, so a module-only probe left the real case broken while a
	module-level fixture passed."

	| nm |
	self class moduleClassBeingCompiled ifNil: [^ nil].
	(function isKindOf: NameAst) ifFalse: [^ nil].
	nm := function id.
	(self class moduleFunctionNames includes: nm) ifTrue: [^ nil].
	(function ___localBindingShadows___: nm) ifTrue: [^ nil].
	^ nm asString
%

category: 'Grail-Global Shadow Probe'
method: CallAst
printGlobalShadowProbeOn: aStream name: aName then: aBlock
	"Wrap a builtin-call emit in the runtime-globals probe:

		((self @env0:dynamicInstVarAt: #'len') isNil
			ifTrue: [ <the direct builtins send> ]
			ifFalse: [(self @env0:dynamicInstVarAt: #'len')
				@env1:___pyCallValue___: { args } kw: kw])

	NO BLOCK ACTIVATION AND NO ALLOCATION ON THE COMMON PATH.  ``ifTrue:ifFalse:''
	on literal blocks is inlined by GemStone's source compiler, so an unshadowed
	call costs one dynamicInstVarAt: probe and an isNil test on top of the send it
	already made -- this sits at the hottest emit in the language, so a shape that
	added a frame would trade recursion depth for the fix.  The module self-send
	twin (printModuleSelfSendOn:) passes its probe as a BLOCK PARAMETER; that is
	sound there and would be here too, but only because GemStone inlines a
	literal-block ``value:'' -- writing the test as a plain conditional needs no
	such guarantee.

	THE SLOT IS READ TWICE ON THE SHADOWED BRANCH, deliberately: it keeps the
	probe out of a temp (which would widen every compiled method's frame) and the
	second read only happens on the rare path that a shadow actually exists.

	The ARGUMENTS ARE PRINTED ONCE PER BRANCH, as the module self-send twin does
	and for the same reason -- only one branch runs, so each is still evaluated at
	most once.  The cost is generated SOURCE, which doubles per nested probed
	call; measured over the stdlib corpus that is a few per cent, because real
	nesting is shallow and the duplicated text is usually a bare name."

	| recv |
	"``self'' inside the module body and its top-level defs, the module singleton
	spelled out inside a user class METHOD -- where self is the Python instance.
	The same helper the ``global x'' store uses, and getting this wrong is not a
	compile error: ``self dynamicInstVarAt:'' on a Python instance simply answers
	nil, so the probe would silently never fire."
	recv := self ___moduleStoreReceiverExpr___.
	aStream nextPutAll: '(('; nextPutAll: recv.
	aStream nextPutAll: ' @env0:dynamicInstVarAt: #'''.
	aStream nextPutAll: aName.
	aStream nextPutAll: ''') isNil ifTrue: ['.
	aBlock value.
	aStream nextPutAll: '] ifFalse: [('; nextPutAll: recv.
	aStream nextPutAll: ' @env0:dynamicInstVarAt: #'''.
	aStream nextPutAll: aName.
	aStream nextPutAll: ''') @env1:___pyCallValue___: '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: '.
	self printKeywordsDictOn: aStream.
	aStream nextPutAll: '])'
%

category: 'Grail-other'
method: CallAst
printBareCallFastPathOn: aStream selector: aSelector
	"Emit a fixed-arity keyword send to the builtins instance:
		((builtins instance) funcName: arg1 _: arg2 _: arg3 ...)
	`builtins` resolves to the class via the symbol list (Python dict);
	`instance` is the env-1 class method that returns the singleton.

	Inside a user module the send is wrapped in the runtime-globals probe --
	see ___moduleGlobalShadowName___ for why CPython requires it."

	| shadow |
	shadow := self ___moduleGlobalShadowName___.
	shadow isNil ifTrue: [
		^ self printBareCallDirectOn: aStream selector: aSelector].
	^ self printGlobalShadowProbeOn: aStream name: shadow then: [
		self printBareCallDirectOn: aStream selector: aSelector]
%

category: 'Grail-other'
method: CallAst
printBareCallDirectOn: aStream selector: aSelector
	"The unconditional builtins send -- the then-branch of the probe above, and
	the whole emit where no probe applies."

	| funcName |
	funcName := function id asString.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) '.
	aStream nextPutAll: funcName; nextPut: $:; space.
	(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
	2 to: arguments size do: [:i |
		aStream nextPutAll: ' _: '.
		(arguments at: i) printSmalltalkWithParenthesisOn: aStream.
	].
	aStream nextPut: $)
%

category: 'Grail-other'
method: CallAst
printBareCallVarargsOn: aStream selector: aSelector
	"Emit a varargs send to the builtins instance:
		((builtins instance) _funcName: { arg1. arg2. } kw: kwargDict)
	The receiver method takes (positionalArray, keywordsDict) — same
	calling convention as the legacy block form, but as a real method
	with a fixed selector instead of a SymbolDictionary lookup.

	Wrapped in the runtime-globals probe inside a user module, exactly as the
	fixed-arity twin is -- ``print'' is varargs, and shadowing it from globals()
	is as legal as shadowing ``len''."

	| shadow |
	shadow := self ___moduleGlobalShadowName___.
	shadow isNil ifTrue: [
		^ self printBareCallVarargsDirectOn: aStream selector: aSelector].
	^ self printGlobalShadowProbeOn: aStream name: shadow then: [
		self printBareCallVarargsDirectOn: aStream selector: aSelector]
%

category: 'Grail-other'
method: CallAst
printBareCallVarargsDirectOn: aStream selector: aSelector
	"The unconditional varargs builtins send -- the then-branch of the probe."

	| funcName |
	funcName := function id asString.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) _'.
	aStream nextPutAll: funcName; nextPutAll: ': '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: '.
	self printKeywordsDictOn: aStream.
	aStream nextPut: $)
%

category: 'Grail-other'
method: CallAst
printKeywordsDictOn: aStream
	"Emit the kwargs expression for a varargs ``_name: ... kw: <expr>``
	call.  Three cases:

	- Empty keywords list → ``nil`` (no kwargs).
	- Exactly one **splat (KeywordAst with arg=nil) and nothing else →
	  the splatted expression directly (no wrapping dict).  This is
	  the common case ``f(*args, **kwargs)`` from forwarder patterns
	  like jinja2's NodeVisitor.visit; without this the splat would
	  be wrapped as ``{nil → kwargs}`` and the receiver would see a
	  single bogus #nil-keyed entry instead of the actual kwargs.
	- Otherwise → build a fresh KeyValueDictionary with the named
	  entries (and skip any **splat for now — multi-source merge
	  isn't modeled yet)."

	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
		^ self
	].
	(keywords size = 1 and: [keywords first name isNil]) ifTrue: [
		keywords first value printSmalltalkWithParenthesisOn: aStream.
		^ self
	].
	"Build with Python ``str'' (Smalltalk String) keys to match
	CPython's kwargs semantics — internal Grail extraction in
	FunctionDefAst's printPositionalUnpackingOn: and the kwonly
	dispatch path likewise use String lookups, and user code that
	does ``kwargs['name']'' / ``kwargs.get('name')'' sees the
	expected string keys.

	Use **KeyValueDictionary**, not IdentityKeyValueDictionary —
	identity-keyed dicts compare with ``=='', which only works for
	interned Symbol literals.  String literals are NOT interned
	(``'foo' == 'foo''' is false even though ``'foo' = 'foo''' is
	true), so a call-site ``at: 'name''' and a callee
	``includesKey: 'name''' would miss in an Identity dict.  Use
	``=''-keyed KeyValueDictionary instead.  PyDict (an ordered
	KeyValueDictionary subclass) so **kwargs / dict(**kw) preserve
	keyword order (docs/Ordered_Dict.md)."
	aStream nextPutAll: '((PyDict @env0:new)'.
	keywords do: [:kwAst |
		kwAst name
			ifNotNil: [
				aStream nextPutAll: ' @env0:at: '''; nextPutAll: kwAst name asString; nextPutAll: ''' put: '.
				kwAst value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $;.
			]
			ifNil: [
				"``**splat'' mixed with named kwargs — merge the mapping's
				items via update: (source order, later entries win).
				flask's ``Rule(rule, methods=methods, **options)'' dropped
				the ``**options'' here, so the rule endpoint came back nil."
				aStream nextPutAll: ' @env1:update: '.
				kwAst value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $;.
			].
	].
	aStream nextPutAll: ' yourself)'.
%

category: 'Grail-other'
method: CallAst
printArgumentsArrayOn: aStream
	"Emit the positional arguments as a Smalltalk Array expression
	suitable for ``@env1:value:value:``.  In the common case (no
	``*x`` splat among the args) this is a brace literal
	``{a. b. c.}``.  When any argument is a StarredAst, splice its
	value's ``asArray`` into the list via ``,`` concatenation
	(grouping consecutive non-starred args into sub-array literals
	to keep the output compact).  Without this the StarredAst stub
	emitted a runtime TypeError that fired the moment Python source
	used ``f(*args)`` — pervasive in the jinja2 visitor pattern."

	| hasStar |
	hasStar := arguments anySatisfy: [:each | each isKindOf: StarredAst].
	hasStar ifFalse: [
		aStream nextPutAll: '{ '.
		arguments do: [:each |
			each printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $.; space.
		].
		aStream nextPutAll: '}'.
		^ self
	].
	"Splat path: emit ``({a. b.} @env0:, (splat @env0:asArray) @env0:, {c.})``.
	Inject an empty seed so the result is always parenthesized.
	``@env0:,`` dispatches the env-0 Array concatenation; bare ``,``
	would resolve to env-1 where Array has no comma method."
	aStream nextPutAll: '({} '.
	arguments do: [:each |
		aStream nextPutAll: '@env0:, '.
		(each isKindOf: StarredAst)
			ifTrue: [
				aStream nextPut: $(.
				each value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' @env0:___pyStarToArray___) '.
			] ifFalse: [
				aStream nextPutAll: '{ '.
				each printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. } '.
			].
	].
	aStream nextPut: $).
%

category: 'Grail-other'
method: CallAst
printArityMismatchErrorOn: aStream forName: aSymbol
	"Emit a TypeError raise expression for a call to a known builtin
	whose arity or kwarg shape does not match any installed selector.
	The compiled code, when executed, raises a Python TypeError that
	identifies the call site cleanly.

	See docs/Rewrite_Dispatch_Model.md. Without this branch, calls like
	`abs(1, 2)` would fall through to the legacy bare-name form and
	(with `builtins` no longer in the symbol list) produce a confusing
	GemStone `undefined symbol abs` compile error. Instead they produce
	a Python TypeError describing the mismatch.

	The message includes the function name, the positional arg count,
	and the keyword arg count, but not the expected arity (computing
	that would require enumerating all selectors on builtins matching
	the base name)."

	aStream nextPutAll: '(TypeError ___signal___: '''.
	aStream nextPutAll: (self ___arityMismatchMessageFor___: aSymbol).
	aStream nextPutAll: ''')'
%

category: 'Grail-other'
method: CallAst
___arityMismatchMessageFor___: aSymbol
	"The message text alone, shared with the IR twin.

	SPLIT OUT so the two paths cannot drift.  The IR emit spells this same
	raise as one send carrying one literal, and the literal has to be the
	text's byte for byte -- test_asyncgen asserts on the TypeError's text, so
	a divergence here would be a wrong answer rather than a cosmetic one."

	^ aSymbol asString , '() takes wrong number of arguments ('
		, arguments size printString , ' positional, '
		, keywords size printString , ' keyword) - no matching method'
%

! ===============================================================================
! Class-call fast path
! ===============================================================================
! When a bare name resolves (via the Python dictionary) to a GemStone class —
! e.g. `bool` → Boolean, `int` → Integer, `str` → Unicode7, `object` → Object,
! `range` → Interval — emit a direct env-1 `__new__` send instead of the legacy
! `cls value: { args } value: kw` form. The legacy form would signal
! MessageNotUnderstood on plain GemStone classes.
!
! Eligibility filters out `module` subclasses — those have their own dispatch
! paths. User-defined Python classes (Phase 5c) are real Object subclasses that
! also have `__new__` selectors and so go through this same fast path.
! ===============================================================================

category: 'Grail-Class-Call Fast Path'
method: CallAst
bareCallClassNewSelector
	"Return the env-1 `__new__` selector to use for a class-call fast path,
	or nil if not eligible.

	Eligibility:
	  * `function` is a `NameAst` (bare name like `bool`, not `obj.method`).
	  * No keyword arguments (kwargs class calls are not yet supported here
	    — none of the installed `__new__` methods take a `:kw:` form).
	  * The name is not shadowed by an enclosing-scope local.
	  * The name resolves in the Python dictionary to a class that is NOT
	    a `module` subclass (those use the module/attribute-call paths).
	  * The class implements the env-1 selector matching the call arity:
	      0 args → #__new__
	      1 arg  → #'__new__:'
	      N args → #'__new__:' followed by (N-1) `_:` keywords."

	| funcName cls candidate |
	(function isKindOf: NameAst) ifFalse: [^nil].
	keywords isEmpty ifFalse: [^nil].
	"A ``*args'' splat makes the arity unknown at compile time, so a fixed-arity
	``__new__:_:…'' selector cannot represent the call -- decline (like
	bareCallFastPathSelector) so it falls through to the generic
	``value: {args} value: kw'' form, whose printArgumentsArrayOn: splices the
	splat.  Without this ``range(*slice.indices(n))'' emitted the StarredAst
	stub's ``*-unpack not supported'' TypeError (test_slice test_indices)."
	self hasStarredArgument ifTrue: [^nil].
	funcName := function id.
	"Precise LEGB shadow check (see NameAst>>___pythonBindingShadows___:)
	 rather than the over-approximating isVariableIsDeclared: variables
	 walk -- a mere comprehension target elsewhere in the function must
	 not suppress this dispatch (the fallback emits a bare temp that is
	 nil outside the comprehension)."
	(function ___pythonBindingShadows___: funcName) ifTrue: [^nil].
	cls := self class resolveClassForName: funcName.
	cls ifNil: [^nil].
	"``bool(x)'' is TRUTH TESTING, and stays so even when x is a class
	object -- ``bool(dict)'' is True (test_bool.py test_types).  But
	Grail names constructor selectors by arity, so the emitted
	``__new__:'' would be the very selector CPython's allocation form
	``bool.__new__(bool)'' uses, where a leading ``bool'' IS the target
	class and the result is False (test_bool.py test_bool_new).  The two
	readings are indistinguishable once both are one-argument sends, so
	split them here: a literal call site emits the unambiguous
	``___truthOf___:'', leaving ``__new__:'' to mean allocation.
	Boolean class>>value:value: makes the same split for the indirect
	``f = bool; f(x)'' form."
	(cls == Boolean and: [arguments size = 1]) ifTrue: [^ #'___truthOf___:'].
	candidate := self class classNewSelectorForArity: arguments size.
	"Walk the metaclass chain so inherited __new__ methods are found
	(e.g. `set` inherits __new__ from frozenset). Direct method-dict
	lookup misses inherited selectors."
	(cls class whichClassIncludesSelector: candidate environmentId: 1)
		ifNil: [^nil].
	^ candidate
%

category: 'Grail-Class-Call Fast Path'
method: CallAst
knownClassName
	"Return the function name as a Symbol if it resolves to an eligible
	class with at least one env-1 `__new__` selector (any arity), or nil.

	Used for the class-call arity mismatch error: a call with the wrong
	number of arguments (or kwargs) to a known class generates a clean
	Python TypeError instead of falling through to the broken legacy
	`cls value: { args } value: kw` path.

	When kwargs are present at the call site AND the class implements
	a varargs ``_new:kw:`` (or ``___new__:kw:``) entry point, return
	nil so the legacy ``value:value:`` form fires — Object class's
	``value:value:`` routes kwargs-bearing class calls through
	``_new:kw:``.  Without this, ``dict(*args, **kwargs)`` would
	trip the arity-mismatch error even though dict.class has
	``_new:kw:``."

	| funcName cls metacls |
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	"Precise LEGB shadow check (see NameAst>>___pythonBindingShadows___:)
	 rather than the over-approximating isVariableIsDeclared: variables
	 walk -- a mere comprehension target elsewhere in the function must
	 not suppress this dispatch (the fallback emits a bare temp that is
	 nil outside the comprehension)."
	(function ___pythonBindingShadows___: funcName) ifTrue: [^nil].
	cls := self class resolveClassForName: funcName.
	cls ifNil: [^nil].
	metacls := cls class.
	keywords isEmpty ifFalse: [
		((metacls whichClassIncludesSelector: #'_new:kw:' environmentId: 1) notNil
			or: [(metacls whichClassIncludesSelector: #'___new__:kw:' environmentId: 1) notNil])
				ifTrue: [^nil].
	].
	"Walk the metaclass chain (inherited __new__ counts)."
	(metacls whichClassIncludesSelector: #__new__ environmentId: 1)
		ifNotNil: [^funcName].
	(metacls whichClassIncludesSelector: #'__new__:' environmentId: 1)
		ifNotNil: [^funcName].
	(metacls whichClassIncludesSelector: #'__new__:_:' environmentId: 1)
		ifNotNil: [^funcName].
	(metacls whichClassIncludesSelector: #'__new__:_:_:' environmentId: 1)
		ifNotNil: [^funcName].
	^ nil
%

category: 'Grail-Class-Call Fast Path'
method: CallAst
___hasVarargsClassConstructor___
	"True if the call's bare-name receiver resolves to a class with
	a varargs ``_new:kw:'' or ``___new__:kw:'' entry on its metaclass.
	Used by the knownBuiltinName deferral path: if the name is BOTH a
	builtin (with a fixed-arity selector that doesn't match the call's
	arity) AND a class with a varargs constructor, defer to the legacy
	``value:value:'' form so the call reaches the constructor."

	| funcName cls metacls |
	(function isKindOf: NameAst) ifFalse: [^ false].
	funcName := function id.
	cls := self class resolveClassForName: funcName.
	cls ifNil: [^ false].
	metacls := cls class.
	^ (metacls whichClassIncludesSelector: #'_new:kw:' environmentId: 1) notNil
		or: [(metacls whichClassIncludesSelector: #'___new__:kw:' environmentId: 1) notNil
		or: [(metacls whichClassIncludesSelector: #'value:value:' environmentId: 1) notNil]]
%

category: 'Grail-Class-Call Fast Path'
classmethod: CallAst
resolveClassForName: aReceiverName
	"Return the GemStone class registered under `aReceiverName` in the
	Python dictionary that is eligible for class-call `__new__` dispatch,
	or nil. Excludes `module` subclasses (handled by the module-call
	paths). Non-Behavior values (like `True` → true, `None` → nil) and
	missing entries return nil."

	| candidate |
	candidate := Python at: aReceiverName ifAbsent: [^nil].
	(candidate isKindOf: Behavior) ifFalse: [^nil].
	(candidate inheritsFrom: module) ifTrue: [^nil].
	candidate == module ifTrue: [^nil].
	^ candidate
%

category: 'Grail-Class-Call Fast Path'
classmethod: CallAst
classNewSelectorForArity: nargs
	"Build the env-1 `__new__` selector for a class call with `nargs`
	positional arguments:
	  0 args → #__new__
	  1 arg  → #'__new__:'
	  N args → #'__new__:' followed by (N-1) `_:` keywords."

	| sb |
	nargs = 0 ifTrue: [^ #__new__].
	sb := AppendStream on: String new.
	sb nextPutAll: '__new__:'.
	2 to: nargs do: [:i | sb nextPutAll: '_:'].
	^ sb contents asSymbol
%

category: 'Grail-Class-Call Fast Path'
method: CallAst
printBareCallClassNewOn: aStream selector: aSelector
	"A class call takes the SAME runtime-globals probe its function siblings
	take.  CPython's LOAD_GLOBAL reads the module's own globals before
	builtins, so ``tuple = lambda x: 'tuple''' at module level shadows the type
	for every call in that module -- and the fixed-arity and varargs builtin
	paths already probe for exactly that (___moduleGlobalShadowName___).  This
	one did not, so of ``all(...)'', ``any(...)'' and ``tuple(...)'' the first
	two honoured the shadow and the third quietly built a real tuple.
	test_builtin's test_all_any_tuple_optimization overrides all three together
	and compares the three answers, which is how the odd one out shows."

	| shadow |
	shadow := self ___moduleGlobalShadowName___.
	shadow isNil ifTrue: [
		^ self printBareCallClassNewDirectOn: aStream selector: aSelector].
	^ self printGlobalShadowProbeOn: aStream name: shadow then: [
		self printBareCallClassNewDirectOn: aStream selector: aSelector]
%

category: 'Grail-other'
method: CallAst
printBareCallClassNewDirectOn: aStream selector: aSelector
	"The unconditional class-call fast path -- the then-branch of the probe:
	  0-arg: `(cls @env1:__new__)`
	  1-arg: `(cls @env1:__new__: arg)`
	  N-arg: `(cls @env1:__new__: arg1 _: arg2 _: ...)`

	Receiver is the bare class name (`function id`); the symbol-list lookup
	at compile time resolves it to the appropriate GemStone class."

	| funcName nargs base colonIdx |
	funcName := function id asString.
	nargs := arguments size.
	"Emit the selector bareCallClassNewSelector actually chose instead of
	hard-coding ``__new__''.  It is ``__new__'' for every class but bool,
	which is routed to ``___truthOf___:'' so that a one-argument call site
	cannot be mistaken for CPython's ``bool.__new__(bool)'' allocation
	form (see bareCallClassNewSelector).  Only the base name is taken
	here; the ``: arg _: arg'' tail below already encodes the arity."
	base := aSelector asString.
	colonIdx := base indexOf: $:.
	colonIdx > 0 ifTrue: [base := base copyFrom: 1 to: colonIdx - 1].
	aStream nextPut: $(.
	aStream nextPutAll: funcName.
	aStream nextPutAll: ' @env1:'; nextPutAll: base.
	nargs = 0 ifTrue: [
		aStream nextPut: $).
		^ self
	].
	aStream nextPut: $:; space.
	(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
	2 to: nargs do: [:i |
		aStream nextPutAll: ' _: '.
		(arguments at: i) printSmalltalkWithParenthesisOn: aStream.
	].
	aStream nextPut: $)
%

! ===============================================================================
! Module self-send fast path
! ===============================================================================
! When compiling a user Python module (loadModuleFromPath:), top-level `def`
! statements become real methods on the module class. Bare-name calls to those
! functions compile as `self name: arg` instead of block `value:value:` dispatch.
!
! `moduleClassBeingCompiled` holds the module class during codegen (nil otherwise).
! `moduleFunctionNames` holds an IdentitySet of function name Symbols that will
! be compiled as methods, so CallAst can emit self-sends without checking the
! method dict (which may not be fully populated yet during codegen).
! ===============================================================================

category: 'Grail-Module Compile Context'
classmethod: CallAst
___compileContext___
	"SESSION-LOCAL storage backing every compile-context accessor below.
	These were class instVars, but CallAst is a COMMITTED class: writing
	its class instVars during ANY module compile dirtied the class object
	in the session's transaction, so any two sessions that each compiled
	some Python and later committed -- unrelated application data, the
	canonical flag irrelevant -- took a write-write commit conflict on
	``CallAst class`` (measured by tests/scripts/
	run_concurrent_import_test.sh; the session-state refactor had
	deferred exactly this).  Compile context is inherently per-session:
	it is set and cleared around each compile and never belongs in the
	committed graph."

	| ctx |
	ctx := SessionTemps current at: #'GrailCompileContext' otherwise: nil.
	ctx isNil ifTrue: [
		ctx := KeyValueDictionary new.
		SessionTemps current at: #'GrailCompileContext' put: ctx].
	^ ctx
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleClassBeingCompiled
	^ self ___compileContext___ at: #'moduleClassBeingCompiled' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleClassBeingCompiled: aClassOrNil
	self ___compileContext___ at: #'moduleClassBeingCompiled' put: aClassOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleBodyBeingCompiled
	"True while the MODULE BODY itself is being emitted, as opposed to a
	function compiled out of it.

	``functionBeingCompiled'' answers the enclosing def and is nil at module
	scope, which is exactly the test every traceback emit used for ``is there a
	___curPos___ temp to store into''.  There is one at module scope now -- the
	body's ``initialize'' declares it -- so the two questions have come apart,
	and this one answers the second."

	^ (self ___compileContext___ at: #'moduleBodyBeingCompiled' otherwise: false) == true
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleBodyBeingCompiled: aBoolean
	self ___compileContext___ at: #'moduleBodyBeingCompiled' put: aBoolean
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
futureAnnotations
	"True while compiling a module that begins ``from __future__ import
	annotations''.  PEP 563 still governs such a module in 3.14: a class's and
	the module's __annotations__ are SOURCE STRINGS, stored eagerly, with
	__annotate__ None; a function's annotate function answers strings.
	Measured on CPython 3.14.6.  Grail treated the import as a no-op, which went
	unnoticed while class annotations were strings for every module."

	^ (self ___compileContext___ at: #'futureAnnotations' otherwise: false) == true
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
futureAnnotations: aBoolean
	self ___compileContext___ at: #'futureAnnotations' put: aBoolean
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
curPosLiteralInEffect
	"The Smalltalk source text of the ``___curPos___ :='' store most recently
	EMITTED at the current point in the output, or nil before the first one.

	Grail recovers a frame's position by scanning the generated source backwards
	from the ip for the last such store (BaseException class >>
	___derivePythonSpanForMethod___:ip:), so the store in effect is a property of
	the TEXT, not of the runtime.  A node that emits a store INSIDE a Smalltalk
	block -- which is a separate frame, with its own position -- has to put the
	enclosing store back afterwards or every later ip in the enclosing frame
	scans back to the block's store instead.  LambdaAst is the one such emitter;
	this is what lets it restore what it displaced.

	Tracked here rather than recomputed from the parent chain because For, With
	and the ``except*'' finish all REFINE the statement's store with a narrower
	span, and the restore has to reinstate whichever of those is actually
	standing."

	^ self ___compileContext___ at: #'curPosLiteralInEffect' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
curPosLiteralInEffect: aStringOrNil
	self ___compileContext___ at: #'curPosLiteralInEffect' put: aStringOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleNameBeingCompiled
	"The Python name of the module being compiled ('collections.abc'), or nil
	outside a module compilation.

	The module CLASS alone does not answer this: its Smalltalk name is mangled
	from the dotted Python one.  FunctionDefAst stamps it onto a closure's
	__module__, which a closure otherwise cannot know -- a module-level def is a
	BoundMethod and gets its module by forwarding to the receiving module, and
	that route does not exist for a block."

	^ self ___compileContext___ at: #'moduleNameBeingCompiled' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleNameBeingCompiled: aStringOrNil
	self ___compileContext___ at: #'moduleNameBeingCompiled' put: aStringOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
functionBeingCompiled
	"The FunctionDefAst whose body is currently being emitted (nil at
	module body scope).  Set/restored by FunctionDefAst >> printBodyOn:
	so nested defs see their own scope.  Used by the locals() rewrite."

	^ self ___compileContext___ at: #'functionBeingCompiled' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
functionBeingCompiled: aFunctionDefAstOrNil
	self ___compileContext___ at: #'functionBeingCompiled' put: aFunctionDefAstOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleFunctionNames
	^ self ___compileContext___ at: #'moduleFunctionNames' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleFunctionNames: aSetOrNil
	self ___compileContext___ at: #'moduleFunctionNames' put: aSetOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleVariableNames
	"Phase A: IdentitySet of Symbol names declared in the module body's
	BlockAst (excluding function names — those are in moduleFunctionNames).
	NameAst / AssignAst / DeleteAst consult this to discriminate
	module-scope names (route through dynamicInstVarAt:) from
	function-local names (emit bare identifier as a Smalltalk temp)."

	^ self ___compileContext___ at: #'moduleVariableNames' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleVariableNames: aSetOrNil
	self ___compileContext___ at: #'moduleVariableNames' put: aSetOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleClassNames
	"IdentitySet of the names bound by module-level ``class'' statements of the
	module being compiled (set by importlib next to moduleVariableNames), or nil.
	Read by ___directCallSelector___: a bare-name receiver that is one of these is
	a CLASS, whose class-side data-attribute accessors a direct keyword send must
	not reach."

	^ self ___compileContext___ at: #'moduleClassNames' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleClassNames: aSetOrNil
	self ___compileContext___ at: #'moduleClassNames' put: aSetOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleImportNames
	"IdentitySet of the names bound by import statements at module scope of the
	module being compiled (set by importlib), or nil.  Read by
	___receiverIsImportBound___: -- exclusion 6 of ___directCallSelector___."

	^ self ___compileContext___ at: #'moduleImportNames' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleImportNames: aSetOrNil
	self ___compileContext___ at: #'moduleImportNames' put: aSetOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
classBodyDecoratorScope
	"Set only while a CLASS-BODY METHOD DECORATOR expression is being
	emitted: an Association of the class's Smalltalk name -> the IdentitySet
	of names its class body binds as defs.

	A decorator can name a SIBLING of the def it decorates -- that is the
	whole shape of ``@t.register(int)'' under functools.singledispatchmethod,
	and of a hand-rolled registry decorator.  In CPython the class body is a
	namespace and ``t'' is a local in it; Grail has no class-body namespace,
	so a bare name there otherwise falls all the way through to the module
	and raises NameError.  The decorator application is wrapped in a handler
	(see FunctionDefAst >> printMethodDecoratorsOn:decorators:className:), so
	the failure was silent: the decorator simply never took effect.

	While this is set, NameAst resolves such a name off the CLASS instead,
	which is where the class body's bindings actually live.  Names that are
	not in the set are unaffected -- ``@functools.singledispatchmethod'' still
	resolves ``functools'' as the module global it is."

	^ self ___compileContext___ at: #'classBodyDecoratorScope' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
classBodyDecoratorScope: anAssociationOrNil
	self ___compileContext___ at: #'classBodyDecoratorScope' put: anAssociationOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
sourcePath
	"The filesystem path of the module being compiled, or nil when there is no
	file behind it (exec / eval / the REPL doit path).

	Read by the emitters that stamp a PyCode, so ``co_filename'' can be the
	real path instead of the ``'<grail>''' placeholder.  A code object's
	filename is what linecache keys on, so a real path is what makes
	``FrameSummary.line'' -- the SOURCE TEXT of a traceback line -- possible at
	all; §9 of docs/Python_Traceback_Design.md has the reasoning.

	Set for the duration of ___buildModuleClass:name:, which is the single
	seam where a ModuleAst carrying a path reaches codegen.  Nil elsewhere, so
	the placeholder remains for genuinely file-less code."

	^ self ___compileContext___ at: #'sourcePath' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
sourcePath: aStringOrNil
	self ___compileContext___ at: #'sourcePath' put: aStringOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
returnEmitMode
	"How ReturnAst should emit Python ``return value'' statements:

	  #direct    — emit ``^ value.''.  Used inside real Smalltalk
	               methods (top-level defs, class instance methods,
	               @classmethod/@staticmethod) where the enclosing
	               activation IS the function the return targets.
	               The Smalltalk non-local-return semantics escape
	               out of nested blocks (if/while/for) back to the
	               method, matching Python's return.

	  #exception — emit ``PythonReturn ___signal___: value.''.  Used
	               inside block-form bodies (nested def closures,
	               generator coroutines) where ``^'' would target
	               the wrong activation.  A surrounding
	               ``[ ... ] on: PythonReturn do: [...]'' handler
	               catches and yields the return value as the
	               block's value.

	Defaults to #exception when nil — preserves the historical
	behaviour for eval/exec doits and any caller that doesn't push
	a mode before invoking ReturnAst codegen."

	^ self ___compileContext___ at: #'returnEmitMode' otherwise: nil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
returnEmitMode: aSymbolOrNil
	self ___compileContext___ at: #'returnEmitMode' put: aSymbolOrNil
%

! ===============================================================================
! Class method compile context
! ===============================================================================

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBeingCompiled
	^ self ___compileContext___ at: #'classBeingCompiled' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBeingCompiled: aClassOrNil
	self ___compileContext___ at: #'classBeingCompiled' put: aClassOrNil
%

! ===============================================================================
! Lexical scope stack -- the enclosing-scope chain __qualname__ needs
! ===============================================================================

category: 'Grail-Lexical Scope Stack'
classmethod: CallAst
___scopeStack___
	"The chain of PYTHON LEXICAL SCOPES enclosing the node being emitted,
	outermost first, as { node. kind. name } triples whose kind is #class or
	#function.  nil until the first push.

	``classBeingCompiled'' and ``functionBeingCompiled'' hold ONE value each, so
	between them they can name at most the nearest enclosing class and the
	nearest enclosing def -- a one-level __qualname__ and no more, which is why
	``def a(): def b(): def c()'' reported ``b.<locals>.c'' where CPython says
	``a.<locals>.b.<locals>.c''.

	Worse for a CLASS, and not merely incomplete: ClassDefAst sets
	classBeingCompiled to ITSELF before its body is emitted, so a class asking
	``what encloses me?'' reads its own name.  The NODE IDENTITY in each frame is
	what fixes that -- a reader stops at its OWN frame instead of trusting the
	top of the stack to belong to someone else.

	Pushed exactly where those two slots are already saved and restored --
	ClassDefAst around both of its emit regions, FunctionDefAst around each body
	emit -- so the stack cannot come to disagree with them about what is in
	scope.  Lambdas and comprehensions are NOT pushed: CPython does give them
	scopes (``f.<locals>.<lambda>''), but neither can lexically contain a def or
	a class, so no qualname is ever computed inside one."

	^ self ___compileContext___ at: #'scopeStack' otherwise: nil
%

category: 'Grail-Lexical Scope Stack'
classmethod: CallAst
___pushScope___: aNode kind: aKindSymbol name: aName
	"Push aNode's scope frame; answer the depth to restore to afterwards.

	The answer is the depth BEFORE the push, and ___restoreScopeDepth___:
	TRUNCATES rather than popping one frame.  An ensure: that popped blindly
	would leave the stack permanently wrong if any nested emit between the two
	ever went unbalanced, and the compile context is SESSION-local -- so the
	damage would follow the session into every later compile rather than ending
	with the module that caused it."

	| stack depth |
	stack := self ___scopeStack___.
	stack == nil ifTrue: [
		stack := OrderedCollection new.
		self ___compileContext___ at: #'scopeStack' put: stack].
	depth := stack size.
	stack addLast: (Array with: aNode with: aKindSymbol with: aName asString).
	^ depth
%

category: 'Grail-Lexical Scope Stack'
classmethod: CallAst
___restoreScopeDepth___: anInteger
	"Drop every frame above anInteger.  See ___pushScope___:kind:name:."

	| stack |
	stack := self ___scopeStack___.
	stack == nil ifTrue: [^ self].
	[stack size > anInteger] whileTrue: [stack removeLast]
%

category: 'Grail-Lexical Scope Stack'
classmethod: CallAst
___qualnamePrefixBefore___: aNode
	"CPython's dotted __qualname__ prefix for the scopes lexically enclosing
	aNode, or nil when nothing does.

	CPython names each enclosing scope in turn, outermost first, and inserts
	``<locals>'' after any scope that is a FUNCTION.  A class body is not a
	function scope, which is exactly why ``class A: class B'' is ``A.B'' while
	``def f(): class B'' is ``f.<locals>.B''.

	Stops at aNode's OWN frame, so the answer is the same whether the caller runs
	before its node has pushed (the def-time __qualname__ stamp) or during its
	own body emit (the arity-error message baked into that body)."

	| stack out |
	stack := self ___scopeStack___.
	stack == nil ifTrue: [^ nil].
	out := nil.
	stack do: [:frame |
		(frame at: 1) == aNode ifTrue: [^ out].
		"A ``global''-declared def is a ROOT, so everything nested inside it is
		named from IT and not from the scopes it happens to be written in.
		``def f(): global g; def g(): def h()'' gives h the qualname
		``g.<locals>.h'' in CPython, never ``f.<locals>.g.<locals>.h'': the
		declaration binds g at module level, and a qualname describes where a
		name LIVES rather than where its source sits.  Dropping what came
		before is the whole content of that rule."
		(self ___isGlobalDeclaredScope___: (frame at: 1)) ifTrue: [out := nil].
		out := out == nil
			ifTrue: [(frame at: 3) asString]
			ifFalse: [out , '.' , (frame at: 3) asString].
		(frame at: 2) == #function ifTrue: [out := out , '.<locals>']].
	^ out
%

category: 'Grail-Lexical Scope Stack'
classmethod: CallAst
___isGlobalDeclaredScope___: aNode
	"Is aNode a def or class whose own name its ENCLOSING scope declares
	``global''?

	Such a name binds at module level, so CPython gives it the bare qualname it
	would have had at module scope -- test_funcattrs' test___qualname__ asserts
	``inner_global_function.__qualname__ == 'inner_global_function''' for a def
	nested two functions deep, and Grail answered
	``global_function.<locals>.inner_function.<locals>.inner_global_function''.

	THE ENCLOSING SCOPE IS THE ONE THAT DECLARES, not this one: ``global g''
	appears in the body that CONTAINS ``def g'', which is why this looks at the
	nearest enclosing def-or-class rather than at aNode's own body.  Reaching the
	module without finding one answers false, and correctly: at module level the
	qualname is already bare, so there is nothing for the rule to change.

	Answers false for any node without a name or body to ask about, so the caller
	can hand it every frame on the stack without screening first."

	| nm node |
	nm := [aNode name] on: MessageNotUnderstood do: [:e | e return: nil].
	nm == nil ifTrue: [^ false].
	node := aNode parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: ClassDefAst])
			ifTrue: [
				| names |
				names := [node body globalNames]
					on: MessageNotUnderstood do: [:e | e return: nil].
				^ names notNil and: [names includes: nm asSymbol]].
		node := node parent].
	^ false
%

category: 'Grail-Lexical Scope Stack'
classmethod: CallAst
___qualnameFor___: aNode name: aName
	"aNode's CPython __qualname__: the enclosing-scope prefix, then its own name.

	One method for both ClassDefAst and FunctionDefAst.  They must agree by
	construction rather than by coincidence -- a class's qualname is the prefix
	its methods' qualnames are built from (BoundMethod >> __qualname__ reads the
	defining class's), and test_keywordonlyarg builds its expected arity-error
	text out of ``f.__qualname__''."

	| prefix |
	"Its own name declared ``global'' one scope out makes it a module-level
	binding, hence a bare qualname.  Checked HERE as well as in the prefix walk
	because at stamp time this node has not pushed its own frame yet, so the walk
	never reaches it -- the walk's copy of the rule is what roots the defs NESTED
	inside it, and this one is what names it."
	(self ___isGlobalDeclaredScope___: aNode) ifTrue: [^ aName asString].
	prefix := self ___qualnamePrefixBefore___: aNode.
	^ prefix == nil
		ifTrue: [aName asString]
		ifFalse: [prefix , '.' , aName asString]
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___classBeingCompiledVar___
	"The Smalltalk IDENTIFIER that currently holds the class being defined --
	the receiver to emit when a class-body statement reads a sibling name off
	its own class.

	``classBeingCompiled'' itself stays the PYTHON name and must: it is
	compared against source identifiers (``super(C, self)'' matches the class
	by name), it keys the ``___cell_<name>___'' captured-class store, and it is
	the attribute selector on the module instance.  Only the uses where it
	appears as a Smalltalk VARIABLE go through here, so the six pseudo-
	variable names (``self'', ``super'', ``nil'', ``true'', ``false'',
	``thisContext'') travel under the same ``_<name>'' transport that
	ClassDefAst >> ___stVarName___ declares and NameAst already reads."

	| n |
	n := self classBeingCompiled.
	n == nil ifTrue: [^ nil].
	^ NameAst ___transportIdentifierFor___: n asSymbol
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCellRebindable
	"Can the class being compiled have its ``__class__'' cell rebound?

	False for every class in the corpus but the ones test_super writes, and
	that is the point: when it is false, ``__class__'' and zero-argument
	``super()'' emit the class expression directly, exactly as before.  When it
	is true they read through the cell, which is one extra send on what is
	otherwise the hottest path Grail generates.

	Set by ClassDefAst from a subtree walk before any method source is
	generated -- see ___classCellIsRebindable___."

	^ (self ___compileContext___ at: #'classCellRebindable' otherwise: false) == true
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCellRebindable: aBoolOrNil
	self ___compileContext___ at: #'classCellRebindable' put: aBoolOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___printClassCellReadOn___: aStream around: aBlock
	"Emit the class expression aBlock writes, wrapped in the cell read when this
	class's cell can be rebound.

	One place, so the bare-name ``__class__'' read and the zero-argument
	``super()'' rewrite -- which build their class expressions in different
	methods -- cannot end up disagreeing about whether the cell matters."

	^ self ___printClassCellReadOn___: aStream
		selector: '___grailClassCellValue___'
		around: aBlock
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___printClassCellReadOn___: aStream selector: aSelectorString around: aBlock
	"As above, but naming which cell READER to go through.

	A bare ``__class__'' and a zero-argument ``super()'' read the same cell and
	must part company on one state only: EMPTY.  CPython answers the bare read
	with NameError about an unbound free variable and the super() with
	RuntimeError naming the precondition, so one accessor cannot serve both.
	Everything else about the two reads stays shared, which is the point of
	routing them through one method."

	self classCellRebindable ifFalse: [^ aBlock value].
	aStream nextPutAll: '('.
	aBlock value.
	aStream nextPutAll: ' @env1:'; nextPutAll: aSelectorString; nextPutAll: ')'
%

category: 'Grail-Class Compile Context'
method: CallAst
___superArgZeroGuardName___
	"The Smalltalk temp holding argument 0 of the def this ``super()'' sits in,
	or nil when there is nothing a ``del'' could have cleared.

	CPython's precondition 2 tests ``localsplus[0] == NULL''.  Grail's equivalent
	is exact rather than analogous: a def copies each parameter into a temp
	(``x := _x'') and DeleteAst compiles ``del x'' to ``x := nil'', which is the
	very state NameAst's load guard tests to raise UnboundLocalError.

	Answers nil in the one case where the parameter is NOT a temp: a method's own
	first parameter is the Smalltalk RECEIVER, which no ``del'' can nil, so
	testing it would be dead code.  ``isSelfReference:'' is the same predicate
	NameAst uses to decide that rather than a copy of the rule -- and a def NESTED
	in a method has an ordinary temp, so it DOES get the test."

	| fn nm |
	fn := CallAst functionBeingCompiled.
	fn == nil ifTrue: [^ nil].
	nm := fn ___receiverParamName___.
	nm == nil ifTrue: [^ nil].
	(CallAst isSelfReference: nm asSymbol) ifTrue: [^ nil].
	^ NameAst ___transportIdentifierFor___: nm asSymbol
%

category: 'Grail-Class Compile Context'
method: CallAst
___printShadowableSuperOn___: aStream arm: aBlock
	"Wrap a zero-argument ``super()'' emit in the run-time shadow probe.

	``___superNameIsShadowed___'' reads the parser's record of the module BODY,
	so it cannot see a name bound on the module AFTER that body compiled --
	``mock.patch(f'{__name__}.super', MySuper)'', which is test_super's
	test_shadowed_dynamic.  Probing for it and calling the replacement with the
	zero arguments the source wrote is the run-time half of the same rule.

	Written as ``[:___sup___ | ...] @env0:value: <probe>'' so the probe is
	evaluated ONCE and both arms can name it; the arms use
	``== nil ifTrue:ifFalse:'' rather than ifNil:ifNotNil: because that is the
	form the generated env-1 code already relies on being compiler-inlined.

	Shared by all four emits -- the proxy and the three precondition errors --
	because a replacement ``super'' is entitled to take the call even where the
	builtin would have refused it.  Raising past the probe would make patching
	work only for the calls that were going to succeed anyway."

	aStream nextPutAll: '([:___sup___ | ___sup___ == nil ifTrue: ['.
	aBlock value.
	aStream
		nextPutAll: '] ifFalse: [___sup___ @env1:value: { } value: nil]] @env0:value: ((';
		nextPutAll: CallAst moduleClassBeingCompiled name;
		nextPutAll: ' @env0:___instance___) @env1:___grailShadowedSuper___))'
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCellMethodNames
	"The class-body defs whose bodies referenced ``__class__'' -- by name or
	through a zero-arg ``super()''.  The PER-METHOD companion of
	classNeedsClassCell, which answers the same question for the class as a
	whole.

	CPython gives a method a closure over the class cell only when that method
	asked for it: ``WithClassRef.f.__closure__'' is a one-tuple and
	``WithClassRef.g.__closure__'' is None, for two methods of the same class.
	The class-wide flag cannot tell them apart, so ``__closure__'' would have
	had to answer the same thing for both -- right for the test that motivated
	it and wrong for every other method on the class."

	^ self ___compileContext___ at: #'classCellMethodNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCellMethodNames: aSetOrNil
	self ___compileContext___ at: #'classCellMethodNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___recordClassCellMethod___
	"Note that the def currently being emitted closes over the class cell.

	Recorded against the CLASS-BODY-LEVEL def, not the innermost one: a nested
	function that reads ``__class__'' makes the method containing it close over
	the cell too, which is what ``__closure__'' is asked about.  Silently does
	nothing outside a class body, where there is no method to attribute it to."

	| names node last |
	names := self classCellMethodNames.
	names == nil ifTrue: [^ self].
	node := self functionBeingCompiled.
	last := nil.
	[node notNil] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [
			last == nil ifTrue: [^ self].
			names add: last ___mangledName___ asSymbol.
			^ self].
		(node isKindOf: FunctionDefAst) ifTrue: [last := node].
		node := node parent].
	^ self
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classFunctionNames
	^ self ___compileContext___ at: #'classFunctionNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
inBasesEmit
	^ self ___compileContext___ at: #'inBasesEmit' otherwise: nil
%

category: 'Grail-Compile Context'
classmethod: CallAst
inDecoratorEmit
	"True while ClassDefAst emits a class DECORATOR expression (or the
	``boundary'' keyword value).  Like inBasesEmit: those expressions are
	emitted INLINE in the scope enclosing the class statement, where enclosing
	temps are reachable, so NameAst's class-method closure-cell branch must not
	hijack a bare name into a ___classCell___ read that was never stored."

	^ self ___compileContext___ at: #'inDecoratorEmit' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classDefIsModuleScope
	"True/false while a class's methods are being compiled: whether the
	class is defined at module scope.  Governs how a bare zero-arg
	super() resolves its defining class -- a module-scope class is
	reachable by name through the module instance, a method-local one
	is not, so the latter routes through the closure-cell that holds
	the class object (see CallAst>>printSmalltalkOn:).  nil (the
	default) means ``not compiling a class'' and reads as module-scope
	for the existing path."
	^ self ___compileContext___ at: #'classDefIsModuleScope' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classDefIsModuleScope: aBooleanOrNil
	self ___compileContext___ at: #'classDefIsModuleScope' put: aBooleanOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
inBasesEmit: aBooleanOrNil
	self ___compileContext___ at: #'inBasesEmit' put: aBooleanOrNil
%

category: 'Grail-Compile Context'
classmethod: CallAst
inDecoratorEmit: aBooleanOrNil
	self ___compileContext___ at: #'inDecoratorEmit' put: aBooleanOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classStaticFunctionNames
	^ self ___compileContext___ at: #'classStaticFunctionNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classStaticFunctionNames: aSetOrNil
	self ___compileContext___ at: #'classStaticFunctionNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classFunctionNames: aSetOrNil
	self ___compileContext___ at: #'classFunctionNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyBoundNames
	"While ClassDefAst emits class-attribute value expressions, the
	set of class-body names bound BEFORE the attr being emitted (in
	source order).  Python executes a class body sequentially, so
	``empty_values = list(validators.EMPTY_VALUES)'' must read the
	``validators'' MODULE when the class's ``def validators'' appears
	later (django's db.models Field).  nil outside the value emit."

	^ self ___compileContext___ at: #'classBodyBoundNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyBoundNames: aSetOrNil
	self ___compileContext___ at: #'classBodyBoundNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCapturedNames
	"Enclosing-function locals referenced from the CLASS-METHOD bodies
	being generated (closure cells).  NameAst adds names as it emits
	___classCell___ reads; ClassDefAst emits the definition-time
	stores.  nil outside a class compile."

	^ self ___compileContext___ at: #'classCapturedNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCapturedNames: aSetOrNil
	self ___compileContext___ at: #'classCapturedNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
addCapturedClassName: aSymbol
	self classCapturedNames == nil ifTrue: [self classCapturedNames: IdentitySet new].
	self classCapturedNames add: aSymbol asSymbol
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
enclosingClassContext
	"The class LEXICALLY ENCLOSING the class body being emitted, as
	{ name. isModuleScope. capturedNames }, or nil when there is none.

	``__class__'' inside a class BODY is not the class being defined -- that
	class does not exist yet.  It is the enclosing scope's ``__class__'', which
	for a class nested in a method is the class that method was defined in:

	    class Host:
	        def run(self):
	            class X:
	                x = __class__      # Host, not X

	classBeingCompiled cannot answer that: ClassDefAst overwrites it with the
	INNER class before the body is emitted, and keeps the outer value only in a
	method-local.  This is that local, published for the duration of the body
	emit -- which is why it is set at the same point as inClassBodyValueEmit and
	restored beside it.

	The captured-names SET is carried too, and it is the enclosing class's own
	set object rather than a copy: a method-local enclosing class is reached
	through its closure cell, and the cell store is only emitted for names in
	that set, so the read has to be able to register itself there.  Registering
	in classCapturedNames instead would file it under the INNER class, whose
	stores are emitted at a point where the name means nothing."

	^ self ___compileContext___ at: #'enclosingClassContext' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
enclosingClassContext: anArrayOrNil
	self ___compileContext___ at: #'enclosingClassContext' put: anArrayOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
printEnclosingClassOn: aStream
	"Emit the expression for the class enclosing the class body being emitted.
	Mirrors printDefiningClassOn:'s two paths -- module attribute for a
	module-scope class, closure cell for a method-local one -- but reads the
	published enclosing context instead of the live one.

	Deliberately NOT printDefiningClassOn: with the context swapped: that method
	also sets classNeedsClassCell and registers a captured name, and at the point
	this runs both of those slots belong to the INNER class, so it would flag the
	wrong class on both counts.  Answers false when there is no enclosing class,
	so the caller can fall through."

	| ctx clsName |
	ctx := self enclosingClassContext.
	ctx == nil ifTrue: [^ false].
	clsName := ctx at: 1.
	clsName == nil ifTrue: [^ false].
	(ctx at: 2) == true
		ifTrue: [
			self moduleClassBeingCompiled == nil ifTrue: [^ false].
			aStream
				nextPutAll: '((';
				nextPutAll: self moduleClassBeingCompiled name;
				nextPutAll: ' @env0:___instance___) @env1:';
				nextPutAll: (CallAst ___moduleClassReadSelector___: clsName asString);
				nextPutAll: ')'.
			^ true]
		ifFalse: [
			"Method-local: reached through the cell that holds the class object.
			Register the name in the ENCLOSING class's captured set so its
			ClassDefAst emits the matching store."
			(ctx at: 3) == nil ifTrue: [^ false].
			(ctx at: 3) add: clsName asSymbol.
			aStream
				nextPutAll: '(self @env1:___classCell___: #''___cell_';
				nextPutAll: clsName asString;
				nextPutAll: '___'')'.
			^ true]
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classNeedsClassCell
	"Did a method body in the class being compiled reference ``__class__'' --
	either by name or through a zero-arg ``super()''?

	This is CPython's rule for whether the compiler injects ``__classcell__''
	into the class namespace: the cell exists when at least one method needs
	it, and is omitted otherwise (test_super
	test___classcell___expected_behaviour asserts BOTH halves).

	Set by printDefiningClassOn:, which is the single point both spellings go
	through -- the bare name and the super() rewrite are deliberately the same
	code path there, so the flag cannot drift from what actually reads the
	class.  ClassDefAst saves and restores it around a class body, the way it
	does classCapturedNames, so a nested class gets its own answer."

	^ (self ___compileContext___ at: #'classNeedsClassCell' otherwise: false) == true
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classNeedsClassCell: aBoolean
	self ___compileContext___ at: #'classNeedsClassCell' put: aBoolean == true
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCapturedWriteNames
	"Enclosing-function locals ASSIGNED (``nonlocal x; x = ...'') from the
	CLASS-METHOD bodies being generated.  A write needs a MUTABLE cell, so
	ClassDefAst emits, in addition to the ___cell_<name>___ reader, a
	___cellSetter_<name>___ one-arg block ``[:v | <name> := v]'' that writes
	the enclosing binding by reference.  AugAssignAst / AssignAst add names as
	they emit setter-cell stores.  nil outside a class compile."

	^ self ___compileContext___ at: #'classCapturedWriteNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classCapturedWriteNames: aSetOrNil
	self ___compileContext___ at: #'classCapturedWriteNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
addCapturedWriteName: aSymbol
	self classCapturedWriteNames == nil ifTrue: [self classCapturedWriteNames: IdentitySet new].
	self classCapturedWriteNames add: aSymbol asSymbol
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classNestedClassNames
	"Names bound by NESTED classdefs in the class body being compiled.
	They live in the outer class's per-class DYNAMIC attr store (no
	accessor pair), so NameAst's prior-class-attr branch must read
	them via ___dynamicClassAttr___ rather than the accessor send."

	^ self ___compileContext___ at: #'classNestedClassNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classNestedClassNames: aSetOrNil
	self ___compileContext___ at: #'classNestedClassNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyValueDefNode
	"The FunctionDefAst currently being emitted in VALUE (block) form by
	ClassDefAst >> emitClassBodyIfDef:on:, or nil.

	A class-body def normally compiles to a real Smalltalk method, so its
	``self'' parameter IS the receiver and NameAst must emit the plain
	pseudo-variable.  A conditional def compiles to a block instead, where
	``self'' is the transported ``_self'' temp -- so that early-out has to
	be suppressed for this node (and for anything nested inside it, which
	closes over the same temp)."

	^ self ___compileContext___ at: #'classBodyValueDefNode' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyValueDefNode: aNodeOrNil
	self ___compileContext___ at: #'classBodyValueDefNode' put: aNodeOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
annotationOwnerDefNode
	"The FunctionDefAst whose ANNOTATIONS are currently being emitted by
	FunctionDefAst >> emitAnnotateBlockOn:, or nil.

	Python evaluates parameter and return annotations in the scope that
	ENCLOSES the def, not inside it -- so the def's own parameters must
	not shadow anything while they are emitted.  werkzeug's
	``def cache_control_property(key, empty, type, ...)'' annotates that
	very ``type'' parameter with the BUILTIN ``type'', and without this
	the annotation compiled as a read of the parameter: a temp that does
	not exist in the enclosing scope where the annotate function is
	built, i.e. CompileError 1001 ``undefined symbol type''.

	___pythonLocalInEnclosingFunctions___: skips this one node (and only
	this one -- a def nested INSIDE an annotation, or any enclosing def,
	still binds normally)."

	^ self ___compileContext___ at: #'annotationOwnerDefNode' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
annotationOwnerDefNode: aNodeOrNil
	self ___compileContext___ at: #'annotationOwnerDefNode' put: aNodeOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyConditionalNames
	"Names bound inside a class-body ``if'' branch (see ClassDefAst >>
	emitClassBodyIfBranch:on:).  Like nested-class names they live in the
	per-class DYNAMIC attr store rather than in an accessor pair, so
	NameAst reads them through ___dynamicClassAttr___.

	Unlike classAttrNames these are NOT position-gated by
	classBodyBoundNames: whether the binding ran is a RUNTIME fact (the
	branch may not have been taken), which is exactly why the read falls
	back to the module global when the slot is nil -- the same fallback
	Python's class-body name lookup performs."

	^ self ___compileContext___ at: #'classBodyConditionalNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyConditionalNames: aSetOrNil
	self ___compileContext___ at: #'classBodyConditionalNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classMethodAliasTargets
	"Class-body SIBLING-METHOD ALIASES, as a Dictionary of alias name ->
	ORIGINAL def name (both Symbols), for the class whose attribute values are
	being emitted.  See ClassDefAst >> ___classBodyMethodAliases___.

	An alias is neither a def nor a class attribute in Grail's accounting -- it
	is compiled as a delegating METHOD, so operator dispatch can find it -- and
	so it matched none of NameAst's class-body read branches.  A later
	statement naming it fell through to the module and raised NameError at
	class-init time (``wrapped = m'' then ``wrapper = staticmethod(wrapped)'',
	which is why test_reprlib did not import).

	Mapped to the ORIGINAL name rather than collected as a bare set because
	that is what the read must answer: CPython binds ONE function object under
	both names, so ``C.in_tuple[0] is C.m'' holds, and answering the alias's
	own forwarder would call correctly while comparing unequal.

	Nil outside a class-body attribute-value emit."

	^ self ___compileContext___ at: #'classMethodAliasTargets' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classMethodAliasTargets: aDictionaryOrNil
	self ___compileContext___ at: #'classMethodAliasTargets' put: aDictionaryOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyRuntimeClass
	"The class temp NAME (a String) while ClassDefAst emits a class-body
	COMPOUND statement -- ``try'' / ``for'' / ``while'' / ``with'' -- verbatim
	through the statement's own printSmalltalkOn:, or nil outside that emit.

	Such a statement runs at class-DEFINITION time, so every name it binds is
	a class attribute; but it is emitted as ordinary Smalltalk, where a bare
	``x := v'' would bind an undeclared block temp and the binding would be
	lost the moment the statement finished.  The name says which class the
	store belongs to, so AssignAst / AnnAssignAst can route a bare-NAME target
	to ___classBodyDefinitionalStore___ instead -- the same runtime
	accessor-vs-holder dispatch a class-body ``if'' branch uses, and for the
	same reason: whether the binding ran is a runtime fact.

	Set only around the compound statement's own emit and restored after, so
	it never leaks into a nested def or class body, where ``x := v'' really is
	a local."

	^ self ___compileContext___ at: #'classBodyRuntimeClass' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyRuntimeClass: aStringOrNil
	self ___compileContext___ at: #'classBodyRuntimeClass' put: aStringOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
inClassBodyValueEmit
	"Boolean — true while ClassDefAst is emitting the class
	attribute value expressions, false otherwise (including while
	emitting method bodies that share the same classBeingCompiled
	context).  NameAst uses this flag to decide whether a bare
	reference to a sibling method should resolve to an unbound
	BoundMethod (class body — yes) or fall through to module-scope
	lookup (method body — no, matching Python's LEGB-skips-class)."

	^ (self ___compileContext___ at: #'inClassBodyValueEmit' otherwise: nil) == true
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
inClassBodyValueEmit: aBoolean
	self ___compileContext___ at: #'inClassBodyValueEmit' put: aBoolean
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyDynamicLocals
	"True while emitting a class body that can bind a name BEHIND codegen's
	back -- one that calls locals() or vars(), whose answer is a live
	ClassBodyLocals a write can go through.

	CPython compiles every class-body name read to LOAD_NAME, which consults
	the body's namespace at runtime.  Grail resolves such a read statically,
	which is exact for a body whose bindings are all statements -- and wrong
	for one where a locals() write bound a name no statement mentions.  This
	flag is what tells the two apart, so NameAst pays for the runtime probe
	only where the answer can actually differ.

	Set by ClassDefAst from ___classBodyCanBindDynamically___, an
	OVER-approximation (it reads the scope's mention set, which a nested
	method's own locals() call also lands in).  Over-triggering costs one nil
	probe per class-body read and changes no answer; under-triggering would
	lose the binding, so the imprecision is on the safe side deliberately."

	^ (self ___compileContext___ at: #'classBodyDynamicLocals' otherwise: nil) == true
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBodyDynamicLocals: aBoolean
	self ___compileContext___ at: #'classBodyDynamicLocals' put: aBoolean
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classVarargsFunctionNames
	"Subset of classFunctionNames whose def shape compiles to the
	`_name:kw:` varargs form (defs with *args / **kwargs / defaults).
	classSelfSendSelector consults this so it doesn't emit a
	fixed-arity send for a method that only has the varargs entry."
	^ self ___compileContext___ at: #'classVarargsFunctionNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classVarargsFunctionNames: aSetOrNil
	self ___compileContext___ at: #'classVarargsFunctionNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classDecoratedFunctionNames
	"Subset of classFunctionNames whose def carries a WRAPPING decorator
	(@contextlib.contextmanager, a user decorator, ...).  For those the
	compiled selector is the RAW function while the class-dict entry is the
	decorator's result, so neither self-send fast path may be used -- the
	call has to go through ___pyAttrLoad___ to see the wrapper."
	^ self ___compileContext___ at: #'classDecoratedFunctionNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classDecoratedFunctionNames: aSetOrNil
	self ___compileContext___ at: #'classDecoratedFunctionNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classAttrNames
	"Set of attribute names declared at class-body scope (``X = expr``
	or ``X: type = expr`` / bare ``X: type``).  Grail stores these as
	class-side instVars with their own getter/setter pair on the
	metaclass.  AttributeAst consults this set so a ``self.X`` read
	for a name with both an instance write site AND a class-body
	declaration routes through ___pyAttrLoad___ (which checks the
	instance __dict__ first, then the class-side accessor) instead
	of the AttributeError-checked instance instVar fast path.

	Without this, jinja2's
	  ``class CodeGenerator: _finalize: t.Optional[...] = None
	    def _make_finalize(self):
	        if self._finalize is not None: ...
	        self._finalize = ...``
	would have ``_finalize`` in BOTH classInstVarNames (from the
	``self._finalize =`` write) AND classAttrNames (from the class-
	body declaration), and the AttributeAst class-instvar-fast-path
	would read a nil instance slot instead of the class-side default."

	^ self ___compileContext___ at: #'classAttrNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classPropertyNames
	"Names the class body declares as a @property (or @cached_property, or one
	of its setter/getter/deleter halves).  classSelfSendSelector consults it so
	``self.kind(n)'' takes the attribute path instead of fusing into the
	property's setter selector."

	^ self ___compileContext___ at: #'classPropertyNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classPropertyNames: aSetOrNil
	self ___compileContext___ at: #'classPropertyNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classAttrNames: aSetOrNil
	self ___compileContext___ at: #'classAttrNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classInferredSlotNames
	"IdentitySet of the SLOT names (Symbols) of the class currently being
	compiled: its own declared ``__slots__'' (always), plus the INFERRED ones
	-- the attributes its own instance methods assign through ``self''
	(ClassDefAst >> ___inferredSlotNames___) -- when GRAIL_INFERRED_SLOTS is
	on.  AttributeAst / AssignAst / AugAssignAst / AnnAssignAst consult this
	set so a ``self.<name>'' load or store compiles to the accessor SEND
	``self ___pyattr_<name>___'' / ``self ___pyattr_<name>___: v'' rather than
	to the generic attribute path -- a send, not an instVar bytecode, so a
	subclass @property / __setattr__ can override it through ordinary method
	lookup.  (A declared slot used to have its own set, classSlotNames, and a
	direct named-instVar access; both went when declared slots became
	positions in the indexed part.)  nil outside a class-body compile."

	^ self ___compileContext___ at: #'classInferredSlotNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classInferredSlotNames: aSetOrNil
	self ___compileContext___ at: #'classInferredSlotNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___inferredSlotAccessorFor___: aNameAst attr: attrString
	"The accessor selector (a String, without the trailing colon) when
	``<aNameAst>.<attrString>'' is a self-reference to one of the class's
	INFERRED slots -- else nil.  Shared by every emit site so the receiver
	guard and the spelling live in one place: the receiver must be the
	class's self parameter, spelled ``self'', not rebound, and not the
	captured ``self'' of a nested def (the same guard the __slots__ direct
	path applies); the attribute must be in classInferredSlotNames."

	| inferred |
	inferred := self classInferredSlotNames.
	inferred isNil ifTrue: [^ nil].
	(aNameAst isKindOf: NameAst) ifFalse: [^ nil].
	((self isSelfReference: aNameAst id)
		and: [self selfParameterName == #self
		and: [(aNameAst ___boundInNestedFunction___: aNameAst id) not]]) ifFalse: [^ nil].
	(inferred includes: attrString asSymbol) ifFalse: [^ nil].
	^ '___pyattr_' , attrString asString , '___'
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBackingInstVarNames
	"IdentitySet of the NAMED instance variables (Symbols) the class
	currently being compiled will have at run time — or nil when they
	cannot be known at codegen time.

	The class object does not exist while its method sources are
	generated (ClassDefAst emits ``___subclass___:'' as a RUNTIME send),
	so this is the only handle FunctionDefAst has on the instVar set it
	must not shadow: GemStone rejects a method temp that shadows an
	instance variable, while a BLOCK temp may shadow one freely.  Known
	exactly for a class rooted at PythonInstance (no bases, or ``object''
	alone) — its only named slots are the mangled ``___slot_x___'' ones
	__slots__ declares.  nil for every other base, whose Smalltalk root
	(dict, Exception, str, type, ...) brings instVars this compile cannot
	enumerate.

	nil is the CONSERVATIVE answer: generateMethodSourceOn: then keeps
	the outer ``^ [ ... ] value'' block whose temps are allowed to
	shadow.  See ClassDefAst >> ___backingInstVarNames___."

	^ self ___compileContext___ at: #'classBackingInstVarNames' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBackingInstVarNames: aSetOrNil
	self ___compileContext___ at: #'classBackingInstVarNames' put: aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
selfParameterName
	^ self ___compileContext___ at: #'selfParameterName' otherwise: nil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
selfParameterName: aSymbolOrNil
	self ___compileContext___ at: #'selfParameterName' put: aSymbolOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
isInClassMethodContext
	^ self classBeingCompiled notNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
selfParameterRebound
	^ (self ___compileContext___ at: #'selfParameterRebound' otherwise: nil) == true
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
selfParameterRebound: aBooleanOrNil
	"True while emitting the body of a method that ASSIGNS its
	self/cls parameter (CPython treats the receiver as an ordinary
	rebindable local — ``self = None'' to break reference cycles,
	``self = tuple.__new__(cls, ...)'' in __new__).  The method-source
	generator then carries the receiver in a ``_self'' block temp and
	isSelfReference: answers false, so every receiver fast path
	(instVar read/store, self-send) degrades to the generic object
	paths, which is exactly the semantics of a rebound local."

	self ___compileContext___ at: #'selfParameterRebound' put: aBooleanOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
printDefiningClassOn: aStream
	"Emit the expression for the class lexically enclosing the method being
	compiled -- CPython's implicit ``__class__'' cell.

	This is the class half of the zero-arg ``super()'' rewrite, factored out
	so the bare name ``__class__'' resolves through exactly the same two
	paths and cannot drift from it:

	  * A METHOD-LOCAL class (defined in a function body) is not a module
	    attribute, so it is reached through the closure cell that holds the
	    class object.  ___classCell___ chain-walks by the name-specific key
	    ``___cell_<ClassName>___'', which only the defining class carries, so
	    it still resolves correctly when the method runs on a SUBCLASS
	    instance -- which is the whole point of the cell: ``__class__'' is
	    the class the method was DEFINED in, not type(self).
	  * Otherwise the class is a module attribute, read off the module
	    instance.

	Registering the captured class name is what makes ClassDefAst emit the
	cell store, so it must happen on the same branch that reads the cell."

	"CPython injects ``__classcell__'' into the class namespace exactly when a
	method needs the class -- and this method IS that condition, for both
	spellings, which is why the flag is set here rather than by a separate scan
	of the body.  Set on BOTH branches: a method-local class and a
	module-scope one differ in how the class is reached, not in whether the
	method referenced it."
	self classNeedsClassCell: true.
	"...and WHICH method asked, so __closure__ can answer per method rather
	than per class."
	self ___recordClassCellMethod___.
	self ___printClassCellReadOn___: aStream around: [
		self ___printClassObjectOn___: aStream
			cellSelector: '___dunderClassCell___']
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___printClassObjectOn___: aStream
	"The CLASS OBJECT itself, for a caller that wants the container rather than
	what ``__class__'' reads out of it -- ``del __class__'', which empties the
	cell."

	^ self ___printClassObjectOn___: aStream cellSelector: '___classCell___'
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___printClassObjectOn___: aStream cellSelector: aCellSelector
	"The class expression, by whichever of the two routes reaches it -- the
	inner half of printDefiningClassOn:, without the rebindable-cell wrapper.

	``aCellSelector'' names which method-local read to use.  ``__class__'' goes
	through ___dunderClassCell___, which recovers the class from the INJECTED
	cell when a metaclass has replaced the name binding with a non-class; ``del
	__class__'' goes through the plain ___classCell___, since it wants the class
	that OWNS the cell rather than the value in it.

	Split out because ``del __class__'' needs the class in order to empty its
	cell, and going through the wrapper would READ the cell first: on a second
	delete that read raises, turning a repeat of a legal statement into an
	error.  The delete targets the container, not the contents."

	(self classDefIsModuleScope == false)
		ifTrue: [
			self addCapturedClassName: self classBeingCompiled.
			aStream
				nextPutAll: '(self @env1:';
				nextPutAll: aCellSelector;
				nextPutAll: ': #''___cell_';
				nextPutAll: self classBeingCompiled asString;
				nextPutAll: '___'')']
		ifFalse: [
			aStream
				nextPutAll: '((';
				nextPutAll: self moduleClassBeingCompiled name;
				nextPutAll: ' @env0:___instance___) @env1:';
				nextPutAll: (CallAst ___moduleClassReadSelector___: self classBeingCompiled asString);
				nextPutAll: ')']
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
___functionDeclaresNonlocal___: aSymbol
	"Did the def currently being compiled declare aSymbol ``nonlocal''?

	For ``__class__'' this is the whole difference between two statements that
	look identical.  CPython treats a bare ``del __class__'' in a method as an
	ORDINARY LOCAL delete -- the name is local to the def, deleting it before
	binding it raises UnboundLocalError, and the class's cell is untouched.
	Only ``nonlocal __class__'' reaches past the def to the shared cell.  So
	the declaration is not decoration and the emit must not fire without it."

	| fn |
	fn := self functionBeingCompiled.
	fn == nil ifTrue: [^ false].
	fn body == nil ifTrue: [^ false].
	^ fn body nonlocalNames notNil
		and: [fn body nonlocalNames includes: aSymbol]
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
isSelfReference: aSymbol
	"The self/cls parameter of a class-body def IS the Smalltalk receiver --
	but only because such a def compiles to a real method.  A CONDITIONAL
	def compiles to a block (ClassDefAst >> emitClassBodyIfDef:on:), where
	the parameter is the transported ``_self'' temp and Smalltalk ``self''
	is the enclosing module instance.  Nothing but that def's own body emits
	while classBodyValueDefNode is set, so denying every receiver fast path
	for the whole window is exactly the right scope."

	self classBodyValueDefNode ifNotNil: [^ false].
	^ self classBeingCompiled notNil
		and: [aSymbol == self selfParameterName
		and: [self selfParameterRebound ~~ true]]
%

category: 'Grail-Class Self-Send'
method: CallAst
classSelfSendSelector
	"Return the selector for a self.method(args) call in class method context, or nil.

	Eligibility:
	  * classBeingCompiled is non-nil
	  * function is an AttributeAst whose value is a NameAst matching selfParameterName
	  * No keyword arguments (kwargs use varargs form)
	  * The attribute name is in classFunctionNames
	  * The attribute is NOT one of the varargs-shaped functions (those
	    compile to ``_name:kw:`` only; the fast path would otherwise
	    emit a unary send that lands on the BoundMethod-wrap DNU
	    fallback and break ``self.derive_key()`` in itsdangerous /
	    similar)."

	| attrName attrSym |

	self hasStarredArgument ifTrue: [^nil].
	(self class isInClassMethodContext) ifFalse: [^nil].
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	(self class isSelfReference: function value id) ifFalse: [^nil].
	attrName := function ___mangledAttr___.
	attrSym := attrName asSymbol.
	(self class classFunctionNames includes: attrSym) ifFalse: [^nil].
	((self class classVarargsFunctionNames notNil
		and: [self class classVarargsFunctionNames includes: attrSym])) ifTrue: [^nil].
	"A decorated def's compiled selector is the RAW function; the wrapper
	lives in the class dict, so this call must take the attribute path."
	((self class classDecoratedFunctionNames notNil
		and: [self class classDecoratedFunctionNames includes: attrSym])) ifTrue: [^nil].
	"A @property's getter compiles to a plain unary method, so fusing a CALL
	through self emits ``self kind: n'' -- the property's SETTER -- which a
	read-only property answers by raising ``property 'kind' of 'C' object has
	no setter''.  CPython loads the property's value and calls THAT, so this
	call takes the attribute path.  Only calls are affected: a plain read
	``self.kind'' is AttributeAst's, and still resolves to the getter."
	((self class classPropertyNames notNil
		and: [self class classPropertyNames includes: attrSym])) ifTrue: [^nil].
	keywords isEmpty ifFalse: [^nil].
	^ self class fastPathSelectorForAttr: attrName arity: arguments size
%

category: 'Grail-Class Self-Send'
method: CallAst
classSelfSendVarargsSelector
	"Return the varargs selector for a self.method(args, kw=val) call, or nil."

	| attrName candidate |

	self hasStarredArgument ifTrue: [^nil].
	(self class isInClassMethodContext) ifFalse: [^nil].
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	(self class isSelfReference: function value id) ifFalse: [^nil].
	attrName := function ___mangledAttr___.
	(self class classFunctionNames includes: attrName asSymbol) ifFalse: [^nil].
	"See classSelfSendSelector: a wrapped def must not be self-sent at all."
	((self class classDecoratedFunctionNames notNil
		and: [self class classDecoratedFunctionNames includes: attrName asSymbol]))
			ifTrue: [^nil].
	"Nor a @property, for the reason classSelfSendSelector gives: the varargs
	twin of that fusion sends ``_kind: { n } kw: nil'', the getter's own
	wrapper, which then refuses the argument its signature never had."
	((self class classPropertyNames notNil
		and: [self class classPropertyNames includes: attrName asSymbol]))
			ifTrue: [^nil].
	candidate := self class varargsSelectorForName: attrName.
	^ candidate
%

category: 'Grail-Class Self-Send'
method: CallAst
isSelfOrClsAttributeCallOutsideClassFunctions
	"Return true for `self.X(args)` / `cls.X(args)` where, inside a
	class-method codegen context, X is NOT one of the class's own
	instance method names.  Such calls must NOT take the direct unary
	send fastpath (`((self) X args)`) because X is most likely a
	class-side attribute (e.g. ``set_class: type = list``) — the load
	has to flow through AttributeAst's ___pyAttrLoad___: dispatch so
	the metaclass class-side accessor is consulted."

	| attrName |
	(self class isInClassMethodContext) ifFalse: [^false].
	(function isKindOf: AttributeAst) ifFalse: [^false].
	(function value isKindOf: NameAst) ifFalse: [^false].
	(self class isSelfReference: function value id) ifFalse: [^false].
	attrName := function ___mangledAttr___.
	^ (self class classFunctionNames includes: attrName asSymbol) not
%

category: 'Grail-Class Self-Send'
method: CallAst
printClassSelfSendOn: aStream selector: aSelector
	"Emit a self-send: (self method: arg1 _: arg2 ...)"

	| attrName nargs |
	attrName := function ___mangledAttr___ asString.
	nargs := arguments size.
	aStream nextPutAll: '(self '.
	aStream nextPutAll: attrName.
	nargs = 0 ifTrue: [
		aStream nextPut: $).
		^ self
	].
	aStream nextPut: $:; space.
	(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
	2 to: nargs do: [:i |
		aStream nextPutAll: ' _: '.
		(arguments at: i) printSmalltalkWithParenthesisOn: aStream.
	].
	aStream nextPut: $)
%

category: 'Grail-Class Self-Send'
method: CallAst
printClassSelfSendVarargsOn: aStream selector: aSelector
	"Emit a varargs self-send: (self _method: { args } kw: kwargs)"

	| attrName |
	attrName := function ___mangledAttr___ asString.
	aStream nextPutAll: '(self _'.
	aStream nextPutAll: attrName; nextPutAll: ': '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: '.
	self printKeywordsDictOn: aStream.
	aStream nextPut: $)
%

category: 'Grail-Module Self-Send'
method: CallAst
moduleSelfSendSelector
	"Return the Smalltalk selector for a module self-send fast path, or nil.

	Eligibility:
	  * `moduleClassBeingCompiled` is non-nil (we are compiling a user module).
	  * `function` is a `NameAst` (bare name).
	  * The name is in `moduleFunctionNames` (it is a top-level def).
	  * No keyword arguments at the call site (kwargs use varargs).
	  * The call-site arity matches the function's fixed-arity selector,
	    OR the function has a varargs selector.

	We check `moduleFunctionNames` (an IdentitySet pre-computed before codegen)
	rather than the class method dict, because methods may not all be compiled
	yet when we generate source for inter-function calls."

	| funcName candidate |

	self hasStarredArgument ifTrue: [^nil].
	self class moduleClassBeingCompiled ifNil: [^nil].
	"Don't self-send while compiling a class body — bare names there
	follow Python's LEGB and resolve through the module singleton,
	not as `self.X(...)`."
	self class classBeingCompiled ifNotNil: [^nil].
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	(self class moduleFunctionNames includes: funcName) ifFalse: [^nil].
	"LEGB: a true local (or enclosing comprehension target) of the same
	 name shadows the top-level def -- the call must dispatch the local's
	 value, not self-send to the module method."
	(function ___localBindingShadows___: funcName) ifTrue: [^nil].
	keywords isEmpty ifFalse: [^nil].
	"Build the fixed-arity selector and verify it exists in the class's
	env-1 method dict. Functions defined with *args / **kwargs / defaults
	only have the `_name:kw:` varargs form, so a fixed-arity call to them
	must fall through to moduleSelfSendVarargsSelector below."
	candidate := self class fastPathSelectorForAttr: funcName arity: arguments size.
	((self class moduleClassBeingCompiled methodDictForEnv: 1) includesKey: candidate)
		ifFalse: [^nil].
	^ candidate
%

category: 'Grail-Module Self-Send'
method: CallAst
moduleSelfSendVarargsSelector
	"Return the varargs selector `_name:kw:` for a module self-send, or nil.

	Same eligibility as `moduleSelfSendSelector` except keywords
	ARE allowed and we check for the varargs form."

	| funcName candidate |

	self hasStarredArgument ifTrue: [^nil].
	self class moduleClassBeingCompiled ifNil: [^nil].
	"Don't self-send while compiling a class body — bare names there
	follow Python's LEGB and resolve through the module singleton,
	not as `self.X(...)`."
	self class classBeingCompiled ifNotNil: [^nil].
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	(self class moduleFunctionNames includes: funcName) ifFalse: [^nil].
	"LEGB: a true local (or enclosing comprehension target) of the same
	 name shadows the top-level def (see moduleSelfSendSelector)."
	(function ___localBindingShadows___: funcName) ifTrue: [^nil].
	candidate := self class varargsSelectorForName: funcName.
	((self class moduleClassBeingCompiled methodDictForEnv: 1) includesKey: candidate)
		ifFalse: [^nil].
	^ candidate
%

category: 'Grail-Module Self-Send'
method: CallAst
printModuleSelfSendOn: aStream selector: aSelector
	"Emit a probe-then-branch self-send for a module-level function
	call.  Probes the module's dynamic-instVar storage at the call
	site: absent → fast self-send to the def's compiled method;
	present → call whatever value the name was rebound to.  Pre-fix,
	this emitted an unconditional ``(self name: args)'' which bypassed
	any later ``name = <other>'' rebinding and called the original
	def.

	Shape (1 arg shown — generalises to N args / 0 args):
		([:___f___ | ___f___ == nil
			ifTrue: [self name: arg]
			ifFalse: [___f___ @env1:___pyCallValue___: { arg } kw: nil]]
			value: (self @env0:dynamicInstVarAt: #name))

	``___pyCallValue___:kw:'' is defined on Object to raise TypeError
	(``'<typename>' object is not callable'') and overridden on
	BoundMethod to dispatch via the standard ``value:value:'' protocol —
	so a rebound int handle TypeErrors instead of MNU."

	| funcName nargs |
	funcName := function id asString.
	nargs := arguments size.
	aStream nextPutAll: '([:___f___ | ___f___ == nil ifTrue: [self '.
	aStream nextPutAll: funcName.
	nargs = 0 ifFalse: [
		aStream nextPut: $:; space.
		(arguments at: 1) printSmalltalkWithParenthesisOn: aStream.
		2 to: nargs do: [:i |
			aStream nextPutAll: ' _: '.
			(arguments at: i) printSmalltalkWithParenthesisOn: aStream.
		].
	].
	aStream nextPutAll: '] ifFalse: [___f___ @env1:___pyCallValue___: '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: nil]] value: (self @env0:dynamicInstVarAt: #'.
	aStream nextPutAll: funcName.
	aStream nextPutAll: '))'
%

category: 'Grail-Module Self-Send'
method: CallAst
printModuleSelfSendVarargsOn: aStream selector: aSelector
	"Probe-then-branch varargs self-send.  Same rationale as the
	fixed-arity case: probe dynamic instVar, fast path on absent,
	call the rebound value on present."

	| funcName |
	funcName := function id asString.
	aStream nextPutAll: '([:___f___ | ___f___ == nil ifTrue: [self _'.
	aStream nextPutAll: funcName; nextPutAll: ': '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: '.
	self printKeywordsDictOn: aStream.
	aStream nextPutAll: '] ifFalse: [___f___ @env1:___pyCallValue___: '.
	self printArgumentsArrayOn: aStream.
	aStream nextPutAll: ' kw: '.
	self printKeywordsDictOn: aStream.
	aStream nextPutAll: ']] value: (self @env0:dynamicInstVarAt: #'.
	aStream nextPutAll: funcName.
	aStream nextPutAll: '))'
%
method: CallAst
function: newValue
	function := newValue
%
method: CallAst
arguments: newValue
	arguments := newValue
%
method: CallAst
keywords: newValue
	keywords := newValue
%

category: 'Grail-IR Codegen'
method: CallAst
___irCallShape___
	"The printSmalltalkOn: branch this call takes, as a Symbol, walking the SAME
	probes in the SAME order the text dispatcher does -- or nil when the text
	takes a branch the IR does not emit (the special ids, class-context sends,
	the arity-mismatch TypeErrors, splats).  Exactness comes from the order: a
	call any earlier branch would claim never reaches a later shape here.

	  #builtinFixed        ((builtins instance) name: a _: b)
	  #builtinVarargs      ((builtins instance) _name: {args} kw: kw)
	  #classNew            (Cls __new__: a _: b)   [bool -> ___truthOf___:]
	  #moduleSelfSend      the rebinding-probe block, fixed arity
	  #moduleSelfSendVarargs  the same probe, _name: {args} kw: kw
	  #attrFixed           ((recv) name: a _: b)      [module receiver]
	  #attrVarargs         ((recv) _name: {args} kw: kw)
	  #attrDirect          ((recv) name: a _: b)       [GRAIL_DIRECT_CALLS, any receiver]
	  #attrLegacy          (((obj) ___pyAttrLoad___: #m) value: {args} value: kw)
	  #general             ((callee) value: {args} value: kw)

	Guarded: the probes read dictionaries and method dicts, and eligibility
	must never raise."

	^ [self ___irCallShapeUnguarded___] on: Error do: [:ex | nil]
%

category: 'Grail-IR Codegen'
method: CallAst
___irCallShapeUnguarded___

	"A ``*x'' splat (cut 56) takes no fixed shape -- every selector probe below
	declines it, as the text's do -- and lands on #general / #attrLegacy, whose
	argument Array is the text's concatenation; a ``**m'' keyword splat rides
	the keyword dict (___emitIRKeywordsOn___:) into whichever shape the probes
	pick, as printKeywordsDictOn: does."
	(function isKindOf: NameAst) ifTrue: [
		"``super()'' / ``super(C, obj)'': the text's two Super-proxy rewrites."
		(self ___irSuperShape___) ifNotNil: [:sup | ^ sup].
		"``globals()'' (cut 83): the text's step-0 COMPILE-TIME rewrite to a live
		PyModuleDict view.  Despite the census row's name this is not
		frame-sensitive at all -- the receiver is chosen at compile time by
		___globalsViewReceiverExpr___ -- so the IR path can spell it.  The
		match is the text's exactly: the BARE NAME with no arguments and no
		keywords.  ``globals'' reached through a local alias is not a NameAst
		function at all and never gets here, and a local literally NAMED
		globals is rewritten by the text too (its step 0 runs before any
		shadowing test) -- reproducing that is the point.
		A DOIT is excluded: there the text's receiver is ``___pyGlobals___'',
		a symbol-list scope the IR builder has no leaf for, and IR refuses
		doits everywhere else already."
		((function id = #'globals'
			or: [(function id = #'locals' or: [function id = #'vars'])
				and: [CallAst inClassBodyValueEmit not
				and: [CallAst functionBeingCompiled isNil
				and: [self ___enclosingComprehensionTargetNames___ isEmpty]]]])
			and: [arguments isEmpty
			and: [keywords isEmpty
			and: [ModuleAst compilingDoitScope isNil
			and: [CallAst moduleClassBeingCompiled notNil]]]])
				ifTrue: [^ #globalsView].
		"``locals()'' / zero-arg ``vars()'' (cut 84), in FUNCTION scope only.
		printLocalsCallOn: has five scope cases; this takes the one that is a
		plain snapshot of the enclosing function's names.  The other four stay
		on text and are named for the census:
		  * a CLASS BODY reports the names bound so far, through a different
		    helper (printClassBodyLocalsOn:);
		  * inside a COMPREHENSION, in a class body or at module scope, the
		    scope is the comprehension's own targets;
		  * at MODULE scope outside a comprehension locals() IS globals(),
		    which #globalsView above already emits -- so that case is admitted
		    there rather than here."
		((function id = #'locals' or: [function id = #'vars'])
			and: [arguments isEmpty
			and: [keywords isEmpty
			and: [CallAst inClassBodyValueEmit not
			and: [CallAst functionBeingCompiled notNil
			and: [self ___enclosingComprehensionTargetNames___ isEmpty]]]]])
				ifTrue: [^ #localsSnapshot].
		"Bare ``dir()'' (cut 85): the text's step-0b' rewrite, which is
		___dirOfNamespace___: applied to whatever printLocalsCallOn: would
		print here.  So this admits EXACTLY the two scopes cut 83 and cut 84
		taught the IR path to spell -- a function body, and module scope --
		and refuses the other three of that method's five cases (class body,
		and a comprehension in either scope) for the same reasons those cuts
		refuse them.  ``dir(x)'' is an ordinary builtins call and takes a
		different route entirely."
		(function id = #'dir'
			and: [arguments isEmpty
			and: [keywords isEmpty
			and: [CallAst inClassBodyValueEmit not
			and: [self ___enclosingComprehensionTargetNames___ isEmpty
			and: [CallAst functionBeingCompiled notNil
				or: [ModuleAst compilingDoitScope isNil
					and: [CallAst moduleClassBeingCompiled notNil]]]]]]])
				ifTrue: [^ #dirOfScope].
		"locals/vars/dir/eval/exec/super have rewrite semantics the text
		special-cases BEFORE any fast path -- but ONLY IN THE SHAPES IT
		REWRITES, and this used to refuse the NAME at any arity.  That is why
		the census family reads so much larger than the rewrites it is named
		for: every refusing `frameSensitive-dir' site in the stdlib is
		``dir(obj)'', the ONE-ARGUMENT form, which the text does not rewrite at
		all -- it falls through to the ordinary builtins dispatch, exactly like
		``len(obj)''.  Same for ``vars(obj)'', and for eval/exec given an
		explicit globals/locals argument.

		So refuse only what the text's step 0 actually claims and the shapes
		above could not spell; anything else carries on to the probes below and
		compiles as the ordinary call it is.  The conditions here are copied
		from those step-0 tests, and must stay in step with them: if the text
		rewrites a shape the IR path cannot spell, the answer must be a refusal
		and not a plain call to a builtin that never sees the frame."
		(#(#'globals' #'locals' #'vars' #'dir') includes: function id) ifTrue: [
			(arguments isEmpty and: [keywords isEmpty]) ifTrue: [^ nil]].
		"eval/exec refuse at EVERY arity, unlike the four above, and the
		reason is a RUNTIME one that no shape test can see.  ``eval(e, g, l)''
		whose g and l hold None means, in CPython, ``use the caller's
		namespaces'', and Grail honours that by finding the calling Python
		frame at run time -- PyFrame >> ___namesIncludeCodegenMarker___:
		identifies it by the ``___curPos___'' temp that TEXT-generated methods
		carry.  An IR-built method carries ``___grailPython___'' instead, so
		the walk does not recognise it and the expression is evaluated with no
		caller namespace at all.

		Compiling those calls through IR therefore turned
		``eval('args[1] is not None', globals, locals)'' -- test_decorators'
		dbcheck shape -- into ``NameError: name 'args' is not defined'', 13
		errors in EvalCallerNamespaceTestCase, caught by the flag-on gate.
		The values decide, so no compile-time test can tell the frame-reading
		call from the ordinary one; the honest answer is to refuse the name.

		Unifying the two marker spellings is the real fix and is a cut of its
		own: it changes the shared frame walk that the traceback path also
		uses.  Until then this refusal is what keeps the two paths agreeing,
		and it is why the frameSensitive-eval / -exec census rows survive this
		cut while -dir and -vars go to zero.

		SINCE WRITTEN, AND CORRECTED BY MEASUREMENT: #906 widened
		___namesIncludeCodegenMarker___: to answer to either spelling (for an
		independent reason -- a NameError in an IR method was losing its
		``self.<name>'' suggestion).  On reading that, this note claimed the
		blocker was gone.  IT IS NOT, and the refusal below still earns its
		place: with eval/exec narrowed on top of #906, loading
		tests/python/eval_caller_namespace.py under a forced flag still raises
		``NameError: name 'args' is not defined'' -- 19 compiled, 0 fallbacks,
		while the text path loads it.

		What #906 DID fix is most of the shapes.  Measured one by one, the IR
		path now agrees with text and CPython on a plain parameter, a plain
		local, a module global, a top-level ``*args'' def and a method.  The
		divergence is a NESTED DEF, and it goes BOTH ways:
		  * ``def outer(n): def inner(): return eval('n + 100', None, None)''
		    -- IR answers 101, text and CPython raise NameError (CPython's
		    compiler never makes a cell for a name that appears only inside the
		    eval string, so it is genuinely not in scope).  IR is too
		    PERMISSIVE: it is seeing the enclosing method's locals.
		  * the dbcheck shape -- a nested def taking ``*args'' -- cannot see
		    ``args'' at all.
		A nested def compiles to a BLOCK inside the enclosing method, so the
		frame the snapshot walk finds is not the one whose temps it wants.  That
		is the cut, and it is a frame-machinery cut rather than a codegen one.

		THAT CUT HAS NOW BEEN MADE, and it was a declared temp and a store to
		it in each of two emits rather than a change to the walk.  The walk was
		already right; what the IR path owed it was a frame to stop at.  A nested def's
		body block (FunctionDefAst>>___emitIRNestedBlockOn___:) and a lambda's
		(LambdaAst>>___emitIRLambdaBlockOn___:) now each declare and STORE a
		``___grailPython___'' of their own, which is what the text has always
		had in those two blocks -- it declares ``| ___curPos___ q |'' inside the
		lambda block and inside the nested def's, and stores a position into it
		before every statement.  With that, both bullets above close: the walk
		stops AT the nested frame instead of running past it to the enclosing
		method, so the too-permissive read is gone, and the nested def's own
		parameters -- ``*args'' included -- are the temps it reads.

		MEASURED, on tests/python/eval_caller_namespace.py under a forced flag:
		it loads, 20 compiled, 0 fallbacks, where the note above records it
		still raising ``NameError: name 'args' is not defined''.

		ONE ASYMMETRY IS LEFT AND IT FAVOURS THIS PATH.  The text wraps a nested
		def's body in ``[[...] value. None] on: PythonReturn do: [...]'', and the
		frame that walk lands on is the inner block's, whose temps are not the
		2-argument block's -- so the text cannot see a nested def's PARAMETERS
		at all.  Measured with ``eval('sorted(locals().keys())', None)'' in a
		nested ``def inner(p)'': text reports ``b'' and not ``p''; the IR path
		and CPython report both.  Reproducing that would mean emitting a bug on
		purpose, so it is not reproduced; the divergence is recorded in
		EvalInNestedScopeTestCase and is the text path's to fix.

		SO THE REFUSAL IS NOW THE BARE REWRITE ALONE.  Nothing above is a reason
		to refuse the shapes that were measured to agree.  The one refusing
		condition is read off the parent chain, which makes it context-free --
		see ___irEvalExecRefusalReason___, and see the ``eval'' half of the note
		there for why a compile-context read would not do."
		(#(#'eval' #'exec') includes: function id) ifTrue: [
			self ___irEvalExecRefusalReason___ notNil ifTrue: [^ nil].
			"Step 0c's rewrite, in the two scopes the IR path can spell it
			(cut: the bare rewrite).  Anything else eval/exec reaches here as
			an ordinary builtin call and takes the probes below."
			self ___irIsBareEvalExecRewrite___ ifTrue: [^ #bareEvalExec]].
		"...and every OTHER spelling of ``super'' carries on to the probes below,
		because that is what the text does with it.  This used to refuse the
		NAME outright, which is the same mistake the eval/exec note above
		records: printSmalltalkOn:'s super branches are guarded by ``arguments
		size = 2 and: [(arguments at: 1) isKindOf: NameAst]'', and ANY call that
		fails those guards falls through there to the ordinary call path, where
		``super'' is read as a value and applied --
		``((<Mod> ___grailShadowedSuper___) ifNil: [Super]) value: { ... }''.
		NameAst already emits that read (its #superShadowed / #superClass
		kinds), so the IR path spells the fall-through by construction.

		Refusing it instead cost more than eligibility: those spellings are
		mostly ERROR cases -- ``super(1, 2)'', ``super(int, int, int)'' -- whose
		whole point is the TypeError, plus the one real-code shape, a DOTTED
		first argument (``super(_SubParsersAction._ChoicesPseudoAction, self)''
		in argparse).

		Two spellings are exceptions and keep refusing -- a ZERO-ARGUMENT
		super(), whose no-class arms are precondition ERRORS with their own
		messages, and an explicit two-argument super naming a DIFFERENT
		method-local class.  See ___irSuperStaysOnText___."
		self ___irSuperStaysOnText___ ifTrue: [^ nil].
		self bareCallFastPathSelector notNil ifTrue: [^ #builtinFixed].
		self bareCallVarargsSelector notNil ifTrue: [^ #builtinVarargs].
		self bareCallClassNewSelector notNil ifTrue: [^ #classNew].
		"A known builtin whose arity matched no fast path: the text emits its
		arity-mismatch TypeError, and so does this path now (cut: the arity
		mismatch).  The text's whole emit is ONE send of a CONSTANT message --
		printArityMismatchErrorOn:forName: writes no argument expression at
		all -- so the IR twin is that same send and nothing else.
		The exceptions are the text's own: a splat (arity unknown at compile
		time) or a name that is also a class with a varargs constructor, where
		the text defers to the generic form and so must this."
		self knownBuiltinName notNil ifTrue: [
			(self ___hasVarargsClassConstructor___ or: [self hasStarredArgument])
				ifFalse: [^ #arityMismatch]].
		self moduleSelfSendSelector notNil ifTrue: [^ #moduleSelfSend].
		self moduleSelfSendVarargsSelector notNil ifTrue: [^ #moduleSelfSendVarargs].
		"Class self-sends need classBeingCompiled, which a module def lacks.
		A known class whose __new__ arity matched nothing: the text's TypeError
		again, through the SAME printArityMismatchErrorOn:forName:, so it takes
		the same shape -- unless a splat makes the arity unknowable, when the
		text defers too.  No corpus def reaches this arm today (the census row
		`CallAst:classArityMismatch' is empty); it is here because refusing it
		while admitting the builtin arm would split one text emit across two
		answers."
		(self knownClassName notNil and: [self hasStarredArgument not])
			ifTrue: [^ #arityMismatch].
		^ #general].
	(function isKindOf: AttributeAst) ifTrue: [
		"Inside a method, ``self.m(args)'' for a sibling def m is the text's
		direct self-send; its keyword / arity-mismatch varargs twin is not
		emitted yet.  Any other ``self.x(...)'' takes the attribute paths
		(load through the self-receiver shape, then value:value:)."
		self classSelfSendSelector notNil ifTrue: [^ #classSelfSend].
		"Its keyword / arity-mismatch twin (cut 49): ``self.m(a, k=v)'', or a
		positional call to a sibling that compiles as varargs -- the text's
		``(self _m: { a } kw: kwDict)''."
		self classSelfSendVarargsSelector notNil ifTrue: [^ #classSelfSendVarargs].
		self attributeCallFastPathSelector notNil ifTrue: [^ #attrFixed].
		self attributeCallVarargsSelector notNil ifTrue: [^ #attrVarargs].
		"GRAIL_DIRECT_CALLS: the text's direct keyword send for an unresolved
		receiver (___directCallSelector___), one send node."
		self ___directCallSelector___ notNil ifTrue: [^ #attrDirect].
		^ #attrLegacy].
	^ #general
%

category: 'Grail-IR Codegen'
method: CallAst
___irEligibleValueLocals___: localNames
	"Emittable when the text branch is one the IR reproduces and every piece --
	arguments, keyword values, and (for the shapes that evaluate it) the callee
	expression -- is emittable.  The fixed-selector shapes name the callee at
	compile time and never evaluate it as a value."

	| shape |
	shape := self ___irCallShape___.
	shape isNil ifTrue: [^ false].
	(arguments allSatisfy: [:a | a ___irEligibleValueLocals___: localNames])
		ifFalse: [^ false].
	(keywords allSatisfy: [:k | k value ___irEligibleValueLocals___: localNames])
		ifFalse: [^ false].
	(#(#attrFixed #attrVarargs #attrDirect) includes: shape) ifTrue: [
		^ function value ___irEligibleValueLocals___: localNames].
	"#classSelfSend names its callee at compile time (a sibling def) and sends
	to the receiver: nothing else to judge."
	(#(#attrLegacy #general) includes: shape) ifTrue: [
		^ function ___irEligibleValueLocals___: localNames].
	^ true
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRKeywordsOn___: aBuilder
	"printKeywordsDictOn:'s value: nil with no keywords, else a PyDict built in
	source order -- ``((PyDict @env0:new) @env0:at: 'k' put: v; ...; yourself)''
	with Python-str (Smalltalk String) keys, exactly as the text.  (PyDict, an
	ordered dict, so **kwargs / dict(**kw) preserve keyword order.)"

	| specs |
	keywords isEmpty ifTrue: [^ aBuilder nilLit].
	"A lone ``**m'' is the mapping itself, no wrapping dict (cut 56)."
	(keywords size = 1 and: [keywords first name isNil]) ifTrue: [
		^ keywords first value ___emitIRValueOn___: aBuilder].
	specs := keywords collect: [:k |
		k name isNil
			ifTrue: [
				"``**m'' among named keywords: the text's env-1 ``update:'' of the
				mapping, in source order (later entries win)."
				{ #'update:'. { k value ___emitIRValueOn___: aBuilder }. 1 }]
			ifFalse: [
				{ #'at:put:'. { aBuilder obj: k name asString. k value ___emitIRValueOn___: aBuilder }. 0 }]].
	specs := specs asOrderedCollection.
	specs add: { #yourself. { }. 0 }.
	aBuilder atNode: self.
	^ aBuilder
		cascade: (aBuilder send: #new to: (aBuilder globalNamed: #PyDict) with: { } env: 0)
		specs: specs
%

category: 'Grail-IR Codegen'
method: CallAst
___irFixedAritySelector___: aSelector
	"The text prints a fixed-arity fast-path selector from its BASE plus the
	arity: ``name'' (0 args), ``name:'' (1), ``name: _: _:'' (N).  Rebuild that
	Symbol from the probe's answer (whose colon tail already encodes the arity,
	except that bareCallClassNewSelector answers a base like ___truthOf___: for
	bool) so the send node carries exactly what the text compiles."

	| base ws |
	base := aSelector asString.
	(base indexOf: $:) > 0 ifTrue: [base := base copyFrom: 1 to: (base indexOf: $:) - 1].
	arguments isEmpty ifTrue: [^ base asSymbol].
	ws := WriteStream on: String new.
	ws nextPutAll: base; nextPut: $:.
	2 to: arguments size do: [:i | ws nextPutAll: '_:'].
	^ ws contents asSymbol
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRModuleSelfSendOn___: aBuilder varargs: isVarargs
	"printModuleSelfSendOn: / printModuleSelfSendVarargsOn::

	  ([:___f___ | ___f___ == nil
	      ifTrue: [self name: arg1 _: arg2]      -- or, varargs: self _name: {args} kw: kw
	      ifFalse: [___f___ @env1:___pyCallValue___: { args } kw: kw]]
	      value: (self @env0:dynamicInstVarAt: #name))

	The probe reads the module's dynamic-instVar storage: absent (nil) -> fast
	self-send to the def's compiled method; present -> the name was rebound at
	runtime, call whatever it holds via ___pyCallValue___:kw:.  As in the text,
	the argument expressions appear ONCE PER BRANCH (only one branch runs, so
	each is still evaluated at most once); the two branches get separate node
	trees since IR nodes cannot be shared.  #== and #value: are REAL env-0 sends
	(kernel Object>>== is identity, ExecBlock>>value: the block invoke) --
	GsComSelectorLeaf newSelector:env:, which would inline their special
	opcodes, needs a SystemUser-only lazily-initialized table (SecurityError
	per-user), and a real env-0 dispatch is semantically identical, just not
	inlined."

	| sel fLeaf probeVal cond |
	sel := isVarargs
		ifTrue: [self moduleSelfSendVarargsSelector]
		ifFalse: [self moduleSelfSendSelector].
	"THE PROBE GOES IN A TEMP, NOT A BLOCK PARAMETER.  The text writes
	 ``[:___f___ | ...] value: probe'' and GemStone's SOURCE compiler inlines a
	 literal-block ``value:'' to no activation at all.  The IR generator cannot:
	 it builds a real ExecBlock, so the send costs TWO REAL FRAMES
	 (``ExecBlock>>value:'' and ``ExecBlock>>valueWithArguments:'') on every
	 module-function call.  Measured on a self-recursive def: 8 Smalltalk frames
	 per Python call against the text path's 6, which is a third of the
	 recursion depth given away at the hottest emit in the language.
	 ``ifValue:then:else:'' is already inlined (COMPAR_IF_TRUE_IF_FALSE), so a
	 temp plus that conditional is the same shape at no frame cost."
	fLeaf := aBuilder tempNamed: self ___irProbeTempSymbol___.
	"EVERY BRANCH STAMPS IMMEDIATELY BEFORE ITS SEND, and the arguments are
	 built into temps first rather than inline in the argument list.  A stamp
	 set before the arguments are emitted does not survive them: each argument's
	 own emit stamps the builder, so the call inherited the LAST argument's
	 position -- ``_boom(lambda: 1 + 1)'' reported the lambda's span for the
	 frame that was calling _boom.  The stamp has to be the last thing before
	 the send it labels."
	probeVal := aBuilder
		send: #'dynamicInstVarAt:'
		to: aBuilder selfNode
		with: { aBuilder obj: function id asSymbol } env: 0.
	aBuilder add: (aBuilder assign: fLeaf from: probeVal).
	cond := aBuilder
		send: #==
		to: (aBuilder var: fLeaf)
		with: { aBuilder nilLit } env: 0.
	^ aBuilder
			ifValue: cond
			then: [
				isVarargs
					ifTrue: [| a k |
						a := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
						k := self ___emitIRKeywordsOn___: aBuilder.
						aBuilder atNode: self.
						aBuilder add: (aBuilder
							send: sel to: aBuilder selfNode with: { a. k } env: 1)]
					ifFalse: [| argVals |
						argVals := (arguments collect: [:a | a ___emitIRValueOn___: aBuilder]) asArray.
						aBuilder atNode: self.
						aBuilder add: (aBuilder
							send: sel to: aBuilder selfNode with: argVals env: 1)]]
			else: [| a k |
				a := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
				k := self ___emitIRKeywordsOn___: aBuilder.
				aBuilder atNode: self.
				aBuilder add: (aBuilder
					send: #'___pyCallValue___:kw:'
					to: (aBuilder var: fLeaf)
					with: { a. k }
					env: 1)]
%

category: 'Grail-IR Codegen'
method: CallAst
___irShadowProbeTempSymbol___
	"The per-NESTING-DEPTH name of the builtin runtime-globals probe temp, derived
	exactly as ___irProbeTempSymbol___ derives ``___f<d>___'' and sound for the
	same reason -- see there for why depth, and not one shared name, is what makes
	a temp safe when calls nest.

	A SEPARATE PREFIX from the module self-send's: a given CallAst takes exactly
	one shape, so the two could in principle share, but builtin calls nest inside
	module self-sends constantly (``foo(len(x))'') and a reader tracing one probe
	through generated IR should not have to prove which shape owns ``___f2___''."

	| depth p |
	depth := 0.
	p := parent.
	[p notNil] whileTrue: [
		(p isKindOf: CallAst) ifTrue: [depth := depth + 1].
		p := p parent].
	^ ('___bs' , depth printString , '___') asSymbol
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRModuleInstanceOn___: aBuilder
	"The module singleton as an IR node -- ``self'' in the module body and its
	top-level defs, ``<ModuleClass> @env0:___instance___'' inside a user class
	method where self is the Python instance.  The IR twin of
	___moduleStoreReceiverExpr___, and wrong in the SILENT direction if confused:
	``dynamicInstVarAt:'' on a Python instance answers nil rather than raising, so
	a probe built on the wrong receiver never fires and never complains."

	self class classBeingCompiled isNil ifTrue: [^ aBuilder selfNode].
	^ aBuilder
		send: #'___instance___'
		to: (aBuilder globalNamed: self class moduleClassBeingCompiled name asSymbol)
		with: { } env: 0
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRBuiltinShadowProbeOn___: aBuilder varargs: isVarargs name: aName
	"printGlobalShadowProbeOn:name:then: -- the IR twin:

	  ___bs<d>___ := <module> dynamicInstVarAt: #name.
	  ___bs<d>___ == nil
	      ifTrue:  [((Python at: #builtins) instance) name: a _: b]   -- or _name:kw:
	      ifFalse: [___bs<d>___ ___pyCallValue___: { args } kw: kw]

	THE PROBE GOES IN A TEMP, NOT A BLOCK PARAMETER, for the reason
	___emitIRModuleSelfSendOn___:varargs: records at length: the IR generator
	builds a REAL ExecBlock where the source compiler would have inlined the
	literal-block value:, so a block here would cost two frames on every builtin
	call -- the hottest emit in the language.  ``ifValue:then:else:'' is inlined,
	so a temp plus the conditional is the same shape at no frame cost.

	The argument nodes are built once PER BRANCH because IR nodes cannot be
	shared; only one branch runs, so each argument is still evaluated at most
	once.  The text twin duplicates its argument SOURCE for the same reason."

	| bLeaf probeVal cond |
	bLeaf := aBuilder tempNamed: self ___irShadowProbeTempSymbol___.
	probeVal := aBuilder
		send: #'dynamicInstVarAt:'
		to: (self ___emitIRModuleInstanceOn___: aBuilder)
		with: { aBuilder obj: aName asSymbol } env: 0.
	aBuilder add: (aBuilder assign: bLeaf from: probeVal).
	cond := aBuilder
		send: #==
		to: (aBuilder var: bLeaf)
		with: { aBuilder nilLit } env: 0.
	^ aBuilder
			ifValue: cond
			then: [
				isVarargs
					ifTrue: [| a k binst |
						a := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
						k := self ___emitIRKeywordsOn___: aBuilder.
						aBuilder atNode: self.
						binst := self ___emitIRBuiltinsInstanceOn___: aBuilder.
						aBuilder add: (aBuilder
							send: self bareCallVarargsSelector to: binst with: { a. k } env: 1)]
					ifFalse: [| argVals binst |
						argVals := (arguments collect: [:a | a ___emitIRValueOn___: aBuilder]) asArray.
						aBuilder atNode: self.
						binst := self ___emitIRBuiltinsInstanceOn___: aBuilder.
						aBuilder add: (aBuilder
							send: self bareCallFastPathSelector to: binst with: argVals env: 1)]]
			else: [| a k |
				a := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
				k := self ___emitIRKeywordsOn___: aBuilder.
				aBuilder atNode: self.
				aBuilder add: (aBuilder
					send: #'___pyCallValue___:kw:'
					to: (aBuilder var: bLeaf)
					with: { a. k }
					env: 1)]
%

category: 'Grail-IR Codegen'
method: CallAst
___irProbeTempSymbol___
	"The per-NESTING-DEPTH name of the module-function probe temp, derived the way
	ForAst>>___irIterTempSymbol___ derives ``___iter<d>___'': walk the parent
	chain and count enclosing calls.

	THE DEPTH IS WHAT MAKES A TEMP SAFE HERE, and it is the whole reason the
	probe was a block parameter before.  A block activation gives every call its
	own ___f___; one shared temp would not, and the emit assigns the temp and
	THEN builds the argument list -- so in ``f(g(1))'' the inner call would
	overwrite the outer's probe between its assignment and its use, and the outer
	send would call g.  Counting enclosing CallAsts separates exactly that case.

	SIBLINGS AT THE SAME DEPTH SHARE A TEMP AND THAT IS SOUND: ``f(1) + g(2)''
	emits one call completely before the other begins, and each assignment
	immediately precedes its own use, so the two never interleave.  Over-counting
	(a call inside a nested def's body sees the enclosing def's calls) costs an
	unused temp name, never correctness -- only SHARING where nesting occurs is
	dangerous, and that is what this prevents."

	| depth p |
	depth := 0.
	p := parent.
	[p notNil] whileTrue: [
		(p isKindOf: CallAst) ifTrue: [depth := depth + 1].
		p := p parent].
	^ ('___f' , depth printString , '___') asSymbol
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRValueOn___: aBuilder
	"Dispatch on ___irCallShape___ (see there for the nine text shapes)."

	| shape argVals |
	shape := self ___irCallShape___.
	shape isNil ifTrue: [
		Error signal: 'IR codegen: call shape not emittable (' , self printString , ')'].
	shape == #classSelfSend ifTrue: [
		"``self.m(a, b)'' for a sibling def inside a method: the text's direct
		self-send ``(self m: a _: b)''."
		argVals := arguments collect: [:a | a ___emitIRValueOn___: aBuilder].
		aBuilder atNode: self.
		^ aBuilder send: self classSelfSendSelector to: aBuilder selfNode with: argVals env: 1].
	shape == #classSelfSendVarargs ifTrue: [
		"printClassSelfSendVarargsOn:selector: -- ``(self _m: { args } kw: kw)'':
		the varargs selector sent to the receiver with the positional Array and
		the keyword dict (nil when there are none), as the module twin's
		then-branch emits them."
		| argsArray kw |
		argsArray := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
		kw := self ___emitIRKeywordsOn___: aBuilder.
		aBuilder atNode: self.
		^ aBuilder send: self classSelfSendVarargsSelector to: aBuilder selfNode
			with: { argsArray. kw } env: 1].
	shape == #moduleSelfSend ifTrue: [^ self ___emitIRModuleSelfSendOn___: aBuilder varargs: false].
	shape == #moduleSelfSendVarargs ifTrue: [^ self ___emitIRModuleSelfSendOn___: aBuilder varargs: true].
	shape == #localsSnapshot ifTrue: [^ self ___emitIRLocalsSnapshotOn___: aBuilder].
	shape == #bareEvalExec ifTrue: [^ self ___emitIRBareEvalExecOn___: aBuilder].
	shape == #globalsView ifTrue: [^ self ___emitIRGlobalsViewOn___: aBuilder].
	shape == #dirOfScope ifTrue: [^ self ___emitIRDirOfScopeOn___: aBuilder].
	shape == #superZero ifTrue: [^ self ___emitIRSuperZeroOn___: aBuilder].
	shape == #arityMismatch ifTrue: [^ self ___emitIRArityMismatchOn___: aBuilder].
	shape == #superExplicit ifTrue: [^ self ___emitIRSuperExplicitOn___: aBuilder].
	shape == #builtinFixed ifTrue: [
		| builtinsInst shadow |
		"The runtime-globals probe, when this call is inside a user module --
		see printGlobalShadowProbeOn:name:then: and its IR twin below.  Without
		this arm the IR would emit the bare send and GRAIL_IR_CODEGEN=1 would
		reintroduce test_globals_shadow_builtins' defect while the text path had
		it fixed."
		shadow := self ___moduleGlobalShadowName___.
		shadow notNil ifTrue: [
			^ self ___emitIRBuiltinShadowProbeOn___: aBuilder varargs: false name: shadow].
		argVals := arguments collect: [:a | a ___emitIRValueOn___: aBuilder].
		aBuilder atNode: self.
		builtinsInst := self ___emitIRBuiltinsInstanceOn___: aBuilder.
		^ aBuilder send: self bareCallFastPathSelector to: builtinsInst with: argVals env: 1].
	shape == #builtinVarargs ifTrue: [
		| builtinsInst argsArray kw shadow |
		"printBareCallVarargsOn: prints the arguments through
		printArgumentsArrayOn:, so a ``*x'' splat rides this shape too."
		shadow := self ___moduleGlobalShadowName___.
		shadow notNil ifTrue: [
			^ self ___emitIRBuiltinShadowProbeOn___: aBuilder varargs: true name: shadow].
		argsArray := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
		kw := self ___emitIRKeywordsOn___: aBuilder.
		aBuilder atNode: self.
		builtinsInst := self ___emitIRBuiltinsInstanceOn___: aBuilder.
		^ aBuilder send: self bareCallVarargsSelector to: builtinsInst
			with: { argsArray. kw } env: 1].
	shape == #classNew ifTrue: [
		"(Cls @env1:__new__: a _: b) -- the receiver is the bare class name, the
		compile-time symbol-list binding the text resolves it to."
		argVals := arguments collect: [:a | a ___emitIRValueOn___: aBuilder].
		aBuilder atNode: self.
		^ aBuilder
			send: (self ___irFixedAritySelector___: self bareCallClassNewSelector)
			to: (aBuilder globalNamed: function id asSymbol)
			with: argVals env: 1].
	shape == #attrFixed ifTrue: [
		| recv |
		recv := function value ___emitIRValueOn___: aBuilder.
		argVals := arguments collect: [:a | a ___emitIRValueOn___: aBuilder].
		aBuilder atNode: self.
		^ aBuilder
			send: (self ___irFixedAritySelector___: self attributeCallFastPathSelector)
			to: recv with: argVals env: 1].
	shape == #attrVarargs ifTrue: [
		| recv argsArray kw |
		recv := function value ___emitIRValueOn___: aBuilder.
		argsArray := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
		kw := self ___emitIRKeywordsOn___: aBuilder.
		aBuilder atNode: self.
		^ aBuilder send: self attributeCallVarargsSelector to: recv
			with: { argsArray. kw } env: 1].
	shape == #attrDirect ifTrue: [
		"printDirectAttributeCallOn:selector: -- ``((recv) foo: a _: b)'' for a
		receiver nothing could resolve at compile time (GRAIL_DIRECT_CALLS)."
		| recv |
		recv := function value ___emitIRValueOn___: aBuilder.
		argVals := arguments collect: [:a | a ___emitIRValueOn___: aBuilder].
		aBuilder atNode: self.
		^ aBuilder send: self ___directCallSelector___ to: recv with: argVals env: 1].
	"#attrLegacy and #general: load THEN call through the unified protocol --
	the loaded value might be a BoundMethod, a class, or any callable."
	^ self ___emitIRGeneralCallOn___: aBuilder
%

category: 'Grail-IR Codegen'
method: CallAst
___irSuperShape___
	"#superZero for the text's in-method zero-argument rewrite, #superExplicit
	for its ``super(C, obj)'' rewrite, nil for every other spelling of
	``super'' -- walking the SAME guards printSmalltalkOn: walks, in the same
	order, so a call the text hands to an error arm or to the closure-cell path
	never reaches an IR shape.

	Both need a class being compiled and a module class; the explicit form's
	first argument must be a bare name.

	The zero-argument form used to need NO guardable argument-0 temp, which
	refused every ``super()'' written in a def NESTED in a method
	(``CallAst:super-argZeroDeletable'', 32 on the suite manifest).  That was
	again a missing emit rather than an obstacle: such a def copies argument 0
	into an ordinary temp, ``del'' compiles to ``x := nil'', and the text wraps
	its proxy in a test for exactly that.  ___emitIRSuperZeroOn___ now emits the
	same wrapper, so the shape comes in.

	A METHOD-LOCAL CLASS IS NOW ADMITTED.  It used to refuse here because such
	a class reads itself through the closure cell rather than off the module
	instance, and that read was not emitted -- the refusal named a missing
	emit, not a semantic obstacle.  Both emitters now branch on
	classDefIsModuleScope and produce the cell read the text produces, so the
	79 `CallAst:super-methodLocalClass' methods of the suite manifest come in.

	For the EXPLICIT form the admission is narrower than the refusal was: only
	a first argument naming the class being compiled, because that is the one
	shape the text routes to the cell and the only key
	``___cell_<ClassName>___'' is stored under.  ``super(SomeOtherLocal, obj)''
	still refuses."

	((function isKindOf: NameAst) and: [function id = #'super']) ifFalse: [^ nil].
	keywords isEmpty ifFalse: [^ nil].
	self ___superNameIsShadowed___ ifTrue: [^ nil].
	CallAst classBeingCompiled isNil ifTrue: [^ nil].
	CallAst moduleClassBeingCompiled isNil ifTrue: [^ nil].
	arguments isEmpty ifTrue: [^ #superZero].
	(arguments size = 2 and: [(arguments at: 1) isKindOf: NameAst]) ifTrue: [
		"A method-local class is admitted only when the first argument names
		THAT class, which is the shape the text routes to the cell -- and the
		only shape the key ``___cell_<ClassName>___'' exists under.  Naming a
		DIFFERENT method-local class keeps the text's other path, so it must
		keep refusing here."
		"A method-local class naming a DIFFERENT class, or a parameter, or any
		other local: admitted now that ___emitIRSuperExplicitOn___: takes the
		cell only for the class naming itself and otherwise emits what the
		text emits."
		^ #superExplicit].
	^ nil
%

category: 'Grail-IR Codegen'
method: CallAst
___irSuperStaysOnText___
	"Does the text rewrite this ``super'' into something the IR path has no twin
	for?  True for exactly two spellings; every OTHER call ___irSuperShape___
	declines is one printSmalltalkOn: declines as well, and both then emit the
	ordinary call.

	1. A ZERO-ARGUMENT ``super()''.  printSmalltalkOn: has three arms for it
	   beyond the in-method rewrite, and two are precondition ERRORS raised for
	   a def with NO enclosing class -- ``super(): arg[0] deleted'' when the
	   first parameter has been deleted, ``super(): __class__ cell not found''
	   otherwise.  Falling through instead emits the generic builtin call,
	   whose message is ``super(): no arguments'': a WRONG message, measured, by
	   SuperPreconditionErrorsTestCase in the flag-on suite.  So a zero-argument
	   super the shapes decline keeps refusing, whatever declined it.

	2. ``super(Other, obj)'' inside a METHOD-LOCAL class, where ``Other'' is a
	   bare name that is not the class being compiled.  The text carries on into
	   its module-instance accessor branch (or the plain argument emit) and
	   produces a ``Super checkedCls:'', which has no IR twin -- and the cell key
	   ``___cell_<ClassName>___'' the method-local path needs is stored only
	   under the class's OWN name, so there is nothing to read for another."

	((function isKindOf: NameAst) and: [function id = #'super']) ifFalse: [^ false].
	"THE SHADOW TEST COMES FIRST, because a shadowed ``super'' is not the
	rewrite at all.  printSmalltalkOn: declines to rewrite it -- the name
	holds whatever the user bound, a class or a function -- and emits the
	ordinary call, so there is no precondition arm to get wrong and nothing
	for the zero-argument rule below to protect.  It used to be tested
	AFTER, so ``arguments isEmpty'' claimed a shadowed ``super()'' as well
	and kept it on text (`CallAst:super-shadowed'); test_super's
	test_shadowed_local -- ``class super:'' in the enclosing method, then a
	method-local class calling ``super()'' -- is that shape."
	self ___superNameIsShadowed___ ifTrue: [^ false].
	arguments isEmpty ifTrue: [^ true].
	"REASON 2 IS GONE: the emit no longer assumes the first argument names
	the class being compiled.  It takes the cell only for a method-local
	class naming ITSELF, and otherwise falls through to the module-instance
	accessor or the plain argument emit -- which is exactly what the text
	does, so there is no longer a spelling here without a twin."
	^ false
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRSuperProxyOn___: aBuilder
	"``(Super @env1:cls: <classRead> obj: self)'' -- the zero-arg super proxy,
	factored out because the argument-0 guard needs it in one arm of a
	conditional and the unguarded case needs the identical node."

	| classRead |
	classRead := self ___emitIRDefiningClassReadOn___: aBuilder
		cellSelector: #'___classCellForSuper___:'.
	CallAst classCellRebindable ifTrue: [
		classRead := aBuilder
			send: #'___grailClassCellValueForSuper___' to: classRead with: { } env: 1].
	^ aBuilder
		send: #cls:obj: to: (aBuilder globalNamed: #Super)
		with: { classRead. aBuilder selfNode } env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRDefiningClassReadOn___: aBuilder cellSelector: aCellSelector
	"The DEFINING class, by whichever of the two routes reaches it -- the IR
	twin of ___printClassObjectOn___:cellSelector:.

	A module-scope class is a module attribute, read off the module instance.
	A METHOD-LOCAL class is not, so it comes out of the closure cell holding it,
	keyed ``___cell_<ClassName>___'' -- name-specific on purpose: that key is
	carried only by the defining class, so the read still answers correctly when
	the method runs on a SUBCLASS instance.  `__class__' is the class the method
	was DEFINED in, not type(self), and a read of type(self) would agree with it
	on every flat test and diverge the moment a subclass inherits the method.

	aCellSelector is the caller's, because the two readers want different rules:
	zero-arg super() uses ___classCellForSuper___:, which applies CPython's
	supercheck and raises TypeError at construction when the receiver is not an
	instance of the defining class; `super(C, obj)' uses the plain
	___classCell___:, since its text twin puts the check on `Super checkedCls:'
	instead.

	The text branch also calls `CallAst addCapturedClassName:', which is what
	makes ClassDefAst emit the cell STORE.  Not repeated here, for the reason
	___emitIRSuperZeroOn___ gives about the other compile-time side effects: the
	text twin of every seam method is generated first, so the registration has
	already fired under the same context by the time this build runs.  That is
	load-bearing rather than incidental -- if it were ever false the cell would
	not exist to read -- so the fixture asserts a value THROUGH the cell rather
	than merely that the call compiles."

	CallAst classDefIsModuleScope == false ifFalse: [
		^ aBuilder
			send: CallAst classBeingCompiled asSymbol
			to: (self ___irModuleInstanceOn___: aBuilder) with: { } env: 1].
	^ aBuilder
		send: aCellSelector
		to: aBuilder selfNode
		with: { aBuilder obj: ('___cell_' , CallAst classBeingCompiled asString , '___') asSymbol }
		env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___irModuleInstanceOn___: aBuilder
	"``(<ModuleClass> @env0:___instance___)'' -- the module singleton, the
	receiver every module-attribute read inside a method goes through."

	^ aBuilder
		send: #'___instance___'
		to: (aBuilder globalNamed: CallAst moduleClassBeingCompiled name asSymbol)
		with: { } env: 0
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRSuperZeroOn___: aBuilder
	"printSmalltalkOn:'s zero-argument ``super()'' inside a method of a
	module-scope class (cut 55), wrapped in the run-time shadow probe exactly as
	___printShadowableSuperOn___:arm: writes it:

	    ([:___sup___ | ___sup___ == nil
	            ifTrue: [(Super @env1:cls: <classRead> obj: self)]
	            ifFalse: [___sup___ @env1:value: { } value: nil]]
	        @env0:value: ((<Mod> @env0:___instance___) @env1:___grailShadowedSuper___))

	where <classRead> is ``((<Mod> @env0:___instance___) @env1:<ClassName>)'',
	wrapped in ``@env1:___grailClassCellValueForSuper___'' when the class's
	``__class__'' cell can be rebound (classCellRebindable, the compile-context
	flag ClassDefAst set before any method source was generated).  The
	argument-0 deletion guard is absent by construction: ___irSuperShape___
	admits only a method's own receiver, which no ``del'' can nil.

	The compile-time side effects of the text branch -- classNeedsClassCell:
	and ___recordClassCellMethod___, which ClassDefAst reads to inject
	__classcell__ and answer __closure__ -- are NOT repeated here: the text
	twin of every seam method is generated first (methodSources), so they have
	already fired under the same context by the time the deferred IR build
	runs.  A real one-argument block, as in the text, so the probe is evaluated
	once and in the order the enclosing expression evaluates its parts."

	| probeBlk probeVal |
	aBuilder atNode: self.
	probeBlk := aBuilder blockWithArg: #'___sup___' do: [:supLeaf |
		| cond |
		cond := aBuilder send: #== to: (aBuilder var: supLeaf) with: { aBuilder nilLit } env: 0.
		aBuilder
			if: cond
			then: [
				| guardName |
				"CPython'S PRECONDITION 1, and it is a COMPILE-TIME fact: the
				enclosing def declares no positional parameter, so there is no
				argument 0 to take the receiver from and no run-time state that
				could make ``def f(): super()'' work.  The text emits
				``Super @env1:___noArguments___'' unconditionally here; this arm
				is its twin, and it has to come FIRST because the proxy below
				would otherwise answer a working super where CPython raises --
				which is precisely what FunctionDefAst's `method:noSelfSuper'
				refusal was standing in for, and what
				SuperPreconditionErrorsTestCase caught the last time it was
				widened.

				Inside the shadow probe, not around it: a replacement ``super''
				is entitled to take the call even where the builtin would have
				refused it, which is the rule ___printShadowableSuperOn___:arm:
				records for all four emits."
				(CallAst functionBeingCompiled notNil
					and: [CallAst functionBeingCompiled ___receiverParamName___ isNil])
					ifTrue: [
						aBuilder add: (aBuilder
							send: #'___noArguments___' to: (aBuilder globalNamed: #Super)
							with: { } env: 1)]
					ifFalse: [
				"CPython's precondition 2: a ``del'' of the enclosing def's first
				 parameter makes super() raise rather than bind.  Only a def
				 NESTED in a method can be in that state -- a method's own first
				 parameter is the Smalltalk receiver, which no del can nil, and
				 ___superArgZeroGuardName___ answers nil there so no test is
				 emitted.  Note the test reads the INNER def's temp while the
				 proxy binds the OUTER receiver (``obj: self''), which looks
				 inconsistent and is what CPython does: it reports the deletion
				 from the innermost frame even though the method around it has a
				 perfectly good receiver."
				guardName := self ___superArgZeroGuardName___.
				guardName isNil
					ifTrue: [aBuilder add: (self ___emitIRSuperProxyOn___: aBuilder)]
					ifFalse: [
						aBuilder
							if: (aBuilder
								send: #== to: (aBuilder localVar: guardName asSymbol)
								with: { aBuilder nilLit } env: 0)
							then: [aBuilder add: (aBuilder
								send: #'___argZeroDeleted___' to: (aBuilder globalNamed: #Super)
								with: { } env: 1)]
							else: [aBuilder add: (self ___emitIRSuperProxyOn___: aBuilder)]]]]
			else: [
				"A SHADOWED ``super'' is whatever the user bound -- a function, a
				class, a lambda -- so it is called through the indirect protocol,
				as CallAst>>___emitIRGeneralCallOn___: explains."
				aBuilder add: (aBuilder
					send: #'___pyCallValue___:kw:' to: (aBuilder var: supLeaf)
					with: { aBuilder arrayOf: #(). aBuilder nilLit } env: 1)]].
	probeVal := aBuilder
		send: #'___grailShadowedSuper___'
		to: (self ___irModuleInstanceOn___: aBuilder) with: { } env: 1.
	^ aBuilder send: #value: to: probeBlk with: { probeVal } env: 0
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRSuperExplicitOn___: aBuilder
	"printSmalltalkOn:'s ``super(C, obj)'' inside a method of a module-scope
	class (cut 55): ``(Super @env1:checkedCls: <cls> obj: <obj>)''.  A first
	argument the MODULE binds (the class's own name, or any module-level class)
	reads through the module instance's class accessor, ``((<Mod>
	@env0:___instance___) @env1:C)'', because a bare class name is not
	reliably in scope inside that class's own method; a parameter holding a
	class, or a builtin type, is the argument's own value emit."

	| first cls obj |
	first := arguments at: 1.
	cls := ((CallAst classDefIsModuleScope == false)
		and: [first id asSymbol == CallAst classBeingCompiled asSymbol])
		ifTrue: [
			"A method-local class naming ITSELF: the cell, as the text writes it.
			 ___classCell___: and not the ForSuper variant -- the text uses
			 `Super checkedCls:' here, so the supercheck rides on the
			 CONSTRUCTOR rather than on the cell read, and reading through
			 ForSuper as well would apply it twice.

			 NAMING ITSELF is now part of the test.  This branch used to be
			 taken for ANY first argument inside a method-local class, so it
			 would have read the class's own cell where the source named
			 something else entirely -- which is what ___irSuperStaysOnText___
			 was keeping off the IR path (`CallAst:super-explicitNamesOtherClass').
			 The cell key ``___cell_<ClassName>___'' exists only under the
			 class's own name, so there is nothing to read for another; the two
			 branches below are what the text falls through to, and they are
			 correct here for the same reason they are correct there.

			 test_super's test_supercheck_fail is the shape: ``super(type_,
			 obj)'' where type_ is the method's own PARAMETER, so the first
			 argument is a plain local read and no cell is involved at all."
			aBuilder atNode: first.
			self ___emitIRDefiningClassReadOn___: aBuilder
				cellSelector: #'___classCell___:']
		ifFalse: [(first isModuleVariableName: first id asSymbol)
			ifTrue: [
				aBuilder atNode: first.
				aBuilder send: first id asSymbol to: (self ___irModuleInstanceOn___: aBuilder) with: { } env: 1]
			ifFalse: [first ___emitIRValueOn___: aBuilder]].
	obj := (arguments at: 2) ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder send: #checkedCls:obj: to: (aBuilder globalNamed: #Super) with: { cls. obj } env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRBuiltinsInstanceOn___: aBuilder
	"(((Python @env0:at: #builtins) instance)) -- at: dispatches in env 0, the
	rest in env 1, as printBareCallFastPathOn: spells it."

	| builtinsCls |
	builtinsCls := aBuilder
		send: #at: to: (aBuilder globalNamed: #Python)
		with: { aBuilder obj: #builtins } env: 0.
	^ aBuilder send: #instance to: builtinsCls with: { } env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRGeneralCallOn___: aBuilder
	"``(callee) @env1:___pyCallValue___: { args } kw: kw'' -- the text's fallback
	for an attribute call no fast path claims (``((obj) ___pyAttrLoad___: #m)'' is
	the callee there) and for any other callee: a local holding a function, a call
	result, a subscript.  Python semantics is load THEN call; one protocol routes
	BoundMethods, classes, blocks and callable attributes.

	The TEXT path spells this send ``value:value:'' and this path deliberately
	does not, the one place the two diverge.  Both selectors mean the same thing
	-- BoundMethod>>___pyCallValue___:kw: is literally ``^ self value: positional
	value: kwargs'', classes construct either way, and object's default raises the
	same ``not callable'' TypeError -- but a BLOCK receiver is reachable only
	through this one, and the text path gets that case from the compiler rather
	than from the selector:

	The Smalltalk source compiler turns every ``value:value:'' site into the VM's
	special block send, which class-tests the receiver at run time -- an ExecBlock
	is activated directly, anything else falls through to an ordinary env-1 send.
	So on the text path a nested def (a two-argument block
	[:___positional___ :___kwargs___ | ...]) is called by the very same send that
	reaches a BoundMethod, and ExecBlock needs no env-1 method.

	The IR path cannot get that send.  GsComSendNode>>optimize attaches the
	opcode only when the receiver is statically a GsComBlockNode -- a LITERAL
	block at the send site -- and the callee here is always a variable or an
	expression, so an ordinary env-1 lookup happens; with nothing on ExecBlock it
	found object>>value:value: and every call of a nested def raised ``'ExecBlock'
	object is not callable''.  Silently, because a module-body decorator swallows
	it and installs the function undecorated: that is what made ``add(1, 2)''
	answer 3 instead of 6 and left the @functools.wraps attributes off
	(AttributeError: no '__wrapped__').

	Nor can Grail supply the missing method: compiling a ``value:value:'' method
	on ExecBlock is refused by the kernel with error 1046, ``You may not compile a
	method for this selector'' -- the value family is VM-special -- and
	GsComSendNode exposes neither selLeaf nor selLeaf:, so attaching the opcode
	from here would mean instVarAt:put: on a kernel node.  ___pyCallValue___:kw:
	is the supported route: ExecBlock already implements it (dispatching on
	numArgs, forwarding a 2-arg block as (positional, kwargs) -- exactly what the
	opcode does), and it is the same protocol the text path itself uses whenever
	the callee is only maybe-callable.

	The cheaper fix is a kernel one -- let optimize attach the special send for a
	non-literal receiver, as the source compiler already does for the same source
	-- and it would let this emit go back to spelling value:value:."

	| callee argsArray kw |
	callee := function ___emitIRValueOn___: aBuilder.
	"printArgumentsArrayOn:: the brace literal, or the splat concatenation."
	argsArray := self ___emitIRElementsArrayOn___: aBuilder elts: arguments.
	kw := self ___emitIRKeywordsOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder send: #'___pyCallValue___:kw:' to: callee
		with: { argsArray. kw } env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___irReadLocalNamesInto___: aSet locals: localSet
	"The callee expression (a local is a read; a compile-time-named builtin or
	class is not in localSet and adds nothing), every argument, every keyword
	value."

	function ___irReadLocalNamesInto___: aSet locals: localSet.
	arguments do: [:a | a ___irReadLocalNamesInto___: aSet locals: localSet].
	keywords do: [:k | k value ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%


category: 'Grail-IR Codegen'
method: CallAst
___emitIRGlobalsViewOn___: aBuilder
	"``(PyModuleDict @env0:on: <recv>)'' -- both sends env 0, and the receiver
	is the text's ___moduleStoreReceiverExpr___ choice: ``self'' in the module
	body and its top-level defs, where self IS the module instance; the module
	SINGLETON inside a class method, where self is the Python instance instead.
	The doit spelling is refused by the shape test, so
	___globalsViewReceiverExpr___ reduces to this pair.

	Its own method because bare dir() reaches the same view through
	___emitIRScopeNamespaceOn___: (cut 85)."

	| recv |
	recv := self ___emitIRModuleStoreReceiverOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder
		send: #'on:'
		to: (aBuilder globalNamed: #PyModuleDict)
		with: { recv }
		env: 0
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRModuleStoreReceiverOn___: aBuilder
	"AbstractNode >> ___moduleStoreReceiverExpr___ as an IR node: ``self'' in
	the module body and its top-level defs, where self IS the module instance,
	and ``<Module> @env0:___instance___'' inside a class method, where self is
	the Python instance instead.

	Its own method because two emits want the same receiver and only one of
	them wraps it: ___emitIRGlobalsViewOn___: puts a PyModuleDict around it,
	___emitIRBareEvalExecOn___: hands it to ___evalScopeFor___:locals: raw."

	^ CallAst classBeingCompiled notNil
		ifTrue: [aBuilder
			send: #'___instance___'
			to: (aBuilder globalNamed: CallAst moduleClassBeingCompiled name asSymbol)
			with: { } env: 0]
		ifFalse: [aBuilder selfNode]
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRScopeNamespaceOn___: aBuilder
	"The namespace printLocalsCallOn: would print HERE, as an IR node: the
	function's locals snapshot in function scope, the live module view at
	module scope.  Those are the only two of its five cases the IR path
	spells; the shape tests that reach this (#localsSnapshot, #globalsView,
	#dirOfScope) each exclude a class body and a comprehension already, so
	this method needs no test for them -- it must not be called from a shape
	that admits one."

	^ CallAst functionBeingCompiled notNil
		ifTrue: [self ___emitIRLocalsSnapshotOn___: aBuilder]
		ifFalse: [self ___emitIRGlobalsViewOn___: aBuilder]
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRDirOfScopeOn___: aBuilder
	"``((Python @env0:at: #builtins) instance) @env1:___dirOfNamespace___: (<ns>)''
	-- the IR twin of printSmalltalkOn:'s step 0b' rewrite of a bare dir().
	Python defines dir() with no argument as the names in the current scope,
	so the text routes it through the SAME machinery locals() uses rather than
	inventing a second way to find the scope; this does likewise, which is why
	it is a thin wrapper over ___emitIRScopeNamespaceOn___: and not a shape of
	its own.  The one-argument form dir(x) is an ordinary builtins call and
	never reaches here.

	Stamp last: the namespace emit re-stamps the builder for its own sends, so
	atNode: has to come after it and before the send it labels."

	| ns |
	ns := self ___emitIRScopeNamespaceOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder
		send: #'___dirOfNamespace___:'
		to: (self ___emitIRBuiltinsInstanceOn___: aBuilder)
		with: { ns }
		env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRBareEvalExecOn___: aBuilder
	"``(builtins instance) _eval: { <expr>. (builtins instance)
	___evalScopeFor___: <moduleReceiver> locals: <localsSnapshot> } kw: nil''
	-- the IR twin of printBareEvalExecOn:, printSmalltalkOn:'s step 0c.

	WHY THE REWRITE EXISTS AT ALL, because emitting the ordinary builtin call
	instead is not a smaller version of this, it is a wrong answer.  Grail's
	_eval/_exec run in an EMPTY scope unless a namespace is handed in, so
	``eval('val.split()[0]')'' referencing the local ``val'' raised ``undefined
	symbol'' until the text learned to inject the enclosing function's locals
	as the globals argument.  An IR path that skipped the rewrite would
	re-create exactly that.

	The namespace is the enclosing MODULE's globals with the locals laid over
	them, assembled by builtins ___evalScopeFor___:locals:.  The receiver is
	the text's ___moduleStoreReceiverExpr___ choice and the locals are the same
	snapshot cut 84 taught this path to build, so the whole emit is the two
	pieces already here plus the call that joins them -- which is why this cut
	is an emit and not machinery.

	The shape test guarantees a NameAst eval/exec, one positional, no keywords,
	and a #topLevelDef or #method scope.  Module scope and a comprehension
	cannot reach here: step 0c's other arm prints ___globalsViewReceiverExpr___
	with the comprehension's own targets, which this path has no twin for.  A
	comprehension is kept out by #bareRewrite, which refuses every scope but
	#topLevelDef and #method; module scope is kept out by
	___irIsBareEvalExecRewrite___ itself, which answers false where the parent
	chain holds no def, lambda or comprehension."

	| builtinsInst argVal scope |
	argVal := (arguments at: 1) ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	scope := aBuilder
		send: #'___evalScopeFor___:locals:'
		to: (self ___emitIRBuiltinsInstanceOn___: aBuilder)
		with: {
			self ___emitIRModuleStoreReceiverOn___: aBuilder.
			self ___emitIRLocalsSnapshotOn___: aBuilder }
		env: 1.
	aBuilder atNode: self.
	^ aBuilder
		send: ('_' , function id asString , ':kw:') asSymbol
		to: (self ___emitIRBuiltinsInstanceOn___: aBuilder)
		with: { aBuilder arrayOf: { argVal. scope }. aBuilder nilLit }
		env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRLocalsSnapshotOn___: aBuilder
	"``(builtins instance) ___buildLocals___: { {'name'. <read>}. ... }'' -- the
	IR twin of printFunctionLocalsSnapshotOn:, in the same ORDER, which is
	load-bearing: free variables first, then the function's own names sorted,
	then comprehension targets last so they shadow a same-named local.
	___buildLocals___: drops the entries whose value is still nil, which is how
	a not-yet-bound name stays out of the dict.

	Each name resolves as the text resolves it: a self/cls parameter is
	Smalltalk ``self'', a reserved-named PARAMETER is its transport temp (a
	reserved-named non-parameter local is omitted by both paths, its temp
	having been renamed), anything else is the plain local.

	A name with no registered leaf RAISES out of ``localVar:'', which the seam
	turns into a fallback to the whole method's text.  That is the wanted
	behaviour and not a bug to guard: the text would emit the bare identifier
	and rely on it being a temp of the generated method, and if this builder
	has no leaf for it the two paths would disagree about what the dict holds.
	Better to fall back than to answer a different dict."

	| fn names paramNames pairs reserved |
	fn := CallAst functionBeingCompiled.
	names := fn body variables asSortedCollection: [:a :b | a asString <= b asString].
	paramNames := fn allParameterNames.
	reserved := #(#'self' #'super' #'thisContext' #'nil' #'true' #'false').
	pairs := OrderedCollection new.
	(CallAst ___freeVariableNamesFor___: fn) do: [:each |
		pairs add: (aBuilder arrayOf: {
			aBuilder obj: each asString.
			self ___emitIRFreeVariableRead___: each asSymbol parent: fn body on: aBuilder })].
	names do: [:each |
		(CallAst isSelfReference: each)
			ifTrue: [
				pairs add: (aBuilder arrayOf: {
					aBuilder obj: each asString. aBuilder selfNode })]
			ifFalse: [
				(reserved includes: each)
					ifTrue: [
						(paramNames detect: [:pp | pp asString = each asString] ifNone: [nil]) ~~ nil
							ifTrue: [
								"By the PYTHON name, NOT the transport name.  The text
								prints Smalltalk source, so it must spell the ``_nil''
								identifier; the builder registers that parameter's leaf
								under the python name and only NAMES the leaf ``_nil''
								(tempNamed:leafName:), so translating here asked for a
								local that does not exist and raised -- one silent
								fallback per function with a reserved-named parameter,
								found by the cut 85 probe."
								pairs add: (aBuilder arrayOf: {
									aBuilder obj: each asString.
									aBuilder localVar: each asSymbol })]]
					ifFalse: [
						pairs add: (aBuilder arrayOf: {
							aBuilder obj: each asString.
							aBuilder localVar: each asSymbol })]]].
	self ___enclosingComprehensionTargetNames___ do: [:each |
		pairs add: (aBuilder arrayOf: {
			aBuilder obj: each asString.
			aBuilder localVar: each asSymbol })].
	aBuilder atNode: self.
	^ aBuilder
		send: #'___buildLocals___:'
		to: (self ___emitIRBuiltinsInstanceOn___: aBuilder)
		with: { aBuilder arrayOf: pairs }
		env: 1
%

category: 'Grail-IR Codegen'
method: CallAst
___irSuperScopeRefusal___
	"WHICH non-module-scope shape this super() call sits in.

	`classDefIsModuleScope' is one boolean answering for THREE different
	shapes -- ClassDefAst>>isModuleScopeClassDef returns false when there is no
	module class at all, when the class is nested in another class BODY, and
	when it is nested in a function -- so the single census row
	`CallAst:super-methodLocalClass' was named for the third while counting all
	three.  That is the same conflation `method:classNotAtModuleScope' had
	(split in #933, where the measurement showed the whole row was ONE shape
	and a cut aimed at the other half would have retired nothing).  Told apart
	here so the ranking says which cut to make.

	Read from the PARENT CHAIN, as ___irEnclosingClassIsMethodLocal___ is, and
	for the same reason: the compile-context boolean cannot tell the shapes
	apart after the fact."

	| node cls |
	CallAst moduleClassBeingCompiled isNil
		ifTrue: [^ #'CallAst:super-doitScopeClass'].
	node := parent.
	cls := nil.
	[node notNil and: [cls isNil]] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [cls := node] ifFalse: [node := node parent]].
	cls isNil ifTrue: [^ #'CallAst:super-noEnclosingClass'].
	node := cls parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [^ #'CallAst:super-methodLocalClass'].
		(node isKindOf: ClassDefAst)
			ifTrue: [^ #'CallAst:super-classInClassBody'].
		node := node parent].
	^ #'CallAst:super-methodLocalClass'
%

category: 'Grail-IR Codegen'
method: CallAst
___irEvalScopeKinds___
	"Every lexical scope this node sits inside, innermost first, as Symbols:
	#def, #lambda, #comprehension, #class.

	READ FROM THE PARENT CHAIN, never from the compile context.  The
	eligibility probe runs in a different frame from the emit -- the trap that
	cost cut 76 a session -- so ``CallAst functionBeingCompiled'', which is the
	test the TEXT's step-0 rewrite makes, answers about someone else's def
	while a probe is walking this one.  The chain is a property of the tree and
	says the same thing in both frames."

	| node kinds |
	kinds := OrderedCollection new.
	node := parent.
	[node notNil] whileTrue: [
		(node isKindOf: FunctionDefAst) ifTrue: [kinds add: #def].
		(node isKindOf: LambdaAst) ifTrue: [kinds add: #lambda].
		((node isKindOf: ListCompAst)
			or: [(node isKindOf: DictCompAst)
			or: [(node isKindOf: SetCompAst)
			or: [node isKindOf: GeneratorExpAst]]])
				ifTrue: [kinds add: #comprehension].
		(node isKindOf: ClassDefAst) ifTrue: [kinds add: #class].
		node := node parent].
	^ kinds asArray
%

category: 'Grail-IR Codegen'
method: CallAst
___irEvalExecRefusalReason___
	"Why this ``eval''/``exec'' call cannot go through IR, as a census Symbol,
	or nil when it can.  ONE reason, since the frame-machinery cut:

	#bareRewrite -- ``eval(expr)'' / ``exec(src)'' with ONE positional argument
	and no keywords, in function scope or inside a comprehension.  The text
	does not dispatch that to the builtin at all: step 0c rewrites it into
	printBareEvalExecOn:, injecting the enclosing scope's locals as the
	evaluation namespace.  The IR path has no spelling for that rewrite, and
	emitting the ordinary builtin call instead would run the expression in an
	empty scope -- a wrong answer, not a missing feature.  The guard here
	mirrors step 0c's, with its ``functionBeingCompiled notNil'' replaced by
	the context-free chain test (see ___irEvalScopeKinds___); a comprehension
	counts because step 0c's second arm admits one at module scope.

	#nested USED TO BE THE SECOND, and is gone.  It refused any eval/exec
	inside a nested def, a lambda or a comprehension, because eval with
	globals/locals holding None means ``use the CALLER's namespaces'', found at
	run time by walking to the innermost frame carrying a codegen marker temp,
	and a nested def compiles to a BLOCK whose frame carried no marker -- so the
	walk ran past it to the enclosing method and read the wrong temps, measured
	diverging in both directions.  The fix was to give those two blocks the
	marker the text has always put in them; see the long note in
	___irEligibleValueLocals___: for what it closed and the one asymmetry it
	leaves.  A nested BARE eval still refuses, under #bareRewrite, which is a
	different gap.

	EVERY OTHER SHAPE COMPILES.  Nothing above is a reason to refuse
	``eval(e, g, l)'' in a top-level def, in a method, or at module scope: #906
	taught ___namesIncludeCodegenMarker___: both marker spellings, and those
	three were each measured to agree with text and CPython afterwards.  The
	row used to refuse the NAME at every arity in every scope, which is why it
	read 129 while naming a divergence that needs a nested def to happen."

	| shape |
	shape := self ___irEvalScopeShape___.
	(self ___irIsBareEvalExecRewrite___
		and: [self ___irBareRewriteScopeSpellable___ not])
			ifTrue: [^ #bareRewrite].
	^ nil
%

category: 'Grail-IR Codegen'
method: CallAst
___irBareRewriteScopeSpellable___
	"Can ___emitIRBareEvalExecOn___: spell step 0c's rewrite for THIS scope?

	It used to be ``#topLevelDef or #method'' -- the two ___irEvalScopeShape___
	names -- which also refused a bare eval inside a NESTED def, and that was
	one scope too many.  printSmalltalkOn: emits the SAME rewrite there:
	measured on ``def f(): def inner(): x = 20; return eval('x + 1')'', the
	generated text is character for character the top-level def's shape,
	``(builtins) _eval: { src. (builtins) ___evalScopeFor___: self locals:
	((builtins) ___buildLocals___: { { 'x'. x } }) } kw: nil''.  Step 0c's
	first arm claims both -- its test is ``functionBeingCompiled notNil'' --
	and ___emitIRLocalsSnapshotOn___: reads the SAME
	``CallAst functionBeingCompiled'', which inside a nested block emit is the
	nested def itself.  So the snapshot gathers that def's own names with no
	change at all.

	WHAT STAYS REFUSED is a scope whose locals the snapshot cannot build: a
	COMPREHENSION, whose targets step 0c prints through
	___globalsViewReceiverExpr___ instead, and a CLASS BODY, which is not a
	namespace the snapshot models.  Both are named here rather than inferred
	from the shape symbol, because #nested lumps all three together and only
	the comprehension and the class body are actually unspellable.

	A LAMBDA cannot reach this at all -- it holds an expression, and step 0c's
	rewrite is a statement-level one -- but it is admitted by the same rule it
	would take if it could, since a lambda's own scope is a def's."

	| kinds |
	kinds := self ___irEvalScopeKinds___.
	kinds isEmpty ifTrue: [^ false].
	"The INNERMOST scope must be a def or a lambda.  A #class first means the
	call sits directly in a class BODY, which is not a namespace the snapshot
	models; a #class further out is just the class a METHOD belongs to, and
	that case was always admitted (___irEvalScopeShape___'s #method)."
	((kinds at: 1) == #def or: [(kinds at: 1) == #lambda]) ifFalse: [^ false].
	"A COMPREHENSION anywhere: step 0c prints its targets through
	___globalsViewReceiverExpr___, which this path has no twin for."
	^ (kinds anySatisfy: [:k | k == #comprehension]) not
%

category: 'Grail-IR Codegen'
method: CallAst
___irEvalScopeShape___
	"___irEvalScopeKinds___ classified: #moduleScope, #topLevelDef, #method or
	#nested.  #topLevelDef and #method are the only two
	___emitIRLocalsSnapshotOn___: can take a snapshot in, which is the one
	thing this answer still decides: the BARE rewrite is refused outside those
	two, and nothing else reads it.

	It is no longer a refusal in its own right.  #nested once meant ``this call
	would read the wrong frame''; the marker cut made the frame right, and the
	shapes with explicit namespaces never read a frame at all.

	#nested is everything else, deliberately including a class BODY (kinds
	#(#class)) and a comprehension at module scope (kinds #(#comprehension)):
	each is a scope printLocalsCallOn: spells through a different helper that
	the IR path has no twin for, so a bare rewrite in either would snapshot the
	wrong names -- which is exactly what #bareRewrite still refuses."

	| kinds |
	kinds := self ___irEvalScopeKinds___.
	kinds isEmpty ifTrue: [^ #moduleScope].
	kinds = #(#def) ifTrue: [^ #topLevelDef].
	kinds = #(#def #class) ifTrue: [^ #method].
	^ #nested
%

category: 'Grail-IR Codegen'
method: CallAst
___irIsBareEvalExecRewrite___
	"Whether printSmalltalkOn:'s step 0c claims this call: a single positional
	``eval(expr)'' / ``exec(src)'', no keywords, in function scope or inside a
	comprehension.

	The STATIC twin of that guard.  Step 0c asks ``CallAst
	functionBeingCompiled notNil or: [enclosing comprehension targets
	notEmpty]''; the first half is a compile-context read and answers about
	another frame's def during an eligibility probe, so both halves are read
	off the parent chain here instead.  The chain is a property of the tree and
	says the same thing in the probe and in the emit."

	(arguments size = 1 and: [keywords isEmpty]) ifFalse: [^ false].
	^ self ___irEvalScopeKinds___ anySatisfy: [:k |
		k == #def or: [k == #lambda or: [k == #comprehension]]]
%

category: 'Grail-IR Codegen'
method: CallAst
___irRefusalDetail___: localSet
	"___irCallShapeUnguarded___'s nil exits, told apart for the census."

	(function isKindOf: NameAst) ifTrue: [
		function id = #'super' ifTrue: [
			"IN ___irSuperShape___'S ORDER, which is the order the refusal
			actually happens in.  This used to test SCOPE second and so reported
			`super-methodLocalClass' for any method-local class, whatever had
			really refused it.  That was harmless while scope itself refused;
			once the cell read made method-local classes eligible it became a
			lie -- 35 rows still named the scope while the blocker was an
			argument-0 guard or an explicit call naming another class.  A row
			must name what to fix."
			"ONLY the shapes the text's super branch actually claims get a
			super-specific reason now.  A call that fails those guards falls
			through to the ordinary call path on BOTH paths, so if it refuses at
			all it refuses for an ordinary reason -- an inemittable argument,
			say -- and naming ``super'' would send the next reader after a cut
			that is already made.  That is the lesson the argument-0 note below
			records, applied one level up."
			self ___irSuperStaysOnText___ ifFalse: [
				CallAst classBeingCompiled isNil ifFalse: [
					self ___superNameIsShadowed___ ifTrue: [
						^ #'CallAst:super-shadowed']]].
			"NO ARGUMENT-0 TEST HERE ANY MORE.  It used to answer
			`super-argZeroDeletable' whenever ___superArgZeroGuardName___ was
			non-nil, mirroring a refusal ___irSuperShape___ has since dropped.
			Leaving it would re-create exactly the lie the comment above warns
			about: the shape now ACCEPTS, so a method that reaches this walk
			refused somewhere else entirely, and naming argument 0 would send
			the next reader after a cut that is already made."
			arguments isEmpty ifTrue: [
				keywords isEmpty ifFalse: [^ #'CallAst:super-keywords'].
				self ___superNameIsShadowed___ ifTrue: [^ #'CallAst:super-shadowed'].
				CallAst classBeingCompiled isNil ifTrue: [^ #'CallAst:super-noClass'].
				CallAst moduleClassBeingCompiled isNil
					ifTrue: [^ #'CallAst:super-doitScopeClass'].
				^ #'CallAst:super-other'].
			self ___irSuperStaysOnText___ ifTrue: [
				^ #'CallAst:super-explicitNamesOtherClass']].
		"eval/exec name WHICH of the two conditions refused, because they are
		different cuts: -bareRewrite wants the text's compile-time locals
		injection spelled in IR, -nested wants the frame walk to find a block
		frame's enclosing method.  A row that named only the builtin would put
		them in one bucket and send the next reader after the wrong one.  When
		neither refuses, the call is an ordinary builtin dispatch and falls
		through to the rows below, as any other name would."
		(#(#'eval' #'exec') includes: function id) ifTrue: [
			self ___irEvalExecRefusalReason___ ifNotNil: [:r |
				^ ('CallAst:frameSensitive-' , function id asString , '-' , r asString)
					asSymbol]].
		(#(#'globals' #'locals' #'vars' #'dir') includes: function id)
			ifTrue: [^ ('CallAst:frameSensitive-' , function id asString) asSymbol].
		"NO ARITY-MISMATCH ROWS HERE ANY MORE.  Both shapes -- a known builtin
		and a known class whose arity matched no selector -- now compile (cut:
		the arity mismatch), so neither can reach this walk, and a name that
		cannot fire is worse than no name: the next call to refuse for an
		unrelated reason would have been labelled `builtinArityMismatch' and
		sent its reader after a cut already made.  That is the lie the super
		note above records, so it is not re-created here.  An unclassified
		refusal falls to `CallAst:other', which is honest about being one."].
	^ #'CallAst:other'
%

category: 'Grail-IR Codegen'
classmethod: CallAst
___compileContextSnapshot___
	"A copy of the session compile context every class-side accessor above
	reads, taken while a class body is being emitted so that a DEFERRED IR
	build -- importlib ___irInstallDef:on:or:category:, which runs when the
	emitted class-build code executes and the class finally exists -- can
	build the method under exactly the context its text twin was generated
	under (classBeingCompiled, selfParameterName, classFunctionNames, the
	slot / backing instVar sets, moduleClassBeingCompiled, ...).

	The lexical scope stack (___scopeStack___) is copied too, not shared: a
	shallow copy of the context would hand the deferred build the LIVE
	OrderedCollection, which ___restoreScopeDepth___: has truncated by the time
	the class-build statement runs -- so the arity messages a varargs method's
	prologue bakes in (``Gauge.advance() got an unexpected keyword argument'')
	lost their class prefix (cut 44)."

	| snap |
	snap := self ___compileContext___ copy.
	(snap at: #'scopeStack' otherwise: nil) ifNotNil: [:stack |
		snap at: #'scopeStack' put: stack copy].
	^ snap
%

category: 'Grail-IR Codegen'
classmethod: CallAst
___withCompileContext___: aSnapshot do: aBlock
	"Run aBlock with aSnapshot (a copy of it) installed as the session compile
	context, restoring whatever was there afterwards."

	| temps saved |
	temps := SessionTemps current.
	saved := temps at: #'GrailCompileContext' otherwise: nil.
	temps at: #'GrailCompileContext' put: aSnapshot copy.
	^ aBlock ensure: [
		saved isNil
			ifTrue: [temps removeKey: #'GrailCompileContext' ifAbsent: []]
			ifFalse: [temps at: #'GrailCompileContext' put: saved]]
%

category: 'Grail-IR Codegen'
method: CallAst
___irStampChild___
	^ function
%

category: 'Grail-IR Codegen'
method: CallAst
___irArityMismatchName___
	"WHICH name printArityMismatchErrorOn:forName: would be handed here.

	The precedence is ___irCallShapeUnguarded___'s own: the builtin arm is
	tested first and returns before the class arm is reached, so a name that
	is both takes the builtin spelling -- which is what the text does too,
	its builtin branch standing earlier in printSmalltalkOn:."

	(self knownBuiltinName notNil and: [
		(self ___hasVarargsClassConstructor___ or: [self hasStarredArgument]) not])
			ifTrue: [^ self knownBuiltinName].
	^ self knownClassName
%

category: 'Grail-IR Codegen'
method: CallAst
___emitIRArityMismatchOn___: aBuilder
	"printArityMismatchErrorOn:forName: -- ``(TypeError ___signal___: '<msg>')''.

	ONE send carrying ONE literal, because that is the whole of the text's
	emit.  The message is built by the shared
	___arityMismatchMessageFor___:, so the two paths cannot drift; the count
	of positional and keyword arguments is a compile-time property of the
	node, which is why no part of this is a run-time computation.

	THE ARGUMENT EXPRESSIONS ARE NOT EMITTED, and that is deliberate rather
	than an omission: the text does not emit them either, so ``aiter(gen(), 1)''
	raises without ever calling ``gen()''.  CPython would evaluate the
	arguments first, so this is a real divergence -- but it is the TEXT's
	divergence, shared by construction, and reproducing the text is what
	makes the two paths substitutable.  Emitting the arguments here would be
	a unilateral fix on one path and would show up as a behaviour difference
	between flag-on and flag-off."

	| name |
	name := self ___irArityMismatchName___.
	aBuilder atNode: self.
	^ aBuilder send: #'___signal___:' to: (aBuilder globalNamed: #TypeError)
		with: { aBuilder obj: (self ___arityMismatchMessageFor___: name) }
%
