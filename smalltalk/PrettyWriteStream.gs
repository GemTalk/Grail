! ------------------- Remove existing behavior from PrettyWriteStream
removeallmethods PrettyWriteStream
removeallclassmethods PrettyWriteStream
! ------------------- Class methods for PrettyWriteStream
! ------------------- Instance methods for PrettyWriteStream
category: 'other'
method: PrettyWriteStream
decreaseIndent

	indentCount := indentCount - 1.
%
category: 'other'
method: PrettyWriteStream
increaseIndent

	indentCount := indentCount + 1.
%
category: 'other'
method: PrettyWriteStream
nextPut: aChar
	"Add tabs if we are at the beginning of a line."

	(self contents notEmpty and: [self contents last == Character lf]) ifTrue: [
		indentCount timesRepeat: [self tab].
	].
	super nextPut: aChar.
%
category: 'other'
method: PrettyWriteStream
nextPutAll: aString
	"Add tabs if we are at the beginning of a line."

	(self contents notEmpty and: [self contents last == Character lf]) ifTrue: [
		indentCount timesRepeat: [self tab].
	].
	super nextPutAll: aString.
%
category: 'other'
method: PrettyWriteStream
on: aCollection
	"override to initialize `indentCount`"

	super on: aCollection.
	indentCount := 0.
%
category: 'other'
method: PrettyWriteStream
removeTrailingNone
	"Remove trailing 'None.' followed by newline from the stream.
	This is called before printing a new statement to clean up the
	None that AssignAst adds (which is only needed for the last statement)."

	| contents suffix newSize |
	contents := self contents.
	suffix := 'None.' , (String with: Character lf).
	(contents endsWith: suffix) ifTrue: [
		newSize := contents size - suffix size.
		self position: newSize.
		collection := contents copyFrom: 1 to: newSize.
	].
%
category: 'other'
method: PrettyWriteStream
tab
	"Adds a tab to the output stream, but avoids our #'nextPut:' method which calls this method (and would otherwise create an infinite recursion)."

	super nextPut: Tab.
%
