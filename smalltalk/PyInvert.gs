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
operand: operand
	^operand bitInvert
%
