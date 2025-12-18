! ------------------- Remove existing behavior from PythonTestCase
removeallmethods PythonTestCase
removeallclassmethods PythonTestCase
! ------------------- Class methods for PythonTestCase
category: 'other'
classmethod: PythonTestCase
ast

	^ModuleAst astForPath: self pathToTests , self filename
%
category: 'other'
classmethod: PythonTestCase
pathToTests

	^Path
%
category: 'other'
classmethod: PythonTestCase
setPath

	| path |
	path := System performOnServer: 'cd ..; pwd'.
	path := path copyFrom: 1 to: path size - 1.
	Path := path , '/tests/'.
%
category: 'Testing'
classmethod: PythonTestCase
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #PythonTestCase
%
! ------------------- Instance methods for PythonTestCase
category: 'other'
method: PythonTestCase
assert: value
	"Handle Python bool instances (including True/False singletons) and Smalltalk booleans"

	(value isKindOf: bool) ifTrue: [^super assert: value ___value].
	super assert: value.
%
category: 'other'
method: PythonTestCase
assert: x equals: y

	"If identical (handles singletons like None, True, False), pass immediately"
	x == y ifTrue: [^self].
	"Use Python's __eq__ for Python objects"
	((x isKindOf: object) and: [y isKindOf: object])
		ifTrue: [self assert: (x __eq__: y) == True]
		ifFalse: [super assert: x equals: y]
%
category: 'other'
method: PythonTestCase
deny: value
	"Handle Python bool instances (including True/False singletons) and Smalltalk booleans"

	(value isKindOf: bool) ifTrue: [^super deny: value ___value].
	super deny: value.
%
category: 'other'
method: PythonTestCase
should: shouldBlock raise: anException withExceptionDo: exceptBlock

	[
		shouldBlock value.
		self assert: false.
	] on: anException do: exceptBlock.
%
