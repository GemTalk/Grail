! ===============================================================================
! Integer Methods (Python 'int' type)
! ===============================================================================
! This file contains method implementations for the Integer class when used
! as the Python 'int' type. Integer is an abstract class in GemStone with
! concrete subclasses SmallInteger and LargeInteger, providing arbitrary
! precision arithmetic just like Python's int.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from int
expectvalue /Metaclass3
doit
int removeAllMethods: 1.
int class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: int
__new__
	"Create a new int instance with default value 0.
	In Python: int() or int.__new__(int)"

	^ 0
%

category: 'Grail-Initialization'
classmethod: int
__new__: obj
	"Create a new int instance from an object.
	In Python: int(obj) or int.__new__(int, obj)"

	| result |
	obj ifNil: [ ^ 0 ].

	"If already an int, return it"
	(obj @env0:isKindOf: int) ifTrue: [
		^ obj
	].

	"Try to call __int__ on the object if it has one.  ``respondsTo:``
	is env-0 only and would miss env-1 ``__int__`` implementations
	(like the one on NamedIntConstant) — check the env-1 method
	dict explicitly."
	((obj @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #__int__) ifTrue: [
		result := obj @env1:__int__.
		^ result
	].

	"Try to convert from float"
	(obj @env0:isKindOf: Float) ifTrue: [
		^ obj @env0:truncated
	].

	"Try to convert from string"
	(obj @env0:isKindOf: Unicode7) ifTrue: [
		^ [ (obj @env0:asNumber) @env0:truncated ]
			@env0:on: Error
			do: [:ex | ValueError @env0:signal: 'invalid literal for int()']
	].

	"Otherwise, error"
	TypeError @env0:signal: 'int() argument must be a string or a number'
%

category: 'Grail-Initialization'
classmethod: int
__new__: obj _: base
	"Create a new int instance from a string with a given base.
	In Python: int(obj, base)"

	| str baseInt |
	"base must be an integer"
	(base @env0:isKindOf: int) ifFalse: [
		TypeError @env0:signal: 'int() base must be an integer'
	].

	baseInt := base.

	"base must be 0 or 2-36"
	((baseInt == 0) not and: [
		(baseInt @env0:< 2) or: [
			baseInt @env0:> 36
		]
	]) ifTrue: [
		ValueError @env0:signal: 'int() base must be >= 2 and <= 36, or 0'
	].

	"obj must be a string or bytes-like.  CPython accepts both —
	bytes are interpreted as ASCII characters (b'101' → 5 in base 2)
	exactly as the equivalent str would be.  For bytes we build a
	String character-by-character (GS's ``ByteArray asString``
	returns the printString, not a re-interpretation of the bytes
	as characters)."
	(obj @env0:isKindOf: CharacterCollection) ifTrue: [
		str := obj
	] ifFalse: [
		(obj @env0:isKindOf: ByteArray) ifTrue: [
			str := String @env0:new: obj @env0:size.
			1 @env0:to: obj @env0:size do: [:i |
				str @env0:at: i put: (Character @env0:codePoint: (obj @env0:at: i))
			]
		] ifFalse: [
			TypeError @env0:signal: 'int() can''t convert non-string with explicit base'
		]
	].

	str := str @env0:trimBoth.

	"Parse the string with the given base.  GemStone has no public
	radix-aware Integer parser (only ``fromString:`` for base 10 and
	``fromHexString:`` for base 16), so for the other bases we walk
	the digits ourselves — same routine handles negative + ``+``
	prefixes and Python's ``0b``/``0o``/``0x`` discriminators."
	^ [self ___parseInt: str radix: baseInt
	] @env0:on: Error do: [:ex |
		ValueError @env0:signal: ('invalid literal for int() with base ' @env0:, (baseInt @env0:printString))
	]
%

category: 'Grail-Initialization'
classmethod: int
___parseInt: aString radix: baseInt
	"Parse aString as an integer in the given base.  baseInt = 0
	means infer from prefix (``0b`` / ``0o`` / ``0x``) and fall back
	to base 10.  Raises if the result has no digits or contains a
	non-digit for the chosen base."

	| chars sign idx effectiveBase result digitChars ch d pfxChar |
	chars := aString.
	idx := 1.
	sign := 1.
	(chars @env0:size @env0:>= 1) ifTrue: [
		((chars @env0:at: 1) @env0:= $-) ifTrue: [sign := -1. idx := 2].
		((chars @env0:at: 1) @env0:= $+) ifTrue: [idx := 2].
	].
	effectiveBase := baseInt.
	"Python ``0b`` / ``0o`` / ``0x`` prefix handling — only for
	base 0 (auto-detect) and the matching explicit base."
	((baseInt @env0:= 0)
		or: [(baseInt @env0:= 2)
		or: [(baseInt @env0:= 8)
		or: [baseInt @env0:= 16]]]) ifTrue: [
		(chars @env0:size @env0:>= (idx @env0:+ 1)) ifTrue: [
			((chars @env0:at: idx) @env0:= $0) ifTrue: [
				pfxChar := (chars @env0:at: idx @env0:+ 1) @env0:asLowercase.
				pfxChar @env0:= $b ifTrue: [effectiveBase := 2. idx := idx @env0:+ 2].
				pfxChar @env0:= $o ifTrue: [effectiveBase := 8. idx := idx @env0:+ 2].
				pfxChar @env0:= $x ifTrue: [effectiveBase := 16. idx := idx @env0:+ 2].
			].
		].
	].
	effectiveBase @env0:= 0 ifTrue: [effectiveBase := 10].
	digitChars := '0123456789abcdefghijklmnopqrstuvwxyz' @env0:copyFrom: 1 to: effectiveBase.
	(idx @env0:> chars @env0:size) ifTrue: [
		^ self @env0:error: 'no digits'
	].
	result := 0.
	[idx @env0:<= chars @env0:size] @env0:whileTrue: [
		ch := (chars @env0:at: idx) @env0:asLowercase.
		(ch @env0:= $_) ifFalse: [
			d := digitChars @env0:indexOf: ch.
			(d @env0:= 0) ifTrue: [^ self @env0:error: 'bad digit'].
			result := (result @env0:* effectiveBase) @env0:+ (d @env0:- 1).
		].
		idx := idx @env0:+ 1.
	].
	^ sign @env0:* result
%

category: 'Grail-Class Methods'
classmethod: int
from_bytes: bytes _: byteorder
	"int.from_bytes(bytes, byteorder='big', *, signed=False)"

	^ self from_bytes: bytes byteorder: byteorder signed: false
%

category: 'Grail-Class Methods'
classmethod: int
from_bytes: bytes _: byteorder _: signed
	"int.from_bytes(bytes, byteorder='big', *, signed=False)
	Return the integer represented by the given array of bytes."

	| bytesArray result isBigEndian isSigned |
	"Extract bytes - assuming bytes is a Python bytes object or similar"
	bytesArray := bytes.
	(bytesArray @env0:isKindOf: tuple) ifFalse: [
		TypeError @env0:signal: 'from_bytes() argument must be bytes-like'
	].

	isBigEndian := (byteorder @env0:= 'big').
	isSigned := (signed == true) or: [signed == true].

	result := 0.
	isBigEndian
		ifTrue: [
			bytesArray @env0:do: [:each |
				result := ((result @env0:bitShift: 8) @env0:bitOr: each).
			].
		]
		ifFalse: [
			| shift |
			shift := 0.
			bytesArray @env0:do: [:each |
				result := (result @env0:bitOr: (each @env0:bitShift: shift)).
				shift := (shift @env0:+ 8).
			].
		].

	"Handle signed conversion"
	(isSigned and: [(bytesArray @env0:size) @env0:> 0]) ifTrue: [
		| highByte |
		highByte := isBigEndian
			ifTrue: [bytesArray @env0:first]
			ifFalse: [bytesArray @env0:last].
		((highByte @env0:bitAnd: 16r80) @env0:~= 0) ifTrue: [
			"Negative number - subtract 2^(numBits)"
			result := (result @env0:- 
				(1 @env0:bitShift: ((bytesArray @env0:size) @env0:* 8))
			).
		].
	].

	^ result
%

category: 'Grail-Arithmetic'
method: int
__abs__
	"Absolute value."

	^ self @env0:abs
%

category: 'Grail-Arithmetic'
method: int
__add__: other
	"Add two integers or integer and other number."

	^ self @env0:+ other
%

category: 'Grail-Bitwise Operations'
method: int
__and__: other
	"Bitwise AND."

	^ self @env0:bitAnd: other
%

category: 'Grail-Conversion'
method: int
__bool__
	"Return True if non-zero, False if zero."

	^ self @env0:~= 0
%

category: 'Grail-Rounding'
method: int
__ceil__
	"Ceiling (returns self)."

	^ self
%

category: 'Grail-Arithmetic'
method: int
__divmod__: other
	"Return (quotient, remainder) tuple."

	| quot rem |
	quot := self @env0:// other.
	rem := self @env0:\\ other.
	^ tuple @env0:with: quot with: rem
%

category: 'Grail-Documentation'
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
4' @env0:asUnicodeString
%

category: 'Grail-Comparison'
method: int
__eq__: other
	"Return self == other.  Compares as Smalltalk integers first;
	on mismatch, if other declares itself integer-like via
	``__index__`` (PEP 357 — e.g. NamedIntConstant from re._constants),
	unwrap and re-compare.  This makes the reverse direction
	``16 == LITERAL`` agree with ``LITERAL == 16``."

	(self @env0:= other) ifTrue: [^ true].
	(other @env0:isKindOf: SmallInteger) ifTrue: [^ false].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:= (other @env1:__index__)
	].
	^ false
