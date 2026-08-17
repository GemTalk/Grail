! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- Super class definition
expectvalue /Class
doit
Object subclass: 'Super'
  instVarNames: #( cls obj )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Super comment:
'Runtime proxy for Python''s zero-arg ``super()`` call.

Given the lexically-enclosing class C and the first method argument
(``self`` for instance methods, ``cls`` for class methods), method
lookup starts at ``C`` and walks the superclass chain looking for the
first env-1 method matching the requested selector.  The method is
then executed with ``obj`` substituted as the receiver — bypassing
the override on ``C`` (or any subclass) that triggered the super()
call in the first place.

Two callable shapes are supported on the proxy:
  * Unary attribute access (``___pyAttrLoad___:``) returns a
    ``Super`` instance carrying the same (cls, obj) but with the
    requested attribute name baked in — i.e. an unbound proxy
    for the resolved parent method.  Calling it via
    ``value: positional value: kwargs`` then dispatches.
  * For the common ``super().method(args)`` chain, AttributeAst
    emits an attribute load followed by a CallAst; both steps
    funnel through ``___pyAttrLoad___:`` → ``value:value:``.

Both the zero-arg ``super()`` and the explicit ``super(C, obj)`` forms are
rewritten by codegen (CallAst), for a class defined at module scope and for
one defined inside a function.  The latter is not a module attribute, so its
class object is reached through the closure cell ``___cell_<ClassName>___``
rather than the module instance''s class accessor.

Limitations:
  * Walks the GemStone class hierarchy (``superClass``), not a
    Python C3 MRO, when the receiver''s class has no registered MRO.
    Single-inheritance Python idioms (e.g. blinker.NamedSignal,
    collections.defaultdict) work; see _lookupMethodFirstOf: for the
    MRO-positional path that cooperative mixins take.
  * ``super(C, obj)`` naming a method-local class OTHER than the one
    being compiled still takes the module-accessor path, and so still
    resolves to nil for it.  Every occurrence in the vendored corpus
    names its own class, so nothing exercises that yet.
'
%

expectvalue /Class
doit
Super category: 'Grail-Modules'
%

removeallmethods Super
removeallclassmethods Super

set compile_env: 0

category: 'Grail-Private'
method: Super
_setCls: aClass obj: anObject

	cls := aClass.
	obj := anObject.
%

category: 'Grail-Private'
method: Super
_varargsSelectorFor: aSelector
	"Strip the trailing colons from a fixed-arity keyword selector and
	wrap in the ``_<base>:kw:`` varargs convention.  Returns nil for
	a 0-arg selector (no trailing colon — no varargs form to try)."

	| s colonIdx base |
	s := aSelector asString.
	colonIdx := s indexOf: $:.
	colonIdx = 0 ifTrue: [^ nil].
	base := s copyFrom: 1 to: colonIdx - 1.
	^ ('_' , base , ':kw:') asSymbol
%

category: 'Grail-Private'
method: Super
_lookupMethod: aSym
	"Walk the superClass chain starting from cls's parent, looking for
	the first class whose env-1 methodDict has aSym.  Returns the
	GsNMethod, or nil if not found."

	| walker |
	walker := cls superClass.
	[walker notNil] whileTrue: [
		| md |
		md := walker methodDictForEnv: 1.
		(md includesKey: aSym) ifTrue: [^ md at: aSym].
		walker := walker superClass].
	^ nil
%

