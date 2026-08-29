! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
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
! ZlibDecompress - the Python ``zlib.Decompress`` streaming inflater
! ===============================================================================

expectvalue /Class
doit
PythonInstance subclass: 'ZlibDecompress'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ZlibDecompress comment:
'The object answered by ``zlib.decompressobj(wbits)`` - a streaming
inflater over a libz ``z_stream``.

Unlike the one-shot ``uncompress()`` path this drives
inflateInit2_/inflate/inflateEnd directly, so it handles every wbits
CPython does: 8..15 zlib, -8..-15 RAW DEFLATE (what every zip entry
holds), 24..31 gzip, 40..47 auto-detect.  ``zlib.decompress`` is
implemented on top of it, so the two share one code path.

State lives in dynamic instVars: #strm is the 112-byte z_stream
CByteArray (its C address is handed to libz, so the CByteArray must
stay reachable for the life of the object), #eof / #unused / #tail
mirror the CPython ``eof`` / ``unused_data`` / ``unconsumed_tail``
attributes, and #closed records that inflateEnd has run.

LIFETIME CAVEAT: libz mallocs its own window/state, which inflateEnd
frees.  We call inflateEnd as soon as the stream ends or flush() is
called; an object abandoned mid-stream leaks that window until the
gem exits.  Grail has no finalizers to hang it on.'
%

expectvalue /Class
doit
ZlibDecompress category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
ZlibDecompress removeAllMethods: 0.
ZlibDecompress removeAllMethods: 1.
ZlibDecompress class removeAllMethods: 0.
ZlibDecompress class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: ZlibDecompress
___pythonValueAttrs___
	"``d.eof`` / ``d.unused_data`` / ``d.unconsumed_tail`` are CPython
	*attributes*, not methods - read them as values, not BoundMethods.
	ENV-0 so the env-0 respondsTo: probe in ___pyAttrLoad___: finds it."

	^ super ___pythonValueAttrs___
		add: #eof;
		add: #unused_data;
		add: #unconsumed_tail;
		yourself
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

DECOMPRESSION is complete.  decompressobj(wbits) answers a
ZlibDecompress driving inflateInit2_/inflate/inflateEnd over a real
z_stream, so every windowBits CPython accepts works: 8..15 zlib,
-8..-15 RAW DEFLATE (what a zip entry holds), 24..31 gzip, 40..47
auto-detect.  decompress(data, wbits, bufsize) is implemented ON TOP
of it, so the one-shot and streaming paths cannot drift apart.

COMPRESSION is still one-shot: compress(data, level) goes through
compress2() in the standard zlib format, and compressobj() raises
NotImplementedError - it needs the matching deflateInit2_ half, which
is also what zipfile/tarfile would need to WRITE archives.

crc32 and adler32 are exposed; ZLIB_VERSION is not.

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

! ===============================================================================
! ZlibDecompress - streaming inflate over a libz z_stream
!
! z_stream field offsets, LP64 (verified: inflateInit2_ answers Z_VERSION_ERROR
! for any stream_size but 112, so the layout below is checked by libz itself):
!    0 next_in (ptr)     8 avail_in (uint32)    16 total_in  (uint64)
!   24 next_out (ptr)   32 avail_out (uint32)   40 total_out (uint64)
!   48 msg (ptr)        56 state (ptr)         ... 112 bytes total
! ===============================================================================

category: 'Grail-Instance Creation'
classmethod: ZlibDecompress
wbits: wbits
	"Answer a fresh inflater for ``wbits'' (see _initWbits: for the
	accepted ranges)."

	| inst |
	inst := self @env0:new.
	inst _initWbits: wbits.
	^ inst
%

