! ------------------- Remove existing behavior from PyAnd
expectvalue /Metaclass3       
doit
PyAnd removeAllMethods.
PyAnd class removeAllMethods.
%
! ------------------- Class methods for PyAnd
! ------------------- Instance methods for PyAnd
set compile_env: 0
category: 'other'
method: PyAnd
evaluate

	^values allSatisfy: [:each | each evaluate].
%
category: 'other'
method: PyAnd
values: anArray

	self halt.
	^anArray allSatisfy: [:each | each evaluate].
%
