! ------------------- Remove existing behavior from Base_Class_Test
removeallmethods Base_Class_Test
removeallclassmethods Base_Class_Test
! ------------------- Class methods for Base_Class_Test
category: 'testing'
classmethod: Base_Class_Test
isAbstract

	^self == Base_Class_Test
%
! ------------------- Instance methods for Base_Class_Test
category: 'setup'
method: Base_Class_Test
bool: aBoolean

	^bool ___value: aBoolean
%
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
list: anArray
	"Create a Python list from a Smalltalk array, converting Smalltalk strings to Python strings"

	| pyList |
	pyList := list __call__.
	anArray do: [:each |
		| element |
		element := (each isKindOf: CharacterCollection)
			ifTrue: [str ___value: each]
			ifFalse: [each].
		pyList append: element
	].
	^pyList
%
category: 'setup'
method: Base_Class_Test
set: anArray
	"Create a Python set from a Smalltalk array, converting Smalltalk strings to Python strings"

	| pySet |
	pySet := set __call__.
	anArray do: [:each |
		| element |
		element := (each isKindOf: CharacterCollection)
			ifTrue: [str ___value: each]
			ifFalse: [each].
		pySet add: element
	].
	^pySet
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
targetInstance: firstArg _: secondArg _: thirdArg

	^self targetClass __call__: firstArg _: secondArg _: thirdArg
%
category: 'setup'
method: Base_Class_Test
tuple: anArray
	"Create a Python tuple from a Smalltalk array, converting Smalltalk strings to Python strings"

	| pyList |
	pyList := list __call__.
	anArray do: [:each |
		| element |
		element := (each isKindOf: CharacterCollection)
			ifTrue: [str ___value: each]
			ifFalse: [each].
		pyList append: element
	].
	^tuple __call__: pyList
%
category: 'setup'
method: Base_Class_Test
writeDirTestOn: methodList

	^Scripter writeFor: self targetClass dirTestOn: methodList
%
category: 'testing'
method: Base_Class_Test
should: shouldBlock raise: anException withExceptionDo: exceptBlock

	[
		shouldBlock value.
		self assert: false.
	] on: anException do: exceptBlock.
%
