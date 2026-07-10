! ===============================================================================
! CharacterCollection Methods (Python 'str' type)
! ===============================================================================
! This file contains method implementations for CharacterCollection, the common
! superclass of both String (→ Unicode7) and MultiByteString (→ Unicode16,
! Unicode32). Installing here makes all Python string methods available on
! every string subclass automatically.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from CharacterCollection
expectvalue /Metaclass3
doit
"Remove from CharacterCollection (the target) and from String/Unicode7
 (old targets, in case of reinstall)."
CharacterCollection removeAllMethods: 1.
CharacterCollection class removeAllMethods: 1.
String removeAllMethods: 1.
String class removeAllMethods: 1.
Unicode7 removeAllMethods: 1.
Unicode7 class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__
	"Create a new empty str instance.
	In Python: str() or str.__new__(str)"

	^ '' @env0:copy
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__: obj
	"Create a new instance of `self` (the cls argument) whose content
	is ``str(obj)``.  For ``str(obj)`` the receiver is the canonical
	concrete str class (Unicode7), and the result is just a string;
	for ``str.__new__(Markup, obj)`` the receiver is Markup, and the
	result is a Markup instance carrying the same characters.  This
	is what makes ``super().__new__(cls, value)`` produce a populated
	instance of the subclass in user code like markupsafe.Markup."

	| source result |
	obj @env0:ifNil: [source := ''].
	obj @env0:ifNotNil: [
		(obj @env0:isKindOf: CharacterCollection)
			ifTrue: [source := obj]
			ifFalse: [source := obj @env1:__str__].
	].
	"Allocate a self-typed string of the right size via Behavior's
	primitive ``new:`` and copy bytes.  Do NOT route through
	``___new___:`` here — Object's class-side bridge of that name
	dispatches back to env-1 ``__new__:``, which would re-enter this
	method via subclass instantiation and stack-overflow."
	result := self @env0:new: source @env0:size.
	source @env0:size @env0:> 0 ifTrue: [
		result
			@env0:replaceFrom: 1
			to: source @env0:size
			with: source
			startingAt: 1
	].
	^ result
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__: obj _: encoding
	"Create a str from a bytes-like ``obj'' by decoding under
	``encoding'' — the 2-arg form of Python's str() constructor.
	Werkzeug.http uses ``str(value, 'utf-8')'' to turn header
	bytes into text.  Delegates to bytes.decode for the actual
	conversion."

	(obj @env0:isKindOf: ByteArray) ifTrue: [
		^ obj @env1:decode: encoding
	].
	(obj @env0:isKindOf: CharacterCollection) ifTrue: [
		"CPython rejects str(str, encoding) with TypeError —
		``decoding str is not supported''.  Match the shape."
		TypeError @env1:___signal___: 'decoding str is not supported'
	].
	^ self @env1:__new__: obj
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__: obj _: encoding _: errors
	"3-arg form: ``str(bytes_obj, encoding, errors)''.  Errors policy
	is honored by bytes.decode (currently ignored — Grail's decoders
	either succeed or raise) — accepted for parity."

	^ self @env1:__new__: obj _: encoding
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
_str: positional kw: kwargs
	"Varargs entry for ``str(*args, **kwargs)'' so the Python call
	site dispatches through a single selector regardless of arity.
	Routes by positional count + optional encoding kwarg."

	| nargs encoding errors obj |
	nargs := positional @env0:size.
	nargs @env0:= 0 ifTrue: [^ self @env1:__new__].
	obj := positional @env0:at: 1.
	nargs @env0:= 1 ifTrue: [
		(kwargs @env0:isNil @env0:not
			and: [kwargs @env0:includesKey: 'encoding']) ifTrue: [
			^ self @env1:__new__: obj _: (kwargs @env0:at: 'encoding')
		].
		^ self @env1:__new__: obj
	].
	encoding := positional @env0:at: 2.
	nargs @env0:= 2 ifTrue: [^ self @env1:__new__: obj _: encoding].
	errors := positional @env0:at: 3.
	^ self @env1:__new__: obj _: encoding _: errors
%

category: 'Grail-String Methods'
classmethod: CharacterCollection
maketrans
	"Create a translation table. Not yet implemented."

	self @env0:error: 'Not yet implemented: maketrans'
%

category: 'Grail-String Operations'
method: CharacterCollection
__add__: other
	"Concatenate two strings. In Python: str1 + str2"

	^ self @env0:, other
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__contains__: item
	"Test if item is in string. In Python: item in str"

	| result |
	result := self @env0:includesString: item.
	^ result
%

category: 'Grail-Comparison'
method: CharacterCollection
__eq__: other
	"Return self == other"

	^ self @env0:= other
%

category: 'Grail-String Representation'
method: CharacterCollection
__format__: formatSpec
	"Python str.__format__: full fill/align/width plus .precision
	truncation and the 's' type — see the shared engine in builtins
	___formatValue___:spec:."

	(formatSpec @env0:isNil or: [formatSpec @env0:= '']) ifTrue: [^ self].
	^ (builtins @env1:instance) @env1:___formatValue___: self spec: formatSpec
%

category: 'Grail-Comparison'
method: CharacterCollection
___codePointCompare___: other
	"Three-way lexicographic comparison by Unicode CODEPOINT — Python's
	string ordering.  GemStone's <, <=, >, >= use the Unicode collation
	(case-insensitive: 'Caller' sorts before 'CallSid'), which breaks
	order-sensitive Python output — twilio.request_validator's HMAC
	input is the params concatenated in sorted() order, so collation
	ordering produced a wrong signature.  Returns -1, 0, or 1."

	| n1 n2 lim c1 c2 |
	n1 := self @env0:size.
	n2 := other @env0:size.
	lim := n1 @env0:min: n2.
	1 @env0:to: lim do: [:i |
		c1 := (self @env0:at: i) @env0:codePoint.
		c2 := (other @env0:at: i) @env0:codePoint.
		c1 @env0:< c2 ifTrue: [^ -1].
		c1 @env0:> c2 ifTrue: [^ 1]].
	n1 @env0:< n2 ifTrue: [^ -1].
	n1 @env0:> n2 ifTrue: [^ 1].
	^ 0
%

category: 'Grail-Comparison'
method: CharacterCollection
__ge__: other
	"Return self >= other (codepoint order for strings)"

	(other @env0:isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:>= 0
	].
	^ self @env0:>= other
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__getitem__: index
	"Get character at index, or a substring for slice indices.
	Returns a single-character string for integer indices.
	Supports negative indices (counting from end)."

	| size idx char charString |
	(index @env0:isKindOf: slice) ifTrue: [
		^ self @env1:___getslice___: index @env1:start
			_: index @env1:stop
			_: index @env1:step
	].
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'string index out of range'
	].

	"Get character at 1-based Smalltalk index"
	char := self @env0:at: (idx @env0:+ 1).

	"Convert character to a single-character string"
	charString := Unicode7 ___new___: 1.
	charString @env0:at: 1 put: char.

	^ charString
%

category: 'Grail-Comparison'
method: CharacterCollection
__gt__: other
	"Return self > other (codepoint order for strings)"

	(other @env0:isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:> 0
	].
	^ self @env0:> other
%

category: 'Grail-Hashing & Identity'
method: CharacterCollection
__hash__
	"Return hash value for this string"

	^ self @env0:hash
%

category: 'Grail-Initialization'
method: CharacterCollection
__init__: obj
	"Initialize a str instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ None
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__iter__
	"Return an iterator over the string characters."

	^ str_iterator ___on: self
%

category: 'Grail-Comparison'
method: CharacterCollection
__le__: other
	"Return self <= other (codepoint order for strings)"

	(other @env0:isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:<= 0
	].
	^ self @env0:<= other
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__len__
	"Return the length of the string. In Python: len(str)"

	^ self @env0:size
%

category: 'Grail-Comparison'
method: CharacterCollection
__lt__: other
	"Return self < other (codepoint order for strings)"

	(other @env0:isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:< 0
	].
	^ self @env0:< other
%

