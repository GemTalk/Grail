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

	^self basicNew ___value: aPythonTuple ___container copy immediateInvariant.
%
! ------------------- Instance methods for tuple
set compile_env: 0
category: 'Python'
method: tuple
__init__: aPythonTuple
%
set compile_env: 0
category: 'Smalltalk'
method: tuple
___typeName
	^'tuple'
%
