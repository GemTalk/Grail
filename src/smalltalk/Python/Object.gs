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
set compile_env: 0

! ------------------- Remove existing Python methods from object
expectvalue /Metaclass3
doit
object removeAllMethods: 1.
object class removeAllMethods: 1.
%


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

! Grail's env-0 methods on Object that must be filed as SystemUser live in
! Object_perform.gs:
!  - the ___new___: / ___new___:_: / ___new___:_:_: env-0 bridge allocators
!    (moved here because ___new___:_: and ___new___:_:_: also exist in env 1 on
!    Object class; the simplified 3.7.5 session-method store keys by selector
!    only, so env-1 would overwrite env-0 -- MR #6 on 4.0 fixes this properly
!    with per-environment storage); and
!  - the with:...performMethod: variants (which carry <primitive: 2027>).
! An ordinary install user can neither write Object persistently nor compile primitives, so
! these are compiled by SystemUser (persistent, shared).

set compile_env: 1

category: 'Grail-Slots'
classmethod: object
___pyStrictSlotsAllowed___
	"Whether THIS class may enforce strict __slots__ -- i.e. deny any
	attribute it did not declare, and have no per-instance __dict__.

	CPython drops the __dict__ only when EVERY class in the MRO except
	object declares __slots__.  A class whose base is a plain, non-slotted
	class therefore still HAS a __dict__ no matter how its own __slots__ is
	written, and an attribute the base's __init__ assigns keeps working:

	    class Base:                     # no __slots__
	        def __init__(self): self.b = 2
	    class Sub(Base):
	        __slots__ = ('a',)
	    Sub().b                         # 2 in CPython

	Grail marked Sub strict purely from its OWN declaration, so that
	assignment raised AttributeError and Sub could not even be constructed
	-- which is what took out datetimetester's
	PicklableFixedOffsetWithSlots, whose __slots__ deliberately omits the
	base's third private attribute.

	Reaching PythonInstance means nothing above this class declared slots
	of its own, which is CPython's `object' case and IS allowed to be
	strict.  A non-PythonInstance base that is not itself strict -- a
	builtin like dict or Exception -- answers false, which is the LENIENT
	direction and matches the documented fallback for a __slots__ value
	Grail cannot read at compile time."

	| sup |
	sup := self @env0:superclass.
	[sup @env0:notNil] @env0:whileTrue: [
		"Only PYTHON-DEFINED ancestors matter.  One that declares no
		__slots__ of its own gives instances a __dict__, so nothing below it
		can be strict.  A Grail BUILTIN base (property, a numbers ABC, ...)
		is skipped: its instances carry no Python __dict__, and CPython
		spells those types with __slots__ = () anyway -- treating them as
		blockers made Fraction and a property subclass wrongly non-strict."
		((sup @env0:whichClassIncludesSelector: #'___pyDefinedClass___' environmentId: 1)
			@env0:== sup) ifTrue: [
			((sup @env0:whichClassIncludesSelector: #'___pyHasSlots___' environmentId: 1)
				@env0:== sup) ifFalse: [^ false]].
		sup := sup @env0:superclass].
	^ true
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___

	^ self @env0:new
%

category: 'Grail-Introspection'
method: object
___respondsTo___: aSymbol
	"True if the receiver understands aSymbol in environment 1 (Python).

	A fast, cached replacement for the idiom
	``(self @env0:class @env0:whichClassIncludesSelector: aSymbol
	environmentId: 1) notNil''.  The ``_respondsTo:flags:'' primitive walks
	the receiver's class hierarchy once and caches the hit in the sending
	method's code, whereas ``whichClassIncludesSelector:environmentId:''
	re-walks the hierarchy in Smalltalk on every send (and additionally
	allocates the answering class it then discards).  The two agree exactly:
	``x ___respondsTo___: s'' == ``(x @env0:class
	@env0:whichClassIncludesSelector: s environmentId: 1) notNil'' for every
	receiver x and selector s (both consult the same env-1 method dictionaries
	up the class chain).

	flags 16r10001 = environmentId 1 (low byte 16rFF) + 16r10000 (cache
	successes in the caller's code_gen).  Sent via ``@env0:'' so the kernel
	primitive is reached directly rather than any env-1 override, and so a
	receiver that is itself a class resolves the primitive on its metaclass
	chain (class-side responds-to) exactly as the whichClassIncludesSelector:
	idiom did."

	^ self @env0:_respondsTo: aSymbol flags: 16r10001
%

category: 'Grail-Hashability'
method: object
___requireHashableAsSetElement___
	"Raise CPython's context-specific TypeError if the receiver is unhashable.
	Detected by actually invoking __hash__ (its being None/raising is the ONE
	true signal), so frozenset, tuples and custom-__hash__ set subclasses pass
	while set/list/dict/bytearray raise -- matching how CPython hashes each
	element on insert.  Grail sets/dicts otherwise key on Smalltalk hashing,
	which accepts anything."

	[self __hash__] @env0:on: TypeError do: [:ex |
		self ___raiseUnhashableUse___: ex context: 'a set element']
%

category: 'Grail-Hashability'
method: object
___requireHashableAsDictKey___
	"As ___requireHashableAsSetElement___, for dict keys."

	[self __hash__] @env0:on: TypeError do: [:ex |
		self ___raiseUnhashableUse___: ex context: 'a dict key']
%

category: 'Grail-Hashability'
method: object
___pyHashCheck___
	"Raise the TypeError CPython raises for an unhashable value; answer the
	receiver otherwise.

	For a place that is about to use a Python value as a key in a SMALLTALK
	collection.  Smalltalk hashes a list or a dict perfectly well, so such a
	key is accepted and stored where Python says it cannot exist -- the
	collection is fine, the semantics are not.  Sending ``__hash__'' is the
	whole check: every unhashable built-in raises from there, and so does a
	class made unhashable at creation time (see ___raiseUnhashableType___)."

	self __hash__.
	^ self
%

category: 'Grail-Hashability'
method: object
___raiseUnhashableType___
	"Raise CPython's ``TypeError: unhashable type: 'X''' for the RECEIVER's own
	class.  The body a class-creation-time unhashable class gets for __hash__
	(ClassDefAst >> ___unhashableByClassBody___).

	A method rather than generated source for two reasons.  It keeps nested
	quote-escaping out of the codegen -- the emitted body is just ``^ self
	___raiseUnhashableType___'' -- and it reads the class at RUNTIME, so a
	SUBCLASS that does not define its own __hash__ inherits this and reports
	ITSELF, which is what CPython does."

	^ TypeError ___signal___: 'unhashable type: ''' @env0:,
		(self @env0:class @env0:name @env0:asString) @env0:, ''''
%

category: 'Grail-Hashability'
method: object
___raiseUnhashableUse___: ex context: ctx
	"Re-raise an ``unhashable type: 'X''' TypeError from __hash__ as CPython's
	richer ``cannot use 'X' as <ctx> (unhashable type: 'X')''.  A __hash__ that
	failed for any OTHER reason propagates unchanged."

	| m idx tn |
	m := ex @env0:messageText.
	m == nil ifTrue: [m := ''].
	idx := m @env0:indexOfSubCollection: 'unhashable type: '.
	idx == 0 ifTrue: [^ ex @env0:pass].
	tn := m @env0:copyFrom: (idx @env0:+ 17) to: (m @env0:size).
	TypeError ___signal___: ('cannot use ' @env0:, tn @env0:, ' as ' @env0:, ctx
		@env0:, ' (unhashable type: ' @env0:, tn @env0:, ')')
%

category: 'Grail-Convenience Methods'
method: object
___unpackSequence___
	"Tuple-unpack coercion (``a, b, c = expr'').  AssignAst's unpack
	codegen indexes the RHS with __getitem__: -- correct for sequences,
	wrong for iterables WITHOUT positional indexing.  CPython unpacks any
	iterable via __iter__.  A REAL indexable receiver (list/tuple/str/range/...:
	genuine __getitem__ OWNERSHIP, not the PythonInstance fallback) answers
	itself so the fast index path runs unchanged; anything else is materialized
	into a list in iteration order so the index-based unpack works
	(``lhs, rhs = map(str.strip, line.split('->'))'' in test_fractions
	test_float_format_testfile; ``a, b, c = IteratingSequenceClass(3)'' in
	test_iter test_unpack_iter, which has __iter__ but no __getitem__).  Enum
	classes keep their own override.  A NON-iterable materializes via __iter__
	here, which raises the catchable TypeError (``a, b = len''), matching
	CPython -- rather than the old ``^ self'' that let a later __getitem__:
	misbehave.  ``___respondsTo___'' saw the PythonInstance fallback __getitem__:
	on EVERY instance and wrongly fast-pathed a non-indexable class into a
	``not subscriptable'' error; ``___hasProtocol___'' probes real ownership.
	A BoundMethod carries a PEP-585 generic-alias __getitem__ (``list[int]'',
	``Callable[..., T]'') that is NOT the sequence protocol, so it is excluded
	from the fast path -- ``a, b = len'' then materializes via __iter__ and
	raises TypeError (not iterable), like CPython's iter(len).

	A MAPPING is excluded for the same reason, and it is not a corner case:
	``a, b = {1: 'x', 2: 'y'}'' raised ``KeyError: 0''.  A dict owns a REAL
	__getitem__, so it took the fast path, but that __getitem__ is keyed, not
	positional -- the unpack then asked for key 0.  CPython unpacks a mapping
	through __iter__ like everything else, yielding its KEYS.  ``keys'' is the
	discriminator because it is the same duck-type marker Python itself uses
	for mapping-ness (``dict(obj)'', ``**obj''), so UserDict and any custom
	Mapping are covered, while no sequence owns it."

	((self ___hasProtocol___: '__getitem__')
		@env0:and: [((self @env0:isKindOf: BoundMethod) @env0:not)
			@env0:and: [(self ___hasProtocol___: 'keys') @env0:not]])
		ifTrue: [^ self].
	^ list @env1:__new__: self
%

category: 'Grail-Convenience Methods'
method: object
___unpackCheck___: nBefore star: hasStar after: nAfter
	"CPython requires a tuple-unpacking assignment to receive the right number
	of values -- exactly nBefore for ``a, ..., z = expr'', or at least
	nBefore + nAfter around a star target -- raising ValueError otherwise
	(test_iter test_unpack_iter).  Only a receiver with a dependable length (the
	materialized iterator list, or a kernel sequence -- both SequenceableCollection)
	is checked; a bare custom-__getitem__ receiver has no reliable size and keeps
	the lenient index path.  Answers self so it chains after ___unpackSequence___."

	| sz needed |
	(self @env0:isKindOf: SequenceableCollection) @env0:ifFalse: [^ self].
	sz := self @env0:size.
	hasStar @env0:ifTrue: [
		needed := nBefore @env0:+ nAfter.
		(sz @env0:< needed) @env0:ifTrue: [
			ValueError ___signal___: ('not enough values to unpack (expected at least '
				@env0:, needed @env0:printString @env0:, ', got '
				@env0:, sz @env0:printString @env0:, ')')].
		^ self].
	(sz @env0:< nBefore) @env0:ifTrue: [
		ValueError ___signal___: ('not enough values to unpack (expected '
			@env0:, nBefore @env0:printString @env0:, ', got '
			@env0:, sz @env0:printString @env0:, ')')].
	(sz @env0:> nBefore) @env0:ifTrue: [
		ValueError ___signal___: ('too many values to unpack (expected '
			@env0:, nBefore @env0:printString @env0:, ')')].
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

	"...EXCEPT when the class is a built-in whose own class-side __new__
	CONSTRUCTS from those arguments (str, bytes, bytearray, tuple, ...).
	``T.__new__(cls, value)'' is how a hand-written subclass __new__ forwards
	to its base, and every such call landed here -- ``cls new'' then produced
	an EMPTY instance and silently dropped the content (markupsafe.Markup's
	``super().__new__(cls, object)'', test_bytes' StrWithBytes).  Route to the
	class's real allocator when it publishes one for this arity; the owner
	check excludes object's own generic ``__new__: cls'', which takes the
	CLASS as its argument and would mis-bind."
	(positional @env0:size @env0:> 1) ifTrue: [
		| cls rest sel owner |
		cls := positional @env0:at: 1.
		rest := positional @env0:copyFrom: 2 to: positional @env0:size.
		sel := AppendStream @env0:on: String @env0:new.
		sel @env0:nextPutAll: '__new__:'.
		2 @env0:to: rest @env0:size do: [:i | sel @env0:nextPutAll: '_:'].
		sel := sel @env0:contents @env0:asSymbol.
		owner := (cls @env0:isKindOf: Behavior)
			ifTrue: [cls @env0:class @env0:whichClassIncludesSelector: sel environmentId: 1]
			ifFalse: [nil].
		(owner @env0:notNil and: [owner ~~ (Object @env0:class)]) ifTrue: [
			^ cls @env0:perform: sel env: 1 withArguments: rest]].

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
	env-1 MNU was uncatchable and killed the module run.

	A METACLASS base is the exception, and gets exactly the degradation
	BoundMethod >> ___subclass___: already gives the canonical ``type'':
	build the class as a plain subclass of object.  Grail does not model
	metaclasses -- it RECORDS one -- but the class statement must SUCCEED,
	because subclassing a metaclass is how a Python program writes one:

	    class auto_enum(type(Enum)):
	        def __new__(metacls, cls, bases, classdict): ...

	That is test_enum's test_multiple_mixin_mro, and it used to reach here as
	the canonical ``type'' -- a BoundMethod, which took that path -- only
	because type(Enum) answered ``type'' rather than EnumType.  Once type()
	told the truth about an enum's metaclass, the same line arrived as a
	Metaclass3 and the graceful path no longer applied.  Keeping the two in
	step is what this branch is for; it does not make the metaclass work, and
	__new__ above is still never called."

	self ___isMetaclassBase___ ifTrue: [
		^ object @env1:___subclass___: aSymbol
			instVarNames: ivarNames classInstVarNames: classIvarNames].
	TypeError ___signal___: ('cannot subclass a non-class base ('
		@env0:, self @env0:class @env0:name @env0:asString @env0:, ')')
%

category: 'Grail-Instantiation'
method: object
___isMetaclassBase___
	"True when the receiver is a METACLASS -- ``Enum class'', what type(Enum)
	answers -- rather than an ordinary object.

	A class is an instance of its metaclass, and a metaclass is an instance of
	Metaclass3, so this is the test that separates ``Enum class'' from ``Enum''
	without naming either."

	^ self @env0:class == Metaclass3
%

category: 'Grail-Instantiation'
classmethod: object
___hasUserInit___
	"True if this class defines its OWN Python __init__ (any arity), as
	opposed to only inheriting a built-in no-op (object / Set / set /
	frozenset / tuple all provide a do-nothing __init__ or ___init__:kw:).
	The immutable-collection construction routing uses this to decide
	whether excess constructor keyword arguments are a TypeError: kwargs
	are rejected precisely when no user __init__ exists to consume them
	(bpo-43413 / test_keywords_in_subclass).  A plain
	``whichClassIncludesSelector:'' is not enough because object always
	provides a no-op ___init__:kw:."

	| owner builtins |
	builtins := { object. Set. set. frozenset. tuple }.
	#( #'___init__:kw:' #'__init__:' #'__init__:_:' #'__init__' ) @env0:do: [:sel |
		owner := self @env0:whichClassIncludesSelector: sel environmentId: 1.
		(owner @env0:notNil @env0:and: [(builtins @env0:includes: owner) @env0:not])
			ifTrue: [^ true]].
	^ false
%

classmethod: object
___grailAbcMetaclassInChain___
	"True when this class, or one it inherits from, explicitly declared
	``metaclass=abc.ABCMeta''.

	EXPLICIT is the whole point.  Grail deliberately does not block instantiating
	a class that merely uses @abc.abstractmethod -- abc.py records why: twilio's
	AuthStrategy / CredentialProvider are PLAIN classes whose abstract methods
	raise NotImplementedError from their bodies, and blocking them would break
	working code.  Neither declares a metaclass, so keying on the declaration
	leaves them untouched while still honouring a class that asked for ABCMeta."

	| c meta |
	(self isKindOf: Behavior) ifFalse: [^ false].
	c := self.
	[c == nil] @env0:whileFalse: [
		meta := c ___grailMetaclass___.
		(meta @env0:notNil
			and: [(meta ___pyNameOrEmpty___) @env0:= 'ABCMeta']) ifTrue: [^ true].
		c := c @env0:superclass].
	^ false
%

category: 'Grail-Metaclass'
method: object
___pyNameOrEmpty___
	"This class's Python __name__, or '' -- a non-raising probe for the
	abstractness and metaclass checks."

	^ [(self ___pyAttrLoad___: #'__name__') @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: '']
%

category: 'Grail-Metaclass'
method: object
___grailUnimplementedAbstract___
	"The name of an abstract method this class has NOT implemented, or nil.

	A name is still abstract for C when the FIRST class in C's chain that
	defines it is the one that marked it abstract -- which is how a concrete
	subclass clears it by overriding, and why email's Compat32 instantiates
	while the Policy it derives from does not.

	Abstractness lives on the INTERNED UnboundMethod for (class, selector),
	because that is the handle @abc.abstractmethod receives and stamps."

	| c seen |
	c := self.
	seen := IdentitySet @env0:new.
	[c == nil] @env0:whileFalse: [
		(c @env0:methodDictForEnv: 1) @env0:keysDo: [:sel |
			| str bare owner |
			"The BARE Python name: ``def add(self, x, y)'' compiles to #'add:_:',
			and a varargs companion to #'_add:kw:', while the abstractness stamp
			is keyed by the plain name on the interned UnboundMethod."
			str := sel @env0:asString.
			bare := (str @env0:includes: $:)
				ifTrue: [str @env0:copyFrom: 1 to: (str @env0:indexOf: $:) @env0:- 1]
				ifFalse: [str].
			(bare @env0:isEmpty @env0:not
				and: [(bare @env0:at: 1) @env0:= $_
					ifTrue: [(bare @env0:size @env0:> 1)
						and: [(bare @env0:at: 2) @env0:= $_]]
					ifFalse: [true]]) ifTrue: [
				(seen @env0:includes: bare @env0:asSymbol) ifFalse: [
					seen @env0:add: bare @env0:asSymbol.
					owner := self @env0:whichClassIncludesSelector: sel environmentId: 1.
					(owner @env0:notNil
						and: [self ___grailSelectorIsAbstract___: bare @env0:asSymbol on: owner])
							ifTrue: [^ bare]]]].
		c := c @env0:superclass].
	^ nil
%

category: 'Grail-Metaclass'
method: object
___grailSelectorIsAbstract___: sel on: owner
	"Did ``owner'' mark this selector abstract?  Read off the interned
	UnboundMethod, guarded: most selectors carry no such stamp."

	^ [((UnboundMethod definingClass: owner selector: sel)
		___pyAttrLoad___: #'__isabstractmethod__') == true]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]
%

category: 'Grail-Instantiation'
method: object
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

	| n sel stream found abstractName |
	"CPython refuses to instantiate a class that still has abstract methods.
	Gated on an EXPLICIT ``metaclass=abc.ABCMeta'' so a plain class using
	@abc.abstractmethod is untouched -- see ___grailAbcMetaclassInChain___ for
	why that distinction is the one that matters here."
	self ___grailAbcMetaclassInChain___ ifTrue: [
		abstractName := self ___grailUnimplementedAbstract___.
		abstractName @env0:notNil ifTrue: [
			TypeError ___signal___: ('Can''t instantiate abstract class '
				@env0:, (self ___pyNameOrEmpty___)
				@env0:, ' without an implementation for abstract method '''
				@env0:, abstractName @env0:, '''')]].
	found := (self @env0:whichClassIncludesSelector: #'___new__:kw:' environmentId: 1) ~~ nil.
	found ifFalse: [
		n := positional @env0:size.
		stream := AppendStream @env0:on: String @env0:new.
		stream @env0:nextPutAll: '__new__:'.
		2 @env0:to: n do: [:i | stream @env0:nextPutAll: '_:'].
		sel := stream @env0:contents @env0:asSymbol.
		found := n @env0:> 0 and: [(self @env0:whichClassIncludesSelector: sel environmentId: 1) ~~ nil]].
	found ifFalse: [
		"A subclass of an IMMUTABLE built-in collection (tuple / frozenset) is
		populated by the built-in's __new__ (a classmethod), NOT by a mutable
		__init__ -- the general allocate-then-init path can't fill a frozen /
		fixed-size instance, so a DYNAMIC-base subclass (``class T(self.type2test)'')
		would otherwise construct EMPTY.  Route to the inherited __new__: iterable
		so it builds populated.  (Static-base subclasses take the firstBaseIsX
		path in ClassDefAst and never reach here.)"
		((self @env0:inheritsFrom: tuple) @env0:or: [self @env0:inheritsFrom: frozenset]) ifTrue: [
			"tuple/frozenset __new__ takes NO keyword arguments; reject them
			unless the subclass defines its own __init__ (varargs form) that
			would consume them (test_keywords_in_subclass)."
			(((keywords @env0:notNil) @env0:and: [keywords @env0:notEmpty])
				@env0:and: [(self ___hasUserInit___) @env0:not])
				ifTrue: [TypeError ___signal___: (self @env0:name @env0:asString
					@env0:, '() takes no keyword arguments')].
				"tuple/frozenset take at most ONE positional argument; a plain subclass (no own __init__ to absorb extras) rejects >1 (test_new_or_init: self.thetype([], 2))."
				((positional @env0:size @env0:> 1) @env0:and: [(self ___hasUserInit___) @env0:not])
					ifTrue: [TypeError ___signal___: (self @env0:name @env0:asString
						@env0:, ' expected at most 1 argument, got ' @env0:, positional @env0:size @env0:printString)].
			^ positional @env0:isEmpty
				ifTrue: [self @env1:__new__]
				ifFalse: [self @env1:__new__: (positional @env0:at: 1)]].
		"bytes/bytearray build their ENTIRE content in a classmethod
		``__new__:'' too (bytes is immutable; Bytearray.gs likewise does
		the whole copy there -- there is no ``__init__:'' for either), so
		a subclass with no __init__ of its own must be routed the same
		way as tuple/frozenset above, or it allocates via plain #new and
		stays permanently empty (test_int.py's
		test_non_numeric_input_types: ``class CustomBytes(bytes): pass;
		CustomBytes(b'100')'' must copy the source, not construct b'')."
		((self @env0:inheritsFrom: bytes) @env0:or: [self @env0:inheritsFrom: bytearray]) ifTrue: [
			((positional @env0:size @env0:> 1) @env0:and: [(self ___hasUserInit___) @env0:not])
				ifTrue: [TypeError ___signal___: (self @env0:name @env0:asString
					@env0:, ' expected at most 1 argument, got ' @env0:, positional @env0:size @env0:printString)].
			^ positional @env0:isEmpty
				ifTrue: [self @env1:__new__]
				ifFalse: [self @env1:__new__: (positional @env0:at: 1)]].
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
method: object
___init_subclass__: positional kw: kwargs
	"The end of PEP 487's cooperative chain: ``object.__init_subclass__''.

	It is reachable INSTANCE-side, not only class-side, because that is where
	the chain looks for it.  A class-body ``def __init_subclass__(cls, **kwds)''
	compiles to an instance-side ___init_subclass__:kw: whose ``self'' is the
	SUBCLASS being created, and the ``super().__init_subclass__(**kwds)'' every
	well-behaved implementation opens with resolves through Super, which walks
	instance-side method dictionaries.  Without a base here the last link in the
	chain found nothing.

	CPython raises for a leftover keyword, which is the whole point of making the
	chain cooperative: a class keyword nobody consumed is a typo, and silence
	would hide it."

	(kwargs == nil or: [kwargs @env0:isEmpty]) ifFalse: [
		^ TypeError ___signal___:
			'object.__init_subclass__() takes no keyword arguments'].
	^ None
%

category: 'Grail-Initialization'
classmethod: object
___grailInitSubclass___: kwargs
	"PEP 487.  CPython's type.__new__ ends by calling

	    super(cls, cls).__init_subclass__(**kwds)

	on the class it has just built, and ClassDefAst emits this send at the
	matching moment -- after the ___pyClassDefined___: metaclass hook, before the
	class decorators -- with the forwarded class keywords.

	The lookup starts at the SUPERCLASS, which is the whole subtlety of the
	protocol: a class's own __init_subclass__ never runs for itself, only for
	its subclasses.  Starting at the class instead would also be a straight
	infinite recursion for the ordinary implementation, whose first act is to
	delegate upwards.

	The found method is run with the new class as the receiver -- an
	instance-side method executed against a class object, which is exactly what
	CPython's implicit ``classmethod'' wrapping of __init_subclass__ arranges.

	Answers self so the send can sit in the ``C := C ...'' chain if it ever
	needs to."

	| sup sel instOwner metaOwner found meth |
	sel := #'___init_subclass__:kw:'.
	sup := self @env0:superclass.
	sup == nil ifTrue: [^ self].
	"Two spellings to look for.  A plain ``def __init_subclass__(cls, **kwds)''
	compiles instance-side -- CPython makes it an implicit classmethod, and
	running an instance-side method against a class object is Grail's equivalent.
	The EXPLICIT ``@classmethod def __init_subclass__'' is legal too (redundant
	in CPython, but written often enough), and that one compiles CLASS-side, so
	the metaclass chain has to be searched as well."
	instOwner := sup @env0:whichClassIncludesSelector: sel environmentId: 1.
	metaOwner := sup @env0:class
		@env0:whichClassIncludesSelector: sel environmentId: 1.
	found := (instOwner == nil or: [metaOwner == nil])
		ifTrue: [instOwner == nil ifTrue: [metaOwner] ifFalse: [instOwner]]
		ifFalse: [
			"Both spellings live in this chain -- take whichever class is nearer,
			which is what a single CPython MRO would have done.  Only reached by
			a hierarchy that mixes the two, so the extra walk costs nothing in
			the ordinary case (and it walks superclass links only, with no
			method-dictionary fetch)."
			self ___grailNearerOf___: instOwner and: metaOwner @env0:thisClass
				from: sup].
	"Reaching object means nobody in the chain implements the hook.  Its base is
	a no-op EXCEPT for the leftover-keyword complaint, so a class header that
	passed keywords still has to run it."
	found == nil ifTrue: [^ self].
	found == object ifTrue: [
		(kwargs == nil or: [kwargs @env0:isEmpty]) ifTrue: [^ self]].
	meth := (found @env0:methodDictForEnv: 1)
		@env0:at: sel otherwise: nil.
	"The nearer owner may be the metaclass side, whose method lives on the
	metaclass, not on the class."
	meth == nil ifTrue: [
		meth := (found @env0:class @env0:methodDictForEnv: 1)
			@env0:at: sel otherwise: nil].
	meth == nil ifTrue: [^ self].
	self @env0:with: #() with: kwargs performMethod: meth.
	^ self
%

category: 'Grail-Initialization'
classmethod: object
___grailNearerOf___: aClass and: anotherClass from: startClass
	"Whichever of the two is met first walking up from startClass.  Answers
	aClass if neither is on the chain, which cannot happen from the one caller
	(both came from a selector lookup rooted there)."

	| walker |
	walker := startClass.
	[walker == nil] whileFalse: [
		walker == aClass ifTrue: [^ aClass].
		walker == anotherClass ifTrue: [^ anotherClass].
		walker := walker @env0:superClass].
	^ aClass
%

category: 'Grail-Class Namespace'
classmethod: object
___grailPrepareNamespace___: aMetaclass
	"PEP 3115's ``__prepare__'': the mapping a class body is executed in.

	    class Meta(type):
	        @classmethod
	        def __prepare__(metacls, cls, bases, **kwds):
	            return EnumDict(cls)

	CPython asks the metaclass for a namespace BEFORE running the body, runs the
	body against it, and hands it to the metaclass afterwards.  A namespace that
	watches the writes can then refuse one -- which is the whole point of
	enum.EnumDict, and of this.

	Grail has no class-body namespace: a body compiles to accessor stores on the
	class.  This is the first stage of giving it one -- the mapping exists, and
	every class-body ASSIGNMENT is routed through it (___grailNsStore___:value:)
	in source order, so a namespace sees each write as it happens.  What it does
	NOT yet cover is the rest of a body: nested classes, ``if'' branches, ``def''s
	and decorated ``def''s each have their own emission path and still bypass it,
	and ``vars()'' inside a body does not answer it.  See
	docs/Class_Body_Namespace.md.

	Answers nil -- meaning no namespace, and every store goes straight through --
	unless the metaclass really supplies __prepare__.  Kept in SessionTemps
	keyed by the class rather than on the class itself: it is scaffolding for
	the duration of the class statement, it must never be committed, and keying
	by class handles a nested class statement without a stack."

	| prep ns tbl |
	aMetaclass isNil ifTrue: [
		"No ``metaclass='' keyword.  Grail's own metaclasses are SMALLTALK -- an
		enum's namespace comes from ``Enum class'', not from a keyword -- so ask
		the receiver's metaclass chain for the Grail-side hook.  A selector probe
		rather than an attribute load, because this runs for every class
		definition in the corpus and answers nil for almost all of them."
		((self @env0:class @env0:whichClassIncludesSelector:
			#'___grailMetaclassNamespace___' environmentId: 1) == nil)
				ifTrue: [^ nil].
		ns := self ___grailMetaclassNamespace___.
		(ns isNil or: [ns == None]) ifTrue: [^ nil].
		tbl := SessionTemps @env0:current
			@env0:at: #'GrailPendingClassNamespace'
			ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
		tbl @env0:at: self put: ns.
		^ ns].
	prep := [aMetaclass ___pyAttrLoad___: #'__prepare__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	prep isNil ifTrue: [^ nil].
	"NOT guarded.  A __prepare__ that raises is a real error in the metaclass and
	CPython propagates it; swallowing it here turned a broken namespace into a
	silent no-namespace, which looked exactly like this whole path not working."
	ns := prep @env1:value: { self @env1:__name__. #() } value: nil.
	(ns isNil or: [ns == None]) ifTrue: [^ nil].
	tbl := SessionTemps @env0:current
		@env0:at: #'GrailPendingClassNamespace'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	tbl @env0:at: self put: ns.
	^ ns
%

category: 'Grail-Class Namespace'
classmethod: object
___grailNsStore___: aName value: aValue
	"One class-body assignment, seen by the namespace if there is one.

	Answers the value to store in the class attribute.  With no namespace that
	is aValue untouched, which is every class in the corpus that does not name a
	metaclass with __prepare__.

	The value is READ BACK from the namespace rather than passed through, because
	a namespace is entitled to transform what it was given -- CPython's
	_EnumDict resolves an ``auto()'' at assignment time, so the name is already
	an int for the next statement in the body to use.  Nothing in Grail depends
	on that yet; reading back is what makes it possible without revisiting this.

	A namespace that REFUSES the write raises out of here, which is what
	enum.EnumDict does for a reused member name -- and is the behaviour this
	whole path exists to make reachable."

	| ns |
	ns := self ___grailPendingNamespace___.
	ns isNil ifTrue: [^ aValue].
	ns @env1:__setitem__: aName @env0:asString _: aValue.
	^ ns @env1:__getitem__: aName @env0:asString
%

category: 'Grail-Class Namespace'
classmethod: object
___grailPendingNamespace___
	"The namespace ___grailPrepareNamespace___ installed for the receiver, or
	nil -- which is every class that does not name a metaclass with __prepare__
	and whose metaclass chain supplies no ___grailMetaclassNamespace___.

	Kept in SessionTemps keyed by the class rather than on the class itself: it
	is scaffolding for the duration of the class statement and must never be
	committed."

	| tbl |
	tbl := SessionTemps @env0:current
		@env0:at: #'GrailPendingClassNamespace' otherwise: nil.
	tbl isNil ifTrue: [^ nil].
	^ tbl @env0:at: self otherwise: nil
%

category: 'Grail-Class Namespace'
classmethod: object
___grailFinishNamespace___
	"Drop the pending namespace once the class statement is over.  Called after
	the metaclass hook, which is the last thing entitled to see it."

	| tbl |
	tbl := SessionTemps @env0:current
		@env0:at: #'GrailPendingClassNamespace' otherwise: nil.
	tbl isNil ifTrue: [^ self].
	tbl @env0:removeKey: self ifAbsent: [].
	^ self
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
	(after the namespace is populated), not ``__new__``.

	The default now also runs Python's ``__set_name__`` protocol over the
	body, which CPython fires from ``type.__new__`` -- the same moment.
	A metaclass that overrides this hook (Enum class) takes on that job
	itself; none of the in-tree ones has an entry that wants __set_name__."

	self ___grailInstallAttrMethodShadows___: attrNames.
	^ self ___invokeSetNameHooks___: attrNames
%

category: 'Grail-Initialization'
classmethod: object
___grailInstallAttrMethodShadows___: attrNames
	"A class-body ASSIGNMENT that binds a callable -- ``setUp =
	TestJointOps.setUp'', CPython's idiom for borrowing a method from an
	unrelated class -- must OVERRIDE an inherited method of the same name.

	It lands in the class ATTRIBUTE store, which every ``obj.name'' load
	consults ahead of any compiled method, so attribute-routed calls already
	run it.  A fast-path self-send does not: ``self.setUp()'' compiled inside
	the BASE class emits a direct Smalltalk send (CallAst
	classSelfSendSelector), which resolves virtually and finds the base's own
	compiled method -- the subclass's assignment is invisible to it, because
	an assignment compiles no method.

	unittest.TestCase >> run does exactly that, so test.test_set's
	TestSetSubclassWithSlots (``setUp = TestJointOps.setUp'') ran TestCase's
	no-op setUp and every test in it died on a missing ``self.s''.

	Fix it where the shadowing is knowable: at class-creation time, compile a
	real forwarding method for each inherited selector the assigned name
	shadows, whose body re-routes through the attribute load.  The virtual
	send then lands on the forwarder and the assignment wins, exactly as
	CPython's single class __dict__ makes it.

	Cost on the ordinary class is one method-dictionary probe per candidate
	name per inherited class -- the chain is walked ONCE, fetching each
	class's env-1 dictionary once (that fetch, a merge of the persistent and
	transient dicts, is the expensive part).  The attribute VALUE is read only
	for a name the chain actually implements, and a forwarder is compiled only
	when that value is a callable that binds self."

	| sup ownDict pending inherited walker md |
	attrNames == nil ifTrue: [^ self].
	sup := self @env0:superclass.
	sup == nil ifTrue: [^ self].
	ownDict := self @env0:methodDictForEnv: 1.
	"Candidates: plain ASCII identifiers (a generated selector has to compile)
	whose arities this class does not already supply itself -- a real ``def''
	in the same body, or a sibling alias, already wins on its own."
	pending := OrderedCollection @env0:new.
	attrNames @env0:do: [:nm |
		| s fam kept |
		s := nm @env0:asString.
		(self ___grailShadowableName___: s) ifTrue: [
			fam := self ___grailShadowFamilyFor___: s.
			kept := ownDict == nil
				ifTrue: [fam]
				ifFalse: [fam @env0:reject: [:pair |
					ownDict @env0:includesKey: (pair @env0:at: 1)]].
			kept @env0:isEmpty ifFalse: [
				pending @env0:add: (Array @env0:with: s with: kept)]]].
	pending @env0:isEmpty ifTrue: [^ self].
	"One walk of the superclass chain for every candidate at once."
	inherited := IdentitySet @env0:new.
	walker := sup.
	[walker == nil] whileFalse: [
		md := walker @env0:methodDictForEnv: 1.
		md == nil ifFalse: [
			pending @env0:do: [:entry |
				(entry @env0:at: 2) @env0:do: [:pair |
					(md @env0:includesKey: (pair @env0:at: 1))
						ifTrue: [inherited @env0:add: (pair @env0:at: 1)]]]].
		walker := walker @env0:superClass].
	inherited @env0:isEmpty ifTrue: [^ self].
	pending @env0:do: [:entry |
		| s shadowed val |
		s := entry @env0:at: 1.
		shadowed := (entry @env0:at: 2) @env0:select: [:pair |
			inherited @env0:includes: (pair @env0:at: 1)].
		"A name carrying BOTH the unary and the 1-arg selector is the shape of
		a getter/setter PAIR, which ___pyAttrLoad___ resolves by PERFORMING the
		unary one -- installing a forwarder there would make that perform call
		the forwarder, which loads the attribute again.  Leave such a name
		alone; it is a data attribute in Grail's encoding, not a method."
		((shadowed @env0:anySatisfy: [:pair | (pair @env0:at: 2) == 0])
			and: [shadowed @env0:anySatisfy: [:pair | (pair @env0:at: 2) == 1]])
				ifTrue: [shadowed := Array @env0:new].
		shadowed @env0:isEmpty ifFalse: [
			"Reading the value can run a __get__; only do it for a name that is
			really shadowing something."
			val := [self ___pyAttrLoad___: s @env0:asSymbol]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
			(self ___isDescriptorCallable___: val) ifTrue: [
				shadowed @env0:do: [:pair |
					self
						___compileMethod: (self ___grailShadowSourceFor___: s
							nargs: (pair @env0:at: 2))
						category: 'Grail-Attr Method Shadows']]]].
	^ self
%

category: 'Grail-Initialization'
classmethod: object
___grailShadowableName___: aString
	"True when aString can be spelled as a Smalltalk selector -- a non-empty
	ASCII identifier.  ___compileMethod:category: answers a compile failure by
	installing a NameError-raising STUB under the same selector, which for a
	shadow would REPLACE a working attribute path with a broken method, so the
	name is screened before any source is built."

	| c |
	aString @env0:isEmpty ifTrue: [^ false].
	(aString @env0:at: 1) @env0:isDigit ifTrue: [^ false].
	1 to: aString @env0:size do: [:i |
		c := aString @env0:at: i.
		(c @env0:codePoint @env0:> 127) ifTrue: [^ false].
		((c @env0:isLetter) or: [(c @env0:isDigit) or: [c == $_]]) ifFalse: [^ false]].
	^ true
%

category: 'Grail-Initialization'
classmethod: object
___grailShadowFamilyFor___: aString
	"Every Smalltalk selector a Python method named aString can have been
	compiled to, each paired with the Python argument count it takes (self
	excluded); -1 marks the varargs ``_name:kw:'' form.  The same eight
	selectors ___selectorFamilyFor___: builds for an attribute load."

	| out sel |
	out := OrderedCollection @env0:new.
	out @env0:add: (Array @env0:with: aString @env0:asSymbol with: 0).
	sel := aString @env0:, ':'.
	1 to: 6 do: [:i |
		out @env0:add: (Array @env0:with: sel @env0:asSymbol with: i).
		sel := sel @env0:, '_:'].
	out @env0:add: (Array @env0:with:
		('_' @env0:, aString @env0:, ':kw:') @env0:asSymbol with: -1).
	^ out @env0:asArray
%

category: 'Grail-Initialization'
classmethod: object
___grailShadowSourceFor___: aName nargs: n
	"Source of the forwarding method described in
	___grailInstallAttrMethodShadows___:.  For ``m = Other.m'' with an
	inherited 1-arg ``m'':

	    m: ___a1
	        | ___f |
	        ___f := self ___grailAttrMethodShadow___: #'m'.
	        ___f == nil ifTrue: [^ super m: ___a1].
	        ^ ___f value: { ___a1 } value: nil

	The ``super'' arm is what runs if the attribute is ever taken away again
	(``del Cls.m''), and is always reachable -- a forwarder is compiled only
	for a selector the superclass chain implements."

	| ws header |
	ws := WriteStream @env0:on: String @env0:new.
	"The method pattern, reused verbatim as the super send's arguments."
	header := WriteStream @env0:on: String @env0:new.
	n @env0:= -1
		ifTrue: [
			header @env0:nextPut: $_.
			header @env0:nextPutAll: aName.
			header @env0:nextPutAll: ': ___args kw: ___kw']
		ifFalse: [
			header @env0:nextPutAll: aName.
			n @env0:> 0 ifTrue: [
				header @env0:nextPutAll: ': ___a1'.
				2 to: n do: [:k |
					header @env0:nextPutAll: ' _: ___a'.
					header @env0:nextPutAll: k @env0:printString]]].
	ws @env0:nextPutAll: header @env0:contents.
	ws @env0:nextPut: Character @env0:lf.
	ws @env0:nextPutAll: '	| ___f |'.
	ws @env0:nextPut: Character @env0:lf.
	ws @env0:nextPutAll: '	___f := self ___grailAttrMethodShadow___: #'''.
	ws @env0:nextPutAll: aName.
	ws @env0:nextPutAll: '''.'.
	ws @env0:nextPut: Character @env0:lf.
	ws @env0:nextPutAll: '	___f == nil ifTrue: [^ super '.
	ws @env0:nextPutAll: header @env0:contents.
	ws @env0:nextPutAll: '].'.
	ws @env0:nextPut: Character @env0:lf.
	ws @env0:nextPutAll: '	^ ___f value: '.
	n @env0:= -1
		ifTrue: [ws @env0:nextPutAll: '___args value: ___kw'.
			^ ws @env0:contents].
	n @env0:= 0
		ifTrue: [ws @env0:nextPutAll: '#()']
		ifFalse: [
			ws @env0:nextPutAll: '{ '.
			1 to: n do: [:k |
				k @env0:> 1 ifTrue: [ws @env0:nextPutAll: '. '].
				ws @env0:nextPutAll: '___a'.
				ws @env0:nextPutAll: k @env0:printString].
			ws @env0:nextPutAll: ' }'].
	ws @env0:nextPutAll: ' value: nil'.
	^ ws @env0:contents
%

category: 'Grail-Initialization'
classmethod: object
___invokeSetNameHooks___: attrNames
	"Python's ``__set_name__(owner, name)'' protocol: as a class is created,
	each value in its body that implements __set_name__ is told which class
	and which NAME it was bound to.  functools.cached_property needs it to
	know the slot it caches under -- CPython raises rather than guess, and
	so does Grail's.

	Two stores to walk, because Grail splits what CPython keeps in one class
	__dict__: a class-body ASSIGNMENT reaches a ClassDefAst-synthesised
	``Grail-Class Attrs'' accessor and is named in attrNames, while a class-
	body method DECORATOR's rebinding goes to the per-class dynInstVars
	holder (___classHolderAttrStore___).  Names in attrNames come in
	declaration order; the holder's do not, so a class that binds the same
	descriptor to a decorated def AND an assignment may report the two names
	in either order.

	Cost on the ordinary class -- whose body holds ints, strings and
	functions -- is one ``isKindOf: PythonInstance'' per name, since only a
	Python OBJECT can implement the hook.

	Answers self: ___pyClassDefined___:'s contract is to return the class the
	def statement binds."

	| holder ordered |
	"True DECLARATION order when ClassDefAst recorded it: defs and assignments
	interleaved as written.  The two-store walk below cannot reconstruct that --
	attrNames holds only the assignments, and the holder is unordered -- so a
	descriptor bound to a decorated def AND a later alias reported its two names
	backwards.  cached_property names both in its error, and CPython's order is
	the source order."
	ordered := ((self @env0:class @env0:whichClassIncludesSelector:
		#'___classBodyOrder___' environmentId: 1) ~~ nil)
			ifTrue: [self ___classBodyOrder___]
			ifFalse: [nil].
	ordered == nil ifFalse: [
		holder := (self ___respondsTo___: #dynInstVars)
			ifTrue: [self @env0:perform: #dynInstVars env: 1]
			ifFalse: [nil].
		ordered @env0:do: [:sym |
			| v |
			v := self ___classBodyValueAt___: sym.
			(v == nil
				and: [holder @env0:notNil
				and: [(holder @env0:dynamicInstanceVariables) @env0:includes: sym]])
					ifTrue: [v := holder @env0:dynamicInstVarAt: sym].
			self ___setNameOn___: v named: sym].
		^ self].
	attrNames == nil ifFalse: [
		attrNames @env0:do: [:nm |
			| sym |
			sym := nm @env0:asString @env0:asSymbol.
			self ___setNameOn___: (self ___classBodyValueAt___: sym) named: sym]].
	holder := (self ___respondsTo___: #dynInstVars)
		ifTrue: [self @env0:perform: #dynInstVars env: 1]
		ifFalse: [nil].
	holder == nil ifFalse: [
		(holder @env0:dynamicInstanceVariables) @env0:do: [:sym |
			(attrNames == nil or: [(attrNames @env0:includes: sym) not]) ifTrue: [
				self ___setNameOn___: (holder @env0:dynamicInstVarAt: sym) named: sym]]].
	^ self
%

category: 'Grail-Initialization'
classmethod: object
___classBodyValueAt___: aSym
	"The raw value of this class's own class-body attribute aSym, or nil when
	there is no such accessor.  Guarded: attrNames may name an entry a
	metaclass has since transformed away."

	^ [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) == nil
		ifTrue: [nil]
		ifFalse: [self @env0:perform: aSym env: 1]]
			@env0:on: AbstractException
			do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Initialization'
classmethod: object
___setNameOn___: aValue named: aSym
	"Send ``__set_name__(cls, name)'' when aValue really implements it.

	Only a PythonInstance is asked.  Grail's function stand-ins and the
	built-in types never implement the hook, and probing every class
	attribute of every class at every class definition would be a real cost
	on import.  PropertyDescriptor (the ``property'' builtin and its
	subclasses) is a statically-defined Smalltalk class, NOT a PythonInstance,
	yet it DOES implement __set_name__ (test_property_name: ``bar =
	property(fget)'' must learn its own name 'bar'), so it is admitted too --
	an extra isKindOf only on the miss, never on the ints/strings/functions
	that dominate a class body."

	((aValue isKindOf: PythonInstance)
		or: [aValue isKindOf: PropertyDescriptor]) ifFalse: [^ self].
	(aValue ___respondsTo___: #'__set_name__:_:') ifFalse: [^ self].
	aValue __set_name__: self _: aSym @env0:asString @env0:asUnicodeString.
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
___pythonBuiltinTypeName___
	"The Python type name for the reused GemStone KERNEL classes that back
	Python's built-in types (install.gs Step 3 maps e.g. ``int'' ->
	Integer, ``list'' -> OrderedCollection), so ``type(x).__name__'' /
	``cls.__name__'' report the PYTHON spelling (``int'', not ``Integer'').
	Answers nil for everything else: Grail-defined built-in types
	(tuple/set/frozenset/complex/bytearray/NoneType) are class-named with
	their Python name already, and non-type classes (BoundMethod, ExecBlock,
	...) plus user Python classes MUST keep their own name (the inspect
	stubs and PythonClass>>__name__ depend on it).  Keyed by Smalltalk class
	NAME so no class-global resolution is needed and concrete subclass
	variants (SmallInteger, LargePositiveInteger, ...) are covered
	explicitly."

	| n |
	n := self @env0:name @env0:asString.
	(#('Object') @env0:includes: n) ifTrue: [^ 'object'].
	(#('Integer' 'SmallInteger' 'LargeInteger' 'LargePositiveInteger'
		'LargeNegativeInteger' 'AbstractPyInt') @env0:includes: n) ifTrue: [^ 'int'].
	(#('Boolean') @env0:includes: n) ifTrue: [^ 'bool'].
	(#('Float' 'SmallDouble' 'AbstractPyFloat') @env0:includes: n) ifTrue: [^ 'float'].
	"PyStrSurrogate is named explicitly rather than inherited: this test is
	keyed by class NAME so that no class-global resolution is needed, which
	means an AbstractPyStr SUBCLASS does not pick the answer up for free."
	(#('Unicode7' 'Unicode16' 'Unicode32' 'String' 'DoubleByteString'
		'QuadByteString' 'AbstractPyStr' 'PyStrSurrogate') @env0:includes: n)
			ifTrue: [^ 'str'].
	(#('ByteArray') @env0:includes: n) ifTrue: [^ 'bytes'].
	(#('OrderedCollection') @env0:includes: n) ifTrue: [^ 'list'].
	(#('PyDict' 'KeyValueDictionary') @env0:includes: n) ifTrue: [^ 'dict'].
	(#('Interval') @env0:includes: n) ifTrue: [^ 'range'].
	(#('ScaledDecimal') @env0:includes: n) ifTrue: [^ 'Decimal'].
	(#('GsNMethod') @env0:includes: n) ifTrue: [^ 'builtin_function_or_method'].
	"PyCell backs Python's closure-cell type, whose CPython spelling is
	``cell'' -- test_funcattrs' test___closure__ asserts exactly
	``type(c).__name__ == 'cell'''.  Named PyCell in Smalltalk only because
	``cell'' is too generic a name to claim in the flat Python dictionary."
	(#('PyCell') @env0:includes: n) ifTrue: [^ 'cell'].
	^ nil
%

category: 'Grail-Introspection'
classmethod: object
___pythonModuleAttrIdentity___
	"The CPython identity of a class Grail names after the MODULE ATTRIBUTE
	it implements.

	Grail's Python SymbolDictionary is FLAT, so a class CPython reaches only
	through a module gets a flattened Smalltalk name: ``functools_partial''
	for functools.partial, ``sys_flags'' for type(sys.flags),
	``string_formatter'' for string.Formatter.  That spelling is an
	implementation detail, but it leaked into every Python-visible report --
	``functools.partial.__name__'' answered 'functools_partial' where CPython
	says 'partial', and ``__module__'' answered nothing at all where CPython
	says 'functools'.

	Answer { pythonName. moduleName } for such a class, else nil.  moduleName
	is nil for the two entries that are MODULES rather than classes (os.path,
	html.entities): a module has a __name__ but no __module__.

	Keyed by Smalltalk class NAME, exactly like ___pythonBuiltinTypeName___,
	so no class-global resolution is needed.  Every pair below is CPython
	3.14's own answer, read off the running interpreter rather than guessed."

	| n |
	n := self @env0:name @env0:asString.

	"functools.  ``Placeholder'' is an INSTANCE of _PlaceholderType in
	CPython, and cmp_to_key's return value is a KeyWrapper."
	(n @env0:= 'functools_partial') ifTrue: [^ #('partial' 'functools')].
	(n @env0:= 'functools_partialmethod') ifTrue: [^ #('partialmethod' 'functools')].
	(n @env0:= 'functools_cached_property') ifTrue: [^ #('cached_property' 'functools')].
	(n @env0:= 'functools_CacheInfo') ifTrue: [^ #('CacheInfo' 'functools')].
	(n @env0:= 'functools_Placeholder') ifTrue: [^ #('_PlaceholderType' 'functools')].
	(n @env0:= 'functools_cmpkey') ifTrue: [^ #('KeyWrapper' 'functools')].

	"numbers -- the numeric tower ABCs."
	(n @env0:= 'numbers_Number') ifTrue: [^ #('Number' 'numbers')].
	(n @env0:= 'numbers_Complex') ifTrue: [^ #('Complex' 'numbers')].
	(n @env0:= 'numbers_Real') ifTrue: [^ #('Real' 'numbers')].
	(n @env0:= 'numbers_Rational') ifTrue: [^ #('Rational' 'numbers')].
	(n @env0:= 'numbers_Integral') ifTrue: [^ #('Integral' 'numbers')].

	"os / string / time."
	(n @env0:= 'os_PathLike') ifTrue: [^ #('PathLike' 'os')].
	(n @env0:= 'string_formatter') ifTrue: [^ #('Formatter' 'string')].
	(n @env0:= 'struct_time') ifTrue: [^ #('struct_time' 'time')].

	"sys.  ``sys.implementation'' is a plain types.SimpleNamespace in
	CPython, not a bespoke type, so that is what it must report."
	(n @env0:= 'sys_flags') ifTrue: [^ #('flags' 'sys')].
	(n @env0:= 'sys_float_info') ifTrue: [^ #('float_info' 'sys')].
	(n @env0:= 'sys_hash_info') ifTrue: [^ #('hash_info' 'sys')].
	(n @env0:= 'sys_int_info') ifTrue: [^ #('int_info' 'sys')].
	(n @env0:= 'sys_implementation') ifTrue: [^ #('SimpleNamespace' 'types')].

	"json.  CPython defines JSONDecodeError in the json.decoder SUBMODULE and
	re-exports it from json, so its __module__ is 'json.decoder' even though
	``json.JSONDecodeError'' is how most code names it."
	(n @env0:= 'JSONDecodeError') ifTrue: [^ #('JSONDecodeError' 'json.decoder')].

	"enum.  These keep their CPython NAME already (the Smalltalk class is spelled
	the same), and are here purely for __module__: they are defined in enum
	upstream, so ``enum.Enum.__module__'' is 'enum' and not nothing.  It is also
	what gives the METACLASS an answer -- ``type(Color).__module__'' asks
	``Enum class'', which has no identity of its own and defers to the class it
	is the metaclass of.

	Only the classes enum DEFINES are listed.  ``enum.property'' is deliberately
	absent: Grail aliases it to the builtin ``property'' (one PropertyDescriptor
	class serves both), so claiming 'enum' here would relabel the builtin, whose
	__module__ is 'builtins'."
	(n @env0:= 'Enum') ifTrue: [^ #('Enum' 'enum')].
	(n @env0:= 'IntEnum') ifTrue: [^ #('IntEnum' 'enum')].
	(n @env0:= 'StrEnum') ifTrue: [^ #('StrEnum' 'enum')].
	(n @env0:= 'ReprEnum') ifTrue: [^ #('ReprEnum' 'enum')].
	(n @env0:= 'Flag') ifTrue: [^ #('Flag' 'enum')].
	(n @env0:= 'IntFlag') ifTrue: [^ #('IntFlag' 'enum')].
	(n @env0:= 'EnumDict') ifTrue: [^ #('EnumDict' 'enum')].

	"MODULES, not classes -- __name__ only.  ``os.path'' IS the posixpath
	module in CPython, so that is the name it reports."
	(n @env0:= 'os_path') ifTrue: [^ #('posixpath' nil)].
	(n @env0:= 'html_entities') ifTrue: [^ #('html.entities' nil)].
	(n @env0:= 'json_decoder') ifTrue: [^ #('json.decoder' nil)].

	^ nil
%

category: 'Grail-Introspection'
classmethod: object
___pythonBuiltinExceptionNames___
	"The CPython builtin EXCEPTION hierarchy — the exception classes that live
	in CPython's builtins module (``ValueError.__module__ == 'builtins'``).  The
	authoritative inclusion list, matching CPython 3.14's builtins exactly, so
	the Python compile dictionary's OTHER exception subclasses are excluded:
	module exceptions (StatisticsError->statistics, UnsupportedOperation->io,
	ZlibError->zlib) and Grail control-flow internals (PythonBreak / PythonContinue
	/ PythonReturn) must NOT be tagged 'builtins' nor exposed in builtins.

	Shared by builtins>>initialize (which of these names resolve to a class in
	the Python dict get exposed in the builtins namespace) and
	___pythonBuiltinTypeModule___ (identity-confirmed, they report 'builtins').
	Names Grail does not define (e.g. EnvironmentError) are simply absent from
	the dict and skipped by both callers."

	^ #( #BaseException #BaseExceptionGroup #Exception #ExceptionGroup
	   #GeneratorExit #KeyboardInterrupt #SystemExit
	   #ArithmeticError #FloatingPointError #OverflowError #ZeroDivisionError
	   #AssertionError #AttributeError #BufferError #EOFError
	   #ImportError #ModuleNotFoundError
	   #LookupError #IndexError #KeyError
	   #MemoryError #NameError #UnboundLocalError
	   #OSError #BlockingIOError #ChildProcessError #ConnectionError
	   #BrokenPipeError #ConnectionAbortedError #ConnectionRefusedError
	   #ConnectionResetError #FileExistsError #FileNotFoundError #InterruptedError
	   #IsADirectoryError #NotADirectoryError #PermissionError #ProcessLookupError
	   #TimeoutError #IOError #EnvironmentError
	   #ReferenceError #RuntimeError #NotImplementedError #RecursionError
	   #StopAsyncIteration #StopIteration
	   #SyntaxError #IndentationError #TabError
	   #SystemError #TypeError
	   #ValueError #UnicodeError #UnicodeDecodeError #UnicodeEncodeError
	   #UnicodeTranslateError
	   #Warning #DeprecationWarning #PendingDeprecationWarning #UserWarning
	   #SyntaxWarning #RuntimeWarning #FutureWarning #ImportWarning
	   #UnicodeWarning #BytesWarning #EncodingWarning #ResourceWarning )
%

category: 'Grail-Introspection'
classmethod: object
___pythonBuiltinTypeModule___
	"Answer 'builtins' when self is one of Python's built-in TYPE objects —
	the classes exposed in the builtins module by builtins>>initialize — else
	nil, so ``int.__module__`` / ``tuple.__module__`` report 'builtins' as in
	CPython.  Two signals cover the two kinds of built-in type:

	  * kernel-backed types (int/list/dict/str/bytes/bool/float/range/object)
	    reuse a GemStone kernel class and answer a ___pythonBuiltinTypeName___;
	    this also covers concrete subclasses (SmallInteger, Unicode16, ...).
	  * Grail-defined types (tuple/set/frozenset/complex/bytearray/type/slice/
	    property/memoryview) are class-named with their Python name and bound
	    under that name in the Python compile dictionary; an IDENTITY match
	    there confirms self is THE built-in type, not a same-named user class.
	  * builtin EXCEPTION classes (___pythonBuiltinExceptionNames___) are the
	    same shape as the Grail-defined types — class-named and bound in the
	    Python dict — and are matched the same identity-confirmed way, so
	    ``ValueError.__module__`` / ``OSError.__module__`` report 'builtins'
	    while a module exception (StatisticsError) or a user ``class E(ValueError)``
	    (name not in the list) is not.

	Everything else answers nil and MUST keep its own __module__ (user classes,
	class-enums) or fall through (dynamically created classes such as
	functional-API enums — reporting 'builtins' for those broke enum pickling)."

	| pd nm id |
	self ___pythonBuiltinTypeName___ @env0:notNil ifTrue: [^ 'builtins'].
	"A flattened module-attribute class belongs to the module it was named
	after, not to builtins -- ``functools.partial.__module__'' is 'functools'.
	The two MODULE entries (os.path, html.entities) carry nil here: a module
	has no __module__, so they fall through."
	id := self ___pythonModuleAttrIdentity___.
	id @env0:notNil ifTrue: [
		(id @env0:at: 2) @env0:ifNotNil: [:___mod | ^ ___mod]].
	nm := self @env0:name @env0:asString @env0:asSymbol.
	((#( #bool #bytearray #bytes #complex #dict #float #frozenset #int #list
		#memoryview #object #property #range #set #slice #str #tuple #type )
		@env0:includes: nm)
		@env0:or: [(self ___pythonBuiltinExceptionNames___) @env0:includes: nm])
		@env0:ifFalse: [^ nil].
	pd := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'Python'.
	pd @env0:isNil ifTrue: [^ nil].
	((pd @env0:at: nm otherwise: nil) == self) ifTrue: [^ 'builtins'].
	^ nil
%

category: 'Grail-Introspection'
classmethod: object
__name__
	"Python ``cls.__name__`` returns the class's short name as a string.
	Inherited through the metaclass chain to every class.  For the reused
	kernel classes that back Python built-ins, answer the PYTHON name
	(``int'' for Integer, ``list'' for OrderedCollection, ``object'' for
	Object, ...) via ___pythonBuiltinTypeName___; every other class keeps
	its Smalltalk name — downstream inspect.ismethod / isfunction stubs are
	written to match the Smalltalk names ('BoundMethod', 'ExecBlock').

	A user Python class keeps its exact Python name as the GemStone class name
	(``class base_set:`` stays ``base_set''); cls.__name__ therefore returns
	that name straight from the Smalltalk class -- no case change, no
	mangled->original registry.  CPython error
	messages interpolate this (test_contains: ``argument of type 'base_set'
	...'')."

	| bt id holder nm |
	"``cls.__name__ = 'T''' is writable in CPython, and a class FACTORY is the
	reason: collections.namedtuple builds one class and then names it after the
	typename it was asked for.  An assigned name wins over every derivation
	below -- it is the caller stating the answer outright.  Independent of
	__qualname__, which CPython leaves alone when __name__ is set."
	(self ___respondsTo___: #dynInstVars) ifTrue: [
		holder := self @env0:perform: #dynInstVars env: 1.
		holder @env0:notNil ifTrue: [
			nm := holder @env0:dynamicInstVarAt: #'___name___'.
			nm @env0:notNil ifTrue: [^ nm @env0:asString]]].
	bt := self ___pythonBuiltinTypeName___.
	bt @env0:notNil ifTrue: [^ bt].
	"A class named after the module attribute it implements (functools_partial,
	sys_flags, ...) reports the name CPython gives it, not Grail's flattened
	spelling."
	id := self ___pythonModuleAttrIdentity___.
	id @env0:notNil ifTrue: [^ id @env0:at: 1].
	"User classes now keep their exact Python name as the GemStone class name
	(___asSmalltalkClassName___: no longer changes case), so the Smalltalk name
	IS the Python name -- no mangled->original registry lookup needed."
	^ self @env0:name @env0:asString
%

category: 'Grail-Introspection'
classmethod: object
__qualname__
	"Python ``cls.__qualname__`` — the qualified name.  Grail does not
	track lexical nesting of classes, so answer the same string as
	__name__ (correct for top-level classes, which is the common case),
	including the Python-name mapping for built-in kernel classes.
	CPython error messages interpolate it (e.g. textwrap.dedent's
	``expected str object, not {type(text).__qualname__!r}'')."

	| bt holder qn id |
	"A NESTED class carries a dotted qualified name (``Outer.Inner'') recorded
	in its own dynInstVars holder at build time (ClassDefAst nested-class emit);
	top-level classes have none and fall back to the simple name below."
	(self ___respondsTo___: #dynInstVars) ifTrue: [
		holder := self @env0:perform: #dynInstVars env: 1.
		holder @env0:notNil ifTrue: [
			qn := holder @env0:dynamicInstVarAt: #'___qualname___'.
			qn @env0:notNil ifTrue: [^ qn @env0:asString]]].
	bt := self ___pythonBuiltinTypeName___.
	bt @env0:notNil ifTrue: [^ bt].
	"Flattened module-attribute class -- same CPython name __name__ reports;
	all of these are top-level in their module, so qualname equals name."
	id := self ___pythonModuleAttrIdentity___.
	id @env0:notNil ifTrue: [^ id @env0:at: 1].
	"User classes now keep their exact Python name as the GemStone class name
	(___asSmalltalkClassName___: no longer changes case), so the Smalltalk name
	IS the Python name -- no mangled->original registry lookup needed."
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

	| nargs sel selSym |
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifFalse: [
		^ self _new: positional kw: kwargs
	].
	nargs := positional @env0:size.
	nargs @env0:= 0 ifTrue: [^ self __new__].
	nargs @env0:= 1 ifTrue: [^ self __new__: (positional @env0:at: 1)].
	sel := AppendStream @env0:on: String @env0:new.
	sel @env0:nextPutAll: '__new__:'.
	2 @env0:to: nargs do: [:i | sel @env0:nextPutAll: '_:'].
	selSym := sel @env0:contents @env0:asSymbol.
	"No __new__ of this arity: raise the SAME catchable TypeError the direct
	call-site fast path (CallAst) emits, rather than performing a missing
	selector and letting the env-1 MessageNotUnderstood escape Python
	try/except as an uncatchable Smalltalk error.  Reached when a built-in
	class is invoked as a runtime callable (``assertRaises(TypeError, slice,
	1, 2, 3, 4)'' -- test_slice test_constructor) with an unsupported arity."
	"__new__:_:_:… are CLASSMETHODs, so probe the metaclass (self class), not
	self's instance-side method dict."
	(self @env0:class @env0:whichClassIncludesSelector: selSym environmentId: 1) == nil ifTrue: [
		^ TypeError ___signal___: (self @env0:name @env0:asString
			@env0:, '() takes wrong number of arguments (' @env0:, nargs @env0:printString
			@env0:, ' positional, 0 keyword) - no matching method')].
	^ self @env0:perform: selSym env: 1 withArguments: positional
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
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing

	Sends ___truthOf___: rather than __new__: so a CLASS receiver is
	tested for truthiness like any other object: bool class>>__new__:
	reads a leading ``bool'' as CPython's ``bool.__new__(cls)''
	allocation form (Grail's class-call dispatch names selectors by
	arity, so the two spellings are otherwise indistinguishable), which
	would make the condition in ``if bool:'' answer False."

	^ bool ___truthOf___: self
%

category: 'Grail-Convenience Methods - Unary'
method: object
___ignore: anObject
	"Evaluate the receiver and the argument (for its side effect) and
	return the receiver, discarding the argument.  Used by the chained
	``in''/``not in'' codegen: the membership result is the receiver, and
	the argument is an assignment expression (``rhsTemp := lhsTemp'') whose
	only purpose is to copy the just-evaluated container operand into the
	shared chain temp so the NEXT comparison in the chain can reuse it as
	its left operand.  Smalltalk evaluates the argument before the send, so
	the copy happens after the membership test has read the previous
	operand -- keeping each Python operand evaluated exactly once."

	^ self
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
___declaresOwnClassAttr___: aSym
	"True when the receiver's Python CLASS BODY declared a class attribute named
	aSym, as opposed to inheriting Grail's built-in default.

	ClassDefAst compiles a class-body assignment into an accessor on the
	class's METACLASS, so that is where the lookup goes.  The discriminator is
	the owner: for a plain instance the env-1 selector resolves through the
	metaclass chain all the way to ``Object'' (Grail's own
	``object>>__class__''), while a declared attribute resolves to the class's
	OWN metaclass.

	A kernel instance-side implementation (dict, bytes, int, ... all define
	their own env-1 __class__) is NOT caught, because those classes are not in
	the metaclass chain -- the lookup still lands on Object and the caller keeps
	its fast path.  A class receiver answers false: ``SomeClass.__class__'' is
	its metaclass, not a class-body attribute."

	| owner |
	(self @env0:isKindOf: Behavior) ifTrue: [^ false].
	owner := self @env0:class @env0:class
		@env0:whichClassIncludesSelector: aSym environmentId: 1.
	^ owner @env0:notNil @env0:and: [owner @env0:~~ Object]
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
	(aValue ___respondsTo___: #'___get__:kw:')
		ifTrue: [^ aValue ___get__: { self. self @env0:class } kw: nil].
	(aValue ___respondsTo___: #'__get__:_:')
		ifTrue: [^ aValue __get__: self _: self @env0:class].
	^ aValue
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___grailAttrMethodShadow___: aSym
	"The callable to run for a forwarding method compiled by
	Object class >> ___grailInstallAttrMethodShadows___:, bound to self --
	or nil, meaning ``there is no class attribute here after all, run the
	inherited method instead''.

	Reads through ___pyAttrLoad___, which consults the class attribute store
	ahead of any compiled method, so the forwarder does not find itself.

	BINDING IS DONE HERE, not left to the load.  ___pyAttrLoad___ binds self
	only for an UnboundMethod (``m = Other.m''); a CLOSURE stored as a class
	attribute comes back raw, on purpose, because the plain read ``obj.m''
	must answer the function itself.  A forwarder standing in for a method
	call is the other case, so anything ___isDescriptorCallable___ recognises
	gets a MethodBinding.  Without this django's LazyObject --
	``__getattr__ = new_method_proxy(getattr)'', whose value is a closure --
	called the proxy with the ATTRIBUTE NAME as self.

	nil is answered when the load raised (the attribute was deleted), and
	when it answered a BoundMethod on self, which is ___pyAttrLoad___'s way
	of saying it found only a compiled method -- the forwarder itself, so
	calling it would recurse."

	| v |
	v := [self ___pyAttrLoad___: aSym]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	v == nil ifTrue: [^ nil].
	((v isKindOf: BoundMethod) and: [(v @env0:receiver) == self]) ifTrue: [^ nil].
	(v isKindOf: MethodBinding) ifTrue: [^ v].
	(self ___isDescriptorCallable___: v)
		ifTrue: [^ MethodBinding instance: self callable: v].
	^ v
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___instanceClassAttrGet___: aValue
	"Resolve a CLASS-level attribute read THROUGH AN INSTANCE (self), applying
	Python's descriptor protocol the same way the ___classAttrOverlayLookup___
	and ___classChainAttrLookup___ paths already do:

	  * a real __get__ descriptor is asked for its value;
	  * a plain callable stored as a class attribute (a function/UnboundMethod/
	    lambda that takes self first) binds self via a MethodBinding, so
	    ``class C: m = Base.method`` then ``c.m(x)`` runs ``Base.method(c, x)``
	    (test_userlist's ``test_repr_deep = list_tests.CommonTest.test_repr_deep``,
	    and the general ``greet2 = Base.greet`` idiom);
	  * anything else comes back raw.

	The bare ___descriptorGet___: used by the class-body accessor-pair read path
	handled only the __get__ case and returned a callable UNBOUND, so an instance
	call reached the function with no receiver (``unbound method ... must be
	called with an instance as the first argument'').

	Narrowed to UnboundMethod ON PURPOSE.  ___descriptorGet___: (below) already
	returns a BoundMethod RAW -- deliberately, so a class attribute that is a
	plain module function (``digest_method = staticmethod(...)'', werkzeug Map's
	converter-table functions) is NOT redirected at the holder instance -- and
	binding those the way the runtime-overlay path does regresses that.  An
	UnboundMethod, by contrast, is what ``OtherClass.method'' answers and has no
	other meaning than a function awaiting self, so binding it is unambiguous."

	(aValue isKindOf: UnboundMethod)
		ifTrue: [^ MethodBinding instance: self callable: aValue].
	^ self ___descriptorGet___: aValue
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
		(walker ___respondsTo___: #dynInstVars)
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
___protocolOwnedBy___: walker name: aName
	"Shared search used by both ___hasProtocol___: and
	___hasProtocolForCall___: -- true when walker's class chain REALLY
	defines the Python method aName, i.e. below the PythonInstance / Object
	fallback level.  See ___hasProtocol___:'s comment for why a plain
	getattr probe cannot tell this apart from the generic legacy fallback."

	| s found |
	s := aName @env0:asString.
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

	| walker |
	walker := (self isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	^ self ___protocolOwnedBy___: walker name: aName
%

category: 'Grail-Python Protocol'
method: object
___hasProtocolForCall___: aName
	"Like ___hasProtocol___:, but answers the DIFFERENT question real
	CPython's iter(x) (type(x).__iter__(x)) asks: does CALLING aName on
	THIS SPECIFIC OBJECT actually work, always probing type(self) -- even
	when self itself is a class/metaclass instance.  ___hasProtocol___:'s
	class-receiver branch probes the class itself (the issubclass-style
	question 'do INSTANCES of this class support aName'), which gives the
	wrong answer for e.g. an Enum class: MainEnum IS iterable (its
	METACLASS EnumMeta defines __iter__), but instances of MainEnum
	(individual members) are not -- ___hasProtocol___: would wrongly say
	no; this says yes, matching iter(MainEnum) in real CPython.  Used by
	itertools._iter / builtins>>___pyIter___: (test_enum's TestXxxClass
	suites iterate the enum class directly, e.g. `list(MainEnum)`)."

	^ self ___protocolOwnedBy___: self @env0:class name: aName
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
	singleton, never Smalltalk nil), so nil unambiguously means absent.

	MRO ORDER, exactly as in ___classChainAttrLookup___: a hit is only honoured
	when no class NEARER aClass defines aSym as a compiled method, because
	CPython takes the first class in the MRO whose dict has the name and does
	not care whether that class supplies it as an attribute or as a function.

	This walk needs the rule as much as the committed one does -- more subtly,
	because WHICH store a runtime ``Cls.x = v'' lands in depends on the
	canonical-classes flag.  With it on (the test suite turns it on) the write
	goes to this overlay instead of the dynInstVars holder, so a fix applied
	only to the holder walk looked right in a plain session and still let an
	ancestor's attribute shadow a subclass's method under the suite."

	| st ov walker inner v |
	st := SessionTemps @env0:current.
	ov := st @env0:at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifTrue: [^ nil].
	walker := aClass.
	[walker == nil] whileFalse: [
		inner := ov @env0:at: walker otherwise: nil.
		inner == nil ifFalse: [
			v := inner @env0:at: aSym otherwise: nil.
			v == nil ifFalse: [
				(self ___methodDefinedFrom___: aClass upTo: walker name: aSym)
					ifTrue: [^ nil].
				^ v]].
		walker := walker @env0:superClass].
	^ nil
%

category: 'Grail-Class Attr Overlay'
method: object
___classBodyDefinitionalStore___: aName put: aValue
	"Bind aName on the receiver CLASS from a class-body statement whose
	binding is conditional -- the branches of a class-body ``if''
	(ClassDefAst >> emitClassBodyIfBranch:on:).

	A class attribute has two possible homes, and which one it has is fixed
	when the class is built: a name assigned UNCONDITIONALLY somewhere in the
	body gets an accessor/setter pair (a real classInstVar slot), and
	everything else gets a dynInstVars entry.  A conditional binding cannot
	know at emit time which it is dealing with -- ``x = 1'' followed by ``if
	flag: x = 2'' has an accessor, a name bound only inside the branch does
	not -- so it has to ask.

	Writing to the wrong home is not a near-miss.  ___pyAttrLoad___ consults
	the accessor BEFORE the dynInstVars store, so a branch that wrote to the
	holder while an accessor existed would be shadowed by the unconditional
	value it was supposed to replace: ``x = 1; if flag: x = 2'' answered 1.

	Deliberately NOT ___pyAttrStore___, which would be the obvious way to get
	this dispatch: that one diverts to the session-local overlay for a
	canonically-registered class, and a class-body binding is DEFINITIONAL --
	see ___classHolderAttrStore___ for what that costs."

	| setterSym getterSym v |
	"Through the class-body namespace first, when the class statement prepared
	one.  Routing it HERE rather than at the two emission sites covers both the
	single and the chained runtime store, and covers every compound form at once
	-- a binding inside a class-body ``with'' is exactly where test_enum's
	test_enum_dict_in_metaclass puts the duplicate it expects to be refused.
	With no namespace this answers aValue untouched."
	v := self ___grailNsStore___: aName value: aValue.
	setterSym := (aName @env0:asString @env0:, ':') @env0:asSymbol.
	getterSym := aName @env0:asString @env0:asSymbol.
	((self ___respondsTo___: setterSym) and: [self ___respondsTo___: getterSym])
		ifTrue: [^ self @env0:perform: setterSym env: 1 withArguments: { v }].
	^ self ___classHolderAttrStore___: aName put: v
%

category: 'Grail-Class Attr Overlay'
method: object
___classBodyDefinitionalDelete___: aName
	"``del x'' in a class body -- the inverse of
	___classBodyDefinitionalStore___:put:, and it has to look in the same three
	places, because which one holds the binding is not knowable at emit time: a
	name assigned unconditionally somewhere in the body has an accessor pair, a
	name bound only by a locals() write or a conditional branch is in the
	dynInstVars holder, and the prepared namespace has a copy of either.

	CPython's class-body ``del'' is DELETE_NAME on the body's own namespace, so
	it raises NameError when the name is not bound there -- and, in particular,
	does NOT reach an enclosing function's local or the module global of the
	same name.  ``found'' is what makes that faithful: it records whether any of
	the three actually held a value, and nothing having held one is the
	NameError case rather than a silent no-op.

	An ACCESSOR PAIR is REMOVED, not nilled.  Nilling the slot looks like the
	nil-as-absent rule the class-body reads use, but ___pyAttrLoad___ does not
	apply that rule to a class accessor: it answered the nil, so ``class C: x =
	1; del x'' left C.x reading back as a raw UndefinedObject and hasattr(C,
	'x') answering true -- a worse answer than not honouring the del at all.
	Removing the pair makes the load MISS, which is the AttributeError CPython
	gives.  Own methods only, and only the pair this class body compiled
	('Grail-Class Attrs'), so an inherited attribute is never deleted -- object
	>> ___pyAttrDelete___: scopes itself the same way and for the same reason."

	| ns getterSym setterSym holder found meta |
	found := false.
	ns := self ___grailPendingNamespace___.
	ns isNil ifFalse: [
		(ns @env1:__contains__: aName @env0:asString) ___isTruthy___ ifTrue: [
			ns @env1:__delitem__: aName @env0:asString.
			found := true]].
	getterSym := aName @env0:asString @env0:asSymbol.
	setterSym := (aName @env0:asString @env0:, ':') @env0:asSymbol.
	meta := self @env0:class.
	((meta @env0:whichClassIncludesSelector: getterSym environmentId: 1) == meta
		and: [(meta @env0:categoryOfSelector: getterSym environmentId: 1)
			@env0:= #'Grail-Class Attrs'])
		ifTrue: [
			found := true.
			meta @env0:removeSelector: getterSym environmentId: 1.
			(meta @env0:whichClassIncludesSelector: setterSym environmentId: 1) == meta
				ifTrue: [meta @env0:removeSelector: setterSym environmentId: 1]].
	holder := (self ___respondsTo___: #dynInstVars)
		ifTrue: [self @env0:perform: #dynInstVars env: 1]
		ifFalse: [nil].
	holder == nil ifFalse: [
		(holder @env0:dynamicInstVarAt: getterSym) == nil ifFalse: [
			found := true.
			holder @env0:removeDynamicInstVar: getterSym]].
	found ifFalse: [
		^ NameError ___signal___:
			'name ''' @env0:, aName @env0:asString @env0:, ''' is not defined'].
	^ self
%

category: 'Grail-Class Attr Overlay'
method: object
___classBodyDynamicRead___: aSym
	"The value a class body bound DYNAMICALLY on the receiver class -- a
	locals() write, a conditional branch, a nested class -- or nil.

	The receiver's OWN holder only, deliberately: this backs the class-body
	read of a name codegen could not see bound (NameAst), and CPython's
	LOAD_NAME there consults the class body's namespace and then the enclosing
	scopes -- never the BASES.  ___dynamicClassAttr___: walks the superclass
	chain, so using it here would let an inherited attribute of the same name
	outrank the module global the body is entitled to read."

	| holder |
	(self ___respondsTo___: #dynInstVars) ifFalse: [^ nil].
	holder := self @env0:perform: #dynInstVars env: 1.
	holder == nil ifTrue: [^ nil].
	^ holder @env0:dynamicInstVarAt: aSym
%

category: 'Grail-Class Attr Overlay'
method: object
___classHolderAttrStore___: aName put: aValue
	"Write aName into the receiver's OWN per-class ``dynInstVars'' holder --
	the committed class-attribute store that ___classChainAttrLookup___: reads.
	The receiver is a class that declares ``dynInstVars'' (every generated
	Python class does; ClassDefAst initialises the classInstVar at class-build
	time).

	Two callers, for two different reasons:

	  * ___pyAttrStore___ reaches here as the last resort for ``Cls.x = v''
	    when there is no paired setter -- but only after trying the
	    session-local overlay first.
	  * a class-body method decorator's rebinding calls it DIRECTLY, on
	    purpose.  That store is DEFINITIONAL -- part of what the class means,
	    like the class body itself -- so it must land on the committed class
	    and never in the session overlay, which ___resetClassAttrOverlay___
	    wipes on a re-import.  Routing it through ___pyAttrStore___ would put
	    it in the overlay whenever the class was already canonically
	    registered by an earlier session, and the decorator would then vanish
	    on the second import.

	Returns aValue, so it can be used as an expression."

	| holder |
	holder := self @env0:perform: #dynInstVars env: 1.
	holder == nil ifTrue: [
		holder := Object @env0:new.
		self @env0:perform: #dynInstVars: env: 1 withArguments: { holder }
	].
	holder ___pyStoreDynamic___: aName @env0:asString @env0:asSymbol put: aValue.
	^ aValue
%

category: 'Grail-Class Attr Overlay'
method: object
___classChainAttrLookup___: aSym
	"Read aSym from the per-class ``dynInstVars'' store, walking the
	receiver's class chain.  This is the COMMITTED class-attribute store --
	the home of ``setattr(cls, ...)'', of class-attr values merged from
	secondary bases (multiple inheritance; see importlib
	___mergeSecondaryBases___), of ClassDefAst's closure cells, and of the
	rebinding a class-body method decorator emits.  (Its session-local
	counterpart for canonical classes is ___classAttrOverlayLookup___:name:.)

	Walking stops at the first hit, so a subclass override (``B.x =
	'from-B''') shadows the parent value (``A.x = 'from-A''').

	MRO ORDER.  CPython walks the MRO ONCE and takes the first class whose
	__dict__ holds the name -- and a class's __dict__ holds its attributes and
	its functions together, so whichever class is NEARER wins regardless of
	which kind it supplies.  Grail splits those into two stores, and the
	callers run this whole walk BEFORE their method-wrap fallback, so without
	care an ANCESTOR's attribute beats a NEARER class's compiled method:

	    class A: pass
	    A.m = lambda self: 'attr-on-A'
	    class B(A):
	        def m(self): return 'method-on-B'
	    B().m()        # answered 'attr-on-A'

	and worse when the ancestor's attribute is not callable at all --
	a str shadowing a subclass method turned the call into
	``'Unicode7' object is not callable''.

	So a hit is only honoured when no class nearer the receiver defines aSym as
	a method; otherwise answer nil and let the caller's method path win.  That
	check runs ONLY on a hit, which keeps the common miss -- the hot path, one
	probe per instance attribute read that reaches the method-wrap fallback --
	exactly as cheap as before.

	Answers nil for absent, per the nil-as-absent convention -- values are
	Python objects (None is the None singleton, never Smalltalk nil).

	Receiver kind decides the descriptor treatment.  Read THROUGH AN INSTANCE,
	a callable class attribute binds the instance as ``self'' (Python's
	descriptor protocol) and comes back wrapped in a MethodBinding that
	prepends self to the call args.  Read off the CLASS it comes back raw,
	matching CPython's ``Cls.method'' yielding the plain function.
	Non-callable attributes (ints, strings, classes) are raw on both paths.

	A real DESCRIPTOR OBJECT -- one whose own class implements ``__get__'' --
	is neither of those: Python asks it for the value instead of handing it
	over.  ___descriptorGet___: already honoured that on the accessor-pair
	read paths; this store was the one that did not, so a class-body
	``x = SomeDescriptor()'' (or a ``@functools.cached_property'', whose
	rebinding lands right here) came back as the descriptor wrapped in a
	MethodBinding rather than the value it computes."

	| start walker holder v |
	start := (self isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	walker := start.
	[walker == nil] whileFalse: [
		(walker ___respondsTo___: #dynInstVars) ifTrue: [
			holder := walker @env0:perform: #dynInstVars env: 1.
			holder == nil ifFalse: [
				v := holder @env0:dynamicInstVarAt: aSym.
				v == nil ifFalse: [
					"A nearer class defining aSym as a method outranks this
					ancestor's stored attribute."
					(self ___methodDefinedFrom___: start upTo: walker name: aSym)
						ifTrue: [^ nil].
					((self isKindOf: Behavior)
						and: [self ___isValueDescriptor___: v])
						ifTrue: [^ self ___classDescriptorGet___: v].
					((self isKindOf: Behavior) not
						and: [self ___isValueDescriptor___: v])
						ifTrue: [^ self ___descriptorGet___: v].
					((self isKindOf: Behavior) not
						and: [self ___isDescriptorCallable___: v])
						ifTrue: [^ MethodBinding instance: self callable: v].
					^ v
				]
			]
		].
		walker := walker @env0:superClass
	].
	^ nil
%

category: 'Grail-Class Attr Overlay'
method: object
___classBodyAttrOutrankedByMethod___: aSym
	"True when this instance's class chain supplies aSym as a compiled METHOD
	nearer than the class whose BODY bound it as an attribute.

	The metaclass-side counterpart of the test ___classChainAttrLookup___:
	already makes for the dynInstVars store.  CPython holds a class's
	attributes and its functions in ONE __dict__ and lets the MRO decide, so
	the nearer class wins whichever kind it supplies.  Grail splits them --
	ClassDefAst compiles a class-body ``x = v'' to an accessor PAIR on the
	metaclass and a ``def x'' to an ordinary instance method -- and the
	class-attribute probe consulted only the metaclass side, so a BASE class's
	attribute beat a SUBCLASS's own def.

	The owner of the accessor pair identifies the class whose body did the
	binding; ``upTo:'' EXCLUDES it, so a class that both binds the attribute
	and defines the method has had the attribute assigned OVER the method and
	last-write-wins keeps the attribute -- the ordinary monkey-patch,
	unchanged.

	The pair test is also what keeps real class-side METHODS out:
	@classmethod/@staticmethod have no unary setter, are not class-body data,
	and have their own branch."

	| startClass metaclass owner |
	"Both receiver kinds, the same way ___classChainAttrLookup___: takes its
	start: reading ``Sub.enum'' off the CLASS asks the same MRO question as
	reading it off an instance, one level up."
	startClass := (self isKindOf: Behavior)
		ifTrue: [self]
		ifFalse: [self @env0:class].
	metaclass := startClass @env0:class.
	(metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1)
		== nil ifTrue: [^ false].
	owner := metaclass @env0:whichClassIncludesSelector:
		(aSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1.
	owner == nil ifTrue: [^ false].
	owner @env0:isMeta ifFalse: [^ false].
	^ self ___methodDefinedFrom___: startClass
		upTo: owner @env0:thisClass name: aSym
%

category: 'Grail-Class Attr Overlay'
method: object
___methodDefinedFrom___: startClass upTo: attrClass name: aSym
	"True when some class from startClass up to but EXCLUDING attrClass defines
	aSym as a compiled env-1 method -- i.e. a class NEARER the receiver than
	the one holding the attribute supplies the name as a method, so by MRO
	order the method wins.

	Excluding attrClass matters: a class that has BOTH a stored attribute and a
	compiled method for the name has had the attribute assigned over the method
	(``A.m = f'' on the class that defined m), and CPython's last-write-wins
	says the attribute is the current class-dict entry.  That is the ordinary
	monkey-patch, and it must keep working."

	| walker |
	walker := startClass.
	[walker == nil or: [walker == attrClass]] whileFalse: [
		(self ___definesPythonMethod___: walker name: aSym) ifTrue: [^ true].
		walker := walker @env0:superClass].
	^ false
%

category: 'Grail-Class Attr Overlay'
method: object
___definesPythonMethod___: aClass name: aSym
	"True when aClass's OWN env-1 method dictionary defines aSym in any of the
	shapes a Python ``def'' compiles to: the bare unary selector, the
	fixed-arity keyword forms, or the varargs ``_name:kw:'' forwarder.  Own
	dictionary only -- inheritance is the caller's walk."

	| md s |
	md := aClass @env0:methodDictForEnv: 1.
	md == nil ifTrue: [^ false].
	(md @env0:includesKey: aSym) ifTrue: [^ true].
	s := aSym @env0:asString.
	(md @env0:includesKey: (s @env0:, ':') @env0:asSymbol) ifTrue: [^ true].
	(md @env0:includesKey: (s @env0:, ':_:') @env0:asSymbol) ifTrue: [^ true].
	(md @env0:includesKey: (s @env0:, ':_:_:') @env0:asSymbol) ifTrue: [^ true].
	(md @env0:includesKey: (s @env0:, ':_:_:_:') @env0:asSymbol) ifTrue: [^ true].
	(md @env0:includesKey: ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol)
		ifTrue: [^ true].
	^ false
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
	user's UserGlobals (importlib compiles as the install user) -- a static
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
	(self ___respondsTo___: #dynInstVars) ifTrue: [
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
	"A FUNCTIONAL enum's _generate_next_value_ is a staticmethod in the session
	gnv-static store (functional enums have no dynInstVars holder to carry it; a
	CLASS-syntax enum already surfaces it via branch (a)).  Surface it so
	``type(cls.__dict__['_generate_next_value_']) is staticmethod'' holds
	(test_gnv_is_static Function variants).  Gated on this being an enum class so no
	non-enum __dict__ is touched."
	[((Python @env0:at: #Enum otherwise: nil) @env0:notNil)
		and: [(Enum ___grailRecordFor: self) @env0:notNil]] @env0:value ifTrue: [
		| gnvSm |
		gnvSm := Enum ___grailGnvStaticFor: self.
		gnvSm @env0:isNil ifFalse: [d @env0:at: '_generate_next_value_' put: gnvSm]].
	^ d
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___classCell___: aSym
	"Closure-cell read for class-method bodies.  The cell is a zero-arg block
	captured at class-DEFINITION time (see ClassDefAst / NameAst's
	closure-cell branch) that closes over the enclosing-function local BY
	REFERENCE; evaluating it here reads the local's CURRENT value, so a value
	bound after the classdef is visible (CPython by-reference cells).  Works
	for instance- and class-side receivers; the chain walk lets subclasses
	inherit the cells.  An absent cell, or a cell whose local is still
	unbound (Smalltalk nil), is a NameError."

	| blk v meta |
	blk := self ___dynamicClassAttr___: aSym.
	"A metaclass method invoked with the USING class as self: ``isinstance(other,
	M)'' inside M's own method reads a cell stored on M, but self is the class
	that named M as its metaclass and M is not in its chain -- Grail records a
	metaclass rather than making the class an instance of it.  Fall back to the
	recorded metaclass's chain, which is where that cell lives."
	blk @env0:isNil ifTrue: [
		meta := self ___grailMetaclass___.
		meta == nil ifFalse: [blk := meta ___dynamicClassAttr___: aSym]].
	v := blk @env0:isNil ifTrue: [nil] ifFalse: [blk @env0:value].
	v == nil ifTrue: [
		NameError ___signal___: ('free variable '''
			@env0:, (aSym @env0:asString @env0:copyFrom: 9 to: aSym @env0:asString @env0:size - 3)
			@env0:, ''' referenced before assignment in enclosing scope')].
	^ v
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___classCellSetter___: aSym
	"Closure-cell WRITE for class-method bodies: the counterpart to
	``___classCell___:'' for ``nonlocal x; x = ...'' inside a method.  The
	stored value is a ONE-ARG block ``[:v | <local> := v]'' captured at
	class-DEFINITION time that assigns the enclosing-function local BY
	REFERENCE, so a mutation from the method is visible to the enclosing
	scope (CPython by-reference cells).  Answers the block; the caller sends
	it ``value: <newValue>''.  A missing setter cell means codegen failed to
	register the write -- a NameError (catchable) beats a bare DNU."

	| blk |
	blk := self ___dynamicClassAttr___: aSym.
	blk @env0:isNil ifTrue: [
		NameError ___signal___: ('free variable '''
			@env0:, (aSym @env0:asString @env0:copyFrom: 15 to: aSym @env0:asString @env0:size - 3)
			@env0:, ''' has no enclosing binding to assign')].
	^ blk
%

category: 'Grail-Initialization'
method: object
___pyBuiltinSubclassInit___: positional kw: keywords new: hasNew
	"Initialise a built-in subclass instance during Cls(*args, **kw) when the
	subclass defines no __init__ of its own (the state is inherited from the
	built-in type's __init__).  ClassDefAst emits this on the general
	(runtime-allocated) construction path, so it works for DYNAMIC bases --
	``class T(self.type2test)'' -- detecting the built-in kind by isKindOf at
	RUNTIME.  Handles list, set/frozenset and complex; any other receiver is a
	NO-OP, leaving ordinary classes unaffected.

	Named ...SubclassInit rather than the original ...CollectionInit because
	complex -- a SCALAR -- joined the list: what a built-in subclass inherits
	is not always elements.  A plain ``class C(complex): pass'' was allocated
	and then left completely uninitialised, so ``C(3, 4).real'' answered the
	BOUND METHOD ``real'' rather than 3.0, and anything that then did
	arithmetic on it died in Smalltalk rather than raising a Python error.

	``hasNew'' = the class overrode __new__.  CPython then makes the
	inherited __init__ lenient about the leftover constructor args __new__
	already consumed (test_list test_keywords_in_subclass's subclass_with_new
	passes newarg=... which __new__ handled); when false, list()'s strict
	arity applies (at most one positional iterable, no keyword arguments)."

	(self @env0:isKindOf: OrderedCollection) ifTrue: [
		hasNew ifFalse: [
			(keywords @env0:notNil and: [keywords @env0:isEmpty @env0:not]) ifTrue: [
				TypeError ___signal___: 'list() takes no keyword arguments'].
			(positional @env0:size @env0:> 1) ifTrue: [
				TypeError ___signal___: ('list expected at most 1 argument, got '
					@env0:, positional @env0:size @env0:printString)]].
		positional @env0:isEmpty ifFalse: [
			self @env1:__init__: (positional @env0:at: 1)]].
	"A mutable-set subclass (``class S(set)'') is allocated empty by the general
	 path, then populated from its iterable argument via update (which coerces
	 like set.__new__:).  frozenset subclasses are immutable once allocated, so
	 they are NOT handled here (they build populated through __new__)."
	((self @env0:isKindOf: set) and: [(self @env0:isKindOf: frozenset) @env0:not]) ifTrue: [
		"This method only runs when the subclass has no __init__ of its own, so
		keyword arguments can never be consumed -- reject them even when __new__
		took the positionals (bpo-43413: ``disallow kwargs in __new__ only'',
		test_keywords_in_subclass's subclass_with_new)."
		((keywords @env0:notNil and: [keywords @env0:isEmpty @env0:not]) and: [(self @env0:class ___hasUserInit___) @env0:not]) ifTrue: [
			TypeError ___signal___: 'set() takes no keyword arguments'].
		hasNew ifFalse: [
			(positional @env0:size @env0:> 1) ifTrue: [
				TypeError ___signal___: ('set expected at most 1 argument, got '
					@env0:, positional @env0:size @env0:printString)]].
		positional @env0:isEmpty ifFalse: [
			self update: (positional @env0:at: 1)]].
	"A frozenset subclass is immutable and already populated through __new__;
	only the keyword-argument rule still applies to it.  Unlike set (which has
	its own strict set.__init__, so a kwarg is rejected even when __new__ took
	it -- above), frozenset has NO __init__ of its own: it inherits the LENIENT
	object.__init__, which ignores leftover constructor args when the subclass
	overrode __new__.  So reject kwargs only when NEITHER __new__ NOR __init__
	is overridden (a plain frozenset subclass); a subclass_with_new already
	consumed the kwarg in its __new__ (bpo-43413 disallows kwargs for the
	DEFAULT new/init pair only -- test_keywords_in_subclass's frozenset case
	expects subclass_with_new(arg, newarg=3) to succeed, while its set case
	expects the same call to raise)."
	(self @env0:isKindOf: frozenset) ifTrue: [
		((keywords @env0:notNil and: [keywords @env0:isEmpty @env0:not])
			and: [hasNew @env0:not and: [(self @env0:class ___hasUserInit___) @env0:not]]) ifTrue: [
			TypeError ___signal___: 'frozenset() takes no keyword arguments']].

	"A complex subclass carries its value in the ``real''/``imag'' dynamic
	instVars complex>>__init__:_: writes.  The general allocation path never
	wrote them, so a plain ``class C(complex): pass'' produced an instance
	whose ``.real'' resolved to the METHOD of that name -- the source of
	``must be real number, not BoundMethod'' and of a Smalltalk
	MessageNotUnderstood escaping from __repr__.

	Delegating to complex's own varargs constructor rather than re-deriving the
	parts keeps ONE definition of the conversion rules (a lone argument may
	itself be complex, or reach the value through __complex__ / __float__; the
	one- and two-argument forms mean different things), so this cannot drift
	from complex(...)."
	(self @env0:isKindOf: complex) ifTrue: [
		| v |
		"A subclass with its own __new__ has ALREADY built the value.  complex
		is immutable -- it keeps no __init__ of its own, and CPython's is
		object's, which does nothing -- so re-deriving the parts from the raw
		constructor arguments would OVERWRITE what __new__ computed:
		test_constructor's complex1 doubles its argument in __new__, and
		complex(complex1(1j)) came back 1j instead of 2j."
		hasNew ifTrue: [^ self].
		v := complex @env1:_new: positional kw: keywords.
		self @env1:__init__: (v @env1:real) _: (v @env1:imag)].
	^ self
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

	| cls sym1 v |
	cls := self @env0:class.
	"Canonical-class overlay first: setattr(Cls, '__add__', fn) at runtime
	lands session-locally and must shadow the committed accessor pair."
	(self ___classAttrOverlayLookup___: cls name: baseSym)
		@env0:ifNotNil: [:___ovv | ^ ___ovv].
	sym1 := (baseSym @env0:asString @env0:, ':') @env0:asSymbol.
	"``cls ___respondsTo___: s'' asks whether the CLASS cls understands s
	class-side (i.e. its metaclass chain defines s) -- what the old
	``cls class whichClassIncludesSelector: s environmentId: 1'' probed."
	((cls ___respondsTo___: baseSym)
		and: [cls ___respondsTo___: sym1])
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

	| rcvr |
	(aValue isKindOf: MethodBinding) ifTrue: [^ false].
	(aValue isKindOf: BoundMethod) ifTrue: [
		"...but NOT a BUILT-IN function.  CPython binds a plain Python function
		stored in a class dict and does NOT bind a builtin one -- a C function
		is not a descriptor -- which is why test_functools can write
		``cmp_to_key = c_functools.cmp_to_key'' bare where the pure-Python
		variant has to write ``staticmethod(py_functools.cmp_to_key)''.

		Grail spells both as a BoundMethod on a module instance, and the module
		itself is the discriminator: one implemented in Smalltalk and filed in
		(functools, operator, ...) is the builtin, and has no ``__file__''; one
		compiled from Python source does, and its top-level defs are plain
		functions that bind like any other.

		Without this, ``self.cmp_to_key(cmp1)'' passed the TEST CASE as the
		comparison function -- the wrapper then tried to call it, and the whole
		of TestCmpToKeyC died on the resulting arity error rather than on
		anything to do with cmp_to_key."
		rcvr := aValue @env0:receiver.
		^ ((rcvr isKindOf: module)
			and: [(rcvr @env0:dynamicInstVarAt: #'__file__') == nil]) not].
	(aValue isKindOf: ExecBlock) ifTrue: [^ true].
	"UnboundMethod -- what ``Cls.m'' answers, i.e. CPython's plain function
	taking self first.  A decorator that returns its argument unchanged
	(``@unittest.skipIf'' with a false condition, ``@unittest.skip'', any
	register-and-return decorator) makes the class attribute exactly this, and
	reading it back through an INSTANCE has to bind self like any other
	function in a class dict.  Without it, unittest called the stored test
	method with no instance: ``TypeError: unbound method 'test_x' must be
	called with an instance as the first argument''."
	(aValue isKindOf: UnboundMethod) ifTrue: [^ true].
	"A Grail module's stand-in for a plain Python FUNCTION stored in a class
	dict -- functools.total_ordering's synthesised comparisons are instances,
	not defs, because Smalltalk cannot mint a Python function.  Like a def they
	must bind self when read through an INSTANCE, or ``a.__le__(b)'' calls the
	synthesised operator with no receiver.  Recognised by a marker they answer
	rather than by class, so this predicate need not know the module classes
	that mint them; the PythonInstance gate keeps the probe off the ordinary
	non-callable class attribute, which is what usually reaches here."
	((aValue isKindOf: PythonInstance)
		and: [aValue ___respondsTo___: #'___pyBindsSelf___'])
		ifTrue: [
			"The marker is ASKED, not merely detected: whether one of these
			stands in for a function that binds self can depend on what it
			wraps.  functools.singledispatchmethod answers false over a
			@classmethod / @staticmethod, neither of which binds an instance."
			^ aValue ___pyBindsSelf___ == true].
	"Same marker, asked of anything else that reached here.  Not every
	function stand-in is a PythonInstance: LruCacheWrapper is a plain Object
	subclass, so an lru_cache-wrapped METHOD read off an instance was not
	bound and the wrapper received the first ARGUMENT as its receiver --
	``a.f(1)'' invoked the wrapped method with 1 as self.

	Reached only after the BoundMethod / ExecBlock / UnboundMethod /
	PythonInstance branches above, so the extra probe falls on plain data
	class attributes; measured at no change on a class-attribute read
	benchmark."
	(aValue ___respondsTo___: #'___pyBindsSelf___')
		ifTrue: [^ aValue ___pyBindsSelf___ == true].
	^ false
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___chainOwnsAnyOf___: family orUnary: aSym from: aClass
	"True when any class in aClass's chain defines the unary aSym or any
	selector in family, in env 1.

	Same answer as asking whichClassIncludesSelector: for each in turn, but in
	one pass: the per-selector form re-walks the whole chain each time, and
	every step of every walk re-fetches that class's env-1 method dictionary
	-- which on this build is a merge of the persistent and the transient
	(session method) dicts, i.e. the expensive part, done eightfold."

	| walker dict |
	walker := aClass.
	[walker == nil] whileFalse: [
		dict := walker @env0:methodDictForEnv: 1.
		dict == nil ifFalse: [
			(dict @env0:includesKey: aSym) ifTrue: [^ true].
			1 to: 7 do: [:i |
				(dict @env0:includesKey: (family @env0:at: i)) ifTrue: [^ true]]].
		walker := walker @env0:superClass].
	^ false
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___metaChainOwnsAnyOf___: family from: metaclass
	"True when some TRUE METACLASS in metaclass's chain defines any selector
	in family -- the @classmethod / @staticmethod probe in ___pyAttrLoad___.

	Equivalent to asking whichClassIncludesSelector: for each selector in turn
	and testing whether the owner isMeta, but in one pass: the metaclass chain
	runs meta-first and ends in the kernel tail (Class, Behavior, Object),
	which is not meta, so a selector whose nearest owner is non-meta is one
	this walk skips and the per-selector form would have rejected.

	The point is fetching each class's method dictionary ONCE per walk instead
	of once per selector per walk."

	| walker dict |
	walker := metaclass.
	[walker == nil] whileFalse: [
		walker @env0:isMeta ifTrue: [
			dict := walker @env0:methodDictForEnv: 1.
			dict == nil ifFalse: [
				1 to: 7 do: [:i |
					(dict @env0:includesKey: (family @env0:at: i)) ifTrue: [^ true]]]].
		walker := walker @env0:superClass].
	^ false
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___selectorFamilyFor___: aSym string: aString
	"The seven Smalltalk selectors the attribute name aSym can have compiled
	to -- ``n:'', ``n:_:'' .. ``n:_:_:_:_:_:'', and the varargs ``_n:kw:'' --
	in that order.

	Memoised per name because ___pyAttrLoad___ built all seven on EVERY
	attribute load that got past the instance-slot probe: seven string
	concatenations and seven asSymbol interns, each a symbol-table hash and
	probe, and most of them discarded unused by whichever branch ran.  The
	answer depends only on the NAME, never on the receiver or on what is
	currently compiled, so it can be cached without any invalidation.

	SessionTemps, not a class variable: the registry is pure session-local
	scratch, and a committed one would be a multi-user write conflict on a
	shared stone for no benefit.

	Only SYMBOLS are cached.  A String reaches here from getattr() with a
	computed name; interning those as cache keys would let an unbounded
	number of one-shot names accumulate for the rest of the session, so they
	are built fresh instead -- the same work as before this memo existed."

	| reg family |
	aSym @env0:isSymbol ifFalse: [^ self ___buildSelectorFamily___: aString].
	reg := SessionTemps @env0:current @env0:at: #GrailSelectorFamilies otherwise: nil.
	reg == nil ifTrue: [
		reg := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailSelectorFamilies put: reg].
	family := reg @env0:at: aSym otherwise: nil.
	family == nil ifTrue: [
		family := self ___buildSelectorFamily___: aString.
		reg @env0:at: aSym put: family].
	^ family
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___buildSelectorFamily___: aString
	"Build the seven selectors for one attribute name.  ``Array with:'' tops
	out at six arguments, so the slots are filled by index."

	| family |
	family := Array @env0:new: 7.
	family @env0:at: 1 put: (aString @env0:, ':') @env0:asSymbol.
	family @env0:at: 2 put: (aString @env0:, ':_:') @env0:asSymbol.
	family @env0:at: 3 put: (aString @env0:, ':_:_:') @env0:asSymbol.
	family @env0:at: 4 put: (aString @env0:, ':_:_:_:') @env0:asSymbol.
	family @env0:at: 5 put: (aString @env0:, ':_:_:_:_:') @env0:asSymbol.
	family @env0:at: 6 put: (aString @env0:, ':_:_:_:_:_:') @env0:asSymbol.
	family @env0:at: 7 put: ('_' @env0:, aString @env0:, ':kw:') @env0:asSymbol.
	^ family
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___classDescriptorGet___: aValue
	"Python's descriptor read off the CLASS: ``__get__(None, cls)''.  The
	instance form lives in ___descriptorGet___:.

	Mostly a no-op -- a descriptor with nothing to bind absent an instance
	answers itself, which is what functools.cached_property does and what
	makes ``Cls.attr'' the descriptor rather than its value.  classmethod is
	the one that does bind here: ``A.cm'' is bound to A, no instance in
	sight."

	(self ___isValueDescriptor___: aValue) ifFalse: [^ aValue].
	(aValue ___respondsTo___: #'___get__:kw:')
		ifTrue: [^ aValue ___get__: { None. self } kw: nil].
	^ aValue __get__: None _: self
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___isValueDescriptor___: aValue
	"True if aValue is a real DESCRIPTOR OBJECT: a Python object whose own
	class implements ``__get__'', so a read through an instance must ask it
	for the value rather than hand the object back (bound or raw).
	functools.cached_property is the in-tree one; a user's ``class
	LocaleRegexDescriptor'' is the same shape.

	Deliberately narrow:

	  * PythonInstance only.  Grail's own function stand-ins (BoundMethod,
	    UnboundMethod, ExecBlock) also answer ``__get__'' -- BoundMethod for
	    explicit callers like weakref.WeakMethod -- but Grail performs method
	    binding elsewhere, and routing them here would rebind every function
	    stored as a class attribute (___descriptorGet___: excludes BoundMethod
	    for exactly that reason).

	  * Anything answering ___pyBindsSelf___ is left to
	    ___isDescriptorCallable___:.  Those (singledispatchmethod,
	    partialmethod, total_ordering's operators) are function stand-ins that
	    bind self through a MethodBinding; several also define ``__get__'' for
	    explicit callers, and the MethodBinding is the path their call
	    protocol expects."

	"PropertyDescriptor (the ``property'' builtin and subclasses) is a
	statically-defined Smalltalk class, NOT a PythonInstance, yet it is a genuine
	DATA descriptor: an instance read of ``x = property(...)'' bound via
	setattr (dynInstVars, not the class-body accessor pair) must ask it for the
	value rather than hand it back.  Answered here so the shared descriptor-get
	paths (___classChainAttrLookup___, the overlay lookups) treat it uniformly."
	(aValue @env0:isKindOf: PropertyDescriptor) ifTrue: [^ true].
	(aValue isKindOf: PythonInstance) ifFalse: [^ false].
	"ASK the marker, do not merely detect it.  Whether one of these binds self
	can depend on what it wraps: functools.partialmethod answers false over a
	@staticmethod (nothing to bind) or a @classmethod (the CLASS binds, not the
	instance), and those cases want the __get__ route below rather than a
	MethodBinding on the receiver."
	(aValue ___respondsTo___: #'___pyBindsSelf___')
		ifTrue: [(aValue ___pyBindsSelf___ == true) ifTrue: [^ false]].
	^ (aValue ___respondsTo___: #'___get__:kw:')
		or: [aValue ___respondsTo___: #'__get__:_:']
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
				stream := AppendStream @env0:on: String @env0:new.
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
___pyStoreDynamic___: aSym put: aValue
	"Store a Python attribute, turning GemStone's dynamic-instVar ceiling into a
	CATCHABLE Python exception.

	Grail keeps Python attributes as GemStone dynamic instVars, which cap at 255
	PER OBJECT, so every Python object -- class, instance or module -- has a
	hard 255-attribute ceiling (§9.41).  Crossing it signalled ImproperOperation
	(error 2484), a SMALLTALK error: it never passes through the env-1 mapping
	that makes Smalltalk errors catchable from Python, so ``except Exception''
	did not see it and Python code could neither defend against the limit nor
	detect it.  A probe written in Python simply died.

	CPython has no such limit and raises nothing here, so ANY exception is
	non-conformant.  That is not the choice being made: the choice is between an
	uncatchable Smalltalk error and a catchable Python one, and §9.10's argument
	applies -- a wrong-but-catchable failure is recoverable, an uncatchable one
	is not.  MemoryError is the closest Python has to ``this object cannot hold
	any more'', and the message names the real limit rather than pretending to
	be CPython.

	Only the ATTRIBUTE-store sites route through here.  The load path's
	memoisation caches store dynamic instVars too, but a cache that cannot be
	filled should fall back silently rather than raise."

	^ [self @env0:dynamicInstVarAt: aSym put: aValue]
		@env0:on: Error
		do: [:ex |
			"Match on the reason, not the class: ImproperOperation covers more
			than this one condition."
			(((ex @env0:messageText ifNil: ['']) @env0:asString)
				@env0:indexOfSubCollection: 'more than 255 dynamic instVars') @env0:> 0
				ifTrue: [
					MemoryError ___signal___: 'cannot set attribute '''
						@env0:, aSym @env0:asString @env0:,
						''': a Grail object holds at most 255 attributes (GemStone '
						@env0:, 'dynamic instVar limit); see section 9.41']
				ifFalse: [ex @env0:pass]]
%

category: 'Grail-Attribute Protocol'
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

	| sym1 sym2 sym3 sym4 sym5 sym6 symVA s isModule isGenerated dynValue owner family |
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
	(self ___respondsTo___: #'___pyHasSlots___') ifTrue: [
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
	"The eight selectors one attribute name can compile to.  Building them is
	seven concatenations and seven SYMBOL INTERNINGS -- a symbol-table hash
	and probe each -- on every attribute load that gets past the instance
	slot, whether or not the branch taken ever looks at them.  Memoised per
	name; see ___selectorFamilyFor___:.

	5- and 6-arg fixed selectors are in the family because generated/library
	code does declare methods this wide with no defaults (twilio's
	``Session.merge_environment_settings(self, url, proxies, stream, verify,
	cert)``), and without the probe the attribute load AttributeErrors even
	though the method exists.  BoundMethod's _selectorForArgCount: already
	builds any arity at call time."
	family := self ___selectorFamilyFor___: aSym string: s.
	sym1 := family @env0:at: 1.
	sym2 := family @env0:at: 2.
	sym3 := family @env0:at: 3.
	sym4 := family @env0:at: 4.
	sym5 := family @env0:at: 5.
	sym6 := family @env0:at: 6.
	symVA := family @env0:at: 7.
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

		| dValue |
		"Phase A: dynamic-instVar storage is the canonical home for
		module globals -- checked BEFORE the varargs-selector probe so a
		module-level decorator's rebinding wins over the original
		compiled def (``@functools.singledispatch def g'' stores the
		wrapper in g's slot while ``_g:kw:'' still exists; the bare-call
		dispatcher and module.gs's resolution already use this order).
		Per the nil-as-absent convention, a nil read means unset."
		dValue := self @env0:dynamicInstVarAt: aSym.
		dValue == nil ifFalse: [^ dValue].
		"Cache the wrapper in the slot so repeated reads of the same
		module function return the SAME object -- CPython functions are
		first-class module attributes with stable identity
		(g.dispatch(int) is g_int)."
		(self ___respondsTo___: symVA) ifTrue: [
			dValue := BoundMethod receiver: self selector: aSym.
			self @env0:dynamicInstVarAt: aSym put: dValue.
			^ dValue
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
					dValue := BoundMethod receiver: self selector: aSym.
					self @env0:dynamicInstVarAt: aSym put: dValue.
					^ dValue]
				ifFalse: [^ self @env0:perform: aSym env: 1]
		].
		((self ___respondsTo___: sym1)
			or: [(self ___respondsTo___: sym2)
			or: [(self ___respondsTo___: sym3)
			or: [(self ___respondsTo___: sym4)
			or: [(self ___respondsTo___: sym5)
			or: [self ___respondsTo___: sym6]]]]]) ifTrue: [
			dValue := BoundMethod receiver: self selector: aSym.
			self @env0:dynamicInstVarAt: aSym put: dValue.
			^ dValue
		].
		^ self @env0:at: aSym ifAbsent: [
			"CPython names the module: ``module 'io' has no attribute 'nope'''."
			AttributeError ___signal___: 'module ''' @env0:,
				((self @env0:dynamicInstVarAt: #'__name__') @env0:ifNil: ['?'])
					@env0:asString @env0:,
				''' has no attribute ''' @env0:, s @env0:, ''''
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
	"``__class__'' is skipped here when the Python class body DECLARED one:
	CPython lets a user ``__class__'' property override the default, and the
	legacy abstract-class protocol depends on it -- test_isinstance's
	AbstractInstance is recognised only through
	``__class__ = property(getclass)''.  Taking the shortcut answered the real
	Smalltalk class instead, so isinstance(AbstractSuper(), AbstractSuper) was
	False and a getter that raises was never called (two ``RuntimeError not
	raised'' failures).  ``__doc__'' is NOT gated: ClassDefAst gives EVERY class
	a __doc__ accessor, so the same test would skip the shortcut for every
	object."
	((s @env0:= '__class__' or: [s @env0:= '__doc__'])
		and: [(self ___respondsTo___: aSym)
			and: [(s @env0:= '__class__') @env0:not
				or: [(self ___declaresOwnClassAttr___: aSym) @env0:not]]])
			ifTrue: [^ self @env0:perform: aSym env: 1].
	(self isKindOf: Behavior) ifTrue: [
		"Class-level dunders that should always read as values, never
		wrap as BoundMethods.  Without this, ``type(node).__name__``
		on any class would wrap the inherited Behavior-side getter
		and break visitor dispatch
		(``getattr(self, 'visit_' + type(node).__name__)``)."
		((s @env0:= '__name__' or: [s @env0:= '__module__' or: [s @env0:= '__qualname__' or: [s @env0:= '__mro__' or: [s @env0:= '__base__' or: [s @env0:= '__bases__']]]]])
			and: [self ___respondsTo___: aSym])
				ifTrue: [^ self @env0:perform: aSym env: 1].
		"Python ``cls.__module__`` for the built-in TYPE objects (int, list,
		tuple, set, ...): CPython reports 'builtins'.  Only fires when the
		class has no own __module__ accessor (the branch above), so user
		classes and class-enums keep their real module ('__main__', ...).
		___pythonBuiltinTypeModule___ answers nil for everything that is not
		a genuine built-in type — critically for dynamically created classes
		(functional-API enums), which MUST fall through: reporting 'builtins'
		for them broke enum pickling (the class is not found in builtins)."
		"A METACLASS is a Behavior too, and its own metaclass chain runs to
		Metaclass3 rather than to ``object class'' -- so it does not inherit
		___pythonBuiltinTypeModule___, and sending it blindly turned
		``EnumType.__module__'' into a raw Smalltalk MessageNotUnderstood
		escaping out of getattr(), where CPython answers a string.  Ask the
		class it is the metaclass OF: CPython defines a metaclass in the same
		module as the class it builds, which is what makes
		``type(Color).__module__'' report 'enum'."
		(s @env0:= '__module__')
			ifTrue: [
				(self ___respondsTo___: #'___pythonBuiltinTypeModule___')
					ifTrue: [
						(self ___pythonBuiltinTypeModule___)
							@env0:ifNotNil: [:___m | ^ ___m]]
					ifFalse: [
						(self @env0:isKindOf: Metaclass3) ifTrue: [
							| tc |
							tc := self @env0:thisClass.
							(tc @env0:notNil and: [
								tc ___respondsTo___: #'___pythonBuiltinTypeModule___'])
								ifTrue: [
									(tc ___pythonBuiltinTypeModule___)
										@env0:ifNotNil: [:___m | ^ ___m]]]]].
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
		"MRO precedence: a DEFINITIONAL per-class store (a nested class def
		``class Sub: class cls: ...'', an if-branch binding) lands in THIS class's
		OWN dynInstVars and must beat a same-named accessor INHERITED from a base --
		``class Sub(Base): class cls: ...'' where Base declares ``cls = None'' must
		answer Sub's nested class, not Base's None (test_property's
		PropertyUnreachable mixins).  The setter-paired accessor branch below walks
		the whole metaclass chain and would find the inherited accessor first, so
		this own-store check runs ahead of it.  Gated on the name being in the
		class's OWN holder, so accessor-backed and inherited-only reads are
		untouched."
		(self ___ownDynInstVarHas___: aSym)
			ifTrue: [
				(self ___classChainAttrLookup___: aSym)
					@env0:ifNotNil: [:___dv | ^ ___dv]].
		"Setter-paired class-level accessor on a Python user class —
		value attribute (``class C: X = 1``).

		``__new__'' is excluded, and is the ONE name that has to be: the pair
		this branch looks for is a SYNTHESISED getter+setter, but the metaclass
		chain bottoms out at ``object class'', which defines the allocator in
		BOTH arities -- unary ``__new__'' and 1-arg ``__new__: cls''.  Those are
		two arities of one method, not a getter and a setter, so the heuristic
		read ``Cls.__new__'' as a value attribute and PERFORMED the unary
		allocator: every ``Cls.__new__'' on a PythonInstance-rooted class
		CONSTRUCTED an instance instead of answering the function
		(``Enum.__new__'' was ``<Enum.nil: nil>'', ``Plain.__new__'' a fresh
		``<Plain object>'').  Sweeping every dunder that resolves off a user
		class shows __new__ alone is affected -- __init__/__str__/__eq__/... have
		no unary class-side twin and already resolve correctly -- so the
		exclusion is exactly as narrow as the defect.  This mirrors the
		binary-dunder mis-fire ___pyAttrStore___ guards against on the store
		side, where ``__eq__:'' looks like a setter for the same reason."
		"...and the MRO rule -- see ___classBodyAttrOutrankedByMethod___:.  A
		SUBCLASS's own ``def x'' outranks the accessor pair a BASE class body
		emitted for ``x = v'', on the class side exactly as on the instance
		side: ``Sub.enum'' must answer Sub's function, not Base's value."
		((aSym ~~ #'__new__')
			and: [(self @env0:inheritsFrom: PythonInstance)
			and: [(self ___respondsTo___: aSym)
				and: [(self ___respondsTo___: sym1)
				and: [(self ___classBodyAttrOutrankedByMethod___: aSym) not]]]])
			ifTrue: [
				^ self ___classDescriptorGet___: (self @env0:perform: aSym env: 1)
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
		"The MRO rule on the CLASS side -- see ___classBodyAttrOutrankedByMethod___:.
		``Sub.enum'' must answer Sub's own def, not the attribute Base's body
		bound, exactly as ``Sub().enum'' must."
		(owner notNil
			and: [((owner @env0:categoryOfSelector: aSym environmentId: 1) @env0:= #'Grail-Class Attrs')
			and: [(self ___classBodyAttrOutrankedByMethod___: aSym) not]])
			ifTrue: [^ self ___classDescriptorGet___: (self @env0:perform: aSym env: 1)].
		"Per-class dynamic attr store — the home of setattr(cls, ...)
		fallbacks AND of class-attr values merged from SECONDARY bases
		(multiple inheritance; see importlib ___mergeSecondaryBases___).
		A Behavior receiver gets the raw value (CPython's ``Cls.method'' is
		the plain function); the descriptor binding in the shared helper
		applies only to instance receivers."
		(self ___classChainAttrLookup___: aSym)
			@env0:ifNotNil: [:___cv | ^ ___cv].
		"...then the recorded ``metaclass='', which is where Python looks after
		the class's own dict: reading an attribute off a CLASS consults its TYPE,
		and for ``class C(metaclass=M)'' that is M.  A DESCRIPTOR found there is
		asked for its value with the class as the instance -- CPython's
		``type(cls).__mro__'' lookup followed by ``__get__(cls, type(cls))'' --
		which is what makes a metaclass-level cached_property reachable as
		``C.prop''.  Grail records the metaclass rather than building the class
		through it, so the consult happens here."
		(self ___grailMetaclass___) @env0:ifNotNil: [:___meta |
			(___meta ___classChainAttrLookup___: aSym)
				@env0:ifNotNil: [:___mv | ^ self ___descriptorGet___: ___mv].
			"...and a compiled ``def'' on the metaclass, which the attribute
			lookup above cannot see -- a two-parameter def is the selector
			``name:'', not the unary ``name''.  Reached as a BOUND method with
			this class as its cls parameter, exactly as CPython binds a metaclass
			method accessed through the class: ``Integer.__subclasscheck__(int)''
			runs ABC.__subclasscheck__(Integer, int).  BoundMethod dispatches it
			non-virtually off definingClass, since the class is not a Smalltalk
			instance of the metaclass."
			(___meta ___chainOwnsAnyOf___: family orUnary: aSym from: ___meta)
				ifTrue: [^ BoundMethod receiver: self selector: aSym
					definingClass: ___meta]].
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
		"ONE walk of the chain probing all eight selectors at each class, not
		eight walks of one selector each -- and each walk re-fetches every
		class's env-1 method dictionary, which on this build is a MERGE of the
		persistent and the transient (session method) dicts.  This was the
		single hottest lookup site in the suite."
		(self ___chainOwnsAnyOf___: family orUnary: aSym from: self)
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
		or: [(self isKindOf: AbstractPyInt)
		or: [(((self isKindOf: CharacterCollection)
				or: [(self isKindOf: AbstractPyFloat)
				or: [self isKindOf: AbstractPyStr]])
			and: [((Python @env0:at: #Enum otherwise: nil) @env0:notNil)
				and: [(Enum ___grailRecordFor: self @env0:class) @env0:notNil]])]].
	"Walk the full class chain for both the unary getter and the
	1-arg setter — TestResponse(Response) inherits ``status'' /
	``status:'' through two parent classes; checking only the
	receiver's own ``methodDictForEnv:'' dict misses inherited
	pairs and wraps the unary as a BoundMethod instead of treating
	it as a property read."
	"A FIXED-ARITY FORWARDER is not a setter.  ``m:'' generated by ClassDefAst
	as an arity-1 entry point into a varargs body (§9.36) is shape-identical to
	a synthesized property setter, so without this the pair test fires on an
	ordinary method and PERFORMS the unary getter -- answering its RESULT where
	Python answers a bound method.  Measured, not reasoned: it broke ``import
	werkzeug.local'' through re/_parser's ``State.opengroup(self, name=None)'',
	whose result is a group id that the call site then tried to call.  The
	forwarders carry their own method category precisely so they can be told
	apart here, and the probe runs only when both spellings exist."
	(isGenerated
		and: [(self ___respondsTo___: sym1)
			and: [(self ___respondsTo___: aSym)
				and: [ | ___setterOwner |
					___setterOwner := self @env0:class
						@env0:whichClassIncludesSelector: sym1 environmentId: 1.
					___setterOwner == nil
						or: [(___setterOwner @env0:categoryOfSelector: sym1
								environmentId: 1) @env0:asString
							@env0:~= 'Grail-Fixed Arity Forwarders']]]])
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
		| metaclass |
		"Canonical-class overlay first: an ``self.x'' read falling back to
		the class must see a runtime ``Cls.x = v'' overlay store before the
		committed class-body accessor -- with the SAME descriptor binding the
		committed per-class dynInstVars path applies below: a callable stored
		as a class attribute and read through an INSTANCE binds self via a
		MethodBinding (``Box.greet = fn; b.greet(x)'' -> fn(b, x)).
		___descriptorGet___ is wrong here -- it excludes BoundMethod and would
		return the function unbound, dropping self.  A real descriptor OBJECT
		(one whose own class implements __get__ -- a cached_property assigned
		with ``Foo.cp = cached_property(f)'') is the exception: Python asks it
		for the value, exactly as on the committed path."
		(self ___classAttrOverlayLookup___: self @env0:class name: aSym)
			@env0:ifNotNil: [:___ovv |
				(self ___isValueDescriptor___: ___ovv)
					ifTrue: [^ self ___descriptorGet___: ___ovv].
				(self ___isDescriptorCallable___: ___ovv)
					ifTrue: [^ MethodBinding instance: self callable: ___ovv].
				^ ___ovv].
		metaclass := self @env0:class @env0:class.
		((metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
			and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			and: [(self ___classBodyAttrOutrankedByMethod___: aSym) not]]) ifTrue: [
			"Same descriptor treatment as the overlay path just above: a callable
			class attribute (function/UnboundMethod/lambda) read through an
			instance binds self via a MethodBinding, so a class-body ``m =
			OtherClass.method'' runs ``method(self, ...)'' rather than handing
			back the raw handle to be called with no receiver (test_userlist
			test_repr_deep; the general ``greet2 = Base.greet'' idiom)."
			^ self ___instanceClassAttrGet___: (self @env0:class @env0:perform: aSym env: 1)
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
		"ONE walk of the metaclass chain probing all seven selectors at each
		class, rather than seven walks probing one selector each.  Each walk
		re-fetched every class's env-1 method dictionary, and on this build
		that dictionary is a MERGE of the persistent and transient (session
		method) dicts -- so the seven walks did sevenfold the expensive part.
		whichClassIncludesSelector: was 26% of the profiled suite's total time,
		two thirds of it from right here."
		"...and the SAME MRO rule for the class-side wrap.  Suppressing only the
		attribute probe above hands the name to this branch instead, which
		answers a BoundMethod bound to the CLASS -- the same wrong answer
		wearing a different hat.  The test is precise about which names it
		catches: it requires the accessor PAIR a class-body ``x = v'' emits, and
		a @classmethod has no unary setter, so real class-side methods are
		untouched."
		((self ___classBodyAttrOutrankedByMethod___: aSym) not
			and: [self ___metaChainOwnsAnyOf___: family from: metaclass])
			ifTrue: [
				"...unless a class-attribute store has REPLACED it.  In CPython a
				``@classmethod def m'' is a class-dict entry, so a later
				``Cls.m = f'' -- or a class-body decorator rebinding, which is
				the same store -- replaces it outright and an instance read sees
				the replacement.  Grail keeps the compiled class-side method and
				the store in different places, and this branch used to answer
				the compiled one, so ``@singledispatchmethod @staticmethod def
				t'' left ``a.t(...)'' running the UNDECORATED staticmethod while
				``A.t(...)'' correctly ran the descriptor.  Same asymmetry the
				instance-side probe below already fixes for plain methods; this
				is its class-side twin, and it costs a store probe only for a
				name that resolved to a class-side method in the first place."
				(self ___classChainAttrLookup___: aSym)
					@env0:ifNotNil: [:___cv | ^ ___cv].
				^ BoundMethod receiver: self @env0:class selector: aSym].
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
			"``str.__new__(cls, value)'' is the ALLOCATOR -- how a hand-written
			str-subclass __new__ forwards to its base.  It lives CLASS-side, so
			the CharacterCollection instance-method probe below never finds it and
			the generic BoundMethod wrap took over, turning the call into a
			CONSTRUCTION through cls: ``str.__new__(SomeStrEnum, v)'' ran the
			enum's by-value lookup and raised ``<enum 'X'> has no members''.
			Delegate to the concrete string class -- exactly what the equivalent
			``builtins.str.__new__'' already answers, and what test_enum's
			test_dir_on_sub_with_behavior_including_instance_dict_on_super and
			test_multiple_mixin_with_common_data_type call."
			aSym == #'__new__' ifTrue: [
				^ Unicode7 @env1:___pyAttrLoad___: #'__new__'].
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
		| attrOwner metaOwns |
		attrOwner := self @env0:class @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1.
		"...and the MRO rule once more -- see ___classBodyAttrOutrankedByMethod___:.
		This is the THIRD reader of the class-body accessor for an instance (the
		other two are in the PythonInstance branch above), and a rule that holds
		for a name has to hold at every place that name can be answered: gating
		only some of them moves the wrong answer rather than removing it."
		(attrOwner notNil
			and: [((attrOwner @env0:categoryOfSelector: aSym environmentId: 1) @env0:= #'Grail-Class Attrs')
			and: [(self ___classBodyAttrOutrankedByMethod___: aSym) not]])
			ifTrue: [
				"Enum member DynamicClassAttribute (test_shadowed_attr): a data-type
				attribute (int.numerator / str.title) shadowed by a same-named sibling
				member wins on INSTANCE access -- Number.divisor.numerator is 1, not the
				member; Book.author.title is str.title.  Delegate to the member's
				underlying value when IT provides aSym; a value lacking it (int has no
				``divisor'') raises AttributeError -> fall through to the sibling-member
				accessor.  Gated on self being an enum member so non-enum built-in-
				subclass instances are untouched."
				(((Python @env0:at: #Enum otherwise: nil) @env0:notNil)
					and: [(Enum ___grailRecordFor: self @env0:class) @env0:notNil]) ifTrue: [
					| mv |
					mv := self @env0:dynamicInstVarAt: #value ifAbsent: [nil].
					"Delegate ONLY when the value's data type has aSym as a real compiled
					method (int>>numerator, str>>title) -- a non-throwing check.  An
					earlier try/``mv ___pyAttrLoad___`` version RAISED+caught an
					AttributeError for every ``member.sibling'' whose value lacks the
					attr (member.divisor on an int), and the per-access exception cost
					crashed co-scheduled suite modules under concurrency."
					(mv @env0:notNil
						and: [(mv @env0:class @env0:whichClassIncludesSelector: aSym
							environmentId: 1) @env0:notNil])
							ifTrue: [^ mv ___pyAttrLoad___: aSym]].
				^ self ___descriptorGet___: (self @env0:class @env0:perform: aSym env: 1)].
		"@classmethod (and @staticmethod) reached through an INSTANCE of a
		built-in-subclass — ``d.fromkeys(...)'' where d is a dict-subclass
		instance.  Python makes a classmethod reachable from an instance,
		binding the call to the CLASS.  These live on the metaclass with
		``name:'' / ``name:_:'' / ``_name:kw:'' selectors and no paired unary
		setter (so the Grail-Class Attrs value branch above doesn't catch
		them).  Gate on the owning class being a TRUE metaclass (``isMeta'')
		so object-level dunder defaults on the metaclass's kernel tail
		(``__eq__'', ``__exit__'', ...) don't masquerade as classmethods
		bound to the class.  Return a BoundMethod on the class so
		``d.fromkeys(x)'' dispatches as ``type(d).fromkeys(x)'' (test_dict
		test_fromkeys); this mirrors the PythonInstance branch above."
		metaOwns := [:sel | | o |
			o := self @env0:class @env0:class @env0:whichClassIncludesSelector: sel environmentId: 1.
			o notNil and: [o @env0:isMeta and: [(self ___respondsTo___: sel) not]]].
		"The MRO rule again -- see ___classBodyAttrOutrankedByMethod___:.  The
		``x:'' this branch matches on can be the SETTER half of a class-body
		accessor pair rather than a class method, and then a subclass ``def x''
		outranks it.  Without this the name escapes the two gates in the
		PythonInstance branch only to be answered here, bound to the CLASS."
		((self ___classBodyAttrOutrankedByMethod___: aSym) not
			and: [(metaOwns @env0:value: sym1)
			or: [(metaOwns @env0:value: sym2)
				or: [(metaOwns @env0:value: sym3)
					or: [(metaOwns @env0:value: sym4)
						or: [(metaOwns @env0:value: sym5)
							or: [(metaOwns @env0:value: sym6)
								or: [metaOwns @env0:value: symVA]]]]]]])
			ifTrue: [^ BoundMethod receiver: self @env0:class selector: aSym].
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
	"A runtime class-attribute store must SHADOW a compiled method of the same
	name.  In CPython a ``def m'' IS a class-dict entry, so ``A.m = f''
	REPLACES it and both ``A.m'' and ``a.m'' see f; there is no second,
	lower-priority place for the original to survive.

	This probe has to precede the BoundMethod wrap below, which answers for
	ANY selector the receiver responds to — including the compiled method —
	and so used to win, leaving the store visible on the class but not through
	an instance: ``A.m = deco(A.m)'' made ``A.m'' the wrapper (the Behavior
	branch above walks the same store) while ``a.m()'' still ran the original.
	That asymmetry is what made class-body method decorators unimplementable
	as ``Cls.m = deco(Cls.m)'', and it was an ordinary monkey-patching bug in
	its own right.

	Instance receivers only.  A class receiver consulted this store in the
	Behavior branch above, before ITS wrap, so it is already correct; probing
	again here would be redundant."
	(self isKindOf: Behavior) ifFalse: [
		(self ___classChainAttrLookup___: aSym)
			@env0:ifNotNil: [:___cv | ^ ___cv]].
	((self ___respondsTo___: aSym)
		or: [(self ___respondsTo___: sym1)
			or: [(self ___respondsTo___: sym2)
				or: [(self ___respondsTo___: sym3)
					or: [(self ___respondsTo___: sym4)
						or: [(self ___respondsTo___: sym5)
							or: [(self ___respondsTo___: sym6)
								or: [self ___respondsTo___: symVA]]]]]]])
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
	"dynInstVars probe — see ___classChainAttrLookup___:.  An instance
	receiver already probed it above (it has to precede the BoundMethod wrap
	to shadow a compiled method); this remains for the receiver kinds that
	reach here without having done so."
	(self ___classChainAttrLookup___: aSym)
		@env0:ifNotNil: [:___cv | ^ ___cv].
	"A @classmethod read through an INSTANCE.  The def lives on the
	METACLASS (category Grail-Class Methods), so none of the instance-side
	probes above can see it, and ``p.cm()'' raised AttributeError where
	CPython binds the class and calls it.

	PythonInstance>>doesNotUnderstand: already forwards the DIRECT-SEND
	shape, but only for KEYWORD selectors (its branch is guarded by
	``s last = $:''), so a ZERO-ARG classmethod had no route at all:
	``p.cm1(7)'' worked while ``p.cm0()'' did not.  This covers every
	arity, and the load shapes that never reach a send --
	``getattr(p, 'cm0')'' and ``f = p.cm0'' -- by answering a BoundMethod
	bound to the CLASS, which is exactly Python's classmethod binding.

	The category gate is the same one the DNU forward uses, so
	synthesized class-attr accessors and real setters stay out."
	(self isKindOf: Behavior) ifFalse: [
		| metaOwner |
		metaOwner := self @env0:class @env0:class
			@env0:whichClassIncludesSelector: aSym environmentId: 1.
		(metaOwner @env0:notNil and: [
			(metaOwner @env0:categoryOfSelector: aSym environmentId: 1)
				@env0:= #'Grail-Class Methods'])
			ifTrue: [
				"Delegate to the CLASS's own load rather than wrapping the raw
				selector here: that is what applies a decorator stacked under
				@classmethod (@contextlib.contextmanager, ...), whose wrapper
				lives in the class dict while the selector is the raw function.
				The class is a Behavior, so it cannot re-enter this branch."
				^ self @env0:class ___pyAttrLoad___: aSym]].
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
		ifTrue: [
			"Same name/obj stamping as the class-attribute form below: a user
			``def __getattr__'' that raises a bare AttributeError must still
			carry what a suggestion is computed from."
			^ [self __getattr__: s]
				@env0:on: AttributeError
				do: [:ex |
					AttributeError @env0:___stampContextOn___: ex name: s obj: self.
					ex @env0:pass]].
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
			"Stamp CPython's name/obj onto a BARE AttributeError escaping the
			user's __getattr__ -- see ___stampContextOn___:name:obj:.  Passed on
			rather than re-signalled so the handler search continues from the
			original raise point and the traceback is unaffected."
			^ [getattrFn value: { self. s } value: nil]
				@env0:on: AttributeError
				do: [:ex |
					AttributeError @env0:___stampContextOn___: ex name: s obj: self.
					ex @env0:pass]
		]
	].
	"Carries CPython's ``name'' / ``obj'' -- see
	AttributeError class>>___signalMissing___:on:.  This is the terminal miss for
	an ordinary attribute read, so it is where the suggestion machinery gets its
	inputs from."
	^ AttributeError @env0:___signalMissing___: s on: self
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
	"Return the class of this object (Python type).

	A CLASS receiver answers its METACLASS, which is not the same question --
	see ___pyMetaclass___ for why ``self class'' is the wrong answer there."

	(self isKindOf: Behavior) ifTrue: [^ self ___pyMetaclass___].
	^ self @env0:class
%

category: 'Grail-Metaclass'
classmethod: object
___grailDeclaredMetaclass___
	"The Python metaclass this SMALLTALK-written class means to have, or nil
	for ``type''.

	Grail gives every class its own Smalltalk metaclass, which is an artefact
	of how classes are built and not a Python-visible object: ``Color class''
	is anonymous, has no Python name, and is not what CPython means by
	type(Color).  So the default is nil -- ``an ordinary class, whose metaclass
	is type'' -- and a class that really does have one says so by overriding
	this.  Enum is the one that does, answering EnumType.

	Class-side, so a subclass inherits the answer: every ``class Color(Enum)''
	gets EnumType from Enum class without doing anything.  A class that reaches
	its enum-ness through a SECONDARY base (``class Mixed(int, Enum)'' is rooted
	at Grail's int, so its metaclass chain never passes Enum class) is covered
	by the MRO walk in ___pyMetaclass___ instead."

	^ nil
%

category: 'Grail-Metaclass'
method: object
___pyMetaclass___
	"The receiver's Python type: for an instance its class, for a CLASS its
	METACLASS.  Backs both ``x.__class__'' and ``type(x)'', which is what makes
	CPython's ``x.__class__ is type(x)'' hold -- the two used to disagree for
	every class receiver, one answering the Smalltalk metaclass and the other
	the canonical ``type''.

	Two sources:

	  * a metaclass DECLARED by a Smalltalk-written ancestor
	    (___grailDeclaredMetaclass___).  Tried on the receiver first, where the
	    Smalltalk chain supplies it for free, then along the Python MRO so that
	    a class reaching its metaclass through a SECONDARY base finds it too:
	    ``class Mixed(int, Enum)'' is rooted at Grail's int and must still
	    answer EnumType, exactly as CPython picks the most derived metaclass
	    among the bases.  The MRO is most-derived-first, so the first hit is it.
	  * otherwise ``type'', the single canonical object -- so ``type(cls) is
	    type'' keeps holding for an ordinary class, which is what it answered
	    before and what isinstance(cls, type) agrees with.

	NOT the receiver's own Smalltalk metaclass, which is what this used to
	answer through ``self class'': ``Color class'' is anonymous scaffolding
	with no Python name, and handing it out leaked a GemStone artefact into an
	answer Python code compares -- inspect.getmembers(Color)['__class__']
	is asserted to be EnumType (test_enum TestStdLib.test_inspect_getmembers).

	An explicit ``metaclass='' is DELIBERATELY not consulted, though
	___grailMetaclass___ records one and CPython would answer it.  Reporting it
	was tried and regressed test_copy: copy() treats a class as atomic via
	``issubclass(type(x), type)'', and Grail roots ``class Meta(type)'' at
	PythonInstance -- the documented degradation for a base it cannot model --
	so nothing links Meta back to ``type'' and issubclass answers False.  With
	type(C) still ``type'' the atomic branch is reached directly, which is why
	this worked before and why claiming the recorded metaclass breaks it.  The
	honest position is that Grail RECORDS a metaclass rather than being one, so
	type() does not yet report it; see the known-gap test."

	| declared mro |
	"A non-class answers through __class__, NOT ``self class''.  One Python type
	is backed by several GemStone classes here, and the normalising is done by
	__class__ overrides -- Float, Bytearray, the set and dict-view protocols,
	and the integer classes, where ``self class'' is SmallInteger and the Python
	answer is Integer.  Going straight to ``self class'' made type(1) answer
	SmallInteger and broke eleven test_enum tests; __class__ has always been
	what the type() builtin asked, and still is."
	(self isKindOf: Behavior) ifFalse: [^ self __class__].
	declared := self ___grailDeclaredMetaclassOrNil___.
	declared == nil ifFalse: [^ declared].
	"@env0: -- ___mroOf___ is an env-0 classmethod, and an env-1 send of it
	fails.  The failure was invisible: the handler below turned it into nil, so
	every MI class quietly skipped the walk and answered ``type''."
	mro := [(Python @env0:at: #importlib) @env0:___mroOf___: self]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	mro == nil ifFalse: [
		mro @env0:do: [:c |
			(c isKindOf: Behavior) ifTrue: [
				declared := c ___grailDeclaredMetaclassOrNil___.
				declared == nil ifFalse: [^ declared]]]].
	^ BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #'type'
%

category: 'Grail-Metaclass'
method: object
___grailDeclaredMetaclassOrNil___
	"___grailDeclaredMetaclass___, or nil when the receiver cannot answer it.

	The default lives on ``object class'', and a METACLASS receiver does not
	reach it: ``Enum class'' is an instance of Metaclass3, whose chain does not
	pass object class, so the send is a MessageNotUnderstood.  That is only
	reachable at all because type() now hands metaclasses out to Python -- and
	then anything doing ordinary introspection on one, inspect's
	classify_class_attrs among them, walked straight into an uncatchable
	Smalltalk error.

	Tested by lookup rather than caught, so a genuine MNU raised from INSIDE a
	class's own ___grailDeclaredMetaclass___ still propagates."

	(self @env0:class @env0:whichClassIncludesSelector: #'___grailDeclaredMetaclass___'
		environmentId: 1) == nil ifTrue: [^ nil].
	^ self ___grailDeclaredMetaclass___
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
	the Fahrenheit/Celsius example in AttributeProtocolTestCase).

	Raised through ___signalMissing___:on: so the exception carries CPython's
	``name'' and ``obj'', which is what lets traceback.py offer
	``Did you mean: 'blech'?''.  This is THE attribute-miss path for a Python
	object, so it is the one that has to carry them."

	^ AttributeError @env0:___signalMissing___: name asString on: self
%

category: 'Grail-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object.
	Returns an Array of Strings containing all method names for environment 1 (Python).
	Excludes convenience methods (those starting with ___) that are internal implementation helpers."

	| selectors result myClass |
	myClass := self @env0:class.
	selectors := (myClass @env0:allSelectorsForEnvironment: 1) @env0:asSet.
	"A CLASS receiver needs BOTH chains, because Grail splits in two what CPython
	keeps in one dict.  ``self class'' is the metaclass, which is where a class
	body's DATA attributes live (``data = 42'' compiles to a data/data: accessor
	pair on C class) -- so the scan above finds those, and finds no method at all.
	The class's own env-1 selectors are the methods, and they were never consulted:
	dir(C) answered ``data'' but not ``meth'', while dir(C()) answered both.

	CPython's type.__dir__ merges cls.__dict__ with each base's and DELIBERATELY
	omits the metaclass (``methods belonging to the metaclass would probably be
	more confusing than helpful'').  Grail cannot omit it -- that is where half
	the answer is stored -- so the union is the closest reachable thing, and it
	costs the metaclass's own selectors leaking in.  They leaked in before this
	change too; what changes is that the class's methods are now there as well."
	self @env0:isBehavior ifTrue: [
		selectors @env0:addAll: (self @env0:allSelectorsForEnvironment: 1)].
	selectors := selectors @env0:asArray.
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
		| s sz index |
		s := selector @env0:asString.
		sz := s @env0:size.
		"A def with optional / keyword / *args parameters compiles to the
		varargs transport selector ``_<name>:kw:'' (FunctionDefAst), whose
		Python-visible name is <name>.  Report <name> -- not the leading-
		underscore transport spelling -- so dir() matches CPython and
		getattr(obj, name) (unittest's getTestCaseNames, inspect, ...) resolves
		the method.  Recover it by dropping the single leading ``_'' and the
		trailing ``:kw:''.  (``___''-prefixed selectors were rejected above, so
		this never fires on a Grail-internal helper.)"
		((sz @env0:> 4)
			and: [((s @env0:at: 1) == $_)
			and: [(s @env0:copyFrom: (sz @env0:- 3) to: sz) @env0:= ':kw:']])
			ifTrue: [s @env0:copyFrom: 2 to: (sz @env0:- 4)]
			ifFalse: [
				"Fixed-arity keyword selector (``name:_:'') -- strip at the first
				colon; a unary selector has none and passes through unchanged."
				index := s @env0:indexOf: $:.
				index == 0
					ifTrue: [s]
					ifFalse: [s @env0:copyFrom: 1 to: (index @env0:- 1)]]
	].
	"CPython dir() returns unique names; a simple-positional def can yield BOTH
	a fixed-arity selector and a ``_name:kw:'' keyword companion, which now
	debang to the same name -- dedup before sorting."
	result := result @env0:reject: [:name | name @env0:= 'new'].
	"``new'' is a raw Smalltalk class-side selector (Object class>>new)
	reachable through allSelectorsForEnvironment: on a kernel-backed
	class's metaclass (e.g. dict's PyDict class) -- it isn't a genuine
	Python attribute (CPython's dict has __new__, never a bare .new), so
	it would spuriously fail dir(UserDict) >= dir(dict)-style superset
	checks (test_collections.TestUserObjects)."

	"An INSTANCE also sees everything its class offers, plus its own attributes.
	CPython's object.__dir__ is essentially
	``list(inst.__dict__) + dir(type(inst))'', and the selector scan above finds
	NEITHER of those halves for an instance: a class body's data attributes
	(``blech = None'') compile to accessors on the METACLASS, so they are found
	by dir(TheClass) but not by dir(instance), and per-instance attributes live
	in dynamic instVars rather than in any method dictionary.  So
	``dir(A())'' answered only A's methods -- no ``blech'', no attribute set in
	__init__ -- while ``dir(A)'' answered the data attributes and not the
	methods.

	Guarded to non-classes: for a class, self class is its METAclass, and the
	scan above already reaches the class's own attributes through it.  Recursing
	there would add the metaclass's selectors, which Python does not report."
	self @env0:isBehavior ifFalse: [
		| names |
		names := result @env0:asSet.
		"Anything the class offers.  Rescued rather than assumed: __dir__ can be
		user-defined and raise, and self class need not be a Python class at all."
		[(self @env0:class @env1:__dir__) @env0:do: [:n |
			names @env0:add: n @env0:asString]]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		"The instance's own attributes.  A strict __slots__ class has no
		__dict__ and raises AttributeError -- correctly, and there is nothing to
		add in that case."
		[(self @env1:__dict__) @env1:keys @env0:do: [:k |
			names @env0:add: k @env0:asString]]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		result := names].
	^ ((result @env0:asSet) @env0:asSortedCollection) @env0:asArray
%

category: 'Grail-Iteration Protocol'
method: object
___presizeLengthHint___
	"CPython's PyObject_LengthHint(o, default) -- the estimate list(),
	list.extend() and bytearray.extend() ask an iterable for before consuming
	it, so they can preallocate.  Answers nil when no estimate is available.

	Grail's collections grow dynamically and have nothing to preallocate, so
	the ANSWER is unused -- but the CALL is observable, and that is the point:
	an exception raised by the iterable's __len__ or __length_hint__ must reach
	the caller rather than being silently skipped.  ``list(x)'' where x.__len__
	raises RuntimeError raised nothing at all before (test_iterlen
	TestLengthHintExceptions test_issue1242657, whose name in CPython is
	literally ``exceptions are not suppressed by __length_hint__()'').

	CPython's two special cases are kept: a TypeError from __len__ is CLEARED
	(an object may legitimately have no length, and PyObject_Length reports
	that as TypeError), and a __length_hint__ answering the NotImplemented
	singleton means ``no estimate''."

	| v ni |
	(self ___respondsTo___: #'__len__') ifTrue: [
		^ [self __len__] @env0:on: TypeError do: [:ex | ex @env0:return: nil]].
	(self ___respondsTo___: #'__length_hint__') ifFalse: [^ nil].
	v := self __length_hint__.
	ni := Python @env0:at: #NotImplemented otherwise: nil.
	(ni @env0:notNil @env0:and: [v @env0:== ni]) ifTrue: [^ nil].
	^ v
%

category: 'Grail-Numeric Protocol'
method: object
___asIndex___
	"This object as an integer index, honoring __index__ (PEP 357) -- CPython's
	PyNumber_AsSsize_t / operator.index().

	Callers used to only PROBE for __index__ (``does this class define it?'')
	and then hand the object itself to env-0 arithmetic, so every sequence
	operation on an __index__ object died on an uncatchable DNU: ``a newstyle
	does not understand #'<''' (32 of test_index's 34 errors), or #asInteger in
	str.__mul__.  Probing is not enough -- the value has to be FETCHED.

	__index__ runs Python code, which may mutate the receiving sequence, so a
	caller must re-read its size AFTER coercing (see bytearray.__setitem__).
	A non-integer result is CPython's TypeError, named with the type, and an
	object with no __index__ at all gets the ``cannot be interpreted as an
	integer'' TypeError -- callers wanting the sequence-specific wording
	(``list indices must be integers or slices, not str'') raise it themselves
	BEFORE calling here, which is what the existing guards do."

	(self isKindOf: Integer) ifTrue: [^ self].
	(self ___respondsTo___: #'__index__') ifTrue: [
		| v |
		v := self __index__.
		(v isKindOf: Integer) ifTrue: [^ v].
		TypeError ___signal___: ('__index__ returned non-int (type '
			@env0:, (v @env0:class @env1:__name__) @env0:asString @env0:, ')')].
	TypeError ___signal___: ('''' @env0:, (self @env0:class @env1:__name__) @env0:asString
		@env0:, ''' object cannot be interpreted as an integer')
%

category: 'Grail-Numeric Protocol'
method: object
___asRepeatCount___
	"This object as a sequence-repetition count: ___asIndex___ plus CPython's
	index-sized range check.  ``'a' * 2**100'' is an OverflowError in CPython
	because the count cannot fit a Py_ssize_t; Grail used to attempt the build
	and take the whole session down with AlmostOutOfMemory
	(test_index.OverflowTestCase.test_sequence_repeat).  The NEGATIVE side
	raises too -- -2**100 does not fit either, and CPython checks the fit
	BEFORE it checks the sign, so it never reaches the ``count <= 0 means
	empty'' rule."

	| v |
	v := self ___asIndex___.
	((v @env0:> 9223372036854775807)
		or: [v @env0:< -9223372036854775808]) ifTrue: [
		OverflowError ___signal___:
			'cannot fit ''int'' into an index-sized integer'].
	^ v
%

category: 'Grail-Numeric Protocol'
method: object
___asIndexOrNil___
	"___asIndex___ for an OPTIONAL bound: nil and the Python None singleton
	pass through untouched (an unset slice bound), everything else coerces."

	self @env0:isNil ifTrue: [^ nil].
	(self @env0:== None) ifTrue: [^ self].
	^ self ___asIndex___
%

category: 'Grail-Comparison'
method: object
___varargsDunder___: kwSelector with: other
	"Dispatch a comparison dunder that was declared WITHOUT a named receiver
	parameter -- ``def __eq__(*args)'' compiles to ___eq__:kw: and gets NO
	__eq__: alias, so a plain ``self __eq__: other'' send silently lands on
	object's default and the user's method never runs (CPython's
	test_compare.test_ne_high_priority / test_ne_low_priority record the call
	list and saw it empty).  Answer nil when this class has no such method, so
	callers can fall through to their next probe.

	The positional array excludes the receiver: Grail binds self as the
	Smalltalk receiver and passes only the remaining arguments, the same
	convention as ___round__:kw: / ___float__:kw:."

	| owner |
	owner := self @env0:class
		@env0:whichClassIncludesSelector: kwSelector environmentId: 1.
	(owner @env0:isNil or: [owner @env0:== object]) ifTrue: [^ nil].
	^ self @env0:perform: kwSelector env: 1 withArguments: { { other } . nil }
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
	fall through to the CPython default.  Only generic PythonInstances
	reach here — Int / Float / str / etc. carry their own ``__eq__:''
	override, so the class-chain walk is not on those hot paths.

	The default answers NotImplemented, not identity-as-a-Boolean, exactly
	as CPython's object.__eq__ does (True only for the identical object).
	That is what lets the operator layer (___cmpEq___ -> ___eqValue___) try
	the REFLECTED __eq__ on the right-hand side: ``CompNone() == CompEq()'',
	``(2+0j) == Cmp(2.0)'' and every ``x == ALWAYS_EQ'' in CPython's suite
	need it, and answering false here skipped that step silently
	(test_compare.test_comparisons / test_issue_1393 /
	test_comp_classes_different)."

	| fn r |
	fn := self ___dynamicClassAttr___: #'__eq__'.
	fn == nil ifFalse: [^ fn ___pyCallValue___: { self. other } kw: nil].
	r := self ___varargsDunder___: #'___eq__:kw:' with: other.
	r == nil ifFalse: [^ r].
	"Answer a MATCH outright, punt otherwise.  ``='' rather than ``=='': for a
	generic PythonInstance the two agree (kernel = is identity there), but a
	KERNEL-backed receiver that reaches this default -- a Fraction built as a
	SmallFraction, a ScaledDecimal, a Date -- carries real VALUE equality, and
	Fraction(-1, 2) == Fraction(1, -2) must stay True.  Only the no-match case
	becomes NotImplemented, which is the whole point: it hands the comparison
	to the reflected __eq__ instead of settling it as False."
	(self @env0:= other) ifTrue: [^ true].
	^ #'___NotImplemented___'
%

category: 'Grail-String Representation'
method: object
__format__: formatSpec
	"Default Python object.__format__: empty spec returns str(self),
	non-empty spec raises TypeError (per CPython 3.4+)."

	(formatSpec @env0:isNil or: [formatSpec @env0:= '']) ifTrue: [
		^ self __str__
	].
	"Concatenate in env 0: Unicode7 has no env-1 ``,'', so the env-1 sends
	this message used to build with died as an uncatchable DNU instead of
	raising the intended TypeError."
	TypeError ___signal___:
		('unsupported format string passed to '
			@env0:, (self __class__ __name__) @env0:asString
			@env0:, '.__format__')
%

set compile_env: 0

category: 'Grail-Testing'
method: object
___isPyStr___
	"Is the receiver a Python ``str''?  False here; CharacterCollection and
	AbstractPyStr answer true.

	Defined in env 0, as its two overrides are, because the callers are
	Smalltalk guards.  Two consequences worth stating, both of which cost a
	broken suite to learn:

	  * Split the definitions across environments and the predicate answers
	    ``false'' for every string, since an env-1 lookup finds only this
	    one.  All three must live in env 0.
	  * From env-1 code, send it as ``@env0:___isPyStr___''.  A bare send
	    is an env-1 send and raises doesNotUnderstand.

	The point of asking this way rather than ``isKindOf: CharacterCollection''
	is that Grail's str is NOT one Smalltalk class and never was -- it is
	Unicode7 / Unicode16 / Unicode32 / String / Symbol, plus AbstractPyStr
	for StrEnum and ``class X(str)'', plus PyStrSurrogate for a str holding
	code points GemStone has no Character for.  A ``isKindOf:
	CharacterCollection'' test silently answers false for the last two, and
	the failure mode is a wrong answer rather than an error: the value is
	quietly treated as not-a-string and takes some other branch.

	Prefer this at every site that means ``is this a Python string''.  A site
	that genuinely means ``is this a Smalltalk CharacterCollection I am about
	to index or concatenate'' should keep isKindOf: and say so."

	^ false
%

set compile_env: 1

category: 'Grail-Context Manager'
method: object
__enter__
	"Default: not a context manager.  ``with obj:`` on an object with
	no __enter__ must raise the catchable TypeError (CPython message
	shape), not an uncatchable env-1 MNU -- test_functools hits this
	with a raw generator in a with-statement (a dropped @contextmanager
	class-body decorator)."

	TypeError ___signal___: (self ___contextManagerProtocolError___: '__enter__')
%

category: 'Grail-Context Manager'
method: object
__exit__: excType _: excValue _: excTb

	TypeError ___signal___: (self ___contextManagerProtocolError___: '__exit__')
%

category: 'Grail-Context Manager'
method: object
___contextManagerProtocolError___: missingSelector
	"CPython's TypeError text for ``with obj:'' on a non-manager, built here
	because it depends on WHICH halves of the protocol the object has:

	  'X' object does not support the context manager protocol
	      (missed __exit__ method)

	with a trailing ``but it supports the asynchronous context manager
	protocol. Did you mean to use 'async with'?'' when the object is an
	ASYNC manager used with a plain ``with''.

	missingSelector is the half whose default fallback ran.  CPython reports
	a missing __exit__ BEFORE a missing __enter__ -- its SETUP_WITH looks
	__exit__ up first -- so when neither half exists this answers the
	__exit__ message even though it was __enter__ that fell through.
	Deciding it here rather than in WithAst's emit keeps the check off the
	success path entirely: it runs only when the object is already known not
	to be a context manager."

	| missed hasAsync |
	missed := (self ___definesProtocolMethod___: '__exit__'
			selectors: #( #'__exit__:_:_:' #'__exit__:kw:' #'__exit__:' ))
		ifTrue: [missingSelector]
		ifFalse: ['__exit__'].
	hasAsync := (self ___definesProtocolMethod___: '__aenter__'
			selectors: #( #'__aenter__' #'__aenter__:kw:' ))
		@env0:and: [self ___definesProtocolMethod___: '__aexit__'
			selectors: #( #'__aexit__:_:_:' #'__aexit__:kw:' #'__aexit__:' )].
	^ '''' @env0:, self ___pyTypeNameForError___ @env0:asString
		@env0:, ''' object does not support the context manager protocol (missed '
		@env0:, missed @env0:, ' method)'
		@env0:, (hasAsync
			ifTrue: [' but it supports the asynchronous context manager protocol. '
				@env0:, 'Did you mean to use ''async with''?']
			ifFalse: [''])
%

category: 'Grail-Context Manager'
method: object
___definesProtocolMethod___: aName selectors: selectorArray
	"True when the receiver's class really supplies the Python method
	``aName'', rather than inheriting the default that raises.

	Two places to look, because Grail compiles the two kinds of def
	differently.  A plain ``def __exit__(...)'' becomes a Smalltalk method
	on the class, so it is found by whichClassIncludesSelector: -- but a
	bare ``includes'' test is not enough there, because object ITSELF
	defines __enter__ / __exit__:_:_: (that is what makes the error
	catchable in the first place), hence the ``~~ object'' guard.  Mirrors
	the reason ___hasUserInit___ exists for __init__.  An ``async def''
	compiles to no Smalltalk method at all and lands in the per-class
	dynInstVars store, as does a runtime ``Cls.__aexit__ = fn''; that is
	what ___dynamicClassAttr___: walks.

	Several selectors per name because the arity a Python def compiles to
	varies -- ``def __exit__(self, t, v, tb)'' becomes __exit__:_:_: while
	``def __exit__(self, *args)'' goes through the kwargs forwarder."

	| owner |
	(self ___dynamicClassAttr___: aName @env0:asSymbol) @env0:notNil ifTrue: [^ true].
	selectorArray @env0:do: [:sel |
		owner := self @env0:class @env0:whichClassIncludesSelector: sel environmentId: 1.
		(owner @env0:notNil @env0:and: [owner @env0:~~ object])
			ifTrue: [^ true]].
	^ false
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___pyTypeNameForError___
	"The Python type name of the receiver for ``'X' object is ...'' error
	messages -- normally ``type(self).__name__''.  When the receiver is
	itself a class/type object (``iter(list)'', ``list in x'', ``list + 1'',
	...), ``self class'' is a metaclass; CPython reports the metaclass name,
	which for an ordinary class is 'type' (``iter(list)'' ->
	``'type' object is not iterable'').  Guarding on Behavior also avoids the
	env-1 __name__ MessageNotUnderstood a kernel metaclass (Metaclass) would
	raise -- ``self class @env1:__name__'' works for an INSTANCE's class but
	not for a metaclass, which carries no env-1 __name__."

	(self @env0:isKindOf: Behavior) @env0:ifTrue: [^ 'type'].
	^ (self @env0:class @env1:__name__) @env0:asString
%

category: 'Grail-Iterator Protocol'
method: object
__iter__
	"Default: not iterable.  ``iter(obj)''/``for x in obj''/``tuple(obj)''
	etc. on a receiver with no __iter__ must raise the catchable Python
	TypeError, not an uncatchable env-1 MessageNotUnderstood.
	PythonInstance-backed classes already get a per-instance compiled
	fallback for this (___hasProtocol___'s comment above), but kernel-backed
	types (Boolean, ...) had no fallback at all until now
	(test_collections.TestNamedTuple.test_defaults: ``tuple(False)'' must
	raise TypeError to be caught by ``assertRaises'', not crash)."

	TypeError ___signal___: ('''' @env0:, (self ___pyTypeNameForError___)
		@env0:, ''' object is not iterable')
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

	| ni it |
	"No real iteration protocol -- neither __iter__ nor the legacy
	__getitem__ sequence protocol.  ___respondsTo___ would see the
	PythonInstance fallback __iter__ (which itself raises the ITERATION
	'not iterable' message) and wrongly proceed, so probe the REAL protocol.
	CPython's containment error uses the Python type name, lower-case
	(test_contains test_common_tests: ``argument of type 'base_set' is not a
	container or iterable'')."
	((self ___hasProtocolForCall___: '__iter__')
		or: [self ___hasProtocolForCall___: '__getitem__']) ifFalse: [
			^ TypeError ___signal___: ('argument of type ''' @env0:,
				(self ___pyTypeNameForError___) @env0:,
				''' is not a container or iterable')].
	ni := Python @env0:at: #NotImplemented otherwise: nil.
	it := self __iter__.
	[true] @env0:whileTrue: [ | elem eq |
		elem := [ it __next__ ] @env0:on: StopIteration do: [:ex | ^ false].
		"CPython's ``item in self'' is PySequence_Contains: for each ELEMENT,
		RichCompareBool(element, item, EQ) -- identity first, then the element
		is the LEFT operand so ITS __eq__ runs first (reflected to item.__eq__
		only on NotImplemented).  ``elem ___cmpEq___: item'' is that element-
		first rich ==; the earlier ``item __eq__: elem'' compared in the WRONG
		order and reported a spurious match for an asymmetric __eq__ (test_iter
		test_in_and_not_in: ALWAYS_EQ must NOT be found in iter([NEVER_EQ]) --
		NEVER_EQ, the element, wins the comparison)."
		(item @env0:== elem) ifTrue: [^ true].
		eq := elem ___cmpEq___: item.
		"``eq'' may be the Python NotImplemented singleton (``ni'') OR the
		internal ``#'___NotImplemented___''' sentinel that built-in dunders
		(e.g. int __eq__: vs a tuple/complex) return -- neither counts as a
		match here."
		((eq @env0:~~ ni and: [eq @env0:~~ #'___NotImplemented___'])
			and: [eq @env1:___isTruthy___]) ifTrue: [^ true]]
%

category: 'Grail-Container'
method: object
___pyContains___: item
	"Membership test for ``item in self'' -- the compiled `in` / `not in`
	(InAst / NotInAst) route here rather than sending __contains__: directly,
	so an explicit ``__contains__ = None'' on the receiver's class BLOCKS the
	container protocol: ``item in obj'' raises TypeError instead of dispatching
	an inherited __contains__ or falling back to iteration (CPython;
	test_contains test_block_fallback's BlockContains, which sets
	``__contains__ = None'' while inheriting a working __contains__ and
	__iter__).  A class-attribute None is invisible to normal method dispatch
	(which sees the inherited compiled __contains__:), so probe
	___classAttrDunder___ for the sentinel.  Gated on PythonInstance --
	kernel-backed containers never carry it and keep the direct __contains__:
	path (one extra send)."

	(self @env0:isKindOf: PythonInstance) ifTrue: [
		(self ___classAttrDunder___: #'__contains__') == None ifTrue: [
			^ TypeError ___signal___: ('argument of type ''' @env0:,
				(self ___pyTypeNameForError___) @env0:,
				''' is not a container or iterable')]].
	^ self __contains__: item
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

	| iVa result niSingleton baseSel refSel |
	niSingleton := Python @env0:at: #NotImplemented otherwise: nil.
	"CPython: an in-place dunder explicitly set to None (``__iadd__ = None'')
	DISABLES the operator -- and, unlike a missing __iadd__, blocks the binary
	fallback too, so ``x += y'' raises TypeError instead of using __add__
	(test_augassign testCustomMethods1's aug_test4).  A class-attribute None is
	invisible to ___respondsTo___: iSel (which sees only the inherited compiled
	__iadd__:), so probe ___classAttrDunder___ for the sentinel.  Gated on
	PythonInstance: kernel-backed receivers (int, float, ...) never carry such a
	class attribute, and this keeps the numeric ``n += 1'' fast path off the
	class-attr lookup."
	(self @env0:isKindOf: PythonInstance) ifTrue: [
		baseSel := (iSel @env0:asString @env0:copyFrom: 1
			to: iSel @env0:asString @env0:size @env0:- 1) @env0:asSymbol.
		(self ___classAttrDunder___: baseSel) == None ifTrue: [
			TypeError ___signal___: ('unsupported operand type(s) for augmented assignment: ''' @env0:,
				(self ___pyTypeNameForError___) @env0:, '''')]].
	(self ___respondsTo___: iSel)
		ifTrue: [
			result := self @env0:perform: iSel env: 1 withArguments: { other }.
			result == niSingleton ifFalse: [^ result]]
		ifFalse: [
			iVa := ('_' @env0:, (iSel @env0:asString @env0:copyFrom: 1
				to: iSel @env0:asString @env0:size @env0:- 1) @env0:, ':kw:') @env0:asSymbol.
			(self ___respondsTo___: iVa) ifTrue: [
				result := self @env0:perform: iVa env: 1 withArguments: { { other }. nil }.
				result == niSingleton ifFalse: [^ result]]].
	"self may define no forward binary dunder at all -- a bare iterator (str_iterator,
	list_iterator, ...) is not rooted at Grail's ``object'' and so lacks even the
	__add__: NotImplemented fallback.  Before performing bSel (which would MNU),
	match the binary + operator and try the RIGHT operand's reflected dunder, so
	``it = iter(x); it += UserList'' reaches UserList.__radd__(it) rather than
	dying on a missing __add__: (test_userlist test_mixed_iadd).  Only entered when
	self genuinely does not answer bSel, so every object-rooted receiver keeps the
	exact existing path.

	self == nil is EXCLUDED: nil is Grail's unbound-local sentinel (``x += 1''
	before x is assigned reads nil), and it must reach the ``perform: bSel'' send
	below so UndefinedObject's env-1 DNU backstop raises UnboundLocalError -- the
	reflected branch would instead run other.__radd__(nil) and mis-report a
	TypeError (UnboundLocalErrorTestCase test_python_aug_assign_unbound_raises)."
	((self ~~ nil) and: [(self ___respondsTo___: bSel) not]) ifTrue: [
		refSel := ('__r' @env0:, (bSel @env0:asString @env0:copyFrom: 3
			to: bSel @env0:asString @env0:size)) @env0:asSymbol.
		(other ___respondsTo___: refSel) ifTrue: [
			result := other @env0:perform: refSel env: 1 withArguments: { self }.
			result == niSingleton ifFalse: [^ result]]].
	^ self @env0:perform: bSel env: 1 withArguments: { other }
%

category: 'Grail-Comparison'
method: object
__ge__: other
	"Return self >= other"

	| r |
	r := self ___classAttrCmp___: #'__ge__' with: other.
	r == nil ifFalse: [^ r].
	"...then this class's recorded metaclass: Python looks an operator up on the
	operand's TYPE, and for a class that is its metaclass."
	r := self ___grailMetaclassCmp___: #'__ge__' with: other.
	r == nil ifFalse: [^ r].
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
	"Python object.__getstate__ (CPython 3.11+): the instance state used by
	pickling / copying.  Grail stores Python instance attributes as dynamic
	instance variables, so answer a dict of them (name -> value); answer None
	when there are none, matching CPython (an empty __dict__ with no slots
	getstates to None so the reconstructor skips restoring state)."

	| names d slotDict ivNames |
	names := self @env0:dynamicInstanceVariables.
	d := nil.
	names @env0:isEmpty ifFalse: [
		d := dict ___new___.
		names @env0:do: [:nm |
			d __setitem__: (nm @env0:asString @env0:asUnicodeString)
				_: (self @env0:dynamicInstVarAt: nm)]].
	"__slots__ values live in NAMED instance variables (``___slot_x___''),
	not in dynamicInstanceVariables, so they were absent from the state
	entirely and a slotted instance came back from a pickle with every
	slot unset -- utcoffset() answered None after a round trip
	(test_pickling_subclass).  CPython answers a (dict, slots) 2-TUPLE for
	such a class, which pickle's BUILD already knows how to restore; an
	unset slot is simply omitted, exactly as CPython omits it."
	slotDict := nil.
	(self ___respondsTo___: #'___pyHasSlots___') ifTrue: [
		ivNames := self @env0:class @env0:allInstVarNames.
		1 @env0:to: ivNames @env0:size do: [:idx |
			| ivn val |
			ivn := (ivNames @env0:at: idx) @env0:asString.
			((ivn @env0:size @env0:> 11)
				@env0:and: [(ivn @env0:copyFrom: 1 to: 8) @env0:= '___slot_']) ifTrue: [
				val := self @env0:instVarAt: idx.
				val @env0:isNil ifFalse: [
					slotDict @env0:isNil ifTrue: [slotDict := dict ___new___].
					slotDict __setitem__:
						((ivn @env0:copyFrom: 9 to: ivn @env0:size @env0:- 3)
							@env0:asUnicodeString) _: val]]]].
	slotDict @env0:isNil ifTrue: [
		^ d @env0:isNil ifTrue: [None] ifFalse: [d]].
	^ tuple @env0:withAll: { d @env0:isNil ifTrue: [None] ifFalse: [d]. slotDict }
%

category: 'Grail-Comparison'
method: object
__gt__: other
	"Return self > other"

	| r |
	r := self ___classAttrCmp___: #'__gt__' with: other.
	r == nil ifFalse: [^ r].
	"...then this class's recorded metaclass: Python looks an operator up on the
	operand's TYPE, and for a class that is its metaclass."
	r := self ___grailMetaclassCmp___: #'__gt__' with: other.
	r == nil ifFalse: [^ r].
	"Python protocol: no default ordering -- try the reflected
	operation, else raise the catchable TypeError."
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'
%

category: 'Grail-Hashing & Identity'
method: object
__hash__
	"Default hash: the Smalltalk identity hash.

	Before falling back, honour a __hash__ installed on the class at RUNTIME
	(``Cls.__hash__ = fn'').  A class that DECLARES __hash__ is found by the
	message send that reached here, so arriving at this method means there is no
	compiled one -- but a dynamic class attribute is invisible to a send and has
	to be probed explicitly.  Without it, ``hash(x)'' answered the identity hash
	while ``x.__hash__()'' answered the installed function: the same object
	hashing two different ways depending on how you asked.

	unittest.mock needs this -- configuring ``m.__hash__`` has to change what
	hash(m) answers -- and it is what makes runtime-installed dunders consistent
	with the operators, which already honour a class attribute set after
	definition.

	Cost is confined to objects whose class declares no __hash__, which are
	exactly the ones that used to take the identity-hash branch unconditionally."

	| dyn |
	"Gated on a session flag set by the class-attribute store, because the probe
	is a superclass-chain walk and this is the dict/set hot path for every object
	whose class declares no __hash__.  Measured: unguarded, a plain-object hash
	went 300ns -> 700ns and dict insertion +53%.  With the flag, a program that
	never installs a dynamic __hash__ pays one dictionary read, and only a program
	that does pays for the walk."
	(SessionTemps @env0:current @env0:at: #'GrailDynamicHashSeen' otherwise: false)
		ifTrue: [
			dyn := self ___dynamicClassAttr___: #'__hash__'.
			dyn == nil ifFalse: [
				^ dyn @env1:___pyCallValue___: { self } kw: nil]].
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

	| r |
	r := self ___classAttrCmp___: #'__le__' with: other.
	r == nil ifFalse: [^ r].
	"...then this class's recorded metaclass: Python looks an operator up on the
	operand's TYPE, and for a class that is its metaclass."
	r := self ___grailMetaclassCmp___: #'__le__' with: other.
	r == nil ifFalse: [^ r].
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
			result := other @env0:perform: refSelector env: 1 withArguments: { self }.
			result == (Python @env0:at: #NotImplemented otherwise: nil)
				ifFalse: [^ result]].
		"Reflected dunder compiled VARARGS-ONLY (``def __rpow__(b, a,
		modulo=None)`` in vendored fractions.py) -- probe the
		``_<name>:kw:`` form too."
		refVa := ('_' @env0:, (refSelector @env0:asString @env0:copyFrom: 1
			to: refSelector @env0:asString @env0:size - 1) @env0:, ':kw:') @env0:asSymbol.
		refOwner := other @env0:class
			@env0:whichClassIncludesSelector: refVa environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			result := other @env0:perform: refVa env: 1 withArguments: { { self }. nil }.
			result == (Python @env0:at: #NotImplemented otherwise: nil)
				ifFalse: [^ result]]].
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
	"SUBCLASS PRIORITY, as in ___cmpEq___: when type(other) is a proper subclass
	of type(self) and overrides the REFLECTED operator, CPython tries that first
	-- ``B() <= C()'' with C a subclass of B calls C.__ge__ before B.__le__
	(test_binop's OperationOrderTests.test_comparison_orders asserts the exact
	sequence).  Ordering used to go straight to the forward dunder, so the two
	came out swapped.

	``pri notNil'' means the reflected operator already ran and declined, so the
	fallback must NOT run it again -- straight to the unorderable TypeError."
	| pri r |
	pri := self ___reflectedFirst___: other
		selector: #'__gt__:' kwSelector: #'___gt__:kw:'.
	(pri @env0:~~ nil and: [pri @env0:~~ #'___NotImplemented___']) ifTrue: [^ pri].
	(self ___cmpDunderBlocked___: #'__lt__') ifTrue: [^ self ___cmpBlockedError___].
	r := self __lt__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		pri @env0:== nil ifTrue: [
			^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
		^ self ___cmpUnorderable___: other op: '<'].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpLe___: other
	"Subclass priority and the None block -- see ___cmpLt___."
	| pri r |
	pri := self ___reflectedFirst___: other
		selector: #'__ge__:' kwSelector: #'___ge__:kw:'.
	(pri @env0:~~ nil and: [pri @env0:~~ #'___NotImplemented___']) ifTrue: [^ pri].
	(self ___cmpDunderBlocked___: #'__le__') ifTrue: [^ self ___cmpBlockedError___].
	r := self __le__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		pri @env0:== nil ifTrue: [
			^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
		^ self ___cmpUnorderable___: other op: '<='].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpGt___: other
	"Subclass priority and the None block -- see ___cmpLt___."
	| pri r |
	pri := self ___reflectedFirst___: other
		selector: #'__lt__:' kwSelector: #'___lt__:kw:'.
	(pri @env0:~~ nil and: [pri @env0:~~ #'___NotImplemented___']) ifTrue: [^ pri].
	(self ___cmpDunderBlocked___: #'__gt__') ifTrue: [^ self ___cmpBlockedError___].
	r := self __gt__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		pri @env0:== nil ifTrue: [
			^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
		^ self ___cmpUnorderable___: other op: '>'].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpGe___: other
	"Subclass priority and the None block -- see ___cmpLt___."
	| pri r |
	pri := self ___reflectedFirst___: other
		selector: #'__le__:' kwSelector: #'___le__:kw:'.
	(pri @env0:~~ nil and: [pri @env0:~~ #'___NotImplemented___']) ifTrue: [^ pri].
	(self ___cmpDunderBlocked___: #'__ge__') ifTrue: [^ self ___cmpBlockedError___].
	r := self __ge__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		pri @env0:== nil ifTrue: [
			^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
		^ self ___cmpUnorderable___: other op: '>='].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpDunderBlocked___: baseSym
	"True when this object's class BLOCKS baseSym by binding it to None.

	``__eq__ = None'' in a class body does not leave the comparison undefined --
	the lookup succeeds and yields None, which CPython then calls, so the
	operation raises ``'NoneType' object is not callable'' instead of falling
	back to the other operand.  Blocking is the whole point: the idiom exists to
	stop a subclass inheriting a comparison that would be wrong for it, and a
	fallback would silently supply the very answer it is refusing to give.
	``__hash__ = None'' is the same rule, and Grail already honours that one.

	ClassDefAst compiles a class-body ``name = value'' to a metaclass accessor
	in category ``Grail-Class Attrs'', which is where the None is found.
	___pyAttrLoad___ would answer it too, but this runs on the == path, so it
	stays a category test plus one perform rather than the full attribute
	protocol."

	| attrOwner methOwner |
	"Every == runs this, so the ordinary answer (``nobody binds that name'')
	has to be cheap: ___respondsTo___: is the CACHED primitive form of the
	metaclass-chain walk below, and answers false without fetching a single
	method dictionary.  The expensive category/value probes then run only for a
	class that actually has such a class attribute."
	(self @env0:class ___respondsTo___: baseSym) ifFalse: [^ false].
	attrOwner := self @env0:class @env0:class
		@env0:whichClassIncludesSelector: baseSym environmentId: 1.
	attrOwner == nil ifTrue: [^ false].
	(attrOwner @env0:categoryOfSelector: baseSym environmentId: 1)
		== #'Grail-Class Attrs' ifFalse: [^ false].
	((self @env0:class @env0:perform: baseSym env: 1)
		== (Python @env0:at: #None otherwise: nil)) ifFalse: [^ false].
	"A compiled ``def'' on a MORE DERIVED class outranks an inherited None, which
	is how a single CPython MRO settles it.  Only reached once a None is actually
	in the chain, so the extra walk is off the ordinary path."
	methOwner := self @env0:class @env0:whichClassIncludesSelector:
		(baseSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1.
	(methOwner @env0:notNil and: [methOwner @env0:~~ object]) ifTrue: [
		((object ___grailNearerOf___: methOwner and: attrOwner @env0:thisClass
			from: self @env0:class) @env0:== methOwner) ifTrue: [^ false]].
	^ true
%

category: 'Grail-Comparison'
method: object
___cmpBlockedError___
	"The TypeError CPython raises when a comparison dunder blocked with None is
	called.  Its wording is not incidental: CPython gets here by calling the None
	it found, so the message is the generic not-callable one."

	^ TypeError ___signal___: '''NoneType'' object is not callable'
%

category: 'Grail-Comparison'
method: object
___cmpUnorderable___: other op: opString
	"CPython's unorderable-pair TypeError.  Split out of ___cmpFallback___ so the
	subclass-priority path can raise it WITHOUT retrying the reflected dunder:
	once that has run and declined, CPython does not run it a second time."

	^ TypeError ___signal___:
		('''' @env0:, opString @env0:, ''' not supported between instances of '''
			@env0:, (self ___pyTypeNameForError___)
			@env0:, ''' and ''' @env0:, (other ___pyTypeNameForError___) @env0:, '''')
%

category: 'Grail-Comparison'
method: object
___reflectedFirst___: other selector: refSelector kwSelector: kwSelector
	"CPython's subclass-priority rule: when type(other) is a PROPER SUBCLASS
	of type(self) and OVERRIDES the reflected method, the reflected call is
	tried BEFORE the forward one -- ``Base() != Derived()'' calls
	Derived.__ne__ first (test_compare.test_ne_low_priority asserts the exact
	call order).

	Answer nil when the rule does not apply, so the caller runs its ordinary
	forward path; otherwise answer the reflected result, which may be the
	NotImplemented sentinel and means ``tried, declined'' -- the caller must
	then NOT try that same reflected method again."

	| myClass otherClass owner mine refBase |
	myClass := self @env0:class.
	otherClass := other @env0:class.
	(otherClass @env0:== myClass) ifTrue: [^ nil].
	(otherClass @env0:inheritsFrom: myClass) ifFalse: [^ nil].
	"A subclass that BLOCKS the reflected method with None counts as overriding
	it -- CPython reaches the block through exactly this priority rule, so
	``SupEq() == S()'' raises rather than answering from SupEq.__eq__.  Tested
	before the override probe below, which would read the inherited compiled
	method as ``not overridden'' and hand the comparison back to the forward
	direction."
	refBase := (refSelector @env0:asString @env0:copyFrom: 1
		to: refSelector @env0:asString @env0:size - 1) @env0:asSymbol.
	(other ___cmpDunderBlocked___: refBase) ifTrue: [^ other ___cmpBlockedError___].
	owner := otherClass
		@env0:whichClassIncludesSelector: refSelector environmentId: 1.
	"object implements every comparison dunder, so an owner of ``object'' means
	the subclass does NOT override it -- fall through to the varargs form
	(``def __ne__(*args)'' has only ___ne__:kw:), rather than reading it as an
	override and stopping here."
	(owner @env0:notNil and: [owner @env0:~~ object]) ifTrue: [
		mine := myClass
			@env0:whichClassIncludesSelector: refSelector environmentId: 1.
		"Same owner means the subclass inherited it -- no override, no priority."
		(owner @env0:== mine) ifTrue: [^ nil].
		^ other @env0:perform: refSelector env: 1 withArguments: { self }].
	^ other ___varargsDunder___: kwSelector with: self
%

category: 'Grail-Comparison'
method: object
___cmpEq___: other
	| pri r |
	pri := self ___reflectedFirst___: other
		selector: #'__eq__:' kwSelector: #'___eq__:kw:'.
	(pri @env0:~~ nil and: [pri @env0:~~ #'___NotImplemented___']) ifTrue: [^ pri].
	"``__eq__ = None'' on THIS operand -- see ___cmpDunderBlocked___:."
	(self ___cmpDunderBlocked___: #'__eq__') ifTrue: [^ self ___cmpBlockedError___].
	r := self __eq__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		"pri notNil: the reflected __eq__ already ran and declined, so identity
		decides -- calling it again through ___eqValue___ would double it."
		pri @env0:== nil ifTrue: [^ self ___eqValue___: other].
		^ self @env0:== other].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpNe___: other
	| pri r |
	pri := self ___reflectedFirst___: other
		selector: #'__ne__:' kwSelector: #'___ne__:kw:'.
	(pri @env0:~~ nil and: [pri @env0:~~ #'___NotImplemented___']) ifTrue: [^ pri].
	"``__ne__ = None'' on THIS operand -- see ___cmpDunderBlocked___:."
	(self ___cmpDunderBlocked___: #'__ne__') ifTrue: [^ self ___cmpBlockedError___].
	r := self __ne__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [
		"See ___cmpEq___: a reflected __ne__ that already declined is not
		retried -- CPython goes straight to identity."
		pri @env0:== nil ifTrue: [^ self ___neValue___: other].
		^ (self @env0:== other) @env0:not].
	^ r
%

category: 'Grail-Comparison'
method: object
___pyRichEqBool___: target
	"CPython's PyObject_RichCompareBool(self, target, Py_EQ) as a Smalltalk
	boolean: identity first (so a raising/side-effecting __eq__ is skipped
	when self IS target), otherwise the rich == comparison (self.__eq__ then
	the reflected target.__eq__, via ___cmpEq___) coerced with
	___isTruthy___.  self is the collection ELEMENT and target the search
	value, matching CPython's element-first comparison order.  Sequence
	__contains__ / count / index / remove use this so element identity and
	custom __eq__ are honored (seq_tests test_contains_fake /
	test_contains_order / test_count / test_index, list_tests test_remove)."

	(self @env0:== target) ifTrue: [^ true].
	^ (self ___cmpEq___: target) ___isTruthy___
%

category: 'Grail-Comparison'
method: object
___eqValue___: other
	"The == result when the forward __eq__ returned NotImplemented: try the
	reflected __eq__ on ``other'' if its class defines its own (not just
	inheriting the generic Object default), else fall back to identity
	(== never raises).  Shared by ___cmpEq___/___cmpNe___.

	NOT gated on ``other isKindOf: PythonInstance'' -- that excluded
	kernel-backed builtins (dict, list, ...) from ever being tried as the
	reflected side, so e.g. ``Counter('abcaba') == {'a': 3, 'b': 2, 'c': 1}''
	(Counter.__eq__ correctly returns NotImplemented for a non-Counter
	operand) silently degraded to identity comparison instead of trying
	dict.__eq__(counter), which would (correctly) find them equal
	(test_collections.TestCounter.test_basics).  whichClassIncludesSelector:
	already distinguishes ``has its own __eq__:'' from ``inherits Object's'',
	regardless of whether the class is kernel- or PythonInstance-backed, so
	the extra isKindOf: guard was redundant as well as overly narrow."

	| refOwner rr tried |
	tried := false.
	"``__eq__ = None'' on the REFLECTED operand blocks here too: CPython reaches
	that operand's slot and calls the None it finds, so ``F() == X()'' raises
	rather than settling on identity.  See ___cmpDunderBlocked___:."
	(other ___cmpDunderBlocked___: #'__eq__') ifTrue: [^ other ___cmpBlockedError___].
	refOwner := other @env0:class
		@env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
	(refOwner @env0:~~ nil and: [refOwner @env0:~~ object]) ifTrue: [
		tried := true.
		rr := other @env0:perform: #'__eq__:' env: 1 withArguments: { self }.
		(rr @env0:== #'___NotImplemented___') ifFalse: [^ rr]].
	"A reflected ``def __eq__(*args)'' has only the varargs selector -- try it
	ONLY when the fixed-arity form was absent.  A plain ``def __eq__(self,
	other)'' compiles to BOTH forms, so running this unconditionally called the
	reflected __eq__ a second time after it had already declined: ``A() == A()''
	with a NotImplemented-returning __eq__ logged three calls where CPython logs
	two (test_binop's OperationOrderTests.test_comparison_orders).  ___neValue___
	guards the same way and for the same reason."
	tried ifFalse: [
		rr := other ___varargsDunder___: #'___eq__:kw:' with: self.
		(rr @env0:~~ nil and: [rr @env0:~~ #'___NotImplemented___']) ifTrue: [^ rr]].
	^ self @env0:== other
%

category: 'Grail-Comparison'
method: object
___neValue___: other
	"The != result when the forward __ne__ returned NotImplemented.  Mirror
	CPython's ``!='' operator: try the REFLECTED __ne__ on ``other'' when its
	class defines its own, BEFORE deriving from ==.  test_richcmp's
	Vector.__ne__ returns a rich (non-Boolean) Vector; the previous
	``(self ___eqValue___: other) not'' path skipped the reflected __ne__ and
	sent Smalltalk #not to that Vector (a MessageNotUnderstood that escaped
	Python try/except).  When ``other'' has no __ne__ of its own, derive from
	== exactly as the default object.__ne__ does -- ``not (self == other)'' --
	with ___eqValue___ supplying the reflected/identity == value."

	| refOwner rr tried |
	tried := false.
	"``__ne__ = None'' on the REFLECTED operand -- see ___cmpDunderBlocked___:."
	(other ___cmpDunderBlocked___: #'__ne__') ifTrue: [^ other ___cmpBlockedError___].
	refOwner := other @env0:class
		@env0:whichClassIncludesSelector: #'__ne__:' environmentId: 1.
	(refOwner @env0:~~ nil and: [refOwner @env0:~~ object]) ifTrue: [
		tried := true.
		rr := other @env0:perform: #'__ne__:' env: 1 withArguments: { self }.
		(rr @env0:== #'___NotImplemented___') ifFalse: [^ rr]].
	tried ifFalse: [
		"A reflected ``def __ne__(*args)'' has only the varargs selector."
		rr := other ___varargsDunder___: #'___ne__:kw:' with: self.
		rr @env0:~~ nil ifTrue: [
			tried := true.
			(rr @env0:~~ #'___NotImplemented___') ifTrue: [^ rr]]].
	"CPython stops once the reflected __ne__ has punted: ``a != b'' then
	answers ``a is not b'' WITHOUT consulting that operand's __eq__.  Running
	___eqValue___ here made one extra reflected __eq__ call, which
	test_compare.test_ne_high_priority sees in its recorded call list.  Only
	when the operand has no __ne__ of its own does the default apply -- and
	object.__ne__ derives that from ITS __eq__, which is what ___eqValue___
	(reflected __eq__, else identity) computes."
	tried ifTrue: [^ (self @env0:== other) @env0:not].
	^ (self ___eqValue___: other) @env0:not
%

category: 'Grail-Comparison'
method: object
___classAttrCmp___: baseSym with: other
	"An ordering dunder supplied as a CLASS ATTRIBUTE rather than a compiled
	``def'' -- functools.total_ordering's synthesised operators, a class-body
	alias (``__le__ = __lt__''), a runtime ``Cls.__le__ = f''.  In Python a
	def IS a class-dict entry, so all of these are the class's method and must
	answer the operator.

	Called only from object's own __lt__: / __le__: / __gt__: / __ge__:, i.e.
	only once no class in the chain compiled the selector -- so this can never
	shadow a real method, and the cost lands on comparisons that were about to
	reflect or raise anyway.  ___cmpFallback___ already consults the same store
	for the REFLECTED operator on ``other''; without this the forward direction
	was only reachable when ``other'' happened to be a PythonInstance carrying
	the mirror operator, so ``a <= 5'' raised TypeError while ``a <= b'' worked.

	Answers nil (never a Python value) when there is no such attribute, and
	likewise when it returns NotImplemented -- either way the caller falls
	through to the reflected operation and then the catchable TypeError."

	| fn r |
	fn := self ___classAttrDunder___: baseSym.
	fn == nil ifTrue: [^ nil].
	r := fn ___pyCallValue___: { self. other } kw: nil.
	(r == (Python @env0:at: #NotImplemented otherwise: nil)
		or: [r @env0:== #'___NotImplemented___']) ifTrue: [^ nil].
	^ r
%

category: 'Grail-Metaclass'
method: object
___grailMetaclass___
	"The ``metaclass='' in effect for this class, or nil.  SESSION-LOCAL and keyed
	by class: a Class cannot hold dynamic instVars (ImproperOperation 2484).

	INHERITED through the superclass chain, as in CPython: ``class ABC(metaclass=
	ABCMeta)'' makes every ``class Foo(ABC)'' an instance of ABCMeta too, which is
	what puts ``Foo.register'' within reach.  Only the class that wrote the keyword
	carries a record, so the walk is what supplies the rest of the chain."

	| tbl walker meta |
	(self isKindOf: Behavior) ifFalse: [^ nil].
	tbl := SessionTemps @env0:current @env0:at: #'GrailClassMetaclass' otherwise: nil.
	tbl == nil ifTrue: [^ nil].
	walker := self.
	[walker == nil] whileFalse: [
		meta := tbl @env0:at: walker otherwise: nil.
		meta == nil ifFalse: [^ meta].
		walker := walker @env0:superClass].
	^ nil
%

category: 'Grail-Metaclass'
method: object
___metaclassCheckHook___: baseSym
	"The recorded metaclass's callable for baseSym -- __instancecheck__ or
	__subclasscheck__ -- or nil when it supplies none.

	The three shapes are the ones ___metaclassCompare___ already looks for, for
	the same reason: a compiled ``def'' on the metaclass, or an attribute
	holding a function (a synthesised or aliased one).  The caller passes the
	class itself as the FIRST argument, since that is the cls parameter.

	Deliberately does NOT probe ``self class'' -- the Smalltalk metaclass.
	Grail already defines __instancecheck__: class-side for some builtins
	(Integer class), taking the class as RECEIVER with one argument, which is a
	different convention from Python's (cls, obj); invoking those here broke
	every isinstance(x, int) in the corpus.  This hook exists for a metaclass
	written in PYTHON, which is the case Grail had no answer for at all."

	| meta fn |
	(self isKindOf: Behavior) ifFalse: [^ nil].
	meta := self ___grailMetaclass___.
	meta == nil ifTrue: [^ nil].
	fn := meta ___classChainAttrLookup___: baseSym.
	fn == nil ifTrue: [fn := meta ___classAttrDunder___: baseSym].
	fn == nil ifTrue: [
		(meta @env0:whichClassIncludesSelector:
			(baseSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1)
				== nil ifTrue: [^ nil].
		fn := UnboundMethod definingClass: meta selector: baseSym].
	^ fn
%

category: 'Grail-Metaclass'
method: object
___nonClassCheckHook___: baseSym
	"The __instancecheck__ / __subclasscheck__ a NON-CLASS classinfo supplies,
	or nil.

	CPython's PyObject_IsInstance looks the hook up on TYPE(cls) whatever cls
	is -- it does not first require cls to be a type.  For an ordinary class
	that means the metaclass (___metaclassCheckHook___ above); for anything
	else it means the object's own Python class, which is what this answers.

	That is not a corner case: it is how ``isinstance([], typing.List)'' works.
	``typing.List'' is a _SpecialGenericAlias INSTANCE, not a type, and the
	check reaches list only because _SpecialGenericAlias defines
	__instancecheck__.  Grail had no path for it, so a non-class classinfo went
	straight to the old-style __bases__ protocol or to the TypeError.

	Restricted to a non-Behavior receiver so it cannot collide with the
	class-as-receiver __instancecheck__: convention Grail defines for some
	builtins -- see ___metaclassCheckHook___, which that convention already
	cost once.  The three lookup shapes are its, for the same reasons."

	| cls fn |
	(self isKindOf: Behavior) ifTrue: [^ nil].
	cls := self @env0:class.
	cls == nil ifTrue: [^ nil].
	fn := cls ___classChainAttrLookup___: baseSym.
	fn == nil ifTrue: [fn := cls ___classAttrDunder___: baseSym].
	fn == nil ifTrue: [
		(cls @env0:whichClassIncludesSelector:
			(baseSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1)
				== nil ifTrue: [^ nil].
		fn := UnboundMethod definingClass: cls selector: baseSym].
	^ fn
%

category: 'Grail-Metaclass'
method: object
___grailSetMetaclass___: aMetaclass
	"Record a ``class C(metaclass=M)'' keyword.  A RECORD, not a construction:
	builtins >> type: answers the single canonical ``type'' BoundMethod as any
	class's metaclass, so there is no metaclass object and class creation has
	nowhere to route.  What it buys is that a metaclass-defined comparison can be
	found for ``A < B'' -- functools.total_ordering's metaclass case."

	| tbl |
	((aMetaclass isKindOf: Behavior) and: [self isKindOf: Behavior]) ifFalse: [^ self].
	tbl := SessionTemps @env0:current
		@env0:at: #'GrailClassMetaclass'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	tbl @env0:at: self put: aMetaclass.
	^ self
%

category: 'Grail-Metaclass'
method: object
___metaclassMethodFor___: aSym
	"A METHOD compiled on this class's recorded ``metaclass='', bound with this
	class as ``self'' -- or nil when there is no metaclass or it defines no such
	method.

	___pyAttrLoad___ answers the ATTRIBUTE form of this question itself (a
	metaclass def read off the class).  This exists for the send that loads no
	attribute at all: ___tryMetaclassMethodDNU___:args: -- see there for why a
	metaclass method self-sending to a sibling never reaches the attribute path.

	The binding is what makes the CPython signature come out right.  ABCMeta
	writes ``def register(cls, subclass)'' and it is called ``B.register(V)'':
	the class is the receiver, not an argument.  A MethodBinding prepends this
	class to the call arguments and the UnboundMethod pops it back off as the
	receiver, so the metaclass's method runs NON-virtually with self = the using
	class -- which is exactly the object it expects, and is not in its own
	chain."

	| meta family owner |
	meta := self ___grailMetaclass___.
	meta == nil ifTrue: [^ nil].
	"A name the metaclass does not define is the common case -- every send that
	gets this far has already missed everywhere else -- so try the 0-arg
	spelling on its own first and build the seven-selector family only when that
	misses."
	owner := meta @env0:whichClassIncludesSelector: aSym environmentId: 1.
	owner == nil ifTrue: [
		family := self ___selectorFamilyFor___: aSym string: aSym @env0:asString.
		1 to: 7 do: [:i |
			owner == nil ifTrue: [
				owner := meta @env0:whichClassIncludesSelector: (family @env0:at: i)
					environmentId: 1]]].
	owner == nil ifTrue: [^ nil].
	^ MethodBinding
		instance: self
		callable: (UnboundMethod definingClass: meta selector: aSym)
%

category: 'Grail-Metaclass'
method: object
___grailMetaclassCmp___: baseSym with: other
	"An ordering dunder defined by this class's recorded METACLASS.  Python looks
	an operator up on the operand's type, and for ``class A(metaclass=M)'' that is
	M, so ``A < B'' runs M.__lt__(A, B).

	Mirrors ___classAttrCmp___ deliberately, INCLUDING the invocation:
	``___pyCallValue___'' on the handle, not UnboundMethod >> value:value:.  The
	latter goes through performMethod: primitives and raised UncontinuableError
	2758 (``return ... would cross frame of C primitive'') from inside a
	comparison, where this path's own Python call is already safe.

	Two shapes to find: a compiled ``def __lt__'' on the metaclass, and an
	attribute one -- total_ordering SYNTHESISES the derived operators as
	attributes, which is exactly the case this exists for.  The attribute lives
	ON the metaclass, so the lookup is ___classChainAttrLookup___ rather than
	___classAttrDunder___, which would ask the metaclass's own metaclass."

	| meta fn r |
	meta := self ___grailMetaclass___.
	meta == nil ifTrue: [^ nil].
	fn := meta ___classChainAttrLookup___: baseSym.
	fn == nil ifTrue: [fn := meta ___classAttrDunder___: baseSym].
	fn == nil ifTrue: [
		(meta @env0:whichClassIncludesSelector:
			(baseSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1)
				== nil ifTrue: [^ nil].
		fn := UnboundMethod definingClass: meta selector: baseSym].
	r := fn ___pyCallValue___: { self. other } kw: nil.
	(r == (Python @env0:at: #NotImplemented otherwise: nil)
		or: [r @env0:== #'___NotImplemented___']) ifTrue: [^ nil].
	^ r
%

category: 'Grail-Comparison'
method: object
___cmpFallback___: other op: opString reflected: refSelector
	"Python rich-comparison fallback for an unsupported operand pair: the
	forward dunder returned NotImplemented / punted, so try the REFLECTED
	dunder on ``other'' (``1 < Meters(2)'' runs Meters.__gt__), else raise the
	catchable Python TypeError CPython raises for unorderable types.
	(Previously these paths fell through to env-0 comparison primitives, whose
	ArgumentTypeError / 'Expected a Number' / _generality errors escape Python
	try/except entirely -- the STERROR class that blocked CPython's test_bisect
	/ test_operator / test_heapq / test_re.)

	Three operand kinds:
	  * a PythonInstance ``other'' whose class defines the reflected dunder as a
	    COMPILED method (``def __gt__'') -- call it directly; a NotImplemented
	    result falls through to the TypeError.
	  * a PythonInstance ``other'' whose reflected dunder is a CLASS ATTRIBUTE
	    (``__gt__ = __lt__'' alias in the class body, or a runtime setattr) --
	    invisible to whichClassIncludesSelector:, so consult ___classAttrDunder___
	    (the lookup ___binOpFallback___ uses for __radd__ & co.).  test_bisect's
	    CmpErr aliases its comparison dunders this way; without it ``10 < CmpErr()''
	    raised TypeError instead of propagating CmpErr.__gt__'s ZeroDivisionError.
	  * a BUILT-IN ``other'' that overrides it -- e.g. a plain int vs an int
	    SUBCLASS whose forward __lt__ returned NotImplemented (test_heapq's
	    EvilClass / g / h heap-mutation cases; int subclasses are AbstractPyInt,
	    not PythonInstance, so the first branch skips them).  Built-in
	    comparison dunders ESCALATE back here rather than returning the
	    NotImplemented singleton, so a symmetric unorderable pair (``(1,) < 2'')
	    would ping-pong forward<->reflected forever.  A session re-entrancy
	    flag guards ONLY this built-in-reflected path: the outermost call tries
	    the reflected op; a recursive re-entry skips straight to the TypeError,
	    unwinding to a single clean error.  A TypeError raised by the built-in
	    (it cannot order the pair) is likewise swallowed so the message stays
	    self-op-other."

	| refOwner rr temps refBase fn |
	refOwner := other @env0:class
		@env0:whichClassIncludesSelector: refSelector environmentId: 1.
	(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
		(other isKindOf: PythonInstance)
			ifTrue: [
				rr := other @env0:perform: refSelector env: 1 withArguments: { self }.
				(rr @env0:== #'___NotImplemented___') ifFalse: [^ rr]]
			ifFalse: [
				"Restrict the built-in-reflected path to a NUMERIC ``other'' (plain
				int/float AND their subclasses are all isKindOf: Number).  That is
				exactly what the heap-mutation cases need -- a plain int reflected
				against an int subclass whose __lt__ punted -- while leaving
				CONTAINER comparison untouched: a list/tuple/str reflected op can
				clear/mutate an operand or escalate in ways that change list
				comparison semantics (CPython gh-120298, list_tests
				test_lt_operator_modifying_operand)."
				(other isKindOf: Number) ifTrue: [
					temps := SessionTemps @env0:current.
					(temps @env0:at: #'___GrailReflectingBuiltinCmp___' otherwise: false) ifFalse: [
						temps @env0:at: #'___GrailReflectingBuiltinCmp___' put: true.
						rr := [[other @env0:perform: refSelector env: 1 withArguments: { self }]
								@env0:on: TypeError do: [:e | #'___NotImplemented___']]
							@env0:ensure: [temps @env0:at: #'___GrailReflectingBuiltinCmp___' put: false].
						(rr @env0:== #'___NotImplemented___') ifFalse: [^ rr]]]]].
	"Reflected dunder stored as a CLASS ATTRIBUTE on a PythonInstance ``other''
	(``__gt__ = __lt__'' alias or runtime setattr) -- the compiled-selector probe
	above (refOwner) never sees it.  Strip the trailing ':' (#'__gt__:' ->
	#'__gt__') and call it reflected: other.__gt__(self).  Same ___classAttrDunder___
	lookup ___binOpFallback___ uses for __radd__ & co.; user code returns the real
	NotImplemented singleton here, not the internal symbol."
	(other isKindOf: PythonInstance) ifTrue: [
		refBase := (refSelector @env0:asString @env0:copyFrom: 1
			to: refSelector @env0:asString @env0:size - 1) @env0:asSymbol.
		fn := other ___classAttrDunder___: refBase.
		fn == nil ifFalse: [
			rr := fn ___pyCallValue___: { other. self } kw: nil.
			(rr == (Python @env0:at: #NotImplemented otherwise: nil)) ifFalse: [^ rr]]].
	^ self ___cmpUnorderable___: other op: opString
%

category: 'Grail-Comparison'
method: object
__lt__: other
	"Return self < other"

	| r |
	r := self ___classAttrCmp___: #'__lt__' with: other.
	r == nil ifFalse: [^ r].
	"...then this class's recorded metaclass: Python looks an operator up on the
	operand's TYPE, and for a class that is its metaclass."
	r := self ___grailMetaclassCmp___: #'__lt__' with: other.
	r == nil ifFalse: [^ r].
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
	"``def __ne__(*args)'' compiles to ___ne__:kw: with no __ne__: alias."
	eqr := self ___varargsDunder___: #'___ne__:kw:' with: other.
	eqr == nil ifFalse: [^ eqr].
	fn := self ___dynamicClassAttr___: #'__eq__'.
	fn == nil ifFalse: [
		"A NotImplemented __eq__ must NOT be negated (``NI not'' is an
		uncatchable Symbol DNU); return it so ___cmpNe___ / the caller runs
		the reflected-op / identity fallback."
		eqr := fn ___pyCallValue___: { self. other } kw: nil.
		(eqr @env0:== #'___NotImplemented___') ifTrue: [^ eqr].
		^ eqr @env0:not].
	eqOwner := self @env0:class @env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
	"object itself implements __eq__:, so the owner is never nil for a
	PythonInstance -- test ``is object's own'', not ``is missing'', or the
	varargs probe below is dead code and a ``def __eq__(*args)'' class looks
	like it has no __eq__ at all."
	(eqOwner @env0:isNil or: [eqOwner @env0:== object]) ifTrue: [
		eqOwner := self @env0:class @env0:whichClassIncludesSelector: #'___eq__:kw:' environmentId: 1].
	(eqOwner @env0:notNil and: [eqOwner ~~ object]) ifTrue: [
		eqr := self __eq__: other.
		(eqr @env0:== #'___NotImplemented___') ifTrue: [^ eqr].
		^ eqr @env0:not].
	"No __eq__ / __ne__ of our own: answer a kernel VALUE match outright (see
	__eq__:'s comment -- Fraction(-1, 2) != Fraction(1, -2) must stay False),
	and otherwise punt.  CPython's object.__ne__ answers NotImplemented too
	(its __eq__ did), leaving the reflected operand and then identity to
	___cmpNe___ -> ___neValue___; answering identity here pre-empted the
	reflected __ne__ / __eq__ entirely."
	(self @env0:= other) ifTrue: [^ false].
	^ #'___NotImplemented___'
%

category: 'Grail-Serialization'
method: object
__reduce__
	"Default pickle reduce.  Answers the NotImplemented singleton to signal
	pickle.py that this object has NO custom reduce, so it should be pickled
	generically -- by class reference plus __getstate__ (pickle.py's ``O''
	tag), rebuilt via object.__new__(cls).  Doing it this way (rather than
	returning a (reconstructor, args, state) tuple like CPython) avoids having
	to pickle a reconstructor function by reference: Grail module functions are
	BoundMethods with no __module__, so they cannot round-trip as globals.

	A class defining its OWN __reduce__ (e.g. functools.partial) overrides
	this, returning a real tuple that pickle.py handles via the ``r'' tag.
	Previously this raised ``Not yet implemented: __reduce__''."

	^ NotImplemented
%

category: 'Grail-Serialization'
method: object
__reduce_ex__: protocol
	"Return state for pickling with protocol version.

	CPython's object.__reduce_ex__ defers to __reduce__ whenever the class
	overrides it, so any type that defines __reduce__ gets __reduce_ex__
	for free -- date/time/datetime/timedelta/timezone all rely on that
	(``orig.__reduce__() == orig.__reduce_ex__(2)'' in test_pickling).
	A class that overrides NEITHER still lands on object>>__reduce__
	below, which reports that it is not implemented."

	^ self __reduce__
%

category: 'Grail-String Representation'
method: object
__repr__
	"Return a string representation for debugging.

	Probe for a setattr-installed ``__repr__'' on the class chain
	(the dataclass decorator installs one via ``cls.__repr__ =
	synth_fn'').  When present, bind self and forward; the synthesized
	closure renders ``ClassName(field=value, ...)''.  When absent,
	fall through to the default ``<module.QualName object at 0x...>''."

	| myClass className stream fn mcOwner mod |
	fn := self ___dynamicClassAttr___: #'__repr__'.
	fn == nil ifFalse: [^ fn ___pyCallValue___: { self } kw: nil].
	"A ``@staticmethod def __repr__()'' (a dunder with no self) defined in the
	class body lands on the class's OWN metaclass (class side); CPython
	invokes it as the instance repr.  Reached here only when there is no
	instance-side __repr__.  Guard on the OWN metaclass so an inherited
	metaclass __repr__ (which reprs the CLASS) is not misfired for instances
	(test_list test_repr_mutate)."
	mcOwner := self @env0:class @env0:class @env0:whichClassIncludesSelector: #'__repr__' environmentId: 1.
	(mcOwner @env0:notNil and: [mcOwner @env0:== (self @env0:class @env0:class)]) ifTrue: [
		^ self @env0:class @env0:perform: #'__repr__' env: 1].
	"CPython object_repr:

	    if (mod != NULL && !equal(mod, ""builtins""))
	        ""<%U.%U object at %p>"" % (mod, qualname, self)
	    else
	        ""<%s object at %p>"" % (tp_name, self)

	so the module qualifies the name unless it is builtins, the NAME is the
	__qualname__ (an inner class reads ``Outer.Inner''), and the address is
	id(self) in hex -- which is why unittest's assertRegex, not assertEqual, is
	what CPython's own tests match a default repr with.  Grail printed
	``<Foo object>'', naming neither the module nor the object.

	id() is builtins id:, i.e. identityHash, so ``hex(id(x)) in repr(x)'' holds
	the way it does in CPython.  Falls back to the class name for either part
	that cannot be read, since a repr must not raise.

	Both parts are taken only when they are STRINGS, which object_repr is
	explicit about (``else if (!PyUnicode_Check(mod)) mod = NULL'').  It earns
	its keep here: several of Grail's own classes answer something else
	entirely for __module__ -- BoundMethod answers an UnboundMethod -- and
	without the check that object printed as ``<anUnboundMethod.BoundMethod
	object at 0x...>''."

	myClass := self @env0:class.
	className := [ | qn |
		qn := myClass @env1:___pyAttrLoad___: #'__qualname__'.
		(qn isKindOf: CharacterCollection)
			ifTrue: [qn @env0:asString]
			ifFalse: [myClass @env0:name @env0:asString] ]
		@env0:on: AbstractException do: [:e | e @env0:return: myClass @env0:name @env0:asString].
	mod := [ | mv |
		mv := myClass @env1:___pyAttrLoad___: #'__module__'.
		(mv isKindOf: CharacterCollection) ifTrue: [mv @env0:asString] ifFalse: [nil] ]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $<.
	(mod @env0:notNil and: [mod @env0:~= 'builtins']) ifTrue: [
		stream @env0:nextPutAll: mod.
		stream @env0:nextPut: $.].
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object at 0x'.
	stream @env0:nextPutAll:
		(self @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase.
	stream @env0:nextPut: $>.
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

	| sym setterSym enumCls rec |
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
	((self ___respondsTo___: sym)
		and: [self ___respondsTo___: setterSym])
		ifTrue: [^ self @env0:perform: setterSym env: 1 withArguments: { value }].
	^ self ___pyAttrStore___: name put: value
%

category: 'Grail-Attribute Access'
classmethod: object
___stampPythonIdentity___: aModuleName qualname: aQualname
	"Give a SMALLTALK-defined class the ``__module__'' / ``__qualname__'' a
	Python-defined one gets from its class body -- the module it is EXPORTED
	from and the name it is exported under.

	Not cosmetic.  Those two are how an object is pickled BY REFERENCE, and
	without __module__ pickle falls back to whichmodule(), which SCANS
	sys.modules for a module exposing the object under its __qualname__.  That
	scan is order-dependent by construction, so whether such a class pickles at
	all depends on which modules an earlier test happened to import:

	    enum.property           -- __qualname__ 'DynamicClassAttribute'
	    types                   -- exposes it under exactly that name

	so pickle.dumps(enum.property) raised PicklingError in a fresh session and
	succeeded once anything had imported types.  A whole-suite run imports it;
	a single-test run does not, which is why EnumPickleByNameTestCase passed
	alone and failed in company.  CPython has no such gap: its classes carry
	__module__, so whichmodule returns on the first line and never scans.

	setattr cannot do this -- ___pyAttrStore___ refuses a non-Python class --
	so the accessors are COMPILED class-side, which is the same shape
	ClassDefAst emits for a Python class body.  Best-effort per accessor: a
	class whose metaclass will not take a method must not abort a module's
	initialize."

	self ___stampPythonIdentityAccessor___: '__module__' value: aModuleName.
	self ___stampPythonIdentityAccessor___: '__qualname__' value: aQualname.
	^ self
%

category: 'Grail-Attribute Access'
classmethod: object
___stampPythonIdentityAccessor___: aName value: aValue
	"One literal-returning class-side accessor for ___stampPythonIdentity___:.
	'Grail-Class Attrs' is the category the class-attribute read path already
	consults -- see ___pyAttrLoad___'s Behavior branch.

	KNOWN DIVERGENCE, and the reason this helper is applied one class at a
	time rather than swept across every Smalltalk class: Grail makes a class
	attribute visible from an INSTANCE, which is right for a Python class
	(``class C: pass'' really does give ``C().__module__'') but not for the
	builtin-like types stamped here.  CPython keeps these on the TYPE alone --
	``property.__module__'' is 'builtins' while ``property(g).__module__''
	raises -- because the value comes from a getset on ``type'' rather than
	from the class dict.  Compiling a raising INSTANCE-side __module__ does not
	fix it: the class-attribute branch is consulted first and wins.

	So stamping a class whose instances are themselves picklable would trade
	one bug for a worse one -- pickle would find a __module__ on the instance
	and save it BY REFERENCE as the CLASS, silently, where it used to refuse.
	Stamp only classes whose instances do not travel that way."

	[self @env0:class ___compileMethod:
		aName @env0:, '
	^ ''' @env0:, aValue @env0:asString @env0:, ''''
		category: 'Grail-Class Attrs']
			@env0:on: AbstractException do: [:e | nil].
	^ self
%

category: 'Grail-Attribute Access'
classmethod: object
___pyChangeClassOf: anObject to: newClass
	"Back ``anObject.__class__ = newClass''.  Compiled by AssignAst as
	``object ___pyChangeClassOf: <target> to: <value>'' rather than through
	__setattr__, which would pin the target on the stack as ``self'' and make
	changeClassTo: raise rtErrCantBecomeSelfOnStack -- here the target is only
	an ARGUMENT.  changeClassTo: reassigns the class in place when newClass has
	a compatible instance layout (same format + named-instVar shape) and raises
	otherwise, which surfaces as CPython's ``__class__ assignment ... layout''
	TypeError.  Returns None (test_sort test_unsafe_object_compare)."

	(newClass isKindOf: Behavior) ifFalse: [
		^ TypeError ___signal___:
			'__class__ must be set to a class, not ''' @env0:,
			(newClass @env0:class @env0:name @env0:asString) @env0:, ''' object'].
	[anObject @env0:changeClassTo: newClass]
		@env0:on: Error
		do: [:ex |
			^ TypeError ___signal___:
				'__class__ assignment: ''' @env0:,
				(newClass @env0:name @env0:asString) @env0:,
				''' object layout differs from ''' @env0:,
				(anObject @env0:class @env0:name @env0:asString) @env0:, ''''].
	^ None
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

	"A CLASS reached through the INDIRECT protocol CONSTRUCTS, exactly as a
	direct ``Cls(...)'' does -- value:value: is the universal call protocol
	(BoundMethod, class objects, blocks, partials all dispatch through it).

	A direct call compiles to value:value: and never comes here, so what this
	governs is a class reached indirectly: through a variable, handed to
	something that invokes its argument generically, or -- the case that
	motivated it -- used as a DECORATOR.  Both the module-level and the
	class-body decorator emitters wrap their rebinding store in an
	error-swallowing guard, so raising here did not surface as a TypeError:
	the decoration silently did not happen and the plain function survived
	(``@Wrap def z'' left z a BoundMethod; ``@enum.property'' / ``@member''
	never applied at all).

	This used to raise for every class, because applying ``@enum.property''
	made Grail's enum member builder count the resulting descriptor as a
	MEMBER (Django's Choices grew a spurious ``label'' member, and
	IntegerChoices could then no longer extend it).  The builder now
	implements CPython's rule that a descriptor is never a member -- see the
	_EnumDict pre-passes in Enum class>>___grailBuildMembers:names: and
	>>___grailFunctional:positional:keywords: -- so the restriction is gone,
	and the classes that opted in with a class-side ___pyCallValue___:kw: of
	their own (functools_cached_property, functools_partial) now merely
	shortcut what this answers anyway."
	(self isKindOf: Behavior) ifTrue: [
		^ self @env1:value: positional value: kwargs].
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
		(self ___respondsTo___: #dynInstVars)
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
	(self ___respondsTo___: #'___pyHasSlots___') ifTrue: [
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
	"Data-descriptor priority: ``del obj.prop'' on a @property runs its deleter
	(or raises ``has no deleter'') rather than removing an instance attribute.
	Covers the decorator form (a ``___propDeleter_x'' selector, with a
	paired getter+setter marking it a property) and the call form (a
	PropertyDescriptor class attribute)."
	(self ___pyInstanceDescriptorDelete___: aName) ifTrue: [^ self].
	(self @env0:dynamicInstVarAt: sym) == nil ifTrue: [
		AttributeError ___signal___:
			'''' @env0:, aName @env0:asString @env0:, ''''
	].
	self @env0:removeDynamicInstVar: sym
%

category: 'Grail-Attribute Access'
method: object
___pyInstanceDescriptorStore___: aName put: aValue
	"True when a @property claims ``obj.<aName> = value'' -- see ___pyAttrStore___.

	(1) The @property DECORATOR compiles a paired unary getter + 1-arg setter as
	    INSTANCE methods.  Their presence together is the property marker -- the
	    SAME test the read path uses (a plain 1-arg method has no unary partner,
	    AttributeStoreTestCase) -- so dispatch the store to the setter, which
	    writes the backing or raises for a read-only property.
	(2) The CALL form ``x = property(...)'' binds a PropertyDescriptor as a class
	    attribute; ask it to __set__ (raising ``has no setter'' when read-only)."

	| getterSym setterSym descr |
	getterSym := aName @env0:asString @env0:asSymbol.
	setterSym := (aName @env0:asString @env0:, ':') @env0:asSymbol.
	((self @env0:isKindOf: PythonInstance)
		and: [(self ___respondsTo___: getterSym)
			and: [self ___respondsTo___: setterSym]])
		ifTrue: [
			self @env0:perform: setterSym env: 1 withArguments: { aValue }.
			^ true].
	descr := self ___instancePropertyDescriptorFor___: aName.
	descr ~~ nil ifTrue: [
		descr __set__: self _: aValue.
		^ true].
	^ false
%

category: 'Grail-Attribute Access'
method: object
___pyInstanceDescriptorDelete___: aName
	"True when a @property claims ``del obj.<aName>''.

	The DECORATOR deleter lives under a private ``___propDeleter_x'' selector
	(ClassDefAst redirects it there so it does not clobber the unary getter);
	its presence alone means ``run the deleter''.  Deliberately NOT gated on the
	getter+setter pairing: a read-only @property or a @cached_property has that
	pairing but no deleter, and CPython's cached_property is a NON-data
	descriptor whose ``del'' drops the cached instance value -- so those fall
	through to the ordinary instance-attribute delete rather than raising here.
	The CALL form asks its PropertyDescriptor to __delete__ (which raises ``has
	no deleter'' when fdel is absent)."

	| delSym descr |
	delSym := ('___propDeleter_' @env0:, aName @env0:asString) @env0:asSymbol.
	((self @env0:isKindOf: PythonInstance)
		and: [self ___respondsTo___: delSym])
		ifTrue: [self @env0:perform: delSym env: 1. ^ true].
	descr := self ___instancePropertyDescriptorFor___: aName.
	descr ~~ nil ifTrue: [descr __delete__: self. ^ true].
	^ false
%

category: 'Grail-Attribute Access'
method: object
___instancePropertyDescriptorFor___: aName
	"The PropertyDescriptor bound to aName as a CLASS attribute of this
	instance's class (or an ancestor), read RAW without firing __get__ -- or nil.
	Covers a class-body ``x = property(...)'' (via the class-side accessor) and a
	runtime ``setattr(cls, 'x', property(...))'' (the per-class dynInstVars
	holder).  Used by the store/delete descriptor hooks for the call form."

	| aSym raw walker holder |
	aSym := aName @env0:asString @env0:asSymbol.
	(self @env0:class @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) ~~ nil
		ifTrue: [
			raw := [self @env0:class @env0:perform: aSym env: 1]
				@env0:on: AbstractException do: [:e | nil].
			(raw @env0:isKindOf: PropertyDescriptor) ifTrue: [^ raw]].
	walker := self @env0:class.
	[walker == nil] @env0:whileFalse: [
		(walker ___respondsTo___: #dynInstVars) ifTrue: [
			holder := walker @env0:perform: #dynInstVars env: 1.
			holder == nil ifFalse: [
				raw := holder @env0:dynamicInstVarAt: aSym.
				(raw @env0:isKindOf: PropertyDescriptor) ifTrue: [^ raw]]].
		walker := walker @env0:superClass].
	^ nil
%

category: 'Grail-Attribute Access'
method: object
___ownDynInstVarHas___: aSym
	"True when this class's OWN per-class dynInstVars holder binds aSym (a
	definitional store: a nested class def, an if-branch class-body binding, a
	setattr on THIS class).  Own-only -- does not walk the superclass chain --
	so the class-read precedence check stays scoped to genuine MRO conflicts."

	| holder |
	(self ___respondsTo___: #dynInstVars) ifFalse: [^ false].
	holder := self @env0:perform: #dynInstVars env: 1.
	holder == nil ifTrue: [^ false].
	^ (holder @env0:dynamicInstVarAt: aSym) ~~ nil
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
		| setterSym getterSym |
		"Installing __hash__ on a class at runtime has to become visible to
		hash(), which reaches Object >> __hash__ by an ordinary message send and
		so cannot see a dynamic class attribute.  Record that one exists; that
		method probes only when this flag is set, keeping the hash hot path free
		for every program that never does this."
		(aName @env0:asString @env0:= '__hash__') ifTrue: [
			SessionTemps @env0:current @env0:at: #'GrailDynamicHashSeen' put: true].
		"``cls.__qualname__ = 'Outer.Inner''' is a WRITABLE slot in CPython, and
		pickle depends on it: a class defined in a function body is pickled by
		walking its dotted qualname from the module, so the idiom is to attach
		the class somewhere reachable and then say where it now lives.

		    self.__class__.NestedEnum = NestedEnum
		    NestedEnum.__qualname__ = 'TestSpecial.NestedEnum'

		Grail dropped the store silently: the class-side READ of __qualname__
		always performs the getter (it must, so ``type(x).__qualname__'' is a
		string and not a bound method), and the getter reads a DIFFERENT slot --
		___qualname___, which ClassDefAst fills for a nested class at build
		time.  Route the store to that slot, so an assignment overrides the
		build-time value through the one path the getter already honours.
		test_enum test_pickle_nested_class."
		(aName @env0:asString @env0:= '__qualname__') ifTrue: [
			^ self ___classHolderAttrStore___: #'___qualname___' put: aValue].
		"``cls.__name__ = 'T''' is writable too, and dropped for the same reason:
		the class-side read performs the getter, which derives the name from the
		Smalltalk class rather than looking for a stored one.  A class FACTORY is
		what needs it -- collections.namedtuple builds one class and then names
		it after the typename it was asked for, which is also what makes the
		result picklable."
		(aName @env0:asString @env0:= '__name__') ifTrue: [
			^ self ___classHolderAttrStore___: #'___name___' put: aValue].
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
		"Dispatch to a static setter ONLY when a PAIRED unary getter
		also exists — real class attributes / @property are always a
		getter+setter pair.  Probing the setter alone mis-fires for
		binary dunders: the metaclass chain bottoms out at Object, so
		``__eq__:'' / ``__ne__:'' / ``__lt__:'' (comparison methods, no
		unary getter) look like setters and ``setattr(cls, '__eq__',
		fn)'' would dispatch ``cls __eq__: fn'' instead of storing fn.
		The dataclass decorator relies on this store landing in
		dynInstVars so object>>__eq__ can find it."
		((self ___respondsTo___: setterSym)
			and: [self ___respondsTo___: getterSym])
			ifTrue: [^ self @env0:perform: setterSym env: 1 withArguments: { aValue }].
		"Python user class — store in the per-class dynInstVars dict."
		(self ___respondsTo___: #dynInstVars)
			ifTrue: [^ self ___classHolderAttrStore___: aName put: aValue].
		"Built-in / non-Python class with no setter — AttributeError."
		^ AttributeError ___signal___:
			'''' @env0:, self @env0:name @env0:asString @env0:,
				''' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
	].
	"Data-descriptor priority (CPython): a @property intercepts the instance
	store -- dispatch to its setter, which writes the backing (or raises for a
	read-only property), instead of writing an instance attribute that would
	shadow the getter.  Covers both the decorator form (paired unary getter +
	1-arg setter METHODS) and the call form (a PropertyDescriptor bound as a
	class attribute).  Returns false when no property claims aName, leaving the
	ordinary instance-dict store below untouched (AttributeStoreTestCase)."
	(self ___pyInstanceDescriptorStore___: aName put: aValue) ifTrue: [^ aValue].
	"Python __slots__ → GemStone named instance variables.  For a
	PythonInstance receiver: a name declared in __slots__ (i.e. a named
	instVar) is written directly; otherwise, a strict slotted class
	(declares __slots__ without a __dict__) rejects the name with
	AttributeError (CPython semantics).  Any other instance — including a
	non-strict slotted class (it has a __dict__) — falls back to
	dynamic-instVar storage."
	(self ___respondsTo___: #'___pyHasSlots___') ifTrue: [
		| slotIdx |
		slotIdx := self @env0:class @env0:allInstVarNames
			@env0:indexOf: (('___slot_' @env0:, aName @env0:asString @env0:, '___') @env0:asSymbol).
		slotIdx @env0:~= 0 ifTrue: [
			self @env0:instVarAt: slotIdx put: aValue.
			^ aValue
		].
		(self ___respondsTo___: #'___pySlotsStrict___') ifTrue: [
			^ AttributeError ___signal___:
				'''' @env0:, self @env0:class @env0:name @env0:asString @env0:,
					''' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''
		].
	].
	self ___pyStoreDynamic___: aName @env0:asSymbol put: aValue.
	^ aValue
%

category: 'Grail-String Representation'
method: object
__str__
	"CPython: object.__str__ delegates to __repr__ -- str() falls back to
	repr() for any object that does not override __str__.  Grail previously
	returned the GemStone printString here, so a class whose only str
	customization was a __repr__ (or ``__str__ = object.__str__'', which is
	defined to route through __repr__) rendered the Smalltalk printString
	instead of the Python repr (test_enum's test_object_str_override)."

	^ self __repr__
%

category: 'Grail-Other'
method: object
__subclasshook__: subclass
	"Customize issubclass() for abstract base classes.  The default DECLINES,
	which is what lets a caller tell ``this hook has no opinion'' apart from
	``this hook says no'' -- ABCMeta.__subclasscheck__ consults the registry
	only when the answer is NotImplemented, so returning false here would make
	every registered virtual subclass invisible.

	The TODO this replaces (``once NotImplementedType is created'') was
	discharged long ago: Python >> NotImplemented is the singleton, and it is
	what CPython's object.__subclasshook__ returns.  Until then any class
	reaching the default raised, which is why nothing could call it."

	^ Python @env0:at: #NotImplemented otherwise: nil
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

"No <primitive:> here: the session-method install user (an ordinary, non-SystemUser
 user) may not compile primitive methods.  The body below is the correct implementation --
 it delegates to the native env-0 _perform:env:withArguments:, which carries
 the real primitive -- so dropping the pragma only loses a fast path."
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

"No <primitive:> here (see perform:env: above); delegates to native env-0 _perform:."
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

"No <primitive:> here (see perform:env: above); delegates to native env-0 _perform:."
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
	(self @env1:___respondsTo___: vaSel)
		ifTrue: [^ self perform: vaSel env: 1
			withArguments: { anArray. nil }].
	^ self @env1:___binOpFallback___: (anArray at: 1)
		op: (binOp at: 1) reflected: (binOp at: 2)
%

category: 'Grail-Attribute Access'
method: object
___tryClassMethodDNU___: aSelector args: anArray
	"@classmethod reached through an INSTANCE.

	Codegen emits a direct instance-side send for ``self.cm(args)'',
	but ClassDefAst compiles @classmethod/@staticmethod defs onto the
	METACLASS (category ``Grail-Class Methods'').  Forward with the
	class as the receiver, matching Python's classmethod-via-instance
	binding.

	PythonInstance carries its own copy of this probe because there it
	must run BEFORE that class's attribute-setter interpretation (a
	1-arg ``cm:'' would otherwise be stored as an instance attribute).
	This one serves every OTHER receiver -- in particular subclasses of
	kernel classes (str/bytes/tuple/list/dict), which are NOT
	PythonInstances and so never reach that copy.  markupsafe's
	``Markup.__add__'' calling ``self.escape(value)'' is the motivating
	case.

	Both the plain selector and the varargs form (``_cm:kw:'', emitted
	when the def has *args/**kwargs or defaults) are probed.  The
	category gate keeps synthesized class-attribute accessors
	(``Grail-Class Attrs'') and ordinary Smalltalk class-side methods
	out.  Answers #'___noClassMethod___' when nothing matches."

	| meta owner s |
	meta := self class class.
	owner := meta whichClassIncludesSelector: aSelector environmentId: 1.
	(owner notNil and: [
		(owner categoryOfSelector: aSelector environmentId: 1)
			= #'Grail-Class Methods']) ifTrue: [
		^ self class perform: aSelector env: 1
			withArguments: anArray asArray].
	s := aSelector asString.
	(s size > 0 and: [s last = $:]) ifTrue: [
		| colonIdx baseName varargsSel |
		colonIdx := s indexOf: $:.
		baseName := s copyFrom: 1 to: colonIdx - 1.
		varargsSel := ('_' , baseName , ':kw:') asSymbol.
		owner := meta whichClassIncludesSelector: varargsSel environmentId: 1.
		(owner notNil and: [
			(owner categoryOfSelector: varargsSel environmentId: 1)
				= #'Grail-Class Methods']) ifTrue: [
			| wrapped |
			wrapped := Array new: 2.
			wrapped at: 1 put: anArray asArray.
			wrapped at: 2 put: nil.
			^ self class perform: varargsSel env: 1 withArguments: wrapped]].
	^ #'___noClassMethod___'
%

category: 'Grail-Attribute Access'
method: object
___tryMetaclassMethodDNU___: aSelector args: anArray
	"A metaclass method reached by a DIRECT SEND rather than an attribute load.

	``ABCMeta.__instancecheck__'' ends in ``return cls.__subclasscheck__(...)'',
	and inside a method ``cls'' IS the receiver, so codegen takes the self-send
	fast path and emits a plain ``__subclasscheck__:'' send.  That dispatches on
	the USING class, where the sibling metaclass method is not -- Grail records a
	metaclass rather than making the class an instance of it, so the two live in
	unrelated chains.  ___pyAttrLoad___'s metaclass consult never runs, because
	no attribute was loaded.

	Catching it here rather than teaching the fast path to sit this one out keeps
	the cost where it belongs: on the miss, which is the only case that needs it.
	Answers #'___noMetaMethod___' when nothing matches, so a genuine unknown send
	still raises MNU.

	Only a Behavior receiver qualifies.  An INSTANCE of a class whose metaclass
	defines the selector must not reach it -- in Python a metaclass method is not
	part of the instance protocol."

	| s base handle isVarargs |
	(self isKindOf: Behavior) ifFalse: [^ #'___noMetaMethod___'].
	self @env1:___grailMetaclass___ == nil ifTrue: [^ #'___noMetaMethod___'].
	s := aSelector asString.
	base := (s includesValue: $:)
		ifTrue: [s copyFrom: 1 to: (s indexOf: $:) - 1]
		ifFalse: [s].
	"The varargs form arrives as ``_name:kw:'' carrying {positional. kwargs}
	rather than the arguments themselves; its Python name drops the leading
	underscore this convention added."
	isVarargs := (s endsWith: ':kw:')
		and: [base size > 1 and: [(base at: 1) == $_]].
	isVarargs ifTrue: [base := base copyFrom: 2 to: base size].
	handle := self @env1:___metaclassMethodFor___: base asSymbol.
	handle == nil ifTrue: [^ #'___noMetaMethod___'].
	isVarargs ifTrue: [
		^ handle @env1:value: (anArray at: 1) value: (anArray at: 2)].
	^ handle @env1:value: anArray asArray value: nil
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

	| s md cls binOp clsMeth metaMeth |
	envId = 1 ifFalse: [
     ^ MessageNotUnderstood new
         receiver: self selector: aSelector args: anArray envId: envId ; 
         signal ].
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
	"A METACLASS METHOD reached as a DIRECT SEND on the class.  Inside a compiled
	method body ``cls.__subclasscheck__(c)'' emits the send __subclasscheck__:
	rather than an attribute load, so the metaclass consult in ___pyAttrLoad___:
	never runs -- and the class's own Smalltalk metaclass, a Metaclass3, does not
	understand it.  That is how a metaclass calling its own sibling hook died
	(test_typechecks's ABC.__instancecheck__ calls cls.__subclasscheck__).

	Invoked with the class prepended as the cls parameter, and dispatched off
	the recorded metaclass because the class is not a Smalltalk instance of it."
	(self isKindOf: Behavior) ifTrue: [ | meta base tbl |
		"The table is read DIRECTLY: this runs in the DNU path for EVERY class
		that fails a send, including kernel classes whose metaclass chain does
		not reach object, where the env-1 ___grailMetaclass___ send is itself a
		MessageNotUnderstood."
		tbl := SessionTemps @env0:current
			@env0:at: #'GrailClassMetaclass' otherwise: nil.
		meta := tbl == nil ifTrue: [nil] ifFalse: [tbl @env0:at: self otherwise: nil].
		(meta @env0:notNil
			and: [(meta @env0:whichClassIncludesSelector: aSelector environmentId: 1)
				@env0:notNil]) ifTrue: [
			base := (s @env0:includes: $:)
				ifTrue: [s @env0:copyFrom: 1 to: (s @env0:indexOf: $:) @env0:- 1]
				ifFalse: [s].
			"This method compiles in env 0, so the UnboundMethod protocol -- which
			is env 1 -- needs explicit annotations."
			^ (UnboundMethod @env1:definingClass: meta selector: base @env0:asSymbol)
				@env1:value: (Array @env0:with: self) @env0:, anArray value: nil]].
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
		"@classmethod through an instance -- see ___tryClassMethodDNU___:."
		clsMeth := self ___tryClassMethodDNU___: aSelector args: anArray.
		clsMeth == #'___noClassMethod___' ifFalse: [^ clsMeth].
		"A sibling method on a recorded ``metaclass='' -- see
		___tryMetaclassMethodDNU___:args:."
		metaMeth := self ___tryMetaclassMethodDNU___: aSelector args: anArray.
		metaMeth == #'___noMetaMethod___' ifFalse: [^ metaMeth].
		^ MessageNotUnderstood new
        receiver: cls selector: aSelector args: anArray envId: envId ;
        signal
	].
	"Unary selector with 0 args — return BoundMethod if class has any
	same-named callable form (for `f = obj.method` patterns)."
	anArray size = 0 ifFalse: [
     ^ MessageNotUnderstood new
        receiver: cls selector: aSelector args: anArray envId: envId ; 
        signal ].
	((md includesKey: (s , ':') asSymbol)
		or: [(md includesKey: (s , ':_:') asSymbol)
			or: [(md includesKey: (s , ':_:_:') asSymbol)
				or: [md includesKey: ('_' , s , ':kw:') asSymbol]]])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSelector].
	"A 0-arg @classmethod called through an instance (``self.cm()'').
	Grail resolves the ``obj.m'' / ``obj.m()'' ambiguity in favour of
	CALLING for 0-arg instance methods, so do the same here."
	clsMeth := self ___tryClassMethodDNU___: aSelector args: anArray.
	clsMeth == #'___noClassMethod___' ifFalse: [^ clsMeth].
	"A 0-arg sibling method on a recorded ``metaclass='' -- see
	___tryMetaclassMethodDNU___:args:."
	metaMeth := self ___tryMetaclassMethodDNU___: aSelector args: anArray.
	metaMeth == #'___noMetaMethod___' ifFalse: [^ metaMeth].
  ^ MessageNotUnderstood new
      receiver: cls selector: aSelector args: anArray envId: envId ;
      signal
%

set compile_env: 1

category: 'Grail-Match Protocol'
method: object
___matchIsSequence___
	"PEP 634 sequence-pattern gate.

	The exclusion is the whole point: str, bytes and bytearray are
	sequences by every other measure, and PEP 634 rules them OUT so that
	``case [a, b]:'' does not match the string 'ab'.  Matching them would
	be silently wrong -- a two-character string quietly destructured into
	two single-character bindings.

	range is likewise excluded by CPython; everything else registered as a
	Sequence (list, tuple, and user classes with __len__ + __getitem__)
	matches."

	(self isKindOf: CharacterCollection) ifTrue: [^ false].
	(self isKindOf: AbstractPyStr) ifTrue: [^ false].
	(self isKindOf: bytes) ifTrue: [^ false].
	(self isKindOf: bytearray) ifTrue: [^ false].
	(self isKindOf: range) ifTrue: [^ false].
	(self isKindOf: list) ifTrue: [^ true].
	(self isKindOf: tuple) ifTrue: [^ true].
	"A MAPPING is not a sequence, and this is the exclusion that bites:
	dict answers both __len__ and __getitem__:, so a duck-typed gate let
	``case [x, y]:'' match a two-entry dict and then index it with 0 --
	a KeyError from inside a pattern that should simply not have matched.
	set is excluded for the same reason in reverse: no __getitem__:."
	self ___matchIsMapping___ ifTrue: [^ false].
	(self isKindOf: set) ifTrue: [^ false].
	(self isKindOf: frozenset) ifTrue: [^ false].
	"``___respondsTo___:'' is NOT enough: object itself carries __len__ and
	__getitem__: fallbacks that exist only to raise, so probing for them
	answered true for None -- and ``case [x, y]:'' then called __len__ on
	it and surfaced the fallback's TypeError from inside a pattern that
	should simply not have matched.  Ask WHICH class supplies them and
	reject the generic roots, the same test builtins uses to decide
	whether a class really implements a protocol."
	"Duck-typing is offered ONLY to user-defined Python classes.  Grail's
	built-in objects answer far more of the protocol than they implement
	-- probing None found both __len__ and __getitem__:, so ``case [x, y]:''
	matched None and then surfaced __len__'s TypeError from inside a
	pattern that should simply not have matched.  Restricting the duck
	test to PythonInstance keeps user Sequence classes working without
	letting a builtin answer for a protocol it only raises on.

	KNOWN GAP: a user class registered with collections.abc.Sequence but
	NOT defining __len__/__getitem__: itself still does not match a
	sequence pattern.  That is a silent non-match, so it is called out
	here rather than left to be discovered."
	(self isKindOf: PythonInstance) ifFalse: [^ false].
	^ (self ___matchDefinesOwnSelector___: #'__len__')
		and: [self ___matchDefinesOwnSelector___: #'__getitem__:']
%

category: 'Grail-Match Protocol'
method: object
___matchDefinesOwnSelector___: aSelector
	"Does this object's class REALLY implement aSelector, as opposed to
	inheriting the raising fallback every object carries?"

	| owner |
	owner := self @env0:class
		@env0:whichClassIncludesSelector: aSelector environmentId: 1.
	owner == nil ifTrue: [^ false].
	owner == object ifTrue: [^ false].
	owner == PythonInstance ifTrue: [^ false].
	^ true
%

category: 'Grail-Match Protocol'
method: object
___matchIsMapping___
	"PEP 634 mapping-pattern gate: a dict, or anything offering the
	mapping protocol (keys + __getitem__)."

	(self isKindOf: dict) ifTrue: [^ true].
	"Same restriction as ___matchIsSequence___, and for the same reason."
	(self isKindOf: PythonInstance) ifFalse: [^ false].
	^ (self ___matchDefinesOwnSelector___: #'keys')
		and: [self ___matchDefinesOwnSelector___: #'__getitem__:']
%

category: 'Grail-Match Protocol'
method: object
___matchLen___
	"The subject's length for a sequence pattern's arity gate."

	^ self __len__
%

category: 'Grail-Match Protocol'
method: object
___matchItemAt___: anIndex
	"One element of a sequence subject.  anIndex is a Python index, so it
	may be NEGATIVE -- the patterns that follow a ``*rest'' are addressed
	from the end, which is what lets them be tested without knowing the
	subject's length."

	^ self __getitem__: anIndex
%

category: 'Grail-Match Protocol'
method: object
___matchStarSlice___: headCount fromEnd: tailCount
	"The slice a ``*rest'' pattern absorbs: everything after the first
	headCount elements and before the last tailCount.

	CPython binds a LIST here regardless of the subject's own type -- a
	tuple subject still gives ``rest'' a list -- so build one rather than
	slicing the subject."

	| n out |
	n := self __len__.
	out := list ___new___.
	headCount to: n @env0:- tailCount @env0:- 1 do: [:i |
		out append: (self __getitem__: i)].
	^ out
%

category: 'Grail-Match Protocol'
method: object
___matchHasKey___: aKey
	"Is aKey present?  A mapping pattern names a SUBSET of the subject's
	keys, so a missing key is an ordinary non-match and must not surface
	as the KeyError a bare __getitem__ would raise."

	^ (self __contains__: aKey) ___isTruthy___
%

category: 'Grail-Match Protocol'
method: object
___matchItemForKey___: aKey
	"The value a mapping pattern's key selects; only ever sent after
	___matchHasKey___: has answered true."

	^ self __getitem__: aKey
%

category: 'Grail-Match Protocol'
method: object
___matchRestExcluding___: anArrayOfKeys
	"The ``**rest'' of a mapping pattern: a NEW dict holding every key the
	pattern did not name.  A fresh dict, not a view -- CPython copies, so
	mutating rest must not touch the subject."

	| out |
	out := dict ___new___.
	"keysDo: is the raw walk over the stored keys -- the same one dict's
	own __contains__ uses -- rather than iterating the dict_keys VIEW,
	which is a Python-level object and does not answer the Smalltalk
	iteration protocol."
	self @env0:keysDo: [:k |
		(anArrayOfKeys @env0:detect: [:each | (k ___cmpEq___: each) ___isTruthy___]
			ifNone: [nil]) @env0:isNil
				ifTrue: [out __setitem__: k _: (self __getitem__: k)]].
	^ out
%

category: 'Grail-Match Protocol'
method: object
___matchIsInstanceOf___: aClass
	"The isinstance gate of a class pattern, routed through the builtin so
	ABCs and __instancecheck__ behave as they do everywhere else."

	^ ((builtins instance) isinstance: self _: aClass) ___isTruthy___
%

category: 'Grail-Match Protocol'
method: object
___matchAttr___: aName
	"Read an attribute for a keyword sub-pattern.  A MISSING attribute is
	a non-match, not an AttributeError, so answer the miss sentinel and
	let the caller short-circuit."

	^ [self ___pyAttrLoad___: aName @env0:asSymbol]
		@env0:on: AttributeError do: [:ex | ex @env0:return: #'___matchMiss___']
%

category: 'Grail-Match Protocol'
method: object
___matchArgAt___: anIndex of: aClass
	"Resolve positional sub-pattern anIndex through the class's
	``__match_args__''.

	A class with no __match_args__ accepts NO positional patterns, and
	CPython makes that a TypeError at match time rather than a quiet
	non-match -- ``case Point(1, 2):'' against a Point that never declared
	__match_args__ is a bug in the pattern, not a subject that failed to
	match, and it must say so."

	| args n |
	args := [aClass ___pyAttrLoad___: #'__match_args__']
		@env0:on: AttributeError do: [:ex | ex @env0:return: nil].
	args == nil ifTrue: [
		TypeError ___signal___: (aClass @env1:__name__) @env0:asString
			@env0:, '() accepts 0 positional sub-patterns'].
	n := args __len__.
	anIndex @env0:>= n ifTrue: [
		TypeError ___signal___: (aClass @env1:__name__) @env0:asString
			@env0:, '() accepts ' @env0:, n @env0:printString
			@env0:, ' positional sub-patterns'].
	^ self ___matchAttr___: (args __getitem__: anIndex) @env0:asString
%

set compile_env: 0
