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
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyYield
initialize
	"Yield(expr? value)"

	value := self optionalExpression.
	self readPosition.
%
