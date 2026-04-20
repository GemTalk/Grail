! ===============================================================================
! Fraction (Python 'fractions.Fraction' type mapping)
! ===============================================================================
! This file adds Python methods to GemStone's AbstractFraction class so it behaves as
! Python's fractions.Fraction type when used from the Python bridge.
! Both Fraction and SmallFraction inherit from AbstractFraction.
! ===============================================================================

! ------------------- Remove existing Python methods from AbstractFraction
expectvalue /Metaclass3
doit
AbstractFraction removeAllMethods: 1.
AbstractFraction class removeAllMethods: 1.
Fraction removeAllMethods: 1.
Fraction class removeAllMethods: 1.
SmallFraction removeAllMethods: 1.
SmallFraction class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Instance Creation'
classmethod: Fraction
__new__: cls
	"Fraction() -> Fraction(0, 1)"

	^ 0 @env0:asFraction
%

category: 'Python-Instance Creation'
classmethod: Fraction
__new__: cls _: numerator _: denominator
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
	(result @env0:isKindOf: AbstractFraction) ifFalse: [
		result := result @env0:asFraction.
	].
	^ result
%

category: 'Python-Instance Creation'
classmethod: Fraction
__new__: cls _: value
	"Fraction(value) -> rational equivalent of value"

	value ifNil: [ ^ 0 @env0:asFraction ].
	(value @env0:isKindOf: Fraction) ifTrue: [ ^ value ].

	"Try to use the Smalltalk asFraction conversion"
	^ ([:block :handler |
		block @env0:on: Error do: handler
	] value: [
		value @env0:asFraction
	] value: [:ex |
		self @env0:error: 'TypeError: cannot convert to Fraction'
	])
%

category: 'Python-Class Methods'
classmethod: Fraction
from_decimal: d
	"Construct a Fraction from a Decimal.
	Raises TypeError if d is not a Decimal."

	| frac |
	"Must be a ScaledDecimal (Decimal)"
	(d @env0:_isScaledDecimal) ifFalse: [
		TypeError ___signal___: 'Fraction.from_decimal() argument must be a Decimal'
	].

	"Convert using GemStone's asFraction"
	frac := d @env0:asFraction.
	^ frac
%

category: 'Python-Class Methods'
classmethod: Fraction
from_float: f
	"Construct a Fraction from a float.
	Raises TypeError if f is not a float or integer."

	| frac kind |
	"Handle integers by converting to float first"
	(f @env0:isKindOf: Integer) ifTrue: [
		^ Fraction ___new___: Fraction _: f _: 1
	].

	"Must be a float"
	(f @env0:isKindOf: Float) ifFalse: [
		TypeError ___signal___: 'Fraction.from_float() argument must be a float'
	].

	"Handle special float values using _getKind: 3=infinity, 5=NaN"
	kind := f @env0:_getKind.
	(kind @env0:= 5) ifTrue: [
		ValueError ___signal___: 'cannot convert NaN to Fraction'
	].
	(kind @env0:= 3) ifTrue: [
		ValueError ___signal___: 'cannot convert Infinity to Fraction'
	].

	"Convert using GemStone's asFraction"
	frac := f @env0:asFraction.
	^ frac
%

category: 'Python-Class Methods'
classmethod: Fraction
from_number: n
	"Construct a Fraction from any number with as_integer_ratio method.
	Raises AttributeError if n doesn't have as_integer_ratio."

	| ratio num den |
	ratio := n as_integer_ratio.
	num := ratio @env0:at: 1.
	den := ratio @env0:at: 2.
	^ Fraction ___new___: Fraction _: num _: den
%

category: 'Python-Conversion'
method: AbstractFraction
__bool__
	"Return False for 0, True otherwise."

	| zero |
	zero := 0 @env0:asFraction.
	^ self @env0:~= zero
%

