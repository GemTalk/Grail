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
	(obj ___isKindOf___: float) ifTrue: [
		^ obj
	].

	"Try to call __float__ on the object if it has one"
	(obj ___respondsTo___: #__float__) ifTrue: [
		result := obj __float__.
		^ result
	].

	"Try to convert from integer"
	(obj ___isKindOf___: Integer) ifTrue: [
		^ obj ___asFloat___
	].

	"Try to convert from string"
	(obj ___isKindOf___: Unicode7) ifTrue: [
		^ self __new__fromString: obj
	].

	"Otherwise, error"
	self ___error___: 'TypeError: float() argument must be a string or a number'
%

category: 'Python-Initialization'
classmethod: float
__new__fromString: str
	"Helper method to convert string to float, handling special values"

	| trimmed |
	trimmed := str @env0:trimBoth.

	"Handle special string values - use GemStone's class variables"
	(trimmed ___eq___: 'inf') ifTrue: [ ^ PlusInfinity ].
	(trimmed ___eq___: '+inf') ifTrue: [ ^ PlusInfinity ].
	(trimmed ___eq___: '-inf') ifTrue: [ ^ MinusInfinity ].
	(trimmed ___eq___: 'infinity') ifTrue: [ ^ PlusInfinity ].
	(trimmed ___eq___: '+infinity') ifTrue: [ ^ PlusInfinity ].
	(trimmed ___eq___: '-infinity') ifTrue: [ ^ MinusInfinity ].
	(trimmed ___eq___: 'nan') ifTrue: [ ^ PlusQuietNaN ].
	(trimmed ___eq___: '+nan') ifTrue: [ ^ PlusQuietNaN ].
	(trimmed ___eq___: '-nan') ifTrue: [ ^ MinusQuietNaN ].

	"Try to parse as number"
	^ ([:block :handler |
		block ___on___: Error do: handler
	] value: [
		(trimmed @env0:asNumber) ___asFloat___
	] value: [:ex |
		self ___error___: ('ValueError: could not convert string to float: ''' ___concat___: str)
	])
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
	((str ___at___: 1) ___eq___: $-) ifTrue: [
		sign := -1.
		str := str ___copyFrom___: 2 to: str ___size___.
	].
	((str ___at___: 1) ___eq___: $+) ifTrue: [
		str := str ___copyFrom___: 2 to: str ___size___.
	].

	"Remove 0x or 0X prefix if present"
	((str ___size___) ___ge___: 2) ifTrue: [
		(((str ___copyFrom___: 1 to: 2) @env0:asLowercase) ___eq___: '0x') ifTrue: [
			str := str ___copyFrom___: 3 to: str ___size___.
		].
	].

	"Split on 'p' or 'P' for exponent"
	hasP := (str @env0:includesString: 'p') or: [
		str @env0:includesString: 'P'
	].

	hasP ifTrue: [
		"Implementation simplified - full hex float parsing is complex"
		self ___error___: 'NotImplementedError: fromhex with exponent not fully implemented'
	].

	"Parse hex value (simplified)"
	val := (str @env0:asNumber) ___asFloat___.
	^ (val ___times___: sign) ___asFloat___
%

category: 'Python-Arithmetic'
method: float
__abs__
	"Return absolute value."

	^ self ___abs___
%

category: 'Python-Arithmetic'
method: float
__add__: other
	"Add two floats or float and other number."

	^ self ___plus___: other
%

category: 'Python-Conversion'
method: float
__bool__
	"Return True if float is non-zero."

	^ (self ___ne___: 0.0)
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
	quot := self ___divideInteger___: other.
	rem := self ___modulo___: other.
	^ tuple ___with___: quot with: rem
%

category: 'Python-Documentation'
method: float
__doc__
	"Return documentation string for float type."

	^ 'Convert a string or number to a floating-point number, if possible.' ___asUnicodeString___
%

category: 'Python-Comparison'
method: float
__eq__: other
	"Equality comparison."

	^ self ___eq___: other
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

	^ self ___divideInteger___: other
%

category: 'Python-Comparison'
method: float
__ge__: other
	"Greater than or equal comparison."

	^ self ___ge___: other
%

category: 'Python-Comparison'
method: float
__gt__: other
	"Greater than comparison."

	^ self ___gt___: other
