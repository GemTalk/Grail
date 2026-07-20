! ===============================================================================
! Float Methods (Python 'float' type)
! ===============================================================================
! This file contains method implementations for the Float class when used
! as the Python 'float' type. Float is a concrete class in GemStone representing
! IEEE 754 double-precision floating-point numbers, just like Python's float.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from float
expectvalue /Metaclass3
doit
float removeAllMethods: 1.
float class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: float
__instancecheck__: anObject
	"isinstance(x, float) -- consulted when ``isKindOf: Float`` fails;
	recognize AbstractPyFloat wrappers (float subclasses), matching
	CPython (see int's twin hook)."

	^ anObject isKindOf: AbstractPyFloat
%

category: 'Grail-Instance Creation'
classmethod: float
__new__
	"Create a new float instance with default value 0.0.
	In Python: float() or float.__new__(float)"

	^ 0.0
%

category: 'Grail-Initialization'
classmethod: float
__new__: obj
	"Create a new float instance from an object.
	In Python: float(obj) or float.__new__(float, obj)"

	| result |
	obj ifNil: [ ^ 0.0 ].

	"If already a float, return it"
	(obj isKindOf: float) ifTrue: [
		^ obj
	].

	"Try to call __float__ on the object if it has one.  Probe the
	ENV-1 dict (a Python user class's __float__ is an env-1 method;
	env-0 respondsTo: missed vendored Fraction's)."
	((obj @env0:class @env0:whichClassIncludesSelector: #'__float__' environmentId: 1) ~~ nil) ifTrue: [
		result := obj @env0:perform: #'__float__' env: 1.
		^ result
	].

	"Try to convert from integer"
	(obj isKindOf: Integer) ifTrue: [
		^ obj @env0:asFloat
	].

	"Try to convert from string"
	(obj isKindOf: Unicode7) ifTrue: [
		^ self ___newFromString___: obj
	].

	"Otherwise, error"
	TypeError @env0:signal: 'float() argument must be a string or a number'
%

category: 'Grail-Initialization'
classmethod: float
___newFromString___: str
	"Helper method to convert string to float, handling special values"

	| trimmed lower |
	trimmed := str @env0:trimBoth.

	"Handle special string values -- CPython float() is CASE-INSENSITIVE and
	accepts inf/infinity/nan with an optional sign (float('NaN'), 'Infinity',
	'INF')."
	lower := trimmed @env0:asLowercase.
	(lower @env0:= 'inf') ifTrue: [ ^ PlusInfinity ].
	(lower @env0:= '+inf') ifTrue: [ ^ PlusInfinity ].
	(lower @env0:= '-inf') ifTrue: [ ^ MinusInfinity ].
	(lower @env0:= 'infinity') ifTrue: [ ^ PlusInfinity ].
	(lower @env0:= '+infinity') ifTrue: [ ^ PlusInfinity ].
	(lower @env0:= '-infinity') ifTrue: [ ^ MinusInfinity ].
	(lower @env0:= 'nan') ifTrue: [ ^ PlusQuietNaN ].
	(lower @env0:= '+nan') ifTrue: [ ^ PlusQuietNaN ].
	(lower @env0:= '-nan') ifTrue: [ ^ MinusQuietNaN ].

	"Parse via the vendor number reader ``Number>>fromStream:'' rather than
	``CharacterCollection>>asNumber'': some images load a Squeak-compatibility
	package that overrides asNumber (``^Number readFrom: self readStream'')
	which rejects a leading unary ``+'' (float('+5') must work).  fromStream:
	is what the vendor asNumber itself uses, is not overridden, and accepts
	both ``+'' and ``-''.  ``+inf''/``+nan'' were already handled above."
	^ [ (Number @env0:fromStream: (ReadStreamPortable @env0:on: trimmed)) @env0:asFloat ]
		@env0:on: Error
		do: [:ex | ValueError @env0:signal: ('could not convert string to float: ''' @env0:, str)]
%

category: 'Grail-Class Methods'
classmethod: float
fromhex: hexString
	"Create a float from a hexadecimal string (CPython float.fromhex):
	[sign] ['0x'] hexdigits ['.' hexdigits] ['p' decimalexponent], plus the
	inf/infinity/nan keywords.  All the significant digits are gathered into
	one integer M with a count f of fractional digits; the value is then the
	EXACT rational M * 2**(p - 4f), converted through Fraction/Integer asFloat
	so the final rounding is correct (round-half-even).  A magnitude beyond
	the float range is an OverflowError, matching CPython."

	| str sign lower body expStr binExp pIdx dotIdx intDigits fracDigits digits m shift mag |
	str := hexString @env0:trimBoth.
	sign := 1.
	(str @env0:notEmpty and: [(str @env0:at: 1) == $-])
		ifTrue: [sign := -1. str := str @env0:copyFrom: 2 to: str @env0:size].
	(str @env0:notEmpty and: [(str @env0:at: 1) == $+])
		ifTrue: [str := str @env0:copyFrom: 2 to: str @env0:size].
	lower := str @env0:asLowercase.
	(lower @env0:= 'inf' or: [lower @env0:= 'infinity']) ifTrue: [
		^ sign @env0:> 0 ifTrue: [PlusInfinity] ifFalse: [MinusInfinity]].
	lower @env0:= 'nan' ifTrue: [^ PlusQuietNaN].
	"drop the 0x/0X prefix"
	((lower @env0:size @env0:>= 2) and: [(lower @env0:copyFrom: 1 to: 2) @env0:= '0x'])
		ifTrue: [str := str @env0:copyFrom: 3 to: str @env0:size].
	"peel off the binary (decimal) exponent after p/P"
	pIdx := (str @env0:asLowercase) @env0:indexOf: $p.
	pIdx @env0:> 0
		ifTrue: [
			expStr := str @env0:copyFrom: pIdx @env0:+ 1 to: str @env0:size.
			binExp := self ___parseDecInt___: expStr.
			body := str @env0:copyFrom: 1 to: pIdx @env0:- 1]
		ifFalse: [binExp := 0. body := str].
	"split the mantissa on the radix point"
	dotIdx := body @env0:indexOf: $..
	dotIdx @env0:> 0
		ifTrue: [
			intDigits := body @env0:copyFrom: 1 to: dotIdx @env0:- 1.
			fracDigits := body @env0:copyFrom: dotIdx @env0:+ 1 to: body @env0:size]
		ifFalse: [intDigits := body. fracDigits := ''].
	digits := intDigits @env0:, fracDigits.
	digits @env0:isEmpty ifTrue: [
		ValueError ___signal___: 'invalid hexadecimal floating-point string'].
	m := self ___parseHexInt___: digits.
	m @env0:= 0 ifTrue: [^ sign @env0:> 0 ifTrue: [0.0] ifFalse: [0.0 @env0:negated]].
	shift := binExp @env0:- (4 @env0:* fracDigits @env0:size).
	mag := shift @env0:>= 0
		ifTrue: [(m @env0:* (2 @env0:raisedTo: shift)) @env0:asFloat]
		ifFalse: [(m @env0:/ (2 @env0:raisedTo: shift @env0:negated)) @env0:asFloat].
	((mag @env0:_getKind) == 3) ifTrue: [
		OverflowError ___signal___: 'hexadecimal value too large to represent as a float'].
	^ sign @env0:> 0 ifTrue: [mag] ifFalse: [mag @env0:negated]
%

category: 'Grail-Type Conversion'
classmethod: float
___parseDecInt___: s
	"Parse a signed decimal integer (the p-exponent of a hex float)."

	| str sign n |
	str := s @env0:trimBoth.
	sign := 1.
	(str @env0:notEmpty and: [(str @env0:at: 1) == $-])
		ifTrue: [sign := -1. str := str @env0:copyFrom: 2 to: str @env0:size].
	(str @env0:notEmpty and: [(str @env0:at: 1) == $+])
		ifTrue: [str := str @env0:copyFrom: 2 to: str @env0:size].
	str @env0:isEmpty ifTrue: [
		ValueError ___signal___: 'invalid hexadecimal floating-point string'].
	n := 0.
	str @env0:do: [:ch |
		((ch @env0:>= $0) and: [ch @env0:<= $9]) ifFalse: [
			ValueError ___signal___: 'invalid hexadecimal floating-point string'].
		n := (n @env0:* 10) @env0:+ (ch @env0:asInteger @env0:- $0 @env0:asInteger)].
	^ n @env0:* sign
%

category: 'Grail-Type Conversion'
classmethod: float
___parseHexInt___: s
	"Parse a run of hexadecimal digits into an integer (the combined
	integer+fraction significand of a hex float).  Character>>digitValue
	returns nil for lowercase hex letters, so decode by range instead."

	| n |
	n := 0.
	s @env0:asUppercase @env0:do: [:ch |
		| d |
		((ch @env0:>= $0) and: [ch @env0:<= $9])
			ifTrue: [d := ch @env0:asInteger @env0:- $0 @env0:asInteger]
			ifFalse: [
				((ch @env0:>= $A) and: [ch @env0:<= $F])
					ifTrue: [d := (ch @env0:asInteger @env0:- $A @env0:asInteger) @env0:+ 10]
					ifFalse: [ValueError ___signal___: 'invalid hexadecimal floating-point string']].
		n := (n @env0:* 16) @env0:+ d].
	^ n
%

category: 'Grail-Arithmetic'
method: float
__abs__
	"Return absolute value."

	^ self @env0:abs
%

category: 'Grail-Type'
method: float
__class__
	"Python ``type(x)'' is ``float'' for every float.  GemStone's concrete
	representations (immediate SmallDouble, heap Float) are an
	implementation detail; without this override ``type(5.0)'' answers
	SmallDouble and ``type(5.0) is float'' — and test_math test_prod's
	``type(prod([1, 2.0, ...])) == float'' — are False.  Mirrors
	int>>__class__ (SmallInteger/LargeInteger → int)."

	^ float
%

category: 'Grail-String Representation'
method: float
__format__: formatSpec
	"Format the float per the full format-spec mini-language
	(f/F/e/E/g/G/% types, precision, sign, width, grouping) — see the
	shared engine in builtins ___formatValue___:spec:.  Previously
	float had NO __format__, so ``'{:.2f}'.format(x)`` died in the
	DNU path with an uncatchable MessageNotUnderstood."

	(formatSpec @env0:isNil or: [formatSpec @env0:isEmpty]) ifTrue: [^ self __str__].
	^ (builtins instance) ___formatValue___: self spec: formatSpec
%

category: 'Grail-Arithmetic'
method: float
__add__: other
	"Add two floats or float and other number."

	(other isKindOf: Number) ifTrue: [^ self @env0:+ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:+ (other __index__)].
	^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'
%

category: 'Grail-Conversion'
method: float
__bool__
	"Return True if float is non-zero."

	^ (self @env0:~= 0.0)
%

category: 'Grail-Rounding'
method: float
__ceil__
	"Return ceiling (smallest integer >= self)."

	^ self @env0:ceiling
%

category: 'Grail-Arithmetic'
method: float
__divmod__: other
	"Return (quotient, remainder) as a tuple."

	| quot rem |
	quot := self @env0:// other.
	rem := self @env0:\\ other.
	^ tuple @env0:with: quot with: rem
%

category: 'Grail-Documentation'
method: float
__doc__
	"Return documentation string for float type."

	^ 'Convert a string or number to a floating-point number, if possible.' @env0:asUnicodeString
%

category: 'Grail-Comparison'
method: float
__eq__: other
	"Equality comparison.  complex first: kernel env-0 = would try
	GemStone Number coercion and send #_getKind to complex (DNU).  For a
	Python object carrying its OWN __eq__ (Fraction/Decimal/user Rational),
	mirror CPython's reflected == and defer to it -- kernel = cannot compare
	a Float to such a PythonInstance and just answers false, so
	0.40625 == Fraction(13, 32) was wrongly False.  A plain object with only
	the inherited identity __eq__ keeps the kernel = (identity) answer."

	| refOwner |
	(other isKindOf: complex) ifTrue: [^ other __eq__: self].
	(other isKindOf: PythonInstance) ifTrue: [
		refOwner := other @env0:class @env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			^ other @env0:perform: #'__eq__:' env: 1 withArguments: { self }]].
	^ self @env0:= other
%

category: 'Grail-Conversion'
method: float
__float__
	"Return self (already a float)."

	^ self
%

category: 'Grail-Rounding'
method: float
__floor__
	"Return floor (largest integer <= self)."

	^ self @env0:floor
%

category: 'Grail-Arithmetic'
method: float
__floordiv__: other
	"Floor division."

	(other isKindOf: Number) ifTrue: [^ self @env0:// other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:// (other __index__)].
	^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'
%

category: 'Grail-Comparison'
method: float
__ge__: other
	"Greater than or equal comparison."

	(other isKindOf: Number) ifTrue: [^ self @env0:>= other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:>= (other __index__)
	].
	^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'
%

category: 'Grail-Comparison'
method: float
__gt__: other
	"Greater than comparison."

	(other isKindOf: Number) ifTrue: [^ self @env0:> other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:> (other __index__)
	].
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'
%

category: 'Grail-Conversion'
method: float
__int__
	"Convert float to int by truncating."

	^ self @env0:truncated
%

category: 'Grail-Comparison'
method: float
__le__: other
	"Less than or equal comparison."

	(other isKindOf: Number) ifTrue: [^ self @env0:<= other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:<= (other __index__)
	].
	^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'
%

category: 'Grail-Comparison'
method: float
__lt__: other
	"Less than comparison."

	(other isKindOf: Number) ifTrue: [^ self @env0:< other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:< (other __index__)
	].
	^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'
%

category: 'Grail-Arithmetic'
method: float
__mod__: other
	"Modulo operation."

	(other isKindOf: Number) ifTrue: [^ self @env0:\\ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:\\ (other __index__)].
	^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'
%

category: 'Grail-Arithmetic'
method: float
__mul__: other
	"Multiply two floats or float and other number."

	(other isKindOf: Number) ifTrue: [^ self @env0:* other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:* (other __index__)].
	^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'
%

category: 'Grail-Comparison'
method: float
__ne__: other
	"Not equal comparison."

	^ self @env0:~= other
%

category: 'Grail-Arithmetic'
method: float
__neg__
	"Negate the float."

	^ self @env0:negated
%

category: 'Grail-Arithmetic'
method: float
__pos__
	"Unary plus (return self)."

	^ self
%

category: 'Grail-Arithmetic'
method: float
__pow__: other
	"Raise self to the power of other."

	(other isKindOf: Number) ifTrue: [^ self @env0:raisedTo: other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:raisedTo: (other __index__)].
	^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:'
%

category: 'Grail-Arithmetic'
method: float
__pow__: other _: modulo
	"Raise self to the power of other, modulo modulo.
	Not supported for floats."

	TypeError @env0:signal: 'pow() 3rd argument not allowed for float'
%

category: 'Grail-String Representation'
method: float
__repr__
	"Return the official string representation of the float.  Non-finite
	values use CPython's spellings (inf / -inf / nan), not GemStone's
	PlusInfinity / MinusInfinity / *QuietNaN; -0.0 keeps its sign."

	| str |
	str := self @env0:printString.
	(str @env0:endsWith: 'NaN') ifTrue: [ ^ 'nan' @env0:asUnicodeString ].
	(str @env0:= 'PlusInfinity') ifTrue: [ ^ 'inf' @env0:asUnicodeString ].
	(str @env0:= 'MinusInfinity') ifTrue: [ ^ '-inf' @env0:asUnicodeString ].
	((self @env0:= 0.0) @env0:and: [ (self @env0:signBit) == 1 ])
		ifTrue: [ ^ '-0.0' @env0:asUnicodeString ].
	^ str @env0:asUnicodeString
%

category: 'Grail-Rounding'
method: float
__round__
	"Round to nearest integer."

	^ self @env0:rounded
%

category: 'Grail-Rounding'
method: float
__round__: ndigits
	"Round to n digits after decimal point."

	| multiplier |
	ndigits ifNil: [ ^ self __round__ ].

	"If ndigits is 0, return integer"
	(ndigits @env0:= 0) ifTrue: [
		^ self @env0:rounded
	].

	"Round to n decimal places"
	multiplier := 10 @env0:raisedTo: ndigits.
	^ ((self @env0:* multiplier) @env0:rounded)
		@env0:/ multiplier
%

category: 'Grail-String Representation'
method: float
__str__
	"Return the informal string representation of the float.  CPython
	spellings for non-finite (inf / -inf / nan) and signed zero."

	| str x y |
	str := self @env0:printString.
	(str @env0:endsWith: 'NaN') ifTrue: [ ^ 'nan' @env0:asUnicodeString ].
	(str @env0:= 'PlusInfinity') ifTrue: [ ^ 'inf' @env0:asUnicodeString ].
	(str @env0:= 'MinusInfinity') ifTrue: [ ^ '-inf' @env0:asUnicodeString ].
	"Handle -0.0 specially"
	x := self @env0:= 0.0.
	y := (self @env0:signBit) == 1.
	(x @env0:and: [y]) ifTrue: [
		str := '-0.0'.
	].
	^ str @env0:asUnicodeString
%

category: 'Grail-Arithmetic'
method: float
__sub__: other
	"Subtract other from self."

	(other isKindOf: Number) ifTrue: [^ self @env0:- (other)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:- ((other __index__))].
	^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'
%

category: 'Grail-Arithmetic'
method: float
__truediv__: other
	"True division (always returns float)."

	(other isKindOf: Number) ifTrue: [^ self @env0:/ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:/ (other __index__)].
	^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'
%

category: 'Grail-Rounding'
method: float
__trunc__
	"Truncate to integer."

	^ self @env0:truncated
%

category: 'Grail-Float Methods'
method: float
as_integer_ratio
	"Return (numerator, denominator) pair.  Infinity/NaN have no integer
	ratio: raise the same exceptions CPython does (bug 16469) so
	Fraction(float('inf'))/from_float(nan) surface OverflowError/ValueError
	instead of a bogus ratio."

	| kind frac |
	kind := self @env0:_getKind.
	(kind @env0:> 4) ifTrue: [
		^ ValueError ___signal___: 'cannot convert NaN to integer ratio'].
	(kind @env0:== 3) ifTrue: [
		^ OverflowError ___signal___: 'cannot convert Infinity to integer ratio'].
	frac := self @env0:asFraction.
	^ tuple @env0:with: (frac @env0:numerator) with: (frac @env0:denominator)
%

category: 'Grail-Float Methods'
method: float
conjugate
	"Return the complex conjugate (for float, just return self)."

	^ self
%

category: 'Grail-Float Methods'
method: float
hex
	"CPython float.hex(): [-]0x1.{13 hex digits}p{signed exp} for a normal,
	[-]0x0.{13 hex digits}p-1022 for a subnormal, plus the inf/nan keywords
	and a signed 0x0.0...0p+0 for zero.  The significand is recovered from the
	EXACT binary Fraction (frexp is unusable: GemStone's Float>>exponent pins
	subnormals at -1022), normalised into [1, 2) to read the leading digit."

	| kind neg ax fr mant e leadDigit expVal frac52 hexDigits sign |
	kind := self @env0:_getKind.
	(kind @env0:> 4) ifTrue: [^ 'nan' @env0:asUnicodeString].
	(kind == 3) ifTrue: [
		^ ((self @env0:< 0) ifTrue: ['-inf'] ifFalse: ['inf']) @env0:asUnicodeString].
	(self @env0:= 0.0) ifTrue: [
		^ (((1.0 @env0:/ self) @env0:< 0)
			ifTrue: ['-0x0.0000000000000p+0']
			ifFalse: ['0x0.0000000000000p+0']) @env0:asUnicodeString].
	neg := self @env0:< 0.
	ax := self @env0:abs.
	"normalise the exact value into mant in [1, 2), ax = mant * 2**e"
	fr := ax @env0:asFraction.
	e := fr @env0:numerator @env0:highBit @env0:- (fr @env0:denominator @env0:highBit).
	mant := fr @env0:/ (2 @env0:raisedTo: e).
	[mant @env0:>= 2] @env0:whileTrue: [mant := mant @env0:/ 2. e := e @env0:+ 1].
	[mant @env0:< 1] @env0:whileTrue: [mant := mant @env0:* 2. e := e @env0:- 1].
	e @env0:>= -1022
		ifTrue: [
			leadDigit := '1'.
			expVal := e.
			frac52 := ((mant @env0:- 1) @env0:* (2 @env0:raisedTo: 52)) @env0:truncated]
		ifFalse: [
			"subnormal: 0x0.{k}p-1022 where ax = k * 2**-1074"
			leadDigit := '0'.
			expVal := -1022.
			frac52 := (mant @env0:* (2 @env0:raisedTo: (e @env0:+ 1074))) @env0:truncated].
	hexDigits := (frac52 @env0:printStringRadix: 16) @env0:asLowercase.
	[hexDigits @env0:size @env0:< 13] @env0:whileTrue: [hexDigits := '0' @env0:, hexDigits].
	sign := neg ifTrue: ['-'] ifFalse: [''].
	^ (sign @env0:, '0x' @env0:, leadDigit @env0:, '.' @env0:, hexDigits @env0:, 'p'
		@env0:, (expVal @env0:>= 0 ifTrue: ['+'] ifFalse: ['-'])
		@env0:, expVal @env0:abs @env0:printString) @env0:asUnicodeString
%

category: 'Grail-Properties'
method: float
imag
	"Return the imaginary part (for float, always 0.0)."

	^ 0.0
%

category: 'Grail-Float Methods'
method: float
is_integer
	"Return True if float value is an integer."

	^ self @env0:= ((self @env0:truncated) @env0:asFloat)
%

category: 'Grail-Properties'
method: float
real
	"Return the real part (for float, just return self)."

	^ self
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: float
___pythonValueAttrs___
	"real/imag are CPython float properties (value attributes), not
	methods -- see int's hook."

	^ IdentitySet new
		add: #real;
		add: #imag;
		yourself
%
