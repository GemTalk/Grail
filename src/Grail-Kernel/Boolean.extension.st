Extension { #name : 'Boolean' }

{ #category : 'Grail-Python Attribute Hook' }
Boolean class >> ___pythonValueAttrs___ [
	"Unary methods exposed to Python as VALUE attributes rather than
	bound methods — bool inherits int's numerator/denominator/real/imag
	properties (see Int.gs>>___pythonValueAttrs___, which this mirrors:
	a BoundMethod here would poison ``True.real + 1'')."

	^ IdentitySet new
		add: #numerator;
		add: #denominator;
		add: #real;
		add: #imag;
		yourself

]

{ #category : 'Grail-Arithmetic Support' }
Boolean >> _coerce: aNumber [
	"Coerce aNumber to be compatible with bool (as integer).
	Convert aNumber to Integer since bool behaves like Integer for arithmetic."

	^ aNumber asInteger

]

{ #category : 'Grail-Arithmetic Support' }
Boolean >> _generality [
	"Return generality for bool in numeric hierarchy.
	bool has the LOWEST generality (10) so it gets coerced to other numeric types.
	This is lower than SmallInteger (20) and Integer (40)."

	^ 10

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> - aNumber [
	"Subtract aNumber from bool (as integer)."

	^ self asInteger - aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> * aNumber [
	"Multiply bool (as integer) by aNumber."

	^ self asInteger * aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> / aNumber [
	"Divide bool (as integer) by aNumber."

	^ self asInteger / aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> // aNumber [
	"Integer division of bool (as integer) by aNumber."

	^ self asInteger // aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> \\ aNumber [
	"Modulo of bool (as integer) by aNumber."

	^ self asInteger \\ aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> + aNumber [
	"Add bool (as integer) to aNumber."

	^ self asInteger + aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> < aNumber [
	"Less than comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger < otherInt

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> <= aNumber [
	"Less than or equal comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger <= otherInt

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> = anObject [
	"Equality comparison. Handle bool specially, otherwise compare as integer."

	| otherInt |
	otherInt := anObject class == bool
		ifTrue: [anObject ifTrue: [1] ifFalse: [0]]
		ifFalse: [anObject].
	^ self asInteger = otherInt

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> > aNumber [
	"Greater than comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger > otherInt

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> >= aNumber [
	"Greater than or equal comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger >= otherInt

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> ~= anObject [
	"Inequality comparison. Handle bool specially, otherwise compare as integer."

	| otherInt |
	otherInt := anObject class == bool
		ifTrue: [anObject ifTrue: [1] ifFalse: [0]]
		ifFalse: [anObject].
	^ self asInteger ~= otherInt

]

{ #category : 'Grail-Arithmetic' }
Boolean >> abs [
	"Return absolute value (true=1, false=0)."

	^ self asInteger

]

{ #category : 'Grail-Conversion' }
Boolean >> asFixedPoint: scale [
	"Convert bool to FixedPoint."

	^ self asInteger asFixedPoint: scale

]

{ #category : 'Grail-Conversion' }
Boolean >> asFloat [
	"Convert bool to Float (true=1.0, false=0.0)."

	^ self ifTrue: [1.0] ifFalse: [0.0]

]

{ #category : 'Grail-Conversion' }
Boolean >> asFraction [
	"Convert bool to Fraction (true=1, false=0)."

	^ self asInteger

]

{ #category : 'Grail-Conversion' }
Boolean >> asInteger [
	"Convert bool to int (true=1, false=0)."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Conversion' }
Boolean >> asScaledDecimal: scale [
	"Convert bool to ScaledDecimal."

	^ self asInteger asScaledDecimal: scale

]

{ #category : 'Grail-Conversion' }
Boolean >> ceiling [
	"Return integer value (true=1, false=0)."

	^ self asInteger

]

{ #category : 'Grail-Testing' }
Boolean >> even [
	"Return true if even (true=1 is odd, false=0 is even)."

	^ self not

]

{ #category : 'Grail-Conversion' }
Boolean >> floor [
	"Return integer value (true=1, false=0)."

	^ self asInteger

]

{ #category : 'Grail-Arithmetic Support' }
Boolean >> isNumber [
	"Return true - bool participates in arithmetic as a number.
	Note: We override isNumber (not _isNumber which is an optimized selector)."

	^ true

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> max: aNumber [
	"Return maximum of bool (as integer) and aNumber."

	^ self asInteger max: aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> min: aNumber [
	"Return minimum of bool (as integer) and aNumber."

	^ self asInteger min: aNumber

]

{ #category : 'Grail-Arithmetic' }
Boolean >> negated [
	"Return negation (true=-1, false=0)."

	^ self asInteger negated

]

{ #category : 'Grail-Testing' }
Boolean >> negative [
	"Return false - booleans as integers are never negative."

	^ false

]

{ #category : 'Grail-Testing' }
Boolean >> odd [
	"Return true if odd (true=1 is odd, false=0 is even)."

	^ self

]

{ #category : 'Grail-Testing' }
Boolean >> positive [
	"Return true if self is true or false (equivalent to >= 0)."

	^ true

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> raisedTo: aNumber [
	"Raise bool (as integer) to the power of aNumber."

	^ self asInteger raisedTo: aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
Boolean >> raisedToInteger: aNumber [
	"Raise bool (as integer) to the power of aNumber (integer)."

	^ self asInteger raisedToInteger: aNumber

]

{ #category : 'Grail-Arithmetic' }
Boolean >> reciprocal [
	"Return reciprocal (true=1, false=error)."

	^ self asInteger reciprocal

]

{ #category : 'Grail-Conversion' }
Boolean >> rounded [
	"Return integer value (true=1, false=0)."

	^ self asInteger

]

{ #category : 'Grail-Arithmetic' }
Boolean >> sign [
	"Return sign (true=1, false=0)."

	^ self asInteger

]

{ #category : 'Grail-Testing' }
Boolean >> strictlyPositive [
	"Return true if self is true (equivalent to > 0)."

	^ self

]

{ #category : 'Grail-Conversion' }
Boolean >> truncated [
	"Return integer value (true=1, false=0)."

	^ self asInteger

]
