! ------------------- Remove existing behavior from PyUAdd
expectvalue /Metaclass3       
doit
PyUAdd removeAllMethods.
PyUAdd class removeAllMethods.
%
! ------------------- Class methods for PyUAdd
! ------------------- Instance methods for PyUAdd
set compile_env: 0
category: 'other'
method: PyUAdd
evaluate

	^operand evaluate
%
category: 'other'
method: PyUAdd
operand: x
	^x
%
