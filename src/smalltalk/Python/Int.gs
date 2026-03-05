! ===============================================================================
! Integer Methods (Python 'int' type)
! ===============================================================================
! This file contains method implementations for the Integer class when used
! as the Python 'int' type. Integer is an abstract class in GemStone with
! concrete subclasses SmallInteger and LargeInteger, providing arbitrary
! precision arithmetic just like Python's int.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from int
expectvalue /Metaclass3
doit
int removeAllMethods: 1.
int class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Initialization'
classmethod: int
__new__
	"Create a new int instance with default value 0.
	In Python: int() or int.__new__(int)"

	^ 0
%

category: 'Python-Initialization'
classmethod: int
__new__: obj
	"Create a new int instance from an object.
	In Python: int(obj) or int.__new__(int, obj)"

	| result |
	obj ifNil: [ ^ 0 ].

	"If already an int, return it"
	(obj ___isKindOf___: int) ifTrue: [
		^ obj
	].

	"Try to call __int__ on the object if it has one"
	(obj ___respondsTo___: #__int__) ifTrue: [
		result := obj __int__.
		^ result
	].

	"Try to convert from float"
	(obj ___isKindOf___: Float) ifTrue: [
		^ obj ___truncated___
	].

	"Try to convert from string"
	(obj ___isKindOf___: Unicode7) ifTrue: [
		^ ([:block :handler |
			block ___on___: Error do: handler
		] value: [
			(obj perform: #asNumber env: 0) ___truncated___
		] value: [:ex |
			self ___error___: 'ValueError: invalid literal for int()'
		])
	].

	"Otherwise, error"
	self ___error___: 'TypeError: int() argument must be a string or a number'
%

category: 'Python-Initialization'
classmethod: int
__new__: obj _: base
	"Create a new int instance from a string with a given base.
	In Python: int(obj, base)"

	| str baseInt |
	"base must be an integer"
	(base ___isKindOf___: int) ifFalse: [
		self ___error___: 'TypeError: int() base must be an integer'
	].

	baseInt := base.

	"base must be 0 or 2-36"
	((baseInt ___eq___: 0) not and: [
		(baseInt ___lt___: 2) or: [
			baseInt ___gt___: 36
		]
	]) ifTrue: [
		self ___error___: 'ValueError: int() base must be >= 2 and <= 36, or 0'
	].

	"obj must be a string"
	(obj ___isKindOf___: Unicode7) ifFalse: [
		self ___error___: 'TypeError: int() can''t convert non-string with explicit base'
	].

	str := obj perform: #trimBoth env: 0.

	"Parse the string with the given base"
	^ ([:block :handler |
		block ___on___: Error do: handler
	] value: [
		baseInt ___eq___: 0
			ifTrue: [
				"Base 0: auto-detect from prefix"
				(str perform: #asNumber env: 0) ___truncated___
			]
			ifFalse: [
				"Specific base"
				int perform: #fromString:radix: env: 0 withArguments: { str. baseInt }
			]
	] value: [:ex |
		| msg |
		msg := ('ValueError: invalid literal for int() with base ' ___concat___: (baseInt ___printString___)).
		self ___error___: msg
	])
%

category: 'Python-Class Methods'
classmethod: int
from_bytes: bytes _: byteorder
	"int.from_bytes(bytes, byteorder='big', *, signed=False)"

	^ self from_bytes: bytes byteorder: byteorder signed: false
%

category: 'Python-Class Methods'
classmethod: int
from_bytes: bytes _: byteorder _: signed
	"int.from_bytes(bytes, byteorder='big', *, signed=False)
	Return the integer represented by the given array of bytes."

	| bytesArray result isBigEndian isSigned |
	"Extract bytes - assuming bytes is a Python bytes object or similar"
	bytesArray := bytes.
	(bytesArray ___isKindOf___: tuple) ifFalse: [
		self ___error___: 'TypeError: from_bytes() argument must be bytes-like'
	].

	isBigEndian := (byteorder ___eq___: 'big').
	isSigned := (signed ___eq___: true) or: [signed == true].

	result := 0.
	isBigEndian
		ifTrue: [
			bytesArray ___do___: [:each |
				result := ((result ___bitShift___: 8)
					perform: #bitOr: env: 0 withArguments: {each}).
			].
		]
		ifFalse: [
			| shift |
			shift := 0.
			bytesArray ___do___: [:each |
				result := (result perform: #bitOr: env: 0 withArguments: {(each ___bitShift___: shift)}).
				shift := (shift ___plus___: 8).
			].
		].

	"Handle signed conversion"
	(isSigned and: [(bytesArray ___size___) ___gt___: 0]) ifTrue: [
		| highByte |
		highByte := isBigEndian
			ifTrue: [bytesArray ___first___]
			ifFalse: [bytesArray perform: #last env: 0].
		((highByte ___bitAnd___: 16r80) ___ne___: 0) ifTrue: [
			"Negative number - subtract 2^(numBits)"
			result := (result ___minus___: 
				(1 ___bitShift___: ((bytesArray ___size___) ___times___: 8))
			).
		].
	].

	^ result
%

category: 'Python-Arithmetic'
method: int
__abs__
	"Absolute value."

	^ self ___abs___
%

category: 'Python-Arithmetic'
method: int
__add__: other
	"Add two integers or integer and other number."

	^ self ___plus___: other
%

category: 'Python-Bitwise Operations'
method: int
__and__: other
	"Bitwise AND."

	^ self ___bitAnd___: other
%

category: 'Python-Conversion'
method: int
__bool__
	"Return True if non-zero, False if zero."

	^ self ___ne___: 0
%

category: 'Python-Rounding'
method: int
__ceil__
	"Ceiling (returns self)."

	^ self
%

category: 'Python-Arithmetic'
method: int
__divmod__: other
	"Return (quotient, remainder) tuple."

	| quot rem |
	quot := self ___divideInteger___: other.
	rem := self ___modulo___: other.
	^ tuple ___with___: quot with: rem
%

category: 'Python-Documentation'
method: int
__doc__
	"Return documentation string for int type."

	^ 'int([x]) -> integer
int(x, base=10) -> integer

Convert a number or string to an integer, or return 0 if no arguments
are given.  If x is a number, return x.__int__().  For floating point
numbers, this truncates towards zero.

If x is not a number or if base is given, then x must be a string,
bytes, or bytearray instance representing an integer literal in the
given base.  The literal can be preceded by ''+'' or ''-'' and be surrounded
by whitespace.  The base defaults to 10.  Valid bases are 0 and 2-36.
Base 0 means to interpret the base from the string as an integer literal.
>>> int(''0b100'', base=0)
4' ___asUnicodeString___
%

category: 'Python-Comparison'
method: int
__eq__: other
	"Return self == other"

	^ self ___eq___: other
%

category: 'Python-Conversion'
method: int
__float__
	"Convert to float."

	^ self ___asFloat___
%

category: 'Python-Rounding'
method: int
__floor__
	"Floor (returns self)."

	^ self
%

category: 'Python-Arithmetic'
method: int
__floordiv__: other
	"Floor division."

	^ self ___divideInteger___: other
%

category: 'Python-String Representation'
method: int
__format__: formatSpec
	"Format the integer according to format specification."

	"For now, just return __repr__ - full format spec support is complex"
	^ self __repr__
%

category: 'Python-Comparison'
method: int
__ge__: other
	"Return self >= other"

	^ self ___ge___: other
%

category: 'Python-Comparison'
method: int
__gt__: other
	"Return self > other"

	^ self ___gt___: other
%

category: 'Python-Hashing'
method: int
__hash__
	"Return hash value (self for integers)."

	^ self ___hash___
%

category: 'Python-Conversion'
method: int
__index__
	"Return self (used for indexing)."

	^ self
%

category: 'Python-Initialization'
method: int
__init__
	"Initialize an int instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ nil
%

category: 'Python-Initialization'
method: int
__init__: obj
	"Initialize an int instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ nil
%

category: 'Python-Conversion'
method: int
__int__
	"Return self (already an integer)."

	^ self
%

category: 'Python-Bitwise Operations'
method: int
__invert__
	"Bitwise NOT (one's complement)."

	^ self perform: #bitInvert env: 0
%

category: 'Python-Comparison'
method: int
__le__: other
	"Return self <= other"

	^ self ___le___: other
%

category: 'Python-Bitwise Operations'
method: int
__lshift__: other
	"Left shift."

	^ self ___bitShift___: other
%

category: 'Python-Comparison'
method: int
__lt__: other
	"Return self < other"

	^ self ___lt___: other
%

category: 'Python-Arithmetic'
method: int
__mod__: other
	"Modulo operation."

	^ self ___modulo___: other
%

category: 'Python-Arithmetic'
method: int
__mul__: other
	"Multiply two integers or integer and other number."

	^ self ___times___: other
%

category: 'Python-Comparison'
method: int
__ne__: other
	"Return self != other"

	^ self ___ne___: other
%

category: 'Python-Arithmetic'
method: int
__neg__
	"Unary negation."

	^ self ___negated___
%

category: 'Python-Bitwise Operations'
method: int
__or__: other
	"Bitwise OR."

	^ self perform: #bitOr: env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__pos__
	"Unary plus (return self)."

	^ self
%

category: 'Python-Arithmetic'
method: int
__pow__: other
	"Raise to power."

	^ self ___raisedTo___: other
%

category: 'Python-Arithmetic'
method: int
__pow__: other _: mod
	"Raise to power with modulo."

	| result |
	result := self ___raisedTo___: other.
	mod ifNotNil: [
		result := result ___modulo___: mod.
	].
	^ result
%

category: 'Python-Arithmetic - Reverse'
method: int
__radd__: other
	"Reverse add (other + self)."

	^ other ___plus___: self
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rand__: other
	"Reverse bitwise AND (other & self)."

	^ other ___bitAnd___: self
%

category: 'Python-Arithmetic - Reverse'
method: int
__rdivmod__: other
	"Reverse divmod (divmod(other, self))."

	| quot rem |
	quot := other ___divideInteger___: self.
	rem := other ___modulo___: self.
	^ tuple ___with___: quot with: rem
%

category: 'Python-String Representation'
method: int
__repr__
	"Return string representation of integer."

	^ (self ___printString___) ___asUnicodeString___
%

category: 'Python-Arithmetic - Reverse'
method: int
__rfloordiv__: other
	"Reverse floor division (other // self)."

	^ other ___divideInteger___: self
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rlshift__: other
	"Reverse left shift (other << self)."

	^ other ___bitShift___: self
%

category: 'Python-Arithmetic - Reverse'
method: int
__rmod__: other
	"Reverse modulo (other % self)."

	^ other ___modulo___: self
%

category: 'Python-Arithmetic - Reverse'
method: int
__rmul__: other
	"Reverse multiply (other * self)."

	^ other ___times___: self
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__ror__: other
	"Reverse bitwise OR (other | self)."

	^ other perform: #bitOr: env: 0 withArguments: {self}
%

category: 'Python-Rounding'
method: int
__round__
	"Round to nearest integer (returns self)."

	^ self
%

category: 'Python-Rounding'
method: int
__round__: ndigits
	"Round to n digits."

	ndigits ifNil: [ ^ self ].

	"If ndigits is negative, round to that many places left of decimal"
	(ndigits ___lt___: 0) ifTrue: [
		| divisor |
		divisor := (10 ___raisedTo___: (ndigits ___abs___)).
		^ ((self ___divide___: divisor) ___rounded___)
			___times___: divisor
	].

	"If ndigits is non-negative, just return self"
	^ self
%

category: 'Python-Arithmetic - Reverse'
method: int
__rpow__: other
	"Reverse power (other ** self)."

	^ other ___raisedTo___: self
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rrshift__: other
	"Reverse right shift (other >> self)."

	^ other ___bitShift___: (self ___negated___)
%

category: 'Python-Bitwise Operations'
method: int
__rshift__: other
	"Right shift."

	^ self ___bitShift___: (other ___negated___)
%

category: 'Python-Arithmetic - Reverse'
method: int
__rsub__: other
	"Reverse subtract (other - self)."

	^ other ___minus___: (self)
%

category: 'Python-Arithmetic - Reverse'
method: int
__rtruediv__: other
	"Reverse true division (other / self)."

	^ other ___divide___: self
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rxor__: other
	"Reverse bitwise XOR (other ^ self)."

	^ other perform: #bitXor: env: 0 withArguments: {self}
%

category: 'Python-String Representation'
method: int
__str__
	"Return string representation of integer."

	^ (self ___printString___) ___asUnicodeString___
%

category: 'Python-Arithmetic'
method: int
__sub__: other
	"Subtract other from self."

	^ self ___minus___: (other)
%

category: 'Python-Arithmetic'
method: int
__truediv__: other
	"True division (returns float)."

	^ self ___divide___: other
%

category: 'Python-Rounding'
method: int
__trunc__
	"Truncate to integer (returns self)."

	^ self
%

category: 'Python-Bitwise Operations'
method: int
__xor__: other
	"Bitwise XOR."

	^ self perform: #bitXor: env: 0 withArguments: {other}
%

category: 'Python-Integer Methods'
method: int
as_integer_ratio
	"Return a pair of integers whose ratio is exactly equal to the original int.
	For integers, this is (self, 1)."

	^ tuple ___with___: self with: 1
%

category: 'Python-Integer Methods'
method: int
bit_count
	"Return the number of ones in the binary representation."

	| n count |
	n := self ___abs___.
	count := 0.
	[(n ___gt___: 0)] whileTrue: [
		((n ___bitAnd___: 1) ___eq___: 1) ifTrue: [
			count := (count ___plus___: 1).
		].
		n := n ___bitShift___: -1.
	].
	^ count
%

category: 'Python-Integer Methods'
method: int
bit_length
	"Return the number of bits necessary to represent self in binary."

	| n count |
	n := self ___abs___.
	count := 0.
	[(n ___gt___: 0)] whileTrue: [
		n := n ___bitShift___: -1.
		count := (count ___plus___: 1).
	].
	^ count
%

category: 'Python-Integer Methods'
method: int
conjugate
	"Return the complex conjugate (self for real numbers)."

	^ self
%

category: 'Python-Properties'
method: int
denominator
	"Return the denominator (1)."

	^ 1
%

category: 'Python-Properties'
method: int
imag
	"Return the imaginary part (0)."

	^ 0
%

category: 'Python-Integer Methods'
method: int
is_integer
	"Return True (integers are always integers)."

	^ true
%

category: 'Python-Properties'
method: int
numerator
	"Return the numerator (self)."

	^ self
%

category: 'Python-Properties'
method: int
real
	"Return the real part (self)."

	^ self
%

category: 'Python-Integer Methods'
method: int
to_bytes: length _: byteorder
	"int.to_bytes(length, byteorder='big', *, signed=False)"

	^ self to_bytes: length byteorder: byteorder signed: false
%

category: 'Python-Integer Methods'
method: int
to_bytes: length _: byteorder _: signed
	"int.to_bytes(length, byteorder='big', *, signed=False)
	Return an array of bytes representing an integer."

	| numBytes isBigEndian isSigned val result |
	numBytes := length.
	isBigEndian := (byteorder ___eq___: 'big').
	isSigned := (signed ___eq___: true) or: [signed == true].
	val := self.

	"Handle negative numbers"
	(val ___lt___: 0) ifTrue: [
		isSigned ifFalse: [
			self ___error___: 'OverflowError: can''t convert negative int to unsigned'
		].
		"Two's complement"
		val := ((1 ___bitShift___: (numBytes ___times___: 8))
			___plus___: val).
	].

	"Check if value fits in the given number of bytes"
	((val ___lt___: 0) or: [
		val ___ge___: (1 ___bitShift___: (numBytes ___times___: 8))
	]) ifTrue: [
		self ___error___: 'OverflowError: int too big to convert'
	].

	"Convert to bytes"
	result := tuple ___new___: numBytes.
	1 ___to___: numBytes do: [:i |
		| byteVal idx |
		byteVal := (val ___bitAnd___: 16rFF).
		idx := isBigEndian
			ifTrue: [(numBytes ___minus___: (i ___minus___: 1))]
			ifFalse: [i].
		result ___at___: idx put: byteVal.
		val := val ___bitShift___: -8.
	].

	^ result
%

set compile_env: 0
