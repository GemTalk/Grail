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
_new: positional kw: kwargs
	"Kwargs constructor entry: float(x) -- the generic class-call
	(Object class>>value:value:) forwards keyword calls here.
	CPython's float() takes NO keyword arguments at all (unlike int(),
	which at least has 'base')."

	(kwargs @env0:notNil and: [kwargs @env0:notEmpty]) ifTrue: [
		TypeError ___signal___: 'float() takes no keyword arguments'
	].
	(positional @env0:isEmpty) ifTrue: [^ self __new__].
	(positional @env0:size @env0:= 1) ifTrue: [^ self __new__: (positional @env0:at: 1)].
	TypeError ___signal___: ('float expected at most 1 argument, got '
		@env0:, positional @env0:size @env0:printString)
%

category: 'Grail-Initialization'
classmethod: float
__new__: obj
	"Create a new float instance from an object.
	In Python: float(obj) or float.__new__(float, obj)"

	obj ifNil: [ ^ 0.0 ].

	"If already a float, return it"
	(obj isKindOf: float) ifTrue: [
		^ obj
	].

	"Try __float__ (varargs form first, mirroring int's __int__ probe --
	a vendored Fraction-shaped __float__ can carry defaulted params)."
	((obj @env0:class @env0:whichClassIncludesSelector: #'___float__:kw:' environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___coerceFloatResult___: (obj ___float__: { } kw: nil) from: '__float__'
	].
	((obj @env0:class @env0:whichClassIncludesSelector: #__float__ environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___coerceFloatResult___: obj __float__ from: '__float__'
	].

	"Try to convert from integer"
	(obj isKindOf: Integer) ifTrue: [
		^ self ___intToFloatChecked___: obj
	].

	"No __float__: fall back to __index__ (PEP 357), same as int()
	(test_float.py: float(MyIndex(42)) == 42.0, and MyIndex(2**2000)
	must OverflowError just like a literal 2**2000 would)."
	((obj @env0:class @env0:whichClassIncludesSelector: #__index__ environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___intToFloatChecked___: obj __index__
	].

	"Try to convert from string"
	(obj isKindOf: CharacterCollection) ifTrue: [
		^ self ___newFromString___: obj
	].

	"Bytes-like objects parse the same as the equivalent str (test_float.py
	test_non_numeric_input_types, test_float_memoryview) -- but see
	___newFromBytes___:original: for why the whitespace rule differs."
	(obj isKindOf: ByteArray) ifTrue: [
		^ self ___newFromBytes___: obj original: obj
	].

	"Any other buffer-protocol-like object (array.array's tobytes stub;
	see Int.gs's twin fallback)."
	((obj @env0:class @env0:whichClassIncludesSelector: #tobytes environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___newFromBytes___: obj tobytes original: obj
	].

	"Otherwise, error"
	TypeError ___signal___: ('float() argument must be a string or a real number, not '''
		@env0:, (self ___pyTypeNameFor___: obj) @env0:, '''')
%

category: 'Grail-Initialization'
classmethod: float
___intToFloatChecked___: anInteger
	"Integer -> Float, but raise (matching CPython) rather than silently
	overflow to Infinity when the integer is too large to represent."

	| result |
	result := anInteger @env0:asFloat.
	((result @env0:_getKind) @env0:== 3) ifTrue: [
		OverflowError ___signal___: 'int too large to convert to float'].
	^ result
%

category: 'Grail-Initialization'
classmethod: float
___pyTypeNameFor___: obj
	"Best-effort PYTHON-facing type name for an error message -- a few
	built-ins' Smalltalk class name doesn't match their Python name
	(PyDict -> dict); anything else falls back to the raw class name."

	| n |
	n := obj @env0:class @env0:name @env0:asString.
	(n @env0:= 'PyDict') ifTrue: [^ 'dict'].
	(n @env0:= 'OrderedCollection') ifTrue: [^ 'list'].
	^ n
%

category: 'Grail-Initialization'
classmethod: float
___coerceFloatResult___: result from: dunderName
	"CPython's float() protocol: __float__ must return a float.  A
	strict float SUBCLASS instance is accepted too but DEPRECATED
	(warns, then coerces to the plain wrapped value); anything else
	(including a plain int, e.g. Foo4.__float__ returning 42) is
	TypeError (test_float.py's test_floatconversion)."

	| warningsMod |
	(result isKindOf: float) ifTrue: [^ result].
	(result isKindOf: AbstractPyFloat) ifTrue: [
		warningsMod := (importlib @env1:modules) @env0:at: #warnings ifAbsent: [nil].
		warningsMod ifNotNil: [
			warningsMod warn: (dunderName @env0:,
				' returned non-float (type ' @env0:, (result @env0:class @env0:name @env0:asString)
				@env0:, ').  The ability to return an instance of a strict subclass of float '
				@env0:, 'is deprecated, and may be removed in a future version of Python.')
				_: DeprecationWarning].
		^ result @env0:value].
	TypeError ___signal___: (dunderName @env0:, ' returned non-float (type '
		@env0:, (self ___pyTypeNameFor___: result) @env0:, ')')
%

category: 'Grail-Initialization'
classmethod: float
___newFromString___: str
	"float(s) for a str -- CPython strips full Unicode whitespace here."

	^ self ___parseFloatBody___: (str @env0:trimBoth: [:c | c @env0:unicodeIsWhitespace]) original: str
%

category: 'Grail-Initialization'
classmethod: float
___newFromBytes___: byteObj original: original
	"float(b) for a bytes-like object.  Bytes are parsed byte-wise, NOT
	as Unicode text, so only ASCII whitespace is stripped here -- e.g.
	the byte 0xA0 is Unicode NBSP (a whitespace char) when it's part of
	a STR, but as a raw BYTE it must NOT be trimmed: float(b'123\xa0')
	raises ValueError while float('123\xa0') (a real NBSP character)
	returns 123.0 (verified against real CPython; test_float.py's
	test_error_message)."

	| str |
	str := String @env0:new: byteObj @env0:size.
	1 @env0:to: byteObj @env0:size do: [:i |
		str @env0:at: i put: (Character @env0:codePoint: (byteObj @env0:at: i))].
	^ self ___parseFloatBody___:
		(str @env0:trimBoth: [:c | (c @env0:asInteger @env0:== 32) @env0:or: [c @env0:asInteger @env0:between: 9 and: 13]])
		original: original
%

category: 'Grail-Initialization'
classmethod: float
___consumeDigitRun___: str from: startIdx into: ws
	"Consume a PEP 515 digit run (digit (['_'] digit)*) from str
	starting at startIdx, writing ASCII-normalized ('0'-'9') digits to
	ws -- any Unicode decimal digit is accepted per character, via
	Character>>digitValue, matching CPython's float('١٢٣.٤٥') support.
	Stops at the first character that is neither a digit nor an
	underscore (or at end of string) WITHOUT consuming it.  Signals
	(via self error:, caught by the caller) on a misplaced underscore --
	leading (first char of THIS run), trailing (last char of the whole
	string, or not immediately followed by a digit), or doubled --
	mirroring int's ___parseInt:radix:.  Returns {digitCount. nextIndex}."

	| i size count ch d |
	size := str @env0:size.
	i := startIdx.
	count := 0.
	[i @env0:<= size] @env0:whileTrue: [
		ch := str @env0:at: i.
		(ch @env0:== $_)
			ifTrue: [
				(i @env0:== startIdx) ifTrue: [self @env0:error: 'leading underscore'].
				((i @env0:+ 1) @env0:> size) ifTrue: [self @env0:error: 'trailing underscore'].
				(((str @env0:at: i @env0:+ 1) @env0:digitValue) @env0:isNil) ifTrue: [self @env0:error: 'bad underscore'].
				i := i @env0:+ 1]
			ifFalse: [
				d := ch @env0:digitValue.
				d @env0:isNil ifTrue: [^ Array @env0:with: count with: i].
				ws @env0:nextPut: (Character @env0:codePoint: 48 @env0:+ d).
				count := count @env0:+ 1.
				i := i @env0:+ 1]].
	^ Array @env0:with: count with: i
%

category: 'Grail-Initialization'
classmethod: float
___parseFloatBody___: trimmed original: original
	"Convert the (already whitespace-trimmed) body of a float()
	argument per CPython's float literal grammar:
	    sign? ( digitpart ['.' [digitpart]] | '.' digitpart )
	          [('e'|'E') sign? digitpart]
	    | sign? ('inf'|'infinity'|'nan')          (case-insensitive)
	where digitpart ::= digit (['_'] digit)*  (PEP 515).  Builds an
	ASCII-clean numeral (underscores stripped, digits normalized,
	always at least one digit on each side of a written '.') and hands
	it to the vendor reader for the actual IEEE-754 rounding -- rather
	than reimplementing decimal-to-double conversion, which
	``Number>>fromStream:'' already gets right for a well-formed
	ASCII numeral."

	| idx size sign lower ws r1 r2 r3 intCount fracCount expCount hasDot cleaned |
	^ [ | v |
		size := trimmed @env0:size.
		(size @env0:== 0) ifTrue: [self @env0:error: 'empty'].
		idx := 1.
		sign := 1.
		((trimmed @env0:at: 1) @env0:== $-) ifTrue: [sign := -1. idx := 2].
		((trimmed @env0:at: 1) @env0:== $+) ifTrue: [idx := 2].
		(idx @env0:> size) ifTrue: [self @env0:error: 'sign only'].
		lower := (trimmed @env0:copyFrom: idx to: size) @env0:asLowercase.
		(lower @env0:= 'inf' or: [lower @env0:= 'infinity']) ifTrue: [
			^ sign @env0:> 0 ifTrue: [PlusInfinity] ifFalse: [MinusInfinity]].
		(lower @env0:= 'nan') ifTrue: [
			^ sign @env0:> 0 ifTrue: [PlusQuietNaN] ifFalse: [MinusQuietNaN]].

		ws := WriteStream @env0:on: String @env0:new.
		r1 := self ___consumeDigitRun___: trimmed from: idx into: ws.
		intCount := r1 @env0:at: 1. idx := r1 @env0:at: 2.
		(intCount @env0:== 0) ifTrue: [ws @env0:nextPut: $0].
		hasDot := false. fracCount := 0.
		((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $.]) ifTrue: [
			hasDot := true.
			ws @env0:nextPut: $..
			idx := idx @env0:+ 1.
			r2 := self ___consumeDigitRun___: trimmed from: idx into: ws.
			fracCount := r2 @env0:at: 1. idx := r2 @env0:at: 2.
			(fracCount @env0:== 0) ifTrue: [ws @env0:nextPut: $0]].
		(intCount @env0:== 0) ifTrue: [
			(hasDot @env0:and: [fracCount @env0:> 0]) ifFalse: [self @env0:error: 'no digits']].
		expCount := 0.
		((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:asLowercase @env0:== $e]) ifTrue: [
			ws @env0:nextPut: $e.
			idx := idx @env0:+ 1.
			((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $-])
				ifTrue: [ws @env0:nextPut: $-. idx := idx @env0:+ 1]
				ifFalse: [((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $+]) ifTrue: [idx := idx @env0:+ 1]].
			r3 := self ___consumeDigitRun___: trimmed from: idx into: ws.
			expCount := r3 @env0:at: 1. idx := r3 @env0:at: 2.
			(expCount @env0:== 0) ifTrue: [self @env0:error: 'bad exponent']].
		(idx @env0:<= size) ifTrue: [self @env0:error: 'trailing garbage'].
		cleaned := ws @env0:contents.
		sign @env0:< 0 ifTrue: [cleaned := '-' @env0:, cleaned].
		v := (Number @env0:fromStream: (ReadStreamPortable @env0:on: cleaned)) @env0:asFloat.
		v
	] @env0:on: Error do: [:ex | ValueError ___signal___: ('could not convert string to float: ' @env0:, (original __repr__))]
%

category: 'Grail-Class Methods'
classmethod: float
fromhex: hexString
	"CPython's float.fromhex is usable on a subclass too, and -- like
	calling the subclass directly -- runs the parsed value through the
	subclass's own __new__/__init__ (test_float.py's HexFloatTestCase
	test_subclass: ``class F(float): def __new__(cls, v): return
	float.__new__(cls, v + 1)''; F.fromhex(...) must add 1 too)."

	| v |
	v := self ___parseHex___: hexString.
	self @env0:== float ifTrue: [^ v].
	^ self value: (Array @env0:with: v) value: nil
%

category: 'Grail-Class Methods'
classmethod: float
___asciiDigitValue___: ch radix: radix
	"Strict ASCII-only digit value in [0, radix), nil otherwise --
	float.fromhex is ASCII-only throughout (mantissa hex digits AND
	the decimal exponent), unlike float()'s decimal literal parser
	(___consumeDigitRun___:from:into:), which deliberately accepts any
	Unicode decimal digit.  fromhex must NOT (test_invalid_inputs:
	fullwidth Unicode digits are rejected, e.g. '0x1p０')."

	| d |
	((ch @env0:>= $0) and: [ch @env0:<= $9])
		ifTrue: [d := ch @env0:asInteger @env0:- $0 @env0:asInteger]
		ifFalse: [
			((ch @env0:>= $a) and: [ch @env0:<= $f])
				ifTrue: [d := (ch @env0:asInteger @env0:- $a @env0:asInteger) @env0:+ 10]
				ifFalse: [
					((ch @env0:>= $A) and: [ch @env0:<= $F])
						ifTrue: [d := (ch @env0:asInteger @env0:- $A @env0:asInteger) @env0:+ 10]
						ifFalse: [^ nil]]].
	(d @env0:>= radix) ifTrue: [^ nil].
	^ d
%

category: 'Grail-Type Conversion'
classmethod: float
___consumeAsciiDigitRun___: str from: startIdx into: ws radix: radix
	"Consume a run of plain ASCII digits (radix 10 or 16 -- no PEP 515
	underscores, float.fromhex has none) starting at startIdx, writing
	them verbatim to ws.  Returns {digitCount. nextIndex}; stops
	(without erroring) at the first non-matching character, same
	contract as ___consumeDigitRun___:from:into: but without the
	underscore handling."

	| i size count |
	size := str @env0:size.
	i := startIdx.
	count := 0.
	[(i @env0:<= size) and: [(self ___asciiDigitValue___: (str @env0:at: i) radix: radix) @env0:notNil]] @env0:whileTrue: [
		ws @env0:nextPut: (str @env0:at: i).
		count := count @env0:+ 1.
		i := i @env0:+ 1].
	^ Array @env0:with: count with: i
%

category: 'Grail-Type Conversion'
classmethod: float
___parseHex___: hexString
	"Create a float from a hexadecimal string (CPython float.fromhex):
	    sign? ( '0x' hexdigit* ['.' hexdigit*] ['p'|'P' sign? decdigit+]
	          | 'inf' | 'infinity' | 'nan' )               (case-insensitive)
	ASCII-only throughout, no PEP 515 underscores, and NO internal
	whitespace anywhere (only the string's outer ends are trimmed) --
	a single left-to-right scan (mirroring ___parseFloatBody___:) is
	what makes rejecting all of that free: any unconsumed character
	anywhere just falls out as 'trailing garbage' at the end.  All the
	significant hex digits are gathered into one integer M with a
	count f of fractional digits; the value is then the EXACT rational
	M * 2**(p - 4f), converted through Fraction/Integer asFloat so the
	final rounding is correct (round-half-even).  A magnitude beyond
	the float range is an OverflowError, matching CPython."

	| trimmed idx size sign lower mant intCount fracCount hasDot binExp expIdx expSign r1 r2 r3 m fracLen shift mag |
	trimmed := hexString @env0:trimBoth.
	^ [ | v |
		size := trimmed @env0:size.
		(size @env0:== 0) ifTrue: [self @env0:error: 'invalid hexadecimal floating-point string'].
		idx := 1.
		sign := 1.
		((trimmed @env0:at: 1) @env0:== $-) ifTrue: [sign := -1. idx := 2].
		((trimmed @env0:at: 1) @env0:== $+) ifTrue: [idx := 2].
		(idx @env0:> size) ifTrue: [self @env0:error: 'invalid hexadecimal floating-point string'].
		lower := (trimmed @env0:copyFrom: idx to: size) @env0:asLowercase.
		(lower @env0:= 'inf' or: [lower @env0:= 'infinity']) ifTrue: [
			^ sign @env0:> 0 ifTrue: [PlusInfinity] ifFalse: [MinusInfinity]].
		(lower @env0:= 'nan') ifTrue: [^ PlusQuietNaN].

		"The '0x'/'0X' prefix is OPTIONAL (float.fromhex('1') == 1.0,
		no leading 0x needed) -- consume it only when it's actually
		there; otherwise fall straight into digit parsing below."
		(((idx @env0:+ 1) @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $0
			and: [((trimmed @env0:at: idx @env0:+ 1) @env0:asLowercase) @env0:== $x]])
			ifTrue: [idx := idx @env0:+ 2].

		mant := WriteStream @env0:on: String @env0:new.
		r1 := self ___consumeAsciiDigitRun___: trimmed from: idx into: mant radix: 16.
		intCount := r1 @env0:at: 1. idx := r1 @env0:at: 2.
		hasDot := false. fracCount := 0.
		((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $.]) ifTrue: [
			hasDot := true.
			idx := idx @env0:+ 1.
			r2 := self ___consumeAsciiDigitRun___: trimmed from: idx into: mant radix: 16.
			fracCount := r2 @env0:at: 1. idx := r2 @env0:at: 2].
		((intCount @env0:+ fracCount) @env0:== 0) ifTrue: [self @env0:error: 'invalid hexadecimal floating-point string'].

		binExp := 0.
		((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:asLowercase @env0:== $p]) ifTrue: [
			idx := idx @env0:+ 1.
			expSign := 1.
			((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $-])
				ifTrue: [expSign := -1. idx := idx @env0:+ 1]
				ifFalse: [((idx @env0:<= size) and: [(trimmed @env0:at: idx) @env0:== $+]) ifTrue: [idx := idx @env0:+ 1]].
			expIdx := idx.
			r3 := self ___consumeAsciiDigitRun___: trimmed from: idx into: (WriteStream @env0:on: String @env0:new) radix: 10.
			((r3 @env0:at: 1) @env0:== 0) ifTrue: [self @env0:error: 'invalid hexadecimal floating-point string'].
			idx := r3 @env0:at: 2.
			binExp := expSign @env0:* ((trimmed @env0:copyFrom: expIdx to: idx @env0:- 1) @env0:asInteger)].
		(idx @env0:<= size) ifTrue: [self @env0:error: 'invalid hexadecimal floating-point string'].

		m := (mant @env0:contents) @env0:isEmpty ifTrue: [0] ifFalse: [self ___parseHexInt___: mant @env0:contents].
		m @env0:== 0 ifTrue: [^ sign @env0:> 0 ifTrue: [0.0] ifFalse: [0.0 @env0:negated]].
		shift := binExp @env0:- (4 @env0:* fracCount).
		"An exponent letter ('p') accepts arbitrarily many decimal digits
		(test_from_hex: '0X1p123456789123456789' must OverflowError, not
		hang/crash) -- a shift this far outside the double range decides
		the outcome on its own, well before ``2 raisedTo: shift'' would
		ever approach GemStone's ~130144-bit LargeInteger ceiling, so
		short-circuit rather than ever computing that power."
		(shift @env0:> 2000) ifTrue: [
			OverflowError ___signal___: 'hexadecimal value too large to represent as a float'].
		(shift @env0:< -2000) ifTrue: [^ sign @env0:> 0 ifTrue: [0.0] ifFalse: [0.0 @env0:negated]].
		mag := shift @env0:>= 0
			ifTrue: [(m @env0:* (2 @env0:raisedTo: shift)) @env0:asFloat]
			ifFalse: [(m @env0:/ (2 @env0:raisedTo: shift @env0:negated)) @env0:asFloat].
		((mag @env0:_getKind) @env0:== 3) ifTrue: [
			OverflowError ___signal___: 'hexadecimal value too large to represent as a float'].
		v := sign @env0:> 0 ifTrue: [mag] ifFalse: [mag @env0:negated].
		v
	] @env0:on: Error do: [:ex |
		(ex isKindOf: OverflowError) ifTrue: [ex @env0:pass].
		ValueError ___signal___: 'invalid hexadecimal floating-point string'
	]
%

category: 'Grail-Class Methods'
classmethod: float
from_number
	"float.from_number() with no argument -- CPython raises TypeError
	rather than defaulting to 0.0 the way float() does."

	TypeError ___signal___: 'from_number() missing required argument: ''x'' (pos 1)'
%

category: 'Grail-Class Methods'
classmethod: float
from_number: obj
	"CPython 3.14's float.from_number(x): a STRICTLY NUMERIC variant of
	float(x) -- accepts a float, an int, or anything with __float__/
	__index__, but (unlike float(x)) rejects str/bytes outright.  Usable
	on a subclass (Cls.from_number(x) returns a Cls instance) the same
	way the plain constructor is."

	| v |
	v := float ___fromNumberValue___: obj.
	self @env0:== float ifTrue: [^ v].
	^ self value: (Array @env0:with: v) value: nil
%

category: 'Grail-Class Methods'
classmethod: float
___fromNumberValue___: obj
	"Shared plain-float extraction for from_number: -- usable by both
	float itself and AbstractPyFloat subclasses, which delegate here
	instead of duplicating the numeric-only rules."

	(obj isKindOf: float) ifTrue: [^ obj].
	((obj @env0:class @env0:whichClassIncludesSelector: #'___float__:kw:' environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___coerceFloatResult___: (obj ___float__: { } kw: nil) from: '__float__'
	].
	((obj @env0:class @env0:whichClassIncludesSelector: #__float__ environmentId: 1) @env0:notNil) ifTrue: [
		^ self ___coerceFloatResult___: obj __float__ from: '__float__'
	].
	(obj isKindOf: Integer) ifTrue: [^ obj @env0:asFloat].
	((obj @env0:class @env0:whichClassIncludesSelector: #__index__ environmentId: 1) @env0:notNil) ifTrue: [
		^ (obj __index__) @env0:asFloat
	].
	TypeError ___signal___: ('must be real number, not '
		@env0:, (self ___pyTypeNameFor___: obj))
%

category: 'Grail-Class Methods'
classmethod: float
__getformat__: typestr
	"float.__getformat__('double'|'float') -- Grail always runs on an
	IEEE-754 host, so both report the platform's native byte order
	(GemStone/the underlying hardware is little-endian on every
	platform Grail currently supports; a genuinely portable answer
	would need a runtime endianness probe, not worth it for a
	diagnostic-only classmethod)."

	(typestr isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: '__getformat__() argument must be str, not '
			@env0:, (self ___pyTypeNameFor___: typestr)].
	((typestr @env0:= 'double') @env0:or: [typestr @env0:= 'float']) ifFalse: [
		ValueError ___signal___: ('__getformat__() argument 1 must be ''double'' or '
			@env0:, '''float''')].
	^ 'IEEE, little-endian' @env0:asUnicodeString
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
	"Return ceiling (smallest integer >= self).  NaN/Infinity have no
	integer ceiling -- CPython raises ValueError/OverflowError rather
	than let a NaN/inf SmallDouble>>ceiling do something ill-defined
	(test_float.py's test_float_ceil)."

	| kind |
	kind := self @env0:_getKind.
	(kind @env0:> 4) ifTrue: [ValueError ___signal___: 'cannot convert float NaN to integer'].
	(kind @env0:== 3) ifTrue: [OverflowError ___signal___: 'cannot convert float infinity to integer'].
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
	"Return floor (largest integer <= self).  NaN/Infinity have no
	integer floor -- see __ceil__'s twin guard."

	| kind |
	kind := self @env0:_getKind.
	(kind @env0:> 4) ifTrue: [ValueError ___signal___: 'cannot convert float NaN to integer'].
	(kind @env0:== 3) ifTrue: [OverflowError ___signal___: 'cannot convert float infinity to integer'].
	^ self @env0:floor
%

category: 'Grail-Arithmetic'
method: float
__floordiv__: other
	"Floor division.  Python ``float // x'' always yields a FLOAT (``0.1 //
	1.0'' is 0.0, not 0) -- GemStone's // answers an Integer, so coerce."

	(other isKindOf: Number) ifTrue: [
		(other @env0:= 0) ifTrue: [
			ZeroDivisionError ___signal___: 'float floor division by zero'].
		^ (self @env0:// other) @env0:asFloat].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ (self @env0:// (other __index__)) @env0:asFloat].
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
	"Modulo operation.  Python float % takes the divisor's sign; an INFINITE
	divisor returns self (finite self same-signed as inf) or the infinity
	(opposite sign) -- fmod(self, inf)=self then CPython's sign-adjust -- where
	GemStone's \\ yields NaN."

	| result |
	(other isKindOf: Number) ifTrue: [
		((other @env0:isKindOf: Float) and: [(other @env0:_getKind) @env0:== 3]) ifTrue: [
			| mod |
			mod := self.
			((mod @env0:~= 0) and: [(other @env0:< 0) @env0:~= (mod @env0:< 0)])
				ifTrue: [mod := mod @env0:+ other].
			^ mod @env0:asFloat].
		result := self @env0:\\ other.
		"GemStone's \\ doesn't reliably produce a divisor-SIGNED zero the
		way Python's float % always does (e.g. -0.0 \\ 1.0 comes back
		-0.0, and 1.0 \\ -1.0 comes back +0.0, both wrong) -- force the
		sign explicitly whenever the mathematical result is zero
		(test_float.py's test_float_mod)."
		(result @env0:= 0.0) ifTrue: [
			^ (other @env0:signBit) @env0:== 1 ifTrue: [0.0 @env0:negated] ifFalse: [0.0]].
		^ result].
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
	"Raise self to the power of other.  A FINITE NEGATIVE base to a
	FINITE non-integer power is COMPLEX in Python (``(-1.0) ** 0.5`` is
	~1j, not NaN): the angle of a negative real is pi, so the result
	is |self|**other * (cos + i*sin)(other*pi).  Both operands must be
	finite for this rule -- ``(-inf) ** -0.5`` is the real 0.0 and
	``pow(x, NAN)`` for any real x (including negative x) is the real
	NAN, neither goes through the complex branch (C99 F.9.4.4 special
	cases; test_float.py's test_float_pow: isnan(pow(-INF, NAN)) calls
	math.isnan() on the result, which raises TypeError on a complex)."

	(other isKindOf: Number) ifTrue: [
		"(+-0)**y is a ZeroDivisionError for y finite and negative
		(whatever its parity/integerness) -- GemStone's raisedTo:
		instead returns Infinity, matching C's pow() but not Python's
		explicit divide-by-zero guard (C99 F.9.4.4; test_float_pow)."
		((self @env0:= 0.0) and: [(other @env0:< 0)
			and: [(((other @env0:_getKind) @env0:== 3) or: [(other @env0:_getKind) @env0:> 4]) @env0:not]])
			ifTrue: [ZeroDivisionError ___signal___: '0.0 cannot be raised to a negative power'].
		((self @env0:< 0) and: [((self @env0:_getKind) @env0:<= 2)
			and: [(other @env0:isKindOf: Integer) @env0:not
			and: [(((other @env0:_getKind) @env0:== 3) or: [(other @env0:_getKind) @env0:> 4]) @env0:not
			and: [(other @env0:fractionPart) @env0:~= 0]]]]) ifTrue: [
				| mag angle |
				mag := (self @env0:abs) @env0:raisedTo: other.
				angle := other @env0:* (Float @env0:pi).
				^ complex __new__: (mag @env0:* (angle @env0:cos))
					_: (mag @env0:* (angle @env0:sin))].
		^ self @env0:raisedTo: other].
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
classmethod: float
___fixExponentSign___: str
	"GemStone's native Float>>printString omits the '+' on a POSITIVE
	scientific exponent ('1e16') where CPython's repr always shows an
	explicit sign ('1e+16'); negative exponents already agree ('1e-05'
	both sides).  Insert the missing '+' when present."

	| ePos |
	(str @env0:includes: $e) ifFalse: [^ str].
	ePos := str @env0:indexOf: $e.
	((ePos @env0:< str @env0:size) and: [(str @env0:at: ePos @env0:+ 1) @env0:~= $-])
		ifTrue: [^ (str @env0:copyFrom: 1 to: ePos) @env0:, '+'
			@env0:, (str @env0:copyFrom: ePos @env0:+ 1 to: str @env0:size)].
	^ str
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
	^ (float ___fixExponentSign___: str) @env0:asUnicodeString
%

category: 'Grail-Rounding'
method: float
__round__
	"Round to nearest integer.  NaN/Infinity have no integer rounding --
	CPython raises ValueError/OverflowError rather than a bogus result
	from an inf/nan SmallDouble>>rounded (test_float.py's test_inf_nan)."

	| kind |
	kind := self @env0:_getKind.
	(kind @env0:> 4) ifTrue: [ValueError ___signal___: 'cannot convert float NaN to integer'].
	(kind @env0:== 3) ifTrue: [OverflowError ___signal___: 'cannot convert float infinity to integer'].
	^ self @env0:rounded
%

category: 'Grail-Rounding'
method: float
__round__: ndigits
	"Round to n digits after decimal point.  Uses EXACT rational
	(Fraction) arithmetic throughout -- the previous ``multiply by
	10**ndigits, round, divide back'' approach introduces its OWN
	floating-point error in the multiply/divide steps, which is
	exactly why round(56294995342131.5, 3) came back
	56294995342131.51 instead of unchanged (test_previous_round_bugs).
	ndigits can be Python None (checked explicitly -- it is a distinct
	object, NOT Smalltalk nil, so ``ifNil:'' alone misses it and falls
	through to arithmetic on None, an ArgumentTypeError:
	test_None_ndigits) or an arbitrarily huge/negative int
	(test_large_n / test_small_n), which must NOT be handed to
	``10 raisedTo: ndigits'' directly -- that would try to build a
	10**(2**100)-sized integer, blowing GemStone's ~130144-bit
	LargeInteger ceiling."

	| kind fr num den scaledNum scaledDen q r resultFrac resultFloat neg nd |
	((ndigits @env0:== None) or: [ndigits @env0:isNil]) ifTrue: [^ self __round__].

	"ndigits must be an int (or __index__-able) REGARDLESS of self --
	even round(inf, 0.0) is a TypeError, not a no-op (test_inf_nan).
	nd (not the ndigits argument itself) carries the coerced value --
	GemStone does not allow assignment to a method argument."
	nd := ndigits.
	(nd @env0:isKindOf: Integer) ifFalse: [
		((nd @env0:class @env0:whichClassIncludesSelector: #__index__ environmentId: 1) @env0:notNil)
			ifTrue: [nd := nd __index__]
			ifFalse: [TypeError ___signal___: ('''' @env0:, (float ___pyTypeNameFor___: nd)
				@env0:, ''' object cannot be interpreted as an integer')]].

	kind := self @env0:_getKind.
	(kind @env0:== 3 or: [kind @env0:> 4]) ifTrue: [^ self]. "inf/nan: round(x, n) is a no-op"
	(self @env0:= 0.0) ifTrue: [^ self]. "+-0.0 unchanged regardless of n"

	"nd large enough that no double has that many significant
	fractional digits (the smallest subnormal is 2**-1074, i.e. never
	more than ~323 decimal fractional digits matter) -- self is
	returned untouched, matching CPython."
	(nd @env0:> 323) ifTrue: [^ self].
	"nd negative enough that even the LARGEST double (~1.8e308,
	309 integer digits) rounds to zero -- chosen with a wide safety
	margin below the boundary test_overflow actually exercises (-308,
	which must still go through the exact path below since it can
	OVERFLOW rather than zero for a value near DBL_MAX)."
	(nd @env0:< -400) ifTrue: [
		^ (self @env0:< 0) ifTrue: [0.0 @env0:negated] ifFalse: [0.0]].

	neg := self @env0:< 0.
	fr := self @env0:abs @env0:asFraction.
	num := fr @env0:numerator.
	den := fr @env0:denominator.
	nd @env0:>= 0
		ifTrue: [scaledNum := num @env0:* (10 @env0:raisedTo: nd). scaledDen := den]
		ifFalse: [scaledNum := num. scaledDen := den @env0:* (10 @env0:raisedTo: nd @env0:negated)].

	"round-half-to-even the exact rational scaledNum/scaledDen to an integer"
	q := scaledNum @env0:// scaledDen.
	r := scaledNum @env0:- (q @env0:* scaledDen).
	((r @env0:* 2) @env0:> scaledDen) ifTrue: [q := q @env0:+ 1]
		ifFalse: [((r @env0:* 2) @env0:= scaledDen) ifTrue: [(q @env0:even) ifFalse: [q := q @env0:+ 1]]].

	resultFrac := nd @env0:>= 0
		ifTrue: [q @env0:asFraction @env0:/ (10 @env0:raisedTo: nd)]
		ifFalse: [q @env0:* (10 @env0:raisedTo: nd @env0:negated)].
	resultFloat := resultFrac @env0:asFloat.
	((resultFloat @env0:_getKind) @env0:== 3) ifTrue: [
		OverflowError ___signal___: 'rounded value too large to represent'].
	^ neg ifTrue: [resultFloat @env0:negated] ifFalse: [resultFloat]
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
	^ (float ___fixExponentSign___: str) @env0:asUnicodeString
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

category: 'Grail-Hashing'
method: float
__hash__
	"CPython numeric hash for a finite double.  The value is exactly the
	dyadic rational numer/den (den a power of two), so its hash is
	(|numer| * inverse(den)) mod P with the sign of numer, P = 2**61 - 1
	(sys.hash_info.modulus).  This makes hash agree across numeric types:
	hash(2.0) == hash(2) == hash(Fraction(2)) and hash(2.5) ==
	hash(Fraction(5, 2)) (test_fractions testHash; mixed int/float/Fraction
	dict and set lookups).  Because 2**61 == 1 (mod P), the inverse of
	2**k is simply 2**((61 - k mod 61) mod 61) — no extended-gcd needed.
	Infinity hashes to +/-314159 (sys.hash_info.inf); NaN keeps its
	identity-based hash."

	| kind fr numer den p dinv h |
	p := 2305843009213693951.
	kind := self @env0:_getKind.
	(kind @env0:> 4) ifTrue: [^ self @env0:hash].
	(kind @env0:== 3) ifTrue: [
		^ (self @env0:< 0) ifTrue: [-314159] ifFalse: [314159]].
	(self @env0:= 0.0) ifTrue: [^ 0].
	fr := self @env0:asFraction.
	numer := fr @env0:numerator.
	den := fr @env0:denominator.
	dinv := 2 @env0:raisedTo: ((61 @env0:- (((den @env0:highBit) @env0:- 1) @env0:\\ 61)) @env0:\\ 61).
	h := ((numer @env0:abs @env0:\\ p) @env0:* dinv) @env0:\\ p.
	(numer @env0:< 0) ifTrue: [h := h @env0:negated].
	(h @env0:= -1) ifTrue: [^ -2].
	^ h
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
	"Return True if float value is an integer.  Infinity/NaN are never
	integers -- self truncated on an infinite/NaN SmallDouble does not
	raise (unlike as_integer_ratio's explicit guard) and can come back
	equal to self, which would wrongly say True (test_float.py's
	test_is_integer)."

	| kind |
	kind := self @env0:_getKind.
	((kind @env0:== 3) or: [kind @env0:> 4]) ifTrue: [^ false].
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