category: 'Grail-Private'
method: Super
_lookupMethodFirstOf: selectors
	"Walk the superClass chain starting from cls's parent; at EACH
	class probe the env-1 methodDict for each selector in order
	(nil entries skipped).  The first class defining ANY of the
	forms wins — Python MRO semantics: the NEAREST parent supplies
	the method, regardless of which arity-form it compiled to.

	Probing one form across the whole chain first (the previous
	strategy) let a distant default — object's 0-arg ``__init__``
	no-op — shadow a direct parent's varargs ``___init__:kw:`` when
	``super().__init__(**kwargs)`` was called with an EMPTY splat
	(twilio.twiml: MessagingResponse() left TwiML.__init__ unrun,
	so ``verbs`` / ``attrs`` never materialized)."

	| il receiverCls mro idx walker alsoMeta |
	"MRO-POSITIONAL lookup (Python semantics): search the classes AFTER
	``cls'' in the RECEIVER's C3 linearization, not cls's Smalltalk
	superclass chain.  This is what makes cooperative mixins work:
	in ``class D(Mixin, Base)'', Mixin.__init__'s super().__init__ must
	reach Base THROUGH D's MRO even though Mixin does not inherit from
	Base -- and a Mixin method copied onto D by the merge still carries
	``cls = Mixin'', so the walk lands on exactly the right successor.
	When the receiver's class has no registered MRO, or cls is not on
	it, fall back to the superclass-chain walk (identical to the old
	behavior for single inheritance)."

	"When the bound receiver is itself a CLASS (``super(D, cls)`` inside
	``__new__``), Python looks the attribute up on the MRO classes AS
	OBJECTS -- which for Grail means the parents' class-side (metaclass)
	dicts too: object's ``__new__:`` family is compiled class-side."
	alsoMeta := obj isKindOf: Behavior.
	il := Python at: #importlib otherwise: nil.
	receiverCls := alsoMeta ifTrue: [obj] ifFalse: [obj class].
	il == nil ifFalse: [
		mro := il ___mroOf___: receiverCls.
		idx := mro indexOf: cls.
		idx > 0 ifTrue: [
			idx + 1 to: mro size do: [:i |
				| md mdMeta |
				md := (mro at: i) methodDictForEnv: 1.
				mdMeta := alsoMeta
					ifTrue: [(mro at: i) class methodDictForEnv: 1]
					ifFalse: [nil].
				selectors do: [:sel |
					sel ifNotNil: [
						(md includesKey: sel) ifTrue: [^ md at: sel].
						(mdMeta ~~ nil and: [mdMeta includesKey: sel])
							ifTrue: [^ mdMeta at: sel]]]].
			^ nil]].
	walker := cls superClass.
	[walker notNil] whileTrue: [
		| md mdMeta |
		md := walker methodDictForEnv: 1.
		mdMeta := alsoMeta
			ifTrue: [walker class methodDictForEnv: 1]
			ifFalse: [nil].
		selectors do: [:sel |
			sel ifNotNil: [
				(md includesKey: sel) ifTrue: [^ md at: sel].
				(mdMeta ~~ nil and: [mdMeta includesKey: sel])
					ifTrue: [^ mdMeta at: sel]]].
		walker := walker superClass].
	^ nil
%

