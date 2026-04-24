! ===============================================================================
! Float Methods (Python 'float' type)
! ===============================================================================
! This file contains method implementations for the Float class when used
! as the Python 'float' type. Float is a concrete class in GemStone representing
! IEEE 754 double-precision floating-point numbers, just like Python's float.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from float
expectvalue /Metaclass3
doit
float removeAllMethods: 1.
float class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Initialization'
classmethod: float
__new__
	"Create a new float instance with default value 0.0.
	In Python: float() or float.__new__(float)"

	^ 0.0
%

category: 'Python-Initialization'
classmethod: float
__new__: obj
	"Create a new float instance from an object.
	In Python: float(obj) or float.__new__(float, obj)"

	| result |
	obj ifNil: [ ^ 0.0 ].

	"If already a float, return it"
	(obj @env0:isKindOf: float) ifTrue: [
		^ obj
	].

	"Try to call __float__ on the object if it has one"
	(obj @env0:respondsTo: #__float__) ifTrue: [
		result := obj __float__.
		^ result
	].

	"Try to convert from integer"
	(obj @env0:isKindOf: Integer) ifTrue: [
		^ obj @env0:asFloat
	].

	"Try to convert from string"
	(obj @env0:isKindOf: Unicode7) ifTrue: [
		^ self __new__fromString: obj
	].

	"Otherwise, error"
	TypeError @env0:signal: 'float() argument must be a string or a number'
%

category: 'Python-Initialization'
classmethod: float
__new__fromString: str
	"Helper method to convert string to float, handling special values"

	| trimmed |
	trimmed := str @env0:trimBoth.

	"Handle special string values - use GemStone's class variables"
	(trimmed @env0:= 'inf') ifTrue: [ ^ PlusInfinity ].
	(trimmed @env0:= '+inf') ifTrue: [ ^ PlusInfinity ].
	(trimmed @env0:= '-inf') ifTrue: [ ^ MinusInfinity ].
	(trimmed @env0:= 'infinity') ifTrue: [ ^ PlusInfinity ].
	(trimmed @env0:= '+infinity') ifTrue: [ ^ PlusInfinity ].
	(trimmed @env0:= '-infinity') ifTrue: [ ^ MinusInfinity ].
	(trimmed @env0:= 'nan') ifTrue: [ ^ PlusQuietNaN ].
	(trimmed @env0:= '+nan') ifTrue: [ ^ PlusQuietNaN ].
	(trimmed @env0:= '-nan') ifTrue: [ ^ MinusQuietNaN ].

	"Try to parse as number"
	^ [ (trimmed @env0:asNumber) @env0:asFloat ]
		@env0:on: Error
		do: [:ex | ValueError @env0:signal: ('could not convert string to float: ''' @env0:, str)]
%

category: 'Python-Class Methods'
classmethod: float
fromhex: hexString
	"Create a floating-point number from a hexadecimal string.
	Format: [sign] ['0x'] integer ['.' fraction] ['p' exponent]"

	| str sign val exponent hasP parts intPart fracPart |
	str := hexString @env0:trimBoth.

	"Handle sign"
	sign := 1.
	((str @env0:at: 1) @env0:= $-) ifTrue: [
		sign := -1.
		str := str @env0:copyFrom: 2 to: str @env0:size.
	].
	((str @env0:at: 1) @env0:= $+) ifTrue: [
		str := str @env0:copyFrom: 2 to: str @env0:size.
	].

	"Remove 0x or 0X prefix if present"
	((str @env0:size) @env0:>= 2) ifTrue: [
		(((str @env0:copyFrom: 1 to: 2) @env0:asLowercase) @env0:= '0x') ifTrue: [
			str := str @env0:copyFrom: 3 to: str @env0:size.
		].
	].

	"Split on 'p' or 'P' for exponent"
	hasP := (str @env0:includesString: 'p') or: [
		str @env0:includesString: 'P'
	].

	hasP ifTrue: [
		"Implementation simplified - full hex float parsing is complex"
		NotImplementedError @env0:signal: 'fromhex with exponent not fully implemented'
	].

	"Parse hex value (simplified)"
	val := (str @env0:asNumber) @env0:asFloat.
	^ (val @env0:* sign) @env0:asFloat
%

category: 'Python-Arithmetic'
method: float
__abs__
	"Return absolute value."

	^ self @env0:abs
%

category: 'Python-Arithmetic'
method: float
__add__: other
	"Add two floats or float and other number."

	^ self @env0:+ other
%

category: 'Python-Conversion'
method: float
__bool__
	"Return True if float is non-zero."

	^ (self @env0:~= 0.0)
%

category: 'Python-Rounding'
method: float
__ceil__
	"Return ceiling (smallest integer >= self)."

	^ self @env0:ceiling
%

category: 'Python-Arithmetic'
method: float
__divmod__: other
	"Return (quotient, remainder) as a tuple."

	| quot rem |
	quot := self @env0:// other.
	rem := self @env0:\\ other.
	^ tuple @env0:with: quot with: rem
%

category: 'Python-Documentation'
method: float
__doc__
	"Return documentation string for float type."

	^ 'Convert a string or number to a floating-point number, if possible.' @env0:asUnicodeString
%

