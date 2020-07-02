! ------------------- Remove existing behavior from PyRaise
expectvalue /Metaclass3       
doit
PyRaise removeAllMethods.
PyRaise class removeAllMethods.
%
! ------------------- Class methods for PyRaise
! ------------------- Instance methods for PyRaise
set compile_env: 0
category: 'other'
method: PyRaise
addMissingPositions
%
category: 'other'
method: PyRaise
initialize
	"Raise(expr? exc, expr? cause)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		exc := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		cause:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
