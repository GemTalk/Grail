! ------------------- Remove existing behavior from PyAssert
expectvalue /Metaclass3       
doit
PyAssert removeAllMethods.
PyAssert class removeAllMethods.
%
! ------------------- Class methods for PyAssert
! ------------------- Instance methods for PyAssert
set compile_env: 0
category: 'other'
method: PyAssert
_msg
	^ msg
%
category: 'other'
method: PyAssert
_test
	^ test
%
category: 'other'
method: PyAssert
initialize
	"Assert(expr test, expr? msg)"

	| stream next |
	stream := self stream.
	test := self expression. 
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		msg:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