category: 'Python-Comparison'
method: float
__eq__: other
	"Equality comparison."

	^ self @env0:= other
%

category: 'Python-Conversion'
method: float
__float__
	"Return self (already a float)."

	^ self
%

category: 'Python-Rounding'
method: float
__floor__
	"Return floor (largest integer <= self)."

	^ self @env0:floor
%

category: 'Python-Arithmetic'
method: float
__floordiv__: other
	"Floor division."

	^ self @env0:// other
%

category: 'Python-Comparison'
method: float
__ge__: other
	"Greater than or equal comparison."

	^ self @env0:>= other
%

category: 'Python-Comparison'
method: float
__gt__: other
	"Greater than comparison."

	^ self @env0:> other
%

category: 'Python-Conversion'
method: float
__int__
	"Convert float to int by truncating."

	^ self @env0:truncated
%

category: 'Python-Comparison'
method: float
__le__: other
	"Less than or equal comparison."

	^ self @env0:<= other
%

category: 'Python-Comparison'
method: float
__lt__: other
	"Less than comparison."

	^ self @env0:< other
%

category: 'Python-Arithmetic'
method: float
__mod__: other
	"Modulo operation."

	^ self @env0:\\ other
%

category: 'Python-Arithmetic'
method: float
__mul__: other
	"Multiply two floats or float and other number."

	^ self @env0:* other
%

category: 'Python-Comparison'
method: float
__ne__: other
	"Not equal comparison."

	^ self @env0:~= other
%

category: 'Python-Arithmetic'
method: float
__neg__
	"Negate the float."

	^ self @env0:negated
%

category: 'Python-Arithmetic'
method: float
__pos__
	"Unary plus (return self)."

	^ self
%

category: 'Python-Arithmetic'
method: float
__pow__: other
	"Raise self to the power of other."

	^ self @env0:raisedTo: other
%

category: 'Python-Arithmetic'
method: float
__pow__: other _: modulo
	"Raise self to the power of other, modulo modulo.
	Not supported for floats."

	TypeError @env0:signal: 'pow() 3rd argument not allowed for float'
%

category: 'Python-String Representation'
method: float
__repr__
	"Return the official string representation of the float."

	| str |
	str := self @env0:printString.
	^ str @env0:asUnicodeString
%

category: 'Python-Rounding'
method: float
__round__
	"Round to nearest integer."

	^ self @env0:rounded
%

category: 'Python-Rounding'
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

category: 'Python-String Representation'
method: float
__str__
	"Return the informal string representation of the float."

	| str x y |
	str := self @env0:printString.
	"Handle -0.0 specially"
	x := self @env0:= 0.0.
	y := (self @env0:signBit) == 1.
	(x @env0:and: [y]) ifTrue: [
		str := '-0.0'.
	].
	^ str @env0:asUnicodeString
%

category: 'Python-Arithmetic'
method: float
__sub__: other
	"Subtract other from self."

	^ self @env0:- (other)
%

category: 'Python-Arithmetic'
method: float
__truediv__: other
	"True division (always returns float)."

	^ self @env0:/ other
%

category: 'Python-Rounding'
method: float
__trunc__
	"Truncate to integer."

	^ self @env0:truncated
%

category: 'Python-Float Methods'
method: float
as_integer_ratio
	"Return (numerator, denominator) pair."

	| frac |
	frac := self @env0:asFraction.
	^ tuple @env0:with: (frac @env0:numerator) with: (frac @env0:denominator)
%

category: 'Python-Float Methods'
method: float
conjugate
	"Return the complex conjugate (for float, just return self)."

	^ self
%

category: 'Python-Float Methods'
method: float
hex
	"Return hexadecimal representation of float."

	| sign absVal exponent mantissa hexStr kind |
	"Handle special values using _getKind"
	kind := self @env0:_getKind.

	"Check for NaN (kind > 4)"
	(kind @env0:> 4) ifTrue: [
		^ 'nan' @env0:asUnicodeString
	].

	"Check for infinity (kind == 3)"
	(kind @env0:= 3) ifTrue: [
		^ ((self @env0:< 0)
			ifTrue: ['-inf']
			ifFalse: ['inf']) @env0:asUnicodeString
	].

	"Handle zero"
	(self @env0:= 0.0) ifTrue: [
		^ ((self @env0:signBit)
			ifTrue: ['-0x0.0000000000000p+0']
			ifFalse: ['0x0.0000000000000p+0']) @env0:asUnicodeString
	].

	"Simplified hex representation - full implementation would use frexp"
	sign := (self @env0:< 0) ifTrue: ['-'] ifFalse: [''].
	absVal := self @env0:abs.

	"Use GemStone's printString as fallback"
	hexStr := sign @env0:, ('0x' @env0:, (absVal @env0:printString)).
	^ hexStr @env0:asUnicodeString
%

category: 'Python-Properties'
method: float
imag
	"Return the imaginary part (for float, always 0.0)."

	^ 0.0
%

category: 'Python-Float Methods'
method: float
is_integer
	"Return True if float value is an integer."

	^ self @env0:= ((self @env0:truncated) @env0:asFloat)
%

category: 'Python-Properties'
method: float
real
	"Return the real part (for float, just return self)."

	^ self
%

set compile_env: 0
