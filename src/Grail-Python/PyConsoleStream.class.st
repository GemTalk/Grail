"The stream objects ``sys.stdout', ``sys.stderr' and ``sys.stdin' answer --
the first two writable, the third readable (see ___isInput___), all three
reading as io.TextIOWrapper to Python code.

WHY IT EXISTS.  Both were the Python None singleton.  That is invisible for as
long as everything writes with ``print' -- Grail's print treats a None
sys.stdout as ``write to the console' -- and it stops being invisible the
moment vendored CPython source writes the way CPython writes, THROUGH the
stream object.  Two symptoms from the one cause:

  * ``argparse.ArgumentParser.print_help()' reaches ``_print_message(text,
    _sys.stdout)', whose body is ``try: file.write(message) except
    (AttributeError, OSError): pass'.  ``None.write' is an AttributeError, so
    it is SWALLOWED: ``kaggle --help' rendered its help and printed NOTHING,
    with no error and no exit-code change.  ``parser.error(...)' lost its
    message the same way while still exiting 2 -- the more dangerous half.
  * ``traceback.print_exc()' failed LOUDLY on the same thing:
    ``AttributeError: 'NoneType' object has no attribute 'write''.

WHERE IT WRITES.  ``write' forwards to ``builtins >> ___consoleWrite___:',
which is where print goes today and which already handles the two sinks that
cannot be probed: a GsFile takes BYTES (declared by the embedder in the
SessionTemps #GrailConsole box's second slot), a WriteStream or a
ClientForwarder takes characters.  So a write through sys.stdout and a print
land in the same place, encoded the same way.

STDOUT AND STDERR GO TO THE SAME PLACE.  ___consoleWrite___: has ONE sink and
draws no out/err distinction, so this class does not invent one: the two
instances differ only in ``name' (``<stdout>' / ``<stderr>'), which is what
CPython reports and what a caller printing the stream sees.  Anything wanting a
genuinely separate error channel has to be given one at the ___console___ box,
not here.

PRINT IS UNCHANGED.  ``builtins >> ___printTarget___' reads sys.stdout at call
time and treats any non-None value as a REDIRECT, so an object there would have
re-routed every print in the corpus through this class's write.  It instead
RECOGNISES this class and answers nil for it -- the console -- leaving print on
byte-identically the path it was on.  ``warnings >> showwarning' makes the same
recognition for sys.stderr.  A user redirect (``sys.stdout = io.StringIO()')
is not an instance of this class and is written through exactly as before.

WHAT IT IS NOT.  isatty() answers false unconditionally.  The tty-ness of the
console belongs to the SINK, and ___consoleWrite___: exists precisely because
the sink cannot be asked anything -- a streaming embedder installs a
ClientForwarder, whose every send (``class', ``respondsTo:', ``isNil'
included) is forwarded to a client as an uncatchable GCI error.  fileno()
raises io.UnsupportedOperation for the same reason: there is no descriptor this
side that is known to be the console's.

"
Class {
	#name : 'PyConsoleStream',
	#superclass : 'object',
	#category : 'Grail-Console'
}

{ #category : 'Instance Creation' }
PyConsoleStream class >> ___named___: aName [
	"A console stream reporting ``aName'' as its Python ``name'' -- ''<stdout>''
	or ''<stderr>'', the two names CPython uses.  The name is the ONLY thing
	that distinguishes the two: see the class comment on the single sink."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'_name' put: aName.
	^ inst

]

{ #category : 'Grail-Python Attribute Hook' }
PyConsoleStream class >> ___pythonValueAttrs___ [
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

]
