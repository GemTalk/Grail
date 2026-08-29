! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ===============================================================================
! StringIO - text-mode in-memory file
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'StringIO'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
StringIO category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
StringIO removeAllMethods: 0.
StringIO removeAllMethods: 1.
StringIO class removeAllMethods: 0.
StringIO class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: StringIO
___pythonValueAttrs___
	^ IdentitySet new
		add: #closed;
		yourself
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: StringIO
__new__
	^ self __new__: ''
%

category: 'Grail-Initialization'
classmethod: StringIO
__new__: initialValue
	"StringIO([initial]) - text buffer seeded with initial."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #_buffer put: initialValue @env0:asString @env0:copy.
	inst @env0:dynamicInstVarAt: #_pos put: 0.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	^ inst
%

category: 'Grail-Reading'
method: StringIO
read
	^ self read: -1
%

category: 'Grail-Reading'
method: StringIO
read: n
	"read(size=-1) - read up to size chars from the current position;
	-1 / None means read until EOF."

	| size remaining take result |
	self _checkOpen.
	remaining := (self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:- (self @env0:dynamicInstVarAt: #_pos).
	(n == nil @env0:or: [n == None @env0:or: [n @env0:< 0]]) ifTrue: [
		size := remaining
	] ifFalse: [
		size := n
	].
	take := size @env0:min: remaining.
	take @env0:<= 0 ifTrue: [^ ''].
	result := (self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: (self @env0:dynamicInstVarAt: #_pos) @env0:+ 1 to: (self @env0:dynamicInstVarAt: #_pos) @env0:+ take.
	self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ take).
	^ result
%

category: 'Grail-Reading'
method: StringIO
readline
	^ self readline: -1
%

category: 'Grail-Reading'
method: StringIO
readline: limit
	"readline(size=-1) - read up to and including the next \\n, or
	up to `size` chars (whichever first), or to EOF."

	| n start max |
	self _checkOpen.
	n := (self @env0:dynamicInstVarAt: #_buffer) @env0:size.
	(self @env0:dynamicInstVarAt: #_pos) @env0:>= n ifTrue: [^ ''].
	start := (self @env0:dynamicInstVarAt: #_pos).
	max := (limit == nil @env0:or: [limit == None @env0:or: [limit @env0:< 0]])
		ifTrue: [n]
		ifFalse: [(start @env0:+ limit) @env0:min: n].
	[(self @env0:dynamicInstVarAt: #_pos) @env0:< max @env0:and: [((self @env0:dynamicInstVarAt: #_buffer) @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ 1) @env0:~= Character @env0:lf]]
		@env0:whileTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ 1)].
	"Include the \\n itself when present."
	((self @env0:dynamicInstVarAt: #_pos) @env0:< max @env0:and: [((self @env0:dynamicInstVarAt: #_buffer) @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ 1) @env0:= Character @env0:lf]) ifTrue: [
		self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ 1)].
	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: start @env0:+ 1 to: (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Reading'
method: StringIO
readlines
	"Read all remaining lines into a list."

	| out line |
	self _checkOpen.
	out := list ___new___.
	[
		line := self readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out append: line].
	^ out
%

category: 'Grail-Writing'
method: StringIO
write: data
	"Overwrite from the current position; grow on append."

	| s n endPos |
	self _checkOpen.
	s := data @env0:asString.
	n := s @env0:size.
	endPos := (self @env0:dynamicInstVarAt: #_pos) @env0:+ n.
	endPos @env0:> (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		"Extend buffer with the suffix from `s`."
		self @env0:dynamicInstVarAt: #_buffer put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:, (Unicode7 @env0:new: (endPos @env0:- (self @env0:dynamicInstVarAt: #_buffer) @env0:size))).
	].
	1 @env0:to: n do: [:i |
		(self @env0:dynamicInstVarAt: #_buffer) @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ i put: (s @env0:at: i)
	].
	self @env0:dynamicInstVarAt: #_pos put: (endPos).
	^ n
%

category: 'Grail-Writing'
method: StringIO
writelines: lines
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
%

category: 'Grail-Position'
method: StringIO
seek: pos
	^ self seek: pos _: 0
%

category: 'Grail-Position'
method: StringIO
seek: pos _: whence
	"seek(pos, whence=0): 0=set, 1=cur, 2=end."

	self _checkOpen.
	whence @env0:= 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (pos)]
	ifFalse: [whence @env0:= 1 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ pos)]
	ifFalse: [whence @env0:= 2 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:+ pos)]
	ifFalse: [
		ValueError ___signal___: 'whence must be 0, 1, or 2'
	]]].
	(self @env0:dynamicInstVarAt: #_pos) @env0:< 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (0)].
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: StringIO
tell
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: StringIO
truncate
	^ self truncate: (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: StringIO
truncate: size
	self _checkOpen.
	size @env0:< (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: 1 to: size)].
	^ size
%

category: 'Grail-State'
method: StringIO
getvalue
	"getvalue() - return the entire buffer contents as a single str."

	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copy
%

category: 'Grail-State'
method: StringIO
close
	self @env0:dynamicInstVarAt: #_closed put: (true).
	^ None
%

category: 'Grail-State'
method: StringIO
closed
	^ (self @env0:dynamicInstVarAt: #_closed)
%

category: 'Grail-Context manager'
method: StringIO
__enter__
	^ self
%

category: 'Grail-Context manager'
method: StringIO
__exit__: a _: b _: c
	self close.
	^ false
%

category: 'Grail-Iter protocol'
method: StringIO
__iter__
	^ self
%

category: 'Grail-Iter protocol'
method: StringIO
__next__
	"Iterating yields readline() until empty, then raises StopIteration."

	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [
		StopIteration ___signal___: ''
	].
	^ line
%

category: 'Grail-Private'
method: StringIO
_checkOpen
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file'
	]
%

set compile_env: 0

! ===============================================================================
! BytesIO - byte-mode in-memory file
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'BytesIO'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BytesIO category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
BytesIO removeAllMethods: 0.
BytesIO removeAllMethods: 1.
BytesIO class removeAllMethods: 0.
BytesIO class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: BytesIO
___pythonValueAttrs___
	^ IdentitySet new
		add: #closed;
		yourself
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: BytesIO
__new__
	^ self __new__: #[] @env0:asByteArray
%

category: 'Grail-Initialization'
classmethod: BytesIO
__new__: initial
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
%

category: 'Grail-Reading'
method: BytesIO
read
	^ self read: -1
%

category: 'Grail-Writing'
method: BytesIO
flush
	"flush() on an in-memory stream has nothing to push anywhere, but it is
	part of the IOBase protocol and callers do invoke it -- wave.Wave_write
	flushes the underlying file on close, and test_wave writes into a BytesIO.
	CPython inherits the same no-op from IOBase.  It still raises on a CLOSED
	stream, which is what _checkOpen provides."

	self _checkOpen
%

category: 'Grail-Reading'
method: BytesIO
read: n
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
%

category: 'Grail-Reading'
method: BytesIO
readline
	^ self readline: -1
%

category: 'Grail-Reading'
method: BytesIO
readline: limit
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
%

category: 'Grail-Reading'
method: BytesIO
readlines
	| out line |
	self _checkOpen.
	out := list ___new___.
	[
		line := self readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out append: line].
	^ out
%

category: 'Grail-Writing'
method: BytesIO
write: data
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
%

category: 'Grail-Writing'
method: BytesIO
writelines: lines
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
%

category: 'Grail-Position'
method: BytesIO
seek: pos
	^ self seek: pos _: 0
%

category: 'Grail-Position'
method: BytesIO
seek: pos _: whence
	self _checkOpen.
	whence @env0:= 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (pos)]
	ifFalse: [whence @env0:= 1 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ pos)]
	ifFalse: [whence @env0:= 2 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:+ pos)]
	ifFalse: [
		ValueError ___signal___: 'whence must be 0, 1, or 2'
	]]].
	(self @env0:dynamicInstVarAt: #_pos) @env0:< 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (0)].
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: BytesIO
tell
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: BytesIO
truncate
	^ self truncate: (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: BytesIO
truncate: size
	self _checkOpen.
	size @env0:< (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: 1 to: size)].
	^ size
%

category: 'Grail-State'
method: BytesIO
getvalue
	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copy
%

category: 'Grail-State'
method: BytesIO
getbuffer
	"Return a view of the buffer.  CPython returns a memoryview;
	Grail has no memoryview yet, so return a bytes copy that callers
	can pass through ``bytes(buf.getbuffer())'' (the most common
	idiom; the round-trip is functionally identical when no in-place
	mutation is involved)."

	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copy
%

category: 'Grail-State'
method: BytesIO
close
	self @env0:dynamicInstVarAt: #_closed put: (true).
	^ None
%

category: 'Grail-State'
method: BytesIO
closed
	^ (self @env0:dynamicInstVarAt: #_closed)
%

category: 'Grail-Context manager'
method: BytesIO
__enter__
	^ self
%

category: 'Grail-Context manager'
method: BytesIO
__exit__: a _: b _: c
	self close.
	^ false
%

category: 'Grail-Iter protocol'
method: BytesIO
__iter__
	^ self
%

category: 'Grail-Iter protocol'
method: BytesIO
__next__
	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [
		StopIteration ___signal___: ''
	].
	^ line
%

category: 'Grail-Private'
method: BytesIO
_checkOpen
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file'
	]
%

set compile_env: 0

! ===============================================================================
! FileIO - binary file object over GsFile (also the open() entry point)
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'FileIO'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
FileIO category: 'Grail-Modules'
%

expectvalue /Class
doit
FileIO comment:
'Binary file object backing the Python open() builtin.

Wraps a server-side GsFile, always opened with a ''b'' fopen mode (on
Unix there is no text/binary distinction at the C level; text decoding
is layered on by the TextIOWrapper subclass).  The GsFile handle and
bookkeeping live in dynamic instVars: _gsfile, _name, _mode, _closed,
_readable, _writable (and _encoding on TextIOWrapper instances).

Known deviations from CPython, kept deliberately small for V1:
  * truncate() is not supported (GsFile has no ftruncate) - raises OSError.
  * fileno() is not supported - raises OSError.
  * No universal-newline translation: \r\n is not folded to \n on read
    and \n is written as-is (matches POSIX platforms for LF files).
  * readline(limit) measures the limit in bytes, not characters.'
%

! ===============================================================================
! TextIOWrapper - text-mode file object (decodes/encodes on top of FileIO)
! ===============================================================================

expectvalue /Class
doit
FileIO subclass: 'TextIOWrapper'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
TextIOWrapper category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
FileIO removeAllMethods: 0.
FileIO removeAllMethods: 1.
FileIO class removeAllMethods: 0.
FileIO class removeAllMethods: 1.
TextIOWrapper removeAllMethods: 0.
TextIOWrapper removeAllMethods: 1.
TextIOWrapper class removeAllMethods: 0.
TextIOWrapper class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: FileIO
___pythonValueAttrs___
	^ IdentitySet new
		add: #closed;
		add: #name;
		add: #mode;
		yourself
%

category: 'Grail-Introspection'
classmethod: TextIOWrapper
___pythonValueAttrs___
	| attrs |
	attrs := super ___pythonValueAttrs___.
	attrs add: #encoding.
	^ attrs
%

set compile_env: 1

category: 'Grail-Opening'
classmethod: FileIO
___resolveEncoding___: anEncoding
	"Normalize an open() encoding argument to one of the two encodings
	Grail supports: 'utf-8' (also covers ascii, a strict subset) and
	'latin-1' (identity mapping over single-byte Strings)."

	| e |
	(anEncoding == nil @env0:or: [anEncoding == None]) ifTrue: [^ 'utf-8'].
	(anEncoding isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'open() argument ''encoding'' must be str or None'].
	e := anEncoding @env0:asLowercase.
	((e @env0:= 'utf-8') @env0:or: [(e @env0:= 'utf8') @env0:or: [(e @env0:= 'ascii') @env0:or: [e @env0:= 'us-ascii']]]) ifTrue: [^ 'utf-8'].
	((e @env0:= 'latin-1') @env0:or: [(e @env0:= 'latin1') @env0:or: [(e @env0:= 'iso-8859-1') @env0:or: [e @env0:= 'l1']]]) ifTrue: [^ 'latin-1'].
	LookupError ___signal___: ('unknown encoding: ' @env0:, anEncoding)
%

category: 'Grail-Opening'
classmethod: FileIO
__new__
	"``io.FileIO()'' -- the file name is required.

	Needed as its own arity: a 0-positional call does not reach the varargs
	``_new:kw:'' form (which does guard for it), so without this it fell through
	to plain ``new'' and answered an UNINITIALISED instance -- the same silent
	failure the subclass path had, one arity over.  Caught by the fixture's
	a_missing_name_is_a_typeerror, which is exactly what that check is for."

	^ TypeError ___signal___: 'FileIO() missing required argument ''file'' (pos 1)'
%

category: 'Grail-Opening'
classmethod: FileIO
__new__: fileArg
	"``io.FileIO(name)'' -- CPython's default mode is 'r'."

	^ self ___construct___: fileArg mode: 'r'
%

category: 'Grail-Opening'
classmethod: FileIO
__new__: fileArg _: modeArg
	"``io.FileIO(name, mode)''."

	^ self ___construct___: fileArg mode: modeArg
%

category: 'Grail-Opening'
classmethod: FileIO
_new: posArgs kw: kwArgs
	"``io.FileIO(name, mode='r', closefd=True, opener=None)'' in its varargs form,
	which is also the form a keyword call arrives in.

	closefd/opener are ACCEPTED AND IGNORED rather than rejected: Grail's FileIO
	owns its GsFile unconditionally (there are no integer file descriptors to
	borrow -- ___open___ raises TypeError for one), so closefd=True is the only
	behaviour available and is the default.  Rejecting the name outright would
	fail calls that merely pass the default explicitly."

	| n file mode |
	n := posArgs @env0:size.
	(n @env0:< 1 @env0:or: [n @env0:> 4]) ifTrue: [
		TypeError ___signal___: 'FileIO() takes 1 to 4 positional arguments'].
	file := posArgs @env0:at: 1.
	mode := n @env0:>= 2 ifTrue: [posArgs @env0:at: 2] ifFalse: [
		(kwArgs == nil @env0:or: [kwArgs == None])
			ifTrue: ['r']
			ifFalse: [kwArgs @env0:at: 'mode' ifAbsent: ['r']]].
	^ self ___construct___: file mode: mode
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
___constructText___: posArgs kw: kwArgs
	"``io.TextIOWrapper(buffer, encoding, errors, newline, ...)'' -- and this
	is the one place where Grail's TextIOWrapper and CPython's are two
	different objects wearing one name.

	Grail's is a FileIO subclass over a GsFile: it OPENS a file and decodes
	what it reads.  That is what open() answers in text mode, and what
	io.TextIOWrapper has always been here.  CPython's wraps an existing
	BUFFER -- a BufferedReader, a BytesIO -- and owns no file at all.  Text
	mode over a buffer is the second one, and socket.makefile('r') is exactly
	that call: ``io.TextIOWrapper(io.BufferedReader(SocketIO(...)), enc)''.
	Inherited unchanged, FileIO's constructors took the BUFFER for a FILE
	NAME and tried to open it.

	So the first argument decides.  A str (or a PathLike) keeps the GsFile
	path; anything else is a buffer and is handed to _pyio's TextIOWrapper,
	CPython's own pure-Python implementation, already vendored here for the
	buffered layer.  That one has been unusable until now for a reason that
	had nothing to do with io: its constructor asks
	``codecs.lookup(encoding).incrementaldecoder'', and Grail's codecs was a
	stub whose lookup raised LookupError for every name.  With a real
	registry behind it, it works.

	A SUBCLASS always takes the GsFile path.  Delegating would answer an
	instance of _pyio's class, not of the subclass -- the silent kind of
	wrong -- and a subclass of Grail's TextIOWrapper is by construction
	asking for the GsFile one."

	| first |
	posArgs @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___:
			'TextIOWrapper() missing required argument ''buffer'' (pos 1)'].
	first := posArgs @env0:at: 1.
	((self ~~ TextIOWrapper) @env0:or: [self ___isPathLikeArgument___: first])
		ifTrue: [^ super _new: posArgs kw: kwArgs].
	^ ((io instance) ___pyioClass___: #'TextIOWrapper')
		@env1:value: posArgs value: kwArgs
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
___isPathLikeArgument___: anObject
	"True when the first constructor argument names a FILE rather than being
	a buffer.  A CharacterCollection is the common case; ``__fspath__'' is
	PEP 519's, so pathlib.Path lands here too.  Everything else -- anything
	with a read/readable -- is a buffer.

	Deliberately a positive test for path-ness rather than a negative test
	for buffer-ness: a buffer object is free to define almost anything, but
	the two spellings that mean ``open this'' are closed.  The class chain is
	probed rather than the own method dict, so a Path SUBCLASS counts."

	(anObject isKindOf: CharacterCollection) ifTrue: [^ true].
	^ (anObject @env0:class @env0:whichClassIncludesSelector: #'__fspath__'
		environmentId: 1) @env0:notNil
%

! Six fixed arities plus the varargs form, because object class >>
! value:value: dispatches a NO-KEYWORD call straight to ``__new__:_:_:…'' of
! the matching arity and never consults ``_new:kw:''.  CPython's
! TextIOWrapper takes buffer, encoding, errors, newline, line_buffering,
! write_through -- one to six positional -- and socket.makefile() passes
! four.  Without the arity that a caller happens to use, the call dies in
! value:value: with ``takes wrong number of arguments'', naming neither the
! class's real signature nor the delegation below it.

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__
	^ TypeError ___signal___:
		'TextIOWrapper() missing required argument ''buffer'' (pos 1)'
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__: bufferArg
	^ self ___constructText___: { bufferArg } kw: nil
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__: bufferArg _: encodingArg
	^ self ___constructText___: { bufferArg. encodingArg } kw: nil
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__: bufferArg _: encodingArg _: errorsArg
	^ self ___constructText___: { bufferArg. encodingArg. errorsArg } kw: nil
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__: bufferArg _: encodingArg _: errorsArg _: newlineArg
	^ self ___constructText___:
		{ bufferArg. encodingArg. errorsArg. newlineArg } kw: nil
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__: bufferArg _: encodingArg _: errorsArg _: newlineArg _: lineBufferingArg
	^ self ___constructText___:
		{ bufferArg. encodingArg. errorsArg. newlineArg. lineBufferingArg }
		kw: nil
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
__new__: bufferArg _: encodingArg _: errorsArg _: newlineArg _: lineBufferingArg _: writeThroughArg
	^ self ___constructText___:
		{ bufferArg. encodingArg. errorsArg. newlineArg. lineBufferingArg.
		  writeThroughArg }
		kw: nil
%

category: 'Grail-Opening'
classmethod: TextIOWrapper
_new: posArgs kw: kwArgs
	"The keyword form -- ``io.TextIOWrapper(buf, encoding='utf-8')'', which
	is how _pyio.open and most callers spell it."

	^ self ___constructText___: posArgs kw: kwArgs
%

category: 'Grail-Opening'
classmethod: FileIO
___construct___: fileArg mode: modeArg
	"``io.FileIO(name, mode)'': open the file and answer an instance OF SELF.

	Distinct from ___open___:mode:encoding: in three ways that all matter.

	It answers an instance of SELF, not of FileIO, so a SUBCLASS gets its own
	class -- which is the whole point.  test_wave's ``class UnseekableIO(
	io.FileIO)'' overrides tell/seek to raise, and 20 of its tests need it.
	Before this, FileIO had NO Python-visible constructor at all: ``io.FileIO(p,
	'rb')'' raised ``FileIO() takes wrong number of arguments'' -- while the
	SUBCLASS call silently answered an UNINITIALISED instance, because the call
	protocol fell back to plain ``new'' when it found no constructor.  The failure
	then surfaced far away, as ``nil does not understand #close'', naming neither
	the class nor the missing constructor.

	It is ALWAYS BINARY.  CPython's FileIO is a raw byte stream: it takes 'r',
	'w', 'x', 'a' and '+', ignores a 'b', and rejects 't' -- ``io.FileIO(p, 'rt')''
	is a ValueError there.  Text decoding is TextIOWrapper's job.

	And ``mode'' reports NORMALISED, with the 'b' put back and '+' last:
	CPython answers 'rb' for 'r' and 'rb+' for 'r+'."

	^ self @env0:new ___openInto___: fileArg mode: modeArg
