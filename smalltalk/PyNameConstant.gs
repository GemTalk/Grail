! ------------------- Remove existing behavior from PyNameConstant
expectvalue /Metaclass3       
doit
PyNameConstant removeAllMethods.
PyNameConstant class removeAllMethods.
%
! ------------------- Class methods for PyNameConstant
set compile_env: 0
category: 'other'
classmethod: PyNameConstant
isAbstract

	^self == PyNameConstant
%
category: 'other'
classmethod: PyNameConstant
resetSingleton
"
	PyFalse resetSingleton.
	PyNone resetSingleton.
	PyTrue resetSingleton.
"
	singleton := self basicNew.
%
category: 'other'
classmethod: PyNameConstant
singleton

	^singleton ifNil: [singleton := self basicNew].
%
category: 'other'
classmethod: PyNameConstant
subclassDelimiter

	^$,
%
! ------------------- Instance methods for PyNameConstant
set compile_env: 0
category: 'other'
method: PyNameConstant
evaluate

	self subclassResponsibility.
%
category: 'other'
method: PyNameConstant
initialize

	self stream skip: -1.
	self readPosition.
%
