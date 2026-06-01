! ===============================================================================
! Object Methods (Python 'object' type)
! ===============================================================================
! This file contains method implementations for the Object class when used
! as the Python 'object' type. Since Object is a fundamental GemStone Smalltalk
! class, we only add Python-specific methods here.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from object
expectvalue /Metaclass3
doit
object removeAllMethods: 1.
object class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- Phase A: dynamicInstVarAt:ifAbsent: on Smalltalk Object
! GS Smalltalk ships ``dynamicInstVarAt:'' (returns nil when the slot
! doesn't exist) and ``dynamicInstVarAt:put:'' / ``removeDynamicInstVar:''.
! It does NOT ship an ``ifAbsent:'' variant.  Grail adds one here so
! Phase A NameAst codegen can emit ``self @env0:dynamicInstVarAt: #'x'
! ifAbsent: [NameError ___signal___: 'name ''x'' is not defined']'' for
! module-global reads.  Filed at env-0 so the env-1 module-body /
! top-level-def methods can reach it via the ``@env0:'' prefix.
!
! Per the project nil-as-absent convention (Smalltalk nil is never a
! valid Python value), a nil read can only mean ``slot does not
! exist'' — so the check is O(1): one primitive + one identity check.

category: 'Grail-Phase A Dynamic InstVars'
method: object
dynamicInstVarAt: aSymbol ifAbsent: absentBlock
	"Return the value of aSymbol's dynamic instance variable.  If no
	such instance variable exists, evaluate absentBlock and return
	its value.

	Treats Smalltalk ``nil'' as equivalent to ``absent'': Python's
	``None'' is a distinct NoneType singleton, never Smalltalk nil,
	so a nil read from dynamic-instVar storage can only mean ``slot
	does not exist''.  The nil-as-absent convention is enforced by
	Grail's own runtime helpers; Python user code can't violate it
	because the bridge never wraps Smalltalk nil into a Python-
	visible value.

	Used by Phase A NameAst codegen to raise NameError when a
	module-scope read names a binding that ``del'' removed (or that
	was never created)."

	| val |
	val := self dynamicInstVarAt: aSymbol.
	val == nil ifTrue: [^ absentBlock value].
	^ val
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg
	"Convenience method: self perform: #__new__: env: 1 withArguments: {arg}"
	^ self @env1:__new__: arg
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

! ------- performMethod variants for higher arities -------
! GemStone ships ``performMethod:`` (0-arg) and ``with:performMethod:``
! (1-arg) on Object env-0.  Both invoke primitive 2027, which dispatches
! by inspecting the supplied selector's arity.  Add 2- through 4-arg
! variants so ``Super >> doesNotUnderstand:args:envId:`` can invoke a
! parent class's compiled method on the substituted receiver without
! going through the receiver's class dispatch (which would re-fire the
! same override).  These fit on the SystemUser side of install.gs;
! DataCurator can't modify Object.

category: 'Grail-perform method'
method: object
with: argOne with: argTwo performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 2-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:performMethod:'
		args: { argOne. argTwo. aGsNMethod }
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo with: argThree performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 3-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. aGsNMethod }
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo with: argThree with: argFour performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 4-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. argFour. aGsNMethod }
%

set compile_env: 1

category: 'Grail-Convenience Methods'
classmethod: object
___new___

	^ self @env0:new
%

category: 'Grail-Attribute Access'
classmethod: object
___setattr__: args kw: kwargs
	"Unbound-method form of ``object.__setattr__'' — Python source
	``object.__setattr__(instance, name, value)'' compiles to this
	varargs class-side send.  Werkzeug.local uses this pattern to
	bypass a class's overriding ``__setattr__'' and store directly
	into the instance dict (e.g. ``_Local__storage'' on Local,
	``_LocalProxy__wrapped'' on LocalProxy).

	Args: { instance. attrName. attrValue } — pop instance, delegate
	to the instance-side default ``object.__setattr__''."

	| instance attrName attrValue |
	instance := args @env0:at: 1.
	attrName := args @env0:at: 2.
	attrValue := args @env0:at: 3.
	^ instance @env1:___pyAttrStore___: attrName put: attrValue
%

category: 'Grail-Attribute Access'
classmethod: object
___setattr__: instance _: attrName _: attrValue
	"Fixed-arity form of the same unbound-method dispatch — handles
	codegen paths that emit the ``_:_:_:'' positional selector
	instead of the ``:kw:'' varargs form.  Matches the dispatch in
	``___setattr__:kw:''."

	^ instance @env1:___pyAttrStore___: attrName put: attrValue
%

category: 'Grail-Convenience Methods'
classmethod: object
__class_getitem__: item
	"Python's class subscription protocol — ``list[int]'' /
	``dict[K, V]'' / ``MyClass[T]''.  CPython returns a
	``types.GenericAlias'' that round-trips through ``__mro_entries__''
	to its origin class when used as a base.  Grail collapses both
	steps: return self.  ``class Foo(list[V]):'' compiles to
	``class Foo(list):'', which is what we want — Grail doesn't
	enforce generic type parameters at runtime, so the discarded
	subscript carries no semantics.

	Used by Werkzeug's datastructures (``MultiDict[K, V]'',
	``ImmutableList[V]''), every dataclasses field annotation, and
	any other generic-base or generic-alias use site."

	^ self
%

category: 'Grail-Convenience Methods'
classmethod: object
__new__: cls
	"Python ``object.__new__(cls)`` — create a fresh instance of
	``cls`` without running ``__init__``.  jinja2's Template
	._from_namespace uses this to materialize a Template object
	whose attributes get filled by the exec'd namespace."

	^ cls @env0:new
%

category: 'Grail-Convenience Methods'
classmethod: object
___new__: positional kw: kwargs
	"Varargs entry for ``object.__new__(cls, *args, **kwargs)`` —
	called when the call site can't determine arity statically.
	Ignores extra positional / keyword args (object.__new__ accepts
	them silently when __init__ is overridden)."

	^ (positional @env0:at: 1) @env0:new
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method for calling __new__:_: from env 1 code"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method for calling __new__:_:_: from env 1 code"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

category: 'Grail-Initialization'
classmethod: object
__init_subclass__
	"Called when a class is subclassed.
	This is a class method that receives the subclass as the receiver.
	Default implementation does nothing."

	^ None
%

category: 'Grail-Initialization'
classmethod: object
__new__
	"Create a new instance of this class.
	This is a class method that takes the class as the receiver.
	In Python: object.__new__(cls) creates a new instance of cls."

	^ self @env0:new
%

