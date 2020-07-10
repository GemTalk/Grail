! ------------------- Remove existing behavior from PyNot
expectvalue /Metaclass3       
doit
PyNot removeAllMethods.
PyNot class removeAllMethods.
%
! ------------------- Class methods for PyNot
! ------------------- Instance methods for PyNot
set compile_env: 0
category: 'other'
method: PyNot
evaluate

	^operand evaluate not
%
category: 'other'
method: PyNot
operand: x
	^x not
%
