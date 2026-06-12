! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ===============================================================================
! ZlibError - the Python ``zlib.error`` exception
! ===============================================================================

expectvalue /Class
doit
Exception subclass: 'ZlibError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ZlibError category: 'Grail-Exceptions'
%

! ===============================================================================
! zlib module - one-shot compress/decompress/checksums over system libz
! ===============================================================================

expectvalue /Class
doit
module subclass: 'zlib'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
zlib comment:
'Python zlib module backed by the system libz via CCallout.

One-shot APIs only: compress(data, level) / decompress(data, wbits,
bufsize) in the standard zlib format (wbits 9..15), plus crc32 and
adler32.  The streaming compressobj()/decompressobj() interfaces, raw
deflate (negative wbits) and gzip framing (wbits > 15) are not
implemented - they need the deflateInit2_/inflateInit2_ z_stream
machinery.  ZLIB_VERSION is not exposed.

The CLibrary/CCallout handles wrap per-process C state, so they are
cached in SessionTemps (never committed) and rebuilt lazily in each
fresh session - the same disease the CPythonShim singleton has with
gcMalloc buffers.'
%

expectvalue /Class
doit
zlib category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
zlib removeAllMethods: 0.
zlib removeAllMethods: 1.
zlib class removeAllMethods: 0.
zlib class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: zlib
initialize
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
%

category: 'Grail-Private'
method: zlib
_callouts
	"CCallout handles wrap per-process C state - cache them in
	SessionTemps so each fresh gem rebuilds them on first use."

	| d lib |
	d := SessionTemps @env0:current @env0:at: #Grail_zlib_callouts otherwise: nil.
	d @env0:== nil ifTrue: [
		lib := CLibrary @env0:named: '/usr/lib/libz.dylib'.
		d := KeyValueDictionary @env0:new.
		d @env0:at: #compressBound put: (CCallout @env0:library: lib name: 'compressBound' result: #uint64 args: #(#'uint64')).
		d @env0:at: #compress2 put: (CCallout @env0:library: lib name: 'compress2' result: #int32 args: #(#'ptr' #'ptr' #'ptr' #'uint64' #'int32')).
		d @env0:at: #uncompress put: (CCallout @env0:library: lib name: 'uncompress' result: #int32 args: #(#'ptr' #'ptr' #'ptr' #'uint64')).
		d @env0:at: #crc32 put: (CCallout @env0:library: lib name: 'crc32' result: #uint64 args: #(#'uint64' #'ptr' #'uint32')).
		d @env0:at: #adler32 put: (CCallout @env0:library: lib name: 'adler32' result: #uint64 args: #(#'uint64' #'ptr' #'uint32')).
		SessionTemps @env0:current @env0:at: #Grail_zlib_callouts put: d].
	^ d
%

category: 'Grail-Private'
method: zlib
_asBytes: data
	"Coerce a bytes-like argument to ByteArray; reject str like CPython."

	(data @env0:isKindOf: ByteArray) ifTrue: [^ data].
	(data @env0:isKindOf: CharacterCollection) ifTrue: [
		TypeError @env1:___signal___: 'a bytes-like object is required, not ''str'''].
	^ data @env0:asByteArray
%

category: 'Grail-Compression'
method: zlib
compress: data
	^ self @env1:compress: data _: -1
%

category: 'Grail-Compression'
method: zlib
compress: data _: level
	"zlib.compress(data, level=-1) - one-shot zlib-format compression."

	| bytes callouts bound src dest destLen rc n |
	bytes := self @env1:_asBytes: data.
	((level @env0:>= -1) @env0:and: [level @env0:<= 9]) ifFalse: [
		ZlibError @env1:___signal___: ('Bad compression level: ' @env0:, level @env0:printString)].
	callouts := self @env1:_callouts.
	bound := (callouts @env0:at: #compressBound) @env0:callWith: { bytes @env0:size }.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	dest := CByteArray @env0:gcMalloc: bound.
	destLen := CByteArray @env0:gcMalloc: 8.
	destLen @env0:int64At: 0 put: bound.
	rc := (callouts @env0:at: #compress2) @env0:callWith: { dest. destLen. src. bytes @env0:size. level }.
	rc @env0:= 0 ifFalse: [
		ZlibError @env1:___signal___: ('Error ' @env0:, rc @env0:printString @env0:, ' while compressing data')].
	n := destLen @env0:int64At: 0.
	^ dest @env0:byteArrayFrom: 0 numBytes: n
%

category: 'Grail-Compression'
method: zlib
_compress: positional kw: kwargs
	| data level |
	data := positional @env0:at: 1.
	level := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs @env0:== nil)
				ifTrue: [-1]
				ifFalse: [kwargs @env0:at: 'level' ifAbsent: [-1]]].
	^ self @env1:compress: data _: level
%

category: 'Grail-Compression'
method: zlib
decompress: data
	^ self @env1:decompress: data _: 15 _: 16384
%

category: 'Grail-Compression'
method: zlib
decompress: data _: wbits
	^ self @env1:decompress: data _: wbits _: 16384
%

category: 'Grail-Compression'
method: zlib
decompress: data _: wbits _: bufsize
	"zlib.decompress(data, wbits=MAX_WBITS, bufsize=DEF_BUF_SIZE).
	Only the standard zlib format (wbits 9..15) is supported - raw
	deflate (negative) and gzip framing (>15) need the z_stream API.

	uncompress() answers Z_BUF_ERROR (-5) both for ''output buffer too
	small'' and for truncated input, so grow the buffer and retry until
	the zlib theoretical max expansion (~1032x) is exceeded - past
	that the stream is genuinely incomplete."

	| bytes callouts src dest destLen rc n cap limit |
	bytes := self @env1:_asBytes: data.
	((wbits @env0:>= 9) @env0:and: [wbits @env0:<= 15]) ifFalse: [
		ZlibError @env1:___signal___: ('Grail zlib only supports wbits 9..15 (zlib format), got ' @env0:, wbits @env0:printString)].
	callouts := self @env1:_callouts.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	cap := bufsize @env0:max: 64.
	limit := ((bytes @env0:size @env0:* 1040) @env0:max: 1048576) @env0:max: cap.
	destLen := CByteArray @env0:gcMalloc: 8.
	[true] @env0:whileTrue: [
		dest := CByteArray @env0:gcMalloc: cap.
		destLen @env0:int64At: 0 put: cap.
		rc := (callouts @env0:at: #uncompress) @env0:callWith: { dest. destLen. src. bytes @env0:size }.
		rc @env0:= 0 ifTrue: [
			n := destLen @env0:int64At: 0.
			"byteArrayFrom:numBytes: rejects a zero count."
			n @env0:= 0 ifTrue: [^ ByteArray @env0:new].
			^ dest @env0:byteArrayFrom: 0 numBytes: n].
		(rc @env0:= -5 @env0:and: [cap @env0:< limit]) ifTrue: [
			cap := (cap @env0:* 4) @env0:min: limit.
		] ifFalse: [
			rc @env0:= -5 ifTrue: [
				ZlibError @env1:___signal___: 'Error -5 while decompressing data: incomplete or truncated stream'].
			ZlibError @env1:___signal___: ('Error ' @env0:, rc @env0:printString @env0:, ' while decompressing data')]]
%

category: 'Grail-Compression'
method: zlib
_decompress: positional kw: kwargs
	| data wbits bufsize |
	data := positional @env0:at: 1.
	wbits := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs @env0:== nil)
				ifTrue: [15]
				ifFalse: [kwargs @env0:at: 'wbits' ifAbsent: [15]]].
	bufsize := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [
			(kwargs @env0:== nil)
				ifTrue: [16384]
				ifFalse: [kwargs @env0:at: 'bufsize' ifAbsent: [16384]]].
	^ self @env1:decompress: data _: wbits _: bufsize
