! ------------------- Remove existing behavior from PyIn
expectvalue /Metaclass3       
doit
PyIn removeAllMethods.
PyIn class removeAllMethods.
%
! ------------------- Class methods for PyIn
! ------------------- Instance methods for PyIn
set compile_env: 0
category: 'other'
method: PyIn
left: leftOperand right: rightOperand

	^rightOperand includes: leftOperand
%
