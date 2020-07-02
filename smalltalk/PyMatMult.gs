! ------------------- Remove existing behavior from PyMatMult
expectvalue /Metaclass3       
doit
PyMatMult removeAllMethods.
PyMatMult class removeAllMethods.
%
! ------------------- Class methods for PyMatMult
! ------------------- Instance methods for PyMatMult
set compile_env: 0
category: 'other'
method: PyMatMult
left: leftOperand right: rightOperand
	self error.
	^leftOperand bitShift: rightOperand
%
