! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- json module class
expectvalue /Class
doit
module subclass: 'json'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
json comment:
'Python json module - JSON encoding and decoding.

Smalltalk-backed: dumps walks Python values recursively, emitting
JSON text; loads runs a recursive-descent parser over the input.
Surface targeted at Flask / Werkzeug / itsdangerous:

  dumps(obj, *, indent=None, separators=None, sort_keys=False,
        ensure_ascii=True, default=None)
  loads(s)

JSONEncoder / JSONDecoder classes are not implemented; subclassing
the encoder is rarely used outside framework internals.  Use the
`default` callback on dumps() to customize a single type instead.

Supported value types:
  None         -> null
  True / False -> true / false
  int / float  -> JSON number (nan / inf become null per CPython
                  when allow_nan=False; here we emit "NaN" / "Infinity"
                  as CPython does by default)
  str          -> "..." with \\ / \" / \b / \f / \n / \r / \t and
                  \uXXXX escapes for non-ASCII when ensure_ascii=True
  list / tuple -> [...]
  dict         -> {"key": value, ...}  (keys must be strings)
'
%

expectvalue /Class
doit
json category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
json removeAllMethods: 0.
json removeAllMethods: 1.
json class removeAllMethods: 0.
json class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: json
initialize
	"JSONEncoder — subclassable hook class (django's DjangoJSONEncoder
	extends it and overrides ``default'').  Grail's _dumps: doesn't
	route through encoder instances yet; the class exists so the
	subclass statement and isinstance checks work.  JSONDecodeError
	aliases ValueError (its CPython superclass)."
	self @env0:at: #JSONEncoder put: (PythonInstance ___subclass___: #JSONEncoder instVarNames: #() classInstVarNames: #()).
	self @env0:at: #JSONDecodeError put: ValueError
%

! ===============================================================================
! Public API
! ===============================================================================

category: 'Grail-Public'
method: json
dumps: obj
	^ self _dumps: { obj } kw: nil
%

category: 'Grail-Public'
method: json
_dumps: positional kw: kwargs
	"dumps(obj, *, indent=None, separators=None, sort_keys=False,
	ensure_ascii=True, default=None)."

	| obj indent separators sortKeys ensureAscii default stream sep |
	obj := positional @env0:at: 1.
	indent := nil.
	separators := nil.
	sortKeys := false.
	ensureAscii := true.
	default := nil.
	kwargs @env0:isNil ifFalse: [
		indent := kwargs @env0:at: 'indent' ifAbsent: [nil].
		indent == None ifTrue: [indent := nil].
		separators := kwargs @env0:at: 'separators' ifAbsent: [nil].
		separators == None ifTrue: [separators := nil].
		sortKeys := (kwargs @env0:at: 'sort_keys' ifAbsent: [false]) == true.
		ensureAscii := (kwargs @env0:at: 'ensure_ascii' ifAbsent: [true]) ~~ false.
		default := kwargs @env0:at: 'default' ifAbsent: [nil].
		default == None ifTrue: [default := nil]
	].
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	"Build separator pair: (item, key) - defaults to (', ', ': ') when
	indent is None, or (',', ': ') when indented."
	sep := self _buildSeparators: separators indent: indent.
	self _encode: obj onto: stream
		indent: indent depth: 0
		separators: sep ensureAscii: ensureAscii
		sortKeys: sortKeys default: default.
	^ stream @env0:contents
%

category: 'Grail-Public'
method: json
load: fp
	"load(fp) - read JSON from a file-like object's ``read()'' and
	parse.  fp is any object with a no-arg ``read()'' method that
	returns the full JSON text (str or bytes)."

	^ self loads: (fp read)
%

category: 'Grail-Public'
method: json
_dump: positional kw: kwargs
	"dump(obj, fp, **kwargs) - serialise ``obj'' as JSON and write to
	``fp'' via fp.write(chunk).  All other kwargs forward to
	dumps; we materialise the full string once then write it (no
	chunking).  Flask / itsdangerous never depend on iterencode-
	style streaming."

	| obj fp text dumpsArgs |
	obj := positional @env0:at: 1.
	fp := positional @env0:at: 2.
	dumpsArgs := Array @env0:with: obj.
	text := self _dumps: dumpsArgs kw: kwargs.
	^ fp write: text