category: 'Python-Dispatch'
method: Super
doesNotUnderstand: aSelector args: anArray envId: envId
	"Direct sends to a Super proxy (e.g. ``super().__init__(x)``
	codegen'd as ``(super-proxy) __init__: x``) are routed here:
	walk the parent-class chain for the selector and execute the
	matching method with `obj` substituted as the receiver.

	Dispatch uses ``performMethod:`` / ``with:performMethod:`` —
	the only stock GemStone primitives that invoke a *specific*
	GsNMethod with a substituted receiver (bypassing override).
	Arity > 1 hits the no-bypass perform fallback, which works
	when the parent method doesn't itself call super (the common
	Python idiom for ``object.__init__`` / leaf-class init).

	envId 0 falls through to default DNU — Smalltalk-side sends to
	the proxy aren't part of the Python protocol."

	| method nargs varargsSel |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	"Per-class probe of BOTH arity forms (fixed first, then the
	varargs ``_<base>:kw:`` fallback) so the nearest parent wins —
	see _lookupMethodFirstOf: for why chain-at-a-time probing was
	wrong."
	varargsSel := self _varargsSelectorFor: aSelector.
	method := self _lookupMethodFirstOf: { aSelector. varargsSel }.
	method ifNotNil: [
		(method selector asString endsWith: ':kw:') ifTrue: [
			^ obj with: anArray with: nil performMethod: method
		].
		nargs := anArray size.
		nargs = 0 ifTrue: [^ obj performMethod: method].
		nargs = 1 ifTrue: [^ obj with: (anArray at: 1) performMethod: method].
		nargs = 2 ifTrue: [
			^ obj
				with: (anArray at: 1)
				with: (anArray at: 2)
				performMethod: method].
		nargs = 3 ifTrue: [
			^ obj
				with: (anArray at: 1)
				with: (anArray at: 2)
				with: (anArray at: 3)
				performMethod: method].
		nargs = 4 ifTrue: [
			^ obj
				with: (anArray at: 1)
				with: (anArray at: 2)
				with: (anArray at: 3)
				with: (anArray at: 4)
				performMethod: method].
		"5+ args: no performMethod primitive variant.  Fall back to
		``perform:env:withArguments:`` which re-enters dispatch — works
		when the parent method doesn't itself call super()."
		^ obj perform: aSelector env: 1 withArguments: anArray
	].
	^ super doesNotUnderstand: aSelector args: anArray envId: envId
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: Super
cls: aClass obj: anObject
	"Construct a Super proxy bound to the lexical class and the
	current method's first argument.

	A nil class is REJECTED here, where it is still catchable.  Every
	consumer walks ``cls superClass'', and nil does not understand that --
	an env-0 MessageNotUnderstood, which Python cannot catch and which
	therefore takes down the whole module run rather than failing one
	call.  That is how a method-local class naming itself in the two-arg
	form (``super(TracingDict, self)'') presented: not as a super() bug
	but as an uncatchable Smalltalk error in the middle of an unrelated
	test.  CPython's own message for the same mistake."

	| inst |
	(aClass isKindOf: Behavior) ifFalse: [
		TypeError ___signal___: 'super() argument 1 must be a type, not '
			@env0:, (aClass == nil
				ifTrue: ['NoneType']
				ifFalse: [aClass @env0:class @env0:name @env0:asString])].
	"NO supercheck here.  This is the path every COMPILED super() takes, and
	applying CPython's obj-is-an-instance-of-cls test to it breaks working
	code: Grail reaches a cooperative mixin's methods through the receiver's
	MRO, but a class merged in that way is not always ON the MRO that
	___mroOf___ reports for the receiver either, so the check rejected calls
	the proxy then services correctly -- measured, as four Django failures.
	The explicit constructor (__new__:_:) does check, which is where
	CPython's diagnostic is actually reachable from Python code.
	test_supercheck_fail wants it on both; that needs the MRO agreement to be
	exact first."
	inst := self @env0:new.
	inst @env0:_setCls: aClass obj: anObject.
	^ inst
%