category: 'Grail-Private'
method: ZlibDecompress
_initWbits: wbits
	"Allocate a zeroed z_stream and inflateInit2_ it.  CPython's accepted
	windowBits: 8..15 zlib, -8..-15 raw deflate, 24..31 gzip,
	40..47 auto-detect zlib-or-gzip."

	| strm rc callouts ok |
	ok := (wbits @env0:>= 8) @env0:and: [wbits @env0:<= 15].
	ok ifFalse: [ok := (wbits @env0:>= -15) @env0:and: [wbits @env0:<= -8]].
	ok ifFalse: [ok := (wbits @env0:>= 24) @env0:and: [wbits @env0:<= 31]].
	ok ifFalse: [ok := (wbits @env0:>= 40) @env0:and: [wbits @env0:<= 47]].
	ok ifFalse: [
		ZlibError ___signal___: ('Invalid initialization option: ' @env0:, wbits @env0:printString)].
	callouts := zlib _libzCallouts.
	strm := CByteArray @env0:gcMalloc: 112.
	0 @env0:to: 13 do: [:i | strm @env0:int64At: (i @env0:* 8) put: 0].
	rc := (callouts @env0:at: #inflateInit2_) @env0:callWith:
		{ strm. wbits. callouts @env0:at: #zlibVersion. 112 }.
	rc @env0:= 0 ifFalse: [
		ZlibError ___signal___: ('inflateInit2_ failed with ' @env0:, rc @env0:printString)].
	self @env0:dynamicInstVarAt: #strm put: strm.
	self @env0:dynamicInstVarAt: #wbits put: wbits.
	self @env0:dynamicInstVarAt: #eof put: false.
	self @env0:dynamicInstVarAt: #closed put: false.
	self @env0:dynamicInstVarAt: #unused put: ByteArray @env0:new.
	self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new
%

category: 'Grail-Private'
method: ZlibDecompress
_finish
	"Hand libz's internal window back.  Idempotent - both flush() and the
	end-of-stream path in _run: call it."

	| strm |
	(self @env0:dynamicInstVarAt: #closed) == true ifTrue: [^ self].
	strm := self @env0:dynamicInstVarAt: #strm.
	((zlib _libzCallouts) @env0:at: #inflateEnd) @env0:callWith: { strm }.
	self @env0:dynamicInstVarAt: #closed put: true
%

category: 'Grail-Private'
method: ZlibDecompress
_join: chunks total: total
	"Assemble the accumulated output chunks into one ByteArray.  Chunks
	are collected and joined once rather than concatenated in the loop,
	which would be quadratic in the output size."

	| out pos |
	total @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	chunks @env0:size @env0:= 1 ifTrue: [^ chunks @env0:first].
	out := ByteArray @env0:new: total.
	pos := 1.
	chunks @env0:do: [:c |
		out @env0:replaceFrom: pos to: (pos @env0:+ c @env0:size @env0:- 1) with: c startingAt: 1.
		pos := pos @env0:+ c @env0:size].
	^ out
%

category: 'Grail-Private'
method: ZlibDecompress
_run: inBytes flushMode: flushMode maxLength: maxLength
	"Drive inflate() over inBytes until it stops making progress, the
	stream ends, or maxLength output bytes exist (0 = unlimited).
	Answers the produced ByteArray and updates #eof / #unused / #tail."

	| strm inflate src chunks total chunk dst rc produced availIn availOut consumed remaining size done |
	strm := self @env0:dynamicInstVarAt: #strm.
	inflate := (zlib _libzCallouts) @env0:at: #inflate.
	size := inBytes @env0:size.
	"libz tolerates a NULL next_in only while avail_in is 0."
	src := size @env0:= 0 ifTrue: [nil] ifFalse: [CByteArray @env0:withAll: inBytes].
	src == nil
		ifTrue: [strm @env0:int64At: 0 put: 0]
		ifFalse: [strm @env0:pointerAt: 0 put: src].
	strm @env0:uint32At: 8 put: size.
	chunks := OrderedCollection @env0:new.
	total := 0.
	done := false.
	[done] @env0:whileFalse: [
		chunk := 16384.
		maxLength @env0:> 0 ifTrue: [
			(total @env0:+ chunk) @env0:> maxLength ifTrue: [chunk := maxLength @env0:- total]].
		chunk @env0:<= 0
			ifTrue: [done := true]
			ifFalse: [
				dst := CByteArray @env0:gcMalloc: chunk.
				strm @env0:pointerAt: 24 put: dst.
				strm @env0:uint32At: 32 put: chunk.
				rc := inflate @env0:callWith: { strm. flushMode }.
				availOut := strm @env0:uint32At: 32.
				produced := chunk @env0:- availOut.
				produced @env0:> 0 ifTrue: [
					chunks @env0:add: (dst @env0:byteArrayFrom: 0 numBytes: produced).
					total := total @env0:+ produced].
				rc @env0:= 1
					ifTrue: [
						"Z_STREAM_END"
						self @env0:dynamicInstVarAt: #eof put: true.
						done := true]
					ifFalse: [
						rc @env0:< 0
							ifTrue: [
								"Z_BUF_ERROR (-5) just means no progress was possible -
								more input is needed.  Everything else is fatal."
								rc @env0:= -5
									ifTrue: [done := true]
									ifFalse: [
										ZlibError ___signal___: ('Error ' @env0:, rc @env0:printString
											@env0:, ' while decompressing data')]]
							ifFalse: [
								"Room left in the output buffer means libz emitted
								everything it could from the input it has."
								availOut @env0:> 0 ifTrue: [done := true]]]]].
	availIn := strm @env0:uint32At: 8.
	consumed := size @env0:- availIn.
	remaining := availIn @env0:= 0
		ifTrue: [ByteArray @env0:new]
		ifFalse: [inBytes @env0:copyFrom: (consumed @env0:+ 1) to: size].
	(self @env0:dynamicInstVarAt: #eof) == true
		ifTrue: [
			self @env0:dynamicInstVarAt: #unused put:
				((self @env0:dynamicInstVarAt: #unused) @env0:, remaining).
			self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new.
			self _finish]
		ifFalse: [self @env0:dynamicInstVarAt: #tail put: remaining].
	^ self _join: chunks total: total
%

category: 'Grail-Decompression'
method: ZlibDecompress
decompress: data
	^ self decompress: data _: 0
%

category: 'Grail-Decompression'
method: ZlibDecompress
decompress: data _: maxLength
	"Decompress(data[, max_length]).  Any unconsumed_tail left by the
	previous call is prepended, matching CPython."

	| bytes input tail |
	bytes := zlib _asBytesArg: data.
	(self @env0:dynamicInstVarAt: #eof) == true ifTrue: [
		"Past the end of the stream CPython accumulates into unused_data."
		bytes @env0:isEmpty ifFalse: [
			self @env0:dynamicInstVarAt: #unused put:
				((self @env0:dynamicInstVarAt: #unused) @env0:, bytes)].
		^ ByteArray @env0:new].
	tail := self @env0:dynamicInstVarAt: #tail.
	input := tail @env0:isEmpty ifTrue: [bytes] ifFalse: [tail @env0:, bytes].
	self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new.
	^ self _run: input flushMode: 0 maxLength: maxLength
%

category: 'Grail-Decompression'
method: ZlibDecompress
_decompress: positional kw: kwargs
	| data maxLength |
	data := positional @env0:at: 1.
	maxLength := positional @env0:size @env0:>= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			kwargs == nil
				ifTrue: [0]
				ifFalse: [kwargs @env0:at: 'max_length' ifAbsent: [0]]].
	^ self decompress: data _: maxLength
%

category: 'Grail-Decompression'
method: ZlibDecompress
flush
	^ self flush: 0
%

category: 'Grail-Fixed Arity Forwarders'
method: ZlibDecompress
flush: length
	"flush([length]) - run the remaining input to completion.  libz's
	window is released afterwards, so the object is spent."

	| out tail |
	(self @env0:dynamicInstVarAt: #closed) == true ifTrue: [^ ByteArray @env0:new].
	(self @env0:dynamicInstVarAt: #eof) == true ifTrue: [
		self _finish.
		^ ByteArray @env0:new].
	tail := self @env0:dynamicInstVarAt: #tail.
	self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new.
	out := self _run: tail flushMode: 4 maxLength: 0.
	self _finish.
	^ out
%

category: 'Grail-Decompression'
method: ZlibDecompress
_flush: positional kw: kwargs
	^ self flush: 0
%

category: 'Grail-Attributes'
method: ZlibDecompress
eof
	"True once the compressed stream's end marker has been seen."

	^ self @env0:dynamicInstVarAt: #eof
%

category: 'Grail-Attributes'
method: ZlibDecompress
unused_data
	"Bytes found after the end of the compressed stream."

	^ self @env0:dynamicInstVarAt: #unused
%

category: 'Grail-Attributes'
method: ZlibDecompress
unconsumed_tail
	"Input held back because a max_length cap was hit."

	^ self @env0:dynamicInstVarAt: #tail
%

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
classmethod: zlib
_libzCallouts
	"CCallout handles wrap per-process C state - cache them in
	SessionTemps so each fresh gem rebuilds them on first use.
	CLASS side so ZlibDecompress shares the one cache; the instance-side
	_callouts below just forwards.

	#zlibVersion holds the CPointer answered by zlibVersion(), not a
	callout: inflateInit2_ takes the version STRING and checks its major
	digit, and handing it libz's own constant is more honest than
	hardcoding '1.x' here."

	| d lib libName |
	d := SessionTemps @env0:current @env0:at: #Grail_zlib_callouts_v2 otherwise: nil.
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
		d @env0:at: #zlibVersion put:
			((CCallout @env0:library: lib name: 'zlibVersion' result: #'ptr' args: #()) @env0:callWith: #()).
		SessionTemps @env0:current @env0:at: #Grail_zlib_callouts_v2 put: d].
	^ d
%

category: 'Grail-Private'
classmethod: zlib
_asBytesArg: data
	"Coerce a bytes-like argument to ByteArray; reject str like CPython.
	Class side so ZlibDecompress shares the one coercion."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'a bytes-like object is required, not ''str'''].
	^ data @env0:asByteArray
%

category: 'Grail-Private'
method: zlib
_callouts
	^ zlib _libzCallouts
%

category: 'Grail-Private'
method: zlib
_asBytes: data
	"Coerce a bytes-like argument to ByteArray; reject str like CPython."

	(data isKindOf: ByteArray) ifTrue: [^ data].
	(data isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'a bytes-like object is required, not ''str'''].
	^ data @env0:asByteArray
%

category: 'Grail-Compression'
method: zlib
compress: data
	^ self compress: data _: -1
%

category: 'Grail-Compression'
method: zlib
compress: data _: level
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
%

category: 'Grail-Compression'
method: zlib
_compress: positional kw: kwargs
	| data level |
	data := positional @env0:at: 1.
	level := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [-1]
				ifFalse: [kwargs @env0:at: 'level' ifAbsent: [-1]]].
	^ self compress: data _: level
%

category: 'Grail-Compression'
method: zlib
decompress: data
	^ self decompress: data _: 15 _: 16384
%

category: 'Grail-Compression'
method: zlib
decompress: data _: wbits
	^ self decompress: data _: wbits _: 16384
%

category: 'Grail-Compression'
method: zlib
decompress: data _: wbits _: bufsize
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
%

category: 'Grail-Compression'
method: zlib
_decompress: positional kw: kwargs
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
%

category: 'Grail-Checksums'
method: zlib
crc32: data
	^ self crc32: data _: 0
%

category: 'Grail-Checksums'
method: zlib
crc32: data _: value
	| bytes src result |
	bytes := self _asBytes: data.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	result := ((self _callouts) @env0:at: #crc32)
		@env0:callWith: { value @env0:bitAnd: 16rFFFFFFFF. src. bytes @env0:size }.
	^ result @env0:bitAnd: 16rFFFFFFFF
%

category: 'Grail-Checksums'
method: zlib
_crc32: positional kw: kwargs
	| data value |
	data := positional @env0:at: 1.
	value := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [0].
	^ self crc32: data _: value
%

category: 'Grail-Checksums'
method: zlib
adler32: data
	^ self adler32: data _: 1
%

category: 'Grail-Checksums'
method: zlib
adler32: data _: value
	| bytes src result |
	bytes := self _asBytes: data.
	src := bytes @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [CByteArray @env0:withAll: bytes].
	result := ((self _callouts) @env0:at: #adler32)
		@env0:callWith: { value @env0:bitAnd: 16rFFFFFFFF. src. bytes @env0:size }.
	^ result @env0:bitAnd: 16rFFFFFFFF
%

category: 'Grail-Checksums'
method: zlib
_adler32: positional kw: kwargs
	| data value |
	data := positional @env0:at: 1.
	value := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [1].
	^ self adler32: data _: value
%

category: 'Grail-Streaming'
method: zlib
_compressobj: positional kw: kwargs
	NotImplementedError ___signal___:
		'zlib.compressobj() is not implemented in Grail (one-shot compress/decompress only)'
%

category: 'Grail-Streaming'
method: zlib
_decompressobj: positional kw: kwargs
	| wbits |
	wbits := positional @env0:size @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			kwargs == nil
				ifTrue: [15]
				ifFalse: [kwargs @env0:at: 'wbits' ifAbsent: [15]]].
	^ ZlibDecompress wbits: wbits
%

category: 'Grail-Streaming'
method: zlib
compressobj
	^ self _compressobj: { } kw: nil
%

category: 'Grail-Streaming'
method: zlib
decompressobj
	^ ZlibDecompress wbits: 15
%

category: 'Grail-Streaming'
method: zlib
decompressobj: wbits
	^ ZlibDecompress wbits: wbits
%

set compile_env: 0
