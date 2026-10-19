Extension { #name : 'io' }

{ #category : 'Grail-Pure-Python Layer' }
io >> ___pyioClass___: aName [
	"One named class out of _pyio.

	NOT cached into this module's dict.  The dict is PERSISTENT and the
	classes _pyio defines are rebuilt whenever the canonical generation
	moves (every install.sh), so a stored reference would go stale while
	still answering reads.  sys.modules already caches the module itself
	per session, which is where the cost actually is."

	^ self ___pyioModule___ @env1:___pyAttrLoad___: aName

]

{ #category : 'Grail-Pure-Python Layer' }
io >> ___pyioModule___ [
	"The vendored CPython ``_pyio'', imported on demand.

	ON FIRST LOAD, Grail's own in-memory streams are REGISTERED into _pyio's
	ABC hierarchy -- see ___registerGrailStreams___: for why that is not
	cosmetic."

	| m path |
	m := importlib @env1:lookupModule: '_pyio'.
	m == nil ifTrue: [
		path := importlib @env1:___moduleNameToPath___: '_pyio'.
		path == nil ifTrue: [
			ImportError @env1:___signal___:
				'no _pyio module on the Grail search path'].
		m := importlib @env0:loadModuleFromPath: path name: '_pyio'.
		self ___registerGrailStreams___: m].
	^ m

]

{ #category : 'Grail-Pure-Python Layer' }
io >> ___registerGrailStreams___: aPyioModule [
	"Tell _pyio's ABCs that Grail's StringIO and BytesIO belong to them.

	CPython's StringIO IS a TextIOBase and its BytesIO IS a BufferedIOBase --
	``io.StringIO.__mro__'' is (StringIO, _TextIOBase, _IOBase, object).
	Grail's are Smalltalk classes written from scratch, outside that
	hierarchy, so ``isinstance(StringIO(), io.TextIOBase)'' answered False.
	Correctly, on the letter of it -- and WRONG for every caller that BRANCHES
	on the answer.

	xml.sax.saxutils'' _gettextwriter is the case that found this.  Its first
	branch is ``if isinstance(out, io.TextIOBase): return out'', which is the
	path CPython takes for a StringIO.  Falling past it instead landed in the
	branch for objects that merely have a write method, which builds an
	io.BufferedIOBase() by hand and wraps it in a TextIOWrapper -- so
	XMLGenerator(StringIO()) died inside machinery it should never have
	reached, reporting ``write to closed file'' about a stream that was open.
	An isinstance that is false for the wrong reason does not fail where it is
	wrong; it fails somewhere else entirely.

	abc.ABCMeta''s register is the mechanism CPython itself documents for
	exactly this -- a class that implements a protocol without inheriting it --
	and Grail honours it.  Done HERE, at the one point per session where the
	ABCs are built, because _pyio is rebuilt whenever the canonical generation
	moves and a registration against a stale class would be silently lost.

	Guarded: a _pyio that is missing either name must not stop io from
	loading, since nothing else here needs the registration to have happened."

	[ | tb bb |
	  tb := aPyioModule @env1:___pyAttrLoad___: #'TextIOBase'.
	  tb @env1:register: StringIO.
	  bb := aPyioModule @env1:___pyAttrLoad___: #'BufferedIOBase'.
	  bb @env1:register: BytesIO ]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Opening' }
io >> _gzip_open: path _: mode [
	"Private hook for the pure-Python gzip module: a file object over
	a gzip-compressed GsFile."

	^ FileIO ___openCompressedPath___: path mode: mode

]

{ #category : 'Grail-Opening' }
io >> _open: positional kw: kwargs [
	"Varargs/kwargs form - delegate to the builtins implementation so
	the argument parsing lives in exactly one place."

	^ (builtins instance) _open: positional kw: kwargs

]

{ #category : 'Grail-Opening' }
io >> _text_encoding: positional kw: kwargs [
	"``io.text_encoding(encoding, stacklevel=2)'' -- CPython's helper for a
	library that takes an ``encoding=None'' and must turn it into a real
	codec name.

	CPython answers the string ``'locale''', a sentinel its TextIOWrapper
	resolves against the process locale at open time.  Grail answers
	``'utf-8''' outright: there is no per-process text locale here, every
	Grail codec path already defaults to UTF-8, and 'locale' would only send
	_pyio off to locale.getpreferredencoding() to be told the same thing.

	Defined ONLY in the varargs form, on purpose.  A module's varargs
	selector is probed ahead of its unary one, so this makes the bare read
	``io.text_encoding'' answer a BoundMethod -- which is what a FUNCTION
	should be, and what makes hasattr(io, 'text_encoding') true.  (The
	classes above want the opposite and so have no varargs twin; see the
	comment over IOBase.)"

	| n enc |
	n := positional == nil ifTrue: [0] ifFalse: [positional @env0:size].
	n @env0:> 2 ifTrue: [
		TypeError ___signal___: 'text_encoding() takes at most 2 arguments'].
	enc := n @env0:>= 1 ifTrue: [positional @env0:at: 1] ifFalse: [
		(kwargs == nil @env0:or: [kwargs == None])
			ifTrue: [nil]
			ifFalse: [kwargs @env0:at: 'encoding' ifAbsent: [nil]]].
	(enc == nil @env0:or: [enc == None]) ifTrue: [^ 'utf-8'].
	enc @env0:= 'locale' ifTrue: [^ 'utf-8'].
	^ enc

]

{ #category : 'Grail-Type Accessors' }
io >> BufferedIOBase [
	^ self ___pyioClass___: #'BufferedIOBase'

]

{ #category : 'Grail-Type Accessors' }
io >> BufferedRandom [
	^ self ___pyioClass___: #'BufferedRandom'

]

{ #category : 'Grail-Type Accessors' }
io >> BufferedReader [
	^ self ___pyioClass___: #'BufferedReader'

]

{ #category : 'Grail-Type Accessors' }
io >> BufferedRWPair [
	^ self ___pyioClass___: #'BufferedRWPair'

]

{ #category : 'Grail-Type Accessors' }
io >> BufferedWriter [
	^ self ___pyioClass___: #'BufferedWriter'

]

{ #category : 'Grail-Type Accessors' }
io >> IncrementalNewlineDecoder [
	"The universal-newlines decoder TextIOWrapper reads through, public in
	CPython's io and imported from there by doctest."

	^ self ___pyioClass___: #'IncrementalNewlineDecoder'

]

{ #category : 'Grail-Initialization' }
io >> initialize [
	"Store class references as plain module attributes (not unary
	method accessors) so the CallAst attribute-call fast path doesn't
	collapse ``io.StringIO()`` to a unary read.  Reads fall through
	the module ``___pyAttrLoad___`` chain to ``self at:``, returning
	the class; the call site then invokes value:value: on it.

	Seek whence constants mirror CPython: SEEK_SET=0 (from start),
	SEEK_CUR=1 (from current), SEEK_END=2 (from end).  Used by
	Werkzeug for file-upload streaming and request.stream.seek."

	self @env0:at: #StringIO put: StringIO.
	self @env0:at: #BytesIO put: BytesIO.
	self @env0:at: #FileIO put: FileIO.
	self @env0:at: #TextIOWrapper put: TextIOWrapper.
	self @env0:at: #UnsupportedOperation put: UnsupportedOperation.
	self @env0:at: #DEFAULT_BUFFER_SIZE put: 8192.
	self @env0:at: #SEEK_SET put: 0.
	self @env0:at: #SEEK_CUR put: 1.
	self @env0:at: #SEEK_END put: 2

]

{ #category : 'Grail-Type Accessors' }
io >> IOBase [
	^ self ___pyioClass___: #'IOBase'

]

{ #category : 'Grail-Opening' }
io >> open_code: path [
	"io.open_code(path) -- open a file of CODE for reading, as bytes.  CPython's
	is open(path, 'rb') behind an audit hook that lets an embedder vet what is
	about to run; Grail has no such hook, so it is the open.  runpy.run_path
	reads a script through it, and failed on its absence."

	^ FileIO ___open___: path mode: 'rb' encoding: nil

]

{ #category : 'Grail-Opening' }
io >> open: file [
	"io.open(file) - alias for the open() builtin."

	^ FileIO ___open___: file mode: nil encoding: nil

]

{ #category : 'Grail-Opening' }
io >> open: file _: mode [
	^ FileIO ___open___: file mode: mode encoding: nil

]

{ #category : 'Grail-Type Accessors' }
io >> RawIOBase [
	^ self ___pyioClass___: #'RawIOBase'

]

{ #category : 'Grail-Type Accessors' }
io >> Reader [
	"CPython 3.14's io.Reader, defined in Lib/io.py and so in neither _io nor
	_pyio: src/python/stdlib/_grail_io.py holds it."

	^ ((importlib @env0:___instance___) @env1:import_module: '_grail_io')
		@env1:___pyAttrLoad___: #'Reader'

]

{ #category : 'Grail-Type Accessors' }
io >> TextIOBase [
	^ self ___pyioClass___: #'TextIOBase'

]

{ #category : 'Grail-Type Accessors' }
io >> Writer [
	"io.Writer; see io >> Reader."

	^ ((importlib @env0:___instance___) @env1:import_module: '_grail_io')
		@env1:___pyAttrLoad___: #'Writer'

]
