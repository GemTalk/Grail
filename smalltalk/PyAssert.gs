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
children

	^super children
		add: msg;
		add: test;
		yourself
%
category: 'other'
method: PyAssert
initialize
	"Assert(expr test, expr? msg)"

	test := self expression. 
	self commaSpace.
	msg := self optionalExpression.
	self readPosition.
%
