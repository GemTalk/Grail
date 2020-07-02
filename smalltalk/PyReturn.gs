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
addMissingPositions
%
category: 'other'
method: PyReturn
initialize
	"Return(expr? value)"
	
	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	] ifFalse: [
		value := self expression.
	].
	self readPosition.
%
