! ------------------- Remove existing behavior from NameAst
removeAllMethods NameAst
removeAllClassMethods NameAst
! ------------------- Class methods for NameAst
set compile_env: 0
category: 'other'
classmethod: NameAst
with: aSymbol

	^self basicNew
		id: aSymbol;
		yourself
%
! ------------------- Instance methods for NameAst
set compile_env: 0
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
initialize
	"Name(identifier id, expr_context ctx)"

	self stream peekFor: $(.
	id := self string asSymbol.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
	ctx isStoreCtx ifTrue: [self parent declareVariable: id]
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
	(((type isNil not) and: [objectOrType isNil not]) and: [id = #'super']) ifTrue: ["in case of calling super"
		anArray add: type.
		anArray add: objectOrType.
	].
%
category: 'other'
method: NameAst
messagePrecedence
	^3
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
printSmalltalkOn: aStream
	"TO DO
		if ctx is read && this id is in block as writeable but has not been written
			give UnboundLocalError
		if ctx is write change flag in block to true aka has been written"
	aStream 
		nextPutAll: 'currentScope at: ';
		nextPut: $#;
		nextPutAll: id asString;
		yourself.

	ctx class == StoreAst ifTrue: [
		aStream nextPutAll: ' put: '.
	].
%
category: 'other'
method: NameAst
setTo: aValue scope: aScope

	self assertContextIsStore.
	aScope set: id to: aValue.
%
