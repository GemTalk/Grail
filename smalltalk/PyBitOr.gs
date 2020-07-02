! ------------------- Remove existing behavior from PyBitOr
expectvalue /Metaclass3       
doit
PyBitOr removeAllMethods.
PyBitOr class removeAllMethods.
%
! ------------------- Class methods for PyBitOr
! ------------------- Instance methods for PyBitOr
set compile_env: 0
category: 'other'
method: PyBitOr
left: leftOperand right: rightOperand

	^leftOperand bitOr: rightOperand 
%