category: 'Grail-String Operations'
method: CharacterCollection
__mod__: args
	"String formatting using % operator.  In Python: 'format %s' % args.

	Supported conversion characters: s (str), r (repr), d (int),
	i (int), x / X (hex), o (octal), f (float), %.  Mapping form
	'%(key)s' indexes args as a dict; sequence form '%s %d'
	consumes positionally.  Anything more elaborate (width / precision
	specifiers, flags) is passed through verbatim - good enough for
	logging Formatter and the modest printf usage in itsdangerous /
	Werkzeug."

	| stream src n i ch isMap argSeq argIdx |
	src := self @env0:asString.
	n := src @env0:size.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	isMap := args @env0:isKindOf: KeyValueDictionary.
	"Python treats a string on the RHS as a single positional, not a
	sequence of characters; same for ByteArray."
	(isMap not @env0:and: [
		(args @env0:isKindOf: Array) @env0:or: [
			(args @env0:isKindOf: OrderedCollection)
				@env0:or: [args @env0:isKindOf: tuple]
		]
	]) ifTrue: [argSeq := args]
	ifFalse: [
		isMap ifTrue: [argSeq := nil]
		ifFalse: [argSeq := Array @env0:with: args]
	].
	argIdx := 1.
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		ch := src @env0:at: i.
		ch @env0:= $% ifFalse: [
			stream @env0:nextPut: ch.
			i := i @env0:+ 1
		] ifTrue: [
			| key value conv |
			i := i @env0:+ 1.
			i @env0:> n ifTrue: [
				ValueError @env1:___signal___: 'incomplete format'
			].
			key := nil.
			"Optional mapping key '(name)'."
			(src @env0:at: i) @env0:= $( ifTrue: [
				| keyStart keyEnd |
				keyStart := i @env0:+ 1.
				keyEnd := keyStart.
				[keyEnd @env0:<= n @env0:and: [(src @env0:at: keyEnd) @env0:~= $)]]
					@env0:whileTrue: [keyEnd := keyEnd @env0:+ 1].
				key := src @env0:copyFrom: keyStart to: keyEnd @env0:- 1.
				i := keyEnd @env0:+ 1
			].
			"Skip optional width/precision/flag chars - bare passthrough
			to keep the implementation small.  CPython's spec is rich; we
			only need to read past digits / '.' / '-' / ' ' / '+' / '#'."
			[i @env0:<= n @env0:and: [
				| c |
				c := src @env0:at: i.
				(c @env0:= $-) @env0:or: [
					(c @env0:= $+) @env0:or: [
						(c @env0:= Character @env0:space) @env0:or: [
							(c @env0:= $#) @env0:or: [
								(c @env0:= $.) @env0:or: [
									(c @env0:asInteger @env0:>= $0 @env0:asInteger)
										@env0:and: [c @env0:asInteger @env0:<= $9 @env0:asInteger]
								]
							]
						]
					]
				]
			]] @env0:whileTrue: [i := i @env0:+ 1].
			i @env0:> n ifTrue: [
				ValueError @env1:___signal___: 'incomplete format'
			].
			conv := src @env0:at: i.
			i := i @env0:+ 1.
			conv @env0:= $% ifTrue: [stream @env0:nextPut: $%]
			ifFalse: [
				key @env0:notNil
					ifTrue: [value := args @env0:at: key @env0:asSymbol ifAbsent: [args @env0:at: key]]
					ifFalse: [
						argSeq @env0:isNil ifTrue: [
							TypeError @env1:___signal___: 'format requires a mapping'
						].
						argIdx @env0:> argSeq @env0:size ifTrue: [
							TypeError @env1:___signal___: 'not enough arguments for format string'
						].
						value := argSeq @env0:at: argIdx.
						argIdx := argIdx @env0:+ 1
					].
				stream @env0:nextPutAll: (self @env1:___convert___: value with: conv)
			]
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Operations'
method: CharacterCollection
___convert___: value with: conv
	"Format `value` per the printf conversion character.  Width and
	precision specifiers are ignored; just produce the bare rendering."

	conv @env0:= $s ifTrue: [^ value @env0:asString].
	conv @env0:= $r ifTrue: [^ value @env0:printString].
	(conv @env0:= $d @env0:or: [conv @env0:= $i]) ifTrue: [^ value @env0:asInteger @env0:printString].
	conv @env0:= $f ifTrue: [^ value @env0:asFloat @env0:printString].
	conv @env0:= $x ifTrue: [
		| digits n s |
		digits := '0123456789abcdef'.
		n := value @env0:asInteger.
		n @env0:= 0 ifTrue: [^ '0'].
		s := Unicode7 @env0:new.
		[n @env0:> 0] @env0:whileTrue: [
			s := (Unicode7 @env0:with: (digits @env0:at: (n @env0:bitAnd: 15) @env0:+ 1)) @env0:, s.
			n := n @env0:bitShift: -4
		].
		^ s
	].
	conv @env0:= $X ifTrue: [^ (self @env1:___convert___: value with: $x) @env0:asUppercase].
	conv @env0:= $c ifTrue: [
		"%c — an int is a code point; a 1-char string passes through."
		(value @env0:isKindOf: Integer) ifTrue: [
			^ Unicode7 @env0:with: (Character @env0:codePoint: value)].
		^ value @env0:asString
	].
	conv @env0:= $o ifTrue: [
		| n s |
		n := value @env0:asInteger.
		n @env0:= 0 ifTrue: [^ '0'].
		s := Unicode7 @env0:new.
		[n @env0:> 0] @env0:whileTrue: [
			s := (Unicode7 @env0:with: (Character @env0:codePoint: (n @env0:bitAnd: 7) @env0:+ $0 @env0:asInteger)) @env0:, s.
			n := n @env0:bitShift: -3
		].
		^ s
	].
	^ value @env0:asString
%

category: 'Grail-String Operations'
method: CharacterCollection
__mul__: n
	"Repeat string n times. In Python: str * n"

	| count result stream |
	count := n @env0:asInteger.
	(count @env0:<= 0) ifTrue: [ ^ '' @env0:copy ].

	stream := WriteStream @env0:on: (Unicode7 ___new___).
	count @env0:timesRepeat: [
		stream @env0:nextPutAll: self
	].
	result := stream @env0:contents.
	^ result
%

category: 'Grail-Comparison'
method: CharacterCollection
__ne__: other
	"Return self != other"

	^ self @env0:~= other
%

category: 'Grail-String Representation'
method: CharacterCollection
__repr__
	"Return a string representation for debugging. In Python: repr(str)"

	| stream |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $'.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		(cp == 39) ifTrue: [  "apostrophe -> \'"
			stream @env0:nextPutAll: '\'.
			stream @env0:nextPut: $'.
		] ifFalse: [ (cp == 92) ifTrue: [  "backslash -> \\"
			stream @env0:nextPutAll: '\\'.
		] ifFalse: [ (cp == 10) ifTrue: [  "newline -> \n"
			stream @env0:nextPutAll: '\n'.
		] ifFalse: [ (cp == 13) ifTrue: [  "carriage return -> \r"
			stream @env0:nextPutAll: '\r'.
		] ifFalse: [ (cp == 9) ifTrue: [  "tab -> \t"
			stream @env0:nextPutAll: '\t'.
		] ifFalse: [ ((cp @env0:< 32) or: [cp == 127]) ifTrue: [
			"other non-printable control char -> \xNN (CPython does the
			same).  Load-bearing: jinja2's compiler embeds template
			literals via repr(); without escaping the embedded newlines a
			multi-line template compiles to ``yield 'line1<NL>line2''' --
			an unterminated string literal that the tokenizer rejects."
			| hex |
			hex := (cp @env0:printString: 16) @env0:asLowercase.
			stream @env0:nextPutAll: '\x'.
			((hex @env0:size) @env0:< 2) ifTrue: [ stream @env0:nextPut: $0 ].
			stream @env0:nextPutAll: hex.
		] ifFalse: [
			stream @env0:nextPut: char.
		]]]]]]
	].
	stream @env0:nextPut: $'.
	^ stream @env0:contents
%

