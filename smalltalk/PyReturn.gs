! ------------------- Remove existing behavior from PyReturn
expectvalue /Metaclass3       
doit
PyReturn removeAllMethods.
PyReturn class removeAllMethods.
%
! ------------------- Class methods for PyReturn
! ------------------- Instance methods for PyReturn
set compile_env: 0
category: 'other'
method: PyReturn
_value
	^ value
%
category: 'other'
method: PyReturn
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyReturn
evaluate

	^value evaluate
%
category: 'other'
method: PyReturn
initialize
	"Return(expr? value)"
	
	| stream next |
	stream := self stream.
	next := stream peekN: 4.
	value := self optionalExpression.
	self readPosition.
%
