! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BufferedIoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BufferedIoTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BufferedIoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BufferedIoTestCase
!
! THE PURE-PYTHON io LAYER: the ABCs and the BUFFERED classes, out of CPython's
! own _pyio.
!
! Grail's io is written in Smalltalk (io_module.gs) and supplies the CONCRETE
! streams -- StringIO, BytesIO, FileIO, TextIOWrapper -- over GsFile and
! in-memory collections.  Two layers around them were missing, and both are
! layers a stream is written AGAINST rather than layers anyone reimplements for
! fun:
!
!   * The ABCs.  io.IOBase / RawIOBase / BufferedIOBase / TextIOBase were EMPTY
!     marker classes, by their own comment carrying "no behaviour of their own".
!     So ``class SocketIO(io.RawIOBase)'' -- socket.py's raw stream, and the
!     shape of every raw stream in the stdlib -- inherited no closed, no close,
!     no context manager, no __iter__, no _checkClosed.
!   * The buffered layer.  BufferedReader / BufferedWriter / BufferedRWPair /
!     BufferedRandom did not exist at all.
!
! WHY VENDOR RATHER THAN WRITE IT.  These are ~1000 lines of ordinary Python
! whose semantics are fiddly in exactly the way that does not show up in a
! smoke test: short reads, peek without consuming, a readline whose line spans
! several raw reads, flush-on-full versus flush-on-close, detach.  CPython
! ships that code as _pyio and runs its own io conformance suite against it, so
! taking the file is both smaller and more accurate than a parallel
! implementation would be.  See src/python/stdlib/_pyio.py for the two
! adaptations it needed.
!
! HOW io HANDS THEM OUT -- worth reading before editing io_module.gs.  The
! eight names are unary methods that import _pyio on demand and answer the
! class, in a category OUTSIDE the function-category list in Object >>
! ___pyAttrLoad___.  That list is what decides between PERFORM and wrap-as-a-
! BoundMethod for a module's unary selector, and these must perform.  There is
! deliberately no ``_BufferedReader: positional kw: kwargs'' twin: the varargs
! selector is probed FIRST, so adding one makes every read answer a BoundMethod
! and ``class SocketIO(io.RawIOBase)'' then fails with "cannot subclass a
! non-class base (BoundMethod)" -- naming neither the module nor the cause.
!
! WHAT IS STILL OUT: text mode.  socket.makefile('r') needs io.text_encoding
! and _pyio's TextIOWrapper, and that one wants a real codec registry
! (codecs.lookup(enc).incrementaldecoder) which Grail's codecs stub does not
! have.  Binary makefile -- what http.server and socketserver use -- works.
! The fixture's ``text_encoding_is_absent'' is the documented XFAIL for it.
!
! Fixture: tests/python/buffered_io.py (self-verifying under CPython 3.14.6 --
! 17 checks pass there unchanged, which is what makes them evidence, plus the
! one documented XFAIL).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BufferedIoTestCase removeAllMethods.
BufferedIoTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: BufferedIoTestCase
setUp
	probe := self ___loadProbe___: 'buffered_io'.
%

category: 'Grail-Private'
method: BufferedIoTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: BufferedIoTestCase
reprAt: aKey
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

! ---- the ABCs are a hierarchy, not four markers ------------------------------

category: 'Grail-Tests'
method: BufferedIoTestCase
testAbcsAreRealClasses
	"IOBase / RawIOBase / BufferedIOBase / TextIOBase used to be four
	unrelated Object subclasses.  They are now CPython's, so they subclass
	each other -- which is what isinstance dispatch over a stream depends on."

	self assert: (self reprAt: 'abcs_are_real_classes')
		equals: '[''IOBase'', True, True, True, True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testIobaseGivesASubclassTheStreamProtocol
	"closed, close, and __iter__-over-readline: the behaviour a subclass of a
	marker class did not inherit.  ``class X(io.RawIOBase)'' is how every raw
	stream in the stdlib is written, so this is the whole value of the ABCs."

	self assert: (self reprAt: 'iobase_protocol')
		equals: '[False, [b''one\n'', b''two\n''], True, True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testIobaseIsAContextManager
	"``with open_stream() as f:'' over a hand-written stream."

	self assert: (self reprAt: 'iobase_context_manager') equals: '[True, False, True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testUnsupportedOperationIsRaisedNotMissing
	"fileno() on a stream that has none must raise io.UnsupportedOperation --
	the marker class answered AttributeError, which no caller catches."

	self assert: (self reprAt: 'unsupported_is_raised_not_missing')
		equals: '''UnsupportedOperation'''.
%

! ---- BufferedReader ----------------------------------------------------------

