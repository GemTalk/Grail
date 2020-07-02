! ------------------- Remove existing behavior from PyFloorDiv
expectvalue /Metaclass3       
doit
PyFloorDiv removeAllMethods.
PyFloorDiv class removeAllMethods.
%
! ------------------- Class methods for PyFloorDiv
! ------------------- Instance methods for PyFloorDiv
set compile_env: 0
category: 'other'
method: PyFloorDiv
left: leftOperand right: rightOperand

	^leftOperand // rightOperand
%
