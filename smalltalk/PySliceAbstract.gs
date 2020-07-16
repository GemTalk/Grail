! ------------------- Remove existing behavior from PySliceAbstract
expectvalue /Metaclass3       
doit
PySliceAbstract removeAllMethods.
PySliceAbstract class removeAllMethods.
%
! ------------------- Class methods for PySliceAbstract
set compile_env: 0
category: 'other'
classmethod: PySliceAbstract
isAbstract

	^self == PySliceAbstract
%
! ------------------- Instance methods for PySliceAbstract
set compile_env: 0
category: 'other'
method: PySliceAbstract
assign: aValue to: aVariable
	self subclassResponsibility.
%
category: 'other'
method: PySliceAbstract
evaluate: aList
	self subclassResponsibility
%
