! ------------------- Remove existing behavior from PyIs
expectvalue /Metaclass3       
doit
PyIs removeAllMethods.
PyIs class removeAllMethods.
%
! ------------------- Class methods for PyIs
! ------------------- Instance methods for PyIs
set compile_env: 0
category: 'other'
method: PyIs
left: leftOperand right: rightOperand

	^leftOperand == rightOperand
%
