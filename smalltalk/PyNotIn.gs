! ------------------- Remove existing behavior from PyNotIn
expectvalue /Metaclass3       
doit
PyNotIn removeAllMethods.
PyNotIn class removeAllMethods.
%
! ------------------- Class methods for PyNotIn
! ------------------- Instance methods for PyNotIn
set compile_env: 0
category: 'other'
method: PyNotIn
left: leftOperand right: rightOperand
	self error.
	^self subclassResponsibility
%
