! ------------------- Superclass check
run
AppendStream ifNil: [self error: 'AppendStream is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrettyWriteStream
expectvalue /Class
doit
AppendStream subclass: 'PrettyWriteStream'
  instVarNames: #( indentCount methodStart positionMap )
  classVars: #( )   "class far Lf inherited from Stream"
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PrettyWriteStream category: 'Grail-Tools'
%

! ------------------- Remove existing behavior from PrettyWriteStream
removeallmethods PrettyWriteStream
removeallclassmethods PrettyWriteStream

set compile_env: 0

category: 'Grail-other'
method: PrettyWriteStream
decreaseIndent

	indentCount := indentCount - 1.
%

category: 'Grail-other'
method: PrettyWriteStream
increaseIndent

	indentCount := indentCount + 1.
%

category: 'Grail-other'
method: PrettyWriteStream
nextPut: aChar
	"Add tabs if we are at the beginning of a line."

	self ___atLineStart ifTrue: [
		indentCount timesRepeat: [self tab].
	].
	super nextPut: aChar.
%

category: 'Grail-other'
method: PrettyWriteStream
nextPutAll: aString
	"Add tabs if we are at the beginning of a line."

	self ___atLineStart ifTrue: [
		indentCount timesRepeat: [self tab].
	].
	super nextPutAll: aString.
%

category: 'Grail-other'
method: PrettyWriteStream
___atLineStart
	"True iff the last character written was a linefeed — i.e. the next write
	begins a new line and must be indented.

	O(1): reads the write position and the backing collection's last element
	directly.  The previous form ``self contents notEmpty and: [self contents
	last == Character lf]'' copied the ENTIRE buffer twice per write
	(WriteStream>>contents is a copyFrom:1:to:position), making every
	nextPut:/nextPutAll: O(output-size) and whole-module codegen O(output^2)
	-- the dominant cost when transpiling large modules.  This is exactly
	equivalent: contents notEmpty == position > 0, and contents last ==
	collection at: position."

	"Lf class variable, not ``Character lf'': this is consulted on EVERY
	nextPut:/nextPutAll: of every method Grail emits, and ``Character lf'' is a
	real message send, not a literal.  With the same constant in
	PythonTokenizer>>advance it came to ~2-4% of the whole SUnit suite's
	samples.  Cached lazily rather than in a constructor because this class
	inherits WriteStream's several instance-creation paths."

	^ self position > 0 and: [(collection at: self position) == Lf ]
%

category: 'Grail-other'
method: PrettyWriteStream
on: aCollection
	"override to initialize `indentCount`"

	super on: aCollection.
	indentCount := 0.
	"An unmarked stream still works: it maps from its own start, and a map
	nobody asks for is simply dropped with the stream.  NamedExprAst builds a
	throwaway stream for its right-hand side and never compiles it."
	methodStart := 0.
%

category: 'Grail-other'
method: PrettyWriteStream
tab
	"Adds a tab to the output stream, but avoids our #'nextPut:' method which calls this method (and would otherwise create an infinite recursion)."

	super nextPut: Tab.
%

! ------------------- Position map (Python source -> Smalltalk source)

category: 'Grail-position map'
method: PrettyWriteStream
markStartOfMethod
	"Everything written from here is one compiled method, and the map records
	offsets relative to this point.

	CALLED BY WHOEVER COMPILES, not by the generator that emits.  A def's body
	generator serves two masters -- it builds a whole METHOD for a top-level or
	class-body def, and it emits a nested def as a BLOCK into its parent's
	stream -- so it is the wrong place to decide that a method has begun or
	ended.  Getting that wrong planted a module body's map mid-source with 900
	KB of further code written after it."

	methodStart := self position.
	positionMap := nil
%

category: 'Grail-position map'
method: PrettyWriteStream
mapPythonNode: aNode from: startPosition
	"Note that aNode's generated text runs from startPosition to here.

	THE POINT OF THE WHOLE TABLE.  GemStone already knows, for any ip, the
	SMALLTALK source offset of the send in flight -- ``_previousStepPointForIp:''
	then ``_sourceOffsetsAt:'' -- and that offset lands on the SELECTOR of the
	send that raised.  What is missing is the other half of the journey,
	Smalltalk offset -> PYTHON node, and that is only knowable here, while the
	emitter still holds both.

	SKIPPED WHEN THE TEXT CANNOT CONTAIN A SEND.  A map entry earns its place
	only if a step point can land inside it, and a node that emitted a bare
	identifier -- a local variable read, ``self'', ``nil'' -- emitted no send at
	all, so nothing can ever be attributed to it.  Measured over five stdlib
	modules, that is 21% of all entries and 21% of the bytes, discarded with no
	loss of precision: the test is a superset, so every entry that could have
	won is still there.

	FLAT, six SmallIntegers appended to one collection rather than a six-element
	Array per node.  Measured on a zipfile.py import, the per-node Array cost
	+915 KB of PEAK temp object space -- transient garbage, but peak is exactly
	what AlmostOutOfMemory watches, and it was enough to error a memory-tight
	test.  SmallIntegers are immediate, so this allocates once per METHOD."

	| endPosition |
	endPosition := self position.
	(self sendFreeFrom: startPosition to: endPosition) ifTrue: [^ self].
	positionMap isNil ifTrue: [positionMap := OrderedCollection new].
	positionMap
		add: startPosition - methodStart;
		add: endPosition - methodStart;
		add: aNode beginLine;
		add: aNode column;
		add: aNode endLine;
		add: aNode endColumn
%

category: 'Grail-position map'
method: PrettyWriteStream
sendFreeFrom: startPosition to: endPosition
	"Is the text just written incapable of holding a message send?

	True only for a run of identifier characters, which is the one emission
	with no selector in it.  Anything else -- a space, a colon, a bracket --
	answers false, so the test never discards an entry a step point could fall
	inside.  Reads the backing collection directly, as ___atLineStart does:
	``self contents'' would copy the whole buffer on every node."

	startPosition to: endPosition do: [:i |
		| c |
		c := collection at: i.
		(c isLetter or: [c isDigit or: [c == $_]]) ifFalse: [^ false]].
	^ true
%

category: 'Grail-position map'
method: PrettyWriteStream
writeMapAsComment
	"Append the map for the method that ends here, and forget it.

	Written with ``super'', bypassing this class's own indentation: the map is
	not source, and a tab inside it would stop the reader's digit walk."

	super nextPutAll: (self mapCommentShiftedBy: 0)
%

category: 'Grail-position map'
method: PrettyWriteStream
mapCommentShiftedBy: anInteger
	"The map for the method that ends here, as the trailing Smalltalk COMMENT
	that carries it into the compiled method -- and forget it.  Answers an empty
	String when nothing was recorded.

	A TRAILING COMMENT, so it rides along with ``sourceString'' -- which a
	traceback already has in hand -- and needs no second compile target and no
	second lookup.  It is written after all code, so it shifts no offset it
	describes, and holds digits and spaces only, so nothing in it can close the
	comment early.

	Six numbers per entry: the Smalltalk start and end offsets, then the Python
	beginLine, column, endLine and endColumn.  A reader resolves an ip by taking
	the SMALLEST entry whose Smalltalk range contains the step-point offset --
	the innermost Python node the send belongs to, which is what CPython blames.

	SHIFTED for the one caller that edits the source AFTER the generator has
	finished with it: a property deleter has its leading selector rewritten to a
	longer one, which moves every offset the map describes."

	| map out |
	map := positionMap.
	positionMap := nil.
	map isNil ifTrue: [^ ''].
	map isEmpty ifTrue: [^ ''].
	out := WriteStream on: String new.
	out nextPut: Character lf.
	out nextPutAll: '"___GRAILPOS___'.
	1 to: map size by: 6 do: [:i |
		out nextPut: $ .
		out nextPutAll: ((map at: i) + anInteger) printString.
		out nextPut: $ .
		out nextPutAll: ((map at: i + 1) + anInteger) printString.
		2 to: 5 do: [:k |
			out nextPut: $ .
			out nextPutAll: (map at: i + k) printString]].
	out nextPutAll: ' "'.
	^ out contents
%