category: 'Grail-String Operations'
method: CharacterCollection
__rmod__: args
	"String formatting (reverse). Not typically used."

	self @env0:error: 'Not yet implemented: __rmod__'
%

category: 'Grail-String Operations'
method: CharacterCollection
__rmul__: n
	"Repeat string n times (reverse). In Python: n * str"

	^ self __mul__: n
%

category: 'Grail-String Representation'
method: CharacterCollection
__str__
	"Return a string representation for display. In Python: str(obj)"

	^ self
%

category: 'Grail-String Methods'
method: CharacterCollection
capitalize
	"Return a copy of the string with its first character capitalized and the rest lowercased."

	| stream first rest |
	(self @env0:isEmpty) ifTrue: [ ^ self ].

	stream := WriteStream @env0:on: (Unicode7 ___new___).
	first := self @env0:first.
	rest := self @env0:allButFirst.

	stream @env0:nextPut: (first @env0:asUppercase).
	stream @env0:nextPutAll: (rest @env0:asLowercase).

	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
casefold
	"Return a casefolded copy of the string. Similar to lowercase but more aggressive."

	^ self @env0:asLowercase
%

category: 'Grail-String Methods'
method: CharacterCollection
center: width
	"Return a centered string of length width, padded with spaces."

	| totalPad leftPad rightPad stream mySize |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	totalPad := (width @env0:- (mySize)).
	leftPad := totalPad @env0:// 2.
	rightPad := (totalPad @env0:- (leftPad)).

	stream := WriteStream @env0:on: (Unicode7 ___new___).
	leftPad @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	stream @env0:nextPutAll: self.
	rightPad @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
count: sub
	"Return the number of non-overlapping occurrences of substring sub."

	| count index start |
	count := 0.
	start := 1.
	[ index := self @env0:findString: sub startingAt: start.
	  (index @env0:> 0) ] whileTrue: [
		count := (count @env0:+ 1).
		start := (index @env0:+ sub @env0:size).
	].
	^ count
%

category: 'Grail-String Methods'
method: CharacterCollection
count: sub _: start
	"count(sub, start) — occurrences at or after 0-based ``start''."

	^ self @env1:count: sub _: start _: (self @env0:size)
%

category: 'Grail-String Methods'
method: CharacterCollection
count: sub _: start _: stop
	"count(sub, start, stop) — occurrences within the [start, stop)
	slice, Python 0-based half-open indices (negatives wrap)."

	| n s e |
	n := self @env0:size.
	s := start.
	e := stop.
	(s @env0:== nil or: [s @env0:== None]) ifTrue: [s := 0].
	(e @env0:== nil or: [e @env0:== None]) ifTrue: [e := n].
	s @env0:< 0 ifTrue: [s := (s @env0:+ n) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (e @env0:+ n) @env0:max: 0].
	e := e @env0:min: n.
	s @env0:>= e ifTrue: [^ 0].
	^ (self @env0:copyFrom: s @env0:+ 1 to: e) @env1:count: sub
%

category: 'Grail-String Methods'
method: CharacterCollection
_count: positional kw: kwargs
	"Varargs entry for ``count(sub[, start[, stop]])''."

	| sub start stop |
	positional @env0:isEmpty ifTrue: [
		TypeError @env1:___signal___: 'count() takes at least 1 argument'
	].
	sub := positional @env0:at: 1.
	positional @env0:size @env0:>= 2
		ifTrue: [start := positional @env0:at: 2]
		ifFalse: [^ self @env1:count: sub].
	positional @env0:size @env0:>= 3
		ifTrue: [stop := positional @env0:at: 3]
		ifFalse: [^ self @env1:count: sub _: start].
	^ self @env1:count: sub _: start _: stop
%

category: 'Grail-String Methods'
method: CharacterCollection
encode
	"``s.encode()`` with no args — Python default is 'utf-8'."

	^ self @env1:encode: 'utf-8'
%

category: 'Grail-String Methods'
method: CharacterCollection
encode: encoding _: errors
	"``s.encode(encoding, errors)`` - the `errors` argument is
	accepted for CPython parity but ignored.  Grail's encoder only
	emits ASCII/UTF-8-clean output; the only situation that would
	exercise an error-handling policy is a non-ASCII codepoint, and
	in those cases we already raise UnicodeEncodeError regardless."

	^ self @env1:encode: encoding
%

category: 'Grail-String Methods'
method: CharacterCollection
encode: encoding
	"``s.encode(encoding)`` — return the bytes representation under
	``encoding``.  ASCII and UTF-8 cover the Tier 1.5 use cases
	(base64 / hmac / hashlib); other encodings raise NotImplementedError
	until something asks.

	Implementation: walk the receiver's characters, raise UnicodeEncodeError
	on ASCII when a non-ASCII codepoint shows up, otherwise pack into
	a ByteArray.  UTF-8 currently shares the ASCII path (Grail's
	Unicode7 stores ASCII directly; higher codepoints would need
	a real UTF-8 encoder)."

	| enc size result |
	enc := encoding @env0:asLowercase.
	size := self @env0:size.
	"ASCII / UTF-8 / latin1 share the same byte representation for
	codepoints 0..127 (Grail's Unicode7 string type only stores those
	directly).  latin1 is the WSGI standard for byte→str smuggling
	and is required by werkzeug._internal's encoding dance.
	Codepoints 128..255 in latin1 (and any non-ASCII byte in UTF-8)
	land in the encoder loop below, which raises UnicodeEncodeError
	for now — a real multi-byte encoder is left for whichever caller
	actually needs it."
	"``idna'' is RFC 3490 internationalized domain name encoding —
	ASCII names pass through unchanged, non-ASCII would need real
	punycode.  Werkzeug uses ``hostname.encode('idna')'' on every
	request URL build; for the M7 Flask demo path (defaults to
	``localhost'') ASCII passthrough is sufficient.  Real punycode
	can land on top of this when a downstream test depends on it."
	((enc @env0:= 'ascii')
		or: [enc @env0:= 'utf-8'
		or: [enc @env0:= 'utf8'
		or: [enc @env0:= 'latin1'
		or: [enc @env0:= 'latin-1'
		or: [enc @env0:= 'iso-8859-1'
		or: [enc @env0:= 'idna']]]]]]) ifFalse: [
		LookupError ___signal___: ('unknown encoding: ' @env0:, encoding)
	].
	result := ByteArray @env0:new: size.
	1 @env0:to: size do: [:i |
		| cv |
		cv := (self @env0:at: i) @env0:asInteger.
		(enc @env0:= 'ascii' and: [cv @env0:> 127]) ifTrue: [
			UnicodeEncodeError ___signal___: 'ascii codec can''t encode non-ASCII byte'
		].
		(cv @env0:> 255) ifTrue: [
			UnicodeEncodeError ___signal___: 'codec can''t encode codepoint > 255 (UTF-8 multi-byte not yet supported)'
		].
		result @env0:at: i put: cv
	].
	^ result
%

category: 'Grail-String Methods'
method: CharacterCollection
endswith: suffix
	"Test whether string ends with the specified suffix."

	^ self @env0:endsWith: suffix
%

category: 'Grail-String Methods'
method: CharacterCollection
expandtabs
	"str.expandtabs() -> copy with tabs expanded to the next multiple of
	8 columns (column-aware, matching CPython -- not a blind replace)."

	^ self ___expandtabs: 8
%

category: 'Grail-String Methods'
method: CharacterCollection
expandtabs: tabsize
	"str.expandtabs(tabsize) -> copy with tabs expanded to the next
	multiple of tabsize columns; tabsize <= 0 deletes tabs."

	^ self ___expandtabs: tabsize
%

