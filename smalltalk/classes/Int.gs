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
int removeAllMethods: 2.
int class removeAllMethods: 2.
%

! ------------------- Class methods for int
set compile_env: 2

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
	(obj perform: #isKindOf: env: 0 withArguments: { int }) ifTrue: [
		^ obj
	].

	"Try to call __int__ on the object if it has one"
	(obj perform: #respondsTo: env: 0 withArguments: { #__int__ }) ifTrue: [
		result := obj __int__.
		^ result
	].

	"Try to convert from float"
	(obj perform: #isKindOf: env: 0 withArguments: { Float }) ifTrue: [
		^ obj perform: #truncated env: 0
	].

	"Try to convert from string"
	(obj perform: #isKindOf: env: 0 withArguments: { Unicode7 }) ifTrue: [
		^ ([:block :handler |
			block perform: #on:do: env: 0 withArguments: { Error. handler }
		] value: [
			(obj perform: #asNumber env: 0) perform: #truncated env: 0
		] value: [:ex |
			self perform: #error: env: 0 withArguments: {'ValueError: invalid literal for int()'}
		])
	].

	"Otherwise, error"
	self perform: #error: env: 0 withArguments: {'TypeError: int() argument must be a string or a number'}
%

category: 'Python-Initialization'
classmethod: int
__new__: obj _: base
	"Create a new int instance from a string with a given base.
	In Python: int(obj, base)"

	| str baseInt |
	"base must be an integer"
	(base perform: #isKindOf: env: 0 withArguments: { int }) ifFalse: [
		self perform: #error: env: 0 withArguments: {'TypeError: int() base must be an integer'}
	].

	baseInt := base.

	"base must be 0 or 2-36"
	((baseInt perform: #= env: 0 withArguments: {0}) not and: [
		(baseInt perform: #< env: 0 withArguments: {2}) or: [
			baseInt perform: #> env: 0 withArguments: {36}
		]
	]) ifTrue: [
		self perform: #error: env: 0 withArguments: {'ValueError: int() base must be >= 2 and <= 36, or 0'}
	].

	"obj must be a string"
	(obj perform: #isKindOf: env: 0 withArguments: { Unicode7 }) ifFalse: [
		self perform: #error: env: 0 withArguments: {'TypeError: int() can''t convert non-string with explicit base'}
	].

	str := obj perform: #trimBoth env: 0.

	"Parse the string with the given base"
	^ ([:block :handler |
		block perform: #on:do: env: 0 withArguments: { Error. handler }
	] value: [
		baseInt perform: #= env: 0 withArguments: {0}
			ifTrue: [
				"Base 0: auto-detect from prefix"
				(str perform: #asNumber env: 0) perform: #truncated env: 0
			]
			ifFalse: [
				"Specific base"
				int perform: #fromString:radix: env: 0 withArguments: { str. baseInt }
			]
	] value: [:ex |
		| msg |
		msg := ('ValueError: invalid literal for int() with base ' perform: #, env: 0 withArguments: {baseInt perform: #printString env: 0}).
		self perform: #error: env: 0 withArguments: {msg}
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
	(bytesArray perform: #isKindOf: env: 0 withArguments: { Array }) ifFalse: [
		self perform: #error: env: 0 withArguments: {'TypeError: from_bytes() argument must be bytes-like'}
	].

	isBigEndian := (byteorder perform: #= env: 0 withArguments: {'big'}).
	isSigned := (signed perform: #= env: 0 withArguments: {true}) or: [signed == true].

	result := 0.
	isBigEndian
		ifTrue: [
			bytesArray perform: #do: env: 0 withArguments: { [:each |
				result := ((result perform: #bitShift: env: 0 withArguments: {8})
					perform: #bitOr: env: 0 withArguments: {each}).
			] }.
		]
		ifFalse: [
			| shift |
			shift := 0.
			bytesArray perform: #do: env: 0 withArguments: { [:each |
				result := (result perform: #bitOr: env: 0 withArguments: {(each perform: #bitShift: env: 0 withArguments: {shift})}).
				shift := (shift perform: #+ env: 0 withArguments: {8}).
			] }.
		].

	"Handle signed conversion"
	(isSigned and: [(bytesArray perform: #size env: 0) perform: #> env: 0 withArguments: {0}]) ifTrue: [
		| highByte |
		highByte := isBigEndian
			ifTrue: [bytesArray perform: #first env: 0]
			ifFalse: [bytesArray perform: #last env: 0].
		((highByte perform: #bitAnd: env: 0 withArguments: {16r80}) perform: #~= env: 0 withArguments: {0}) ifTrue: [
			"Negative number - subtract 2^(numBits)"
			result := (result perform: #- env: 0 withArguments: {
				(1 perform: #bitShift: env: 0 withArguments: {((bytesArray perform: #size env: 0) perform: #* env: 0 withArguments: {8})})
			}).
		].
	].

	^ result
%

! ------------------- Instance methods for int
set compile_env: 2

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

category: 'Python-String Representation'
method: int
__repr__
	"Return string representation of integer."

	^ (self perform: #printString env: 0) perform: #asUnicodeString env: 0
%

category: 'Python-String Representation'
method: int
__str__
	"Return string representation of integer."

	^ (self perform: #printString env: 0) perform: #asUnicodeString env: 0
%

category: 'Python-String Representation'
method: int
__format__: formatSpec
	"Format the integer according to format specification."

	"For now, just return __repr__ - full format spec support is complex"
	^ self __repr__
%

category: 'Python-Conversion'
method: int
__int__
	"Return self (already an integer)."

	^ self
%

category: 'Python-Conversion'
method: int
__float__
	"Convert to float."

	^ self perform: #asFloat env: 0
%

category: 'Python-Conversion'
method: int
__bool__
	"Return True if non-zero, False if zero."

	^ self perform: #~= env: 0 withArguments: {0}
%

category: 'Python-Conversion'
method: int
__index__
	"Return self (used for indexing)."

	^ self
%

category: 'Python-Arithmetic'
method: int
__add__: other
	"Add two integers or integer and other number."

	^ self perform: #+ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__sub__: other
	"Subtract other from self."

	^ self perform: #- env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__mul__: other
	"Multiply two integers or integer and other number."

	^ self perform: #* env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__truediv__: other
	"True division (returns float)."

	^ self perform: #/ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__floordiv__: other
	"Floor division."

	^ self perform: #// env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__mod__: other
	"Modulo operation."

	^ self perform: #\\ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__divmod__: other
	"Return (quotient, remainder) tuple."

	| quot rem |
	quot := self perform: #// env: 0 withArguments: {other}.
	rem := self perform: #\\ env: 0 withArguments: {other}.
	^ Array perform: #with:with: env: 0 withArguments: {quot. rem}
%

category: 'Python-Arithmetic'
method: int
__pow__: other
	"Raise to power."

	^ self perform: #raisedTo: env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: int
__pow__: other _: mod
	"Raise to power with modulo."

	| result |
	result := self perform: #raisedTo: env: 0 withArguments: {other}.
	mod ifNotNil: [
		result := result perform: #\\ env: 0 withArguments: {mod}.
	].
	^ result
%

category: 'Python-Arithmetic'
method: int
__neg__
	"Unary negation."

	^ self perform: #negated env: 0
%

category: 'Python-Arithmetic'
method: int
__pos__
	"Unary plus (return self)."

	^ self
%

category: 'Python-Arithmetic'
method: int
__abs__
	"Absolute value."

	^ self perform: #abs env: 0
%

category: 'Python-Arithmetic - Reverse'
method: int
__radd__: other
	"Reverse add (other + self)."

	^ other perform: #+ env: 0 withArguments: {self}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rsub__: other
	"Reverse subtract (other - self)."

	^ other perform: #- env: 0 withArguments: {self}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rmul__: other
	"Reverse multiply (other * self)."

	^ other perform: #* env: 0 withArguments: {self}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rtruediv__: other
	"Reverse true division (other / self)."

	^ other perform: #/ env: 0 withArguments: {self}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rfloordiv__: other
	"Reverse floor division (other // self)."

	^ other perform: #// env: 0 withArguments: {self}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rmod__: other
	"Reverse modulo (other % self)."

	^ other perform: #\\ env: 0 withArguments: {self}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rdivmod__: other
	"Reverse divmod (divmod(other, self))."

	| quot rem |
	quot := other perform: #// env: 0 withArguments: {self}.
	rem := other perform: #\\ env: 0 withArguments: {self}.
	^ Array perform: #with:with: env: 0 withArguments: {quot. rem}
%

category: 'Python-Arithmetic - Reverse'
method: int
__rpow__: other
	"Reverse power (other ** self)."

	^ other perform: #raisedTo: env: 0 withArguments: {self}
%

category: 'Python-Bitwise Operations'
method: int
__and__: other
	"Bitwise AND."

	^ self perform: #bitAnd: env: 0 withArguments: {other}
%

category: 'Python-Bitwise Operations'
method: int
__or__: other
	"Bitwise OR."

	^ self perform: #bitOr: env: 0 withArguments: {other}
%

category: 'Python-Bitwise Operations'
method: int
__xor__: other
	"Bitwise XOR."

	^ self perform: #bitXor: env: 0 withArguments: {other}
%

category: 'Python-Bitwise Operations'
method: int
__invert__
	"Bitwise NOT (one's complement)."

	^ self perform: #bitInvert env: 0
%

category: 'Python-Bitwise Operations'
method: int
__lshift__: other
	"Left shift."

	^ self perform: #bitShift: env: 0 withArguments: {other}
%

category: 'Python-Bitwise Operations'
method: int
__rshift__: other
	"Right shift."

	^ self perform: #bitShift: env: 0 withArguments: {other perform: #negated env: 0}
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rand__: other
	"Reverse bitwise AND (other & self)."

	^ other perform: #bitAnd: env: 0 withArguments: {self}
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__ror__: other
	"Reverse bitwise OR (other | self)."

	^ other perform: #bitOr: env: 0 withArguments: {self}
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rxor__: other
	"Reverse bitwise XOR (other ^ self)."

	^ other perform: #bitXor: env: 0 withArguments: {self}
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rlshift__: other
	"Reverse left shift (other << self)."

	^ other perform: #bitShift: env: 0 withArguments: {self}
%

category: 'Python-Bitwise Operations - Reverse'
method: int
__rrshift__: other
	"Reverse right shift (other >> self)."

	^ other perform: #bitShift: env: 0 withArguments: {self perform: #negated env: 0}
%

category: 'Python-Comparison'
method: int
__lt__: other
	"Return self < other"

	^ self perform: #< env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: int
__le__: other
	"Return self <= other"

	^ self perform: #<= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: int
__gt__: other
	"Return self > other"

	^ self perform: #> env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: int
__ge__: other
	"Return self >= other"

	^ self perform: #>= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: int
__eq__: other
	"Return self == other"

	^ self perform: #= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: int
__ne__: other
	"Return self != other"

	^ self perform: #~= env: 0 withArguments: {other}
%

category: 'Python-Hashing'
method: int
__hash__
	"Return hash value (self for integers)."

	^ self perform: #hash env: 0
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
	(ndigits perform: #< env: 0 withArguments: {0}) ifTrue: [
		| divisor |
		divisor := (10 perform: #raisedTo: env: 0 withArguments: {ndigits perform: #abs env: 0}).
		^ ((self perform: #/ env: 0 withArguments: {divisor}) perform: #rounded env: 0)
			perform: #* env: 0 withArguments: {divisor}
	].

	"If ndigits is non-negative, just return self"
	^ self
%

category: 'Python-Rounding'
method: int
__trunc__
	"Truncate to integer (returns self)."

	^ self
%

category: 'Python-Rounding'
method: int
__floor__
	"Floor (returns self)."

	^ self
%

category: 'Python-Rounding'
method: int
__ceil__
	"Ceiling (returns self)."

	^ self
%

category: 'Python-Integer Methods'
method: int
bit_length
	"Return the number of bits necessary to represent self in binary."

	| n count |
	n := self perform: #abs env: 0.
	count := 0.
	[(n perform: #> env: 0 withArguments: {0})] whileTrue: [
		n := n perform: #bitShift: env: 0 withArguments: {-1}.
		count := (count perform: #+ env: 0 withArguments: {1}).
	].
	^ count
%

category: 'Python-Integer Methods'
method: int
bit_count
	"Return the number of ones in the binary representation."

	| n count |
	n := self perform: #abs env: 0.
	count := 0.
	[(n perform: #> env: 0 withArguments: {0})] whileTrue: [
		((n perform: #bitAnd: env: 0 withArguments: {1}) perform: #= env: 0 withArguments: {1}) ifTrue: [
			count := (count perform: #+ env: 0 withArguments: {1}).
		].
		n := n perform: #bitShift: env: 0 withArguments: {-1}.
	].
	^ count
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
	isBigEndian := (byteorder perform: #= env: 0 withArguments: {'big'}).
	isSigned := (signed perform: #= env: 0 withArguments: {true}) or: [signed == true].
	val := self.

	"Handle negative numbers"
	(val perform: #< env: 0 withArguments: {0}) ifTrue: [
		isSigned ifFalse: [
			self perform: #error: env: 0 withArguments: {'OverflowError: can''t convert negative int to unsigned'}
		].
		"Two's complement"
		val := ((1 perform: #bitShift: env: 0 withArguments: {(numBytes perform: #* env: 0 withArguments: {8})})
			perform: #+ env: 0 withArguments: {val}).
	].

	"Check if value fits in the given number of bytes"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val perform: #>= env: 0 withArguments: {(1 perform: #bitShift: env: 0 withArguments: {(numBytes perform: #* env: 0 withArguments: {8})})}
	]) ifTrue: [
		self perform: #error: env: 0 withArguments: {'OverflowError: int too big to convert'}
	].

	"Convert to bytes"
	result := Array perform: #new: env: 0 withArguments: {numBytes}.
	1 perform: #to:do: env: 0 withArguments: {numBytes. [:i |
		| byteVal idx |
		byteVal := (val perform: #bitAnd: env: 0 withArguments: {16rFF}).
		idx := isBigEndian
			ifTrue: [(numBytes perform: #- env: 0 withArguments: {(i perform: #- env: 0 withArguments: {1})})]
			ifFalse: [i].
		result perform: #at:put: env: 0 withArguments: {idx. byteVal}.
		val := val perform: #bitShift: env: 0 withArguments: {-8}.
	]}.

	^ result
%

category: 'Python-Integer Methods'
method: int
as_integer_ratio
	"Return a pair of integers whose ratio is exactly equal to the original int.
	For integers, this is (self, 1)."

	^ Array perform: #with:with: env: 0 withArguments: {self. 1}
%

category: 'Python-Integer Methods'
method: int
conjugate
	"Return the complex conjugate (self for real numbers)."

	^ self
%

category: 'Python-Integer Methods'
method: int
is_integer
	"Return True (integers are always integers)."

	^ true
%

category: 'Python-Properties'
method: int
real
	"Return the real part (self)."

	^ self
%

category: 'Python-Properties'
method: int
imag
	"Return the imaginary part (0)."

	^ 0
%

category: 'Python-Properties'
method: int
numerator
	"Return the numerator (self)."

	^ self
%

category: 'Python-Properties'
method: int
denominator
	"Return the denominator (1)."

	^ 1
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
4' perform: #asUnicodeString env: 0
%

! ------------------- Reset compile environment
set compile_env: 0