%

category: 'Grail-Opening'
method: FileIO
___openInto___: fileArg mode: modeArg
	"Open ``fileArg'' and initialise SELF from it -- the instance-side half of the
	FileIO constructor.

	Instance-side on purpose: the SUBCLASS path cannot allocate.  A Python
	``class UnseekableIO(io.FileIO)'' is allocated by ClassDefAst's general
	construction path and then handed to ___pyBuiltinSubclassInit___, which has an
	instance and needs it initialised in place -- so both routes end here rather
	than one of them answering a fresh object the other would throw away."

	| mode normalised opened |
	mode := (modeArg == nil @env0:or: [modeArg == None]) ifTrue: ['r'] ifFalse: [modeArg].
	(mode isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'FileIO() argument ''mode'' must be str'].
	(mode @env0:includes: $t) ifTrue: [
		"CPython: io.FileIO(p, 'rt') is a ValueError.  FileIO is a RAW byte
		 stream; text is TextIOWrapper's job."
		ValueError ___signal___: ('invalid mode: ' @env0:, mode)].
	"``r'' -> ``rb''.  ___open___ parses either and owns the rest of the
	 validation (exactly one of r/w/x/a, no stray letters), so there is one
	 definition of what a mode string means."
	normalised := (mode @env0:includes: $b) ifTrue: [mode] ifFalse: [mode @env0:, 'b'].
	opened := FileIO ___open___: fileArg mode: normalised encoding: nil.
	self ___initGsFile___: (opened @env0:dynamicInstVarAt: #_gsfile)
		name: (opened @env0:dynamicInstVarAt: #_name)
		mode: (opened @env0:dynamicInstVarAt: #_mode)
		readable: (opened @env0:dynamicInstVarAt: #_readable)
		writable: (opened @env0:dynamicInstVarAt: #_writable).
	^ self ___renormaliseMode___
%

category: 'Grail-Opening'
method: FileIO
___renormaliseMode___
	"Report ``mode'' the way CPython's FileIO does: 'b' present, '+' last.

	open() keeps the mode string the CALLER passed, which is right for open() --
	``open(p).mode'' is 'r' there too.  FileIO is the one that normalises:
	``io.FileIO(p, 'r').mode'' is 'rb' and ``io.FileIO(p, 'r+').mode'' is 'rb+'."

	| m base |
	m := self @env0:dynamicInstVarAt: #_mode.
	(m isKindOf: CharacterCollection) ifFalse: [^ self].
	base := WriteStream @env0:on: String @env0:new.
	m @env0:do: [:c |
		((c @env0:= $b) @env0:or: [c @env0:= $+]) ifFalse: [base @env0:nextPut: c]].
	base @env0:nextPut: $b.
	(m @env0:includes: $+) ifTrue: [base @env0:nextPut: $+].
	self @env0:dynamicInstVarAt: #_mode put: base @env0:contents.
	^ self
%

category: 'Grail-Opening'
classmethod: FileIO
___open___: fileArg mode: modeArg encoding: encodingArg
	"Master entry point behind the open() builtin and io.open().
	Parses the Python mode string, maps it to a GsFile fopen mode
	(always with 'b' - decoding is the TextIOWrapper's job), and
	answers a FileIO (binary) or TextIOWrapper (text) instance."

	| file mode hasR hasW hasA hasX hasPlus hasB hasT count gsMode gsfile inst |
	file := fileArg.
	(file isKindOf: CharacterCollection) ifFalse: [
		(file isKindOf: Number) ifTrue: [
			TypeError ___signal___: 'integer file descriptors are not supported in Grail'].
		"PEP 519 first: CPython's open() asks __fspath__, and only a
		PathLike is guaranteed to answer the actual filesystem path there.
		__str__ stays as the fallback because it is what this has always
		used and the two coincide for pathlib.Path — but a class free to
		define a display __str__ alongside a real __fspath__ would
		otherwise be opened under whatever its repr-ish text happened to be."
		file := (os instance) ___fsPath___: file.
		(file isKindOf: CharacterCollection) ifFalse: [file := file __str__]].
	mode := (modeArg == nil @env0:or: [modeArg == None]) ifTrue: ['r'] ifFalse: [modeArg].
	(mode isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'open() argument ''mode'' must be str'].
	hasR := false. hasW := false. hasA := false. hasX := false.
	hasPlus := false. hasB := false. hasT := false.
	mode @env0:do: [:c |
		c @env0:= $r ifTrue: [hasR := true]
		ifFalse: [c @env0:= $w ifTrue: [hasW := true]
		ifFalse: [c @env0:= $a ifTrue: [hasA := true]
		ifFalse: [c @env0:= $x ifTrue: [hasX := true]
		ifFalse: [c @env0:= $+ ifTrue: [hasPlus := true]
		ifFalse: [c @env0:= $b ifTrue: [hasB := true]
		ifFalse: [c @env0:= $t ifTrue: [hasT := true]
		ifFalse: [ValueError ___signal___: ('invalid mode: ''' @env0:, mode @env0:, '''')]]]]]]]].
	count := 0.
	hasR ifTrue: [count := count @env0:+ 1].
	hasW ifTrue: [count := count @env0:+ 1].
	hasA ifTrue: [count := count @env0:+ 1].
	hasX ifTrue: [count := count @env0:+ 1].
	count @env0:= 1 ifFalse: [
		ValueError ___signal___: 'must have exactly one of create/read/write/append mode'].
	(hasB @env0:and: [hasT]) ifTrue: [
		ValueError ___signal___: 'can''t have text and binary mode at once'].
	(hasB @env0:and: [(encodingArg == nil @env0:or: [encodingArg == None]) @env0:not]) ifTrue: [
		ValueError ___signal___: 'binary mode doesn''t take an encoding argument'].
	"``== true'' on every GsFile predicate here.  BOTH answer nil rather
	than false when the probe itself errors -- and a path whose PARENT is a
	plain file makes that ordinary (``open(''grail/x.txt'')'', where ./grail
	is the CLI shell script, stats with ENOTDIR).  A nil reaching an inlined
	ifTrue:/and:/not: raised ImproperOperation (error 2085, ``Expected nil
	to be a Boolean''), which no ``except OSError'' can catch, instead of
	the NotADirectoryError CPython raises.  ``== true'' alone also subsumes
	the old existsOnServer: pre-guard: isServerDirectory: answers nil for a
	path that is not there, which is not true."
	((GsFile @env0:isServerDirectory: file) == true) ifTrue: [
		IsADirectoryError ___signal___: ('[Errno 21] Is a directory: ''' @env0:, file @env0:, '''')].
	hasX ifTrue: [
		((GsFile @env0:existsOnServer: file) == true) ifTrue: [
			FileExistsError ___signal___: ('[Errno 17] File exists: ''' @env0:, file @env0:, '''')]].
	gsMode := hasR ifTrue: ['r'] ifFalse: [hasA ifTrue: ['a'] ifFalse: ['w']].
	hasPlus ifTrue: [gsMode := gsMode @env0:, '+'].
	gsMode := gsMode @env0:, 'b'.
	gsfile := GsFile @env0:openOnServer: file mode: gsMode.
	gsfile == nil ifTrue: [
		"Ask STAT why, rather than re-testing existence: os >>
		___statOrSignal___: already maps the errno to CPython's OSError
		subclass (ENOENT -> FileNotFoundError, ENOTDIR ->
		NotADirectoryError, EACCES -> PermissionError) with CPython's
		message text, so a shadowed path reports what is actually wrong
		instead of ``No such file''.  It raises whenever the stat fails;
		reaching past it means the file IS there and the open failed for
		another reason."
		(os instance) ___statOrSignal___: file isLstat: false.
		OSError ___signal___: ('could not open file: ''' @env0:, file @env0:, '''')].
	inst := (hasB ifTrue: [FileIO] ifFalse: [TextIOWrapper]) @env0:new.
	inst ___initGsFile___: gsfile name: file mode: mode
		readable: ((hasR) @env0:or: [hasPlus])
		writable: ((hasR @env0:not) @env0:or: [hasPlus]).
	hasB ifFalse: [
		inst @env0:dynamicInstVarAt: #_encoding put: (FileIO ___resolveEncoding___: encodingArg)].
	^ inst
%

category: 'Grail-Opening'
method: FileIO
___initGsFile___: gsfile name: aName mode: aMode readable: isReadable writable: isWritable
	"Stamp the six bookkeeping instVars every FileIO needs onto SELF.

	Extracted so the open() path and the ``io.FileIO(name, mode)'' constructor
	initialise an instance the same way.  open() builds the instance itself (it
	chooses FileIO vs TextIOWrapper from the mode); the constructor cannot, since
	the class is already fixed -- and is usually a SUBCLASS."

	self @env0:dynamicInstVarAt: #_gsfile put: gsfile.
	self @env0:dynamicInstVarAt: #_name put: aName.
	self @env0:dynamicInstVarAt: #_mode put: aMode.
	self @env0:dynamicInstVarAt: #_closed put: false.
	self @env0:dynamicInstVarAt: #_readable put: isReadable.
	self @env0:dynamicInstVarAt: #_writable put: isWritable.
	^ self
%

category: 'Grail-Opening'
classmethod: FileIO
___openCompressedPath___: fileArg mode: modeArg
	"Backing for gzip.open / gzip.compress / gzip.decompress: a file
	object whose GsFile transparently reads/writes gzip framing
	(GsFile openOnServerCompressed:mode:).  Python modes rb/wb/ab
	(binary) and rt/wt/at (text, utf-8).  The instance is flagged
	#_streamOnly: fileSize reports the COMPRESSED size, so full reads
	must chunk to EOF and seek/tell are unreliable."

	| file mode reading binary base gsfile inst |
	file := fileArg.
	(file isKindOf: CharacterCollection) ifFalse: [file := file __str__].
	mode := (modeArg == nil @env0:or: [modeArg == None]) ifTrue: ['rb'] ifFalse: [modeArg].
	binary := (mode @env0:includes: $t) @env0:not.
	reading := mode @env0:includes: $r.
	base := reading
		ifTrue: ['rb']
		ifFalse: [(mode @env0:includes: $a) ifTrue: ['ab'] ifFalse: ['wb']].
	"``~~ true'', not ``not'': existsOnServer: answers nil when the probe
	errors, and nil ``not'' is error 2085 (see ___open___).  The stat call
	then reports WHICH error -- ENOENT, ENOTDIR, EACCES -- as the matching
	OSError subclass."
	((GsFile @env0:existsOnServer: file) ~~ true @env0:and: [reading]) ifTrue: [
		(os instance) ___statOrSignal___: file isLstat: false.
		FileNotFoundError ___signal___: ('[Errno 2] No such file or directory: ''' @env0:, file @env0:, '''')].
	gsfile := GsFile @env0:openOnServerCompressed: file mode: base.
	gsfile == nil ifTrue: [
		OSError ___signal___: ('could not open compressed file: ''' @env0:, file @env0:, '''')].
	inst := (binary ifTrue: [FileIO] ifFalse: [TextIOWrapper]) @env0:new.
	inst @env0:dynamicInstVarAt: #_gsfile put: gsfile.
	inst @env0:dynamicInstVarAt: #_name put: file.
	inst @env0:dynamicInstVarAt: #_mode put: mode.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	inst @env0:dynamicInstVarAt: #_readable put: reading.
	inst @env0:dynamicInstVarAt: #_writable put: reading @env0:not.
	inst @env0:dynamicInstVarAt: #_streamOnly put: true.
	binary ifFalse: [inst @env0:dynamicInstVarAt: #_encoding put: 'utf-8'].
	^ inst
%

category: 'Grail-Private'
method: FileIO
_checkOpen
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file.']
%

category: 'Grail-Private'
method: FileIO
_checkReadable
	self _checkOpen.
	(self @env0:dynamicInstVarAt: #_readable) == true ifFalse: [
		OSError ___signal___: 'not readable']
%

category: 'Grail-Private'
method: FileIO
_checkWritable
	self _checkOpen.
	(self @env0:dynamicInstVarAt: #_writable) == true ifFalse: [
		OSError ___signal___: 'not writable']
%

category: 'Grail-Private'
method: FileIO
_rawRead: n
	"Read up to n bytes from the GsFile; answer a raw byte String
	(possibly empty - GsFile next: answers nil at EOF)."

	| f r |
	n @env0:<= 0 ifTrue: [^ String @env0:new].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	r := f @env0:next: n.
	r == nil ifTrue: [^ String @env0:new].
	^ r
%

category: 'Grail-Private'
method: FileIO
_rawReadline: limit
	"Read one line including its trailing \n (GsFile nextLine keeps the
	terminator).  A non-negative limit caps the read at `limit` bytes,
	repositioning the file just past the returned chunk."

	| f start line |
	f := self @env0:dynamicInstVarAt: #_gsfile.
	start := f @env0:position.
	line := f @env0:nextLine.
	line == nil ifTrue: [^ String @env0:new].
	(limit == nil @env0:or: [limit == None @env0:or: [limit @env0:< 0]]) ifFalse: [
		line @env0:size @env0:> limit ifTrue: [
			line := line @env0:copyFrom: 1 to: limit.
			f @env0:position: start @env0:+ limit]].
	^ line
%

category: 'Grail-Private'
method: FileIO
_remaining
	| f |
	f := self @env0:dynamicInstVarAt: #_gsfile.
	^ (f @env0:fileSize @env0:- f @env0:position) @env0:max: 0
%

category: 'Grail-Private'
method: FileIO
_readToEnd
	"Read everything from the current position.  Plain files size the
	read from fileSize; gzip-compressed GsFiles report the COMPRESSED
	size there, so streams flagged #_streamOnly chunk-read until EOF."

	| out chunk |
	(self @env0:dynamicInstVarAt: #_streamOnly) == true ifFalse: [
		^ self _rawRead: (self _remaining)].
	out := String @env0:new.
	[
		chunk := (self @env0:dynamicInstVarAt: #_gsfile) @env0:next: 65536.
		chunk == nil
	] @env0:whileFalse: [out := out @env0:, chunk].
	^ out
%

category: 'Grail-Reading'
method: FileIO
read
	^ self read: -1
%

category: 'Grail-Reading'
method: FileIO
read: n
	"read(size=-1) - read up to size bytes; -1 / None means to EOF."

	self _checkReadable.
	(n == nil @env0:or: [n == None @env0:or: [n @env0:< 0]]) ifTrue: [
		^ (self _readToEnd) @env0:asByteArray].
	^ (self _rawRead: n) @env0:asByteArray
%

category: 'Grail-Reading'
method: FileIO
readline
	^ self readline: -1
%

category: 'Grail-Reading'
method: FileIO
readline: limit
	self _checkReadable.
	^ (self _rawReadline: limit) @env0:asByteArray
%

category: 'Grail-Reading'
method: FileIO
readlines
	"Read all remaining lines into a list.  Goes through self readline
	so the TextIOWrapper subclass inherits this unchanged."

	| out line |
	self _checkReadable.
	out := list ___new___.
	[
		line := self readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out append: line].
	^ out
%

category: 'Grail-Writing'
method: FileIO
write: data
	"Write bytes; answer the byte count (CPython contract)."

	| bytes f r |
	self _checkWritable.
	(data isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'a bytes-like object is required, not ''str'''].
	bytes := (data isKindOf: ByteArray) ifTrue: [data] ifFalse: [data @env0:asByteArray].
	bytes @env0:isEmpty ifTrue: [^ 0].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	r := f @env0:nextPutAllBytes: bytes.
	r == nil ifTrue: [
		OSError ___signal___: ('write failed: ' @env0:, (self @env0:dynamicInstVarAt: #_name))].
	^ bytes @env0:size
%

category: 'Grail-Writing'
method: FileIO
writelines: lines
	"Write each element of lines in order.  Iterate LAZILY via the Python
	protocol (__iter__/__next__), NOT a Smalltalk #do:: a non-iterable
	argument (None/int) then raises a catchable TypeError instead of a #do:
	MessageNotUnderstood, and a dict yields its KEYS -- matching CPython
	(test_iter test_writelines).  A text file is a TextIOWrapper < FileIO, so
	it inherits this."

	| it |
	self _checkWritable.
	it := lines __iter__.
	[true] @env0:whileTrue: [ | line |
		line := [it __next__] @env0:on: StopIteration do: [:ex | ^ None].
		self write: line]
%

category: 'Grail-Position'
method: FileIO
seek: pos
	^ self seek: pos _: 0
%

category: 'Grail-Position'
method: FileIO
seek: pos _: whence
	"seek(pos, whence=0): 0=set, 1=cur, 2=end.  Byte offsets."

	| f |
	self _checkOpen.
	f := self @env0:dynamicInstVarAt: #_gsfile.
	whence @env0:= 0 ifTrue: [
		pos @env0:< 0 ifTrue: [
			ValueError ___signal___: ('negative seek position ' @env0:, pos @env0:printString)].
		f @env0:position: pos]
	ifFalse: [whence @env0:= 1 ifTrue: [
		"GsFile seekFromCurrent: rejects negative offsets; skip: does a
		proper relative seek in both directions."
		f @env0:skip: pos]
	ifFalse: [whence @env0:= 2 ifTrue: [f @env0:seekFromEnd: pos]
	ifFalse: [
		ValueError ___signal___: 'whence must be 0, 1, or 2'
	]]].
	^ f @env0:position
%

category: 'Grail-Position'
method: FileIO
tell
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_gsfile) @env0:position
%

category: 'Grail-Position'
method: FileIO
truncate
	^ self truncate: nil
%

category: 'Grail-Position'
method: FileIO
truncate: size
	OSError ___signal___: 'truncate() is not supported in Grail'
%

category: 'Grail-State'
method: FileIO
flush
	self _checkOpen.
	(self @env0:dynamicInstVarAt: #_gsfile) @env0:flush.
	^ None
%

category: 'Grail-State'
method: FileIO
close
	"Idempotent, like CPython."

	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [^ None].
	(self @env0:dynamicInstVarAt: #_gsfile) @env0:close.
	self @env0:dynamicInstVarAt: #_closed put: true.
	^ None
%

category: 'Grail-State'
method: FileIO
closed
	^ (self @env0:dynamicInstVarAt: #_closed)
%

category: 'Grail-State'
method: FileIO
name
	^ (self @env0:dynamicInstVarAt: #_name)
%

category: 'Grail-State'
method: FileIO
mode
	^ (self @env0:dynamicInstVarAt: #_mode)
%

category: 'Grail-State'
method: FileIO
fileno
	"io.IOBase.fileno() — the underlying OS file descriptor.

	This used to refuse outright.  It need not: every open server-side
	GsFile carries a real fd, which ``GsFile >> _open:mode:onClient:''
	fills in from the GsfGetFileDesc user action and ``IO >>
	fileDescriptor'' answers.

	Two cases still have no descriptor to report, and CPython's own
	contract for them is OSError (``UnsupportedOperation'' is an OSError
	subclass): a client-side file, where the fd lives in the client
	process and is -1 here, and a compressed stream, which GsFile drives
	through zlib rather than a plain descriptor."

	| fd |
	self _checkOpen.
	fd := (self @env0:dynamicInstVarAt: #_gsfile) @env0:fileDescriptor.
	((fd isKindOf: Integer) and: [fd @env0:>= 0]) ifFalse: [
		OSError ___signal___: 'fileno() is unavailable for this file'
	].
	^ fd
%

category: 'Grail-State'
method: FileIO
isatty
	"Whether this stream is attached to a terminal.  GsFile answers this
	for the standard streams (``isTerminal'' tests the file kind); it was
	previously hardcoded false, which made ``sys.stdout.isatty()'' lie in
	an interactive topaz session."

	self _checkOpen.
	^ ((self @env0:dynamicInstVarAt: #_gsfile) @env0:isTerminal) == true
%

category: 'Grail-State'
method: FileIO
readable
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_readable) == true
%

category: 'Grail-State'
method: FileIO
writable
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_writable) == true
%

category: 'Grail-State'
method: FileIO
seekable
	self _checkOpen.
	^ true
%

category: 'Grail-Context manager'
method: FileIO
__enter__
	^ self
%

category: 'Grail-Context manager'
method: FileIO
__exit__: a _: b _: c
	self close.
	^ false
%

category: 'Grail-Iter protocol'
method: FileIO
__iter__
	^ self
%

category: 'Grail-Iter protocol'
method: FileIO
__next__
	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [
		StopIteration ___signal___: ''
	].
	^ line
%

! ------------------- TextIOWrapper overrides (decode on read, encode on write)

category: 'Grail-Private'
method: TextIOWrapper
_decode: raw
	"Decode a raw byte String per the stored encoding.  latin-1 is an
	identity map (single-byte String chars ARE latin-1 code points)."

	| enc |
	raw @env0:isEmpty ifTrue: [^ ''].
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'latin-1' ifTrue: [^ raw].
	^ [raw @env0:decodeFromUTF8] @env0:on: Error do: [:ex |
		UnicodeDecodeError ___signal___: ('''utf-8'' codec can''t decode bytes from file ' @env0:, (self @env0:dynamicInstVarAt: #_name))]
%

category: 'Grail-Private'
method: TextIOWrapper
_completeUtf8Tail: raw
	"read(n) reads n BYTES, which can split a multi-byte UTF-8 sequence.
	If the tail is an incomplete sequence, read the missing continuation
	bytes so the decode below sees whole characters."

	| enc i have lead need extra |
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'utf-8' ifFalse: [^ raw].
	raw @env0:isEmpty ifTrue: [^ raw].
	i := raw @env0:size.
	have := 0.
	[(i @env0:> 0) @env0:and: [(((raw @env0:at: i) @env0:codePoint) @env0:bitAnd: 16rC0) @env0:= 16r80]]
		@env0:whileTrue: [have := have @env0:+ 1. i := i @env0:- 1].
	i @env0:= 0 ifTrue: [^ raw].
	lead := (raw @env0:at: i) @env0:codePoint.
	lead @env0:< 16rC0 ifTrue: [^ raw].
	need := lead @env0:>= 16rF0 ifTrue: [3] ifFalse: [lead @env0:>= 16rE0 ifTrue: [2] ifFalse: [1]].
	have @env0:>= need ifTrue: [^ raw].
	extra := self _rawRead: (need @env0:- have).
	^ raw @env0:, extra
%

category: 'Grail-Reading'
method: TextIOWrapper
read: n
	"read(size=-1) - read up to size characters (approximated as bytes,
	then completed to a whole trailing UTF-8 sequence); -1 / None means
	read to EOF."

	| raw |
	self _checkReadable.
	(n == nil @env0:or: [n == None @env0:or: [n @env0:< 0]]) ifTrue: [
		^ self _decode: (self _readToEnd)].
	raw := self _rawRead: n.
	raw := self _completeUtf8Tail: raw.
	^ self _decode: raw
%

category: 'Grail-Reading'
method: TextIOWrapper
readline: limit
	self _checkReadable.
	^ self _decode: (self _rawReadline: limit)
%

category: 'Grail-Writing'
method: TextIOWrapper
write: data
	"Write a str; answer the character count (CPython contract)."

	| f enc out cp |
	self _checkWritable.
	(data isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'write() argument must be str'].
	data @env0:isEmpty ifTrue: [^ 0].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'latin-1' ifTrue: [
		out := String @env0:new: data @env0:size.
		1 @env0:to: data @env0:size do: [:i |
			cp := (data @env0:at: i) @env0:codePoint.
			cp @env0:> 255 ifTrue: [
				UnicodeEncodeError ___signal___: '''latin-1'' codec can''t encode character'].
			out @env0:at: i put: (Character @env0:codePoint: cp)].
		f @env0:nextPutAll: out
	] ifFalse: [
		f @env0:nextPutAllUtf8: data].
	^ data @env0:size
%

category: 'Grail-State'
method: TextIOWrapper
encoding
	^ (self @env0:dynamicInstVarAt: #_encoding)
%

set compile_env: 0

! ===============================================================================
! io module class - exposes StringIO / BytesIO / FileIO / TextIOWrapper / open
! ===============================================================================

expectvalue /Class
doit
module subclass: 'io'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
io comment:
'Python io module - in-memory buffers and real file objects.

Provides StringIO and BytesIO with the file-like API Werkzeug WSGI
handling depends on: read / readline / readlines / write / writelines
/ seek / tell / truncate / getvalue / close / __enter__ / __exit__.
Both are iterable - iteration yields lines.

Also provides io.open (same implementation as the open() builtin) and
the FileIO / TextIOWrapper classes it answers, backed by server-side
GsFile.  See the FileIO class comment for the V1 deviations from
CPython (no truncate/fileno, no newline translation).'
%

expectvalue /Class
doit
io category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
io removeAllMethods: 0.
io removeAllMethods: 1.
io class removeAllMethods: 0.
io class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: io
initialize
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
%

! ------------------- The pure-Python io layer, out of the vendored _pyio
!
! Grail's Smalltalk io provides the CONCRETE streams -- StringIO, BytesIO,
! FileIO, TextIOWrapper -- over GsFile and in-memory collections.  It never
! provided the ABC layer above them or the BUFFERED layer between them: the
! four ABCs were behaviourless markers (an ``IOBase'' with no closed, no
! close, no context manager, no _checkClosed) and BufferedReader /
! BufferedWriter / BufferedRWPair were absent entirely.
!
! Both now come from CPython 3.14.6's own pure-Python implementation,
! vendored as src/python/stdlib/_pyio.py.  That is the same file CPython
! ships and runs its own io test suite against, so the semantics these
! classes are expected to have are not approximated here -- they are the
! upstream ones.  See the header of _pyio.py for the two adaptations.
!
! Imported ON DEMAND rather than at install time, exactly as warnings does
! with _py_warnings: install.gs imports no Python modules, and a module
! reference captured then would outlive the canonical-class generation that
! minted it.

category: 'Grail-Pure-Python Layer'
method: io
___pyioModule___
	"The vendored CPython ``_pyio'', imported on demand."

	| m path |
	m := importlib @env1:lookupModule: '_pyio'.
	m == nil ifTrue: [
		path := importlib @env1:___moduleNameToPath___: '_pyio'.
		path == nil ifTrue: [
			ImportError @env1:___signal___:
				'no _pyio module on the Grail search path'].
		m := importlib @env0:loadModuleFromPath: path name: '_pyio'].
	^ m
%

category: 'Grail-Pure-Python Layer'
method: io
___pyioClass___: aName
	"One named class out of _pyio.

	NOT cached into this module's dict.  The dict is PERSISTENT and the
	classes _pyio defines are rebuilt whenever the canonical generation
	moves (every install.sh), so a stored reference would go stale while
	still answering reads.  sys.modules already caches the module itself
	per session, which is where the cost actually is."

	^ self ___pyioModule___ @env1:___pyAttrLoad___: aName
%

! A bare ``io.BufferedReader'' must answer the CLASS, and that is decided by
! the method's CATEGORY, not by ___pythonValueAttrs___ (which Object's
! ___pyAttrLoad___ never consults for a module receiver).  A module's unary
! selector is PERFORMED unless its category is one of the function categories
! -- 'Grail-Methods', 'Grail-Built-in Functions', ... -- which wrap it as a
! BoundMethod so ``from random import random'' binds the function.  These are
! types, so performing is what we want, and any category outside that list
! gives it.
!
! For the same reason there is deliberately NO ``_BufferedReader: positional
! kw: kwargs'' varargs twin here, though warnings.gs has them for the
! _py_warnings functions it re-exports.  The varargs selector is probed FIRST
! of all, ahead of the unary one, so defining it makes every read answer a
! BoundMethod -- and ``class SocketIO(io.RawIOBase)'' then fails with "cannot
! subclass a non-class base (BoundMethod)", which names neither the module nor
! the cause.

category: 'Grail-Pure-Python Layer'
method: io
IOBase
	^ self ___pyioClass___: #'IOBase'
%

category: 'Grail-Pure-Python Layer'
method: io
RawIOBase
	^ self ___pyioClass___: #'RawIOBase'
%

category: 'Grail-Pure-Python Layer'
method: io
BufferedIOBase
	^ self ___pyioClass___: #'BufferedIOBase'
%

category: 'Grail-Pure-Python Layer'
method: io
TextIOBase
	^ self ___pyioClass___: #'TextIOBase'
%

category: 'Grail-Pure-Python Layer'
method: io
BufferedReader
	^ self ___pyioClass___: #'BufferedReader'
%

category: 'Grail-Pure-Python Layer'
method: io
BufferedWriter
	^ self ___pyioClass___: #'BufferedWriter'
%

category: 'Grail-Pure-Python Layer'
method: io
BufferedRWPair
	^ self ___pyioClass___: #'BufferedRWPair'
%

category: 'Grail-Pure-Python Layer'
method: io
BufferedRandom
	^ self ___pyioClass___: #'BufferedRandom'
%

category: 'Grail-Opening'
method: io
open: file
	"io.open(file) - alias for the open() builtin."

	^ FileIO ___open___: file mode: nil encoding: nil
%

category: 'Grail-Opening'
method: io
open: file _: mode
	^ FileIO ___open___: file mode: mode encoding: nil
%

category: 'Grail-Opening'
method: io
_open: positional kw: kwargs
	"Varargs/kwargs form - delegate to the builtins implementation so
	the argument parsing lives in exactly one place."

	^ (builtins instance) _open: positional kw: kwargs
%

category: 'Grail-Opening'
method: io
_text_encoding: positional kw: kwargs
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
%

category: 'Grail-Opening'
method: io
_gzip_open: path _: mode
	"Private hook for the pure-Python gzip module: a file object over
	a gzip-compressed GsFile."

	^ FileIO ___openCompressedPath___: path mode: mode
%

set compile_env: 0
