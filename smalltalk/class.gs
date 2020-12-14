! ------------------- Remove existing behavior from class
expectvalue /Metaclass3       
doit
class removeAllMethods.
class class removeAllMethods.
%
! ------------------- Class methods for class
set compile_env: 0
category: 'other'
classmethod: class
newForNode: aFunctionDefAst scope: aScope

	^self basicNew
		initializeNode: aFunctionDefAst scope: aScope;
		yourself
%
! ------------------- Instance methods for class
set compile_env: 0
category: 'other'
method: class
__mro__

	^ [ | linearization parentLinearizations parentList mergeLinearizations |
		linearization := Array with: self.
		parentLinearizations := self astNode bases collect: [ :base | (scope get: base id) __mro__ value ].
		parentList := self astNode bases collect: [ :base | (scope get: base id) ].		
		mergeLinearizations := Array withAll: parentLinearizations.
		mergeLinearizations add: parentList.
		linearization addAll: (Linearization merge: mergeLinearizations).
		linearization.
	]
%
category: 'other'
method: class
astNode

	^ astNode
%
category: 'other'
method: class
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| function |
	function := self get: aSymbol.
	^function
		callFromClass: self
		arguments: anArray
		keywords: aSymbolDictionary
		scope: aScope
%
category: 'other'
method: class
get: aSymbol

	(aSymbol = #'__mro__') ifTrue: [ ^ self __mro__ value ].
	^ scope get: aSymbol
%
category: 'other'
method: class
initializeNode: aFunctionDefAst scope: aScope

	astNode := aFunctionDefAst.
	scope := aScope.
%
category: 'other'
method: class
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $-.
	astNode printOn: aStream.
%
category: 'other'
method: class
set: aSymbol to: aValue

	scope set: aSymbol to: aValue
%
category: 'other'
method: class
value: arguments value: keywords value: aScope
	"A class is a callable object."

	^astNode
		value: arguments
		value: keywords
		value: scope copy
%
set compile_env: 0
category: 'Python'
method: class
__class__

	^ astNode
%
category: 'Python'
method: class
__dict__

	self halt.
%
category: 'Python'
method: class
__module__

	self halt.
%
category: 'Python'
method: class
__str__
	"<class '__main__.MyClass'>"

	^astNode __str__
%
category: 'Python'
method: class
__weakref__

	self halt.
%
