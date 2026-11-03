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

STDOUT AND STDERR ARE TWO CHANNELS (issue #1972).  The ``<stderr>' instance
writes through ``builtins >> ___consoleErrorWrite___:', whose sink is the
SessionTemps #GrailConsoleErr box -- ./grail installs GsFile stderr there, so
sys.stderr is fd 2, as CPython's is.  They used to share the one console sink,
so under ./grail every warning, logging record and Python-printed traceback
landed on fd 1.  An embedder that installs no error box sees no change: the
error channel falls back to the console sink, which is what a capturing
embedder or a topaz-hosted run already reads.

PRINT IS UNCHANGED.  ``builtins >> ___printTarget___' reads sys.stdout at call
time and treats any non-None value as a REDIRECT, so an object there would have
re-routed every print in the corpus through this class's write.  It instead
RECOGNISES this class and answers nil for it -- the console -- leaving print on
byte-identically the path it was on.  The ``<stderr>' instance is the one it
does NOT answer nil for: ``print(x, file=sys.stderr)' is written through this
class's write, to the error channel.  ``warnings >> showwarning' makes the same
recognition for sys.stderr, and writes to the error channel itself.  A user redirect (``sys.stdout = io.StringIO()')
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
