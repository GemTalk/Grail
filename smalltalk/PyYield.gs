! ------------------- Remove existing behavior from PyYield
expectvalue /Metaclass3       
doit
PyYield removeAllMethods.
PyYield class removeAllMethods.
%
! ------------------- Class methods for PyYield
! ------------------- Instance methods for PyYield
set compile_env: 0
category: 'other'
method: PyYield
initialize
	"Yield(expr? value)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		value:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
