! ------------------- Superclass check
run
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%

! ===============================================================================
! _grail_openssl - a thin FFI onto the OpenSSL GemStone itself loads
! ===============================================================================

expectvalue /Class
doit
NativeModule subclass: '_grail_openssl'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_grail_openssl comment:
'The foreign-function layer under Grail''s ``_ssl'' (src/python/stdlib/_ssl.py).

WHY A BINDING AND NOT GsSecureSocket.  GemStone''s GsSecureSocket is a
blocking, fd-bound TLS socket whose CA store is SESSION-GLOBAL, with no
memory BIOs, ALPN, sessions or pending(), and which reports certificates as
127-byte one-line strings.  CPython''s ``_ssl'' needs every one of those, and
the OpenSSL GemStone ships (libssl-<version>-64, a combined libssl+libcrypto,
OpenSSL 3.5 in 4.0) exports all of them.  So ``_ssl.py'' is a port of
CPython''s _ssl.c written against OpenSSL''s own API, and this module is only
the call gate: it makes the call, converts values at the boundary, and owns
nothing.

THE WHOLE SURFACE:
    call(name, restype, argtypes, *args)   any libssl/libcrypto function
    malloc(n)                              zeroed C memory, freed by GC
    from_bytes(b)                          C copy of a bytes object
    read(p, offset, n)                     n bytes at p+offset
    read_ptr(p, offset)                    the pointer stored at p+offset
    read_int(p, offset, size, signed)      an integer stored at p+offset
    cstring(p)                             the NUL-terminated bytes at p
    address(p)                             p as an int (0 for None)
    library_path()                         which file was loaded

TYPES are CCallout''s, spelled as strings: ptr, int8..int64, uint8..uint64,
bool, double, float, void, char* (a RESULT, answered as bytes) and
const char* (an ARGUMENT: a str is passed UTF-8 encoded, bytes as they are).

VALUES.  A NULL pointer is None in both directions, so Python code tests
``p is None''.  A bytes argument for a ptr parameter is copied into C memory
that lives until the call returns -- enough for every OpenSSL input buffer;
anything OpenSSL KEEPS must be passed as malloc()/from_bytes() memory held by
the caller.

The CLibrary and CCallout handles wrap per-process C state, so, as in zlib,
they live in SessionTemps and are rebuilt in each fresh session.'
%

expectvalue /Class
doit
_grail_openssl category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_grail_openssl removeAllMethods: 0.
_grail_openssl removeAllMethods: 1.
_grail_openssl class removeAllMethods: 0.
_grail_openssl class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
classmethod: _grail_openssl
_libraryPath
	"$GEMSTONE/lib/libssl-<version>-64.<ext>: the one file GemStone's own
	GsSecureSocket loads (DynLibUtlLoadSSL).  Found by listing the directory,
	because <version> is the product's (4.0.0-a2 today) and changes with every
	build.  Loading the same file GemStone loads means the same handle, so the
	two never run two copies of OpenSSL in one gem."

	| dir names |
	dir := (System gemEnvironmentVariable: 'GEMSTONE') , '/lib'.
	names := (GsFile contentsOfDirectory: dir onClient: false) ifNil: [#()].
	names do: [:each | | base |
		base := (each subStrings: '/') last.
		((base indexOfSubCollection: 'libssl-') = 1
			and: [(base indexOfSubCollection: '.dylib') > 0
				or: [(base indexOfSubCollection: '.so') > 0]])
			ifTrue: [^ dir , '/' , base]].
	^ nil
%

category: 'Grail-Private'
classmethod: _grail_openssl
_state
	"{library path. CLibrary. callout cache}, built once per session."

	| st path |
	st := SessionTemps current at: #GrailOpenSslState otherwise: nil.
	st ifNotNil: [^ st].
	path := self _libraryPath.
	path ifNil: [^ nil].
	st := Array with: path with: (CLibrary named: path) with: KeyValueDictionary new.
	SessionTemps current at: #GrailOpenSslState put: st.
	^ st
%

category: 'Grail-Private'
classmethod: _grail_openssl
_typeSymbol: aName
	"A CCallout type from its Python spelling, or nil for an unknown one."

	| s |
	s := aName asString.
	^ (#('ptr' 'int8' 'int16' 'int32' 'int64' 'uint8' 'uint16' 'uint32' 'uint64'
		'bool' 'double' 'float' 'void' 'char*' 'const char*') includes: s)
			ifTrue: [s asSymbol]
			ifFalse: [nil]
