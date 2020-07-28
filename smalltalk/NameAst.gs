! ------------------- Remove existing behavior from NameAst
expectvalue /Metaclass3       
doit
NameAst removeAllMethods.
NameAst class removeAllMethods.
%
! ------------------- Class methods for NameAst
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
assign: aValue

	self assertContextIsStore.
	^assoc value: aValue
%
category: 'other'
method: NameAst
associationAt: aSymbol

	^assoc value associationAt: aSymbol
%
category: 'other'
method: NameAst
callWithArguments: anArray keywords: aSymbolDictionary

	self assertContextIsLoad.
	^assoc value
		value: anArray
		value: aSymbolDictionary
%
category: 'other'
method: NameAst
children

	^super children
		add: ctx;
		yourself
%
category: 'other'
method: NameAst
evaluate
	"If the name refers to a function, return an object that can be sent #'value:value:'"

	self assertContextIsLoad.
	^assoc value
%
category: 'other'
method: NameAst
id

	^id
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
%
category: 'other'
method: NameAst
printOn: aStream

	super printOn: aStream.
	assoc ifNotNil: [
		aStream nextPut: $(; 
			nextPutAll: assoc key;
			nextPut: $).
	].
%
category: 'other'
method: NameAst
saveVariableAssociation

	assoc := parent associationAt: id.
%
