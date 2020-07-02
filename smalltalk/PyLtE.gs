! ------------------- Remove existing behavior from PyLtE
expectvalue /Metaclass3       
doit
PyLtE removeAllMethods.
PyLtE class removeAllMethods.
%
! ------------------- Class methods for PyLtE
! ------------------- Instance methods for PyLtE
set compile_env: 0
category: 'other'
method: PyLtE
left: leftOperand right: rightOperand

	^leftOperand <= rightOperand
%