%

category: 'Grail-Conversion'
method: int
__float__
	"Convert to float."

	^ self @env0:asFloat
%

category: 'Grail-Rounding'
method: int
__floor__
	"Floor (returns self)."

	^ self
%

category: 'Grail-Arithmetic'
method: int
__floordiv__: other
	"Floor division."

	^ self @env0:// other
%

category: 'Grail-String Representation'
method: int
__format__: formatSpec
	"Format the integer according to format specification.  Supports
	a subset of Python's format-spec mini-language: optional
	[fill][<|>|^][width].  Empty spec → ``__str__''.  Anything fancier
	(sign, padding zero, base, thousands-separator) falls back to the
	plain string."

	| s |
	s := self @env1:__str__.
	formatSpec @env0:isEmpty ifTrue: [^ s].
	^ s @env1:___applyAlignWidthFormat___: formatSpec
%

category: 'Grail-Comparison'
method: int
__ge__: other
	"Return self >= other.  Mirrors the __eq__: __index__ fallback
	so the reverse direction ``10 >= MAXREPEAT`` works when
	MAXREPEAT is a NamedIntConstant (or any other PEP 357 wrapper)."

	(other @env0:isKindOf: Number) ifTrue: [^ self @env0:>= other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:>= (other @env1:__index__)
	].
	^ self @env0:>= other