category: 'Grail-Attribute'
method: Super
___pyAttrLoad___: aSym
	"super().<aSym> — return a BoundMethod-equivalent that, when
	invoked, executes the parent class''s method with obj as the
	receiver.

	Strategy: find the GsNMethod by walking cls''s superClass chain,
	then return a closure that calls ``method _executeInContext: ...``
	bound to obj.  We piggy-back on BoundMethod for arity dispatch
	via a thin _Super-bound shim that exposes ``value:value:``."

	| s symVA pickMethod walker holder v |
	"``__class__'' is the proxy's OWN type, not a name to resolve against the
	parent chain -- CPython answers the ``super'' type itself, and
	``super().__class__ is super'' is how test_super___class__ checks that the
	name and the object agree.  Delegating it returned a parent-method proxy
	instead, so the comparison was quietly false.  Every other name still goes
	to the parent, which is the point of the proxy."
	(aSym @env0:asSymbol == #'__class__') @env0:ifTrue: [^ self @env0:class].
	"A class-attribute store on a PARENT shadows that parent's compiled method,
	the same way it does for a direct instance read (object >>
	___classChainAttrLookup___: and its caller).  super() has to honour it too:
	a class-body method decorator makes the parent's decorated method exactly
	such a store, so without this ``super().m()'' silently ran the parent's
	UNDECORATED compiled method -- ``D(derived+base-impl)'' where CPython gives
	``D(derived+B(base-impl))''.

	Walk from cls's PARENT: super() skips cls itself.  A hit binds obj, like any
	other function found in a class dict.

	The Smalltalk superclass chain, not the C3 MRO the compiled-method lookup
	below uses -- a cooperative-mixin parent whose decorated method is reached
	only through the receiver's MRO is still a gap.  Checks the committed store
	only, not the session-local canonical overlay, so a runtime ``Parent.m = f''
	seen through super() is likewise still a gap.  Both were gaps before too;
	this closes the definitional case that method decorators need."
	walker := cls @env0:superClass.
	[walker == nil] whileFalse: [
		(walker @env0:_respondsTo: #___dynInstVars___ flags: 16r10001) ifTrue: [
			holder := walker @env0:perform: #___dynInstVars___ env: 1.
			holder == nil ifFalse: [
				v := holder @env0:dynamicInstVarAt: aSym.
				v == nil ifFalse: [^ MethodBinding instance: obj callable: v]
			]
		].
		walker := walker @env0:superClass
	].
	s := aSym @env0:asString.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	pickMethod := [:nargs :kwOk |
		| fixedSel |
		"Resolve the fixed-arity selector for the call-site arity.

		BUILT, not enumerated.  This used to stop at three positional arguments
		and leave fixedSel nil beyond that, so ``super().m(a, b, c, d)'' could
		only ever reach a VARARGS method and silently missed a fixed-arity one.

		The case that exposed it is the standard metaclass idiom:
		``super().__new__(cls, name, bases, namespace)'' is FOUR positional
		arguments, so it never tried __new__:_:_:_:, fell through to the generic
		allocation path, and answered an INSTANCE of the metaclass where CPython
		answers the class.  Nothing about that was specific to metaclasses --
		any four-argument super() call had it."
		fixedSel := nargs @env0:= 0
			ifTrue: [aSym]
			ifFalse: [ | ws |
				ws := WriteStream @env0:on: String @env0:new.
				ws @env0:nextPutAll: s.
				ws @env0:nextPut: $:.
				2 @env0:to: nargs do: [:i | ws @env0:nextPutAll: '_:'].
				ws @env0:contents @env0:asSymbol].
		"Per-class probe of both forms — the NEAREST parent class
		defining either form wins (Python MRO semantics; see
		_lookupMethodFirstOf:).  With no kwargs prefer the fixed
		form at each class; with kwargs present prefer varargs
		``_<name>:kw:`` (a fixed-arity method would silently drop
		them — typically Object>>__init__, the env-1 default no-op)."
		kwOk
			ifTrue: [self @env0:_lookupMethodFirstOf: { fixedSel. symVA }]
			ifFalse: [self @env0:_lookupMethodFirstOf: { symVA. fixedSel }]].
	"Wrap (obj, pickMethod) in a callable proxy that resolves the
	method at call time once arity is known."
	^ SuperBoundMethod obj: obj resolver: pickMethod selector: aSym
%

set compile_env: 0

! ===============================================================================
! ``super'' as a first-class name
! ===============================================================================
!
! NameAst resolves the bare name ``super'' to this class, so every use that is
! NOT one of CallAst's rewritten call shapes lands here: ``super(int, int,
! int)'', ``super(1, int)'', ``f = super'', ``class mysuper(super)'',
! ``super.__init__(sp, ...)''.  Object's class-call path dispatches such a call
! to __new__ / __new__: / __new__:_: by arity, which is where CPython's own
! argument diagnostics belong.

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: Super
__new__
	"``super()'' with no arguments reaching the RUNTIME path -- i.e. outside a
	method body, since inside one CallAst rewrites it to a bound proxy before
	this class is ever named.  CPython has no frame to infer the class from
	either, and says so."

	^ RuntimeError ___signal___: 'super(): no arguments'
%

category: 'Grail-Instance Creation'
classmethod: Super
__new__: aClass
	"``super(C)'' -- CPython's UNBOUND super object.  The type check is the
	same one the bound form applies; what differs is only that no second
	argument binds it to an instance."

	^ self cls: aClass obj: nil
%

category: 'Grail-Instance Creation'
classmethod: Super
__new__: aClass _: anObject
	"``super(C, obj)'' called as an ordinary constructor.  Applies both of
	CPython's checks -- argument 1 must be a type, and obj must be an instance
	or subtype of it -- then builds the same proxy the compiled rewrite does."

	^ self cls: aClass obj: (self ___superCheck___: anObject against: aClass)
%

category: 'Grail-Instance Creation'
classmethod: Super
__new__: aClass _: anObject _: anExtra
	"Three arguments.  CPython counts them and refuses; without this the
	generic class-call path reports its own ``takes wrong number of
	arguments'' wording instead, and test_super_argcount matches on
	``expected at most''."

	^ TypeError ___signal___: 'super() expected at most 2 arguments, got 3'
