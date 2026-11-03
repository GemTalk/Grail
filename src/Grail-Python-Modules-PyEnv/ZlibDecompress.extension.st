Extension { #name : 'ZlibDecompress' }

{ #category : 'Grail-Error Messages' }
ZlibDecompress class >> ___errorMessage___: rc while: aPhase stream: strm [
	"CPython's zlib_error: ``Error <rc> <phase>'', then libz's own explanation
	from the stream's ``msg'' field (``incorrect header check'', ``invalid
	block type'', ...) or, when libz left it NULL, the text CPython supplies for
	three codes.  Grail reported the bare first half, so every corrupt stream
	read the same."

	| zmsg |
	zmsg := nil.
	(strm @env0:int64At: 48) @env0:= 0
		ifFalse: [zmsg := strm @env0:stringFromCharStarAt: 48].
	zmsg == nil ifTrue: [
		rc @env0:= -5 ifTrue: [zmsg := 'incomplete or truncated stream'].
		rc @env0:= -2 ifTrue: [zmsg := 'inconsistent stream state'].
		rc @env0:= -3 ifTrue: [zmsg := 'invalid input data']].
	zmsg == nil ifTrue: [^ 'Error ' @env0:, rc @env0:printString @env0:, ' ' @env0:, aPhase].
	^ 'Error ' @env0:, rc @env0:printString @env0:, ' ' @env0:, aPhase @env0:, ': ' @env0:, zmsg

]

{ #category : 'Grail-Error Messages' }
ZlibDecompress class >> _notABufferMessage [

	^ 'zdict argument must support the buffer protocol'

]

{ #category : 'Grail-Private' }
ZlibDecompress class >> _refuseNonBufferDictionary: aDictionary [
	"CPython takes any object that supports the buffer protocol as the zdict and
	refuses anything else before it inflates anything
	(Modules/zlibmodule.c:666)."

	[ByteArray ___bytesOfBuffer___: aDictionary]
		@env0:on: TypeError
		do: [:ex | ex @env0:return: (TypeError ___signal___: self _notABufferMessage)]

]

{ #category : 'Grail-Instance Creation' }
ZlibDecompress class >> wbits: wbits [
	"Answer a fresh inflater for ``wbits'' with no preset dictionary."

	^ self wbits: wbits dictionary: nil

]

{ #category : 'Grail-Instance Creation' }
ZlibDecompress class >> wbits: wbits dictionary: aDictionary [
	"Answer a fresh inflater for ``wbits'' (see _initWbits:dictionary: for the
	accepted ranges) that inflates with aDictionary, any buffer, where the
	stream asks for one -- nil for none."

	| inst |
	aDictionary @env0:isNil ifFalse: [self _refuseNonBufferDictionary: aDictionary].
	inst := self @env0:new.
	inst _initWbits: wbits dictionary: aDictionary.
	^ inst

]

{ #category : 'Grail-Decompression' }
ZlibDecompress >> _decompress: positional kw: kwargs [
	"decompress(data, /, max_length=0), bound as Argument Clinic binds it:
	``decompress(data=...)'' read past the end of the positionals, an
	OffsetError no Python code could catch (test_zlib test_keywords)."

	| arguments |
	arguments := TypeError @env0:___argumentsOf___: positional keywords: kwargs
		named: #('data' 'max_length') positionalOnly: 1 required: 1 for: 'decompress'.
	^ self decompress: (arguments @env0:at: 1) _: ((arguments @env0:at: 2) @env0:ifNil: [0])

]

{ #category : 'Grail-Private' }
ZlibDecompress >> _finish [
	"Hand libz's internal window back.  Idempotent - both flush() and the
	end-of-stream path in _run: call it."

	| strm |
	(self @env0:dynamicInstVarAt: #closed) == true ifTrue: [^ self].
	strm := self @env0:dynamicInstVarAt: #strm.
	((zlib _libzCallouts) @env0:at: #inflateEnd) @env0:callWith: { strm }.
	self @env0:dynamicInstVarAt: #closed put: true

]

{ #category : 'Grail-Decompression' }
ZlibDecompress >> _flush: positional kw: kwargs [

	"flush(length=DEF_BUF_SIZE, /), bound as Argument Clinic binds it: the
	length is positional only, so ``flush(length=5)'' is refused.  It ignored
	its arguments, so ``flush(0)'' -- CPython's ValueError -- was accepted."

	| length |
	length := (TypeError @env0:___argumentsOf___: positional keywords: kwargs
		named: #('length') positionalOnly: 1 required: 0 for: 'flush') @env0:at: 1.
	^ self flush: (length @env0:ifNil: [16384])

]

{ #category : 'Grail-Private' }
ZlibDecompress >> _initWbits: wbits [
	"An inflater with no preset dictionary."

	^ self _initWbits: wbits dictionary: nil

]

{ #category : 'Grail-Private' }
ZlibDecompress >> _initWbits: wbits dictionary: aDictionary [
	"Allocate a zeroed z_stream and inflateInit2_ it.  CPython's accepted
	windowBits: 8..15 zlib, -8..-15 raw deflate, 24..31 gzip,
	40..47 auto-detect zlib-or-gzip.

	A raw deflate stream has no header to ask for its dictionary, so one given
	is set now, as zlib_decompressobj_impl sets it (Modules/zlibmodule.c:687);
	any other stream asks, and _run:flushMode:maxLength: sets it then."

	"LIBZ JUDGES THE WINDOW, as in CPython (zlib_decompressobj_impl): its
	Z_STREAM_ERROR is the ValueError ``Invalid initialization option''.  A
	range check here had refused 0 -- take the window from the zlib header,
	which libz and CPython accept -- and raised zlib.error where CPython raises
	ValueError (test_zlib test_wbits, test_baddecompressobj).  A non-integer is
	CPython's TypeError, not a Float or a String reaching the callout."

	| strm rc callouts window |
	window := wbits ___asIndex___.
	callouts := zlib _libzCallouts.
	strm := zlib _zeroedStream.
	rc := (callouts @env0:at: #inflateInit2_) @env0:callWith:
		{ strm. window. callouts @env0:at: #zlibVersion. zlib _streamSize }.
	rc @env0:= -2 ifTrue: [^ ValueError ___signal___: ZlibCompress _invalidInitializationOptionMessage].
	rc @env0:= -4 ifTrue: [^ MemoryError ___signal___: ZlibCompress _cannotAllocateMessage].
	rc @env0:= 0 ifFalse: [
		ZlibError ___signal___: ('inflateInit2_ failed with ' @env0:, rc @env0:printString)].
	self @env0:dynamicInstVarAt: #strm put: strm.
	self @env0:dynamicInstVarAt: #wbits put: window.
	self @env0:dynamicInstVarAt: #eof put: false.
	self @env0:dynamicInstVarAt: #closed put: false.
	self @env0:dynamicInstVarAt: #unused put: ByteArray @env0:new.
	self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new.
	self @env0:dynamicInstVarAt: #zdict put: aDictionary.
	(aDictionary @env0:notNil @env0:and: [window @env0:< 0]) ifTrue: [self _presetDictionary]

]

{ #category : 'Grail-Private' }
ZlibDecompress >> _join: chunks total: total [
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

]

{ #category : 'Grail-Private' }
ZlibDecompress >> _presetDictionary [
	"inflateSetDictionary with the zdict's bytes as they are now: CPython reads
	the buffer each time it sets it (set_inflate_zdict,
	Modules/zlibmodule.c:625), so a bytearray changed since is seen changed.  A
	dictionary the stream does not match is zlib.error, as there."

	| bytes strm rc |
	bytes := ByteArray ___bytesOfBuffer___: (self @env0:dynamicInstVarAt: #zdict).
	strm := self @env0:dynamicInstVarAt: #strm.
	rc := ((zlib _libzCallouts) @env0:at: #inflateSetDictionary)
		@env0:callWith: { strm. zlib _cBytesOf: bytes. bytes @env0:size }.
	rc @env0:= 0 ifFalse: [
		ZlibError ___signal___: (ZlibDecompress ___errorMessage___: rc while: 'while setting zdict' stream: strm)]

]

{ #category : 'Grail-Private' }
ZlibDecompress >> _run: inBytes flushMode: flushMode maxLength: maxLength [
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
				(rc @env0:= 2 @env0:and: [(self @env0:dynamicInstVarAt: #zdict) @env0:notNil])
					ifTrue: [
						"Z_NEED_DICT, and there is one: set it and inflate on, as CPython's
						loop does (Modules/zlibmodule.c:938)."
						self _presetDictionary]
					ifFalse: [
						rc @env0:= 1
							ifTrue: [
								"Z_STREAM_END"
								self @env0:dynamicInstVarAt: #eof put: true.
								done := true]
							ifFalse: [
								(rc @env0:< 0 @env0:or: [rc @env0:= 2])
									ifTrue: [
										"Z_BUF_ERROR (-5) just means no progress was possible -
										more input is needed.  Everything else is fatal, and so
										is Z_NEED_DICT with no dictionary to give."
										"Z_BUF_ERROR ends the loop only while the buffer has
										room: under Z_FINISH it also means the output did not
										fit, and CPython goes round again for as long as
										avail_out is 0 (Modules/zlibmodule.c:1307-1326).
										Stopping there made flush() answer one buffer's worth
										(test_zlib test_flush_custom_length)."
										rc @env0:= -5
											ifTrue: [availOut @env0:> 0 ifTrue: [done := true]]
											ifFalse: [
												ZlibError ___signal___: (ZlibDecompress
													___errorMessage___: rc
													while: 'while decompressing data'
													stream: strm)]]
									ifFalse: [
										"Room left in the output buffer means libz emitted
										everything it could from the input it has."
										availOut @env0:> 0 ifTrue: [done := true]]]]]].
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

]

{ #category : 'Grail-Decompression' }
ZlibDecompress >> decompress: data [
	^ self decompress: data _: 0

]

{ #category : 'Grail-Decompression' }
ZlibDecompress >> decompress: data _: maxLength [
	"Decompress(data[, max_length]) -- THIS data and nothing else.

	The previous unconsumed_tail is NOT prepended.  This used to prepend it,
	under a comment claiming that matched CPython; it does not.  CPython's
	documented protocol is that the CALLER passes unconsumed_tail back to the
	next call, and every protocol-following caller does -- CPython's own
	zipfile (ZipExtFile._read1) among them.  With the tail prepended here as
	well, each call received it twice, so it grew with every call: reading a
	320 KB zip member in 1000-byte steps exhausted the gem's memory.

	Measured against CPython 3.14 with max_length=100 over 51,200 bytes:
	passing the tail back recovers all of it; feeding empty follow-up calls
	recovers 101 bytes, because the input was never handed back.  flush()
	still processes the stored tail, which is what CPython's flush does."

	"max_length is an index (an __index__ object is converted, not compared as
	itself) and a negative one is CPython's ValueError
	(zlib_Decompress_decompress_impl)."

	| bytes length |
	length := maxLength ___asIndex___.
	length @env0:< 0 ifTrue: [^ ValueError ___signal___: 'max_length must be non-negative'].
	bytes := zlib _asBytesArg: data.
	(self @env0:dynamicInstVarAt: #eof) == true ifTrue: [
		"Past the end of the stream CPython accumulates into unused_data."
		bytes @env0:isEmpty ifFalse: [
			self @env0:dynamicInstVarAt: #unused put:
				((self @env0:dynamicInstVarAt: #unused) @env0:, bytes)].
		^ ByteArray @env0:new].
	self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new.
	^ self _run: bytes flushMode: 0 maxLength: length

]

{ #category : 'Grail-Attributes' }
ZlibDecompress >> eof [
	"True once the compressed stream's end marker has been seen."

	^ self @env0:dynamicInstVarAt: #eof

]

{ #category : 'Grail-Decompression' }
ZlibDecompress >> flush [

	"flush() -- CPython's default length is DEF_BUF_SIZE."

	^ self flush: 16384

]

{ #category : 'Grail-Fixed Arity Forwarders' }
ZlibDecompress >> flush: length [
	"flush([length]) - run the remaining input to completion.  libz's
	window is released afterwards, so the object is spent."

	"A length below one is CPython's ValueError (zlib_Decompress_flush_impl),
	checked before anything else."

	| out tail |
	length ___asIndex___ @env0:<= 0 ifTrue: [^ ValueError ___signal___: 'length must be greater than zero'].
	(self @env0:dynamicInstVarAt: #closed) == true ifTrue: [^ ByteArray @env0:new].
	(self @env0:dynamicInstVarAt: #eof) == true ifTrue: [
		self _finish.
		^ ByteArray @env0:new].
	tail := self @env0:dynamicInstVarAt: #tail.
	self @env0:dynamicInstVarAt: #tail put: ByteArray @env0:new.
	out := self _run: tail flushMode: 4 maxLength: 0.
	self _finish.
	^ out

]

{ #category : 'Grail-Attributes' }
ZlibDecompress >> unconsumed_tail [
	"Input held back because a max_length cap was hit."

	^ self @env0:dynamicInstVarAt: #tail

]

{ #category : 'Grail-Attributes' }
ZlibDecompress >> unused_data [
	"Bytes found after the end of the compressed stream."

	^ self @env0:dynamicInstVarAt: #unused

]
