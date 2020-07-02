! ------------------- Remove existing behavior from PyPow
expectvalue /Metaclass3       
doit
PyPow removeAllMethods.
PyPow class removeAllMethods.
%
! ------------------- Class methods for PyPow
! ------------------- Instance methods for PyPow
set compile_env: 0
category: 'other'
method: PyPow
left: leftOperand right: rightOperand

	^leftOperand raisedTo: rightOperand
%
