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
evaluate

	^values anySatisfy: [:each | each evaluate].
%
category: 'other'
method: PyOr
values: anArray

	self halt.
	^anArray anySatisfy: [:each | each evaluate].
%