category: 'Grail-Introspection'
classmethod: object
__name__
	"Python ``cls.__name__`` returns the class's short name as a string.
	Inherited through the metaclass chain to every class, so
	``OrderedCollection.__name__`` answers 'OrderedCollection',
	``ExecBlock.__name__`` answers 'ExecBlock', etc.  Grail uses the
	Smalltalk class name unchanged — downstream inspect.ismethod /
	isfunction stubs are written to match the Smalltalk names
	('BoundMethod', 'ExecBlock').

	User Python classes (created via ClassDefAst) get a unique
	encoded name (e.g. ``Blinker_base_Signal``); their ``__name__``
	therefore reflects the encoded form, not the original Python
	identifier.  Python-side code that compares __name__ to a
	literal (rare outside introspection helpers) may need updating."

	^ self @env0:name @env0:asString
%

category: 'Grail-Callable'
classmethod: object
value: positional value: kwargs
	"Python `cls(*positional, **kwargs)` semantics on a class object,
	via the legacy callable form `func value: { args } value: kw`.

	Grail user classes (subclasses of PythonInstance) get a per-class
	`value:value:` synthesized by ClassDefAst (see
	emitInstantiationMethodFor:); this method is the fallback for
	built-in classes mapped from Python types (e.g. ``list`` →
	OrderedCollection, ``dict`` → KeyValueDictionary), which need to
	be callable through the same indirect path so that code like
	``f = obj.cls_attr; f()`` works when ``cls_attr`` resolved to a
	built-in class.

	Dispatch order:
	  1. With kwargs present: forward to ``_new:kw:`` if implemented
	     (dict, set — varargs entry point).
	  2. No kwargs, 0 positional: ``__new__``.
	  3. No kwargs, 1 positional: ``__new__:``.
	  4. No kwargs, 2..N positional: ``__new__:_:_:…`` keyword form
	     built per the standard fast-path convention.
	  5. None of the above resolve → MessageNotUnderstood (mapped to
	     Python TypeError at the env-1 DNU backstop)."

	| nargs sel |
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifFalse: [
		^ self @env1:_new: positional kw: kwargs
	].
	nargs := positional @env0:size.
	nargs @env0:= 0 ifTrue: [^ self @env1:__new__].
	nargs @env0:= 1 ifTrue: [^ self @env1:__new__: (positional @env0:at: 1)].
	sel := WriteStream @env0:on: String @env0:new.
	sel @env0:nextPutAll: '__new__:'.
	2 @env0:to: nargs do: [:i | sel @env0:nextPutAll: '_:'].
	^ self @env0:perform: sel @env0:contents @env0:asSymbol env: 1 withArguments: positional
%

category: 'Grail-Convenience Methods - Unary'
method: object
___isTruthy___
	"Convert any Python object to a Smalltalk Boolean for use in if/while conditions.
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing"

	^ bool @env1:__new__: self
%

category: 'Grail-Convenience Methods - Boolean'
method: object
___pyOr___: alternativeBlock
	"Python ``a or b`` semantics: return `a` if it is truthy, else
	evaluate and return `b`.  Smalltalk's `or:` requires a Boolean
	receiver and returns a Boolean, neither of which matches Python's
	short-circuit value-preserving semantics."

	^ self ___isTruthy___ ifTrue: [self] ifFalse: [alternativeBlock value]
%