%

category: 'Grail-Checksums'
method: zlib
crc32: data
	^ self @env1:crc32: data _: 0
%

category: 'Grail-Checksums'
method: zlib
crc32: data _: value
	| bytes src result |
	bytes := self @env1:_asBytes: data.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	result := ((self @env1:_callouts) @env0:at: #crc32)
		@env0:callWith: { value @env0:bitAnd: 16rFFFFFFFF. src. bytes @env0:size }.
	^ result @env0:bitAnd: 16rFFFFFFFF
%

category: 'Grail-Checksums'
method: zlib
_crc32: positional kw: kwargs
	| data value |
	data := positional @env0:at: 1.
	value := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [0].
	^ self @env1:crc32: data _: value
%

category: 'Grail-Checksums'
method: zlib
adler32: data
	^ self @env1:adler32: data _: 1
%

category: 'Grail-Checksums'
method: zlib
adler32: data _: value
	| bytes src result |
	bytes := self @env1:_asBytes: data.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	result := ((self @env1:_callouts) @env0:at: #adler32)
		@env0:callWith: { value @env0:bitAnd: 16rFFFFFFFF. src. bytes @env0:size }.
	^ result @env0:bitAnd: 16rFFFFFFFF
%

category: 'Grail-Checksums'
method: zlib
_adler32: positional kw: kwargs
	| data value |
	data := positional @env0:at: 1.
	value := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [1].
	^ self @env1:adler32: data _: value
%

category: 'Grail-Streaming'
method: zlib
_compressobj: positional kw: kwargs
	NotImplementedError @env1:___signal___:
		'zlib.compressobj() is not implemented in Grail (one-shot compress/decompress only)'
%

category: 'Grail-Streaming'
method: zlib
_decompressobj: positional kw: kwargs
	NotImplementedError @env1:___signal___:
		'zlib.decompressobj() is not implemented in Grail (one-shot compress/decompress only)'
%

category: 'Grail-Streaming'
method: zlib
compressobj
	^ self @env1:_compressobj: { } kw: nil
%

category: 'Grail-Streaming'
method: zlib
decompressobj
	^ self @env1:_decompressobj: { } kw: nil
%

set compile_env: 0