category: 'Python-Rounding'
method: AbstractFraction
__ceil__
	"Return the smallest integer >= self.
	Ceiling is -floor(-self)."

	| n d negN |
	n := self @env0:numerator.
	d := self @env0:denominator.
	"Use // (floor division) on negated numerator, then negate result"
	negN := n @env0:negated.
	^ (negN @env0:// d) @env0:negated
%

category: 'Python-Conversion'
method: AbstractFraction
__float__
	"Convert Fraction to float."

	^ self @env0:asFloat
%

category: 'Python-Rounding'
method: AbstractFraction
__floor__
	"Return the largest integer <= self.
	Note: Python floor divides toward negative infinity, not toward zero."

	| n d |
	n := self @env0:numerator.
	d := self @env0:denominator.
	"Use // (floor division) which always rounds toward negative infinity"
	^ n @env0:// d
%

category: 'Python-Format'
method: AbstractFraction
__format__: formatSpec
	"Format the Fraction according to formatSpec.
	Empty format returns str(self). Otherwise converts to float first."

	| spec |
	spec := formatSpec ifNil: [ '' ].
	(spec @env0:= '') ifTrue: [
		^ self __str__
	].
	"For other format specs, convert to float and format"
	^ (self @env0:asFloat) @env1:__format__: spec
%

category: 'Python-Hash'
method: AbstractFraction
__hash__
	"Return hash value."

	^ self @env0:hash
%

category: 'Python-Conversion'
method: AbstractFraction
__int__
	"Convert Fraction to int by truncation toward zero."

	^ self @env0:truncated
%

category: 'Python-String Representation'
method: AbstractFraction
__repr__
	"Return repr(Fraction) as 'Fraction(n, d)'."

	| n d s |
	n := self @env0:numerator.
	d := self @env0:denominator.
	s := 'Fraction('.
	s := (s @env0:, (n @env0:printString)) @env0:, ', '.
	s := (s @env0:, (d @env0:printString)) @env0:, ')'.
	^ s @env0:asUnicodeString
%

category: 'Python-Rounding'
method: AbstractFraction
__round__
	"Round to nearest integer, ties go to even."

	| n d floor remainder doubleRemainder sign |
	n := self @env0:numerator.
	d := self @env0:denominator.
	floor := n @env0:// d.
	remainder := ((n @env0:- (floor @env0:* d)) @env0:abs).
	doubleRemainder := remainder @env0:* 2.
	sign := (n @env0:>= 0) ifTrue: [1] ifFalse: [-1].
	(doubleRemainder @env0:< d) ifTrue: [ ^ floor ].
	(doubleRemainder @env0:> d) ifTrue: [ ^ floor @env0:+ sign ].
	"Exactly halfway - round to even"
	((floor @env0:bitAnd: 1) @env0:= 0)
		ifTrue: [ ^ floor ]
		ifFalse: [ ^ floor @env0:+ sign ]
%

category: 'Python-Rounding'
method: AbstractFraction
__round__: ndigits
	"Round to n digits after decimal point."

	| shift shifted rounded absDigits |
	ndigits ifNil: [ ^ self __round__ ].

	"If ndigits is 0, return integer"
	(ndigits @env0:= 0) ifTrue: [
		^ self __round__
	].

	"Shift, round, shift back"
	absDigits := (ndigits @env0:< 0)
		ifTrue: [ndigits @env0:negated]
		ifFalse: [ndigits].
	shift := 10 @env0:raisedTo: absDigits.
	(ndigits @env0:> 0) ifTrue: [
		shifted := self @env0:* shift.
		rounded := shifted __round__.
		^ Fraction ___new___: Fraction _: rounded _: shift
	] ifFalse: [
		shifted := self @env0:/ shift.
		rounded := shifted __round__.
		^ rounded @env0:* shift
	]
%

category: 'Python-String Representation'
method: AbstractFraction
__str__
	"Return string representation like '3/2'."

	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Python-Fraction Methods'
method: AbstractFraction
as_integer_ratio
	"Return a tuple (numerator, denominator) representing the fraction.
	For Fraction, this is simply (numerator, denominator)."

	^ tuple @env0:with: (self @env0:numerator) with: (self @env0:denominator)
%

category: 'Python-Properties'
method: AbstractFraction
denominator
	"Return the denominator of the fraction."

	^ self @env0:denominator
%

category: 'Python-Fraction Methods'
method: AbstractFraction
is_integer
	"Return True if the fraction represents an integer (denominator == 1)."

	^ (self @env0:denominator) @env0:= 1
%

category: 'Python-Fraction Methods'
method: AbstractFraction
limit_denominator
	"Find the closest rational with denominator at most 10**6 (default)."

	^ self limit_denominator: 1000000
%

category: 'Python-Fraction Methods'
method: AbstractFraction
limit_denominator: maxDenominator
	"Find the closest rational with denominator at most maxDenominator.
	Uses the continued fraction algorithm from CPython's fractions module."

	| p0 q0 p1 q1 n d a q2 k bound1 bound2 temp newP1 diff1 diff2 |
	maxDenominator ifNil: [ ^ self limit_denominator ].
	(maxDenominator @env0:< 1) ifTrue: [
		ValueError ___signal___: 'max_denominator should be at least 1'
	].

	"If denominator is already within limit, return self"
	((self @env0:denominator) @env0:<= maxDenominator) ifTrue: [
		^ self
	].

	p0 := 0. q0 := 1.
	p1 := 1. q1 := 0.
	n := self @env0:numerator.
	d := self @env0:denominator.

	"Continued fraction algorithm"
	[true] @env0:whileTrue: [
		a := n @env0:quo: d.
		q2 := q0 @env0:+ (a @env0:* q1).
		(q2 @env0:> maxDenominator) ifTrue: [
			"Found the bound, now find best approximation"
			k := (maxDenominator @env0:- q0) @env0:quo: q1.
			bound1 := Fraction ___new___: Fraction _: (p0 @env0:+ (k @env0:* p1)) _: (q0 @env0:+ (k @env0:* q1)).
			bound2 := Fraction ___new___: Fraction _: p1 _: q1.
			"Return whichever is closer to self"
			diff1 := (self @env0:- bound1) @env0:abs.
			diff2 := (self @env0:- bound2) @env0:abs.
			(diff2 @env0:<= diff1)
				ifTrue: [ ^ bound2 ]
				ifFalse: [ ^ bound1 ]
		].
		"Update convergents: p0, q0 become old p1, q1; compute new p1, q1"
		newP1 := p0 @env0:+ (a @env0:* p1).
		p0 := p1. q0 := q1. p1 := newP1. q1 := q2.
		"Swap n and d for next iteration: n, d = d, n - a*d"
		temp := d.
		d := n @env0:- (a @env0:* temp).
		n := temp.
	].
%

category: 'Python-Properties'
method: AbstractFraction
numerator
	"Return the numerator of the fraction."

	^ self @env0:numerator
%

set compile_env: 0
