Extension { #name : 'Integer' }

{ #category : 'Grail-Initialization' }
Integer class >> ___allocate___: cls value: v [
	"An instance of cls, an int type, carrying the int v -- the allocation
	half of ``int.__new__(cls, ...)'', which __new__:_: and ___new__:kw: share.

	An int subclass is either rooted at AbstractPyInt (a plain ``class C(int)'')
	or Integer-chained (``class E(int, Flag)''); either is allocated, and int
	itself is v.  Anything else is CPython's TypeError: the allocation used to
	accept ANY class, so ``int.__new__(str, 1)'' answered an empty str.

	CPython refuses ``int.__new__(bool, 0)'': bool overrides __new__ to return
	one of its two singletons, so allocating one through int's __new__ is
	unsafe.  Grail's Boolean cannot be allocated at all -- ``Boolean
	class>>new'' is shouldNotImplement, an UNCATCHABLE Smalltalk Error where
	Python code expects a TypeError (test_bool.py test_subclass)."

	| inst nm |
	cls == self ifTrue: [^ v].
	cls == Boolean ifTrue: [
		TypeError ___signal___: 'int.__new__(bool) is not safe, use bool.__new__()'].
	((cls @env0:inheritsFrom: AbstractPyInt) or: [cls @env0:inheritsFrom: self]) ifFalse: [
		nm := (cls ___pyAttrLoad___: #'__name__') @env0:asString.
		TypeError ___signal___: (('int.__new__(' @env0:, nm) @env0:, '): ')
			@env0:, (nm @env0:, ' is not a subtype of int')].
	inst := cls @env0:new.
	inst @env0:dynamicInstVarAt: #value put: v.
	^ inst

]

{ #category : 'Grail-Class Methods' }
Integer class >> ___byteValueOf: anElement [
	"One element of that iterable, as the byte it has to be.  __index__ is
	what CPython coerces with, so an int-like element is accepted and
	anything else gets CPython's own wording."

	| value |

	value := anElement ___asIndex___.
	(value @env0:between: 0 and: 255) ifFalse: [
		ValueError ___signal___: 'bytes must be in range(0, 256)'].
	^ value

]

{ #category : 'Grail-Class Methods' }
Integer class >> ___byteValuesOf: anObject [
	"The byte values int.from_bytes was handed.

	CPython accepts ANY ITERABLE OF INTS here, not only a bytes-like one, and
	the stdlib relies on it: ipaddress parses a dotted quad with
	``int.from_bytes(map(cls._parse_octet, octets), 'big')'', a MAP OBJECT.
	Grail required a ByteArray, so that call raised TypeError and CPython's
	own ipaddress could not even be imported.

	str is refused BEFORE iterating, as CPython refuses it -- iterating one
	would yield characters and a confusing per-element error instead of the
	``cannot convert 'str' object to bytes'' the caller gets.

	Materialised through list >> extend:, which is the tested reader of the
	__iter__/__next__ protocol; duplicating that loop here would be a second
	place to keep the generator and sequence cases right."

	| values |

	(anObject @env0:isKindOf: ByteArray) ifTrue: [^ anObject].
	(anObject @env0:isKindOf: CharacterCollection) ifTrue: [
		^ TypeError ___signal___: (self ___cannotConvertToBytesMessage: anObject)].
	values := list ___new___.
	[values extend: anObject]
		@env0:on: TypeError
		do: [:ex | ex @env0:return: (TypeError ___signal___:
			(self ___cannotConvertToBytesMessage: anObject))].
	^ values @env0:collect: [:each | self ___byteValueOf: each]

]

{ #category : 'Grail-Error Messages' }
Integer class >> ___cannotConvertToBytesMessage: anObject [

	^ 'cannot convert ''' @env0:, (bytes ___pyTypeNameOf___: anObject) @env0:asString
		@env0:, ''' object to bytes'

]

{ #category : 'Grail-Initialization' }
Integer class >> ___checkStrDigitLimit___: aString [
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

]

{ #category : 'Grail-Initialization' }
Integer class >> ___coerceIntResult___: result from: dunderName [
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

]

{ #category : 'Grail-Initialization' }
Integer class >> ___invalidLiteral___: obj base: baseInt [
	"Raise the exact ValueError CPython raises for an unparseable
	int(obj[, base]) literal: 'invalid literal for int() with base N:
	REPR(obj)' -- REPR is the ORIGINAL (untrimmed) obj's Python repr,
	matching test_int.py's test_error_message which asserts on
	exception.args[0] verbatim."

	ValueError ___signal___: ('invalid literal for int() with base ' @env0:,
		baseInt @env0:printString @env0:,
		': ' @env0:,
		(obj __repr__))

]

{ #category : 'Grail-Class Methods' }
Integer class >> ___keyword: aName in: kwargs ifAbsent: aBlock [

	kwargs @env0:isNil ifTrue: [^ aBlock @env0:value].
	^ kwargs @env0:at: aName ifAbsent: aBlock

]

{ #category : 'Grail-Initialization' }
Integer class >> ___new__: positional kw: kwargs [
	"``int.__new__(cls, *args, **kwargs)'' -- the target class first, then
	int()'s own arguments, keywords included.  A call carrying keywords lands
	here (the varargs transport of __new__); without this it reached the
	generic object-class one, which read the class as the value:
	``int.__new__(S, 'FACE', base=16)'' answered an S holding nil and
	``int.__new__(int, 'FACE', base=16)'' ignored the base.  Unpickling
	NEWOBJ_EX below protocol 4 calls exactly that, through ``partial(
	cls.__new__, cls, *args, **kwargs)'' (test_pickle
	test_complex_newobj_ex)."

	| cls v |
	positional @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'int.__new__(): not enough arguments'].
	cls := positional @env0:at: 1.
	(cls isKindOf: Behavior) ifFalse: [
		TypeError ___signal___: 'int.__new__(X): X is not a type object ('
			@env0:, cls ___pyTypeNameForError___ @env0:, ')'].
	^ self ___allocate___: cls
		value: (self _new: (positional @env0:copyFrom: 2 to: positional @env0:size) kw: kwargs)

]

{ #category : 'Grail-Initialization' }
Integer class >> ___parseInt: aString radix: baseInt [
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
	"Python ``0b`` / ``0o`` / ``0x`` prefix handling.  Each prefix is
	stripped only for base 0 (auto-detect) and for ITS OWN base -- the
	comment said so, the code did not, and the difference is a wrong
	ANSWER rather than an error:

	    int('0b1', 16)   CPython 177   Grail 1

	because ``0b'' was taken as a prefix in base 16 and switched the parse
	to base 2, dropping the leading digit.  In base 16, ``0'' and ``b''
	are simply two digits.  Found by the hex codec, where every input byte
	whose hex is 0b decoded to 1 -- silently, until a round-trip over all
	256 values disagreed with itself.

	The mirror case is a refusal rather than a wrong answer: int('0b', 16)
	is 11, and was a ValueError, because after stripping there were no
	digits left."
	(chars @env0:size @env0:>= (idx @env0:+ 1)) ifTrue: [
		((chars @env0:at: idx) @env0:= $0) ifTrue: [
			| auto |
			auto := baseInt @env0:= 0.
			pfxChar := (chars @env0:at: idx @env0:+ 1) @env0:asLowercase.
			(pfxChar @env0:= $b and: [auto or: [baseInt @env0:= 2]]) ifTrue: [
				effectiveBase := 2. idx := idx @env0:+ 2. hadPrefix := true].
			(pfxChar @env0:= $o and: [auto or: [baseInt @env0:= 8]]) ifTrue: [
				effectiveBase := 8. idx := idx @env0:+ 2. hadPrefix := true].
			(pfxChar @env0:= $x and: [auto or: [baseInt @env0:= 16]]) ifTrue: [
				effectiveBase := 16. idx := idx @env0:+ 2. hadPrefix := true].
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

]

{ #category : 'Grail-Initialization' }
Integer class >> ___parseIntFromBytes___: byteObj original: original [
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

]

{ #category : 'Grail-Protocol Refusal' }
Integer class >> __getitem__: index [
	<grailProtocolRefusal>
	"``int[x]'' raises CPython's catchable TypeError.  A refusal, so a read of
	``__getitem__'' that reaches the class side is not an attribute (#1632)."

	^ TypeError ___signal___: 'type ''int'' is not subscriptable'

]

{ #category : 'Grail-Class Methods' }
Integer class >> __instancecheck__: anObject [
	"``int.__instancecheck__(x)'' -- what isinstance(x, int) answers: an Integer,
	a bool (an int subclass), or an AbstractPyInt-based wrapper (NamedIntConstant,
	HTTPStatus, ...), which CPython makes an int subclass.

	Grail's isinstance tests ``isKindOf: Integer'' itself and asks this hook only
	when that fails, so the hook used to answer the wrappers alone -- and a direct
	``int.__instancecheck__(3)'' was False."

	^ (anObject isKindOf: Integer)
		or: [(anObject isKindOf: Boolean) or: [anObject isKindOf: AbstractPyInt]]

]

{ #category : 'Grail-Initialization' }
Integer class >> __new__ [
	"Create a new int instance with default value 0.
	In Python: int() or int.__new__(int)"

	^ 0

]

{ #category : 'Grail-Initialization' }
Integer class >> __new__: obj [
	"Create a new int instance from an object.
	In Python: int(obj) or int.__new__(int, obj)"

	obj ifNil: [ ^ 0 ].

	"CPython ``int.__new__(cls)'': Python's __new__ always takes the target
	CLASS as its first positional, so an int-subclass whose own __new__
	allocates WITHOUT a value -- ``self = int.__new__(cls)'' before storing
	the attributes its __getnewargs__ will hand back (test_copy.py's
	test_copy_inst_getnewargs / _ex) -- lands here with obj = the class, NOT a
	value to convert.  int(obj) never passes an int subclass, so a leading one
	is unambiguously the allocation form; delegate to the two-argument form,
	which already handles it, with int()'s default value of 0.

	Only a SUBCLASS, deliberately: ``int(SomeClass)'' is a TypeError in
	CPython and must stay the TypeError below rather than an allocation.
	That also keeps ``int'' itself out -- the kernel Integer hierarchy is
	abstract, and ``Integer new'' is an UNCATCHABLE shouldNotImplement.
	A Python ``class C(int)'' is rooted at AbstractPyInt (Number, not
	Integer), which is the same wrapper hierarchy __instancecheck__ below
	recognizes."
	((obj isKindOf: Behavior) and: [obj @env0:inheritsFrom: AbstractPyInt])
		ifTrue: [ ^ self __new__: obj _: 0 ].

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
	"...or held as a CLASS ATTRIBUTE (``__int__ = f'', ``Cls.__int__ = f''): the send
	reaches PythonInstance >> doesNotUnderstand:, which calls it as CPython's
	slot lookup does (issue #1218)."
	((obj @env0:isKindOf: PythonInstance) and: [(obj ___typeDunder___: #'__int__') ~~ nil]) ifTrue: [
		^ self ___coerceIntResult___: obj __int__ from: '__int__'
	].

	"No __int__: fall back to __index__ (PEP 357) -- e.g. a class that
	implements only __index__ (test_int.py's BadIndex)."
	(obj ___hasIndexDunder___) ifTrue: [
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

	"Otherwise, error -- CPython 3.14's wording, naming the type."
	TypeError ___signal___: ('int() argument must be a string, a bytes-like object or a real number, not '''
		@env0:, obj ___pyTypeNameForError___ @env0:, '''')

]

{ #category : 'Grail-Initialization' }
Integer class >> __new__: obj _: base [
	"Create a new int instance from a string with a given base.
	In Python: int(obj, base)"

	| str baseInt |
	"CPython ``int.__new__(cls, value)'': Python's __new__ always takes the
	target CLASS as its first positional, so a hand-written int-subclass
	__new__ forwarding to its base -- ``obj = int.__new__(cls, value)'' in an
	enum member (test_conflicting_types_resolved_in_new, test_flag_with_custom_new)
	-- lands here with obj = the class and base = the value, NOT a string and a
	radix.  int(obj, base) never passes a class, so a leading Behavior is
	unambiguously the allocation form: build a cls instance carrying int(value)."
	(obj isKindOf: Behavior) ifTrue: [^ self ___new__: { obj. base } kw: nil].
	"base must be an integer -- or an object implementing __index__
	(PEP 357), e.g. a class with a plain __index__ method, coerced the
	same way the arithmetic dunders above fall back to __index__ for a
	non-int operand (test_int.py: int('101', base=MyIndexable(2)))."
	baseInt := (base isKindOf: int)
		ifTrue: [base]
		ifFalse: [
			(base ___hasIndexDunder___)
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

]

{ #category : 'Grail-Initialization' }
Integer class >> __new__: obj _: base _: extra [
	"int() takes at most 2 positional arguments -- a 3rd falls through
	the generic class-call dispatch's arity-named-selector convention
	(object class>>value:value: builds ``__new__:_:_:`` for 3
	positionals) straight to a raw, uncatchable MessageNotUnderstood
	on Integer class since (unlike Grail's own PythonInstance
	hierarchy) the kernel Integer/Number/Object metaclass chain has no
	env-1 DNU backstop.  Raise the same TypeError CPython does instead
	(test_int.py: assertRaises(TypeError, int, '10', 2, 1))."

	"``int.__new__(S, 'FACE', 16)'': three positionals are the allocation form
	when the first is a class -- the class, the value and its base."
	(obj isKindOf: Behavior) ifTrue: [
		^ self ___new__: { obj. base. extra } kw: nil].
	TypeError ___signal___: 'int expected at most 2 arguments, got 3'

]

{ #category : 'Grail-Class Methods' }
Integer class >> _from_bytes: positional kw: kwargs [
	"``int.from_bytes(bytes, byteorder='big', *, signed=False)'' for a call
	that passes a keyword.  All three are nameable in CPython, so
	``int.from_bytes(b, signed=True)'' and ``int.from_bytes(bytes=b)'' both
	work there and matched no selector here."

	| theBytes byteorder signed |

	theBytes := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [self ___keyword: 'bytes' in: kwargs ifAbsent: [
			^ TypeError ___signal___:
				'from_bytes() missing required argument ''bytes'' (pos 1)']].
	byteorder := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [self ___keyword: 'byteorder' in: kwargs ifAbsent: ['big']].
	signed := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [self ___keyword: 'signed' in: kwargs ifAbsent: [false]].
	^ self from_bytes: theBytes _: byteorder _: signed ___isTruthy___

]

{ #category : 'Grail-Initialization' }
Integer class >> _new: positional kw: kwargs [
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
		ifFalse: [kwargs == nil
			ifTrue: [nil]
			ifFalse: [kwargs @env0:at: 'base' ifAbsent: [nil]]].
	base == nil ifTrue: [^ self __new__: obj].
	^ self __new__: obj _: base

]

{ #category : 'Grail-Class Methods' }
Integer class >> from_bytes: theBytes [
	"``int.from_bytes(b)'' -- byteorder has defaulted to 'big' since CPython
	3.11, and the one-argument spelling is what code written since then uses.
	Grail had only the two- and three-argument forms, so the default was
	unreachable."

	^ self from_bytes: theBytes _: 'big' _: false

]

{ #category : 'Grail-Class Methods' }
Integer class >> from_bytes: bytes _: byteorder [
	"int.from_bytes(bytes, byteorder='big', *, signed=False) —
	2-arg form, delegates to the 3-arg form with signed=false.
	The delegation used to name ``from_bytes:byteorder:signed:'', a
	selector that does not exist (Python-keyword style accidentally
	used instead of Grail's ``_:'' convention), so EVERY 2-arg
	``int.from_bytes(b, 'big')'' died in an uncatchable env-1 DNU on
	Integer class -- the identical slip already fixed in to_bytes:_:."

	^ self from_bytes: bytes _: byteorder _: false

]

{ #category : 'Grail-Class Methods' }
Integer class >> from_bytes: bytes _: byteorder _: signed [
	"int.from_bytes(bytes, byteorder='big', *, signed=False)
	Return the integer represented by the given array of bytes."

	| bytesArray result isBigEndian isSigned |
	"Extract bytes - assuming bytes is a Python bytes object or similar.
	Python's bytes IS Smalltalk's ByteArray with the Python protocol
	layered on (see Bytes.gs); bytearray subclasses it (Bytearray.gs).
	Check against ByteArray directly, not the class named `bytes' --
	that identifier is shadowed by this method's own `bytes' parameter.
	The old check (`isKindOf: tuple') could never match an actual
	bytes/bytearray argument, since neither subclasses tuple
	(array.fromfile, test_system_transitions)."
	bytesArray := self ___byteValuesOf: bytes.

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

]

{ #category : 'Grail-Arithmetic' }
Integer >> ___checkedAgainst___: other [
	"Self, having checked that it can take part in arithmetic with ``other''.

	The MIRROR of float>>___checkedOperand___, and needed because either side
	can be the huge one: ``1.0 + 10**1000'' coerces the OPERAND and
	``10**1000 + 1.0'' coerces the RECEIVER, and GemStone answers an infinity
	for both where CPython raises ``int too large to convert to float''.

	Only fires when the other side is a Float -- integer arithmetic is exact
	and unbounded up to GemStone's own LargeInteger ceiling, which raises its
	own OverflowError elsewhere."

	(other @env0:isKindOf: Float) ifTrue: [
		float ___intToFloatChecked___: self].
	^ self

]

{ #category : 'Grail-String Representation' }
Integer >> ___checkIntStrDigitLimit___ [
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

]

{ #category : 'Grail-Private' }
Integer >> ___fitsInBytes___: aCount signed: aBoolean [
	"Does the receiver fit aCount bytes?  Signed, that is the two's-complement
	range [-2**(8n-1), 2**(8n-1)); unsigned, [0, 2**(8n)) -- the range
	CPython's _PyLong_AsByteArray checks.  The signed case was checked only
	after the two's-complement step and against the UNSIGNED limit, so
	``(128).to_bytes(1, 'big', signed=True)'' answered b'\x80' and
	``(-129).to_bytes(1, 'little', signed=True)'' b'\x7f', where CPython
	raises ``int too big to convert''."

	| bits |
	bits := aCount @env0:* 8.
	aBoolean ifFalse: [
		^ self @env0:>= 0 and: [self @env0:< (1 @env0:bitShift: bits)]].
	bits @env0:= 0 ifTrue: [^ self @env0:= 0].
	^ (self @env0:>= (1 @env0:bitShift: bits @env0:- 1) @env0:negated)
		and: [self @env0:< (1 @env0:bitShift: bits @env0:- 1)]

]

{ #category : 'Grail-Private' }
Integer >> ___floorQuotientOf___: aDividend by: aDivisor [
	"Floor division that survives the SmallInteger boundary.

	GemStone's ``//'' primitive OVERFLOWS for the one integer pair whose
	true quotient is not representable as a SmallInteger:

	    (0 - 1152921504606846976) // -1  =>  -1152921504606846976

	-- it answers the dividend unchanged rather than promoting to a
	LargePositiveInteger.  ``quo:'' and ``/'' overflow identically; ``*''
	and ``negated'' promote correctly.  That dividend is SmallInteger's
	minimum, so this is exactly CPython's ``divmod(-sys.maxsize-1, -1)''
	case (test_builtin test_divmod), which must answer (sys.maxsize+1, 0).
	Silently wrong rather than loud: the quotient came back with the wrong
	SIGN and no error at all.

	Dividing an integer by -1 IS negation, exactly, for every input, so
	routing the whole ``-1'' divisor case through #negated fixes the
	boundary and changes nothing else.  Both operands must be integers:
	``5.5 // -1'' is -6.0, which is not ``5.5 negated''."

	((aDividend @env0:isKindOf: Integer)
		and: [(aDivisor @env0:isKindOf: Integer) and: [aDivisor @env0:= -1]])
			ifTrue: [^ aDividend @env0:negated].
	^ aDividend @env0:// aDivisor

]

{ #category : 'Grail-Arithmetic' }
Integer >> ___intTrueDivFloat___: other [
	"int/int true division: the exact rational quotient rounded to the
	nearest float (GemStone Fraction>>asFloat is correctly rounded).  A
	finite quotient too large for the float range raises OverflowError,
	matching CPython's 'integer division result too large for a float'."

	| f |
	"``1 / False'' arrives HERE, not at __truediv__'s guard: False is not a
	Number, so that guard passes it to the __index__ branch, which coerces it to
	0 and hands it over.  Without this check the kernel divide raised, and the
	handler below relabelled it ``integer division result too large for a
	float'' -- an answer about the quotient's size for a divisor that is zero."
	(ZeroDivisionError @env0:___isZeroDivisor___: other) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].
	f := [(self @env0:/ other) @env0:asFloat] @env0:on: Error do: [:ex |
		OverflowError ___signal___: 'integer division result too large for a float'].
	((f @env0:_getKind) @env0:== 3) ifTrue: [
		OverflowError ___signal___: 'integer division result too large for a float'].
	"A ZERO result carries the quotient's sign, as CPython's does: 0 / -3 and
	-1 / 2**2000 are -0.0.  The exact rational has no signed zero, so asFloat
	answered +0.0 (test_long's test_correctly_rounded_true_division, 0 / -big)."
	((f @env0:= 0.0) @env0:and: [(self @env0:< 0) ~~ (other @env0:< 0)])
		ifTrue: [^ 0.0 @env0:negated].
	^ f

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> ___pyBitAnd___: other [
	"Python's ``&'' on two Integers.  GemStone's bitAnd: answers WRONG bits when
	an operand is a negative LargeInteger -- measured on 4.0 over operands at
	the SmallInteger boundary and beyond, 290 of 11,881 pairs, e.g. some
	-(2**128 - 1) & -(2**120 - 2) -- and bitXor: is worse (see ___pyBitXor___:).
	bitOr:, bitInvert and bitShift: are right on every pair, and so are both
	operations when neither operand is negative or both are SmallIntegers.  So
	those keep the primitive, and the rest is rewritten over non-negative
	operands with ~x = -1 - x:  a & b = ~(~a | ~b) for two negatives, and
	b & ~na = b - (b & na) when only a is negative (na = ~a)."

	| na |
	"A Flag hands its int-subclass operand straight through; that is not a
	kernel Integer, so it keeps the primitive's own coercion."
	(other @env0:isKindOf: Integer) ifFalse: [^ self @env0:bitAnd: other].
	(((self @env0:>= 0) @env0:and: [other @env0:>= 0])
		@env0:or: [(self @env0:class == SmallInteger) @env0:and: [other @env0:class == SmallInteger]])
			ifTrue: [^ self @env0:bitAnd: other].
	self @env0:< 0 ifFalse: [^ other ___pyBitAnd___: self].
	na := self @env0:bitInvert.
	other @env0:< 0 ifTrue: [^ (na @env0:bitOr: other @env0:bitInvert) @env0:bitInvert].
	^ other @env0:- (other @env0:bitAnd: na)

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> ___pyBitXor___: other [
	"Python's ``^'' on two Integers.  GemStone's bitXor: answers WRONG bits when
	an operand is a negative LargeInteger: measured on 4.0, 2,782 of 11,881
	pairs, every negative-with-negative pair involving a LargeInteger among
	them -- ``-6148914691236517206 ^ -1'' was -12297829382473034411, not
	6148914691236517205 (test_long's test_bitop_identities).  As for
	___pyBitAnd___:, the safe cases keep the primitive and the rest is
	rewritten over non-negative operands: a ^ b = ~a ^ ~b for two negatives,
	and ~(~a ^ b) when only a is negative."

	| na |
	"A Flag hands its int-subclass operand straight through; that is not a
	kernel Integer, so it keeps the primitive's own coercion."
	(other @env0:isKindOf: Integer) ifFalse: [^ self @env0:bitXor: other].
	(((self @env0:>= 0) @env0:and: [other @env0:>= 0])
		@env0:or: [(self @env0:class == SmallInteger) @env0:and: [other @env0:class == SmallInteger]])
			ifTrue: [^ self @env0:bitXor: other].
	self @env0:< 0 ifFalse: [^ other ___pyBitXor___: self].
	na := self @env0:bitInvert.
	other @env0:< 0 ifTrue: [^ na @env0:bitXor: other @env0:bitInvert].
	^ (na @env0:bitXor: other) @env0:bitInvert

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> ___pyShiftLeft___: count [
	"Python's ``self << count'' for an Integer count.  A negative count is
	ValueError; zero shifted any distance is zero (``0 << (1 << 1000)'');
	anything else past GemStone's LargeInteger ceiling (~130144 bits) is the
	catchable OverflowError __pow__: raises for the same ceiling.  The
	kernel's own answers there were uncatchable: NumericError for a SmallInteger
	count, ArgumentTypeError for a LargeInteger one, each ending a ``./grail''
	run outright (test_long's test_lshift_of_zero)."

	(count @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
	self @env0:= 0 ifTrue: [^ 0].
	"A count past a SmallInteger overflows CPython too, in its own words."
	(count @env0:class == SmallInteger) ifFalse: [
		^ OverflowError ___signal___: 'too many digits in integer'].
	(count @env0:> 64) ifTrue: [
		^ [self @env0:bitShift: count]
			@env0:on: NumericError
			do: [:ex | OverflowError ___signal___: 'result exceeds Grail integer capacity']].
	^ self @env0:bitShift: count

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> ___pyShiftRight___: count [
	"Python's ``self >> count'' for an Integer count.  A negative count is
	ValueError, and a count that is itself a LargeInteger shifts every bit out:
	0, or -1 for a negative self (``-42 >> (1 << 1000)'').  The kernel's
	bitShift: refused that count with an uncatchable ArgumentTypeError
	(test_long's test_huge_rshift)."

	(count @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
	(count @env0:class == SmallInteger) ifFalse: [
		^ (self @env0:< 0) ifTrue: [-1] ifFalse: [0]].
	^ self @env0:bitShift: count @env0:negated

]

{ #category : 'Grail-Arithmetic' }
Integer >> __abs__ [
	"Absolute value."

	^ self @env0:abs

]

{ #category : 'Grail-Arithmetic' }
Integer >> __add__: other [
	"Add two integers or integer and other number."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__radd__:'.
		pri == nil ifFalse: [^ pri]].
	(other isKindOf: Number) ifTrue: [^ (self ___checkedAgainst___: other) @env0:+ other].
	(self ___isPyIntOperand___: other) ifTrue: [^ self @env0:+ (other __index__)].
	^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> __and__: other [
	"Bitwise AND."

	(other isKindOf: Integer) ifTrue: [^ self ___pyBitAnd___: other].
	"An int subclass that overrides __rand__ answers first, as CPython's
	subclass priority has it: ``7 & IntFlag.X'' is the flag, not 3."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rand__:'.
		pri == nil ifFalse: [^ pri]].
	(self ___isPyIntOperand___: other) ifTrue: [^ self ___pyBitAnd___: (other __index__)].
	^ self ___binOpFallback___: other op: '&' reflected: #'__rand__:'

]

{ #category : 'Grail-Conversion' }
Integer >> __bool__ [
	"Return True if non-zero, False if zero."

	^ self @env0:~= 0

]

{ #category : 'Grail-Rounding' }
Integer >> __ceil__ [
	"Ceiling (returns self)."

	^ self

]

{ #category : 'Grail-Type' }
Integer >> __class__ [
	"Python ``type(n)'' is ``int'' for every integer.  GemStone's concrete
	subclasses (SmallInteger, LargePositiveInteger, LargeNegativeInteger)
	are an implementation detail; without this override ``type(5)'' would
	answer SmallInteger and ``type(5) is int'' would be False (test_math
	testCeil/Floor/Comb/Isqrt/Perm; test_enum test_programatic_function_*).
	Bool is a separate type (Boolean) and is unaffected."

	^ int

]

{ #category : 'Grail-Arithmetic' }
Integer >> __divmod__: other [
	"Return (quotient, remainder) tuple.

	Computed by DELEGATING to __floordiv__ and __mod__ rather than repeating
	their arithmetic.  Repeating it is what broke test_fractions: those two
	carry real special-case handling -- an infinite divisor, Python's
	divisor-signed zero, the int/float result types -- and a __divmod__ that
	went straight to the kernel's // and \\ answered (0.0, nan) for
	``divmod(0.1, float('inf'))'' where CPython answers (0.0, 0.1).
	Delegating keeps the pair bit-identical to what divmod() produced before it
	started dispatching here; the ONLY thing that changed is who gets asked.

	The operand guard stays here, ahead of the delegation, because
	__floordiv__ declines by RAISING (naming ``//''), and a divmod() call must
	report divmod()."

	| d |
	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rdivmod__:'.
		pri == nil ifFalse: [^ pri]].
	"A FLOAT divisor runs float's divmod, as for // (see __floordiv__:)."
	(other @env0:isKindOf: Float) ifTrue: [
		^ (float ___intToFloatChecked___: self) __divmod__: other].
	d := nil.
	(other isKindOf: Number) ifTrue: [d := other]
	ifFalse: [
		(self ___isPyIntOperand___: other) ifTrue: [d := other __index__]].
	d == nil ifTrue: [
		^ self ___binOpFallback___: other op: 'divmod()' reflected: #'__rdivmod__:'].
	^ tuple @env0:with: (self __floordiv__: d) with: (self __mod__: d)

]

{ #category : 'Grail-Documentation' }
Integer >> __doc__ [
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

]

{ #category : 'Grail-Comparison' }
Integer >> __eq__: other [
	"Return self == other.  Compares as Smalltalk integers first;
	on mismatch, if other is a Python int in another shape -- a bool or an
	int subclass's instance (e.g. NamedIntConstant from re._constants) --
	unwrap it and re-compare.  This makes the reverse direction
	``16 == LITERAL`` agree with ``LITERAL == 16''.  An object that merely
	implements ``__index__'' is not an int and compares unequal, as in
	CPython (object >> ___isPyIntOperand___:)."

	| refOwner |
	"complex first: kernel env-0 = would try GemStone Number coercion
	and send the internal #_getKind to complex (DNU).  complex knows
	how to compare against reals."
	(other isKindOf: complex) ifTrue: [^ other __eq__: self].
	(self @env0:= other) ifTrue: [^ true].
	(other isKindOf: SmallInteger) ifTrue: [^ false].
	(self ___isPyIntOperand___: other) ifTrue: [
		^ self @env0:= (other __index__)
	].
	"A wheel's own object -- numpy.float64, a C type's instance -- compares by
	its C slot: the reflected == that CPython makes once this side answers
	NotImplemented.  It answered false outright, so ``3 == box'' was False
	where ``box == 3'' was True."
	(other isKindOf: ShimForeignObject) ifTrue: [^ other __eq__: self].
	"A Python object carrying its OWN __eq__ (Fraction/Decimal/user Rational)
	compares via CPython's reflected ==: defer to it rather than answering
	false, so ``2 == Fraction(4, 2)`` is True (mirrors Float>>__eq__).  A plain
	object with only the inherited identity __eq__ keeps the false answer."
	(other isKindOf: PythonInstance) ifTrue: [
		refOwner := other @env0:class @env0:whichClassIncludesSelector: #'__eq__:' environmentId: 1.
		(refOwner ~~ nil and: [refOwner ~~ object]) ifTrue: [
			^ other @env0:perform: #'__eq__:' env: 1 withArguments: { self }]].
	^ false

]

{ #category : 'Grail-Conversion' }
Integer >> __float__ [
	"Convert to float.  An integer whose magnitude exceeds the double range
	coerces to an IEEE infinity in GemStone; CPython raises OverflowError
	instead (test_fractions' testConversions checks float(int('2'*400+'7')))."

	| f |
	f := self @env0:asFloat.
	(f @env0:_getKind @env0:== 3) ifTrue: [
		OverflowError ___signal___: 'int too large to convert to float'].
	^ f

]

{ #category : 'Grail-Rounding' }
Integer >> __floor__ [
	"Floor (returns self)."

	^ self

]

{ #category : 'Grail-Arithmetic' }
Integer >> __floordiv__: other [
	"Floor division."
	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rfloordiv__:'.
		pri == nil ifFalse: [^ pri]].
	"CPython: division/modulo by zero raises catchable
	ZeroDivisionError; the kernel ZeroDivide is uncatchable."
	"The operand TYPE is checked BEFORE the divisor's value, as CPython does:
	``1 // 0j'' is a TypeError -- complex has no floor division -- and NOT a
	ZeroDivisionError.  The guard used to run first, so a complex zero was
	reported as division by zero and test_complex's test_floordiv_zero_division
	failed on the wrong exception.  Confining the guard to the branch that will
	actually do the arithmetic gets the order right without duplicating the
	dispatch."
	"A FLOAT divisor: CPython's int // answers NotImplemented and float's
	runs, so the quotient is a float -- ``7 // 2.0'' is 3.0, where the
	kernel's integer // answered 3.  The int converts first, raising
	OverflowError when it is too large for a float (int.__divmod__ and
	int.__mod__ hand over the same way, so all three come from float's one
	divmod routine)."
	(other @env0:isKindOf: Float) ifTrue: [
		^ (float ___intToFloatChecked___: self) __floordiv__: other].
	(other isKindOf: Number) ifTrue: [
		(ZeroDivisionError @env0:___isZeroDivisor___: other) ifTrue: [
			ZeroDivisionError ___signal___: 'division by zero'].
		^ self ___floorQuotientOf___: self by: other].
	(self ___isPyIntOperand___: other) ifTrue: [
			"The __index__ result is the real divisor, so it is what gets
			checked: ``1 // False'' indexes to zero, and reached the kernel's
			UNCATCHABLE ZeroDivide."
			| idx |
			idx := other __index__.
			(ZeroDivisionError @env0:___isZeroDivisor___: idx) ifTrue: [
				ZeroDivisionError ___signal___: 'division by zero'].
			^ self ___floorQuotientOf___: self by: idx].
	^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'

]

{ #category : 'Grail-String Representation' }
Integer >> __format__: formatSpec [
	"Format the integer per the full format-spec mini-language
	(fill/align/sign/#/0/width/grouping/.precision/type) — see the
	shared engine in builtins ___formatValue___:spec:."

	^ (builtins instance) ___formatValue___: self spec: formatSpec

]

{ #category : 'Grail-Comparison' }
Integer >> __ge__: other [
	"Return self >= other.  Mirrors the __eq__: unwrapping of a bool or an
	int subclass's instance, so the reverse direction ``10 >= MAXREPEAT''
	works when MAXREPEAT is a NamedIntConstant."

	(other isKindOf: Number) ifTrue: [^ self @env0:>= other].
	(self ___isPyIntOperand___: other) ifTrue: [
		^ self @env0:>= (other __index__)
	].
	^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'

]

{ #category : 'Grail-Protocol Refusal' }
Integer >> __getitem__: idx [
	<grailProtocolRefusal>
	"x[i] on an int raises catchable TypeError (CPython).  Without a
	real method the send died as an UNCATCHABLE env-1 MNU and killed
	the test_fractions module run.  Safe as a real method on int alone
	(the probe-selector concern applies to blanket DNU intercepts)."

	TypeError ___signal___: '''int'' object is not subscriptable'

]

{ #category : 'Grail-Comparison' }
Integer >> __gt__: other [
	"Return self > other.  Same int unwrapping as __ge__:."

	(other isKindOf: Number) ifTrue: [^ self @env0:> other].
	(self ___isPyIntOperand___: other) ifTrue: [
		^ self @env0:> (other __index__)
	].
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'

]

{ #category : 'Grail-Hashing' }
Integer >> __hash__ [
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

]

{ #category : 'Grail-Conversion' }
Integer >> __index__ [
	"Return self (used for indexing)."

	^ self

]

{ #category : 'Grail-Initialization' }
Integer >> __init__ [
	"Initialize an int instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ None

]

{ #category : 'Grail-Initialization' }
Integer >> __init__: obj [
	"Initialize an int instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ None

]

{ #category : 'Grail-Conversion' }
Integer >> __int__ [
	"Return self (already an integer)."

	^ self

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> __invert__ [
	"Bitwise NOT (one's complement)."

	^ self @env0:bitInvert

]

{ #category : 'Grail-Protocol Refusal' }
Integer >> __iter__ [
	<grailProtocolRefusal>
	"iter(int) raises catchable TypeError (CPython) -- heapify(non-
	sequence) sent an uncatchable env-1 MNU."

	TypeError ___signal___: '''int'' object is not iterable'

]

{ #category : 'Grail-Comparison' }
Integer >> __le__: other [
	"Return self <= other.  Same int unwrapping as __ge__:."

	(other isKindOf: Number) ifTrue: [^ self @env0:<= other].
	(self ___isPyIntOperand___: other) ifTrue: [
		^ self @env0:<= (other __index__)
	].
	^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> __lshift__: other [
	"Left shift.

	See ___pyShiftLeft___: for the counts the kernel cannot take."

	(other isKindOf: Integer) ifTrue: [^ self ___pyShiftLeft___: other].
	"An int subclass that overrides __rlshift__ answers first, as CPython's
	subclass priority has it: ``7 & IntFlag.X'' is the flag, not 3."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rlshift__:'.
		pri == nil ifFalse: [^ pri]].
	(self ___isPyIntOperand___: other) ifTrue: [^ self ___pyShiftLeft___: other __index__].
	^ self ___binOpFallback___: other op: '<<' reflected: #'__rlshift__:'

]

{ #category : 'Grail-Comparison' }
Integer >> __lt__: other [
	"Return self < other.  Same int unwrapping as __ge__:."

	(other isKindOf: Number) ifTrue: [^ self @env0:< other].
	(self ___isPyIntOperand___: other) ifTrue: [
		^ self @env0:< (other __index__)
	].
	^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'

]

{ #category : 'Grail-Arithmetic' }
Integer >> __mod__: other [
	"Modulo operation."
	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rmod__:'.
		pri == nil ifFalse: [^ pri]].
	"CPython: division/modulo by zero raises catchable
	ZeroDivisionError; the kernel ZeroDivide is uncatchable."
	"The operand TYPE is checked BEFORE the divisor's value, as CPython does:
	``1 % 0j'' is a TypeError -- complex has no modulo -- and NOT a
	ZeroDivisionError.  The guard used to run first, so a complex zero was
	reported as division by zero and test_complex's test_mod_zero_division
	failed on the wrong exception.  Confining the guard to the branch that will
	actually do the arithmetic gets the order right without duplicating the
	dispatch."
	"A FLOAT divisor runs float's %, as for // (see __floordiv__:)."
	(other @env0:isKindOf: Float) ifTrue: [
		^ (float ___intToFloatChecked___: self) __mod__: other].
	(other isKindOf: Number) ifTrue: [
		(ZeroDivisionError @env0:___isZeroDivisor___: other) ifTrue: [
			ZeroDivisionError ___signal___: 'division by zero'].
		^ self @env0:\\ other].
	(self ___isPyIntOperand___: other) ifTrue: [
			| idx |
			idx := other __index__.
			(ZeroDivisionError @env0:___isZeroDivisor___: idx) ifTrue: [
				ZeroDivisionError ___signal___: 'division by zero'].
			^ self @env0:\\ idx].
	^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'

]

{ #category : 'Grail-Arithmetic' }
Integer >> __mul__: other [
	"Multiply two integers or integer and other number."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rmul__:'.
		pri == nil ifFalse: [^ pri]].
	(other isKindOf: Number) ifTrue: [^ (self ___checkedAgainst___: other) @env0:* other].
	(self ___isPyIntOperand___: other) ifTrue: [^ self @env0:* (other __index__)].
	"Sequence repetition: ``2 * 'ab''' / ``2 * [1]'' repeat the sequence.
	CPython gets there by int answering NotImplemented and the sequence's
	reflected multiply running, so a PYTHON subclass goes that way too: its
	own __rmul__ if it defines one (``3 * S('b')''), a TypeError if that
	declines, else the builtin repeat -- never its __mul__ (#1552).  A builtin
	sequence is the direct send, as before."
	((other isKindOf: CharacterCollection)
		or: [(other isKindOf: SequenceableCollection)
		or: [other isKindOf: ByteArray]]) ifTrue: [
		(other @env0:class @env0:includesSelector: #'___pyDefinedClass___' environmentId: 1)
			ifFalse: [^ other __mul__: self].
		^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'].
	^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'

]

{ #category : 'Grail-Comparison' }
Integer >> __ne__: other [
	"Return self != other.  Delegates to __eq__: (not a raw native ~=)
	so it shares its __index__/complex/PythonInstance fallback logic --
	a bare @env0:~= disagreed with __eq__: for e.g. 0 != False (Boolean
	has an __index__, so __eq__: finds them equal via that path, but
	native ~= just sees an Integer and a Boolean as unrelated types and
	always answers 'not equal') (test_re.py's test_case_helpers).

	PUNT WHERE __eq__: PUNTS.  Negating its answer unconditionally sent
	``not'' to the NotImplemented singleton, and a doesNotUnderstand in
	an operator is not a Python-level error any handler can see -- it is
	an uncatchable MessageNotUnderstood, so the report never names the
	comparison that raised it.  Answering the singleton instead is what
	lets the operator layer reflect to the other operand, which is the
	whole point of a punt."

	| equal |

	equal := self __eq__: other.
	(equal @env0:== NotImplemented) ifTrue: [^ equal].
	^ equal @env0:not

]

{ #category : 'Grail-Arithmetic' }
Integer >> __neg__ [
	"Unary negation."

	^ self @env0:negated

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> __or__: other [
	"Bitwise OR."

	(other isKindOf: Integer) ifTrue: [^ self @env0:bitOr: other].
	"An int subclass that overrides __ror__ answers first, as CPython's
	subclass priority has it: ``7 & IntFlag.X'' is the flag, not 3."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__ror__:'.
		pri == nil ifFalse: [^ pri]].
	(self ___isPyIntOperand___: other) ifTrue: [^ self @env0:bitOr: (other __index__)].
	^ self ___binOpFallback___: other op: '|' reflected: #'__ror__:'

]

{ #category : 'Grail-Arithmetic' }
Integer >> __pos__ [
	"Unary plus (return self)."

	^ self

]

{ #category : 'Grail-Arithmetic' }
Integer >> __pow__: other [
	"Raise to power.  The kernel caps LargeInteger at ~130k bits;
	resignal its NumericError as catchable OverflowError (DELIBERATE
	deviation -- CPython ints are unbounded)."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rpow__:'.
		pri == nil ifFalse: [^ pri]].
	"An int subclass's instance is a Number but not an Integer, so the branch
	below took it for a non-integral exponent and answered a float:
	``2 ** IntEnum.X'' was 8.0.  It is an int; raise to its value."
	(other @env0:isKindOf: AbstractPyInt) ifTrue: [^ self __pow__: other __index__].
	(other isKindOf: Number) ifTrue: [
		"CPython: 0 raised to a NEGATIVE power is a ZeroDivisionError (an int
		exponent coerces to float, so it is 0.0 ** -n -> division by zero),
		not Grail's capacity OverflowError or an IEEE infinity."
		((self @env0:= 0) and: [other @env0:< 0]) ifTrue: [
			^ ZeroDivisionError ___signal___: 'zero to a negative power'].
		"int ** float is float ** float in CPython: long_pow declines a float
		exponent and float_pow converts the int with PyLong_AsDouble, so an int
		too large for a float is OverflowError (Objects/floatobject.c,
		CONVERT_TO_DOUBLE).  ``(2**30000) ** 1.0'' answered inf."
		(other @env0:isKindOf: Float) ifTrue: [float ___intToFloatChecked___: self].
		"A NEGATIVE BASE TO A NON-INTEGER POWER IS COMPLEX, and float>>__pow__:
		beside this already knows that -- the angle of a negative real is pi,
		so the result is |self|**other * (cos + i*sin)(other*pi).  int did not,
		and GemStone's raisedTo: answers NaN, so the SAME expression gave two
		different answers depending on how the base was spelled:

		    (-1.0) ** 0.5     (6.123233995736766e-17+1j)
		    (-1)   ** 0.5     nan

		Deferred to the float method rather than restated here, so the special
		cases it documents (``(-inf) ** -0.5'' is the real 0.0; pow(x, NAN) is
		the real NAN, neither going through the complex branch -- C99 F.9.4.4)
		stay in one place.  Reached only for a negative base with a finite
		non-integral exponent; every other combination keeps the integer
		arithmetic below, which is exact where a float would not be.

		test_builtin test_pow."
		((self @env0:< 0)
			@env0:and: [(other @env0:isKindOf: Integer) @env0:not
			@env0:and: [(other @env0:isKindOf: Float)
			@env0:and: [(((other @env0:_getKind) @env0:== 3)
				@env0:or: [(other @env0:_getKind) @env0:> 4]) @env0:not
			@env0:and: [(other @env0:fractionPart) @env0:~= 0]]]]) ifTrue: [
				^ self @env0:asFloat __pow__: other].
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
	(self ___isPyIntOperand___: other) ifTrue: [^ self @env0:raisedTo: (other __index__)].
	^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:'

]

{ #category : 'Grail-Arithmetic' }
Integer >> __pow__: other _: mod [
	"Raise to power with modulo."

	| result |
	"A bool or an int subclass's instance is an int here too: ``pow(2, True,
	5)'' is 2.  The kernel's raisedTo: and \\ take neither."
	((other @env0:isKindOf: Integer) not and: [self ___isPyIntOperand___: other])
		ifTrue: [^ self __pow__: other __index__ _: mod].
	((mod @env0:isKindOf: Integer) not and: [self ___isPyIntOperand___: mod])
		ifTrue: [^ self __pow__: other _: mod __index__].
	result := self @env0:raisedTo: other.
	mod ifNotNil: [
		result := result @env0:\\ mod.
	].
	^ result

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __radd__: other [
	"Reverse add (other + self)."

	(other isKindOf: Number) ifTrue: [^ other @env0:+ self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) @env0:+ self].
	^ self ___rbinOpFallback___: other op: '+'

]

{ #category : 'Grail-Bitwise Operations - Reverse' }
Integer >> __rand__: other [
	"Reverse bitwise AND (other & self)."

	(other isKindOf: Integer) ifTrue: [^ other ___pyBitAnd___: self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) ___pyBitAnd___: self].
	^ self ___rbinOpFallback___: other op: '&'

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rdivmod__: other [
	"Reverse divmod (divmod(other, self)) -- self is the DIVISOR.

	Delegates to __rfloordiv__/__rmod__ for the reason __divmod__ gives.  The
	forward direction has already had its chance, so a non-numeric dividend
	raises here rather than reflecting again."

	| n |
	n := nil.
	(other isKindOf: Number) ifTrue: [n := other]
	ifFalse: [
		(self ___isPyIntOperand___: other) ifTrue: [n := other __index__]].
	n == nil ifTrue: [^ self ___rbinOpFallback___: other op: 'divmod()'].
	^ tuple @env0:with: (self __rfloordiv__: n) with: (self __rmod__: n)

]

{ #category : 'Grail-String Representation' }
Integer >> __repr__ [
	"Return string representation of integer."

	self ___checkIntStrDigitLimit___.
	^ (self @env0:printString) @env0:asUnicodeString

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rfloordiv__: other [
	"Reverse floor division (other // self)."
	"Reverse form: other OP self -- self is the divisor."
	(ZeroDivisionError @env0:___isZeroDivisor___: self) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].

	(other isKindOf: Number) ifTrue: [^ self ___floorQuotientOf___: other by: self].
	(self ___isPyIntOperand___: other) ifTrue: [
			^ self ___floorQuotientOf___: (other __index__) by: self].
	^ self ___rbinOpFallback___: other op: '//'

]

{ #category : 'Grail-Bitwise Operations - Reverse' }
Integer >> __rlshift__: other [
	"Reverse left shift (other << self)."

	(self @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
	(other isKindOf: Integer) ifTrue: [^ other ___pyShiftLeft___: self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) ___pyShiftLeft___: self].
	^ self ___rbinOpFallback___: other op: '<<'

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rmod__: other [
	"Reverse modulo (other % self)."
	"Reverse form: other OP self -- self is the divisor."
	(ZeroDivisionError @env0:___isZeroDivisor___: self) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].

	(other isKindOf: Number) ifTrue: [^ other @env0:\\ self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) @env0:\\ self].
	^ self ___rbinOpFallback___: other op: '%'

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rmul__: other [
	"Reverse multiply (other * self)."

	(other isKindOf: Number) ifTrue: [^ other @env0:* self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) @env0:* self].
	^ self ___rbinOpFallback___: other op: '*'

]

{ #category : 'Grail-Bitwise Operations - Reverse' }
Integer >> __ror__: other [
	"Reverse bitwise OR (other | self)."

	(other isKindOf: Integer) ifTrue: [^ other @env0:bitOr: self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) @env0:bitOr: self].
	^ self ___rbinOpFallback___: other op: '|'

]

{ #category : 'Grail-Rounding' }
Integer >> __round__ [
	"Round to nearest integer (returns self)."

	^ self

]

{ #category : 'Grail-Rounding' }
Integer >> __round__: ndigits [
	"Round to n digits."

	"PYTHON None, not Smalltalk nil.  ``round(x, None)'' is defined to mean
	the same as ``round(x)'', and None is a distinct OBJECT here -- so the
	bare ``ifNil:'' missed it and fell through to ``None < 0'', an
	uncatchable-looking TypeError about comparing NoneType with int.  float's
	__round__: documents this same trap and checks for both; int did not.
	test_builtin test_bug_27936, which passes None for an int, a float, a
	Decimal and a Fraction -- and only the int leg failed."
	| n |
	((ndigits @env0:== None) or: [ndigits @env0:isNil]) ifTrue: [ ^ self ].
	"Anything else must be an integer, through __index__ as CPython takes it:
	``round(3, 'brian')'' is TypeError ('str' object cannot be interpreted as
	an integer).  It reached the kernel's ``'brian' < 0'', an uncatchable
	ArgumentTypeError that ended the run (test_long's test_round)."
	n := ndigits ___asIndex___.

	"If ndigits is negative, round to that many places left of decimal"
	(n @env0:< 0) ifTrue: [
		| divisor |
		divisor := (10 @env0:raisedTo: (n @env0:abs)).
		"TIES TO EVEN here too: ``round(25, -1)'' is 20, not 30.  The quotient
		is a Fraction, so the helper's exact tie test matters -- see
		object>>___roundHalfToEven___."
		^ ((self @env0:/ divisor) @env1:___roundHalfToEven___)
			@env0:* divisor
	].

	"If ndigits is non-negative, just return self"
	^ self

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rpow__: other [
	"Reverse power (other ** self)."

	(other isKindOf: Number) ifTrue: [^ other @env0:raisedTo: self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) @env0:raisedTo: self].
	^ self ___rbinOpFallback___: other op: '**'

]

{ #category : 'Grail-Bitwise Operations - Reverse' }
Integer >> __rrshift__: other [
	"Reverse right shift (other >> self)."

	(self @env0:< 0) ifTrue: [^ ValueError ___signal___: 'negative shift count'].
	(other isKindOf: Integer) ifTrue: [^ other ___pyShiftRight___: self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) ___pyShiftRight___: self].
	^ self ___rbinOpFallback___: other op: '>>'

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> __rshift__: other [
	"Right shift."

	(other isKindOf: Integer) ifTrue: [^ self ___pyShiftRight___: other].
	"An int subclass that overrides __rrshift__ answers first, as CPython's
	subclass priority has it: ``7 & IntFlag.X'' is the flag, not 3."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rrshift__:'.
		pri == nil ifFalse: [^ pri]].
	(self ___isPyIntOperand___: other) ifTrue: [^ self ___pyShiftRight___: other __index__].
	^ self ___binOpFallback___: other op: '>>' reflected: #'__rrshift__:'

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rsub__: other [
	"Reverse subtract (other - self)."

	(other isKindOf: Number) ifTrue: [^ other @env0:- (self)].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) @env0:- (self)].
	^ self ___rbinOpFallback___: other op: '-'

]

{ #category : 'Grail-Arithmetic - Reverse' }
Integer >> __rtruediv__: other [
	"Reverse true division (other / self).  As with __truediv__, int/int is
	float division (self is the divisor here)."
	"Reverse form: other OP self -- self is the divisor."
	(ZeroDivisionError @env0:___isZeroDivisor___: self) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].

	(other isKindOf: Integer) ifTrue: [^ other ___intTrueDivFloat___: self].
	(other isKindOf: Number) ifTrue: [^ other @env0:/ self].
	(self ___isPyIntOperand___: other) ifTrue: [
			^ (other __index__) ___intTrueDivFloat___: self].
	^ self ___rbinOpFallback___: other op: '/'

]

{ #category : 'Grail-Bitwise Operations - Reverse' }
Integer >> __rxor__: other [
	"Reverse bitwise XOR (other ^ self)."

	(other isKindOf: Integer) ifTrue: [^ other ___pyBitXor___: self].
	(self ___isPyIntOperand___: other) ifTrue: [^ (other __index__) ___pyBitXor___: self].
	^ self ___rbinOpFallback___: other op: '^'

]

{ #category : 'Grail-String Representation' }
Integer >> __str__ [
	"Return string representation of integer."

	self ___checkIntStrDigitLimit___.
	^ (self @env0:printString) @env0:asUnicodeString

]

{ #category : 'Grail-Arithmetic' }
Integer >> __sub__: other [
	"Subtract other from self."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rsub__:'.
		pri == nil ifFalse: [^ pri]].
	(other isKindOf: Number) ifTrue: [^ (self ___checkedAgainst___: other) @env0:- (other)].
	(self ___isPyIntOperand___: other) ifTrue: [^ self @env0:- ((other __index__))].
	^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'

]

{ #category : 'Grail-Arithmetic' }
Integer >> __truediv__: other [
	"True division.  CPython's `/` is ALWAYS float division: int/int yields
	a float (the exact quotient rounded to nearest), NOT an exact rational.
	Only int/int is coerced here; int/float already gives a float and
	int/<GemStone Fraction> keeps its (pre-existing) exact result."
	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rtruediv__:'.
		pri == nil ifFalse: [^ pri]].
	"CPython: division/modulo by zero raises catchable ZeroDivisionError;
	the kernel ZeroDivide is uncatchable."
	(ZeroDivisionError @env0:___isZeroDivisor___: other) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].

	(other isKindOf: Integer) ifTrue: [^ self ___intTrueDivFloat___: other].
	"An int SUBCLASS instance is an int too, and int/int is a float.  The
	kernel's ``/'' coerced the wrapper to its plain value and answered an exact
	Smalltalk Fraction -- ``1 / MyInt(2)'' printed 1/2."
	(other isKindOf: AbstractPyInt) ifTrue: [^ self ___intTrueDivFloat___: other @env0:value].
	(other isKindOf: Number) ifTrue: [^ (self ___checkedAgainst___: other) @env0:/ other].
	(self ___isPyIntOperand___: other) ifTrue: [
			^ self ___intTrueDivFloat___: (other __index__)].
	^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'

]

{ #category : 'Grail-Rounding' }
Integer >> __trunc__ [
	"Truncate to integer (returns self)."

	^ self

]

{ #category : 'Grail-Bitwise Operations' }
Integer >> __xor__: other [
	"Bitwise XOR."

	(other isKindOf: Integer) ifTrue: [^ self ___pyBitXor___: other].
	"An int subclass that overrides __rxor__ answers first, as CPython's
	subclass priority has it: ``7 & IntFlag.X'' is the flag, not 3."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rxor__:'.
		pri == nil ifFalse: [^ pri]].
	(self ___isPyIntOperand___: other) ifTrue: [^ self ___pyBitXor___: (other __index__)].
	^ self ___binOpFallback___: other op: '^' reflected: #'__rxor__:'

]

{ #category : 'Grail-Integer Methods' }
Integer >> _to_bytes: positional kw: kwargs [
	"``(258).to_bytes(length=2, byteorder='little', signed=True)'' -- all
	three are nameable in CPython, and matched no selector here."

	| length byteorder signed |

	length := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [int ___keyword: 'length' in: kwargs ifAbsent: [1]].
	byteorder := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [int ___keyword: 'byteorder' in: kwargs ifAbsent: ['big']].
	signed := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [int ___keyword: 'signed' in: kwargs ifAbsent: [false]].
	^ self to_bytes: length _: byteorder _: signed ___isTruthy___

]

{ #category : 'Grail-Integer Methods' }
Integer >> as_integer_ratio [
	"Return a pair of integers whose ratio is exactly equal to the original int.
	For integers, this is (self, 1)."

	^ tuple @env0:with: self with: 1

]

{ #category : 'Grail-Integer Methods' }
Integer >> bit_count [
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

]

{ #category : 'Grail-Integer Methods' }
Integer >> bit_length [
	"Return the number of bits necessary to represent self in binary."

	| n count |
	n := self @env0:abs.
	count := 0.
	[(n @env0:> 0)] whileTrue: [
		n := n @env0:bitShift: -1.
		count := (count @env0:+ 1).
	].
	^ count

]

{ #category : 'Grail-Integer Methods' }
Integer >> conjugate [
	"Return the complex conjugate (self for real numbers)."

	^ self

]

{ #category : 'Grail-Properties' }
Integer >> denominator [
	"Return the denominator (1)."

	^ 1

]

{ #category : 'Grail-Properties' }
Integer >> imag [
	"Return the imaginary part (0)."

	^ 0

]

{ #category : 'Grail-Integer Methods' }
Integer >> is_integer [
	"Return True (integers are always integers)."

	^ true

]

{ #category : 'Grail-Properties' }
Integer >> numerator [
	"Return the numerator (self)."

	^ self

]

{ #category : 'Grail-Properties' }
Integer >> real [
	"Return the real part (self)."

	^ self

]

{ #category : 'Grail-Integer Methods' }
Integer >> to_bytes [
	"``(12).to_bytes()'' -- length defaults to 1 and byteorder to 'big' in
	CPython since 3.11, and the defaulted spellings are what code written
	since then uses.  Grail had only the two- and three-argument forms, so
	CPython's own ipaddress -- which writes ``self._ip.to_bytes(4)'' -- could
	not run here."

	^ self to_bytes: 1 _: 'big' _: false

]

{ #category : 'Grail-Integer Methods' }
Integer >> to_bytes: length [
	"``(258).to_bytes(4)'' -- byteorder defaults to 'big'; see to_bytes."

	^ self to_bytes: length _: 'big' _: false

]

{ #category : 'Grail-Integer Methods' }
Integer >> to_bytes: length _: byteorder [
	"int.to_bytes(length, byteorder='big', *, signed=False) —
	2-arg form, delegates to the 3-arg form with signed=false.
	The selector was previously ``to_bytes:byteorder:signed:'' which
	doesn't exist (Python-keyword style accidentally used instead
	of Grail's ``_:'' convention)."

	^ self to_bytes: length _: byteorder _: false

]

{ #category : 'Grail-Integer Methods' }
Integer >> to_bytes: length _: byteorder _: signed [
	"int.to_bytes(length, byteorder='big', *, signed=False)
	Return an array of bytes representing an integer."

	| numBytes isBigEndian isSigned val bytes |
	numBytes := length.
	isBigEndian := (byteorder @env0:= 'big').
	isSigned := (signed == true) or: [signed == true].
	val := self.

	((val @env0:< 0) and: [isSigned @env0:not]) ifTrue: [
		OverflowError ___signal___: 'can''t convert negative int to unsigned'].
	(self ___fitsInBytes___: numBytes signed: isSigned) ifFalse: [
		OverflowError ___signal___: 'int too big to convert'].
	"Two's complement"
	(val @env0:< 0) ifTrue: [
		val := (1 @env0:bitShift: (numBytes @env0:* 8)) @env0:+ val].

	"A BYTES OBJECT, not a tuple.  The method built a ``tuple'' of the byte
	VALUES, so ``(42).to_bytes(2, 'little')'' answered ``(42, 0)'' where CPython
	answers ``b'*\\x00''' -- the same numbers, the wrong type, and a wrong type
	that prints plausibly.  Anything that then indexed or concatenated the
	result got a tuple and said so somewhere else entirely.

	ByteArray is Grail's bytes; each element is already the 0..255 value the
	loop computes."
	bytes := ByteArray @env0:new: numBytes.
	1 @env0:to: numBytes do: [:i |
		| byteVal idx |
		byteVal := (val @env0:bitAnd: 16rFF).
		idx := isBigEndian
			ifTrue: [(numBytes @env0:- (i @env0:- 1))]
			ifFalse: [i].
		bytes @env0:at: idx put: byteVal.
		val := val @env0:bitShift: -8].
	^ bytes

]
