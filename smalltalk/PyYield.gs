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
_value
	^ value
%
category: 'other'
method: PyYield
initialize
	"Yield(expr? value)"

	| stream next |
	stream := self stream.
	next := stream peekN: 4.
	next ~= 'None' ifTrue: [
		value := self expression. 
	] ifFalse: [
		stream next: 4.
	].
	self readPosition.
%