%

category: 'Grail-Public'
method: json
loads: s
	"loads(s) - parse JSON text into Python values.  Accepts str,
	bytes, or bytearray inputs; bytes/bytearray are decoded as UTF-8
	per CPython 3.6+."

	| text state result |
	text := (s isKindOf: ByteArray)
		@env0:ifTrue: [s decode: 'utf-8']
		@env0:ifFalse: [s @env0:asString].
	state := Array @env0:with: text with: 1.
	self _skipWs: state.
	result := self _parseValue: state.
	self _skipWs: state.
	(state @env0:at: 2) @env0:<= (state @env0:at: 1) @env0:size ifTrue: [
		ValueError ___signal___: 'extra data after JSON document at pos '
			@env0:, (state @env0:at: 2) @env0:printString
	].
	^ result
%

! ===============================================================================
! Encoder
! ===============================================================================

category: 'Grail-Private'
method: json
_buildSeparators: explicit indent: indent
	"Resolve the (item_sep, key_sep) pair."

	explicit @env0:notNil ifTrue: [
		^ Array
			@env0:with: (explicit __getitem__: 0)
			with: (explicit __getitem__: 1)
	].
	indent @env0:notNil ifTrue: [
		^ Array @env0:with: ',' with: ': '
	].
	^ Array @env0:with: ', ' with: ': '
%

category: 'Grail-Private'
method: json
_encode: obj onto: stream indent: indent depth: depth separators: sep ensureAscii: ensureAscii sortKeys: sortKeys default: default
	"Dispatch to a type-specific encoder."

	obj == nil ifTrue: [^ stream @env0:nextPutAll: 'null'].
	obj == None ifTrue: [^ stream @env0:nextPutAll: 'null'].
	obj == true ifTrue: [^ stream @env0:nextPutAll: 'true'].
	obj == false ifTrue: [^ stream @env0:nextPutAll: 'false'].
	(obj isKindOf: Integer) ifTrue: [^ stream @env0:nextPutAll: obj @env0:printString].
	(obj isKindOf: Float) ifTrue: [
		^ self _encodeFloat: obj onto: stream
	].
	(obj isKindOf: CharacterCollection) ifTrue: [
		^ self _encodeString: obj onto: stream ensureAscii: ensureAscii
	].
	((obj isKindOf: Array) @env0:or: [obj isKindOf: OrderedCollection]) ifTrue: [
		^ self _encodeArray: obj onto: stream
			indent: indent depth: depth separators: sep
			ensureAscii: ensureAscii sortKeys: sortKeys default: default
	].
	(obj isKindOf: KeyValueDictionary) ifTrue: [
		^ self _encodeObject: obj onto: stream
			indent: indent depth: depth separators: sep
			ensureAscii: ensureAscii sortKeys: sortKeys default: default
	].
	"Unknown type - if a default callable is supplied, call it and
	encode the result.  Otherwise TypeError."
	default @env0:notNil ifTrue: [
		| converted |
		converted := default value: { obj } value: nil.
		^ self _encode: converted onto: stream
			indent: indent depth: depth separators: sep
			ensureAscii: ensureAscii sortKeys: sortKeys default: nil
	].
	TypeError ___signal___: 'Object of type '
		@env0:, obj @env0:class @env0:name @env0:asString
		@env0:, ' is not JSON serializable'
%

category: 'Grail-Private'
method: json
_encodeFloat: f onto: stream
	"NaN -> NaN, +Inf -> Infinity, -Inf -> -Infinity, others use
	standard print form.  GemStone Float lacks isInfinite / isNaN
	(but has the private _isNaN); detect infinity by comparing
	against the largest finite Float."

	| pstr |
	f @env0:_isNaN ifTrue: [^ stream @env0:nextPutAll: 'NaN'].
	pstr := f @env0:printString.
	pstr @env0:= 'PlusInfinity' ifTrue: [^ stream @env0:nextPutAll: 'Infinity'].
	pstr @env0:= 'MinusInfinity' ifTrue: [^ stream @env0:nextPutAll: '-Infinity'].
	^ stream @env0:nextPutAll: pstr
