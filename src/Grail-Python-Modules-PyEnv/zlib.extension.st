Extension { #name : 'zlib' }

{ #category : 'Grail-Private' }
zlib class >> _asBytesArg: data [
	"Coerce a bytes-like argument to ByteArray; reject str like CPython.
	Class side so ZlibDecompress shares the one coercion."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'a bytes-like object is required, not ''str'''].
	^ data @env0:asByteArray

]

{ #category : 'Grail-Private' }
zlib class >> _libzCallouts [
	"CCallout handles wrap per-process C state - cache them in
	SessionTemps so each fresh gem rebuilds them on first use.
	CLASS side so ZlibDecompress shares the one cache; the instance-side
	_callouts below just forwards.

	#zlibVersion holds the CPointer answered by zlibVersion(), not a
	callout: inflateInit2_ takes the version STRING and checks its major
	digit, and handing it libz's own constant is more honest than
	hardcoding '1.x' here.

	The key is VERSIONED and was bumped (v2 -> v3) when the deflate half was
	added: a session that cached the old dictionary would otherwise answer
	nil for #deflate for the rest of its life."

	| d lib libName |
	d := SessionTemps @env0:current @env0:at: #Grail_zlib_callouts_v3 otherwise: nil.
	d == nil ifTrue: [
		"libz lives at a different path/extension per OS; pass a bare soname
		and let the loader resolve it (avoids Linux multiarch dir differences).
		libz.so.1 is the runtime soname from zlib1g - present without -dev."
		libName := (System @env0:gemVersionAt: #osName) @env0:= 'Darwin'
			ifTrue: ['libz.dylib']
			ifFalse: ['libz.so.1'].
		lib := CLibrary @env0:named: libName.
		d := KeyValueDictionary @env0:new.
		d @env0:at: #compressBound put: (CCallout @env0:library: lib name: 'compressBound' result: #uint64 args: #(#'uint64')).
		d @env0:at: #compress2 put: (CCallout @env0:library: lib name: 'compress2' result: #int32 args: #(#'ptr' #'ptr' #'ptr' #'uint64' #'int32')).
		d @env0:at: #uncompress put: (CCallout @env0:library: lib name: 'uncompress' result: #int32 args: #(#'ptr' #'ptr' #'ptr' #'uint64')).
		d @env0:at: #crc32 put: (CCallout @env0:library: lib name: 'crc32' result: #uint64 args: #(#'uint64' #'ptr' #'uint32')).
		d @env0:at: #adler32 put: (CCallout @env0:library: lib name: 'adler32' result: #uint64 args: #(#'uint64' #'ptr' #'uint32')).
		d @env0:at: #inflateInit2_ put: (CCallout @env0:library: lib name: 'inflateInit2_' result: #int32 args: #(#'ptr' #'int32' #'ptr' #'int32')).
		d @env0:at: #inflate put: (CCallout @env0:library: lib name: 'inflate' result: #int32 args: #(#'ptr' #'int32')).
		d @env0:at: #inflateEnd put: (CCallout @env0:library: lib name: 'inflateEnd' result: #int32 args: #(#'ptr')).
		d @env0:at: #deflateInit2_ put: (CCallout @env0:library: lib name: 'deflateInit2_' result: #int32
			args: #(#'ptr' #'int32' #'int32' #'int32' #'int32' #'int32' #'ptr' #'int32')).
		d @env0:at: #deflate put: (CCallout @env0:library: lib name: 'deflate' result: #int32 args: #(#'ptr' #'int32')).
		d @env0:at: #deflateEnd put: (CCallout @env0:library: lib name: 'deflateEnd' result: #int32 args: #(#'ptr')).
		d @env0:at: #zlibVersion put:
			((CCallout @env0:library: lib name: 'zlibVersion' result: #'ptr' args: #()) @env0:callWith: #()).
		SessionTemps @env0:current @env0:at: #Grail_zlib_callouts_v3 put: d].
	^ d

]

{ #category : 'Grail-Private' }
zlib class >> _streamSize [
	"sizeof(z_stream) on LP64 -- Linux x86_64 and Darwin arm64 alike.  libz is
	told it (the stream_size argument of both init calls) and checks it."

	^ 112

]

{ #category : 'Grail-Private' }
zlib class >> _zeroedStream [
	"A z_stream with every field zero.  zalloc / zfree / opaque are read by the
	init call, and NULL there means libz's own allocator.  Shared by
	ZlibDecompress and ZlibCompress, which drive the same struct in the two
	directions."

	| stream |

	stream := CByteArray @env0:gcMalloc: self _streamSize.
	0 @env0:to: self _streamSize @env0:// 8 @env0:- 1 do: [:word |
		stream @env0:int64At: word @env0:* 8 put: 0].
	^ stream

]

{ #category : 'Grail-Checksums' }
zlib >> _adler32: positional kw: kwargs [
	| data value |
	data := positional @env0:at: 1.
	value := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [1].
	^ self adler32: data _: value

]

{ #category : 'Grail-Streaming' }
zlib >> _argumentAt: anIndex named: aName from: positional kw: kwargs ifAbsent: aDefault [

	positional @env0:size @env0:>= anIndex ifTrue: [^ positional @env0:at: anIndex].
	kwargs ifNil: [^ aDefault].
	^ kwargs @env0:at: aName ifAbsent: [aDefault]

]

{ #category : 'Grail-Private' }
zlib >> _asBytes: data [
	"Coerce a bytes-like argument to ByteArray; reject str like CPython."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'a bytes-like object is required, not ''str'''].
	^ data @env0:asByteArray

]

{ #category : 'Grail-Private' }
zlib >> _callouts [
	^ zlib _libzCallouts

]

{ #category : 'Grail-Compression' }
zlib >> _compress: positional kw: kwargs [
	| data level |
	data := positional @env0:at: 1.
	level := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [-1]
				ifFalse: [kwargs @env0:at: 'level' ifAbsent: [-1]]].
	^ self compress: data _: level

]

{ #category : 'Grail-Streaming' }
zlib >> _compressobj: positional kw: kwargs [
	"zlib.compressobj(level, method, wbits, memLevel, strategy, zdict), each by
	position or by keyword, with CPython's defaults."

	| arguments |

	arguments := self _compressobjArguments: positional kw: kwargs.
	(arguments @env0:at: 6) == None ifFalse: [
		NotImplementedError ___signal___: ZlibCompress _zdictNotImplementedMessage].
	^ ZlibCompress
		level: (arguments @env0:at: 1)
		method: (arguments @env0:at: 2)
		wbits: (arguments @env0:at: 3)
		memLevel: (arguments @env0:at: 4)
		strategy: (arguments @env0:at: 5)

]

{ #category : 'Grail-Streaming' }
zlib >> _compressobjArguments: positional kw: kwargs [
	"The six compressobj arguments in declaration order: by position, else by
	keyword, else CPython's default."

	| names defaults |

	names := #('level' 'method' 'wbits' 'memLevel' 'strategy' 'zdict').
	defaults := { -1. 8. 15. 8. 0. None }.
	^ (1 @env0:to: names @env0:size) @env0:collect: [:index |
		self
			_argumentAt: index
			named: (names @env0:at: index)
			from: positional
			kw: kwargs
			ifAbsent: (defaults @env0:at: index)]

]

{ #category : 'Grail-Checksums' }
zlib >> _crc32: positional kw: kwargs [
	| data value |
	data := positional @env0:at: 1.
	value := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [0].
	^ self crc32: data _: value

]

{ #category : 'Grail-Compression' }
zlib >> _decompress: positional kw: kwargs [
	| data wbits bufsize |
	data := positional @env0:at: 1.
	wbits := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [15]
				ifFalse: [kwargs @env0:at: 'wbits' ifAbsent: [15]]].
	bufsize := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [16384]
				ifFalse: [kwargs @env0:at: 'bufsize' ifAbsent: [16384]]].
	^ self decompress: data _: wbits _: bufsize

]

{ #category : 'Grail-Streaming' }
zlib >> _decompressobj: positional kw: kwargs [
	| wbits |
	wbits := positional @env0:size @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			kwargs == nil
				ifTrue: [15]
				ifFalse: [kwargs @env0:at: 'wbits' ifAbsent: [15]]].
	^ ZlibDecompress wbits: wbits

]

{ #category : 'Grail-Checksums' }
zlib >> adler32: data [
	^ self adler32: data _: 1

]

{ #category : 'Grail-Checksums' }
zlib >> adler32: data _: value [
	| bytes src result |
	bytes := self _asBytes: data.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	result := ((self _callouts) @env0:at: #adler32)
		@env0:callWith: { value @env0:bitAnd: 16rFFFFFFFF. src. bytes @env0:size }.
	^ result @env0:bitAnd: 16rFFFFFFFF

]

{ #category : 'Grail-Compression' }
zlib >> compress: data [
	^ self compress: data _: -1

]

{ #category : 'Grail-Compression' }
zlib >> compress: data _: level [
	"zlib.compress(data, level=-1) - one-shot zlib-format compression."

	| bytes callouts bound src dest destLen rc n |
	bytes := self _asBytes: data.
	((level @env0:>= -1) @env0:and: [level @env0:<= 9]) ifFalse: [
		ZlibError ___signal___: ('Bad compression level: ' @env0:, level @env0:printString)].
	callouts := self _callouts.
	bound := (callouts @env0:at: #compressBound) @env0:callWith: { bytes @env0:size }.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	dest := CByteArray @env0:gcMalloc: bound.
	destLen := CByteArray @env0:gcMalloc: 8.
	destLen @env0:int64At: 0 put: bound.
	rc := (callouts @env0:at: #compress2) @env0:callWith: { dest. destLen. src. bytes @env0:size. level }.
	rc @env0:= 0 ifFalse: [
		ZlibError ___signal___: ('Error ' @env0:, rc @env0:printString @env0:, ' while compressing data')].
	n := destLen @env0:int64At: 0.
	^ dest @env0:byteArrayFrom: 0 numBytes: n

]

{ #category : 'Grail-Built-in Functions' }
zlib >> compressobj [
	^ self _compressobj: { } kw: nil

]

{ #category : 'Grail-Checksums' }
zlib >> crc32: data [
	^ self crc32: data _: 0

]

{ #category : 'Grail-Checksums' }
zlib >> crc32: data _: value [
	| bytes src result |
	bytes := self _asBytes: data.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	result := ((self _callouts) @env0:at: #crc32)
		@env0:callWith: { value @env0:bitAnd: 16rFFFFFFFF. src. bytes @env0:size }.
	^ result @env0:bitAnd: 16rFFFFFFFF

]

{ #category : 'Grail-Compression' }
zlib >> decompress: data [
	^ self decompress: data _: 15 _: 16384

]

{ #category : 'Grail-Compression' }
zlib >> decompress: data _: wbits [
	^ self decompress: data _: wbits _: 16384

]

{ #category : 'Grail-Compression' }
zlib >> decompress: data _: wbits _: bufsize [
	"zlib.decompress(data, wbits=MAX_WBITS, bufsize=DEF_BUF_SIZE).

	Routed through the streaming ZlibDecompress, so every windowBits
	CPython accepts works: 8..15 zlib, -8..-15 RAW DEFLATE (what zip
	entries hold), 24..31 gzip, 40..47 auto-detect.  bufsize is accepted
	and ignored - the inflater grows its own output.

	A stream that never reaches its end marker is truncated; CPython
	reports that as Error -5, so we do too."

	| d out rest |
	d := ZlibDecompress wbits: wbits.
	out := d decompress: (zlib _asBytesArg: data).
	rest := d flush.
	rest @env0:isEmpty ifFalse: [out := out @env0:, rest].
	d eof ifFalse: [
		ZlibError ___signal___:
			'Error -5 while decompressing data: incomplete or truncated stream'].
	^ out

]

{ #category : 'Grail-Built-in Functions' }
zlib >> decompressobj [
	^ ZlibDecompress wbits: 15

]

{ #category : 'Grail-Streaming' }
zlib >> decompressobj: wbits [
	^ ZlibDecompress wbits: wbits

]

{ #category : 'Grail-Initialization' }
zlib >> initialize [
	"Constants mirror CPython's zlib module.  ``error'' is the module's
	exception class (a real Smalltalk exception, so it is catchable
	from both Python and Smalltalk)."

	self @env0:at: #error put: ZlibError.
	self @env0:at: #MAX_WBITS put: 15.
	self @env0:at: #DEFLATED put: 8.
	self @env0:at: #DEF_BUF_SIZE put: 16384.
	self @env0:at: #DEF_MEM_LEVEL put: 8.
	self @env0:at: #Z_DEFAULT_COMPRESSION put: -1.
	self @env0:at: #Z_NO_COMPRESSION put: 0.
	self @env0:at: #Z_BEST_SPEED put: 1.
	self @env0:at: #Z_BEST_COMPRESSION put: 9.
	self @env0:at: #Z_DEFAULT_STRATEGY put: 0.
	self @env0:at: #Z_FILTERED put: 1.
	self @env0:at: #Z_HUFFMAN_ONLY put: 2.
	self @env0:at: #Z_RLE put: 3.
	self @env0:at: #Z_FIXED put: 4.
	self @env0:at: #Z_NO_FLUSH put: 0.
	self @env0:at: #Z_PARTIAL_FLUSH put: 1.
	self @env0:at: #Z_SYNC_FLUSH put: 2.
	self @env0:at: #Z_FULL_FLUSH put: 3.
	self @env0:at: #Z_FINISH put: 4.
	self @env0:at: #Z_BLOCK put: 5

]
