! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- BoundMethod class definition
expectvalue /Class
doit
Object subclass: 'BoundMethod'
  instVarNames: #( receiver selector
                    sel0 sel1 sel2 sel3 selVarargs )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BoundMethod comment:
'A first-class handle to a Smalltalk method on a specific receiver, used to
support Python "function as value" semantics in the dispatch model.

Background. Python lets you read a function as a value:

    f = abs
    f(-5)              # 5

In the current dispatch model (see docs/Rewrite_Dispatch_Model.md), the
direct call `abs(-5)` compiles to a fast-path Smalltalk method send
`(builtins instance) abs: -5`. But the assignment `f = abs` requires
something callable to be stored in the local `f`. We can''t store a
CompiledMethod and send `value:` to it directly (current GemStone does
not allow that), so we wrap it in a small object that knows its receiver
and selector.

Selectors for common arities (0..3 positional args) are precomputed at
construction time, avoiding the ~230 ns per-call cost of building them
dynamically via WriteStream + asSymbol. The dispatch path tries the
precomputed fixed-arity selector first; if that selector has no matching
method, it falls back to the `_name:kw:` varargs convention (also
precomputed).
'
%

expectvalue /Class
doit
BoundMethod category: 'Grail-Modules'
%

! ------------------- Remove existing behavior from BoundMethod
removeallmethods BoundMethod
removeallclassmethods BoundMethod

set compile_env: 0

! ------------------- Instance methods (env 0 — internal setup and accessors)

category: 'Grail-Private'
method: BoundMethod
_setReceiver: aReceiver selector: aSymbol
	"Initialize and precompute arity-resolved selectors for arities 0..3
	plus the varargs `_name:kw:` selector. Selector building happens ONCE
	at construction time, not on every call."

	| s |
	receiver := aReceiver.
	selector := aSymbol.
	s := aSymbol asString.
	sel0 := aSymbol.
	sel1 := (s , ':') asSymbol.
	sel2 := (s , ':_:') asSymbol.
	sel3 := (s , ':_:_:') asSymbol.
	selVarargs := ('_' , s , ':kw:') asSymbol.
%

category: 'Grail-Accessing'
method: BoundMethod
receiver
	^ receiver
%

category: 'Grail-Accessing'
method: BoundMethod
selector
	^ selector
%

category: 'Grail-Comparison'
method: BoundMethod
= other
	"Smalltalk equality mirrors the Python __eq__ (receiver identity +
	selector) so a BoundMethod works as a Python set/dict key -- Grail's
	set/dict key on Smalltalk =/hash, not on __hash__/__eq__.  BoundMethods
	are transient (minted per attribute access, never stored in a committed
	hashed collection), so overriding hash carries no rehash hazard."

	^ (other isKindOf: BoundMethod)
		and: [receiver == (other receiver) and: [selector == (other selector)]]
%

category: 'Grail-Comparison'
method: BoundMethod
hash
	^ receiver identityHash bitXor: selector hash
%

category: 'Grail-Private'
method: BoundMethod
_selectorForArgCount: nargs
	"Return the selector for the given arity.  0..3 are precomputed
	at construction time (sel0/sel1/sel2/sel3 — the hot path).
	4..16 are built lazily here; higher arities are rare enough that
	the per-call string concatenation cost is fine — and the lookup
	path tries the varargs form first when defaults are present, so
	this only fires for true fixed-arity calls (Python ``def f(a, b,
	c, d, e, f, g, h, i):'' compiles to ``f:_:_:_:_:_:_:_:_:'')."

	| s |
	nargs == 0 ifTrue: [^ sel0].
	nargs == 1 ifTrue: [^ sel1].
	nargs == 2 ifTrue: [^ sel2].
	nargs == 3 ifTrue: [^ sel3].
	nargs < 0 ifTrue: [^ nil].
	"Build ``name:'' followed by ``_:'' repeated (nargs - 1) times."
	s := selector asString , ':'.
	2 to: nargs do: [:_ | s := s , '_:'].
	^ s asSymbol
