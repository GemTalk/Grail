! ------------------- Remove existing behavior from PyMod
expectvalue /Metaclass3       
doit
PyMod removeAllMethods.
PyMod class removeAllMethods.
%
! ------------------- Class methods for PyMod
! ------------------- Instance methods for PyMod
set compile_env: 0
category: 'other'
method: PyMod
left: leftOperand right: rightOperand

	^leftOperand rem: rightOperand
%
