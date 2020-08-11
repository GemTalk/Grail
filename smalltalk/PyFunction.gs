! ------------------- Remove existing behavior from PyFunction
expectvalue /Metaclass3       
doit
PyFunction removeAllMethods.
PyFunction class removeAllMethods.
%
! ------------------- Class methods for PyFunction
set compile_env: 0
category: 'other'
classmethod: PyFunction
newForNode: aFunctionDefAst scope: aScope

	^self basicNew
		initializeNode: aFunctionDefAst scope: aScope;
		yourself
%
! ------------------- Instance methods for PyFunction
set compile_env: 0
category: 'other'
method: PyFunction
initializeNode: aFunctionDefAst scope: aScope

	astNode := aFunctionDefAst.
	scope := aScope.
%
category: 'other'
method: PyFunction
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $-.
	astNode printOn: aStream.
%
category: 'other'
method: PyFunction
value: arguments value: keywords value: aScope

	^astNode
		value: arguments
		value: keywords
		value: scope copy
%
