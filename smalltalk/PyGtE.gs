! ------------------- Remove existing behavior from PyGtE
expectvalue /Metaclass3       
doit
PyGtE removeAllMethods.
PyGtE class removeAllMethods.
%
! ------------------- Class methods for PyGtE
! ------------------- Instance methods for PyGtE
set compile_env: 0
category: 'other'
method: PyGtE
left: leftOperand right: rightOperand

	^leftOperand >= rightOperand
%
