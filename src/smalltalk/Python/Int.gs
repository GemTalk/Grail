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
_new: positional kw: kwargs
	"Kwargs constructor entry: int(x, base=n) -- the generic class-call
	(Object class>>value:value:) forwards keyword calls here.
	partial(int, base=2)('101') reaches this via the partial invoke."

	| obj base |
	obj := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [kwargs @env0:at: 'x' ifAbsent: [^ 0]].
	base := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [kwargs @env0:at: 'base' ifAbsent: [nil]].
	base == nil ifTrue: [^ self __new__: obj].
	^ self __new__: obj _: base
%

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
	(obj isKindOf: int) ifTrue: [
		^ obj
	].

	"Try to call __int__ on the object if it has one.  ``respondsTo:``
	is env-0 only and would miss env-1 ``__int__`` implementations.
	Walk the env-1 class chain (not just the immediate method dict) so
	an inherited ``__int__`` — e.g. AbstractPyInt's, inherited by
	NamedIntConstant / HTTPStatus — is found too.  A VENDORED Python __int__
	whose def carries parameters (fractions.Fraction: ``def __int__(a,
	_index=operator.index)'') compiles to the varargs selector
	``___int__:kw:'', which the bare-selector check below would miss."
	((obj @env0:class @env0:whichClassIncludesSelector: #'___int__:kw:' environmentId: 1) @env0:notNil) ifTrue: [
		^ obj ___int__: { } kw: nil
	].
	((obj @env0:class @env0:whichClassIncludesSelector: #__int__ environmentId: 1) @env0:notNil) ifTrue: [
		result := obj __int__.
		^ result
	].

	"Try to convert from float"
	(obj isKindOf: Float) ifTrue: [
		^ obj @env0:truncated
	].

	"Try to convert from string.  Parse via the vendor number reader
	``Number>>fromStream:'' rather than ``CharacterCollection>>asNumber'':
	some images load a Squeak-compatibility package that OVERRIDES asNumber
	(category ``*squeak-converting'', body ``^Number readFrom: self readStream''),
	and that Squeak reader rejects a leading unary ``+'' (int('+5') must work)
	and can diverge in other ways.  ``fromStream:'' is the primitive the
	vendor asNumber itself uses and is not overridden, so it behaves the same
	on base and Squeak/GLASS/Seaside images and accepts both ``+'' and ``-''.
	trimBoth first so surrounding whitespace is tolerated (int('  100  '))."
	(obj isKindOf: Unicode7) ifTrue: [
		^ [ (Number @env0:fromStream: (ReadStreamPortable @env0:on: obj @env0:trimBoth)) @env0:truncated ]
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
	(base isKindOf: int) ifFalse: [
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
	(obj isKindOf: CharacterCollection) ifTrue: [
		str := obj
	] ifFalse: [
		(obj isKindOf: ByteArray) ifTrue: [
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
__instancecheck__: anObject
	"isinstance(x, int) — Grail's isinstance tries ``isKindOf: Integer``
	first (real ints short-circuit) and consults this hook only on
	failure.  Recognize AbstractPyInt-based wrappers (NamedIntConstant,
	HTTPStatus, ...) so they report as ints, matching CPython where
	those types subclass int."

	^ anObject isKindOf: AbstractPyInt
%

category: 'Grail-Class Methods'
classmethod: int
from_bytes: bytes _: byteorder _: signed
	"int.from_bytes(bytes, byteorder='big', *, signed=False)
	Return the integer represented by the given array of bytes."

	| bytesArray result isBigEndian isSigned |
	"Extract bytes - assuming bytes is a Python bytes object or similar"
	bytesArray := bytes.
	(bytesArray isKindOf: tuple) ifFalse: [
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

category: 'Grail-Type'
method: int
__class__
	"Python ``type(n)'' is ``int'' for every integer.  GemStone's concrete
	subclasses (SmallInteger, LargePositiveInteger, LargeNegativeInteger)
	are an implementation detail; without this override ``type(5)'' would
	answer SmallInteger and ``type(5) is int'' would be False (test_math
	testCeil/Floor/Comb/Isqrt/Perm; test_enum test_programatic_function_*).
	Bool is a separate type (Boolean) and is unaffected."

	^ int
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

	(other isKindOf: Number) ifTrue: [^ self @env0:+ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:+ (other __index__)].
	^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'
%

category: 'Grail-Bitwise Operations'
method: int
__and__: other
	"Bitwise AND."

	(other isKindOf: Integer) ifTrue: [^ self @env0:bitAnd: other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:bitAnd: (other __index__)].
	^ self ___binOpFallback___: other op: '&' reflected: #'__rand__:'
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
	"CPython: division/modulo by zero raises catchable
	ZeroDivisionError; the kernel ZeroDivide is uncatchable."
	((other isKindOf: Number) and: [other @env0:= 0]) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].
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

	"complex first: kernel env-0 = would try GemStone Number coercion
	and send the internal #_getKind to complex (DNU).  complex knows
	how to compare against reals."
	(other isKindOf: complex) ifTrue: [^ other __eq__: self].
	(self @env0:= other) ifTrue: [^ true].
	(other isKindOf: SmallInteger) ifTrue: [^ false].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:= (other __index__)
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
	"CPython: division/modulo by zero raises catchable
	ZeroDivisionError; the kernel ZeroDivide is uncatchable."
	((other isKindOf: Number) and: [other @env0:= 0]) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Number) ifTrue: [^ self @env0:// other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:// (other __index__)].
	^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'
%

category: 'Grail-String Representation'
method: int
__format__: formatSpec
	"Format the integer per the full format-spec mini-language
	(fill/align/sign/#/0/width/grouping/.precision/type) — see the
	shared engine in builtins ___formatValue___:spec:."

	^ (builtins instance) ___formatValue___: self spec: formatSpec
%

category: 'Grail-Comparison'
method: int
__ge__: other
	"Return self >= other.  Mirrors the __eq__: __index__ fallback
	so the reverse direction ``10 >= MAXREPEAT`` works when
	MAXREPEAT is a NamedIntConstant (or any other PEP 357 wrapper)."

	(other isKindOf: Number) ifTrue: [^ self @env0:>= other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:>= (other __index__)
	].
	^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'
%

category: 'Grail-Comparison'
method: int
__gt__: other
	"Return self > other.  Same __index__ fallback as __ge__:."

	(other isKindOf: Number) ifTrue: [^ self @env0:> other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:> (other __index__)
	].
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'
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

	(other isKindOf: Number) ifTrue: [^ self @env0:<= other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:<= (other __index__)
	].
	^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'
%

category: 'Grail-Bitwise Operations'
method: int
__lshift__: other
	"Left shift."

	(other isKindOf: Integer) ifTrue: [^ self @env0:bitShift: other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:bitShift: (other __index__)].
	^ self ___binOpFallback___: other op: '<<' reflected: #'__rlshift__:'
%

category: 'Grail-Comparison'
method: int
__lt__: other
	"Return self < other.  Same __index__ fallback as __ge__:."

	(other isKindOf: Number) ifTrue: [^ self @env0:< other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
		^ self @env0:< (other __index__)
	].
	^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'
%

category: 'Grail-Arithmetic'
method: int
__mod__: other
	"Modulo operation."
	"CPython: division/modulo by zero raises catchable
	ZeroDivisionError; the kernel ZeroDivide is uncatchable."
	((other isKindOf: Number) and: [other @env0:= 0]) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Number) ifTrue: [^ self @env0:\\ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:\\ (other __index__)].
	^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'
%

category: 'Grail-Arithmetic'
method: int
__mul__: other
	"Multiply two integers or integer and other number."

	(other isKindOf: Number) ifTrue: [^ self @env0:* other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:* (other __index__)].
	"Sequence repetition is commutative: ``2 * 'ab''' / ``2 * [1]''
	delegate to the sequence's own __mul__ (CPython reaches the
	same result via NotImplemented -> str.__rmul__)."
	((other isKindOf: CharacterCollection)
		or: [(other isKindOf: SequenceableCollection)
		or: [other isKindOf: ByteArray]]) ifTrue: [
		^ other __mul__: self].
	^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'
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

	(other isKindOf: Integer) ifTrue: [^ self @env0:bitOr: other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:bitOr: (other __index__)].
	^ self ___binOpFallback___: other op: '|' reflected: #'__ror__:'
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
	"Raise to power.  The kernel caps LargeInteger at ~130k bits;
	resignal its NumericError as catchable OverflowError (DELIBERATE
	deviation -- CPython ints are unbounded)."

	(other isKindOf: Number) ifTrue: [
		^ [self @env0:raisedTo: other]
			@env0:on: NumericError
			do: [:ex |
				OverflowError ___signal___: 'result exceeds Grail integer capacity']].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:raisedTo: (other __index__)].
	^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:'
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

	(other isKindOf: Number) ifTrue: [^ other @env0:+ self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:+ self].
	^ self ___rbinOpFallback___: other op: '+'
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rand__: other
	"Reverse bitwise AND (other & self)."

	(other isKindOf: Integer) ifTrue: [^ other @env0:bitAnd: self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:bitAnd: self].
	^ self ___rbinOpFallback___: other op: '&'
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rdivmod__: other
	"Reverse divmod (divmod(other, self))."
	| quot rem |
	"Reverse form: other OP self -- self is the divisor."
	(self @env0:= 0) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].
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
	"Reverse form: other OP self -- self is the divisor."
	(self @env0:= 0) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Number) ifTrue: [^ other @env0:// self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:// self].
	^ self ___rbinOpFallback___: other op: '//'
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rlshift__: other
	"Reverse left shift (other << self)."

	(other isKindOf: Integer) ifTrue: [^ other @env0:bitShift: self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:bitShift: self].
	^ self ___rbinOpFallback___: other op: '<<'
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rmod__: other
	"Reverse modulo (other % self)."
	"Reverse form: other OP self -- self is the divisor."
	(self @env0:= 0) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Number) ifTrue: [^ other @env0:\\ self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:\\ self].
	^ self ___rbinOpFallback___: other op: '%'
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rmul__: other
	"Reverse multiply (other * self)."

	(other isKindOf: Number) ifTrue: [^ other @env0:* self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:* self].
	^ self ___rbinOpFallback___: other op: '*'
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__ror__: other
	"Reverse bitwise OR (other | self)."

	(other isKindOf: Integer) ifTrue: [^ other @env0:bitOr: self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:bitOr: self].
	^ self ___rbinOpFallback___: other op: '|'
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

	(other isKindOf: Number) ifTrue: [^ other @env0:raisedTo: self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:raisedTo: self].
	^ self ___rbinOpFallback___: other op: '**'
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rrshift__: other
	"Reverse right shift (other >> self)."

	(other isKindOf: Integer) ifTrue: [^ other @env0:bitShift: (self @env0:negated)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:bitShift: (self @env0:negated)].
	^ self ___rbinOpFallback___: other op: '>>'
%

category: 'Grail-Bitwise Operations'
method: int
__rshift__: other
	"Right shift."

	(other isKindOf: Integer) ifTrue: [^ self @env0:bitShift: (other @env0:negated)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:bitShift: ((other __index__) @env0:negated)].
	^ self ___binOpFallback___: other op: '>>' reflected: #'__rrshift__:'
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rsub__: other
	"Reverse subtract (other - self)."

	(other isKindOf: Number) ifTrue: [^ other @env0:- (self)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:- (self)].
	^ self ___rbinOpFallback___: other op: '-'
%

category: 'Grail-Arithmetic - Reverse'
method: int
__rtruediv__: other
	"Reverse true division (other / self)."
	"Reverse form: other OP self -- self is the divisor."
	(self @env0:= 0) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Number) ifTrue: [^ other @env0:/ self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:/ self].
	^ self ___rbinOpFallback___: other op: '/'
%

category: 'Grail-Bitwise Operations - Reverse'
method: int
__rxor__: other
	"Reverse bitwise XOR (other ^ self)."

	(other isKindOf: Integer) ifTrue: [^ other @env0:bitXor: self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:bitXor: self].
	^ self ___rbinOpFallback___: other op: '^'
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

	(other isKindOf: Number) ifTrue: [^ self @env0:- (other)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:- ((other __index__))].
	^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'
%

category: 'Grail-Arithmetic'
method: int
__truediv__: other
	"True division (returns float)."
	"CPython: division/modulo by zero raises catchable
	ZeroDivisionError; the kernel ZeroDivide is uncatchable."
	((other isKindOf: Number) and: [other @env0:= 0]) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Number) ifTrue: [^ self @env0:/ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:/ (other __index__)].
	^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'
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

	(other isKindOf: Integer) ifTrue: [^ self @env0:bitXor: other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ self @env0:bitXor: (other __index__)].
	^ self ___binOpFallback___: other op: '^' reflected: #'__rxor__:'
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

category: 'Grail-Python protocol'
method: int
__iter__
	"iter(int) raises catchable TypeError (CPython) -- heapify(non-
	sequence) sent an uncatchable env-1 MNU."

	TypeError ___signal___: '''int'' object is not iterable'
%

category: 'Grail-Python protocol'
method: int
__getitem__: idx
	"x[i] on an int raises catchable TypeError (CPython).  Without a
	real method the send died as an UNCATCHABLE env-1 MNU and killed
	the test_fractions module run.  Safe as a real method on int alone
	(the probe-selector concern applies to blanket DNU intercepts)."

	TypeError ___signal___: '''int'' object is not subscriptable'
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

	^ self to_bytes: length _: byteorder _: false
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

category: 'Grail-Python Attribute Hook'
classmethod: int
___pythonValueAttrs___
	"Unary methods exposed to Python as VALUE attributes rather than
	bound methods: CPython's int carries numerator/denominator/
	real/imag as properties (vendored fractions.py multiplies
	``numerator.numerator * denominator.denominator'' -- a BoundMethod
	there poisons the arithmetic)."

	^ IdentitySet new
		add: #numerator;
		add: #denominator;
		add: #real;
		add: #imag;
		yourself
%
