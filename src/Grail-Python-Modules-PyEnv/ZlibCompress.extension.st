Extension { #name : 'ZlibCompress' }

{ #category : 'Grail-Private' }
ZlibCompress class >> _assertInitialized: aResult [
	"deflateInit2_'s answer, mapped the way CPython's zlibmodule maps it."

	aResult @env0:= 0 ifTrue: [^ self].
	aResult @env0:= -2 ifTrue: [^ ValueError ___signal___: self _invalidInitializationOptionMessage].
	aResult @env0:= -4 ifTrue: [^ MemoryError ___signal___: self _cannotAllocateMessage].
	^ ZlibError ___signal___: (self _errorMessageFor: aResult while: 'creating compression object')

]

{ #category : 'Grail-Error Messages' }
ZlibCompress class >> _cannotAllocateMessage [

	^ 'Can''t allocate memory for compression object'

]

{ #category : 'Grail-Constants' }
ZlibCompress class >> _chunkSize [
	"Output is collected 16 KiB at a time, as ZlibDecompress collects it."

	^ 16384

]

{ #category : 'Grail-Private' }
ZlibCompress class >> _deflateStreamLevel: aLevel method: aMethod wbits: aWindowBits memLevel: aMemoryLevel strategy: aStrategy [
	"A zeroed z_stream that deflateInit2_ has accepted."

	| callouts stream result |

	callouts := zlib _libzCallouts.
	stream := zlib _zeroedStream.
	result := (callouts @env0:at: #deflateInit2_) @env0:callWith: {
		stream. aLevel. aMethod. aWindowBits. aMemoryLevel. aStrategy.
		callouts @env0:at: #zlibVersion. zlib _streamSize }.
	self _assertInitialized: result.
	^ stream

]

{ #category : 'Grail-Error Messages' }
ZlibCompress class >> _errorMessageFor: aResult while: aPhase [

	^ 'Error ' @env0:, aResult @env0:printString @env0:, ' while ' @env0:, aPhase

]

{ #category : 'Grail-Constants' }
ZlibCompress class >> _finishMode [

	^ 4

]

{ #category : 'Grail-Error Messages' }
ZlibCompress class >> _inconsistentStreamStateWhile: aPhase [
	"What CPython reports once a finished stream is used again: libz answers
	Z_STREAM_ERROR with no message of its own, and CPython supplies this one."

	^ (self _errorMessageFor: -2 while: aPhase) @env0:, ': inconsistent stream state'

]

{ #category : 'Grail-Error Messages' }
ZlibCompress class >> _invalidInitializationOptionMessage [

	^ 'Invalid initialization option'

]

{ #category : 'Grail-Constants' }
ZlibCompress class >> _noFlushMode [

	^ 0

]

{ #category : 'Grail-Error Messages' }
ZlibCompress class >> _zdictNotImplementedMessage [

	^ 'zlib.compressobj(zdict=...) is not implemented in Grail (deflateSetDictionary is not wired)'

]

{ #category : 'Grail-Instance Creation' }
ZlibCompress class >> level: aLevel method: aMethod wbits: aWindowBits memLevel: aMemoryLevel strategy: aStrategy [
	"The one way to make a compressor.  libz judges every argument itself, so
	the precondition IS deflateInit2_'s answer."

	^ self @env0:new _initializeStream:
		(self
			_deflateStreamLevel: aLevel
			method: aMethod
			wbits: aWindowBits
			memLevel: aMemoryLevel
			strategy: aStrategy)

]

{ #category : 'Grail-Private' }
ZlibCompress >> _assertDeflated: aResult while: aPhase [
	"Z_BUF_ERROR (-5) is not fatal -- see _continuesAfter:mode:stream:."

	(aResult @env0:< 0 and: [aResult @env0:~= -5]) ifTrue: [
		ZlibError ___signal___: (self @env0:class _errorMessageFor: aResult while: aPhase)]

]

{ #category : 'Grail-Private' }
ZlibCompress >> _assertNotFinishedWhile: aPhase [

	(self @env0:dynamicInstVarAt: #finished) ifTrue: [
		ZlibError ___signal___: (self @env0:class _inconsistentStreamStateWhile: aPhase)]

]

{ #category : 'Grail-Compression' }
ZlibCompress >> _compress: positional kw: kwargs [
	"The varargs form of compress(data), for a held-and-called-later method."

	^ self compress: (positional @env0:at: 1)

]

{ #category : 'Grail-Private' }
ZlibCompress >> _continuesAfter: aResult mode: aMode stream: aStream [
	"Z_BUF_ERROR (-5) means no progress was possible, so stop.  Finishing runs
	to Z_STREAM_END (1); any other mode stops once libz leaves room in the
	output buffer, which means it has emitted all it can."

	aResult @env0:= -5 ifTrue: [^ false].
	aMode @env0:= self @env0:class _finishMode ifTrue: [^ aResult @env0:~= 1].
	^ (aStream @env0:uint32At: 32) @env0:= 0

]

{ #category : 'Grail-Private' }
ZlibCompress >> _deflate: someBytes flushMode: aMode while: aPhase [
	"Run deflate() over someBytes until libz has emitted everything it will for
	this mode: to Z_STREAM_END when finishing, otherwise until it stops filling
	the output buffer.  The input CByteArray is held in a temp because libz
	has only its address."

	| stream input output |

	stream := self _stream.
	input := self _point: stream atInput: someBytes.
	output := WriteStream @env0:on: ByteArray @env0:new.
	[self _deflateChunkOf: stream mode: aMode into: output while: aPhase] @env0:whileTrue.
	^ output @env0:contents

]

{ #category : 'Grail-Private' }
ZlibCompress >> _deflateChunkOf: aStream mode: aMode into: anOutput while: aPhase [
	"One deflate() call into a fresh output chunk.  Answers whether another
	call is needed."

	| chunk result produced |

	chunk := CByteArray @env0:gcMalloc: self @env0:class _chunkSize.
	aStream @env0:pointerAt: 24 put: chunk.
	aStream @env0:uint32At: 32 put: self @env0:class _chunkSize.
	result := ((zlib _libzCallouts) @env0:at: #deflate) @env0:callWith: { aStream. aMode }.
	self _assertDeflated: result while: aPhase.
	produced := self @env0:class _chunkSize @env0:- (aStream @env0:uint32At: 32).
	produced @env0:> 0 ifTrue: [
		anOutput @env0:nextPutAll: (chunk @env0:byteArrayFrom: 0 numBytes: produced)].
	^ self _continuesAfter: result mode: aMode stream: aStream

]

{ #category : 'Grail-Private' }
ZlibCompress >> _finish [
	"Hand libz its state back.  The object is spent afterwards, as CPython's is."

	((zlib _libzCallouts) @env0:at: #deflateEnd) @env0:callWith: { self _stream }.
	self @env0:dynamicInstVarAt: #finished put: true

]

{ #category : 'Grail-Compression' }
ZlibCompress >> _flush: positional kw: kwargs [
	"The varargs form of flush([mode])."

	positional @env0:ifEmpty: [^ self flush].
	^ self flush: (positional @env0:at: 1)

]

{ #category : 'Grail-Initialization' }
ZlibCompress >> _initializeStream: aStream [

	self @env0:dynamicInstVarAt: #stream put: aStream.
	self @env0:dynamicInstVarAt: #finished put: false

]

{ #category : 'Grail-Private' }
ZlibCompress >> _point: aStream atInput: someBytes [
	"Aim next_in / avail_in at someBytes, answering the CByteArray that must
	stay alive while libz reads it.  libz accepts a NULL next_in only while
	avail_in is 0."

	| input |

	someBytes @env0:ifEmpty: [
		aStream @env0:int64At: 0 put: 0.
		aStream @env0:uint32At: 8 put: 0.
		^ nil].
	input := CByteArray @env0:withAll: someBytes.
	aStream @env0:pointerAt: 0 put: input.
	aStream @env0:uint32At: 8 put: someBytes @env0:size.
	^ input

]

{ #category : 'Grail-Private' }
ZlibCompress >> _stream [

	^ self @env0:dynamicInstVarAt: #stream

]

{ #category : 'Grail-Compression' }
ZlibCompress >> compress: data [
	"compress(data) -- whatever compressed output the data has produced so far,
	which may be nothing: libz holds input back until it has a block's worth."

	self _assertNotFinishedWhile: 'compressing data'.
	^ self
		_deflate: (zlib _asBytesArg: data)
		flushMode: self @env0:class _noFlushMode
		while: 'compressing data'

]

{ #category : 'Grail-Compression' }
ZlibCompress >> flush [
	"flush() -- finish the stream, which is CPython's default mode."

	^ self flush: self @env0:class _finishMode

]

{ #category : 'Grail-Fixed Arity Forwarders' }
ZlibCompress >> flush: aMode [
	"flush(mode) -- Z_FINISH ends the stream and hands libz its state back; the
	other modes emit what is pending and keep the stream open.  Z_NO_FLUSH is
	a no-op even on a finished stream, so it is tested first, as CPython does."

	| output |

	aMode @env0:= self @env0:class _noFlushMode ifTrue: [^ ByteArray @env0:new].
	self _assertNotFinishedWhile: 'flushing'.
	output := self _deflate: ByteArray @env0:new flushMode: aMode while: 'flushing'.
	aMode @env0:= self @env0:class _finishMode ifTrue: [self _finish].
	^ output

]
