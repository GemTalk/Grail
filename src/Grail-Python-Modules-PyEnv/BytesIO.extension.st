Extension { #name : 'BytesIO' }

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___integerExpectedMessageFor: anObject [
	"readlines() takes its hint as an int or None only, and refuses anything
	else in these words (Modules/_io/bytesio.c:605)."

	^ 'integer argument expected, got ''' @env0:, (bytes ___pyTypeNameOf___: anObject) @env0:, ''''

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___invalidWhenceMessageFor: aWhence [
	"Modules/_io/bytesio.c:799."

	^ 'invalid whence (' @env0:, aWhence @env0:printString @env0:, ', should be 0, 1 or 2)'

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___negativeSeekMessageFor: aPosition [
	"An absolute seek before the start (Modules/_io/bytesio.c:774)."

	^ 'negative seek value ' @env0:, aPosition @env0:printString

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___negativeSizeMessageFor: aSize [
	"Modules/_io/bytesio.c:708."

	^ 'negative size value ' @env0:, aSize @env0:printString

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___negativeStatePositionMessage [
	"Modules/_io/bytesio.c:990."

	^ 'position value cannot be negative'

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___readWriteBufferMessageFor: anObject [
	"readinto() refuses a buffer it cannot write into in these words, as
	Argument Clinic's ``w*'' conversion does for a sole argument."

	^ 'readinto() argument must be read-write bytes-like object, not '
		@env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___stateDictionaryMessageFor: anObject [
	"Modules/_io/bytesio.c:1000."

	^ 'third item of state should be a dict, got a ' @env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___stateMessageFor: aState [
	"__setstate__ takes a tuple of at least three items, and names the
	stream's type and the state's in refusing anything else
	(Modules/_io/bytesio.c:958)."

	^ (self == BytesIO ifTrue: ['_io.BytesIO'] ifFalse: [self @env1:__name__])
		@env0:, '.__setstate__ argument should be 3-tuple, got '
		@env0:, (bytes ___pyTypeNameOf___: aState)

]

{ #category : 'Grail-Error Messages' }
BytesIO class >> ___statePositionMessageFor: anObject [
	"Modules/_io/bytesio.c:981."

	^ 'second item of state must be an integer, not ' @env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Introspection' }
BytesIO class >> __module__ [

	"CPython's io classes come from the C accelerator, _io.  Grail's had no
	__module__ at all, so test.support.check__all__ -- which asks it of every
	name a module holds -- counted plistlib's imported BytesIO as plistlib's
	own public API (test_plistlib test__all__)."

	^ '_io'

]

{ #category : 'Grail-Initialization' }
BytesIO class >> __new__ [
	"An empty, open stream (bytesio_new)."

	| stream |
	stream := self @env0:new.
	stream @env0:dynamicInstVarAt: #_buffer put: ByteArray @env0:new.
	stream @env0:dynamicInstVarAt: #_pos put: 0.
	stream @env0:dynamicInstVarAt: #_closed put: false.
	^ stream

]

{ #category : 'Grail-Initialization' }
BytesIO class >> __new__: initial [
	"BytesIO(initial_bytes): a stream over a copy of the bytes of any buffer,
	or an empty one for None (bytesio_new, then _io_BytesIO___init___impl).
	A str, a list or an int is refused as no buffer, where it used to die on
	an uncatchable #asByteArray.

	``BytesIO.__new__(cls)'' -- how pickle and copy rebuild an instance --
	arrives here with the CLASS as the value.  CPython's bytesio_new ignores
	its arguments and allocates cls, so this does too: a class is never a
	buffer.  Object >> ___allocateInstance___:kw: builds a Python subclass's
	instance through here as well."

	| stream |
	((initial @env0:isKindOf: Behavior) and: [initial == self or: [initial @env0:inheritsFrom: self]])
		ifTrue: [^ initial __new__].
	stream := self __new__.
	stream ___startOver: initial.
	^ stream

]

{ #category : 'Grail-Initialization' }
BytesIO class >> _new: positional kw: keywords [
	"BytesIO(*args, **kwargs) for the calls the fixed-arity forms do not take
	-- ``BytesIO(initial_bytes=b)'', and the ones Argument Clinic refuses."

	| stream |
	stream := self __new__.
	stream ___init__: positional kw: keywords.
	^ stream

]

{ #category : 'Grail-Private' }
BytesIO >> ___capacityOf: aBuffer [
	"How many bytes the read-write buffer aBuffer holds -- a bytearray, a
	writable contiguous memoryview, or an array.array -- refusing anything
	else as readinto()'s argument, a read-only bytes or view among them."

	| refusal |
	refusal := [^ TypeError ___signal___: (self @env0:class ___readWriteBufferMessageFor: aBuffer)].
	(aBuffer isKindOf: bytearray) ifTrue: [^ aBuffer @env0:size].
	(aBuffer isKindOf: memoryview) ifTrue: [
		(((aBuffer @env0:dynamicInstVarAt: #'readonly') @env0:= true)
			or: [aBuffer ___isContiguous___ @env0:not]) ifTrue: [^ refusal @env0:value].
		^ aBuffer @env0:dynamicInstVarAt: #'nbytes'].
	(aBuffer ___respondsTo___: #'_grail_set_byte:_:') ifTrue: [
		^ (ByteArray ___bytesOfBuffer___: aBuffer) @env0:size].
	^ refusal @env0:value

]

{ #category : 'Grail-Private' }
BytesIO >> ___hintFrom: aHint [
	"readlines()'s hint: -1 for None, an int as itself, and nothing else --
	not even an __index__ object, which read() takes (bytesio.c:597-607)."

	(aHint == nil or: [aHint == None]) ifTrue: [^ -1].
	((aHint isKindOf: Integer) or: [aHint isKindOf: Boolean]) ifTrue: [^ aHint ___asIndex___].
	^ TypeError ___signal___: (self @env0:class ___integerExpectedMessageFor: aHint)

]

{ #category : 'Grail-Initialization' }
BytesIO >> ___init__: positional kw: keywords [
	"BytesIO.__init__(self, initial_bytes=b'') -- which starts a live stream
	over (_io_BytesIO___init___impl), bound and refused as Argument Clinic
	binds it."

	| arguments |
	arguments := TypeError @env0:___argumentsOf___: (positional @env0:ifNil: [#()])
		keywords: keywords
		named: #('initial_bytes')
		positionalOnly: 0
		required: 0
		for: 'BytesIO'.
	self ___startOver: (arguments @env0:at: 1).
	^ None

]

{ #category : 'Grail-Private' }
BytesIO >> ___ioRead___: n [
	"read(size=-1) - read up to size bytes from the current position."

	| size remaining take result |
	self _checkOpen.
	remaining := (self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:- (self @env0:dynamicInstVarAt: #_pos).
	(n == nil @env0:or: [n == None @env0:or: [n @env0:< 0]]) ifTrue: [
		size := remaining
	] ifFalse: [
		size := n
	].
	take := size @env0:min: remaining.
	take @env0:<= 0 ifTrue: [^ ByteArray @env0:new].
	result := (self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: (self @env0:dynamicInstVarAt: #_pos) @env0:+ 1 to: (self @env0:dynamicInstVarAt: #_pos) @env0:+ take.
	self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ take).
	^ result

]

{ #category : 'Grail-Private' }
BytesIO >> ___ioReadline___: limit [
	"readline(size=-1) - read up to next \\n byte (0x0A)."

	| n start max |
	self _checkOpen.
	n := (self @env0:dynamicInstVarAt: #_buffer) @env0:size.
	(self @env0:dynamicInstVarAt: #_pos) @env0:>= n ifTrue: [^ ByteArray @env0:new].
	start := (self @env0:dynamicInstVarAt: #_pos).
	max := (limit == nil @env0:or: [limit == None @env0:or: [limit @env0:< 0]])
		ifTrue: [n]
		ifFalse: [(start @env0:+ limit) @env0:min: n].
	[(self @env0:dynamicInstVarAt: #_pos) @env0:< max @env0:and: [((self @env0:dynamicInstVarAt: #_buffer) @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ 1) @env0:~= 16r0A]]
		@env0:whileTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ 1)].
	((self @env0:dynamicInstVarAt: #_pos) @env0:< max @env0:and: [((self @env0:dynamicInstVarAt: #_buffer) @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ 1) @env0:= 16r0A]) ifTrue: [
		self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ 1)].
	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: start @env0:+ 1 to: (self @env0:dynamicInstVarAt: #_pos)

]

{ #category : 'Grail-Private' }
BytesIO >> ___ioSeek___: pos whence: whence [
	"seek(pos, whence=0) -- both as ints through __index__, so a float is a
	TypeError; an absolute position before the start and an unknown whence
	are ValueErrors, and a relative one before the start goes to the start
	(_io_BytesIO_seek_impl).  A negative absolute position used to go to
	the start too, and whence -1 named no number."

	| position mode |
	position := pos ___asIndex___.
	mode := whence ___asIndex___.
	self _checkOpen.
	(position @env0:< 0 and: [mode @env0:= 0]) ifTrue: [
		^ ValueError ___signal___: (self @env0:class ___negativeSeekMessageFor: position)].
	mode @env0:= 1
		ifTrue: [position := position @env0:+ (self @env0:dynamicInstVarAt: #_pos)]
		ifFalse: [
			mode @env0:= 2
				ifTrue: [position := position @env0:+ (self @env0:dynamicInstVarAt: #_buffer) @env0:size]
				ifFalse: [
					mode @env0:= 0 ifFalse: [
						^ ValueError ___signal___: (self @env0:class ___invalidWhenceMessageFor: mode)]]].
	position := position @env0:max: 0.
	self @env0:dynamicInstVarAt: #_pos put: position.
	^ position

]

{ #category : 'Grail-Private' }
BytesIO >> ___ioTruncate___: size [
	"truncate(size=None) -- cut the stream to at most size bytes, the current
	position for None, leaving the position where it is
	(_io_BytesIO_truncate_impl).  The size is an int through __index__."

	| newSize |
	self _checkOpen.
	newSize := (size == nil or: [size == None])
		ifTrue: [self @env0:dynamicInstVarAt: #_pos]
		ifFalse: [size ___asIndex___].
	newSize @env0:< 0 ifTrue: [
		^ ValueError ___signal___: (self @env0:class ___negativeSizeMessageFor: newSize)].
	newSize @env0:< (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer
			put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: 1 to: newSize)].
	^ newSize

]

{ #category : 'Grail-Reflection' }
BytesIO >> ___pyHiddenStateNames___ [
	"The dynamic instVars that are Grail's implementation of the stream, not
	attributes of the instance: __getstate__ leaves them out of the
	instance's dict, which holds only what was assigned."

	^ #( #_buffer #_pos #_closed )

]

{ #category : 'Grail-Private' }
BytesIO >> ___startOver: anInitialValue [
	"Empty the stream, then write anInitialValue's bytes and go back to the
	start; None leaves it empty.  What __init__ does, so it does it again on
	a live stream (_io_BytesIO___init___impl)."

	self @env0:dynamicInstVarAt: #_buffer put: ByteArray @env0:new.
	self @env0:dynamicInstVarAt: #_pos put: 0.
	(anInitialValue == nil or: [anInitialValue == None]) ifTrue: [^ self].
	self write: anInitialValue.
	self @env0:dynamicInstVarAt: #_pos put: 0

]

{ #category : 'Grail-Private' }
BytesIO >> ___store: someBytes into: aBuffer [
	"Write someBytes over the start of aBuffer, which ___capacityOf: has
	accepted: in bulk into a bytearray or a view over one, a byte at a time
	into an array.array -- through the hook memoryview writes one with -- or
	into a view over one, through the view's bytes."

	| window |
	someBytes @env0:isEmpty ifTrue: [^ self].
	(aBuffer isKindOf: bytearray) ifTrue: [
		^ aBuffer @env0:replaceFrom: 1 to: someBytes @env0:size with: someBytes startingAt: 1].
	(aBuffer isKindOf: memoryview) ifTrue: [
		window := aBuffer ___writableWindowIfNone: [
			^ self ___store: someBytes intoItemsOf: (aBuffer cast: 'B')].
		^ (window @env0:at: 1)
			@env0:replaceFrom: (window @env0:at: 2) @env0:+ 1
			to: (window @env0:at: 2) @env0:+ someBytes @env0:size
			with: someBytes
			startingAt: 1].
	someBytes @env0:doWithIndex: [:each :index |
		aBuffer _grail_set_byte: index @env0:- 1 _: each]

]

{ #category : 'Grail-Private' }
BytesIO >> ___store: someBytes intoItemsOf: aByteView [
	"Write someBytes over the start of aByteView, a writable 'B' memoryview
	whose memory is no ByteArray, one item at a time."

	someBytes @env0:doWithIndex: [:each :index |
		aByteView __setitem__: index @env0:- 1 _: each]

]

{ #category : 'Grail-Context manager' }
BytesIO >> __enter__ [
	^ self

]

{ #category : 'Grail-Context manager' }
BytesIO >> __exit__: a _: b _: c [
	self close.
	^ false

]

{ #category : 'Grail-Serialization' }
BytesIO >> __getstate__ [
	"(value, position, dict) -- what pickle and copy rebuild a stream from,
	the dict None while no attribute was ever set (bytesio_getstate)."

	self _checkOpen.
	^ tuple @env0:withAll: { self getvalue. self @env0:dynamicInstVarAt: #_pos. super __getstate__ }

]

{ #category : 'Grail-Iter protocol' }
BytesIO >> __iter__ [
	^ self

]

{ #category : 'Grail-Iter protocol' }
BytesIO >> __next__ [
	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [
		StopIteration ___signal___: ''
	].
	^ line

]

{ #category : 'Grail-Serialization' }
BytesIO >> __setstate__: aState [
	"Restore what __getstate__ answered: the stream starts over with the
	value's bytes, at the position, with the dict's attributes added
	(bytesio_setstate_lock_held, whose refusals and their order this keeps)."

	| position attributes |
	((aState isKindOf: Array) and: [aState @env0:size @env0:>= 3]) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___stateMessageFor: aState)].
	self @env0:dynamicInstVarAt: #_buffer put: ByteArray @env0:new.
	self @env0:dynamicInstVarAt: #_pos put: 0.
	self write: (aState @env0:at: 1).
	position := aState @env0:at: 2.
	(position isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___statePositionMessageFor: position)].
	position @env0:< 0 ifTrue: [
		^ ValueError ___signal___: self @env0:class ___negativeStatePositionMessage].
	self @env0:dynamicInstVarAt: #_pos put: position.
	attributes := aState @env0:at: 3.
	attributes == None ifTrue: [^ None].
	(attributes isKindOf: dict) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___stateDictionaryMessageFor: attributes)].
	attributes keys @env0:do: [:name |
		self __setattr__: name _: (attributes __getitem__: name)].
	^ None

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkClosed [
	"IOBase's closed check, which _pyio's wrappers call on the stream they
	wrap: None, or the ValueError for a closed stream."

	self _checkOpen.
	^ None

]

{ #category : 'Grail-Private' }
BytesIO >> _checkOpen [
	"CPython's BytesIO ends this message with a period; its StringIO does not."

	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file.'
	]

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkReadable [
	^ self readable

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkReadable: msg [
	^ self readable

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkSeekable [
	"IOBase's internal capability checks, which _pyio's buffered wrappers call
	on the stream they wrap -- ``io.BufferedRandom(io.BytesIO())'' is how
	test_pickle drives the unpickler's buffering.  A BytesIO has every
	capability, so each check is the closed-stream check and nothing more."

	^ self seekable

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkSeekable: msg [
	^ self seekable

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkWritable [
	^ self writable

]

{ #category : 'Grail-Protocol' }
BytesIO >> _checkWritable: msg [
	^ self writable

]

{ #category : 'Grail-State' }
BytesIO >> close [
	self @env0:dynamicInstVarAt: #_closed put: (true).
	^ None

]

{ #category : 'Grail-State' }
BytesIO >> closed [
	^ (self @env0:dynamicInstVarAt: #_closed)

]

{ #category : 'Grail-Protocol' }
BytesIO >> detach [
	"An in-memory stream has no raw stream to hand over (BufferedIOBase)."

	^ UnsupportedOperation ___signal___: (UnsupportedOperation @env0:___messageFor: 'detach')

]

{ #category : 'Grail-Protocol' }
BytesIO >> fileno [
	"An in-memory stream has no file descriptor (IOBase), open or closed.
	gzip.GzipFile.fileno passes the question on, and test_gzip asks it of a
	file over a BytesIO, which had no fileno at all."

	^ UnsupportedOperation ___signal___: (UnsupportedOperation @env0:___messageFor: 'fileno')

]

{ #category : 'Grail-Writing' }
BytesIO >> flush [
	"flush() on an in-memory stream has nothing to push anywhere, but it is
	part of the IOBase protocol and callers do invoke it -- wave.Wave_write
	flushes the underlying file on close, and test_wave writes into a BytesIO.
	CPython inherits the same no-op from IOBase.  It still raises on a CLOSED
	stream, which is what _checkOpen provides.

	``^ None'' is not decoration: without it the method falls off the end and
	answers SELF, so ``BytesIO().flush()'' handed back the stream where CPython
	answers None.  Harmless until something tests the result -- and a caller
	writing ``if f.flush(): ...'' would have taken the wrong branch on a truthy
	stream."

	self _checkOpen.
	^ None

]

{ #category : 'Grail-State' }
BytesIO >> getbuffer [
	"A WRITABLE memoryview over the stream's own buffer, as CPython's is:
	``.nbytes'' is the stream's size, and ``v[0] = 0x7A'' changes what
	getvalue() answers.  It used to answer a bytes copy, which had no
	``nbytes'' -- Werkzeug's send_file sizes an in-memory file with
	``file.getbuffer().nbytes'', so ``flask.send_file(BytesIO(...))''
	answered 500 (#1637).

	``readonly'' is set by hand because the buffer is a bytes-class
	ByteArray, which memoryview reads as immutable; the stream owns it and
	nothing outside it holds a reference (__new__: copies the initial
	value, and every reader copies out).

	NOT MODELLED: CPython refuses write/truncate/close with BufferError
	while a view is alive.  Liveness there is a refcount, and Grail cannot
	tell a view still in use from a ``getbuffer().nbytes'' already thrown
	away, so refusing would break the common case.  A write that GROWS the
	stream replaces the buffer, leaving an older view on the old bytes --
	the state CPython's BufferError exists to prevent."

	| view |
	self _checkOpen.
	view := memoryview
		___over___: (self @env0:dynamicInstVarAt: #_buffer)
		format: 'B'.
	view @env0:dynamicInstVarAt: #'readonly' put: false.
	^ view

]

{ #category : 'Grail-State' }
BytesIO >> getvalue [
	"The whole stream's bytes, refused once it is closed."

	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copy

]

{ #category : 'Grail-Protocol' }
BytesIO >> isatty [
	"Never a terminal."

	self _checkOpen.
	^ false

]

{ #category : 'Grail-Reading' }
BytesIO >> read [
	^ self ___ioRead___: -1

]

{ #category : 'Grail-Reading' }
BytesIO >> read: n [
	^ self ___ioRead___: (n ___asSizeOr: -1)

]

{ #category : 'Grail-Reading' }
BytesIO >> read1 [
	"read1(size=-1) is read() here: there is no raw stream to read less from."

	^ self ___ioRead___: -1

]

{ #category : 'Grail-Reading' }
BytesIO >> read1: n [
	^ self read: n

]

{ #category : 'Grail-Protocol' }
BytesIO >> readable [
	"See seekable."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Reading' }
BytesIO >> readinto: b [
	"readinto(b) - read as many bytes as the read-write buffer b holds into
	its start and answer how many were read, 0 at or past the end
	(_io_BytesIO_readinto_impl).  pickle's _Unframer reads a protocol-5
	bytearray this way, straight out of its frame.  The buffer is refused
	before the stream is asked anything, as Argument Clinic's ``w*''
	conversion runs first.  The count is in BYTES: an array('i') holds four
	per item, where this used to read one per item."

	| capacity data |
	capacity := self ___capacityOf: b.
	self _checkOpen.
	data := self ___ioRead___: capacity.
	self ___store: data into: b.
	^ data @env0:size

]

{ #category : 'Grail-Reading' }
BytesIO >> readinto1: aBuffer [
	"readinto1(b) is readinto() here, as read1() is read()."

	^ self readinto: aBuffer

]

{ #category : 'Grail-Reading' }
BytesIO >> readline [
	^ self ___ioReadline___: -1

]

{ #category : 'Grail-Reading' }
BytesIO >> readline: limit [
	^ self ___ioReadline___: (limit ___asSizeOr: -1)

]

{ #category : 'Grail-Reading' }
BytesIO >> readlines [
	^ self readlines: None

]

{ #category : 'Grail-Reading' }
BytesIO >> readlines: aHint [
	"readlines(hint=None) -- the lines left, stopping after the one that
	brings their total size to the hint when it is positive
	(_io_BytesIO_readlines_impl)."

	| limit lines line total |
	self _checkOpen.
	limit := self ___hintFrom: aHint.
	lines := list ___new___.
	total := 0.
	[line := self readline.
	line @env0:isEmpty] @env0:whileFalse: [
		lines append: line.
		total := total @env0:+ line @env0:size.
		(limit @env0:> 0 and: [total @env0:>= limit]) ifTrue: [^ lines]].
	^ lines

]

{ #category : 'Grail-Position' }
BytesIO >> seek: pos [
	^ self ___ioSeek___: pos whence: 0

]

{ #category : 'Grail-Position' }
BytesIO >> seek: pos _: whence [
	^ self ___ioSeek___: pos whence: whence

]

{ #category : 'Grail-Protocol' }
BytesIO >> seekable [
	"IOBase''s capability predicates -- see StringIO >> seekable for why a
	missing one is a silently wrong branch rather than a missing
	convenience.  BytesIO raises on a closed stream for all of these,
	flush() included, which is where it parts company with StringIO."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Position' }
BytesIO >> tell [
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_pos)

]

{ #category : 'Grail-Position' }
BytesIO >> truncate [
	^ self ___ioTruncate___: None

]

{ #category : 'Grail-Position' }
BytesIO >> truncate: size [
	^ self ___ioTruncate___: size

]

{ #category : 'Grail-Protocol' }
BytesIO >> writable [
	"See seekable."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Writing' }
BytesIO >> write: data [
	"write(b) -- write the bytes of any buffer at the current position,
	padding with NULs the gap a seek past the end left, and answer how many
	were written (write_bytes_lock_held).  The buffer is read BEFORE the
	closed check, as PyObject_GetBuffer runs first, so an exporter whose
	__buffer__ closes the stream gets the ValueError.  Writing nothing
	changes nothing, even past the end, where an empty write used to pad the
	stream out to the position (test_overseek).  A str or None is refused as
	no buffer, where it used to die on an uncatchable #asByteArray."

	| written position endPosition buffer |
	written := ByteArray ___bytesOfBuffer___: data.
	self _checkOpen.
	written @env0:isEmpty ifTrue: [^ 0].
	position := self @env0:dynamicInstVarAt: #_pos.
	buffer := self @env0:dynamicInstVarAt: #_buffer.
	endPosition := position @env0:+ written @env0:size.
	endPosition @env0:> buffer @env0:size ifTrue: [
		buffer := buffer @env0:, (ByteArray @env0:new: endPosition @env0:- buffer @env0:size).
		self @env0:dynamicInstVarAt: #_buffer put: buffer].
	buffer @env0:replaceFrom: position @env0:+ 1 to: endPosition with: written startingAt: 1.
	self @env0:dynamicInstVarAt: #_pos put: endPosition.
	^ written @env0:size

]

{ #category : 'Grail-Writing' }
BytesIO >> writelines: lines [
	"Write each element of lines in order.  Iterate LAZILY via the Python
	protocol (__iter__/__next__), NOT a Smalltalk #do:: a non-iterable
	argument (None/int) then raises a catchable TypeError instead of a #do:
	MessageNotUnderstood, and a dict yields its KEYS -- matching CPython."

	| it |
	self _checkOpen.
	it := lines __iter__.
	[true] @env0:whileTrue: [ | line |
		line := [it __next__] @env0:on: StopIteration do: [:ex | ^ None].
		self write: line]

]
