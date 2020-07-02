! ------------------- Remove existing behavior from PyLShift
expectvalue /Metaclass3       
doit
PyLShift removeAllMethods.
PyLShift class removeAllMethods.
%
! ------------------- Class methods for PyLShift
! ------------------- Instance methods for PyLShift
set compile_env: 0
category: 'other'
method: PyLShift
left: leftOperand right: rightOperand

	^leftOperand bitShift: rightOperand
%
