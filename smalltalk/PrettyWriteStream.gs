! ------------------- Remove existing behavior from PrettyWriteStream
removeAllMethods PrettyWriteStream
removeAllClassMethods PrettyWriteStream
! ------------------- Class methods for PrettyWriteStream
! ------------------- Instance methods for PrettyWriteStream
set compile_env: 0
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

	(self contents notEmpty and: [ self contents last == Character lf ]) ifTrue: [
		indentCount timesRepeat: [ self tab ].
	].

	super nextPutAll: aString
%
category: 'other'
method: PrettyWriteStream
on: aCollection

	super on: aCollection.
	indentCount := 0
%
