! ------------------- Remove existing behavior from PyOr
expectvalue /Metaclass3       
doit
PyOr removeAllMethods.
PyOr class removeAllMethods.
%
! ------------------- Class methods for PyOr
! ------------------- Instance methods for PyOr
set compile_env: 0
category: 'other'
method: PyOr
values: anArray
	^anArray anySatisfy: [:each | each evaluate].
%
