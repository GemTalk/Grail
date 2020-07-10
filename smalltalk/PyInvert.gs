! ------------------- Remove existing behavior from PyInvert
expectvalue /Metaclass3       
doit
PyInvert removeAllMethods.
PyInvert class removeAllMethods.
%
! ------------------- Class methods for PyInvert
! ------------------- Instance methods for PyInvert
set compile_env: 0
category: 'other'
method: PyInvert
evaluate

	^operand evaluate bitInvert
%
category: 'other'
method: PyInvert
operand: x
	^x bitInvert
%
