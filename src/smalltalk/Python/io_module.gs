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
! io module class - exposes StringIO / BytesIO
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
'Python io module - in-memory text and byte buffers.

Provides StringIO and BytesIO with the file-like API Werkzeug WSGI
handling depends on: read / readline / readlines / write / writelines
/ seek / tell / truncate / getvalue / close / __enter__ / __exit__.
Both are iterable - iteration yields lines.

Open() / FileIO / TextIOWrapper are not implemented - Grail has no
filesystem layer at this level yet.'
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
	the class; the call site then invokes value:value: on it."

	self @env0:at: #StringIO put: StringIO.
	self @env0:at: #BytesIO put: BytesIO
%

set compile_env: 0
