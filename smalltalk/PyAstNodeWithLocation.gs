! ------------------- Remove existing behavior from PyAstNodeWithLocation
expectvalue /Metaclass3       
doit
PyAstNodeWithLocation removeAllMethods.
PyAstNodeWithLocation class removeAllMethods.
%
! ------------------- Class methods for PyAstNodeWithLocation
! ------------------- Instance methods for PyAstNodeWithLocation
set compile_env: 0
category: 'accessors'
method: PyAstNodeWithLocation
column
	^column
%
category: 'accessors'
method: PyAstNodeWithLocation
line
	^line
%
set compile_env: 0
category: 'other'
method: PyAstNodeWithLocation
readPosition

	(self stream peekFor: $,) ifFalse: [self error].
	self readPositionOnly
%
category: 'other'
method: PyAstNodeWithLocation
readPositionOnly

	| stream string |
	stream := self stream.
	string := stream upTo: $=.
	string trimBlanks = 'lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (stream upTo: $)) asNumber.
%