%

category: 'Grail-Private'
method: BoundMethod
_receiverHasSelector: aSymbol
	"True if the receiver's class chain implements `aSymbol` in env 1.
	Walks ``whichClassIncludesSelector:environmentId:`` so inherited
	methods (e.g. ``values`` on KeyValueDictionary, invoked through
	an IdentityKeyValueDictionary instance) are visible."

	^ ((receiver class) whichClassIncludesSelector: aSymbol environmentId: 1) notNil
%

set compile_env: 1

! ------------------- Class methods (env 1 — called from generated Python code)

category: 'Grail-Instance Creation'
classmethod: BoundMethod
receiver: aReceiver selector: aSymbol
	"Create a BoundMethod that, when called, will send `aSymbol` to
	`aReceiver` with the call''s arguments. Precomputes arity-resolved
	selectors for fast dispatch.

	The Python ``type'' builtin, referenced as a value, must be an
	identity-stable singleton so ``type is type'' and ``type(cls) is type''
	hold (the latter is what ``builtins>>type:'' returns for a class).  A
	module instance is session-local, so intern the (builtins-instance, #type)
	BoundMethod in SessionTemps.  The guard is a single identity compare on the
	hot path; the lookup + intern only run for the #type selector."

	| inst bcls |
	(aSymbol @env0:== #'type') ifTrue: [
		bcls := Python @env0:at: #builtins otherwise: nil.
		(bcls @env0:notNil and: [aReceiver @env0:isKindOf: bcls])
			ifTrue: [^ self ___internTypeSingleton: aReceiver]].
	inst := self @env0:new.
	inst @env0:_setReceiver: aReceiver selector: aSymbol.
	^ inst
%

category: 'Grail-Instance creation'
classmethod: BoundMethod
___internTypeSingleton: aReceiver
	"Return the session-cached canonical ``type'' BoundMethod for the builtins
	instance ``aReceiver'', minting it once per session (module instances are
	session-local, so re-mint when the cached receiver no longer matches)."

	| st cached |
	st := SessionTemps @env0:current.
	cached := st @env0:at: #'GrailTypeBuiltin' otherwise: nil.
	(cached @env0:notNil and: [cached @env0:receiver == aReceiver]) ifTrue: [^ cached].
	cached := self @env0:new.
	cached @env0:_setReceiver: aReceiver selector: #'type'.
	st @env0:at: #'GrailTypeBuiltin' put: cached.
	^ cached
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: BoundMethod
___pythonValueAttrs___
	"``__name__'' / ``__qualname__'' / ``__module__'' are Python
	identifying-metadata *value* attributes: ``f.__name__'' is the name
	STRING, not a callable.  Decorators (functools.wraps) and flask's
	``_endpoint_from_view_func'' read ``view_func.__name__'' and key
	``view_functions'' by it.  Without this hook ``___pyAttrLoad___''
	wraps the dunder as a BoundMethod, so the lookup key becomes a
	BoundMethod instead of 'hello' and dispatch KeyErrors.  These
	selectors are answered by the env-1 accessors below."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__func__';
		add: #'__self__';
		add: #'__annotations__';
		yourself
%

! ------------------- Instance methods (env 1 — call protocol)

set compile_env: 1

category: 'Grail-Class Compilation'
method: BoundMethod
___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames
	"``class M(type)`` uses the canonical `type` singleton (a BoundMethod) as
	its base.  Grail doesn't model metaclasses, but CPython allows subclassing
	`type` and the class definition must SUCCEED -- create M as a plain
	subclass of object (metaclass semantics are ignored, exactly as Grail
	already ignores `metaclass=`/ABCMeta).  Any OTHER BoundMethod base is a
	genuine error (subclassing a module function, e.g. functools.cached_property
	-- see object>>___subclass___)."

	| bcls |
	bcls := Python @env0:at: #builtins otherwise: nil.
	(bcls @env0:notNil
		and: [self @env0:selector == #'type'
		and: [self @env0:receiver @env0:isKindOf: bcls]]) ifTrue: [
			^ object @env1:___subclass___: aSymbol
				instVarNames: ivarNames classInstVarNames: classIvarNames].
	^ TypeError ___signal___: ('cannot subclass a non-class base ('
		@env0:, self @env0:class @env0:name @env0:asString @env0:, ')')
%

category: 'Grail-Calling'
method: BoundMethod
value: positional value: kwargs
	"Forward an indirect call to the underlying receiver/selector.

	Dispatch order (using precomputed selectors — no per-call string building):
	  1. No kwargs and positional count is 0..3: use the precomputed
	     fixed-arity selector (sel0/sel1/sel2/sel3) if the receiver has it.
	  2. Otherwise fall back to the precomputed varargs `_name:kw:`.
	  3. If neither exists, raise via the receiver''s normal DNU path.

	Unbound form (receiver isNil): the BoundMethod represents a bare
	class-body function reference (``class C: def f(self): ...; pair =
	(f,)'') where the eventual call must supply the receiver as the
	first positional arg.  Pop positional[1] as the receiver and
	dispatch with the remaining args.  Matches CPython's unbound-
	function semantics: ``C.__dict__['f'](instance, ...)''."

	| actualReceiver actualArgs nargs fixedSel rcvrClass fixedClass varargsClass |
	receiver @env0:isNil
		ifTrue: [
			actualReceiver := positional @env0:at: 1.
			actualArgs := positional @env0:size @env0:> 1
				ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
				ifFalse: [Array @env0:new].
		]
		ifFalse: [
			actualReceiver := receiver.
			actualArgs := positional.
		].
		"perform:env:withArguments: (primitive 2015, used below) needs an EXACT
		Array; a Python tuple is an Array SUBCLASS and is rejected (it surfaces as
		a spurious selector-not-understood). Normal calls pass a plain-Array arg
		list; when positional is itself a tuple -- e.g. threading
		start_new_thread(fn, ()) re-invokes the target with the () args tuple --
		coerce to an exact Array."
		(actualArgs @env0:class == Array)
			@env0:ifFalse: [actualArgs := Array @env0:withAll: actualArgs].
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifTrue: [
		nargs := actualArgs @env0:size.
		fixedSel := self @env0:_selectorForArgCount: nargs.
		fixedSel ifNotNil: [
			rcvrClass := actualReceiver @env0:class.
			fixedClass := rcvrClass @env0:whichClassIncludesSelector: fixedSel environmentId: 1.
			fixedClass @env0:notNil ifTrue: [
				"Most-derived definition wins.  A Python override whose
				signature took defaults / *args compiles to the varargs
				`_name:kw:` form; when it lives on a MORE-derived class than
				an inherited fixed-arity selector, it must beat that inherited
				method — otherwise a built-in superclass's fixed-arity method
				(e.g. dict>>get:) shadows the subclass's override (e.g.
				MultiDict>>get).  Same-class or less-derived varargs defers to
				the fixed-arity fast path."
				varargsClass := rcvrClass @env0:whichClassIncludesSelector: selVarargs environmentId: 1.
				(varargsClass @env0:notNil and: [varargsClass @env0:inheritsFrom: fixedClass])
					ifFalse: [^ actualReceiver perform: fixedSel env: 1 withArguments: actualArgs].
			].
		].
	].
	"No fixed-arity form matched and no varargs form exists: raise
	CPython's catchable TypeError (``assertRaises(TypeError,
	math.acos)`` calls a 1-arg module function with 0 args -- the
	blind varargs perform was an uncatchable MNU)."
	((actualReceiver @env0:class @env0:whichClassIncludesSelector: selVarargs environmentId: 1) == nil)
		ifTrue: [
			TypeError ___signal___: (selector @env0:asString
				@env0:, '() takes a different number of arguments ('
				@env0:, actualArgs @env0:size @env0:printString
				@env0:, ' given)')].
	^ actualReceiver perform: selVarargs env: 1 withArguments: { actualArgs. kwargs }
