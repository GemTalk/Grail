! ------------------- Remove existing behavior from PyAwait
expectvalue /Metaclass3       
doit
PyAwait removeAllMethods.
PyAwait class removeAllMethods.
%
! ------------------- Class methods for PyAwait
! ------------------- Instance methods for PyAwait
set compile_env: 0
category: 'other'
method: PyAwait
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyAwait
initialize
	"Await(expr value)"

	value := self expression.
	self readPosition.
%
