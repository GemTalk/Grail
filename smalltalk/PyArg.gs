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
_annotation
	^ annotation
%
category: 'other'
method: PyArg
_arg
	^ arg
%
category: 'other'
method: PyArg
children

	^super children
		add: annotation;
		yourself
%
category: 'other'
method: PyArg
initialize

"arg = (identifier arg, expr? annotation)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	arg := stream upTo: $'.
	self commaSpace.
	annotation := self optionalExpression.
	self readPosition.
%
category: 'other'
method: PyArg
initialize2

	super initialize2.
	assoc := self associationAt: arg asSymbol.
%
category: 'other'
method: PyArg
value: anObject

	assoc value: anObject.
%
