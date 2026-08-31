! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyConsoleStream (the object sys.stdout / sys.stderr answer)
expectvalue /Class
doit
object subclass: 'PyConsoleStream'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyConsoleStream comment:
'The writable stream object ``sys.stdout'' and ``sys.stderr'' answer.

WHY IT EXISTS.  Both were the Python None singleton.  That is invisible for as
long as everything writes with ``print'' -- Grail''s print treats a None
sys.stdout as ``write to the console'' -- and it stops being invisible the
moment vendored CPython source writes the way CPython writes, THROUGH the
stream object.  Two symptoms from the one cause:

  * ``argparse.ArgumentParser.print_help()'' reaches ``_print_message(text,
    _sys.stdout)'', whose body is ``try: file.write(message) except
    (AttributeError, OSError): pass''.  ``None.write'' is an AttributeError, so
    it is SWALLOWED: ``kaggle --help'' rendered its help and printed NOTHING,
    with no error and no exit-code change.  ``parser.error(...)'' lost its
    message the same way while still exiting 2 -- the more dangerous half.
  * ``traceback.print_exc()'' failed LOUDLY on the same thing:
    ``AttributeError: ''NoneType'' object has no attribute ''write''''.

WHERE IT WRITES.  ``write'' forwards to ``builtins >> ___consoleWrite___:'',
which is where print goes today and which already handles the two sinks that
cannot be probed: a GsFile takes BYTES (declared by the embedder in the
SessionTemps #GrailConsole box''s second slot), a WriteStream or a
ClientForwarder takes characters.  So a write through sys.stdout and a print
land in the same place, encoded the same way.

STDOUT AND STDERR GO TO THE SAME PLACE.  ___consoleWrite___: has ONE sink and
draws no out/err distinction, so this class does not invent one: the two
instances differ only in ``name'' (``<stdout>'' / ``<stderr>''), which is what
CPython reports and what a caller printing the stream sees.  Anything wanting a
genuinely separate error channel has to be given one at the ___console___ box,
not here.

PRINT IS UNCHANGED.  ``builtins >> ___printTarget___'' reads sys.stdout at call
time and treats any non-None value as a REDIRECT, so an object there would have
re-routed every print in the corpus through this class''s write.  It instead
RECOGNISES this class and answers nil for it -- the console -- leaving print on
byte-identically the path it was on.  ``warnings >> showwarning'' makes the same
recognition for sys.stderr.  A user redirect (``sys.stdout = io.StringIO()'')
is not an instance of this class and is written through exactly as before.

WHAT IT IS NOT.  isatty() answers false unconditionally.  The tty-ness of the
console belongs to the SINK, and ___consoleWrite___: exists precisely because
the sink cannot be asked anything -- a streaming embedder installs a
ClientForwarder, whose every send (``class'', ``respondsTo:'', ``isNil''
included) is forwarded to a client as an uncatchable GCI error.  fileno()
raises io.UnsupportedOperation for the same reason: there is no descriptor this
side that is known to be the console''s.
'
%

expectvalue /Class
doit
PyConsoleStream category: 'Grail-Console'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PyConsoleStream removeAllMethods.
PyConsoleStream class removeAllMethods.
PyConsoleStream removeAllMethods: 1.
PyConsoleStream class removeAllMethods: 1.
%

set compile_env: 0

category: 'Instance Creation'
classmethod: PyConsoleStream
___named___: aName
	"A console stream reporting ``aName'' as its Python ``name'' -- ''<stdout>''
	or ''<stderr>'', the two names CPython uses.  The name is the ONLY thing
	that distinguishes the two: see the class comment on the single sink."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'_name' put: aName.
	^ inst
%

category: 'Grail-Python Attribute Hook'
classmethod: PyConsoleStream
___pythonValueAttrs___
	"The file-object attributes that are DATA in CPython, not methods.  Without
	this a read of ``sys.stdout.encoding'' answers a BoundMethod wrapping the
	accessor, and ``getattr(sys.stdout, ''encoding'', None) or ''utf-8''''
	(_pyrepl.pager) then picks the BoundMethod.  The callables -- write, flush,
	isatty, fileno, writable, readable, seekable, close -- are deliberately NOT
	here: they must read as bound methods so ``hasattr(f, ''isatty'') and
	f.isatty()'' works."

	^ IdentitySet new
		add: #'name'; add: #'mode'; add: #'encoding'; add: #'errors';
		add: #'closed'; add: #'newlines'; add: #'line_buffering';
		yourself
%

set compile_env: 1

