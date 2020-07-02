! ------------------- Remove existing behavior from PyRShift
expectvalue /Metaclass3       
doit
PyRShift removeAllMethods.
PyRShift class removeAllMethods.
%
! ------------------- Class methods for PyRShift
! ------------------- Instance methods for PyRShift
set compile_env: 0
category: 'other'
method: PyRShift
left: leftOperand right: rightOperand

	^leftOperand bitShift: rightOperand negated
%
