! ------------------- Remove existing behavior from PyDiv
expectvalue /Metaclass3       
doit
PyDiv removeAllMethods.
PyDiv class removeAllMethods.
%
! ------------------- Class methods for PyDiv
! ------------------- Instance methods for PyDiv
set compile_env: 0
category: 'other'
method: PyDiv
left: leftOperand right: rightOperand

	^(leftOperand / rightOperand) asFloat
%
