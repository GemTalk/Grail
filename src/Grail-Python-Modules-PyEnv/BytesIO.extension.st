Extension { #name : 'BytesIO' }

{ #category : 'Grail-Initialization' }
BytesIO class >> __new__ [
	^ self __new__: #[] @env0:asByteArray

]

{ #category : 'Grail-Initialization' }
BytesIO class >> __new__: initial [
	"BytesIO([initial]) - bytes buffer seeded with initial."

	| inst bytes |
	bytes := (initial isKindOf: ByteArray)
		ifTrue: [initial @env0:copy]
		ifFalse: [initial @env0:asByteArray].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #_buffer put: bytes.
	inst @env0:dynamicInstVarAt: #_pos put: 0.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	^ inst

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
	self _checkOpen.
	whence @env0:= 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (pos)]
	ifFalse: [whence @env0:= 1 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ pos)]
	ifFalse: [whence @env0:= 2 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:+ pos)]
	ifFalse: [
		ValueError ___signal___: 'whence must be 0, 1, or 2'
	]]].
	(self @env0:dynamicInstVarAt: #_pos) @env0:< 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (0)].
	^ (self @env0:dynamicInstVarAt: #_pos)

]

{ #category : 'Grail-Private' }
BytesIO >> ___ioTruncate___: size [
	self _checkOpen.
	size @env0:< (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: 1 to: size)].
	^ size

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
	^ self ___ioRead___: n

]

{ #category : 'Grail-Protocol' }
BytesIO >> readable [
	"See seekable."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Reading' }
BytesIO >> readinto: b [
	"readinto(b) - read up to len(b) bytes into the writable buffer b and
	answer how many were read.  pickle's _Unframer reads a protocol-5
	bytearray this way, straight out of its frame."

	| data |
	self _checkOpen.
	data := self read: b @env1:__len__.
	1 @env0:to: data @env0:size do: [:i |
		b @env1:__setitem__: i @env0:- 1 _: (data @env0:at: i)].
	^ data @env0:size

]

{ #category : 'Grail-Reading' }
BytesIO >> readline [
	^ self ___ioReadline___: -1

]

{ #category : 'Grail-Reading' }
BytesIO >> readline: limit [
	^ self ___ioReadline___: limit

]

{ #category : 'Grail-Reading' }
BytesIO >> readlines [
	| out line |
	self _checkOpen.
	out := list ___new___.
	[
		line := self readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out append: line].
	^ out

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
	^ self ___ioTruncate___: (self @env0:dynamicInstVarAt: #_pos)

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
	"Overwrite from current position with the given bytes."

	| bytes n endPos |
	self _checkOpen.
	bytes := (data isKindOf: ByteArray)
		ifTrue: [data]
		ifFalse: [data @env0:asByteArray].
	n := bytes @env0:size.
	endPos := (self @env0:dynamicInstVarAt: #_pos) @env0:+ n.
	endPos @env0:> (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:, (ByteArray @env0:new: (endPos @env0:- (self @env0:dynamicInstVarAt: #_buffer) @env0:size)))].
	1 @env0:to: n do: [:i |
		(self @env0:dynamicInstVarAt: #_buffer) @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ i put: (bytes @env0:at: i)
	].
	self @env0:dynamicInstVarAt: #_pos put: (endPos).
	^ n

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
