! ------------------- Remove existing behavior from PyYieldFrom
expectvalue /Metaclass3       
doit
PyYieldFrom removeAllMethods.
PyYieldFrom class removeAllMethods.
%
! ------------------- Class methods for PyYieldFrom
! ------------------- Instance methods for PyYieldFrom
set compile_env: 0
category: 'other'
method: PyYieldFrom
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyYieldFrom
initialize
	"YieldFrom(expr value)"

	value := self expression.
	self readPosition.
%
