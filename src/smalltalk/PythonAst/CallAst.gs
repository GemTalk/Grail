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
  classInstVars: #('moduleClassBeingCompiled' 'moduleFunctionNames'
                    'classBeingCompiled' 'classInstVarNames'
                    'classFunctionNames' 'selfParameterName')
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

category: 'Grail-other'
method: CallAst
printSmalltalkOn: aStream
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
	"0. `globals()` — return the enclosing module's namespace. Inside any
	module-level def, `self` IS the module instance (a SymbolDictionary
	subclass), so emit `self` directly. This is a hack: it only matches
	the bare-name 0-arg call at compile time, and breaks down for
	`globals` aliased through a local. Good enough for module
	initialization code, which is where ports of CPython sources use it."
	((function isKindOf: NameAst)
		and: [function id = #'globals'
			and: [arguments isEmpty and: [keywords isEmpty]]])
				ifTrue: [aStream nextPutAll: 'self'. ^self].

	"Bare zero-arg ``super()`` inside a class method.  Rewrite to a
	Super proxy bound to (lexical class, first-arg-of-method).  The
	lexical class is reachable via the module instance's class-name
	instVar; the first arg is conventionally `self` or `cls`, both
	of which emit as Smalltalk `self` (see NameAst >> printSmalltalkOn:).
	Outside class-method context, fall through to the normal call
	dispatch (super will resolve to whatever the surrounding scope
	binds it to, typically NameError)."
	((function isKindOf: NameAst)
		and: [function id = #'super'
			and: [arguments isEmpty
				and: [keywords isEmpty
					and: [CallAst classBeingCompiled notNil
						and: [CallAst moduleClassBeingCompiled notNil]]]]])
		ifTrue: [
			aStream
				nextPutAll: '(Super @env1:cls: ((';
				nextPutAll: CallAst moduleClassBeingCompiled name;
				nextPutAll: ' @env0:___instance___) @env1:';
				nextPutAll: CallAst classBeingCompiled asString;
				nextPutAll: ') obj: self)'.
			^self].

	fastSelector := self bareCallFastPathSelector.
	fastSelector ifNotNil: [
		^ self printBareCallFastPathOn: aStream selector: fastSelector
	].

	(self bareCallVarargsSelector) ifNotNil: [:varargsSel |
		^ self printBareCallVarargsOn: aStream selector: varargsSel
	].

	"Both fast paths missed. If the name is a known builtin (some method
	on builtins matches the base name), the call has wrong arity or kwarg
	shape — emit a clean TypeError instead of falling through to the
	legacy form. Without this branch, calls like `abs(1, 2)` would
	produce a confusing `undefined symbol` compile error from the
	bare-name fallback (since `builtins` is no longer in the symbol list)."
	knownBuiltinName := self knownBuiltinName.
	knownBuiltinName ifNotNil: [
		^ self printArityMismatchErrorOn: aStream forName: knownBuiltinName
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
	(self knownClassName) ifNotNil: [:knownCls |
		^ self printArityMismatchErrorOn: aStream forName: knownCls
	].

	"AttributeAst's printSmalltalkOn emits ``(value) @env1:___pyAttrLoad___:
	#'attr'`` — a keyword message.  Without surrounding parens the
	following ``value:value:`` keywords merge into one selector
	``___pyAttrLoad___:value:value:``, which dispatches the wrong
	message.  Wrap the function expression in parens for attribute
	calls so the load is a complete unit before value:value: is sent
	to its result."
	(function isKindOf: AttributeAst)
		ifTrue: [
			aStream nextPut: $(.
			function printSmalltalkOn: aStream.
			aStream nextPut: $)
		]
		ifFalse: [function printSmalltalkOn: aStream].

	"Dispatch via ``@env1:value:value:`` so BoundMethod, ``Object
	class >> value:value:`` (built-in classes), synthesized Python-
	user-class ``value:value:``, and ExecBlock's env-1 forwarder all
	resolve consistently.  Bare ``value:value:`` was env-0 dispatch,
	which only ExecBlock implemented — so callables returned from
	``___pyAttrLoad___:`` (BoundMethods, classes) failed to invoke."
	aStream nextPutAll: ' @env1:value: { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} value: '.

	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Build keywords dictionary (legacy block-fetch path's kwargs)."
		"Use explicit env-0 dispatch — env-1 IdentityKeyValueDictionary
		has no `new` / `at:put:` / `yourself`.  Each cascaded message is
		prefixed with `@env0:` on the first keyword; subsequent keywords
		in the same message do NOT take the prefix (Smalltalk merges them
		into a single keyword selector by surface syntax)."
		aStream nextPutAll: '((IdentityKeyValueDictionary @env0:new)'.
		"keywords is an Array of KeywordAst; iterate element-wise."
		keywords do: [:kwAst |
			aStream nextPutAll: ' @env0:at: #'; nextPutAll: kwAst name asString; nextPutAll: ' put: '.
			kwAst value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
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
	(function isKindOf: NameAst) ifFalse: [^nil].
	keywords isEmpty ifFalse: [^nil].
	funcName := function id.
	(self isVariableIsDeclared: funcName) ifTrue: [^nil].

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
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	(self isVariableIsDeclared: funcName) ifTrue: [^nil].
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
	(self isVariableIsDeclared: funcName) ifTrue: [^nil].
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
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	keywords isEmpty ifFalse: [^nil].
	receiverName := function value id.
	receiverClass := self class resolveModuleClassForName: receiverName.
	receiverClass ifNil: [^nil].
	candidate := self class fastPathSelectorForAttr: function attr arity: arguments size.
	((receiverClass methodDictForEnv: 1) includesKey: candidate) ifFalse: [^nil].
	^ candidate
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
	sb := WriteStream on: String new.
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
	attrName := function attr asString.
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
	candidate := self class varargsSelectorForName: function attr.
	((receiverClass methodDictForEnv: 1) includesKey: candidate) ifFalse: [^nil].
	^ candidate
%

category: 'Grail-other'
method: CallAst
printAttributeCallVarargsOn: aStream selector: aSelector
	"Emit a varargs send for an attribute call:
		((receiver) _name: { arg1. arg2. } kw: kwargDict)"

	| attrName |
	attrName := function attr asString.
	aStream nextPut: $(.
	function value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _'; nextPutAll: attrName; nextPutAll: ': { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} kw: '.
	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Use explicit env-0 dispatch — env-1 IdentityKeyValueDictionary
		has no `new` / `at:put:` / `yourself`.  Each cascaded message is
		prefixed with `@env0:` on the first keyword; subsequent keywords
		in the same message do NOT take the prefix (Smalltalk merges them
		into a single keyword selector by surface syntax)."
		aStream nextPutAll: '((IdentityKeyValueDictionary @env0:new)'.
		"keywords is an Array of KeywordAst; iterate element-wise."
		keywords do: [:kwAst |
			aStream nextPutAll: ' @env0:at: #'; nextPutAll: kwAst name asString; nextPutAll: ' put: '.
			kwAst value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
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
	sb := WriteStream on: String new.
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
printBareCallFastPathOn: aStream selector: aSelector
	"Emit a fixed-arity keyword send to the builtins instance:
		((builtins instance) funcName: arg1 _: arg2 _: arg3 ...)
	`builtins` resolves to the class via the symbol list (Python dict);
	`instance` is the env-1 class method that returns the singleton."

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
	with a fixed selector instead of a SymbolDictionary lookup."

	| funcName |
	funcName := function id asString.
	aStream nextPutAll: '(((Python @env0:at: #builtins) instance) _'.
	aStream nextPutAll: funcName; nextPutAll: ': { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} kw: '.
	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Use explicit env-0 dispatch — env-1 IdentityKeyValueDictionary
		has no `new` / `at:put:` / `yourself`.  Each cascaded message is
		prefixed with `@env0:` on the first keyword; subsequent keywords
		in the same message do NOT take the prefix (Smalltalk merges them
		into a single keyword selector by surface syntax)."
		aStream nextPutAll: '((IdentityKeyValueDictionary @env0:new)'.
		"keywords is an Array of KeywordAst; iterate element-wise."
		keywords do: [:kwAst |
			aStream nextPutAll: ' @env0:at: #'; nextPutAll: kwAst name asString; nextPutAll: ' put: '.
			kwAst value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
	aStream nextPut: $)
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
	aStream nextPutAll: aSymbol asString.
	aStream nextPutAll: '() takes wrong number of arguments ('.
	aStream nextPutAll: arguments size printString.
	aStream nextPutAll: ' positional, '.
	aStream nextPutAll: keywords size printString.
	aStream nextPutAll: ' keyword) - no matching method'')'
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
	funcName := function id.
	(self isVariableIsDeclared: funcName) ifTrue: [^nil].
	cls := self class resolveClassForName: funcName.
	cls ifNil: [^nil].
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
	`cls value: { args } value: kw` path."

	| funcName cls metacls |
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	(self isVariableIsDeclared: funcName) ifTrue: [^nil].
	cls := self class resolveClassForName: funcName.
	cls ifNil: [^nil].
	metacls := cls class.
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
	sb := WriteStream on: String new.
	sb nextPutAll: '__new__:'.
	2 to: nargs do: [:i | sb nextPutAll: '_:'].
	^ sb contents asSymbol
%

category: 'Grail-Class-Call Fast Path'
method: CallAst
printBareCallClassNewOn: aStream selector: aSelector
	"Emit a class-call fast path:
	  0-arg: `(cls @env1:__new__)`
	  1-arg: `(cls @env1:__new__: arg)`
	  N-arg: `(cls @env1:__new__: arg1 _: arg2 _: ...)`

	Receiver is the bare class name (`function id`); the symbol-list lookup
	at compile time resolves it to the appropriate GemStone class."

	| funcName nargs |
	funcName := function id asString.
	nargs := arguments size.
	aStream nextPut: $(.
	aStream nextPutAll: funcName.
	aStream nextPutAll: ' @env1:__new__'.
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
moduleClassBeingCompiled
	^ moduleClassBeingCompiled
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleClassBeingCompiled: aClassOrNil
	moduleClassBeingCompiled := aClassOrNil
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleFunctionNames
	^ moduleFunctionNames
%

category: 'Grail-Module Compile Context'
classmethod: CallAst
moduleFunctionNames: aSetOrNil
	moduleFunctionNames := aSetOrNil
%

! ===============================================================================
! Class method compile context
! ===============================================================================

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBeingCompiled
	^ classBeingCompiled
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classBeingCompiled: aClassOrNil
	classBeingCompiled := aClassOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classInstVarNames
	^ classInstVarNames
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classInstVarNames: aSetOrNil
	classInstVarNames := aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classFunctionNames
	^ classFunctionNames
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
classFunctionNames: aSetOrNil
	classFunctionNames := aSetOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
selfParameterName
	^ selfParameterName
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
selfParameterName: aSymbolOrNil
	selfParameterName := aSymbolOrNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
isInClassMethodContext
	^ classBeingCompiled notNil
%

category: 'Grail-Class Compile Context'
classmethod: CallAst
isSelfReference: aSymbol
	^ classBeingCompiled notNil and: [aSymbol == selfParameterName]
%

category: 'Grail-Class Self-Send'
method: CallAst
classSelfSendSelector
	"Return the selector for a self.method(args) call in class method context, or nil.

	Eligibility:
	  * classBeingCompiled is non-nil
	  * function is an AttributeAst whose value is a NameAst matching selfParameterName
	  * No keyword arguments (kwargs use varargs form)
	  * The attribute name is in classFunctionNames"

	| attrName |
	(self class isInClassMethodContext) ifFalse: [^nil].
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	(self class isSelfReference: function value id) ifFalse: [^nil].
	attrName := function attr.
	(self class classFunctionNames includes: attrName asSymbol) ifFalse: [^nil].
	keywords isEmpty ifFalse: [^nil].
	^ self class fastPathSelectorForAttr: attrName arity: arguments size
%

category: 'Grail-Class Self-Send'
method: CallAst
classSelfSendVarargsSelector
	"Return the varargs selector for a self.method(args, kw=val) call, or nil."

	| attrName candidate |
	(self class isInClassMethodContext) ifFalse: [^nil].
	(function isKindOf: AttributeAst) ifFalse: [^nil].
	(function value isKindOf: NameAst) ifFalse: [^nil].
	(self class isSelfReference: function value id) ifFalse: [^nil].
	attrName := function attr.
	(self class classFunctionNames includes: attrName asSymbol) ifFalse: [^nil].
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
	attrName := function attr.
	^ (self class classFunctionNames includes: attrName asSymbol) not
%

category: 'Grail-Class Self-Send'
method: CallAst
printClassSelfSendOn: aStream selector: aSelector
	"Emit a self-send: (self method: arg1 _: arg2 ...)"

	| attrName nargs |
	attrName := function attr asString.
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
	attrName := function attr asString.
	aStream nextPutAll: '(self _'.
	aStream nextPutAll: attrName; nextPutAll: ': { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} kw: '.
	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Use explicit env-0 dispatch — env-1 IdentityKeyValueDictionary
		has no `new` / `at:put:` / `yourself`.  Each cascaded message is
		prefixed with `@env0:` on the first keyword; subsequent keywords
		in the same message do NOT take the prefix (Smalltalk merges them
		into a single keyword selector by surface syntax)."
		aStream nextPutAll: '((IdentityKeyValueDictionary @env0:new)'.
		"keywords is an Array of KeywordAst; iterate element-wise."
		keywords do: [:kwAst |
			aStream nextPutAll: ' @env0:at: #'; nextPutAll: kwAst name asString; nextPutAll: ' put: '.
			kwAst value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
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
	self class moduleClassBeingCompiled ifNil: [^nil].
	"Don't self-send while compiling a class body — bare names there
	follow Python's LEGB and resolve through the module singleton,
	not as `self.X(...)`."
	self class classBeingCompiled ifNotNil: [^nil].
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	(self class moduleFunctionNames includes: funcName) ifFalse: [^nil].
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
	self class moduleClassBeingCompiled ifNil: [^nil].
	"Don't self-send while compiling a class body — bare names there
	follow Python's LEGB and resolve through the module singleton,
	not as `self.X(...)`."
	self class classBeingCompiled ifNotNil: [^nil].
	(function isKindOf: NameAst) ifFalse: [^nil].
	funcName := function id.
	(self class moduleFunctionNames includes: funcName) ifFalse: [^nil].
	candidate := self class varargsSelectorForName: funcName.
	((self class moduleClassBeingCompiled methodDictForEnv: 1) includesKey: candidate)
		ifFalse: [^nil].
	^ candidate
%

category: 'Grail-Module Self-Send'
method: CallAst
printModuleSelfSendOn: aStream selector: aSelector
	"Emit a direct self-send for a module-level function call:
		(self name: arg1 _: arg2 ...)
	or for 0-arg:
		(self name)"

	| funcName nargs |
	funcName := function id asString.
	nargs := arguments size.
	aStream nextPutAll: '(self '.
	aStream nextPutAll: funcName.
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

category: 'Grail-Module Self-Send'
method: CallAst
printModuleSelfSendVarargsOn: aStream selector: aSelector
	"Emit a varargs self-send for a module function call:
		(self _name: { arg1. arg2. } kw: kwargDict)"

	| funcName |
	funcName := function id asString.
	aStream nextPutAll: '(self _'.
	aStream nextPutAll: funcName; nextPutAll: ': { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} kw: '.
	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Use explicit env-0 dispatch — env-1 IdentityKeyValueDictionary
		has no `new` / `at:put:` / `yourself`.  Each cascaded message is
		prefixed with `@env0:` on the first keyword; subsequent keywords
		in the same message do NOT take the prefix (Smalltalk merges them
		into a single keyword selector by surface syntax)."
		aStream nextPutAll: '((IdentityKeyValueDictionary @env0:new)'.
		"keywords is an Array of KeywordAst; iterate element-wise."
		keywords do: [:kwAst |
			aStream nextPutAll: ' @env0:at: #'; nextPutAll: kwAst name asString; nextPutAll: ' put: '.
			kwAst value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
	aStream nextPut: $)
%
