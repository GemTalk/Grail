"Reusable base for Python objects that ARE an integer by value but
also carry extra attributes — ``re``'s [[NamedIntConstant]] opcodes,
``http.HTTPStatus`` members, and (eventually) ``enum.IntEnum`` members.

# Why a Number subclass, not an int subclass
Grail maps Python ``int`` to Smalltalk ``Integer``, which GemStone
forbids subclassing (classErrSubclassDisallowed); ``SmallInteger`` is
a tagged immediate and ``LargeInteger`` is byte-format, so neither can
carry instance variables.  ``Number`` IS subclassable, and GemStone's
coercion (``Number>>_retry:coercing:`` -> ``_generality`` + ``_coerce:``)
lets a Number subclass behave as a plain integer in mixed arithmetic.

# How it behaves like an int
The wrapped value lives in dynamic instVar ``#value``.  ``_generality``
returns 10 — below SmallInteger's 20 — so any mixed arithmetic coerces
the wrapper DOWN to its plain ``value`` (via ``truncated``) in both
operand orders, yielding a plain SmallInteger (arithmetic intentionally
strips the wrapper, matching CPython, where ``HTTPStatus.OK + 1`` is a
plain int).  ``asFraction`` / ``asFloat`` satisfy the kernel's relational
fallbacks (``Integer>><`` coerces through ``AbstractFraction``).
Receiver-side relational ops and the Python dunder protocol delegate to
``value``; ``isinstance(x, int)`` is made true by ``int``'s
``__instancecheck__:`` recognizing this class (see Int.gs).

# Subclassing from Python
``class HTTPStatus(AbstractPyInt)`` works: the class-side ``new`` below
overrides Number's disallowed ``new`` so ClassDefAst's emitted
``self new`` + ``__init__`` path can allocate the instance."
Class {
	#name : 'AbstractPyInt',
	#superclass : 'Number',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Comparison' }
AbstractPyInt class >> ___builtinValueClass___ [
	"The kernel class the builtin's own VALUES belong to (an int is a SmallInteger or LargeInteger), which
	this class -- the root of every Python subclass of the builtin -- does not
	inherit from.  Object >> ___reflectedFirst___ asks it, so that ``0 ==
	C3(11)'' for ``class C3(int)'' sees C3 as a proper subclass of int and tries
	C3's reflected method first, as CPython does (#1495)."

	^ Integer

]

{ #category : 'Grail-Introspection' }
AbstractPyInt class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__ --
	and so are int's four number properties, as on int itself
	(int class >> ___pythonValueAttrs___).  A Python subclass that defines one
	of these names itself is left to the ordinary attribute path; see object >>
	___valueAttrOverridden___:."

	^ IdentitySet new
		add: #'__dict__';
		add: #numerator;
		add: #denominator;
		add: #real;
		add: #imag;
		yourself

]

{ #category : 'Grail-Instance Creation' }
AbstractPyInt class >> new [
	"Number disallows #new.  Python subclasses are instantiated by
	ClassDefAst-emitted code that sends ``self new`` then ``__init__``;
	route to basicNew so that path can allocate."

	^ self basicNew

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyInt >> _coerce: aNumber [
	^ aNumber truncated

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyInt >> _generality [
	^ 10

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> - other [
	^ self value - ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> * other [
	^ self value * ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> / other [
	^ self value / ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> // other [
	^ self value // ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> \\ other [
	^ self value \\ ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> + other [
	^ self value + ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Comparison' }
AbstractPyInt >> < other [
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value < other value].
	^ self value < other

]

{ #category : 'Grail-Comparison' }
AbstractPyInt >> <= other [
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value <= other value].
	^ self value <= other

]

{ #category : 'Grail-Comparison' }
AbstractPyInt >> = other [
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value = other value].
	^ self value = other

]

{ #category : 'Grail-Comparison' }
AbstractPyInt >> > other [
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value > other value].
	^ self value > other

]

{ #category : 'Grail-Comparison' }
AbstractPyInt >> >= other [
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value >= other value].
	^ self value >= other

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> abs [
	^ self value abs

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyInt >> asFloat [
	^ self value asFloat

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyInt >> asFraction [
	"Needed by Integer>>< / >>= , whose fallback compares through
	AbstractFraction when the argument is a non-SmallInteger Number."

	^ self value asFraction

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyInt >> asInteger [
	^ self value

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> bitAnd: other [
	^ self value bitAnd: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> bitOr: other [
	^ self value bitOr: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> bitShift: other [
	^ self value bitShift: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> bitXor: other [
	^ self value bitXor: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> cantPerform: aSymbol withArguments: anArray env: envId [
	"Mirror DNU for explicit perform:env: calls."

	^ self doesNotUnderstand: aSymbol args: anArray envId: envId

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> doesNotUnderstand: aSelector args: anArray envId: envId [
	"Forward unknown env-1 messages (__add__, __sub__, __or__, ...) to
	the wrapped SmallInteger.  Arguments that are themselves AbstractPyInt
	wrappers are unwrapped to their value first — arithmetic (+, -, *) is
	coerced via _generality, but bitwise ops (bitOr:/bitAnd:) have no
	coercing retry, so e.g. ``IntFlag.A | IntFlag.B`` needs the right
	operand unwrapped here.  The result strips the wrapper (a documented,
	intentional limitation for arithmetic)."

	| unwrapped |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	unwrapped := anArray collect: [:a |
		(a isKindOf: AbstractPyInt) ifTrue: [a value] ifFalse: [a]].
	^ self value perform: aSelector env: 1 withArguments: unwrapped

]

{ #category : 'Grail-Hashing' }
AbstractPyInt >> hash [
	^ self value hash

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> max: other [
	^ self value max: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> min: other [
	^ self value min: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> negated [
	^ self value negated

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> printOn: aStream [
	aStream nextPutAll: self value printString

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> quo: other [
	^ self value quo: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> raisedTo: other [
	^ self value raisedTo: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyInt >> rem: other [
	^ self value rem: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyInt >> truncated [
	^ self value

]

{ #category : 'Grail-Accessors' }
AbstractPyInt >> value [
	"The underlying SmallInteger.  Read by the numeric protocol below
	and by the CPython shim (PyLong_As* -> __index__) at the C boundary.

	Unwrapped to a PLAIN Integer, because the slot can legitimately hold
	another wrapper.  CPython's EnumType.__new__ sets a member's canonical
	value to member_type(*args), and for a user int subclass that IS an
	int-subclass instance -- Foo.TEST._value_ is MyInt(1), not 1
	(test_multiple_mixin_inherited).  Every reader here wants the true
	integer: _generality coercion, truncated/asInteger, __index__'s PEP 357
	contract, __int__ (whose caller rejects a non-int -- ``__int__ returned
	non-int (type NamedInt)''), and the C shim.  A one-level read handed them
	the wrapper instead."

	| v |
	v := self dynamicInstVarAt: #value.
	[(v @env0:isKindOf: AbstractPyInt)
		and: [(v @env0:dynamicInstVarAt: #value) @env0:notNil]] whileTrue: [
			v := v @env0:dynamicInstVarAt: #value].
	^ v

]
