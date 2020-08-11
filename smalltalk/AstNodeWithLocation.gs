! ------------------- Remove existing behavior from AstNodeWithLocation
expectvalue /Metaclass3       
doit
AstNodeWithLocation removeAllMethods.
AstNodeWithLocation class removeAllMethods.
%
! ------------------- Class methods for AstNodeWithLocation
! ------------------- Instance methods for AstNodeWithLocation
set compile_env: 0
category: 'accessors'
method: AstNodeWithLocation
column
	^column
%
category: 'accessors'
method: AstNodeWithLocation
line
	^line
%
set compile_env: 0
category: 'other'
method: AstNodeWithLocation
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $:;
		print: line;
		yourself.
%
category: 'other'
method: AstNodeWithLocation
readPosition

	(self stream peekFor: $,) ifFalse: [self error].
	self readPositionOnly
%
category: 'other'
method: AstNodeWithLocation
readPositionOnly

	| stream string |
	stream := self stream.
	string := stream upTo: $=.
	string trimBlanks = 'lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (stream upTo: $)) asNumber.
%
category: 'other'
method: AstNodeWithLocation
sourceLine

	| i j string |
	string := self module source decodeToString.
	i := 0.
	line - 1 timesRepeat: [i := string indexOf: Character lf startingAt: i + 1].
	j := string indexOf: Character lf startingAt: i + 1.
	j == 0 ifTrue: [j := string size].
	^string copyFrom: i + 1 to: j - 1
%
