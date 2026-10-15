Extension { #name : 'Fraction' }

{ #category : 'Grail-Instance Creation' }
Fraction class >> __new__: cls [
	"Fraction() -> Fraction(0, 1)"

	^ 0 @env0:asFraction

]

{ #category : 'Grail-Instance Creation' }
Fraction class >> __new__: cls _: value [
	"Fraction(value) -> rational equivalent of value"

	value ifNil: [ ^ 0 @env0:asFraction ].
	(value isKindOf: Fraction) ifTrue: [ ^ value ].

	"Try to use the Smalltalk asFraction conversion"
	^ [ value @env0:asFraction ]
		@env0:on: Error
		do: [:ex | TypeError @env0:signal: 'cannot convert to Fraction']

]

{ #category : 'Grail-Instance Creation' }
Fraction class >> __new__: cls _: numerator _: denominator [
	"Fraction(numerator, denominator) constructor"

	| num den result |
	num := numerator.
	den := denominator.
	den ifNil: [ den := 1 ].
	(den @env0:= 0) ifTrue: [
		ZeroDivisionError ___signal___: 'Fraction() denominator is zero'
	].

	result := (num @env0:asFraction) @env0:/ (den @env0:asFraction).

	"Ensure we always return a Fraction, not an Integer"
	(result isKindOf: AbstractFraction) ifFalse: [
		result := result @env0:asFraction.
	].
	^ result

]

{ #category : 'Grail-Class Methods' }
Fraction class >> from_decimal: d [
	"Construct a Fraction from a Decimal.
	Raises TypeError if d is not a Decimal."

	| frac |
	"Must be a ScaledDecimal (Decimal)"
	(d _isScaledDecimal) ifFalse: [
		TypeError ___signal___: 'Fraction.from_decimal() argument must be a Decimal'
	].

	"Convert using GemStone's asFraction"
	frac := d @env0:asFraction.
	^ frac

]

{ #category : 'Grail-Class Methods' }
Fraction class >> from_float: f [
	"Construct a Fraction from a float.
	Raises TypeError if f is not a float or integer."

	| frac kind |
	"Handle integers by converting to float first"
	(f isKindOf: Integer) ifTrue: [
		^ Fraction ___new___: Fraction _: f _: 1
	].

	"Must be a float"
	(f isKindOf: Float) ifFalse: [
		TypeError ___signal___: 'Fraction.from_float() argument must be a float'
	].

	"Handle special float values using _getKind: 3=infinity, 5=NaN"
	kind := f @env0:_getKind.
	(kind == 5) ifTrue: [
		ValueError ___signal___: 'cannot convert NaN to Fraction'
	].
	(kind == 3) ifTrue: [
		ValueError ___signal___: 'cannot convert Infinity to Fraction'
	].

	"Convert using GemStone's asFraction"
	frac := f @env0:asFraction.
	^ frac

]

{ #category : 'Grail-Class Methods' }
Fraction class >> from_number: n [
	"Construct a Fraction from any number with as_integer_ratio method.
	Raises AttributeError if n doesn't have as_integer_ratio."

	| ratio num den |
	ratio := n as_integer_ratio.
	num := ratio @env0:at: 1.
	den := ratio @env0:at: 2.
	^ Fraction ___new___: Fraction _: num _: den

]
