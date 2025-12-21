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
float removeAllMethods: 2.
float class removeAllMethods: 2.
%

! ------------------- Class methods for float
set compile_env: 2

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
	(obj perform: #isKindOf: env: 0 withArguments: { float }) ifTrue: [
		^ obj
	].

	"Try to call __float__ on the object if it has one"
	(obj perform: #respondsTo: env: 0 withArguments: { #__float__ }) ifTrue: [
		result := obj __float__.
		^ result
	].

	"Try to convert from integer"
	(obj perform: #isKindOf: env: 0 withArguments: { Integer }) ifTrue: [
		^ obj perform: #asFloat env: 0
	].

	"Try to convert from string"
	(obj perform: #isKindOf: env: 0 withArguments: { Unicode7 }) ifTrue: [
		^ self __new__fromString: obj
	].

	"Otherwise, error"
	self perform: #error: env: 0 withArguments: {'TypeError: float() argument must be a string or a number'}
%

category: 'Python-Initialization'
classmethod: float
__new__fromString: str
	"Helper method to convert string to float, handling special values"

	| trimmed |
	trimmed := str perform: #trimBoth env: 0.

	"Handle special string values - use GemStone's class variables"
	(trimmed perform: #= env: 0 withArguments: {'inf'}) ifTrue: [ ^ PlusInfinity ].
	(trimmed perform: #= env: 0 withArguments: {'+inf'}) ifTrue: [ ^ PlusInfinity ].
	(trimmed perform: #= env: 0 withArguments: {'-inf'}) ifTrue: [ ^ MinusInfinity ].
	(trimmed perform: #= env: 0 withArguments: {'infinity'}) ifTrue: [ ^ PlusInfinity ].
	(trimmed perform: #= env: 0 withArguments: {'+infinity'}) ifTrue: [ ^ PlusInfinity ].
	(trimmed perform: #= env: 0 withArguments: {'-infinity'}) ifTrue: [ ^ MinusInfinity ].
	(trimmed perform: #= env: 0 withArguments: {'nan'}) ifTrue: [ ^ PlusQuietNaN ].
	(trimmed perform: #= env: 0 withArguments: {'+nan'}) ifTrue: [ ^ PlusQuietNaN ].
	(trimmed perform: #= env: 0 withArguments: {'-nan'}) ifTrue: [ ^ MinusQuietNaN ].

	"Try to parse as number"
	^ ([:block :handler |
		block perform: #on:do: env: 0 withArguments: { Error. handler }
	] value: [
		(trimmed perform: #asNumber env: 0) perform: #asFloat env: 0
	] value: [:ex |
		self perform: #error: env: 0 withArguments: {'ValueError: could not convert string to float: ''' perform: #, env: 0 withArguments: {str}}
	])
%

category: 'Python-Class Methods'
classmethod: float
fromhex: hexString
	"Create a floating-point number from a hexadecimal string.
	Format: [sign] ['0x'] integer ['.' fraction] ['p' exponent]"

	| str sign val exponent hasP parts intPart fracPart |
	str := hexString perform: #trimBoth env: 0.

	"Handle sign"
	sign := 1.
	((str perform: #at: env: 0 withArguments: {1}) perform: #= env: 0 withArguments: {$-}) ifTrue: [
		sign := -1.
		str := str perform: #copyFrom:to: env: 0 withArguments: {2. (str perform: #size env: 0)}.
	].
	((str perform: #at: env: 0 withArguments: {1}) perform: #= env: 0 withArguments: {$+}) ifTrue: [
		str := str perform: #copyFrom:to: env: 0 withArguments: {2. (str perform: #size env: 0)}.
	].

	"Remove 0x or 0X prefix if present"
	((str perform: #size env: 0) perform: #>= env: 0 withArguments: {2}) ifTrue: [
		(((str perform: #copyFrom:to: env: 0 withArguments: {1. 2}) perform: #asLowercase env: 0) perform: #= env: 0 withArguments: {'0x'}) ifTrue: [
			str := str perform: #copyFrom:to: env: 0 withArguments: {3. (str perform: #size env: 0)}.
		].
	].

	"Split on 'p' or 'P' for exponent"
	hasP := (str perform: #includesString: env: 0 withArguments: {'p'}) or: [
		str perform: #includesString: env: 0 withArguments: {'P'}
	].

	hasP ifTrue: [
		"Implementation simplified - full hex float parsing is complex"
		self perform: #error: env: 0 withArguments: {'NotImplementedError: fromhex with exponent not fully implemented'}
	].

	"Parse hex value (simplified)"
	val := (str perform: #asNumber env: 0) perform: #asFloat env: 0.
	^ (val perform: #* env: 0 withArguments: {sign}) perform: #asFloat env: 0
%

! ------------------- Instance methods for float

category: 'Python-String Representation'
method: float
__repr__
	"Return the official string representation of the float."

	| str |
	str := self perform: #printString env: 0.
	^ str perform: #asUnicodeString env: 0
%

category: 'Python-String Representation'
method: float
__str__
	"Return the informal string representation of the float."

	| str x y |
	str := self perform: #printString env: 0.
	"Handle -0.0 specially"
	x := self perform: #= env: 0 withArguments: {0.0}.
	y := (self perform: #signBit env: 0) == 1.
	(x perform: #and: env: 0 withArguments: {[y]}) ifTrue: [
		str := '-0.0'.
	].
	^ str perform: #asUnicodeString env: 0
%

category: 'Python-Conversion'
method: float
__int__
	"Convert float to int by truncating."

	^ self perform: #truncated env: 0
%

category: 'Python-Conversion'
method: float
__float__
	"Return self (already a float)."

	^ self
%

category: 'Python-Conversion'
method: float
__bool__
	"Return True if float is non-zero."

	^ (self perform: #~= env: 0 withArguments: {0.0})
%

category: 'Python-Arithmetic'
method: float
__add__: other
	"Add two floats or float and other number."

	^ self perform: #+ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__sub__: other
	"Subtract other from self."

	^ self perform: #- env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__mul__: other
	"Multiply two floats or float and other number."

	^ self perform: #* env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__truediv__: other
	"True division (always returns float)."

	^ self perform: #/ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__floordiv__: other
	"Floor division."

	^ self perform: #// env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__mod__: other
	"Modulo operation."

	^ self perform: #\\ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__divmod__: other
	"Return (quotient, remainder) as array."

	| quot rem |
	quot := self perform: #// env: 0 withArguments: {other}.
	rem := self perform: #\\ env: 0 withArguments: {other}.
	^ Array perform: #with:with: env: 0 withArguments: {quot. rem}
%

category: 'Python-Arithmetic'
method: float
__pow__: other
	"Raise self to the power of other."

	^ self perform: #raisedTo: env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: float
__pow__: other _: modulo
	"Raise self to the power of other, modulo modulo.
	Not supported for floats."

	self perform: #error: env: 0 withArguments: {'TypeError: pow() 3rd argument not allowed for float'}
%

category: 'Python-Arithmetic'
method: float
__neg__
	"Negate the float."

	^ self perform: #negated env: 0
%

category: 'Python-Arithmetic'
method: float
__pos__
	"Unary plus (return self)."

	^ self
%

category: 'Python-Arithmetic'
method: float
__abs__
	"Return absolute value."

	^ self perform: #abs env: 0
%

category: 'Python-Comparison'
method: float
__lt__: other
	"Less than comparison."

	^ self perform: #< env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: float
__le__: other
	"Less than or equal comparison."

	^ self perform: #<= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: float
__gt__: other
	"Greater than comparison."

	^ self perform: #> env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: float
__ge__: other
	"Greater than or equal comparison."

	^ self perform: #>= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: float
__eq__: other
	"Equality comparison."

	^ self perform: #= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: float
__ne__: other
	"Not equal comparison."

	^ self perform: #~= env: 0 withArguments: {other}
%

category: 'Python-Rounding'
method: float
__round__
	"Round to nearest integer."

	^ self perform: #rounded env: 0
%

category: 'Python-Rounding'
method: float
__round__: ndigits
	"Round to n digits after decimal point."

	| multiplier |
	ndigits ifNil: [ ^ self __round__ ].

	"If ndigits is 0, return integer"
	(ndigits perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ self perform: #rounded env: 0
	].

	"Round to n decimal places"
	multiplier := 10 perform: #raisedTo: env: 0 withArguments: {ndigits}.
	^ ((self perform: #* env: 0 withArguments: {multiplier}) perform: #rounded env: 0)
		perform: #/ env: 0 withArguments: {multiplier}
%

category: 'Python-Rounding'
method: float
__trunc__
	"Truncate to integer."

	^ self perform: #truncated env: 0
%

category: 'Python-Rounding'
method: float
__floor__
	"Return floor (largest integer <= self)."

	^ self perform: #floor env: 0
%

category: 'Python-Rounding'
method: float
__ceil__
	"Return ceiling (smallest integer >= self)."

	^ self perform: #ceiling env: 0
%

category: 'Python-Float Methods'
method: float
as_integer_ratio
	"Return (numerator, denominator) pair."

	| frac |
	frac := self perform: #asFraction env: 0.
	^ Array perform: #with:with: env: 0 withArguments: {
		(frac perform: #numerator env: 0).
		(frac perform: #denominator env: 0)
	}
%

category: 'Python-Float Methods'
method: float
is_integer
	"Return True if float value is an integer."

	^ self perform: #= env: 0 withArguments: {(self perform: #truncated env: 0) perform: #asFloat env: 0}
%

category: 'Python-Float Methods'
method: float
hex
	"Return hexadecimal representation of float."

	| sign absVal exponent mantissa hexStr kind |
	"Handle special values using _getKind"
	kind := self perform: #_getKind env: 0.

	"Check for NaN (kind > 4)"
	(kind perform: #> env: 0 withArguments: {4}) ifTrue: [
		^ 'nan' perform: #asUnicodeString env: 0
	].

	"Check for infinity (kind == 3)"
	(kind perform: #= env: 0 withArguments: {3}) ifTrue: [
		^ ((self perform: #< env: 0 withArguments: {0})
			ifTrue: ['-inf']
			ifFalse: ['inf']) perform: #asUnicodeString env: 0
	].

	"Handle zero"
	(self perform: #= env: 0 withArguments: {0.0}) ifTrue: [
		^ ((self perform: #signBit env: 0)
			ifTrue: ['-0x0.0000000000000p+0']
			ifFalse: ['0x0.0000000000000p+0']) perform: #asUnicodeString env: 0
	].

	"Simplified hex representation - full implementation would use frexp"
	sign := (self perform: #< env: 0 withArguments: {0}) ifTrue: ['-'] ifFalse: [''].
	absVal := self perform: #abs env: 0.

	"Use GemStone's printString as fallback"
	hexStr := sign perform: #, env: 0 withArguments: {'0x' perform: #, env: 0 withArguments: {(absVal perform: #printString env: 0)}}.
	^ hexStr perform: #asUnicodeString env: 0
%

category: 'Python-Float Methods'
method: float
conjugate
	"Return the complex conjugate (for float, just return self)."

	^ self
%

category: 'Python-Properties'
method: float
real
	"Return the real part (for float, just return self)."

	^ self
%

category: 'Python-Properties'
method: float
imag
	"Return the imaginary part (for float, always 0.0)."

	^ 0.0
%

category: 'Python-Documentation'
method: float
__doc__
	"Return documentation string for float type."

	^ 'Convert a string or number to a floating-point number, if possible.' perform: #asUnicodeString env: 0
%

! ------------------- Reset compile environment
set compile_env: 0