%

category: 'Grail-Private'
method: json
_encodeString: s onto: stream ensureAscii: ensureAscii
	"Emit a JSON-quoted string with escapes."

	stream @env0:nextPut: $".
	s @env0:do: [:ch |
		| cv |
		cv := ch @env0:asInteger.
		cv @env0:= 16r22 ifTrue: [stream @env0:nextPutAll: '\"']
		ifFalse: [cv @env0:= 16r5C ifTrue: [stream @env0:nextPutAll: '\\']
		ifFalse: [cv @env0:= 16r08 ifTrue: [stream @env0:nextPutAll: '\b']
		ifFalse: [cv @env0:= 16r09 ifTrue: [stream @env0:nextPutAll: '\t']
		ifFalse: [cv @env0:= 16r0A ifTrue: [stream @env0:nextPutAll: '\n']
		ifFalse: [cv @env0:= 16r0C ifTrue: [stream @env0:nextPutAll: '\f']
		ifFalse: [cv @env0:= 16r0D ifTrue: [stream @env0:nextPutAll: '\r']
		ifFalse: [
			(cv @env0:< 16r20) ifTrue: [
				stream @env0:nextPutAll: '\u'.
				stream @env0:nextPutAll: (self _hex4: cv)
			] ifFalse: [
				(ensureAscii @env0:and: [cv @env0:> 16r7E]) ifTrue: [
					stream @env0:nextPutAll: '\u'.
					stream @env0:nextPutAll: (self _hex4: cv)
				] ifFalse: [
					stream @env0:nextPut: ch
				]
			]
		]]]]]]]
	].
	stream @env0:nextPut: $"
%

category: 'Grail-Private'
method: json
_hex4: codepoint
	"4-digit zero-padded lowercase hex.  GemStone doesn't expose
	`Integer >> printString:` so build the hex string nibble-by-nibble."

	| n s digits |
	n := codepoint.
	digits := '0123456789abcdef'.
	s := Unicode7 @env0:new.
	n @env0:= 0 ifTrue: [^ '0000'].
	[n @env0:> 0] @env0:whileTrue: [
		s := (Unicode7 @env0:with: (digits @env0:at: (n @env0:bitAnd: 15) @env0:+ 1)) @env0:, s.
		n := n @env0:bitShift: -4
	].
	[s @env0:size @env0:< 4] @env0:whileTrue: [s := '0' @env0:, s].
	^ s
%

category: 'Grail-Private'
method: json
_encodeArray: arr onto: stream indent: indent depth: depth separators: sep ensureAscii: ensureAscii sortKeys: sortKeys default: default
	| itemSep first newDepth |
	itemSep := sep @env0:at: 1.
	stream @env0:nextPut: $[.
	(indent @env0:notNil @env0:and: [arr @env0:size @env0:> 0]) ifTrue: [
		newDepth := depth @env0:+ 1.
		first := true.
		arr @env0:do: [:item |
			first ifFalse: [stream @env0:nextPutAll: itemSep].
			first := false.
			stream @env0:lf.
			self _writeIndent: indent depth: newDepth onto: stream.
			self _encode: item onto: stream
				indent: indent depth: newDepth separators: sep
				ensureAscii: ensureAscii sortKeys: sortKeys default: default
		].
		stream @env0:lf.
		self _writeIndent: indent depth: depth onto: stream
	] ifFalse: [
		first := true.
		arr @env0:do: [:item |
			first ifFalse: [stream @env0:nextPutAll: itemSep].
			first := false.
			self _encode: item onto: stream
				indent: indent depth: depth separators: sep
				ensureAscii: ensureAscii sortKeys: sortKeys default: default
		]
	].
	stream @env0:nextPut: $]
%

