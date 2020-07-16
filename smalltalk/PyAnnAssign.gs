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
children

	^super children
		add: annotation;
		add: simple;
		add: target;
		add: value;
		yourself
%
category: 'other'
method: PyAnnAssign
initialize
	"AnnAssign(expr target, expr annotation, expr? value, int simple)"

	| stream | 
	stream := self stream.
	target := self expression.
	self commaSpace.
	annotation := self expression. 
	self commaSpace.
	value := self optionalExpression.
	self commaSpace.
	simple := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
