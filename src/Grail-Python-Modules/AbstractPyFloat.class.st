"The float twin of [[AbstractPyInt]]: a reusable base for Python objects
that ARE a float by value but also carry extra attributes.  ``class
MyFloat(float)`` cannot subclass the sealed kernel Float/SmallDouble
(immediate storage), so Class>>___subclass___ substitutes this
Number sibling.

# Generality
``_generality`` returns 80 -- ABOVE SmallInteger (20) / LargeInteger
(40) / SmallFraction (70) and BELOW SmallDouble (85).  Mixed
arithmetic with an integer coerces the INTEGER up through
``_coerce:`` (``1 + MyFloat(2.5)`` retries as ``1.0 + wrapper`` and
lands in the Float branch); mixed arithmetic with a kernel float
coerces the WRAPPER down to its plain value via ``asFloat``.  Either
way the result is a plain SmallDouble -- CPython float-subclass
operator semantics (``MyFloat(2.5) + 1`` is a plain float).

The wrapped value lives in dynamic instVar ``#value``."
Class {
	#name : 'AbstractPyFloat',
	#superclass : 'Number',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Comparison' }
AbstractPyFloat class >> ___builtinValueClass___ [
	"The kernel class the builtin's own VALUES belong to (a float is a SmallDouble or Float), which
	this class -- the root of every Python subclass of the builtin -- does not
	inherit from.  Object >> ___reflectedFirst___ asks it, so that ``0 ==
	C3(11)'' for ``class C3(int)'' sees C3 as a proper subclass of int and tries
	C3's reflected method first, as CPython does (#1495)."

	^ Float

]

{ #category : 'Grail-Introspection' }
AbstractPyFloat class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Instance Creation' }
AbstractPyFloat class >> new [
	"Number disallows #new; route ClassDefAst's ``self new`` +
	``__init__`` allocation path to basicNew (same as AbstractPyInt)."

	^ self basicNew

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyFloat >> _coerce: aNumber [
	"Called when THIS wrapper is the higher-generality operand (the
	other side is an integer/fraction): lift the other side to a plain
	Float so the retried operation lands in the Float branch, which
	then strips this wrapper via asFloat."

	^ aNumber asFloat

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyFloat >> _generality [
	^ 80

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> - other [
	^ self value - ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> * other [
	^ self value * ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> / other [
	^ self value / ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> // other [
	^ self value // ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> \\ other [
	^ self value \\ ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> + other [
	^ self value + ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Comparison' }
AbstractPyFloat >> < other [
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value < other value].
	^ self value < other

]

{ #category : 'Grail-Comparison' }
AbstractPyFloat >> <= other [
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value <= other value].
	^ self value <= other

]

{ #category : 'Grail-Comparison' }
AbstractPyFloat >> = other [
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value = other value].
	^ self value = other

]

{ #category : 'Grail-Comparison' }
AbstractPyFloat >> > other [
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value > other value].
	^ self value > other

]

{ #category : 'Grail-Comparison' }
AbstractPyFloat >> >= other [
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value >= other value].
	^ self value >= other

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> abs [
	^ self value abs

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyFloat >> asFloat [
	^ self value

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyFloat >> asFraction [
	^ self value asFraction

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyFloat >> asInteger [
	^ self value truncated

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> cantPerform: aSymbol withArguments: anArray env: envId [
	^ self doesNotUnderstand: aSymbol args: anArray envId: envId

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> doesNotUnderstand: aSelector args: anArray envId: envId [
	"Forward unknown env-1 messages (__add__, __mul__, ...) to the
	wrapped SmallDouble, unwrapping wrapper arguments (see
	AbstractPyInt for the rationale)."

	| unwrapped |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	unwrapped := anArray collect: [:a |
		(a isKindOf: AbstractPyFloat) ifTrue: [a value] ifFalse: [a]].
	^ self value perform: aSelector env: 1 withArguments: unwrapped

]

{ #category : 'Grail-Hashing' }
AbstractPyFloat >> hash [
	^ self value hash

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> max: other [
	^ self value max: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> min: other [
	^ self value min: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> negated [
	^ self value negated

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> printOn: aStream [
	aStream nextPutAll: self value printString

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> quo: other [
	^ self value quo: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> raisedTo: other [
	^ self value raisedTo: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Forward' }
AbstractPyFloat >> rem: other [
	^ self value rem: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])

]

{ #category : 'Grail-Arithmetic Support' }
AbstractPyFloat >> truncated [
	^ self value truncated

]

{ #category : 'Grail-Accessors' }
AbstractPyFloat >> value [
	"The underlying SmallDouble."

	^ self dynamicInstVarAt: #value

]