category: 'Grail-Private'
method: json
_encodeObject: dict onto: stream indent: indent depth: depth separators: sep ensureAscii: ensureAscii sortKeys: sortKeys default: default
	| itemSep keySep keys first newDepth |
	itemSep := sep @env0:at: 1.
	keySep := sep @env0:at: 2.
	stream @env0:nextPut: ${.
	keys := dict @env0:keys @env0:asArray.
	sortKeys ifTrue: [
		keys := keys @env0:asSortedCollection: [:a :b | a @env0:asString @env0:< b @env0:asString].
		keys := keys @env0:asArray
	].
	(indent @env0:notNil @env0:and: [keys @env0:size @env0:> 0]) ifTrue: [
		newDepth := depth @env0:+ 1.
		first := true.
		keys @env0:do: [:k |
			first ifFalse: [stream @env0:nextPutAll: itemSep].
			first := false.
			stream @env0:lf.
			self _writeIndent: indent depth: newDepth onto: stream.
			self _encodeString: k @env0:asString onto: stream ensureAscii: ensureAscii.
			stream @env0:nextPutAll: keySep.
			self _encode: (dict @env0:at: k) onto: stream
				indent: indent depth: newDepth separators: sep
				ensureAscii: ensureAscii sortKeys: sortKeys default: default
		].
		stream @env0:lf.
		self _writeIndent: indent depth: depth onto: stream
	] ifFalse: [
		first := true.
		keys @env0:do: [:k |
			first ifFalse: [stream @env0:nextPutAll: itemSep].
			first := false.
			self _encodeString: k @env0:asString onto: stream ensureAscii: ensureAscii.
			stream @env0:nextPutAll: keySep.
			self _encode: (dict @env0:at: k) onto: stream
				indent: indent depth: depth separators: sep
				ensureAscii: ensureAscii sortKeys: sortKeys default: default
		]
	].
	stream @env0:nextPut: $}
%

category: 'Grail-Private'
method: json
_writeIndent: indent depth: depth onto: stream
	"Indent prefix: if `indent` is a string use it directly, if an int
	emit that many spaces, both times the depth."

	| chunk buf |
	(indent isKindOf: Integer) ifTrue: [
		buf := WriteStream @env0:on: Unicode7 @env0:new.
		1 @env0:to: indent do: [:i | buf @env0:nextPut: Character @env0:space].
		chunk := buf @env0:contents
	] ifFalse: [
		chunk := indent @env0:asString
	].
	1 @env0:to: depth do: [:i | stream @env0:nextPutAll: chunk]
%

! ===============================================================================
! Decoder (recursive descent over (source, position) state pair)
! ===============================================================================

category: 'Grail-Private'
method: json
_skipWs: state
	| src pos n ch |
	src := state @env0:at: 1.
	pos := state @env0:at: 2.
	n := src @env0:size.
	[pos @env0:<= n
		@env0:and: [
			ch := src @env0:at: pos.
			(ch @env0:= Character @env0:space)
				@env0:or: [(ch @env0:= Character @env0:tab)
				@env0:or: [(ch @env0:= Character @env0:cr)
				@env0:or: [ch @env0:= Character @env0:lf]]]
		]] @env0:whileTrue: [pos := pos @env0:+ 1].
	state @env0:at: 2 put: pos
%