category: 'Grail-Tests'
method: BufferedIoTestCase
testReaderReads
	"read / read(n) / readline / readlines / iteration."

	self assert: (self reprAt: 'reader_reads')
		equals: '[b''hello world'', b''hello'', b''ab\n'', [b''ab\n'', b''cd\n''], [b''x\n'', b''y\n'']]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testReaderPeekDoesNotConsume
	"peek() is the reason a BUFFERED reader exists rather than a raw one:
	look ahead, then read the same bytes again."

	self assert: (self reprAt: 'reader_peek_does_not_consume')
		equals: '[b''abc'', b''abc'', b''def'']'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testReaderSpansTheBuffer
	"A line LONGER than the buffer, so the readline refills from the raw
	several times and still answers one whole line.  This is the case a
	hand-rolled buffer gets wrong, and the case http.server hits first."

	self assert: (self reprAt: 'reader_spans_the_buffer')
		equals: '[b''a-very-long-first-line\n'', b''short\n'', True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testReaderRead1ReturnsAPrefix
	"read1() is ``at most one raw read''.  How much that yields is the
	implementation's business; that it is a prefix of the stream is not."

	self assert: (self reprAt: 'reader_read1_returns_a_prefix') equals: '[True, True]'.
%

! ---- BufferedWriter / BufferedRWPair -----------------------------------------

category: 'Grail-Tests'
method: BufferedIoTestCase
testWriterBuffersUntilFlush
	"Nothing reaches the raw stream until flush -- the whole point, and the
	behaviour socketserver's wfile depends on."

	self assert: (self reprAt: 'writer_buffers_until_flush')
		equals: '[b'''', b''hello world'']'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testWriterFlushesWhenFull
	"...and a write past the buffer size does NOT wait for an explicit flush."

	self assert: (self reprAt: 'writer_flushes_when_full') equals: 'True'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testWriterCloseFlushes
	"close() flushes what is still held.  A writer that dropped its tail on
	close would lose the last chunk of every response."

	self assert: (self reprAt: 'writer_close_flushes') equals: '[b''tail'', True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testRwpairReadsAndWrites
	"socket.makefile('rwb') is exactly io.BufferedRWPair(raw, raw, n)."

	self assert: (self reprAt: 'rwpair_reads_and_writes')
		equals: '[b''ping\n'', b''pong\n'']'.
%

! ---- the raw underneath ------------------------------------------------------

category: 'Grail-Tests'
method: BufferedIoTestCase
testBufferedExposeTheirRaw
	"raw / readable / writable / seekable are delegated, so a buffer over a
	NON-seekable stream reports itself non-seekable -- which is what a socket
	is, and what makes seek-based code fail early rather than wrongly."

	self assert: (self reprAt: 'buffered_expose_their_raw')
		equals: '[True, True, False, False]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testDetachHandsTheRawBack
	"detach() is how a caller takes the raw stream away from the buffer."

	self assert: (self reprAt: 'detach_hands_the_raw_back') equals: '[True, True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testClosingTheBufferClosesTheRaw
	"Closing the buffer closes what it wraps -- how socket.makefile()'s file
	object releases the socket."

	self assert: (self reprAt: 'closing_the_buffer_closes_the_raw') equals: '[True, True]'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testReadingAClosedBufferRaises
	"ValueError, not stale buffered data.  The check that stops it lives in
	the RAW stream, which is why the fixture's raw honours closed the way
	FileIO and socket.SocketIO do."

	self assert: (self reprAt: 'reading_a_closed_buffer_raises') equals: '''ValueError'''.
%

! ---- the shape this was built for -------------------------------------------

category: 'Grail-Tests'
method: BufferedIoTestCase
testASocketShapedStack
	"What socket.makefile('rb') builds: a BufferedReader at
	io.DEFAULT_BUFFER_SIZE over a readable, writable, NON-seekable raw
	stream, read a request line at a time.  No socket involved -- the
	buffered layer only ever sees the raw contract, and that is the point."

	self assert: (self reprAt: 'a_socket_shaped_stack')
		equals: '[b''GET /x HTTP/1.1\r\n'', b''Host: h\r\n'', b''\r\n'']'.
%

category: 'Grail-Tests'
method: BufferedIoTestCase
testTextEncodingIsStillAbsent
	"The DOCUMENTED GAP, pinned so it is a decision rather than a surprise:
	io.text_encoding does not exist, so socket.makefile() in TEXT mode does
	not work.  Closing it needs a codec registry, not more io.  When this
	test starts failing the gap has closed and it should be retired along
	with the fixture's GRAIL_ONLY entry."

	self assert: (self reprAt: 'text_encoding_is_absent') equals: 'False'.
%
