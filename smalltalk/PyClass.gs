! ------------------- Remove existing behavior from PyClass
expectvalue /Metaclass3       
doit
PyClass removeAllMethods.
PyClass class removeAllMethods.
%
! ------------------- Class methods for PyClass
set compile_env: 0
category: 'other'
classmethod: PyClass
newForNode: aFunctionDefAst scope: aScope

	^self basicNew
		initializeNode: aFunctionDefAst scope: aScope;
		yourself
%
! ------------------- Instance methods for PyClass
set compile_env: 0
category: 'other'
method: PyClass
__str__
	"<class '__main__.MyClass'>"

	^astNode __str__
%
category: 'other'
method: PyClass
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
method: PyClass
get: aSymbol

	^scope get: aSymbol
%
category: 'other'
method: PyClass
initializeNode: aFunctionDefAst scope: aScope

	astNode := aFunctionDefAst.
	scope := aScope.
%
category: 'other'
method: PyClass
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $-.
	astNode printOn: aStream.
%
category: 'other'
method: PyClass
set: aSymbol to: aValue

	scope set: aSymbol to: aValue
%
category: 'other'
method: PyClass
value: arguments value: keywords value: aScope

	^astNode
		value: arguments
		value: keywords
		value: scope copy
%
