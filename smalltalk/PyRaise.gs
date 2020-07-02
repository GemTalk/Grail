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
_cause
	^ cause
%
category: 'other'
method: PyRaise
_exc
	^ exc
%
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
	next := stream peekN: 4.
	next ~= 'None' ifTrue: [
		exc := self expression.
	] ifFalse: [
		stream next: 4.
	].
	self commaSpace.
	next := stream peekN: 4.
	next ~= 'None' ifTrue: [
		cause := self expression.
	] ifFalse: [
		stream next: 4.
	].
	self readPosition.
%