%

category: 'Grail-Callable'
method: BoundMethod
__call__: positional
	"Make BoundMethod respond to Python's `callable(...)` protocol.
	Forwards to the standard varargs entry point with empty kwargs."

	^ self value: positional value: nil
%

category: 'Grail-Subscript'
method: BoundMethod
__getitem__: item
	"PEP 585 generic alias support — ``type[X]'', ``list[int]'',
	``Callable[..., T]'' etc. subscript a callable to record a
	generic parameterisation that runtime doesn't enforce.  Grail
	returns self so the subscript is a no-op pass-through; downstream
	calls still dispatch through the underlying bound receiver/
	selector.  Without this, code like
	``t.cast(type[''Response''], response_wrapper)'' fails with
	``__getitem__: not understood by BoundMethod''."

	^ self
%

category: 'Grail-Callable'
method: BoundMethod
___pyCallValue___: positional kw: kwargs
	"Forward the Python ``f(args, **kw)'' call to the bound receiver/
	selector via the standard ``value:value:'' entry point.  Overrides
	the default Object>>___pyCallValue___:kw: which raises TypeError —
	BoundMethod IS the canonical callable wrapper."

	^ self value: positional value: kwargs
%

category: 'Grail-Attribute Access'
method: BoundMethod
__name__
	"Python's ``func.__name__'' — bind to the selector name so
	decorators that inspect ``view_func.__name__'' (Flask's
	``@app.route'', any functools.wraps consumer) get a sensible
	identifier matching the Python ``def'' name.  Falls back to the
	receiver class name for an unbound class-method handle."

	selector == nil ifTrue: [^ receiver @env0:class @env0:name @env0:asString].
	^ selector @env0:asString
