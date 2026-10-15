"Runtime proxy for Python's zero-arg ``super()`` call.

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
rather than the module instance's class accessor.

Limitations:
  * Walks the GemStone class hierarchy (``superClass``), not a
    Python C3 MRO, when the receiver's class has no registered MRO.
    Single-inheritance Python idioms (e.g. blinker.NamedSignal,
    collections.defaultdict) work; see _lookupMethodFirstOf: for the
    MRO-positional path that cooperative mixins take.
  * ``super(C, obj)`` naming a method-local class OTHER than the one
    being compiled still takes the module-accessor path, and so still
    resolves to nil for it.  Every occurrence in the vendored corpus
    names its own class, so nothing exercises that yet.

"
Class {
	#name : 'Super',
	#superclass : 'Object',
	#instVars : [
		'cls',
		'obj'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
Super >> ___classesAfterCls___ [
	"The classes after ``cls'' in the receiver's C3 MRO, in order -- what
	super() searches -- or, when the receiver's class has no linearization
	that lists cls, cls's superclass chain (identical under single
	inheritance).  The same choice _lookupMethodAndSideFirstOf:metaSelectors:
	makes for compiled methods."

	| il receiverCls mro idx out walker |
	il := Python at: #importlib otherwise: nil.
	receiverCls := (obj isKindOf: Behavior) ifTrue: [obj] ifFalse: [obj class].
	il == nil ifFalse: [
		mro := [il ___mroOf___: receiverCls] on: Error do: [:e | e return: nil].
		mro == nil ifFalse: [
			idx := mro indexOf: cls.
			idx > 0 ifTrue: [^ mro copyFrom: idx + 1 to: mro size]]].
	out := OrderedCollection new.
	walker := cls superClass.
	[walker == nil] whileFalse: [out add: walker. walker := walker superClass].
	^ out

]