%

category: 'Python-Conversion'
method: float
__int__
	"Convert float to int by truncating."

	^ self ___truncated___
%

category: 'Python-Comparison'
method: float
__le__: other
	"Less than or equal comparison."

	^ self ___le___: other
%

category: 'Python-Comparison'
method: float
__lt__: other
	"Less than comparison."

	^ self ___lt___: other
%

category: 'Python-Arithmetic'
method: float
__mod__: other
	"Modulo operation."

	^ self ___modulo___: other
%

category: 'Python-Arithmetic'
method: float
__mul__: other
	"Multiply two floats or float and other number."

	^ self ___times___: other
%

category: 'Python-Comparison'
method: float
__ne__: other
	"Not equal comparison."

	^ self ___ne___: other
%

category: 'Python-Arithmetic'
method: float
__neg__
	"Negate the float."

	^ self ___negated___
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

	^ self ___raisedTo___: other
%

category: 'Python-Arithmetic'
method: float
__pow__: other _: modulo
	"Raise self to the power of other, modulo modulo.
	Not supported for floats."

	self ___error___: 'TypeError: pow() 3rd argument not allowed for float'
%

category: 'Python-String Representation'
method: float
__repr__
	"Return the official string representation of the float."

	| str |
	str := self ___printString___.
	^ str ___asUnicodeString___
%

category: 'Python-Rounding'
method: float
__round__
	"Round to nearest integer."

	^ self ___rounded___
%

category: 'Python-Rounding'
method: float
__round__: ndigits
	"Round to n digits after decimal point."

	| multiplier |
	ndigits ifNil: [ ^ self __round__ ].

	"If ndigits is 0, return integer"
	(ndigits ___eq___: 0) ifTrue: [
		^ self ___rounded___
	].

	"Round to n decimal places"
	multiplier := 10 ___raisedTo___: ndigits.
	^ ((self ___times___: multiplier) ___rounded___)
		___divide___: multiplier
%

category: 'Python-String Representation'
method: float
__str__
	"Return the informal string representation of the float."

	| str x y |
	str := self ___printString___.
	"Handle -0.0 specially"
	x := self ___eq___: 0.0.
	y := (self @env0:signBit) == 1.
	(x @env0:and: [y]) ifTrue: [
		str := '-0.0'.
	].
	^ str ___asUnicodeString___
%

category: 'Python-Arithmetic'
method: float
__sub__: other
	"Subtract other from self."

	^ self ___minus___: (other)
%

category: 'Python-Arithmetic'
method: float
__truediv__: other
	"True division (always returns float)."

	^ self ___divide___: other
%

category: 'Python-Rounding'
method: float
__trunc__
	"Truncate to integer."

	^ self ___truncated___
%

category: 'Python-Float Methods'
method: float
as_integer_ratio
	"Return (numerator, denominator) pair."

	| frac |
	frac := self @env0:asFraction.
	^ tuple ___with___: (frac @env0:numerator) with: (frac @env0:denominator)
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
	(kind ___gt___: 4) ifTrue: [
		^ 'nan' ___asUnicodeString___
	].

	"Check for infinity (kind == 3)"
	(kind ___eq___: 3) ifTrue: [
		^ ((self ___lt___: 0)
			ifTrue: ['-inf']
			ifFalse: ['inf']) ___asUnicodeString___
	].

	"Handle zero"
	(self ___eq___: 0.0) ifTrue: [
		^ ((self @env0:signBit)
			ifTrue: ['-0x0.0000000000000p+0']
			ifFalse: ['0x0.0000000000000p+0']) ___asUnicodeString___
	].

	"Simplified hex representation - full implementation would use frexp"
	sign := (self ___lt___: 0) ifTrue: ['-'] ifFalse: [''].
	absVal := self ___abs___.

	"Use GemStone's printString as fallback"
	hexStr := sign ___concat___: ('0x' ___concat___: (absVal ___printString___)).
	^ hexStr ___asUnicodeString___
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

	^ self ___eq___: ((self ___truncated___) ___asFloat___)
%

category: 'Python-Properties'
method: float
real
	"Return the real part (for float, just return self)."

	^ self
%

set compile_env: 0
