! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- BoundMethod class definition
expectvalue /Class
doit
Object subclass: 'BoundMethod'
  instVarNames: #( receiver selector
                    sel0 sel1 sel2 sel3 selVarargs
                    definingClass )
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

category: 'Grail-Private'
method: BoundMethod
_setDefiningClass: aClass
	"Record the class an unbound (receiver-less) reference's selector is defined
	on -- the staticmethod-style invocation fallback in value:value:."

	definingClass := aClass
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

category: 'Grail-Accessing'
method: BoundMethod
definingClass
	"The class whose method dictionary a receiver-LESS (unbound) BoundMethod's
	selector is defined on, or nil.  Set only for a class-body plain-def sibling
	referenced as a value (NameAst emits ``receiver: nil ... definingClass:
	<class>''); it lets value:value: invoke the method staticmethod-style when
	the popped receiver's class does not implement the selector (a gnv called as
	_generate_next_value_(name, ...), where name is a plain string).  nil for
	every ordinary BoundMethod -> no behaviour change for them."

	^ definingClass
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

	| inst |
	"A MODULE or CLASS receiver is interned per (receiver, selector), so
	``min is min'' and ``builtins.len is builtins.len'' hold.  CPython's
	builtins are single objects living in the builtins module, and callers
	compare them with ``is'': functools' test_subclass_optimization asserts
	``partial(partial(min, 2), 1).func is min'', and pickle can only save a
	callable by reference if the name resolves back to the same object.

	An INSTANCE receiver is deliberately NOT interned.  CPython creates a fresh
	bound method per attribute read, so ``obj.meth is obj.meth'' is False there
	too -- caching would be the wrong answer as well as unbounded, since the key
	would retain every receiver ever asked for a method.  Modules and classes
	are finite and long-lived, so interning those is bounded.

	This generalises what used to be a special case for ``type'' alone (needed
	so ``type is type'' held); the singleton helper now routes through here."

	(self ___internsReceiver___: aReceiver) ifTrue: [
		^ self ___internedFor___: aReceiver selector: aSymbol].
	inst := self @env0:new.
	inst @env0:_setReceiver: aReceiver selector: aSymbol.
	^ inst
%

category: 'Grail-Instance Creation'
classmethod: BoundMethod
receiver: aReceiver selector: aSymbol definingClass: aClass
	"As receiver:selector:, but also record the defining class so a
	receiver-LESS (unbound) reference can still invoke its method
	staticmethod-style when the popped receiver does not implement the
	selector.  Emitted by NameAst for a class-body plain-def sibling referenced
	as a value; see BoundMethod>>definingClass and value:value:."

	| inst |
	inst := self @env0:new.
	inst @env0:_setReceiver: aReceiver selector: aSymbol.
	inst @env0:_setDefiningClass: aClass.
	^ inst
%

category: 'Grail-Instance creation'
classmethod: BoundMethod
___internsReceiver___: aReceiver
	"Is aReceiver one of the identity-stable kinds -- a module instance or a
	class?  Those are the receivers whose attribute reads CPython answers with
	one object per name."

	| mcls |
	(aReceiver @env0:isKindOf: Behavior) ifTrue: [^ true].
	mcls := Python @env0:at: #module otherwise: nil.
	^ mcls @env0:notNil and: [aReceiver @env0:isKindOf: mcls]
%

category: 'Grail-Instance creation'
classmethod: BoundMethod
___internedFor___: aReceiver selector: aSymbol
	"The session-cached handle for (aReceiver, aSymbol), minting it on first
	ask.  Keyed by receiver IDENTITY: module instances are session-local, so a
	fresh session re-mints rather than reviving a stale receiver."

	| tbl per inst |
	tbl := SessionTemps @env0:current
		@env0:at: #'GrailBoundMethodCache'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	per := tbl @env0:at: aReceiver ifAbsentPut: [KeyValueDictionary @env0:new].
	inst := per @env0:at: aSymbol otherwise: nil.
	inst == nil ifFalse: [^ inst].
	inst := self @env0:new.
	inst @env0:_setReceiver: aReceiver selector: aSymbol.
	per @env0:at: aSymbol put: inst.
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
		add: #'__annotate__';
		add: #'__signature_spec__';
		add: #'__doc__';
		add: #'__code__';
		add: #'__closure__';
		"``__globals__'' is a value for the same reason ``__closure__'' beside it
		 is: it answers the module's namespace DICT, and without this hook
		 ___pyAttrLoad___ wraps the accessor as a BoundMethod -- measured, before
		 this line, as ``type(top.__globals__).__name__ == 'BoundMethod''' and
		 ``top.__globals__ is globals()'' False, which reads as an identity bug
		 rather than as an attribute that was never evaluated."
		add: #'__globals__';
		add: #'__dict__';
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

set compile_env: 0

category: 'Grail-Attribute Access'
classmethod: BoundMethod
___readOnlyFunctionAttrNames___
	"The FUNCTION attributes CPython exposes with a getter and no setter, so
	that assignment and deletion both answer AttributeError.  test_funcattrs
	checks both directions for each -- its cannot_set_attr helper fails unless
	setattr and delattr each raise."

	^ #( #'__closure__' #'__globals__' #'__builtins__' )
%

