! ------------------- Remove existing behavior from PyNotEq
expectvalue /Metaclass3       
doit
PyNotEq removeAllMethods.
PyNotEq class removeAllMethods.
%
! ------------------- Class methods for PyNotEq
! ------------------- Instance methods for PyNotEq
set compile_env: 0
category: 'other'
method: PyNotEq
left: leftOperand right: rightOperand

	^(leftOperand = rightOperand) not
%
