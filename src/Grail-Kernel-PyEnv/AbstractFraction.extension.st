Extension { #name : 'AbstractFraction' }

{ #category : 'Grail-Conversion' }
AbstractFraction >> __bool__ [
	"Return False for 0, True otherwise."

	| zero |
	zero := 0 @env0:asFraction.
	^ self @env0:~= zero

]

{ #category : 'Grail-Rounding' }
AbstractFraction >> __ceil__ [
	"Return the smallest integer >= self.
	Ceiling is -floor(-self)."

	| n d negN |
	n := self @env0:numerator.
	d := self @env0:denominator.
	"Use // (floor division) on negated numerator, then negate result"
	negN := n @env0:negated.
	^ (negN @env0:// d) @env0:negated

]

{ #category : 'Grail-Conversion' }
AbstractFraction >> __float__ [
	"Convert Fraction to float."

	^ self @env0:asFloat

]

{ #category : 'Grail-Rounding' }
AbstractFraction >> __floor__ [
	"Return the largest integer <= self.
	Note: Python floor divides toward negative infinity, not toward zero."

	| n d |
	n := self @env0:numerator.
	d := self @env0:denominator.
	"Use // (floor division) which always rounds toward negative infinity"
	^ n @env0:// d

]

{ #category : 'Grail-Format' }
AbstractFraction >> __format__: formatSpec [
	"Format the Fraction according to formatSpec.
	Empty format returns str(self). Otherwise converts to float first."

	| spec |
	spec := formatSpec ifNil: [ '' ].
	(spec @env0:= '') ifTrue: [
		^ self __str__
	].
	"For other format specs, convert to float and format"
	^ (self @env0:asFloat) __format__: spec

]

{ #category : 'Grail-Hash' }
AbstractFraction >> __hash__ [
	"CPython's numeric hash for a rational, so a kernel Fraction hashes equal to
	every other numeric type it compares equal to.

	It used to answer ``self hash'', GemStone's own, which knows nothing about
	sys.hash_info.modulus and so agreed with float only by accident: (1/2) hashed
	534773760 where hash(0.5) is 1152921504606846976, while (1/2) __eq__ 0.5
	answered true.  Equal values with different hashes are invisible to a dict --
	a dict keyed by one does not find the other, and nothing raises (#1258).

	The value is numerator/denominator, so its hash is
	(|numerator| * inverse(denominator)) mod P carrying the numerator's sign,
	P = 2**61 - 1.  The closing four lines are Float >> __hash__'s, deliberately:
	this is that method's formula with the one step it can skip put back.  A
	float's denominator is a power of two, whose inverse is another power of two
	because 2**61 == 1 (mod P), but a rational's denominator is arbitrary and
	needs a real modular inverse.

	A DENOMINATOR THAT IS A MULTIPLE OF P has no inverse, and unlike the power-of-
	two and power-of-ten cases that branch is reachable here -- Fraction(1, P).
	CPython answers sys.hash_info.inf for it, and ___modInverse___ raises the same
	ValueError that CPython's pow(den, -1, P) raises, so the handler is where that
	answer belongs.

	The ScaledDecimal half of this is #857; fractions.Fraction is unaffected,
	being pure Python with CPython's own __hash__."

	| modulus numerator denominator hashValue |

	modulus := 2305843009213693951.
	numerator := self @env0:numerator.
	denominator := self @env0:denominator.
	hashValue := [
		((numerator @env0:abs @env0:\\ modulus)
			@env0:* (builtins instance ___modInverse___: denominator mod: modulus))
				@env0:\\ modulus]
		@env0:on: ValueError
		do: [:anException | anException @env0:return: 314159].
	(numerator @env0:< 0) ifTrue: [hashValue := hashValue @env0:negated].
	(hashValue @env0:= -1) ifTrue: [^ -2].
	^ hashValue

]

{ #category : 'Grail-Conversion' }
AbstractFraction >> __int__ [
	"Convert Fraction to int by truncation toward zero."

	^ self @env0:truncated

]

{ #category : 'Grail-String Representation' }
AbstractFraction >> __repr__ [
	"Return repr(Fraction) as 'Fraction(n, d)'."

	| n d s |
	n := self @env0:numerator.
	d := self @env0:denominator.
	s := 'Fraction('.
	s := (s @env0:, (n @env0:printString)) @env0:, ', '.
	s := (s @env0:, (d @env0:printString)) @env0:, ')'.
	^ s @env0:asUnicodeString

]

{ #category : 'Grail-Rounding' }
AbstractFraction >> __round__ [
	"Round to nearest integer, ties go to even.

	// is FLOOR division (always rounds toward negative infinity,
	regardless of sign), so the remainder n - floor*d is always in
	[0, d) and the two candidates bracketing self are ALWAYS `floor`
	and `floor + 1` -- never `floor + sign`.  The previous ``+ sign''
	logic assumed a TRUNCATING (round-toward-zero) floor, which // is
	not: for n=-1, d=10 (self = -0.1) it produced -2 instead of 0, and
	for an exact negative tie like -5/2 it produced -4 instead of the
	correct -2 (test_fractions.py's testConversions: round(F(-1, 10))
	== 0; testRound: round(F(-25, 100), 1) == F(-2, 10))."

	| n d floor remainder doubleRemainder |
	n := self @env0:numerator.
	d := self @env0:denominator.
	floor := n @env0:// d.
	remainder := n @env0:- (floor @env0:* d).
	doubleRemainder := remainder @env0:* 2.
	(doubleRemainder @env0:< d) ifTrue: [ ^ floor ].
	(doubleRemainder @env0:> d) ifTrue: [ ^ floor @env0:+ 1 ].
	"Exactly halfway - round to even"
	((floor @env0:bitAnd: 1) == 0)
		ifTrue: [ ^ floor ]
		ifFalse: [ ^ floor @env0:+ 1 ]

]

{ #category : 'Grail-Rounding' }
AbstractFraction >> __round__: ndigits [
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

]

{ #category : 'Grail-String Representation' }
AbstractFraction >> __str__ [
	"Return string representation like '3/2'."

	^ (self @env0:printString) @env0:asUnicodeString

]

{ #category : 'Grail-Fraction Methods' }
AbstractFraction >> as_integer_ratio [
	"Return a tuple (numerator, denominator) representing the fraction.
	For Fraction, this is simply (numerator, denominator)."

	^ tuple @env0:with: (self @env0:numerator) with: (self @env0:denominator)

]

{ #category : 'Grail-Properties' }
AbstractFraction >> denominator [
	"Return the denominator of the fraction."

	^ self @env0:denominator

]

{ #category : 'Grail-Fraction Methods' }
AbstractFraction >> is_integer [
	"Return True if the fraction represents an integer (denominator == 1)."

	^ (self @env0:denominator) == 1

]

{ #category : 'Grail-Fraction Methods' }
AbstractFraction >> limit_denominator [
	"Find the closest rational with denominator at most 10**6 (default)."

	^ self limit_denominator: 1000000

]

{ #category : 'Grail-Fraction Methods' }
AbstractFraction >> limit_denominator: maxDenominator [
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

]

{ #category : 'Grail-Properties' }
AbstractFraction >> numerator [
	"Return the numerator of the fraction."

	^ self @env0:numerator

]