%

category: 'Grail-Private'
classmethod: _grail_openssl
_calloutFor: aName result: resType args: argTypes
	"The cached CCallout for (name, result, args).  A ``const char*'' argument
	is declared #ptr: _argument:as: hands every such value over as a
	NUL-terminated CByteArray, which is what lets a Unicode str through at all
	(CCallout's own const char* refuses Unicode16/32)."

	| st key cache co |
	st := self _state.
	cache := st at: 3.
	key := String new.
	key addAll: aName; add: $|; addAll: resType asString.
	argTypes do: [:t | key add: $|; addAll: t asString].
	co := cache at: key otherwise: nil.
	co ifNotNil: [^ co].
	co := CCallout library: (st at: 2) name: aName
		result: resType
		args: (argTypes collect: [:t | t == #'const char*' ifTrue: [#ptr] ifFalse: [t]]).
	cache at: key put: co.
	^ co
%

category: 'Grail-Private'
classmethod: _grail_openssl
_bytesOf: aValue
	"A ByteArray of aValue's bytes: a str as UTF-8, a bytes-like as it is."

	(aValue isKindOf: CharacterCollection) ifTrue: [^ aValue encodeAsUTF8 asByteArray].
	(aValue isKindOf: ByteArray) ifTrue: [^ aValue].
	^ nil
%

category: 'Grail-Private'
classmethod: _grail_openssl
_argument: aValue as: aType
	"aValue converted for a parameter of aType."

	(aType == #ptr or: [aType == #'const char*']) ifTrue: [
		aValue == nil ifTrue: [^ nil].
		((aValue isKindOf: CPointer) or: [aValue isKindOf: CByteArray]) ifTrue: [^ aValue].
		(self _bytesOf: aValue) ifNotNil: [:b |
			^ CByteArray withAll: b nullTerminate: aType == #'const char*'].
		^ nil].
	aType == #bool ifTrue: [^ aValue == true].
	^ aValue
%

category: 'Grail-Private'
classmethod: _grail_openssl
_result: aValue as: aType
	"A callout's answer as Python sees it: NULL is None, a C string is bytes."

	aType == #ptr ifTrue: [
		(aValue == nil or: [aValue memoryAddress = 0]) ifTrue: [^ nil].
		^ aValue].
	aType == #'char*' ifTrue: [
		aValue == nil ifTrue: [^ nil].
		^ aValue asByteArray].
	^ aValue
%

category: 'Grail-Private'
classmethod: _grail_openssl
_view: aPointer size: aSize
	"A CByteArray reading aSize bytes at aPointer, without copying."

	(aPointer isKindOf: CByteArray) ifTrue: [^ aPointer].
	^ CByteArray fromCPointer: aPointer numBytes: aSize
%

set compile_env: 1

category: 'Grail-Built-in Functions'
method: _grail_openssl
_call: positional kw: kwargs
	"call(name, restype, argtypes, *args) -- call a libssl/libcrypto function.
	See the class comment for the type spellings and the value conversions.
	(Spelled _call:kw:, the varargs form Python's ``call(...)'' dispatches to.)"

	| name resType argTypes args co cls st |
	cls := self @env0:class.
	(positional @env0:size @env0:< 3) ifTrue: [
		^ TypeError ___signal___: 'call() takes at least 3 arguments'].
	st := cls @env0:_state.
	st @env0:ifNil: [
		^ OSError ___signal___: 'the OpenSSL library GemStone ships was not found in $GEMSTONE/lib'].
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
	co := cls @env0:_calloutFor: name result: resType args: argTypes.
	^ self ___none___: (cls @env0:_result: (co @env0:callWith: args) as: resType)
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
malloc: aSize
	"malloc(n) -- n zeroed bytes of C memory, freed when unreferenced."

	| ba |
	ba := CByteArray @env0:gcMalloc: (aSize @env0:max: 1).
	0 @env0:to: (aSize @env0:max: 1) @env0:- 1 do: [:i | ba @env0:uint8At: i put: 0].
	^ ba
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
from_bytes: someBytes
	"from_bytes(b) -- a C copy of b (a str is copied UTF-8 encoded), held by
	the caller for as long as C may read it."

	| b |
	b := (self @env0:class) @env0:_bytesOf: someBytes.
	b @env0:ifNil: [^ TypeError ___signal___: 'from_bytes() needs bytes or str'].
	^ CByteArray @env0:withAll: b
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
read: aPointer _: anOffset _: aSize
	"read(p, offset, n) -- the n bytes at p+offset, as bytes."

	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ ValueError ___signal___: 'read() from a NULL pointer'].
	aSize @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ ((self @env0:class) @env0:_view: aPointer size: anOffset @env0:+ aSize)
		@env0:byteArrayFrom: anOffset numBytes: aSize
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
read_ptr: aPointer _: anOffset
	"read_ptr(p, offset) -- the pointer stored at p+offset, None if NULL."

	| p |
	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ ValueError ___signal___: 'read_ptr() from a NULL pointer'].
	p := ((self @env0:class) @env0:_view: aPointer size: anOffset @env0:+ 8)
		@env0:pointerAt: anOffset resultClass: CPointer.
	^ (p @env0:== nil or: [p @env0:memoryAddress @env0:= 0]) ifTrue: [None] ifFalse: [p]
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
read_int: aPointer _: anOffset _: aSize _: isSigned
	"read_int(p, offset, size, signed) -- a size-byte (1, 2, 4 or 8) integer."

	| v |
	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ ValueError ___signal___: 'read_int() from a NULL pointer'].
	v := (self @env0:class) @env0:_view: aPointer size: anOffset @env0:+ aSize.
	aSize @env0:= 1 ifTrue: [^ isSigned == true ifTrue: [v @env0:int8At: anOffset] ifFalse: [v @env0:uint8At: anOffset]].
	aSize @env0:= 2 ifTrue: [^ isSigned == true ifTrue: [v @env0:int16At: anOffset] ifFalse: [v @env0:uint16At: anOffset]].
	aSize @env0:= 4 ifTrue: [^ isSigned == true ifTrue: [v @env0:int32At: anOffset] ifFalse: [v @env0:uint32At: anOffset]].
	aSize @env0:= 8 ifTrue: [^ isSigned == true ifTrue: [v @env0:int64At: anOffset] ifFalse: [v @env0:uint64At: anOffset]].
	^ ValueError ___signal___: 'read_int() size must be 1, 2, 4 or 8'
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
cstring: aPointer
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
		^ aPointer @env0:byteArrayFrom: 0 numBytes: n].
	view := CByteArray @env0:fromCharStar: aPointer.
	^ view @env0:byteArrayFrom: 0 numBytes: view @env0:size
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
address: aPointer
	"address(p) -- p's address as an int, 0 for None: pointer identity."

	(aPointer == None or: [aPointer @env0:== nil]) ifTrue: [^ 0].
	^ aPointer @env0:memoryAddress
%

category: 'Grail-Built-in Functions'
method: _grail_openssl
library_path
	"library_path() -- the OpenSSL file this session loaded, or None."

	^ self ___none___: (((self @env0:class) @env0:_state) @env0:ifNil: [nil] ifNotNil: [:st | st @env0:at: 1])
%

category: 'Grail-Private'
method: _grail_openssl
___none___: aValue
	"aValue, with Smalltalk's nil answered as Python's None."

	aValue @env0:== nil ifTrue: [^ None].
	^ aValue
%

set compile_env: 0
