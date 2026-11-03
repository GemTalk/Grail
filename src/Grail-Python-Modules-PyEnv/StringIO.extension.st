Extension { #name : 'StringIO' }

{ #category : 'Grail-Error Messages' }
StringIO class >> ___closedStreamMessage [
	"IOBase's _checkClosed says it with a period, where StringIO's own
	checks do not (Modules/_io/iobase.c, iobase_check_closed)."

	^ 'I/O operation on closed file.'

]

{ #category : 'Grail-Initialization' }
StringIO class >> ___construct___: initialValue newline: newlineArg [
	"The one constructor: a stream that has run __init__ with initialValue
	and newlineArg (see StringIO >> ___startOver:newline:)."

	| stream |
	stream := self @env0:new.
	stream ___startOver: initialValue newline: newlineArg.
	^ stream

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___illegalNewlineMessageFor: aNewline [
	"Modules/_io/stringio.c:702."

	^ 'illegal newline value: ' @env0:, (aNewline @env1:__repr__) @env0:asString

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___initialValueTypeMessageFor: anObject [
	"Modules/_io/stringio.c:707."

	^ 'initial_value must be str or None, not ' @env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___invalidWhenceMessageFor: aWhence [
	"Modules/_io/stringio.c:508."

	^ 'Invalid whence (' @env0:, aWhence @env0:printString @env0:, ', should be 0, 1 or 2)'

]

{ #category : 'Grail-Private' }
StringIO class >> ___legalNewlines [
	"The newline arguments other than None that CPython takes
	(Modules/_io/stringio.c:697-704)."

	| lf cr |
	lf := String @env0:with: Character @env0:lf.
	cr := String @env0:with: Character @env0:cr.
	^ Array @env0:with: String @env0:new with: lf with: cr with: cr @env0:, lf

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___negativeSeekMessageFor: aPosition [
	"An absolute seek before the start (Modules/_io/stringio.c:513)."

	^ 'Negative seek position ' @env0:, aPosition @env0:printString

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___negativeSizeMessageFor: aSize [
	"Modules/_io/stringio.c:468."

	^ 'Negative size value ' @env0:, aSize @env0:printString

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___negativeStatePositionMessage [
	"Modules/_io/stringio.c:962."

	^ 'position value cannot be negative'

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___newlineTypeMessageFor: anObject [
	"Modules/_io/stringio.c:688."

	^ 'newline must be str or None, not ' @env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___relativeSeekMessage [
	"A text stream seeks relative to the current position or the end only
	by 0 (Modules/_io/stringio.c:518)."

	^ 'Can''t do nonzero cur-relative seeks'

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___stateDictionaryMessageFor: anObject [
	"Modules/_io/stringio.c:972."

	^ 'fourth item of state should be a dict, got a ' @env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___stateMessageFor: aState [
	"__setstate__ takes a tuple of at least four items, and names the
	stream's type and the state's in refusing anything else
	(Modules/_io/stringio.c:904)."

	^ (self == StringIO ifTrue: ['_io.StringIO'] ifFalse: [self @env1:__name__])
		@env0:, '.__setstate__ argument should be 4-tuple, got '
		@env0:, (bytes ___pyTypeNameOf___: aState)

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___statePositionMessageFor: anObject [
	"Modules/_io/stringio.c:953."

	^ 'third item of state must be an integer, got ' @env0:, (bytes ___pyTypeNameOf___: anObject)

]

{ #category : 'Grail-Error Messages' }
StringIO class >> ___stringExpectedMessageFor: anObject [
	"Modules/_io/stringio.c:558."

	^ 'string argument expected, got ''' @env0:, anObject ___pyTypeNameForError___ @env0:, ''''

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
	"StringIO([initial]) - text buffer seeded with initial.

	``StringIO.__new__(cls)'' -- how pickle and copy rebuild an instance --
	arrives here with the CLASS as the value.  CPython's stringio_new
	ignores its arguments and allocates cls, so this does too: a class is
	never a str.  It used to be refused as one (``initial_value must be str
	or None, not type''), so no StringIO could be unpickled."

	((initialValue @env0:isKindOf: Behavior)
		and: [initialValue == self or: [initialValue @env0:inheritsFrom: self]])
			ifTrue: [^ initialValue __new__].
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
	any call with more positionals than the fixed arities;
	``patch(..., new_callable=io.StringIO, initial_value=...)'' calls it this
	way.  StringIO >> ___init__:kw: binds and refuses the arguments."

	| stream |
	stream := self @env0:new.
	stream ___init__: posArgs kw: kwArgs.
	^ stream

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

{ #category : 'Grail-Initialization' }
StringIO >> ___init__: positional kw: keywords [
	"StringIO.__init__(self, initial_value='', newline='\n') -- which starts
	a live stream over, bound and refused as Argument Clinic binds it."

	| arguments |
	arguments := TypeError @env0:___argumentsOf___: (positional @env0:ifNil: [#()])
		keywords: keywords
		named: #('initial_value' 'newline')
		positionalOnly: 0
		required: 0
		for: 'StringIO'.
	self
		___startOver: (arguments @env0:at: 1)
		newline: ((arguments @env0:at: 2) @env0:ifNil: [String @env0:with: Character @env0:lf]).
	^ None

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
	"readline(size=-1) - read up to and including the next line ending, or
	up to `size` chars (whichever first), or to EOF (_stringio_readline).
	Which ending ends a line is the newline argument's: any of \r, \n and
	\r\n for '', the newline itself for '\r' and '\r\n', and \n otherwise --
	newline=None has translated the other two away on write
	(_PyIO_find_line_ending)."

	| buffer size start maximum end |
	self _checkOpen.
	buffer := self @env0:dynamicInstVarAt: #_buffer.
	size := buffer @env0:size.
	start := self @env0:dynamicInstVarAt: #_pos.
	start @env0:>= size ifTrue: [^ ''].
	maximum := (limit == nil @env0:or: [limit == None @env0:or: [limit @env0:< 0]])
		ifTrue: [size]
		ifFalse: [(start @env0:+ limit) @env0:min: size].
	end := self ___lineEndIn: buffer from: start @env0:+ 1 to: maximum.
	self @env0:dynamicInstVarAt: #_pos put: end.
	^ self ___restored___: (buffer @env0:copyFrom: start @env0:+ 1 to: end)

]

{ #category : 'Grail-Private' }
StringIO >> ___ioSeek___: pos whence: whence [
	"seek(pos, whence=0) -- both as ints through __index__, so a float is a
	TypeError; an unknown whence and an absolute position before the start
	are ValueErrors, and a text stream seeks relative to the current
	position or the end only by 0, an OSError otherwise
	(_io_StringIO_seek_impl).  Grail took any relative seek and clamped a
	negative absolute one to the start."

	| position mode |
	position := pos ___asIndex___.
	mode := whence ___asIndex___.
	self _checkOpen.
	(mode @env0:between: 0 and: 2) ifFalse: [
		^ ValueError ___signal___: (self @env0:class ___invalidWhenceMessageFor: mode)].
	(position @env0:< 0 and: [mode @env0:= 0]) ifTrue: [
		^ ValueError ___signal___: (self @env0:class ___negativeSeekMessageFor: position)].
	(mode @env0:~= 0 and: [position @env0:~= 0]) ifTrue: [
		^ OSError ___signal___: self @env0:class ___relativeSeekMessage].
	mode @env0:= 1 ifTrue: [position := self @env0:dynamicInstVarAt: #_pos].
	mode @env0:= 2 ifTrue: [position := (self @env0:dynamicInstVarAt: #_buffer) @env0:size].
	self @env0:dynamicInstVarAt: #_pos put: position.
	^ position

]

{ #category : 'Grail-Private' }
StringIO >> ___ioTruncate___: size [
	"truncate(pos=None) -- cut the stream to at most pos characters, the
	current position for None, leaving the position where it is
	(_io_StringIO_truncate_impl)."

	| newSize |
	newSize := size ___asSizeOr: (self @env0:dynamicInstVarAt: #_pos).
	self _checkOpen.
	newSize @env0:< 0 ifTrue: [
		^ ValueError ___signal___: (self @env0:class ___negativeSizeMessageFor: newSize)].
	newSize @env0:< (self @env0:dynamicInstVarAt: #_buffer) @env0:size ifTrue: [
		self @env0:dynamicInstVarAt: #_buffer
			put: ((self @env0:dynamicInstVarAt: #_buffer) @env0:copyFrom: 1 to: newSize)].
	^ newSize

]

{ #category : 'Grail-Private' }
StringIO >> ___lineEndIn: aBuffer from: aFirst to: aLast [
	"The index of the last character of the line that starts at aFirst in
	aBuffer, looking no further than aLast; aLast when no line ends sooner."

	| newline index character |
	newline := self ___newline___.
	(newline == None or: [newline @env0:= (String @env0:with: Character @env0:lf)]) ifTrue: [
		index := aBuffer @env0:indexOf: Character @env0:lf startingAt: aFirst.
		^ (index @env0:between: 1 and: aLast) ifTrue: [index] ifFalse: [aLast]].
	newline @env0:isEmpty ifFalse: [
		index := aBuffer @env0:indexOfSubCollection: newline startingAt: aFirst.
		^ (index @env0:> 0 and: [index @env0:+ newline @env0:size @env0:- 1 @env0:<= aLast])
			ifTrue: [index @env0:+ newline @env0:size @env0:- 1]
			ifFalse: [aLast]].
	index := aFirst.
	[index @env0:<= aLast] @env0:whileTrue: [
		character := aBuffer @env0:at: index.
		character @env0:= Character @env0:lf ifTrue: [^ index].
		character @env0:= Character @env0:cr ifTrue: [
			^ (index @env0:< aLast and: [(aBuffer @env0:at: index @env0:+ 1) @env0:= Character @env0:lf])
				ifTrue: [index @env0:+ 1]
				ifFalse: [index]].
		index := index @env0:+ 1].
	^ aLast

]

{ #category : 'Grail-Private' }
StringIO >> ___newline___ [
	"The newline argument this stream was made with: None, or one of '',
	'\n', '\r' and '\r\n'.  A stream built before it was recorded is '\n'."

	^ (self @env0:dynamicInstVarAt: #_newline)
		@env0:ifNil: [String @env0:with: Character @env0:lf]

]

{ #category : 'Grail-Private' }
StringIO >> ___newlinesTranslated: aString [
	"aString as the stream stores it (write_str): through CPython's newline
	decoder for newline None or '' -- which notes each kind of line ending it
	sees, and for None turns \r\n and \r into \n -- and then, for newline
	'\r' or '\r\n', with every \n written as that newline."

	| newline lf cr crlf translated crlfCount |
	newline := self ___newline___.
	lf := String @env0:with: Character @env0:lf.
	newline @env0:= lf ifTrue: [^ aString].
	cr := String @env0:with: Character @env0:cr.
	crlf := cr @env0:, lf.
	translated := aString.
	(newline == None or: [newline @env0:isEmpty]) ifTrue: [
		crlfCount := self ___occurrencesOf: crlf in: aString.
		self ___noteNewlines: (Array
			@env0:with: (aString @env0:occurrencesOf: Character @env0:cr) @env0:- crlfCount
			with: (aString @env0:occurrencesOf: Character @env0:lf) @env0:- crlfCount
			with: crlfCount).
		newline == None ifTrue: [
			translated := (translated @env0:copyReplaceAll: crlf with: lf)
				@env0:copyReplaceAll: cr with: lf]].
	(newline == None or: [newline @env0:isEmpty]) ifFalse: [
		translated := translated @env0:copyReplaceAll: lf with: newline].
	^ translated

]

{ #category : 'Grail-Private' }
StringIO >> ___noteNewlines: someCounts [
	"Record which line endings have been written, from the counts of lone
	\r, lone \n and \r\n in what was: the bits CPython's
	IncrementalNewlineDecoder keeps for its newlines attribute (CR 1, LF 2,
	CRLF 4 here)."

	| seen |
	seen := (self @env0:dynamicInstVarAt: #_seen) @env0:ifNil: [0].
	(someCounts @env0:at: 1) @env0:> 0 ifTrue: [seen := seen @env0:bitOr: 1].
	(someCounts @env0:at: 2) @env0:> 0 ifTrue: [seen := seen @env0:bitOr: 2].
	(someCounts @env0:at: 3) @env0:> 0 ifTrue: [seen := seen @env0:bitOr: 4].
	self @env0:dynamicInstVarAt: #_seen put: seen

]

{ #category : 'Grail-Private' }
StringIO >> ___occurrencesOf: aSubstring in: aString [
	"How many times aSubstring occurs in aString, not overlapping."

	| count index |
	count := 0.
	index := aString @env0:indexOfSubCollection: aSubstring startingAt: 1.
	[index @env0:> 0] @env0:whileTrue: [
		count := count @env0:+ 1.
		index := aString @env0:indexOfSubCollection: aSubstring startingAt: index @env0:+ aSubstring @env0:size].
	^ count

]

{ #category : 'Grail-Reflection' }
StringIO >> ___pyHiddenStateNames___ [
	"The dynamic instVars that are Grail's implementation of the stream, not
	attributes of the instance: __getstate__ leaves them out of the
	instance's dict, which holds only what was assigned."

	^ #( #_buffer #_pos #_closed #_surrogates #_newline #_seen )

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
StringIO >> ___startOver: initialValue newline: newlineArg [
	"__init__'s work, which it does again on a live stream
	(_io_StringIO___init___impl): newline is checked as a str or None and
	then as one CPython knows, initial_value as a str or None, and only then
	does the stream start over -- open, empty, and holding initial_value as
	written, newlines translated, from position 0.  newline None, '\r' and
	'\r\n' used to be refused as NotImplementedError."

	| newline |
	newline := newlineArg.
	newlineArg == None ifFalse: [
		newlineArg @env0:___isPyStr___ ifFalse: [
			^ TypeError ___signal___: (self @env0:class ___newlineTypeMessageFor: newlineArg)].
		newline := self @env0:class ___legalNewlines
			@env0:detect: [:each | each @env0:= newlineArg]
			ifNone: [^ ValueError ___signal___: (self @env0:class ___illegalNewlineMessageFor: newlineArg)]].
	(initialValue == None or: [initialValue == nil or: [initialValue @env0:___isPyStr___]]) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___initialValueTypeMessageFor: initialValue)].
	self @env0:dynamicInstVarAt: #_newline put: newline.
	self @env0:dynamicInstVarAt: #_seen put: 0.
	self @env0:dynamicInstVarAt: #_buffer put: String @env0:new.
	self @env0:dynamicInstVarAt: #_pos put: 0.
	self @env0:dynamicInstVarAt: #_closed put: false.
	(initialValue == None or: [initialValue == nil]) ifTrue: [^ self].
	self write: initialValue.
	self @env0:dynamicInstVarAt: #_pos put: 0

]

{ #category : 'Grail-Private' }
StringIO >> ___surrogatePlaceholders___ [
	"Surrogate code point -> its placeholder in this stream's buffer; see
	___carried___:."

	^ (self @env0:dynamicInstVarAt: #_surrogates)
		@env0:ifNil: [self @env0:dynamicInstVarAt: #_surrogates put: Dictionary @env0:new]

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

{ #category : 'Grail-Serialization' }
StringIO >> __getstate__ [
	"(value, newline, position, dict) -- what pickle and copy rebuild a
	stream from, the dict None while no attribute was ever set
	(_io_StringIO___getstate___impl)."

	^ tuple @env0:withAll: {
		self getvalue.
		self ___newline___.
		self @env0:dynamicInstVarAt: #_pos.
		super __getstate__ }

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

{ #category : 'Grail-Serialization' }
StringIO >> __setstate__: aState [
	"Restore what __getstate__ answered: __init__ runs with the value and
	the newline, the value then replaces the buffer as it stands -- it was
	translated once already -- and the position and the dict's attributes
	follow (_io_StringIO___setstate___impl, whose refusals and their order
	this keeps)."

	| value position attributes |
	self _checkOpen.
	((aState isKindOf: Array) and: [aState @env0:size @env0:>= 4]) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___stateMessageFor: aState)].
	value := aState @env0:at: 1.
	self ___startOver: value newline: (aState @env0:at: 2).
	self @env0:dynamicInstVarAt: #_buffer
		put: (value == None ifTrue: [String @env0:new] ifFalse: [(self ___carried___: value) @env0:copy]).
	position := aState @env0:at: 3.
	(position isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___statePositionMessageFor: position)].
	position @env0:< 0 ifTrue: [
		^ ValueError ___signal___: self @env0:class ___negativeStatePositionMessage].
	self @env0:dynamicInstVarAt: #_pos put: position.
	attributes := aState @env0:at: 4.
	attributes == None ifTrue: [^ None].
	(attributes isKindOf: dict) ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___stateDictionaryMessageFor: attributes)].
	attributes keys @env0:do: [:name |
		self __setattr__: name _: (attributes __getitem__: name)].
	^ None

]

{ #category : 'Grail-Protocol' }
StringIO >> _checkClosed [
	"IOBase's closed check, which _pyio's wrappers call on the stream they
	wrap: None, or the ValueError for a closed stream, in IOBase's words."

	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		^ ValueError ___signal___: self @env0:class ___closedStreamMessage].
	^ None

]

{ #category : 'Grail-Private' }
StringIO >> _checkOpen [
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file'
	]

]

{ #category : 'Grail-Protocol' }
StringIO >> _checkReadable [
	"IOBase's capability checks: the predicate's answer, refused as it
	refuses on a closed stream."

	^ self readable

]

{ #category : 'Grail-Protocol' }
StringIO >> _checkSeekable [
	"See _checkReadable."

	^ self seekable

]

{ #category : 'Grail-Protocol' }
StringIO >> _checkWritable [
	"See _checkReadable."

	^ self writable

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
StringIO >> detach [
	"An in-memory stream has no buffer to hand over (TextIOBase)."

	^ UnsupportedOperation ___signal___: (UnsupportedOperation @env0:___messageFor: 'detach')

]

{ #category : 'Grail-Protocol' }
StringIO >> encoding [
	"None: a StringIO encodes nothing (TextIOBase), open or closed."

	^ None

]

{ #category : 'Grail-Protocol' }
StringIO >> errors [
	"None, as encoding is."

	^ None

]

{ #category : 'Grail-Protocol' }
StringIO >> fileno [
	"An in-memory stream has no file descriptor (IOBase), open or closed."

	^ UnsupportedOperation ___signal___: (UnsupportedOperation @env0:___messageFor: 'fileno')

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
	"getvalue() - return the entire buffer contents as a single str,
	refused once the stream is closed."

	self _checkOpen.
	^ self ___restored___: (self @env0:dynamicInstVarAt: #_buffer) @env0:copy

]

{ #category : 'Grail-Protocol' }
StringIO >> isatty [
	"Never a terminal.  Raises on a closed stream, as the predicates beside
	it do."

	self _checkOpen.
	^ false

]

{ #category : 'Grail-Protocol' }
StringIO >> line_buffering [
	"False: nothing is flushed line by line; refused once closed."

	self _checkOpen.
	^ false

]

{ #category : 'Grail-Protocol' }
StringIO >> newlines [
	"The kinds of line ending written so far, as CPython's newline decoder
	reports them -- None, one of '\r', '\n' and '\r\n', or a tuple of those
	seen in that order -- for a stream with newline None or ''; None for any
	other (_io_StringIO_newlines_get_impl)."

	| seen kinds |
	self _checkOpen.
	(self ___newline___ == None or: [self ___newline___ @env0:isEmpty]) ifFalse: [^ None].
	seen := (self @env0:dynamicInstVarAt: #_seen) @env0:ifNil: [0].
	kinds := OrderedCollection @env0:new.
	(seen @env0:bitAnd: 1) @env0:= 0 ifFalse: [kinds @env0:add: (String @env0:with: Character @env0:cr)].
	(seen @env0:bitAnd: 2) @env0:= 0 ifFalse: [kinds @env0:add: (String @env0:with: Character @env0:lf)].
	(seen @env0:bitAnd: 4) @env0:= 0 ifFalse: [
		kinds @env0:add: (String @env0:with: Character @env0:cr with: Character @env0:lf)].
	kinds @env0:isEmpty ifTrue: [^ None].
	kinds @env0:size @env0:= 1 ifTrue: [^ kinds @env0:first].
	^ tuple @env0:withAll: kinds

]

{ #category : 'Grail-Reading' }
StringIO >> read [
	^ self ___ioRead___: -1

]

{ #category : 'Grail-Reading' }
StringIO >> read: n [
	^ self ___ioRead___: (n ___asSizeOr: -1)

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
	^ self ___ioReadline___: (limit ___asSizeOr: -1)

]

{ #category : 'Grail-Reading' }
StringIO >> readlines [
	^ self readlines: None

]

{ #category : 'Grail-Reading' }
StringIO >> readlines: aHint [
	"readlines(hint=-1) -- IOBase's: the lines left, stopping after the one
	that takes their total length past the hint when it is positive
	(_io__IOBase_readlines_impl)."

	| hint lines line total |
	hint := aHint ___asSizeOr: -1.
	self _checkOpen.
	lines := list ___new___.
	total := 0.
	[line := self readline.
	line __len__ @env0:= 0] @env0:whileFalse: [
		lines append: line.
		total := total @env0:+ line __len__.
		(hint @env0:> 0 and: [total @env0:> hint]) ifTrue: [^ lines]].
	^ lines

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
	^ self ___ioTruncate___: None

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
	"write(s) -- write the str at the current position, its newlines
	translated as the stream's newline argument says, and answer its length
	as given (_io_StringIO_write_impl).  Only a str is written, and asked
	for before the stream is asked whether it is closed
	(Modules/_io/stringio.c:554); Grail once wrote a print string --
	``aByteArray'' for b'x' -- where test_base64 expects the TypeError.
	Writing nothing changes nothing, even past the end, where an empty write
	used to pad the stream out to the position (test_overseek)."

	| length stored endPosition buffer |
	data @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___stringExpectedMessageFor: data)].
	self _checkOpen.
	length := data __len__.
	length @env0:= 0 ifTrue: [^ 0].
	stored := self ___newlinesTranslated: (self ___carried___: data).
	buffer := self @env0:dynamicInstVarAt: #_buffer.
	endPosition := (self @env0:dynamicInstVarAt: #_pos) @env0:+ stored @env0:size.
	endPosition @env0:> buffer @env0:size ifTrue: [
		buffer := buffer @env0:, (Unicode7 @env0:new: endPosition @env0:- buffer @env0:size).
		self @env0:dynamicInstVarAt: #_buffer put: buffer].
	1 @env0:to: stored @env0:size do: [:index |
		buffer @env0:at: (self @env0:dynamicInstVarAt: #_pos) @env0:+ index put: (stored @env0:at: index)].
	self @env0:dynamicInstVarAt: #_pos put: endPosition.
	^ length

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
