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

	^ 0 perform: #asFraction env: 0
%

category: 'Python-Instance Creation'
classmethod: Fraction
__new__: cls _: numerator _: denominator
	"Fraction(numerator, denominator) constructor"

	| num den result |
	num := numerator.
	den := denominator.
	den ifNil: [ den := 1 ].
	(den ___eq___: 0) ifTrue: [
		ZeroDivisionError ___signal___: 'Fraction() denominator is zero'
	].

	result := (num perform: #asFraction env: 0)
		perform: #/ env: 0
		withArguments: {den perform: #asFraction env: 0}.

	"Ensure we always return a Fraction, not an Integer"
	(result ___isKindOf___: AbstractFraction) ifFalse: [
		result := result perform: #asFraction env: 0.
	].
	^ result
%

category: 'Python-Instance Creation'
classmethod: Fraction
__new__: cls _: value
	"Fraction(value) -> rational equivalent of value"

	value ifNil: [ ^ 0 perform: #asFraction env: 0 ].
	(value ___isKindOf___: Fraction) ifTrue: [ ^ value ].

	"Try to use the Smalltalk asFraction conversion"
	^ ([:block :handler |
		block ___on___: Error do: handler
	] value: [
		value perform: #asFraction env: 0
	] value: [:ex |
		self ___error___: 'TypeError: cannot convert to Fraction'
	])
%

category: 'Python-Class Methods'
classmethod: Fraction
from_decimal: d
	"Construct a Fraction from a Decimal.
	Raises TypeError if d is not a Decimal."

	| frac |
	"Must be a ScaledDecimal (Decimal)"
	(d ___isScaledDecimal___) ifFalse: [
		TypeError ___signal___: 'Fraction.from_decimal() argument must be a Decimal'
	].

	"Convert using GemStone's asFraction"
	frac := d ___asFraction___.
	^ frac
%

category: 'Python-Class Methods'
classmethod: Fraction
from_float: f
	"Construct a Fraction from a float.
	Raises TypeError if f is not a float or integer."

	| frac kind |
	"Handle integers by converting to float first"
	(f ___isKindOf___: Integer) ifTrue: [
		^ Fraction ___new___: Fraction _: f _: 1
	].

	"Must be a float"
	(f ___isKindOf___: Float) ifFalse: [
		TypeError ___signal___: 'Fraction.from_float() argument must be a float'
	].

	"Handle special float values using _getKind: 3=infinity, 5=NaN"
	kind := f ___getKind___.
	(kind ___eq___: 5) ifTrue: [
		ValueError ___signal___: 'cannot convert NaN to Fraction'
	].
	(kind ___eq___: 3) ifTrue: [
		ValueError ___signal___: 'cannot convert Infinity to Fraction'
	].

	"Convert using GemStone's asFraction"
	frac := f ___asFraction___.
	^ frac
%

category: 'Python-Class Methods'
classmethod: Fraction
from_number: n
	"Construct a Fraction from any number with as_integer_ratio method.
	Raises TypeError if n doesn't have as_integer_ratio."

	| ratio num den |
	"Check if it has as_integer_ratio method in env 2"
	(n ___respondsToEnv1___: #as_integer_ratio) ifFalse: [
		TypeError ___signal___: 'argument must have as_integer_ratio method'
	].

	"Call as_integer_ratio and construct fraction"
	ratio := n as_integer_ratio.
	num := ratio ___at___: 1.
	den := ratio ___at___: 2.
	^ Fraction ___new___: Fraction _: num _: den
%

category: 'Python-Conversion'
method: AbstractFraction
__bool__
	"Return False for 0, True otherwise."

	| zero |
	zero := 0 perform: #asFraction env: 0.
	^ self ___ne___: zero
%

category: 'Python-Rounding'
method: AbstractFraction
__ceil__
	"Return the smallest integer >= self.
	Ceiling is -floor(-self)."

	| n d negN |
	n := self perform: #numerator env: 0.
	d := self perform: #denominator env: 0.
	"Use // (floor division) on negated numerator, then negate result"
	negN := n perform: #negated env: 0.
	^ (negN perform: #// env: 0 withArguments: {d}) perform: #negated env: 0
%

category: 'Python-Conversion'
method: AbstractFraction
__float__
	"Convert Fraction to float."

	^ self perform: #asFloat env: 0
%

category: 'Python-Rounding'
method: AbstractFraction
__floor__
	"Return the largest integer <= self.
	Note: Python floor divides toward negative infinity, not toward zero."

	| n d |
	n := self perform: #numerator env: 0.
	d := self perform: #denominator env: 0.
	"Use // (floor division) which always rounds toward negative infinity"
	^ n perform: #// env: 0 withArguments: {d}
%

category: 'Python-Format'
method: AbstractFraction
__format__: formatSpec
	"Format the Fraction according to formatSpec.
	Empty format returns str(self). Otherwise converts to float first."

	| spec |
	spec := formatSpec ifNil: [ '' ].
	(spec ___eq___: '') ifTrue: [
		^ self __str__
	].
	"For other format specs, convert to float and format"
	^ (self perform: #asFloat env: 0) perform: #__format__: env: 1 withArguments: {spec}
%

category: 'Python-Hash'
method: AbstractFraction
__hash__
	"Return hash value."

	^ self ___hash___
%

category: 'Python-Conversion'
method: AbstractFraction
__int__
	"Convert Fraction to int by truncation toward zero."

	^ self perform: #truncated env: 0
%

category: 'Python-String Representation'
method: AbstractFraction
__repr__
	"Return repr(Fraction) as 'Fraction(n, d)'."

	| n d s |
	n := self perform: #numerator env: 0.
	d := self perform: #denominator env: 0.
	s := 'Fraction('.
	s := (s ___concat___: (n ___printString___)) ___concat___: ', '.
	s := (s ___concat___: (d ___printString___)) ___concat___: ')'.
	^ s ___asUnicodeString___
%

category: 'Python-Rounding'
method: AbstractFraction
__round__
	"Round to nearest integer, ties go to even."

	| n d floor remainder doubleRemainder sign |
	n := self perform: #numerator env: 0.
	d := self perform: #denominator env: 0.
	floor := n perform: #// env: 0 withArguments: {d}.
	remainder := ((n perform: #- env: 0 withArguments: {floor perform: #* env: 0 withArguments: {d}}) perform: #abs env: 0).
	doubleRemainder := remainder perform: #* env: 0 withArguments: {2}.
	sign := (n perform: #>= env: 0 withArguments: {0}) ifTrue: [1] ifFalse: [-1].
	(doubleRemainder perform: #< env: 0 withArguments: {d}) ifTrue: [ ^ floor ].
	(doubleRemainder perform: #> env: 0 withArguments: {d}) ifTrue: [ ^ floor perform: #+ env: 0 withArguments: {sign} ].
	"Exactly halfway - round to even"
	((floor perform: #bitAnd: env: 0 withArguments: {1}) perform: #= env: 0 withArguments: {0})
		ifTrue: [ ^ floor ]
		ifFalse: [ ^ floor perform: #+ env: 0 withArguments: {sign} ]
%

category: 'Python-Rounding'
method: AbstractFraction
__round__: ndigits
	"Round to n digits after decimal point."

	| shift shifted rounded absDigits |
	ndigits ifNil: [ ^ self __round__ ].

	"If ndigits is 0, return integer"
	(ndigits perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ self __round__
	].

	"Shift, round, shift back"
	absDigits := (ndigits perform: #< env: 0 withArguments: {0})
		ifTrue: [ndigits perform: #negated env: 0]
		ifFalse: [ndigits].
	shift := 10 perform: #raisedTo: env: 0 withArguments: {absDigits}.
	(ndigits perform: #> env: 0 withArguments: {0}) ifTrue: [
		shifted := self perform: #* env: 0 withArguments: {shift}.
		rounded := shifted __round__.
		^ Fraction ___new___: Fraction _: rounded _: shift
	] ifFalse: [
		shifted := self perform: #/ env: 0 withArguments: {shift}.
		rounded := shifted __round__.
		^ rounded perform: #* env: 0 withArguments: {shift}
	]
%

category: 'Python-String Representation'
method: AbstractFraction
__str__
	"Return string representation like '3/2'."

	^ (self ___printString___) ___asUnicodeString___
%

category: 'Python-Fraction Methods'
method: AbstractFraction
as_integer_ratio
	"Return a tuple (numerator, denominator) representing the fraction.
	For Fraction, this is simply (numerator, denominator)."

	^ tuple ___with___: (self perform: #numerator env: 0) with: (self perform: #denominator env: 0)
%

category: 'Python-Properties'
method: AbstractFraction
denominator
	"Return the denominator of the fraction."

	^ self perform: #denominator env: 0
%

category: 'Python-Fraction Methods'
method: AbstractFraction
is_integer
	"Return True if the fraction represents an integer (denominator == 1)."

	^ (self perform: #denominator env: 0) ___eq___: 1
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
	(maxDenominator ___lt___: 1) ifTrue: [
		ValueError ___signal___: 'max_denominator should be at least 1'
	].

	"If denominator is already within limit, return self"
	((self perform: #denominator env: 0) ___le___: maxDenominator) ifTrue: [
		^ self
	].

	p0 := 0. q0 := 1.
	p1 := 1. q1 := 0.
	n := self perform: #numerator env: 0.
	d := self perform: #denominator env: 0.

	"Continued fraction algorithm"
	[true] ___whileTrue___: [
		a := n perform: #quo: env: 0 withArguments: {d}.
		q2 := q0 ___plus___: (a ___times___: q1).
		(q2 ___gt___: maxDenominator) ifTrue: [
			"Found the bound, now find best approximation"
			k := (maxDenominator ___minus___: q0) perform: #quo: env: 0 withArguments: {q1}.
			bound1 := Fraction ___new___: Fraction _: (p0 ___plus___: (k ___times___: p1)) _: (q0 ___plus___: (k ___times___: q1)).
			bound2 := Fraction ___new___: Fraction _: p1 _: q1.
			"Return whichever is closer to self"
			diff1 := (self ___minus___: bound1) ___abs___.
			diff2 := (self ___minus___: bound2) ___abs___.
			(diff2 ___le___: diff1)
				ifTrue: [ ^ bound2 ]
				ifFalse: [ ^ bound1 ]
		].
		"Update convergents: p0, q0 become old p1, q1; compute new p1, q1"
		newP1 := p0 ___plus___: (a ___times___: p1).
		p0 := p1. q0 := q1. p1 := newP1. q1 := q2.
		"Swap n and d for next iteration: n, d = d, n - a*d"
		temp := d.
		d := n ___minus___: (a ___times___: temp).
		n := temp.
	].
%

category: 'Python-Properties'
method: AbstractFraction
numerator
	"Return the numerator of the fraction."

	^ self perform: #numerator env: 0
%

set compile_env: 0