category: 'Grail-Attribute Access'
classmethod: BoundMethod
___methodDescriptorNames___
	"The names the METHOD type itself exposes, as against ones it merely
	forwards.  CPython's method object carries __func__, __self__ and __doc__
	as read-only descriptors, so assigning to them is ``attribute 'X' of
	'method' objects is not writable'' -- an attribute that is there and has no
	setter.  Any other name is ``no attribute 'X' and no __dict__ for setting
	new attributes'', which is a different complaint and a different message."

	^ #( #'__func__' #'__self__' #'__doc__' )
%

category: 'Grail-Attribute Access'
classmethod: BoundMethod
___checkFunctionAttrWritable___: attrName writing: aValue
	"CPython's func_set_* guards, which Grail had none of: EVERY write to a
	function attribute was accepted, including the ones that leave the object
	incoherent.  ``f.__name__ = 7'' put an integer where every traceback, repr
	and pickle expects a string; ``f.__code__ = 7'' replaced the code object
	with a number; ``f.__closure__ = ()'' discarded the cells the body reads.
	None of it raised, and the damage surfaced later, somewhere else.

	Two kinds of rule, and CPython uses a DIFFERENT exception for each, so
	they are not interchangeable:

	  * READ-ONLY (__closure__, __globals__, __builtins__) -> AttributeError,
	    because the attribute has no setter at all;
	  * TYPE-CHECKED (__name__, __qualname__, __code__, __defaults__,
	    __kwdefaults__, __dict__) -> TypeError, because there IS a setter and
	    the value was the wrong shape.

	``__class__'' is a TypeError too: a function's layout is fixed, and CPython
	refuses with ``__class__ assignment only supported for mutable types''.

	Lives on BoundMethod because that is the class a MODULE-LEVEL ``def'' is
	in Grail -- which is what Python calls a function.  A closure is an
	ExecBlock, a KERNEL class whose Grail extensions are filed into the shared
	extent by install_base.sh rather than per user, so it is left alone here;
	closures keep the old permissive behaviour and are called out in the tests."

	| sym pyClass |
	"The type classes are looked up at RUNTIME rather than named as compile-time
	globals: BoundMethod.gs is filed BEFORE Tuple.gs and PyDict.gs, so naming
	them directly is an ``undefined symbol'' at install time.  A class that
	cannot be resolved skips its check rather than failing the write."
	pyClass := [:n | Python @env0:at: n otherwise: nil].
	sym := attrName asSymbol.
	((self ___readOnlyFunctionAttrNames___) includes: sym) ifTrue: [
		AttributeError @env1:___signal___:
			('attribute ''' , sym asString , ''' of ''function'' objects is not writable')].
	sym == #'__class__' ifTrue: [
		TypeError @env1:___signal___:
			'__class__ assignment only supported for mutable types or ModuleType subclasses'].
	(sym == #'__name__' or: [sym == #'__qualname__']) ifTrue: [
		(aValue isKindOf: CharacterCollection) ifFalse: [
			TypeError @env1:___signal___: (sym asString , ' must be set to a string object')]].
	sym == #'__defaults__' ifTrue: [
		self
			___requireNoneOr___: aValue
			kind: (pyClass value: #'tuple')
			message: '__defaults__ must be set to a tuple object'].
	sym == #'__kwdefaults__' ifTrue: [
		self
			___requireNoneOr___: aValue
			kind: (pyClass value: #'PyDict')
			message: '__kwdefaults__ must be set to a dict object'].
	sym == #'__dict__' ifTrue: [
		| d bcls |
		d := pyClass value: #'PyDict'.
		(d notNil and: [(aValue isKindOf: d) not]) ifTrue: [
			"CPython names the offending type in this one, and so does the
			closure path in ExecBlockAttrs -- the same rule reported two
			different ways read as two different rules."
			bcls := pyClass value: #'bytes'.
			TypeError @env1:___signal___: (bcls isNil
				ifTrue: ['__dict__ must be set to a dictionary']
				ifFalse: ['__dict__ must be set to a dictionary, not a '''
					, (bcls @env1:___pyTypeNameOf___: aValue) , ''''])]].
	sym == #'__code__' ifTrue: [
		| c |
		c := pyClass value: #'PyCode'.
		(c notNil and: [(aValue isKindOf: c) not]) ifTrue: [
			TypeError @env1:___signal___: '__code__ must be set to a code object']].
	^ self
%

category: 'Grail-Attribute Access'
classmethod: BoundMethod
___requireNoneOr___: aValue kind: aClassOrNil message: aMessage
	"aValue must be None/nil or an instance of aClassOrNil.  A nil class means
	the type is not resolvable yet (see ___checkFunctionAttrWritable___), and
	an unresolvable type is not a reason to reject a write."

	aClassOrNil isNil ifTrue: [^ self].
	(aValue isNil or: [aValue == None]) ifTrue: [^ self].
	(aValue isKindOf: aClassOrNil) ifTrue: [^ self].
	^ TypeError @env1:___signal___: aMessage
%

set compile_env: 1

category: 'Grail-Attribute Access'
method: BoundMethod
___isPythonBoundMethod___
	"True when this BoundMethod is what Python calls a BOUND METHOD -- a
	function reached through an INSTANCE -- rather than a plain function.

	The distinction matters because Grail uses one class for both.  A
	module-level ``def f'' is a BoundMethod on the MODULE, and in Python that
	is a FUNCTION: writable, with a __dict__.  ``obj.method'' is a BoundMethod
	on an instance, and in Python that has no attribute storage at all.
	Treating the two alike rejects every ``f.attr = v'' in the corpus, which is
	exactly what a first attempt here did."

	^ (receiver @env0:isKindOf: module) @env0:not
		@env0:and: [(receiver @env0:isKindOf: Behavior) @env0:not]
%

category: 'Grail-Attribute Access'
method: BoundMethod
__setattr__: name _: value
	"A BOUND METHOD has no __dict__: CPython gives method objects no attribute
	storage, so every assignment is an AttributeError -- the read-only
	descriptors (__self__, __func__) and an arbitrary name alike.  Attributes
	belong on the underlying FUNCTION, and ``m.x = 1'' is a mistake worth
	reporting rather than a write to silently keep.

	Grail accepted all of them into dynamic instVars that nothing read back
	through the method: the write looked like it worked and the value was
	simply lost.  test_funcattrs asserts the error directly (``setting
	attributes on methods should raise error'').

	A BoundMethod that is NOT a Python bound method -- a module-level function,
	or a @staticmethod carried on the class -- keeps the ordinary store; see
	___isPythonBoundMethod___ for why one class covers both."

	"A module-level ``def'' is a BoundMethod on the module, and in Python it is
	a FUNCTION -- so it takes the FUNCTION rules rather than none at all.
	``f.__name__ = 7'' has to be the same TypeError here as it is for a
	closure, which is where those rules live (ExecBlock)."
	self ___isPythonBoundMethod___ ifFalse: [
		BoundMethod @env0:___checkFunctionAttrWritable___: name writing: value.
		^ super @env1:__setattr__: name _: value].
	"``__class__'' is the one name that is a TYPE error rather than an attribute
	one, and the difference is not cosmetic: CPython's method type defines no
	__setattr__, so the store reaches object.__setattr__, which FINDS the
	__class__ slot descriptor and rejects the value -- a setter that exists and
	refuses, not a missing attribute.  test_funcattrs asserts TypeError for it
	and AttributeError for everything else in the same breath."
	name @env0:asSymbol == #'__class__' ifTrue: [
		TypeError ___signal___:
			'__class__ assignment only supported for mutable types or ModuleType subclasses'].
	"The three names the method TYPE exposes as descriptors get CPython's
	descriptor message rather than the no-__dict__ one: the attribute is
	there and has no setter, which is a different complaint from a name the
	object has never heard of."
	((BoundMethod @env0:___methodDescriptorNames___) @env0:includes: name @env0:asSymbol)
		ifTrue: [
			AttributeError ___signal___:
				('attribute ''' @env0:, name @env0:asString
					@env0:, ''' of ''method'' objects is not writable')].
	^ AttributeError ___signal___:
		('''method'' object has no attribute ''' @env0:, name @env0:asString
			@env0:, ''' and no __dict__ for setting new attributes')
%

category: 'Grail-Attribute Access'
method: BoundMethod
__delattr__: name
	"The other half of the same rule -- there is nothing to delete on a bound
	method, and test_funcattrs checks both directions for each attribute."

	self ___isPythonBoundMethod___ ifFalse: [
		((BoundMethod @env0:___readOnlyFunctionAttrNames___) @env0:includes: name @env0:asSymbol)
			ifTrue: [
				AttributeError ___signal___:
					('attribute ''' @env0:, name @env0:asString
						@env0:, ''' of ''function'' objects is not writable')].
		^ super @env1:__delattr__: name].
	name @env0:asSymbol == #'__class__' ifTrue: [
		TypeError ___signal___: 'can''t delete __class__ attribute'].
	((BoundMethod @env0:___methodDescriptorNames___) @env0:includes: name @env0:asSymbol)
		ifTrue: [
			AttributeError ___signal___:
				('attribute ''' @env0:, name @env0:asString
					@env0:, ''' of ''method'' objects is not writable')].
	^ AttributeError ___signal___:
		('''method'' object has no attribute ''' @env0:, name @env0:asString
			@env0:, ''' and no __dict__ for setting new attributes')
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
			"Unbound reference whose selector is NOT on the popped receiver's
			class, but IS on a recorded definingClass: invoke it staticmethod-
			style (positional[1] bound to the method's first param, not popped as
			a receiver) -- CPython's `Cls.__dict__['gnv'](name, ...)` semantics.
			Only a class-body plain-def-sibling reference carries definingClass,
			so ordinary BoundMethods (definingClass nil) still raise below."
			(receiver @env0:isNil and: [definingClass @env0:notNil]) ifTrue: [
				^ (UnboundMethod definingClass: definingClass selector: selector)
					value: positional value: kwargs].
			"A BOUND reference whose method lives on a recorded definingClass the
			receiver is not a Smalltalk instance of.  That is what a metaclass
			method reached through its class is: ``Integer.__subclasscheck__''
			for ``class Integer(metaclass=ABC)'' has to run ABC's method with
			Integer as its cls parameter, and Integer is not an instance of ABC
			-- Grail records a metaclass rather than building the class through
			one.  Prepend the receiver and dispatch non-virtually, which is
			exactly what the receiver-less branch above does one slot later.

			Without this the perform below sent __subclasscheck__: to the class
			and died with an uncatchable MessageNotUnderstood on a Metaclass3."
			(receiver @env0:notNil and: [definingClass @env0:notNil]) ifTrue: [
				^ (UnboundMethod definingClass: definingClass selector: selector)
					value: (Array @env0:with: receiver) @env0:, actualArgs
					value: kwargs].
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
__dict__
	"The ``type'' builtin's namespace as a read-only mappingproxy, so
	``type(type.__dict__)'' yields the mappingproxy type (test_dict
	test_views_mapping).  Grail models ``type'' as a BoundMethod, not a real
	metaclass object, so the proxy wraps an empty dict -- only its TYPE is
	consulted here.

	A PYTHON BOUND METHOD answers its FUNCTION's __dict__, which is CPython's
	rule: the method has no storage of its own and ``m.__dict__'' is a view onto
	``m.__func__.__dict__''.  It is the same mapping object, not a copy, so an
	attribute set on the function is visible through every instance -- the shape
	functools' decorators and test_funcattrs both read through.  This used to be
	a flat AttributeError, so that write was simply invisible from the method.

	A BoundMethod that is NOT a Python bound method (a module-level def, a
	class-side handle) is a FUNCTION and keeps its own storage; a bound method
	with nowhere to delegate still raises."

	| bcls |
	bcls := Python @env0:at: #builtins otherwise: nil.
	(bcls @env0:notNil
		and: [selector @env0:== #'type'
		and: [receiver @env0:isKindOf: bcls]]) ifTrue: [
			^ mappingproxy ___on: (dict ___new___)].
	self ___isPythonBoundMethod___ ifTrue: [^ self __func__ __dict__].
	^ AttributeError ___signal___: 'BoundMethod object has no attribute ''__dict__'''
%

category: 'Grail-Attribute Access'
method: BoundMethod
cache_clear
	"``@functools.cache`` / ``@lru_cache`` on a METHOD does not yet give a
	working cache wrapper -- class-body method decorators ARE applied now,
	but the lru_cache-on-a-method shape still does not bind correctly (see
	test.test_functools TestLRUC.test_lru_method), so ``self.cached_method``
	can still be a plain BoundMethod.  Callers that invoke
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
	"Python's bound-method ``m.__func__'' -- the underlying function.

	A CLASS receiver is a class-side method, which is what @classmethod /
	@staticmethod produce in Grail, and CPython's ``classmethod.__func__'' is the
	PLAIN function: it takes cls as its FIRST argument.  Answering the bound
	handle made a caller that re-invokes it supply the class twice --
	``wrapped(cls, arg)'' arrived as two arguments at a method wanting one, and
	raised ``takes a different number of arguments''.  An UnboundMethod is Grail's
	stand-in for a function that takes its receiver first, so that is the honest
	answer here.

	AN INSTANCE receiver answers the same handle ``Cls.method'' does, which is
	the one object Grail has that plays the part of the function: interned per
	(class, selector), so ``fi.a.__func__ == F.a'' holds the way CPython's
	identity does, and re-invocable with the receiver first.  It used to answer
	SELF, and that made the bound method its own function -- so every rule that
	distinguishes the two collapsed.  ``fi.a.__func__.__dict__ = d'' was an
	AttributeError from the METHOD (which correctly has no __dict__) rather than
	a write to the function, and test_funcattrs' ``__func__ of a method is the
	function'' compared a BoundMethod against an UnboundMethod.

	A MODULE receiver still answers self: a module-level ``def'' is a BoundMethod
	on the module and in Python that IS the function, so there is nothing else to
	point at."

	(receiver isKindOf: Behavior) ifTrue: [
		"``definingClass == receiver'' marks the IMPLICIT-CLASSMETHOD bind --
		a class-defined __init_subclass__ read through its class (PEP 487
		makes the hook a classmethod without the decorator).  That method is
		INSTANCE-side on the class, so its function is an UnboundMethod on the
		class ITSELF: resolving it on the metaclass instead climbed to the
		kernel's ``Object class.__init_subclass__'', which both misnamed the
		function and made types.MethodType classify a Python-level hook as a
		builtin -- sending @deprecated down its builtin branch."
		definingClass == receiver ifTrue: [
			^ UnboundMethod definingClass: receiver selector: selector].
		"Otherwise definingClass is the METACLASS, not the class: Grail
		compiles a @classmethod / @staticmethod onto the metaclass, so an
		UnboundMethod on the class itself cannot resolve the selector (``type
		object 'X' has no method ...'').  The receiver supplied at call time
		is the class, which is an instance of that metaclass."
		^ UnboundMethod definingClass: receiver @env0:class selector: selector].
	self ___isPythonBoundMethod___ ifTrue: [
		^ UnboundMethod definingClass: receiver @env0:class selector: selector].
	^ self
%

category: 'Grail-Attribute Access'
method: BoundMethod
__getattr__: name
	"A miss on a BOUND METHOD is retried on its FUNCTION.  That is CPython's
	method_getattro: the method type is consulted first, and anything it does
	not define defers wholly to __func__.  ``fi.a.known_attr'' must find what
	``F.a.known_attr = 7'' wrote, because a method HAS no storage of its own --
	the function is the only place the value could be.

	Before this the read stopped at the method and raised, so an attribute set
	on the function was reachable only through the class handle.  A decorator
	that tags the function and an instance that reads the tag are the two ends
	of one idiom, and they disagreed.

	The function's own AttributeError is allowed through unaltered when it does
	not have the name either.  That is CPython, where the miss is reported
	against the FUNCTION -- ``'function' object has no attribute 'x''' from
	``fi.a.x'' -- because the function is where the lookup actually ended."

	self ___isPythonBoundMethod___ ifFalse: [
		^ super @env1:__getattr__: name].
	^ self __func__ ___pyAttrLoad___: name @env0:asSymbol
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
__annotate__
	"PEP 649: the DEFERRED annotations computation.  functools.update_wrapper
	copies this -- ``__annotate__'' is in WRAPPER_ASSIGNMENTS and
	``__annotations__'' is not, in CPython 3.14 and here -- so a wrapper only
	inherits annotations if the wrapped object can produce one.

	Without it, a method or module-level function had __annotations__ but no
	__annotate__, so update_wrapper (correctly) found nothing to copy and the
	wrapper kept its own empty one: ``@contextlib.contextmanager'' over an
	annotated function reported {} where CPython reports the wrapped
	function's annotations.  In CPython every annotated function has
	__annotate__, which is why copying just that name suffices there.

	ABSENT -- an AttributeError -- when nothing is annotated, rather than Python
	None.  CPython's unannotated function does carry __annotate__ = None, but
	answering None here means update_wrapper copies that None onto the wrapper as
	a VALUE, and the wrapper's __annotations__ reader then tries to CALL it:
	``a NoneType does not understand #value:value:'', four uncatchable errors
	across TestWraps and TestUpdateWrapper.  Raising instead makes
	update_wrapper skip the name, which is what it already does for every other
	absent attribute, and the wrapper keeps its own empty annotate.  The only
	divergence is hasattr(f, '__annotate__') for an unannotated function, which
	nothing reads."

	| cls fn |
	"A class-body sibling reference is emitted receiver-less but WITH its
	definingClass (NameAst: ``BoundMethod receiver: nil selector: #m
	definingClass: C''), and that is the handle a class-body decorator chain
	captures.  Resolving through it is what lets ``@functools.wraps(func.__func__)''
	inside such a decorator copy the annotations -- value:value: already takes
	the same fallback for calls."
	(receiver == nil and: [definingClass @env0:notNil]) ifTrue: [
		^ self ___internedAnnotateForClass___: definingClass
			name: selector @env0:asString].
	receiver == nil ifTrue: [
		AttributeError ___signal___: 'method has no attribute ''__annotate__'''].
	(receiver isKindOf: module) ifTrue: [
		fn := receiver @env0:___functionAnnotateFor___: selector @env0:asString.
		fn == nil ifTrue: [
			AttributeError ___signal___:
				'function has no attribute ''__annotate__'''].
		^ fn].
	cls := (receiver isKindOf: Class)
		ifTrue: [receiver]
		ifFalse: [receiver @env0:class].
	^ self ___internedAnnotateForClass___: cls name: selector @env0:asString
%

category: 'Grail-Attribute Access'
method: BoundMethod
___internedAnnotateForClass___: aClass name: aName
	"The class's annotate function for aName, MEMOIZED per (class, name).

	ClassDefAst builds the ___methodAnnotationsTable___ blocks when the table
	method RUNS, so an un-memoized read answers a different object every time --
	and functools' check_wrapper asserts the wrapper and the wrapped share the
	VERY SAME object for every name in WRAPPER_ASSIGNMENTS.  Memoizing gives a
	method's __annotate__ the identity stability a nested def gets from its
	def-time stamp.

	Session-local, like every other Grail handle cache: these are transient and
	must not be committed."

	| store perClass fn |
	store := SessionTemps @env0:current
		@env0:at: #'GrailMethodAnnotateCache'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	perClass := store @env0:at: aClass ifAbsentPut: [KeyValueDictionary @env0:new].
	fn := perClass @env0:at: aName otherwise: nil.
	fn == nil ifFalse: [^ fn].
	fn := self ___rawAnnotateForClass___: aClass name: aName.
	fn == nil ifTrue: [
		"Absent, not None -- see __annotate__ for why answering None breaks
		update_wrapper."
		AttributeError ___signal___: 'method has no attribute ''__annotate__'''].
	perClass @env0:at: aName put: fn.
	^ fn
%

category: 'Grail-Attribute Access'
method: BoundMethod
___rawAnnotateForClass___: aClass name: aName
	"Superclass walk for the annotate FUNCTION itself, where
	___methodAnnotationsForClass___:name: walks for the dict it computes.  Same
	env-1 probe, for the same reason: the table is compiled in environment 1, so
	an env-0 canUnderstand: would never see it."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	((aClass @env0:class @env0:whichClassIncludesSelector: #'___methodAnnotationsTable___' environmentId: 1) ~~ nil) ifTrue: [
		tbl := aClass ___methodAnnotationsTable___.
		v := tbl @env0:at: aName otherwise: nil.
		v == nil ifFalse: [^ v]].
	^ self ___rawAnnotateForClass___: (aClass @env0:superclass) name: aName
%

category: 'Grail-Attribute Access'
method: BoundMethod
__signature_spec__
	"The def-time parameter spec inspect.signature reads.  A method's lives on
	its DEFINING class (a class-side ___methodSignatureTable___ compiled by
	ClassDefAst), because a method compiles to a Smalltalk method rather than a
	block and cannot carry the def-time cascade a nested def does.

	Walk the superclass chain so an inherited method reports the signature from
	where it was defined, exactly as __annotations__ does.  None when nothing is
	found -- signature() then falls back to its text-signature route."

	| cls spec |
	receiver == nil ifTrue: [^ ExecBlock @env0:___pyNone___].
	"A module function: the def-time table first (a Python def in that module),
	then the class-side walk -- which is how a module implemented in SMALLTALK
	declares signatures for its own functions, since no FunctionDefAst ran for
	them (functools.cmp_to_key)."
	(receiver isKindOf: module) ifTrue: [
		^ ((receiver @env0:___functionSignatureFor___: selector @env0:asString)
			ifNil: [self ___methodSignatureForClass___: receiver @env0:class
				name: selector @env0:asString])
			ifNil: [ExecBlock @env0:___pyNone___]].
	cls := (receiver isKindOf: Class)
		ifTrue: [receiver]
		ifFalse: [receiver @env0:class].
	spec := self ___methodSignatureForClass___: cls name: selector @env0:asString.
	"Already BOUND-shaped: ClassDefAst omits ``self''/``cls'' when it builds the
	table, because that is what a bound access reports and a @staticmethod has no
	receiver parameter to omit.  A method wrapped by a descriptor such as
	singledispatchmethod reports through ``__wrapped__'' and the raw def's own
	spec instead, which is why test_method_signatures still sees ``self''."
	^ spec ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Attribute Access'
method: BoundMethod
__doc__
	"``method.__doc__''.  A method's docstring lives on its DEFINING class, in
	the class-side ___methodDocTable___ ClassDefAst compiles, because a
	class-body def becomes a Smalltalk method and cannot carry the def-time
	``___pyNamed___:doc:'' stamp a nested def does.

	None when there is none -- NOT Object's own __doc__, which is what an
	undocumented method used to report (``The base class of the class
	hierarchy...''), because the read fell through to the inherited default.

	Walks the superclass chain, so an inherited method reports the docstring
	from where it was defined, exactly as __annotations__ and
	__signature_spec__ do.

	A PYTHON BOUND METHOD asks its FUNCTION, so that ``F.a.__doc__ = docstr''
	is visible as ``fi.a.__doc__'' -- CPython has one docstring per function
	and the method merely reports it.  The function's own read ends at the very
	same class table when nothing was assigned, so this only ADDS the assigned
	case; it does not reroute the ordinary one."

	| cls doc |
	"Receiver-less but with a definingClass: a class-body sibling reference (see
	__annotate__ and value:value: for the same fallback).  Without this, a
	decorator chain that captures such a handle and copies from it -- ``@wraps
	(func.__func__)'' -- produced a wrapper whose __doc__ was None."
	self ___isPythonBoundMethod___ ifTrue: [
		^ self __func__ ___pyAttrLoad___: #'__doc__'].
	cls := (receiver == nil and: [definingClass @env0:notNil])
		ifTrue: [definingClass]
		ifFalse: [
			receiver == nil
				ifTrue: [nil]
				ifFalse: [(receiver isKindOf: Class)
					ifTrue: [receiver]
					ifFalse: [receiver @env0:class]]].
	cls == nil ifTrue: [^ ExecBlock @env0:___pyNone___].
	doc := self ___methodDocForClass___: cls name: selector @env0:asString.
	^ doc ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Attribute Access'
method: BoundMethod
__code__
	"``method.__code__'' -- the PyCode ClassDefAst compiled into the defining
	class's class-side ___methodCodeTable___ (a class-body def becomes a
	Smalltalk method and so cannot carry the def-time ``___pyCode___:'' stamp a
	nested def's ExecBlock does), or the module class's table for a top-level
	def.

	Resolves the owning class exactly as __doc__ does, including the
	receiver-less ``definingClass'' case (a class-body sibling reference), and
	walks the superclass chain so an inherited method reports the code object
	from where it was DEFINED.

	AttributeError when there is none -- matching CPython, where only functions
	and methods have __code__, and matching ExecBlock >> __code__ for the block
	case.  Notably NOT None: ``hasattr(x, '__code__')'' is how inspect and
	functools.wraps decide whether something is a function at all, so answering
	a value would make every BoundMethod look like one."

	| cls code |
	cls := (receiver == nil and: [definingClass @env0:notNil])
		ifTrue: [definingClass]
		ifFalse: [
			receiver == nil
				ifTrue: [nil]
				ifFalse: [(receiver isKindOf: Class)
					ifTrue: [receiver]
					ifFalse: [receiver @env0:class]]].
	code := cls == nil
		ifTrue: [nil]
		ifFalse: [self ___methodCodeForClass___: cls name: selector @env0:asString].
	code == nil ifTrue: [
		^ AttributeError ___signal___:
			'''method'' object has no attribute ''__code__'''].
	^ code
%

category: 'Grail-Attribute Access'
method: BoundMethod
__closure__
	"``method.__closure__'' -- the tuple of cells the underlying function closes
	over, or None.

	The bound twin of UnboundMethod >> __closure__, and needed for the same
	reads: a @staticmethod or @classmethod reached off its class is a BoundMethod
	in Grail, not an UnboundMethod, so without this ``C.s.__closure__'' raised
	while the identical plain-method read answered.

	Resolves the owning class exactly as __code__ does -- including the
	receiver-less ``definingClass'' case of a class-body sibling reference -- and
	then defers to the same per-method record, so the two handles cannot give
	different answers for one method.

	None rather than AttributeError for a method that closes over nothing: that
	is what CPython answers, and unlike __code__ it is not used as a
	``is this a function'' probe."

	| cls |
	cls := (receiver == nil and: [definingClass @env0:notNil])
		ifTrue: [definingClass]
		ifFalse: [
			receiver == nil
				ifTrue: [nil]
				ifFalse: [(receiver isKindOf: Class)
					ifTrue: [receiver]
					ifFalse: [receiver @env0:class]]].
	cls == nil ifTrue: [^ ExecBlock @env0:___pyNone___].
	^ (UnboundMethod @env1:definingClass: cls selector: selector) @env1:__closure__
%

category: 'Grail-Attribute Access'
method: BoundMethod
___methodLookupChainFor___: aClass
	"The classes to search, nearest first, for one of the per-class
	___method*Table___ dictionaries.

	The raw Smalltalk superclass chain is NOT enough.  A Python class with
	several bases is one Smalltalk class whose superclass is only its PRIMARY
	base; the rest live in the C3 MRO, so a method inherited from a MIXIN was
	invisible to a superclass walk.  test.test_gettext hits this squarely --
	``class GNUTranslationsPluralFormsTestCase(PluralFormsTests,
	GettextBaseTest)'' inherits the helper that reads
	``self._test_plural_forms.__code__'', and 13 tests reported
	``'method' object has no attribute '__code__''' for a method that plainly
	exists.

	Chain first, MRO only if that misses: the chain is a cheap pointer walk and
	is the whole answer under single inheritance, so the C3 computation is paid
	only where the old code was about to answer nil anyway.  Answers a
	collection; never nil.

	The walk itself now lives on importlib, which owns the MI registry ___mroOf___
	reads, because BaseException's live-frame filename derivation needs the same
	chain -- and had the same bug for the same reason.  Kept here as a delegating
	method so the three ___method*ForClass___:name: senders below read unchanged."

	| chain c il |
	il := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #importlib.
	il == nil ifFalse: [
		chain := [il @env0:___methodLookupChainFor___: aClass]
			@env0:on: Error do: [:ex | nil].
		chain == nil ifFalse: [^ chain]].
	"No importlib (or it refused): the superclass chain, which is the whole
	 answer under single inheritance."
	chain := OrderedCollection @env0:new.
	c := aClass.
	[c == nil] whileFalse: [
		chain @env0:add: c.
		c := c @env0:superclass].
	^ chain
%

category: 'Grail-Attribute Access'
method: BoundMethod
___methodCodeForClass___: aClass name: aName
	"First ___methodCodeTable___ entry named aName along the lookup chain, or
	nil.  Mirrors ___methodDocForClass___:name:, including the env-1 probe --
	the table is compiled in environment 1, so an env-0 ``canUnderstand:'' would
	never see it."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	(self ___methodLookupChainFor___: aClass) @env0:do: [:c |
		((c @env0:class @env0:whichClassIncludesSelector: #'___methodCodeTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := c ___methodCodeTable___.
			v := tbl @env0:at: aName otherwise: nil.
			v == nil ifFalse: [^ v]]].
	^ nil
%

category: 'Grail-Attribute Access'
method: BoundMethod
___methodDocForClass___: aClass name: aName
	"First ___methodDocTable___ entry named aName along the lookup chain
	(see ___methodLookupChainFor___:), or nil.  Mirrors ___methodSignatureForClass___:name:, including the env-1
	probe -- the table is compiled in environment 1, so an env-0
	``canUnderstand:'' would never see it."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	(self ___methodLookupChainFor___: aClass) @env0:do: [:c |
		((c @env0:class @env0:whichClassIncludesSelector: #'___methodDocTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := c ___methodDocTable___.
			v := tbl @env0:at: aName otherwise: nil.
			v == nil ifFalse: [^ v]]].
	^ nil
%

category: 'Grail-Attribute Access'
method: BoundMethod
___methodSignatureForClass___: aClass name: aName
	"First ___methodSignatureTable___ entry named aName along the lookup
	chain (see ___methodLookupChainFor___:), or nil.  Mirrors ___methodAnnotationsForClass___:name:, including the env-1
	probe -- the table is compiled in environment 1, so an env-0
	``canUnderstand:'' would never see it."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	(self ___methodLookupChainFor___: aClass) @env0:do: [:c |
		((c @env0:class @env0:whichClassIncludesSelector: #'___methodSignatureTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := c ___methodSignatureTable___.
			v := tbl @env0:at: aName otherwise: nil.
			v == nil ifFalse: [^ v]]].
	^ nil
%

category: 'Grail-Attribute Access'
method: BoundMethod
___methodAnnotationsForClass___: aClass name: aName
	"Walk aClass and its ancestors (see ___methodLookupChainFor___:) for the
	first entry named aName in a
	``___methodAnnotationsTable___'' (compiled class-side by ClassDefAst
	for classes that declare annotated methods).  The entry is a PEP 649
	annotate FUNCTION, so call it with Format.VALUE to get the dict.
	Empty dict when none is found.  The table is compiled in ENVIRONMENT 1
	(like every Grail method), so probe for it with
	``whichClassIncludesSelector:environmentId: 1'' on the metaclass and
	invoke it with an env-1 send — an env-0 ``canUnderstand:'' would never
	see it."

	| tbl v |
	aClass == nil ifTrue: [^ KeyValueDictionary @env0:new].
	(self ___methodLookupChainFor___: aClass) @env0:do: [:c |
		((c @env0:class @env0:whichClassIncludesSelector: #'___methodAnnotationsTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := c ___methodAnnotationsTable___.
			v := tbl @env0:at: aName otherwise: nil.
			v == nil ifFalse: [^ v @env0:value: { 1 } value: nil]]].
	^ KeyValueDictionary @env0:new
%

category: 'Grail-Attribute Access'
method: BoundMethod
__qualname__
	"Python's ``func.__qualname__''.

	A CLASS receiver is a class-side method -- a @staticmethod or @classmethod --
	and CPython qualifies it as ``Cls.name''.  Answering the bare name left it
	unresolvable: pickle saves a callable by reference by walking its qualname
	from the module, and ``cached_staticmeth'' is not a module attribute while
	``Host.cached_staticmeth'' is.

	A MODULE receiver is a module-level function, whose qualname is its bare name
	in CPython too, so it keeps that.

	Any OTHER receiver is a bound instance method, and CPython qualifies it with
	the class that DEFINES it: ``[].append.__qualname__'' is ``list.append'' and
	``C().meth.__qualname__'' is ``C.meth''.  This answered the bare name, which
	broke the same by-reference lookup the class case above was fixed for --
	``append'' names nothing reachable from a module.

	Qualified with ``type(receiver)'', which is NOT quite CPython's rule and is
	the best available here.  CPython uses the DEFINING class, so for an
	inherited method -- ``class D(C): pass'' -- it reports ``C.meth'' where this
	answers ``D.meth''.

	The prefix is that class's __qualname__, not its __name__, so a method of a
	NESTED class carries the nesting too: ``fn.<locals>.InFunc.m''.  Nothing is
	lost for a builtin, whose qualname IS its Python name.

	Asking the Smalltalk defining class instead was tried and is worse: it has
	no Python-visible name, so a string method rendered
	``CharacterCollection.lower'' and ``Unicode7.lower'' -- leaking Grail
	internals, which is more misleading than a plausible-but-wrong Python class.
	``type(receiver)'' goes through the same route ``type()'' does, so every
	builtin answers its Python name (list.append, dict.keys, int.bit_length,
	str.lower) and only the inherited case differs."

	| n owner |
	n := self __name__ @env0:asString.
	(receiver @env0:isKindOf: Behavior) ifTrue: [
		^ ((self ___receiverQualname___) @env0:, '.' @env0:, n) @env0:asUnicodeString].
	(receiver @env0:isKindOf: module) ifTrue: [^ self __name__].
	owner := self ___receiverTypeName___.
	owner isNil ifTrue: [^ self __name__].
	^ (owner @env0:, '.' @env0:, n) @env0:asUnicodeString
%

category: 'Grail-Attribute Access'
method: BoundMethod
___receiverTypeName___
	"The QUALIFIED Python name of this method's receiver's type, or nil when it
	cannot be determined.

	``___pyMetaclass___'' is the same route ``builtins >> type:'' takes, so this
	answers the PYTHON class (``str'', ``list'') rather than the Smalltalk one
	(``CharacterCollection'', ``Array'') -- which is the whole reason it is used
	in preference to the method's defining class.

	__qualname__ rather than __name__: for a top-level class the two are the same
	string, and for a nested one only the qualname carries the path CPython
	reports (``fn.<locals>.InFunc.m'', not ``InFunc.m'').

	Answers nil rather than guessing, and __qualname__ then keeps the bare name,
	which is the pre-existing behaviour."

	| cls |
	cls := [receiver @env1:___pyMetaclass___]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	cls isNil ifTrue: [^ nil].
	^ [(cls @env1:___pyAttrLoad___: #'__qualname__') @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Attribute Access'
method: BoundMethod
___receiverQualname___
	"The class receiver's own __qualname__, for prefixing a class-side method.
	Falls back to the Smalltalk class name when the class carries no Python
	qualname."

	^ [(receiver __qualname__) @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: receiver @env0:name @env0:asString]
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
	"A CLASS receiver is a class-side method (@staticmethod / @classmethod).
	``receiver class name'' answered the METACLASS -- ``Host class'' -- which is
	not a module at all, so pickle looked for a module by that name, failed, and
	fell back to '__main__'.  The defining class knows its module; ask it."
	(receiver @env0:isKindOf: Behavior) ifTrue: [
		^ self ___moduleOfClass___: receiver].
	"An instance receiver: the module that defined its class."
	^ self ___moduleOfClass___: receiver @env0:class
%

category: 'Grail-Attribute Access'
method: BoundMethod
__globals__
	"``func.__globals__'' -- the live namespace of the module this callable was
	defined in.

	THE VIEW, NOT A COPY.  ``PyModuleDict on:'' memoises one view per module per
	session, so this answers the identical object as ``globals()'' in that module
	and as ``mod.__dict__''.  test_funcattrs checks it with assertIs, and it has
	to: a copy would stop tracking the module the moment either side changed, and
	the whole use of __globals__ -- resolving a free name the way the defining
	module would -- depends on it staying live.

	Resolved from ``__module__'' rather than captured, because BoundMethod holds
	no module reference of its own: for a module-level def the receiver IS the
	module, for a class-side method it is a class, and for a bound method it is
	an instance whose class knows its module.  ``__module__'' just above already
	reconciles all three, so going through the name means this and
	ExecBlockAttrs >> ___globalsFor___: reach the same view by one route rather
	than two that can drift.

	AttributeError, not None, when the module cannot be identified.  Every real
	function has globals, so a None would invite ``f.__globals__.get(...)'' to
	fail with a TypeError a long way from the cause; the AttributeError states
	what is actually true, which is that this callable cannot say where it was
	defined.  It is also what the attribute did before it existed at all, so
	nothing that already probes with hasattr changes behaviour."

	| view |
	view := (Python @env0:at: #'PyModuleDict')
		@env0:___forModuleNamed___: ([self __module__]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]).
	view isNil ifTrue: [
		^ AttributeError @env0:___signalMissing___: '__globals__' on: self].
	^ view
%

category: 'Grail-Attribute Access'
method: BoundMethod
___moduleOfClass___: aClass
	"aClass's Python __module__, falling back to the Smalltalk class name when
	it has none (a kernel class reached as a receiver)."

	^ [(aClass __module__) @env0:asString @env0:asUnicodeString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: aClass @env0:name @env0:asString]
%

set compile_env: 0
