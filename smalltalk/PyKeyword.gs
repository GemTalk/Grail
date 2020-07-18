! ------------------- Remove existing behavior from PyKeyword
expectvalue /Metaclass3       
doit
PyKeyword removeAllMethods.
PyKeyword class removeAllMethods.
%
! ------------------- Class methods for PyKeyword
! ------------------- Instance methods for PyKeyword
set compile_env: 0
category: 'other'
method: PyKeyword
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyKeyword
initialize
	"keyword = (identifier? arg, expr value)"
	| next stream|
	stream := self stream.
	next := stream next: 8.
	next ~= 'keyword(' ifTrue: [self error.].
	(stream peekFor: $') ifFalse: [self error].
	arg := (stream upTo: $') asSymbol.
	self commaSpace.
	value := self expression.
	(stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: PyKeyword
name

	^arg
%
category: 'other'
method: PyKeyword
value

	^value
%