category: 'Grail-String Methods'
method: CharacterCollection
___expandtabs: tabsize
	"Column-aware tab expansion shared by expandtabs / expandtabs:.  The
	column counter resets on newline / carriage-return.  Builds the result
	on ``copyEmpty'' so it keeps the receiver's str class."

	| ws col n cp nSpaces |
	ws := WriteStream @env0:on: (self @env0:copyEmpty).
	col := 0.
	n := self @env0:size.
	1 @env0:to: n do: [:i | | ch |
		ch := self @env0:at: i.
		cp := ch @env0:codePoint.
		(cp @env0:= 9) ifTrue: [
			(tabsize @env0:> 0) ifTrue: [
				nSpaces := tabsize @env0:- (col @env0:\\ tabsize).
				nSpaces @env0:timesRepeat: [ws @env0:nextPut: (Character @env0:space)].
				col := col @env0:+ nSpaces
			]
		] ifFalse: [
			((cp @env0:= 10) or: [cp @env0:= 13])
				ifTrue: [ws @env0:nextPut: ch. col := 0]
				ifFalse: [ws @env0:nextPut: ch. col := col @env0:+ 1]
		]
	].
	^ ws @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
find: sub
	"Return the lowest index where substring sub is found, or -1 if not found."

	| index |
	index := self @env0:findString: sub startingAt: 1.
	(index == 0) ifTrue: [ ^ -1 ].
	^ (index @env0:- (1))  "Convert to 0-based indexing"
%

category: 'Grail-String Methods'
method: CharacterCollection
find: sub _: start
	"Python ``s.find(sub, start)'' — lowest 0-based index of sub at or
	after ``start'', else -1.  ``start'' follows CPython slice rules:
	negative counts from the end, out-of-range clamps."

	^ self @env1:find: sub _: start _: self @env0:size
%

category: 'Grail-String Methods'
method: CharacterCollection
find: sub _: start _: stop
	"Python ``s.find(sub, start, stop)'' — lowest 0-based index of sub
	within the ``[start, stop)'' slice, else -1.  ``start'' / ``stop''
	follow CPython slice rules (negative counts from the end,
	out-of-range clamps).  The returned index is absolute, not relative
	to ``start''."

	| len rawStart normStart normStop subLen slice index |
	len := self @env0:size.
	"Normalize start: negatives count from the end; keep rawStart for
	the empty-substring decision (a start past the end never matches)."
	rawStart := start @env0:< 0 ifTrue: [start @env0:+ len] ifFalse: [start].
	normStart := (rawStart @env0:max: 0) @env0:min: len.
	normStop := self @env1:___clampSliceIndex: stop len: len.
	subLen := sub @env0:size.
	"Empty substring matches at the start position when that position
	is within both the string and the [start, stop) window."
	subLen @env0:= 0 ifTrue: [
		^ ((rawStart @env0:<= len) and: [normStart @env0:<= normStop])
			ifTrue: [normStart]
			ifFalse: [-1]].
	"Window too small to contain sub → miss (also guards the slice
	bounds: normStop > normStart whenever this passes)."
	(normStop @env0:- normStart) @env0:< subLen ifTrue: [^ -1].
	slice := self @env0:copyFrom: normStart @env0:+ 1 to: normStop.
	index := slice @env0:findString: sub startingAt: 1.
	index @env0:= 0 ifTrue: [^ -1].
	^ normStart @env0:+ (index @env0:- 1)
%

category: 'Grail-String Methods'
method: CharacterCollection
___clampSliceIndex: idx len: len
	"CPython slice-bound normalization for a single index against
	``len'': negatives count from the end, the result clamps to
	[0, len]."

	| i |
	i := idx @env0:< 0 ifTrue: [idx @env0:+ len] ifFalse: [idx].
	i @env0:< 0 ifTrue: [^ 0].
	i @env0:> len ifTrue: [^ len].
	^ i
%

