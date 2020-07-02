! ------------------- Remove existing behavior from PyMult
expectvalue /Metaclass3       
doit
PyMult removeAllMethods.
PyMult class removeAllMethods.
%
! ------------------- Class methods for PyMult
! ------------------- Instance methods for PyMult
set compile_env: 0
category: 'other'
method: PyMult
left: leftOperand right: rightOperand

	^leftOperand * rightOperand
%
