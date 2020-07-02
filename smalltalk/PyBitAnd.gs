! ------------------- Remove existing behavior from PyBitAnd
expectvalue /Metaclass3       
doit
PyBitAnd removeAllMethods.
PyBitAnd class removeAllMethods.
%
! ------------------- Class methods for PyBitAnd
! ------------------- Instance methods for PyBitAnd
set compile_env: 0
category: 'other'
method: PyBitAnd
left: leftOperand right: rightOperand

	^leftOperand bitAnd: rightOperand
%
