! ------------------- Superclass check
run
WriteStream ifNil: [self error: 'WriteStream is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrettyWriteStream
expectvalue /Class
doit
WriteStream subclass: 'PrettyWriteStream'
  instVarNames: #( indentCount)
  classVars: #()
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

	(self contents notEmpty and: [self contents last == Character lf]) ifTrue: [
		indentCount timesRepeat: [self tab].
	].
	super nextPut: aChar.
%

category: 'Grail-other'
method: PrettyWriteStream
nextPutAll: aString
	"Add tabs if we are at the beginning of a line."

	(self contents notEmpty and: [self contents last == Character lf]) ifTrue: [
		indentCount timesRepeat: [self tab].
	].
	super nextPutAll: aString.
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
