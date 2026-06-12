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
	^ self @env1:__new__: ''
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
	^ self @env1:read: -1
%

category: 'Grail-Reading'
method: StringIO
read: n
	"read(size=-1) - read up to size chars from the current position;
	-1 / None means read until EOF."

	| size remaining take result |
	self @env1:_checkOpen.
	remaining := (self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:- (self @env0:dynamicInstVarAt: #_pos).
	(n @env0:== nil @env0:or: [n @env0:== None @env0:or: [n @env0:< 0]]) ifTrue: [
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
	^ self @env1:readline: -1
%

category: 'Grail-Reading'
method: StringIO
readline: limit
	"readline(size=-1) - read up to and including the next \\n, or
	up to `size` chars (whichever first), or to EOF."

	| n start max |
	self @env1:_checkOpen.
	n := (self @env0:dynamicInstVarAt: #_buffer) @env0:size.
	(self @env0:dynamicInstVarAt: #_pos) @env0:>= n ifTrue: [^ ''].
	start := (self @env0:dynamicInstVarAt: #_pos).
	max := (limit @env0:== nil @env0:or: [limit @env0:== None @env0:or: [limit @env0:< 0]])
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
	self @env1:_checkOpen.
	out := list @env1:___new___.
	[
		line := self @env1:readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out @env1:append: line].
	^ out
%

category: 'Grail-Writing'
method: StringIO
write: data
	"Overwrite from the current position; grow on append."

	| s n endPos |
	self @env1:_checkOpen.
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
	"Write each element of lines (an iterable of str) in order."

	self @env1:_checkOpen.
	lines @env0:do: [:line | self @env1:write: line].
	^ None
%

category: 'Grail-Position'
method: StringIO
seek: pos
	^ self @env1:seek: pos _: 0
%

category: 'Grail-Position'
method: StringIO
seek: pos _: whence
	"seek(pos, whence=0): 0=set, 1=cur, 2=end."

	self @env1:_checkOpen.
	whence @env0:= 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (pos)]
	ifFalse: [whence @env0:= 1 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ pos)]
	ifFalse: [whence @env0:= 2 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:+ pos)]
	ifFalse: [
		ValueError @env1:___signal___: 'whence must be 0, 1, or 2'
	]]].
	(self @env0:dynamicInstVarAt: #_pos) @env0:< 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (0)].
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: StringIO
tell
	self @env1:_checkOpen.
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: StringIO
truncate
	^ self @env1:truncate: (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: StringIO
truncate: size
	self @env1:_checkOpen.
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
	self @env1:close.
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
	line := self @env1:readline.
	line @env0:isEmpty ifTrue: [
		StopIteration @env1:___signal___: ''
	].
	^ line
%

category: 'Grail-Private'
method: StringIO
_checkOpen
	(self @env0:dynamicInstVarAt: #_closed) @env0:== true ifTrue: [
		ValueError @env1:___signal___: 'I/O operation on closed file'
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
	^ self @env1:__new__: #[] @env0:asByteArray
%

category: 'Grail-Initialization'
classmethod: BytesIO
__new__: initial
	"BytesIO([initial]) - bytes buffer seeded with initial."

	| inst bytes |
	bytes := (initial @env0:isKindOf: ByteArray)
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
	^ self @env1:read: -1
%

category: 'Grail-Reading'
method: BytesIO
read: n
	"read(size=-1) - read up to size bytes from the current position."

	| size remaining take result |
	self @env1:_checkOpen.
	remaining := (self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:- (self @env0:dynamicInstVarAt: #_pos).
	(n @env0:== nil @env0:or: [n @env0:== None @env0:or: [n @env0:< 0]]) ifTrue: [
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
	^ self @env1:readline: -1
%

category: 'Grail-Reading'
method: BytesIO
readline: limit
	"readline(size=-1) - read up to next \\n byte (0x0A)."

	| n start max |
	self @env1:_checkOpen.
	n := (self @env0:dynamicInstVarAt: #_buffer) @env0:size.
	(self @env0:dynamicInstVarAt: #_pos) @env0:>= n ifTrue: [^ ByteArray @env0:new].
	start := (self @env0:dynamicInstVarAt: #_pos).
	max := (limit @env0:== nil @env0:or: [limit @env0:== None @env0:or: [limit @env0:< 0]])
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
	self @env1:_checkOpen.
	out := list @env1:___new___.
	[
		line := self @env1:readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out @env1:append: line].
	^ out
%

category: 'Grail-Writing'
method: BytesIO
write: data
	"Overwrite from current position with the given bytes."

	| bytes n endPos |
	self @env1:_checkOpen.
	bytes := (data @env0:isKindOf: ByteArray)
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
	self @env1:_checkOpen.
	lines @env0:do: [:line | self @env1:write: line].
	^ None
%

category: 'Grail-Position'
method: BytesIO
seek: pos
	^ self @env1:seek: pos _: 0
%

category: 'Grail-Position'
method: BytesIO
seek: pos _: whence
	self @env1:_checkOpen.
	whence @env0:= 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (pos)]
	ifFalse: [whence @env0:= 1 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_pos) @env0:+ pos)]
	ifFalse: [whence @env0:= 2 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:size @env0:+ pos)]
	ifFalse: [
		ValueError @env1:___signal___: 'whence must be 0, 1, or 2'
	]]].
	(self @env0:dynamicInstVarAt: #_pos) @env0:< 0 ifTrue: [self @env0:dynamicInstVarAt: #_pos put: (0)].
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: BytesIO
tell
	self @env1:_checkOpen.
	^ (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: BytesIO
truncate
	^ self @env1:truncate: (self @env0:dynamicInstVarAt: #_pos)
%

category: 'Grail-Position'
method: BytesIO
truncate: size
	self @env1:_checkOpen.
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
	self @env1:close.
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
	line := self @env1:readline.
	line @env0:isEmpty ifTrue: [
		StopIteration @env1:___signal___: ''
	].
	^ line
%

category: 'Grail-Private'
method: BytesIO
_checkOpen
	(self @env0:dynamicInstVarAt: #_closed) @env0:== true ifTrue: [
		ValueError @env1:___signal___: 'I/O operation on closed file'
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
	(anEncoding @env0:== nil @env0:or: [anEncoding @env0:== None]) ifTrue: [^ 'utf-8'].
	(anEncoding @env0:isKindOf: CharacterCollection) ifFalse: [
		TypeError @env1:___signal___: 'open() argument ''encoding'' must be str or None'].
	e := anEncoding @env0:asLowercase.
	((e @env0:= 'utf-8') @env0:or: [(e @env0:= 'utf8') @env0:or: [(e @env0:= 'ascii') @env0:or: [e @env0:= 'us-ascii']]]) ifTrue: [^ 'utf-8'].
	((e @env0:= 'latin-1') @env0:or: [(e @env0:= 'latin1') @env0:or: [(e @env0:= 'iso-8859-1') @env0:or: [e @env0:= 'l1']]]) ifTrue: [^ 'latin-1'].
	LookupError @env1:___signal___: ('unknown encoding: ' @env0:, anEncoding)
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
	(file @env0:isKindOf: CharacterCollection) ifFalse: [
		(file @env0:isKindOf: Number) ifTrue: [
			TypeError @env1:___signal___: 'integer file descriptors are not supported in Grail'].
		file := file @env1:__str__].
	mode := (modeArg @env0:== nil @env0:or: [modeArg @env0:== None]) ifTrue: ['r'] ifFalse: [modeArg].
	(mode @env0:isKindOf: CharacterCollection) ifFalse: [
		TypeError @env1:___signal___: 'open() argument ''mode'' must be str'].
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
		ifFalse: [ValueError @env1:___signal___: ('invalid mode: ''' @env0:, mode @env0:, '''')]]]]]]]].
	count := 0.
	hasR ifTrue: [count := count @env0:+ 1].
	hasW ifTrue: [count := count @env0:+ 1].
	hasA ifTrue: [count := count @env0:+ 1].
	hasX ifTrue: [count := count @env0:+ 1].
	count @env0:= 1 ifFalse: [
		ValueError @env1:___signal___: 'must have exactly one of create/read/write/append mode'].
	(hasB @env0:and: [hasT]) ifTrue: [
		ValueError @env1:___signal___: 'can''t have text and binary mode at once'].
	(hasB @env0:and: [(encodingArg @env0:== nil @env0:or: [encodingArg @env0:== None]) @env0:not]) ifTrue: [
		ValueError @env1:___signal___: 'binary mode doesn''t take an encoding argument'].
	"isServerDirectory: answers nil (not false) for a missing path, so
	guard with existsOnServer: first."
	((GsFile @env0:existsOnServer: file) @env0:and: [(GsFile @env0:isServerDirectory: file) @env0:== true]) ifTrue: [
		IsADirectoryError @env1:___signal___: ('[Errno 21] Is a directory: ''' @env0:, file @env0:, '''')].
	hasX ifTrue: [
		(GsFile @env0:existsOnServer: file) ifTrue: [
			FileExistsError @env1:___signal___: ('[Errno 17] File exists: ''' @env0:, file @env0:, '''')]].
	gsMode := hasR ifTrue: ['r'] ifFalse: [hasA ifTrue: ['a'] ifFalse: ['w']].
	hasPlus ifTrue: [gsMode := gsMode @env0:, '+'].
	gsMode := gsMode @env0:, 'b'.
	gsfile := GsFile @env0:openOnServer: file mode: gsMode.
	gsfile @env0:== nil ifTrue: [
		(hasR @env0:and: [(GsFile @env0:existsOnServer: file) @env0:not]) ifTrue: [
			FileNotFoundError @env1:___signal___: ('[Errno 2] No such file or directory: ''' @env0:, file @env0:, '''')].
		OSError @env1:___signal___: ('could not open file: ''' @env0:, file @env0:, '''')].
	inst := (hasB ifTrue: [FileIO] ifFalse: [TextIOWrapper]) @env0:new.
	inst @env0:dynamicInstVarAt: #_gsfile put: gsfile.
	inst @env0:dynamicInstVarAt: #_name put: file.
	inst @env0:dynamicInstVarAt: #_mode put: mode.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	inst @env0:dynamicInstVarAt: #_readable put: ((hasR) @env0:or: [hasPlus]).
	inst @env0:dynamicInstVarAt: #_writable put: ((hasR @env0:not) @env0:or: [hasPlus]).
	hasB ifFalse: [
		inst @env0:dynamicInstVarAt: #_encoding put: (FileIO @env1:___resolveEncoding___: encodingArg)].
	^ inst
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
	(file @env0:isKindOf: CharacterCollection) ifFalse: [file := file @env1:__str__].
	mode := (modeArg @env0:== nil @env0:or: [modeArg @env0:== None]) ifTrue: ['rb'] ifFalse: [modeArg].
	binary := (mode @env0:includes: $t) @env0:not.
	reading := mode @env0:includes: $r.
	base := reading
		ifTrue: ['rb']
		ifFalse: [(mode @env0:includes: $a) ifTrue: ['ab'] ifFalse: ['wb']].
	((GsFile @env0:existsOnServer: file) @env0:not @env0:and: [reading]) ifTrue: [
		FileNotFoundError @env1:___signal___: ('[Errno 2] No such file or directory: ''' @env0:, file @env0:, '''')].
	gsfile := GsFile @env0:openOnServerCompressed: file mode: base.
	gsfile @env0:== nil ifTrue: [
		OSError @env1:___signal___: ('could not open compressed file: ''' @env0:, file @env0:, '''')].
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
	(self @env0:dynamicInstVarAt: #_closed) @env0:== true ifTrue: [
		ValueError @env1:___signal___: 'I/O operation on closed file.']
%

category: 'Grail-Private'
method: FileIO
_checkReadable
	self @env1:_checkOpen.
	(self @env0:dynamicInstVarAt: #_readable) @env0:== true ifFalse: [
		OSError @env1:___signal___: 'not readable']
%

category: 'Grail-Private'
method: FileIO
_checkWritable
	self @env1:_checkOpen.
	(self @env0:dynamicInstVarAt: #_writable) @env0:== true ifFalse: [
		OSError @env1:___signal___: 'not writable']
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
	r @env0:== nil ifTrue: [^ String @env0:new].
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
	line @env0:== nil ifTrue: [^ String @env0:new].
	(limit @env0:== nil @env0:or: [limit @env0:== None @env0:or: [limit @env0:< 0]]) ifFalse: [
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
	(self @env0:dynamicInstVarAt: #_streamOnly) @env0:== true ifFalse: [
		^ self @env1:_rawRead: (self @env1:_remaining)].
	out := String @env0:new.
	[
		chunk := (self @env0:dynamicInstVarAt: #_gsfile) @env0:next: 65536.
		chunk @env0:== nil
	] @env0:whileFalse: [out := out @env0:, chunk].
	^ out
%

category: 'Grail-Reading'
method: FileIO
read
	^ self @env1:read: -1
%

category: 'Grail-Reading'
method: FileIO
read: n
	"read(size=-1) - read up to size bytes; -1 / None means to EOF."

	self @env1:_checkReadable.
	(n @env0:== nil @env0:or: [n @env0:== None @env0:or: [n @env0:< 0]]) ifTrue: [
		^ (self @env1:_readToEnd) @env0:asByteArray].
	^ (self @env1:_rawRead: n) @env0:asByteArray
%

category: 'Grail-Reading'
method: FileIO
readline
	^ self @env1:readline: -1
%

category: 'Grail-Reading'
method: FileIO
readline: limit
	self @env1:_checkReadable.
	^ (self @env1:_rawReadline: limit) @env0:asByteArray
%

category: 'Grail-Reading'
method: FileIO
readlines
	"Read all remaining lines into a list.  Goes through self readline
	so the TextIOWrapper subclass inherits this unchanged."

	| out line |
	self @env1:_checkReadable.
	out := list @env1:___new___.
	[
		line := self @env1:readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out @env1:append: line].
	^ out
%

category: 'Grail-Writing'
method: FileIO
write: data
	"Write bytes; answer the byte count (CPython contract)."

	| bytes f r |
	self @env1:_checkWritable.
	(data @env0:isKindOf: CharacterCollection) ifTrue: [
		TypeError @env1:___signal___: 'a bytes-like object is required, not ''str'''].
	bytes := (data @env0:isKindOf: ByteArray) ifTrue: [data] ifFalse: [data @env0:asByteArray].
	bytes @env0:isEmpty ifTrue: [^ 0].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	r := f @env0:nextPutAllBytes: bytes.
	r @env0:== nil ifTrue: [
		OSError @env1:___signal___: ('write failed: ' @env0:, (self @env0:dynamicInstVarAt: #_name))].
	^ bytes @env0:size
%

category: 'Grail-Writing'
method: FileIO
writelines: lines
	self @env1:_checkWritable.
	lines @env0:do: [:line | self @env1:write: line].
	^ None
%

category: 'Grail-Position'
method: FileIO
seek: pos
	^ self @env1:seek: pos _: 0
%

category: 'Grail-Position'
method: FileIO
seek: pos _: whence
	"seek(pos, whence=0): 0=set, 1=cur, 2=end.  Byte offsets."

	| f |
	self @env1:_checkOpen.
	f := self @env0:dynamicInstVarAt: #_gsfile.
	whence @env0:= 0 ifTrue: [
		pos @env0:< 0 ifTrue: [
			ValueError @env1:___signal___: ('negative seek position ' @env0:, pos @env0:printString)].
		f @env0:position: pos]
	ifFalse: [whence @env0:= 1 ifTrue: [
		"GsFile seekFromCurrent: rejects negative offsets; skip: does a
		proper relative seek in both directions."
		f @env0:skip: pos]
	ifFalse: [whence @env0:= 2 ifTrue: [f @env0:seekFromEnd: pos]
	ifFalse: [
		ValueError @env1:___signal___: 'whence must be 0, 1, or 2'
	]]].
	^ f @env0:position
%

category: 'Grail-Position'
method: FileIO
tell
	self @env1:_checkOpen.
	^ (self @env0:dynamicInstVarAt: #_gsfile) @env0:position
%

category: 'Grail-Position'
method: FileIO
truncate
	^ self @env1:truncate: nil
%

category: 'Grail-Position'
method: FileIO
truncate: size
	OSError @env1:___signal___: 'truncate() is not supported in Grail'
%

category: 'Grail-State'
method: FileIO
flush
	self @env1:_checkOpen.
	(self @env0:dynamicInstVarAt: #_gsfile) @env0:flush.
	^ None
%

category: 'Grail-State'
method: FileIO
close
	"Idempotent, like CPython."

	(self @env0:dynamicInstVarAt: #_closed) @env0:== true ifTrue: [^ None].
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
	OSError @env1:___signal___: 'fileno() is not supported in Grail'
%

category: 'Grail-State'
method: FileIO
isatty
	self @env1:_checkOpen.
	^ false
%

category: 'Grail-State'
method: FileIO
readable
	self @env1:_checkOpen.
	^ (self @env0:dynamicInstVarAt: #_readable) @env0:== true
%

category: 'Grail-State'
method: FileIO
writable
	self @env1:_checkOpen.
	^ (self @env0:dynamicInstVarAt: #_writable) @env0:== true
%

category: 'Grail-State'
method: FileIO
seekable
	self @env1:_checkOpen.
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
	self @env1:close.
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
	line := self @env1:readline.
	line @env0:isEmpty ifTrue: [
		StopIteration @env1:___signal___: ''
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
		UnicodeDecodeError @env1:___signal___: ('''utf-8'' codec can''t decode bytes from file ' @env0:, (self @env0:dynamicInstVarAt: #_name))]
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
	extra := self @env1:_rawRead: (need @env0:- have).
	^ raw @env0:, extra
%

category: 'Grail-Reading'
method: TextIOWrapper
read: n
	"read(size=-1) - read up to size characters (approximated as bytes,
	then completed to a whole trailing UTF-8 sequence); -1 / None means
	read to EOF."

	| raw |
	self @env1:_checkReadable.
	(n @env0:== nil @env0:or: [n @env0:== None @env0:or: [n @env0:< 0]]) ifTrue: [
		^ self @env1:_decode: (self @env1:_readToEnd)].
	raw := self @env1:_rawRead: n.
	raw := self @env1:_completeUtf8Tail: raw.
	^ self @env1:_decode: raw
%

category: 'Grail-Reading'
method: TextIOWrapper
readline: limit
	self @env1:_checkReadable.
	^ self @env1:_decode: (self @env1:_rawReadline: limit)
%

category: 'Grail-Writing'
method: TextIOWrapper
write: data
	"Write a str; answer the character count (CPython contract)."

	| f enc out cp |
	self @env1:_checkWritable.
	(data @env0:isKindOf: CharacterCollection) ifFalse: [
		TypeError @env1:___signal___: 'write() argument must be str'].
	data @env0:isEmpty ifTrue: [^ 0].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'latin-1' ifTrue: [
		out := String @env0:new: data @env0:size.
		1 @env0:to: data @env0:size do: [:i |
			cp := (data @env0:at: i) @env0:codePoint.
			cp @env0:> 255 ifTrue: [
				UnicodeEncodeError @env1:___signal___: '''latin-1'' codec can''t encode character'].
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
	self @env0:at: #SEEK_SET put: 0.
	self @env0:at: #SEEK_CUR put: 1.
	self @env0:at: #SEEK_END put: 2
%

category: 'Grail-Opening'
method: io
open: file
	"io.open(file) - alias for the open() builtin."

	^ FileIO @env1:___open___: file mode: nil encoding: nil
%

category: 'Grail-Opening'
method: io
open: file _: mode
	^ FileIO @env1:___open___: file mode: mode encoding: nil
%

category: 'Grail-Opening'
method: io
_open: positional kw: kwargs
	"Varargs/kwargs form - delegate to the builtins implementation so
	the argument parsing lives in exactly one place."

	^ (builtins @env1:instance) @env1:_open: positional kw: kwargs
%

category: 'Grail-Opening'
method: io
_gzip_open: path _: mode
	"Private hook for the pure-Python gzip module: a file object over
	a gzip-compressed GsFile."

	^ FileIO @env1:___openCompressedPath___: path mode: mode
%

set compile_env: 0
