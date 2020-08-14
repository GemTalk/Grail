! ------------------- Remove existing behavior from AbstractLocationNode
expectvalue /Metaclass3       
doit
AbstractLocationNode removeAllMethods.
AbstractLocationNode class removeAllMethods.
%
! ------------------- Class methods for AbstractLocationNode
! ------------------- Instance methods for AbstractLocationNode
set compile_env: 0
category: 'accessors'
method: AbstractLocationNode
column
	^column
%
category: 'accessors'
method: AbstractLocationNode
line
	^line
%
set compile_env: 0
category: 'other'
method: AbstractLocationNode
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $:;
		print: line;
		yourself.
%
category: 'other'
method: AbstractLocationNode
readPosition

	(self stream peekFor: $,) ifFalse: [self error].
	self readPositionOnly
%
category: 'other'
method: AbstractLocationNode
readPositionOnly

	| stream string temp |
	stream := self stream.
	string := stream upTo: $=.
	string trimBlanks = 'lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (temp := stream upTo: $,) asNumber.
	temp := stream upTo: $).
%
category: 'other'
method: AbstractLocationNode
sourceLine

	| i j string |
	string := self module source decodeToString.
	i := 0.
	line - 1 timesRepeat: [i := string indexOf: Character lf startingAt: i + 1].
	j := string indexOf: Character lf startingAt: i + 1.
	j == 0 ifTrue: [j := string size].
	^string copyFrom: i + 1 to: j - 1
%
