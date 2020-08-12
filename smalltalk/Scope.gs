! ------------------- Remove existing behavior from Scope
expectvalue /Metaclass3       
doit
Scope removeAllMethods.
Scope class removeAllMethods.
%
! ------------------- Class methods for Scope
set compile_env: 0
category: 'other'
classmethod: Scope
new

	self error: 'use #outer:node:'.
%
category: 'other'
classmethod: Scope
outer: aScope node: anAstNode

	^self basicNew
		initializeOuter: aScope node: anAstNode;
		yourself
%
! ------------------- Instance methods for Scope
set compile_env: 0
category: 'other'
method: Scope
addAssociation: anAssociation

	(variables includesKey: anAssociation key) ifTrue: [self halt].
	variables add: anAssociation.
%
category: 'other'
method: Scope
associationAt: aSymbol

	variables at: aSymbol ifAbsentPut: [_remoteNil].
	^variables associationAt: aSymbol
%
category: 'other'
method: Scope
astNode

	^astNode
%
category: 'other'
method: Scope
get: aSymbol

	^variables 
		at: aSymbol
		ifAbsent: [outer get: aSymbol]
%
category: 'other'
method: Scope
get: aSymbol ifAbsent: aBlock

	^variables 
		at: aSymbol
		ifAbsent: [aBlock value]
%
category: 'other'
method: Scope
globals

	self subclassResponsibility.
%
category: 'other'
method: Scope
initializeOuter: aScope node: anAstNode

	astNode := anAstNode.
	outer := aScope.
	variables := PyDictionary new.
%
category: 'other'
method: Scope
innerForNode: anAstNode

	^LocalScope outer: self node: anAstNode
%
category: 'other'
method: Scope
outer

	^outer
%
category: 'other'
method: Scope
postCopy

	super postCopy.
	variables := variables  copy.
%
category: 'other'
method: Scope
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		print: astNode;
		nextPut: $);
		yourself.
%
category: 'other'
method: Scope
set: aSymbol to: aValue

	variables at: aSymbol put: aValue.
%