%

category: 'Grail-Comparison'
method: int
__gt__: other
	"Return self > other.  Same __index__ fallback as __ge__:."

	(other @env0:isKindOf: Number) ifTrue: [^ self @env0:> other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:> (other @env1:__index__)
	].
	^ self @env0:> other
%

category: 'Grail-Hashing'
method: int
__hash__
	"Return hash value (self for integers)."

	^ self @env0:hash
%

category: 'Grail-Conversion'
method: int
__index__
	"Return self (used for indexing)."

	^ self
%

category: 'Grail-Initialization'
method: int
__init__
	"Initialize an int instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ None
%

category: 'Grail-Initialization'
method: int
__init__: obj
	"Initialize an int instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ None
%

category: 'Grail-Conversion'
method: int
__int__
	"Return self (already an integer)."

	^ self
%

category: 'Grail-Bitwise Operations'
method: int
__invert__
	"Bitwise NOT (one's complement)."

	^ self @env0:bitInvert
%

category: 'Grail-Comparison'
method: int
__le__: other
	"Return self <= other.  Same __index__ fallback as __ge__:."

	(other @env0:isKindOf: Number) ifTrue: [^ self @env0:<= other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:<= (other @env1:__index__)
	].
	^ self @env0:<= other
%

category: 'Grail-Bitwise Operations'
method: int
__lshift__: other
	"Left shift."

	^ self @env0:bitShift: other
