! ------------------- Superclass check
run
AppendStream ifNil: [self error: 'AppendStream is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrettyWriteStream
expectvalue /Class
doit
AppendStream subclass: 'PrettyWriteStream'
  instVarNames: #( indentCount )
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
%

category: 'Grail-other'
method: PrettyWriteStream
removeTrailingNone
  "Aug 01 , 2026  , no senders found"
	"Remove trailing 'None.' followed by newline from the stream.
	This is called before printing a new statement to clean up the
	None that AssignAst adds (which is only needed for the last statement)."

	| contents suffix newSize |
	contents := self contents.
	suffix := 'None.' , (Unicode7 with: Character lf).
	(contents endsWith: suffix) ifTrue: [
		newSize := contents size - suffix size.
		self position: newSize.
		collection := contents copyFrom: 1 to: newSize.
	].
%

category: 'Grail-other'
method: PrettyWriteStream
tab
	"Adds a tab to the output stream, but avoids our #'nextPut:' method which calls this method (and would otherwise create an infinite recursion)."

	super nextPut: Tab.
%