category: 'Grail-Convenience Methods - Boolean'
method: object
___pyAnd___: alternativeBlock
	"Python ``a and b`` semantics: return `a` if it is falsy, else
	evaluate and return `b`."

	^ self ___isTruthy___ ifTrue: [alternativeBlock value] ifFalse: [self]
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___dynamicClassAttr___: aSym
	"Walk self's class chain looking for aSym in the per-class
	``dynInstVars'' store.  Returns the raw value if found, nil
	otherwise.  Used by class instantiation to detect a setattr'd
	override (e.g. ``Cls.__init__ = synthesized_fn'') before falling
	back to the statically-compiled dispatch.

	Self may be either a class (Behavior — walk starting at self) or
	an instance (walk starting at self's class).  No descriptor
	binding is applied; the caller is responsible for handling the
	raw callable (typically by prepending the receiver itself)."

	| walker |
	walker := (self @env0:isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	[walker @env0:== nil] whileFalse: [
		((walker @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
			ifTrue: [
				| holder dynValue |
				holder := walker @env0:perform: #dynInstVars env: 1.
				holder @env0:== nil ifFalse: [
					dynValue := holder @env0:dynamicInstVarAt: aSym.
					dynValue @env0:== nil ifFalse: [^ dynValue]
				]
			].
		walker := walker @env0:superClass
	].
	^ nil
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___isDescriptorCallable___: aValue
	"True if aValue is a callable that should bind via Python's
	descriptor protocol when accessed through an instance via the
	class chain.  Currently wraps:
	  * BoundMethod — a top-level def referenced as a value (the
	    typical ``Cls.method = some_func'' case).
	  * ExecBlock — a lambda or nested-def closure stored as a class
	    attribute (``Cls.helper = lambda self: ...'').

	MethodBinding itself is excluded (don't re-bind an already-bound
	method).  Classes and other callables (instances with __call__,
	primitives) return false — Python doesn't apply descriptor
	binding to them either."

	(aValue @env0:isKindOf: MethodBinding) ifTrue: [^ false].
	(aValue @env0:isKindOf: BoundMethod) ifTrue: [^ true].
	(aValue @env0:isKindOf: ExecBlock) ifTrue: [^ true].
	^ false
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___unboundMethodClosure___: aSym
	"Return a 2-arg closure that runs ``self''-class env-1 method
	`aSym' on the first positional argument, with the remaining
	positionals as call args.  Python's ``Cls.method'' descriptor
	read — used by ___pyAttrLoad___ when the receiver is a class
	and `aSym' resolves to an instance method on that class.

	Critically dispatches the EXACT method compiled on ``self''
	(captured here) — not the MRO-resolved method on the first arg's
	class — so ``tuple.__repr__(self)'' inside ``_GroupTuple.__repr__''
	does not infinitely re-enter the subclass override.  Uses
	``performMethod:'' primitives (env 0) to bypass the normal
	dispatch chain.  Falls back to ``perform:'' for arity > 4 — those
	can't reach the same dispatch primitives but also never recurse
	through the override (caller-class method is invoked explicitly)."

	| definingClass |
	definingClass := self.
	"Block uses no ``^'' (would return from this method's activation,
	which is gone by the time the closure runs).  Result is the
	value of whichever branch evaluates last."
	^ [:___positional___ :___kwargs___ |
		| instance method nargs s sym varargsMethod |
		instance := ___positional___ @env0:at: 1.
		nargs := ___positional___ @env0:size @env0:- 1.
		s := aSym @env0:asString.
		sym := nargs @env0:= 0
			@env0:ifTrue: [aSym]
			@env0:ifFalse: [
				| stream i |
				stream := WriteStream @env0:on: String @env0:new.
				stream @env0:nextPutAll: s.
				stream @env0:nextPut: $:.
				i := 1.
				[i @env0:< nargs] @env0:whileTrue: [
					stream @env0:nextPutAll: '_:'. i := i @env0:+ 1].
				stream @env0:contents @env0:asSymbol].
		method := definingClass @env0:compiledMethodAt: sym
			environmentId: 1 otherwise: nil.
		method @env0:isNil
			@env0:ifTrue: [
				"Fall back to the varargs form ``_<name>:kw:''."
				varargsMethod := definingClass @env0:compiledMethodAt:
						('_' @env0:, s @env0:, ':kw:') @env0:asSymbol
					environmentId: 1 otherwise: nil.
				varargsMethod @env0:isNil
					@env0:ifTrue: [
						AttributeError @env1:___signal___:
							definingClass @env0:name @env0:asString @env0:,
							' has no attribute ''' @env0:, s @env0:, '''']
					@env0:ifFalse: [
						instance
							@env0:with: (___positional___ @env0:copyFrom: 2 to: ___positional___ @env0:size)
							with: ___kwargs___
							performMethod: varargsMethod]]
			@env0:ifFalse: [
				"Fixed-arity dispatch via performMethod: primitives."
				nargs @env0:= 0 @env0:ifTrue: [
					instance @env0:performMethod: method
				] @env0:ifFalse: [nargs @env0:= 1 @env0:ifTrue: [
					instance
						@env0:with: (___positional___ @env0:at: 2)
						performMethod: method
				] @env0:ifFalse: [nargs @env0:= 2 @env0:ifTrue: [
					instance
						@env0:with: (___positional___ @env0:at: 2)
						with: (___positional___ @env0:at: 3)
						performMethod: method
				] @env0:ifFalse: [nargs @env0:= 3 @env0:ifTrue: [
					instance
						@env0:with: (___positional___ @env0:at: 2)
						with: (___positional___ @env0:at: 3)
						with: (___positional___ @env0:at: 4)
						performMethod: method
				] @env0:ifFalse: [
					"4+: no compatible primitive — fall back to perform:
					which re-enters MRO.  Acceptable for now: the
					load-bearing call (tuple.__repr__) is unary."
					instance @env0:perform: sym env: 1
						withArguments: (___positional___ @env0:copyFrom: 2 to: ___positional___ @env0:size)
				]]]]]]
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___pyAttrLoad___: aSym
	"Python ``obj.attr`` load semantics, dispatching at runtime.
	The presence of an ``attr:`` keyword method is ambiguous: on a
	Python user class (PythonInstance subclass) it is a synthesized
	setter that pairs with an instVar getter; on a built-in like
	OrderedCollection or KeyValueDictionary `attr:` is just a regular
	1-arg method (e.g. ``append:``, ``add:``).  Discriminate by
	receiver kind:

	  - PythonInstance with ``attr:`` setter → call the unary getter,
	    return the value (covers instVars + @property).
	  - Otherwise, if the class chain has a unary/keyword ``attr``
	    method, return a BoundMethod that wraps (receiver, selector).
	  - Otherwise dispatch the unary message anyway and let DNU
	    produce the appropriate error or fallback."

	| md sym1 sym2 sym3 sym4 symVA s isModule isGenerated dynValue walker owner |
	"Phase B: probe the receiver's dynamic-instVar storage first.
	After Phase A + Phase B this is the canonical home for module
	globals (any receiver of class module), instance attributes (any
	PythonInstance subclass), and class attributes (any class object,
	since classes are objects too).  Per the nil-as-absent convention
	a nil read means the slot is unset — fall through to the legacy
	resolution chain below for built-in receivers / method dispatch /
	AttributeError.  Reading from special objects (SmallInteger etc.)
	returns nil here, so the probe is safe for all receiver kinds."
	dynValue := self @env0:dynamicInstVarAt: aSym.
	dynValue == nil ifFalse: [^ dynValue].
	md := self @env0:class @env0:methodDictForEnv: 1.
	s := aSym @env0:asString.
	sym1 := (s @env0:, ':') @env0:asSymbol.
	sym2 := (s @env0:, ':_:') @env0:asSymbol.
	sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
	sym4 := (s @env0:, ':_:_:_:') @env0:asSymbol.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	"Module instances (pre-installed Python modules like html/math, plus
	loaded module classes derived from `module`) always treat unary
	attribute reads as value reads (an attribute holds a function,
	submodule, constant, ...).  Bound-method wrapping doesn't apply."
	isModule := self @env0:isKindOf: module.
	isModule ifTrue: [
		"Phase A module attribute load.  Resolution order:
		  (1) Varargs callable forwarder ``_<name>:kw:`` — C extension
		      function or Python module function with arbitrary arity.
		      Wrap as BoundMethod.
		  (2) Dynamic instVar storage (Phase A canonical store for
		      module globals).  Present → return the stored value.
		  (3) Unary ``name'' selector — dunder accessors like
		      ``__name__'', ``__doc__'' (hand-written getters on the
		      ``module'' class) that read from the SymbolDictionary
		      slot.  Perform and return the value.
		  (4) Fixed-arity callable ``name:`` / ``name:_:`` /
		      ``name:_:_:`` — top-level def compiled as a real method.
		      Wrap as BoundMethod for first-class function semantics.
		  (5) SymbolDictionary ``self at:'' fallback (legacy bridge
		      for built-in modules that still rely on dict-style
		      storage; also catches names that landed in the dict
		      slot via the SymbolDictionary at:put: path).
		  (6) AttributeError."

		| dynValue |
		((self @env0:class @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSym
		].
		"Phase A: dynamic-instVar storage is the canonical home for
		module globals.  Per the project nil-as-absent convention, a
		nil read can only mean the slot is unset — no sentinel dance
		needed."
		dynValue := self @env0:dynamicInstVarAt: aSym.
		dynValue == nil ifFalse: [^ dynValue].
		"Unary selector resolution.  Sub-cases:
		  * Defined on ``module'' itself, or a hand-written getter/
		    accessor on a module subclass (categories like
		    ``Grail-Accessors'', ``Grail-Module Body'') — perform and
		    return the value.  Covers dunder accessors (``__name__''),
		    C-extension constants (``_sre.MAGIC''), and the module body's
		    ``initialize''.
		  * 0-arg Python ``def foo()'' compiled by loadModuleFromPath:
		    into the ``Grail-Methods'' category — wrap as BoundMethod so
		    the bare-name read returns a first-class function reference
		    (not an auto-invocation).  Without this branch ``from m
		    import f'' would assign f := m.f() — the return value —
		    losing the function handle."
		owner := self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1.
		owner notNil ifTrue: [
			(owner @env0:categoryOfSelector: aSym environmentId: 1) @env0:= #'Grail-Methods'
				ifTrue: [^ BoundMethod @env1:receiver: self selector: aSym]
				ifFalse: [^ self @env0:perform: aSym env: 1]
		].
		(((self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil)
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil]]) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSym
		].
		^ self @env0:at: aSym ifAbsent: [
			AttributeError ___signal___: 'module has no attribute ''' @env0:, s @env0:, ''''
		]
	].
	"Class receivers — `Cls.X` where Cls is a Python user class —
	consult the class's own class-side accessors (which are the
	metaclass's instance methods).  A paired ``X``/``X:`` accessor +
	setter is a class-level attribute (e.g. ``class Color: RED = 1``);
	invoke the unary form to return the value.  Without this branch
	the fallback would wrap the accessor in a BoundMethod and Python
	expressions like ``Color.RED`` would yield a callable rather
	than the int 1.

	Walk the metaclass chain via ``whichClassIncludesSelector:`` so
	a subclass that *inherits* a class-attr accessor pair (no own
	redeclaration in ClassDefAst) still resolves through this branch
	— per-class slot storage means ``B.X`` calls the inherited
	accessor on B and reads B's own slot."
	"Instance-level dunders that always return values, never wrap as
	BoundMethods.  ``self.__class__'' / ``self.__doc__'' are
	value-attribute reads regardless of receiver kind; without this
	check the BoundMethod-wrap branch below catches them and
	downstream code (``object.__new__(self.__class__)'') tries to
	send messages to the wrapper instead of the underlying value.
	Surfaced as the jinja2 ``{% if %}'' compile blocker —
	idtracking.Symbols.copy() does ``object.__new__(self.__class__)''
	and trips the BoundMethod-wrap fallback."
	((s @env0:= '__class__' or: [s @env0:= '__doc__'])
		and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil])
			ifTrue: [^ self @env0:perform: aSym env: 1].
	(self @env0:isKindOf: Behavior) ifTrue: [
		"Class-level dunders that should always read as values, never
		wrap as BoundMethods.  Without this, ``type(node).__name__``
		on any class would wrap the inherited Behavior-side getter
		and break visitor dispatch
		(``getattr(self, 'visit_' + type(node).__name__)``)."
		((s @env0:= '__name__' or: [s @env0:= '__module__' or: [s @env0:= '__qualname__']])
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil])
				ifTrue: [^ self @env0:perform: aSym env: 1].
		"Setter-paired class-level accessor on a Python user class —
		value attribute (``class C: X = 1``)."
		((self @env0:inheritsFrom: PythonInstance)
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
				and: [(self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil]])
			ifTrue: [
				^ self @env0:perform: aSym env: 1
		].
		"Class-body data attribute on a Grail class that subclasses a
		built-in (e.g. a ``dict'' subclass) — not a PythonInstance, so
		the setter-paired branch above is skipped.  ClassDefAst
		synthesises ``X''/``X:'' accessors in the ``Grail-Class Attrs''
		category on the metaclass for every ``X = expr'' class-body
		assignment; consult that getter directly so ``Cls.attr'' returns
		the value rather than wrapping it as a BoundMethod.  Covers
		flask's ``SecureCookieSession(CallbackDict, SessionMixin)''."
		owner := self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1.
		(owner notNil and: [(owner @env0:categoryOfSelector: aSym environmentId: 1) @env0:= #'Grail-Class Attrs'])
			ifTrue: [^ self @env0:perform: aSym env: 1].
		"Instance method accessed via the class object — an *unbound* method
		(a plain function in Python 3).  ``ParentClass.__init__(self, **opts)''
		(explicit super-init, e.g. flask's ``Environment'' subclass calling
		``BaseEnvironment.__init__(self, **options)'') must run ParentClass's
		*instance* method on the explicitly-passed receiver.  Without this it
		falls through to the class-side BoundMethod wrap below and dispatches
		``ParentClass class >> ___init__:kw:'' (the metaclass) ->
		MessageNotUnderstood.  Probe the class's own *instance*-side env-1
		method dict (any arity variant); @classmethod / @staticmethod live on
		the metaclass (class side) and so don't match here, keeping their
		existing BoundMethod handling.  The UnboundMethod binds the receiver
		from the first call argument and runs the named class's own method
		non-virtually (via ``performMethod:'')."
		((self @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: sym4 environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]]])
			ifTrue: [^ UnboundMethod @env1:definingClass: self selector: aSym].
	].
	"Python user classes (PythonInstance subclasses) have synthesized
	``attr:`` setters that pair with attribute getters.  If the class
	has both, this is an attribute access — call the unary getter and
	return the value.

	Disambiguate from a regular 1-arg method named ``attr:`` by also
	checking whether ``aSym`` (unary) is in the receiver's class
	chain.  If yes, the pair is a value-accessor (synthesized getter
	+ setter).  If no, ``attr:`` is just a method that happens to take
	one arg — fall through to the ``BoundMethod`` wrap below."
	isGenerated := self @env0:isKindOf: PythonInstance.
	"Walk the full class chain for both the unary getter and the
	1-arg setter — TestResponse(Response) inherits ``status'' /
	``status:'' through two parent classes; checking only the
	receiver's own ``methodDictForEnv:'' dict misses inherited
	pairs and wraps the unary as a BoundMethod instead of treating
	it as a property read."
	(isGenerated
		and: [(self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil]])
		ifTrue: [
			| instVal metaclass |
			instVal := self @env0:perform: aSym env: 1.
			"If the per-instance slot is still nil, fall back to the
			class-side accessor for the class-level default — matches
			Python's instance.__dict__-then-class lookup for any name
			declared as a class attribute (``X: type = expr`` body) AND
			discovered as an instance attribute through ``self.X = …``
			writes.  Without the fallback the instance-slot nil masks
			the class-level default."
			instVal == nil ifTrue: [
				metaclass := self @env0:class @env0:class.
				((metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
					and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil])
					ifTrue: [^ self @env0:class @env0:perform: aSym env: 1].
			].
			^ instVal
	].
	"Instance falling through to a class-side attribute.  When the
	receiver is an instance of a Python user class and the attribute
	isn't on the instance side, consult the class-side accessor pair
	*walking the metaclass chain*.  Class-side instVars are
	per-class storage in Smalltalk; ClassDefAst copies inherited
	parent values into the subclass's own slot at class-build time,
	so calling the accessor on ``self class`` (the immediate class,
	not the metaclass that defined the accessor) returns the
	subclass's per-class value — matching Python's per-class
	override semantics (B.x can differ from A.x).

	Python's lookup order is ``instance.__dict__'' first, then class.
	Phase B: the instance-side check is handled by the top-level
	``dynamicInstVarAt:'' probe at the start of this method, so by
	the time we reach the PythonInstance branch the instance store
	has already missed — fall through to the class-side metaclass
	lookup directly."
	(self @env0:isKindOf: PythonInstance) ifTrue: [
		| metaclass |
		metaclass := self @env0:class @env0:class.
		((metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
			and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil]) ifTrue: [
			^ self @env0:class @env0:perform: aSym env: 1
		].
		"@classmethod / @staticmethod live on the metaclass with
		``name:`` or ``_name:kw:`` selectors but NO paired unary
		setter (so the value-attr branch above doesn't catch them).
		Wrap as a BoundMethod whose receiver is the class object so
		``self.cls_method(args)`` dispatches correctly."
		((metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			or: [(metaclass @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
				or: [(metaclass @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
					or: [(metaclass @env0:whichClassIncludesSelector: sym4 environmentId: 1) notNil
						or: [(metaclass @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]])
			ifTrue: [^ BoundMethod @env1:receiver: self @env0:class selector: aSym].
	].
	"Shim wrapper classes (SrePattern, SreMatch, ...) advertise the
	subset of their unary methods that should be treated as Python
	*value* attributes (struct-member reads, computed properties)
	rather than callable methods.  Without this, `pattern.groups`
	would always wrap the getter in a BoundMethod instead of
	returning the int — breaking `if index > pattern.groups:` in
	re._parser.parse_template.  The class-side hook returns a
	Smalltalk Set of selector symbols; absent or empty hooks behave
	as today."
	((self @env0:class @env0:respondsTo: #'___pythonValueAttrs___')
		and: [(self @env0:class @env0:___pythonValueAttrs___) @env0:includes: aSym])
		ifTrue: [^ self @env0:perform: aSym env: 1].
	"Instance of a Grail class that subclasses a built-in (dict, list,
	...).  Such an instance is NOT a PythonInstance, so the
	PythonInstance branch above was skipped — yet its class can still
	declare class-body data attributes (``accessed = False''),
	synthesised as ``X''/``X:'' accessors in the ``Grail-Class Attrs''
	category on the metaclass.  Consult the getter so ``inst.attr
	returns the class-level default (Python's instance-then-class
	lookup; the instance store already missed at the
	``dynamicInstVarAt:'' probe above).  flask's SecureCookieSession
	(a ``dict'' subclass) reads ``session.accessed'' / ``modified''
	through here."
	(self @env0:isKindOf: Behavior) ifFalse: [
		| attrOwner |
		attrOwner := self @env0:class @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1.
		(attrOwner notNil and: [(attrOwner @env0:categoryOfSelector: aSym environmentId: 1) @env0:= #'Grail-Class Attrs'])
			ifTrue: [^ self @env0:class @env0:perform: aSym env: 1].
	].
	"Other classes (built-in collections, strings, ...): if any class
	in the receiver's class chain implements a same-named callable
	selector, return a BoundMethod handle for `f = obj.method`
	patterns.  Inherited methods (e.g. ``values`` on KeyValueDictionary
	from an IdentityKeyValueDictionary instance) must be picked up
	here — otherwise the bare ``perform:`` fallback below runs the
	method instead of wrapping it, and downstream ``value:value:``
	tries to invoke the *result* rather than the method.

	For a class receiver this picks up @classmethod selectors on the
	metaclass (``Cls.classmeth()'' returns a bound class method),
	taking precedence over the unbound-instance-method branch below."
	((self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
		or: [(self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
				or: [(self @env0:class @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
					or: [(self @env0:class @env0:whichClassIncludesSelector: sym4 environmentId: 1) notNil
						or: [(self @env0:class @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]]])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSym].
	"Unbound class-method lookup: ``Cls.method'' where ``method'' is
	an instance method defined on Cls itself (env 1).  Python returns
	a function that, when called with ``(instance, args...)'', runs
	``method'' with ``instance'' as self — the descriptor protocol's
	__get__ on a function.  Routes through a closure that dispatches
	the EXACT method compiled on this class via ``performMethod:''
	primitives (bypassing MRO).

	Load-bearing for the jinja2 idiom ``tuple.__repr__(self)'' in
	``_GroupTuple.__repr__'' (skip NamedTuple's auto repr and use
	plain tuple's) — without this branch the call falls through to
	AttributeError."
	((self @env0:isKindOf: Behavior)
		and: [(self @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
			or: [(self @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
				or: [(self @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
					or: [(self @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
						or: [(self @env0:whichClassIncludesSelector: sym4 environmentId: 1) notNil
							or: [(self @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]]]])
		ifTrue: [
			^ self ___unboundMethodClosure___: aSym
		].
	"dynInstVars probe — walks the class chain to honor Python's
	attribute inheritance.  Two receiver kinds:
	  * Class receiver (B is a class) — walk B → B's superClass → ...
	    probing each level's ``dynInstVars'' dict.  Stops on the first
	    hit so a subclass override (``B.x = 'from-B''') shadows the
	    parent value (``A.x = 'from-A''').
	  * Instance receiver (b is an instance of B) — same walk
	    starting at b's class.  Used after the instance dict miss
	    and class-side accessor miss above to find values dynamically
	    stored on the class chain (``A.x = 42; b = A(); b.x''
	    must return 42 — see AttributeInheritanceTestCase)."
	walker := (self @env0:isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	[walker @env0:== nil] whileFalse: [
		((walker @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
			ifTrue: [
				| holder dynValue |
				holder := walker @env0:perform: #dynInstVars env: 1.
				holder @env0:== nil ifFalse: [
					dynValue := holder @env0:dynamicInstVarAt: aSym.
					dynValue @env0:== nil ifFalse: [
						"Python descriptor protocol: a callable stored as a
						class attribute and accessed THROUGH AN INSTANCE
						binds the instance as ``self''.  Wrap in a
						MethodBinding that prepends self to the call args
						and forwards.  Class-side access (self is a
						Behavior) returns the raw callable — matches
						CPython's ``Cls.method'' yielding the function
						unchanged.  Non-callable class attributes (ints,
						strings, classes) return raw on both paths."
						((self @env0:isKindOf: Behavior) not
							and: [self @env1:___isDescriptorCallable___: dynValue])
							ifTrue: [^ MethodBinding @env1:instance: self callable: dynValue].
						^ dynValue
					]
				]
			].
		walker := walker @env0:superClass
	].
	"No callable selector matched anywhere in the receiver's class
	chain.  Before raising AttributeError, give a user-defined
	``__getattr__'' a chance to handle the miss — matches CPython's
	__getattribute__ → __getattr__ fallback protocol.  The default
	``object>>__getattr__:'' raises AttributeError, so this only
	changes behavior for classes that override __getattr__ (e.g.
	the Thermometer in AttributeProtocolTestCase that computes
	``fahrenheit'' on demand from the stored ``celsius'')."
	((self @env0:class @env0:whichClassIncludesSelector: #'__getattr__:' environmentId: 1) notNil
		and: [(self @env0:class @env0:whichClassIncludesSelector: #'__getattr__:' environmentId: 1)
			@env0:~~ object])
		ifTrue: [^ self @env1:__getattr__: s].
	^ AttributeError @env1:___signal___:
		(self @env0:class @env0:name @env0:asString @env0:,
			' object has no attribute ''' @env0:, s @env0:, '''')
%

category: 'Grail-Convenience Methods - Keyword'
method: object
___new___: size
	"Convenience method: self perform: #new: env: 0 withArguments: {size}"
	^ self @env0:new: size
%

category: 'Grail-Convenience Methods - Keyword'
method: object
___signal___: message
	^ self @env0:signal: message
%

category: 'Grail-Attribute Access'
method: object
__class__
	"Return the class of this object (Python type)"

	^ self @env0:class
%

category: 'Grail-Attribute Access'
method: object
__delattr__: name
	"Python ``object.__delattr__'' default — called by ``del obj.name''
	and ``delattr(obj, name)''.  Delegates to the polymorphic helper
	which removes the dynamic-instVar slot (or raises AttributeError
	if it was never bound).  Subclasses may override to intercept
	deletion (validation, audit, etc.); to bypass the override and
	hit the default behavior, call ``super().__delattr__(name)''."

	^ self @env1:___pyAttrDelete___: name
%

category: 'Grail-Attribute Access'
method: object
__getattr__: name
	"Python ``object.__getattr__'' default — invoked by
	``___pyAttrLoad___'' as the FALLBACK when the normal lookup chain
	doesn't find the attribute (instance dict miss, class chain miss).
	The default raises AttributeError — subclasses override to compute
	missing attributes lazily (proxy patterns, virtual properties like
	the Fahrenheit/Celsius example in AttributeProtocolTestCase)."

	^ AttributeError @env1:___signal___:
		(self @env0:class @env0:name @env0:asString @env0:,
			' object has no attribute ''' @env0:, name @env0:asString @env0:, '''')
%

category: 'Grail-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object.
	Returns an Array of Strings containing all method names for environment 1 (Python).
	Excludes convenience methods (those starting with ___) that are internal implementation helpers."

	| selectors result myClass |
	myClass := self @env0:class.
	selectors := myClass @env0:allSelectorsForEnvironment: 1.
	"Filter out convenience methods (starting with ___)"
	selectors := selectors @env0:reject: [:selector |
		| selectorStr prefix |
		selectorStr := selector @env0:asString.
		((selectorStr @env0:size) @env0:>= 3) ifTrue: [
			prefix := selectorStr @env0:copyFrom: 1 to: 3.
			prefix @env0:= '___'
		] ifFalse: [false]
	].
	result := selectors @env0:collect: [:selector |
		| index |
		"Convert selector to string, removing trailing colon(s) for keyword methods"
		index := selector @env0:indexOf: $:.
		index == 0
			ifTrue: [selector @env0:asString]
			ifFalse: [selector @env0:copyFrom: 1 to: (index @env0:- 1)]
	].
	^ (result @env0:asSortedCollection) @env0:asArray
%

category: 'Grail-Other'
method: object
__doc__
	"Return the docstring for this object"

	^ 'The base class of the class hierarchy.

When called, it accepts no arguments and returns a new featureless
instance that has no instance attributes and cannot be given any.
'
%

category: 'Grail-Comparison'
method: object
__eq__: other
	"Return self == other.

	Probe for a setattr-installed ``__eq__'' on the class chain
	(``cls.__eq__ = synth_fn'' lands in the per-class dynInstVars
	store — the dataclass decorator does this).  When present, bind
	self + other and forward, mirroring the instantiation path that
	consults a dynamic ``__init__''.  When absent (the common case),
	fall through to identity.  Only generic PythonInstances reach
	here — Int / Float / str / etc. carry their own ``__eq__:''
	override, so the class-chain walk is not on those hot paths."

	| fn |
	fn := self @env1:___dynamicClassAttr___: #'__eq__'.
	fn @env0:== nil ifFalse: [^ fn @env1:___pyCallValue___: { self. other } kw: nil].
	^ self @env0:= other
%

category: 'Grail-String Representation'
method: object
__format__: formatSpec
	"Default Python object.__format__: empty spec returns str(self),
	non-empty spec raises TypeError (per CPython 3.4+)."

	(formatSpec @env0:isNil or: [formatSpec @env0:= '']) ifTrue: [
		^ self __str__
	].
	TypeError ___signal___:
		'unsupported format string passed to ', self __class__ __name__, '.__format__'
%

category: 'Grail-Comparison'
method: object
__ge__: other
	"Return self >= other"

	self @env0:error: 'Not yet implemented: __ge__'
%

category: 'Grail-Attribute Access'
method: object
__getattribute__: name
	"Get a named attribute. Called for obj.name"

	self @env0:error: 'Not yet implemented: __getattribute__'
%

category: 'Grail-Serialization'
method: object
__getstate__
	"Return state for pickling"

	self @env0:error: 'Not yet implemented: __getstate__'
%

category: 'Grail-Comparison'
method: object
__gt__: other
	"Return self > other"

	self @env0:error: 'Not yet implemented: __gt__'
%

category: 'Grail-Hashing & Identity'
method: object
__hash__
	"Return hash value for this object"

	^ self @env0:hash
%

category: 'Grail-Initialization'
method: object
__init__
	"Initialize a new instance (called after __new__).
	This is an instance method that receives self (the instance).
	In Python: instance.__init__(*args, **kwargs) initializes the instance.
	Default implementation does nothing and returns None."

	^ None
%

category: 'Grail-Comparison'
method: object
__le__: other
	"Return self <= other"

	self @env0:error: 'Not yet implemented: __le__'
%

category: 'Grail-Comparison'
method: object
__lt__: other
	"Return self < other"

	self @env0:error: 'Not yet implemented: __lt__'
%

category: 'Grail-Comparison'
method: object
__ne__: other
	"Return self != other.

	Honor a setattr-installed ``__ne__'' if present; otherwise derive
	from a setattr-installed ``__eq__'' (CPython's default __ne__
	delegates to __eq__ and negates — dataclasses synthesize only
	__eq__).  Fall through to identity when neither is installed."

	| fn |
	fn := self @env1:___dynamicClassAttr___: #'__ne__'.
	fn @env0:== nil ifFalse: [^ fn @env1:___pyCallValue___: { self. other } kw: nil].
	fn := self @env1:___dynamicClassAttr___: #'__eq__'.
	fn @env0:== nil ifFalse: [^ (fn @env1:___pyCallValue___: { self. other } kw: nil) @env0:not].
	^ (self @env0:= other) @env0:not
%

category: 'Grail-Serialization'
method: object
__reduce__
	"Return state for pickling (protocol 2)"

	self @env0:error: 'Not yet implemented: __reduce__'
%

category: 'Grail-Serialization'
method: object
__reduce_ex__: protocol
	"Return state for pickling with protocol version"

	self @env0:error: 'Not yet implemented: __reduce_ex__'
%

category: 'Grail-String Representation'
method: object
__repr__
	"Return a string representation for debugging.

	Probe for a setattr-installed ``__repr__'' on the class chain
	(the dataclass decorator installs one via ``cls.__repr__ =
	synth_fn'').  When present, bind self and forward; the synthesized
	closure renders ``ClassName(field=value, ...)''.  When absent,
	fall through to the default ``<ClassName object>''."

	| myClass className stream fn |
	fn := self @env1:___dynamicClassAttr___: #'__repr__'.
	fn @env0:== nil ifFalse: [^ fn @env1:___pyCallValue___: { self } kw: nil].
	myClass := self @env0:class.
	className := myClass @env0:name.
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object>'.
	^ stream @env0:contents
%

category: 'Grail-Attribute Access'
method: object
__setattr__: name _: value
	"Python ``object.__setattr__'' default — called by ``obj.name = value''
	and ``setattr(obj, name, value)''.

	Two cases, in order:
	  (1) Data-descriptor (``@property'' with both getter and setter) —
	      detected as a paired unary ``name'' getter + 1-arg ``name:''
	      setter on the class chain.  Dispatch to the setter so the
	      property semantics are honored.  Matches CPython's
	      __setattr__ → type(obj).__getattribute__'s data-descriptor
	      precedence over the instance dict.
	  (2) Otherwise fall through to the polymorphic helper which writes
	      to dynamic-instVar storage (instance receivers) or the env-1
	      class-side setter (class receivers).

	Subclasses may override to intercept stores entirely (validation,
	conversion, audit, etc.); to bypass the override and hit the
	default behavior, call ``super().__setattr__(name, value)''."

	| sym setterSym cls |
	sym := name @env0:asSymbol.
	setterSym := (name @env0:asString @env0:, ':') @env0:asSymbol.
	cls := self @env0:class.
	((cls @env0:whichClassIncludesSelector: sym environmentId: 1) notNil
		and: [(cls @env0:whichClassIncludesSelector: setterSym environmentId: 1) notNil])
		ifTrue: [^ self @env0:perform: setterSym env: 1 withArguments: { value }].
	^ self @env1:___pyAttrStore___: name put: value
%

category: 'Grail-Other'
method: object
__sizeof__
	"Return the size of the object in memory, in bytes.
	Uses GemStone's physicalSize which returns bytes required to represent the object."

	^ self @env0:physicalSize
%

category: 'Grail-Callable'
method: object
___pyCallValue___: positional kw: kwargs
	"Default: receiver is not a Python callable.  Raise TypeError
	matching CPython's ``'<typename>' object is not callable''.

	Overridden on BoundMethod (and other callable wrappers) to
	forward the call.  Used by CallAst's probe-then-branch dispatch
	when a top-level def name has been rebound to a non-callable
	value (e.g. ``def foo(): ...; foo = 21; foo(5)'' must TypeError)."

	TypeError @env1:___signal___:
		'''' @env0:, self @env0:class @env0:name @env0:asString
			@env0:, ''' object is not callable'
%

category: 'Grail-Attribute Access'
method: object
___pyAttrDelete___: aName
	"Remove the named attribute from the instance's dynamic-instVar
	storage.  Raises Python AttributeError if no such attribute is
	bound — matches CPython's ``del obj.attr'' / ``delattr(obj, name)''
	semantics where a missing attribute is an error, not a silent no-op.

	Per the project nil-as-absent convention, an unset slot reads as
	nil; checking ``dynamicInstVarAt: == nil'' before removing
	distinguishes ``never bound'' from ``explicitly bound to None''
	(None is a distinct singleton, never the Smalltalk nil).

	Class receivers (Behavior or subclass) raise AttributeError —
	GemStone classes don't support dynamicInstVar removal and the
	auto-generated class-side setters have no removal counterpart.
	Add a class-side delete mechanism alongside the metaclass dynamic
	store (see [[dynInstVars-on-metaclass]]) if/when that lands."

	| sym |
	sym := aName @env0:asSymbol.
	(self @env0:isKindOf: Behavior) ifTrue: [
		"Class receiver — remove from dynInstVars dict (Python user
		class).  Built-in / non-Python classes have no dynInstVars
		slot and immediately AttributeError."
		((self @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
			ifTrue: [
				| holder |
				holder := self @env0:perform: #dynInstVars env: 1.
				(holder @env0:== nil) ifFalse: [
					(holder @env0:dynamicInstVarAt: sym) @env0:== nil ifFalse: [
						^ holder @env0:removeDynamicInstVar: sym
					]
				]
			].
		^ AttributeError @env1:___signal___:
			'type object ''' @env0:, self @env0:name @env0:asString @env0:,
				''' has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
	].
	(self @env0:dynamicInstVarAt: sym) @env0:== nil ifTrue: [
		AttributeError @env1:___signal___:
			'''' @env0:, aName @env0:asString @env0:, ''''
	].
	self @env0:removeDynamicInstVar: sym
%

category: 'Grail-Attribute Access'
method: object
___pyAttrStore___: aName put: aValue
	"Polymorphic attribute store called by AssignAst / builtins.setattr
	for ``obj.attr = value'' codegen.

	Three cases:
	  * Instance receiver — write straight to dynamic-instVar storage.
	    Matches CPython's ``object.__setattr__'' default (store into
	    instance dict).  A regular method ``attr:'' on the class is
	    NOT a data descriptor and must not intercept the store; see
	    AttributeStoreTestCase.
	  * Class receiver with an explicit env-1 setter ``attr:'' —
	    dispatch to it.  Covers class-body-declared attributes and
	    @property pairs (the auto-generated setter writes to the
	    classInstVar slot).
	  * Class receiver without a static setter — write to the
	    per-class ``dynInstVars'' dict (an Object whose dynamic
	    instVars hold the class-level attribute store).  Every
	    generated Python class declares a ``dynInstVars''
	    classInstVar initialised at class-build time; see
	    [[class-side-dynamic-attrs]] for the design rationale.

	Returns aValue so the codegen can use this as an expression
	(e.g. inside a tuple unpack or chained assignment)."

	(self @env0:isKindOf: Behavior) ifTrue: [
		| setterSym getterSym metaclass |
		setterSym := (aName @env0:asString @env0:, ':') @env0:asSymbol.
		getterSym := aName @env0:asString @env0:asSymbol.
		metaclass := self @env0:class.
		"Dispatch to a static setter ONLY when a PAIRED unary getter
		also exists — real class attributes / @property are always a
		getter+setter pair.  Probing the setter alone mis-fires for
		binary dunders: the metaclass chain bottoms out at Object, so
		``__eq__:'' / ``__ne__:'' / ``__lt__:'' (comparison methods, no
		unary getter) look like setters and ``setattr(cls, '__eq__',
		fn)'' would dispatch ``cls __eq__: fn'' instead of storing fn.
		The dataclass decorator relies on this store landing in
		dynInstVars so object>>__eq__ can find it."
		((metaclass @env0:whichClassIncludesSelector: setterSym environmentId: 1) notNil
			and: [(metaclass @env0:whichClassIncludesSelector: getterSym environmentId: 1) notNil])
			ifTrue: [^ self @env0:perform: setterSym env: 1 withArguments: { aValue }].
		"Python user class — store in the per-class dynInstVars dict."
		(metaclass @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil
			ifTrue: [
				| holder |
				holder := self @env0:perform: #dynInstVars env: 1.
				holder == nil ifTrue: [
					holder := Object @env0:new.
					self @env0:perform: #dynInstVars: env: 1 withArguments: { holder }
				].
				holder @env0:dynamicInstVarAt: aName @env0:asSymbol put: aValue.
				^ aValue
			].
		"Built-in / non-Python class with no setter — AttributeError."
		^ AttributeError @env1:___signal___:
			'''' @env0:, self @env0:name @env0:asString @env0:,
				''' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
	].
	self @env0:dynamicInstVarAt: aName @env0:asSymbol put: aValue.
	^ aValue
%

category: 'Grail-String Representation'
method: object
__str__
	"Return a string representation for display"

	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Grail-Other'
method: object
__subclasshook__: subclass
	"Customize issubclass() for abstract base classes.
	Default implementation should return NotImplemented singleton.
	TODO: Implement once NotImplementedType is created in smalltalk/classes/"

	self @env0:error: 'Not yet implemented: __subclasshook__ (needs NotImplemented singleton)'
%

category: 'Grail-Message Handling'
method: object
perform: aSelectorSymbol env: environmentId

"Sends the receiver the unary message indicated by the argument.
 The argument is the selector of the message.  Generates an error if
 the selector is not unary.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment.
"

<primitive: 2014>
^self @env0:_perform: (aSelectorSymbol @env0:asSymbol) env: environmentId withArguments: #()
%

category: 'Grail-Message Handling'
method: object
perform: aSelectorSymbol env: environmentId withArguments: anArray

"Sends the receiver the message indicated by the arguments.
 The argument, aSelectorSymbol, is the keyword selector of the message.
 The arguments of the message are the elements of anArray.  Generates an
 error if the number of arguments expected by aSelectorSymbol is not
 the same as the number of elements in anArray.

 anArray must be an instance of Array.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment."

<primitive: 2015>
anArray @env0:_validateClass: Array.

"Now just try the primitive again, but send asSymbol to the selector to convert
 it to a Symbol."
^ self @env0:_perform: (aSelectorSymbol @env0:asSymbol) env: environmentId withArguments: anArray
%

category: 'Grail-Message Handling'
method: object
with: anObject perform: aSelectorSymbol env: environmentId

"Sends the receiver the message indicated by the arguments.  The
 first argument is the keyword or binary selector of the message.  The
 second argument is the argument of the message to be sent.  Generates
 an error if the number of arguments expected by the selector is not 1.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment."

<primitive: 2014>
| sel |
sel := aSelectorSymbol @env0:asSymbol.
^self @env0:_perform: sel env: environmentId withArguments: { anObject }
%

set compile_env: 0

category: 'Grail-Callable'
method: object
___pyNamed___: aString
	"No-op fallback for the nested-def name stamp emitted by
	FunctionDefAst (``<block> @env0:___pyNamed___: 'name''').  ExecBlock
	overrides this to record ``__name__'' in its side-table; for any
	other value a nested def can evaluate to (e.g. a generator wrapper)
	the name simply isn't recorded.  Always returns self so the stamp is
	transparent in the assignment / decorator pipeline."

	^ self
%

category: 'Grail-Iteration'
method: object
___pyStarToArray___
	"Materialize the receiver — the source of a ``*''-unpack in a tuple /
	list literal or in call arguments — into a Smalltalk Array.  ``list''
	(OrderedCollection) and ``tuple'' (Array) are already
	SequenceableCollections and convert directly; any OTHER Python
	iterable (an iterator such as ``reversed(x)'' or ``dict.keys()'' ->
	list_iterator, a generator, map, range, …) is materialized through
	``list''s __iter__/__next__ constructor.  Replaces a bare ``asArray''
	in the splat codegen, which a Python iterator does not understand —
	the crash flask's ``preprocess_request'' hit via
	``(None, *reversed(request.blueprints))''."

	(self @env0:isKindOf: SequenceableCollection) ifTrue: [^ self @env0:asArray].
	^ (list @env1:__new__: self) @env0:asArray
%

category: 'Grail-Attribute Access'
method: object
doesNotUnderstand: aSelector args: anArray envId: envId
	"Bound-method-via-attribute-load fallback.

	In Python, ``obj.method`` (without calling) yields a bound method
	that can be stored, passed around, or later invoked.  Our codegen
	emits attribute reads as ``obj attr`` (a unary message send), so if
	``attr`` names a method that takes arguments (e.g. OrderedCollection
	>> append:), the bare unary form has no matching selector.  Rather
	than emit an explicit BoundMethod wrapper at every attribute load
	(most of which DO refer to instVar/property values), intercept at
	DNU time and synthesize the BoundMethod only when the unary send
	fails AND the class has a same-named callable selector (``attr:``,
	``attr:_:`` etc., or the varargs form ``_attr:kw:``).
	All other unknown sends fall through to super."

	| s md cls |
	envId @env0:= 1 ifFalse: [^ MessageNotUnderstood @env0:signal:
	'env-1 ', aSelector @env0:printString, ' not understood by ', self @env0:class @env0:name @env0:asString].
	s := aSelector @env0:asString.
	cls := self @env0:class.
	md := cls @env0:methodDictForEnv: 1.
	(s @env0:size @env0:> 0 @env0:and: [s @env0:last @env0:= $:]) ifTrue: [
		"Keyword selector like `name:_:_:` — the corresponding Python
		function may have been compiled as varargs (`_name:kw:`) because
		it has *args/**kwargs or defaults.  Extract the base name from
		the selector (everything up to the first colon), look for the
		varargs form on this class, and dispatch with positional={anArray}
		and kwargs=nil."
		| colonIdx baseName varargsSel |
		colonIdx := s @env0:indexOf: $:.
		baseName := s @env0:copyFrom: 1 to: colonIdx @env0:- 1.
		varargsSel := ('_' @env0:, baseName @env0:, ':kw:') @env0:asSymbol.
		(md @env0:includesKey: varargsSel) ifTrue: [
			| wrapped |
			wrapped := Array @env0:new: 2.
			wrapped @env0:at: 1 put: anArray.
			wrapped @env0:at: 2 put: nil.
			^ self @env0:perform: varargsSel env: 1 withArguments: wrapped
		].
		^ MessageNotUnderstood @env0:signal:
			'env-1 ', aSelector @env0:printString, ' not understood by ', cls @env0:name @env0:asString
	].
	"Unary selector with 0 args — return BoundMethod if class has any
	same-named callable form (for `f = obj.method` patterns)."
	anArray @env0:size @env0:= 0 ifFalse: [^ MessageNotUnderstood @env0:signal:
		'env-1 ', aSelector @env0:printString, ' not understood by ', cls @env0:name @env0:asString].
	((md @env0:includesKey: (s @env0:, ':') @env0:asSymbol)
		@env0:or: [(md @env0:includesKey: (s @env0:, ':_:') @env0:asSymbol)
			@env0:or: [(md @env0:includesKey: (s @env0:, ':_:_:') @env0:asSymbol)
				@env0:or: [md @env0:includesKey: ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol]]])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSelector].
	^ MessageNotUnderstood @env0:signal:
		'env-1 ', aSelector @env0:printString, ' not understood by ', cls @env0:name @env0:asString
%

set compile_env: 0
