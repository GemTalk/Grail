! ------------------- Remove existing behavior from PyBitXor
expectvalue /Metaclass3       
doit
PyBitXor removeAllMethods.
PyBitXor class removeAllMethods.
%
! ------------------- Class methods for PyBitXor
! ------------------- Instance methods for PyBitXor
set compile_env: 0
category: 'other'
method: PyBitXor
left: leftOperand right: rightOperand

	^leftOperand bitXor: rightOperand 
%