category: 'Grail-Private'
method: json
_parseValue: state
	| ch src pos |
	self _skipWs: state.
	src := state @env0:at: 1.
	pos := state @env0:at: 2.
	pos @env0:> src @env0:size ifTrue: [
		ValueError ___signal___: 'expected JSON value at end of input'
	].
	ch := src @env0:at: pos.
	ch @env0:= ${ ifTrue: [^ self _parseObject: state].
	ch @env0:= $[ ifTrue: [^ self _parseArray: state].
	ch @env0:= $" ifTrue: [^ self _parseString: state].
	(ch @env0:= $t @env0:or: [ch @env0:= $f]) ifTrue: [^ self _parseBool: state].
	ch @env0:= $n ifTrue: [^ self _parseNull: state].
	((ch @env0:= $-) @env0:or: [ch @env0:asInteger @env0:>= $0 @env0:asInteger @env0:and: [ch @env0:asInteger @env0:<= $9 @env0:asInteger]]) ifTrue: [
		^ self _parseNumber: state
	].
	ValueError ___signal___: 'unexpected character at pos '
		@env0:, pos @env0:printString
%

category: 'Grail-Private'
method: json
_parseNull: state
	| src pos |
	src := state @env0:at: 1.
	pos := state @env0:at: 2.
	(src @env0:copyFrom: pos to: pos @env0:+ 3) @env0:= 'null' ifFalse: [
		ValueError ___signal___: 'expected null at pos ' @env0:, pos @env0:printString
	].
	state @env0:at: 2 put: pos @env0:+ 4.
	^ None
%

category: 'Grail-Private'
method: json
_parseBool: state
	| src pos |
	src := state @env0:at: 1.
	pos := state @env0:at: 2.
	((src @env0:at: pos) @env0:= $t) ifTrue: [
		(src @env0:copyFrom: pos to: pos @env0:+ 3) @env0:= 'true' ifFalse: [
			ValueError ___signal___: 'expected true at pos ' @env0:, pos @env0:printString
		].
		state @env0:at: 2 put: pos @env0:+ 4.
		^ true
	].
	(src @env0:copyFrom: pos to: pos @env0:+ 4) @env0:= 'false' ifFalse: [
		ValueError ___signal___: 'expected false at pos ' @env0:, pos @env0:printString
	].
	state @env0:at: 2 put: pos @env0:+ 5.
	^ false
%

category: 'Grail-Private'
method: json
_parseNumber: state
	"Read an int/float; the JSON grammar restricts to [-]int[.frac][exp]."

	| src pos n start hasFraction hasExp tokenStr value |
	src := state @env0:at: 1.
	pos := state @env0:at: 2.
	n := src @env0:size.
	start := pos.
	(src @env0:at: pos) @env0:= $- ifTrue: [pos := pos @env0:+ 1].
	[pos @env0:<= n @env0:and: [self _isDigit: (src @env0:at: pos)]]
		@env0:whileTrue: [pos := pos @env0:+ 1].
	hasFraction := false.
	(pos @env0:<= n @env0:and: [(src @env0:at: pos) @env0:= $.]) ifTrue: [
		hasFraction := true.
		pos := pos @env0:+ 1.
		[pos @env0:<= n @env0:and: [self _isDigit: (src @env0:at: pos)]]
			@env0:whileTrue: [pos := pos @env0:+ 1]
	].
	hasExp := false.
	(pos @env0:<= n @env0:and: [
		| c |
		c := src @env0:at: pos.
		c @env0:= $e @env0:or: [c @env0:= $E]
	]) ifTrue: [
		hasExp := true.
		pos := pos @env0:+ 1.
		(pos @env0:<= n @env0:and: [
			| c |
			c := src @env0:at: pos.
			(c @env0:= $+) @env0:or: [c @env0:= $-]
		]) ifTrue: [pos := pos @env0:+ 1].
		[pos @env0:<= n @env0:and: [self _isDigit: (src @env0:at: pos)]]
			@env0:whileTrue: [pos := pos @env0:+ 1]
	].
	tokenStr := src @env0:copyFrom: start to: pos @env0:- 1.
	state @env0:at: 2 put: pos.
	(hasFraction @env0:or: [hasExp])
		ifTrue: [value := tokenStr @env0:asNumber @env0:asFloat]
		ifFalse: [value := tokenStr @env0:asNumber].
	^ value
%

category: 'Grail-Private'
method: json
_isDigit: ch
	| cv |
	cv := ch @env0:asInteger.
	^ (cv @env0:>= $0 @env0:asInteger) @env0:and: [cv @env0:<= $9 @env0:asInteger]
%

category: 'Grail-Private'
method: json
_parseString: state
	"Read a quoted string up to the closing quote, expanding the JSON
	escape set."

	| src pos n stream ch cv |
	src := state @env0:at: 1.
	pos := state @env0:at: 2.
	n := src @env0:size.
	(src @env0:at: pos) @env0:= $" ifFalse: [
		ValueError ___signal___: 'expected string at pos ' @env0:, pos @env0:printString
	].
	pos := pos @env0:+ 1.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	[pos @env0:<= n @env0:and: [(src @env0:at: pos) @env0:~= $"]]
		@env0:whileTrue: [
			ch := src @env0:at: pos.
			ch @env0:= $\ ifTrue: [
				pos := pos @env0:+ 1.
				pos @env0:> n ifTrue: [ValueError ___signal___: 'truncated escape'].
				cv := src @env0:at: pos.
				cv @env0:= $" ifTrue: [stream @env0:nextPut: $"]
				ifFalse: [cv @env0:= $\ ifTrue: [stream @env0:nextPut: $\]
				ifFalse: [cv @env0:= $/ ifTrue: [stream @env0:nextPut: $/]
				ifFalse: [cv @env0:= $b ifTrue: [stream @env0:nextPut: (Character @env0:codePoint: 16r08)]
				ifFalse: [cv @env0:= $f ifTrue: [stream @env0:nextPut: (Character @env0:codePoint: 16r0C)]
				ifFalse: [cv @env0:= $n ifTrue: [stream @env0:nextPut: Character @env0:lf]
				ifFalse: [cv @env0:= $r ifTrue: [stream @env0:nextPut: Character @env0:cr]
				ifFalse: [cv @env0:= $t ifTrue: [stream @env0:nextPut: Character @env0:tab]
				ifFalse: [cv @env0:= $u ifTrue: [
					| hex codepoint |
					hex := src @env0:copyFrom: pos @env0:+ 1 to: pos @env0:+ 4.
					codepoint := Number @env0:fromString: '16r' @env0:, hex.
					stream @env0:nextPut: (Character @env0:codePoint: codepoint).
					pos := pos @env0:+ 4
				] ifFalse: [
					ValueError ___signal___: 'bad escape \' @env0:, cv @env0:asString
				]]]]]]]]].
				pos := pos @env0:+ 1
			] ifFalse: [
				stream @env0:nextPut: ch.
				pos := pos @env0:+ 1
			]
		].
	pos @env0:> n ifTrue: [ValueError ___signal___: 'unterminated string'].
	state @env0:at: 2 put: pos @env0:+ 1.
	^ stream @env0:contents
%

category: 'Grail-Private'
method: json
_parseArray: state
	"Parse [...]; comma-separated values, JSON whitespace skipped
	between tokens."

	| src result first |
	src := state @env0:at: 1.
	state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
	self _skipWs: state.
	result := list ___new___.
	(src @env0:at: (state @env0:at: 2)) @env0:= $] ifTrue: [
		state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
		^ result
	].
	first := true.
	[
		first ifFalse: [
			self _skipWs: state.
			(src @env0:at: (state @env0:at: 2)) @env0:= $, ifFalse: [
				ValueError ___signal___: 'expected , or ] in array at pos '
					@env0:, (state @env0:at: 2) @env0:printString
			].
			state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1
		].
		first := false.
		result append: (self _parseValue: state).
		self _skipWs: state.
		(src @env0:at: (state @env0:at: 2)) @env0:= $]
	] @env0:whileFalse.
	state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
	^ result
