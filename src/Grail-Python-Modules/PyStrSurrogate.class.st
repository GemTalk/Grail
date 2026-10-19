"A Python ``str`` whose code points GemStone cannot hold in a Character.

# The mismatch
CPython's str is a sequence of CODE POINTS, 0..0x10FFFF, INCLUDING the
surrogate block D800..DFFF.  GemStone's Character is a Unicode SCALAR
VALUE -- code points minus that block -- so ``Character codePoint:
16rD800' raises OutOfRange and no CharacterCollection can hold one.
This is not an encoding difference: both systems store a fixed-width
array of code points and encode to UTF-8 only on the way out (CPython
refuses a lone surrogate there too -- ``'\ud800'.encode('utf-8')'
raises UnicodeEncodeError, exactly as Grail does).  The difference is
the VALUE SET the character type admits.

CPython needs the surrogate block because of PEP 383 ``surrogateescape':
bytes from the OS that are not valid UTF-8 -- filenames, argv, environ --
are mapped to U+DC80..U+DCFF so they round-trip.  So these strings are
not exotica; they are what you get when a filename is not UTF-8.

# Why a class rather than a rejection
The literal is usually incidental -- one filename in one test -- but a
tokenizer that refuses it fails the whole MODULE, since Grail compiles
every method body at import.  Five wired CPython modules scored
IMPORTERROR on a single literal each (test_builtin, test_codecs,
test_linecache, test_struct, test_warnings), losing roughly two thousand
unrelated tests between them.

# Where it fits
AbstractPyStr already exists for ``a Python str that is not a
CharacterCollection' (StrEnum, ``class X(str)'), and Grail's type
mapping is already many-to-one -- str is Unicode7 AND Unicode16 AND
Unicode32 AND String AND AbstractPyStr, just as int is SmallInteger AND
LargeInteger.  This is one more, and ``type(x).__name__' answers
``str' via object >> ___pythonTypeIdentity___.

# What it does NOT inherit
AbstractPyStr gets the whole str surface for free by forwarding every
unknown env-1 message to a real Unicode7 in ``#value'.  That is exactly
what a surrogate string cannot do -- there is no valid Unicode7 to
forward to -- so this class stores an Array of code points and
implements its protocol directly.  doesNotUnderstand: is overridden to
RAISE rather than forward, so an unimplemented str method is a clear
error and never a silently wrong answer against an empty string.

