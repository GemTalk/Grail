Extension { #name : 'StringIO' }

{ #category : 'Grail-Initialization' }
StringIO class >> ___construct___: initialValue newline: newlineArg [
	"The one constructor.  initial_value is a str or None (None is empty);
	anything else is CPython's TypeError, where it used to be printString'd
	into the buffer (``StringIO(5)'' held '5').

	newline: CPython translates newlines on write for None, '\r' and '\r\n'.
	This StringIO never translates, which is exactly the behaviour of '\n'
	(the default) and '' -- so those two are accepted and the others refused
	rather than silently ignored."

	| inst initial lf cr |
	(initialValue == None @env0:or: [initialValue == nil])
		ifTrue: [initial := '']
		ifFalse: [
			((initialValue @env0:isKindOf: CharacterCollection)
				@env0:or: [initialValue @env0:isKindOf: AbstractPyStr]) ifFalse: [
					TypeError ___signal___: 'initial_value must be str or None, not '
						@env0:, (initialValue @env1:__class__ @env1:__name__) @env0:asString].
			initial := initialValue].
	lf := String @env0:with: Character @env0:lf.
	cr := String @env0:with: Character @env0:cr.
	newlineArg == None ifFalse: [
		(newlineArg @env0:isKindOf: CharacterCollection) ifFalse: [
			TypeError ___signal___: 'newline must be str or None, not '
				@env0:, (newlineArg @env1:__class__ @env1:__name__) @env0:asString].
		((newlineArg @env0:= '') @env0:or: [newlineArg @env0:= lf]) ifFalse: [
			((newlineArg @env0:= cr) @env0:or: [newlineArg @env0:= (cr @env0:, lf)]) ifFalse: [
				ValueError ___signal___: 'illegal newline value: '
					@env0:, (newlineArg @env1:__repr__) @env0:asString]]].
	(newlineArg == None @env0:or: [(newlineArg @env0:= '') @env0:not
			@env0:and: [(newlineArg @env0:= lf) @env0:not]]) ifTrue: [
		NotImplementedError ___signal___:
			'Grail''s StringIO does not translate newlines; newline must be ''\n'' or '''''].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #_buffer put: initial @env0:asString @env0:copy.
	inst @env0:dynamicInstVarAt: #_pos put: 0.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	^ inst

]

{ #category : 'Grail-Initialization' }
StringIO class >> __new__ [
	^ self __new__: ''

]

{ #category : 'Grail-Initialization' }
StringIO class >> __new__: initialValue [
	"StringIO([initial]) - text buffer seeded with initial."

	^ self ___construct___: initialValue newline: (String @env0:with: Character @env0:lf)

]

{ #category : 'Grail-Initialization' }
StringIO class >> __new__: initialValue _: newlineArg [
	"StringIO(initial_value, newline)."

	^ self ___construct___: initialValue newline: newlineArg

]

{ #category : 'Grail-Initialization' }
StringIO class >> __new__: initialValue _: newlineArg _: extra [
	"A positional-only call with too many arguments reaches this arity, not
	``_new:kw:''; answer CPython's message rather than the generic one."

	^ self _new: { initialValue. newlineArg. extra } kw: nil

]

{ #category : 'Grail-Initialization' }
StringIO class >> _new: posArgs kw: kwArgs [
	"``StringIO(initial_value='', newline='\n')'' -- the keyword form, and
	any call with more positionals than the fixed arities.  CPython's names
	and messages; ``patch(..., new_callable=io.StringIO, initial_value=...)''
	calls it this way."

	| n initial newline |
	n := posArgs @env0:size.
	n @env0:> 2 ifTrue: [
		TypeError ___signal___: 'StringIO() takes at most 2 arguments ('
			@env0:, n @env0:printString @env0:, ' given)'].
	initial := n @env0:>= 1 ifTrue: [posArgs @env0:at: 1] ifFalse: [nil].
	newline := n @env0:>= 2 ifTrue: [posArgs @env0:at: 2] ifFalse: [nil].
	(kwArgs == nil @env0:or: [kwArgs == None]) ifFalse: [
		kwArgs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'initial_value' ifTrue: [
				n @env0:>= 1 ifTrue: [TypeError ___signal___:
					'argument for StringIO() given by name (''initial_value'') and position (1)'].
				initial := v]
			ifFalse: [key @env0:= 'newline' ifTrue: [
				n @env0:>= 2 ifTrue: [TypeError ___signal___:
					'argument for StringIO() given by name (''newline'') and position (2)'].
				newline := v]
			ifFalse: [
				TypeError ___signal___: ('StringIO() got an unexpected keyword argument '''
					@env0:, key @env0:, '''')]]]].
	^ self ___construct___: initial newline: (newline == nil
		ifTrue: [String @env0:with: Character @env0:lf]
		ifFalse: [newline])

]

{ #category : 'Grail-Private' }
StringIO >> ___ioRead___: n [
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

]

{ #category : 'Grail-Private' }
StringIO >> ___ioReadline___: limit [
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

]

{ #category : 'Grail-Private' }
StringIO >> ___ioSeek___: pos whence: whence [
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

]

{ #category : 'Grail-Private' }
StringIO >> ___ioTruncate___: size [
	self _checkOpen.
	size @env0:< (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: 1 to: size)].
	^ size

]

{ #category : 'Grail-Context manager' }
StringIO >> __enter__ [
	^ self

]

{ #category : 'Grail-Context manager' }
StringIO >> __exit__: a _: b _: c [
	self close.
	^ false

]

{ #category : 'Grail-Iter protocol' }
StringIO >> __iter__ [
	^ self

]

{ #category : 'Grail-Iter protocol' }
StringIO >> __next__ [
	"Iterating yields readline() until empty, then raises StopIteration."

	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [
		StopIteration ___signal___: ''
	].
	^ line

]

{ #category : 'Grail-Private' }
StringIO >> _checkOpen [
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file'
	]

]

{ #category : 'Grail-State' }
StringIO >> close [
	self @env0:dynamicInstVarAt: #_closed put: (true).
	^ None

]

{ #category : 'Grail-State' }
StringIO >> closed [
	^ (self @env0:dynamicInstVarAt: #_closed)

]

{ #category : 'Grail-Protocol' }
StringIO >> flush [
	"Nothing to push anywhere for an in-memory stream, and -- UNLIKE
	BytesIO >> flush beside it -- CPython does NOT raise on a closed one.
	StringIO is a TextIOWrapper there and BytesIO is the C type, and the two
	genuinely disagree; checked rather than assumed, because making them
	agree here would break a caller that flushes after close."

	^ None

]

{ #category : 'Grail-State' }
StringIO >> getvalue [
	"getvalue() - return the entire buffer contents as a single str."

	^ (self @env0:dynamicInstVarAt: #_buffer) @env0:copy

]

{ #category : 'Grail-Protocol' }
StringIO >> isatty [
	"Never a terminal.  Raises on a closed stream, as the predicates beside
	it do."

	self _checkOpen.
	^ false

]

{ #category : 'Grail-Reading' }
StringIO >> read [
	^ self ___ioRead___: -1

]

{ #category : 'Grail-Reading' }
StringIO >> read: n [
	^ self ___ioRead___: n

]

{ #category : 'Grail-Protocol' }
StringIO >> readable [
	"See seekable."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Reading' }
StringIO >> readline [
	^ self ___ioReadline___: -1

]

{ #category : 'Grail-Reading' }
StringIO >> readline: limit [
	^ self ___ioReadline___: limit

]

{ #category : 'Grail-Reading' }
StringIO >> readlines [
	"Read all remaining lines into a list."

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
StringIO >> seek: pos [
	^ self ___ioSeek___: pos whence: 0

]

{ #category : 'Grail-Position' }
StringIO >> seek: pos _: whence [
	^ self ___ioSeek___: pos whence: whence

]

{ #category : 'Grail-Protocol' }
StringIO >> seekable [
	"IOBase''s capability predicates.  An in-memory stream can do all three,
	and CPython answers True for each -- but that is not why they are here:
	CALLERS BRANCH ON THEM.  io.TextIOWrapper asks ``seekable'' to decide
	whether to write a BOM, and xml.sax.saxutils'' _gettextwriter copies the
	answer onto the buffer it wraps:

	    try:
	        buffer.seekable = out.seekable
	        buffer.tell = out.tell
	    except AttributeError:
	        pass

	Without the method that read raised AttributeError, which the except
	SWALLOWED -- so the wrapper kept the unbound class attribute and died
	later with ``unbound method ''''seekable'''' must be called with an
	instance'', a message naming nothing that was actually wrong.  A missing
	predicate is not a missing convenience; it is a silently wrong branch."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Position' }
StringIO >> tell [
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_pos)

]

{ #category : 'Grail-Position' }
StringIO >> truncate [
	^ self ___ioTruncate___: (self @env0:dynamicInstVarAt: #_pos)

]

{ #category : 'Grail-Position' }
StringIO >> truncate: size [
	^ self ___ioTruncate___: size

]

{ #category : 'Grail-Protocol' }
StringIO >> writable [
	"See seekable."

	self _checkOpen.
	^ true

]

{ #category : 'Grail-Writing' }
StringIO >> write: data [
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

]

{ #category : 'Grail-Writing' }
StringIO >> writelines: lines [
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
