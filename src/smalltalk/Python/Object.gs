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

category: 'Grail-Convenience Methods'
method: object
___unpackSequence___
	"Tuple-unpack coercion (``a, b, c = expr'').  AssignAst's unpack
	codegen indexes the RHS with __getitem__: -- correct for sequences,
	wrong for iterables WITHOUT positional indexing.  CPython unpacks any
	iterable via __iter__.  An INDEXABLE receiver (list/tuple/str/range/...)
	answers itself so the fast index path runs unchanged; a receiver that is
	iterable but NOT indexable (map/zip/filter/generator/enumerate/... ) is
	materialized into a list in iteration order so the index-based unpack
	works (``lhs, rhs = map(str.strip, line.split('->'))'' in test_fractions
	test_float_format_testfile).  Enum classes keep their own override; a
	non-iterable answers itself and the __getitem__: index then raises."

	((self @env0:class @env0:whichClassIncludesSelector: #'__getitem__:' environmentId: 1) @env0:notNil)
		ifTrue: [^ self].
	((self @env0:class @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) @env0:notNil
		@env0:or: [(self @env0:class @env0:whichClassIncludesSelector: #'__next__' environmentId: 1) @env0:notNil])
		ifTrue: [^ list @env1:__new__: self].
	^ self
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
	^ instance ___pyAttrStore___: attrName put: attrValue
%

category: 'Grail-Attribute Access'
classmethod: object
___setattr__: instance _: attrName _: attrValue
	"Fixed-arity form of the same unbound-method dispatch — handles
	codegen paths that emit the ``_:_:_:'' positional selector
	instead of the ``:kw:'' varargs form.  Matches the dispatch in
	``___setattr__:kw:''."

	^ instance ___pyAttrStore___: attrName put: attrValue
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
	whose attributes get filled by the exec'd namespace.
	Sealed kernel classes refuse #new UNCATCHABLY -- resignal as
	CPython's TypeError (see ___allocateInstance___:kw:)."

	^ [cls @env0:new]
		@env0:on: Error
		do: [:ex |
			(ex @env0:number == 2007 or: [ex @env0:number == 2014])
				ifTrue: [
					TypeError ___signal___: ('cannot create '''
						@env0:, cls @env0:name @env0:asString
						@env0:, ''' instances')]
				ifFalse: [ex @env0:pass]]
%

category: 'Grail-Convenience Methods'
classmethod: object
___new__: positional kw: kwargs
	"Varargs entry for ``object.__new__(cls, *args, **kwargs)`` —
	called when the call site can't determine arity statically.
	Ignores extra positional / keyword args (object.__new__ accepts
	them silently when __init__ is overridden)."

	^ [(positional @env0:at: 1) @env0:new]
		@env0:on: Error
		do: [:ex |
			(ex @env0:number == 2007 or: [ex @env0:number == 2014])
				ifTrue: [
					TypeError ___signal___: ('cannot create '''
						@env0:, (positional @env0:at: 1) @env0:name @env0:asString
						@env0:, ''' instances')]
				ifFalse: [ex @env0:pass]]
%

category: 'Grail-Instantiation'
method: object
___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames
	"``class X(base)`` where base is NOT a class (a BoundMethod --
	test_functools subclasses functools.cached_property, which Grail
	models as a module method): CPython raises TypeError; the bare
	env-1 MNU was uncatchable and killed the module run."

	TypeError ___signal___: ('cannot subclass a non-class base ('
		@env0:, self @env0:class @env0:name @env0:asString @env0:, ')')
%

category: 'Grail-Instantiation'
classmethod: object
___allocateInstance___: positional kw: keywords
	"Allocate an instance of self (a class) for ``Cls(*args, **kw)``.
	A class-body ``def __new__(cls, ...)`` compiles as an INSTANCE-side
	method whose self-param is ``cls`` -- run it non-virtually with the
	CLASS as receiver (so ``cls`` binds to the class), walking the
	chain so subclasses inherit a parent's Python __new__.  Falls back
	to plain allocation when no user __new__ exists.  The instantiation
	method (ClassDefAst>>emitInstantiationMethodFor:) calls __init__ on
	the result afterwards, matching CPython's __new__-then-__init__.

	vendored fractions.py is the driving case: Fraction.__new__ does
	all construction (slots + normalization) and there is no __init__.
	Invocation reuses UnboundMethod (arity resolution + the
	performMethod: family); its convention takes the receiver as the
	first positional, which here is the class itself."

	| n sel stream found |
	found := (self @env0:whichClassIncludesSelector: #'___new__:kw:' environmentId: 1) ~~ nil.
	found ifFalse: [
		n := positional @env0:size.
		stream := WriteStream @env0:on: String @env0:new.
		stream @env0:nextPutAll: '__new__:'.
		2 @env0:to: n do: [:i | stream @env0:nextPutAll: '_:'].
		sel := stream @env0:contents @env0:asSymbol.
		found := n @env0:> 0 and: [(self @env0:whichClassIncludesSelector: sel environmentId: 1) ~~ nil]].
	found ifFalse: [
		"A sealed kernel class (ExecBlock via type(lambda)(), ...) refuses
		#new with an UNCATCHABLE ShouldNotImplement/ImproperOperation --
		resignal as CPython's catchable TypeError."
		^ [self @env0:new]
			@env0:on: Error
			do: [:ex |
				(ex @env0:number == 2007 or: [ex @env0:number == 2014])
					ifTrue: [
						TypeError ___signal___: ('cannot create '''
							@env0:, self @env0:name @env0:asString
							@env0:, ''' instances')]
					ifFalse: [ex @env0:pass]]].
	^ (UnboundMethod definingClass: self selector: #'__new__')
		value: ({ self } @env0:, positional) value: keywords
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method for calling __new__:_: from env 1 code"
	^ self __new__: arg1 _: arg2
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method for calling __new__:_:_: from env 1 code"
	^ self __new__: arg1 _: arg2 _: arg3
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
___pyClassDefined___: attrNames
	"Metaclass post-population hook.  ClassDefAst sends this (class-side)
	to every Python class right after its body is compiled, passing the
	class-body attribute names in declaration order.  Dispatched through
	the class's metaclass, so a metaclass such as ``Enum class`` can
	override it to transform the body (e.g. build enum members from the
	named class attributes).  The default returns the class unchanged.

	Timing mirrors Python's metaclass ``__init__`` / ``__init_subclass__``
	(after the namespace is populated), not ``__new__``."

	^ self
%

category: 'Grail-Initialization'
classmethod: object
__new__
	"Create a new instance of this class.
	This is a class method that takes the class as the receiver.
	In Python: object.__new__(cls) creates a new instance of cls.
	Sealed kernel classes refuse #new UNCATCHABLY -- resignal as
	CPython's TypeError."

	^ [self @env0:new]
		@env0:on: Error
		do: [:ex |
			(ex @env0:number == 2007 or: [ex @env0:number == 2014])
				ifTrue: [
					TypeError ___signal___: ('cannot create '''
						@env0:, self @env0:name @env0:asString
						@env0:, ''' instances')]
				ifFalse: [ex @env0:pass]]
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

category: 'Grail-Introspection'
classmethod: object
__qualname__
	"Python ``cls.__qualname__`` — the qualified name.  Grail does not
	track lexical nesting of classes, so answer the same string as
	__name__ (correct for top-level classes, which is the common case).
	CPython error messages interpolate it (e.g. textwrap.dedent's
	``expected str object, not {type(text).__qualname__!r}'')."

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
		^ self _new: positional kw: kwargs
	].
	nargs := positional @env0:size.
	nargs @env0:= 0 ifTrue: [^ self __new__].
	nargs @env0:= 1 ifTrue: [^ self __new__: (positional @env0:at: 1)].
	sel := WriteStream @env0:on: String @env0:new.
	sel @env0:nextPutAll: '__new__:'.
	2 @env0:to: nargs do: [:i | sel @env0:nextPutAll: '_:'].
	^ self @env0:perform: sel @env0:contents @env0:asSymbol env: 1 withArguments: positional
%

category: 'Grail-Callable'
method: object
value: positional value: kwargs
	"Calling a NON-callable (a list passed where a key function was
	expected -- test_heapq's error-path fixtures): CPython raises
	TypeError; the bare env-1 MNU was uncatchable.  Real callables
	(blocks, BoundMethod, UnboundMethod, partial, classes via the
	metaclass) define their own value:value: and never reach this."

	TypeError ___signal___: ('''' @env0:, self @env0:class @env0:name @env0:asString
		@env0:, ''' object is not callable')
%

category: 'Grail-Convenience Methods - Unary'
method: object
___isTruthy___
	"Convert any Python object to a Smalltalk Boolean for use in if/while conditions.
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing"

	^ bool __new__: self
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
___descriptorGet___: aValue
	"Python descriptor protocol on attribute read.  When a class
	attribute resolves to an object whose class defines ``__get__''
	(env-1 ``__get__:_:''), Python calls
	``descriptor.__get__(instance, owner)'' and returns that instead
	of the descriptor itself.  Grail has no built-in descriptor
	machinery, so honour it here for the class-attribute return paths.

	Load-bearing for django.urls.resolvers (``regex =
	LocaleRegexDescriptor()'' — ``self.regex'' must compile the
	pattern), and for django.utils.functional.classproperty and
	db.models.query_utils.class_or_instance_method.

	BoundMethod is explicitly EXCLUDED even though it now defines
	``__get__:_:'' (the function descriptor protocol, added for explicit
	callers like weakref.WeakMethod's ``self._func.__get__(obj, cls)'').
	Grail's dispatch model performs method binding elsewhere; letting
	the implicit attr-read path rebind every class-attribute function
	(e.g. itsdangerous' ``digest_method = staticmethod(hashlib.sha1)'')
	would redirect such calls at the holder instance and DNU."

	(aValue == nil or: [aValue == None]) ifTrue: [^ aValue].
	(aValue isKindOf: BoundMethod) ifTrue: [^ aValue].
	"``__get__(self, instance, cls=None)'' — the ``cls'' default makes
	it compile to the varargs selector ``___get__:kw:''; a defaultless
	one would be the fixed ``__get__:_:''.  Try both."
	((aValue @env0:class @env0:whichClassIncludesSelector: #'___get__:kw:' environmentId: 1) notNil)
		ifTrue: [^ aValue ___get__: { self. self @env0:class } kw: nil].
	((aValue @env0:class @env0:whichClassIncludesSelector: #'__get__:_:' environmentId: 1) notNil)
		ifTrue: [^ aValue __get__: self _: self @env0:class].
	^ aValue
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
	walker := (self isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	"Canonical-class overlay first: a runtime setattr on a canonical class
	(e.g. ``Cls.__init__ = fn'') lands in the session overlay, which must
	shadow the committed dynInstVars store.  The lookup walks the same
	superclass chain this method does."
	(self ___classAttrOverlayLookup___: walker name: aSym)
		@env0:ifNotNil: [:___ovv | ^ ___ovv].
	[walker == nil] whileFalse: [
		((walker @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
			ifTrue: [
				| holder dynValue |
				holder := walker @env0:perform: #dynInstVars env: 1.
				holder == nil ifFalse: [
					dynValue := holder @env0:dynamicInstVarAt: aSym.
					dynValue == nil ifFalse: [^ dynValue]
				]
			].
		walker := walker @env0:superClass
	].
	^ nil
%

category: 'Grail-Python Protocol'
method: object
___hasProtocol___: aName
	"True when the receiver's class chain REALLY defines the Python method
	aName -- i.e. below the PythonInstance / Object fallback level.
	collections.abc's structural checks (isinstance(x, Iterable) etc.) need
	method OWNERSHIP, and a plain getattr probe cannot provide it:
	PythonInstance compiles catchable-TypeError fallbacks for __iter__ /
	__next__ / __getitem__ / ... onto EVERY instance (so the legacy
	protocols raise catchably instead of MNUing), which makes
	``getattr(x, '__iter__')'' non-None for any object whatsoever.
	Works for instance receivers (probe the class) and class receivers
	(probe the class itself -- the issubclass side)."

	| walker s found |
	s := aName @env0:asString.
	walker := (self isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	{ s @env0:asSymbol.
	  (s @env0:, ':') @env0:asSymbol.
	  (s @env0:, ':_:') @env0:asSymbol.
	  ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol } @env0:do: [:sel |
		found := walker @env0:whichClassIncludesSelector: sel environmentId: 1.
		"Excluded owners: PythonInstance/Object carry the generic legacy
		fallbacks; NoneType and Integer compile raising-TypeError stubs for
		__iter__/__getitem__ (catchable errors instead of env-1 MNUs) --
		none of those are real protocol implementations."
		(found ~~ nil
			and: [found ~~ PythonInstance
			and: [found ~~ Object
			and: [found ~~ Integer
			and: [found @env0:name ~~ #'NoneType']]]])
				ifTrue: [^ true]].
	^ false
%

category: 'Grail-Class Attr Overlay'
method: object
___classAttrOverlayLookup___: aClass name: aSym
	"Session-local overlay read for runtime class-attribute writes on
	CANONICAL classes (docs/Persistent_Modules_and_Classes.md par.7).
	Walks aClass's superclass chain (runtime setattr on a base is visible
	through a subclass, matching Python's type-MRO lookup) and returns the
	overlaid value, or nil when none applies.  The overlay only ever holds
	values when the canonical-classes flag is on AND the class was
	registered canonically, so the common case is a single SessionTemps
	probe that answers nil.  Values are Python objects (None is the None
	singleton, never Smalltalk nil), so nil unambiguously means absent."

	| st ov walker inner v |
	st := SessionTemps @env0:current.
	ov := st @env0:at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifTrue: [^ nil].
	walker := aClass.
	[walker == nil] whileFalse: [
		inner := ov @env0:at: walker otherwise: nil.
		inner == nil ifFalse: [
			v := inner @env0:at: aSym otherwise: nil.
			v == nil ifFalse: [^ v]].
		walker := walker @env0:superClass].
	^ nil
%

category: 'Grail-Class Attr Overlay'
method: object
___classAttrOverlayStore___: aClass name: aSym value: aValue
	"Route a runtime class-attribute STORE on a canonical class into the
	session-local overlay instead of the committed class.  Returns true
	when routed (flag on + aClass registered canonically), false when the
	caller should use the ordinary (committed) path.  Keeping runtime
	mutation session-local means a shared canonical class is never dirtied
	by ``Cls.x = v`` -- no write-write conflicts between sessions, and no
	session objects swept into the developer's next commit through a
	class-attr value.  Class-BODY initialisation is unaffected: it runs
	inside the class-build guard BEFORE ___canonicalClassRegister___ adds
	the class to the canonical set, so definitional defaults still land on
	(and commit with) the class."

	| st set ov inner ug |
	st := SessionTemps @env0:current.
	((st @env0:at: #'GrailCanonicalClassesEnabled' otherwise: false) == true)
		ifFalse: [^ false].
	"UserGlobals is PER-USER and this file compiles as SystemUser (shared
	classes), while the canonical set is registered under the session
	user's UserGlobals (importlib compiles as DataCurator) -- a static
	reference here would silently probe the wrong dictionary.  Resolve the
	SESSION user's binding at runtime."
	ug := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'UserGlobals'.
	ug == nil ifTrue: [^ false].
	set := ug @env0:at: #'GrailCanonicalClassSet' otherwise: nil.
	set == nil ifTrue: [^ false].
	(set @env0:includes: aClass) ifFalse: [^ false].
	ov := st @env0:at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifTrue: [
		ov := IdentityKeyValueDictionary @env0:new.
		st @env0:at: #'GrailClassAttrOverlay' put: ov].
	inner := ov @env0:at: aClass otherwise: nil.
	inner == nil ifTrue: [
		inner := KeyValueDictionary @env0:new.
		ov @env0:at: aClass put: inner].
	inner @env0:at: aSym put: aValue.
	^ true
%

category: 'Grail-Class Attr Overlay'
method: object
___classAttrOverlayRemove___: aClass name: aSym
	"Remove aClass's OWN overlay entry for aSym (``del Cls.x'' deletes from
	the class's own dict in CPython -- no chain walk).  Returns true when an
	entry was removed; false sends the caller down the ordinary path."

	| ov inner |
	ov := SessionTemps @env0:current @env0:at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifTrue: [^ false].
	inner := ov @env0:at: aClass otherwise: nil.
	inner == nil ifTrue: [^ false].
	(inner @env0:at: aSym otherwise: nil) == nil ifTrue: [^ false].
	inner @env0:removeKey: aSym.
	^ true
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___classDict___
	"Python ``cls.__dict__`` (receiver is a CLASS -- dispatched from the
	Behavior branch of ___pyAttrLoad___).  A SNAPSHOT KeyValueDictionary of
	the class's OWN attributes; callers that want inherited names walk
	``mro()`` and union, exactly as CPython code does over the real
	per-class mappingproxy.  Union of:
	  (a) the per-class dynamic-attr holder (enum members, class-body-if
	      stores, setattr(cls, ...) fallbacks),
	  (b) metaclass OWN accessor-pair class attributes (class-body
	      ``X = 1'' data) plus other metaclass OWN methods (@classmethod
	      defs) as UnboundMethod wrappers,
	  (c) the class's OWN env-1 instance methods (Python functions live in
	      the class dict) as UnboundMethod wrappers -- arity variants
	      collapse to the base Python name,
	  (d) session-local canonical-class overlay entries (runtime
	      ``Cls.x = v'' stores; flag-on only), which shadow (a)-(c).
	Grail-internal ``___...___'' selectors are excluded.  Data values that
	read as Smalltalk nil are ABSENT (project convention) and skipped."

	| d holder pairs imd cmd addSel |
	d := KeyValueDictionary @env0:new.
	"(c)/(b) shared: collapse a selector to its Python name and store an
	UnboundMethod wrapper unless a data value already claimed the name."
	addSel := [:sel :defCls |
		| nm |
		nm := sel @env0:asString.
		(nm @env0:includes: $:) ifTrue: [
			nm := nm @env0:copyFrom: 1 to: (nm @env0:indexOf: $:) @env0:- 1].
		(((nm @env0:size) @env0:> 0)
			and: [(nm @env0:copyFrom: 1 to: (3 @env0:min: nm @env0:size)) @env0:~= '___'
			and: [nm @env0:~= 'dynInstVars'
			and: [(d @env0:includesKey: nm) @env0:not]]]) ifTrue: [
			d @env0:at: nm put:
				(UnboundMethod definingClass: defCls selector: nm @env0:asSymbol)]].
	"(c) own instance-side methods."
	imd := [self @env0:methodDictForEnv: 1] @env0:on: AbstractException do: [:e | e @env0:return: nil].
	imd == nil ifFalse: [
		imd @env0:keys @env0:do: [:sel | addSel @env0:value: sel value: self]].
	"(b) metaclass own: accessor PAIRS read as data; the rest wrap."
	cmd := [self @env0:class @env0:methodDictForEnv: 1] @env0:on: AbstractException do: [:e | e @env0:return: nil].
	cmd == nil ifFalse: [
		cmd @env0:keys @env0:do: [:sel |
			| nm setter v |
			nm := sel @env0:asString.
			((nm @env0:includes: $:) @env0:not
				and: [nm @env0:~= 'dynInstVars']) ifTrue: [
				setter := (nm @env0:, ':') @env0:asSymbol.
				(cmd @env0:includesKey: setter)
					ifTrue: [
						v := [self @env0:perform: sel env: 1] @env0:on: AbstractException do: [:e | e @env0:return: nil].
						v == nil ifFalse: [d @env0:at: nm put: v]]
					ifFalse: [addSel @env0:value: sel value: self @env0:class]]]].
	"(a) per-class dynamic attrs: data ALWAYS wins over a same-named
	method wrap (enum members shadow their accessor machinery).
	dynamicInstVarPairs answers a FLAT alternating array and raises on a
	never-stored holder -- guard and iterate by 2."
	((self @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) ~~ nil) ifTrue: [
		holder := [self @env0:perform: #dynInstVars env: 1] @env0:on: AbstractException do: [:e | e @env0:return: nil].
		holder == nil ifFalse: [
			pairs := [holder @env0:dynamicInstVarPairs] @env0:on: AbstractException do: [:e | e @env0:return: #()].
			1 @env0:to: pairs @env0:size @env0:- 1 by: 2 do: [:i |
				| v |
				v := pairs @env0:at: i @env0:+ 1.
				v == nil ifFalse: [
					d @env0:at: (pairs @env0:at: i) @env0:asString put: v]]]].
	"(d) session-local overlay entries shadow everything (last setattr
	wins; flag-on only, so the common case adds nothing)."
	[ | ov inner |
	ov := SessionTemps @env0:current @env0:at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifFalse: [
		inner := ov @env0:at: self otherwise: nil.
		inner == nil ifFalse: [
			inner @env0:keysAndValuesDo: [:k :v |
				v == nil ifFalse: [d @env0:at: k @env0:asString put: v]]]] ]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ d
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___classCell___: aSym
	"Closure-cell read for class-method bodies: the value of an
	enclosing-function local captured at class-DEFINITION time into
	the class's per-class dynamic attrs (see NameAst's class-method
	closure-cell branch).  Works for instance methods (receiver is the
	instance) and class-side receivers alike; the chain walk lets
	subclasses inherit the cells.  An absent cell is a NameError --
	capture is by VALUE at definition, so a sibling bound after the
	classdef is not visible (documented deviation from CPython's
	by-reference cells)."

	| v |
	v := self ___dynamicClassAttr___: aSym.
	v == nil ifTrue: [
		NameError ___signal___: ('free variable '''
			@env0:, (aSym @env0:asString @env0:copyFrom: 9 to: aSym @env0:asString @env0:size - 3)
			@env0:, ''' referenced before assignment in enclosing scope')].
	^ v
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___classAttrDunder___: baseSym
	"A callable stored as a CLASS ATTRIBUTE under a dunder name --
	fractions' ``__add__, __radd__ = _operator_fallbacks(_add,
	operator.add)'' materializes the operators as class-body attrs,
	not compiled methods.  Probe the class-body accessor pair on the
	metaclass first (ClassDefAst class attrs), then per-class dynamic
	attrs (setattr'd overrides).  Returns nil when absent."

	| cls metaclass sym1 v |
	cls := self @env0:class.
	"Canonical-class overlay first: setattr(Cls, '__add__', fn) at runtime
	lands session-locally and must shadow the committed accessor pair."
	(self ___classAttrOverlayLookup___: cls name: baseSym)
		@env0:ifNotNil: [:___ovv | ^ ___ovv].
	metaclass := cls @env0:class.
	sym1 := (baseSym @env0:asString @env0:, ':') @env0:asSymbol.
	((metaclass @env0:whichClassIncludesSelector: baseSym environmentId: 1) ~~ nil
		and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) ~~ nil])
		ifTrue: [
			v := cls @env0:perform: baseSym env: 1.
			v == nil ifFalse: [^ v]].
	^ self ___dynamicClassAttr___: baseSym
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

	(aValue isKindOf: MethodBinding) ifTrue: [^ false].
	(aValue isKindOf: BoundMethod) ifTrue: [^ true].
	(aValue isKindOf: ExecBlock) ifTrue: [^ true].
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
						AttributeError ___signal___:
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

	| md sym1 sym2 sym3 sym4 sym5 sym6 symVA s isModule isGenerated dynValue walker owner |
	"An empty attribute name (``getattr(obj, '')'' -- e.g. attrgetter('child.')
	whose dotted split has an empty part) must raise the catchable
	AttributeError, not the uncatchable GemStone ``instVar names cannot be
	empty symbol'' that ``dynamicInstVarAt: #''''`` below would signal."
	(aSym @env0:size @env0:= 0) ifTrue: [
		^ AttributeError ___signal___: (self @env0:class @env0:name @env0:asString
			@env0:, ' object has no attribute (empty name)')].
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
	"Python __slots__ → GemStone named instance variables, name-mangled
	(``x'' → ``___slot_x___'').  A slotted class carries an instance-side
	``___pyHasSlots___'' marker (emitted by ClassDefAst); gating on it fires
	the probe only for classes that declare __slots__ — including subclasses
	of built-ins like Exception, NOT just PythonInstance.  The ``___slot_*___''
	instVar prefix keeps ``indexOf:'' specific to real slots even when the
	receiver also has built-in named instVars.  A set slot returns its value;
	an unset slot (nil) falls through to the resolution chain below (class
	attrs / __getattr__ / AttributeError)."
	((self @env0:class @env0:whichClassIncludesSelector: #'___pyHasSlots___' environmentId: 1) notNil) ifTrue: [
		| slotIdx slotVal |
		"allInstVarNames returns Symbols; indexOf: gives the instVarAt:
		index (0 when absent).  This image's kernel has no instVarNamed:,
		so the runtime path reaches slots by index."
		slotIdx := self @env0:class @env0:allInstVarNames
			@env0:indexOf: (('___slot_' @env0:, s @env0:, '___') @env0:asSymbol).
		slotIdx @env0:~= 0 ifTrue: [
			slotVal := self @env0:instVarAt: slotIdx.
			slotVal == nil ifFalse: [^ slotVal]
		]
	].
	sym1 := (s @env0:, ':') @env0:asSymbol.
	sym2 := (s @env0:, ':_:') @env0:asSymbol.
	sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
	sym4 := (s @env0:, ':_:_:_:') @env0:asSymbol.
	"5- and 6-arg fixed selectors: generated/library code does declare
	methods this wide with no defaults (twilio's
	``Session.merge_environment_settings(self, url, proxies, stream,
	verify, cert)``), and without the probe the attribute load
	AttributeErrors even though the method exists.  BoundMethod's
	_selectorForArgCount: already builds any arity at call time."
	sym5 := (s @env0:, ':_:_:_:_:') @env0:asSymbol.
	sym6 := (s @env0:, ':_:_:_:_:_:') @env0:asSymbol.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	"Module instances (pre-installed Python modules like html/math, plus
	loaded module classes derived from `module`) always treat unary
	attribute reads as value reads (an attribute holds a function,
	submodule, constant, ...).  Bound-method wrapping doesn't apply."
	isModule := self isKindOf: module.
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
		"Phase A: dynamic-instVar storage is the canonical home for
		module globals -- checked BEFORE the varargs-selector probe so a
		module-level decorator's rebinding wins over the original
		compiled def (``@functools.singledispatch def g'' stores the
		wrapper in g's slot while ``_g:kw:'' still exists; the bare-call
		dispatcher and module.gs's resolution already use this order).
		Per the nil-as-absent convention, a nil read means unset."
		dynValue := self @env0:dynamicInstVarAt: aSym.
		dynValue == nil ifFalse: [^ dynValue].
		"Cache the wrapper in the slot so repeated reads of the same
		module function return the SAME object -- CPython functions are
		first-class module attributes with stable identity
		(g.dispatch(int) is g_int)."
		((self @env0:class @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
			dynValue := BoundMethod receiver: self selector: aSym.
			self @env0:dynamicInstVarAt: aSym put: dynValue.
			^ dynValue
		].
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
			"A 0-arg selector is either a data accessor (``__name__'',
			``Grail-Constants'') that must be PERFORMED to yield its value,
			or a native module FUNCTION (random.random, time.time — 0-arg
			functions compiled to a unary Smalltalk selector) that must read
			as a first-class BoundMethod, NOT be auto-invoked: ``from random
			import random'' would otherwise bind the float random() returns.
			Discriminate by category.  Only the FUNCTION categories below
			(plus Python defs in ``Grail-Methods'') wrap; the DEFAULT stays
			perform, so an unlisted category behaves exactly as before — a
			still-uncallable function at worst, never a newly-broken
			accessor.  Compare as Strings so a Symbol/String category is
			matched either way."
			| cat |
			cat := (owner @env0:categoryOfSelector: aSym environmentId: 1) @env0:asString.
			(#('Grail-Methods' 'Grail-Built-in Functions' 'Grail-Wall clock'
			   'Grail-Monotonic' 'Grail-Formatting' 'Grail-Calendar') @env0:includes: cat)
				ifTrue: [
					dynValue := BoundMethod receiver: self selector: aSym.
					self @env0:dynamicInstVarAt: aSym put: dynValue.
					^ dynValue]
				ifFalse: [^ self @env0:perform: aSym env: 1]
		].
		(((self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil)
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym4 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym5 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym6 environmentId: 1) notNil]]]]]) ifTrue: [
			dynValue := BoundMethod receiver: self selector: aSym.
			self @env0:dynamicInstVarAt: aSym put: dynValue.
			^ dynValue
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
	(self isKindOf: Behavior) ifTrue: [
		"Class-level dunders that should always read as values, never
		wrap as BoundMethods.  Without this, ``type(node).__name__``
		on any class would wrap the inherited Behavior-side getter
		and break visitor dispatch
		(``getattr(self, 'visit_' + type(node).__name__)``)."
		((s @env0:= '__name__' or: [s @env0:= '__module__' or: [s @env0:= '__qualname__' or: [s @env0:= '__mro__' or: [s @env0:= '__base__' or: [s @env0:= '__bases__']]]]])
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil])
				ifTrue: [^ self @env0:perform: aSym env: 1].
		"Python ``cls.__dict__``: the class's OWN attribute dict.  MUST
		precede the unbound-method wrap below -- PythonInstance defines an
		instance-side __dict__ (the live per-instance view), so a CLASS
		access used to wrap THAT as an UnboundMethod instead of answering
		the class dict (test_enum's member_dir iterates
		``cls.__dict__.items()`` over the mro; test_gnv_is_static indexes
		it).  CPython hands back a read-only mappingproxy; a snapshot
		dict covers the introspection uses."
		aSym == #'__dict__' ifTrue: [^ self ___classDict___].
		"Canonical-class overlay: a runtime ``Cls.x = v'' store landed
		session-locally (see ___pyAttrStore___) and must SHADOW the
		committed class-body value / compiled method on read -- CPython's
		last-setattr-wins.  nil means no overlay applies (the default)."
		(self ___classAttrOverlayLookup___: self name: aSym)
			@env0:ifNotNil: [:___ovv | ^ ___ovv].
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
		"Per-class dynamic attr store — the home of setattr(cls, ...)
		fallbacks AND of class-attr values merged from SECONDARY bases
		(multiple inheritance; see importlib
		___mergeSecondaryBases___).  Walk the primary chain so
		subclasses see values stored on an ancestor."
		[ | walker holder v |
		walker := self.
		[walker ~~ nil and: [walker ~~ Object]] @env0:whileTrue: [
			((walker @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) ~~ nil) ifTrue: [
				holder := walker @env0:perform: #dynInstVars env: 1.
				holder == nil ifFalse: [
					v := holder @env0:dynamicInstVarAt: aSym.
					v == nil ifFalse: [^ v]
				]
			].
			walker := walker @env0:superclass
		].
		nil ] value.
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
			@env0:or: [(self @env0:whichClassIncludesSelector: sym5 environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: sym6 environmentId: 1) notNil
			@env0:or: [(self @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]]]]])
			ifTrue: [^ UnboundMethod definingClass: self selector: aSym].
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
	"AbstractPyInt-rooted classes (int subclasses routed by
	___subclass___) get the same ClassDefAst-synthesized getter/setter
	pairs as PythonInstance ones -- the @property pair-read applies
	equally (CustomInt's ``numerator`` property in test_fractions)."
	isGenerated := (self isKindOf: PythonInstance)
		or: [self isKindOf: AbstractPyInt].
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
					ifTrue: [^ self ___descriptorGet___: (self @env0:class @env0:perform: aSym env: 1)].
			].
			^ self ___descriptorGet___: instVal
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
	(self isKindOf: PythonInstance) ifTrue: [
		| metaclass metaOwns |
		"Canonical-class overlay first: an ``self.x'' read falling back to
		the class must see a runtime ``Cls.x = v'' overlay store before the
		committed class-body accessor -- with the SAME descriptor binding the
		committed per-class dynInstVars path applies below: a callable stored
		as a class attribute and read through an INSTANCE binds self via a
		MethodBinding (``Box.greet = fn; b.greet(x)'' -> fn(b, x)).
		___descriptorGet___ is wrong here -- it excludes BoundMethod and would
		return the function unbound, dropping self."
		(self ___classAttrOverlayLookup___: self @env0:class name: aSym)
			@env0:ifNotNil: [:___ovv |
				(self ___isDescriptorCallable___: ___ovv)
					ifTrue: [^ MethodBinding instance: self callable: ___ovv].
				^ ___ovv].
		metaclass := self @env0:class @env0:class.
		((metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
			and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil]) ifTrue: [
			^ self ___descriptorGet___: (self @env0:class @env0:perform: aSym env: 1)
		].
		"@classmethod / @staticmethod live on the metaclass with
		``name:`` or ``_name:kw:`` selectors but NO paired unary
		setter (so the value-attr branch above doesn't catch them).
		Wrap as a BoundMethod whose receiver is the class object so
		``self.cls_method(args)`` dispatches correctly.

		Gate on the owning class being a TRUE metaclass (``isMeta'').
		The metaclass chain ends in the Smalltalk kernel (``... Class ->
		Behavior -> Object''), and ``object'' installs default dunder
		methods on that kernel tail: ``__exit__:_:_:'' (the context-manager
		protocol) and the comparison dunders ``__eq__:''/``__lt__:''/....
		Without the ``isMeta'' gate those object-level defaults are found
		on the metaclass chain and masquerade as class-side methods, so
		``self.__exit__(...)'' / ``self.__eq__(...)'' wrongly bind to the
		CLASS instead of the instance -- breaking every context manager
		whose ``__exit__'' is reached through a normal call
		(test.support.swap_item) and any ``inst.__eq__''-style dunder call."
		metaOwns := [:sel | | o |
			o := metaclass @env0:whichClassIncludesSelector: sel environmentId: 1.
			o notNil and: [o @env0:isMeta]].
		((metaOwns @env0:value: sym1)
			or: [(metaOwns @env0:value: sym2)
				or: [(metaOwns @env0:value: sym3)
					or: [(metaOwns @env0:value: sym4)
						or: [(metaOwns @env0:value: sym5)
							or: [(metaOwns @env0:value: sym6)
								or: [metaOwns @env0:value: symVA]]]]]])
			ifTrue: [^ BoundMethod receiver: self @env0:class selector: aSym].
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
	"``str.strip'' / ``str.split'' etc.: the str builtin is a BoundMethod, not
	a class (there is no single `str' class -- strings span Unicode7 /
	Unicode16 / ... under CharacterCollection), so a str METHOD name accessed
	on it must resolve to an UnboundMethod on CharacterCollection (where the
	str methods live), mirroring how ``int.bit_length'' resolves against the
	Integer class.  ``map(str.strip, ...)'' in test_fractions
	test_float_format_testfile needs this.  Value dunders (__name__, ...)
	were already answered just above; only the str constructor delegates."
	((self @env0:isKindOf: BoundMethod)
		and: [self @env0:selector == #'str'
			and: [(Python @env0:at: #builtins otherwise: nil)
				@env0:ifNil: [false] ifNotNil: [:bc | self @env0:receiver @env0:isKindOf: bc]]])
		ifTrue: [
			((CharacterCollection @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
				or: [(CharacterCollection @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
				or: [(CharacterCollection @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
				or: [(CharacterCollection @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
				or: [(CharacterCollection @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]])
				ifTrue: [^ UnboundMethod definingClass: CharacterCollection selector: aSym]].
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
	(self isKindOf: Behavior) ifFalse: [
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
						or: [(self @env0:class @env0:whichClassIncludesSelector: sym5 environmentId: 1) notNil
							or: [(self @env0:class @env0:whichClassIncludesSelector: sym6 environmentId: 1) notNil
								or: [(self @env0:class @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]]]]])
		ifTrue: [^ BoundMethod receiver: self selector: aSym].
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
	((self isKindOf: Behavior)
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
	walker := (self isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	[walker == nil] whileFalse: [
		((walker @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
			ifTrue: [
				| holder dynValue |
				holder := walker @env0:perform: #dynInstVars env: 1.
				holder == nil ifFalse: [
					dynValue := holder @env0:dynamicInstVarAt: aSym.
					dynValue == nil ifFalse: [
						"Python descriptor protocol: a callable stored as a
						class attribute and accessed THROUGH AN INSTANCE
						binds the instance as ``self''.  Wrap in a
						MethodBinding that prepends self to the call args
						and forwards.  Class-side access (self is a
						Behavior) returns the raw callable — matches
						CPython's ``Cls.method'' yielding the function
						unchanged.  Non-callable class attributes (ints,
						strings, classes) return raw on both paths."
						((self isKindOf: Behavior) not
							and: [self ___isDescriptorCallable___: dynValue])
							ifTrue: [^ MethodBinding instance: self callable: dynValue].
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
			~~ object])
		ifTrue: [^ self __getattr__: s].
	"A ``__getattr__'' bound as a class ATTRIBUTE (a function value,
	not a ``def'') — django's LazyObject does ``__getattr__ =
	new_method_proxy(getattr)''.  Grail stores it in the per-class
	dynInstVars holder rather than as an env-1 method, so probe the
	class chain and invoke it with (self, name); CPython passes the
	instance as the descriptor's first arg."
	(self isKindOf: Behavior) ifFalse: [
		| getattrFn metaCls |
		"``__getattr__'' bound as a class attribute lands in EITHER the
		per-class dynInstVars holder (setattr / MI merge) OR a
		Grail-Class Attrs accessor pair on the metaclass (a plain
		``__getattr__ = fn'' class-body assignment — django's
		LazyObject).  Probe both."
		getattrFn := self ___dynamicClassAttr___: #'__getattr__'.
		getattrFn == nil ifTrue: [
			metaCls := self @env0:class @env0:class.
			(metaCls @env0:whichClassIncludesSelector: #'__getattr__' environmentId: 1) notNil ifTrue: [
				getattrFn := [self @env0:class @env0:perform: #'__getattr__' env: 1]
					@env0:on: Error do: [:e | nil]
			]
		].
		(getattrFn == nil or: [getattrFn == None]) ifFalse: [
			^ getattrFn value: { self. s } value: nil
		]
	].
	^ AttributeError ___signal___:
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

	^ self ___pyAttrDelete___: name
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

	^ AttributeError ___signal___:
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
	fn := self ___dynamicClassAttr___: #'__eq__'.
	fn == nil ifFalse: [^ fn ___pyCallValue___: { self. other } kw: nil].
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

category: 'Grail-Context Manager'
method: object
__enter__
	"Default: not a context manager.  ``with obj:`` on an object with
	no __enter__ must raise the catchable TypeError (CPython message
	shape), not an uncatchable env-1 MNU -- test_functools hits this
	with a raw generator in a with-statement (a dropped @contextmanager
	class-body decorator)."

	TypeError ___signal___: ('''' @env0:, self @env0:class @env0:name @env0:asString
		@env0:, ''' object does not support the context manager protocol')
%

category: 'Grail-Context Manager'
method: object
__exit__: excType _: excValue _: excTb
	TypeError ___signal___: ('''' @env0:, self @env0:class @env0:name @env0:asString
		@env0:, ''' object does not support the context manager protocol')
%

category: 'Grail-Container'
method: object
__contains__: item
	"Default membership test (``item in self'') for a receiver whose class
	defines no __contains__.  CPython falls back to iterating __iter__ and
	returns true on the first element identical OR equal to ``item''
	(identity-then-equality, a NotImplemented __eq__ result treated as
	unequal).  A receiver with no __iter__ raises the catchable TypeError, and
	any exception raised WHILE iterating propagates -- ``1 in BadIterable()''
	where __iter__ raises ZeroDivisionError must surface it (test_operator's
	test_contains).

	Without this default, ``obj __contains__: item'' on a PythonInstance with
	__iter__ but no __contains__ fell through to the DNU attribute-setter
	misread and silently returned ``item'' instead of iterating.

	NOTE: only the __iter__ protocol is used, NOT CPython's older
	__getitem__(0..n) sequence protocol.  Grail advertises a Grail-specific
	``__getitem__:'' on non-sequence objects (e.g. BoundMethod) that does not
	bound-check, so a __getitem__ index walk here spins forever -- e.g.
	``x in operator.add'' via set.difference (test_set's TestOnlySetsOperator).
	Real sequences that only define __getitem__ are vanishingly rare in the
	suite and CPython raises TypeError for BoundMethod-like objects anyway."

	| cls ni it |
	cls := self @env0:class.
	(cls @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) notNil ifFalse: [
		^ TypeError ___signal___: ('argument of type ''' @env0:,
			cls @env0:name @env0:asString @env0:, ''' is not iterable')].
	ni := Python @env0:at: #NotImplemented otherwise: nil.
	it := self __iter__.
	[true] @env0:whileTrue: [ | elem eq |
		elem := [ it __next__ ] @env0:on: StopIteration do: [:ex | ^ false].
		(item @env0:== elem) ifTrue: [^ true].
		eq := item __eq__: elem.
		(eq @env0:~~ ni and: [eq @env1:___isTruthy___]) ifTrue: [^ true]]
%

category: 'Grail-Augmented Assignment'
method: object
___augmentedOp___: other inplace: iSel binary: bSel
	"CPython augmented-assignment (``a OP= b'') semantics for a simple
	(local Name) target: use the in-place dunder (``__iadd__'' etc.) when
	the receiver's class defines one, honouring a NotImplemented return by
	falling through; otherwise fall back to the binary dunder (``__add__''),
	which itself handles the reflected operation.  ``iSel'' is the fixed
	1-arg in-place selector (``__iadd__:''); its varargs form
	(``___iadd__:kw:'') is probed too.  Emitted by
	AugAssignAst.printSmalltalkOn: -- without this, ``a += b'' compiled to
	``a := a.__add__(b)'' and a class defining only ``__iadd__'' raised a
	spurious ``unsupported operand'' TypeError (test_operator.test_inplace)."

	| cls iVa result niSingleton |
	cls := self @env0:class.
	niSingleton := Python @env0:at: #NotImplemented otherwise: nil.
	(cls @env0:whichClassIncludesSelector: iSel environmentId: 1) notNil
		ifTrue: [
			result := self @env0:perform: iSel env: 1 withArguments: { other }.
			result == niSingleton ifFalse: [^ result]]
		ifFalse: [
			iVa := ('_' @env0:, (iSel @env0:asString @env0:copyFrom: 1
				to: iSel @env0:asString @env0:size @env0:- 1) @env0:, ':kw:') @env0:asSymbol.
			(cls @env0:whichClassIncludesSelector: iVa environmentId: 1) notNil ifTrue: [
				result := self @env0:perform: iVa env: 1 withArguments: { { other }. nil }.
				result == niSingleton ifFalse: [^ result]]].
	^ self @env0:perform: bSel env: 1 withArguments: { other }
%

category: 'Grail-Comparison'
method: object
__ge__: other
	"Return self >= other"

	"Python protocol: no default ordering -- try the reflected
	operation, else raise the catchable TypeError."
	^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'
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

	"Python protocol: no default ordering -- try the reflected
	operation, else raise the catchable TypeError."
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'
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

category: 'Grail-Initialization'
method: object
___init__: positional kw: kwargs
	"Varargs object.__init__(*args, **kwargs) -- a no-op, as in
	CPython when __new__ is overridden.  Without it,
	``F(7,3).__init__(2, 15)`` (test_fractions.testImmutable, where
	Fraction maps to a kernel number) died with an UNCATCHABLE
	MessageNotUnderstood instead of being ignored."

	^ None
%

category: 'Grail-Comparison'
method: object
__le__: other
	"Return self <= other"

	"Python protocol: no default ordering -- try the reflected
	operation, else raise the catchable TypeError."
	^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'
%

! ------------------- Binary-op NotImplemented protocol
! BinOpAst routes the arithmetic operators through these per-op helpers so an
! explicit ``return NotImplemented'' from a forward dunder (vendored Fraction,
! user classes) triggers the reflected op / catchable TypeError instead of
! leaking the NotImplemented singleton.  Each does a DIRECT send (preserving
! Grail's normal dispatch, incl. DNU->varargs routing and built-ins' own
! internal ___binOpFallback___), then checks the result: built-ins never return
! the singleton, so for them the check is a no-op and behavior is unchanged
! (ComparisonProtocolTestCase invariants preserved).

category: 'Grail-Arithmetic'
method: object
___binOpAdd___: other
	| r |
	r := self __add__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpSub___: other
	| r |
	r := self __sub__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpMul___: other
	| r |
	r := self __mul__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpTrueDiv___: other
	| r |
	r := self __truediv__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpFloorDiv___: other
	| r |
	r := self __floordiv__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpMod___: other
	| r |
	r := self __mod__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpPow___: other
	| r |
	r := self __pow__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpLShift___: other
	| r |
	r := self __lshift__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '<<' reflected: #'__rlshift__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpRShift___: other
	| r |
	r := self __rshift__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '>>' reflected: #'__rrshift__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpAnd___: other
	| r |
	r := self __and__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '&' reflected: #'__rand__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpOr___: other
	| r |
	r := self __or__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '|' reflected: #'__ror__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpXor___: other
	| r |
	r := self __xor__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '^' reflected: #'__rxor__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpMatMul___: other
	| r |
	r := self __matmul__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___binOpFallback___: other op: '@' reflected: #'__rmatmul__:'].
	^ r
%

category: 'Grail-Arithmetic'
method: object
___binOpFallback___: other op: opString reflected: refSelector
	"Python binary-operator fallback for an unsupported operand pair --
	the arithmetic sibling of ___cmpFallback___:op:reflected:.  Try the
	REFLECTED dunder (__radd__ & co.) on ``other'' when a user class
	defines it, else raise the catchable Python TypeError.  (Previously
	``None + 1'' was an env-1 DNU and ``1 + None'' escaped as a
	Smalltalk _generality error -- the STERROR class that blocked
	CPython's test_operator.)"

	| refOwner fwdBase refBase fn result refVa |
	"Class-ATTRIBUTE dunders first: a callable stored as a class attr
	(fractions' ``__add__, __radd__ = _operator_fallbacks(...)``) is a
	method in Python but is invisible to the compiled-selector probes
	that got us here.  Forward on self, then reflected on other; a
	NotImplemented return falls through, matching CPython."
	refBase := (refSelector @env0:asString @env0:copyFrom: 1
		to: refSelector @env0:asString @env0:size - 1) @env0:asSymbol.
	fwdBase := ('__' @env0:, (refBase @env0:asString @env0:copyFrom: 4
		to: refBase @env0:asString @env0:size)) @env0:asSymbol.
	fn := self ___classAttrDunder___: fwdBase.
	fn == nil ifFalse: [
		result := fn ___pyCallValue___: { self. other } kw: nil.
		result == (Python @env0:at: #NotImplemented otherwise: nil)
			ifFalse: [^ result]].
	fn := other ___classAttrDunder___: refBase.
	fn == nil ifFalse: [
		result := fn ___pyCallValue___: { other. self } kw: nil.
		result == (Python @env0:at: #NotImplemented otherwise: nil)
			ifFalse: [^ result]].
	"Unlike ___cmpFallback___ (whose lt<->gt selector symmetry could
	recurse between two built-ins), the __r*__ family is distinct and
	every guarded reverse op terminates in a direct TypeError -- so the
	reflected try is safe for ANY class that defines it (complex, an
	object subclass outside Number, relies on this for int + complex)."
	"CPython skips the reflected slot when the operands share a type --
	and our approximation must skip it for same-FAMILY operands, or two
	strings' delegating __rmul__/__mul__ pair would ping-pong forever
	(``'a' * 'b''' recursed to stack exhaustion)."
	((other isKindOf: self @env0:class)
		or: [self isKindOf: other @env0:class]) ifFalse: [
		refOwner := other @env0:class
			@env0:whichClassIncludesSelector: refSelector environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			^ other @env0:perform: refSelector env: 1 withArguments: { self }].
		"Reflected dunder compiled VARARGS-ONLY (``def __rpow__(b, a,
		modulo=None)`` in vendored fractions.py) -- probe the
		``_<name>:kw:`` form too."
		refVa := ('_' @env0:, (refSelector @env0:asString @env0:copyFrom: 1
			to: refSelector @env0:asString @env0:size - 1) @env0:, ':kw:') @env0:asSymbol.
		refOwner := other @env0:class
			@env0:whichClassIncludesSelector: refVa environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			^ other @env0:perform: refVa env: 1 withArguments: { { self }. nil }]].
	TypeError ___signal___: ('unsupported operand type(s) for ' @env0:, opString
		@env0:, ': ''' @env0:, self @env0:class @env0:name @env0:asString
		@env0:, ''' and ''' @env0:, other @env0:class @env0:name @env0:asString @env0:, '''')
%

category: 'Grail-Arithmetic'
method: object
___rbinOpFallback___: other op: opString
	"TypeError for a failed REVERSE binary op (__radd__ & co.): the
	forward direction already had its chance, so no further reflection
	-- and the message names the operands in evaluation order
	(other OP self)."

	TypeError ___signal___: ('unsupported operand type(s) for ' @env0:, opString
		@env0:, ': ''' @env0:, other @env0:class @env0:name @env0:asString
		@env0:, ''' and ''' @env0:, self @env0:class @env0:name @env0:asString @env0:, '''')
%

! ------------------- Comparison NotImplemented protocol
! CmpOpAst routes the rich comparison operators through these per-op helpers so
! an explicit ``return NotImplemented'' from a forward comparison dunder
! (Fraction vs a Dummy/complex operand) triggers the reflected op instead of
! leaking the NotImplemented singleton into a boolean context (``Symbol does not
! understand not'').  Ordering falls back via ___cmpFallback___ (reflected dunder
! else catchable TypeError); ==/!= fall back to the reflected __eq__ then
! identity (== never raises).  DIRECT sends preserve built-in behavior (they
! never return the singleton), so ComparisonProtocolTestCase stays green.

category: 'Grail-Comparison'
method: object
___cmpLt___: other
	| r |
	r := self __lt__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpLe___: other
	| r |
	r := self __le__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpGt___: other
	| r |
	r := self __gt__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpGe___: other
	| r |
	r := self __ge__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpEq___: other
	| r |
	r := self __eq__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [^ self ___eqValue___: other].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpNe___: other
	| r |
	r := self __ne__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [^ (self ___eqValue___: other) @env0:not].
	^ r
%

category: 'Grail-Comparison'
method: object
___eqValue___: other
	"The == result when the forward __eq__ returned NotImplemented: try the
	reflected __eq__ on a user-defined ``other'', else fall back to identity
	(== never raises).  Shared by ___cmpEq___/___cmpNe___."

	| refOwner rr |
	(other @env0:isKindOf: PythonInstance) ifTrue: [
		refOwner := other @env0:class
			@env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
		(refOwner @env0:~~ nil and: [refOwner @env0:~~ object]) ifTrue: [
			rr := other @env0:perform: #'__eq__:' env: 1 withArguments: { self }.
			(rr @env0:== #'___NotImplemented___') ifFalse: [^ rr]]].
	^ self @env0:== other
%

category: 'Grail-Comparison'
method: object
___cmpFallback___: other op: opString reflected: refSelector
	"Python rich-comparison fallback for an unsupported operand pair.
	First try the REFLECTED dunder on ``other'' when a user class
	defines it (``1 < Meters(2)'' runs Meters.__gt__) -- restricted to
	PythonInstance descendants because a built-in's reflected
	implementation would just re-guard and recurse.  Otherwise raise
	the catchable Python TypeError CPython raises for unorderable
	types.  (Previously these paths fell through to env-0 comparison
	primitives, whose ArgumentTypeError / 'Expected a Number' /
	_generality errors escape Python try/except entirely -- the STERROR
	class that blocked CPython's test_bisect / test_operator /
	test_heapq / test_re.)"

	| refOwner rr |
	(other isKindOf: PythonInstance) ifTrue: [
		refOwner := other @env0:class
			@env0:whichClassIncludesSelector: refSelector environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			rr := other @env0:perform: refSelector env: 1 withArguments: { self }.
			"A NotImplemented reflected result means neither side can order the
			pair -- fall through to the TypeError, don't leak the singleton."
			(rr @env0:== #'___NotImplemented___') ifFalse: [^ rr]]].
	TypeError ___signal___: ('''' @env0:, opString @env0:, ''' not supported between instances of '''
		@env0:, self @env0:class @env0:name @env0:asString
		@env0:, ''' and ''' @env0:, other @env0:class @env0:name @env0:asString @env0:, '''')
%

category: 'Grail-Comparison'
method: object
__lt__: other
	"Return self < other"

	"Python protocol: no default ordering -- try the reflected
	operation, else raise the catchable TypeError."
	^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'
%

category: 'Grail-Comparison'
method: object
__ne__: other
	"Return self != other.

	Honor a setattr-installed ``__ne__'' if present; otherwise derive
	from __eq__ and negate (CPython's default __ne__ delegates to __eq__).
	__eq__ may be setattr-installed (dataclasses synthesize only __eq__) OR a
	class-body/compiled def -- the vendored fractions.Fraction defines
	``def __eq__'' as a Smalltalk method, so a check limited to dynamic
	attributes fell through to IDENTITY and made Fraction != Fraction (and
	Fraction != int) wrongly True.  Fall through to identity only when no
	class beyond object defines __eq__ at all."

	| fn eqOwner eqr |
	fn := self ___dynamicClassAttr___: #'__ne__'.
	fn == nil ifFalse: [^ fn ___pyCallValue___: { self. other } kw: nil].
	fn := self ___dynamicClassAttr___: #'__eq__'.
	fn == nil ifFalse: [
		eqr := fn ___pyCallValue___: { self. other } kw: nil.
		"A NotImplemented __eq__ must NOT be negated (``NI not'' is an
		uncatchable Symbol DNU); return it so ___cmpNe___ / the caller runs
		the reflected-op / identity fallback."
		(eqr @env0:== #'___NotImplemented___') ifTrue: [^ eqr].
		^ eqr @env0:not].
	eqOwner := self @env0:class @env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
	eqOwner @env0:isNil ifTrue: [
		eqOwner := self @env0:class @env0:whichClassIncludesSelector: #'___eq__:kw:' environmentId: 1].
	(eqOwner @env0:notNil and: [eqOwner ~~ object]) ifTrue: [
		eqr := self __eq__: other.
		(eqr @env0:== #'___NotImplemented___') ifTrue: [^ eqr].
		^ eqr @env0:not].
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
	fn := self ___dynamicClassAttr___: #'__repr__'.
	fn == nil ifFalse: [^ fn ___pyCallValue___: { self } kw: nil].
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

	| sym setterSym cls enumCls rec |
	sym := name @env0:asSymbol.
	"Enum members are read-only: ``Color.RED = x'' raises AttributeError
	(CPython EnumType.__setattr__).  Guard for a class receiver whose enum
	registry (byName) records `name` as a member -- BEFORE the accessor-
	setter dispatch below, because members are stored as metaclass
	accessor pairs and that path would otherwise bypass the guard.  The
	registry is populated only AFTER the member build (which stores via the
	accessor / dynInstVar directly, not this method), so definitional
	writes are unaffected."
	(self isKindOf: Behavior) ifTrue: [
		enumCls := Python @env0:at: #'Enum' otherwise: nil.
		(enumCls ~~ nil
			and: [(rec := enumCls ___grailRecordFor: self) ~~ nil
			and: [(rec @env0:at: 2) @env0:includesKey: name @env0:asString]])
			ifTrue: [
				^ AttributeError ___signal___:
					'cannot reassign member ''' @env0:, name @env0:asString @env0:, '''']].
	setterSym := (name @env0:asString @env0:, ':') @env0:asSymbol.
	cls := self @env0:class.
	((cls @env0:whichClassIncludesSelector: sym environmentId: 1) notNil
		and: [(cls @env0:whichClassIncludesSelector: setterSym environmentId: 1) notNil])
		ifTrue: [^ self @env0:perform: setterSym env: 1 withArguments: { value }].
	^ self ___pyAttrStore___: name put: value
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

	TypeError ___signal___:
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

	| sym owned |
	sym := aName @env0:asSymbol.
	(self isKindOf: Behavior) ifTrue: [
		"Canonical-class overlay: ``del Cls.x'' removes the class's OWN
		session-local overlay entry when one exists (a runtime setattr
		being undone) before consulting the committed store."
		(self ___classAttrOverlayRemove___: self name: sym)
			ifTrue: [^ self].
		"Class receiver — remove from dynInstVars dict (Python user
		class).  Built-in / non-Python classes have no dynInstVars
		slot and immediately AttributeError."
		((self @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
			ifTrue: [
				| holder |
				holder := self @env0:perform: #dynInstVars env: 1.
				(holder == nil) ifFalse: [
					(holder @env0:dynamicInstVarAt: sym) == nil ifFalse: [
						^ holder @env0:removeDynamicInstVar: sym
					]
				]
			].
		"Class-body method (``def spam(cls): ...''): CPython ``del Cls.spam''
		removes it from the class dict.  Remove the class's OWN env-1
		method(s) whose Python base name matches.  Scoped to category
		'Grail-Class Methods' (user def bodies) so MEMBER accessors
		('Grail-Class Attrs') and enum members (dynamic-store entries, not
		selectors at all) are untouched -- ``del Season.SPRING'' still
		AttributeErrors, matching CPython.  whichClassIncludesSelector:
		== self keeps it OWN-only: deleting an inherited method raises."
		owned := (self @env0:selectorsForEnvironment: 1) @env0:select: [:sel |
			| s idx base |
			s := sel @env0:asString.
			idx := s @env0:indexOf: $:.
			base := (idx @env0:= 0) ifTrue: [s] ifFalse: [s @env0:copyFrom: 1 to: idx @env0:- 1].
			"A Python def compiles to BOTH a fixed-arity selector (``spam'',
			``spam:'', ...) whose base is the name, AND a varargs selector
			``_spam:kw:'' whose base reads as ``_spam'' -- match both so the
			method is fully removed (a surviving ``_name:kw:'' still answers
			getattr via the symVA probe)."
			((base @env0:= aName @env0:asString)
				or: [s @env0:= ('_' @env0:, aName @env0:asString @env0:, ':kw:')])
				and: [((self @env0:categoryOfSelector: sel environmentId: 1) @env0:= #'Grail-Class Methods')
				and: [(self @env0:whichClassIncludesSelector: sel environmentId: 1) == self]]].
		owned @env0:isEmpty ifFalse: [
			owned @env0:do: [:sel | self @env0:removeSelector: sel environmentId: 1].
			^ self].
		^ AttributeError ___signal___:
			'type object ''' @env0:, self @env0:name @env0:asString @env0:,
				''' has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
	].
	"Enum MEMBERS are immutable: ``del member.name`` / ``del member.value``
	raises AttributeError (CPython -- members are read-only).  A member is
	an INSTANCE of an enum class (one carrying a registry record); deletion
	never happens during construction, so guarding here is safe."
	[ | enumCls |
	enumCls := Python @env0:at: #'Enum' otherwise: nil.
	(enumCls ~~ nil
		and: [(enumCls ___grailRecordFor: self @env0:class) ~~ nil])
		ifTrue: [
			^ AttributeError ___signal___:
				'''' @env0:, self @env0:class @env0:name @env0:asString @env0:,
					''' object attribute ''' @env0:, aName @env0:asString
					@env0:, ''' is read-only'] ] @env0:value.
	"del obj.<slot> — a __slots__ instVar resets to unset (nil); raise if
	already unset, matching ``del'' of an unbound slot.  (instVars can't
	be removed, only nilled — the nil-as-absent convention makes a nilled
	slot indistinguishable from never-set, which is the desired result.)"
	((self @env0:class @env0:whichClassIncludesSelector: #'___pyHasSlots___' environmentId: 1) notNil) ifTrue: [
		| slotIdx |
		slotIdx := self @env0:class @env0:allInstVarNames
			@env0:indexOf: (('___slot_' @env0:, sym @env0:asString @env0:, '___') @env0:asSymbol).
		slotIdx @env0:~= 0 ifTrue: [
			(self @env0:instVarAt: slotIdx) == nil ifTrue: [
				^ AttributeError ___signal___:
					'''' @env0:, aName @env0:asString @env0:, ''''
			].
			^ self @env0:instVarAt: slotIdx put: nil
		]
	].
	(self @env0:dynamicInstVarAt: sym) == nil ifTrue: [
		AttributeError ___signal___:
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

	(self isKindOf: Behavior) ifTrue: [
		| setterSym getterSym metaclass |
		"(Enum member-reassignment is guarded in __setattr__:_:, the single
		store entry point, BEFORE the accessor-setter dispatch.)"
		"Canonical-class overlay: runtime stores on a shared canonical
		class stay session-local (docs/Persistent_Modules_and_Classes.md
		par.7).  False (the default -- flag off or not canonical) falls
		through to the committed paths below."
		(self ___classAttrOverlayStore___: self
				name: aName @env0:asString @env0:asSymbol value: aValue)
			ifTrue: [^ aValue].
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
		^ AttributeError ___signal___:
			'''' @env0:, self @env0:name @env0:asString @env0:,
				''' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
	].
	"Python __slots__ → GemStone named instance variables.  For a
	PythonInstance receiver: a name declared in __slots__ (i.e. a named
	instVar) is written directly; otherwise, a strict slotted class
	(declares __slots__ without a __dict__) rejects the name with
	AttributeError (CPython semantics).  Any other instance — including a
	non-strict slotted class (it has a __dict__) — falls back to
	dynamic-instVar storage."
	((self @env0:class @env0:whichClassIncludesSelector: #'___pyHasSlots___' environmentId: 1) notNil) ifTrue: [
		| slotIdx |
		slotIdx := self @env0:class @env0:allInstVarNames
			@env0:indexOf: (('___slot_' @env0:, aName @env0:asString @env0:, '___') @env0:asSymbol).
		slotIdx @env0:~= 0 ifTrue: [
			self @env0:instVarAt: slotIdx put: aValue.
			^ aValue
		].
		(self @env0:class @env0:whichClassIncludesSelector: #'___pySlotsStrict___' environmentId: 1) notNil ifTrue: [
			^ AttributeError ___signal___:
				'''' @env0:, self @env0:class @env0:name @env0:asString @env0:,
					''' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
		].
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

	(self isKindOf: SequenceableCollection) ifTrue: [^ self asArray].
	^ (list @env1:__new__: self) asArray
%

category: 'Grail-Attribute Access'
method: object
___tryBinaryDunderDNU___: aSelector args: anArray
	"When aSelector is a missing BINARY-OPERATOR dunder, run the Python
	protocol tail (reflected dunder on the operand, else catchable
	TypeError) and return its result; otherwise return the
	#___noBinOp___ sentinel.  Called from BOTH doesNotUnderstand:
	overrides -- Object's (env-1 miss on any receiver) and
	PythonInstance's (which would otherwise misread ``__sub__: other''
	as an attribute-setter and silently store the operand).  Handled at
	dispatch-failure time rather than as object-level default methods,
	which would shadow DNU-based magic like IntEnum member arithmetic."

	| binOp vaSel |
	binOp := nil.
	aSelector == #'__add__:' ifTrue: [binOp := { '+'. #'__radd__:' }].
	aSelector == #'__sub__:' ifTrue: [binOp := { '-'. #'__rsub__:' }].
	aSelector == #'__mul__:' ifTrue: [binOp := { '*'. #'__rmul__:' }].
	aSelector == #'__truediv__:' ifTrue: [binOp := { '/'. #'__rtruediv__:' }].
	aSelector == #'__floordiv__:' ifTrue: [binOp := { '//'. #'__rfloordiv__:' }].
	aSelector == #'__mod__:' ifTrue: [binOp := { '%'. #'__rmod__:' }].
	aSelector == #'__pow__:' ifTrue: [binOp := { '**'. #'__rpow__:' }].
	aSelector == #'__lshift__:' ifTrue: [binOp := { '<<'. #'__rlshift__:' }].
	aSelector == #'__rshift__:' ifTrue: [binOp := { '>>'. #'__rrshift__:' }].
	aSelector == #'__and__:' ifTrue: [binOp := { '&'. #'__rand__:' }].
	aSelector == #'__or__:' ifTrue: [binOp := { '|'. #'__ror__:' }].
	aSelector == #'__xor__:' ifTrue: [binOp := { '^'. #'__rxor__:' }].
	aSelector == #'__matmul__:' ifTrue: [binOp := { '@'. #'__rmatmul__:' }].
	binOp == nil ifTrue: [^ #'___noBinOp___'].
	"A dunder compiled VARARGS-ONLY (``def __pow__(a, b, modulo=None)``
	in vendored fractions.py) has no fixed ``__pow__:`` selector, so the
	send landed here -- dispatch the ``___pow__:kw:`` form before
	running the fallback protocol."
	vaSel := ('_' , (aSelector asString copyFrom: 1
		to: aSelector asString size - 1) , ':kw:') asSymbol.
	((self class whichClassIncludesSelector: vaSel environmentId: 1) ~~ nil)
		ifTrue: [^ self perform: vaSel env: 1
			withArguments: { anArray. nil }].
	^ self @env1:___binOpFallback___: (anArray at: 1)
		op: (binOp at: 1) reflected: (binOp at: 2)
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

	| s md cls binOp |
	envId = 1 ifFalse: [^ MessageNotUnderstood signal:
	'env-1 ', aSelector printString, ' not understood by ', self class name asString].
	s := aSelector asString.
	cls := self class.
	md := cls methodDictForEnv: 1.
	"A missing BINARY-OPERATOR dunder takes the Python protocol tail:
	reflected dunder on the operand, else catchable TypeError.  Handled
	HERE at dispatch-failure time (not as object-level default methods,
	which would shadow DNU-based magic like IntEnum member arithmetic --
	``Color.RED + 1'' resolves through this very handler's
	BoundMethod/varargs machinery)."
	binOp := self ___tryBinaryDunderDNU___: aSelector args: anArray.
	binOp == #'___noBinOp___' ifFalse: [^ binOp].
	"A missing ``__contains__:'' (``x in None'') raises CPython's
	catchable TypeError.  Only this ONE container dunder is intercepted:
	__len__ / __iter__ / __getitem__ double as soft-miss PROBES all over
	Grail's own machinery (truthiness checks on user instances,
	PyDateTime formatting, ...) and intercepting them broke Twilio --
	len(None)-style calls remain a documented residual."
	((self isKindOf: PythonInstance) not
		and: [aSelector == #'__contains__:']) ifTrue: [
		TypeError @env1:___signal___: ('argument of type ''',
			self class name asString,
			''' is not iterable')].
	((self isKindOf: PythonInstance) not
		and: [aSelector == #'__setitem__:_:']) ifTrue: [
		TypeError @env1:___signal___: ('''',
			self class name asString,
			''' object does not support item assignment')].
	((self isKindOf: PythonInstance) not
		and: [aSelector == #'__delitem__:']) ifTrue: [
		TypeError @env1:___signal___: ('''',
			self class name asString,
			''' object does not support item deletion')].
	"Missing UNARY operator dunders (``~None'', ``-None'', ``+None'')
	raise CPython's catchable TypeError.  Same non-PythonInstance
	restriction as __contains__ -- user-instance unary sends stay on the
	attribute-semantics path."
	(self isKindOf: PythonInstance) ifFalse: [ | unaryOp |
		unaryOp := nil.
		aSelector == #'__invert__' ifTrue: [unaryOp := '~'].
		aSelector == #'__neg__' ifTrue: [unaryOp := '-'].
		aSelector == #'__pos__' ifTrue: [unaryOp := '+'].
		unaryOp == nil ifFalse: [
			TypeError @env1:___signal___: ('bad operand type for unary ',
				unaryOp, ': ''', self class name asString, '''')]].
	(s size > 0 and: [s last = $:]) ifTrue: [
		"Keyword selector like `name:_:_:` — the corresponding Python
		function may have been compiled as varargs (`_name:kw:`) because
		it has *args/**kwargs or defaults.  Extract the base name from
		the selector (everything up to the first colon), look for the
		varargs form on this class, and dispatch with positional={anArray}
		and kwargs=nil."
		| colonIdx baseName varargsSel |
		colonIdx := s indexOf: $:.
		baseName := s copyFrom: 1 to: colonIdx - 1.
		varargsSel := ('_' , baseName , ':kw:') asSymbol.
		(md includesKey: varargsSel) ifTrue: [
			| wrapped |
			wrapped := Array new: 2.
			wrapped at: 1 put: anArray.
			wrapped at: 2 put: nil.
			^ self perform: varargsSel env: 1 withArguments: wrapped
		].
		^ MessageNotUnderstood signal:
			'env-1 ', aSelector printString, ' not understood by ', cls name asString
	].
	"Unary selector with 0 args — return BoundMethod if class has any
	same-named callable form (for `f = obj.method` patterns)."
	anArray size = 0 ifFalse: [^ MessageNotUnderstood signal:
		'env-1 ', aSelector printString, ' not understood by ', cls name asString].
	((md includesKey: (s , ':') asSymbol)
		or: [(md includesKey: (s , ':_:') asSymbol)
			or: [(md includesKey: (s , ':_:_:') asSymbol)
				or: [md includesKey: ('_' , s , ':kw:') asSymbol]]])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSelector].
	^ MessageNotUnderstood signal:
		'env-1 ', aSelector printString, ' not understood by ', cls name asString
%

set compile_env: 0
