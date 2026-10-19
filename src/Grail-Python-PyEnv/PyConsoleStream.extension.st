Extension { #name : 'PyConsoleStream' }

{ #category : 'Grail-State' }
PyConsoleStream >> ___isInput___ [
	"The console's INPUT stream -- sys.stdin -- as opposed to its two output
	streams.  One class for all three, told apart by name, as stdout and stderr
	already were."

	^ (self @env0:dynamicInstVarAt: #'_name') @env0:= '<stdin>'

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> ___requireReadable___ [
	"sys.stdout.read() is CPython's io.UnsupportedOperation, not a read."

	self ___isInput___ ifFalse: [^ UnsupportedOperation ___signal___: 'not readable'].
	^ self

]

{ #category : 'Grail-Context manager' }
PyConsoleStream >> __enter__ [
	^ self

]

{ #category : 'Grail-Context manager' }
PyConsoleStream >> __exit__: a _: b _: c [
	"close() is a no-op, so leaving a ``with sys.stdout'' block does not
	silence the console."

	^ false

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> __iter__ [
	self ___requireReadable___.
	^ self

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> __next__ [
	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [^ StopIteration ___signal___: None].
	^ line

]

{ #category : 'Grail-String Representation' }
PyConsoleStream >> __repr__ [
	"CPython''s shape for the real thing:
	<_io.TextIOWrapper name='<stdout>' mode='w' encoding='utf-8'>"

	^ '<_io.TextIOWrapper name=''' @env0:,
		(self @env0:dynamicInstVarAt: #'_name') @env0:asString @env0:,
		''' mode=''' @env0:, self mode @env0:, ''' encoding=''utf-8''>'

]

{ #category : 'Grail-String Representation' }
PyConsoleStream >> __str__ [
	^ self __repr__

]

{ #category : 'Grail-State' }
PyConsoleStream >> close [
	"CPython lets you close sys.stdout; there is nothing here to close, and a
	closed console would silence every later print in the session.  A no-op,
	and ``closed'' stays false."

	^ None

]

{ #category : 'Grail-State' }
PyConsoleStream >> closed [
	^ false

]

{ #category : 'Grail-State' }
PyConsoleStream >> encoding [
	"UTF-8.  Not a guess: ___consoleWrite___: encodes as UTF-8 for a sink that
	declares it takes bytes, and hands characters straight to one that takes
	characters."

	^ 'utf-8'

]

{ #category : 'Grail-State' }
PyConsoleStream >> errors [
	^ 'strict'

]

{ #category : 'Grail-State' }
PyConsoleStream >> fileno [
	"io.UnsupportedOperation, CPython''s answer for a stream with no file
	descriptor.  There genuinely is none: the sink may be the Transcript, a
	GsFile, or a ClientForwarder whose descriptor lives in the CLIENT process.
	UnsupportedOperation is an OSError subclass, so ``except OSError'' -- what a
	caller wraps fileno() in -- catches it."

	^ UnsupportedOperation ___signal___: 'fileno'

]

{ #category : 'Grail-Writing' }
PyConsoleStream >> flush [
	"A no-op, and it has to be.  ___consoleWrite___: never sends to the sink --
	a streaming ClientForwarder forwards every send to a client that is not
	ready to answer it -- and a flush would be exactly such a send.  Each write
	is passed to the sink as it is made, so there is nothing buffered here to
	push."

	^ None

]

{ #category : 'Grail-State' }
PyConsoleStream >> isatty [
	"False, unconditionally -- see the class comment.  Whether the console is a
	terminal is a property of the SINK, and the sink is the one object here
	that must never be sent anything.  Reporting false is the conservative
	answer: the callers that ask (django''s management colour support, twilio''s
	exception rendering, _pyrepl''s pager) treat it as ``plain text, no ANSI'',
	which is what Grail''s _colorize stub already reports through can_colorize()."

	^ false

]

{ #category : 'Grail-State' }
PyConsoleStream >> line_buffering [
	"True: every write reaches the sink immediately (see flush)."

	^ true

]

{ #category : 'Grail-State' }
PyConsoleStream >> mode [
	"``w'' for sys.stdout and sys.stderr, ``r'' for sys.stdin -- CPython's."

	^ self ___isInput___ ifTrue: ['r'] ifFalse: ['w']

]

{ #category : 'Grail-State' }
PyConsoleStream >> name [
	^ self @env0:dynamicInstVarAt: #'_name'

]

{ #category : 'Grail-State' }
PyConsoleStream >> newlines [
	^ None

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> read [
	"Everything up to end of file."

	| out line |
	out := WriteStream @env0:on: String @env0:new.
	[(line := self readline) @env0:isEmpty] @env0:whileFalse: [out @env0:nextPutAll: line].
	^ out @env0:contents

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> read: size [
	"At most ``size'' characters; a negative or None size reads to end of file."

	| out line |
	(size == None or: [size @env0:< 0]) ifTrue: [^ self read].
	out := WriteStream @env0:on: String @env0:new.
	[out @env0:size @env0:< size and: [(line := self readline: size @env0:- out @env0:size) @env0:notEmpty]]
		@env0:whileTrue: [out @env0:nextPutAll: line].
	^ out @env0:contents

]

{ #category : 'Grail-State' }
PyConsoleStream >> readable [
	^ self ___isInput___

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> readline [
	"One line, WITH its newline, or '' at end of file -- CPython's contract,
	which ``for line in sys.stdin'' and every read below are built on.  The line
	comes from the console: the session's stdin provider, else the gem's
	terminal (builtins >> ___consoleReadLine___, the source input() reads)."

	| pending line |
	self ___requireReadable___.
	pending := self @env0:dynamicInstVarAt: #'_pending'.
	(pending @env0:notNil and: [pending @env0:notEmpty]) ifTrue: [
		self @env0:dynamicInstVarAt: #'_pending' put: nil.
		^ pending].
	line := (builtins @env0:___instance___) ___consoleReadLine___.
	line @env0:isNil ifTrue: [^ ''].
	line := line @env0:asString.
	(line @env0:notEmpty and: [(line @env0:last) @env0:== (Character @env0:lf)])
		ifFalse: [line := line @env0:, (String @env0:with: Character @env0:lf)].
	^ line

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> readline: size [
	"At most ``size'' characters of the next line; the rest stays for the next
	read.  A negative or None size reads the whole line."

	| line |
	line := self readline.
	(size == None or: [size @env0:< 0 or: [line @env0:size @env0:<= size]]) ifTrue: [^ line].
	self @env0:dynamicInstVarAt: #'_pending'
		put: (line @env0:copyFrom: size @env0:+ 1 to: line @env0:size).
	^ line @env0:copyFrom: 1 to: size

]

{ #category : 'Grail-Reading' }
PyConsoleStream >> readlines [
	| lines line |
	lines := OrderedCollection @env0:new.
	[(line := self readline) @env0:isEmpty] @env0:whileFalse: [lines @env0:add: line].
	^ lines

]

{ #category : 'Grail-State' }
PyConsoleStream >> seekable [
	^ false

]

{ #category : 'Grail-State' }
PyConsoleStream >> writable [
	^ self ___isInput___ not

]

{ #category : 'Grail-Writing' }
PyConsoleStream >> write: data [
	"CPython''s TextIOWrapper.write(s): write the text, answer the number of
	CHARACTERS written.  The count is what callers add up -- CPython returns
	len(s), not a byte count -- so it is the string''s size, before any UTF-8
	encoding ___consoleWrite___: may do for a byte-taking sink.

	A non-str argument is a TypeError, as in CPython: ``sys.stdout.write(5)''
	raises rather than stringifying, and a bare send would have been an
	uncatchable MessageNotUnderstood."

	self ___isInput___ ifTrue: [^ UnsupportedOperation ___signal___: 'not writable'].
	(data @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'write() argument must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: data)].
	(builtins @env0:___instance___) ___consoleWrite___: data.
	^ data @env0:size

]

{ #category : 'Grail-Writing' }
PyConsoleStream >> writelines: lines [
	"Write each element in order, with no separator added.  Iterate LAZILY via
	the Python protocol (__iter__/__next__) rather than a Smalltalk #do:, for
	StringIO writelines''s reason: a non-iterable argument then raises a
	catchable TypeError instead of a #do: MessageNotUnderstood."

	| it |
	it := lines __iter__.
	[true] @env0:whileTrue: [ | line |
		line := [it __next__] @env0:on: StopIteration do: [:ex | ^ None].
		self write: line]

]
