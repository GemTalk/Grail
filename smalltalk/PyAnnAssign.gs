! ------------------- Remove existing behavior from PyAnnAssign
expectvalue /Metaclass3       
doit
PyAnnAssign removeAllMethods.
PyAnnAssign class removeAllMethods.
%
! ------------------- Class methods for PyAnnAssign
! ------------------- Instance methods for PyAnnAssign
set compile_env: 0
category: 'other'
method: PyAnnAssign
addMissingPositions
%
category: 'other'
method: PyAnnAssign
initialize
	"AnnAssign(expr target, expr annotation, expr? value, int simple)"

	| stream next | 
	stream := self stream.
	target := self expression.
	self commaSpace.
	annotation := self expression. 
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		value := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	simple := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
