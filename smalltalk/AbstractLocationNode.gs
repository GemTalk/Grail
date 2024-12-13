! ------------------- Remove existing behavior from AbstractLocationNode
removeallmethods AbstractLocationNode
removeallclassmethods AbstractLocationNode
! ------------------- Class methods for AbstractLocationNode
! ------------------- Instance methods for AbstractLocationNode
category: 'accessors'
method: AbstractLocationNode
beginLine

	^beginLine
%
category: 'accessors'
method: AbstractLocationNode
column

	^beginColumn
%
category: 'accessors'
method: AbstractLocationNode
line

	^beginLine
%
category: 'other'
method: AbstractLocationNode
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $:;
		print: beginLine;
		yourself.
%
category: 'other'
method: AbstractLocationNode
readPosition

	(self stream peekFor: $,) ifFalse: [self error].
	self readPositionOnly.
%
category: 'other'
method: AbstractLocationNode
readPositionOnly

	| stream |
	stream := self stream.
	beginLine := (stream upTo: $,) asNumber.
	beginColumn := (stream upTo: $,) asNumber.
	endLine := (stream upTo: $,) asNumber.
	endColumn := (stream upTo: $)) asNumber.
%
category: 'other'
method: AbstractLocationNode
sourceLine

	| i j string |
	string := self module source decodeToString.
	i := 0.
	beginLine - 1 timesRepeat: [i := string indexOf: Character lf startingAt: i + 1].
	j := string indexOf: Character lf startingAt: i + 1.
	j == 0 ifTrue: [j := string size].
	^string copyFrom: i + 1 to: j - 1
%
