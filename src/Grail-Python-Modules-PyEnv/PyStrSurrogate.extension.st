Extension { #name : 'PyStrSurrogate' }

{ #category : 'Grail-Shared' }
PyStrSurrogate class >> ___translate___: aStr table: table [
	"CPython's str.translate, on code points, for any str-like: each code point
	is looked up in table (any mapping, or a sequence); a LookupError keeps it,
	None deletes it, an int or a str replaces it.  The one implementation that
	can produce -- or read -- a lone surrogate, so str.gs falls back to it when
	a replacement is one."

	| out |
	out := OrderedCollection @env0:new.
	aStr @env0:___pyCodePoints___ @env0:do: [:cp | | v |
		v := [table __getitem__: cp]
			@env0:on: LookupError do: [:ex | ex @env0:return: #'___keep___'].
		v == #'___keep___'
			ifTrue: [out @env0:add: cp]
			ifFalse: [
				v == None ifFalse: [
					(v @env0:isKindOf: Integer)
						ifTrue: [
							(v @env0:< 0 or: [v @env0:> 16r10FFFF]) ifTrue: [
								^ ValueError ___signal___: 'character mapping must be in range(0x110000)'].
							out @env0:add: v]
						ifFalse: [
							(v @env0:___pyCodePoints___) @env0:isNil ifTrue: [
								^ TypeError ___signal___: 'character mapping must return integer, None or str'].
							out @env0:addAll: v @env0:___pyCodePoints___]]]].
	^ PyStrSurrogate @env0:___fromCodePoints___: out

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___isTruthy___ [

	^ codePoints @env0:size @env0:> 0

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___mapNonSurrogateRuns___: aSelector [
	"Apply the ordinary str method aSelector to each run of code points
	BETWEEN the surrogates, keeping every surrogate as itself.

	A surrogate has no case -- CPython's lower/upper/casefold leave one
	unchanged -- and every other character must be mapped by the same rules
	as in a plain str, including the special cases that change a string's
	length (``'\u0130'.lower()'' is two code points).  Mapping each run as an
	ordinary string gets both without a second copy of the case tables.

	These methods used to be missing, so a surrogate-bearing str refused
	``lower()'' outright -- and stringprep lowercases every character, which
	is how nameprep reaches its RFC 3454 table C.5 refusal of surrogates
	(test_codecs NameprepTest)."

	| out run flush |
	out := OrderedCollection @env0:new.
	run := OrderedCollection @env0:new.
	flush := [
		run @env0:isEmpty ifFalse: [ | plain mapped |
			plain := PyStrSurrogate @env0:___fromCodePoints___: run @env0:asArray.
			mapped := plain @env0:perform: aSelector env: 1.
			out @env0:addAll: mapped @env0:___pyCodePoints___.
			run := OrderedCollection @env0:new]].
	codePoints @env0:do: [:cp |
		(self @env0:___isSurrogate___: cp)
			ifTrue: [flush @env0:value. out @env0:add: cp]
			ifFalse: [run @env0:add: cp]].
	flush @env0:value.
	^ PyStrSurrogate @env0:___fromCodePoints___: out @env0:asArray

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> ___substitutingEncode___: encoding errors: errors [
	"Encode under one of the substituting handlers, by SUBSTITUTING TEXT and
	encoding once -- not by encoding fragments and concatenating bytes.

	That distinction is the whole method.  CPython's encode handlers answer
	a REPLACEMENT STRING, which the codec then encodes like any other text,
	so for utf-16 the escape ``\\udc80'' comes out as eight 16-bit units and
	the BOM is written once for the whole string.  Assembling bytes instead
	gets both wrong in the same breath:

	    utf-16, '[\\udc80]'   CPython  b'\\xff\\xfe[\\x00\\\\\\x00u\\x00d\\x00...'
	                          bytes    b'\\xff\\xfe[\\x00\\\\udc80\\xff\\xfe]\\x00'

	-- the escape left as raw ASCII in the middle of UTF-16 units, and a
	SECOND BOM where the next fragment began.

	So the surrogates are replaced in the STRING and the result is handed to
	the codec whole.  ___unencodable___:at:encoding:errors:reason: still
	decides what each one becomes; its answer is ASCII for all four of these
	handlers, so reading it back as text is exact and keeps one source of
	truth for the escape formatting.

	``errors'' is passed on rather than ``strict'': the string may hold
	ordinary characters the codec cannot represent either -- '\\xe4\\udc80' to
	ascii has both kinds -- and CPython applies one policy to all of them."

	| out |
	out := WriteStream @env0:on: String @env0:new.
	1 @env0:to: codePoints @env0:size do: [:i | | cp |
		cp := codePoints @env0:at: i.
		(self @env0:___isSurrogate___: cp)
			ifTrue: [
				"Byte by byte into the string: the handler answers BYTES and
				they are ASCII for all four of these policies, so each one is
				its own character.  ``asString'' on a ByteArray is a printString
				here, not a decode -- it put the literal text ``aByteArray'' in
				the output."
				('' ___unencodable___: cp
					at: i
					encoding: encoding
					errors: errors
					reason: 'surrogates not allowed')
					@env0:do: [:b | out @env0:nextPut: (Character @env0:codePoint: b)]]
			ifFalse: [out @env0:nextPut: (Character @env0:codePoint: cp)]].
	^ out @env0:contents @env1:encode: encoding _: errors

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __add__: other [
	"Concatenation with either representation answers a PyStrSurrogate --
	the result still contains the surrogate, so it still cannot be a
	CharacterCollection."

	| cps |
	cps := OrderedCollection @env0:withAll: codePoints.
	(other @env0:isKindOf: PyStrSurrogate)
		ifTrue: [cps @env0:addAll: (other @env0:___codePoints___)]
		ifFalse: [
			(other @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
				^ TypeError ___signal___:
					'can only concatenate str to str'].
			other @env0:do: [:c | cps @env0:add: c @env0:codePoint]].
	^ PyStrSurrogate @env0:___fromCodePoints___: cps

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __bool__ [
	"A str is truthy when it is non-empty.

	Spelled out rather than left to the doesNotUnderstand: refusal, which is
	how it used to be answered: bool()'s probe (Bool.gs) wraps the __bool__
	send in ``on: MessageNotUnderstood'', and the refusal happened to raise
	one -- because ___unsupported___ could not reach ___signal___: from env 0
	-- so ``bool(s)'' worked by accident, through the __len__ fallback.  Once
	the refusal raised the NotImplementedError it always meant to, the
	accident stopped: ``bool(s)'' escaped as an unsupported operation.  It is
	not unsupported; there was simply nothing here to say so."

	^ codePoints @env0:size @env0:> 0

]

{ #category : 'Grail-Type' }
PyStrSurrogate >> __class__ [
	"``type(s) is str'' for a lone-surrogate str too -- the same rule as
	CharacterCollection >> __class__.  Only this class: AbstractPyStr also
	backs Python-defined str subclasses, which answer themselves."

	self @env0:class @env0:== PyStrSurrogate ifTrue: [^ str].
	^ self @env0:class

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __contains__: other [
	"``other in self'' -- through the shared code-point search, so either
	representation may be the needle."

	| c |
	other @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___:
			'''in <string>'' requires string as left operand'].
	c := PyStrSurrogate @env0:___indexOf___: other in: self from: 1.
	^ c @env0:> 0

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __eq__: other [
	"Equal exactly when the CODE POINTS match, which routes through the shared
	comparison so the answer does not depend on which representation the other
	operand happens to use.  In practice a surrogate-free string is never
	equal -- no CharacterCollection can hold a surrogate -- but that is a
	consequence of comparing code points, not a separate rule to maintain.

	A non-str answers False rather than NotImplemented, as CPython's
	str.__eq__ effectively does once the reflected operand has had its turn:
	the operand reaches here only through the generic comparison helpers,
	which have already tried it."

	| c |
	c := PyStrSurrogate @env0:___compare___: self with: other.
	c @env0:== nil ifTrue: [^ false].
	^ c @env0:= 0

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __format__: formatSpec [
	"An EMPTY format spec is str(self), which is self.  That is the whole of
	``'{}'.format(name)'', and it is what difflib's unified_diff does to build
	its ``--- <file>'' header out of a surrogateescape'd filename
	(test_difflib's TestBytes).

	A spec that actually asks for fill/align/width/precision would have to
	measure and slice the string through the shared format engine, which works
	in CharacterCollections; that is refused rather than approximated, like
	the rest of this deliberately partial surface."

	(formatSpec @env0:isNil or: [formatSpec @env0:isEmpty]) ifTrue: [^ self].
	^ self @env0:___unsupported___: '__format__ with a non-empty spec'

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __ge__: other [

	^ self @env0:___orderAgainst___: other op: '>=' code: 4

]

{ #category : 'Grail-Placeholders' }
PyStrSurrogate >> __getattr__: name [
	"``s.replace'' and the rest of ___viaPlaceholderNames___: a callable over
	this string.  AbstractPyStr's version forwards the read to the wrapped
	value, which this class does not have, so every such read raised.
	Env 1, as AbstractPyStr's is -- that is the environment the attribute
	load asks in."

	| sym |
	sym := name @env0:asSymbol.
	(PyStrSurrogate @env0:___viaPlaceholderNames___ @env0:includes: sym) ifTrue: [
		^ [:positional :kw | self @env0:___viaPlaceholders___: sym positional: positional kw: kw]].
	"A name NO str has is an AttributeError, as for any str -- asked of an
	empty one, which raises exactly CPython's.  ``hasattr(s, '__slots__')''
	must answer False; the refusal below is a NotImplementedError, which
	hasattr does not swallow, so it escaped test_pickle's assert_is_copy.
	Only a name a str DOES have, but this class cannot compute, is refused."
	(Unicode7 @env0:new) ___pyAttrLoad___: sym.
	^ super __getattr__: name

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __getitem__: index [
	"Integer index answers a one-character str: a PyStrSurrogate when that
	character IS a surrogate, an ordinary string otherwise -- the demotion
	happens in ___fromCodePoints___:, so ``t[0] == 'a''' is true."

	| n i |
	n := codePoints @env0:size.
	"A SLICE, through slice>>indices: so negative bounds, clamping and a step
	all follow CPython.  The result demotes like any other: a slice with no
	surrogate left in it is an ordinary str.  It used to be refused outright,
	so ``exc.object[exc.start:exc.end]'' -- how every test of a surrogate's
	UnicodeEncodeError reads the offending text -- raised NotImplementedError
	(test_codecs test_lone_surrogates)."
	(index @env0:isKindOf: slice) ifTrue: [ | ix start stop step out k |
		ix := index indices: n.
		start := ix @env0:at: 1. stop := ix @env0:at: 2. step := ix @env0:at: 3.
		out := OrderedCollection @env0:new.
		k := start.
		step @env0:> 0
			ifTrue: [[k @env0:< stop] @env0:whileTrue: [
				out @env0:add: (codePoints @env0:at: k @env0:+ 1). k := k @env0:+ step]]
			ifFalse: [[k @env0:> stop] @env0:whileTrue: [
				out @env0:add: (codePoints @env0:at: k @env0:+ 1). k := k @env0:+ step]].
		^ PyStrSurrogate @env0:___fromCodePoints___: out @env0:asArray].
	(index @env0:isKindOf: Integer) @env0:ifFalse: [
		^ TypeError ___signal___: 'string indices must be integers, not '''
			@env0:, (bytes ___pyTypeNameOf___: index) @env0:, ''''].
	i := index @env0:< 0 ifTrue: [index @env0:+ n] ifFalse: [index].
	(i @env0:< 0 @env0:or: [i @env0:>= n]) ifTrue: [
		^ IndexError ___signal___: 'string index out of range'].
	^ PyStrSurrogate @env0:___fromCodePoints___:
		(Array @env0:with: (codePoints @env0:at: i @env0:+ 1))

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __gt__: other [

	^ self @env0:___orderAgainst___: other op: '>' code: 3

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __hash__ [

	^ codePoints @env0:hash

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __iter__ [

	| items |
	items := OrderedCollection @env0:new.
	1 @env0:to: codePoints @env0:size do: [:i |
		items @env0:add: (PyStrSurrogate @env0:___fromCodePoints___:
			(Array @env0:with: (codePoints @env0:at: i)))].
	^ items @env1:__iter__

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __le__: other [

	^ self @env0:___orderAgainst___: other op: '<=' code: 2

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __len__ [

	^ codePoints @env0:size

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __lt__: other [
	"Ordering against any str, in CODE POINT order -- Python's string order.

	Without these four, ``sorted(['a', '\ud800'])'' died: str's __lt__ punted
	to the reflected __gt__ here, this class had none, and doesNotUnderstand:
	raised the unsupported-operation NotImplementedError.  A str that cannot
	be SORTED is not usable as a str, and PEP 383 filenames are sorted all the
	time."

	^ self @env0:___orderAgainst___: other op: '<' code: 1

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __mul__: count [
	"``s * n'' -- repetition, which is a pure sequence operation and needs no
	Character at all.  A count of zero or less is the empty string, and
	___fromCodePoints___ demotes that to an ordinary '' as it demotes any
	surrogate-free result."

	| cps n |
	(count @env0:isKindOf: Integer) @env0:ifFalse: [
		^ TypeError ___signal___:
			'can''t multiply sequence by non-int of type ''str'''].
	n := count.
	cps := OrderedCollection @env0:new.
	1 @env0:to: n do: [:i | cps @env0:addAll: codePoints].
	^ PyStrSurrogate @env0:___fromCodePoints___: cps

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __ne__: other [

	^ (self @env1:__eq__: other) @env0:not

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __radd__: other [
	"``'x' + surrogateStr'' -- CharacterCollection>>__add__: cannot build
	the result, so it defers here."

	| cps |
	cps := OrderedCollection @env0:new.
	(other @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
		^ TypeError ___signal___: 'can only concatenate str to str'].
	other @env0:do: [:c | cps @env0:add: c @env0:codePoint].
	cps @env0:addAll: codePoints.
	^ PyStrSurrogate @env0:___fromCodePoints___: cps

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __repr__ [

	^ self @env0:___pyRepr___

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __rmul__: count [
	"``n * s'' -- Integer>>__mul__: defers here for a non-numeric operand."

	^ self @env1:__mul__: count

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> __str__ [
	"CPython: ``str(s) is s'' for an exact str."

	^ self

]

{ #category : 'Grail-String Methods' }
PyStrSurrogate >> _encode: positional kw: kwargs [
	"``str.encode(encoding='utf-8', errors='strict')'' with KEYWORDS, the
	mirror of bytes>>_decode:kw:.  The fixed-arity selectors cover the
	positional spellings only, so ``s.encode('ascii', errors='replace')'' --
	the form encodings/idna.py uses to build its UnicodeDecodeError objects --
	raised ``encode() takes a different number of arguments''.  A keyword
	outside the two is CPython's ``encode() got an unexpected keyword
	argument''."

	| encoding errors |
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysDo: [:k |
			(#('encoding' 'errors') @env0:includes: k @env0:asString) ifFalse: [
				^ TypeError ___signal___: 'encode() got an unexpected keyword argument '''
					@env0:, k @env0:asString @env0:, '''']]].
	encoding := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [(kwargs @env0:isNil @env0:not @env0:and: [kwargs @env0:includesKey: 'encoding'])
			ifTrue: [kwargs @env0:at: 'encoding']
			ifFalse: ['utf-8']].
	errors := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs @env0:isNil @env0:not @env0:and: [kwargs @env0:includesKey: 'errors'])
			ifTrue: [kwargs @env0:at: 'errors']
			ifFalse: ['strict']].
	^ self encode: encoding _: errors

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> casefold [

	^ self ___mapNonSurrogateRuns___: #casefold

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> encode [
	"Default utf-8 / strict -- always a UnicodeEncodeError here, because a
	lone surrogate is exactly what strict UTF-8 refuses.  CPython raises the
	same error for the same reason; this is one of the few places the two
	systems already agreed."

	^ self @env1:encode: 'utf-8' _: 'strict'

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> encode: encoding [

	^ self @env1:encode: encoding _: 'strict'

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> encode: encoding _: errors [
	"``surrogatepass'' emits the WTF-8 form (U+D800 -> ED A0 80), which is
	what CPython answers.  ``surrogateescape'' undoes PEP 383's byte
	smuggling.  ``strict'' raises.  Other handlers are not implemented rather
	than approximated."

	| e enc |
	e := errors @env0:asString.
	"utf-8-sig IS utf-8 WITH ONE BOM IN FRONT, which is exactly how CPython's
	codec is written (``codecs.utf_8_encode'' behind a BOM).  Handing it to
	the branches below whole wrote a BOM per re-encoded fragment -- the
	surrogateescape path put a SECOND one in the middle of the output -- and
	named 'utf-8-sig' in the error, where CPython's names 'utf-8'."
	enc := (encoding @env0:asString @env0:asLowercase)
		@env0:select: [:c | (c @env0:= $-) @env0:not @env0:and: [(c @env0:= $_) @env0:not]].
	enc @env0:= 'utf8sig' ifTrue: [
		^ (bytes @env0:withAll: #(16rEF 16rBB 16rBF))
			@env1:__add__: (self encode: 'utf-8' _: errors)].
	"``surrogatepass'' IS CODEC-SPECIFIC.  It used to answer the WTF-8 form
	whatever the target was, so ``'\\udc80'.encode('utf-16-le',
	'surrogatepass')'' came back as three UTF-8 bytes instead of the two
	little-endian ones -- right for utf-8 by coincidence and wrong for every
	other UTF.

	Answers nil for a codec that has no surrogate form, which leaves the
	utf-7 branch below to claim it (RFC 2152 encodes UTF-16 code units, so a
	surrogate is ordinary there) and everything else to reach the refusal --
	which is what CPython does for ascii and latin-1."
	(e @env0:= 'surrogatepass') ifTrue: [ | ___sp |
		___sp := self @env0:___surrogatePassBytes___: encoding.
		___sp @env0:isNil ifFalse: [^ ___sp]].
	(e @env0:= 'surrogateescape') ifTrue: [
		^ self @env0:___surrogateEscapeBytes___: encoding].
	"UTF-7 CARRIES a lone surrogate rather than refusing it.  RFC 2152
	encodes UTF-16 code units, and a surrogate is a code unit like any
	other, so CPython answers b'+2AA-' for U+D800 under plain ``strict''.
	The refusal below is right for the codecs that cannot represent one --
	utf-8, ascii, latin-1 -- and wrong for this one."
	enc := encoding @env0:asString @env0:asLowercase.
	"THE ESCAPE CODECS CARRY A SURROGATE TOO, under every handler including
	``strict'': they are lossless text escapes, so
	``'\\ud800'.encode('unicode-escape')'' is b'\\\\ud800' in CPython rather
	than a refusal.  That is what lets a repr round-trip a string holding
	one.  Beside utf-7 for the same reason: the refusal below is right for
	the codecs that cannot represent a surrogate and wrong for those that
	can."
	((enc @env0:= 'unicode-escape') @env0:or: [(enc @env0:= 'unicode_escape')
		@env0:or: [(enc @env0:= 'raw-unicode-escape')
			@env0:or: [enc @env0:= 'raw_unicode_escape']]]) ifTrue: [
		^ self @env0:___escapeBytes___: enc].
	((enc @env0:= 'utf-7') or: [enc @env0:= 'utf7']) ifTrue: [
		^ bytes @env1:___utf7FromCodePoints___: self @env0:___codePoints___].
	"THE FOUR SUBSTITUTING HANDLERS, which used to fall through to the
	refusal below as though every one of them were ``strict''.

	A plain str already honoured them -- ``'\xe4'.encode('ascii',
	'replace')'' answers b'?' -- because CharacterCollection >>
	___unencodable___:at:encoding:errors:reason: decides what an
	un-encodable code point contributes.  A string carrying a LONE
	SURROGATE never reached that: it is a PyStrSurrogate, and this method
	refused outright once surrogatepass, surrogateescape and utf-7 had had
	their turn.

	So the handler worked or not depending on WHICH character could not be
	encoded, which is not a distinction CPython makes."
	(#('ignore' 'replace' 'xmlcharrefreplace' 'backslashreplace' 'namereplace')
		@env0:includes: e) ifTrue: [
			^ self ___substitutingEncode___: encoding errors: e].
	^ self @env0:___signalSurrogateEncodeError___: encoding
		at: (codePoints @env0:findFirst: [:cp | self @env0:___isSurrogate___: cp])

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> endswith: suffix [
	"str.endswith, including the tuple form -- see startswith:."

	| cps sub n m ok |
	(suffix @env0:isKindOf: tuple) ifTrue: [
		1 @env0:to: (suffix @env0:size) do: [:ti |
			(self @env1:endswith: (suffix @env0:at: ti)) ifTrue: [^ true]].
		^ false].
	suffix @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___:
			'endswith first arg must be str or a tuple of str'].
	cps := self @env0:___pyCodePoints___.
	sub := suffix @env0:___pyCodePoints___.
	n := cps @env0:size.
	m := sub @env0:size.
	m @env0:> n ifTrue: [^ false].
	ok := true.
	1 @env0:to: m do: [:k |
		((cps @env0:at: n @env0:- m @env0:+ k) @env0:= (sub @env0:at: k))
			ifFalse: [ok := false]].
	^ ok

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> lower [

	^ self ___mapNonSurrogateRuns___: #lower

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> startswith: prefix [
	"str.startswith, including CPython's tuple-of-prefixes form.

	A prefix that is itself surrogate-free is a perfectly ordinary question to
	ask of a surrogate string -- ``name.startswith('/tmp')'' on a
	surrogateescape'd path -- and it used to raise, because the whole str
	surface below the implemented handful fell to the DNU refusal."

	| c |
	(prefix @env0:isKindOf: tuple) ifTrue: [
		1 @env0:to: (prefix @env0:size) do: [:ti |
			(self @env1:startswith: (prefix @env0:at: ti)) ifTrue: [^ true]].
		^ false].
	prefix @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___:
			'startswith first arg must be str or a tuple of str'].
	c := PyStrSurrogate @env0:___indexOf___: prefix in: self from: 1.
	^ c @env0:= 1

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> translate: table [
	"Not a placeholder method: the table is keyed by code point, and a
	surrogate's own key has to be found.  See the shared implementation."

	^ PyStrSurrogate ___translate___: self table: table

]

{ #category : 'Grail-Python Protocol' }
PyStrSurrogate >> upper [

	^ self ___mapNonSurrogateRuns___: #upper

]