%

category: 'Grail-Private'
method: json
_parseObject: state
	"Parse {...}; key:value pairs, keys must be strings."

	| src result first key value |
	src := state @env0:at: 1.
	state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
	self _skipWs: state.
	result := dict ___new___.
	(src @env0:at: (state @env0:at: 2)) @env0:= $} ifTrue: [
		state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
		^ result
	].
	first := true.
	[
		first ifFalse: [
			self _skipWs: state.
			(src @env0:at: (state @env0:at: 2)) @env0:= $, ifFalse: [
				ValueError ___signal___: 'expected , or } in object at pos '
					@env0:, (state @env0:at: 2) @env0:printString
			].
			state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1
		].
		first := false.
		self _skipWs: state.
		key := self _parseString: state.
		self _skipWs: state.
		(src @env0:at: (state @env0:at: 2)) @env0:= $: ifFalse: [
			ValueError ___signal___: 'expected : in object at pos '
				@env0:, (state @env0:at: 2) @env0:printString
		].
		state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
		value := self _parseValue: state.
		result __setitem__: key _: value.
		self _skipWs: state.
		(src @env0:at: (state @env0:at: 2)) @env0:= $}
	] @env0:whileFalse.
	state @env0:at: 2 put: (state @env0:at: 2) @env0:+ 1.
	^ result
%

set compile_env: 0
