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
	"CPython's int() takes its value POSITIONALLY ONLY -- 'x' is not a
	nameable keyword (int(x=1.2) raises TypeError), unlike Grail's own
	convenience of allowing kwargs at: 'x'.  Reject it up front to match
	(test_int.py test_keyword_args)."
	(kwargs @env0:notNil and: [kwargs @env0:includesKey: 'x']) ifTrue: [
		TypeError ___signal___: 'int() got an unexpected keyword argument ''x'''
	].
	obj := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			(kwargs @env0:notNil and: [kwargs @env0:includesKey: 'base']) ifTrue: [
				TypeError ___signal___: 'int() missing string argument'
			].
			^ 0
		].
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
__new__: obj _: base _: extra
	"int() takes at most 2 positional arguments -- a 3rd falls through
	the generic class-call dispatch's arity-named-selector convention
	(object class>>value:value: builds ``__new__:_:_:`` for 3
	positionals) straight to a raw, uncatchable MessageNotUnderstood
	on Integer class since (unlike Grail's own PythonInstance
	hierarchy) the kernel Integer/Number/Object metaclass chain has no
	env-1 DNU backstop.  Raise the same TypeError CPython does instead
	(test_int.py: assertRaises(TypeError, int, '10', 2, 1))."

	TypeError ___signal___: 'int expected at most 2 arguments, got 3'
%

