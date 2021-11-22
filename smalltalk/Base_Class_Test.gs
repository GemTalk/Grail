! ------------------- Remove existing behavior from Base_Class_Test
removeAllMethods Base_Class_Test
removeAllClassMethods Base_Class_Test
! ------------------- Class methods for Base_Class_Test
set compile_env: 0
category: 'testing'
classmethod: Base_Class_Test
isAbstract

	^self == Base_Class_Test
%
! ------------------- Instance methods for Base_Class_Test
set compile_env: 0
category: 'setup'
method: Base_Class_Test
float: aFloat

	^float ___new__init__: aFloat
%
category: 'setup'
method: Base_Class_Test
int: anInteger

	^int ___new__init__: anInteger
%
category: 'setup'
method: Base_Class_Test
str: aString

	^str ___new__init__: aString
%
category: 'setup'
method: Base_Class_Test
targetClass

	| string |
	string := self class name.
	string := string copyFrom: 1 to: string size - 4.
	^Python at: string asSymbol
%
category: 'setup'
method: Base_Class_Test
targetInstance
	^ self targetClass ___new__init__
%
category: 'setup'
method: Base_Class_Test
targetInstance: firstArg
	^ self targetClass ___new__init__: firstArg
%
category: 'setup'
method: Base_Class_Test
targetInstance: firstArg _: secondArg
	^ self targetClass ___new__init__: firstArg _: secondArg
%
category: 'setup'
method: Base_Class_Test
targetInstance: firstArg _: secondArg _: thirdParam
	^ self targetClass ___new__init__: firstArg _: secondArg _: thirdParam
%
category: 'setup'
method: Base_Class_Test
writeDirTestOn: methodList
	^ Scripter writeFor: self targetClass dirTestOn: methodList
%
