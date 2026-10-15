"The foreign-function layer under Grail's ``_ssl' (src/python/stdlib/_ssl.py).

WHY A BINDING AND NOT GsSecureSocket.  GemStone's GsSecureSocket is a
blocking, fd-bound TLS socket whose CA store is SESSION-GLOBAL, with no
memory BIOs, ALPN, sessions or pending(), and which reports certificates as
127-byte one-line strings.  CPython's ``_ssl' needs every one of those, and
the OpenSSL GemStone ships (libssl-<version>-64, a combined libssl+libcrypto,
OpenSSL 3.5 in 4.0) exports all of them.  So ``_ssl.py' is a port of
CPython's _ssl.c written against OpenSSL's own API, and this module is only
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
    callbacks()                            load the callback library; True if it is there
    callbacks_problem()                    why it is not, or None
    cb(name, restype, argtypes, *args)     call() into that library

CALLBACKS.  What OpenSSL calls back (ALPN selection, the message callback,
keylog, PSK) needs a C function pointer, which CCallout cannot make: CCallin
needs native code.  src/c/ssl/grail_ssl.c supplies them, as a plain library
built by install.sh, whose path install.gs records here
(callbackLibraryPath).  Its header says how each callback reaches Python
without Python ever running inside OpenSSL, and why that rules out a user
action.

TYPES are CCallout's, spelled as strings: ptr, int8..int64, uint8..uint64,
bool, double, float, void, char* (a RESULT, answered as bytes) and
const char* (an ARGUMENT: a str is passed UTF-8 encoded, bytes as they are).

VALUES.  A NULL pointer is None in both directions, so Python code tests
``p is None'.  A bytes argument for a ptr parameter is copied into C memory
that lives until the call returns -- enough for every OpenSSL input buffer;
anything OpenSSL KEEPS must be passed as malloc()/from_bytes() memory held by
the caller.

The CLibrary and CCallout handles wrap per-process C state, so, as in zlib,
they live in SessionTemps and are rebuilt in each fresh session."
Class {
	#name : '_grail_openssl',
	#superclass : 'NativeModule',
	#classInstVars : [
		'callbackLibraryPath'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
_grail_openssl class >> _argument: aValue as: aType [
	"aValue converted for a parameter of aType."

	(aType == #ptr or: [aType == #'const char*']) ifTrue: [
		aValue == nil ifTrue: [^ nil].
		((aValue isKindOf: CPointer) or: [aValue isKindOf: CByteArray]) ifTrue: [^ aValue].
		"ALWAYS NUL-terminated, #ptr as well.  OpenSSL takes many C strings as
		 void* -- SSL_ctrl's SSL_CTRL_SET_TLSEXT_HOSTNAME, SSL_CTX_ctrl's groups
		 list -- and reads them with strlen, so an unterminated copy ran on into
		 whatever followed: the SNI name reached the server as
		 'supermessage' plus four stray bytes.  A binary buffer's length always
		 travels in its own argument, so one extra byte never reaches it."
		(self _bytesOf: aValue) ifNotNil: [:b |
			^ CByteArray withAll: b nullTerminate: true].
		^ nil].
	aType == #bool ifTrue: [^ aValue == true].
	^ aValue

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _bytesOf: aValue [
	"A ByteArray of aValue's bytes: a str as UTF-8, a bytes-like as it is."

	(aValue isKindOf: CharacterCollection) ifTrue: [^ aValue encodeAsUTF8 asByteArray].
	(aValue isKindOf: ByteArray) ifTrue: [^ aValue].
	^ nil

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _callbackState [
	"{CLibrary. callout cache} for the callback library, initialised against
	the libssl _state loads, once per session; nil when it is not there, with
	the reason in SessionTemps (_callbacksProblem).  C state, so SessionTemps,
	as for _state."

	| sessionTemps known path ssl lib init problem |
	sessionTemps := SessionTemps current.
	known := sessionTemps at: #GrailOpenSslCallbacks otherwise: nil.
	known ifNotNil: [^ (known isKindOf: Array) ifTrue: [known] ifFalse: [nil]].
	path := callbackLibraryPath.
	ssl := self _state.
	problem := nil.
	(path isNil or: [ssl isNil])
		ifTrue: [problem := 'install.sh did not build it']
		ifFalse: [
			[lib := CLibrary named: path.
			 init := CCallout library: lib name: 'grail_ssl_init' result: #int32 args: #(#ptr).
			 (init callWith: {CByteArray withAll: (ssl at: 1) encodeAsUTF8 asByteArray nullTerminate: true}) = 1
				ifFalse: [
					problem := ((CCallout library: lib name: 'grail_ssl_problem' result: #'char*' args: #())
						callWith: #()) asString]]
				on: Error do: [:e | problem := e messageText asString]].
	problem ifNotNil: [
		sessionTemps at: #GrailOpenSslCallbacks put: problem.
		^ nil].
	known := Array with: path with: lib with: KeyValueDictionary new.
	sessionTemps at: #GrailOpenSslCallbacks put: known.
	^ known

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _calloutFor: aName result: resType args: argTypes [
	"The cached CCallout for (name, result, args).  A ``const char*'' argument
	is declared #ptr: _argument:as: hands every such value over as a
	NUL-terminated CByteArray, which is what lets a Unicode str through at all
	(CCallout's own const char* refuses Unicode16/32)."

	^ self _calloutIn: self _state name: aName result: resType args: argTypes

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _calloutIn: st name: aName result: resType args: argTypes [
	"_calloutFor:result:args: against st, a {path. CLibrary. cache} state:
	libssl's (_state) or the callback library's (_callbackState)."

	| key cache co |
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

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _libraryPath [
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

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _result: aValue as: aType [
	"A callout's answer as Python sees it: NULL is None, a C string is bytes."

	aType == #ptr ifTrue: [
		(aValue == nil or: [aValue memoryAddress = 0]) ifTrue: [^ nil].
		^ aValue].
	aType == #'char*' ifTrue: [
		aValue == nil ifTrue: [^ nil].
		^ aValue asByteArray].
	^ aValue

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _state [
	"{library path. CLibrary. callout cache}, built once per session."

	| st path |
	st := SessionTemps current at: #GrailOpenSslState otherwise: nil.
	st ifNotNil: [^ st].
	path := self _libraryPath.
	path ifNil: [^ nil].
	st := Array with: path with: (CLibrary named: path) with: KeyValueDictionary new.
	SessionTemps current at: #GrailOpenSslState put: st.
	^ st

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _typeSymbol: aName [
	"A CCallout type from its Python spelling, or nil for an unknown one."

	| s |
	s := aName asString.
	^ (#('ptr' 'int8' 'int16' 'int32' 'int64' 'uint8' 'uint16' 'uint32' 'uint64'
		'bool' 'double' 'float' 'void' 'char*' 'const char*') includes: s)
			ifTrue: [s asSymbol]
			ifFalse: [nil]

]

{ #category : 'Grail-Private' }
_grail_openssl class >> _view: aPointer size: aSize [
	"A CByteArray reading aSize bytes at aPointer, without copying."

	(aPointer isKindOf: CByteArray) ifTrue: [^ aPointer].
	^ CByteArray fromCPointer: aPointer numBytes: aSize

]

{ #category : 'Grail-Configuration' }
_grail_openssl class >> callbackLibraryPath [
	"The user action library of OpenSSL callbacks (src/c/ssl), or nil when
	install.sh did not build one."

	^ callbackLibraryPath

]

{ #category : 'Grail-Configuration' }
_grail_openssl class >> callbackLibraryPath: aString [
	callbackLibraryPath := aString

]