%

category: 'Grail-Instance Creation'
classmethod: Super
___superCheck___: anObject against: aClass
	"CPython's supercheck: ``obj'' must be an instance of ``aClass'', or a
	SUBCLASS of it when obj is itself a type.  Answers obj so callers can use
	it inline.

	The message names which of the two readings failed, because that is what
	says whether you passed the wrong object or the wrong class:

	    super(type, obj): obj (instance of C) is not an instance or
	    subtype of type (int).

	Grail checked nothing here: a mismatched pair simply built a proxy whose
	lookups walked the wrong chain, so the failure surfaced later and
	elsewhere (test_supercheck_fail).

	A nil obj is the UNBOUND form (``super(C)''), which has nothing to check.

	A non-class ``aClass'' is left alone: ``cls:obj:'' raises the argument-1
	TypeError for it, and that diagnosis is the more useful one.  Checking obj
	against it first instead walked ``inheritsFrom: 1'' and died in the kernel
	with an uncatchable ArgumentTypeError -- ``super(1, int)'' is exactly that
	shape (test_super_argtype)."

	| ok describe |
	anObject == nil ifTrue: [^ anObject].
	(aClass @env0:isKindOf: Behavior) @env0:ifFalse: [^ anObject].
	ok := self ___isInstanceOrSubtype___: anObject of: aClass.
	ok @env0:ifTrue: [^ anObject].
	describe := (anObject @env0:isKindOf: Behavior)
		@env0:ifTrue: ['type ' @env0:, anObject @env0:name @env0:asString]
		@env0:ifFalse: ['instance of '
			@env0:, anObject @env0:class @env0:name @env0:asString].
	^ TypeError ___signal___: 'super(type, obj): obj (' @env0:, describe
		@env0:, ') is not an instance or subtype of type ('
		@env0:, aClass @env0:name @env0:asString @env0:, ').'
%

category: 'Grail-Instance Creation'
classmethod: Super
___isInstanceOrSubtype___: anObject of: aClass
	"Python's ``isinstance(obj, cls) or (isinstance(obj, type) and
	issubclass(obj, cls))'', consulted through the MRO rather than the
	Smalltalk superclass chain.

	The distinction is load-bearing here.  A cooperative mixin is NOT a
	Smalltalk superclass of the classes that use it -- ``class D(Mixin,
	Base)'' reaches Base through D's C3 linearization, and a Mixin method
	copied onto D still carries ``cls = Mixin'' -- so a chain-based check
	would reject ``super(Mixin, self)'', which is the single most common
	legitimate two-argument call in the corpus.  _lookupMethodFirstOf: already
	resolves methods through the same MRO, so agreeing with it is what keeps
	the check from rejecting calls the proxy then services happily.

	Permissive when no MRO is registered: answering true leaves the previous
	behaviour (no check at all) in place rather than inventing a failure."

	| il mro probe |
	il := Python @env0:at: #importlib otherwise: nil.
	probe := (anObject @env0:isKindOf: Behavior)
		@env0:ifTrue: [anObject]
		@env0:ifFalse: [anObject @env0:class].
	probe == aClass ifTrue: [^ true].
	il == nil ifFalse: [
		mro := [il ___mroOf___: probe]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		(mro @env0:notNil @env0:and: [mro @env0:notEmpty]) ifTrue: [
			^ mro @env0:includes: aClass]].
	^ (anObject @env0:isKindOf: Behavior)
		@env0:ifTrue: [anObject @env0:inheritsFrom: aClass]
		@env0:ifFalse: [anObject @env0:isKindOf: aClass]
%

category: 'Grail-Initialization'
method: Super
__init__: aClass _: anObject
	"``super.__init__(sp, C, obj)'' -- re-binding an existing proxy through the
	unbound method on the type.  CPython documents the shape as not endorsed
	but supports it, and test_super_init_leaks calls it in a loop."

	self @env0:_setCls: aClass
		obj: (Super ___superCheck___: anObject against: aClass).
	^ None
%

set compile_env: 0
