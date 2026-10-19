Class {
	#name : 'BufferedIoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BufferedIoTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
BufferedIoTestCase >> reprAt: aKey [
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
BufferedIoTestCase >> setUp [
	probe := self ___loadProbe___: 'buffered_io'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testAbcsAreRealClasses [
	"IOBase / RawIOBase / BufferedIOBase / TextIOBase used to be four
	unrelated Object subclasses.  They are now CPython's, so they subclass
	each other -- which is what isinstance dispatch over a stream depends on."

	self assert: (self reprAt: 'abcs_are_real_classes')
		equals: '[''IOBase'', True, True, True, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testAMultibyteCharacterSplitAcrossFills [
	"The check that a per-chunk decode cannot pass, and the reason the codec
	registry has to hand out an INCREMENTAL decoder: with a 10-byte buffer the
	two bytes of e-acute land in different fills.  Decoding each fill on its
	own either raises on the truncated sequence or replaces it with U+FFFD;
	holding the partial sequence back and resuming is what gets the
	character.

	The SECOND True is the check on the check.  Getting the split to actually
	happen takes care: a bare read() makes TextIOWrapper ask the buffer for
	everything and decode once with final=True, and a small BufferedReader is
	not enough either -- both CPython's C buffered reader and _pyio's bypass
	the buffer for a large read1.  So the raw stream caps what one readinto
	hands back, and the fixture reports whether the cap held.  Without it a
	green line here would describe nothing, which is what the first version of
	this test did: it passed with the incremental logic torn out."

	self assert: (self reprAt: 'a_split_multibyte_character')
		equals: '[True, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testASocketShapedStack [
	"What socket.makefile('rb') builds: a BufferedReader at
	io.DEFAULT_BUFFER_SIZE over a readable, writable, NON-seekable raw
	stream, read a request line at a time.  No socket involved -- the
	buffered layer only ever sees the raw contract, and that is the point."

	self assert: (self reprAt: 'a_socket_shaped_stack')
		equals: '[b''GET /x HTTP/1.1\r\n'', b''Host: h\r\n'', b''\r\n'']'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testBufferedExposeTheirRaw [
	"raw / readable / writable / seekable are delegated, so a buffer over a
	NON-seekable stream reports itself non-seekable -- which is what a socket
	is, and what makes seek-based code fail early rather than wrongly."

	self assert: (self reprAt: 'buffered_expose_their_raw')
		equals: '[True, True, False, False]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testClosingTheBufferClosesTheRaw [
	"Closing the buffer closes what it wraps -- how socket.makefile()'s file
	object releases the socket."

	self assert: (self reprAt: 'closing_the_buffer_closes_the_raw') equals: '[True, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testDetachHandsTheRawBack [
	"detach() is how a caller takes the raw stream away from the buffer."

	self assert: (self reprAt: 'detach_hands_the_raw_back') equals: '[True, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testIobaseGivesASubclassTheStreamProtocol [
	"closed, close, and __iter__-over-readline: the behaviour a subclass of a
	marker class did not inherit.  ``class X(io.RawIOBase)'' is how every raw
	stream in the stdlib is written, so this is the whole value of the ABCs."

	self assert: (self reprAt: 'iobase_protocol')
		equals: '[False, [b''one\n'', b''two\n''], True, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testIobaseIsAContextManager [
	"``with open_stream() as f:'' over a hand-written stream."

	self assert: (self reprAt: 'iobase_context_manager') equals: '[True, False, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testNewlineDecoderHoldsASplitCrlf [
	"io.IncrementalNewlineDecoder is _pyio's, through a type accessor like the
	ABCs above.  doctest imports it by name, so without it ``import doctest''
	failed.  The case only a real one gets right is a CRLF split across two
	decode calls: the CR is held back rather than translated on its own."

	self assert: (self reprAt: 'newline_decoder_holds_a_split_crlf')
		equals: '[''a'', ''\nb\nc'', (''\r'', ''\r\n'')]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testReaderPeekDoesNotConsume [
	"peek() is the reason a BUFFERED reader exists rather than a raw one:
	look ahead, then read the same bytes again."

	self assert: (self reprAt: 'reader_peek_does_not_consume')
		equals: '[b''abc'', b''abc'', b''def'']'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testReaderRead1ReturnsAPrefix [
	"read1() is ``at most one raw read''.  How much that yields is the
	implementation's business; that it is a prefix of the stream is not."

	self assert: (self reprAt: 'reader_read1_returns_a_prefix') equals: '[True, True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testReaderReads [
	"read / read(n) / readline / readlines / iteration."

	self assert: (self reprAt: 'reader_reads')
		equals: '[b''hello world'', b''hello'', b''ab\n'', [b''ab\n'', b''cd\n''], [b''x\n'', b''y\n'']]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testReaderSpansTheBuffer [
	"A line LONGER than the buffer, so the readline refills from the raw
	several times and still answers one whole line.  This is the case a
	hand-rolled buffer gets wrong, and the case http.server hits first."

	self assert: (self reprAt: 'reader_spans_the_buffer')
		equals: '[b''a-very-long-first-line\n'', b''short\n'', True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testReadingAClosedBufferRaises [
	"ValueError, not stale buffered data.  The check that stops it lives in
	the RAW stream, which is why the fixture's raw honours closed the way
	FileIO and socket.SocketIO do."

	self assert: (self reprAt: 'reading_a_closed_buffer_raises') equals: '''ValueError'''.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testRwpairReadsAndWrites [
	"socket.makefile('rwb') is exactly io.BufferedRWPair(raw, raw, n)."

	self assert: (self reprAt: 'rwpair_reads_and_writes')
		equals: '[b''ping\n'', b''pong\n'']'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testTextEncodingResolvesAName [
	"io.text_encoding is what socket.makefile() calls to turn encoding=None
	into a real codec name.  It was ABSENT, and this test is the successor to
	the XFAIL that pinned that.  Only the pass-through is asserted: CPython
	answers a 'locale' sentinel for None and Grail answers 'utf-8' outright,
	since there is no per-process text locale here."

	self assert: (self reprAt: 'text_encoding_is_there')
		equals: '[True, ''latin-1'']'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testTextModeOverABuffer [
	"socket.makefile('r') itself, one layer above a_socket_shaped_stack: a
	TextIOWrapper over a BufferedReader over a non-seekable raw stream.  It
	decodes (the header value is multi-byte UTF-8, asserted as the middle
	True) and it translates the wire's CRLF to '\n'.

	The wrapper here is _pyio's, reached because the first constructor
	argument is a buffer rather than a path -- Grail's own GsFile-backed
	TextIOWrapper is still what open() answers."

	self assert: (self reprAt: 'text_over_a_buffer')
		equals: '[''GET /x HTTP/1.1\n'', True, ''\n'']'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testUnsupportedOperationIsRaisedNotMissing [
	"fileno() on a stream that has none must raise io.UnsupportedOperation --
	the marker class answered AttributeError, which no caller catches."

	self assert: (self reprAt: 'unsupported_is_raised_not_missing')
		equals: '''UnsupportedOperation'''.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testWriterBuffersUntilFlush [
	"Nothing reaches the raw stream until flush -- the whole point, and the
	behaviour socketserver's wfile depends on."

	self assert: (self reprAt: 'writer_buffers_until_flush')
		equals: '[b'''', b''hello world'']'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testWriterCloseFlushes [
	"close() flushes what is still held.  A writer that dropped its tail on
	close would lose the last chunk of every response."

	self assert: (self reprAt: 'writer_close_flushes') equals: '[b''tail'', True]'.

]

{ #category : 'Grail-Tests' }
BufferedIoTestCase >> testWriterFlushesWhenFull [
	"...and a write past the buffer size does NOT wait for an explicit flush."

	self assert: (self reprAt: 'writer_flushes_when_full') equals: 'True'.

]
