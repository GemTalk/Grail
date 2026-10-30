Extension { #name : 'StringIO' }

{ #category : 'Grail-Initialization' }
StringIO class >> ___construct___: initialValue newline: newlineArg [
	"The one constructor.  initial_value is a str or None (None is empty);
	anything else is CPython's TypeError, where it used to be printString'd
	into the buffer (``StringIO(5)'' held '5').

	newline is CPython's, all five values.  None translates '\r\n' and '\r'
	to '\n' as it is written; '\r' and '\r\n' translate '\n' to themselves;
	'\n' and '' store the text as given.  readline ends a line at the stored
	terminator -- or, for '', at any of '\r', '\n' and '\r\n'.  This used to
	refuse all but '\n' and '', and treated '' as '\n', so a bare '\r' ended
	no line: email's feedparser reads its input through StringIO(newline='')
	and joined a CR-terminated line to the next (test_email test_newlines)."

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
	inst := self @env0:new.
	"#_newline holds the argument as given: nil for None, else the string."
	inst @env0:dynamicInstVarAt: #_newline
		put: (newlineArg == None ifTrue: [nil] ifFalse: [newlineArg @env0:asString]).
	inst @env0:dynamicInstVarAt: #_buffer
		put: (inst ___translatedOnWrite___: (inst ___carried___: initial)) @env0:copy.
	inst @env0:dynamicInstVarAt: #_pos put: 0.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	^ inst

]

{ #category : 'Grail-Introspection' }
StringIO class >> __module__ [

	"CPython's io classes come from the C accelerator, _io.  Grail's had no
	__module__ at all, so test.support.check__all__ -- which asks it of every
	name a module holds -- counted plistlib's imported BytesIO as plistlib's
	own public API (test_plistlib test__all__)."

	^ '_io'

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
StringIO >> ___carried___: aString [
	"aString as the buffer holds it.  The buffer is a Smalltalk string, which
	cannot hold a code point in the surrogate block, so a str holding one -- a
	PyStrSurrogate, which is what decoding with surrogateescape gives, and so
	what email's BytesParser hands its StringIO -- has each surrogate carried
	as a private-use placeholder of this stream's own, the way PyStrSurrogate
	runs a str method (___viaPlaceholders___:positional:kw:).  ___restored___:
	maps them back.  The placeholders count down from U+10FFFD, where no real
	text lives; a stream that also held those very code points would read them
	back as surrogates."

	| placeholders carrier |
	(aString @env0:isKindOf: PyStrSurrogate) ifFalse: [^ aString @env0:asString].
	placeholders := self ___surrogatePlaceholders___.
	carrier := Unicode7 @env0:new.
	aString @env0:___codePoints___ @env0:do: [:codePoint |
		((aString @env0:___isSurrogate___: codePoint)
			and: [(placeholders @env0:includesKey: codePoint) @env0:not]) ifTrue: [
				placeholders @env0:at: codePoint put: 16r10FFFD @env0:- placeholders @env0:size].
		carrier @env0:addCodePoint: (placeholders @env0:at: codePoint ifAbsent: [codePoint])].
	^ carrier

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
	^ self ___restored___: result

]

{ #category : 'Grail-Private' }
StringIO >> ___ioReadline___: limit [
	"readline(size=-1) - read up to and including the next line terminator,
	or up to `size` chars (whichever first), or to EOF.  The terminator is
	the newline mode's (see ___construct___:newline:): '\n' unless newline
	is '\r' or '\r\n', and for '' any of '\r', '\n' and '\r\n'."

	| buf n start max pos nl cr lf |
	self _checkOpen.
	buf := self @env0:dynamicInstVarAt: #_buffer.
	n := buf @env0:size.
	start := self @env0:dynamicInstVarAt: #_pos.
	start @env0:>= n ifTrue: [^ ''].
	max := (limit == nil @env0:or: [limit == None @env0:or: [limit @env0:< 0]])
		ifTrue: [n]
		ifFalse: [(start @env0:+ limit) @env0:min: n].
	nl := self @env0:dynamicInstVarAt: #_newline.
	cr := Character @env0:cr.
	lf := Character @env0:lf.
	pos := start.
	[pos @env0:< max] @env0:whileTrue: [ | ch |
		ch := buf @env0:at: pos @env0:+ 1.
		pos := pos @env0:+ 1.
		(nl @env0:notNil @env0:and: [nl @env0:isEmpty])
			ifTrue: [
				ch @env0:= lf ifTrue: [^ self ___readlineTo___: pos from: start].
				ch @env0:= cr ifTrue: [
					(pos @env0:< max @env0:and: [(buf @env0:at: pos @env0:+ 1) @env0:= lf])
						ifTrue: [pos := pos @env0:+ 1].
					^ self ___readlineTo___: pos from: start]]
			ifFalse: [
				(nl @env0:notNil @env0:and: [(nl @env0:at: 1) @env0:= cr])
					ifTrue: [
						(ch @env0:= cr @env0:and: [nl @env0:size @env0:= 1])
							ifTrue: [^ self ___readlineTo___: pos from: start].
						(ch @env0:= lf @env0:and: [nl @env0:size @env0:= 2
							@env0:and: [pos @env0:>= 2 @env0:and: [(buf @env0:at: pos @env0:- 1) @env0:= cr]]])
							ifTrue: [^ self ___readlineTo___: pos from: start]]
					ifFalse: [ch @env0:= lf ifTrue: [^ self ___readlineTo___: pos from: start]]]].
	^ self ___readlineTo___: pos from: start

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

{ #category : 'Grail-Private' }
StringIO >> ___readlineTo___: pos from: start [
	"The line from 0-based ``start'' up to ``pos'', leaving the stream at
	``pos'' -- ___ioReadline___:'s answer."

	self @env0:dynamicInstVarAt: #_pos put: pos.
	^ self ___restored___: ((self @env0:dynamicInstVarAt: #_buffer)
		@env0:copyFrom: start @env0:+ 1 to: pos)

]

{ #category : 'Grail-Private' }
StringIO >> ___restored___: aString [
	"aString read out of the buffer, each placeholder ___carried___: put there
	mapped back to its surrogate -- a PyStrSurrogate when there was one."

	| placeholders surrogates codePoints restored |
	placeholders := self @env0:dynamicInstVarAt: #_surrogates.
	(placeholders @env0:isNil or: [placeholders @env0:isEmpty]) ifTrue: [^ aString].
	surrogates := Dictionary @env0:new.
	placeholders @env0:keysAndValuesDo: [:surrogate :placeholder |
		surrogates @env0:at: placeholder put: surrogate].
	restored := false.
	codePoints := OrderedCollection @env0:new.
	aString @env0:do: [:character | | codePoint |
		codePoint := character @env0:codePoint.
		(surrogates @env0:includesKey: codePoint) ifTrue: [
			restored := true.
			codePoint := surrogates @env0:at: codePoint].
		codePoints @env0:add: codePoint].
	restored ifFalse: [^ aString].
	^ PyStrSurrogate @env0:___fromCodePoints___: codePoints

]

{ #category : 'Grail-Private' }
StringIO >> ___surrogatePlaceholders___ [
	"Surrogate code point -> its placeholder in this stream's buffer; see
	___carried___:."

	^ (self @env0:dynamicInstVarAt: #_surrogates)
		@env0:ifNil: [self @env0:dynamicInstVarAt: #_surrogates put: Dictionary @env0:new]

]

{ #category : 'Grail-Private' }
StringIO >> ___translatedOnWrite___: aString [
	"aString as the newline mode stores it (see ___construct___:newline:).
	Each write is translated on its own, as CPython's is: its decoder is
	always told the input is final, so a '\r' ending one write and a '\n'
	starting the next are two line ends under newline=None, not one."

	| nl cr lf out i n |
	nl := self @env0:dynamicInstVarAt: #_newline.
	cr := Character @env0:cr.
	lf := Character @env0:lf.
	(nl @env0:notNil @env0:and: [nl @env0:isEmpty @env0:or: [nl @env0:= (String @env0:with: lf)]])
		ifTrue: [^ aString].
	nl @env0:isNil
		ifTrue: [(aString @env0:includes: cr) ifFalse: [^ aString]]
		ifFalse: [(aString @env0:includes: lf) ifFalse: [^ aString]].
	out := Unicode7 @env0:new.
	n := aString @env0:size.
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [ | ch |
		ch := aString @env0:at: i.
		nl @env0:isNil
			ifTrue: [
				ch @env0:= cr
					ifTrue: [
						out @env0:addCodePoint: 10.
						(i @env0:< n @env0:and: [(aString @env0:at: i @env0:+ 1) @env0:= lf])
							ifTrue: [i := i @env0:+ 1]]
					ifFalse: [out @env0:addCodePoint: ch @env0:codePoint]]
			ifFalse: [
				ch @env0:= lf
					ifTrue: [nl @env0:do: [:c | out @env0:addCodePoint: c @env0:codePoint]]
					ifFalse: [out @env0:addCodePoint: ch @env0:codePoint]].
		i := i @env0:+ 1].
	^ out

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
	"Its length, not isEmpty: a line may be a PyStrSurrogate (___restored___:),
	which is no Smalltalk collection."
	line __len__ @env0:= 0 ifTrue: [
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

	^ self ___restored___: (self @env0:dynamicInstVarAt: #_buffer) @env0:copy

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
		line __len__ @env0:= 0
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
	"Overwrite from the current position; grow on append.  Only a str is
	written: CPython's StringIO.write refuses anything else, and asks before
	it asks whether the stream is closed (Modules/_io/stringio.c:554).  Grail
	wrote the argument's Smalltalk print string -- ``aByteArray'' for b'x',
	``aNoneType'' for None -- so base64.encode into a StringIO succeeded with
	garbage where test_base64 expects the TypeError.

	The buffer grows in place.  It used to be replaced by ``buffer ,
	padding'' on every append, a copy of the whole buffer, so a stream built
	from many small writes cost the square of its size: email's feedparser
	writes each chunk it is fed into one, and test_email's test_long_lines
	(20000 writes of 1000) spent minutes there.  The answer is the length of
	the str given, as CPython's is, not of the newline-translated text."

	| carried s n buf pos keep |
	((data @env0:isKindOf: CharacterCollection) or: [data @env0:isKindOf: AbstractPyStr]) ifFalse: [
		^ TypeError ___signal___: 'string argument expected, got '''
			@env0:, data ___pyTypeNameForError___ @env0:, ''''].
	self _checkOpen.
	carried := self ___carried___: data.
	s := self ___translatedOnWrite___: carried.
	n := s @env0:size.
	buf := self @env0:dynamicInstVarAt: #_buffer.
	pos := self @env0:dynamicInstVarAt: #_pos.
	"A write after a seek past the end fills the gap with NULs."
	pos @env0:> buf @env0:size ifTrue: [
		buf @env0:addAll: (Unicode7 @env0:new: pos @env0:- buf @env0:size)].
	"Overwrite what the write covers, then append the rest."
	keep := (buf @env0:size @env0:- pos) @env0:min: n.
	keep @env0:> 0 ifTrue: [
		buf @env0:replaceFrom: pos @env0:+ 1 to: pos @env0:+ keep with: s startingAt: 1].
	keep @env0:< n ifTrue: [
		buf @env0:addAll: (keep @env0:= 0
			ifTrue: [s]
			ifFalse: [s @env0:copyFrom: keep @env0:+ 1 to: n])].
	self @env0:dynamicInstVarAt: #_buffer put: buf.
	self @env0:dynamicInstVarAt: #_pos put: pos @env0:+ n.
	^ carried @env0:size

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