%

category: 'Grail-Attribute Access'
method: BoundMethod
cache_clear
	"``@functools.cache`` / ``@lru_cache`` on a METHOD is dropped by
	Grail's class-body codegen (method decorators aren't applied), so
	``self.cached_method`` is a plain BoundMethod.  Callers that invoke
	``self.cached_method.cache_clear()'' (django.apps.registry.
	clear_cache) must still find the selector — Grail never caches, so
	this is a no-op.  Returns None (CPython's cache_clear return)."

	^ None
%

category: 'Grail-Attribute Access'
method: BoundMethod
cache_info
	"Companion to cache_clear — a zeroed CacheInfo-shaped tuple."

	^ tuple @env0:withAll: #(0 0 nil 0)
%

category: 'Grail-Attribute Access'
method: BoundMethod
__func__
	"Python's bound-method ``m.__func__'' — the underlying function.
	Grail has no separate function object, so return self (the handle
	is both); callers (django.utils.inspect._get_callable_parameters)
	only re-inspect it, and inspect.signature is arity-agnostic here."

	^ self
%

category: 'Grail-Attribute Access'
method: BoundMethod
__self__
	"Python's bound-method ``m.__self__'' — the receiver the method is
	bound to."

	^ receiver
%

category: 'Grail-Comparison'
method: BoundMethod
__eq__: other
	"CPython bound-method equality: equal iff same receiver (__self__) and
	same underlying method (__func__).  Grail keys on the receiver's
	IDENTITY and the selector (a Symbol uniquely names the method reached
	on that receiver), so ``c.m == c.m'' is True and method references
	compare by value even though each attribute access mints a fresh
	handle.  Only Python-level __eq__/__hash__ are defined (not Smalltalk
	=/hash), so Grail-internal collections that key BoundMethods by
	identity are unaffected."

	(other isKindOf: BoundMethod) ifFalse: [^ false].
	^ (receiver == (other @env0:receiver))
		and: [selector == (other @env0:selector)]
%

category: 'Grail-Comparison'
method: BoundMethod
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Comparison'
method: BoundMethod
__hash__
	"Consistent with __eq__ (receiver identity + selector)."

	^ (receiver @env0:identityHash) @env0:bitXor: (selector @env0:hash)
%

category: 'Grail-Attribute Access'
method: BoundMethod
__get__: obj _: objtype
	"Python's function descriptor protocol ``f.__get__(obj, objtype)'' —
	bind the function to obj, returning a method handle whose calls
	dispatch to obj.  Accessed through the class (obj is None), a
	function returns itself.

	weakref.WeakMethod.__call__ depends on this
	(``self._func.__get__(obj, self._cls)'') to re-bind the saved
	function to the still-alive instance — exercised by Django's signal
	dispatch once Signal.connect receives its true receiver argument
	(see the NameAst LEGB guard)."

	obj == None ifTrue: [^ self].
	^ BoundMethod receiver: obj selector: selector
%

category: 'Grail-Attribute Access'
method: BoundMethod
__get__: obj
	"One-argument form of the descriptor protocol."

	^ self __get__: obj _: None
%

category: 'Grail-Attribute Access'
method: BoundMethod
__annotations__
	"Python's ``func.__annotations__'' — the parameter/return annotation
	dict (PEP 563 source strings; see FunctionDefAst).  Module-level
	functions store theirs on the module instance keyed by name; methods
	store theirs on the defining class, so walk the superclass chain to
	report the annotations from where an inherited method was defined.
	An unbound handle (receiver nil) or an unannotated / unknown callable
	reports an empty dict, matching CPython's ``always has one''."

	| cls |
	receiver == nil ifTrue: [^ KeyValueDictionary @env0:new].
	(receiver isKindOf: module)
		ifTrue: [^ receiver @env0:___functionAnnotationsFor___: selector @env0:asString].
	cls := (receiver isKindOf: Class)
		ifTrue: [receiver]
		ifFalse: [receiver @env0:class].
	^ self ___methodAnnotationsForClass___: cls name: selector @env0:asString
%

category: 'Grail-Attribute Access'
method: BoundMethod
___methodAnnotationsForClass___: aClass name: aName
	"Walk aClass and its superclasses for the first ``__annotations__''
	entry named aName in a ``___methodAnnotationsTable___'' (compiled
	class-side by ClassDefAst for classes that declare annotated
	methods).  Empty dict when none is found.  The table is compiled in
	ENVIRONMENT 1 (like every Grail method), so probe for it with
	``whichClassIncludesSelector:environmentId: 1'' on the metaclass and
	invoke it with an env-1 send — an env-0 ``canUnderstand:'' would never
	see it."

	| tbl v |
	aClass == nil ifTrue: [^ KeyValueDictionary @env0:new].
	((aClass @env0:class @env0:whichClassIncludesSelector: #'___methodAnnotationsTable___' environmentId: 1) ~~ nil) ifTrue: [
		tbl := aClass ___methodAnnotationsTable___.
		v := tbl @env0:at: aName otherwise: nil.
		v == nil ifFalse: [^ v]].
	^ self ___methodAnnotationsForClass___: (aClass @env0:superclass) name: aName
%

category: 'Grail-Attribute Access'
method: BoundMethod
__qualname__
	"Python's ``func.__qualname__'' — return the same string as
	__name__ for now.  Real qualname encodes lexical nesting
	(``OuterClass.method'') which Grail doesn't track on
	BoundMethods, so the simpler name suffices for inspection
	consumers that just want a printable identifier."

	^ self __name__
%

category: 'Grail-Attribute Access'
method: BoundMethod
__module__
	"Python's ``func.__module__''.  For a module-level function the receiver
	IS the defining module, whose ``__name__'' is the dotted Python module
	name (``operator'') -- returning the receiver's CLASS name gave the
	capitalised Smalltalk class (``Operator''), which broke test___all__'s
	``value.__module__ in ('operator', '_operator')'' check and would give a
	bad module in pickle global refs.  Non-module receivers (bound instance
	methods) keep the class-name best-effort."

	(receiver isKindOf: module) ifTrue: [
		^ receiver @env1:___pyAttrLoad___: #'__name__'].
	^ receiver @env0:class @env0:name @env0:asString
%

set compile_env: 0
