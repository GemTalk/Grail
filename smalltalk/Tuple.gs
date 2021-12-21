! ------------------- Remove existing behavior from tuple
removeAllMethods tuple
removeAllClassMethods tuple
! ------------------- Class methods for tuple
set compile_env: 0
category: 'Smalltalk'
classmethod: tuple
___containerClass

	^Array
%
category: 'Smalltalk'
classmethod: tuple
___endChar
	^$)
%
category: 'Smalltalk'
classmethod: tuple
___startChar
	^$(
%
category: 'Smalltalk'
classmethod: tuple
__call__: aPythonTuple

	^(self __new__: aPythonTuple) __init__: aPythonTuple; yourself
%
category: 'Smalltalk'
classmethod: tuple
__new__: aPythonTuple

	^self basicNew
%
! ------------------- Instance methods for tuple
set compile_env: 0
category: '(as yet unclassified)'
method: tuple
__init__: aPythonTuple

	container := self class ___containerClass withAll: aPythonTuple ___container copy.
%
set compile_env: 0
set compile_env: 0
category: 'Smalltalk'
method: tuple
___typeName
	^'tuple'
%