category: 'Grail-Initialization'
classmethod: int
__new__: obj
	"Create a new int instance from an object.
	In Python: int(obj) or int.__new__(int, obj)"

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
		^ self ___coerceIntResult___: (obj ___int__: { } kw: nil) from: '__int__'
	].
	((obj @env0:class @env0:whichClassIncludesSelector: #__int__ environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___coerceIntResult___: obj __int__ from: '__int__'
	].

	"No __int__: fall back to __index__ (PEP 357) -- e.g. a class that
	implements only __index__ (test_int.py's BadIndex)."
	((obj @env0:class @env0:whichClassIncludesSelector: #__index__ environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___coerceIntResult___: obj __index__ from: '__index__'
	].

	"Try to convert from float"
	(obj isKindOf: Float) ifTrue: [
		^ obj @env0:truncated
	].

	"Try to convert from string.  Parse via the same explicit-base radix
	walker the ``int(obj, base)`` path below uses (base 10), rather than
	the vendor number reader ``Number>>fromStream:'': that reader is a
	PREFIX parser (happily reads '1' out of '1x' and leaves the 'x'
	unconsumed) with no notion of PEP 515 underscores, whereas CPython's
	int() requires the WHOLE (trimmed) string to be a valid base-10
	literal, underscores included.  ``___parseInt:radix:`` also accepts
	Unicode decimal digits (``digitValue``), matching CPython's
	int('١٢٣') support.  trimBoth first so surrounding whitespace is
	tolerated (int('  100  ')).  Accept EVERY CharacterCollection, not
	just Unicode7: a string that contains any non-Latin-1 codepoint is
	widened to a DoubleByteString / Unicode16 (e.g. a format spec with a
	'→' fill widens its digit groups), and int('2') on that wide string
	must still parse."
	(obj isKindOf: CharacterCollection) ifTrue: [
		self ___checkStrDigitLimit___: obj.
		^ [self ___parseInt: (obj @env0:trimBoth: [:c | c @env0:unicodeIsWhitespace]) radix: 10]
			@env0:on: Error
			do: [:ex | self ___invalidLiteral___: obj base: 10]
	].

	"Bytes-like objects parse the same as the equivalent str, base 10 --
	CPython accepts bytes for the implicit-base int(x) form too, not just
	int(x, base) (test_int.py: int(b'1_00') == 100)."
	(obj isKindOf: ByteArray) ifTrue: [
		^ self ___parseIntFromBytes___: obj original: obj
	].

	"Any other buffer-protocol-like object (real CPython's int() accepts
	anything exposing the buffer protocol, not just literal bytes/
	bytearray) -- recognized here via a tobytes() method, which is all
	Grail's array.array stub offers (test_int.py:
	int(array.array('B', b'100')) == 100)."
	((obj @env0:class @env0:whichClassIncludesSelector: #tobytes environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___parseIntFromBytes___: obj tobytes original: obj
	].

	"Otherwise, error"
	TypeError ___signal___: 'int() argument must be a string or a number'
%

category: 'Grail-Initialization'
classmethod: int
___coerceIntResult___: result from: dunderName
	"CPython's int()/index() protocol: __int__/__index__ must return an
	int.  A bool IS technically an int subclass, so it's accepted --
	but as a non-exact-int return it is DEPRECATED (warns, then coerces
	to plain 0/1); anything else raises TypeError.  ``dunderName`` names
	the dunder actually consulted, matching CPython's exact wording
	(test_int.py's test_int_returns_int_subclass / test_int_subclass_with_int)."

	| warningsMod |
	(result isKindOf: int) ifTrue: [^ result].
	(result == true or: [result == false]) ifTrue: [
		warningsMod := (importlib @env1:modules) @env0:at: #warnings ifAbsent: [nil].
		warningsMod ifNotNil: [
			warningsMod warn: (dunderName @env0:,
				' returned non-int (type bool).  The ability to return an instance of '
				@env0:, 'a strict subclass of int is deprecated, and may be removed in a future '
				@env0:, 'version of Python.')
				_: DeprecationWarning].
		^ result == true ifTrue: [1] ifFalse: [0]].
	TypeError ___signal___: (dunderName @env0:, ' returned non-int (type '
		@env0:, result @env0:class @env0:name @env0:asString @env0:, ')')
%

category: 'Grail-Initialization'
classmethod: int
___parseIntFromBytes___: byteObj original: original
	"Shared base-10 parse for any ByteArray-shaped value -- interpret
	each byte as its ASCII character (Python bytes([codepoint, ...])
	semantics), then reuse the string parser.  ``original`` is the
	value CPython would show in an invalid-literal error (the actual
	bytes/array/etc argument, not an intermediate)."

	| str |
	str := String @env0:new: byteObj @env0:size.
	1 @env0:to: byteObj @env0:size do: [:i |
		str @env0:at: i put: (Character @env0:codePoint: (byteObj @env0:at: i))
	].
	self ___checkStrDigitLimit___: str.
	^ [self ___parseInt: (str @env0:trimBoth: [:c | c @env0:unicodeIsWhitespace]) radix: 10]
		@env0:on: Error
		do: [:ex | self ___invalidLiteral___: original base: 10]
%

category: 'Grail-Initialization'
classmethod: int
___invalidLiteral___: obj base: baseInt
	"Raise the exact ValueError CPython raises for an unparseable
	int(obj[, base]) literal: 'invalid literal for int() with base N:
	REPR(obj)' -- REPR is the ORIGINAL (untrimmed) obj's Python repr,
	matching test_int.py's test_error_message which asserts on
	exception.args[0] verbatim."

	ValueError ___signal___: ('invalid literal for int() with base ' @env0:,
		baseInt @env0:printString @env0:,
		': ' @env0:,
		(obj __repr__))
%

category: 'Grail-Initialization'
classmethod: int
___checkStrDigitLimit___: aString
	"Enforce CPython's integer string conversion length limit
	(sys.set_int_max_str_digits, CVE-2020-10735): raise ValueError when the
	number of decimal digits in aString exceeds the per-session limit
	(default 4300; 0 disables the check).  Only digit characters count --
	sign, whitespace, underscores and a radix point do not, matching how
	CPython measures the value's length."

	| limit count |
	limit := (SessionTemps @env0:current) @env0:at: #GrailIntMaxStrDigits ifAbsent: [4300].
	(limit @env0:= 0) ifTrue: [^ self].
	count := 0.
	aString @env0:do: [:c | (c @env0:isDigit) ifTrue: [count := count @env0:+ 1]].
	(count @env0:> limit) ifTrue: [
		ValueError ___signal___: ('Exceeds the limit (' @env0:,
			limit @env0:printString @env0:,
			' digits) for integer string conversion: value has ' @env0:,
			count @env0:printString @env0:,
			' digits; use sys.set_int_max_str_digits() to increase the limit')]
%

category: 'Grail-Initialization'
classmethod: int
__new__: obj _: base
	"Create a new int instance from a string with a given base.
	In Python: int(obj, base)"

	| str baseInt |
	"base must be an integer -- or an object implementing __index__
	(PEP 357), e.g. a class with a plain __index__ method, coerced the
	same way the arithmetic dunders above fall back to __index__ for a
	non-int operand (test_int.py: int('101', base=MyIndexable(2)))."
	baseInt := (base isKindOf: int)
		ifTrue: [base]
		ifFalse: [
			((base @env0:class @env0:whichClassIncludesSelector: #__index__ environmentId: 1) @env0:notNil)
				ifTrue: [base __index__]
				ifFalse: [TypeError ___signal___: 'int() base must be an integer']].

	"base must be 0 or 2-36"
	((baseInt == 0) not and: [
		(baseInt @env0:< 2) or: [
			baseInt @env0:> 36
		]
	]) ifTrue: [
		ValueError ___signal___: 'int() base must be >= 2 and <= 36, or 0'
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
			TypeError ___signal___: 'int() can''t convert non-string with explicit base'
		]
	].

	str := str @env0:trimBoth: [:c | c @env0:unicodeIsWhitespace].

	"sys.set_int_max_str_digits digit-limit check -- CPython exempts
	power-of-2 bases (2, 4, 8, 16, 32) since conversion for those is
	linear, never quadratic (test_int.py test_power_of_two_bases_unlimited).
	Every other base, including plain decimal 10, is checked."
	((baseInt @env0:= 2) or: [(baseInt @env0:= 4) or: [(baseInt @env0:= 8)
		or: [(baseInt @env0:= 16) or: [baseInt @env0:= 32]]]]) ifFalse: [
		self ___checkStrDigitLimit___: str].

	"Parse the string with the given base.  GemStone has no public
	radix-aware Integer parser (only ``fromString:`` for base 10 and
	``fromHexString:`` for base 16), so for the other bases we walk
	the digits ourselves — same routine handles negative + ``+``
	prefixes and Python's ``0b``/``0o``/``0x`` discriminators."
	^ [self ___parseInt: str radix: baseInt
	] @env0:on: Error do: [:ex |
		self ___invalidLiteral___: obj base: baseInt
	]
%

category: 'Grail-Initialization'
classmethod: int
___parseInt: aString radix: baseInt
	"Parse aString as an integer in the given base.  baseInt = 0
	means infer from prefix (``0b`` / ``0o`` / ``0x``) and fall back
	to base 10.  Raises if the result has no digits, contains a
	non-digit for the chosen base, has a misplaced underscore (PEP
	515: an underscore must sit strictly between two digits, one
	allowed right after a recognized 0b/0o/0x prefix — never
	leading/trailing/doubled), or — base 0 only, no recognized prefix
	matched — is old-style-octal-ambiguous (a leading ``0`` followed
	by any nonzero digit, e.g. ``07``; CPython 3 disallows this for
	base 0 even though the bare int() constructor otherwise tolerates
	leading zeros)."

	| chars sign idx effectiveBase result digitChars ch d pfxChar hadPrefix digitStart |
	chars := aString.
	idx := 1.
	sign := 1.
	hadPrefix := false.
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
				pfxChar @env0:= $b ifTrue: [effectiveBase := 2. idx := idx @env0:+ 2. hadPrefix := true].
				pfxChar @env0:= $o ifTrue: [effectiveBase := 8. idx := idx @env0:+ 2. hadPrefix := true].
				pfxChar @env0:= $x ifTrue: [effectiveBase := 16. idx := idx @env0:+ 2. hadPrefix := true].
			].
		].
	].
	(baseInt @env0:= 0 and: [hadPrefix @env0:not and: [(idx @env0:<= chars @env0:size) and: [(chars @env0:at: idx) @env0:= $0]]]) ifTrue: [
		(idx @env0:+ 1) @env0:to: chars @env0:size do: [:i |
			| c |
			c := chars @env0:at: i.
			((c @env0:= $0) or: [c @env0:= $_]) ifFalse: [^ self @env0:error: 'invalid old-style octal'].
		].
	].
	effectiveBase @env0:= 0 ifTrue: [effectiveBase := 10].
	digitChars := '0123456789abcdefghijklmnopqrstuvwxyz' @env0:copyFrom: 1 to: effectiveBase.
	(idx @env0:> chars @env0:size) ifTrue: [
		^ self @env0:error: 'no digits'
	].
	digitStart := idx.
	result := 0.
	[idx @env0:<= chars @env0:size] @env0:whileTrue: [
		ch := chars @env0:at: idx.
		(ch @env0:= $_) ifTrue: [
			"PEP 515: underscore must sit strictly between two digits --
			never trailing, never doubled, and never leading unless right
			after a recognized 0b/0o/0x prefix."
			(idx @env0:= chars @env0:size) ifTrue: [^ self @env0:error: 'trailing underscore'].
			(idx @env0:= digitStart)
				ifTrue: [hadPrefix ifFalse: [^ self @env0:error: 'leading underscore']]
				ifFalse: [((chars @env0:at: idx @env0:- 1) @env0:= $_) ifTrue: [^ self @env0:error: 'doubled underscore']].
		] ifFalse: [
			d := ch @env0:digitValue.
			d @env0:isNil ifTrue: [
				d := digitChars @env0:indexOf: ch @env0:asLowercase.
				(d @env0:= 0) ifTrue: [^ self @env0:error: 'bad digit'].
				d := d @env0:- 1.
			].
			(d @env0:>= effectiveBase) ifTrue: [^ self @env0:error: 'bad digit'].
			result := (result @env0:* effectiveBase) @env0:+ d.
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
		TypeError ___signal___: 'from_bytes() argument must be bytes-like'
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

	| refOwner |
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
	"A Python object carrying its OWN __eq__ (Fraction/Decimal/user Rational)
	compares via CPython's reflected ==: defer to it rather than answering
	false, so ``2 == Fraction(4, 2)`` is True (mirrors Float>>__eq__).  A plain
	object with only the inherited identity __eq__ keeps the false answer."
	(other isKindOf: PythonInstance) ifTrue: [
		refOwner := other @env0:class @env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			^ other @env0:perform: #'__eq__:' env: 1 withArguments: { self }]].
	^ false
%

category: 'Grail-Conversion'
method: int
__float__
	"Convert to float.  An integer whose magnitude exceeds the double range
	coerces to an IEEE infinity in GemStone; CPython raises OverflowError
	instead (test_fractions' testConversions checks float(int('2'*400+'7')))."

	| f |
	f := self @env0:asFloat.
	(f @env0:_getKind @env0:== 3) ifTrue: [
		OverflowError ___signal___: 'int too large to convert to float'].
	^ f
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
	"CPython numeric hash: n mod (2^61-1), with the sign carried and the
	-1 -> -2 special case.  For |n| < the modulus this equals n (so small-int
	hashing and hash(int)==hash(float)==hash(Fraction) consistency are
	unchanged), but GemStone's Smalltalk hash COLLIDES for large integers --
	e.g. hash(10**23) and hash(int(float(10**23))) came out equal, breaking
	test_fractions testHash's ``hash(float(10**23)) != hash(F(10**23))''."

	| p h |
	p := 2305843009213693951.   "2^61 - 1 (sys.hash_info.modulus on 64-bit)"
	h := (self @env0:abs) @env0:\\ p.
	(self @env0:< 0) ifTrue: [h := h @env0:negated].
	(h @env0:= -1) ifTrue: [^ -2].
	^ h
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

	(other isKindOf: Integer) ifTrue: [
		(other @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
		^ self @env0:bitShift: other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [ | idx |
		idx := other __index__.
		(idx @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
		^ self @env0:bitShift: idx].
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
	"Return self != other.  Delegates to __eq__: (not a raw native ~=)
	so it shares its __index__/complex/PythonInstance fallback logic --
	a bare @env0:~= disagreed with __eq__: for e.g. 0 != False (Boolean
	has an __index__, so __eq__: finds them equal via that path, but
	native ~= just sees an Integer and a Boolean as unrelated types and
	always answers 'not equal') (test_re.py's test_case_helpers)."

	^ (self __eq__: other) @env0:not
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
		^ [ | r |
			r := self @env0:raisedTo: other.
			"Python: int ** a NEGATIVE int is a float (``4 ** -3`` == 0.015625),
			not an exact Fraction; positive-int and float exponents keep the
			GemStone result (int / float respectively)."
			((other @env0:isKindOf: Integer) and: [other @env0:< 0])
				ifTrue: [r @env0:asFloat] ifFalse: [r] ]
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

	self ___checkIntStrDigitLimit___.
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

	(self @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
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

	(self @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
	(other isKindOf: Integer) ifTrue: [^ other @env0:bitShift: (self @env0:negated)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (other __index__) @env0:bitShift: (self @env0:negated)].
	^ self ___rbinOpFallback___: other op: '>>'
%

category: 'Grail-Bitwise Operations'
method: int
__rshift__: other
	"Right shift."

	(other isKindOf: Integer) ifTrue: [
		(other @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
		^ self @env0:bitShift: (other @env0:negated)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [ | idx |
		idx := other __index__.
		(idx @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
		^ self @env0:bitShift: (idx @env0:negated)].
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
	"Reverse true division (other / self).  As with __truediv__, int/int is
	float division (self is the divisor here)."
	"Reverse form: other OP self -- self is the divisor."
	(self @env0:= 0) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Integer) ifTrue: [^ other ___intTrueDivFloat___: self].
	(other isKindOf: Number) ifTrue: [^ other @env0:/ self].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ (other __index__) ___intTrueDivFloat___: self].
	^ self ___rbinOpFallback___: other op: '/'
%

category: 'Grail-Arithmetic'
method: int
___intTrueDivFloat___: other
	"int/int true division: the exact rational quotient rounded to the
	nearest float (GemStone Fraction>>asFloat is correctly rounded).  A
	finite quotient too large for the float range raises OverflowError,
	matching CPython's 'integer division result too large for a float'."

	| f |
	f := [(self @env0:/ other) @env0:asFloat] @env0:on: Error do: [:ex |
		OverflowError ___signal___: 'integer division result too large for a float'].
	((f @env0:_getKind) @env0:== 3) ifTrue: [
		OverflowError ___signal___: 'integer division result too large for a float'].
	^ f
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

	self ___checkIntStrDigitLimit___.
	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Grail-String Representation'
method: int
___checkIntStrDigitLimit___
	"Enforce sys.set_int_max_str_digits (CVE-2020-10735) for int-to-str
	conversion (str(i)/repr(i)) -- the str-from-int counterpart of the
	class-side ___checkStrDigitLimit___: used for int(str).  CPython
	pre-checks via bit-length to dodge its OWN quadratic conversion;
	GemStone's Integer>>printString is not quadratic and LargeInteger is
	capped at ~130144 bits regardless, so a plain post-hoc digit count
	is both correct and cheap here."

	| limit count |
	limit := (SessionTemps @env0:current) @env0:at: #GrailIntMaxStrDigits ifAbsent: [4300].
	(limit @env0:= 0) ifTrue: [^ self].
	count := self @env0:abs @env0:printString @env0:size.
	(count @env0:> limit) ifTrue: [
		ValueError ___signal___: ('Exceeds the limit (' @env0:,
			limit @env0:printString @env0:,
			' digits) for integer string conversion: value has ' @env0:,
			count @env0:printString @env0:,
			' digits; use sys.set_int_max_str_digits() to increase the limit')]
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
	"True division.  CPython's `/` is ALWAYS float division: int/int yields
	a float (the exact quotient rounded to nearest), NOT an exact rational.
	Only int/int is coerced here; int/float already gives a float and
	int/<GemStone Fraction> keeps its (pre-existing) exact result."
	"CPython: division/modulo by zero raises catchable ZeroDivisionError;
	the kernel ZeroDivide is uncatchable."
	((other isKindOf: Number) and: [other @env0:= 0]) ifTrue: [
		ZeroDivisionError ___signal___: 'integer division or modulo by zero'].

	(other isKindOf: Integer) ifTrue: [^ self ___intTrueDivFloat___: other].
	(other isKindOf: Number) ifTrue: [^ self @env0:/ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self ___intTrueDivFloat___: (other __index__)].
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
			OverflowError ___signal___: 'can''t convert negative int to unsigned'
		].
		"Two's complement"
		val := ((1 @env0:bitShift: (numBytes @env0:* 8))
			@env0:+ val).
	].

	"Check if value fits in the given number of bytes"
	((val @env0:< 0) or: [
		val @env0:>= (1 @env0:bitShift: (numBytes @env0:* 8))
	]) ifTrue: [
		OverflowError ___signal___: 'int too big to convert'
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
