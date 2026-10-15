Extension { #name : '_grail_openssl' }

{ #category : 'Grail-Private' }
_grail_openssl >> ___call: positional in: st [
	"call()'s work, against st: libssl's state or the callback library's."

	| name resType argTypes args co cls |
	cls := self @env0:class.
	(positional @env0:size @env0:< 3) ifTrue: [
		^ TypeError ___signal___: 'call() takes at least 3 arguments'].
	name := (positional @env0:at: 1) @env0:asString.
	resType := cls @env0:_typeSymbol: (positional @env0:at: 2).
	resType @env0:ifNil: [
		^ ValueError ___signal___: 'unknown result type ' @env0:, (positional @env0:at: 2) @env0:printString].
	argTypes := ((positional @env0:at: 3) @env0:asArray) @env0:collect: [:t |
		(cls @env0:_typeSymbol: t) @env0:ifNil: [
			^ ValueError ___signal___: 'unknown argument type ' @env0:, t @env0:printString]].
	(positional @env0:size @env0:- 3) @env0:= argTypes @env0:size ifFalse: [
		^ TypeError ___signal___: name @env0:, '() takes ' @env0:, argTypes @env0:size @env0:printString
			@env0:, ' arguments (' @env0:, (positional @env0:size @env0:- 3) @env0:printString @env0:, ' given)'].
	args := Array @env0:new: argTypes @env0:size.
	1 @env0:to: argTypes @env0:size do: [:i | | v |
		"Python's None is not Smalltalk's nil; C's NULL is the latter."
		v := positional @env0:at: i @env0:+ 3.
		v == None ifTrue: [v := nil].
		args @env0:at: i put: (cls @env0:_argument: v as: (argTypes @env0:at: i))].
	co := cls @env0:_calloutIn: st name: name result: resType args: argTypes.
	^ self ___none___: (cls @env0:_result: (co @env0:callWith: args) as: resType)

]

{ #category : 'Grail-Private' }
_grail_openssl >> ___none___: aValue [
	"aValue, with Smalltalk's nil answered as Python's None."

	aValue @env0:== nil ifTrue: [^ None].
	^ aValue

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> _call: positional kw: kwargs [
	"call(name, restype, argtypes, *args) -- call a libssl/libcrypto function.
	See the class comment for the type spellings and the value conversions.
	(Spelled _call:kw:, the varargs form Python's ``call(...)'' dispatches to.)"

	| st |
	st := (self @env0:class) @env0:_state.
	st @env0:ifNil: [
		^ OSError ___signal___: 'the OpenSSL library GemStone ships was not found in $GEMSTONE/lib'].
	^ self ___call: positional in: st

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> _cb: positional kw: kwargs [
	"cb(name, restype, argtypes, *args) -- call() into the callback library."

	| st |
	st := (self @env0:class) @env0:_callbackState.
	st @env0:ifNil: [
		^ OSError ___signal___: 'the OpenSSL callback library is not loaded'].
	^ self ___call: positional in: st

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> address: aPointer [
	"address(p) -- p's address as an int, 0 for None: pointer identity."

	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ 0].
	^ aPointer @env0:memoryAddress

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> callbacks [
	"callbacks() -- True when the OpenSSL callback library is loaded (loading
	it into this session the first time)."

	^ ((self @env0:class) @env0:_callbackState) @env0:notNil

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> callbacks_problem [
	"callbacks_problem() -- why callbacks() is False, or None."

	| known |
	(self @env0:class) @env0:_callbackState.
	known := SessionTemps @env0:current @env0:at: #GrailOpenSslCallbacks otherwise: nil.
	(known @env0:isKindOf: CharacterCollection) ifTrue: [^ known].
	^ None

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> cstring: aPointer [
	"cstring(p) -- the NUL-terminated bytes at p (without the NUL), as bytes."

	| view |
	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ None].
	"A view whose size the primitive measures with strlen() -- no copy, and
	nothing freed.  Not a callout to strlen: dlsym on the libssl handle does
	not reach libc's symbols on macOS."
	(aPointer @env0:isKindOf: CByteArray) ifTrue: [ | n |
		"Our own buffer: its size is known, so scan it rather than trust a NUL."
		n := 0.
		[n @env0:< aPointer @env0:size and: [(aPointer @env0:uint8At: n) @env0:~= 0]]
			@env0:whileTrue: [n := n @env0:+ 1].
		"byteArrayFrom:numBytes: refuses 0 (``number of bytes argument must be
		 > 0''), and an empty C string is common: a PSK hint nobody set."
		n @env0:= 0 ifTrue: [^ ByteArray @env0:new].
		^ aPointer @env0:byteArrayFrom: 0 numBytes: n].
	view := CByteArray @env0:fromCharStar: aPointer.
	view @env0:size @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ view @env0:byteArrayFrom: 0 numBytes: view @env0:size

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> from_bytes: someBytes [
	"from_bytes(b) -- a C copy of b (a str is copied UTF-8 encoded), held by
	the caller for as long as C may read it."

	| b |
	b := (self @env0:class) @env0:_bytesOf: someBytes.
	b @env0:ifNil: [^ TypeError ___signal___: 'from_bytes() needs bytes or str'].
	^ CByteArray @env0:withAll: b

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> library_path [
	"library_path() -- the OpenSSL file this session loaded, or None."

	^ self ___none___: (((self @env0:class) @env0:_state) @env0:ifNil: [nil] ifNotNil: [:st | st @env0:at: 1])

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> malloc: aSize [
	"malloc(n) -- n zeroed bytes of C memory, freed when unreferenced."

	| ba |
	ba := CByteArray @env0:gcMalloc: (aSize @env0:max: 1).
	0 @env0:to: (aSize @env0:max: 1) @env0:- 1 do: [:i | ba @env0:uint8At: i put: 0].
	^ ba

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> read_int: aPointer _: anOffset _: aSize _: isSigned [
	"read_int(p, offset, size, signed) -- a size-byte (1, 2, 4 or 8) integer."

	| v |
	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ ValueError ___signal___: 'read_int() from a NULL pointer'].
	v := (self @env0:class) @env0:_view: aPointer size: anOffset @env0:+ aSize.
	aSize @env0:= 1 ifTrue: [^ isSigned == true ifTrue: [v @env0:int8At: anOffset] ifFalse: [v @env0:uint8At: anOffset]].
	aSize @env0:= 2 ifTrue: [^ isSigned == true ifTrue: [v @env0:int16At: anOffset] ifFalse: [v @env0:uint16At: anOffset]].
	aSize @env0:= 4 ifTrue: [^ isSigned == true ifTrue: [v @env0:int32At: anOffset] ifFalse: [v @env0:uint32At: anOffset]].
	aSize @env0:= 8 ifTrue: [^ isSigned == true ifTrue: [v @env0:int64At: anOffset] ifFalse: [v @env0:uint64At: anOffset]].
	^ ValueError ___signal___: 'read_int() size must be 1, 2, 4 or 8'

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> read_ptr: aPointer _: anOffset [
	"read_ptr(p, offset) -- the pointer stored at p+offset, None if NULL."

	| p |
	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ ValueError ___signal___: 'read_ptr() from a NULL pointer'].
	p := ((self @env0:class) @env0:_view: aPointer size: anOffset @env0:+ 8)
		@env0:pointerAt: anOffset resultClass: CPointer.
	^ (p @env0:== nil or: [p @env0:memoryAddress @env0:= 0]) ifTrue: [None] ifFalse: [p]

]

{ #category : 'Grail-Built-in Functions' }
_grail_openssl >> read: aPointer _: anOffset _: aSize [
	"read(p, offset, n) -- the n bytes at p+offset, as bytes."

	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ ValueError ___signal___: 'read() from a NULL pointer'].
	aSize @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ ((self @env0:class) @env0:_view: aPointer size: anOffset @env0:+ aSize)
		@env0:byteArrayFrom: anOffset numBytes: aSize

]