{ #category : 'Grail-Private' }
Super >> ___definesAnyFormOf___: aSym in: aClass [
	"Does aClass's OWN instance-side method dictionary compile the Python name
	aSym at any arity -- unary, fixed, or the varargs ``_name:kw:''?  Own
	dictionary only: an inherited method is the next class's business, which
	is what lets ___pyAttrLoad___:'s holder walk stop at exactly the class
	CPython's MRO walk would."

	| s |
	s := aSym asString.
	(aClass includesSelector: aSym asSymbol environmentId: 1) ifTrue: [^ true].
	(aClass includesSelector: ('_' , s , ':kw:') asSymbol environmentId: 1) ifTrue: [^ true].
	1 to: 6 do: [:n |
		(aClass includesSelector: (self _fixedSelectorFor: s nargs: n) environmentId: 1)
			ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-Private' }
Super >> _assignedInitSubclassOn: aClass [
	"aClass's OWN assigned __init_subclass__, or nil.

	The twin of the store reads inside object>>___grailAssignedInitSubclass___:
	(session overlay first, then the committed dynamic-instVar holder), scoped
	to ONE class: the MRO walk below supplies the ordering, so an inherited
	assignment is the next class's own business.  PEP 702's @deprecated is
	what puts a hook in these stores -- classmethod(wrapper) via setattr --
	and a super() walk that consults only compiled method dictionaries slides
	straight past it to object's terminal no-op, so the deprecation warning a
	sibling base was supposed to emit never fires."

	| st ov inner v holder |
	st := SessionTemps current.
	ov := st at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifFalse: [
		inner := ov at: aClass otherwise: nil.
		inner == nil ifFalse: [
			v := inner at: #'__init_subclass__' otherwise: nil.
			v == nil ifFalse: [^ v]]].
	holder := [aClass perform: #___dynInstVars___ env: 1]
		on: AbstractException do: [:ex | ex return: nil].
	holder == nil ifTrue: [^ nil].
	^ [holder dynamicInstVarAt: #'__init_subclass__']
		on: AbstractException do: [:ex | ex return: nil]

]

{ #category : 'Grail-Private' }
Super >> _fixedSelectorFor: aString nargs: nargs [
	"The fixed-arity Smalltalk selector a call of ``nargs'' positional arguments
	builds for the Python name ``aString'': ``m'', ``m:'', ``m:_:'', ..."

	| ws |
	nargs = 0 ifTrue: [^ aString asSymbol].
	ws := WriteStream on: String new.
	ws nextPutAll: aString.
	ws nextPut: $:.
	2 to: nargs do: [:i | ws nextPutAll: '_:'].
	^ ws contents asSymbol

]

{ #category : 'Python-Dispatch' }
Super >> _implementationOf: aClass in: mro [
	"aClass, then each Smalltalk superclass of it that the MRO does not list,
	up to the next class it does -- the classes whose methods ARE aClass's
	behaviour to Python.  A built-in type's MRO names one class, but its
	methods can live on a hidden implementation superclass: ``property'' is
	PropertyDescriptor, whose __init__ is AbstractPropertyDescriptor's.  Asking
	only the MRO class itself skipped that, so ``super().__init__(fget)'' in a
	property subclass reached object's no-op __init__ and left fget unset --
	Werkzeug's cached_property, a property subclass, then failed every read.

	PythonInstance ends the walk too: every Python class's Smalltalk superclass
	is a Python base or PythonInstance, and PythonInstance's defaults must not
	answer for a Python class ahead of the MRO classes after it -- the
	cooperative-mixin order super() exists for."

	| out w |
	out := OrderedCollection with: aClass.
	w := aClass superClass.
	[w notNil and: [w ~~ PythonInstance and: [(mro includesIdentical: w) not]]]
		whileTrue: [
			out add: w.
			w := w superClass].
	^ out

]

{ #category : 'Grail-Private' }
Super >> _isPythonClassMethod: aSelector on: aClass [
	"Is this class-side method a Python @classmethod, rather than one of
	Grail's own metaclass internals?

	The distinction matters only for an INSTANCE receiver: ``super().cm()''
	from a plain method must reach a parent's @classmethod, but must NOT reach
	the constructors and attribute plumbing that also live class-side.  A
	CLASS receiver is allowed the unrestricted search -- ``super(D, cls)''
	inside __new__ legitimately wants object's class-side ``__new__:''.

	Identified by the category ClassDefAst compiles @classmethods under, which
	is the only marker distinguishing them once compiled."

	| objIsClass |
	objIsClass := obj isKindOf: Behavior.
	objIsClass ifTrue: [^ true].
	^ (aClass class @env0:categoryOfSelector: aSelector environmentId: 1)
		@env0:asString @env0:= 'Grail-Class Methods'

]

{ #category : 'Grail-Private' }
Super >> _lookupMethod: aSym [
	"Walk the superClass chain starting from cls's parent, looking for
	the first class whose env-1 methodDict has aSym.  Returns the
	GsNMethod, or nil if not found."

	| walker |
	walker := cls superClass.
	[walker notNil] whileTrue: [
		(walker compiledMethodAt: aSym environmentId: 1 otherwise: nil)
			ifNotNil: [:m | ^ m].
		walker := walker superClass].
	^ nil

]

{ #category : 'Python-Dispatch' }
Super >> _lookupMethodAndSideFirstOf: selectors [
	"The single-family form: probe BOTH sides of every MRO class with the same
	selectors.  That is right for every name whose two sides share one calling
	convention, which is every name except ``__new__'' -- see
	_lookupMethodAndSideFirstOf:metaSelectors: for the exception and why it
	exists."

	^ self _lookupMethodAndSideFirstOf: selectors metaSelectors: selectors

]

{ #category : 'Python-Dispatch' }
Super >> _lookupMethodAndSideFirstOf: selectors metaSelectors: metaSelectors [
	"TWO PARALLEL SELECTOR FAMILIES, one per side, probed in lock-step: at each
	MRO class, ``selectors at: k'' is looked for in the INSTANCE-side dictionary
	and ``metaSelectors at: k'' in the CLASS-side one.  The lists are the same
	length and the same order, so the MRO-order and the within-class preference
	order are exactly what the single-family form gives; passing one list twice
	reproduces it byte for byte.

	The families differ for ONE name, ``__new__'', because Grail's two sides
	spell it with two different calling conventions.  A class-body
	``def __new__(cls, a, b)'' compiles INSTANCE-side as ``__new__:_:'' with
	``cls'' as the Smalltalk RECEIVER, so its arity is one less than the Python
	call's.  Grail's built-in and kernel __new__ methods (object's ``__new__:
	cls'', type's ``__new__: mcls _: name _: bases _: ns'', bool's ``__new__:
	cls _: obj'') are CLASS-side and take the target class as an explicit first
	argument, so their arity is the Python call's exactly.  Resolving
	``super().__new__(cls, ...)'' against one family therefore had to be wrong
	on one side; searching each side with its own family is what makes both
	right.  Super >> ___pyAttrLoad___: builds the pair, SuperBoundMethod strips
	the leading class again when the hit came from the instance side."

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

	"Each class is asked for each selector (compiledMethodAt:environmentId:
	otherwise:, which looks in the session-method dictionary and then the
	persistent one) rather than through ``methodDictForEnv: 1'', which builds a
	fresh merged copy of both per call: that copy was half the time of every
	``super().__new__(cls, x)'' -- markupsafe.Markup, once per escaped value."

	"ANSWERS A PAIR: { method. cameFromTheClassSide }.  The side is what the
	caller needs to bind the right receiver, and this is the only place that
	knows it -- re-deriving it afterwards from the method object was tried
	twice and was wrong both times, because ``defined on a metaclass'' is not
	the same question as ``was reached as a @classmethod here''."
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

	"The class-side (metaclass) dicts are searched too.  That started as a
	narrow allowance for a CLASS receiver (``super(D, cls)`` inside
	``__new__``, where object's ``__new__:`` family is compiled class-side) --
	see below for why it is now unconditional."
	"ALWAYS search the class side, not only when the bound receiver is a class.
	A Python @classmethod compiles onto Grail's metaclass, so a parent's
	classmethod was invisible to ``super()'' called from an INSTANCE method --
	``super(): no parent method 'cm''' for test_super's D.cm, which is a plain
	method whose MRO successors are all classmethods.  CPython draws no such
	distinction: super() looks the name up on the MRO classes, and a
	classmethod is found from either side.

	The receiver is corrected where the method is invoked (SuperBoundMethod),
	which is the only place that knows whether the winning method came from the
	class side.

	NARROWLY, and this is the whole difficulty.  Grail's metaclass carries a
	great deal of INTERNAL class-side machinery (constructors, dynInstVars,
	attribute plumbing), and exposing all of it to an instance-side super()
	lookup broke 180 SUnit tests -- ``super()'' started resolving names to
	Grail internals that happen to live class-side.  So for an INSTANCE
	receiver only a genuine Python @classmethod counts, identified by the
	category ClassDefAst compiles them under.  A CLASS receiver keeps the
	unrestricted search it always had."
	alsoMeta := true.
	il := Python at: #importlib otherwise: nil.
	"objIsClass is a SEPARATE question from alsoMeta, and they were one flag
	until the class-side search became unconditional: this line decides whose
	MRO to walk, and answering ``obj'' for an instance handed ___mroOf___: an
	instance (``a D does not understand #superclass'')."
	receiverCls := (obj isKindOf: Behavior) ifTrue: [obj] ifFalse: [obj class].
	il == nil ifFalse: [
		mro := il ___mroOf___: receiverCls.
		idx := mro indexOf: cls.
		idx > 0 ifTrue: [
			| iscFamily |
			"Is this walk looking for __init_subclass__?  Decided ONCE from the
			family's first base name; only that family can be ASSIGNED in a way
			super() must honour (PEP 702's @deprecated), and widening the
			assigned-store probe to every name is exactly the 180-test mistake
			the class-side comment above records."
			iscFamily := false.
			selectors do: [:sel |
				sel ifNotNil: [
					| ss base |
					ss := sel asString.
					base := (ss indexOf: $:) > 0
						ifTrue: [ss copyFrom: 1 to: (ss indexOf: $:) - 1]
						ifFalse: [ss].
					(base = '__init_subclass__'
						or: [base = '___init_subclass__'])
						ifTrue: [iscFamily := true]]].
			idx + 1 to: mro size do: [:i |
				| md mdMeta |
				iscFamily ifTrue: [
					| hook |
					hook := self _assignedInitSubclassOn: (mro at: i).
					hook == nil ifFalse: [^ { hook. #assigned }]].
				"An MRO entry's HIDDEN implementation ancestors answer for it: see
				_implementationOf:in:."
				(self _implementationOf: (mro at: i) in: mro) do: [:impl |
					1 to: selectors size do: [:k |
						| sel metaSel |
						sel := selectors at: k.
						metaSel := metaSelectors at: k.
						sel ifNotNil: [
							(impl compiledMethodAt: sel environmentId: 1 otherwise: nil)
								ifNotNil: [:m | ^ { self _unforwarded: m. false }]].
						(metaSel notNil and: [alsoMeta]) ifTrue: [
							(impl class compiledMethodAt: metaSel environmentId: 1 otherwise: nil)
								ifNotNil: [:m |
									(self _isPythonClassMethod: metaSel on: impl)
										ifTrue: [^ { m. true }]]]]]].
			^ nil]].
	walker := cls superClass.
	[walker notNil] whileTrue: [
		1 to: selectors size do: [:k |
			| sel metaSel |
			sel := selectors at: k.
			metaSel := metaSelectors at: k.
			sel ifNotNil: [
				(walker compiledMethodAt: sel environmentId: 1 otherwise: nil)
					ifNotNil: [:m | ^ { self _unforwarded: m. false }]].
			(metaSel notNil and: [alsoMeta]) ifTrue: [
				(walker class compiledMethodAt: metaSel environmentId: 1 otherwise: nil)
					ifNotNil: [:m |
						(self _isPythonClassMethod: metaSel on: walker)
							ifTrue: [^ { m. true }]]]].
		walker := walker superClass].
	^ nil

]

{ #category : 'Grail-Private' }
Super >> _setCls: aClass obj: anObject [

	cls := aClass.
	obj := anObject.

]

{ #category : 'Grail-Private' }
Super >> _superDefinesAnyFormOf: aString [
	"Does the parent chain define this name at ANY arity?

	The question the deferred resolver cannot answer, because it needs a
	call-site arity before it can build a selector.  Builds the whole family --
	the bare symbol, the fixed-arity forms, and the varargs ``_<name>:kw:'' --
	and asks the ordinary MRO walk once."

	| fam ws |
	fam := OrderedCollection @env0:new.
	fam @env0:add: aString @env0:asSymbol.
	1 @env0:to: 9 do: [:n |
		ws := WriteStream @env0:on: String @env0:new.
		ws @env0:nextPutAll: aString.
		ws @env0:nextPut: $:.
		2 @env0:to: n do: [:i | ws @env0:nextPutAll: '_:'].
		fam @env0:add: ws @env0:contents @env0:asSymbol].
	fam @env0:add: ('_' @env0:, aString @env0:, ':kw:') @env0:asSymbol.
	^ (self @env0:_lookupMethodAndSideFirstOf: fam @env0:asArray) @env0:notNil

]

{ #category : 'Grail-Private' }
Super >> _unforwarded: aMethod [
	"The method super() should RUN for a hit on aMethod: aMethod itself, unless
	it is a fixed-arity forwarder (ClassDefAst's 'Grail-Fixed Arity
	Forwarders'), in which case the varargs body it forwards to, in the SAME
	class.

	A forwarder is an entry point, not the def: ``__exit__: a _: b _: c'' on a
	class whose ``def __exit__(self, *exc_info)'' compiled as ``___exit__:kw:''
	is just ``^ self ___exit__: {a. b. c} kw: nil''.  That send is VIRTUAL,
	which is right for a direct call -- the receiver's own class always carries
	both selectors -- and wrong when super() reached the forwarder: the
	receiver is the SUBCLASS, whose simple-positional ``def __exit__(self, a,
	b, c)'' has a keyword companion ``___exit__:kw:'' that forwards straight
	back into the override.  super().__exit__(a, b, c) therefore recursed until
	the stack ran out (#1457) -- inside a ``with'', uncatchably.  It needs
	object's default __exit__:_:_: to exist, which is why __exit__ was the name
	that showed it: the forwarder is only emitted when the superclass already
	implements the selector.

	Answering the body instead is what the forwarder would have reached had it
	not dispatched through the receiver, and both callers already invoke a
	``:kw:'' hit as (positional, kwargs)."

	| owner s colon vsel |
	owner := aMethod inClass.
	((owner categoryOfSelector: aMethod selector environmentId: 1) asString = 'Grail-Fixed Arity Forwarders')
		ifFalse: [^ aMethod].
	s := aMethod selector asString.
	colon := s indexOf: $:.
	vsel := ('_' , (colon = 0 ifTrue: [s] ifFalse: [s copyFrom: 1 to: colon - 1]) , ':kw:') asSymbol.
	^ (owner compiledMethodAt: vsel environmentId: 1 otherwise: nil) ifNil: [aMethod]

]

{ #category : 'Grail-Private' }
Super >> _varargsSelectorFor: aSelector [
	"Strip the trailing colons from a fixed-arity keyword selector and
	wrap in the ``_<base>:kw:`` varargs convention.  Returns nil for
	a 0-arg selector (no trailing colon — no varargs form to try)."

	| s colonIdx base |
	s := aSelector asString.
	colonIdx := s indexOf: $:.
	colonIdx = 0 ifTrue: [^ nil].
	base := s copyFrom: 1 to: colonIdx - 1.
	^ ('_' , base , ':kw:') asSymbol

]

{ #category : 'Python-Dispatch' }
Super >> doesNotUnderstand: aSelector args: anArray envId: envId [
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

	| method nargs varargsSel pair |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	"Per-class probe of BOTH arity forms (fixed first, then the
	varargs ``_<base>:kw:`` fallback) so the nearest parent wins —
	see _lookupMethodFirstOf: for why chain-at-a-time probing was
	wrong."
	varargsSel := self _varargsSelectorFor: aSelector.
	"The lookup answers { method. cameFromTheClassSide }.  This DNU path binds
	``obj'' throughout and does not honour the class-side case; it is reached
	only for names ___pyAttrLoad___: did not handle, and a @classmethod always
	goes through there."
	pair := self _lookupMethodAndSideFirstOf: { aSelector. varargsSel }.
	"{ hook. #assigned }: an ASSIGNED __init_subclass__ found on the MRO --
	a Python object, not a GsNMethod.  Same handling as SuperBoundMethod's;
	see there."
	(pair notNil and: [(pair at: 2) == #assigned]) ifTrue: [
		^ obj @env1:___grailRunAssignedInitSubclass___: (pair at: 1)
			kw: nil].
	method := pair isNil ifTrue: [nil] ifFalse: [pair at: 1].
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

]
