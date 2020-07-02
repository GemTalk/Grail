! ------------------- Remove existing behavior from PyEq
expectvalue /Metaclass3       
doit
PyEq removeAllMethods.
PyEq class removeAllMethods.
%
! ------------------- Class methods for PyEq
! ------------------- Instance methods for PyEq
set compile_env: 0
category: 'other'
method: PyEq
left: leftOperand right: rightOperand

	^leftOperand = rightOperand
%
