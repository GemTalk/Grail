! ------------------- Remove existing behavior from PyAdd
expectvalue /Metaclass3       
doit
PyAdd removeAllMethods.
PyAdd class removeAllMethods.
%
! ------------------- Class methods for PyAdd
! ------------------- Instance methods for PyAdd
set compile_env: 0
category: 'other'
method: PyAdd
left: leftOperand right: rightOperand

	^leftOperand + rightOperand
%