# Storage
``codePoints' is an OrderedCollection of Integers, one per Python
character.  Fixed-width by construction, so __len__ and __getitem__ are
O(1) -- the same reason CPython (PEP 393) and GemStone both chose a
code-point array over UTF-8.  Compactness does not matter here: these
strings are rare and short.  During tokenization the same object is the
ACCUMULATOR (add: / addCodePoint: / lf); it is immutable from Python."
Class {
	#name : 'PyStrSurrogate',
	#superclass : 'AbstractPyStr',
	#instVars : [
		'codePoints'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Shared' }
PyStrSurrogate class >> ___compare___: a with: b [
	"Three-way lexicographic comparison of two Python str-likes by CODE POINT
	-- -1, 0 or 1 -- or nil when either operand is not a str.

	Code point order is Python's string order, and it is also the only order
	defined across the two representations: GemStone's ``<'' is an ICU
	collation under enableUnicodeComparisonMode (see
	CharacterCollection >> ___codePointCompare___), and it cannot see a
	PyStrSurrogate at all."

	| ca cb lim x y |
	ca := a ___pyCodePoints___.
	ca == nil ifTrue: [^ nil].
	cb := b ___pyCodePoints___.
	cb == nil ifTrue: [^ nil].
	lim := ca size min: cb size.
	1 to: lim do: [:i |
		x := ca at: i.
		y := cb at: i.
		x < y ifTrue: [^ -1].
		x > y ifTrue: [^ 1]].
	ca size < cb size ifTrue: [^ -1].
	ca size > cb size ifTrue: [^ 1].
	^ 0

]

{ #category : 'Grail-Shared' }
PyStrSurrogate class >> ___concat___: a with: b [
	"``a + b'' for two Python str-likes, or nil when either is not a str.

	Answers an ordinary string whenever the result has no surrogate in it --
	___fromCodePoints___ demotes -- so this is safe to reach for without first
	asking which representation the operands were."

	| ca cb |
	ca := a ___pyCodePoints___.
	ca == nil ifTrue: [^ nil].
	cb := b ___pyCodePoints___.
	cb == nil ifTrue: [^ nil].
	^ self ___fromCodePoints___: ca , cb

]

{ #category : 'Grail-Instantiation' }
PyStrSurrogate class >> ___fromCodePoints___: aCollection [
	"Build from a collection of Integer code points.  The emitted form of a
	surrogate-bearing literal (see ConstantAst >> printSmalltalkOn:) is a
	send of this, because such a literal cannot be written as Smalltalk
	source text.

	DEMOTES to an ordinary string when no code point is actually a
	surrogate, which establishes the invariant the rest of the class rests
	on: a PyStrSurrogate always contains at least one surrogate.  That is
	what makes ``__eq__'' against a CharacterCollection correctly always
	false, and it is not a micro-optimisation -- without it ``t[0]'' on
	``a\\udc80b'' answered a PyStrSurrogate holding just ``a'', which then
	compared UNEQUAL to ``'a''': a silently wrong answer, and exactly the
	hazard a second representation invites.  Indexing, iterating and
	concatenating out of the surrogate all return ordinary strings."

	| inst hasSurrogate str |
	hasSurrogate := aCollection anySatisfy: [:cp |
		cp >= 16rD800 and: [cp <= 16rDFFF]].
	hasSurrogate ifFalse: [
		str := Unicode7 new.
		aCollection do: [:cp | str addCodePoint: cp].
		^ str].
	inst := self basicNew.
	inst ___setCodePoints___: (OrderedCollection withAll: aCollection).
	^ inst

]

{ #category : 'Grail-Shared' }
PyStrSurrogate class >> ___indexOf___: sub in: hay from: start [
	"The 1-based index of the first occurrence of str-like ``sub'' in str-like
	``hay'' at or after 1-based ``start'', 0 when absent, or nil when either
	operand is not a str.  An empty needle matches at ``start''.

	Scans by code point for the same reason ___compare___ does, and because
	GemStone's includesString: / findString: are case-INSENSITIVE under
	enableUnicodeComparisonMode."

	| ca cb n m hit |
	ca := hay ___pyCodePoints___.
	ca == nil ifTrue: [^ nil].
	cb := sub ___pyCodePoints___.
	cb == nil ifTrue: [^ nil].
	n := ca size.
	m := cb size.
	m = 0 ifTrue: [^ start min: n + 1].
	start to: n - m + 1 do: [:i |
		hit := true.
		1 to: m do: [:k |
			((ca at: i + k - 1) = (cb at: k)) ifFalse: [hit := false]].
		hit ifTrue: [^ i]].
	^ 0

]

{ #category : 'Grail-Instantiation' }
PyStrSurrogate class >> ___onPrefix___: aCharacterCollection [
	"Promote a partially-scanned literal.  PythonTokenizer accumulates into
	a Unicode7 and switches to this class the moment a \\u / \\U escape names
	a surrogate; the characters already scanned come across as code points."

	| inst cps |
	cps := OrderedCollection new.
	aCharacterCollection do: [:c | cps add: c codePoint].
	inst := self basicNew.
	inst ___setCodePoints___: cps.
	^ inst

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate class >> ___viaPlaceholderNames___ [
	"The str methods answered through placeholders -- see above."

	^ #(#replace #split #rsplit #find #rfind #index #rindex #count
		#strip #lstrip #rstrip #partition #rpartition #removeprefix #removesuffix
		#splitlines #ljust #rjust #center #zfill #expandtabs
		#title #capitalize #swapcase #join
		#isalpha #isalnum #isdecimal #isdigit #isnumeric #isidentifier
		#isprintable #isspace #islower #isupper #istitle #isascii)

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___addStrOperandsIn___: anObject to: operands [
	"A str operand, or each str in an Array of them (join's materialized
	iterable)."

	(self ___isStrOperand___: anObject) ifTrue: [^ operands add: anObject].
	(anObject isKindOf: Array) ifTrue: [
		anObject do: [:e | (self ___isStrOperand___: e) ifTrue: [operands add: e]]]

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___appendUTF8___: cp to: aByteArray [
	"One code point as UTF-8 bytes.  Split out of ___wtf8Bytes___ so the
	surrogateescape encoder shares the multi-byte arithmetic instead of
	restating it."

	cp < 16r80 ifTrue: [^ aByteArray add: cp].
	cp < 16r800 ifTrue: [
		aByteArray add: (16rC0 bitOr: (cp bitShift: -6)).
		^ aByteArray add: (16r80 bitOr: (cp bitAnd: 16r3F))].
	cp < 16r10000 ifTrue: [
		aByteArray add: (16rE0 bitOr: (cp bitShift: -12)).
		aByteArray add: (16r80 bitOr: ((cp bitShift: -6) bitAnd: 16r3F)).
		^ aByteArray add: (16r80 bitOr: (cp bitAnd: 16r3F))].
	aByteArray add: (16rF0 bitOr: (cp bitShift: -18)).
	aByteArray add: (16r80 bitOr: ((cp bitShift: -12) bitAnd: 16r3F)).
	aByteArray add: (16r80 bitOr: ((cp bitShift: -6) bitAnd: 16r3F)).
	^ aByteArray add: (16r80 bitOr: (cp bitAnd: 16r3F))

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___carrierFor___: anObject map: map [
	"anObject with its surrogates swapped for their placeholders, when it is a
	surrogate str; anything else unchanged."

	| out |
	(anObject isKindOf: PyStrSurrogate) ifFalse: [^ anObject].
	out := Unicode7 new.
	anObject ___codePoints___ do: [:cp | out addCodePoint: (map at: cp ifAbsent: [cp])].
	^ out

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___carrierIn___: anObject map: map [
	"___carrierFor___:map:, reaching one level into join's Array too."

	(anObject isKindOf: Array) ifTrue: [
		^ anObject collect: [:e | self ___carrierFor___: e map: map]].
	^ self ___carrierFor___: anObject map: map

]

{ #category : 'Grail-Accessors' }
PyStrSurrogate >> ___codePoints___ [
	"The Integer code points, one per Python character."

	^ codePoints

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___emitUnit___: aValue on: aStream wide: isWide littleEndian: isLE [
	"One 16- or 32-bit unit in the requested byte order."

	| n bytes |
	n := isWide ifTrue: [4] ifFalse: [2].
	bytes := (1 @env0:to: n) @env0:collect: [:i |
		(aValue @env0:bitShift: (i @env0:- 1) @env0:* -8) @env0:bitAnd: 16rFF].
	isLE
		ifTrue: [bytes @env0:do: [:b | aStream @env0:nextPut: b]]
		ifFalse: [bytes @env0:reverseDo: [:b | aStream @env0:nextPut: b]]

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___escapeBytes___: enc [
	"unicode-escape / raw-unicode-escape for a string carrying surrogates.

	Both spell a surrogate as an ordinary \\uXXXX escape -- there is nothing
	special about one to an escape codec.

	ASSEMBLED AS BYTES, not as text handed back to the encoder.  Writing the
	escape into a string and encoding THAT escapes the backslash a second
	time, so \\ud800 came out as \\\\ud800; the surrogate's own bytes are
	emitted directly instead and the ordinary characters go through the
	codec in RUNS.  Runs are safe here in a way they are not for utf-16: an
	escape codec is stateless and writes no byte-order mark, so a run
	carries no preamble to repeat."

	| out run digits flush |
	digits := '0123456789abcdef'.
	out := WriteStream @env0:on: ByteArray @env0:new.
	run := WriteStream @env0:on: String @env0:new.
	flush := [ | text |
		text := run @env0:contents.
		text @env0:isEmpty ifFalse: [
			out @env0:nextPutAll: (text @env1:encode: enc _: 'strict').
			run := WriteStream @env0:on: String @env0:new]].
	codePoints @env0:do: [:cp |
		(self @env0:___isSurrogate___: cp)
			ifTrue: [
				flush @env0:value.
				out @env0:nextPut: 92.
				out @env0:nextPut: 117.
				4 @env0:to: 1 by: -1 do: [:shift |
					out @env0:nextPut: ((digits @env0:at:
						((cp @env0:bitShift: (shift @env0:- 1) @env0:* -4)
							@env0:bitAnd: 15) @env0:+ 1) @env0:codePoint)]]
			ifFalse: [run @env0:nextPut: (Character @env0:codePoint: cp)]].
	flush @env0:value.
	^ out @env0:contents

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___firstUnescapableSurrogate___ [
	"The 1-based index of the first surrogate that ``surrogateescape'' cannot
	turn back into a byte -- one outside U+DC80..U+DCFF, which never came
	from a byte -- or nil."

	^ codePoints @env0:findFirst: [:cp |
		(self @env0:___isSurrogate___: cp)
			@env0:and: [(cp @env0:between: 16rDC80 and: 16rDCFF) @env0:not]]

]

{ #category : 'Grail-Printing' }
PyStrSurrogate >> ___hex4___: anInteger [
	"Four lower-case hex digits, zero padded."

	| ws s |
	ws := WriteStream on: Unicode7 new.
	anInteger printOn: ws base: 16.
	"printOn:base: emits a ``16r'' radix prefix -- strip it."
	s := ws contents copyFrom: 4 to: ws contents size.
	s := s asLowercase.
	[s size < 4] whileTrue: [s := '0' , s].
	^ s

]

{ #category : 'Grail-Testing' }
PyStrSurrogate >> ___isExactPyStr___ [
	"True -- ``type('\ud800') is str''.  This class is not reachable as the
	allocation class of a user ``class X(str)'' (that is AbstractPyStr's job),
	so no instance can carry a user-written __eq__ / __lt__ / __radd__ and
	str's own binary dunders may settle against it directly.  See
	object >> ___isExactPyStr___."

	^ true

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___isStrOperand___: anObject [

	^ (anObject isKindOf: CharacterCollection) or: [anObject isKindOf: PyStrSurrogate]

]

{ #category : 'Grail-Testing' }
PyStrSurrogate >> ___isSurrogate___: aCodePoint [

	^ aCodePoint >= 16rD800 and: [aCodePoint <= 16rDFFF]

]

{ #category : 'Grail-Comparison' }
PyStrSurrogate >> ___orderAgainst___: other op: opName code: which [
	"The body of __lt__ / __le__ / __gt__ / __ge__: compare by code point and
	test the three-way result.  ``which'' is 1..4 for < <= > >=.

	One method rather than four bodies because the only thing that differs is
	the final test, and because the TypeError wording for a non-str operand
	has to be identical across all four."

	| c |
	c := PyStrSurrogate ___compare___: self with: other.
	c == nil ifTrue: [
		^ TypeError @env1:___signal___:
			'''' , opName , ''' not supported between instances of ''str'' and '''
				, (other class name asString) , ''''].
	which = 1 ifTrue: [^ c < 0].
	which = 2 ifTrue: [^ c <= 0].
	which = 3 ifTrue: [^ c > 0].
	^ c >= 0

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___placeholderMapFor___: operands [
	"Surrogate code point -> placeholder, one placeholder per distinct
	surrogate, each a plane-16 private-use code point that no operand holds.
	Plane 16 has 65534 of them and there are only 2048 surrogates, so the
	search always succeeds."

	| used map next |
	used := Set new.
	operands do: [:o |
		o ___pyCodePoints___ do: [:cp | cp >= 16r100000 ifTrue: [used add: cp]]].
	map := Dictionary new.
	next := 16r100000.
	operands do: [:o |
		(o isKindOf: PyStrSurrogate) ifTrue: [
			o ___codePoints___ do: [:cp |
				((self ___isSurrogate___: cp) and: [(map includesKey: cp) not]) ifTrue: [
					[used includes: next] whileTrue: [next := next + 1].
					map at: cp put: next.
					next := next + 1]]]].
	^ map

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___placeholderSend___: aSelector args: anArray [
	"A block answering the result of the send, when aSelector spells one of
	___viaPlaceholderNames___; nil otherwise.  A block, so that a method whose
	answer is nil stays distinguishable from ``not one of these''."

	| s idx pyName |
	s := aSelector asString.
	(s endsWith: ':kw:')
		ifTrue: [pyName := (s copyFrom: 2 to: s size - 4) asSymbol]
		ifFalse: [
			idx := s indexOf: $:.
			pyName := (idx = 0 ifTrue: [s] ifFalse: [s copyFrom: 1 to: idx - 1]) asSymbol].
	(PyStrSurrogate ___viaPlaceholderNames___ includes: pyName) ifFalse: [^ nil].
	(s endsWith: ':kw:') ifTrue: [
		^ [self ___viaPlaceholders___: pyName positional: (anArray at: 1) kw: (anArray at: 2)]].
	^ [self ___viaPlaceholders___: pyName positional: anArray kw: nil]

]

{ #category : 'Grail-Accessors' }
PyStrSurrogate >> ___pyCodePoints___ [
	"See object >> ___pyCodePoints___.  A COPY: the shared accessor is read by
	scanning loops all over str.gs, and this class's own instances are the
	accumulator PythonTokenizer mutates mid-literal, so handing out the live
	OrderedCollection would let a caller alias a string that is still growing.
	These strings are short by construction, so the copy is not worth
	avoiding."

	^ codePoints asArray

]

{ #category : 'Grail-Accessors' }
PyStrSurrogate >> ___pyPlainStr___ [
	"nil -- and that IS the answer, not a failure.  A PyStrSurrogate always
	contains at least one surrogate (___fromCodePoints___ demotes when it does
	not), and no CharacterCollection can hold one.  See object >>
	___pyPlainStr___."

	^ nil

]

{ #category : 'Grail-Printing' }
PyStrSurrogate >> ___pyRepr___ [
	"CPython's repr: printable characters verbatim, a surrogate as \\udXXX.
	``repr(''a\\udc80b'')'' is ``''a\\udc80b'''' -- lower-case hex, four digits."

	| ws quote quoteCp hasSingle hasDouble escaper |
	"THE SAME ESCAPING AS str's repr, through the same method.  This used to
	emit every non-surrogate code point VERBATIM, so a string holding both a
	surrogate and a control character came back with a real NUL, a real
	newline and a real tab in it -- while the same string WITHOUT the
	surrogate escaped all three, because that one took CharacterCollection's
	repr instead.  One rule, two implementations, and only one maintained.

	The DELIMITER is chosen the same way too: single quotes unless the string
	contains a single quote and no double quote, so the delimiter need not be
	escaped.  This always used a single quote and escaped it.

	``escaper'' is an empty plain string, and the receiver is why it is here:
	___pyReprEscapeCodePoint___ is a pure function of the code point, but it
	is an instance method on CharacterCollection (the printability rule it
	defers to is one), and PyStrSurrogate is not a CharacterCollection.  Held
	in a temp so the allocation happens once per repr rather than once per
	character."
	hasSingle := false.
	hasDouble := false.
	codePoints do: [:cp |
		cp = 39 ifTrue: [hasSingle := true].
		cp = 34 ifTrue: [hasDouble := true]].
	quote := (hasSingle and: [hasDouble not]) ifTrue: [$"] ifFalse: [$'].
	quoteCp := quote codePoint.
	escaper := Unicode7 new.
	ws := WriteStream on: Unicode7 new.
	ws nextPut: quote.
	codePoints do: [:cp |
		(self ___isSurrogate___: cp)
			ifTrue: [
				"A lone surrogate is spelled \udXXX whatever its printability
				-- it has no character to emit."
				ws nextPutAll: '\u'.
				ws nextPutAll: (self ___hex4___: cp)]
			ifFalse: [
				escaper @env1:___pyReprEscapeCodePoint___: cp quote: quoteCp on: ws]].
	ws nextPut: quote.
	^ ws contents

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___restore___: aResult inverse: inverse [
	"aResult with every placeholder swapped back for its surrogate: a str, or
	the strs in a list or tuple (split, partition).  Anything else -- an index,
	a count, a bool -- is unchanged."

	| cps hit |
	inverse isEmpty ifTrue: [^ aResult].
	(aResult isKindOf: CharacterCollection) ifTrue: [
		hit := false.
		cps := OrderedCollection new.
		aResult do: [:c | | cp |
			cp := c codePoint.
			(inverse includesKey: cp) ifTrue: [hit := true. cp := inverse at: cp].
			cps add: cp].
		^ hit ifTrue: [PyStrSurrogate ___fromCodePoints___: cps] ifFalse: [aResult]].
	(aResult isKindOf: OrderedCollection) ifTrue: [
		1 to: aResult size do: [:i |
			aResult at: i put: (self ___restore___: (aResult at: i) inverse: inverse)].
		^ aResult].
	(aResult isKindOf: tuple) ifTrue: [
		^ aResult class withAll: (aResult asArray collect: [:e |
			self ___restore___: e inverse: inverse])].
	^ aResult

]

{ #category : 'Grail-Accessors' }
PyStrSurrogate >> ___setCodePoints___: anOrderedCollection [

	codePoints := anOrderedCollection

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___signalSurrogateEncodeError___: encoding at: anIndex [
	"Raise CPython's UnicodeEncodeError for the surrogate at anIndex (1-based
	into codePoints), with the five arguments rather than a bare message.

	The message used to be a constant -- ``can't encode character in position
	0'' -- whatever the string, so '\\ud800' at position 1 reported position
	0 and no character, and ``exc.start'' / ``exc.end'' described nothing.
	CPython's span is the RUN of consecutive surrogates starting there, which
	is what its message counts: ``characters in position 1-2'' for two."

	| start stop |
	start := (anIndex @env0:isNil or: [anIndex @env0:< 1]) ifTrue: [1] ifFalse: [anIndex].
	stop := start.
	[stop @env0:< codePoints @env0:size
		@env0:and: [self @env0:___isSurrogate___: (codePoints @env0:at: stop @env0:+ 1)]]
			@env0:whileTrue: [stop := stop @env0:+ 1].
	^ UnicodeEncodeError @env1:___signalNew___:
		{ encoding @env0:asString. self. start @env0:- 1. stop. 'surrogates not allowed' }
		kw: nil

]

{ #category : 'Grail-Accessors' }
PyStrSurrogate >> ___strValue___ [
	"AbstractPyStr delegates the whole str surface through here.  This class
	cannot: the value it holds is precisely the thing no CharacterCollection
	can represent.  Raising keeps an unimplemented operation LOUD -- the
	inherited version would answer an empty Unicode7 for a nil #value slot
	and every delegated method would then quietly compute on ''''."

	^ self ___unsupported___: 'coerced to a Smalltalk string'

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___surrogateEscapeBytes___: encoding [
	"The inverse of bytes>>___decodeSurrogateEscape___: -- PEP 383's
	``surrogateescape''.  A code point in U+DC80..U+DCFF is a SMUGGLED BYTE
	and goes back out as that byte; everything else is encoded normally, and
	anything the codec cannot represent is a UnicodeEncodeError.

	Only the DC80..DCFF window escapes.  A surrogate outside it never came
	from a byte -- it was written as a literal -- and CPython refuses it here
	too, which is what keeps the round trip honest rather than merely
	total."

	| enc out max |
	enc := encoding asString asLowercase.
	max := ((enc = 'ascii') or: [enc = 'us-ascii'])
		ifTrue: [127]
		ifFalse: [
			((enc = 'latin-1') or: [(enc = 'latin1') or: [enc = 'iso-8859-1']])
				ifTrue: [255]
				ifFalse: [
					((enc = 'utf-8') or: [enc = 'utf8'])
						ifTrue: [nil]
						ifFalse: [^ self ___surrogateEscapeViaRegistry___: encoding]]].
	out := ByteArray new.
	codePoints do: [:cp |
		(cp >= 16rDC80 and: [cp <= 16rDCFF])
			ifTrue: [out add: cp - 16rDC00]
			ifFalse: [
				(self ___isSurrogate___: cp)
					ifTrue: [^ self ___signalSurrogateEncodeError___: encoding
						at: (self ___firstUnescapableSurrogate___)]
					ifFalse: [
						max == nil
							ifTrue: [self ___appendUTF8___: cp to: out]
							ifFalse: [
								cp > max
									ifTrue: [^ UnicodeEncodeError @env1:___signal___:
										('''' , enc , ''' codec can''t encode character')]
									ifFalse: [out add: cp]]]]].
	^ out

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___surrogateEscapeViaRegistry___: encoding [
	"``surrogateescape'' through a REGISTERED codec.

	The three encodings handled above are handled by their maximum code
	point -- ascii stops at 127, latin-1 at 255, utf-8 at everything --
	which is all the escaping rule needs from them, and is why they are
	open-coded.  A charmap has no such number: iso-8859-3 maps 0xa1 and
	not 0xa5, so the only thing that knows what it can represent is the
	codec.

	So the string is split at the smuggled bytes and each ORDINARY RUN is
	handed to the codec whole.  Runs rather than characters because a
	codec is entitled to be stateful, and one character at a time would
	also pay a full registry round trip per character.

	The inverse of bytes >> ___decodeSurrogateEscape___:, which reaches
	the same codec the same way.  Before this, both ends answered
	LookupError for any encoding outside the built-in three -- so
	``'foo\udca5bar'.encode('iso-8859-3', 'surrogateescape')'' failed on a
	codec Grail had just registered (test_codecs SurrogateEscapeTest
	test_charmap)."

	| out run flush |
	out := ByteArray new.
	run := OrderedCollection new.
	flush := [
		run isEmpty ifFalse: [
			| piece |
			piece := (Python at: #importlib)
				___codecRoundTrip___: encoding
				selector: #'encode'
				with: (PyStrSurrogate ___fromCodePoints___: run)
				errors: 'strict'
				asWritten: encoding.
			piece == nil ifTrue: [^ LookupError @env1:___signal___:
				('unknown encoding: ' , encoding asString)].
			out := out , piece asByteArray.
			run := OrderedCollection new]].
	codePoints do: [:cp |
		(cp >= 16rDC80 and: [cp <= 16rDCFF])
			ifTrue: [
				flush value.
				out := out , (ByteArray with: cp - 16rDC00)]
			ifFalse: [
				(self ___isSurrogate___: cp)
					ifTrue: [^ self ___signalSurrogateEncodeError___: encoding
						at: (self ___firstUnescapableSurrogate___)].
				run add: cp]].
	flush value.
	^ bytes @env0:withAll: out

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___surrogatePassBytes___: encoding [
	"The bytes ``surrogatepass'' produces for this string in ``encoding'',
	or nil when the codec has no way to carry a surrogate.

	Each UTF spells one the same way it spells any other code point, which
	is the whole of the policy: utf-8 emits the three-byte WTF-8 form,
	utf-16 a bare 16-bit unit, utf-32 a bare 32-bit one.  A supplementary
	character still becomes a surrogate PAIR in utf-16 -- surrogatepass
	changes what is allowed through, not how the codec works.

	The BOM-bearing spellings (``utf-16'', ``utf-32'', ``utf-8-sig'') write
	it ONCE, at the front, which is why this builds the whole answer rather
	than delegating per character."

	| norm out le wide |
	norm := (encoding @env0:asString @env0:asLowercase)
		@env0:select: [:c | (c @env0:= $-) @env0:not @env0:and: [(c @env0:= $_) @env0:not]].
	(#('utf8' 'utf8sig') @env0:includes: norm) ifTrue: [
		^ (norm @env0:= 'utf8sig')
			ifTrue: [(ByteArray @env0:with: 16rEF @env0:with: 16rBB @env0:with: 16rBF)
				@env0:, self @env0:___wtf8Bytes___]
			ifFalse: [self @env0:___wtf8Bytes___]].
	(#('utf16' 'utf16le' 'utf16be' 'utf32' 'utf32le' 'utf32be')
		@env0:includes: norm) ifFalse: [^ nil].
	wide := (norm @env0:copyFrom: 1 to: 5) @env0:= 'utf32'.
	le := (norm @env0:endsWith: 'be') @env0:not.
	out := WriteStream @env0:on: ByteArray @env0:new.
	"The BOM for the unsuffixed spelling, in the byte order it selects."
	((norm @env0:= 'utf16') @env0:or: [norm @env0:= 'utf32']) ifTrue: [
		self @env0:___emitUnit___: 16rFEFF on: out wide: wide littleEndian: le].
	codePoints @env0:do: [:cp |
		(wide @env0:not @env0:and: [cp @env0:> 16rFFFF])
			ifTrue: [
				"Supplementary in utf-16: the ordinary surrogate pair."
				| v |
				v := cp @env0:- 16r10000.
				self @env0:___emitUnit___: (16rD800 @env0:+ (v @env0:bitShift: -10))
					on: out wide: false littleEndian: le.
				self @env0:___emitUnit___: (16rDC00 @env0:+ (v @env0:bitAnd: 16r3FF))
					on: out wide: false littleEndian: le]
			ifFalse: [
				self @env0:___emitUnit___: cp on: out wide: wide littleEndian: le]].
	^ out @env0:contents

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___unsupported___: what [

	"@env1: -- ___signal___: is a classmethod compiled in ENVIRONMENT 1, and
	this method is in the file's env-0 section, so a bare send answers a
	MessageNotUnderstood on the metaclass and the unsupported-operation
	report becomes an uncatchable Smalltalk error instead of a Python one."
	^ NotImplementedError @env1:___signal___:
		'str containing lone surrogates does not support ' , what asString
			, ' in Grail (GemStone Characters cannot hold code points D800-DFFF)'

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> ___viaPlaceholders___: aName positional: positional kw: kwargs [
	"Run the str method aName on this string with surrogates swapped for
	placeholders, and map the answer back."

	| args operands map inverse carrier newArgs newKw result |
	args := positional isNil ifTrue: [#()] ifFalse: [positional asArray].
	"join's one argument is an ITERABLE of strings: materialize it, so each
	element is an operand like any other."
	(aName == #join and: [args size = 1]) ifTrue: [
		args := { (args at: 1) ___pyStarToArray___ }].
	operands := OrderedCollection new.
	operands add: self.
	args do: [:a | self ___addStrOperandsIn___: a to: operands].
	(kwargs notNil and: [kwargs ~~ None]) ifTrue: [
		kwargs valuesDo: [:v | self ___addStrOperandsIn___: v to: operands]].
	map := self ___placeholderMapFor___: operands.
	inverse := Dictionary new.
	map keysAndValuesDo: [:k :v | inverse at: v put: k].
	carrier := self ___carrierFor___: self map: map.
	newArgs := args collect: [:a | self ___carrierIn___: a map: map].
	newKw := (kwargs isNil or: [kwargs == None]) ifTrue: [nil] ifFalse: [
		| d |
		d := kwargs class new.
		kwargs keysAndValuesDo: [:k :v | d at: k put: (self ___carrierFor___: v map: map)].
		d].
	result := (carrier @env1:___pyAttrLoad___: aName) @env1:value: newArgs value: newKw.
	^ self ___restore___: result inverse: inverse

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___wtf8Bytes___ [
	"The ``surrogatepass'' encoding: plain UTF-8, except that a surrogate is
	encoded in the three-byte form rather than refused (U+D800 -> ED A0 80).
	Same bytes CPython answers for encode('utf-8', 'surrogatepass')."

	| out |
	out := ByteArray new.
	codePoints do: [:cp | self ___appendUTF8___: cp to: out].
	^ out

]

{ #category : 'Grail-Comparison' }
PyStrSurrogate >> = other [

	(other isKindOf: PyStrSurrogate) ifFalse: [^ false].
	^ codePoints = other ___codePoints___

]

{ #category : 'Grail-Tokenizer' }
PyStrSurrogate >> add: aCharacter [

	codePoints add: aCharacter codePoint.
	^ aCharacter

]

{ #category : 'Grail-Tokenizer' }
PyStrSurrogate >> addCodePoint: anInteger [

	codePoints add: anInteger.
	^ anInteger

]

{ #category : 'Grail-Accessors' }
PyStrSurrogate >> asString [
	"Refuse, rather than answer GemStone's Object>>asString.

	``___strValue___'' already refuses, but only the DELEGATING paths consult
	it -- ``asString'' is understood by Object, so it never reached the
	doesNotUnderstand: hook and quietly answered the literal text
	'aPyStrSurrogate'.  ``'%s' % filename'' produced exactly that: not an
	error, an ANSWER, and a wrong one.  A partial surface has to fail loudly
	or it is worse than no surface at all."

	^ self ___strValue___

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> copyFrom: startIndex to: stopIndex [
	"Smalltalk slice semantics: 1-based, stop INCLUSIVE.

	Sent in environment 0 by CPythonShim >> PyUnicode_Substring:from:to:,
	which is how _sre hands a matched span back -- so without this, a
	surrogate SUBJECT could be matched against but the match could not be
	read: ``re.findall('[a-z]', 'a\\ud800b')'' died on an env-0 DNU (this
	class's own doesNotUnderstand: hook forwards env 1 only).

	Code points are the one view that slices cleanly here, and
	___fromCodePoints___: applies the class invariant for free: a span with
	no surrogate left in it comes back as an ordinary Unicode7, so slicing
	OUT of a surrogate string narrows exactly as indexing already does."

	^ PyStrSurrogate ___fromCodePoints___:
		(codePoints copyFrom: startIndex to: stopIndex)

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> doesNotUnderstand: aSelector args: anArray envId: envId [
	"AbstractPyStr forwards unknown env-1 messages to its wrapped Unicode7.
	There is none here, so forwarding would compute against an empty string
	and answer a confident wrong result.  Raise instead: the str surface
	this class implements is deliberately partial, and what it does not
	implement must say so."

	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId].
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	"A direct send of one of the placeholder methods -- ``replace:_:'',
	``_split:kw:'' -- runs the same way as the call through __getattr__:."
	(self ___placeholderSend___: aSelector args: anArray)
		ifNotNil: [:answer | ^ answer value].
	^ self ___unsupported___: aSelector asString

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> encodeAsUTF8 [
	"WTF-8, because there is no other answer a lone surrogate can give.

	The C shim's get_ucs4_for_string fetches a string's content by sending
	this selector -- GemStone's own encoder, used because raw GciFetchBytes_
	bytes are only UTF-8-shaped for 7-bit content.  With no implementation
	here the env-0 send hit Object's doesNotUnderstand: (this class's own
	hook forwards only env 1), so a surrogate str could not cross into C at
	all.

	Strict UTF-8 cannot encode D800..DFFF, so answering the three-byte form
	is the only representation that survives the round trip -- and it is not
	an invention: it is exactly what CPython's own encode('utf-8',
	'surrogatepass') answers, and what ___pyStrEncode___ already hands back
	for that error handler.  The shim's utf8_to_ucs4 decodes the three-byte
	form arithmetically, without a surrogate check, so it reads back as the
	same code point.

	No existing Smalltalk sender reaches this: str.gs's encode path is on
	CharacterCollection, and this class implements its own encode."

	^ self ___wtf8Bytes___

]

{ #category : 'Grail-Comparison' }
PyStrSurrogate >> hash [

	^ codePoints hash

]

{ #category : 'Grail-Tokenizer' }
PyStrSurrogate >> lf [

	codePoints add: 10.
	^ self

]

{ #category : 'Grail-Printing' }
PyStrSurrogate >> printOn: aStream [
	"Smalltalk printString answers the PYTHON repr, so a surrogate string
	appearing in a scoreboard detail or a debugger reads the way the test
	that produced it wrote it."

	aStream nextPutAll: self ___pyRepr___

]

{ #category : 'Grail-Tokenizer' }
PyStrSurrogate >> size [

	^ codePoints size

]