%

category: 'Grail-Comparison'
method: int
__lt__: other
	"Return self < other.  Same __index__ fallback as __ge__:."

	(other @env0:isKindOf: Number) ifTrue: [^ self @env0:< other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:< (other @env1:__index__)
	].
	^ self @env0:< other
%

category: 'Grail-Arithmetic'
method: int
__mod__: other
	"Modulo operation."

	^ self @env0:\\ other
%

category: 'Grail-Arithmetic'
method: int
__mul__: other
	"Multiply two integers or integer and other number."

	^ self @env0:* other
%

category: 'Grail-Comparison'
method: int
__ne__: other
	"Return self != other"

	^ self @env0:~= other
%

category: 'Grail-Arithmetic'
method: int
__neg__
	"Unary negation."

	^ self @env0:negated
%

category: 'Grail-Bitwise Operations'
method: int
__or__: other
	"Bitwise OR."

	^ self @env0:bitOr: other
%

category: 'Grail-Arithmetic'
method: int
__pos__
	"Unary plus (return self)."

	^ self
%

category: 'Grail-Arithmetic'
method: int
__pow__: other
	"Raise to power."

	^ self @env0:raisedTo: other
%

category: 'Grail-Arithmetic'
method: int
__pow__: other _: mod
	"Raise to power with modulo."

	| result |
	result := self @env0:raisedTo: other.
	mod ifNotNil: [
		result := result @env0:\\ mod.
	].
	^ result
%

category: 'Grail-Arithmetic - Reverse'
method: int
__radd__: other
	"Reverse add (other + self)."

	^ other @env0:+ self
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rand__: other
	"Reverse bitwise AND (other & self)."

	^ other @env0:bitAnd: self
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rdivmod__: other
	"Reverse divmod (divmod(other, self))."

	| quot rem |
	quot := other @env0:// self.
	rem := other @env0:\\ self.
	^ tuple @env0:with: quot with: rem
%

category: 'Grail-String Representation'
method: int
__repr__
	"Return string representation of integer."

	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rfloordiv__: other
	"Reverse floor division (other // self)."

	^ other @env0:// self
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rlshift__: other
	"Reverse left shift (other << self)."

	^ other @env0:bitShift: self
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rmod__: other
	"Reverse modulo (other % self)."

	^ other @env0:\\ self
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rmul__: other
	"Reverse multiply (other * self)."

	^ other @env0:* self
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__ror__: other
	"Reverse bitwise OR (other | self)."

	^ other @env0:bitOr: self
%

category: 'Grail-Rounding'
method: int
__round__
	"Round to nearest integer (returns self)."

	^ self
%

category: 'Grail-Rounding'
method: int
__round__: ndigits
	"Round to n digits."

	ndigits ifNil: [ ^ self ].

	"If ndigits is negative, round to that many places left of decimal"
	(ndigits @env0:< 0) ifTrue: [
		| divisor |
		divisor := (10 @env0:raisedTo: (ndigits @env0:abs)).
		^ ((self @env0:/ divisor) @env0:rounded)
			@env0:* divisor
	].

	"If ndigits is non-negative, just return self"
	^ self
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rpow__: other
	"Reverse power (other ** self)."

	^ other @env0:raisedTo: self
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rrshift__: other
	"Reverse right shift (other >> self)."

	^ other @env0:bitShift: (self @env0:negated)
%

category: 'Grail-Bitwise Operations'
method: int
__rshift__: other
	"Right shift."

	^ self @env0:bitShift: (other @env0:negated)
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rsub__: other
	"Reverse subtract (other - self)."

	^ other @env0:- (self)
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rtruediv__: other
	"Reverse true division (other / self)."

	^ other @env0:/ self
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rxor__: other
	"Reverse bitwise XOR (other ^ self)."

	^ other @env0:bitXor: self
%

category: 'Grail-String Representation'
method: int
__str__
	"Return string representation of integer."

	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Grail-Arithmetic'
