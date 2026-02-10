! ------------------- Remove existing behavior from NameAst
removeallmethods NameAst
removeallclassmethods NameAst
set compile_env: 0
! ------------------- Class methods for NameAst
category: 'other'
classmethod: NameAst
with: aSymbol

	^self basicNew
		id: aSymbol;
		yourself
%
! ------------------- Instance methods for NameAst
category: 'other'
method: NameAst
addVariableNamesTo: aStream

	
	aStream nextPutAll: id; space.
%
category: 'other'
method: NameAst
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: NameAst
assertContextIsStore

	ctx assertIsStore.
%
category: 'other'
method: NameAst
ctx: aContext

	ctx := aContext.
%
category: 'other'
method: NameAst
declareVariable

	parent declareVariable: id.
%
category: 'other'
method: NameAst
id

	^id
%
category: 'other'
method: NameAst
id: aSymbol

	id := aSymbol
%
category: 'other'
method: NameAst
injectSuperArguments: anArray scope: aScope

	| type objectOrType |
	type := aScope superInfo
		at: #'type'
		ifAbsent: [].
	objectOrType := aScope superInfo
		at: #'objectOrType'
		ifAbsent: [].
	(((type isNil not) and: [objectOrType isNil not]) and: [id == #'super']) ifTrue: ["in case of calling super"
		anArray add: type.
		anArray add: objectOrType.
	].
%
category: 'other'
method: NameAst
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $(;
		nextPutAll: id;
		nextPut: $).
%
category: 'other'
method: NameAst
printSmalltalkAssignmentOn: aStream

	self printSmalltalkOn: aStream.
	aStream nextPutAll: 'value'.
%
category: 'other'
method: NameAst
printSmalltalkOn: aStream

	aStream nextPutAll: id.
%
category: 'other'
method: NameAst
setTo: aValue scope: aScope

	self assertContextIsStore.
	aScope set: id to: aValue.
%
