! ------------------- Remove existing behavior from PrettyWriteStream
removeallmethods PrettyWriteStream
removeallclassmethods PrettyWriteStream
! ------------------- Class methods for PrettyWriteStream
! ------------------- Instance methods for PrettyWriteStream
category: 'other'
method: PrettyWriteStream
decreaseIndent
	indentCount := indentCount - 1
%
category: 'other'
method: PrettyWriteStream
increaseIndent
	indentCount := indentCount + 1
%
category: 'other'
method: PrettyWriteStream
nextPutAll: aString

	(self contents notEmpty and: [self contents last == Character lf]) ifTrue: [
		indentCount timesRepeat: [self tab].
	].

	super nextPutAll: aString
%
category: 'other'
method: PrettyWriteStream
on: aCollection

	super on: aCollection.
	indentCount := 0
%
