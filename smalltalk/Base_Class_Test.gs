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

	^float ___value: aFloat
%
category: 'setup'
method: Base_Class_Test
int: anInteger

	^int ___value: anInteger
%
category: 'setup'
method: Base_Class_Test
str: aString

	^str ___value: aString
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

	^self targetClass __call__
%
category: 'setup'
method: Base_Class_Test
targetInstance: firstArg

	^self targetClass ___value: firstArg
%
category: 'setup'
method: Base_Class_Test
targetInstance: firstArg _: secondArg
	^self targetClass __call__: firstArg _: secondArg
%
category: 'setup'
method: Base_Class_Test
targetInstance: firstArg _: secondArg _: thirdParam
	^self targetClass __call__: firstArg _: secondArg _: thirdParam
%
category: 'setup'
method: Base_Class_Test
writeDirTestOn: methodList
	^Scripter writeFor: self targetClass dirTestOn: methodList
%
set compile_env: 0
category: 'testing'
method: Base_Class_Test
assert: anObject

	(anObject isKindOf: bool)
		ifTrue: [super assert: anObject ___value == 1]
		ifFalse: [super assert: anObject]
%
category: 'testing'
method: Base_Class_Test
assert: x equals: y

	((x isKindOf: object) and: [y isKindOf: object])
		ifTrue: [super assert: x ___value equals: y ___value]
		ifFalse: [super assert: x equals: y]
%
category: 'testing'
method: Base_Class_Test
deny: anObject

	(anObject isKindOf: bool)
		ifTrue: [super deny: anObject ___value == 1]
		ifFalse: [super deny: anObject]
%
category: 'testing'
method: Base_Class_Test
should: shouldBlock raise: anException withExceptionDo: exceptBlock

	[
		shouldBlock value.
		self assert: false.
	] on: anException do: exceptBlock.
%
