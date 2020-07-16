! ------------------- Remove existing behavior from PyExpr
expectvalue /Metaclass3       
doit
PyExpr removeAllMethods.
PyExpr class removeAllMethods.
%
! ------------------- Class methods for PyExpr
! ------------------- Instance methods for PyExpr
set compile_env: 0
category: 'other'
method: PyExpr
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyExpr
evaluate
	^value evaluate
%
category: 'other'
method: PyExpr
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
%
set compile_env: 0
category: 'testing support'
method: PyExpr
_value

	^value
%