method: int
__sub__: other
	"Subtract other from self."

	^ self @env0:- (other)
%

category: 'Grail-Arithmetic'
method: int
__truediv__: other
	"True division (returns float)."

	^ self @env0:/ other
%

category: 'Grail-Rounding'
method: int
__trunc__
	"Truncate to integer (returns self)."

	^ self
%

category: 'Grail-Bitwise Operations'
method: int
__xor__: other
	"Bitwise XOR."

	^ self @env0:bitXor: other
%

category: 'Grail-Integer Methods'
method: int
as_integer_ratio
	"Return a pair of integers whose ratio is exactly equal to the original int.
	For integers, this is (self, 1)."

	^ tuple @env0:with: self with: 1
%

category: 'Grail-Integer Methods'
method: int
bit_count
	"Return the number of ones in the binary representation."

	| n count |
	n := self @env0:abs.
	count := 0.
	[(n @env0:> 0)] whileTrue: [
		((n @env0:bitAnd: 1) == 1) ifTrue: [
			count := (count @env0:+ 1).
		].
		n := n @env0:bitShift: -1.
	].
	^ count
%

category: 'Grail-Integer Methods'
method: int
bit_length
	"Return the number of bits necessary to represent self in binary."

	| n count |
	n := self @env0:abs.
	count := 0.
	[(n @env0:> 0)] whileTrue: [
		n := n @env0:bitShift: -1.
		count := (count @env0:+ 1).
	].
	^ count
%

category: 'Grail-Integer Methods'
method: int
conjugate
	"Return the complex conjugate (self for real numbers)."

	^ self
%

category: 'Grail-Properties'
method: int
denominator
	"Return the denominator (1)."

	^ 1
%

category: 'Grail-Properties'
method: int
imag
	"Return the imaginary part (0)."

	^ 0
%

category: 'Grail-Integer Methods'
method: int
is_integer
	"Return True (integers are always integers)."

	^ true
%

category: 'Grail-Properties'
method: int
numerator
	"Return the numerator (self)."

	^ self
%

category: 'Grail-Properties'
method: int
real
	"Return the real part (self)."

	^ self
%

category: 'Grail-Integer Methods'
method: int
to_bytes: length _: byteorder
	"int.to_bytes(length, byteorder='big', *, signed=False) —
	2-arg form, delegates to the 3-arg form with signed=false.
	The selector was previously ``to_bytes:byteorder:signed:'' which
	doesn't exist (Python-keyword style accidentally used instead
	of Grail's ``_:'' convention)."

	^ self @env1:to_bytes: length _: byteorder _: false
%

category: 'Grail-Integer Methods'
method: int
to_bytes: length _: byteorder _: signed
	"int.to_bytes(length, byteorder='big', *, signed=False)
	Return an array of bytes representing an integer."

	| numBytes isBigEndian isSigned val result |
	numBytes := length.
	isBigEndian := (byteorder @env0:= 'big').
	isSigned := (signed == true) or: [signed == true].
	val := self.

	"Handle negative numbers"
	(val @env0:< 0) ifTrue: [
		isSigned ifFalse: [
			OverflowError @env0:signal: 'can''t convert negative int to unsigned'
		].
		"Two's complement"
		val := ((1 @env0:bitShift: (numBytes @env0:* 8))
			@env0:+ val).
	].

	"Check if value fits in the given number of bytes"
	((val @env0:< 0) or: [
		val @env0:>= (1 @env0:bitShift: (numBytes @env0:* 8))
	]) ifTrue: [
		OverflowError @env0:signal: 'int too big to convert'
	].

	"Convert to bytes - #'new:fill:' freezes it"
	^ tuple @env0:new: numBytes fill: [:t |
		1 @env0:to: numBytes do: [:i |
			| byteVal idx |
			byteVal := (val @env0:bitAnd: 16rFF).
			idx := isBigEndian
				ifTrue: [(numBytes @env0:- (i @env0:- 1))]
				ifFalse: [i].
			t @env0:at: idx put: byteVal.
			val := val @env0:bitShift: -8.
		].
	]
%

set compile_env: 0