category: 'Grail-Writing'
method: PyConsoleStream
write: data
	"CPython''s TextIOWrapper.write(s): write the text, answer the number of
	CHARACTERS written.  The count is what callers add up -- CPython returns
	len(s), not a byte count -- so it is the string''s size, before any UTF-8
	encoding ___consoleWrite___: may do for a byte-taking sink.

	A non-str argument is a TypeError, as in CPython: ``sys.stdout.write(5)''
	raises rather than stringifying, and a bare send would have been an
	uncatchable MessageNotUnderstood."

	(data @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'write() argument must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: data)].
	(builtins @env0:___instance___) ___consoleWrite___: data.
	^ data @env0:size
%

category: 'Grail-Writing'
method: PyConsoleStream
writelines: lines
	"Write each element in order, with no separator added.  Iterate LAZILY via
	the Python protocol (__iter__/__next__) rather than a Smalltalk #do:, for
	StringIO writelines''s reason: a non-iterable argument then raises a
	catchable TypeError instead of a #do: MessageNotUnderstood."

	| it |
	it := lines __iter__.
	[true] @env0:whileTrue: [ | line |
		line := [it __next__] @env0:on: StopIteration do: [:ex | ^ None].
		self write: line]
%

category: 'Grail-Writing'
method: PyConsoleStream
flush
	"A no-op, and it has to be.  ___consoleWrite___: never sends to the sink --
	a streaming ClientForwarder forwards every send to a client that is not
	ready to answer it -- and a flush would be exactly such a send.  Each write
	is passed to the sink as it is made, so there is nothing buffered here to
	push."

	^ None
%

category: 'Grail-State'
method: PyConsoleStream
close
	"CPython lets you close sys.stdout; there is nothing here to close, and a
	closed console would silence every later print in the session.  A no-op,
	and ``closed'' stays false."

	^ None
%

category: 'Grail-State'
method: PyConsoleStream
closed
	^ false
%

category: 'Grail-State'
method: PyConsoleStream
writable
	^ true
%

category: 'Grail-State'
method: PyConsoleStream
readable
	^ false
%

category: 'Grail-State'
method: PyConsoleStream
seekable
	^ false
%

category: 'Grail-State'
method: PyConsoleStream
isatty
	"False, unconditionally -- see the class comment.  Whether the console is a
	terminal is a property of the SINK, and the sink is the one object here
	that must never be sent anything.  Reporting false is the conservative
	answer: the callers that ask (django''s management colour support, twilio''s
	exception rendering, _pyrepl''s pager) treat it as ``plain text, no ANSI'',
	which is what Grail''s _colorize stub already reports through can_colorize()."

	^ false
%

category: 'Grail-State'
method: PyConsoleStream
fileno
	"io.UnsupportedOperation, CPython''s answer for a stream with no file
	descriptor.  There genuinely is none: the sink may be the Transcript, a
	GsFile, or a ClientForwarder whose descriptor lives in the CLIENT process.
	UnsupportedOperation is an OSError subclass, so ``except OSError'' -- what a
	caller wraps fileno() in -- catches it."

	^ UnsupportedOperation ___signal___: 'fileno'
%

category: 'Grail-State'
method: PyConsoleStream
name
	^ self @env0:dynamicInstVarAt: #'_name'
%

category: 'Grail-State'
method: PyConsoleStream
mode
	"``w'' -- what CPython reports for sys.stdout and sys.stderr."

	^ 'w'
%

category: 'Grail-State'
method: PyConsoleStream
encoding
	"UTF-8.  Not a guess: ___consoleWrite___: encodes as UTF-8 for a sink that
	declares it takes bytes, and hands characters straight to one that takes
	characters."

	^ 'utf-8'
%

category: 'Grail-State'
method: PyConsoleStream
errors
	^ 'strict'
%

category: 'Grail-State'
method: PyConsoleStream
newlines
	^ None
%

category: 'Grail-State'
method: PyConsoleStream
line_buffering
	"True: every write reaches the sink immediately (see flush)."

	^ true
%

category: 'Grail-Context manager'
method: PyConsoleStream
__enter__
	^ self
%

category: 'Grail-Context manager'
method: PyConsoleStream
__exit__: a _: b _: c
	"close() is a no-op, so leaving a ``with sys.stdout'' block does not
	silence the console."

	^ false
%

category: 'Grail-String Representation'
method: PyConsoleStream
__repr__
	"CPython''s shape for the real thing:
	<_io.TextIOWrapper name='<stdout>' mode='w' encoding='utf-8'>"

	^ '<_io.TextIOWrapper name=''' @env0:,
		(self @env0:dynamicInstVarAt: #'_name') @env0:asString @env0:,
		''' mode=''w'' encoding=''utf-8''>'
%

category: 'Grail-String Representation'
method: PyConsoleStream
__str__
	^ self __repr__
%

set compile_env: 0