category: 'Grail-String Methods'
method: CharacterCollection
_find: positional kw: kwargs
	"Varargs entry for ``s.find(sub[, start[, stop]])'' — routes by
	positional arity so a call site that can't resolve the arity
	statically still reaches the right fixed-arity method."

	| nargs |
	nargs := positional @env0:size.
	nargs @env0:= 1 ifTrue: [^ self @env1:find: (positional @env0:at: 1)].
	nargs @env0:= 2 ifTrue: [
		^ self @env1:find: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	nargs @env0:= 3 ifTrue: [
		^ self @env1:find: (positional @env0:at: 1)
			_: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError @env1:___signal___:
		'find() takes 1 to 3 arguments but ' @env0:, nargs @env0:printString @env0:, ' were given'
%

category: 'Grail-String Methods'
method: CharacterCollection
format
	"Python ``str.format()'' with no arguments — placeholders are
	rendered as literal text only if no ``{'' / ``}'' appears.
	Round-trips ``{{'' / ``}}'' escapes."

	^ self @env1:_format: #() kw: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
_format: positional kw: kwargs
	"Python ``str.format(*args, **kwargs)'' — replace ``{...}''
	placeholders in self with values from positional / kwargs.

	Supported placeholder shapes:
	  * ``{}'' (auto-index positional)
	  * ``{N}'' (explicit positional index)
	  * ``{name}'' (keyword)
	  * Any of the above plus ``:spec'' (format spec) and/or ``!r''
	    / ``!s'' / ``!a'' conversion flags.
	  * ``{{'' / ``}}'' → literal ``{'' / ``}''.

	Field access (``{0.attr}'', ``{0[i]}'') is NOT yet supported."

	| size out i ch nextAuto |
	size := self @env0:size.
	out := WriteStream @env0:on: (Unicode7 ___new___).
	i := 1.
	nextAuto := 0.
	[i @env0:<= size] @env0:whileTrue: [
		ch := self @env0:at: i.
		(ch @env0:== ${ and: [
			(i @env0:< size) and: [(self @env0:at: i @env0:+ 1) @env0:== ${]])
			ifTrue: [
				out @env0:nextPut: ${.
				i := i @env0:+ 2
			] ifFalse: [
		(ch @env0:== $} and: [
			(i @env0:< size) and: [(self @env0:at: i @env0:+ 1) @env0:== $}]])
			ifTrue: [
				out @env0:nextPut: $}.
				i := i @env0:+ 2
			] ifFalse: [
		(ch @env0:== ${) ifTrue: [
			| endIdx field convFlag spec value autoIdx |
			endIdx := self @env0:___findFormatBraceEnd___: i @env0:+ 1.
			endIdx @env0:isNil ifTrue: [
				ValueError ___signal___: 'unmatched ''{'' in format string'].
			"field = name/index, optional !conv, optional :spec."
			field := self @env0:copyFrom: i @env0:+ 1 to: endIdx @env0:- 1.
			convFlag := nil.
			spec := ''.
			"Split field on ':' (first occurrence)."
			(field @env0:indexOf: $:) @env0:> 0 ifTrue: [
				| colonIdx |
				colonIdx := field @env0:indexOf: $:.
				spec := field @env0:copyFrom: colonIdx @env0:+ 1 to: field @env0:size.
				field := field @env0:copyFrom: 1 to: colonIdx @env0:- 1.
			].
			"Then split field on '!' for conversion flag."
			(field @env0:indexOf: $!) @env0:> 0 ifTrue: [
				| bangIdx |
				bangIdx := field @env0:indexOf: $!.
				convFlag := field @env0:copyFrom: bangIdx @env0:+ 1 to: field @env0:size.
				field := field @env0:copyFrom: 1 to: bangIdx @env0:- 1.
			].
			"Resolve the field name to a value."
			value := self
				@env1:___resolveFormatField___: field
				positional: positional
				kwargs: kwargs
				autoIdx: nextAuto.
			field @env0:isEmpty ifTrue: [nextAuto := nextAuto @env0:+ 1].
			"Apply conversion flag (r → repr, s → str, a → ascii)."
			convFlag @env0:isNil ifFalse: [
				convFlag @env0:= 'r' @env0:ifTrue: [value := value @env1:__repr__].
				convFlag @env0:= 's' @env0:ifTrue: [value := value @env1:__str__].
			].
			"Format-spec dispatch.  Delegate to value.__format__(spec)."
			out @env0:nextPutAll: (value @env1:__format__: spec) @env0:asString.
			i := endIdx @env0:+ 1
		] ifFalse: [
			out @env0:nextPut: ch.
			i := i @env0:+ 1
		]]].
	].
	^ out @env0:contents
%

set compile_env: 0

category: 'Grail-String Methods'
method: CharacterCollection
___formatPad___: count with: fillChar
	"Return a `count`-long string of `fillChar`s.  Helper for
	___applyAlignWidthFormat___ — GemStone's String class doesn't
	expose ``new:withAll:'', so use the two-step new+atAllPut form."

	| s |
	count <= 0 ifTrue: [^ ''].
	s := String new: count.
	s atAllPut: fillChar.
	^ s
%

category: 'Grail-String Methods'
method: CharacterCollection
___findFormatBraceEnd___: startIdx
	"Return the index of the matching ``}'' starting from startIdx,
	or nil if none.  Respects nested braces inside format specs (one
	level only — Python's spec mini-language allows nested
	``{...}'' in the precision slot)."

	| size i depth ch |
	size := self size.
	i := startIdx.
	depth := 0.
	[i <= size] whileTrue: [
		ch := self at: i.
		ch == ${ ifTrue: [depth := depth + 1].
		ch == $} ifTrue: [
			depth == 0 ifTrue: [^ i].
			depth := depth - 1].
		i := i + 1].
	^ nil
%

set compile_env: 1

category: 'Grail-String Methods'
method: CharacterCollection
___applyAlignWidthFormat___: spec
	"Apply the [fill][<|>|^][width] subset of Python's format-spec
	mini-language to self.  Returns self unchanged when the spec
	uses any unsupported syntax (sign, precision, type, ``0''
	pad-left, ``,'' thousands separator, ...) — caller can layer
	on its own type-specific formatting first."

	| size align fill widthStr width padCount leftPad rightPad allDigits |
	size := spec @env0:size.
	size @env0:= 0 ifTrue: [^ self].
	"Detect [fill]align: align is one of < > ^ at index 1 or 2."
	(size @env0:>= 2 and: [
		#($< $> $^) @env0:includes: (spec @env0:at: 2)])
		ifTrue: [
			fill := spec @env0:at: 1.
			align := spec @env0:at: 2.
			widthStr := spec @env0:copyFrom: 3 to: size]
		ifFalse: [(#($< $> $^) @env0:includes: (spec @env0:at: 1))
			ifTrue: [
				fill := $ .
				align := spec @env0:at: 1.
				widthStr := spec @env0:copyFrom: 2 to: size]
			ifFalse: [
				fill := $ .
				align := $>.   "Numbers default to right-align."
				widthStr := spec]].
	widthStr @env0:isEmpty ifTrue: [^ self].
	"Width must be all decimal digits; reject otherwise."
	allDigits := true.
	widthStr @env0:do: [:c | (c @env0:isDigit) ifFalse: [allDigits := false]].
	allDigits ifFalse: [^ self].
	width := widthStr @env0:asNumber.
	(self @env0:size @env0:>= width) ifTrue: [^ self].
	padCount := width @env0:- self @env0:size.
	align @env0:= $> ifTrue: [
		^ ((self @env0:___formatPad___: padCount with: fill) @env0:, self) @env0:asString].
	align @env0:= $< ifTrue: [
		^ (self @env0:, (self @env0:___formatPad___: padCount with: fill)) @env0:asString].
	"Center: split padCount between left and right (right gets the
	extra when padCount is odd)."
	leftPad := padCount @env0:// 2.
	rightPad := padCount @env0:- leftPad.
	^ ((self @env0:___formatPad___: leftPad with: fill) @env0:,
		self @env0:, (self @env0:___formatPad___: rightPad with: fill)) @env0:asString
%

category: 'Grail-String Methods'
method: CharacterCollection
___resolveFormatField___: field positional: positional kwargs: kwargs autoIdx: autoIdx
	"Look up a format field name in positional / kwargs.  Empty
	field → auto-index positional; numeric field → explicit
	positional index; otherwise keyword."

	| idx |
	field @env0:isEmpty ifTrue: [
		(autoIdx @env0:>= positional @env0:size) ifTrue: [
			IndexError ___signal___: 'Replacement index ' @env0:,
				autoIdx printString @env0:, ' out of range for positional args tuple'].
		^ positional @env0:at: autoIdx @env0:+ 1].
	"Numeric field — explicit positional index."
	(field @env0:first @env0:isDigit) ifTrue: [
		idx := field @env0:asNumber.
		(idx @env0:>= positional @env0:size) ifTrue: [
			IndexError ___signal___: 'Replacement index ' @env0:,
				idx printString @env0:, ' out of range for positional args tuple'].
		^ positional @env0:at: idx @env0:+ 1].
	"Keyword field."
	kwargs @env0:isNil ifTrue: [
		KeyError ___signal___: '''' @env0:, field @env0:asString @env0:, ''''].
	^ kwargs @env0:at: field @env0:asString ifAbsent: [
		KeyError ___signal___: '''' @env0:, field @env0:asString @env0:, '''']
%

category: 'Grail-String Methods'
method: CharacterCollection
format_map: mapping
	"String formatting using a mapping. Not yet implemented."

	self @env0:error: 'Not yet implemented: format_map'
%

category: 'Grail-String Methods'
method: CharacterCollection
index: sub
	"Return the lowest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self find: sub.
	(idx == -1) ifTrue: [
		ValueError @env0:signal: 'substring not found'
	].
	^ idx
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isalnum
	"Return True if all characters are alphanumeric and there is at least one character."

	| isEmpty allAlnum |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allAlnum := true.
	self @env0:do: [:char |
		| isAlnum |
		isAlnum := char @env0:isAlphaNumeric.
		isAlnum ifFalse: [ allAlnum := false ].
	].
	^ allAlnum
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isalpha
	"Return True if all characters are alphabetic and there is at least one character."

	| isEmpty allAlpha |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allAlpha := true.
	self @env0:do: [:char |
		| isAlpha |
		isAlpha := char @env0:isLetter.
		isAlpha ifFalse: [ allAlpha := false ].
	].
	^ allAlpha
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isascii
	"Return True if all characters are ASCII (code point < 128)."

	| allAscii |
	allAscii := true.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		(cp @env0:>= 128) ifTrue: [ allAscii := false ].
	].
	^ allAscii
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isdecimal
	"Return True if all characters are decimal characters."

	| isEmpty allDecimal |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allDecimal := true.
	self @env0:do: [:char |
		| isDigit |
		isDigit := char @env0:isDigit.
		isDigit ifFalse: [ allDecimal := false ].
	].
	^ allDecimal
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isdigit
	"Return True if all characters are digits and there is at least one character."

	| isEmpty allDigit |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allDigit := true.
	self @env0:do: [:char |
		| isDigit |
		isDigit := char @env0:isDigit.
		isDigit ifFalse: [ allDigit := false ].
	].
	^ allDigit
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isidentifier
	"Return True if string is a valid Python identifier."

	| isEmpty firstChar |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	"First character must be letter or underscore"
	firstChar := self @env0:first.
	((firstChar @env0:isLetter) @env0:| (firstChar == $_)) ifFalse: [ ^ false ].

	"Rest must be letters, digits, or underscores"
	(self @env0:allButFirst) @env0:do: [:char |
		| valid |
		valid := ((char @env0:isAlphaNumeric) @env0:| (char == $_)).
		valid ifFalse: [ ^ false ].
	].
	^ true
%

category: 'Grail-String Test Methods'
method: CharacterCollection
islower
	"Return True if all cased characters are lowercase and there is at least one cased character."

	| hasCased allLower |
	hasCased := false.
	allLower := true.
	self @env0:do: [:char |
		| isLetter isLower |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			hasCased := true.
			isLower := char @env0:isLowercase.
			isLower ifFalse: [ allLower := false ].
		].
	].
	^ hasCased @env0:& allLower
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isnumeric
	"Return True if all characters are numeric characters."

	^ self isdecimal
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isprintable
	"Return True if all characters are printable."

	| allPrintable |
	allPrintable := true.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		"Control characters and some special characters are not printable"
		((cp @env0:< 32) @env0:| ((cp @env0:>= 127) @env0:& (cp @env0:< 160))) ifTrue: [ allPrintable := false ].
	].
	^ allPrintable
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isspace
	"Return True if all characters are whitespace and there is at least one character."

	| isEmpty allSpace |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allSpace := true.
	self @env0:do: [:char |
		| isSpace |
		isSpace := char @env0:isSeparator.
		isSpace ifFalse: [ allSpace := false ].
	].
	^ allSpace
%

category: 'Grail-String Test Methods'
method: CharacterCollection
istitle
	"Return True if string is titlecased."

	| inWord expectUpper |
	inWord := false.
	expectUpper := true.
	self @env0:do: [:char |
		| isLetter isUpper isLower |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			isUpper := char @env0:isUppercase.
			isLower := char @env0:isLowercase.
			inWord ifTrue: [
				isUpper ifTrue: [ ^ false ].
			] ifFalse: [
				isLower ifTrue: [ ^ false ].
				inWord := true.
			].
		] ifFalse: [
			inWord := false.
		].
	].
	^ true
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isupper
	"Return True if all cased characters are uppercase and there is at least one cased character."

	| hasCased allUpper |
	hasCased := false.
	allUpper := true.
	self @env0:do: [:char |
		| isLetter isUpper |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			hasCased := true.
			isUpper := char @env0:isUppercase.
			isUpper ifFalse: [ allUpper := false ].
		].
	].
	^ hasCased @env0:& allUpper
%

category: 'Grail-String Methods'
method: CharacterCollection
join: iterable
	"Concatenate any number of strings with self as separator.
	Uses the Python iterator protocol (__iter__ / __next__) so it
	works for PythonGenerator and other lazy sequences that don't
	implement Smalltalk's ``do:``."

	| stream first iter done item |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	first := true.
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			item := iter __next__.
			first ifFalse: [stream @env0:nextPutAll: self].
			stream @env0:nextPutAll: item.
			first := false.
		] @env0:on: StopIteration do: [:ex | done := true].
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
ljust: width
	"Return a left-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: self.
	padding @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
lower
	"Return a copy of the string with all characters converted to lowercase."

	^ self @env0:asLowercase
%

category: 'Grail-String Methods'
method: CharacterCollection
lstrip
	"Return a copy of the string with leading whitespace removed."

	^ self @env0:trimLeft
%

category: 'Grail-String Methods'
method: CharacterCollection
lstrip: chars
	"Return a copy with leading occurrences of any character in
	``chars'' removed.  None / nil means whitespace, matching
	Python's str.lstrip()."

	(chars @env0:== nil or: [chars @env0:== None])
		ifTrue: [^ self @env0:trimLeft].
	^ self @env0:___lstripChars___: chars
%

category: 'Grail-String Methods'
method: CharacterCollection
partition: sep
	"Split the string at the first occurrence of sep, return (before, sep, after)."

	| index before after |
	index := self @env0:findString: sep startingAt: 1.
	(index == 0) ifTrue: [
		^ tuple @env0:with: self with: '' with: ''
	].

	before := self @env0:copyFrom: 1 to: (index @env0:- 1).
	after := self @env0:copyFrom: (index @env0:+ sep @env0:size) to: self @env0:size.
	^ tuple @env0:with: before with: sep with: after
%

category: 'Grail-String Methods'
method: CharacterCollection
removeprefix: prefix
	"If the string starts with prefix, return string[len(prefix):], otherwise return a copy."

	| starts |
	starts := self @env0:beginsWith: prefix.
	starts ifTrue: [
		^ self @env0:copyFrom: ((prefix @env0:size) @env0:+ 1) to: self @env0:size
	].
	^ self
%

category: 'Grail-String Methods'
method: CharacterCollection
removesuffix: suffix
	"If the string ends with suffix, return string[:-len(suffix)], otherwise return a copy."

	| ends |
	ends := self @env0:endsWith: suffix.
	ends ifTrue: [
		^ self @env0:copyFrom: 1 to: ((self @env0:size) @env0:- suffix @env0:size)
	].
	^ self
%

category: 'Grail-String Methods'
method: CharacterCollection
replace: old _: new
	"Return a copy with all occurrences of substring old replaced by new."

	^ self @env0:copyReplaceAll: old with: new
%

category: 'Grail-String Methods'
method: CharacterCollection
replace: old _: new _: count
	"replace(old, new, count) — replace at most ``count'' leftmost
	occurrences (negative count means all).  django's WSGIRequest
	path handling uses ``path_info.replace('/', '', 1)''."

	| n | n := count.
	(n @env0:== nil or: [n @env0:== None or: [n @env0:< 0]]) ifTrue: [
		^ self @env0:copyReplaceAll: old with: new].
	^ self @env1:_replaceFirst: old _: new _: n
%

category: 'Grail-String Methods'
method: CharacterCollection
_replaceFirst: old _: new _: count
	"Replace the first ``count'' non-overlapping occurrences of old."

	| stream oldSize src pos n done |
	oldSize := old @env0:size.
	oldSize @env0:= 0 ifTrue: [^ self].
	src := self.
	stream := WriteStream @env0:on: (Unicode7 @env0:new).
	pos := 1.
	n := src @env0:size.
	done := 0.
	[pos @env0:<= n] @env0:whileTrue: [
		(done @env0:< count
			and: [(pos @env0:+ oldSize @env0:- 1 @env0:<= n)
			and: [(src @env0:copyFrom: pos to: pos @env0:+ oldSize @env0:- 1) @env0:= old]]) ifTrue: [
			stream @env0:nextPutAll: new.
			pos := pos @env0:+ oldSize.
			done := done @env0:+ 1
		] ifFalse: [
			stream @env0:nextPut: (src @env0:at: pos).
			pos := pos @env0:+ 1
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
_replace: positional kw: kwargs
	"Varargs entry for ``replace(old, new[, count])''."

	| old new count |
	old := positional @env0:at: 1.
	new := positional @env0:at: 2.
	positional @env0:size @env0:>= 3
		ifTrue: [count := positional @env0:at: 3]
		ifFalse: [^ self @env1:replace: old _: new].
	^ self @env1:replace: old _: new _: count
%

category: 'Grail-String Methods'
method: CharacterCollection
rfind: sub
	"Return the highest index where substring sub is found, or -1 if not found."

	| index lastIndex start |
	lastIndex := 0.
	start := 1.
	[ index := self @env0:findString: sub startingAt: start.
	  (index @env0:> 0) ] whileTrue: [
		lastIndex := index.
		start := (index @env0:+ 1).
	].
	(lastIndex == 0) ifTrue: [ ^ -1 ].
	^ (lastIndex @env0:- (1))  "Convert to 0-based indexing"
%

category: 'Grail-String Methods'
method: CharacterCollection
rfind: sub _: start
	^ self @env1:rfind: sub _: start _: (self @env0:size)
%

category: 'Grail-String Methods'
method: CharacterCollection
rfind: sub _: start _: stop
	"rfind(sub, start, stop) — highest 0-based index of ``sub'' within
	the [start, stop) slice, or -1.  Negative indices wrap."

	| n s e found |
	n := self @env0:size.
	s := start.
	e := stop.
	(s @env0:== nil or: [s @env0:== None]) ifTrue: [s := 0].
	(e @env0:== nil or: [e @env0:== None]) ifTrue: [e := n].
	s @env0:< 0 ifTrue: [s := (s @env0:+ n) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (e @env0:+ n) @env0:max: 0].
	e := e @env0:min: n.
	s @env0:>= e ifTrue: [^ -1].
	found := (self @env0:copyFrom: s @env0:+ 1 to: e) @env1:rfind: sub.
	found @env0:< 0 ifTrue: [^ -1].
	^ found @env0:+ s
%

category: 'Grail-String Methods'
method: CharacterCollection
_rfind: positional kw: kwargs
	"Varargs entry for ``rfind(sub[, start[, stop]])''."

	| sub |
	positional @env0:isEmpty ifTrue: [
		TypeError @env1:___signal___: 'rfind() takes at least 1 argument'
	].
	sub := positional @env0:at: 1.
	positional @env0:size @env0:= 1 ifTrue: [^ self @env1:rfind: sub].
	positional @env0:size @env0:= 2 ifTrue: [
		^ self @env1:rfind: sub _: (positional @env0:at: 2)].
	^ self @env1:rfind: sub _: (positional @env0:at: 2) _: (positional @env0:at: 3)
%

category: 'Grail-String Methods'
method: CharacterCollection
rindex: sub
	"Return the highest index where substring sub is found. Raises ValueError if not found."

	| idx |
	idx := self rfind: sub.
	(idx == -1) ifTrue: [
		ValueError @env0:signal: 'substring not found'
	].
	^ idx
%

category: 'Grail-String Methods'
method: CharacterCollection
rjust: width
	"Return a right-justified string of length width, padded with spaces."

	| stream mySize padding |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	padding @env0:timesRepeat: [
		stream @env0:nextPut: $ 
	].
	stream @env0:nextPutAll: self.
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
rpartition: sep
	"Split the string at the last occurrence of sep, return (before, sep, after)."

	| index before after start lastIndex |
	lastIndex := 0.
	start := 1.
	[ index := self @env0:findString: sep startingAt: start.
	  (index @env0:> 0) ] whileTrue: [
		lastIndex := index.
		start := (index @env0:+ 1).
	].

	(lastIndex == 0) ifTrue: [
		^ tuple @env0:with: '' with: '' with: self
	].

	before := self @env0:copyFrom: 1 to: (lastIndex @env0:- 1).
	after := self @env0:copyFrom: (lastIndex @env0:+ sep @env0:size) to: self @env0:size.
	^ tuple @env0:with: before with: sep with: after
%

category: 'Grail-String Methods'
method: CharacterCollection
rsplit
	"Return a list of words in the string, using whitespace as the delimiter (from right)."

	"For now, same as split since we don't have maxsplit parameter"
	^ self split
%

category: 'Grail-String Methods'
method: CharacterCollection
rsplit: sep
	"rsplit(sep) with no maxsplit — identical to split(sep)."

	^ self @env1:split: sep
%

category: 'Grail-String Methods'
method: CharacterCollection
rsplit: sep _: maxsplit
	^ self @env1:_rsplit: { sep. maxsplit } kw: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
_rsplit: positional kw: kwargs
	"Python ``str.rsplit(sep=None, maxsplit=-1)`` varargs entry.
	Splits are counted from the RIGHT: the leading pieces coalesce
	back into the head entry so the result has at most
	``maxsplit + 1`` elements (email._policybase's
	``doc.rsplit('\n', 1)`` docstring surgery)."

	| sep maxsplit base keep head |
	sep := nil.
	maxsplit := -1.
	positional @env0:isEmpty ifFalse: [
		sep := positional @env0:at: 1.
		positional @env0:size @env0:>= 2 ifTrue: [
			maxsplit := positional @env0:at: 2
		].
	].
	kwargs @env0:isNil ifFalse: [
		sep := kwargs @env0:at: 'sep' ifAbsent: [sep].
		maxsplit := kwargs @env0:at: 'maxsplit' ifAbsent: [maxsplit].
	].
	(sep @env0:== nil or: [sep @env0:== None])
		ifTrue: [base := self split]
		ifFalse: [base := self split: sep].
	(maxsplit @env0:< 0 or: [base @env0:size @env0:<= (maxsplit @env0:+ 1)])
		ifTrue: [^ base].
	keep := base @env0:copyFrom: (base @env0:size @env0:- maxsplit @env0:+ 1) to: base @env0:size.
	head := (base @env0:copyFrom: 1 to: base @env0:size @env0:- maxsplit).
	(sep @env0:== nil or: [sep @env0:== None])
		ifTrue: [
			head := (head @env0:inject: '' into: [:acc :each |
				acc @env0:isEmpty ifTrue: [each] ifFalse: [acc @env0:, ' ' @env0:, each]])
		] ifFalse: [
			head := (head @env0:inject: '' into: [:acc :each |
				acc @env0:isEmpty ifTrue: [each] ifFalse: [acc @env0:, sep @env0:, each]])
		].
	^ (OrderedCollection @env0:with: head) @env0:, keep
%

category: 'Grail-String Methods'
method: CharacterCollection
split: sep _: maxsplit
	^ self @env1:_split: { sep. maxsplit } kw: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
rstrip
	"Return a copy of the string with trailing whitespace removed."

	^ self @env0:trimRight
%

category: 'Grail-String Methods'
method: CharacterCollection
rstrip: chars
	"Return a copy with trailing occurrences of any character in
	``chars'' removed.  None / nil means whitespace, matching
	Python's str.rstrip()."

	(chars @env0:== nil or: [chars @env0:== None])
		ifTrue: [^ self @env0:trimRight].
	^ self @env0:___rstripChars___: chars
%

category: 'Grail-String Methods'
method: CharacterCollection
split
	"Return a list of words in the string, using whitespace as the
	delimiter.  ``subStrings'' yields plain GemStone String substrings;
	rebuild each as the receiver's str class (Unicode7) so they satisfy
	``isinstance(x, str)'' downstream (see split: sep).

	Answer an OrderedCollection -- the canonical Python ``list''
	surrogate -- not the Array subStrings produces: a returned Array
	broke ``text.split() == wrap(...)'' comparisons (class-strict
	sequence __eq__) and would reject list mutations like append."

	^ OrderedCollection @env0:withAll:
		((self @env0:subStrings) @env0:collect: [:p | (self @env0:copyEmpty) @env0:, p])
%

category: 'Grail-String Methods'
method: CharacterCollection
split: sep
	"split(sep) - return a list of substrings using sep as the
	delimiter.  Multi-character separators are honoured.  An empty
	sep raises ValueError per CPython."

	| sepStr sepSize text n result start i |
	sepStr := sep @env0:asString.
	sepSize := sepStr @env0:size.
	sepSize @env0:= 0 ifTrue: [
		ValueError @env1:___signal___: 'empty separator'
	].
	"Keep ``self'' (don't ``asString'' it) so the ``copyFrom:to:''
	substrings preserve the receiver's str class (Unicode7) rather than
	degrading to a plain GemStone String.  A plain String fails
	``isinstance(x, str)'' downstream (str == Unicode7), which broke
	e.g. urllib.parse.unquote_to_bytes on split results."
	text := self.
	n := text @env0:size.
	result := OrderedCollection @env0:new.
	start := 1.
	i := 1.
	[i @env0:+ sepSize @env0:- 1 @env0:<= n] @env0:whileTrue: [
		(text @env0:copyFrom: i to: i @env0:+ sepSize @env0:- 1) @env0:= sepStr ifTrue: [
			result @env0:add: (text @env0:copyFrom: start to: i @env0:- 1).
			i := i @env0:+ sepSize.
			start := i
		] ifFalse: [
			i := i @env0:+ 1
		]
	].
	result @env0:add: (text @env0:copyFrom: start to: n).
	^ result
%

category: 'Grail-String Methods'
method: CharacterCollection
_split: positional kw: kwargs
	"Python ``str.split(sep=None, maxsplit=-1)`` varargs entry.
	Grail jinja2's lexer hits the 2-arg form via the call-site
	``source.split('\\n')`` getting routed through the varargs
	dispatch (the static caller doesn't see the receiver is a str
	at compile time).  Falls back to the existing fixed-arity
	``split`` / ``split:`` methods; ``maxsplit`` is honored when
	positive."

	| sep maxsplit base trimmed |
	sep := nil.
	maxsplit := -1.
	positional @env0:isEmpty ifFalse: [
		sep := positional @env0:at: 1.
		positional @env0:size @env0:>= 2 ifTrue: [
			maxsplit := positional @env0:at: 2
		].
	].
	kwargs @env0:isNil ifFalse: [
		sep := kwargs @env0:at: 'sep' ifAbsent: [sep].
		maxsplit := kwargs @env0:at: 'maxsplit' ifAbsent: [maxsplit].
	].
	sep @env0:isNil
		ifTrue: [base := self split]
		ifFalse: [base := self split: sep].
	(maxsplit @env0:< 0 or: [base @env0:size @env0:<= (maxsplit @env0:+ 1)])
		ifTrue: [^ base].
	"Coalesce trailing pieces back into one tail so the result has
	at most ``maxsplit + 1`` entries."
	trimmed := base @env0:copyFrom: 1 to: maxsplit.
	sep @env0:isNil
		ifTrue: [
			"Whitespace split: tail is everything after the maxsplit-th
			separator run.  Approximate by joining with single spaces."
			trimmed @env0:add: ((base @env0:copyFrom: maxsplit @env0:+ 1 to: base @env0:size)
				@env0:inject: '' into: [:acc :each | acc @env0:, ' ' @env0:, each]) @env0:trimSeparators
		] ifFalse: [
			trimmed @env0:add: ((base @env0:copyFrom: maxsplit @env0:+ 1 to: base @env0:size)
				@env0:inject: '' into: [:acc :each |
					acc @env0:isEmpty ifTrue: [each] ifFalse: [acc @env0:, sep @env0:, each]])
		].
	^ trimmed
%

category: 'Grail-String Methods'
method: CharacterCollection
splitlines
	"str.splitlines() -> list of lines, breaking at universal line
	boundaries, terminators dropped."

	^ self ___splitlinesKeepends: false
%

category: 'Grail-String Methods'
method: CharacterCollection
splitlines: keepends
	"str.splitlines(keepends) -> list of lines; when keepends is truthy
	each line retains its terminator."

	| ke |
	ke := (keepends @env0:== true)
		or: [(keepends @env0:~~ false) and: [(keepends @env0:~~ nil)
			and: [(keepends @env0:~~ None) and: [keepends @env0:~~ 0]]]].
	^ self ___splitlinesKeepends: ke
%

category: 'Grail-String Methods'
method: CharacterCollection
___isLineBoundaryCode: cp
	"True for a Unicode code point that str.splitlines() treats as a line
	boundary: LF CR VT FF FS GS RS NEL LINE-SEP PARA-SEP."

	^ (cp @env0:= 10) or: [(cp @env0:= 13) or: [(cp @env0:= 11)
		or: [(cp @env0:= 12) or: [(cp @env0:= 28) or: [(cp @env0:= 29)
		or: [(cp @env0:= 30) or: [(cp @env0:= 133) or: [(cp @env0:= 8232)
		or: [cp @env0:= 8233]]]]]]]]]
%

category: 'Grail-String Methods'
method: CharacterCollection
___splitlinesKeepends: keepends
	"Shared splitlines engine.  Slices the receiver with copyFrom:to: so
	each line keeps the receiver's str class (Unicode7), preserves empty
	lines (unlike subStrings:), and treats CR+LF as one boundary."

	| n result start i cp termLen |
	n := self @env0:size.
	result := OrderedCollection @env0:new.
	start := 1.
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		cp := (self @env0:at: i) @env0:asInteger.
		(self ___isLineBoundaryCode: cp) ifTrue: [
			termLen := 1.
			((cp @env0:= 13) and: [(i @env0:< n)
				and: [((self @env0:at: i @env0:+ 1) @env0:asInteger) @env0:= 10]])
				ifTrue: [termLen := 2].
			keepends
				ifTrue: [result @env0:add: (self @env0:copyFrom: start to: i @env0:+ termLen @env0:- 1)]
				ifFalse: [result @env0:add: (self @env0:copyFrom: start to: i @env0:- 1)].
			i := i @env0:+ termLen.
			start := i
		] ifFalse: [
			i := i @env0:+ 1
		]
	].
	start @env0:<= n ifTrue: [
		result @env0:add: (self @env0:copyFrom: start to: n)
	].
	^ result
%

category: 'Grail-String Methods'
method: CharacterCollection
startswith: prefix
	"Test whether string starts with the specified prefix."

	^ self @env0:beginsWith: prefix
%

category: 'Grail-String Methods'
method: CharacterCollection
strip
	"Return a copy of the string with leading and trailing whitespace removed."

	^ self @env0:trimBoth
%

category: 'Grail-String Methods'
method: CharacterCollection
strip: chars
	"Return a copy with the characters in `chars' stripped from both
	ends.  None / nil means whitespace, matching Python's str.strip().
	Empty string strips nothing."

	(chars @env0:== nil or: [chars @env0:== None])
		ifTrue: [^ self @env0:trimBoth].
	^ (self @env0:___lstripChars___: chars) @env0:___rstripChars___: chars
%

set compile_env: 0

category: 'Grail-String Methods'
method: CharacterCollection
___lstripChars___: chars
	"Helper: strip leading occurrences of any character in `chars'."

	| size i |
	size := self size.
	i := 1.
	[i <= size and: [chars includes: (self at: i)]] whileTrue: [
		i := i + 1].
	^ i = 1 ifTrue: [self] ifFalse: [self copyFrom: i to: size]
%

category: 'Grail-String Methods'
method: CharacterCollection
___rstripChars___: chars
	"Helper: strip trailing occurrences of any character in `chars'."

	| size i |
	size := self size.
	i := size.
	[i >= 1 and: [chars includes: (self at: i)]] whileTrue: [
		i := i - 1].
	^ i = size ifTrue: [self] ifFalse: [self copyFrom: 1 to: i]
%

set compile_env: 1

category: 'Grail-String Methods'
method: CharacterCollection
swapcase
	"Return a copy with uppercase characters converted to lowercase and vice versa."

	| stream |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	self @env0:do: [:char |
		| isUpper |
		isUpper := char @env0:isUppercase.
		isUpper ifTrue: [
			stream @env0:nextPut: (char @env0:asLowercase)
		] ifFalse: [
			stream @env0:nextPut: (char @env0:asUppercase)
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
title
	"Return a titlecased version of the string where words start with uppercase."

	| stream inWord |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	inWord := false.
	self @env0:do: [:char |
		| isAlpha |
		isAlpha := char @env0:isLetter.
		isAlpha ifTrue: [
			inWord ifTrue: [
				stream @env0:nextPut: (char @env0:asLowercase)
			] ifFalse: [
				stream @env0:nextPut: (char @env0:asUppercase).
				inWord := true.
			]
		] ifFalse: [
			stream @env0:nextPut: char.
			inWord := false.
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
translate: table
	"Return a copy with each character mapped through the translation
	table.  ``table`` is a mapping from int (Unicode codepoint) to
	either a replacement string, an int (codepoint), or None
	(delete).  Codepoints not in the table pass through unchanged.

	Implementation: walks the receiver once, looks up each char's
	codepoint via ``@env1:__getitem__:`` (so dict / KVD / any object
	implementing the mapping protocol works), and appends the
	replacement to an output stream."

	| stream |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	self @env0:do: [:ch |
		| cp replacement |
		cp := ch @env0:codePoint.
		replacement := [table @env1:__getitem__: cp]
			@env0:on: KeyError do: [:ex | ex @env0:return: ch].
		replacement == ch ifTrue: [stream @env0:nextPut: ch] ifFalse: [
			replacement == None ifFalse: [
				(replacement @env0:isKindOf: Integer) ifTrue: [
					stream @env0:nextPut: (Character @env0:codePoint: replacement)
				] ifFalse: [
					stream @env0:nextPutAll: replacement
				]
			]
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
upper
	"Return a copy of the string with all characters converted to uppercase."

	^ self @env0:asUppercase
%

category: 'Grail-String Methods'
method: CharacterCollection
zfill: width
	"Pad a numeric string with zeros on the left, to fill a field of the given width."

	| stream mySize padding hasSign firstChar |
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	"Check if string starts with + or -"
	hasSign := false.
	(mySize @env0:> 0) ifTrue: [
		firstChar := self @env0:first.
		hasSign := ((firstChar == $+) @env0:| (firstChar == $-)).
	].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).

	hasSign ifTrue: [
		stream @env0:nextPut: firstChar.
		padding @env0:timesRepeat: [
			stream @env0:nextPut: $0
		].
		stream @env0:nextPutAll: (self @env0:allButFirst).
	] ifFalse: [
		padding @env0:timesRepeat: [
			stream @env0:nextPut: $0
		].
		stream @env0:nextPutAll: self.
	].
	^ stream @env0:contents
%

set compile_env: 0
