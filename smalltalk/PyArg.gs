! ------------------- Remove existing behavior from PyArg
expectvalue /Metaclass3       
doit
PyArg removeAllMethods.
PyArg class removeAllMethods.
%
! ------------------- Class methods for PyArg
! ------------------- Instance methods for PyArg
set compile_env: 0
category: 'other'
method: PyArg
initialize

"arg = (identifier arg, expr? annotation)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	arg := stream upTo: $'.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		annotation := self expression.
	] ifFalse: [
		next := stream next: 4.
			next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
category: 'other'
method: PyArg
newMethod: argument
		"Method comment."

	^self yourself.
%
