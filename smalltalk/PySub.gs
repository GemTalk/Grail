! ------------------- Remove existing behavior from PySub
expectvalue /Metaclass3       
doit
PySub removeAllMethods.
PySub class removeAllMethods.
%
! ------------------- Class methods for PySub
! ------------------- Instance methods for PySub
set compile_env: 0
category: 'other'
method: PySub
left: leftOperand right: rightOperand

	^leftOperand - rightOperand
%
