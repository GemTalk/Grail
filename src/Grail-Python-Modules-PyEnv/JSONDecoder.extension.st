Extension { #name : 'JSONDecoder' }

{ #category : 'Grail-Class Attrs' }
JSONDecoder class >> __module__ [
	^ 'json.decoder'

]

{ #category : 'Grail-Introspection' }
JSONDecoder class >> __qualname__ [
	"Only JSONDecoder itself -- a Python subclass reports its own name."

	^ self @env0:== JSONDecoder
		ifTrue: ['JSONDecoder']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Private' }
JSONDecoder >> ___hooks___ [
	"The parser's hook Array (object_hook, object_pairs_hook, parse_float,
	parse_int, parse_constant), read through the attribute path as CPython's
	make_scanner reads self's.  The float and int types are the defaults
	and convert natively, so they are no hook at all."

	| get pf pi hooks |
	get := [:sym | | x | x := self ___pyAttrLoad___: sym. x == None ifTrue: [nil] ifFalse: [x]].
	pf := get value: #parse_float.
	pf == float ifTrue: [pf := nil].
	pi := get value: #parse_int.
	pi == int ifTrue: [pi := nil].
	hooks := Array @env0:new: 5.
	hooks @env0:at: 1 put: (get value: #object_hook).
	hooks @env0:at: 2 put: (get value: #object_pairs_hook).
	hooks @env0:at: 3 put: pf.
	hooks @env0:at: 4 put: pi.
	hooks @env0:at: 5 put: (get value: #parse_constant).
	^ hooks

]

{ #category : 'Grail-Initialization' }
JSONDecoder >> ___init__: positional kw: kwargs [
	"JSONDecoder(*, object_hook=None, parse_float=None, parse_int=None,
	parse_constant=None, strict=True, object_pairs_hook=None)."

	| names v |
	(positional @env0:notNil and: [positional @env0:size @env0:> 0]) ifTrue: [
		^ TypeError ___signal___:
			'JSONDecoder.__init__() takes 1 positional argument but '
				@env0:, (positional @env0:size @env0:+ 1) @env0:printString
				@env0:, ' were given'].
	names := #( 'object_hook' 'parse_float' 'parse_int' 'parse_constant' 'strict' 'object_pairs_hook' ).
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysDo: [:k |
			(names @env0:includes: k @env0:asString) ifFalse: [
				^ TypeError ___signal___:
					'JSONDecoder.__init__() got an unexpected keyword argument '''
						@env0:, k @env0:asString @env0:, '''']]].
	v := [:name :default |
		| given |
		given := kwargs @env0:isNil
			ifTrue: [None]
			ifFalse: [kwargs @env0:at: name ifAbsent: [None]].
		(given == None or: [given == nil]) ifTrue: [default] ifFalse: [given]].
	self @env0:dynamicInstVarAt: #object_hook put: (v value: 'object_hook' value: None).
	self @env0:dynamicInstVarAt: #parse_float put: (v value: 'parse_float' value: float).
	self @env0:dynamicInstVarAt: #parse_int put: (v value: 'parse_int' value: int).
	self @env0:dynamicInstVarAt: #parse_constant put: (v value: 'parse_constant'
		value: (((json_decoder instance) @env0:at: #'_CONSTANTS')
			___pyAttrLoad___: #'__getitem__')).
	"strict is stored as given: CPython keeps ``strict=0'' as 0."
	self @env0:dynamicInstVarAt: #strict put: (kwargs @env0:isNil
		ifTrue: [true]
		ifFalse: [kwargs @env0:at: 'strict' ifAbsent: [true]]).
	self @env0:dynamicInstVarAt: #object_pairs_hook put: (v value: 'object_pairs_hook' value: None).
	scanHooks := self ___hooks___.
	scanStrict := self ___strict___.
	^ None

]

{ #category : 'Grail-Private' }
JSONDecoder >> ___requireScanner___ [
	"CPython's decode and raw_decode use self.scan_once, which only
	JSONDecoder.__init__ creates."

	scanHooks @env0:isNil ifTrue: [
		^ AttributeError ___signal___: '''' @env0:, self ___pyTypeNameForError___
			@env0:, ''' object has no attribute ''scan_once'''].
	^ self

]

{ #category : 'Grail-Private' }
JSONDecoder >> ___strict___ [
	^ (self ___pyAttrLoad___: #strict) @env1:___isTruthy___

]

{ #category : 'Grail-Initialization' }
JSONDecoder >> __init__ [
	^ self ___init__: #() kw: nil

]

{ #category : 'Grail-Decoding' }
JSONDecoder >> _raw_decode: positional kw: kwargs [
	"raw_decode(s, idx=0) with idx by keyword."

	| s idx |
	(positional @env0:size @env0:between: 1 and: 2) ifFalse: [
		^ TypeError ___signal___:
			'JSONDecoder.raw_decode() takes from 2 to 3 positional arguments but '
				@env0:, (positional @env0:size @env0:+ 1) @env0:printString @env0:, ' were given'].
	s := positional @env0:at: 1.
	idx := positional @env0:size @env0:= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [0].
	kwargs @env0:isNil ifFalse: [idx := kwargs @env0:at: 'idx' ifAbsent: [idx]].
	^ self raw_decode: s _: idx

]

{ #category : 'Grail-Decoding' }
JSONDecoder >> decode: s [
	"The Python object for the JSON document s, which must be a str.
	Leading and trailing whitespace is allowed; anything else after the value
	is ``Extra data''."

	(s isKindOf: CharacterCollection) ifFalse: [
		(s isKindOf: ByteArray) ifTrue: [
			^ TypeError ___signal___: 'cannot use a string pattern on a bytes-like object'].
		^ TypeError ___signal___: 'expected string or bytes-like object, got '''
			@env0:, s ___pyTypeNameForError___ @env0:, ''''].
	self ___requireScanner___.
	^ (json instance) _loadsText: s hooks: scanHooks strict: scanStrict

]

{ #category : 'Grail-Decoding' }
JSONDecoder >> raw_decode: s [
	^ self raw_decode: s _: 0

]

{ #category : 'Grail-Decoding' }
JSONDecoder >> raw_decode: s _: idx [
	"(obj, end): the value that STARTS at idx, and the index just past it.
	Unlike decode, no whitespace is skipped first and anything after the
	value is ignored -- the streaming use."

	| text state result |
	(s isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'first argument must be a string, not '
			@env0:, s ___pyTypeNameForError___].
	self ___requireScanner___.
	idx @env0:< 0 ifTrue: [^ ValueError ___signal___: 'idx cannot be negative'].
	text := s @env0:asString.
	state := Array @env0:with: text with: idx @env0:+ 1 with: scanHooks with: scanStrict.
	"The parser skips whitespace before a value; raw_decode must not."
	(idx @env0:< text @env0:size
		and: [#( 32 9 10 13 ) @env0:includes: (text @env0:at: idx @env0:+ 1) @env0:codePoint]) ifTrue: [
			^ JSONDecodeError ___signalMsg___: 'Expecting value' doc: text pos: idx].
	result := (json instance) _parseValue: state.
	^ tuple @env0:withAll: { result. (state @env0:at: 2) @env0:- 1 }

]
