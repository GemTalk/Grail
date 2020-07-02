! ------------------- Remove existing behavior from PyIsNot
expectvalue /Metaclass3       
doit
PyIsNot removeAllMethods.
PyIsNot class removeAllMethods.
%
! ------------------- Class methods for PyIsNot
! ------------------- Instance methods for PyIsNot
set compile_env: 0
category: 'other'
method: PyIsNot
left: leftOperand right: rightOperand

	^(leftOperand == rightOperand) not
%
